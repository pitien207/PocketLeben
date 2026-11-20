import { memo, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CuboidCollider, CylinderCollider, RigidBody } from '@react-three/rapier'
import type { Group } from 'three'
import { NPCS } from '../../../data/npcs'
import { VEHICLES, type VehicleId } from '../../../data/vehicles'
import { ActionSpot, type SpotAction } from '../../components/ActionSpot'
import { NPC } from '../../components/npc/NPC'
import { VehicleMesh } from '../../components/PlayerVehicle'
import { BUILDING_GROUPS, PROP_GROUPS } from '../../systems/collisionGroups'
import { vehicleShapes } from '../shared/ownVehicles'
import { place, softPlantShapes } from '../shared/props'
import { PALETTE as P } from '../shared/palette'
import { Shapes, type ShapeItem } from '../shared/Shapes'
import { SignBoard } from '../shared/SignBoard'
import type { SignOptions } from '../shared/textures'
import { NORTH } from './layout'

/**
 * 1.35 Showroom Xe Phố Cổ: a hole in row D on Phố Tràng Tiền, right next to the petrol station. Open front with the
 * shutter rolled up, scooters lined along both walls, a car turning on a round stand, chị Thủy at the counter.
 * Door spot `vn-showroom` → action `veh.shop` (ui/VehicleShop.tsx). World space; the front faces +Z (the avenue).
 */

export const SHOWROOM = { x0: NORTH.gas.x1, x1: NORTH.gas.x1 + 12 }

const F = NORTH.rowD.front
const B = NORTH.rowD.back
const X0 = SHOWROOM.x0
const X1 = SHOWROOM.x1
const CX = (X0 + X1) / 2
const W = X1 - X0
const D = F - B
const H = 5
/** The car stand. */
const STAND = { x: CX - 0.9, z: B + 3.6, r: 2.2 }
const STAND_CAR: VehicleId = 'chopDo'

/** Two-wheelers along the walls: [id, x, z, yaw]. */
const BIKES: [VehicleId, number, number, number][] = [
  ['xeDap', X0 + 1.0, F - 1.7, Math.PI / 2 - 0.35],
  ['ongVang', X0 + 1.05, F - 3.2, Math.PI / 2 - 0.35],
  ['mayTrang', X0 + 1.05, F - 4.7, Math.PI / 2 - 0.35],
  ['enBac', X1 - 1.05, F - 1.7, -Math.PI / 2 + 0.35],
  ['phongLuu', X1 - 1.05, F - 3.2, -Math.PI / 2 + 0.35],
  ['ongVang', X1 - 1.05, F - 4.7, -Math.PI / 2 + 0.35],
]

const SIGN: SignOptions = { title: 'SHOWROOM XE PHỐ CỔ', subtitle: 'Xe đạp · Xe máy · Ô tô · Đăng ký biển số', background: '#c8322b', border: '#ffe08a', color: '#ffffff', accent: '#ffe08a', aspect: 7.5 }
const SALE: SignOptions = { title: 'XE MỚI VỀ!', subtitle: 'Đổ đầy bình', background: '#ffd23f', border: '#c8322b', color: '#c8322b', accent: '#2c5aa0', aspect: 2.4 }
const ACTIONS: SpotAction[] = [{ id: 'look', labelKey: 'action.vehicleShop', icon: 'wheel', action: 'veh.shop', primary: true }]

function showroomShapes(): ShapeItem[] {
  const s: ShapeItem[] = []
  const wall = '#f6efe0'
  // Floor: light tiles with grout lines
  s.push({ box: [W, 0.06, D], at: [CX, 0.03, (F + B) / 2], color: '#ece7de' })
  for (let x = X0 + 1; x < X1; x += 1) s.push({ box: [0.025, 0.005, D], at: [x, 0.062, (F + B) / 2], color: '#d6cfc3' })
  for (let z = B + 1; z < F; z += 1) s.push({ box: [W, 0.005, 0.025], at: [CX, 0.062, z], color: '#d6cfc3' })
  // Walls, ceiling, the upper floor with a window band, a flat roof
  s.push({ box: [W, H, 0.3], at: [CX, H / 2, B + 0.15], color: wall })
  for (const x of [X0 + 0.15, X1 - 0.15]) s.push({ box: [0.3, H, D], at: [x, H / 2, (F + B) / 2], color: wall })
  s.push({ box: [W, 0.25, D], at: [CX, H - 0.12, (F + B) / 2], color: '#fbf8f2' })
  s.push({ box: [W, 3.4, D], at: [CX, H + 1.7, (F + B) / 2], color: '#f2e2c4' })
  s.push({ box: [W - 1.2, 1.5, 0.06], at: [CX, H + 1.75, F + 0.03], color: '#bfe6f2' })
  for (let x = X0 + 2; x < X1 - 1; x += 2) s.push({ box: [0.12, 1.5, 0.08], at: [x, H + 1.75, F + 0.05], color: '#ffffff' })
  s.push({ box: [W + 0.3, 0.3, D + 0.3], at: [CX, H + 3.55, (F + B) / 2], color: '#d9cfbd' })
  // Front: two pillars, the red fascia, the rolled-up shutter, a strip of bunting
  for (const x of [X0 + 0.25, X1 - 0.25]) s.push({ box: [0.5, H, 0.5], at: [x, H / 2, F - 0.1], color: '#e3d8c4' })
  s.push({ box: [W + 0.2, 1.0, 0.4], at: [CX, H - 0.4, F], color: '#c8322b' })
  s.push({ box: [W + 0.2, 0.08, 0.44], at: [CX, H - 0.92, F], color: '#ffe08a' })
  s.push({ cyl: [0.18, 0.18, W - 0.6, 10], at: [CX, H - 1.12, F - 0.25], rot: [0, 0, Math.PI / 2], color: '#9aa0aa' })
  const flags = ['#ffd23f', '#5d8fd9', '#c8322b', '#3fae72', '#ff9fb2']
  for (let i = 0; i < 20; i++) {
    const x = X0 + 0.6 + i * ((W - 1.2) / 19)
    const sag = Math.sin((i / 19) * Math.PI) * 0.3
    s.push({ box: [0.26, 0.3, 0.02], at: [x, H - 1.55 - sag, F + 0.1], rot: [0, 0, Math.PI / 4], color: flags[i % flags.length] })
  }
  // Car stand (a low round platform with a light rim)
  s.push({ cyl: [STAND.r, STAND.r + 0.1, 0.16, 32], at: [STAND.x, 0.08, STAND.z], color: '#dfe2e8' })
  s.push({ box: [0.06, 0.6, 0.06], at: [STAND.x, 0.3, STAND.z + STAND.r + 0.04], color: '#5d6170' })
  s.push({ torus: [STAND.r + 0.02, 0.04, 6, 32], at: [STAND.x, 0.16, STAND.z], rot: [Math.PI / 2, 0, 0], color: '#ffe08a' })
  // Counter at the back right, a computer, keys on a board, posters
  const cx = X1 - 2.4
  s.push({ box: [2.6, 1.0, 0.7], at: [cx, 0.5, B + 1.4], color: '#a3734f' })
  s.push({ box: [2.7, 0.06, 0.8], at: [cx, 1.03, B + 1.4], color: '#f4f1ea' })
  s.push({ box: [0.45, 0.32, 0.04], at: [cx + 0.5, 1.3, B + 1.3], color: '#22303a' })
  s.push({ box: [1.6, 0.9, 0.04], at: [cx, 2.1, B + 0.33], color: '#a3734f' })
  for (let i = 0; i < 8; i++) s.push({ box: [0.08, 0.14, 0.02], at: [cx - 0.6 + (i % 4) * 0.4, 2.3 - Math.floor(i / 4) * 0.4, B + 0.36], color: ['#ffd23f', '#c8322b', '#5d8fd9', '#3fae72'][i % 4] })
  for (const [x, c] of [
    [X0 + 2.2, '#5d8fd9'],
    [X0 + 4.4, '#ff9fb2'],
  ] as [number, string][]) {
    s.push({ box: [1.5, 1.0, 0.04], at: [x, 2.6, B + 0.33], color: c })
    s.push({ box: [1.1, 0.35, 0.05], at: [x, 2.45, B + 0.34], color: '#ffffff' })
  }
  // Helmets on a shelf on the side wall, plants by the door
  s.push({ box: [0.4, 0.05, 2.4], at: [X1 - 0.5, 1.6, B + 2.6], color: '#a3734f' })
  for (let i = 0; i < 4; i++) s.push({ sphere: [0.16, 10, 8, Math.PI / 2], at: [X1 - 0.5, 1.63, B + 1.7 + i * 0.6], color: ['#c8322b', '#ffffff', '#ffd23f', '#2a2a30'][i] })
  s.push(place(softPlantShapes(P.leaf, '#e9e6df', 7), [X0 + 0.7, 0, F + 0.5], 0, 1.1))
  s.push(place(softPlantShapes(P.leafDark, '#e9e6df', 9), [X1 - 0.7, 0, F + 0.5], 0, 1.1))
  // The scooters on display
  for (const [id, x, z, yaw] of BIKES) s.push(place(vehicleShapes(VEHICLES[id], false), [x, 0.06, z], yaw))
  return s
}

/** The car on the stand turns slowly. */
function TurningCar() {
  const g = useRef<Group>(null)
  useFrame((_, dt) => {
    if (g.current) g.current.rotation.y += Math.min(dt, 0.1) * 0.25
  })
  return (
    <group ref={g} position={[STAND.x, 0.16, STAND.z]} rotation={[0, 0.8, 0]}>
      <VehicleMesh def={VEHICLES[STAND_CAR]} />
    </group>
  )
}

export const Showroom = memo(function Showroom() {
  const shapes = useMemo(showroomShapes, [])
  return (
    <>
      <Shapes shapes={shapes} />
      <TurningCar />
      <SignBoard options={SIGN} width={8.5} position={[CX, H - 0.4, F + 0.22]} />
      <SignBoard options={SALE} flat width={1.0} position={[STAND.x, 0.78, STAND.z + STAND.r + 0.08]} />
      <ActionSpot id="vn-showroom" name={{ vi: 'Showroom Xe Phố Cổ', en: 'Phố Cổ vehicle showroom' }} zone={{ x: CX, z: F - 0.9, halfX: 3.2, halfZ: 1.2 }} actions={ACTIONS} />
      <NPC def={NPCS.chiThuyXe} at={{ x: X1 - 2.4, z: B + 2.25 }} yaw={0} />
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[W / 2, 4, 0.2]} position={[CX, 4, B + 0.15]} collisionGroups={BUILDING_GROUPS} />
        <CuboidCollider args={[0.2, 4, D / 2]} position={[X0 + 0.15, 4, (F + B) / 2]} collisionGroups={BUILDING_GROUPS} />
        <CuboidCollider args={[0.2, 4, D / 2]} position={[X1 - 0.15, 4, (F + B) / 2]} collisionGroups={BUILDING_GROUPS} />
        <CylinderCollider args={[0.6, STAND.r]} position={[STAND.x, 0.6, STAND.z]} collisionGroups={PROP_GROUPS} />
        <CuboidCollider args={[1.35, 0.55, 0.4]} position={[X1 - 2.4, 0.55, B + 1.4]} collisionGroups={PROP_GROUPS} />
        {/* The scooter rows along both walls */}
        <CuboidCollider args={[0.6, 0.6, 2.2]} position={[X0 + 0.9, 0.6, F - 3.2]} collisionGroups={PROP_GROUPS} />
        <CuboidCollider args={[0.6, 0.6, 2.2]} position={[X1 - 0.9, 0.6, F - 3.2]} collisionGroups={PROP_GROUPS} />
      </RigidBody>
    </>
  )
})
