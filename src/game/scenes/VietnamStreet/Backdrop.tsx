import { useMemo } from 'react'
import { PALETTE as P } from '../shared/palette'
import { fluffyTreeShapes, place } from '../shared/props'
import { Shapes, type ShapeItem } from '../shared/Shapes'
import { modelShapes, modelSize, pickBy } from '../shared/models'
import { ROAD, SIDE_ROAD } from './layout'

/**
 * Distant pastel city blocks that fade into the fog.
 * Kept beyond ~28 m from the centre so the follow camera never ends up inside one.
 */
const COLORS = [P.peach, P.butter, P.mint, P.sky2, P.lilac, P.rose, P.cream]
const MIN_RADIUS = 28

/** Deterministic pseudo-random so the skyline looks the same on every load. */
function rand(seed: number) {
  const x = Math.sin(seed * 127.1) * 43758.5453
  return x - Math.floor(x)
}

function onRoad(x: number, z: number, sideRoad: boolean, lake: boolean) {
  // Hồ Gươm lies to the south of the Hà Nội street: no buildings there.
  if (lake && z > ROAD.maxZ + 3) return true
  const onMain = z > ROAD.minZ - 3.5 && z < ROAD.maxZ + 3.5
  const onSide = sideRoad && x > SIDE_ROAD.minX - 3 && x < SIDE_ROAD.maxX + 3 && z < ROAD.minZ
  return onMain || onSide
}

/** Rectangle (play area + margin) where no backdrop block may stand. */
export interface ClearArea {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

const KAYKIT = ['cBuildingA', 'cBuildingB', 'cBuildingC', 'cBuildingD', 'cBuildingE', 'cBuildingF', 'cBuildingG', 'cBuildingH']
const TOWERS = ['kcLowA', 'kcLowC', 'kcLowD', 'kcLowE', 'kcLowH', 'kcLowJ', 'kcLowK', 'kcLowL', 'kcLowN', 'kcLowWideA', 'kcLowWideB']

const lum = (hex: string) => 0.299 * parseInt(hex.slice(1, 3), 16) + 0.587 * parseInt(hex.slice(3, 5), 16) + 0.114 * parseInt(hex.slice(5, 7), 16)

/** A KayKit town house scaled to the plot width (its own colours, the main wall tinted toward the ring's colour). */
function kayKitBlock(seed: number, w: number, color: string): ShapeItem[] | null {
  const name = pickBy(KAYKIT, seed)
  const [sw] = modelSize(name)
  const m = modelShapes(name, { scale: w / sw, paint: (_m, c) => (lum(c) > 205 ? c : rand(seed + c.length) > 0.6 ? color : c) })
  return m
}

/** A Kenney low-detail block stretched to w × h × d, walls in the ring's colour, the glass bands dark blue-grey. */
function towerBlock(seed: number, w: number, h: number, d: number, color: string): ShapeItem[] | null {
  const name = pickBy(TOWERS, seed)
  const [sw, sh, sd] = modelSize(name)
  const m = modelShapes(name, { paint: (_m, c) => (lum(c) < 130 ? '#5d6a7e' : color) })
  if (!m) return null
  return [{ group: m, scale: [w / sw, (h + 4) / sh, d / sd] }]
}

function backdropShapes(colors: string[], roof: string, sideRoad: boolean, tree: 'green' | 'linden', lake: boolean, clear?: ClearArea): ShapeItem[] {
  const s: ShapeItem[] = []
  let seed = 1
  for (let ring = 0; ring < 2; ring++) {
    const radius = MIN_RADIUS + ring * 9
    const count = 26 + ring * 8
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + ring * 0.2
      const r = radius + rand(seed++) * 4
      const x = Math.cos(a) * r
      const z = Math.sin(a) * r
      if (onRoad(x, z, sideRoad, lake)) continue
      if (clear && x > clear.minX - 5 && x < clear.maxX + 5 && z > clear.minZ - 5 && z < clear.maxZ + 5) continue
      const w = 4 + rand(seed++) * 4
      const d = 4 + rand(seed++) * 3
      const h = 5 + rand(seed++) * (ring === 0 ? 8 : 14)
      const color = colors[Math.floor(rand(seed++) * colors.length)]
      const rotY = -a + Math.PI / 2
      // 1.46: library blocks — KayKit's little town houses in front, Kenney's low-detail towers behind; boxes as fallback
      const lib = ring === 0 ? kayKitBlock(seed, w, color) : towerBlock(seed, w, h, d, color)
      if (lib) {
        s.push({ group: lib, at: [x, 0, z], rot: [0, rotY + Math.PI, 0] })
      } else {
        s.push({ box: [w, h, d], at: [x, h / 2, z], rot: [0, rotY, 0], color })
        s.push({ box: [w + 0.2, 0.3, d + 0.2], at: [x, h + 0.15, z], rot: [0, rotY, 0], color: roof })
      }
      if (rand(seed++) > 0.5) {
        const variant = tree === 'linden' ? 'linden' : rand(seed++) > 0.7 ? 'blossom' : 'green'
        s.push(place(fluffyTreeShapes(variant, 1, seed), [x * 0.92, 0, z * 0.92], a, 1.3))
      }
    }
  }
  return s
}

export function Backdrop({
  colors = COLORS,
  roof = P.cream,
  sideRoad = true,
  tree = 'green',
  lake = false,
  clear,
}: {
  colors?: string[]
  roof?: string
  sideRoad?: boolean
  tree?: 'green' | 'linden'
  lake?: boolean
  clear?: ClearArea
}) {
  const shapes = useMemo(() => backdropShapes(colors, roof, sideRoad, tree, lake, clear), [colors, roof, sideRoad, tree, lake, clear])
  return <Shapes shapes={shapes} castShadow={false} receiveShadow={false} />
}
