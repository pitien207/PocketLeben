import { memo, useMemo } from 'react'
import { CuboidCollider, CylinderCollider, RigidBody } from '@react-three/rapier'
import { NPCS } from '../../../data/npcs'
import { NPC } from '../../components/npc/NPC'
import { BUILDING_GROUPS, PROP_GROUPS } from '../../systems/collisionGroups'
import { glowMaterial } from '../shared/materials'
import { PALETTE as P } from '../shared/palette'
import { benchShapes, bicycleShapes, cycloShapes, motorbikeShapes, place, plantShapes, treeShapes } from '../shared/props'
import { Shapes, type ShapeItem } from '../shared/Shapes'
import { SignBoard } from '../shared/SignBoard'
import type { SignOptions } from '../shared/textures'
import { decorHouse, planRow, seeded, type DecorLot } from './decorHouses'
import { ActionSpot, type SpotAction } from '../../components/ActionSpot'
import { Traffic } from '../../components/npc/Traffic'
import { AVENUE_LANES, BUILDING_CENTER_Z, BUILDING_DEPTH, NORTH, OFFICES, PLAY, VACATED, WEST, type Lot } from './layout'

/**
 * The north quarter (1.17): the map is no longer one straight street. Behind the Hàng Gai row a
 * second row of houses stands back to back, three ways lead through it (Ngõ Cây Đa, Ngõ Tạp Hóa
 * and Phố Hàng Bông), and they all open onto Phố đi bộ Hàng Đào — a wide walking street with trees
 * down the middle, the cathedral at its west end and a little square with a fountain.
 * None of these houses does anything: they are there to make the town a town.
 */

const { rowB, rowC, rowC2, rowD, ave, cross, gas, walk, plaza, church, clock, lanes, hangBong } = NORTH
const DEPTH_B = rowB.back - rowB.front // 8
const DEPTH_C = rowC.front - rowC.back

interface Row {
  x0: number
  x1: number
  /** Where the visible houses start (the rest is only a collider behind other things). */
  from?: number
  seed: number
}

/** Row B, between the lanes; its fronts face north. */
const ROWS_B: Row[] = [
  { x0: PLAY.minX, x1: lanes[0].x0, from: -44, seed: 11 },
  { x0: lanes[0].x1, x1: lanes[1].x0, seed: 23 },
  { x0: lanes[1].x1, x1: hangBong.x0, seed: 37 },
  { x0: hangBong.x1, x1: PLAY.maxX, seed: 41 },
]
/** Where a shop house that moved north stands in its row (see layout: OFFICES, WEST). */
const hole = (h: Lot): [number, number] => [h.x - h.width / 2, h.x + h.width / 2]
const [NOTARY0, NOTARY1] = hole(OFFICES.houses[1])
const [APS0, APS1] = hole(OFFICES.houses[3])
const [PHARM0, PHARM1] = hole(WEST.houses[1])

/** Row C, north of the walking street; its fronts face south. Gaps: the cross lanes, the square, the notary, the pharmacy. */
const ROWS_C: Row[] = [
  { x0: PLAY.minX, x1: cross[0].x0, from: -44, seed: 53 },
  { x0: cross[0].x1, x1: NOTARY0, seed: 54 },
  { x0: NOTARY1, x1: plaza.x0, seed: 55 },
  { x0: plaza.x1, x1: PHARM0, seed: 67 },
]
void PHARM1
/** Row C2, back to back with row C; its fronts face north onto the avenue. */
const ROWS_C2: Row[] = [
  { x0: PLAY.minX, x1: cross[0].x0, seed: 71 },
  { x0: cross[0].x1, x1: plaza.x0, seed: 73 },
  { x0: plaza.x1, x1: cross[1].x0, seed: 79 },
]
/** Row D, north of the avenue; fronts face south. Gaps: the petrol station, the APS office, the post office. */
const ROWS_D: Row[] = [
  { x0: PLAY.minX, x1: gas.x0, seed: 83 },
  { x0: gas.x1, x1: APS0, seed: 89 },
  { x0: APS1, x1: clock.x0, seed: 97 },
  { x0: clock.x1, x1: PLAY.maxX, seed: 101 },
]
const VACATED_STYLES = ['oldLow', 'pastel', 'modern'] as const

const lotsOf = (r: Row) => planRow(r.from ?? r.x0, r.x1, r.seed)

function houseShapes(): ShapeItem[] {
  const s: ShapeItem[] = []
  ROWS_B.forEach((row) =>
    lotsOf(row).forEach((lot, i) => s.push(place(decorHouse(lot.style, lot.width, DEPTH_B, row.seed * 100 + i), [lot.x, 0, (rowB.back + rowB.front) / 2], Math.PI))),
  )
  ROWS_C.forEach((row) =>
    lotsOf(row).forEach((lot, i) => s.push(place(decorHouse(lot.style, lot.width, DEPTH_C, row.seed * 100 + i), [lot.x, 0, (rowC.back + rowC.front) / 2], 0))),
  )
  ROWS_C2.forEach((row) =>
    lotsOf(row).forEach((lot, i) => s.push(place(decorHouse(lot.style, lot.width, 8, row.seed * 100 + i), [lot.x, 0, (rowC2.back + rowC2.front) / 2], Math.PI))),
  )
  ROWS_D.forEach((row) =>
    lotsOf(row).forEach((lot, i) => s.push(place(decorHouse(lot.style, lot.width, 8, row.seed * 100 + i), [lot.x, 0, (rowD.back + rowD.front) / 2], 0))),
  )
  // Plain houses on the Hàng Gai plots whose shops moved north
  VACATED.forEach((x, i) => s.push(place(decorHouse(VACATED_STYLES[i % 3], 4.5, BUILDING_DEPTH, 500 + i), [x, 0, BUILDING_CENTER_Z], 0)))
  return s
}

/** Shop signs on a few of the plain houses: a town has more shops than you will ever enter. */
const SIGN_TEXTS: SignOptions[] = [
  { title: 'KARAOKE HOA SỮA', subtitle: 'Phòng lạnh · Mở tới khuya', background: '#3a2a5a', border: '#ff7ab8', color: '#ffd23f', accent: '#ff7ab8', aspect: 5 },
  { title: 'SỬA XE MÁY', subtitle: 'Vá săm · Thay dầu · Bơm xe', background: '#2c5aa0', border: '#ffffff', color: '#ffffff', accent: '#ffe08a', aspect: 5 },
  { title: 'CẮT TÓC NAM NỮ', subtitle: 'Gội đầu · Uốn · Nhuộm', background: '#ffffff', border: '#d4473b', color: '#d4473b', accent: '#2c5aa0', aspect: 5 },
  { title: 'PHOTOCOPY · IN ẤN', subtitle: 'Ảnh thẻ lấy ngay', background: '#f4c04e', border: '#c8322b', color: '#c8322b', accent: '#2c5aa0', aspect: 5 },
  { title: 'NHÀ NGHỈ BÌNH MINH', subtitle: 'Phòng theo giờ · Qua đêm', background: '#2f8c7f', border: '#ffe08a', color: '#ffe08a', accent: '#ffffff', aspect: 5 },
  { title: 'INTERNET · GAME', subtitle: 'Máy mạnh · 5k/giờ', background: '#1a1a22', border: '#4dff88', color: '#4dff88', accent: '#ffd23f', aspect: 5 },
]

interface PlacedSign {
  options: SignOptions
  x: number
  z: number
  width: number
  back: boolean
}
function signs(): PlacedSign[] {
  const out: PlacedSign[] = []
  let n = 0
  const add = (lots: DecorLot[], z: number, back: boolean) => {
    for (const lot of lots) {
      if (lot.style !== 'pastel' || n >= SIGN_TEXTS.length) continue
      // spread them along the street
      const last = out[out.length - 1]
      if (last && last.back === back && Math.abs(last.x - lot.x) < 9) continue
      out.push({ options: SIGN_TEXTS[n++], x: lot.x, z, width: Math.min(lot.width - 0.5, 3.4), back })
    }
  }
  ROWS_C.forEach((row) => add(lotsOf(row).filter((l) => l.x > walk.x0 + 3), rowC.front + 0.8, false))
  ROWS_B.forEach((row) => add(lotsOf(row).filter((l) => l.x > walk.x0 + 3), rowB.front - 0.8, true))
  return out
}

const STONE = '#9a958c'
const STONE_DARK = '#7d7870'
const STONE_LIGHT = '#b8b2a6'

/** The cathedral at the end of the walking street: grey stone, two square towers, a rose window. Faces +Z. */
function churchShapes(): ShapeItem[] {
  const s: ShapeItem[] = []
  const f = 4.5
  // Nave with a slate gable roof
  s.push({ box: [6.4, 9, 8.6], at: [0, 4.5, -0.3], color: STONE })
  for (const side of [-1, 1]) s.push({ box: [4.3, 0.22, 8.9], at: [side * 1.75, 10.1, -0.3], rot: [0, 0, -side * 0.62], color: '#5f6470' })
  for (let i = 0; i < 4; i++) {
    for (const side of [-1, 1]) {
      s.push({ box: [0.08, 3.2, 0.7], at: [side * 3.22, 4.6, -3.4 + i * 1.9], color: '#3f4a66' })
      s.push({ box: [0.5, 9, 0.5], at: [side * 3.3, 4.5, -2.45 + i * 1.9], color: STONE_DARK })
    }
  }
  // West front between the towers: three doors, the rose window, a gable with a cross
  s.push({ box: [3.9, 11.2, 0.7], at: [0, 5.6, f - 0.5], color: STONE })
  s.push({ box: [2.9, 2.9, 0.6], at: [0, 11.2, f - 0.5], rot: [0, 0, Math.PI / 4], color: STONE })
  s.push({ box: [0.16, 1.5, 0.16], at: [0, 14.0, f - 0.5], color: STONE_LIGHT })
  s.push({ box: [0.8, 0.16, 0.16], at: [0, 14.25, f - 0.5], color: STONE_LIGHT })
  s.push({ cyl: [1.15, 1.15, 0.12, 20], at: [0, 8.2, f - 0.12], rot: [Math.PI / 2, 0, 0], color: '#3f4a78' })
  s.push({ torus: [1.15, 0.13, 6, 20], at: [0, 8.2, f - 0.08], color: STONE_LIGHT })
  for (let i = 0; i < 4; i++) s.push({ box: [2.2, 0.07, 0.06], at: [0, 8.2, f - 0.04], rot: [0, 0, (i * Math.PI) / 4], color: STONE_LIGHT })
  s.push({ cyl: [0.25, 0.25, 0.14, 10], at: [0, 8.2, f - 0.04], rot: [Math.PI / 2, 0, 0], color: '#d9a43a' })
  const door = (x: number, w: number, h: number) => {
    s.push({ box: [w + 0.4, h + 0.3, 0.2], at: [x, (h + 0.3) / 2, f - 0.12], color: STONE_LIGHT })
    s.push({ box: [w * 0.75, w * 0.75, 0.18], at: [x, h + 0.1, f - 0.12], rot: [0, 0, Math.PI / 4], color: STONE_LIGHT })
    s.push({ box: [w, h, 0.22], at: [x, h / 2, f - 0.1], color: '#5b4030' })
    s.push({ box: [0.05, h, 0.24], at: [x, h / 2, f - 0.09], color: '#3a2a20' })
  }
  door(0, 1.6, 3.2)
  // Towers
  for (const side of [-1, 1]) {
    const x = side * 3.25
    const z = f - 1.3
    s.push({ box: [2.6, 15, 2.6], at: [x, 7.5, z], color: STONE })
    for (const y of [5.2, 9.4, 13.4]) s.push({ box: [2.8, 0.25, 2.8], at: [x, y, z], color: STONE_LIGHT })
    door(x, 1.0, 2.5)
    s.push({ box: [0.55, 2.4, 0.1], at: [x, 7.3, z + 1.31], color: '#3f4a66' })
    for (const dx of [-0.4, 0.4]) s.push({ box: [0.42, 2.2, 0.1], at: [x + dx, 11.5, z + 1.31], color: '#2f3340' })
    for (const dz of [-0.4, 0.4]) s.push({ box: [0.1, 2.2, 0.42], at: [x + side * 1.31, 11.5, z + dz], color: '#2f3340' })
    for (const cx of [-1, 1]) for (const cz of [-1, 1]) s.push({ box: [0.45, 1.3, 0.45], at: [x + cx * 1.08, 15.6, z + cz * 1.08], color: STONE_LIGHT })
    s.push({ cyl: [0, 1.2, 1.7, 4], at: [x, 15.8, z], rot: [0, Math.PI / 4, 0], color: '#5f6470' })
    // rain streaks
    for (let i = 0; i < 3; i++) s.push({ box: [0.3, 3 + i, 0.04], at: [x - 0.7 + i * 0.7, 11 - i * 2, z + 1.31], color: STONE_DARK })
  }
  // Steps
  s.push({ box: [9.6, 0.16, 1.8], at: [0, 0.08, f + 0.7], color: '#c9c3b8' })
  s.push({ box: [9.0, 0.16, 1.1], at: [0, 0.24, f + 0.35], color: '#d3cdc4' })
  return s
}

/** The old post office behind the square: ochre arcades and a clock tower. Faces +Z. */
function clockShapes(): ShapeItem[] {
  const s: ShapeItem[] = []
  const w = clock.x1 - clock.x0
  const f = 3
  const wall = '#f0c878'
  const trim = '#fff6e0'
  s.push({ box: [w, 7.6, 6], at: [0, 3.8, 0], color: wall })
  s.push({ box: [w + 0.3, 0.3, 6.3], at: [0, 7.75, 0], color: trim })
  s.push({ box: [w + 0.2, 0.2, 0.3], at: [0, 3.9, f + 0.08], color: trim })
  s.push({ box: [w - 0.6, 0.7, 5], at: [0, 8.2, 0], color: '#c8653d' })
  const bays = 5
  for (let b = 0; b < bays; b++) {
    const x = -w / 2 + ((b + 0.5) * w) / bays
    // arcade
    s.push({ box: [1.3, 2.7, 0.1], at: [x, 1.35, f + 0.02], color: '#6e5658' })
    s.push({ cyl: [0.65, 0.65, 0.1, 12, ], at: [x, 2.7, f + 0.02], rot: [Math.PI / 2, 0, 0], color: '#6e5658' })
    s.push({ box: [0.3, 3.6, 0.2], at: [x - w / bays / 2, 1.8, f + 0.08], color: trim })
    // upper windows with green shutters
    s.push({ box: [0.9, 1.9, 0.08], at: [x, 5.6, f + 0.02], color: trim })
    s.push({ box: [0.7, 1.7, 0.09], at: [x, 5.6, f + 0.03], color: '#5f7f8a' })
    for (const side of [-1, 1]) s.push({ box: [0.36, 1.7, 0.06], at: [x + side * 0.56, 5.6, f + 0.04], color: '#3f7d5c' })
  }
  s.push({ box: [0.3, 3.6, 0.2], at: [w / 2, 1.8, f + 0.08], color: trim })
  // Clock tower
  s.push({ box: [3, 5, 3], at: [0, 10.2, f - 1.4], color: wall })
  s.push({ box: [3.3, 0.3, 3.3], at: [0, 12.7, f - 1.4], color: trim })
  s.push({ cyl: [0, 2.3, 2.2, 4], at: [0, 13.9, f - 1.4], rot: [0, Math.PI / 4, 0], color: '#c8653d' })
  s.push({ cyl: [1.0, 1.0, 0.1, 20], at: [0, 10.8, f + 0.12], rot: [Math.PI / 2, 0, 0], color: '#fffaf0' })
  s.push({ torus: [1.0, 0.09, 6, 20], at: [0, 10.8, f + 0.16], color: '#5b4030' })
  s.push({ box: [0.08, 0.75, 0.04], at: [0, 11.1, f + 0.19], color: '#3a2a20' })
  s.push({ box: [0.5, 0.08, 0.04], at: [0.22, 10.8, f + 0.19], color: '#3a2a20' })
  for (let i = 0; i < 12; i++) s.push({ box: [0.06, 0.16, 0.03], at: [Math.sin((i * Math.PI) / 6) * 0.82, 10.8 + Math.cos((i * Math.PI) / 6) * 0.82, f + 0.18], rot: [0, 0, (-i * Math.PI) / 6], color: '#5b4030' })
  return s
}

const TREE_XS = (() => {
  const xs: number[] = []
  for (let x = walk.x0 + 5.5; x < walk.x1 - 3; x += 8.5) if (x < hangBong.x0 - 2.5 || x > hangBong.x1 + 2.5) xs.push(x)
  return xs
})()
const MID_Z = (walk.z0 + walk.z1) / 2
const LAMP_XS = [-38, -26, -14, -2, 22, 31]
const BIKES: [number, number, number, string, boolean][] = [
  [-36.5, rowC.front + 1.0, 0.2, P.rose, true],
  [-24.2, rowC.front + 1.0, -0.15, P.mint, true],
  [-23.3, rowC.front + 1.05, 0.1, P.butter, false],
  [-8.5, rowB.front - 1.0, Math.PI + 0.2, P.sky2, true],
  [-7.6, rowB.front - 1.0, Math.PI - 0.1, P.coral, true],
  [2.8, rowC.front + 1.0, 0.1, P.lilac, false],
  [21.5, rowB.front - 1.0, Math.PI + 0.1, P.peach, true],
  [26.4, rowC.front + 1.0, 0.25, P.sky2, true],
  [30.0, rowB.front - 1.05, Math.PI, P.mint, false],
]
const BENCHES: [number, number, number][] = [
  ...TREE_XS.filter((_, i) => i % 2 === 0).map((x): [number, number, number] => [x + 4.25, MID_Z, 0]),
  [plaza.fountain.x - 4.2, plaza.fountain.z, Math.PI / 2],
  [plaza.fountain.x + 4.2, plaza.fountain.z, -Math.PI / 2],
  [plaza.x0 + 1.0, plaza.fountain.z + 4.5, Math.PI / 2],
  [plaza.x1 - 1.0, plaza.fountain.z + 4.5, -Math.PI / 2],
]
const PLAZA_TREES: [number, number][] = [
  [plaza.x0 + 1.3, plaza.z0 - 1.6],
  [plaza.x1 - 1.3, plaza.z0 - 1.6],
  [plaza.x0 + 1.3, plaza.z1 + 1.6],
  [plaza.x1 - 1.3, plaza.z1 + 1.6],
]
const CHURCH_AT: [number, number, number] = [church.x, 0, church.z]
const BALLOONS = { x: plaza.fountain.x + 3.3, z: plaza.z0 - 0.9 }

function propShapes(): { solid: ShapeItem[]; glow: ShapeItem[] } {
  const s: ShapeItem[] = []
  const glow: ShapeItem[] = []
  const r = seeded(99)
  // Trees down the middle of the walking street, each in a round stone planter
  TREE_XS.forEach((x, i) => {
    s.push({ cyl: [0.75, 0.82, 0.42, 14], at: [x, 0.21, MID_Z], color: '#cfc8bb' })
    s.push({ cyl: [0.66, 0.66, 0.05, 14], at: [x, 0.43, MID_Z], color: P.soil })
    s.push(place(treeShapes(i % 3 === 1 ? 'blossom' : 'green'), [x, 0.3, MID_Z], i * 1.7, 1.25))
  })
  for (const [x, z, rot] of BENCHES) s.push(place(benchShapes(), [x, 0, z], rot))
  // Street lamps on both pavements
  for (const x of LAMP_XS) {
    for (const [z, dir] of [[walk.z0 - 1.0, -1], [walk.z1 + 1.0, 1]] as const) {
      const lx = x + (dir > 0 ? 3 : 0)
      s.push({ cyl: [0.06, 0.09, 3.8, 6], at: [lx, 1.9, z], color: '#3f5a52' })
      s.push({ cyl: [0.16, 0.2, 0.2, 8], at: [lx, 0.1, z], color: '#3f5a52' })
      s.push({ box: [0.05, 0.05, 0.7], at: [lx, 3.75, z + dir * 0.3], color: '#3f5a52' })
      glow.push({ sphere: [0.2, 10, 8], at: [lx, 3.55, z + dir * 0.6], color: '#fff2b3' })
    }
  }
  // Strings of silk lanterns across the street
  const colors = ['#d4473b', '#f4c04e', '#ff9fb2', '#3fae72', '#7fb8e8']
  for (let k = 0; k < 7; k++) {
    const x = walk.x0 + 8 + k * 10.4
    if (x > hangBong.x0 - 1 && x < hangBong.x1 + 1) continue
    const span = walk.z0 - walk.z1 - 1.2
    s.push({ box: [0.02, 0.02, span], at: [x, 5.6, MID_Z], color: P.wire })
    for (let i = 0; i < 8; i++) {
      const t = (i + 0.5) / 8
      const y = 5.5 - Math.sin(t * Math.PI) * 0.5
      const z = walk.z1 + 0.6 + t * span
      s.push({ cyl: [0.006, 0.006, 0.2, 3], at: [x, y - 0.05, z], color: P.wire })
      glow.push({ sphere: [0.17, 8, 6], at: [x, y - 0.3, z], scale: [1, 1.15, 1], color: colors[(i + k) % colors.length] })
      s.push({ cyl: [0.06, 0.06, 0.05, 6], at: [x, y - 0.52, z], color: '#f4c04e' })
    }
  }
  // Parked bikes and bicycles, potted plants at the doors
  for (const [x, z, rot, color, motor] of BIKES) s.push(place(motor ? motorbikeShapes(color) : bicycleShapes(color), [x, 0, z], rot))
  for (let i = 0; i < 22; i++) {
    const x = walk.x0 + 3 + r() * (walk.x1 - walk.x0 - 5)
    if (x > hangBong.x0 - 1 && x < hangBong.x1 + 1) continue
    const north = i % 2 === 0
    if (north && x > plaza.x0 - 1 && x < plaza.x1 + 1) continue
    s.push(place(plantShapes(i % 3 ? P.leaf : P.leafDark, ['#c97b63', '#d9b878', '#ffffff', '#7fb8e8'][i % 4]), [x, 0, north ? rowC.front + 0.5 : rowB.front - 0.5], r() * 3, 0.8 + r() * 0.4))
  }
  s.push(place(cycloShapes(), [hangBong.x1 + 1.6, 0, walk.z0 - 1.4], -Math.PI / 2 - 0.2))

  // The square: fountain, flower beds, trees
  const { x: fx, z: fz } = plaza.fountain
  s.push({ cyl: [1.75, 1.9, 0.5, 24], at: [fx, 0.25, fz], color: '#d3cdc4' })
  s.push({ cyl: [1.55, 1.55, 0.08, 24], at: [fx, 0.5, fz], color: '#9fd8f0' })
  s.push({ cyl: [0.2, 0.3, 1.4, 10], at: [fx, 0.95, fz], color: '#c9c3b8' })
  s.push({ cyl: [0.8, 0.3, 0.25, 16], at: [fx, 1.6, fz], color: '#d3cdc4' })
  s.push({ cyl: [0.7, 0.7, 0.05, 16], at: [fx, 1.72, fz], color: '#9fd8f0' })
  s.push({ cyl: [0.1, 0.14, 0.5, 8], at: [fx, 1.95, fz], color: '#c9c3b8' })
  for (let i = 0; i < 5; i++) glow.push({ sphere: [0.09 - i * 0.012, 6, 5], at: [fx, 2.25 + i * 0.16, fz], color: '#e6f7ff' })
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    glow.push({ sphere: [0.06, 5, 4], at: [fx + Math.sin(a) * 0.85, 1.35 - (i % 2) * 0.3, fz + Math.cos(a) * 0.85], scale: [1, 2.2, 1], color: '#e6f7ff' })
  }
  for (const [x, z] of PLAZA_TREES) {
    s.push({ box: [1.6, 0.3, 1.6], at: [x, 0.15, z], color: '#cfc8bb' })
    s.push(place(treeShapes('blossom'), [x, 0.2, z], x, 1.2))
    for (let i = 0; i < 6; i++) s.push({ ico: [0.2, 0], at: [x + Math.sin(i) * 0.55, 0.38, z + Math.cos(i * 1.7) * 0.55], color: i % 2 ? '#ffd166' : '#ff9fb2' })
  }
  // The balloon seller's bunch
  const bc = ['#ff6b6b', '#ffd166', '#6bcBff', '#8ce99a', '#f783ac', '#b197fc', '#ffa94d']
  s.push({ cyl: [0.02, 0.02, 2.0, 4], at: [BALLOONS.x, 1.0, BALLOONS.z], color: '#8e5a34' })
  bc.forEach((c, i) => {
    const a = (i / bc.length) * Math.PI * 2
    const at: [number, number, number] = [BALLOONS.x + Math.sin(a) * 0.38, 2.35 + (i % 3) * 0.28, BALLOONS.z + Math.cos(a) * 0.3]
    s.push({ sphere: [0.24, 10, 8], at, scale: [1, 1.2, 1], color: c.toLowerCase() })
    s.push({ cyl: [0.004, 0.004, 0.5, 3], at: [at[0] * 0.5 + BALLOONS.x * 0.5, at[1] - 0.4, at[2] * 0.5 + BALLOONS.z * 0.5], color: P.wire })
  })
  // In front of the cathedral: a statue on a plinth, two old trees
  s.push({ box: [1.3, 1.5, 1.3], at: [walk.x0 + 2.4, 0.75, MID_Z], color: '#c9c3b8' })
  s.push({ cyl: [0.26, 0.34, 1.5, 10], at: [walk.x0 + 2.4, 2.25, MID_Z], color: '#eeeae2' })
  s.push({ sphere: [0.24, 10, 8], at: [walk.x0 + 2.4, 3.2, MID_Z], color: '#eeeae2' })
  for (const z of [walk.z0 - 2.2, walk.z1 + 2.2]) s.push(place(treeShapes('green'), [walk.x0 + 0.9, 0, z], z, 1.6))
  // The lanes: washing lines, plants and a bike, like any ngõ
  lanes.forEach((lane, i) => {
    const mid = (lane.x0 + lane.x1) / 2
    for (const z of [-15.5, -18.6]) {
      s.push({ box: [lane.x1 - lane.x0, 0.015, 0.015], at: [mid, 2.9, z], color: P.wire })
      ;['#ff9fb2', '#a9d6ff', '#ffffff', '#ffe08a', '#a8e6cf'].forEach((c, k) => {
        const x = lane.x0 + 0.35 + k * ((lane.x1 - lane.x0 - 0.7) / 4)
        s.push({ box: [0.3, 0.42, 0.03], at: [x, 2.67, z], rot: [0, 0, (k % 2 ? 1 : -1) * 0.07], color: c })
      })
    }
    s.push(place(plantShapes(P.leafDark, '#c97b63'), [lane.x1 - 0.3, 0, -14.4], i, 0.8))
    s.push(place(plantShapes(P.leaf, '#d9b878'), [lane.x0 + 0.3, 0, -17.2], i + 1, 0.9))
    s.push(place(plantShapes(P.blossom, '#ffffff'), [lane.x1 - 0.3, 0, -19.6], i + 2, 0.7))
  })
  // Hàng Bông's new stretch: trees and a row of parked bikes on the wide pavements
  for (const z of [-15, -18.5]) {
    s.push(place(treeShapes('green'), [hangBong.x0 + 1.0, 0, z], z, 0.95))
    s.push(place(treeShapes(z < -16 ? 'blossom' : 'green'), [hangBong.x1 - 1.0, 0, z], z + 1, 0.95))
  }
  s.push(place(motorbikeShapes(P.rose), [hangBong.x1 - 0.9, 0, -16.7], Math.PI / 2 + 0.1))
  // Posts of the street-name plaques (the plaques themselves are SignBoards)
  for (const [x, z] of [[hangBong.x0 + 0.45, rowB.front + 0.5], [lanes[0].x1 - 0.25, -4.1], [lanes[1].x0 + 0.25, -4.1]]) {
    s.push({ cyl: [0.035, 0.045, 3.2, 6], at: [x, 1.6, z], color: '#3f5a52' })
  }
  return { solid: s, glow }
}

const GAS_X = (gas.x0 + gas.x1) / 2
const GAS_PUMPS = [GAS_X - 3.2, GAS_X + 3.2]
const GAS_SIGN: SignOptions = { title: 'XĂNG DẦU PHỐ CỔ', subtitle: 'RON 95 · E5 · Dầu DO · Mở 24/24', background: '#f39a2b', border: '#ffffff', color: '#ffffff', accent: '#2c5aa0', aspect: 7 }
const AVE_SIGN: SignOptions = { title: 'PHỐ TRÀNG TIỀN', subtitle: 'Q. Hoàn Kiếm', background: '#2c5aa0', border: '#ffffff', color: '#ffffff', accent: '#ffffff', aspect: 2.6 }
const REFUEL: SpotAction[] = [{ id: 'refuel', labelKey: 'action.refuel', icon: 'wheel', action: 'place.gas', primary: true }]

/** Trees on both pavements of the avenue. */
const AVE_TREES: [number, number][] = (() => {
  const out: [number, number][] = []
  for (let x = PLAY.minX + 4; x < PLAY.maxX; x += 9) {
    if (!(x > plaza.x0 - 1.5 && x < plaza.x1 + 1.5) && !(x > cross[0].x0 - 1 && x < cross[0].x1 + 1) && !(x > cross[1].x0 - 1)) out.push([x, ave.z0 + 1.2])
    if (!(x + 4.5 > gas.x0 - 1 && x + 4.5 < gas.x1 + 1)) out.push([x + 4.5, ave.z1 - 1.2])
  }
  return out
})()

/** The petrol station (1.19; driving comes later): canopy, two pump islands, a little shop, a price pylon. World space. */
function gasShapes(): ShapeItem[] {
  const s: ShapeItem[] = []
  const f = rowD.front
  const w = gas.x1 - gas.x0
  const cz = f - 3.6
  // Shop at the back, side walls of the plot
  s.push({ box: [11, 3.4, 2.4], at: [GAS_X, 1.7, rowD.back + 1.2], color: '#f4f1ea' })
  s.push({ box: [9.6, 2.2, 0.06], at: [GAS_X, 1.4, rowD.back + 2.42], color: '#bfe6f2' })
  s.push({ box: [11.2, 0.5, 2.6], at: [GAS_X, 3.5, rowD.back + 1.2], color: '#2c5aa0' })
  for (let i = 0; i < 5; i++) s.push({ box: [1.4, 0.05, 0.35], at: [GAS_X - 3.6 + i * 1.8, 0.9 + (i % 2) * 0.6, rowD.back + 2.2], color: ['#ffd23f', '#ff9fb2', '#a9d6ff'][i % 3] })
  for (const side of [-1, 1]) s.push({ box: [0.3, 2.2, 8], at: [GAS_X + side * (w / 2 - 0.15), 1.1, (f + rowD.back) / 2], color: '#e9e2d4' })
  // Canopy on four pillars, orange fascia
  s.push({ box: [13, 0.5, 5.6], at: [GAS_X, 5.3, cz + 0.4], color: '#fdfaf2' })
  s.push({ box: [13.2, 0.7, 5.8], at: [GAS_X, 5.55, cz + 0.4], color: '#f39a2b' })
  s.push({ box: [13.2, 0.14, 5.8], at: [GAS_X, 5.14, cz + 0.4], color: '#2c5aa0' })
  for (const x of GAS_PUMPS) {
    for (const dz of [-1.7, 1.7]) s.push({ cyl: [0.16, 0.16, 5.1, 8], at: [x, 2.55, cz + dz], color: '#dfe2e8' })
    // island + two pumps back to back
    s.push({ box: [1.1, 0.18, 3.6], at: [x, 0.09, cz], color: '#c9c3b8' })
    for (const dz of [-0.7, 0.7]) {
      s.push({ box: [0.7, 1.6, 0.5], at: [x, 0.98, cz + dz], color: '#f4f1ea' })
      s.push({ box: [0.72, 0.4, 0.52], at: [x, 1.55, cz + dz], color: '#f39a2b' })
      for (const side of [-1, 1]) {
        s.push({ box: [0.02, 0.26, 0.34], at: [x + side * 0.36, 1.2, cz + dz], color: '#22303a' })
        s.push({ box: [0.03, 0.3, 0.1], at: [x + side * 0.38, 0.75, cz + dz + 0.15], color: '#2a2a30' })
        s.push({ torus: [0.22, 0.02, 4, 10, Math.PI], at: [x + side * 0.38, 0.75, cz + dz], rot: [0, Math.PI / 2, Math.PI], color: '#2a2a30' })
      }
    }
    for (const dz of [-1.75, 1.75]) s.push({ cyl: [0.09, 0.09, 0.8, 8], at: [x, 0.4, cz + dz * 1.02], color: '#ffd23f' })
  }
  // Price pylon by the road
  const px = gas.x1 - 1.2
  s.push({ box: [0.3, 5.2, 0.3], at: [px, 2.6, f - 0.5], color: '#dfe2e8' })
  s.push({ box: [1.6, 2.6, 0.36], at: [px, 4.2, f - 0.5], color: '#2c5aa0' })
  ;['#ffd23f', '#ffffff', '#ffd23f', '#ffffff'].forEach((c, i) => s.push({ box: [1.2, 0.36, 0.4], at: [px, 5.1 - i * 0.56, f - 0.5], color: c }))
  s.push({ cyl: [0.5, 0.5, 0.4, 16], at: [px, 6.0, f - 0.5], rot: [Math.PI / 2, 0, 0], color: '#f39a2b' })
  // Fire buckets, an air pump, flower tubs
  for (let i = 0; i < 3; i++) s.push({ cyl: [0.16, 0.12, 0.3, 8], at: [gas.x0 + 1.0 + i * 0.4, 0.15, rowD.back + 2.9], color: '#d4473b' })
  s.push({ box: [0.4, 1.1, 0.3], at: [gas.x0 + 0.8, 0.55, f - 2.0], color: '#3fae72' })
  s.push(place(plantShapes(P.leafDark, '#ffffff'), [gas.x0 + 0.9, 0, f - 0.5], 0, 1.2))
  // Avenue: trees and tall lamps
  AVE_TREES.forEach(([x, z], i) => s.push(place(treeShapes(i % 4 === 1 ? 'blossom' : 'green'), [x, 0, z], i * 1.3, 1.25)))
  for (let x = PLAY.minX + 8.5; x < PLAY.maxX; x += 18) {
    for (const [z, dir] of [[ave.z0 + 0.5, -1], [ave.z1 - 0.5, 1]] as const) {
      s.push({ cyl: [0.07, 0.11, 6.4, 6], at: [x, 3.2, z], color: '#5d6170' })
      s.push({ box: [0.07, 0.07, 1.6], at: [x, 6.35, z + dir * 0.8], color: '#5d6170' })
      s.push({ box: [0.3, 0.1, 0.6], at: [x, 6.28, z + dir * 1.5], color: '#fff2b3' })
    }
  }
  // Cross lanes: plants and washing like every ngõ
  cross.forEach((lane, i) => {
    const mid = (lane.x0 + lane.x1) / 2
    for (const z of [-42, -50]) {
      s.push({ box: [lane.x1 - lane.x0, 0.015, 0.015], at: [mid, 2.9, z], color: P.wire })
      ;['#ffe08a', '#ffffff', '#a9d6ff', '#ff9fb2'].forEach((c, k) => s.push({ box: [0.3, 0.42, 0.03], at: [lane.x0 + 0.5 + k * ((lane.x1 - lane.x0 - 1) / 3), 2.67, z], color: c }))
    }
    s.push(place(plantShapes(P.leaf, '#c97b63'), [lane.x0 + 0.35, 0, -40 - i], i, 0.9))
    s.push(place(plantShapes(P.leafDark, '#d9b878'), [lane.x1 - 0.35, 0, -48 - i], i + 1, 0.8))
  })
  return s
}

const HANG_DAO: SignOptions = { title: 'PHỐ HÀNG ĐÀO', subtitle: 'Phố đi bộ', background: '#2c5aa0', border: '#ffffff', color: '#ffffff', accent: '#ffffff', aspect: 2.6 }
const NGO_1: SignOptions = { title: 'NGÕ CÂY ĐA', subtitle: 'Thông sang Hàng Đào', background: '#2c5aa0', border: '#ffffff', color: '#ffffff', accent: '#ffffff', aspect: 2.6 }
const NGO_2: SignOptions = { title: 'NGÕ TẠP HÓA', subtitle: 'Thông sang Hàng Đào', background: '#2c5aa0', border: '#ffffff', color: '#ffffff', accent: '#ffffff', aspect: 2.6 }
const CHURCH_SIGN: SignOptions = { title: 'NHÀ THỜ LỚN', subtitle: 'Hà Nội', background: '#6b665e', border: '#d9d3c6', color: '#f4efe4', accent: '#d9d3c6', aspect: 3.2 }
const POST_SIGN: SignOptions = { title: 'BƯU ĐIỆN', subtitle: 'Bờ Hồ', background: '#8a5a2b', border: '#ffe08a', color: '#ffe08a', accent: '#ffffff', aspect: 3.4 }

/** Street-name plaques on their own posts, at the mouth of every way through. */
const PLAQUES = [
  { options: HANG_DAO, x: hangBong.x0 + 0.45, z: rowB.front + 0.5 },
  { options: NGO_1, x: lanes[0].x1 - 0.25, z: -4.1 },
  { options: NGO_2, x: lanes[1].x0 + 0.25, z: -4.1 },
]

const WALKERS = {
  a: [
    { x: walk.x0 + 5, z: walk.z0 - 2.2 },
    { x: hangBong.x0 - 2, z: walk.z0 - 2.2 },
    { x: hangBong.x1 + 2, z: walk.z0 - 3.0 },
    { x: walk.x1 - 2, z: walk.z0 - 2.4 },
  ],
  b: [
    { x: walk.x1 - 3, z: walk.z1 + 2.4 },
    { x: plaza.x1 + 1, z: walk.z1 + 2.2 },
    { x: plaza.x0 - 1, z: walk.z1 + 2.6 },
    { x: walk.x0 + 6, z: walk.z1 + 2.2 },
  ],
}

export const NorthQuarter = memo(function NorthQuarter() {
  const houses = useMemo(houseShapes, [])
  const churchS = useMemo(churchShapes, [])
  const clockS = useMemo(clockShapes, [])
  const props = useMemo(propShapes, [])
  const placed = useMemo(signs, [])
  const landmarks = useMemo<ShapeItem[]>(
    () => [place(churchS, CHURCH_AT, Math.PI / 2), place(clockS, [(clock.x0 + clock.x1) / 2, 0, rowD.front - 3], 0), place(gasShapes(), [0, 0, 0])],
    [churchS, clockS],
  )
  const zB = (rowB.back + rowB.front) / 2
  const zC = (rowC.back + rowC.front) / 2
  return (
    <>
      <Shapes shapes={houses} />
      <Shapes shapes={landmarks} />
      <Shapes shapes={props.solid} />
      <Shapes shapes={props.glow} material={glowMaterial} castShadow={false} receiveShadow={false} />
      {placed.map((p) => (
        <SignBoard key={p.options.title} options={p.options} width={p.width} position={[p.x, 3.32, p.z]} rotation={p.back ? [0, Math.PI, 0] : [0, 0, 0]} />
      ))}
      {PLAQUES.map((p) => (
        <SignBoard key={p.options.title} options={p.options} width={0.95} position={[p.x, 2.95, p.z + 0.05]} />
      ))}
      <SignBoard options={CHURCH_SIGN} width={2.2} position={[church.x + 4.72, 4.4, church.z]} rotation={[0, Math.PI / 2, 0]} />
      <SignBoard options={POST_SIGN} width={2.6} position={[(clock.x0 + clock.x1) / 2, 4.6, rowD.front + 0.22]} />
      <SignBoard options={GAS_SIGN} width={7} position={[GAS_X, 5.55, rowD.front - 0.9]} />
      <SignBoard options={AVE_SIGN} width={0.95} position={[plaza.x0 + 0.4, 2.95, plaza.z1 - 0.45]} rotation={[0, Math.PI, 0]} />
      <ActionSpot id="vn-gas" name={{ vi: 'Cây xăng Phố Cổ', en: 'Petrol station' }} zone={{ x: GAS_X, z: rowD.front - 2.6, halfX: 5, halfZ: 2.2 }} actions={REFUEL} />
      <NPC def={NPCS.anhXang} at={{ x: GAS_X, z: rowD.front - 1.3 }} yaw={0} />
      <Traffic lanes={AVENUE_LANES} perLane={1} kinds={['car', 'motorbike', 'motorbike', 'car']} />

      <RigidBody type="fixed" colliders={false}>
        {/* One block per row segment: nobody walks between these houses, and the camera stays out. */}
        {ROWS_B.map((r) => (
          <CuboidCollider key={`b${r.seed}`} args={[(r.x1 - r.x0) / 2, 6, DEPTH_B / 2]} position={[(r.x0 + r.x1) / 2, 6, zB]} collisionGroups={BUILDING_GROUPS} />
        ))}
        {ROWS_C.map((r) => (
          <CuboidCollider key={`c${r.seed}`} args={[(r.x1 - r.x0) / 2, 6, DEPTH_C / 2]} position={[(r.x0 + r.x1) / 2, 6, zC]} collisionGroups={BUILDING_GROUPS} />
        ))}
        <CuboidCollider args={[5.2, 8, 5.2]} position={[church.x, 8, church.z]} collisionGroups={BUILDING_GROUPS} />
        <CuboidCollider args={[(clock.x1 - clock.x0) / 2, 5, 3]} position={[(clock.x0 + clock.x1) / 2, 5, rowD.front - 3]} collisionGroups={BUILDING_GROUPS} />
        {ROWS_C2.map((r) => (
          <CuboidCollider key={`c2${r.seed}`} args={[(r.x1 - r.x0) / 2, 6, 4]} position={[(r.x0 + r.x1) / 2, 6, (rowC2.back + rowC2.front) / 2]} collisionGroups={BUILDING_GROUPS} />
        ))}
        {ROWS_D.map((r) => (
          <CuboidCollider key={`d${r.seed}`} args={[(r.x1 - r.x0) / 2, 6, 4]} position={[(r.x0 + r.x1) / 2, 6, (rowD.back + rowD.front) / 2]} collisionGroups={BUILDING_GROUPS} />
        ))}
        {VACATED.map((x) => (
          <CuboidCollider key={`v${x}`} args={[2.3, 6, BUILDING_DEPTH / 2]} position={[x, 6, BUILDING_CENTER_Z]} collisionGroups={BUILDING_GROUPS} />
        ))}
        {/* Petrol station: shop at the back, the two pump islands, the price sign */}
        <CuboidCollider args={[5.5, 2, 1.2]} position={[GAS_X, 2, rowD.back + 1.2]} collisionGroups={BUILDING_GROUPS} />
        {GAS_PUMPS.map((x) => (
          <CuboidCollider key={`g${x}`} args={[0.5, 0.9, 1.5]} position={[x, 0.9, rowD.front - 3.6]} collisionGroups={PROP_GROUPS} />
        ))}
        {AVE_TREES.map(([x, z]) => (
          <CylinderCollider key={`a${x}${z}`} args={[0.8, 0.25]} position={[x, 0.8, z]} collisionGroups={PROP_GROUPS} />
        ))}
        {/* The west end of the walking street stops at the cathedral steps. */}
        <CuboidCollider args={[0.5, 4, (walk.z0 - walk.z1) / 2]} position={[walk.x0 - 0.5, 4, MID_Z]} collisionGroups={PROP_GROUPS} />
        {TREE_XS.map((x) => (
          <CylinderCollider key={`t${x}`} args={[0.6, 0.82]} position={[x, 0.6, MID_Z]} collisionGroups={PROP_GROUPS} />
        ))}
        {BENCHES.map(([x, z, rot], i) => (
          <CuboidCollider key={`n${i}`} args={[0.8, 0.45, 0.25]} position={[x, 0.45, z]} rotation={[0, rot, 0]} collisionGroups={PROP_GROUPS} />
        ))}
        {BIKES.map(([x, z, rot], i) => (
          <CuboidCollider key={`k${i}`} args={[0.24, 0.55, 0.78]} position={[x, 0.55, z]} rotation={[0, rot, 0]} collisionGroups={PROP_GROUPS} />
        ))}
        {PLAZA_TREES.map(([x, z]) => (
          <CuboidCollider key={`p${x}${z}`} args={[0.8, 0.8, 0.8]} position={[x, 0.8, z]} collisionGroups={PROP_GROUPS} />
        ))}
        <CylinderCollider args={[0.6, 1.9]} position={[plaza.fountain.x, 0.6, plaza.fountain.z]} collisionGroups={PROP_GROUPS} />
        <CuboidCollider args={[0.65, 1, 0.65]} position={[walk.x0 + 2.4, 1, MID_Z]} collisionGroups={PROP_GROUPS} />
        <CuboidCollider args={[0.5, 0.6, 0.9]} position={[hangBong.x1 + 1.6, 0.6, walk.z0 - 1.4]} collisionGroups={PROP_GROUPS} />
      </RigidBody>

      <NPC def={NPCS.chuBong} at={{ x: BALLOONS.x - 0.45, z: BALLOONS.z + 0.1 }} yaw={0.2} />
      <NPC def={NPCS.coDao} at={WALKERS.a[0]} path={{ points: WALKERS.a, pauseSec: [1, 5] }} />
      <NPC def={NPCS.anhPhong} at={WALKERS.b[0]} path={{ points: WALKERS.b, pauseSec: [1, 6] }} />
    </>
  )
})
