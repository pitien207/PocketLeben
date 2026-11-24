import { memo, useMemo } from 'react'
import { NPCS, raggedOutfit } from '../../../data/npcs'
import { ActionSpot, type SpotAction } from '../../components/ActionSpot'
import { NPC } from '../../components/npc/NPC'
import { HOME_ROOM } from '../interiors'
import { Cobwebs, type WebSpec } from '../shared/Cobwebs'
import { CeilingFan, TearCalendar, WallClock, WallFan } from '../shared/Decor'
import { glowMaterial } from '../shared/materials'
import { modelShapes } from '../shared/models'
import { frame, M, newBuild, pendant, put, rug, wainscot } from '../ShopRoom/kit'
import { PALETTE as P } from '../shared/palette'
import { libraryPot, motorbikeShapes, place, plantShapes } from '../shared/props'
import { Room, DOORMAT } from '../shared/Room'
import { Shapes, type ShapeItem } from '../shared/Shapes'
import { useFlags } from '../../../store/flagsStore'
import { houseLevel } from '../../systems/family'
import { HouseScene } from './HouseScene'

/**
 * Home, the ground floor of the family's tube house in the lane: a wooden bed with a
 * rolled-up mosquito net, the study desk by the window, the family altar, a wooden
 * tea set where Bố reads the paper — and the motorbike parked indoors for the night.
 *
 * 1.42 redone (user: "làm lại nhà mik cả lúc bình thường và nghèo, đằng sau có cửa ra vườn nuôi gà"): gạch bông floor,
 * a tiled wainscot, family photos and the children's certificates (giấy khen) on the walls, a bookshelf, a fridge, a
 * ceiling fan and a lamp, a rug and plants — all of which disappear or wilt as the debts grow (houseShapes) — and the
 * green back door with glass panes between the altar and the window: "Ra vườn" → scene homeYard (the hens).
 */

const { w: W, d: D, h: H } = HOME_ROOM
const BACK = -D / 2
const STYLE = { wall: '#f6dfa8', wallLow: '#ecc983', floor: '#e2a77f', floorAlt: '#d69a72', trim: '#fff3d6', window: '#cfe8f6' }
/** The paint gets dingier with every debt level (story 2.1 §1.8). */
const STYLES = [
  STYLE,
  // 1.21: one loan is enough for the room to look clearly worn
  { wall: '#d0b886', wallLow: '#ad905e', floor: '#ba8a68', floorAlt: '#a87a5a', trim: '#d2c4a2', window: '#adc3cf' },
  { wall: '#c3aa7c', wallLow: '#a28558', floor: '#ad7f60', floorAlt: '#9a6f53', trim: '#c7b896', window: '#a2b8c4' },
  { wall: '#b49b70', wallLow: '#957a50', floor: '#9e7356', floorAlt: '#8c654b', trim: '#b9ab8b', window: '#97adb8' },
]

const WOOD = '#9a6a43'
const WOOD_DARK = '#74502f'
const LACQUER = '#b8322a'

function furniture(): ShapeItem[] {
  const s: ShapeItem[] = []
  // Bed: wooden frame, straw mat (chiếu cói), pillows, folded blanket, mosquito-net frame
  const { x: bx, z: bz } = HOME_ROOM.bed
  // 1.42: the Quaternius king bed (CC0), repainted: wooden frame, straw mat, white pillows, a blue blanket
  const bed = M('iBedKing', 0, { scale: 1.1, paint: { Wood: WOOD, White: '#f0d9a3', Grey: '#ffffff', Red: '#7fb8e8', DarkRed: '#5f98c8' } })
  if (bed.length) s.push(put(bed, bx, 0.04, bz - 0.02))
  else {
    s.push({ box: [1.7, 0.36, 2.15], at: [bx, 0.18, bz], color: WOOD })
    s.push({ box: [1.7, 0.75, 0.08], at: [bx, 0.55, bz - 1.04], color: WOOD_DARK })
    s.push({ box: [1.6, 0.05, 2.05], at: [bx, 0.385, bz], color: '#f0d9a3' })
    s.push({ box: [1.4, 0.14, 0.45], at: [bx, 0.47, bz + 0.72], color: '#7fb8e8' })
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) s.push({ box: [0.04, 1.6, 0.04], at: [bx + sx * 0.82, 1.15, bz + sz * 1.03], color: WOOD_DARK })
  for (const sz of [-1, 1]) s.push({ box: [1.68, 0.04, 0.04], at: [bx, 1.95, bz + sz * 1.03], color: WOOD_DARK })
  s.push({ box: [1.6, 0.14, 0.14], at: [bx, 1.86, bz - 1.0], color: '#f8f8f2' })

  // Study desk under the window: lamp, books, a jar of daisies, a chair
  const { x: dx, z: dz } = HOME_ROOM.desk
  s.push({ box: [1.4, 0.05, 0.6], at: [dx, 0.76, dz], color: WOOD })
  for (const sx of [-1, 1]) s.push({ box: [0.05, 0.74, 0.56], at: [dx + sx * 0.66, 0.37, dz], color: WOOD_DARK })
  s.push({ box: [0.4, 0.4, 0.55], at: [dx + 0.43, 0.4, dz], color: WOOD_DARK })
  const lamp = M('iLightDesk', 0.42, { paint: (mat) => (mat === 'Light' || mat === 'White' ? '#fff1c4' : '#3f7d5c') })
  if (lamp.length) s.push(put(lamp, dx - 0.5, 0.785, dz - 0.08, 0.3))
  else s.push({ cyl: [0.08, 0.1, 0.03, 10], at: [dx - 0.5, 0.79, dz - 0.1], color: '#3f7d5c' })
  ;['#c8322b', '#4f86d9', '#f4c04e'].forEach((c, i) => s.push({ box: [0.3, 0.05, 0.22], at: [dx + 0.05, 0.81 + i * 0.05, dz - 0.1], rot: [0, i * 0.12, 0], color: c }))
  s.push({ box: [0.34, 0.012, 0.24], at: [dx - 0.05, 0.79, dz + 0.12], color: '#ffffff' })
  s.push({ cyl: [0.05, 0.05, 0.14, 8], at: [dx + 0.5, 0.85, dz - 0.15], color: '#cfe8f6' })
  for (let i = 0; i < 5; i++) s.push({ sphere: [0.04, 6, 4], at: [dx + 0.5 + Math.cos(i * 1.26) * 0.05, 0.97 + (i % 2) * 0.03, dz - 0.15 + Math.sin(i * 1.26) * 0.05], color: '#ffffff' })
  const cz = HOME_ROOM.deskSeat.z
  const chair = M('iChair1', 0.95, { paint: () => WOOD })
  if (chair.length) s.push(put(chair, dx, 0.04, cz + 0.02, Math.PI))
  else {
    s.push({ box: [0.44, 0.05, 0.42], at: [dx, 0.46, cz], color: WOOD })
    s.push({ box: [0.44, 0.5, 0.05], at: [dx, 0.72, cz + 0.2], color: WOOD_DARK })
  }
  // 1.42 curtains on a rod beside the window (the back door took the shutters' place)
  s.push({ cyl: [0.018, 0.018, 2.1, 6], at: [dx, 2.52, BACK + 0.12], rot: [0, 0, Math.PI / 2], color: WOOD_DARK })
  const curtain = M('iCurtainsSingle', 2.0, { paint: (mat) => (mat.toLowerCase().includes('wood') || mat === 'Black' ? WOOD_DARK : '#e9a5a0') })
  for (const side of [-1, 1]) {
    if (curtain.length) s.push(put(curtain, dx + side * 0.98, 0.5, BACK + 0.14, 0, 0.62))
    else s.push({ box: [0.4, 1.9, 0.05], at: [dx + side * 0.98, 1.5, BACK + 0.14], color: '#e9a5a0' })
  }

  // Family altar (bàn thờ): red lacquer shelf, incense bowl, candles, a plate of five fruits
  const ax = -0.4
  s.push({ box: [1.3, 0.08, 0.42], at: [ax, 1.95, BACK + 0.22], color: LACQUER })
  s.push({ box: [1.3, 0.05, 0.05], at: [ax, 1.88, BACK + 0.42], color: '#f4c04e' })
  s.push({ box: [0.5, 0.36, 0.04], at: [ax, 2.25, BACK + 0.04], color: '#f4c04e' })
  s.push({ box: [0.42, 0.28, 0.03], at: [ax, 2.25, BACK + 0.06], color: '#e8dcc4' })
  s.push({ cyl: [0.08, 0.06, 0.1, 10], at: [ax, 2.04, BACK + 0.25], color: '#d9a43a' })
  for (let i = 0; i < 3; i++) s.push({ cyl: [0.005, 0.005, 0.22, 4], at: [ax - 0.03 + i * 0.03, 2.18, BACK + 0.25], color: '#c8322b' })
  for (const sx of [-1, 1]) s.push({ cyl: [0.025, 0.025, 0.16, 8], at: [ax + sx * 0.42, 2.07, BACK + 0.25], color: '#c8322b' })
  s.push({ cyl: [0.16, 0.12, 0.03, 12], at: [ax + 0.25, 2.0, BACK + 0.24], color: '#d9a43a' })
  // (the five fruits on the plate depend on the debt: houseShapes)

  // Wooden tea set (bộ bàn ghế gỗ) with a teapot and cups
  const tx = -2.0
  const tz = 1.1
  s.push({ box: [1.1, 0.05, 0.62], at: [tx, 0.46, tz], color: WOOD })
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) s.push({ box: [0.05, 0.44, 0.05], at: [tx + sx * 0.5, 0.22, tz + sz * 0.26], color: WOOD_DARK })
  s.push({ cyl: [0.22, 0.22, 0.02, 14], at: [tx + 0.1, 0.49, tz], color: '#f4c04e' })
  s.push({ sphere: [0.09, 10, 8], at: [tx + 0.1, 0.57, tz], color: '#e8f4f8' })
  s.push({ cyl: [0.015, 0.02, 0.1, 6], at: [tx + 0.21, 0.58, tz], rot: [0, 0, -0.9], color: '#e8f4f8' })
  for (let i = 0; i < 4; i++) s.push({ cyl: [0.03, 0.024, 0.04, 8], at: [tx + 0.1 + Math.cos(i * 1.57 + 0.6) * 0.15, 0.52, tz + Math.sin(i * 1.57 + 0.6) * 0.15], color: '#ffffff' })
  for (const side of [-1, 1]) {
    const cx = tx + side * 0.95
    s.push({ box: [0.55, 0.05, 0.5], at: [cx, 0.44, tz], color: WOOD })
    s.push({ box: [0.05, 0.42, 0.5], at: [cx + side * 0.26, 0.66, tz], color: WOOD_DARK })
    for (const sz of [-1, 1]) s.push({ box: [0.5, 0.06, 0.05], at: [cx, 0.62, tz + sz * 0.24], color: WOOD_DARK })
  }

  // TV cabinet on the left wall (the TV itself and Bố's Wave depend on the family's debt: houseShapes)
  // 1.42 library pieces (Quaternius House Interior, CC0): a long wooden sideboard for the TV, Mẹ's kitchen row
  const side = M('iDrawer2', 0, { scale: 0.8, paint: { Wood: WOOD_DARK, Wood_Light: WOOD, Wood_Dark: '#5a3c22' } })
  s.push(side.length ? put(side, -W / 2 + 0.25, 0.04, -0.9, Math.PI / 2) : { box: [0.45, 0.55, 1.4], at: [-W / 2 + 0.25, 0.28, -0.9], color: WOOD_DARK })
  const kitchen = { paint: { Kitchen: '#e8dcc4', KitchenTop: '#9aa0a4', White: '#f4f1ea', DarkMetal: '#3a3a40', LightMetal: '#b8bcc0', Glass: '#cfe8f6' } }
  const kx = W / 2 - 0.3
  const units: [string, number][] = [['iKitchenOven', -1.15], ['iKitchenSink', -0.65], ['iKitchen3Drawers', -0.15]]
  for (const [name, z] of units) {
    const m = M(name, 0, { scale: 1.12, ...kitchen })
    s.push(m.length ? put(m, kx, 0.04, z, -Math.PI / 2) : { box: [0.6, 0.9, 0.5], at: [kx, 0.45, z], color: '#e8dcc4' })
  }
  // a pot on the stove, the rice jar (hũ gạo) on the floor beside the counter
  s.push({ cyl: [0.16, 0.14, 0.18, 12], at: [kx - 0.05, 1.05, -1.15], color: '#b8b8c0' })
  s.push({ cyl: [0.17, 0.2, 0.42, 12], at: [kx - 0.05, 0.25, 0.35], color: '#c49a6c' }, { cyl: [0.12, 0.12, 0.05, 10], at: [kx - 0.05, 0.48, 0.35], color: '#9a6a43' })
  s.push(place(plantShapes(P.leafDark, '#c49a6c'), [-W / 2 + 0.45, 0, 2.4], 0, 1.1))
  s.push({ box: [1.0, 0.025, 0.55], at: [HOME_ROOM.exit.x, 0.055, HOME_ROOM.exit.z], color: DOORMAT })
  // Paper cabinet (tủ giấy tờ): the family keeps the originals here — diploma, birth certificate (1.13)
  s.push({ box: [0.45, 1.3, 0.7], at: [-W / 2 + 0.25, 0.65, 0.45], color: WOOD_DARK })
  for (let i = 0; i < 3; i++) {
    s.push({ box: [0.03, 0.36, 0.62], at: [-W / 2 + 0.49, 0.25 + i * 0.42, 0.45], color: WOOD })
    s.push({ box: [0.03, 0.05, 0.14], at: [-W / 2 + 0.52, 0.3 + i * 0.42, 0.45], color: '#d4a72c' })
  }
  // A small glass case on top of the cabinet for the house's land certificate (sổ đỏ)
  s.push({ box: [0.4, 0.04, 0.5], at: [-W / 2 + 0.25, 1.32, 0.45], color: WOOD })
  for (const dz of [-0.24, 0.24]) s.push({ box: [0.38, 0.32, 0.02], at: [-W / 2 + 0.25, 1.5, 0.45 + dz], color: '#d9eef6' })
  s.push({ box: [0.4, 0.03, 0.5], at: [-W / 2 + 0.25, 1.67, 0.45], color: WOOD })
  // Laptop on the study desk (CV, Auslandsportal, emails, flights)
  const { x: lx, z: lz } = HOME_ROOM.desk
  s.push({ box: [0.36, 0.02, 0.25], at: [lx - 0.05, 0.8, lz + 0.12], color: '#3f4a5c' })
  s.push({ box: [0.36, 0.23, 0.015], at: [lx - 0.05, 0.92, lz + 0.0], rot: [-0.2, 0, 0], color: '#2f2f38' })
  s.push(...homeExtras())
  return s
}

/** 1.42: the green back door to the yard — two glazed leaves, the garden's light in the panes, a mat in front. */
function backDoorShapes(): ShapeItem[] {
  const { x } = HOME_ROOM.backDoor
  const z = BACK + 0.02
  const s: ShapeItem[] = []
  const GREEN = '#3f7d5c'
  s.push({ box: [1.24, 2.36, 0.05], at: [x, 1.18, z], color: '#2c5c43' })
  for (const side of [-1, 1]) {
    const lx = x + side * 0.26
    s.push({ box: [0.5, 2.14, 0.05], at: [lx, 1.09, z + 0.035], color: GREEN })
    s.push({ box: [0.36, 0.86, 0.02], at: [lx, 1.6, z + 0.065], color: '#d8f2bf' })
    s.push({ box: [0.022, 0.86, 0.03], at: [lx, 1.6, z + 0.07], color: GREEN })
    s.push({ box: [0.36, 0.022, 0.03], at: [lx, 1.6, z + 0.07], color: GREEN })
    s.push({ box: [0.36, 0.62, 0.02], at: [lx, 0.55, z + 0.065], color: '#357052' })
    s.push({ box: [0.28, 0.5, 0.025], at: [lx, 0.55, z + 0.07], color: '#4f9a6c' })
    s.push({ sphere: [0.03, 8, 6], at: [x + side * 0.07, 1.06, z + 0.09], color: '#f4c04e' })
  }
  // transom with a fan of glass, and a sprig of leaves peeking in from the yard
  s.push({ box: [1.1, 0.22, 0.03], at: [x, 2.42, z + 0.01], color: '#2c5c43' })
  for (let i = 0; i < 4; i++) s.push({ box: [0.24, 0.15, 0.02], at: [x - 0.39 + i * 0.26, 2.42, z + 0.03], color: '#d8f2bf' })
  s.push({ box: [0.9, 0.025, 0.5], at: [x, 0.055, BACK + 0.5], color: DOORMAT })
  return s
}

/** 1.42 things every home has (the level-dependent ones are in houseShapes). */
function homeExtras(): ShapeItem[] {
  const b = newBuild()
  // A tiled wainscot round the room (pale jade tiles, like old Hà Nội kitchens)
  wainscot(b, W, D, 0.95, '#a9cdb9', '#f6ead0', '#c3dfcd')
  b.s.push(...backDoorShapes())
  // Family photos over the bed: Bố and Mẹ's wedding, the children as babies
  frame(b, -3.45, 2.15, BACK + 0.03, 0.5, 0.62, '#e8d9c0', '#8a5a3a')
  b.s.push({ sphere: [0.07, 8, 6], at: [-3.53, 2.2, BACK + 0.05], color: '#3a2a22' }, { sphere: [0.07, 8, 6], at: [-3.37, 2.2, BACK + 0.05], color: '#3a2a22' })
  b.s.push({ box: [0.3, 0.16, 0.01], at: [-3.45, 2.0, BACK + 0.05], color: '#ffffff' })
  frame(b, -2.75, 2.2, BACK + 0.03, 0.42, 0.34, '#bfe0f0', '#d9a43a')
  b.s.push({ sphere: [0.07, 8, 6], at: [-2.75, 2.2, BACK + 0.05], color: '#ffd9b8' })
  // The children's certificates (giấy khen) above the TV, on the left wall
  for (let i = 0; i < 3; i++) {
    frame(b, -W / 2 + 0.02, 2.05, -1.55 + i * 0.5, 0.42, 0.32, '#fff6df', '#c8322b', Math.PI / 2)
    b.s.push({ box: [0.01, 0.05, 0.22], at: [-W / 2 + 0.045, 2.12, -1.55 + i * 0.5], color: '#d4473b' })
    b.s.push({ box: [0.01, 0.04, 0.12], at: [-W / 2 + 0.045, 1.97, -1.55 + i * 0.5], color: '#f4c04e' })
  }
  // Bedside table
  const ns = M('iNightStand3', 0.45, { paint: { Wood: WOOD, Metal: '#c9a050' } })
  b.s.push(ns.length ? put(ns, -1.75, 0.04, -3.1) : { box: [0.45, 0.45, 0.45], at: [-1.75, 0.27, -3.1], color: WOOD })
  // Bookshelf on the left wall, by the door (its books in houseShapes)
  const shelf = M('iShelf2', 1.9, { paint: () => WOOD_DARK })
  b.s.push(shelf.length ? put(shelf, -W / 2 + 0.22, 0.04, 1.75, Math.PI / 2) : { box: [0.38, 1.9, 0.56], at: [-W / 2 + 0.22, 0.95, 1.75], color: WOOD_DARK })
  // Kitchen: a rice cooker, a kettle, a dish rack on the wall, a string of garlic and chillies
  const kx = W / 2 - 0.35
  b.s.push({ cyl: [0.14, 0.15, 0.2, 14], at: [kx + 0.05, 1.03, -0.12], color: '#f4efe6' }, { sphere: [0.14, 12, 6, Math.PI / 2], at: [kx + 0.05, 1.13, -0.12], color: '#e8574d' })
  b.s.push({ cyl: [0.08, 0.1, 0.18, 10], at: [kx + 0.05, 1.02, -0.32], color: '#d9dde3' })
  b.s.push({ box: [0.3, 0.04, 1.0], at: [W / 2 - 0.16, 1.62, -0.6], color: WOOD })
  for (let i = 0; i < 5; i++) b.s.push({ cyl: [0.09, 0.06, 0.05, 10], at: [W / 2 - 0.17, 1.67 + (i % 2) * 0.05, -0.95 + i * 0.17], color: i % 2 ? '#ffffff' : '#a9d6e8' })
  for (let i = 0; i < 6; i++) b.s.push({ sphere: [0.045, 6, 5], at: [W / 2 - 0.06, 2.1 - i * 0.09, 0.05], color: i % 2 ? '#f2ece0' : '#d4473b' })
  b.s.push({ cyl: [0.006, 0.006, 0.6, 3], at: [W / 2 - 0.06, 1.92, 0.05], color: '#a8802f' })
  // Shoes by the front door, a broom in the corner
  ;['#4f86d9', '#ff9fb2', '#3a3a3a', '#f4c04e'].forEach((c, i) => b.s.push({ box: [0.11, 0.06, 0.26], at: [2.25 + i * 0.16, 0.07, 3.05], rot: [0, (i % 2 ? 1 : -1) * 0.12, 0], color: c }))
  b.s.push({ cyl: [0.012, 0.012, 1.1, 5], at: [W / 2 - 0.15, 0.75, 3.1], rot: [0, 0, -0.18], color: '#c49a6c' }, { cyl: [0.03, 0.12, 0.3, 8], at: [W / 2 - 0.05, 0.15, 3.1], rot: [0, 0, -0.18], color: '#d9b25a' })
  return b.s
}

/** Bulbs (bloom at night): the lamp over the tea table while the family can pay the bill for it. */
function homeGlow(level: number): ShapeItem[] {
  const b = newBuild()
  if (level < 2) pendant(b, -1.4, 0.9, H, 0.55, '#f4c04e', '#fff1c4', 0.26)
  return [...b.glow, ...b.s]
}

/**
 * The yellow house follows the family's debt (story 2.1 §1.8): 0 normal, 1 (any loan) cobwebs, dried flowers, an empty fruit plate,
 * 2 TV sold, a crack, the clock gone, 3 broken wall, a leak bucket, Bố's Wave sold. Mortgage: the
 * glass case of the sổ đỏ is empty.
 */
function houseShapes(level: number, mortgaged: boolean, clock: boolean): ShapeItem[] {
  const s: ShapeItem[] = []
  const ax = -0.4
  // The plate of five fruits on the altar: full at level 0, one wrinkled orange once you borrow
  if (level === 0) {
    ;['#ff9b3d', '#a8d86b', '#ffe066', '#ff6b5e', '#7fc06b'].forEach((c, i) =>
      s.push({ sphere: [0.05, 8, 6], at: [ax + 0.25 + Math.cos(i * 1.26) * 0.07, 2.06 + (i === 2 ? 0.05 : 0), BACK + 0.24 + Math.sin(i * 1.26) * 0.06], color: c }),
    )
  } else {
    s.push({ sphere: [0.045, 8, 6], at: [ax + 0.25, 2.05, BACK + 0.24], scale: [1, 0.85, 1], color: '#c98a3d' })
  }
  // Flowers on the altar: fresh at level 0, dried from level 1
  s.push({ cyl: [0.05, 0.07, 0.18, 8], at: [ax - 0.3, 2.08, BACK + 0.22], color: '#e8f4f8' })
  const petals = level === 0 ? ['#ff9fb2', '#ffe066', '#ff6b5e'] : ['#a8865a', '#8e6e4a', '#b89a6a']
  petals.forEach((c, i) => s.push({ sphere: [0.05, 6, 4], at: [ax - 0.33 + i * 0.03, 2.24 + (i % 2) * 0.05, BACK + 0.2 + i * 0.02], color: c }))
  if (level < 2) {
    s.push({ box: [0.12, 0.04, 0.3], at: [-W / 2 + 0.25, 0.6, -0.9], color: '#2f2f38' })
    s.push({ box: [0.06, 0.6, 1.0], at: [-W / 2 + 0.25, 0.92, -0.9], color: '#2f2f38' })
    s.push({ box: [0.07, 0.52, 0.92], at: [-W / 2 + 0.27, 0.92, -0.9], color: '#4a5a70' })
  } else {
    // Where the TV stood: a dusty rectangle on the wall
    s.push({ box: [0.012, 0.6, 1.0], at: [-W / 2 + 0.03, 0.9, -0.9], color: '#e9d39a' })
  }
  if (level >= 2) {
    // A long crack down the back wall
    let y = 2.8
    let x = 1.6
    for (let i = 0; i < 7; i++) {
      const nx = x + (i % 2 ? 0.12 : -0.1)
      s.push({ box: [0.03, 0.34, 0.01], at: [(x + nx) / 2, y - 0.17, BACK + 0.012], rot: [0, 0, i % 2 ? -0.35 : 0.3], color: '#6b5236' })
      x = nx
      y -= 0.32
    }
  }
  if (level >= 3) {
    // Broken wall patch showing bricks, the leak bucket, a puddle
    s.push({ box: [0.9, 0.7, 0.012], at: [-2.6, 1.0, BACK + 0.012], color: '#b0623e' })
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) s.push({ box: [0.26, 0.1, 0.02], at: [-2.9 + c * 0.3 + (r % 2) * 0.12, 0.8 + r * 0.2, BACK + 0.02], color: '#c8653d' })
    s.push({ cyl: [0.2, 0.16, 0.3, 12], at: [0.4, 0.15, 0.9], color: '#4f86d9' })
    s.push({ cyl: [0.17, 0.17, 0.02, 12], at: [0.4, 0.27, 0.9], color: '#9fd8f0' })
    s.push({ sphere: [0.03, 6, 4], at: [0.4, 1.9, 0.9], scale: [1, 1.6, 1], color: '#9fd8f0' })
    s.push({ cyl: [0.45, 0.45, 0.01, 14], at: [0.4, 0.01, 0.9], color: '#bcd9e8' })
  } else {
    s.push(place(motorbikeShapes('#7fb8e8'), [3.0, 0, 1.3], Math.PI / 2 + 0.2))
  }
  // The sổ đỏ in its case, unless mortgaged
  if (!mortgaged) {
    s.push({ box: [0.28, 0.05, 0.36], at: [-W / 2 + 0.25, 1.37, 0.45], color: '#c8322b' })
    s.push({ box: [0.2, 0.052, 0.04], at: [-W / 2 + 0.25, 1.371, 0.4], color: '#f4c04e' })
  }
  s.push(...comfortShapes(level))
  s.push(...povertyShapes(level))
  if (!clock) s.push({ cyl: [0.23, 0.23, 0.005, 16], at: [ax, 2.72, BACK + 0.006], rot: [Math.PI / 2, 0, 0], color: '#e9d39a' })
  return s
}

/**
 * 1.42 What a family without debts has, and how it goes: level 0 a rug, a fridge, a standing fan, lush plants and a
 * full bookshelf, fruit on the table; level 1 the rug is sold, the plants wilt, half the books are gone; level 2 the
 * fridge is sold (a pale patch and a loose plug), the fan too; level 3 the shelf is almost bare.
 */
function comfortShapes(level: number): ShapeItem[] {
  const b = newBuild()
  const s = b.s
  if (level === 0) {
    rug(b, -2.0, 1.1, 2.6, 1.7, '#c8322b', '#f4c04e')
    s.push({ cyl: [0.16, 0.12, 0.06, 12], at: [-1.85, 0.52, 0.95], color: '#d9a43a' })
    ;['#ff9b3d', '#ffe066', '#7fc06b'].forEach((c, i) => s.push({ sphere: [0.05, 8, 6], at: [-1.88 + i * 0.05, 0.58, 0.95 + (i % 2) * 0.03], color: c }))
  }
  // Plants by the front and back doors: lush, then wilting
  const leaves = level === 0 ? null : level === 1 ? '#a8a05a' : '#9a7a50'
  for (const [x, z, seed] of [[1.95, 2.9, 3], [0.05, -3.05, 5]] as const) {
    const p = leaves ? modelShapes('pot2', { height: 0.8, paint: (mat, c) => (mat.includes('Green') ? leaves : mat === 'Black' || mat === 'Grey' ? '#c97b63' : c) }) : libraryPot(seed, '#c97b63', 0.9)
    s.push(put(p ?? plantShapes(leaves ?? P.leaf, '#c97b63'), x, 0.04, z, seed, p ? 1 : 0.9))
  }
  // Books on the shelf: fewer as things are sold
  const rows = [5, 3, 2, 1][Math.min(3, level)]
  const colors = ['#c8322b', '#4f86d9', '#f4c04e', '#3fae72', '#7a5ea8', '#e8834a']
  for (let r = 0; r < 4; r++) {
    const n = r < rows ? 8 : r === rows ? 3 : 0
    for (let i = 0; i < n; i++) s.push({ box: [0.2, 0.26 + (i % 3) * 0.03, 0.05], at: [-W / 2 + 0.24, 0.32 + r * 0.45 + (i % 3) * 0.015, 1.55 + i * 0.058], color: colors[(i + r * 2) % colors.length] })
  }
  if (level < 2) {
    const wm = M('iBathroomWashingMachine', 0, { scale: 1.2, paint: { Grey: '#d9dde3', White: '#f4f6f8', Black: '#3a3a40' } })
    if (wm.length) s.push(put(wm, W / 2 - 0.45, 0.04, 2.05, -Math.PI / 2))
    // Fridge by the kitchen (magnets, a child's drawing) and a standing fan by the tea table
    const fr = M('iKitchenFridge', 1.65, { paint: (mat, c) => (mat === 'White' || mat === 'Grey' ? '#eef1f4' : c) })
    s.push(fr.length ? put(fr, W / 2 - 0.4, 0.04, -2.3, -Math.PI / 2) : { box: [0.62, 1.65, 0.62], at: [W / 2 - 0.4, 0.86, -2.3], color: '#eef1f4' })
    ;['#ff6b5e', '#ffd166', '#6bcbff'].forEach((c, i) => s.push({ box: [0.012, 0.06, 0.06], at: [W / 2 - 0.725, 1.3 + i * 0.12, -2.45 + i * 0.1], color: c }))
    s.push({ box: [0.01, 0.22, 0.18], at: [W / 2 - 0.725, 1.05, -2.2], color: '#fff6df' })
    s.push({ cyl: [0.16, 0.18, 0.04, 12], at: [-0.75, 0.06, 1.75], color: '#5a7fa8' }, { cyl: [0.02, 0.02, 1.0, 6], at: [-0.75, 0.55, 1.75], color: '#d9dde3' })
    s.push({ cyl: [0.24, 0.24, 0.06, 16], at: [-0.75, 1.1, 1.72], rot: [Math.PI / 2 - 0.15, 0, 0], color: '#7fb8e8' }, { sphere: [0.07, 8, 6], at: [-0.75, 1.1, 1.76], color: '#5a7fa8' })
  } else {
    // Where the fridge stood
    s.push({ box: [0.012, 1.6, 0.66], at: [W / 2 - 0.03, 0.85, -2.3], color: '#e9d39a' })
    s.push({ cyl: [0.006, 0.006, 0.5, 3], at: [W / 2 - 0.1, 0.3, -2.0], rot: [0.6, 0, 0], color: '#3a3a3a' })
  }
  return s
}

/** 1.42 painted cobwebs in the ceiling corners (shared/Cobwebs): from the first loan, more at level 2+. */
function homeWebs(level: number): WebSpec[] {
  if (level < 1) return []
  const top = H - 0.01
  const webs: WebSpec[] = [
    { at: [-W / 2 + 0.01, top, BACK + 0.01], a: [1, 0, 0], b: [0, 0, 1], size: 1.0 },
    { at: [W / 2 - 0.01, top, BACK + 0.01], a: [-1, 0, 0], b: [0, 0, 1], size: 0.85 },
  ]
  if (level >= 2) {
    webs.push({ at: [-W / 2 + 0.01, top, D / 2 - 0.6], a: [0, 0, -1], b: [1, 0, 0], size: 0.7 })
    // over the window and behind the altar
    webs.push({ at: [HOME_ROOM.desk.x + 0.75, 2.42, BACK + 0.01], a: [-1, 0, 0], b: [0, 0, 1], size: 0.45 })
  }
  if (level >= 3) webs.push({ at: [W / 2 - 0.01, top, 0.4], a: [0, 0, -1], b: [-1, 0, 0], size: 0.75 })
  return webs
}

/** Deterministic scatter so the stains sit in the same places on every visit. */
const rnd = (i: number) => {
  const x = Math.sin(i * 127.1 + 3.7) * 43758.5453
  return x - Math.floor(x)
}

/**
 * What being poor looks like, on top of the sold things. From the very first loan (level 1, 1.21):
 * peeling paint, damp and mould, newspaper over holes, a taped window, broken tiles, noodle boxes,
 * a bare bulb, unpaid bills on the wall, a pot under a leak, grime streaks, damp side walls, patched
 * washing on a line. Level 2: a second leak. Level 3: bare bricks with rubble, a wet floor, a candle instead of the lamp.
 */
function povertyShapes(level: number): ShapeItem[] {
  const s: ShapeItem[] = []
  if (level < 1) return s
  const wallZ = BACK + 0.011
  // Peeling paint: pale plaster blotches, more of them every level
  const peel = [14, 20, 26][level - 1]
  for (let i = 0; i < peel; i++) {
    const x = -W / 2 + 0.5 + rnd(i) * (W - 1)
    const y = 0.35 + rnd(i + 40) * 2.2
    // keep the altar, window and calendar readable
    if (Math.abs(x + 0.4) < 0.9 && y > 1.7) continue
    const w = 0.18 + rnd(i + 80) * 0.3
    s.push({ box: [w, 0.12 + rnd(i + 120) * 0.22, 0.008], at: [x, y, wallZ], rot: [0, 0, (rnd(i + 7) - 0.5) * 0.5], color: i % 3 === 0 ? '#bfae8e' : '#e8dcc2' })
    if (i % 2 === 0) s.push({ box: [w * 0.5, 0.07, 0.009], at: [x + 0.05, y - 0.04, wallZ + 0.001], rot: [0, 0, rnd(i) - 0.5], color: '#a89a80' })
  }
  // Damp creeping up from the floor
  for (let i = 0; i < 7 + level * 3; i++) {
    const x = -W / 2 + 0.3 + rnd(i + 200) * (W - 0.6)
    s.push({ box: [0.3 + rnd(i + 210) * 0.5, 0.18 + rnd(i + 220) * (0.14 * (level + 1)), 0.007], at: [x, 0.22 + rnd(i + 230) * 0.12, wallZ], color: i % 2 ? '#7d8a66' : '#a8946e' })
  }
  // Water stain running down from the top of the wall
  for (let i = 0; i < level + 1; i++) {
    const x = 2.3 + i * 0.5
    s.push({ box: [0.34, 0.5 + i * 0.2, 0.007], at: [x, 2.65 - i * 0.1, wallZ], color: '#b9a276' })
    s.push({ box: [0.05, 0.9, 0.008], at: [x + 0.06, 2.1 - i * 0.1, wallZ], color: '#b9a276' })
  }
  // Grime running down from the ceiling
  for (let i = 0; i < 6 + level * 2; i++) {
    const x = -W / 2 + 0.4 + rnd(i + 500) * (W - 0.8)
    if (Math.abs(x + 0.4) < 0.7) continue
    const h = 0.5 + rnd(i + 520) * 0.9
    s.push({ box: [0.06 + rnd(i + 510) * 0.08, h, 0.006], at: [x, H - 0.08 - h / 2, wallZ], color: '#9c875e' })
  }
  // A first crack above the door frame side
  for (let i = 0; i < 3; i++) s.push({ box: [0.025, 0.28, 0.01], at: [-1.55 + (i % 2 ? 0.06 : 0), 2.55 - i * 0.26, BACK + 0.012], rot: [0, 0, i % 2 ? -0.4 : 0.35], color: '#6b5236' })
  // Damp on the side walls too
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3 + level; i++) {
      const z = BACK + 0.8 + rnd(i * 7 + side * 3 + 600) * (D - 1.6)
      s.push({ box: [0.006, 0.3 + rnd(i + 610) * 0.4, 0.5 + rnd(i + 620) * 0.6], at: [side * (W / 2 - 0.011), 0.3, z], color: i % 2 ? '#8d7a55' : '#7d8a66' })
      s.push({ box: [0.006, 0.22, 0.3 + rnd(i + 630) * 0.3], at: [side * (W / 2 - 0.012), 1.3 + rnd(i + 640) * 1.0, z + 0.2], color: '#e8dcc2' })
    }
  }
  // Patched washing on a line across the room: there is no money for a dryer rack, or for new clothes
  s.push({ box: [W - 1.2, 0.012, 0.012], at: [0, 2.35, 0.3], color: '#6b5a48' })
  ;['#9a8f7c', '#7f8da3', '#b39a72', '#8f8a80', '#a89a80'].forEach((c, i) => {
    const x = -W / 2 + 1.4 + i * ((W - 2.8) / 4)
    s.push({ box: [0.42, 0.5, 0.02], at: [x, 2.08, 0.3], rot: [0, 0, (i % 2 ? 1 : -1) * 0.05], color: c })
    s.push({ box: [0.14, 0.14, 0.024], at: [x + 0.06, 2.0, 0.3], rot: [0, 0, 0.3], color: i % 2 ? '#c2a98a' : '#6d7c8f' })
  })
  // The blanket is patched
  const { x: bx, z: bz } = HOME_ROOM.bed
  s.push({ box: [0.3, 0.012, 0.2], at: [bx - 0.3, 0.6, bz + 0.5], rot: [0, 0.2, 0], color: '#c2a98a' })
  s.push({ box: [0.22, 0.012, 0.16], at: [bx + 0.35, 0.6, bz + 0.46], rot: [0, -0.3, 0], color: '#8f8a80' })

  // Unpaid bills pinned beside the calendar, stamped red
  ;[[-1.75, 1.3, 0.1], [-1.52, 1.12, -0.12], [-1.7, 0.95, 0.05]].forEach(([x, y, r]) => {
    s.push({ box: [0.24, 0.32, 0.008], at: [x, y, wallZ + 0.004], rot: [0, 0, r], color: '#f6f1e4' })
    s.push({ box: [0.18, 0.05, 0.009], at: [x, y + 0.08, wallZ + 0.006], rot: [0, 0, r], color: '#d4473b' })
    for (let l = 0; l < 3; l++) s.push({ box: [0.16, 0.012, 0.009], at: [x, y - 0.02 - l * 0.05, wallZ + 0.006], rot: [0, 0, r], color: '#9a948a' })
  })
  // A pot catching a drip from the ceiling
  s.push({ cyl: [0.14, 0.12, 0.14, 10], at: [1.9, 0.11, 1.9], color: '#b8b8c0' })
  s.push({ cyl: [0.12, 0.12, 0.012, 10], at: [1.9, 0.16, 1.9], color: '#9fd8f0' })
  s.push({ sphere: [0.025, 6, 4], at: [1.9, 1.6, 1.9], scale: [1, 1.6, 1], color: '#9fd8f0' })

  // Newspaper pasted over holes in the plaster
  for (const [x, y, r] of [[-1.9, 1.2, 0.08], [1.25, 0.9, -0.12], [3.0, 1.5, 0.05]] as const) {
    s.push({ box: [0.5, 0.36, 0.009], at: [x, y, wallZ + 0.002], rot: [0, 0, r], color: '#e6e0cf' })
    for (let l = 0; l < 4; l++) s.push({ box: [0.4, 0.02, 0.01], at: [x, y + 0.12 - l * 0.075, wallZ + 0.003], rot: [0, 0, r], color: '#8d8a84' })
  }
  // The cracked window pane, held with tape
  const { x: dx } = HOME_ROOM.desk
  s.push({ box: [0.5, 0.04, 0.012], at: [dx - 0.1, 1.8, BACK + 0.02], rot: [0, 0, 0.7], color: '#d9c48a' })
  s.push({ box: [0.4, 0.04, 0.012], at: [dx + 0.05, 1.7, BACK + 0.02], rot: [0, 0, -0.5], color: '#d9c48a' })
  // Broken floor tiles
  for (let i = 0; i < 10 + (level - 1) * 4; i++) {
    const x = -W / 2 + 0.8 + rnd(i + 300) * (W - 1.6)
    const z = BACK + 1.2 + rnd(i + 310) * (D - 2)
    s.push({ box: [0.3 + rnd(i + 320) * 0.3, 0.004, 0.2 + rnd(i + 330) * 0.3], at: [x, 0.043, z], rot: [0, rnd(i + 340) * 3, 0], color: '#8b6a52' })
  }
  // Boxes of instant noodles by the kitchen: dinner, most days
  for (let i = 0; i < 3; i++) s.push({ box: [0.42, 0.26, 0.32], at: [W / 2 - 0.36, 0.17 + i * 0.27, 0.95], rot: [0, i * 0.15, 0], color: i % 2 ? '#d98a45' : '#c9772f' })
  // A bare bulb on a wire instead of the ceiling lamp
  s.push({ cyl: [0.006, 0.006, 0.7, 4], at: [0.6, 2.65, 0.2], color: '#3a3a3a' })
  s.push({ sphere: [0.06, 8, 6], at: [0.6, 2.27, 0.2], color: '#fff2b8' })
  if (level < 2) return s

  // A red basin under a second leak
  s.push({ cyl: [0.26, 0.2, 0.14, 12], at: [-1.0, 0.11, -0.4], color: '#d4473b' })
  s.push({ cyl: [0.23, 0.23, 0.02, 12], at: [-1.0, 0.16, -0.4], color: '#9fd8f0' })
  if (level < 3) return s

  // More bare brick where the plaster fell off
  for (const [px, py] of [[2.2, 0.75], [-0.9, 0.6]] as const) {
    s.push({ box: [0.8, 0.55, 0.012], at: [px, py, wallZ + 0.001], color: '#b0623e' })
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) s.push({ box: [0.22, 0.08, 0.018], at: [px - 0.27 + c * 0.26 + (r % 2) * 0.1, py - 0.17 + r * 0.17, wallZ + 0.008], color: '#c8653d' })
    // rubble under it
    for (let i = 0; i < 4; i++) s.push({ box: [0.12, 0.07, 0.1], at: [px - 0.3 + i * 0.2, 0.075, BACK + 0.2 + (i % 2) * 0.12], rot: [0, i, 0], color: i % 2 ? '#c8653d' : '#d9cdb5' })
  }
  // The floor is wet around the pot now
  s.push({ cyl: [0.55, 0.55, 0.008, 14], at: [1.7, 0.045, 1.7], color: '#bcd9e8' })
  // A candle on the tea table: the electricity is cut some evenings
  s.push({ cyl: [0.07, 0.07, 0.012, 10], at: [-2.35, 0.495, 1.1], color: '#d9cdb5' })
  s.push({ cyl: [0.022, 0.022, 0.13, 8], at: [-2.35, 0.56, 1.1], color: '#f6efe0' })
  s.push({ sphere: [0.02, 6, 4], at: [-2.35, 0.65, 1.1], scale: [1, 1.7, 1], color: '#ffb347' })
  // Cardboard on the floor where the Wave used to stand
  s.push({ box: [0.9, 0.012, 1.5], at: [3.0, 0.047, 1.3], rot: [0, 0.2, 0], color: '#b98a5a' })
  return s
}

const PAPERS: SpotAction[] = [
  { id: 'papers', labelKey: 'action.takePapers', icon: 'passport', action: 'visa.originals', primary: true, if: { all: [{ flag: 'visa.path' }, { noFlag: 'visa.originals' }] } },
]

const BED: SpotAction[] = [
  { id: 'sleep', labelKey: 'action.sleep', icon: 'sleep', action: 'home.sleep', primary: true },
  { id: 'nap', labelKey: 'action.nap', icon: 'sleep', action: 'home.nap' },
  { id: 'save', labelKey: 'action.save', icon: 'save', action: 'home.save' },
]
const DESK: SpotAction[] = [
  { id: 'study', labelKey: 'action.selfStudy', icon: 'book', action: 'german.selfStudy', primary: true },
  // Story 2.1: the laptop on the desk
  { id: 'cv', labelKey: 'action.writeCv', icon: 'laptop', action: 'visa.writeCv', if: { test: 'visa.cvToWrite' } },
  { id: 'portal', labelKey: 'action.portal', icon: 'laptop', action: 'visa.portal', if: { all: [{ test: 'visa.portalToFill' }, { test: 'visa.passportDone' }] } },
  { id: 'lanEmail', labelKey: 'action.lanEmail', icon: 'laptop', action: 'family.lanEmail', if: { test: 'family.lanEmail' } },
  { id: 'lanCall', labelKey: 'action.lanCall', icon: 'laptop', action: 'family.lanCall', if: { test: 'family.lanCall' } },
  { id: 'flight', labelKey: 'action.flightLaptop', icon: 'ticket', action: 'visa.flightLaptop', if: { all: [{ test: 'visa.ready' }, { noFlag: 'visa.flight' }] } },
]
const EXIT: SpotAction[] = [
  { id: 'exit', labelKey: 'action.toStreet', icon: 'door', action: 'home.leave', primary: true, if: { noFlag: 'trip.away' } },
  { id: 'flyBack', labelKey: 'action.flyBack', icon: 'passport', action: 'trip.return', primary: true, if: { flag: 'trip.away' } },
]

const BACK_DOOR: SpotAction[] = [{ id: 'yard', labelKey: 'action.toYard', icon: 'garden', action: 'home.toYard', primary: true }]

/** Tết decorations for the visit home (chapter 5): peach blossom, bánh chưng, red couplets. */
function tetDecor(): ShapeItem[] {
  const s: ShapeItem[] = []
  // Peach blossom tree in a pot against the back wall, beside the bed
  s.push({ cyl: [0.28, 0.22, 0.4, 12], at: [-1.75, 0.2, BACK + 0.45], color: '#b8322a' })
  s.push({ cyl: [0.05, 0.07, 1.1, 6], at: [-1.75, 0.9, BACK + 0.45], color: '#6a4a3a' })
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2
    const r = 0.25 + (i % 3) * 0.08
    s.push({ ico: [0.11 + (i % 2) * 0.03, 0], at: [-1.75 + Math.cos(a) * r, 1.35 + (i % 3) * 0.15, BACK + 0.45 + Math.sin(a) * r * 0.6], color: i % 3 === 0 ? '#ffd1e0' : '#ff9fc4' })
  }
  // Bánh chưng stack on the tea table, wrapped in green leaves with bamboo ties
  for (let i = 0; i < 3; i++) {
    const y = 0.64 + i * 0.1
    s.push({ box: [0.2, 0.09, 0.2], at: [-2.0 + (i - 1) * 0.06, y, 1.1], color: '#4f8f45' })
    s.push({ box: [0.21, 0.092, 0.02], at: [-2.0 + (i - 1) * 0.06, y, 1.1], color: '#e9d8a6' })
  }
  // Red couplets either side of the family altar, a lantern
  for (const x of [-1.3, 0.45]) {
    s.push({ box: [0.22, 1.0, 0.02], at: [x, 1.8, BACK + 0.03], color: '#d4473b' })
    for (let k = 0; k < 4; k++) s.push({ box: [0.12, 0.12, 0.01], at: [x, 2.15 - k * 0.24, BACK + 0.045], color: '#f4c04e' })
  }
  s.push({ sphere: [0.2, 12, 10], at: [0, 2.5, 1.2], scale: [1, 0.85, 1], color: '#d4473b' })
  s.push({ cyl: [0.07, 0.07, 0.06, 8], at: [0, 2.3, 1.2], color: '#f4c04e' })
  return s
}

const Home = memo(function Home() {
  const shapes = useMemo(furniture, [])
  const tet = useMemo(tetDecor, [])
  const visiting = useFlags((s) => !!s.flags['trip.away'])
  const level = useFlags(() => houseLevel())
  const mortgage = useFlags((s) => !!s.flags['debt.mortgage'])
  // The wall clock is sold at level 2 and only comes back once everything is repaid.
  const clock = useFlags((s) => houseLevel() < 2 && !(typeof s.flags['debt.peak'] === 'number' && (s.flags['debt.peak'] as number) >= 2))
  const state = useMemo(() => houseShapes(level, mortgage, clock), [level, mortgage, clock])
  const glow = useMemo(() => homeGlow(level), [level])
  const webs = useMemo(() => homeWebs(level), [level])
  const { bed, desk } = HOME_ROOM
  // Bố and Mẹ wear what is left: faded, then patched, then ragged.
  const bo = useMemo(() => ({ ...NPCS.bo, outfit: raggedOutfit(NPCS.bo.outfit, level) }), [level])
  const me = useMemo(() => ({ ...NPCS.me, outfit: raggedOutfit(NPCS.me.outfit, level) }), [level])
  return (
    <>
      <Room
        w={W}
        d={D}
        h={H}
        style={STYLES[Math.min(3, level)]}
        windows={[desk.x]}
        floorKind="bong"
        furniture={shapes}
        blockers={[
          [bed.x, bed.z, 0.85, 1.08],
          [desk.x, desk.z, 0.7, 0.3],
          [-2.0, 1.1, 1.25, 0.32],
          [-W / 2 + 0.25, -0.9, 0.25, 0.7],
          [-W / 2 + 0.25, 0.45, 0.25, 0.38],
          [3.0, 1.3, 0.35, 0.8],
          [W / 2 - 0.3, -0.65, 0.32, 0.8],
          [W / 2 - 0.45, 2.05, 0.4, 0.4],
          [W / 2 - 0.4, -2.3, 0.33, 0.33],
          [-W / 2 + 0.22, 1.75, 0.22, 0.32],
          [-1.75, -3.1, 0.25, 0.25],
        ]}
      />
      <Shapes shapes={state} />
      <Shapes shapes={glow} material={glowMaterial} castShadow={false} />
      {webs.length > 0 && <Cobwebs webs={webs} />}
      {level < 2 && <CeilingFan position={[0.9, H, 0.6]} drop={0.35} />}
      <HouseScene />
      {clock && <WallClock position={[-0.4, 2.72, BACK + 0.04]} radius={0.22} />}
      <TearCalendar position={[-1.6, 1.75, BACK + 0.03]} />
      <WallFan position={[W / 2 - 0.05, 2.2, -1.6]} rotation={[0, -Math.PI / 2, 0]} />

      {mortgage && !visiting ? (
        <NPC def={bo} at={{ x: -0.4, z: -2.35 }} yaw={Math.PI} />
      ) : (
        <NPC def={bo} at={{ x: -2.95, z: 1.1 }} yaw={Math.PI / 2} seatY={0.44} arms={1} />
      )}
      {!visiting && <NPC def={me} at={{ x: W / 2 - 1.0, z: -0.6 }} yaw={Math.PI / 2} zone={{ x: W / 2 - 1.4, z: -0.6, halfX: 0.6, halfZ: 0.8 }} />}
      <NPC def={NPCS.emGai} at={{ x: -2.0, z: 1.75 }} yaw={Math.PI} seatY={0.3} scale={0.85} />
      {visiting && (
        <>
          <Shapes shapes={tet} />
          <NPC def={me} at={{ x: 0.6, z: 0.6 }} yaw={Math.PI * 0.85} zone={{ x: 0.6, z: 1.2, halfX: 1.0, halfZ: 0.9 }} />
        </>
      )}

      <ActionSpot id="home-bed" nameKey="interact.bed" zone={{ x: bed.x + 0.2, z: bed.z + 1.55, halfX: 1.1, halfZ: 0.55 }} actions={BED} />
      <ActionSpot id="home-desk" nameKey="interact.studyDesk" zone={{ x: desk.x, z: desk.z + 1.05, halfX: 0.9, halfZ: 0.6 }} actions={DESK} />
      <ActionSpot id="home-papers" nameKey="interact.papers" zone={{ x: -W / 2 + 0.95, z: 0.45, halfX: 0.5, halfZ: 0.55 }} actions={PAPERS} />
      <ActionSpot
        id="home-backdoor"
        nameKey="interact.backYard"
        zone={{ x: HOME_ROOM.backDoor.x, z: HOME_ROOM.backDoor.z, halfX: 0.6, halfZ: 0.55 }}
        actions={BACK_DOOR}
        marker={{ at: [HOME_ROOM.backDoor.x, 2.85, BACK + 0.35], when: { noFlag: 'yard.visited' } }}
      />
      <ActionSpot id="home-exit" nameKey="interact.exit" zone={{ x: HOME_ROOM.exit.x, z: HOME_ROOM.exit.z, halfX: 0.9, halfZ: 0.6 }} actions={EXIT} />
    </>
  )
})

export default Home
