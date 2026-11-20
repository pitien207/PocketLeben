import { memo, useMemo } from 'react'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { PROP_GROUPS } from '../../systems/collisionGroups'
import { libraryTree, place } from '../shared/props'
import { modelShapes } from '../shared/models'
import { Shapes, type ShapeItem } from '../shared/Shapes'
import { LAKE, NGOC_SON, PLAY } from './layout'

/**
 * Hồ Gươm (Hoàn Kiếm Lake) just across the far sidewalk: a stone embankment with an
 * iron railing, weeping willows, jade water, Tháp Rùa on its little island and the red
 * Thê Húc bridge arching over to Đền Ngọc Sơn. Seen through the morning haze.
 */

const SHORE_Z = PLAY.maxZ + 0.45
const WATER = '#8cc2bb'

/** Weeping willow (liễu): a leaning trunk with drooping curtains of leaves. */
function willowShapes(): ShapeItem[] {
  const s: ShapeItem[] = [
    { cyl: [0.12, 0.2, 2.6, 7], at: [0, 1.3, 0.1], rot: [0.16, 0, 0.05], color: '#7d5f4b' },
    { cyl: [0.06, 0.09, 1.2, 5], at: [0.35, 2.4, 0.3], rot: [0.3, 0, -0.6], color: '#7d5f4b' },
    { ico: [0.85, 0], at: [0, 2.9, 0.35], scale: [1.3, 0.55, 1.3], color: '#9ccc62' },
  ]
  // Long thin strands hanging from the crown, swaying out over the water
  for (let ring = 0; ring < 2; ring++) {
    const n = ring ? 14 : 9
    const r = ring ? 1.05 : 0.55
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + ring * 0.2
      const len = 1.4 + ((i * 7) % 5) * 0.18 - ring * 0.2
      s.push({
        cyl: [0.07, 0.03, len, 4],
        at: [Math.cos(a) * r, 2.85 - len / 2, 0.35 + Math.sin(a) * r],
        rot: [Math.sin(a) * 0.08 + 0.05, 0, -Math.cos(a) * 0.08],
        color: (i + ring) % 3 === 0 ? '#c2e58a' : (i + ring) % 3 === 1 ? '#a6d66e' : '#8cc05a',
      })
    }
  }
  return s
}

/** Tháp Rùa: a weathered three-tier tower with arched openings, on a grassy islet. */
export function turtleTowerShapes(): ShapeItem[] {
  const s: ShapeItem[] = []
  const stone = '#ddd0b2'
  const moss = '#a4ad84'
  const dark = '#6f6656'
  s.push({ ico: [3.2, 1], at: [0, -1.6, 0], scale: [1.3, 0.6, 0.9], color: '#8fbf6a' })
  s.push({ ico: [1.0, 0], at: [-2.4, 0.6, 0.6], color: '#7cb35d' })
  s.push({ ico: [0.8, 0], at: [2.6, 0.5, -0.4], color: '#93c75e' })
  const tiers: [number, number, number][] = [
    [2.6, 1.9, 0.2],
    [2.0, 1.5, 2.1],
    [1.4, 1.1, 3.6],
  ]
  for (const [w, h, y] of tiers) {
    s.push({ box: [w, h, w * 0.72], at: [0, y + h / 2, 0], color: stone })
    s.push({ box: [w + 0.2, 0.14, w * 0.72 + 0.2], at: [0, y + h + 0.07, 0], color: moss })
    // Arched openings on the front
    const n = w > 2.2 ? 3 : 1
    for (let i = 0; i < n; i++) {
      const x = n === 1 ? 0 : (i - 1) * (w / 3)
      s.push({ box: [w / 6, h * 0.55, 0.05], at: [x, y + h * 0.4, w * 0.36 + 0.01], color: dark })
      s.push({ sphere: [w / 12, 8, 4, Math.PI / 2], at: [x, y + h * 0.67, w * 0.36 + 0.01], scale: [1, 1, 0.1], color: dark })
    }
  }
  // The little pavilion roof on top
  s.push({ cyl: [0.2, 0.95, 0.6, 4], at: [0, 5.15, 0], rot: [0, Math.PI / 4, 0], color: '#7d7466' })
  s.push({ sphere: [0.14, 6, 4], at: [0, 5.55, 0], color: moss })
  return s
}

function lakeShapes(): ShapeItem[] {
  const s: ShapeItem[] = []
  const { minX, maxX } = PLAY
  const width = maxX - minX + 1.2
  const cx = (minX + maxX) / 2
  // Stone embankment, iron railing (painted dark green), shoreline path
  // (1.34: up to the path along the east shore, which leads round to Hàng Khay)
  const ex = (LAKE.east - 70) / 2
  s.push({ box: [70 + LAKE.east, 0.36, 0.5], at: [ex, 0.16, SHORE_Z], color: '#cfc8bb' })
  s.push({ box: [70 + LAKE.east, 0.04, 0.55], at: [ex, 0.35, SHORE_Z], color: '#e3ddd1' })
  // Railing posts and bars, with an opening for the Thê Húc bridge
  const gap0 = NGOC_SON.bridge.x - NGOC_SON.bridge.width / 2 - 0.1
  const gap1 = NGOC_SON.bridge.x + NGOC_SON.bridge.width / 2 + 0.1
  for (let x = -width / 2; x <= width / 2 + 0.01; x += 0.6) {
    if ((cx + x > gap0 && cx + x < gap1) || cx + x > LAKE.east) continue
    s.push({ box: [0.05, 0.75, 0.05], at: [cx + x, 0.72, SHORE_Z], color: '#2c4a3a' })
  }
  const left = gap0 - (cx - width / 2)
  const right = LAKE.east - gap1
  for (const [y, t] of [[1.08, 0.06], [0.6, 0.05]] as const) {
    s.push({ box: [left, t, t], at: [cx - width / 2 + left / 2, y, SHORE_Z], color: '#2c4a3a' })
    s.push({ box: [right, t, t], at: [gap1 + right / 2, y, SHORE_Z], color: '#2c4a3a' })
  }
  // Water, with a few lighter streaks of reflected sky
  // Water from the north shore to Hàng Khay (1.34), west of the east path
  s.push({ box: [80 + LAKE.east, 0.03, LAKE.south - SHORE_Z + 0.6], at: [(LAKE.east - 80) / 2, -0.005, (SHORE_Z + LAKE.south) / 2], color: WATER })
  for (let i = 0; i < 30; i++) {
    const x = ((i * 37) % 76) - 46
    const z = SHORE_Z + 3 + ((i * 13) % (LAKE.south - SHORE_Z - 6))
    s.push({ box: [2 + (i % 4), 0.01, 0.12], at: [x, 0.015, z], color: '#b5dbd3' })
  }
  // Willows leaning over the water, just past the railing
  for (let i = 0; i < 12; i++) {
    const x = -42 + i * 6 + (i % 2) * 1.2
    s.push(place(libraryTree('willow', i) ?? willowShapes(), [x, 0, SHORE_Z + 1.0 + (i % 3) * 0.4], i * 0.7, 1 + (i % 3) * 0.12))
  }
  // Lotus leaves with pink flowers drifting near the shore (1.33)
  for (let i = 0; i < 16; i++) {
    const pad = modelShapes('lilypad', { scale: 0.8 + (i % 3) * 0.25, paint: { Green: '#5f9f58', Pink: '#f59ac0' } })
    if (pad) s.push(place(pad, [-40 + ((i * 53) % 68), 0.0, SHORE_Z + 2.2 + ((i * 7) % 5) * 0.9], i * 1.9))
  }
  s.push(place(turtleTowerShapes(), [LAKE.tower.x, 0, LAKE.tower.z], 0.15, 0.8))
  return s
}

/** Memoized: the lake never changes. */
/**
 * 1.36 (user: you must not walk on the lake): invisible blocks fill the water everywhere except the Thê Húc bridge's
 * lane and Jade Island (which has its own ring wall). [x0, x1, z0, z1] each.
 */
function waterBlocks(): [number, number, number, number][] {
  const { north, south, east } = LAKE
  const I = NGOC_SON.island
  const B = NGOC_SON.bridge
  const ix0 = I.x - I.rx - 0.4
  const ix1 = I.x + I.rx + 0.4
  const lane0 = B.x - B.width / 2 - 0.05
  const lane1 = B.x + B.width / 2 + 0.05
  const n = north + 0.45
  const s = south - 0.45
  return [
    [-80, ix0, n, s],
    [ix1, east - 0.35, n, s],
    [ix0, lane0, n, I.z - I.rz + 0.4],
    [lane1, ix1, n, I.z - I.rz + 0.4],
    [ix0, ix1, I.z + I.rz - 0.4, s],
  ]
}

export const HoGuom = memo(function HoGuom() {
  const shapes = useMemo(lakeShapes, [])
  const blocks = useMemo(waterBlocks, [])
  return (
    <>
      <Shapes shapes={shapes} receiveShadow={false} />
      <RigidBody type="fixed" colliders={false}>
        {blocks.map(([x0, x1, z0, z1]) => (
          <CuboidCollider key={`${x0}-${z0}`} args={[(x1 - x0) / 2, 2, (z1 - z0) / 2]} position={[(x0 + x1) / 2, 2, (z0 + z1) / 2]} collisionGroups={PROP_GROUPS} />
        ))}
      </RigidBody>
    </>
  )
})
