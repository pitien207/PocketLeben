import { memo, useMemo } from 'react'
import { CuboidCollider, CylinderCollider, RigidBody } from '@react-three/rapier'
import { EATERY_DEFS } from '../../../data/eateries'
import { BUILDING_GROUPS, PROP_GROUPS } from '../../systems/collisionGroups'
import { glowMaterial, WINDOW_GLASS } from '../shared/materials'
import { modelShapes, type ModelOptions } from '../shared/models'
import { PALETTE as P } from '../shared/palette'
import { place, softPlantShapes } from '../shared/props'
import { Shapes, type ShapeItem } from '../shared/Shapes'
import { SignBoard } from '../shared/SignBoard'
import { balcony, seeded, tiledRoof, win } from './decorHouses'
import { hanoiHouse } from './hanoiHouses'
import { EATERIES, type EateryId, type EateryLot } from './layout'

/**
 * 1.40 Quán ăn xen kẽ trong phố (data/eateries.ts, layout.ts `EATERIES`): six tube houses whose ground floor is an
 * open eatery — tiled room, striped awning, a sign, plastic tables and stools spilling onto the pavement, pots,
 * bowls, crates and jars from KayKit Restaurant Bits (CC0, model pack "food"). 1.41: the owners work inside — the
 * door (ShopDoors.tsx) opens the shop room (scenes/ShopRoom), where you order.
 *
 * Every house is built in local space — front line at z = 0, the room toward −z, the pavement toward +z — and
 * turned to face its street. All of them merge into ONE mesh (+ one glow mesh for lamps, coals and lanterns).
 */

const GH = 3.2
const FH = 3.0
const ROOM = 3.6

interface Look {
  wall: string
  trim: string
  awning: [string, string]
  table: string
  stools: string[]
  /** Storeys above the eatery. */
  floors: number
  roof: 'tile' | 'flat'
  shutter: string
}

type BuiltId = Exclude<EateryId, 'pho'>
const LOOKS: Record<BuiltId, Look> = {
  bunCha: { wall: '#ead4a6', trim: '#fff6e0', awning: ['#2f6b4f', '#f4efe4'], table: '#4f8fd8', stools: ['#d4473b', '#4f8fd8'], floors: 2, roof: 'tile', shutter: '#3f7d5c' },
  banhCuon: { wall: '#f2c9b6', trim: '#fff6ea', awning: ['#c8322b', '#ffffff'], table: '#f4f1ea', stools: ['#d4473b', '#3fae72'], floors: 2, roof: 'tile', shutter: '#4f8a8b' },
  lau: { wall: '#b9574b', trim: '#f4e2c4', awning: ['#a3262a', '#ffd23f'], table: '#8a5a3c', stools: ['#c8322b'], floors: 3, roof: 'flat', shutter: '#5d3a2a' },
  banhMi: { wall: '#f6e7c4', trim: '#ffffff', awning: ['#f4c04e', '#8a3b1f'], table: '#d4473b', stools: ['#4f8fd8', '#ffd23f'], floors: 3, roof: 'flat', shutter: '#8a5a3a' },
  com: { wall: '#cfe0c8', trim: '#ffffff', awning: ['#2c5aa0', '#ffffff'], table: '#ffffff', stools: ['#4f8fd8', '#d4473b'], floors: 2, roof: 'tile', shutter: '#2f6b6b' },
  che: { wall: '#fde2ea', trim: '#ffffff', awning: ['#ff9fb2', '#ffffff'], table: '#ffffff', stools: ['#ff9fb2', '#a9d6ff'], floors: 3, roof: 'flat', shutter: '#c97b8a' },
}

// --- Library pieces (KayKit Restaurant Bits) -----------------------------------------------------------------------

/** A KayKit model `h` metres high, or nothing while the pack is missing. */
const M = (name: string, h: number, o: ModelOptions = {}): ShapeItem[] => modelShapes(name, { ...o, height: h }) ?? []
const put = (items: ShapeItem[], x: number, y: number, z: number, rot = 0): ShapeItem => place(items, [x, y, z], rot)
const plastic = (color: string): ModelOptions => ({ paint: () => color })
/** 1.46 Poly Haven (pack urban): a stack of yellow beer crates and the red LPG bottle every kitchen has. */
const BEER: ModelOptions = { paint: (m) => (m === 'c0' ? '#9c7a1c' : '#e8b92a') }
function crates(s: ShapeItem[], x: number, z: number, n: number, rot = 0) {
  for (let i = 0; i < n; i++) s.push(put(M('uCrate', 0.25, BEER), x + (i % 2) * 0.03, i * 0.25, z, rot + (i % 2) * 0.08))
}
const gasTank = (s: ShapeItem[], x: number, z: number, rot = 0) => s.push(put(M('uGasTank', 0.58, { paint: (_m, c) => (parseInt(c.slice(1, 3), 16) - parseInt(c.slice(3, 5), 16) > 40 ? '#c8322b' : parseInt(c.slice(1, 3), 16) - parseInt(c.slice(3, 5), 16) > 20 ? '#9a2a24' : '#8d8f94') }), x, 0, z, rot))

/** The low plastic table + stools of every Hà Nội pavement, a few bowls, chilli sauce and a tissue roll. */
function tableSet(s: ShapeItem[], x: number, z: number, look: Look, seed: number, seats = 4) {
  s.push(put(M('tableSmall', 0.46, plastic(look.table)), x, 0, z, seed))
  for (let i = 0; i < seats; i++) {
    const a = (i / seats) * Math.PI * 2 + seed
    s.push(put(M('stool', 0.3, plastic(look.stools[(i + seed) % look.stools.length])), x + Math.sin(a) * 0.62, 0, z + Math.cos(a) * 0.62, a))
  }
  s.push(put(M('bowl', 0.06), x + 0.12, 0.46, z - 0.06))
  if (seed % 2) s.push(put(M('bowl', 0.06), x - 0.14, 0.46, z + 0.1))
  else s.push(put(M('plate', 0.03), x - 0.12, 0.46, z + 0.1))
  s.push(put(M('ketchup', 0.15, { paint: () => '#d4473b' }), x - 0.02, 0.46, z - 0.18))
  s.push(put(M('papertowel', 0.14), x + 0.18, 0.46, z + 0.16))
}

/** Restaurant table (lẩu): wooden top at sitting height, chairs, a gas burner with a pot of red broth. */
function hotpotTable(s: ShapeItem[], glow: ShapeItem[], x: number, z: number, look: Look, seed: number) {
  s.push(put(M('tableSmall', 0.72, plastic(look.table)), x, 0, z, seed))
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4
    s.push(put(M('chairA', 0.82, { paint: (_m, c) => (c === '#c36331' ? '#c8322b' : '#3a3a40') }), x + Math.sin(a) * 0.8, 0, z + Math.cos(a) * 0.8, a + Math.PI))
  }
  s.push(put(M('stoveTop', 0.07), x, 0.72, z))
  s.push(put(M('potStew', 0.2, { paint: (_m, c) => (c === '#859095' ? '#c9ced8' : c === '#008554' ? '#7fc27a' : '#d4473b') }), x, 0.78, z))
  glow.push({ cyl: [0.12, 0.12, 0.02, 10], at: [x, 0.76, z], color: '#5d9bff' })
  for (const [dx, dz] of [
    [0.32, 0.18],
    [-0.3, -0.2],
  ])
    s.push(put(M('plate', 0.03), x + dx, 0.72, z + dz))
}

/** A counter of boxes (the KayKit counters are kitchen-deep). */
function counter(s: ShapeItem[], x: number, z: number, w: number, d: number, top: string, front: string, h = 0.92) {
  s.push({ box: [w, h - 0.05, d], at: [x, (h - 0.05) / 2, z], color: front })
  s.push({ box: [w + 0.06, 0.05, d + 0.06], at: [x, h - 0.025, z], color: top })
}

/** A glass drinks fridge with coloured bottles. */
function drinksFridge(s: ShapeItem[], glow: ShapeItem[], x: number, z: number) {
  s.push({ box: [0.8, 1.8, 0.6], at: [x, 0.9, z], color: '#e9e6df' })
  s.push({ box: [0.68, 1.5, 0.02], at: [x, 0.95, z + 0.31], color: '#cfe8f0' })
  const colors = ['#c8322b', '#3fae72', '#f4c04e', '#2c5aa0', '#ff9fb2']
  for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) s.push({ cyl: [0.035, 0.035, 0.24, 6], at: [x - 0.24 + c * 0.12, 0.42 + r * 0.36, z + 0.22], color: colors[(r + c) % colors.length] })
  glow.push({ box: [0.6, 0.04, 0.04], at: [x, 1.74, z + 0.28], color: '#f4fbff' })
}

// --- The house -----------------------------------------------------------------------------------------------------

function shell(s: ShapeItem[], glow: ShapeItem[], e: EateryLot, look: Look, seed: number) {
  const hw = e.w / 2
  const d = e.d
  const H = GH + look.floors * FH
  // Closed part behind the room, the storeys above, the side walls of the room
  s.push({ box: [e.w, GH, d - ROOM], at: [0, GH / 2, -ROOM - (d - ROOM) / 2], color: look.wall })
  if (!modelShapes('kfBlock')) s.push({ box: [e.w, H - GH, d], at: [0, GH + (H - GH) / 2, -d / 2], color: look.wall })
  for (const side of [-1, 1]) s.push({ box: [0.24, GH, ROOM], at: [side * (hw - 0.12), GH / 2, -ROOM / 2], color: look.wall })
  for (const side of [-1, 1]) s.push({ box: [0.3, GH + 0.1, 0.3], at: [side * (hw - 0.15), GH / 2, -0.12], color: look.trim })
  // Floor tiles (checkered), the back wall painted lighter, a doorway to the kitchen with a bead curtain
  s.push({ box: [e.w - 0.48, 0.05, ROOM], at: [0, 0.025, -ROOM / 2], color: '#ece4d4' })
  for (let ix = 0; ix < Math.floor((e.w - 0.5) / 0.6); ix++)
    for (let iz = 0; iz < 6; iz++)
      if ((ix + iz) % 2 === 0) s.push({ box: [0.58, 0.01, 0.58], at: [-hw + 0.55 + ix * 0.6, 0.055, -0.3 - iz * 0.6], color: '#c9b79a' })
  s.push({ box: [e.w - 0.48, GH, 0.04], at: [0, GH / 2, -ROOM + 0.02], color: '#f6f0e2' })
  const door = hw - 1.0
  s.push({ box: [0.95, 2.15, 0.05], at: [door, 1.075, -ROOM + 0.05], color: '#3a2a22' })
  const beads = ['#c8322b', '#f4c04e', '#3fae72', '#ffffff']
  for (let i = 0; i < 7; i++) s.push({ box: [0.03, 1.9, 0.02], at: [door - 0.4 + i * 0.13, 1.2, -ROOM + 0.09], color: beads[i % beads.length] })
  // Altar to the god of wealth (thần tài) on the back wall, a calendar, a clock
  s.push({ box: [0.6, 0.05, 0.3], at: [-hw + 0.8, 2.3, -ROOM + 0.2], color: '#8a3b1f' })
  s.push({ box: [0.5, 0.4, 0.22], at: [-hw + 0.8, 2.52, -ROOM + 0.16], color: '#c8322b' })
  glow.push({ sphere: [0.04, 6, 4], at: [-hw + 0.62, 2.44, -ROOM + 0.3], color: '#ff6a3d' })
  glow.push({ sphere: [0.04, 6, 4], at: [-hw + 0.98, 2.44, -ROOM + 0.3], color: '#ff6a3d' })
  s.push({ box: [0.4, 0.55, 0.02], at: [0, 2.2, -ROOM + 0.05], color: '#ffffff' })
  s.push({ box: [0.4, 0.14, 0.025], at: [0, 2.4, -ROOM + 0.05], color: '#c8322b' })
  // Lamps under the ceiling (fluorescent tubes)
  for (const x of e.w > 6 ? [-hw / 2, hw / 2] : [0]) {
    s.push({ box: [1.25, 0.04, 0.14], at: [x, GH - 0.06, -ROOM / 2], color: '#dfe2e8' })
    glow.push({ box: [1.15, 0.05, 0.07], at: [x, GH - 0.1, -ROOM / 2], color: '#fffbe8' })
  }
  // The band where the sign hangs, then windows, balconies and the roof
  s.push({ box: [e.w + 0.06, 1.0, 0.1], at: [0, GH + 0.5, 0.04], color: look.trim })
  // 1.46: the floors above from library modules (Kenney facade + KayKit / Quaternius roof things); hand-built as fallback
  const lib = hanoiHouse(look.roof === 'tile' ? 'tubeTiled' : 'tube', e.w, d, seeded(seed * 13 + 5), {
    upperOnly: true,
    noBalcony1: true,
    fh: FH,
    floors: look.floors + 1,
    wall: look.wall,
    rail: look.shutter,
    awning: look.awning[0],
    airCon: true,
  })
  if (lib) s.push({ group: lib, at: [0, GH - FH, -d / 2] })
  const bays = Math.max(1, Math.floor((e.w - 0.6) / 1.5))
  const step = (e.w - 0.4) / bays
  for (let fl = 0; fl < (lib ? 0 : look.floors); fl++) {
    const y0 = GH + fl * FH
    s.push({ box: [e.w + 0.14, 0.16, 0.2], at: [0, y0 + FH - 0.05, 0.06], color: look.trim })
    for (let b = 0; b < bays; b++) win(s, -e.w / 2 + 0.2 + (b + 0.5) * step, y0 + 1.9, 0, 0.7, 1.25, look.trim, WINDOW_GLASS[(b + fl + seed) % WINDOW_GLASS.length], look.shutter)
    if (fl > 0) balcony(s, 0, y0 + 0.9, 0, e.w - 0.9, look.trim, '#3a3a40', 0.6)
  }
  if (lib) {
    // roof done by the library house
  } else if (look.roof === 'tile') tiledRoof(s, e.w, H, 0)
  else {
    s.push({ box: [e.w + 0.1, 0.5, 0.15], at: [0, H + 0.25, 0.02], color: look.trim })
    s.push({ cyl: [0.42, 0.42, 0.9, 12], at: [hw - 0.9, H + 0.75, -d + 1.2], rot: [0, 0, Math.PI / 2], color: '#d6dbe2' })
    s.push(place(softPlantShapes(P.leaf, '#c97b63', seed + 3), [-hw + 0.7, H, -0.6], seed, 0.9))
  }
  // AC unit and a flower pot on the first floor
  if (!lib) {
    s.push({ box: [0.7, 0.45, 0.3], at: [hw - 0.6, GH + 1.3, 0.18], color: '#eef0f2' })
    s.push({ cyl: [0.14, 0.14, 0.02, 10], at: [hw - 0.6, GH + 1.3, 0.34], rot: [Math.PI / 2, 0, 0], color: '#9aa0aa' })
  }
  // Striped awning over the open front, a scalloped edge, fairy lights
  const n = Math.max(6, Math.round(e.w / 0.42))
  for (let i = 0; i < n; i++) s.push({ box: [e.w / n + 0.002, 0.04, 1.15], at: [-hw + ((i + 0.5) * e.w) / n, GH - 0.42, 0.5], rot: [0.32, 0, 0], color: look.awning[i % 2] })
  for (let i = 0; i < n; i++) s.push({ box: [e.w / n - 0.02, 0.2, 0.03], at: [-hw + ((i + 0.5) * e.w) / n, GH - 0.69, 1.06], color: look.awning[i % 2] })
  const bulbs = ['#ffe08a', '#ff9fb2', '#a9e6ff', '#b8f2a6']
  for (let i = 0; i <= n; i++) glow.push({ sphere: [0.045, 6, 4], at: [-hw + (i * e.w) / n, GH - 0.82 - Math.sin((i / n) * Math.PI) * 0.06, 1.08], color: bulbs[i % bulbs.length] })
  // Menu board on the pavement by the door
  s.push(put(M('menu', 0.85, { paint: (_m, c) => (c === '#808a8f' ? '#2f2a28' : '#ffffff') }), -hw + 0.45, 0, 0.5, 0.3))
}

// --- What each eatery has ------------------------------------------------------------------------------------------

function fill(id: BuiltId, s: ShapeItem[], glow: ShapeItem[], e: EateryLot, look: Look) {
  const hw = e.w / 2
  switch (id) {
    case 'bunCha': {
      // Charcoal brazier on the pavement: patties on the grate, glowing coals, smoke drifting up
      const gx = hw - 0.75
      const gz = 0.75
      s.push({ cyl: [0.32, 0.26, 0.5, 12], at: [gx, 0.25, gz], color: '#3a3a40' })
      s.push({ box: [0.62, 0.02, 0.5], at: [gx, 0.53, gz], color: '#8e98ab' })
      glow.push({ cyl: [0.27, 0.27, 0.03, 12], at: [gx, 0.5, gz], color: '#ff6a2a' })
      for (let i = 0; i < 6; i++) s.push({ box: [0.11, 0.035, 0.09], at: [gx - 0.2 + (i % 3) * 0.2, 0.56, gz - 0.11 + Math.floor(i / 3) * 0.22], color: i % 2 ? '#8a4a2a' : '#9a5432' })
      // a thin drift of smoke, leaning out over the street (away from cô Lụa's face)
      for (let i = 0; i < 3; i++) s.push({ sphere: [0.07 + i * 0.035, 7, 5], at: [gx + 0.15 + i * 0.16, 0.95 + i * 0.38, gz + 0.25 + i * 0.22], color: '#eceae6' })
      s.push(put(M('crateLettuce', 0.26), -hw + 1.0, 0, -ROOM + 0.6))
      counter(s, -hw + 1.3, -ROOM + 1.25, 1.6, 0.55, '#f4f1ea', '#8a5a3c')
      s.push(put(M('dishrack', 0.36), -hw + 0.8, 0.92, -ROOM + 1.25))
      s.push(put(M('bowl', 0.07), -hw + 1.5, 0.92, -ROOM + 1.25))
      s.push(put(M('bowl', 0.07), -hw + 1.75, 0.92, -ROOM + 1.2))
      tableSet(s, -0.6, -1.4, look, 1)
      tableSet(s, -hw + 1.0, 1.05, look, 2)
      crates(s, hw - 0.4, -ROOM + 0.5, 3, 0.2)
      break
    }
    case 'banhCuon': {
      // The steamer: a pot with a cloth stretched over it, steam, a plate of rolls beside it
      const sx = -hw + 0.95
      const sz = -0.6
      s.push({ box: [0.9, 0.42, 0.7], at: [sx + 0.2, 0.21, sz], color: '#8a5a3c' })
      s.push(put(M('potLarge', 0.36, { paint: () => '#b8bcc8' }), sx, 0.42, sz))
      s.push({ cyl: [0.3, 0.3, 0.02, 14], at: [sx, 0.8, sz], color: '#fbf8f2' })
      // a wisp of steam drifting toward the street, clear of bà Tám's face
      for (let i = 0; i < 2; i++) s.push({ sphere: [0.07 + i * 0.03, 7, 5], at: [sx + 0.12 + i * 0.1, 0.95 + i * 0.3, sz + 0.25 + i * 0.25], color: '#f4f6f8' })
      s.push(put(M('plate', 0.03), sx + 0.55, 0.42, sz + 0.05))
      for (let i = 0; i < 3; i++) s.push({ cyl: [0.035, 0.035, 0.16, 6], at: [sx + 0.48 + i * 0.07, 0.47, sz + 0.05], rot: [Math.PI / 2, 0, 0], color: '#fbf8f2' })
      tableSet(s, 0.7, -1.2, look, 3)
      tableSet(s, -0.5, -2.6, look, 4, 3)
      tableSet(s, hw - 1.0, 1.05, look, 5)
      gasTank(s, sx - 0.1, sz - 0.6)
      s.push(put(M('jarC', 0.22), hw - 0.5, 0, -ROOM + 0.4))
      break
    }
    case 'lau': {
      hotpotTable(s, glow, -hw + 1.5, -1.3, look, 0)
      hotpotTable(s, glow, 0.2, -1.5, look, 1)
      counter(s, hw - 1.3, -ROOM + 0.75, 1.9, 0.6, '#3a2a22', '#8a5a3c', 0.85)
      drinksFridge(s, glow, hw - 0.6, -ROOM + 1.7)
      crates(s, hw - 0.45, -ROOM + 2.6, 4)
      crates(s, hw - 0.45, -ROOM + 3.05, 2, 0.1)
      gasTank(s, -hw + 0.4, -ROOM + 0.4)
      s.push(put(M('shelfDeco', 1.2), -1.2, 1.25, -ROOM + 0.3))
      // Red lanterns from the ceiling
      for (const x of [-hw + 1.5, 0.2, hw - 1.4])
        for (const z of [-0.9, -2.4]) {
          s.push({ cyl: [0.005, 0.005, 0.3, 3], at: [x, GH - 0.2, z], color: P.wire })
          glow.push({ sphere: [0.17, 10, 8], at: [x, GH - 0.5, z], scale: [1, 0.85, 1], color: '#e8372c' })
          s.push({ cyl: [0.07, 0.07, 0.05, 8], at: [x, GH - 0.37, z], color: '#f4c04e' })
        }
      // Pavement: two tables, crates of vegetables by the door
      tableSet(s, -1.5, 1.1, look, 6)
      tableSet(s, 1.7, 1.1, look, 7)
      s.push(put(M('crateTomatoes', 0.26), hw - 0.5, 0, 0.45, 0.2))
      s.push(put(M('crateOnions', 0.26), hw - 0.5, 0.27, 0.45, -0.1))
      s.push(put(M('crateLettuce', 0.26), hw - 1.1, 0, 0.4, 0.1))
      break
    }
    case 'banhMi': {
      // The glass cart on the pavement: red frame, baguettes stacked inside, a lamp
      const cx = 0.6
      const cz = 0.75
      s.push({ box: [1.3, 0.85, 0.6], at: [cx, 0.55, cz], color: '#c8322b' })
      for (const dx of [-0.6, 0.6]) s.push({ cyl: [0.12, 0.12, 0.05, 10], at: [cx + dx, 0.12, cz + 0.32], rot: [Math.PI / 2, 0, 0], color: '#3a3a40' })
      s.push({ box: [1.2, 0.55, 0.5], at: [cx, 1.25, cz], color: '#e6f2f6' })
      s.push({ box: [1.32, 0.05, 0.62], at: [cx, 1.55, cz], color: '#c8322b' })
      for (let i = 0; i < 8; i++) s.push({ cyl: [0.045, 0.04, 0.42, 6], at: [cx - 0.4 + (i % 4) * 0.27, 1.04 + Math.floor(i / 4) * 0.1, cz - 0.05 + (i % 2) * 0.1], rot: [0, 0, Math.PI / 2], color: '#e8a243' })
      glow.push({ box: [0.9, 0.04, 0.04], at: [cx, 1.5, cz], color: '#fff2b3' })
      s.push({ box: [0.9, 0.18, 0.02], at: [cx, 0.75, cz + 0.31], color: '#f4c04e' })
      counter(s, -0.6, -ROOM + 0.8, 2.2, 0.6, '#f4f1ea', '#d9b878')
      s.push(put(M('crateBuns', 0.26), -1.2, 0.92, -ROOM + 0.8))
      s.push(put(M('board', 0.04), -0.2, 0.92, -ROOM + 0.8))
      s.push(put(M('knife', 0.03), -0.2, 0.96, -ROOM + 0.8, 0.4))
      tableSet(s, -0.7, -1.4, look, 8, 3)
      break
    }
    case 'com': {
      // The day's dishes in trays on a low counter under a light frame (glass would hide them), a rice pot
      const cw = e.w - 1.6
      counter(s, 0.3, -0.7, cw, 0.6, '#f4f1ea', '#dfe2e8', 0.72)
      for (const dx of [-cw / 2 + 0.05, cw / 2 - 0.05]) for (const dz of [-0.27, 0.27]) s.push({ box: [0.04, 0.34, 0.04], at: [0.3 + dx, 0.89, -0.7 + dz], color: '#b8bcc8' })
      s.push({ box: [cw, 0.03, 0.6], at: [0.3, 1.07, -0.7], color: '#cfe8f0' })
      const dish = ['#a85a3a', '#7fc27a', '#e8a243', '#d4473b', '#fff3d6', '#8a4a2a', '#f4c04e']
      const k = Math.floor((cw - 0.3) / 0.42)
      for (let i = 0; i < k; i++) {
        const x = 0.3 - ((k - 1) * 0.42) / 2 + i * 0.42
        s.push({ box: [0.38, 0.04, 0.32], at: [x, 0.74, -0.7], color: '#dfe2e8' })
        s.push({ box: [0.32, 0.05, 0.26], at: [x, 0.77, -0.7], color: dish[i % dish.length] })
      }
      s.push(put(M('potA', 0.32, { paint: () => '#c9ced8' }), -hw + 0.55, 0.0, -0.75))
      s.push({ cyl: [0.26, 0.26, 0.02, 12], at: [-hw + 0.55, 0.33, -0.75], color: '#fbf8f2' })
      tableSet(s, -0.6, -2.5, look, 9)
      tableSet(s, hw - 1.1, -2.6, look, 10, 3)
      tableSet(s, 0.9, 1.1, look, 11)
      gasTank(s, -hw + 0.5, -1.35, 0.5)
      drinksFridge(s, glow, -hw + 0.6, -ROOM + 0.5)
      break
    }
    case 'che': {
      // Counter of jars (red bean, green jelly, pomelo, coconut, taro), glass cups, an ice box
      counter(s, 0, -1.3, e.w - 1.0, 0.6, '#ffffff', '#ff9fb2', 0.85)
      const fills = ['#c8322b', '#7cc27a', '#f4c04e', '#ffffff', '#9b7bd0', '#e8a243']
      const jars = Math.floor((e.w - 1.2) / 0.32)
      for (let i = 0; i < jars; i++) {
        const name = ['jarA', 'jarAm', 'jarD'][i % 3]
        s.push(put(M(name, 0.32, { paint: (_m, c) => (c === '#6babd6' || c === '#66a5d3' || c === '#706157' ? '#cfe8f0' : fills[i % fills.length]) }), -((jars - 1) * 0.32) / 2 + i * 0.32, 0.85, -1.3))
      }
      for (let i = 0; i < 4; i++) s.push({ cyl: [0.05, 0.04, 0.14, 8], at: [-0.8 + i * 0.5, 0.92, -0.95], color: fills[i] })
      s.push({ box: [0.8, 0.5, 0.5], at: [hw - 0.8, 0.25, -2.4], color: '#4f8fd8' })
      s.push({ box: [0.84, 0.06, 0.54], at: [hw - 0.8, 0.53, -2.4], color: '#ffffff' })
      tableSet(s, -1.1, 1.05, look, 12)
      tableSet(s, 1.0, 1.15, look, 13, 3)
      break
    }
  }
}

const BUILT: BuiltId[] = ['bunCha', 'banhCuon', 'lau', 'banhMi', 'com', 'che']

/** Local (eatery) → world coordinates. */
const toWorld = (e: EateryLot, x: number, z: number) => ({ x: e.x + e.face * x, z: e.z + e.face * z })
const yawOf = (e: EateryLot) => (e.face === 1 ? 0 : Math.PI)

function allShapes() {
  const solid: ShapeItem[] = []
  const glow: ShapeItem[] = []
  BUILT.forEach((id, i) => {
    const e = EATERIES[id]
    const s: ShapeItem[] = []
    const g: ShapeItem[] = []
    shell(s, g, e, LOOKS[id], i * 7 + 3)
    fill(id, s, g, e, LOOKS[id])
    solid.push(place(s, [e.x, 0, e.z], yawOf(e)))
    glow.push(place(g, [e.x, 0, e.z], yawOf(e)))
  })
  return { solid, glow }
}

/** Colliders: the house behind the room, the side walls, counters, grill and cart. */
function Colliders() {
  return (
    <RigidBody type="fixed" colliders={false}>
      {BUILT.map((id) => {
        const e = EATERIES[id]
        const hw = e.w / 2
        const back = toWorld(e, 0, -ROOM - (e.d - ROOM) / 2)
        const walls = [-1, 1].map((side) => toWorld(e, side * (hw - 0.12), -ROOM / 2))
        return (
          <group key={id}>
            <CuboidCollider args={[hw, 6, (e.d - ROOM) / 2]} position={[back.x, 6, back.z]} collisionGroups={BUILDING_GROUPS} />
            {walls.map((w, i) => (
              <CuboidCollider key={i} args={[0.14, 2, ROOM / 2]} position={[w.x, 2, w.z]} collisionGroups={BUILDING_GROUPS} />
            ))}
          </group>
        )
      })}
      {(() => {
        const b = EATERIES.bunCha
        const g = toWorld(b, b.w / 2 - 0.75, 0.75)
        const m = EATERIES.banhMi
        const c = toWorld(m, 0.6, 0.75)
        const co = EATERIES.com
        const cc = toWorld(co, 0.3, -0.7)
        const ch = EATERIES.che
        const chc = toWorld(ch, 0, -1.3)
        const l = EATERIES.lau
        const lc = toWorld(l, l.w / 2 - 1.3, -ROOM + 0.75)
        return (
          <>
            <CylinderCollider args={[0.5, 0.36]} position={[g.x, 0.5, g.z]} collisionGroups={PROP_GROUPS} />
            <CuboidCollider args={[0.66, 0.8, 0.32]} position={[c.x, 0.8, c.z]} collisionGroups={PROP_GROUPS} />
            <CuboidCollider args={[(co.w - 1.6) / 2, 0.55, 0.32]} position={[cc.x, 0.55, cc.z]} collisionGroups={PROP_GROUPS} />
            <CuboidCollider args={[(ch.w - 1.0) / 2, 0.6, 0.32]} position={[chc.x, 0.6, chc.z]} collisionGroups={PROP_GROUPS} />
            <CuboidCollider args={[0.95, 0.6, 0.32]} position={[lc.x, 0.6, lc.z]} collisionGroups={PROP_GROUPS} />
          </>
        )
      })()}
    </RigidBody>
  )
}

export const Eateries = memo(function Eateries() {
  const { solid, glow } = useMemo(allShapes, [])
  return (
    <>
      <Shapes shapes={solid} />
      <Shapes shapes={glow} material={glowMaterial} castShadow={false} receiveShadow={false} />
      {BUILT.map((id) => {
        const e = EATERIES[id]
        const at = toWorld(e, 0, 0.21)
        return <SignBoard key={id} options={EATERY_DEFS[id].sign} width={Math.min(e.w - 0.4, 4.6)} position={[at.x, GH + 0.5, at.z]} rotation={[0, yawOf(e), 0]} />
      })}
      <Colliders />
    </>
  )
})
