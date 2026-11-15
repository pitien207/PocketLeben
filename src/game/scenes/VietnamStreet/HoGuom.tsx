import { memo, useMemo } from 'react'
import { place } from '../shared/props'
import { Shapes, type ShapeItem } from '../shared/Shapes'
import { NGOC_SON, PLAY } from './layout'

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
function turtleTowerShapes(): ShapeItem[] {
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
  s.push({ box: [140, 0.36, 0.5], at: [0, 0.16, SHORE_Z], color: '#cfc8bb' })
  s.push({ box: [140, 0.04, 0.55], at: [0, 0.35, SHORE_Z], color: '#e3ddd1' })
  // Railing posts and bars, with an opening for the Thê Húc bridge
  const gap0 = NGOC_SON.bridge.x - NGOC_SON.bridge.width / 2 - 0.1
  const gap1 = NGOC_SON.bridge.x + NGOC_SON.bridge.width / 2 + 0.1
  for (let x = -width / 2; x <= width / 2 + 0.01; x += 0.6) {
    if (cx + x > gap0 && cx + x < gap1) continue
    s.push({ box: [0.05, 0.75, 0.05], at: [cx + x, 0.72, SHORE_Z], color: '#2c4a3a' })
  }
  const left = gap0 - (cx - width / 2)
  const right = cx + width / 2 - gap1
  for (const [y, t] of [[1.08, 0.06], [0.6, 0.05]] as const) {
    s.push({ box: [left, t, t], at: [cx - width / 2 + left / 2, y, SHORE_Z], color: '#2c4a3a' })
    s.push({ box: [right, t, t], at: [gap1 + right / 2, y, SHORE_Z], color: '#2c4a3a' })
  }
  // Water, with a few lighter streaks of reflected sky
  s.push({ box: [160, 0.03, 80], at: [0, -0.005, SHORE_Z + 40.3], color: WATER })
  for (let i = 0; i < 18; i++) {
    const x = ((i * 37) % 60) - 30
    const z = SHORE_Z + 3 + ((i * 13) % 30)
    s.push({ box: [2 + (i % 4), 0.01, 0.12], at: [x, 0.015, z], color: '#b5dbd3' })
  }
  // Willows leaning over the water, just past the railing
  for (let i = 0; i < 12; i++) {
    const x = -42 + i * 6 + (i % 2) * 1.2
    s.push(place(willowShapes(), [x, 0, SHORE_Z + 1.0 + (i % 3) * 0.4], i * 0.7, 1 + (i % 3) * 0.12))
  }
  s.push(place(turtleTowerShapes(), [-6, 0, SHORE_Z + 10], 0.15, 0.8))
  return s
}

/** Memoized: the lake never changes. */
export const HoGuom = memo(function HoGuom() {
  const shapes = useMemo(lakeShapes, [])
  return <Shapes shapes={shapes} receiveShadow={false} />
})
