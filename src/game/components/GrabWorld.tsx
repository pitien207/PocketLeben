import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { useWorld } from '../../store/worldStore'
import { GRAB_PEOPLE, grabTick, useGrab } from '../systems/grab'
import { playerState } from '../systems/playerState'
import { ChibiModel, type MotionState } from './ChibiModel'

/**
 * 1.40 Grab in the city (systems/grab.ts): runs the app's clock every frame and shows who is waiting — the passenger
 * at the pick-up (waving), or the customer at the door for food and parcels. The passenger on the back of your
 * vehicle and the delivery box are drawn by the Player.
 */

function Waiting({ who, x, z, wave }: { who: number; x: number; z: number; wave: boolean }) {
  const group = useRef<Group>(null)
  const motion = useRef<MotionState>({ speed: 0, arms: 0 })
  useFrame(({ clock }) => {
    const g = group.current
    if (!g) return
    // Face the player; wave while they are still far
    const p = playerState.position
    g.rotation.y = Math.atan2(p.x - x, p.z - z)
    const far = Math.hypot(p.x - x, p.z - z) > 4
    motion.current.arms = wave && far ? 0.55 + Math.sin(clock.elapsedTime * 7) * 0.35 : 0.15
  })
  return (
    <group ref={group} position={[x, 0, z]}>
      <ChibiModel motion={motion} outfit={GRAB_PEOPLE[who].outfit} />
    </group>
  )
}

export function GrabWorld() {
  const order = useGrab((s) => s.order)
  const scene = useWorld((s) => s.scene)
  useFrame((_, dt) => grabTick(Math.min(dt, 0.1)))
  if (!order || scene !== 'vietnam') return null
  if (order.kind === 'ride' && order.stage === 'pickup') return <Waiting key={order.id} who={order.who} x={order.from.x} z={order.from.z} wave />
  if (order.kind !== 'ride' && order.stage === 'drop') return <Waiting key={order.id} who={order.who} x={order.to.x} z={order.to.z} wave={false} />
  return null
}
