import { useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { CapsuleCollider, CoefficientCombineRule, RigidBody, RoundCuboidCollider, type RapierRigidBody } from '@react-three/rapier'
import type { Group } from 'three'
import { CONFIG } from '../../data/config'
import { VEHICLES } from '../../data/vehicles'
import { rideAnchorsOf, rideKindOf, vehicleHalf } from '../scenes/shared/ownVehicles'
import { burnFuel, dismount, rideAllowed, useRide } from '../systems/vehicles'
import { VehicleMesh } from './PlayerVehicle'
import { usePlayer } from '../../store/playerStore'
import { useUI } from '../../store/uiStore'
import { useMinigame } from '../../store/minigameStore'
import { useDialogue } from '../../store/dialogueStore'
import { cameraState } from '../systems/cameraState'
import { PLAYER_GROUPS } from '../systems/collisionGroups'
import { isSprinting, readMoveInput, type Vec2 } from '../systems/input'
import { damp, dampAngle, dampFactor } from '../systems/math'
import { playerState } from '../systems/playerState'
import { ChibiModel, type MotionState } from './ChibiModel'
import { localSnapshot } from '../systems/netState'

const CAPSULE_RADIUS = 0.32
const CAPSULE_HALF_HEIGHT = 0.42
/** Rounded edges of the vehicle collider (slides off corners and kerbs). */
const RIDE_ROUND = 0.08
/** Distance at which an auto-walk waypoint counts as reached. */
const WAYPOINT_REACHED = 0.15
/** Auto-walk slows down within this distance of a waypoint. */
const WAYPOINT_SLOWDOWN = 0.6

/** Runs before the physics step (Physics uses priority -50) so new velocity applies this frame. */
export const PLAYER_FRAME_PRIORITY = -100

const _input: Vec2 = { x: 0, y: 0 }

export interface PlayerProps {
  /** Interpolated visual root, followed by the camera. */
  visualRef: RefObject<Group | null>
}

/** Menus, conversations and mini-games own the screen: don't walk behind them. */
function inputBlocked() {
  const ui = useUI.getState()
  return (
    ui.settingsOpen ||
    ui.panel !== null ||
    ui.sleeping ||
    ui.transition !== null ||
    ui.fastForward !== null ||
    ui.newDayOpen ||
    useMinigame.getState().active !== null ||
    useDialogue.getState().npcId !== null
  )
}

function arrive() {
  playerState.path = []
  const callback = playerState.onArrive
  playerState.onArrive = null
  callback?.()
}

export function Player({ visualRef }: PlayerProps) {
  const body = useRef<RapierRigidBody>(null)
  const facing = useRef<Group>(null)
  const motion = useRef<MotionState>({ speed: 0 })
  const velocity = useRef({ x: 0, z: 0 })
  const sipClock = useRef(0)
  const outfit = usePlayer((s) => s.outfit)
  // 1.35 riding your own vehicle: the body turns with the vehicle (its box collider must), `heading` is the
  // direction you face either way, `rideSpeed` the vehicle's forward speed.
  const riding = useRide((s) => s.riding)
  const rideDef = riding ? VEHICLES[riding] : null
  const rideHalf = rideDef ? vehicleHalf(rideDef) : null
  const heading = useRef(0)
  const rideSpeed = useRef(0)
  const bodyTurned = useRef(false)

  useFrame((_, rawDt) => {
    const rb = body.current
    if (!rb) return
    const dt = Math.min(rawDt, 0.1)
    const cfg = CONFIG.player

    if (playerState.teleportTo) {
      const { x, z } = playerState.teleportTo
      playerState.teleportTo = null
      rb.setTranslation({ x, y: cfg.spawn[1], z }, true)
      rb.setLinvel({ x: 0, y: 0, z: 0 }, true)
      velocity.current.x = velocity.current.z = 0
    }

    // Safety net: never lose the player.
    if (rb.translation().y < cfg.fallResetY) {
      rb.setTranslation({ x: cfg.spawn[0], y: cfg.spawn[1] + 1, z: cfg.spawn[2] }, true)
      rb.setLinvel({ x: 0, y: 0, z: 0 }, true)
    }

    const pos = rb.translation()
    playerState.position.set(pos.x, pos.y, pos.z)

    // Get off where riding is not allowed, for scripted walks and when sitting down.
    let ride = useRide.getState().riding
    if (ride && (!rideAllowed() || (playerState.locked && playerState.path.length > 0) || playerState.pose)) {
      dismount()
      ride = null
    }
    const vdef = ride ? VEHICLES[ride] : null

    let moveX = 0
    let moveZ = 0
    let speedScale = 1

    if (playerState.locked) {
      // Scripted walk (e.g. going behind the café counter).
      const target = playerState.path[0]
      if (target) {
        playerState.pathTime += dt
        const dx = target.x - pos.x
        const dz = target.z - pos.z
        const dist = Math.hypot(dx, dz)
        if (playerState.pathTime > cfg.autoWalkTimeoutSec) {
          const last = playerState.path[playerState.path.length - 1]
          rb.setTranslation({ x: last.x, y: pos.y, z: last.z }, true)
          velocity.current.x = velocity.current.z = 0
          arrive()
        } else if (dist < WAYPOINT_REACHED) {
          playerState.path.shift()
          if (playerState.path.length === 0) arrive()
        } else {
          moveX = dx / dist
          moveZ = dz / dist
          speedScale = cfg.autoWalkSpeedScale * (playerState.path.length === 1 ? Math.min(1, dist / WAYPOINT_SLOWDOWN) : 1)
        }
      }
    } else if (!inputBlocked()) {
      // Move relative to the camera: "up" on the stick = away from the camera.
      readMoveInput(_input)
      const sin = Math.sin(cameraState.yaw)
      const cos = Math.cos(cameraState.yaw)
      moveX = cos * _input.x - sin * _input.y
      moveZ = -sin * _input.x - cos * _input.y
      if (isSprinting()) speedScale = cfg.runMultiplier
    }

    const v = velocity.current
    const current = rb.linvel()
    const planarSpeed = Math.hypot(current.x, current.z)
    if (vdef) {
      // A vehicle goes where it points: steer toward the stick, speed up along the heading.
      const mag = Math.min(1, Math.hypot(moveX, moveZ))
      let want = 0
      if (mag > 0.05) {
        const target = Math.atan2(moveX, moveZ)
        let diff = target - heading.current
        diff = Math.atan2(Math.sin(diff), Math.cos(diff))
        const step = vdef.turn * dt
        heading.current += Math.max(-step, Math.min(step, diff))
        want = cfg.walkSpeed * vdef.speed * mag * (0.25 + 0.75 * Math.max(0, Math.cos(diff)))
      }
      // Pressing into a wall does not build up speed.
      rideSpeed.current = Math.min(rideSpeed.current, planarSpeed + 1.5)
      rideSpeed.current = damp(rideSpeed.current, want, want < rideSpeed.current ? vdef.accel * 1.7 : vdef.accel, dt)
      v.x = Math.sin(heading.current) * rideSpeed.current
      v.z = Math.cos(heading.current) * rideSpeed.current
      const h = heading.current / 2
      rb.setRotation({ x: 0, y: Math.sin(h), z: 0, w: Math.cos(h) }, true)
      bodyTurned.current = true
      burnFuel(planarSpeed * dt)
    } else {
      rideSpeed.current = 0
      if (bodyTurned.current) {
        rb.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true)
        bodyTurned.current = false
      }
      const k = dampFactor(cfg.accelSharpness, dt)
      v.x += (moveX * cfg.walkSpeed * speedScale - v.x) * k
      v.z += (moveZ * cfg.walkSpeed * speedScale - v.z) * k
      if (Math.hypot(moveX, moveZ) > 0.05) {
        const target = Math.atan2(moveX, moveZ) // model faces +Z
        heading.current = dampAngle(heading.current, target, cfg.turnSharpness, dt)
      } else if (playerState.faceYaw !== null) {
        heading.current = dampAngle(heading.current, playerState.faceYaw, cfg.turnSharpness * 0.6, dt)
      }
    }
    rb.setLinvel({ x: v.x, y: current.y, z: v.z }, true)
    // Riding, the whole body is turned already.
    if (facing.current) {
      facing.current.rotation.y = vdef ? 0 : heading.current
      facing.current.visible = !playerState.hidden
    }

    // Animate from real velocity so walking into a wall looks like standing.
    const m = motion.current
    m.speed = vdef ? 0 : damp(m.speed, Math.min(cfg.runMultiplier, planarSpeed / cfg.walkSpeed), 10, dt)
    m.ride = vdef ? rideKindOf(vdef) : null
    if (vdef?.kind === 'bicycle') m.pedal = (m.pedal ?? 0) - planarSpeed * dt * 2.6

    // Sitting down for a drink etc.
    const pose = playerState.pose
    m.sit = pose ? 1 : 0
    m.seatY = pose?.sitY
    m.held = pose?.held ?? null
    sipClock.current = pose?.sipping ? sipClock.current + dt : 0
    m.sip = pose?.sipping && sipClock.current % 1.8 > 0.5 && sipClock.current % 1.8 < 1.4 ? 1 : 0
    localSnapshot.motion = m
    localSnapshot.yaw = heading.current
    localSnapshot.veh = ride
  }, PLAYER_FRAME_PRIORITY)

  return (
    <RigidBody
      ref={body}
      colliders={false}
      position={CONFIG.player.spawn}
      enabledRotations={[false, false, false]}
      canSleep={false}
      ccd
    >
      {rideHalf ? (
        <RoundCuboidCollider
          key={riding}
          args={[rideHalf[0] - RIDE_ROUND, rideHalf[1] - RIDE_ROUND, rideHalf[2] - RIDE_ROUND, RIDE_ROUND]}
          position={[0, rideHalf[1], 0]}
          friction={0}
          frictionCombineRule={CoefficientCombineRule.Min}
          collisionGroups={PLAYER_GROUPS}
        />
      ) : (
        <CapsuleCollider
          args={[CAPSULE_HALF_HEIGHT, CAPSULE_RADIUS]}
          position={[0, CAPSULE_HALF_HEIGHT + CAPSULE_RADIUS, 0]}
          friction={0}
          frictionCombineRule={CoefficientCombineRule.Min}
          collisionGroups={PLAYER_GROUPS}
        />
      )}
      <group ref={visualRef}>
        <group ref={facing}>
          {rideDef && <VehicleMesh def={rideDef} />}
          {/* On a two-wheeler the rider sits at the vehicle's anchor; in a car nobody is seen. */}
          <group position={[0, 0, rideDef ? (rideAnchorsOf(rideDef)?.riderZ ?? 0) : 0]} visible={rideDef?.kind !== 'car'}>
            <ChibiModel motion={motion} outfit={outfit} detail="high" silhouette />
          </group>
        </group>
      </group>
    </RigidBody>
  )
}
