import { memo, useMemo } from 'react'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { PROP_GROUPS } from '../../systems/collisionGroups'
import { glowMaterial } from '../shared/materials'
import { modelShapes, pickBy } from '../shared/models'
import { libraryTree, place } from '../shared/props'
import { Shapes, type ShapeItem } from '../shared/Shapes'
import { SignBoard } from '../shared/SignBoard'
import type { SignOptions } from '../shared/textures'
import { LampPools } from './LampPools'
import { LAKE } from './layout'

/**
 * 1.34 — one map round Hồ Gươm: a stone path along the east shore from Hàng Gai's far pavement down to Phố Hàng
 * Khay (railing and willows on the water side, lamps), and east of it Vườn hoa Lý Thái Tổ: lawns, flower beds,
 * many trees, benches, and the king's statue on its plinth in the middle.
 */

const { north, south, east, path, park } = LAKE
const STATUE = { x: (path + park) / 2 + 0.6, z: (north + south) / 2 }
const SIGN: SignOptions = { title: 'VƯỜN HOA LÝ THÁI TỔ', subtitle: 'Đường ven hồ → Phố Hàng Khay', background: '#2c5c43', border: '#f6efe0', color: '#fff6d8', accent: '#ffd76a', aspect: 4.6 }

function hedge(x0: number, z0: number, x1: number, z1: number): ShapeItem[] {
  const len = Math.hypot(x1 - x0, z1 - z0)
  const n = Math.max(2, Math.round(len / 0.9))
  const s: ShapeItem[] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    s.push({ ico: [0.55 + (i % 3) * 0.06, 1], at: [x0 + (x1 - x0) * t, 0.45, z0 + (z1 - z0) * t], color: i % 4 === 0 ? '#86c25a' : '#5f9c4a', grad: [0.75, 1.1] })
  }
  return s
}

/** The bronze king on a granite plinth, facing the lake. */
function statueShapes(): ShapeItem[] {
  const bronze = '#4f5a46'
  const dark = '#3c4536'
  return [
    { box: [3.2, 0.5, 3.2], at: [0, 0.25, 0], color: '#cfc8bb' },
    { box: [2.4, 1.8, 2.4], at: [0, 1.4, 0], color: '#8f8a80' },
    { box: [2.7, 0.25, 2.7], at: [0, 2.42, 0], color: '#a7a196' },
    // robe, sleeves, the scroll, head and the royal hat
    { cyl: [0.42, 0.72, 2.1, 10], at: [0, 3.6, 0], color: bronze },
    { cyl: [0.28, 0.35, 0.5, 8], at: [0, 4.85, 0], color: bronze },
    { sphere: [0.3, 12, 10], at: [0, 5.3, 0.02], color: bronze },
    { cyl: [0.26, 0.3, 0.34, 8], at: [0, 5.66, -0.02], color: dark },
    { box: [0.9, 0.06, 0.12], at: [0, 5.72, -0.12], color: dark },
    { cyl: [0.16, 0.2, 0.9, 8], at: [0.45, 4.3, 0.18], rot: [0.9, 0, 0.3], color: bronze },
    { cyl: [0.16, 0.2, 0.9, 8], at: [-0.45, 4.3, 0.18], rot: [0.9, 0, -0.3], color: bronze },
    { cyl: [0.06, 0.06, 0.6, 8], at: [0, 4.05, 0.62], rot: [0, 0, Math.PI / 2], color: '#6f7a62' },
  ]
}

function lakeEastShapes(): { solid: ShapeItem[]; glow: ShapeItem[]; lamps: [number, number, number][] } {
  const s: ShapeItem[] = []
  const glow: ShapeItem[] = []
  const lamps: [number, number, number][] = []
  const len = south - north
  const midZ = (north + south) / 2
  // The path: pale stone with a darker edging, the embankment and the railing on the water side
  s.push({ box: [path - east, 0.02, len], at: [(east + path) / 2, 0.008, midZ], color: '#e6d9c2' })
  s.push({ box: [0.3, 0.025, len], at: [path - 0.15, 0.01, midZ], color: '#cdbd9f' })
  s.push({ box: [0.5, 0.36, len], at: [east, 0.16, midZ], color: '#cfc8bb' })
  s.push({ box: [0.55, 0.04, len], at: [east, 0.35, midZ], color: '#e3ddd1' })
  for (let z = north + 0.3; z < south; z += 0.6) s.push({ box: [0.05, 0.75, 0.05], at: [east, 0.72, z], color: '#2c4a3a' })
  for (const [y, t] of [[1.08, 0.06], [0.6, 0.05]] as const) s.push({ box: [t, t, len], at: [east, y, midZ], color: '#2c4a3a' })
  // Willows leaning over the water
  for (let z = north + 4; z < south - 2; z += 6.5) {
    const t = libraryTree('willow', Math.round(z) + 40)
    if (t) s.push(place(t, [east - 1.0, 0, z], z, 1.05))
  }
  // Lamps along the path
  for (let z = north + 6; z < south; z += 12) {
    const m = modelShapes('streetlight', { paint: { Green: '#2c4a3a', Light: '#fff1c4', Glass: '#fff1c4' } })
    if (m) s.push(place(m, [path - 0.45, 0, z]))
    glow.push({ sphere: [0.2, 10, 8], at: [path - 0.45, 4.05, z], color: '#ffe3a8' })
    lamps.push([path - 0.8, z, 4.6])
  }
  // The garden: a darker lawn, paths to the statue, a ring of flowers round it
  s.push({ box: [park - path, 0.025, len], at: [(path + park) / 2, 0.01, midZ], color: '#8fca72' })
  s.push({ box: [park - path, 0.03, 2.2], at: [(path + park) / 2, 0.02, STATUE.z], color: '#e3d6bf' })
  s.push({ box: [2.2, 0.03, len], at: [STATUE.x, 0.02, midZ], color: '#e3d6bf' })
  s.push({ cyl: [4.6, 4.6, 0.032, 28], at: [STATUE.x, 0.022, STATUE.z], color: '#e3d6bf' })
  s.push(place(statueShapes(), [STATUE.x, 0, STATUE.z], -Math.PI / 2))
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2
    const f = modelShapes('flowers', { scale: 1.1, paint: { Cyan: pickBy(['#ff6f61', '#ffd34d', '#ff8fb3', '#ffffff'], i), Yellow: '#fff3a8', Green: '#5fa553' } })
    if (f) s.push(place(f, [STATUE.x + Math.cos(a) * 3.6, 0, STATUE.z + Math.sin(a) * 3.6], a))
  }
  // Trees of many kinds in the lawns (never on the paths), bushes, benches by the paths
  let n = 0
  for (let x = path + 2.2; x < park - 1; x += 4.4) {
    for (let z = north + 3; z < south - 2; z += 5.5) {
      n++
      const jx = x + Math.sin(n * 2.3) * 0.7
      const jz = z + Math.cos(n * 1.3) * 0.9
      if (Math.abs(jx - STATUE.x) < 2.6 || Math.abs(jz - STATUE.z) < 2.8) continue
      if (Math.hypot(jx - STATUE.x, jz - STATUE.z) < 7) continue
      if (n % 3 === 0) {
        const b = modelShapes(pickBy(['bush1', 'bush2', 'berries1', 'berries2'], n), { scale: 0.85, paint: { Green: '#6db85c', Berry: pickBy(['#e8475a', '#ffd34d', '#ff8fb3'], n) } })
        if (b) s.push(place(b, [jx, 0, jz], n))
      } else {
        const t = libraryTree(pickBy(['green', 'blossom', 'green', 'palm', 'blossom', 'green'] as const, n), n + 1200)
        if (t) s.push(place(t, [jx, 0, jz], n * 1.7, 1.1))
      }
    }
  }
  for (let z = north + 8; z < south - 4; z += 9) {
    if (Math.abs(z - STATUE.z) < 6) continue
    const m = modelShapes('bench1', { scale: 1.5, paint: { Wood: '#a3734f' } })
    if (m) s.push(place(m, [STATUE.x + 1.6, 0, z], -Math.PI / 2))
  }
  // Posts under the garden sign at the path entrance
  for (const dx of [-1.05, 1.05]) s.push({ cyl: [0.05, 0.06, 2.6, 8], at: [path + 0.9 + dx, 1.3, north + 0.55], color: '#2c4a3a' })
  // Hedges on the outer edges of the garden
  s.push(...hedge(park + 0.3, north + 0.3, park + 0.3, south - 0.3))
  s.push(...hedge(path + 1.6, north - 0.1, park, north - 0.1))
  return { solid: s, glow, lamps }
}

export const LakeEast = memo(function LakeEast() {
  const shapes = useMemo(lakeEastShapes, [])
  const len = south - north
  const midZ = (north + south) / 2
  return (
    <>
      <Shapes shapes={shapes.solid} />
      <Shapes shapes={shapes.glow} material={glowMaterial} castShadow={false} receiveShadow={false} />
      <LampPools spots={shapes.lamps} />
      <SignBoard options={SIGN} width={2.3} position={[path + 0.9, 2.2, north + 0.6]} rotation={[0, 0, 0]} />
      <RigidBody type="fixed" colliders={false}>
        {/* water side of the path, the garden's east and north edges, the statue */}
        <CuboidCollider args={[0.3, 3, len / 2]} position={[east, 3, midZ]} collisionGroups={PROP_GROUPS} />
        <CuboidCollider args={[0.5, 4, len / 2 + 1]} position={[park + 0.9, 4, midZ]} collisionGroups={PROP_GROUPS} />
        <CuboidCollider args={[(park - path) / 2 + 0.5, 4, 0.4]} position={[(path + park) / 2 + 1.2, 4, north - 0.5]} collisionGroups={PROP_GROUPS} />
        <CuboidCollider args={[1.6, 3, 1.6]} position={[STATUE.x, 3, STATUE.z]} collisionGroups={PROP_GROUPS} />
      </RigidBody>
    </>
  )
})
