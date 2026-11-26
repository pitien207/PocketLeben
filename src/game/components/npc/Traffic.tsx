import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { CuboidCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier'
import type { Group } from 'three'
import { SOLO_LINES } from '../../../data/chatter'
import { CONFIG } from '../../../data/config'
import { RIDER_OUTFITS, type Outfit } from '../../../data/npcs'
import { useBubbles } from '../../../store/bubbleStore'
import { PALETTE as P } from '../../scenes/shared/palette'
import { bicycleShapes, carShapes, motorbikeShapes, RIDES } from '../../scenes/shared/props'
import { CAR_MODELS, carModelShapes, carModelsReady, loadCarModels } from '../../scenes/shared/carModels'
import { isLibraryCar, libraryCarShapes, libraryCarSize } from '../../scenes/shared/libraryCars'
import { clearOccupant, gapAhead, setOccupant } from '../../systems/laneTraffic'
import { streetHorn } from '../../systems/audio'
import { Shapes } from '../../scenes/shared/Shapes'
import { damp } from '../../systems/math'
import { playerState } from '../../systems/playerState'
import { ChibiModel, type MotionState } from '../ChibiModel'
import { SpeechBubble } from './SpeechBubble'

export interface Lane {
  z: number
  /** +1 drives toward +X, −1 toward −X. */
  dir: 1 | -1
}

const BIKE_COLORS = [P.rose, P.sky2, P.butter, P.mint, P.lilac, P.peach]

/**
 * 1.48 Which car models drive where (Quaternius cars.bin names or Kenney Car Kit kv… names). `color`: null = the model's
 * own paint (taxis, ambulances), a string = that paint, missing = the next pastel of BIKE_COLORS.
 */
export interface CarPick {
  model: string
  color?: string | null
}
export const CARS_VN: CarPick[] = [
  { model: 'kvSedan' },
  { model: 'kvHatchback' },
  { model: 'kvTaxi', color: null },
  { model: 'kvSuv' },
  { model: 'NormalCar1' },
  { model: 'kvVan' },
  { model: 'kvDelivery', color: '#f2f2f2' },
  { model: 'kvSuvLuxury', color: '#2f3640' },
  { model: 'NormalCar2' },
  { model: 'kvTruck', color: '#6d8fb3' },
  { model: 'kvSedanSports' },
  { model: 'SUV' },
]
export const CARS_DE: CarPick[] = [
  { model: 'kvSedan', color: '#c9ced6' },
  { model: 'kvSuvLuxury', color: '#2b2f36' },
  { model: 'kvTaxi', color: '#efe3c2' },
  { model: 'kvHatchback' },
  { model: 'kvVan', color: '#f4f4f4' },
  { model: 'kvAmbulance', color: null },
  { model: 'kvSedanSports', color: '#3a64a8' },
  { model: 'kvDelivery', color: '#ffd23f' },
  { model: 'NormalCar1' },
  { model: 'kvGarbage', color: '#ef8a2c' },
  { model: 'kvSuv', color: '#8a9a5b' },
  { model: 'SportsCar2' },
]
let seq = 0

export type VehicleKind = 'motorbike' | 'car' | 'bicycle'

const VEHICLE = {
  motorbike: { shapes: motorbikeShapes, ride: 'motorbike', half: [0.28, 0.6, 0.78], speed: 1, honk: 'biker' },
  bicycle: { shapes: bicycleShapes, ride: 'bicycle', half: [0.25, 0.6, 0.66], speed: 0.55, honk: 'cyclist' },
  // Quaternius car models (shared/carModels.ts); the hand-built carShapes stand in while they load.
  car: { shapes: carShapes, ride: null, half: [0.82, 0.75, 1.7], speed: 1.05, honk: 'driver' },
} as const
const LANE_HALF_WIDTH = 1.1

interface BikeProps {
  id: string
  kind: VehicleKind
  lane: Lane
  startX: number
  color: string
  outfit: Outfit
  /** Which car model (cars only). */
  model?: string
  /** 1.48 null = the model's own paint. */
  paint?: string | null
  /** 1.44 wrap at ±wrapX (default CONFIG.traffic.wrapX). */
  wrapX: number
}

/** One scooter + helmeted rider cruising a lane. Slows, stops and honks for the player. */
function TrafficBike({ id, kind, lane, startX, color, outfit, model, paint, wrapX }: BikeProps) {
  const vehicle = VEHICLE[kind]
  const laneId = useRef('')
  if (!laneId.current) laneId.current = `veh-${++seq}`
  const lib = kind === 'car' && isLibraryCar(model)
  // collider + queue length: a library car's real size, else the old fixed box
  const half = useMemo<[number, number, number]>(() => {
    if (!lib) return [vehicle.half[0], vehicle.half[1], vehicle.half[2]]
    const [w, h, l] = libraryCarSize(model!)
    return [w / 2 - 0.04, Math.min(0.9, h / 2), l / 2 - 0.05]
  }, [lib, model, vehicle])
  const group = useRef<Group>(null)
  const rb = useRef<RapierRigidBody>(null)
  const rider = useRef<MotionState>({ speed: 0, ride: vehicle.ride, pedal: Math.random() * 6 })
  const [carsReady, setCarsReady] = useState(carModelsReady)
  useEffect(() => {
    if (kind !== 'car' || carsReady) return
    let alive = true
    void loadCarModels().then(() => alive && setCarsReady(carModelsReady()))
    return () => {
      alive = false
    }
  }, [kind, carsReady])
  const shapes = useMemo(
    () => (lib ? libraryCarShapes(model!, paint === undefined ? color : paint) : null) ?? (kind === 'car' && carsReady && model && !lib ? carModelShapes(model, color) : null) ?? vehicle.shapes(color),
    [vehicle, kind, carsReady, model, color, paint, lib],
  )
  useEffect(() => () => clearOccupant(laneId.current), [])
  const cfg = CONFIG.traffic
  const st = useRef<{ x: number; cruise: number; speed: number; honked: boolean; t: number } | null>(null)
  if (!st.current) {
    const cruise = (cfg.speedMin + Math.random() * (cfg.speedMax - cfg.speedMin)) * vehicle.speed
    st.current = { x: startX, cruise, speed: cruise, honked: false, t: Math.random() * 10 }
  }

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1)
    const s = st.current
    if (!s) return
    const p = playerState.position
    const ahead = (p.x - s.x) * lane.dir
    const inLane = Math.abs(p.z - lane.z) < LANE_HALF_WIDTH
    let target = s.cruise
    if (inLane && ahead > 0 && ahead < cfg.slowDistance) {
      target = ahead <= cfg.stopDistance ? 0 : (s.cruise * (ahead - cfg.stopDistance)) / (cfg.slowDistance - cfg.stopDistance)
      if (!s.honked) {
        s.honked = true
        const lines = SOLO_LINES[vehicle.honk] ?? SOLO_LINES.biker
        useBubbles.getState().say(id, lines[Math.floor(Math.random() * lines.length)], 1800)
        // 1.49 and you hear it: scooter horn, car horn, bicycle bell
        streetHorn(kind)
      }
    } else if (!inLane || ahead < -1.5) {
      s.honked = false
    }
    // 1.48 queue behind the vehicle in front (a bus at its stop, a slower car)
    const gap = gapAhead(laneId.current, s.x, lane.z, lane.dir, half[2])
    if (gap < cfg.slowDistance + 1) {
      const queue = gap <= cfg.stopDistance - 0.8 ? 0 : (s.cruise * (gap - cfg.stopDistance + 0.8)) / (cfg.slowDistance + 1.8 - cfg.stopDistance)
      target = Math.min(target, Math.max(0, queue))
    }
    s.speed = damp(s.speed, target, target < s.speed ? 6 : 2, dt)
    s.x += lane.dir * s.speed * dt
    // Cyclists pedal as fast as they travel.
    rider.current.pedal = (rider.current.pedal ?? 0) - s.speed * dt * 2.6
    if (s.x * lane.dir > wrapX) {
      s.x = -lane.dir * wrapX
      s.cruise = (cfg.speedMin + Math.random() * (cfg.speedMax - cfg.speedMin)) * vehicle.speed
    }
    s.t += dt
    setOccupant(laneId.current, s.x, lane.z, lane.dir, half[2])

    const g = group.current
    if (g) {
      g.position.set(s.x, Math.abs(Math.sin(s.t * 9)) * 0.015 * Math.min(1, s.speed), lane.z)
    }
    rb.current?.setNextKinematicTranslation({ x: s.x, y: 0, z: lane.z })
  })

  const yaw = lane.dir > 0 ? Math.PI / 2 : -Math.PI / 2
  return (
    <>
      <group ref={group} position={[startX, 0, lane.z]} rotation={[0, yaw, 0]}>
        <Shapes shapes={shapes} />
        {vehicle.ride && (
          <group position={[0, 0, RIDES[vehicle.ride].riderZ]}>
            <ChibiModel motion={rider} outfit={outfit} />
          </group>
        )}
        <SpeechBubble id={id} y={vehicle.ride ? 2.1 : 2.05} />
      </group>
      <RigidBody ref={rb} type="kinematicPosition" colliders={false} position={[startX, 0, lane.z]} rotation={[0, yaw, 0]}>
        <CuboidCollider args={half} position={[0, half[1], 0]} />
      </RigidBody>
    </>
  )
}

/** The n-th car of a Traffic: a model from the list (spread over the lanes), with its paint rule. */
function carOf(cars: CarPick[], n: number, lanes: number): { model: string; paint?: string | null } {
  const pick = cars.length ? cars[(n * 7 + lanes) % cars.length] : { model: CAR_MODELS[(n * 7 + lanes) % CAR_MODELS.length] }
  return pick.color === undefined ? { model: pick.model } : { model: pick.model, paint: pick.color }
}

/** Motorbike traffic on the main road — the soundtrack of every Vietnamese street. */
export function Traffic({ lanes, perLane = 2, kinds = ['motorbike'], outfits = RIDER_OUTFITS, wrapX = CONFIG.traffic.wrapX, cars = CARS_VN }: { lanes: Lane[]; perLane?: number; kinds?: VehicleKind[]; outfits?: Outfit[]; wrapX?: number; cars?: CarPick[] }) {
  const bikes = useMemo(() => {
    const list: BikeProps[] = []
    let n = 0
    for (const lane of lanes) {
      for (let i = 0; i < perLane; i++) {
        list.push({
          id: `bike-${n}`,
          kind: kinds[n % kinds.length],
          lane,
          startX: -wrapX + ((i + 0.5) / perLane) * 2 * wrapX + n * 3,
          color: BIKE_COLORS[n % BIKE_COLORS.length],
          outfit: outfits[n % outfits.length],
          ...carOf(cars, n, lanes.length),
          wrapX,
        })
        n++
      }
    }
    return list
  }, [lanes, perLane, kinds, outfits, wrapX, cars])

  return (
    <>
      {bikes.map((b) => (
        <TrafficBike key={b.id} {...b} />
      ))}
    </>
  )
}
