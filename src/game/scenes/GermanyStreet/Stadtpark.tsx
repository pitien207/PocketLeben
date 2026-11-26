import { memo, useMemo } from 'react'
import { CuboidCollider, CylinderCollider, RigidBody } from '@react-three/rapier'
import type { Vec3 } from '../../../data/config'
import { NPCS } from '../../../data/npcs'
import { ActionSpot, type SpotAction } from '../../components/ActionSpot'
import { NPC } from '../../components/npc/NPC'
import { BUILDING_GROUPS, PROP_GROUPS } from '../../systems/collisionGroups'
import { groundMaterial } from '../shared/materials'
import { PALETTE as P } from '../shared/palette'
import { benchShapes, place, treeShapes } from '../shared/props'
import { Shapes, type ShapeItem } from '../shared/Shapes'
import { SignBoard } from '../shared/SignBoard'
import type { SignOptions } from '../shared/textures'
import { fitTree, useBlockerVersion } from '../shared/treeFit'
import { kBeerTable, kLantern, LANTERN_HEAD } from './townProps'
import { glowMaterial } from '../shared/materials'

/**
 * Stadtpark (map extension 1.7), east of the bakery: a duck pond, a playground with
 * swings, a lakeside kiosk with beer-garden tables, a statue at the gate, and a few
 * secrets (a hedgehog, a geocache, a daisy meadow, shooting stars at night).
 * Across the road: Luca's ice-cream cart.
 */

export const PARK = { x0: 14.5, x1: 34, z0: -12.8, z1: -4.6 }
const POND = { x: 25.5, z: -9.2, rx: 3.2, rz: 2.0 }
const SWING = { x: 17.2, z: -10.8 }
const KIOSK = { x: 32.0, z: -10.9 }
const STATUE = { x: 21.6, z: -5.6 }
const GATE = { x0: 20.4, x1: 24.6 }
export const PARK_TREES: [number, number][] = [
  [15.4, -5.7],
  [20.6, -12.1],
  [28.2, -12.2],
  [33.6, -5.5],
  [15.6, -12.0],
  [18.0, 12.8],
  [27.0, 13.2],
  [32.0, 12.8],
]
const BENCH = { x: 28.8, z: -6.3 }
const EIS = { x: 21.5, z: 11.6 }

const PARK_SIGN: SignOptions = { title: 'STADTPARK', subtitle: 'Hunde an die Leine · Enten nicht mit Brot füttern?', background: '#3f7d5c', border: '#ffffff', color: '#ffffff', accent: '#ffe08a', aspect: 4.2 }
const KIOSK_SIGN: SignOptions = { title: 'KIOSK AM SEE', subtitle: 'Eis · Schorle · Brezeln', background: '#f4c04e', border: '#ffffff', color: '#5b4636', accent: '#5b4636', aspect: 3.6 }

function groundShapes(): ShapeItem[] {
  const s: ShapeItem[] = []
  const { x0, x1, z0, z1 } = PARK
  s.push({ box: [x1 - x0, 0.02, z1 - z0], at: [(x0 + x1) / 2, 0.012, (z0 + z1) / 2], color: '#a8d08d' })
  // Gravel paths: from the gate to the pond, around to the kiosk and the playground
  s.push({ box: [GATE.x1 - GATE.x0 - 1.2, 0.022, 3.0], at: [(GATE.x0 + GATE.x1) / 2, 0.016, z1 - 1.5], color: '#e6dcc6' })
  s.push({ box: [12, 0.022, 1.3], at: [24.5, 0.016, -6.6], color: '#e6dcc6' })
  s.push({ box: [1.3, 0.022, 4.5], at: [30.6, 0.016, -9.0], color: '#e6dcc6' })
  s.push({ box: [1.3, 0.022, 4.5], at: [19.9, 0.016, -9.0], color: '#e6dcc6' })
  // Sandbox sand, playground bark
  s.push({ box: [4.6, 0.022, 4.4], at: [17.4, 0.016, -9.7], color: '#d9c39a' })
  // Pond: stone rim and water
  s.push({ cyl: [1.08, 1.08, 0.06, 28], at: [POND.x, 0.03, POND.z], scale: [POND.rx, 1, POND.rz], color: '#cfc8bb' })
  s.push({ cyl: [1, 1, 0.07, 28], at: [POND.x, 0.04, POND.z], scale: [POND.rx, 1, POND.rz], color: '#8cc2d8' })
  for (let i = 0; i < 4; i++) s.push({ cyl: [0.32, 0.32, 0.075, 10], at: [POND.x - 2.0 + i * 1.1, 0.045, POND.z - 1.0 + (i % 2) * 0.9], scale: [1, 1, 0.7], color: '#7fc28a' })
  return s
}

function parkShapes(): ShapeItem[] {
  const s: ShapeItem[] = []
  const { x0, x1, z0, z1 } = PARK
  // Low iron fence along the sidewalk (gap at the gate), hedge around the back
  for (const [a, b] of [
    [x0, GATE.x0],
    [GATE.x1, x1],
  ]) {
    s.push({ box: [b - a, 0.06, 0.06], at: [(a + b) / 2, 0.55, z1 + 0.05], color: '#3a4a44' })
    s.push({ box: [b - a, 0.06, 0.06], at: [(a + b) / 2, 0.2, z1 + 0.05], color: '#3a4a44' })
    for (let x = a + 0.2; x < b; x += 0.4) s.push({ box: [0.04, 0.6, 0.04], at: [x, 0.32, z1 + 0.05], color: '#3a4a44' })
  }
  for (const x of [GATE.x0, GATE.x1]) {
    s.push({ box: [0.3, 1.3, 0.3], at: [x, 0.65, z1 + 0.05], color: '#cfc8bb' })
    s.push({ sphere: [0.2, 10, 8], at: [x, 1.4, z1 + 0.05], color: '#cfc8bb' })
  }
  const hedge = (from: [number, number], to: [number, number]) => {
    const n = Math.max(2, Math.round(Math.hypot(to[0] - from[0], to[1] - from[1]) / 0.9))
    for (let i = 0; i <= n; i++) {
      const t = i / n
      s.push({ ico: [0.6 + (i % 3) * 0.06], at: [from[0] + (to[0] - from[0]) * t, 0.5, from[1] + (to[1] - from[1]) * t], rot: [i, i * 1.3, 0], color: i % 4 ? P.leafDark : P.leafLight })
    }
  }
  hedge([x0, z0 - 0.2], [x1 + 0.3, z0 - 0.2])
  hedge([x1 + 0.3, z0], [x1 + 0.3, z1 - 0.3])
  hedge([x0 - 0.2, z0], [x0 - 0.2, z1 - 0.6])
  for (const [x, z] of PARK_TREES) s.push(fitTree(treeShapes(Math.round(x * 5 + z) % 4 === 0 ? 'birch' : Math.round(x * 5 + z) % 4 === 1 ? 'pine' : 'linden', Math.round(x * 5 + z)), [x, 0, z], x * 0.7, 1.15))
  // Hollow in the geocache tree
  s.push({ sphere: [0.13, 8, 6], at: [20.6, 0.9, -11.85], scale: [0.8, 1.2, 0.4], color: '#4a3226' })
  // Statue on a plinth (a reading poet), holding out a hand — with a lost red glove
  const { x: sx, z: sz } = STATUE
  s.push({ box: [0.9, 1.0, 0.9], at: [sx, 0.5, sz], color: '#cfc8bb' })
  s.push({ box: [1.0, 0.1, 1.0], at: [sx, 1.02, sz], color: '#bdb5a5' })
  s.push({ cyl: [0.22, 0.3, 0.9, 10], at: [sx, 1.5, sz], color: '#8fae9a' })
  s.push({ sphere: [0.2, 12, 8], at: [sx, 2.1, sz], color: '#8fae9a' })
  s.push({ box: [0.3, 0.08, 0.2], at: [sx - 0.12, 1.7, sz + 0.25], rot: [0.4, 0, 0], color: '#8fae9a' })
  s.push({ cyl: [0.05, 0.05, 0.45, 6], at: [sx + 0.3, 1.75, sz + 0.12], rot: [0.6, 0, -1.1], color: '#8fae9a' })
  s.push({ sphere: [0.08, 8, 6], at: [sx + 0.5, 1.83, sz + 0.25], scale: [1, 1.3, 0.6], color: '#d4473b' })
  // Playground: swings, a slide, a sandbox
  const { x: wx, z: wz } = SWING
  for (const dx of [-1.1, 1.1]) {
    s.push({ cyl: [0.05, 0.06, 2.3, 6], at: [wx + dx, 1.1, wz - 0.4], rot: [0.18, 0, 0], color: '#d4473b' })
    s.push({ cyl: [0.05, 0.06, 2.3, 6], at: [wx + dx, 1.1, wz + 0.4], rot: [-0.18, 0, 0], color: '#d4473b' })
  }
  s.push({ cyl: [0.06, 0.06, 2.4, 8], at: [wx, 2.2, wz], rot: [0, 0, Math.PI / 2], color: '#d4473b' })
  for (const dx of [-0.45, 0.45]) {
    for (const ex of [-0.18, 0.18]) s.push({ cyl: [0.012, 0.012, 1.6, 4], at: [wx + dx + ex, 1.4, wz], color: P.darkSteel })
    s.push({ box: [0.5, 0.05, 0.22], at: [wx + dx, 0.6, wz], color: '#f4c04e' })
  }
  s.push({ box: [0.5, 1.4, 0.06], at: [19.5, 0.7, -8.0], color: '#4f86d9' })
  s.push({ box: [0.55, 0.06, 2.0], at: [19.5, 0.75, -7.1], rot: [-0.62, 0, 0], color: '#f4c04e' })
  for (let i = 0; i < 4; i++) s.push({ box: [0.5, 0.04, 0.04], at: [19.5, 0.3 + i * 0.32, -8.25], color: '#ffffff' })
  s.push({ box: [1.7, 0.25, 0.12], at: [16.3, 0.12, -7.6], color: '#c4a074' })
  s.push({ box: [1.7, 0.25, 0.12], at: [16.3, 0.12, -9.1], color: '#c4a074' })
  s.push({ box: [0.12, 0.25, 1.6], at: [15.5, 0.12, -8.35], color: '#c4a074' })
  s.push({ box: [0.12, 0.25, 1.6], at: [17.1, 0.12, -8.35], color: '#c4a074' })
  s.push({ cyl: [0.25, 0.3, 0.2, 8], at: [16.0, 0.12, -8.2], color: '#ead6a8' })
  s.push({ box: [0.2, 0.18, 0.2], at: [16.6, 0.12, -8.6], color: '#ff9fb2' })
  // Ducks on the pond (bodies, heads, orange beaks)
  for (const [dx, dz, r, c] of [
    [-1.0, -0.3, 0.4, '#ffffff'],
    [0.8, 0.4, -1.2, '#ffffff'],
    [0.3, -0.9, 2.2, '#8a6a4a'],
  ] as const) {
    const x = POND.x + dx
    const z = POND.z + dz
    s.push({ sphere: [0.16, 10, 8], at: [x, 0.13, z], rot: [0, r, 0], scale: [1.4, 0.8, 1], color: c })
    s.push({ sphere: [0.09, 8, 6], at: [x + Math.cos(r) * 0.18, 0.28, z - Math.sin(r) * 0.18], color: c === '#ffffff' ? '#ffffff' : '#3f7d5c' })
    s.push({ cyl: [0, 0.035, 0.09, 4], at: [x + Math.cos(r) * 0.28, 0.27, z - Math.sin(r) * 0.28], rot: [0, r, -Math.PI / 2], color: '#f4a440' })
  }
  // Benches facing the pond, lamp posts along the path
  s.push(place(benchShapes('#3a4a44'), [BENCH.x, 0, BENCH.z], Math.PI))
  s.push(place(benchShapes('#3a4a44'), [22.6, 0, -6.3], Math.PI))
  for (const x of [18.5, 27.0, 33.0]) {
    const lib = kLantern()
    if (lib) {
      s.push(place(lib, [x, 0, -5.4], x))
      continue
    }
    s.push({ cyl: [0.05, 0.08, 3.2, 8], at: [x, 1.6, -5.4], color: '#3a4a44' })
    s.push({ sphere: [0.22, 10, 8], at: [x, 3.3, -5.4], color: '#fff2b3' })
  }
  // Kiosk am See: a little wooden hut with a counter window, beer-garden tables
  const { x: kx, z: kz } = KIOSK
  s.push({ box: [2.8, 2.4, 2.0], at: [kx, 1.2, kz], color: '#c4a074' })
  s.push({ box: [3.2, 0.2, 2.4], at: [kx, 2.5, kz], rot: [0.08, 0, 0], color: '#3f7d5c' })
  s.push({ box: [1.8, 0.9, 0.06], at: [kx, 1.45, kz + 1.01], color: '#2f2f38' })
  s.push({ box: [2.0, 0.08, 0.4], at: [kx, 0.98, kz + 1.15], color: P.wood })
  for (let i = 0; i < 5; i++) s.push({ box: [0.4, 0.3, 0.05], at: [kx - 0.85 + i * 0.42, 2.25, kz + 1.24], color: i % 2 ? '#ffffff' : '#3f7d5c' })
  for (const [tx, tz] of [
    [29.8, -8.4],
    [32.6, -7.6],
  ]) {
    const set = kBeerTable()
    if (set) {
      s.push(place(set, [tx, 0, tz]))
      s.push({ cyl: [0.05, 0.05, 2.0, 6], at: [tx, 1.2, tz], color: '#ffffff' })
      s.push({ cyl: [0.02, 1.1, 0.35, 12], at: [tx, 2.2, tz], color: '#d4473b' })
      continue
    }
    s.push({ box: [1.8, 0.06, 0.6], at: [tx, 0.75, tz], color: P.wood })
    for (const dx of [-0.7, 0.7]) s.push({ box: [0.06, 0.72, 0.5], at: [tx + dx, 0.36, tz], color: P.woodDark })
    for (const dz of [-0.55, 0.55]) s.push({ box: [1.8, 0.05, 0.28], at: [tx, 0.45, tz + dz], color: P.wood })
    s.push({ cyl: [0.05, 0.05, 2.0, 6], at: [tx, 1.2, tz], color: '#ffffff' })
    s.push({ cyl: [0.02, 1.1, 0.35, 12], at: [tx, 2.2, tz], color: '#d4473b' })
  }
  // Hedgehog bush in the far corner (+ the hedgehog's nose peeking out)
  for (const [dx, dz, r] of [
    [0, 0, 0.62],
    [0.5, 0.2, 0.45],
    [-0.45, 0.25, 0.5],
  ] as const) s.push({ ico: [r * 0.85, 1], at: [33.45 + dx * 0.8, r * 0.7, -12.6 + dz * 0.6], color: '#6fae5a' })
  // 1.49 moved back 0.3 m: the bush grew into the kiosk's back wall
  s.push({ sphere: [0.16, 8, 6], at: [33.0, 0.12, -12.05], scale: [1.2, 0.8, 1], color: '#8a6a4a' })
  s.push({ sphere: [0.05, 6, 4], at: [32.87, 0.13, -11.95], color: '#f2c4a8' })
  s.push({ sphere: [0.02, 4, 4], at: [32.58, 0.14, -11.57], color: '#2d2430' })
  // Daisy meadow
  for (let i = 0; i < 22; i++) {
    const a = i * 2.4
    const r = 0.25 + (i % 5) * 0.22
    s.push({ sphere: [0.05, 6, 4], at: [31.2 + Math.cos(a) * r, 0.06, -6.2 + Math.sin(a) * r * 0.8], scale: [1, 0.4, 1], color: i % 4 ? '#ffffff' : '#ffe08a' })
  }
  // Ice-cream cart across the road: a cart with a striped umbrella
  const { x: ex, z: ez } = EIS
  s.push({ box: [1.4, 0.9, 0.8], at: [ex, 0.75, ez], color: '#ffffff' })
  s.push({ box: [1.42, 0.2, 0.82], at: [ex, 0.4, ez], color: '#ff9fb2' })
  for (const dx of [-0.5, 0.5]) s.push({ cyl: [0.22, 0.22, 0.06, 12], at: [ex + dx, 0.22, ez + 0.42], rot: [Math.PI / 2, 0, 0], color: '#5d6170' })
  s.push({ cyl: [0.03, 0.03, 1.6, 6], at: [ex, 1.9, ez], color: '#5d6170' })
  s.push({ cyl: [0.03, 1.0, 0.35, 16], at: [ex, 2.7, ez], color: '#ff9fb2' })
  s.push({ torus: [0.9, 0.05, 4, 20], at: [ex, 2.55, ez], rot: [Math.PI / 2, 0, 0], color: '#ffffff' })
  for (let i = 0; i < 4; i++) s.push({ sphere: [0.09, 8, 6], at: [ex - 0.45 + i * 0.3, 1.25, ez - 0.1], color: ['#ffd1dc', '#fff3b0', '#c9e8a0', '#d9b48a'][i] })
  return s
}

const at = (x: number, y: number, z: number): Vec3 => [x, y, z]
const PARK_GLOW: ShapeItem[] = [18.5, 27.0, 33.0].map((x) => ({ sphere: [0.17, 10, 8], at: [x, LANTERN_HEAD, -5.4], color: '#ffe7a8' }))
const SWING_ACTIONS: SpotAction[] = [{ id: 'swing', labelKey: 'action.swing', icon: 'swing', action: 'park.swing', primary: true }]
const DUCKS: SpotAction[] = [{ id: 'ducks', labelKey: 'action.feedDucks', icon: 'duck', action: 'park.ducks', primary: true }]
const KIOSK_ACTIONS: SpotAction[] = [{ id: 'shop', labelKey: 'action.shop', icon: 'shop', action: 'de.openShop', arg: 'kiosk', primary: true }]
const EIS_ACTIONS: SpotAction[] = [{ id: 'shop', labelKey: 'action.shop', icon: 'shop', action: 'park.eis', primary: true }]

export const Stadtpark = memo(function Stadtpark() {
  const ground = useMemo(groundShapes, [])
  const fit = useBlockerVersion()
  const park = useMemo(parkShapes, [fit])
  const parkGlow = useMemo(() => !!kLantern(), [])
  const { x0, x1, z0, z1 } = PARK
  return (
    <>
      <Shapes shapes={ground} material={groundMaterial} castShadow={false} />
      <Shapes shapes={park} />
      {parkGlow && <Shapes shapes={PARK_GLOW} material={glowMaterial} castShadow={false} receiveShadow={false} />}
      <SignBoard options={PARK_SIGN} width={2.4} position={[GATE.x0 - 1.4, 1.35, z1 + 0.12]} />
      <SignBoard options={KIOSK_SIGN} width={2.2} position={[KIOSK.x, 2.0, KIOSK.z + 1.06]} flat />
      <RigidBody type="fixed" colliders={false}>
        {/* Fence (with the gate gap), hedges and the west side behind the bakery */}
        <CuboidCollider args={[(GATE.x0 - x0) / 2, 0.6, 0.12]} position={[(x0 + GATE.x0) / 2, 0.6, z1 + 0.05]} collisionGroups={PROP_GROUPS} />
        <CuboidCollider args={[(x1 - GATE.x1) / 2, 0.6, 0.12]} position={[(GATE.x1 + x1) / 2, 0.6, z1 + 0.05]} collisionGroups={PROP_GROUPS} />
        <CuboidCollider args={[(x1 - x0) / 2 + 0.5, 2, 0.4]} position={[(x0 + x1) / 2, 2, z0 - 0.4]} collisionGroups={PROP_GROUPS} />
        <CuboidCollider args={[0.3, 2, (z1 - z0) / 2]} position={[x0 - 0.3, 2, (z0 + z1) / 2]} collisionGroups={PROP_GROUPS} />
        {/* Pond (a box and two round ends) */}
        <CuboidCollider args={[POND.rx - 1.4, 0.4, POND.rz * 0.95]} position={[POND.x, 0.4, POND.z]} collisionGroups={PROP_GROUPS} />
        <CylinderCollider args={[0.4, POND.rz * 0.95]} position={[POND.x - POND.rx + 1.9, 0.4, POND.z]} collisionGroups={PROP_GROUPS} />
        <CylinderCollider args={[0.4, POND.rz * 0.95]} position={[POND.x + POND.rx - 1.9, 0.4, POND.z]} collisionGroups={PROP_GROUPS} />
        {PARK_TREES.map(([x, z]) => (
          <CylinderCollider key={`${x},${z}`} args={[0.8, 0.25]} position={[x, 0.8, z]} collisionGroups={PROP_GROUPS} />
        ))}
        <CuboidCollider args={[0.5, 1.1, 0.5]} position={[STATUE.x, 1.1, STATUE.z]} collisionGroups={PROP_GROUPS} />
        <CuboidCollider args={[1.4, 1.2, 1.0]} position={[KIOSK.x, 1.2, KIOSK.z]} collisionGroups={BUILDING_GROUPS} />
        <CuboidCollider args={[1.25, 1.1, 0.5]} position={[SWING.x, 1.1, SWING.z]} collisionGroups={PROP_GROUPS} />
        <CuboidCollider args={[0.35, 0.7, 1.2]} position={[19.5, 0.7, -7.6]} collisionGroups={PROP_GROUPS} />
        <CuboidCollider args={[0.95, 0.5, 0.55]} position={[29.8, 0.5, -8.4]} collisionGroups={PROP_GROUPS} />
        <CuboidCollider args={[0.95, 0.5, 0.55]} position={[32.6, 0.5, -7.6]} collisionGroups={PROP_GROUPS} />
        <CylinderCollider args={[0.5, 0.6]} position={[33.45, 0.5, -12.6]} collisionGroups={PROP_GROUPS} />
        <CuboidCollider args={[0.75, 0.6, 0.45]} position={[EIS.x, 0.6, EIS.z]} collisionGroups={PROP_GROUPS} />
      </RigidBody>

      <ActionSpot id="park-swing" name={{ vi: 'Xích đu', en: 'Swings', de: 'Schaukel' }} zone={{ x: SWING.x, z: SWING.z + 1.0, halfX: 1.3, halfZ: 0.7 }} actions={SWING_ACTIONS} />
      <ActionSpot id="park-ducks" name={{ vi: 'Hồ vịt', en: 'Duck pond', de: 'Ententeich' }} zone={{ x: POND.x, z: POND.z + POND.rz + 0.7, halfX: 2.2, halfZ: 0.6 }} actions={DUCKS} />
      <ActionSpot id="park-kiosk" name={{ vi: 'Kiosk bên hồ', en: 'Lakeside kiosk', de: 'Kiosk am See' }} zone={{ x: KIOSK.x, z: KIOSK.z + 1.6, halfX: 1.4, halfZ: 0.6 }} actions={KIOSK_ACTIONS} />
      <ActionSpot id="park-eis" name={{ vi: 'Xe kem Luca', en: 'Luca’s ice cream', de: 'Lucas Eiswagen' }} zone={{ x: EIS.x, z: EIS.z - 1.0, halfX: 1.0, halfZ: 0.6 }} actions={EIS_ACTIONS} marker={{ at: at(EIS.x, 3.3, EIS.z), when: { noFlag: 'stats.eis' } }} />

      <NPC def={NPCS.omaGerda} at={{ x: BENCH.x, z: BENCH.z }} yaw={Math.PI} seatY={0.45} />
      <NPC def={NPCS.kioskWirt} at={{ x: KIOSK.x - 1.0, z: KIOSK.z + 1.5 }} yaw={0.2} />
      <NPC def={NPCS.luca} at={{ x: EIS.x + 0.2, z: EIS.z + 0.75 }} yaw={Math.PI} />
      <NPC def={NPCS.parkKid} at={{ x: 16.3, z: -8.35 }} yaw={0.6} seatY={0.15} />
    </>
  )
})
