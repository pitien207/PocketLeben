import type { Vec3 } from '../../../data/config'
import type { Condition } from '../../../data/conditions'
import { CITY_PLACES } from '../../../data/cityPlaces'
import { EATERY_DEFS } from '../../../data/eateries'
import { ITEMS, type ItemId } from '../../../data/items'
import { NPCS, type NpcDef } from '../../../data/npcs'
import { SHOP_ROOMS, shopExit, type ShopRoomId } from '../../../data/shopRooms'
import { SHOPS, type ShopId } from '../../../data/shops'
import { formatMoney } from '../../../i18n/format'
import type { Localized } from '../../../i18n/localized'
import type { ContextAction } from '../../../store/interactionStore'
import { useUI } from '../../../store/uiStore'
import type { SpotAction } from '../../components/ActionSpot'
import { goldQuote } from '../../systems/gold'
import type { PointXZ, ZoneXZ } from '../../systems/playerState'
import { vnd } from '../../systems/say'
import type { RoomStyle } from '../shared/Room'
import type { ShapeItem } from '../shared/Shapes'
import type { SignOptions } from '../shared/textures'
import {
  airCon,
  altar,
  backDoor,
  counter,
  diningSet,
  exitMat,
  fairyLights,
  frame,
  fridge,
  glassCase,
  goods,
  lantern,
  M,
  newBuild,
  paintAll,
  pendant,
  plant,
  plasticSet,
  put,
  shelfUnit,
  tube,
  wainscot,
  type Build,
} from './kit'
import { guest, helper } from './people'

/**
 * 1.41 What is inside each shop (data/shopRooms.ts). A plan = the room (size, paint, floor), one merged mesh of
 * furniture + one glow mesh (kit.ts), the people (owner behind the counter with the street NPC's id and dialogue,
 * guests without one), signs, spots and the moving decor (clock, fans). The owner's id is the same as before, so
 * dialogues, quests and the guide keep working; only the scene changed.
 */

export interface NpcPlace {
  def: NpcDef
  at: PointXZ
  yaw?: number
  seatY?: number
  activity?: 'sip' | 'fan' | null
  arms?: number
  zone?: ZoneXZ
  /** Only there while this holds. */
  if?: Condition
  extraActions?: ContextAction[]
}
export interface SignPlace {
  /** Static, or rebuilt once per game day (the gold price). */
  options: SignOptions | ((day: number) => SignOptions)
  width: number
  at: Vec3
  rotY?: number
  flat?: boolean
}
export interface SpotPlace {
  id: string
  name: Localized
  zone: ZoneXZ
  actions: SpotAction[]
}
export interface Plan {
  w: number
  d: number
  h: number
  style: RoomStyle
  floor: 'check' | 'planks' | 'small' | 'bong'
  windows?: number[]
  b: Build
  npcs: NpcPlace[]
  signs: SignPlace[]
  spots: SpotPlace[]
  clocks: { at: Vec3; rotY?: number; r?: number }[]
  calendars: { at: Vec3; rotY?: number }[]
  wallFans: { at: Vec3; rotY?: number }[]
  ceilingFans: { at: Vec3; blade?: string }[]
  exit: PointXZ
}

// --- Helpers ---------------------------------------------------------------------------------------------------------

interface Ctx extends Plan {
  id: ShopRoomId
  /** Back wall (z) and open front (z). */
  BK: number
  F: number
  /** Half width. */
  HW: number
}

function start(id: ShopRoomId, style: RoomStyle, floor: Plan['floor'], h = 3.2): Ctx {
  const r = SHOP_ROOMS[id]
  const exit = shopExit(r)
  const b = newBuild()
  exitMat(b, exit.x, exit.z)
  return { id, w: r.w, d: r.d, h, style, floor, b, npcs: [], signs: [], spots: [], clocks: [], calendars: [], wallFans: [], ceilingFans: [], exit, BK: -r.d / 2, F: r.d / 2, HW: r.w / 2 }
}

/** The owner (the street NPC) at `at`, talking zone in front of them (toward +z unless given). */
function owner(c: Ctx, id: keyof typeof NPCS, at: PointXZ, o: Partial<NpcPlace> = {}) {
  c.npcs.push({ def: NPCS[id] as NpcDef, at, yaw: 0, zone: { x: at.x, z: at.z + 1.35, halfX: 1.1, halfZ: 0.55 }, ...o })
}

type Seat = { x: number; z: number; yaw: number }
/** Guests on some of the seats (index list), eating / drinking. */
function seat(c: Ctx, seats: Seat[], which: number[], first: number, seatY = 0.31) {
  which.forEach((k, i) => {
    const s = seats[k % seats.length]
    c.npcs.push({ def: guest(c.id, first + i, first * 3 + i * 7), at: { x: s.x, z: s.z }, yaw: s.yaw, seatY, activity: i % 2 ? 'sip' : null, arms: i % 2 ? 0 : 0.6 })
  })
}

/** Back-wall sign centred at x, a little under the top of the wall. */
const wallSign = (c: Ctx, options: SignOptions, x = 0, width = 3.2, y = c.h - 0.6) => c.signs.push({ options, width, at: [x, y, c.BK + 0.035] })
/** A flat poster on the left (−1) or right (+1) side wall. */
const sidePoster = (c: Ctx, side: -1 | 1, z: number, options: SignOptions, width = 1.3, y = 1.75) =>
  c.signs.push({ options, width, at: [side * (c.HW - 0.025), y, z], rotY: -side * (Math.PI / 2), flat: true })

const sign = (title: string, subtitle: string, background: string, color: string, border: string, aspect = 4): SignOptions => ({ title, subtitle, background, color, border, accent: color, aspect })

/** The menu of a shop with today's prices. */
function menu(shop: ShopId, background: string, color: string, border: string, aspect = 1.5): SignOptions {
  const items = SHOPS[shop].items as readonly ItemId[]
  return { title: 'THỰC ĐƠN', subtitle: items.map((i) => `${ITEMS[i].name.vi} ${formatMoney(ITEMS[i].price)}`).join(' · '), background, color, border, accent: color, aspect }
}

/** Steam drifting up from a pot (a few soft spheres). */
function steam(b: Build, x: number, y: number, z: number, n = 3) {
  for (let i = 0; i < n; i++) b.s.push({ sphere: [0.07 + i * 0.035, 7, 5], at: [x + (i % 2 ? 0.06 : -0.04), y + i * 0.22, z + i * 0.05], color: '#f4f6f8' })
}

/** A TV on a wall bracket (local front +z), the screen glowing. */
function tv(b: Build, x: number, y: number, z: number, rotY = 0) {
  b.s.push(put([{ box: [1.0, 0.6, 0.06], at: [0, 0, 0], color: '#1f1f24' }, { box: [0.1, 0.1, 0.2], at: [0, 0, -0.1], color: '#3a3a40' }], x, y, z, rotY))
  b.glow.push(put([{ box: [0.92, 0.52, 0.01], at: [0, 0, 0.035], color: '#7fd0a8' }, { box: [0.3, 0.06, 0.012], at: [0.2, -0.18, 0.04], color: '#ffffff' }], x, y, z, rotY))
}

/** A water cooler (bình nước) with a blue bottle. */
function waterCooler(b: Build, x: number, z: number) {
  b.s.push({ box: [0.34, 0.95, 0.34], at: [x, 0.475, z], color: '#f4f6f8' })
  b.s.push({ cyl: [0.15, 0.15, 0.42, 12], at: [x, 1.16, z], color: '#9fd2f0' })
  b.s.push({ box: [0.05, 0.05, 0.04], at: [x - 0.07, 0.75, z + 0.18], color: '#d4473b' })
  b.s.push({ box: [0.05, 0.05, 0.04], at: [x + 0.07, 0.75, z + 0.18], color: '#4f8fd8' })
  b.block.push([x, z, 0.2, 0.2])
}

/** A row of waiting chairs along z on a side wall (sitters face the room). Returns seats. */
function chairRow(c: Ctx, side: -1 | 1, z0: number, n: number, color = '#3f5f8f'): Seat[] {
  const x = side * (c.HW - 0.32)
  const out: Seat[] = []
  for (let i = 0; i < n; i++) {
    const z = z0 + i * 0.62
    const ch = M('iChair1', 0.86, { paint: () => color })
    c.b.s.push(put(ch.length ? ch : [{ box: [0.42, 0.05, 0.42], at: [0, 0.45, 0], color }], x, 0, z, side === -1 ? Math.PI / 2 : -Math.PI / 2))
    out.push({ x, z, yaw: side === -1 ? Math.PI / 2 : -Math.PI / 2 })
  }
  c.b.block.push([x, z0 + ((n - 1) * 0.62) / 2, 0.25, (n * 0.62) / 2])
  return out
}

/** A queue number display (black box, red digits). */
function queueDisplay(b: Build, x: number, y: number, z: number) {
  b.s.push({ box: [0.7, 0.26, 0.08], at: [x, y, z], color: '#1f1f24' })
  for (let i = 0; i < 3; i++) b.glow.push({ box: [0.13, 0.17, 0.01], at: [x - 0.18 + i * 0.18, y, z + 0.045], color: '#ff4d4d' })
}

/** Ceiling tubes hanging on wires across the room (convenience store, office). */
function hangingTubes(c: Ctx, xs: number[], zs: number[], len = 1.3) {
  for (const x of xs)
    for (const z of zs) {
      for (const dx of [-len / 2 + 0.1, len / 2 - 0.1]) c.b.s.push({ cyl: [0.004, 0.004, 0.3, 3], at: [x + dx, c.h - 0.15, z], color: P_WIRE })
      tube(c.b, x, c.h - 0.36, z, len)
    }
}
const P_WIRE = '#4d4b5c'

// --- Eateries --------------------------------------------------------------------------------------------------------

function pho(): Ctx {
  const c = start('pho', { wall: '#f3dfae', wallLow: '#e3c78e', floor: '#f1e6cf', floorAlt: '#b9563c', trim: '#2f6b4f', window: '#cfe8f6' }, 'bong')
  const { b, BK, HW } = c
  wainscot(b, c.w, c.d, 1.15, '#eef2ee', '#2f6b4f', '#dfe8e2')
  // The broth: a huge pot on a coal stove in the corner, bác Phở behind it with his ladle
  const px = -HW + 0.85
  const pz = BK + 1.25
  b.s.push({ cyl: [0.42, 0.46, 0.38, 14], at: [px, 0.19, pz], color: '#4a4a52' })
  b.glow.push({ cyl: [0.36, 0.36, 0.03, 14], at: [px, 0.39, pz], color: '#ff6a2a' })
  const pot = M('potLarge', 0.72, paintAll('#b8bcc8'))
  b.s.push(pot.length ? put(pot, px, 0.4, pz) : { cyl: [0.4, 0.36, 0.62, 16], at: [px, 0.71, pz], color: '#b8bcc8' })
  b.s.push({ cyl: [0.38, 0.38, 0.02, 16], at: [px, 1.1, pz], color: '#8a5a32' })
  b.s.push({ cyl: [0.012, 0.012, 0.7, 4], at: [px + 0.2, 1.3, pz - 0.05], rot: [0, 0, -0.5], color: '#8e98ab' })
  steam(b, px, 1.3, pz, 4)
  b.block.push([px, pz, 0.48, 0.48])
  owner(c, 'bacPho', { x: px, z: BK + 0.45 }, { zone: { x: px + 0.9, z: pz + 0.4, halfX: 0.5, halfZ: 0.8 } })
  // The serving line: noodle cabinet, beef hanging behind glass, herbs, limes, chilli
  const cx = -0.9
  const cz = BK + 1.35
  glassCase(b, cx, cz, 2.6, 0.62, 1.25, '#8a3b1f', '#d9dde4', (s, y) => {
    for (let i = 0; i < 6; i++) s.push({ box: [0.24, 0.1 + (i % 3) * 0.04, 0.3], at: [-1.0 + i * 0.32, y + 0.06, -0.05], color: '#fbf6ea' })
    for (let i = 0; i < 4; i++) s.push({ box: [0.1, 0.32, 0.06], at: [-0.7 + i * 0.28, y + 0.38, 0.12], rot: [0, 0, 0.05], color: i % 2 ? '#a3382c' : '#8a2a22' })
  })
  b.s.push({ box: [0.5, 0.14, 0.34], at: [cx + 0.95, 1.33, cz + 0.08], color: '#c49a6c' })
  for (let i = 0; i < 6; i++) b.s.push({ sphere: [0.07, 6, 4], at: [cx + 0.8 + (i % 3) * 0.12, 1.43, cz + 0.02 + Math.floor(i / 3) * 0.12], color: i % 2 ? '#5fa84d' : '#7fc27a' })
  b.s.push({ cyl: [0.12, 0.1, 0.04, 10], at: [cx - 0.95, 1.29, cz + 0.12], color: '#ffffff' })
  for (let i = 0; i < 5; i++) b.s.push({ sphere: [0.03, 6, 4], at: [cx - 1.0 + (i % 3) * 0.05, 1.33, cz + 0.1 + Math.floor(i / 3) * 0.05], color: '#9fd06a' })
  owner(c, 'chuPho', { x: cx + 0.2, z: BK + 0.55 }, { zone: { x: cx, z: cz + 0.85, halfX: 1.3, halfZ: 0.5 } })
  // Behind them: bowl shelf, tubes, the menu, the old photo "since 1979"
  const shelf: ShapeItem[] = [{ box: [2.6, 0.04, 0.3], at: [0, 0, 0], color: '#8a5a3c' }]
  for (let i = 0; i < 8; i++) shelf.push({ cyl: [0.11, 0.07, 0.07 + (i % 3) * 0.03, 10], at: [-1.1 + i * 0.32, 0.06, 0], color: i % 4 === 3 ? '#4f8fd8' : '#f4f1ea' })
  b.s.push(put(shelf, cx, 1.6, BK + 0.17))
  tube(b, cx, 2.35, BK + 0.06, 1.3)
  backDoor(b, HW - 1.3, c.d, '#2f6b4f')
  fridge(b, HW - 0.45, BK + 1.2, -Math.PI / 2, 0.75)
  altar(b, HW - 0.2, 2.15, -0.6, -Math.PI / 2)
  frame(b, -HW + 0.03, 1.9, -1.2, 0.8, 0.6, '#d9c9a8', '#5b3a2a', Math.PI / 2)
  frame(b, -HW + 0.03, 1.85, -0.45, 0.45, 0.55, '#c9b89a', '#5b3a2a', Math.PI / 2)
  wallSign(c, EATERY_DEFS.pho.sign, 1.4, 3.1)
  sidePoster(c, -1, -2.35, menu('phoGiaTruyen', '#fffaf0', '#8a2a24', '#c8322b'), 1.2, 1.85)
  // The dining room: low tables, guests slurping
  const a = plasticSet(b, -2.6, 0.9, '#4f8fd8', ['#d4473b', '#4f8fd8'], 1)
  const t = plasticSet(b, -0.4, 0.35, '#d4473b', ['#3fae72', '#ffd23f'], 2)
  const u = plasticSet(b, 1.6, -0.2, '#4f8fd8', ['#d4473b', '#ffd23f'], 3, 3)
  const v = plasticSet(b, -1.2, 2.2, '#3fae72', ['#d4473b', '#4f8fd8'], 4, 3)
  seat(c, a, [0, 2], 0)
  seat(c, t, [1], 2)
  seat(c, u, [0, 1], 3)
  seat(c, v, [2], 5)
  c.ceilingFans.push({ at: [0.4, c.h, 0.6] })
  c.wallFans.push({ at: [-HW + 0.06, 2.5, 0.1], rotY: Math.PI / 2 })
  c.clocks.push({ at: [HW - 1.15, 2.65, BK + 0.04], r: 0.22 })
  c.calendars.push({ at: [-HW + 1.9, 1.7, BK + 0.03] })
  return c
}

function bunCha(): Ctx {
  const c = start('bunCha', { wall: '#ead4a6', wallLow: '#d8bd86', floor: '#e9e2d2', floorAlt: '#d8ccb4', trim: '#2f6b4f' }, 'small')
  const { b, BK, HW } = c
  wainscot(b, c.w, c.d, 1.05, '#3f7d5c', '#f4efe4')
  // The charcoal grill against the left wall: patties on the grate, coals, a hood drawing the smoke
  const gx = -HW + 0.5
  const gz = -1.2
  b.s.push({ box: [0.6, 0.62, 1.2], at: [gx, 0.31, gz], color: '#6b4a3a' })
  b.s.push({ box: [0.5, 0.06, 1.05], at: [gx, 0.64, gz], color: '#3a3a40' })
  b.glow.push({ box: [0.44, 0.02, 0.98], at: [gx, 0.66, gz], color: '#ff6a2a' })
  for (let i = 0; i < 10; i++) b.s.push({ box: [0.12, 0.035, 0.09], at: [gx - 0.12 + (i % 2) * 0.22, 0.7, gz - 0.42 + Math.floor(i / 2) * 0.21], color: i % 3 ? '#8a4a2a' : '#9a5432' })
  b.s.push({ box: [0.7, 0.35, 1.3], at: [gx + 0.02, 2.2, gz], color: '#b8bcc8' })
  b.s.push({ box: [0.3, 0.9, 0.3], at: [gx - 0.1, 2.85, gz], color: '#b8bcc8' })
  for (let i = 0; i < 3; i++) b.s.push({ sphere: [0.08 + i * 0.03, 7, 5], at: [gx + 0.05, 1.0 + i * 0.3, gz + 0.1 * i], color: '#eceae6' })
  b.block.push([gx, gz, 0.34, 0.62])
  owner(c, 'coLua', { x: gx + 0.75, z: gz }, { yaw: -Math.PI / 2, zone: { x: gx + 1.6, z: gz, halfX: 0.5, halfZ: 0.9 } })
  // Prep counter on the back wall: baskets of herbs, white bún, nem on a plate, bowls of dipping sauce
  counter(b, -0.6, BK + 0.4, 2.8, 0.6, '#f4f1ea', '#8a5a3c', 0.92)
  for (let i = 0; i < 3; i++) {
    b.s.push({ cyl: [0.2, 0.16, 0.1, 12], at: [-1.6 + i * 0.5, 0.97, BK + 0.4], color: '#c49a6c' })
    for (let k = 0; k < 4; k++) b.s.push({ sphere: [0.07, 6, 4], at: [-1.66 + i * 0.5 + (k % 2) * 0.1, 1.04, BK + 0.36 + Math.floor(k / 2) * 0.09], color: ['#5fa84d', '#fbf8f2', '#7fc27a'][i] })
  }
  b.s.push(put(M('plate', 0.03), 0.3, 0.92, BK + 0.4))
  for (let i = 0; i < 4; i++) b.s.push({ cyl: [0.035, 0.035, 0.16, 6], at: [0.22 + (i % 2) * 0.12, 0.97, BK + 0.36 + Math.floor(i / 2) * 0.08], rot: [0, 0, Math.PI / 2], color: '#d98a3a' })
  for (let i = 0; i < 4; i++) b.s.push({ cyl: [0.07, 0.05, 0.05, 8], at: [0.7 + i * 0.16, 0.95, BK + 0.45], color: '#e8a243' })
  b.s.push(put(M('crateLettuce', 0.26), 1.3, 0, BK + 0.4))
  b.s.push(put(M('crateOnions', 0.26), 1.3, 0.27, BK + 0.4, 0.2))
  backDoor(b, HW - 1.5, c.d, '#2f6b4f', '#f4efe4')
  tv(b, HW - 0.1, 2.3, -0.5, -Math.PI / 2)
  altar(b, -3.0, 2.3, BK + 0.2)
  tube(b, -0.6, 1.95, BK + 0.06)
  wallSign(c, EATERY_DEFS.bunCha.sign, -0.6, 3.0)
  sidePoster(c, 1, -2.0, menu('bunChaCoLua', '#fffaf0', '#2f6b4f', '#2f6b4f'), 1.1, 1.85)
  fairyLights(b, -HW + 0.3, HW - 0.3, 2.85, BK + 0.08)
  const a = plasticSet(b, -1.0, -0.3, '#4f8fd8', ['#d4473b', '#4f8fd8'], 1)
  const t = plasticSet(b, 1.1, -0.6, '#4f8fd8', ['#d4473b', '#ffd23f'], 2)
  const u = plasticSet(b, -1.6, 1.7, '#f4f1ea', ['#3fae72', '#d4473b'], 3)
  const v = plasticSet(b, 0.7, 1.4, '#f4f1ea', ['#4f8fd8', '#d4473b'], 4, 3)
  seat(c, a, [0, 1, 3], 0)
  seat(c, t, [2], 3)
  seat(c, u, [1], 4)
  seat(c, v, [0], 5)
  c.ceilingFans.push({ at: [0.2, c.h, 0.4] })
  c.clocks.push({ at: [HW - 3.0, 2.72, BK + 0.04] })
  return c
}

function banhCuon(): Ctx {
  const c = start('banhCuon', { wall: '#f6d5c4', wallLow: '#e9b9a2', floor: '#f4ece0', floorAlt: '#5f8f8b', trim: '#c8322b' }, 'bong')
  const { b, BK, HW } = c
  wainscot(b, c.w, c.d, 1.0, '#ffffff', '#c8322b', '#f2e8e0')
  // Bà Tám on her low stool behind the steamer: cloth stretched over the pot, the ladle, plates of rolls
  const sx = -1.6
  const sz = -1.05
  b.s.push({ box: [1.5, 0.44, 0.75], at: [sx + 0.2, 0.22, sz], color: '#8a5a3c' })
  const pot = M('potLarge', 0.36, paintAll('#b8bcc8'))
  b.s.push(pot.length ? put(pot, sx - 0.2, 0.44, sz) : { cyl: [0.3, 0.28, 0.36, 14], at: [sx - 0.2, 0.62, sz], color: '#b8bcc8' })
  b.s.push({ cyl: [0.31, 0.31, 0.02, 16], at: [sx - 0.2, 0.82, sz], color: '#fbf8f2' })
  b.glow.push({ cyl: [0.22, 0.22, 0.02, 12], at: [sx - 0.2, 0.45, sz], color: '#5d9bff' })
  steam(b, sx - 0.2, 0.95, sz + 0.1, 3)
  b.s.push(put(M('plate', 0.03), sx + 0.45, 0.44, sz))
  for (let i = 0; i < 4; i++) b.s.push({ cyl: [0.035, 0.035, 0.16, 6], at: [sx + 0.37 + (i % 2) * 0.1, 0.49, sz - 0.04 + Math.floor(i / 2) * 0.08], rot: [Math.PI / 2, 0, 0], color: '#fbf8f2' })
  b.s.push({ cyl: [0.1, 0.08, 0.06, 10], at: [sx + 0.75, 0.47, sz + 0.12], color: '#8a5a32' })
  b.block.push([sx + 0.2, sz, 0.78, 0.4])
  owner(c, 'baTam', { x: sx - 0.2, z: sz - 0.7 }, { seatY: 0.3, arms: 1, zone: { x: sx + 0.2, z: sz + 0.85, halfX: 1.0, halfZ: 0.45 } })
  b.s.push(put(M('stool', 0.3, paintAll('#3fae72')), sx - 0.2, 0, sz - 0.7))
  // A second pot on the side, a shelf of plates, the baskets of chả quế
  b.s.push({ box: [2.4, 0.04, 0.3], at: [-1.6, 1.55, BK + 0.17], color: '#8a5a3c' })
  for (let i = 0; i < 7; i++) b.s.push({ cyl: [0.12, 0.1, 0.04 + (i % 2) * 0.04, 12], at: [-2.6 + i * 0.32, 1.6, BK + 0.17], color: '#f4f1ea' })
  counter(b, 1.5, BK + 0.4, 1.8, 0.55, '#f4f1ea', '#c8322b', 0.9)
  for (let i = 0; i < 3; i++) b.s.push({ cyl: [0.12, 0.12, 0.08, 10], at: [0.9 + i * 0.4, 0.95, BK + 0.4], color: '#c49a6c' })
  for (let i = 0; i < 6; i++) b.s.push({ cyl: [0.04, 0.04, 0.1, 6], at: [0.85 + i * 0.2, 1.02, BK + 0.4], rot: [0, 0, Math.PI / 2], color: '#d9a35a' })
  backDoor(b, HW - 0.9, c.d, '#c8322b', '#7a4a8a')
  altar(b, HW - 0.2, 2.2, -0.9, -Math.PI / 2)
  tube(b, -1.6, 2.0, BK + 0.06)
  wallSign(c, EATERY_DEFS.banhCuon.sign, 0, 3.0)
  sidePoster(c, -1, -1.2, menu('banhCuonBaTam', '#fffaf0', '#c8322b', '#c8322b'), 1.0, 1.85)
  const a = plasticSet(b, 0.9, -0.5, '#f4f1ea', ['#d4473b', '#3fae72'], 3)
  const t = plasticSet(b, -2.3, 1.3, '#f4f1ea', ['#d4473b', '#4f8fd8'], 4)
  const u = plasticSet(b, 0.2, 1.6, '#f4f1ea', ['#3fae72', '#ffd23f'], 5, 3)
  seat(c, a, [0, 2], 0)
  seat(c, t, [1, 3], 2)
  seat(c, u, [0], 4)
  c.wallFans.push({ at: [-HW + 0.06, 2.3, -0.1], rotY: Math.PI / 2 })
  c.clocks.push({ at: [1.6, 2.0, BK + 0.04], r: 0.2 })
  c.calendars.push({ at: [2.4, 1.65, BK + 0.03] })
  return c
}

function lau(): Ctx {
  const c = start('lau', { wall: '#c96d5a', wallLow: '#9a4a3c', floor: '#8a5a3c', floorAlt: '#7a4e34', trim: '#f4e2c4' }, 'planks', 3.3)
  const { b, BK, HW } = c
  wainscot(b, c.w, c.d, 1.2, '#6b3a2a', '#f4c04e')
  // Hotpot tables: a gas burner and a pot of red broth on each, friends around them
  const hot = (x: number, z: number, seed: number) => {
    const seats = diningSet(b, x, z, seed, { chair: '#c8322b' })
    b.s.push(put(M('stoveTop', 0.07), x, 0.74, z))
    b.s.push(put(M('potStew', 0.2, { paint: (_m, col) => (col === '#859095' ? '#c9ced8' : col === '#008554' ? '#7fc27a' : '#d4473b') }), x, 0.8, z))
    b.glow.push({ cyl: [0.12, 0.12, 0.02, 10], at: [x, 0.78, z], color: '#5d9bff' })
    steam(b, x, 1.15, z, 2)
    for (const [dx, dz] of [
      [0.32, 0.18],
      [-0.3, -0.2],
    ])
      b.s.push(put(M('plate', 0.03), x + dx, 0.74, z + dz))
    return seats
  }
  const a = hot(-3.2, -1.4, 0)
  const t = hot(-0.6, -1.6, 1)
  const u = hot(-2.4, 1.3, 2)
  const v = hot(0.6, 1.0, 3)
  seat(c, a, [0, 1, 2], 0, 0.45)
  seat(c, t, [1, 3], 3, 0.45)
  seat(c, u, [0, 2], 5, 0.45)
  seat(c, v, [1], 7, 0.45)
  // Anh Dũng at the till, drinks fridges, beer crates
  counter(b, HW - 1.9, BK + 1.35, 2.0, 0.6, '#3a2a22', '#8a5a3c', 1.0, '#f4c04e')
  b.s.push({ box: [0.3, 0.22, 0.25], at: [HW - 1.5, 1.12, BK + 1.3], color: '#2f2f38' })
  b.s.push({ box: [0.24, 0.02, 0.16], at: [HW - 2.2, 1.02, BK + 1.35], color: '#ffffff' })
  owner(c, 'anhDung', { x: HW - 1.9, z: BK + 0.7 }, { zone: { x: HW - 1.9, z: BK + 2.15, halfX: 1.0, halfZ: 0.5 } })
  fridge(b, HW - 0.45, BK + 2.1, -Math.PI / 2)
  fridge(b, HW - 0.45, BK + 3.0, -Math.PI / 2)
  for (let i = 0; i < 3; i++) for (let k = 0; k < 2; k++) b.s.push({ box: [0.4, 0.26, 0.3], at: [-HW + 0.35 + k * 0.42, 0.13 + i * 0.27, BK + 0.3], color: i % 2 ? '#f4c04e' : '#2f6b4f' })
  b.block.push([-HW + 0.56, BK + 0.3, 0.44, 0.2])
  b.s.push(put(M('shelfDeco', 1.1), -0.6, 1.0, BK + 0.3))
  // Lanterns over the tables, a long red banner, rice-wine jars
  for (const [x, z] of [
    [-3.2, -1.4],
    [-0.6, -1.6],
    [-2.4, 1.3],
    [0.6, 1.0],
  ])
    lantern(b, x, z, c.h, 0.55)
  for (let i = 0; i < 3; i++) b.s.push(put(M('jarB', 0.35, paintAll(i % 2 ? '#8a5a32' : '#6b3a2a')), -HW + 0.4, 0, -0.6 + i * 0.45))
  b.block.push([-HW + 0.4, -0.15, 0.22, 0.7])
  wallSign(c, EATERY_DEFS.lau.sign, -1.0, 4.2)
  c.signs.push({ options: sign('BIA HƠI · RƯỢU NẾP', 'Mát lạnh · Cạn ly!', '#f4c04e', '#6b3a2a', '#6b3a2a', 3), width: 1.4, at: [-HW + 0.03, 2.0, -1.4], rotY: Math.PI / 2, flat: true })
  c.signs.push({ options: menu('lauTrangTien', '#2a1d18', '#ffe08a', '#f4c04e'), width: 1.1, at: [HW - 1.9, 2.0, BK + 0.035], flat: true })
  airCon(b, -HW + 0.12, 2.7, -2.6, Math.PI / 2)
  c.clocks.push({ at: [2.0, 2.65, BK + 0.04] })
  return c
}

function banhMi(): Ctx {
  const c = start('banhMi', { wall: '#f6e7c4', wallLow: '#e6cf9e', floor: '#fbf3e2', floorAlt: '#e8c58a', trim: '#8a3b1f' }, 'small')
  const { b, BK, HW } = c
  wainscot(b, c.w, c.d, 1.0, '#8a3b1f', '#f4c04e')
  // The glass cart (tủ bánh mì): red frame, baguettes stacked inside, a warm lamp — chị Ngân behind it
  const cx = -0.4
  const cz = BK + 1.5
  b.s.push({ box: [1.6, 0.85, 0.62], at: [cx, 0.55, cz], color: '#c8322b' })
  for (const dx of [-0.7, 0.7]) b.s.push({ cyl: [0.12, 0.12, 0.05, 10], at: [cx + dx, 0.12, cz + 0.33], rot: [Math.PI / 2, 0, 0], color: '#3a3a40' })
  b.s.push({ box: [1.5, 0.55, 0.52], at: [cx, 1.25, cz], color: '#e6f2f6' })
  b.s.push({ box: [1.62, 0.05, 0.64], at: [cx, 1.55, cz], color: '#c8322b' })
  for (let i = 0; i < 10; i++) b.s.push({ cyl: [0.045, 0.04, 0.42, 6], at: [cx - 0.55 + (i % 5) * 0.27, 1.04 + Math.floor(i / 5) * 0.1, cz - 0.05 + (i % 2) * 0.1], rot: [0, 0, Math.PI / 2], color: '#e8a243' })
  b.glow.push({ box: [1.2, 0.04, 0.04], at: [cx, 1.5, cz], color: '#fff2b3' })
  b.s.push({ box: [1.2, 0.18, 0.02], at: [cx, 0.75, cz + 0.32], color: '#f4c04e' })
  b.block.push([cx, cz, 0.85, 0.36])
  owner(c, 'chiNgan', { x: cx, z: BK + 0.75 }, { zone: { x: cx, z: cz + 0.9, halfX: 1.0, halfZ: 0.5 } })
  // Oven and bread crates against the back wall, pâté jars, a cutting board
  const oven = M('iKitchenOven', 0.85)
  b.s.push(oven.length ? put(oven, -HW + 0.55, 0, BK + 0.32) : { box: [0.55, 0.85, 0.6], at: [-HW + 0.55, 0.42, BK + 0.32], color: '#3a3a40' })
  b.block.push([-HW + 0.55, BK + 0.32, 0.3, 0.32])
  counter(b, 1.6, BK + 0.35, 1.6, 0.55, '#f4f1ea', '#d9b878', 0.9)
  b.s.push(put(M('crateBuns', 0.26), 1.2, 0.9, BK + 0.35))
  b.s.push(put(M('board', 0.04), 1.8, 0.9, BK + 0.35))
  b.s.push(put(M('knife', 0.03), 1.8, 0.94, BK + 0.35, 0.4))
  for (let i = 0; i < 3; i++) b.s.push(put(M('jarA', 0.2, { paint: (_m, col) => (col === '#6babd6' ? '#cfe8f0' : '#a85a3a') }), 2.2, 0.9, BK + 0.15 + i * 0.2))
  for (let r = 0; r < 2; r++) b.s.push(put(M('crateBuns', 0.26), -HW + 1.3 + r * 0.02, 0.27 * r, BK + 0.3, r * 0.1))
  // A bar along the right wall with high stools, a small table by the left wall
  b.s.push({ box: [0.4, 0.05, 2.0], at: [HW - 0.25, 1.05, -0.2], color: '#8a5a3c' })
  b.s.push({ box: [0.05, 1.0, 1.9], at: [HW - 0.06, 0.52, -0.2], color: '#6b4a3a' })
  const bar: Seat[] = []
  for (let i = 0; i < 3; i++) {
    const z = -0.9 + i * 0.7
    const st = M('iStool', 0.72)
    b.s.push(st.length ? put(st, HW - 0.8, 0, z) : { cyl: [0.18, 0.15, 0.7, 8], at: [HW - 0.8, 0.35, z], color: '#8a5a3c' })
    bar.push({ x: HW - 0.8, z, yaw: Math.PI / 2 })
  }
  b.block.push([HW - 0.4, -0.2, 0.25, 1.0])
  seat(c, bar, [0, 2], 0, 0.72)
  const t = plasticSet(b, -2.1, 0.9, '#d4473b', ['#4f8fd8', '#ffd23f'], 8, 3)
  seat(c, t, [1], 2)
  tube(b, 1.6, 1.95, BK + 0.06)
  wallSign(c, EATERY_DEFS.banhMi.sign, -0.3, 2.9)
  sidePoster(c, -1, -1.0, menu('banhMi25', '#2f2a28', '#ffe08a', '#f4c04e'), 1.0, 1.85)
  c.wallFans.push({ at: [-HW + 0.06, 2.35, 0.2], rotY: Math.PI / 2 })
  c.clocks.push({ at: [3.0, 2.45, BK + 0.04], r: 0.2 })
  return c
}

function com(): Ctx {
  const c = start('com', { wall: '#d4e6cc', wallLow: '#b9d0ae', floor: '#f0ece2', floorAlt: '#c9d6cc', trim: '#2c5aa0' }, 'small')
  const { b, BK, HW } = c
  wainscot(b, c.w, c.d, 1.1, '#ffffff', '#2c5aa0', '#e8eef4')
  // The day's dishes in steel trays under a light frame, the rice pot, the soup pot — bà Sáu ladles
  const cw = 4.0
  const cz = BK + 1.45
  counter(b, -0.6, cz, cw, 0.62, '#f4f1ea', '#dfe2e8', 0.78)
  for (const dx of [-cw / 2 + 0.05, cw / 2 - 0.05]) for (const dz of [-0.28, 0.28]) b.s.push({ box: [0.04, 0.36, 0.04], at: [-0.6 + dx, 0.96, cz + dz], color: '#b8bcc8' })
  b.s.push({ box: [cw, 0.03, 0.62], at: [-0.6, 1.15, cz], color: '#cfe8f0' })
  const dish = ['#a85a3a', '#7fc27a', '#e8a243', '#d4473b', '#fff3d6', '#8a4a2a', '#f4c04e', '#5fa84d']
  for (let i = 0; i < 9; i++) {
    const x = -0.6 - (8 * 0.42) / 2 + i * 0.42
    b.s.push({ box: [0.38, 0.04, 0.3], at: [x, 0.8, cz - 0.08], color: '#dfe2e8' })
    b.s.push({ box: [0.32, 0.05, 0.24], at: [x, 0.83, cz - 0.08], color: dish[i % dish.length] })
  }
  b.s.push(put(M('potA', 0.36, paintAll('#c9ced8')), 1.85, 0, cz))
  b.s.push({ cyl: [0.28, 0.28, 0.02, 14], at: [1.85, 0.37, cz], color: '#fbf8f2' })
  b.s.push(put(M('stockPot', 0.34, paintAll('#b8bcc8')), -3.1, 0, cz))
  steam(b, -3.1, 0.6, cz, 2)
  b.block.push([1.85, cz, 0.3, 0.3], [-3.1, cz, 0.3, 0.3])
  for (let i = 0; i < 6; i++) b.s.push({ box: [0.4, 0.02, 0.3], at: [-0.6, 1.17 + i * 0.022, BK + 0.25], color: '#c9ced8' })
  owner(c, 'baSauCom', { x: -0.4, z: BK + 0.75 }, { zone: { x: -0.6, z: cz + 0.9, halfX: 1.6, halfZ: 0.5 } })
  backDoor(b, HW - 1.0, c.d, '#2c5aa0', '#ffffff')
  fridge(b, -HW + 0.4, -0.3, Math.PI / 2, 0.75)
  tv(b, HW - 0.1, 2.25, -0.3, -Math.PI / 2)
  altar(b, -HW + 0.2, 2.3, -2.0, Math.PI / 2)
  tube(b, -0.6, 1.95, BK + 0.06)
  wallSign(c, EATERY_DEFS.com.sign, -0.6, 3.2)
  sidePoster(c, 1, -2.0, menu('comBaSau', '#fffaf0', '#2c5aa0', '#2c5aa0'), 1.1, 1.85)
  const a = plasticSet(b, -2.0, 0.5, '#ffffff', ['#4f8fd8', '#d4473b'], 9)
  const t = plasticSet(b, 0.2, 0.2, '#ffffff', ['#4f8fd8', '#ffd23f'], 10)
  const u = plasticSet(b, 2.3, -0.3, '#ffffff', ['#d4473b', '#4f8fd8'], 11, 3)
  const v = plasticSet(b, -0.9, 2.0, '#ffffff', ['#3fae72', '#d4473b'], 12, 3)
  seat(c, a, [0, 1, 2], 0)
  seat(c, t, [3], 3)
  seat(c, u, [0, 2], 4)
  seat(c, v, [1], 6)
  c.ceilingFans.push({ at: [-0.6, c.h, 0.5], blade: '#e9eef5' })
  c.clocks.push({ at: [2.2, 2.7, BK + 0.04] })
  c.calendars.push({ at: [2.2, 1.75, BK + 0.03] })
  return c
}

function che(): Ctx {
  const c = start('che', { wall: '#fbdde6', wallLow: '#f3bfcf', floor: '#f7eef0', floorAlt: '#f9c9d6', trim: '#ff7fa0' }, 'small')
  const { b, BK, HW } = c
  wainscot(b, c.w, c.d, 1.0, '#f7eef1', '#ff7fa0', '#fde0e8')
  // The jar counter: red bean, green jelly, pomelo, coconut, taro, sweet corn — cô Hiền scoops
  const cw = c.w - 2.6
  const cz = BK + 1.3
  counter(b, -0.6, cz, cw, 0.6, '#ffffff', '#ff9fb2', 0.85)
  const fills = ['#c8322b', '#7cc27a', '#f4c04e', '#ffffff', '#9b7bd0', '#e8a243']
  const jars = Math.floor((cw - 0.3) / 0.34)
  for (let i = 0; i < jars; i++) {
    const name = ['jarA', 'jarAm', 'jarD'][i % 3]
    const x = -0.6 - ((jars - 1) * 0.34) / 2 + i * 0.34
    const m = M(name, 0.32, { paint: (_m, col) => (col === '#6babd6' || col === '#66a5d3' || col === '#706157' ? '#cfe8f0' : fills[i % fills.length]) })
    b.s.push(m.length ? put(m, x, 0.85, cz) : { cyl: [0.12, 0.12, 0.3, 10], at: [x, 1.0, cz], color: fills[i % fills.length] })
  }
  for (let i = 0; i < 6; i++) b.s.push({ cyl: [0.05, 0.04, 0.14, 8], at: [-1.8 + i * 0.45, 0.92, cz + 0.22], color: fills[i] })
  owner(c, 'coHien', { x: -0.6, z: BK + 0.6 }, { zone: { x: -0.6, z: cz + 0.85, halfX: 1.4, halfZ: 0.5 } })
  // Ice box and a shaved-ice machine, cups stacked
  b.s.push({ box: [0.9, 0.55, 0.55], at: [HW - 0.6, 0.28, BK + 0.4], color: '#4f8fd8' })
  b.s.push({ box: [0.94, 0.06, 0.59], at: [HW - 0.6, 0.58, BK + 0.4], color: '#ffffff' })
  b.s.push({ box: [0.3, 0.45, 0.3], at: [HW - 0.6, 0.84, BK + 0.4], color: '#e6e8ee' })
  b.block.push([HW - 0.6, BK + 0.4, 0.48, 0.3])
  for (let i = 0; i < 4; i++) b.s.push({ cyl: [0.05, 0.04, 0.1 + i * 0.02, 8], at: [HW - 1.2 - i * 0.1, 0.9 + i * 0.05, BK + 0.3], color: '#e6f3f6' })
  // Neon: a pink ring and a cup on the back wall, fairy lights, posters
  b.glow.push({ torus: [0.35, 0.025, 6, 28], at: [-2.9, 2.0, BK + 0.06], color: '#ff6fa8' })
  b.glow.push({ box: [0.24, 0.32, 0.02], at: [-2.9, 1.98, BK + 0.07], color: '#ffd1e4' })
  b.glow.push({ box: [0.32, 0.04, 0.02], at: [-2.9, 2.17, BK + 0.07], color: '#ff9fcf' })
  fairyLights(b, -HW + 0.3, HW - 0.3, 2.8, BK + 0.08, 0.15)
  wallSign(c, EATERY_DEFS.che.sign, 0.6, 2.9)
  sidePoster(c, -1, -1.3, menu('cheBonMua', '#ffffff', '#d4477a', '#ff7fa0'), 1.0, 1.85)
  c.signs.push({ options: sign('CHÈ KHÚC BẠCH', 'Mát lạnh · Hạnh nhân · Vải', '#ffffff', '#ff6fa8', '#ff9fb2', 1.4), width: 0.85, at: [HW - 0.03, 1.85, -1.0], rotY: -Math.PI / 2, flat: true })
  const tbl = (x: number, z: number, seed: number) => plasticSet(b, x, z, '#ffffff', ['#ff9fb2', '#a9d6ff'], seed, 3)
  const a = tbl(-1.9, 0.6, 12)
  const t = tbl(0.4, 0.2, 13)
  const u = tbl(-0.8, 2.0, 14)
  seat(c, a, [0, 1], 0)
  seat(c, t, [2], 2)
  seat(c, u, [0, 2], 3)
  plant(b, HW - 0.4, -0.4, 0.8, 3)
  c.wallFans.push({ at: [HW - 0.06, 2.3, 0.05], rotY: -Math.PI / 2 })
  return c
}

function restaurant(): Ctx {
  const c = start('restaurant', { wall: '#eef2e4', wallLow: '#c9dcc0', floor: '#a8754f', floorAlt: '#94643f', trim: '#d9c6a5', window: '#a9dcf2' }, 'planks', 3.4)
  c.windows = [-3.6, 0, 3.6]
  const { b, BK, HW } = c
  wainscot(b, c.w, c.d, 1.0, '#7a5a3c', '#f4e2c4')
  // Curtains by the lake windows, round tables with white cloths, families eating
  for (const x of [-3.6, 0, 3.6]) {
    const cu = M('iCurtainsDouble', 2.0, { paint: (m, col) => (m === 'Couch_Blue' ? '#c9dcc0' : col) })
    if (cu.length) b.s.push(put(cu, x, 0.85, BK + 0.18, 0, 1))
  }
  const sets = [
    [-3.6, -1.6],
    [-0.6, -1.4],
    [2.4, -1.6],
    [-2.4, 1.2],
    [0.8, 1.0],
  ]
  sets.forEach(([x, z], i) => {
    const seats = diningSet(b, x, z, i, { round: true, cloth: '#fbf8f2', chair: '#8a3b1f' })
    b.s.push(put(M('plate', 0.03), x + 0.2, 0.78, z + 0.1))
    b.s.push(put(M('bowl', 0.07), x - 0.15, 0.78, z - 0.1))
    b.s.push(put(M('foodDinner', 0.1), x, 0.78, z))
    seat(c, seats, i % 2 ? [0, 2] : [1, 2, 3], i * 3, 0.45)
    pendant(b, x, z, c.h, 0.9, '#f4e2c4', '#ffe7b0', 0.24)
  })
  // Chú Thành at the host stand by the door, a fish tank, rice-wine jars, plants, a folding screen
  b.s.push({ box: [0.7, 1.1, 0.5], at: [HW - 2.6, 0.55, 2.0], color: '#6b4a3a' })
  b.s.push({ box: [0.76, 0.05, 0.56], at: [HW - 2.6, 1.12, 2.0], color: '#8a5a3c' })
  b.s.push({ box: [0.3, 0.02, 0.22], at: [HW - 2.6, 1.16, 2.0], color: '#fbf8f2' })
  b.block.push([HW - 2.6, 2.0, 0.4, 0.3])
  owner(c, 'chuNhaHang', { x: HW - 2.6, z: 1.35 }, { yaw: 0, zone: { x: HW - 1.6, z: 2.3, halfX: 0.9, halfZ: 0.8 } })
  b.s.push({ box: [0.5, 0.8, 1.8], at: [-HW + 0.3, 0.4, 0.2], color: '#5b4038' })
  b.s.push({ box: [0.44, 0.75, 1.7], at: [-HW + 0.3, 1.18, 0.2], color: '#9fd8f0' })
  b.s.push({ box: [0.44, 0.12, 1.7], at: [-HW + 0.3, 0.86, 0.2], color: '#e8d6a0' })
  ;['#ff9b3d', '#ffd23f', '#ff6b5e', '#ffffff'].forEach((col, i) => b.s.push({ sphere: [0.05, 6, 4], at: [-HW + 0.32, 1.05 + (i % 2) * 0.2, -0.4 + i * 0.4], scale: [1, 1, 1.7], color: col }))
  b.glow.push({ box: [0.3, 0.03, 1.6], at: [-HW + 0.3, 1.54, 0.2], color: '#d8f4ff' })
  b.block.push([-HW + 0.3, 0.2, 0.3, 0.95])
  for (let i = 0; i < 4; i++) b.s.push(put(M('jarB', 0.42, paintAll('#6b3a2a')), HW - 0.4, 0, -2.8 + i * 0.55))
  b.block.push([HW - 0.4, -2.0, 0.25, 1.0])
  plant(b, -HW + 0.45, 2.6, 1.2, 1)
  plant(b, HW - 0.45, -0.3, 1.1, 2)
  for (let i = 0; i < 4; i++) b.s.push({ box: [0.5, 1.6, 0.04], at: [-HW + 0.5 + i * 0.48, 0.8, -2.2 + (i % 2) * 0.06], rot: [0, 0.3 * (i % 2 ? 1 : -1), 0], color: i % 2 ? '#8a3b1f' : '#a85a3a' })
  wallSign(c, CITY_PLACES.restaurant.sign, 0, 4.0, c.h - 0.4)
  sidePoster(c, 1, -1.0, menu('nhaHangBoHo', '#fffaf0', '#8a3b1f', '#8a3b1f'), 1.1, 1.85)
  airCon(b, -1.8, 2.9, BK + 0.12)
  airCon(b, 1.8, 2.9, BK + 0.12)
  c.clocks.push({ at: [-HW + 0.04, 2.6, -1.4], rotY: Math.PI / 2 })
  return c
}

// --- Shops -----------------------------------------------------------------------------------------------------------

const SHOP_TAPHOA: ContextAction[] = [{ id: 'shop', labelKey: 'action.shop', icon: 'shop', onPress: () => useUI.getState().openPanel({ type: 'shop', shopId: 'taphoa' }) }]

function taphoa(): Ctx {
  const c = start('taphoa', { wall: '#f1dcc0', wallLow: '#dcc19a', floor: '#e6dccb', floorAlt: '#d6c9b2', trim: '#c49a6c' }, 'check')
  const { b, BK, HW } = c
  // Shelves to the ceiling: noodles, fish sauce, biscuits, soap, rice in bags
  shelfUnit(b, -2.0, BK + 0.22, 3.6, 2.6, 5, '#b98a5c', ['packs', 'bottles', 'boxes', 'packs', 'cans'], 1)
  shelfUnit(b, 1.9, BK + 0.22, 3.4, 2.6, 5, '#b98a5c', ['boxes', 'packs', 'bottles', 'jars', 'packs'], 2)
  shelfUnit(b, -HW + 0.22, -1.0, 1.9, 2.2, 4, '#b98a5c', ['packs', 'cans', 'boxes', 'bottles'], 3, Math.PI / 2)
  // Strips of shampoo sachets and snack bags hanging from a wire
  b.s.push({ cyl: [0.006, 0.006, 6.4, 3], at: [0, 2.75, BK + 0.75], rot: [0, 0, Math.PI / 2], color: P_WIRE })
  for (let i = 0; i < 14; i++) {
    const x = -3.0 + i * 0.46
    for (let k = 0; k < 7; k++) b.s.push({ box: [0.12, 0.1, 0.01], at: [x, 2.65 - k * 0.11, BK + 0.75], color: ['#d4473b', '#4f8fd8', '#f4c04e', '#3fae72', '#9b7bd0'][(i + k) % 5] })
  }
  // Cô Liên's counter: glass jars of sweets, a cash box, a calculator, the fan in her hand
  const cx = -1.2
  const cz = 0.35
  glassCase(b, cx, cz, 1.8, 0.55, 0.95, '#c49a6c', '#d9dde4', (s, y) => goods(s, 'packs', 1.6, y, 0.4, 7))
  for (let i = 0; i < 4; i++) {
    b.s.push({ cyl: [0.08, 0.08, 0.2, 10], at: [cx - 0.6 + i * 0.25, 1.05, cz], color: '#e6f3f6' })
    b.s.push({ cyl: [0.07, 0.07, 0.12, 10], at: [cx - 0.6 + i * 0.25, 1.01, cz], color: ['#ff9fb2', '#f4c04e', '#7fc27a', '#d4473b'][i] })
    b.s.push({ cyl: [0.085, 0.085, 0.03, 10], at: [cx - 0.6 + i * 0.25, 1.16, cz], color: '#d4473b' })
  }
  b.s.push({ box: [0.28, 0.1, 0.2], at: [cx + 0.6, 1.0, cz - 0.05], color: '#3a3a40' })
  b.s.push(put(M('stool', 0.33, paintAll('#ff9b8f')), cx, 0, cz - 0.75))
  owner(c, 'coBa', { x: cx, z: cz - 0.75 }, { seatY: 0.33, activity: 'fan', zone: { x: cx, z: cz + 0.85, halfX: 1.1, halfZ: 0.5 }, extraActions: SHOP_TAPHOA })
  // Crates of water, sacks of rice, a gas bottle, egg trays
  for (let i = 0; i < 3; i++) for (let k = 0; k < 2; k++) b.s.push({ box: [0.42, 0.3, 0.3], at: [HW - 0.35, 0.15 + i * 0.31, -0.6 + k * 0.32], color: '#4f8fd8' })
  for (let i = 0; i < 3; i++) for (let k = 0; k < 2; k++) b.s.push({ box: [0.4, 0.02, 0.28], at: [HW - 0.35, 0.31 + i * 0.31, -0.6 + k * 0.32], color: '#cfe8f0' })
  b.block.push([HW - 0.35, -0.44, 0.24, 0.34])
  for (let i = 0; i < 3; i++) b.s.push({ cyl: [0.2, 0.22, 0.55, 10], at: [HW - 0.4, 0.28, 0.4 + i * 0.45], color: '#e9dcc0' })
  b.s.push({ cyl: [0.16, 0.16, 0.02, 10], at: [HW - 0.4, 0.56, 0.4], color: '#d4473b' })
  b.block.push([HW - 0.4, 0.85, 0.25, 0.7])
  const gas = M('propane', 0.55)
  b.s.push(gas.length ? put(gas, 0.6, 0, BK + 0.75) : { cyl: [0.14, 0.14, 0.5, 10], at: [0.6, 0.25, BK + 0.75], color: '#d4473b' })
  fridge(b, HW - 0.4, BK + 1.2, -Math.PI / 2, 0.7)
  altar(b, 0.0, 2.7, BK + 0.25)
  c.signs.push({ options: sign('TẠP HÓA CÔ LIÊN', 'Có gì bán nấy · Nước mắm · Mì gói', '#c8322b', '#ffe08a', '#f4c04e', 5), width: 2.0, at: [-HW + 0.03, 2.55, -1.0], rotY: Math.PI / 2 })
  c.npcs.push({ def: guest('taphoa', 0, 3), at: { x: cx + 0.4, z: cz + 0.85 }, yaw: Math.PI })
  c.wallFans.push({ at: [HW - 0.06, 2.35, -1.6], rotY: -Math.PI / 2 })
  c.calendars.push({ at: [HW - 0.03, 1.7, -0.6], rotY: -Math.PI / 2 })
  return c
}

function circleK(): Ctx {
  const c = start('circleK', { wall: '#f6f6f6', wallLow: '#e4e4e4', floor: '#f4f4f2', floorAlt: '#e6e8ea', trim: '#d4202a' }, 'small')
  const { b, BK, HW } = c
  // A wall of drinks fridges, lit
  for (let i = 0; i < 5; i++) fridge(b, -HW + 0.6 + i * 0.88, BK + 0.33, 0, 0.84, '#f2f2f2', 2.0)
  b.s.push({ box: [4.5, 0.3, 0.1], at: [-HW + 2.35, 2.25, BK + 0.1], color: '#d4202a' })
  b.s.push({ box: [4.5, 0.08, 0.11], at: [-HW + 2.35, 2.06, BK + 0.1], color: '#f39a2b' })
  // Two aisles of shelves (back to back), crisps, noodles, biscuits, soap
  for (const [x, seed] of [
    [-2.9, 4],
    [-1.0, 6],
  ] as const) {
    shelfUnit(b, x - 0.2, -0.3, 2.2, 1.45, 3, '#f2f2f2', ['packs', 'boxes', 'packs'], seed, -Math.PI / 2, 0.36)
    shelfUnit(b, x + 0.2, -0.3, 2.2, 1.45, 3, '#f2f2f2', ['boxes', 'packs', 'cans'], seed + 1, Math.PI / 2, 0.36)
    b.s.push({ box: [0.5, 0.22, 0.04], at: [x, 1.62, 0.82], color: '#d4202a' })
  }
  // The counter: register, hot dog roller, microwave, coffee machine; chị Hạnh behind it
  const kx = 2.3
  const kz = -0.6
  counter(b, kx, kz, 2.4, 0.62, '#f4f4f4', '#d4202a', 1.0, '#f39a2b')
  b.s.push({ box: [0.32, 0.24, 0.28], at: [kx - 0.5, 1.13, kz - 0.05], color: '#2f2f38' })
  b.glow.push({ box: [0.26, 0.15, 0.01], at: [kx - 0.5, 1.2, kz + 0.1], color: '#7fd0a8' })
  b.s.push({ box: [0.6, 0.12, 0.36], at: [kx + 0.5, 1.07, kz], color: '#b8bcc8' })
  for (let i = 0; i < 5; i++) b.s.push({ cyl: [0.025, 0.025, 0.32, 6], at: [kx + 0.5, 1.15, kz - 0.12 + i * 0.06], rot: [0, 0, Math.PI / 2], color: '#c8653d' })
  b.glow.push({ box: [0.56, 0.02, 0.3], at: [kx + 0.5, 1.13, kz], color: '#ff9b3d' })
  counter(b, kx, BK + 0.35, 2.6, 0.55, '#f4f4f4', '#e4e4e4', 0.92)
  b.s.push({ box: [0.5, 0.3, 0.36], at: [kx - 0.7, 1.07, BK + 0.35], color: '#e8e8ee' })
  b.s.push({ box: [0.3, 0.2, 0.02], at: [kx - 0.75, 1.07, BK + 0.54], color: '#2f2f38' })
  b.s.push({ box: [0.34, 0.5, 0.36], at: [kx + 0.2, 1.17, BK + 0.35], color: '#2f2f38' })
  for (let i = 0; i < 4; i++) b.s.push({ cyl: [0.04, 0.035, 0.1, 8], at: [kx + 0.7 + i * 0.1, 0.97, BK + 0.4], color: '#ffffff' })
  // a wall shelf above the back counter
  for (let r = 0; r < 2; r++) {
    const row: ShapeItem[] = [{ box: [2.2, 0.03, 0.22], at: [0, 0, 0], color: '#d4202a' }]
    goods(row, r ? 'packs' : 'boxes', 2.1, 0.015, 0.18, 9 + r)
    b.s.push(put(row, kx, 1.45 + r * 0.38, BK + 0.13))
  }
  owner(c, 'chiQuanLy', { x: kx - 0.2, z: kz - 0.7 }, { zone: { x: kx - 0.2, z: kz + 0.85, halfX: 1.2, halfZ: 0.5 } })
  // Ice-cream freezer, a high table at the window with two students eating cup noodles
  b.s.push({ box: [1.2, 0.8, 0.6], at: [-0.1, 0.4, 1.7], color: '#ffffff' })
  b.s.push({ box: [1.1, 0.03, 0.5], at: [-0.1, 0.81, 1.7], color: '#cfe8f0' })
  const ice: ShapeItem[] = []
  goods(ice, 'packs', 1.0, 0.45, 0.4, 12, ['#ffffff', '#ff9fb2', '#a9d6ff', '#ffe08a'])
  b.s.push(put(ice, -0.1, 0, 1.7))
  b.block.push([-0.1, 1.7, 0.62, 0.32])
  b.s.push({ box: [0.4, 0.05, 2.4], at: [-HW + 0.25, 1.05, 1.5], color: '#f4f4f4' })
  b.s.push({ box: [0.05, 1.0, 2.3], at: [-HW + 0.06, 0.52, 1.5], color: '#d4202a' })
  const bar: Seat[] = []
  for (let i = 0; i < 3; i++) {
    const z = 0.7 + i * 0.75
    const st = M('iStool', 0.72, { paint: (m, col) => (m === 'Cushin' ? '#d4202a' : col) })
    b.s.push(st.length ? put(st, -HW + 0.8, 0, z) : { cyl: [0.18, 0.15, 0.7, 8], at: [-HW + 0.8, 0.35, z], color: '#d4202a' })
    bar.push({ x: -HW + 0.8, z, yaw: -Math.PI / 2 })
  }
  b.block.push([-HW + 0.4, 1.5, 0.25, 1.2])
  seat(c, bar, [0, 1], 0, 0.72)
  for (const z of [0.7, 1.45]) b.s.push({ cyl: [0.06, 0.05, 0.1, 8], at: [-HW + 0.3, 1.13, z], color: '#ffffff' })
  hangingTubes(c, [-2.0, 0.8], [-1.6, 0.6])
  c.signs.push({ options: { title: 'CIRCLE K', subtitle: 'Cửa hàng tiện lợi · 24/7', background: '#d4202a', border: '#ffffff', color: '#ffffff', accent: '#ffd9a0', aspect: 3.4 }, width: 1.9, at: [kx, 2.55, BK + 0.035] })
  sidePoster(c, 1, -1.8, sign('MÌ LY + TRÀ SỮA', 'Combo 25.000đ · Nóng hổi', '#f39a2b', '#ffffff', '#ffffff', 1.3), 0.9, 1.75)
  c.npcs.push({ def: guest('circleK', 2, 6), at: { x: -1.95, z: -1.0 }, yaw: Math.PI / 2 })
  c.clocks.push({ at: [HW - 0.04, 2.55, -0.4], rotY: -Math.PI / 2, r: 0.2 })
  return c
}

function hoangKim(): Ctx {
  const c = start('hoangKim', { wall: '#e3e6ee', wallLow: '#c9ced8', floor: '#f4f4f6', floorAlt: '#d8dbe4', trim: '#d4a72c' }, 'small')
  const { b, BK, HW } = c
  wainscot(b, c.w, c.d, 0.9, '#2f3440', '#d4a72c')
  // A glossy black desk with a gold lucky cat, a stack of contracts, a laptop, two client chairs
  const dx = -0.6
  const dz = -1.3
  b.s.push({ box: [2.0, 0.06, 0.85], at: [dx, 0.76, dz], color: '#1f1f24' })
  b.s.push({ box: [2.0, 0.72, 0.06], at: [dx, 0.37, dz + 0.4], color: '#2f2f38' })
  for (const sx of [-1, 1]) b.s.push({ box: [0.06, 0.74, 0.8], at: [dx + sx * 0.97, 0.37, dz], color: '#2f2f38' })
  b.s.push({ box: [1.9, 0.03, 0.02], at: [dx, 0.6, dz + 0.44], color: '#d4a72c' })
  b.s.push({ sphere: [0.09, 10, 8], at: [dx + 0.75, 0.88, dz], color: '#f2b632' })
  b.s.push({ sphere: [0.06, 10, 8], at: [dx + 0.75, 1.0, dz], color: '#f2b632' })
  b.s.push({ box: [0.03, 0.08, 0.03], at: [dx + 0.82, 1.04, dz], rot: [0, 0, -0.4], color: '#f2b632' })
  for (let i = 0; i < 6; i++) b.s.push({ box: [0.22, 0.012, 0.3], at: [dx - 0.6, 0.8 + i * 0.013, dz + 0.05], rot: [0, i * 0.06, 0], color: i % 2 ? '#ffffff' : '#f6efe0' })
  b.s.push({ box: [0.36, 0.02, 0.26], at: [dx, 0.8, dz - 0.1], color: '#3a3a40' })
  b.s.push({ box: [0.36, 0.24, 0.02], at: [dx, 0.92, dz - 0.23], rot: [-0.2, 0, 0], color: '#3f4a5c' })
  b.block.push([dx, dz, 1.05, 0.48])
  for (const sx of [-0.5, 0.5]) {
    const ch = M('iChair3', 0.88, { paint: (m, col) => (m === 'Cushin' ? '#1f1f24' : col) })
    b.s.push(put(ch.length ? ch : [{ box: [0.42, 0.05, 0.42], at: [0, 0.45, 0], color: '#1f1f24' }], dx + sx, 0, dz + 1.05, Math.PI))
  }
  b.block.push([dx, dz + 1.05, 0.75, 0.25])
  owner(c, 'anhKhai', { x: dx, z: dz - 0.75 }, { zone: { x: dx, z: dz + 1.6, halfX: 1.2, halfZ: 0.45 } })
  // Linh at the side desk once she has told you (until you leave for Germany)
  b.s.push({ box: [1.2, 0.05, 0.6], at: [2.4, 0.74, -1.9], color: '#f4f4f6' })
  for (const sx of [-1, 1]) b.s.push({ box: [0.05, 0.72, 0.56], at: [2.4 + sx * 0.57, 0.36, -1.9], color: '#c9ced8' })
  b.s.push({ box: [0.22, 0.012, 0.3], at: [2.3, 0.78, -1.8], color: '#ffffff' })
  b.block.push([2.4, -1.9, 0.62, 0.32])
  c.npcs.push({ def: NPCS.hvLinh as NpcDef, at: { x: 2.4, z: -1.3 }, yaw: Math.PI, seatY: 0.45, arms: 0.8, if: { all: [{ flag: 'linh.told' }, { noFlag: 'de.arrived' }] }, zone: { x: 2.4, z: -0.6, halfX: 0.7, halfZ: 0.5 } })
  b.s.push(put(M('iChair3', 0.88, { paint: (m, col) => (m === 'Cushin' ? '#d4a72c' : col) }), 2.4, 0, -1.3, Math.PI))
  // Waiting corner: a black leather sofa, brochures, a water cooler; the money tree
  const so = M('iCouchSmall1', 0.85, { paint: (m) => (m === 'Couch_Blue' ? '#1f1f24' : '#d4a72c') })
  b.s.push(so.length ? put(so, -HW + 0.55, 0, 0.9, Math.PI / 2) : { box: [0.8, 0.45, 1.4], at: [-HW + 0.55, 0.22, 0.9], color: '#1f1f24' })
  b.block.push([-HW + 0.55, 0.9, 0.5, 0.75])
  b.s.push({ box: [0.6, 0.4, 0.6], at: [-HW + 1.55, 0.2, 0.9], color: '#d4a72c' })
  for (let i = 0; i < 3; i++) b.s.push({ box: [0.2, 0.01, 0.28], at: [-HW + 1.5 + i * 0.05, 0.41 + i * 0.012, 0.85 + i * 0.03], rot: [0, i * 0.3, 0], color: ['#ff4d4d', '#ffd23f', '#a9d6ff'][i] })
  b.block.push([-HW + 1.55, 0.9, 0.32, 0.32])
  waterCooler(b, HW - 0.35, -0.4)
  plant(b, -HW + 0.45, BK + 0.45, 1.3, 4)
  // Posters of planes, framed "certificates", a red LED strip
  frame(b, -2.6, 1.8, BK + 0.03, 1.0, 0.7, '#9fd2f0', '#d4a72c')
  b.s.push({ box: [0.5, 0.08, 0.02], at: [-2.6, 1.8, BK + 0.06], rot: [0, 0, 0.15], color: '#ffffff' })
  frame(b, 1.4, 1.75, BK + 0.03, 0.5, 0.65, '#fbf2dc', '#d4a72c')
  frame(b, 2.1, 1.75, BK + 0.03, 0.5, 0.65, '#fbf2dc', '#d4a72c')
  b.glow.push({ box: [c.w - 0.2, 0.04, 0.03], at: [0, c.h - 0.12, BK + 0.06], color: '#ff3b3b' })
  wallSign(c, { title: 'BAO VISA 100%', subtitle: 'CÔNG TY HOÀNG KIM · KHÔNG CẦN B1 · BAY NGAY', background: '#1a1a22', border: '#ffd23f', color: '#ffd23f', accent: '#ff4d4d', aspect: 4.6 }, -0.6, 3.0, c.h - 0.65)
  sidePoster(c, 1, -2.0, sign('LƯƠNG 100 TRIỆU', 'Đăng ký hôm nay · Đặt cọc 70%', '#1a1a22', '#4dff88', '#ff3b3b', 1.4), 0.9, 1.9)
  c.npcs.push({ def: guest('hoangKim', 1, 4), at: { x: -HW + 0.6, z: 0.6 }, yaw: Math.PI / 2, seatY: 0.42 })
  airCon(b, 1.75, 2.7, BK + 0.12)
  c.clocks.push({ at: [2.9, 2.5, BK + 0.04], r: 0.2 })
  return c
}

function pharmacy(): Ctx {
  const c = start('pharmacy', { wall: '#eef6f3', wallLow: '#d6ebe4', floor: '#ffffff', floorAlt: '#e3f1ec', trim: '#2f8c7f' }, 'small')
  const { b, BK, HW } = c
  const PILLS = ['#2f8c7f', '#4f8fd8', '#d4473b', '#f4c04e', '#9b7bd0', '#3fae72']
  shelfUnit(b, -1.9, BK + 0.22, 3.2, 2.4, 6, '#ffffff', 'pills', 1, 0, 0.32, PILLS)
  shelfUnit(b, 1.7, BK + 0.22, 3.0, 2.4, 6, '#ffffff', ['pills', 'bottles', 'pills'], 2, 0, 0.32, PILLS)
  // The green cross, lit; a glass counter of balms and plasters; cô Thảo with her glasses
  b.s.push({ box: [0.05, 0.7, 0.7], at: [HW - 0.03, 2.25, -1.6], color: '#ffffff' })
  b.glow.push({ box: [0.04, 0.15, 0.5], at: [HW - 0.06, 2.25, -1.6], color: '#3fe08a' })
  b.glow.push({ box: [0.04, 0.5, 0.15], at: [HW - 0.06, 2.25, -1.6], color: '#3fe08a' })
  glassCase(b, -0.2, BK + 1.4, 3.6, 0.6, 1.0, '#ffffff', '#2f8c7f', (s, y) => {
    goods(s, 'pills', 3.4, y, 0.45, 5, PILLS)
  })
  owner(c, 'coThuoc', { x: -0.2, z: BK + 0.75 }, { zone: { x: -0.2, z: BK + 2.25, halfX: 1.4, halfZ: 0.5 } })
  b.s.push({ box: [0.3, 0.1, 0.2], at: [0.9, 1.06, BK + 1.38], color: '#e8e8ee' })
  b.s.push({ box: [0.14, 0.012, 0.18], at: [-1.0, 1.02, BK + 1.4], color: '#ffffff' })
  // A health scale, a waiting bench, a poster about washing hands, a plant
  b.s.push({ box: [0.36, 0.06, 0.4], at: [-HW + 0.5, 0.03, 0.6], color: '#e8e8ee' })
  b.s.push({ box: [0.06, 1.1, 0.06], at: [-HW + 0.5, 0.6, 0.42], color: '#c9ced8' })
  b.s.push({ cyl: [0.12, 0.12, 0.04, 12], at: [-HW + 0.5, 1.2, 0.44], rot: [Math.PI / 2, 0, 0], color: '#ffffff' })
  b.block.push([-HW + 0.5, 0.5, 0.22, 0.24])
  const bench = chairRow(c, 1, -0.9, 2, '#2f8c7f')
  seat(c, bench, [0], 0, 0.45)
  plant(b, -HW + 0.4, -1.4, 0.9, 5)
  wallSign(c, { title: 'NHÀ THUỐC', subtitle: 'Dầu gió · Cao dán · Thuốc cảm · Có dược sĩ tư vấn', background: '#ffffff', border: '#2f8c7f', color: '#2f8c7f', accent: '#d4473b', aspect: 6.5 }, -0.1, 3.4, c.h - 0.27)
  sidePoster(c, -1, -0.6, sign('RỬA TAY ĐÚNG CÁCH', '6 bước · 30 giây · Phòng bệnh', '#e3f1ec', '#2f8c7f', '#2f8c7f', 1.2), 0.85, 1.75)
  tube(b, -1.9, 2.55, BK + 0.4)
  tube(b, 1.7, 2.55, BK + 0.4)
  c.clocks.push({ at: [HW - 0.04, 2.45, -0.6], rotY: -Math.PI / 2, r: 0.2 })
  return c
}

function tailor(): Ctx {
  const c = start('tailor', { wall: '#f3e6f0', wallLow: '#e2cde0', floor: '#c49a6c', floorAlt: '#b5895c', trim: '#7a4a8a' }, 'planks')
  const { b, BK, HW } = c
  wainscot(b, c.w, c.d, 0.9, '#7a4a8a', '#f4c04e')
  // Bolts of silk on the back wall, a rack of thread spools
  shelfUnit(b, 1.6, BK + 0.22, 3.4, 2.3, 3, '#8a5a3c', 'fabric', 4, 0, 0.36, ['#d4473b', '#f4c04e', '#7a4a8a', '#ffffff', '#4f8fd8', '#3fae72', '#ff9fb2', '#2f6b6b'])
  for (let r = 0; r < 4; r++) for (let k = 0; k < 8; k++) b.s.push({ cyl: [0.03, 0.03, 0.07, 6], at: [-3.4 + k * 0.12, 1.4 + r * 0.16, BK + 0.06], color: ['#d4473b', '#f4c04e', '#7a4a8a', '#4f8fd8', '#3fae72', '#ff9fb2'][(r + k) % 6] })
  b.s.push({ box: [1.05, 0.7, 0.03], at: [-3.0, 1.62, BK + 0.03], color: '#8a5a3c' })
  // Cutting table with a length of red silk, scissors and a tape; cô Hoa measures
  const tx = -1.1
  const tz = -1.0
  b.s.push({ box: [2.1, 0.06, 0.95], at: [tx, 0.86, tz], color: '#d9b878' })
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.s.push({ box: [0.07, 0.84, 0.07], at: [tx + sx * 0.98, 0.42, tz + sz * 0.42], color: '#8a5a3c' })
  b.s.push({ box: [1.5, 0.012, 0.75], at: [tx + 0.1, 0.895, tz], rot: [0, 0.08, 0], color: '#d4473b' })
  b.s.push({ box: [0.2, 0.01, 0.05], at: [tx - 0.75, 0.9, tz + 0.2], rot: [0, 0.6, 0], color: '#b8bcc8' })
  b.s.push({ torus: [0.07, 0.015, 6, 14], at: [tx + 0.8, 0.9, tz - 0.25], rot: [Math.PI / 2, 0, 0], color: '#f4c04e' })
  b.block.push([tx, tz, 1.08, 0.5])
  owner(c, 'coMay', { x: tx + 0.3, z: tz - 0.8 }, { arms: 0.7, zone: { x: tx, z: tz + 1.0, halfX: 1.2, halfZ: 0.45 } })
  // The sewing machine by the wall, with a lamp
  b.s.push({ box: [1.0, 0.05, 0.55], at: [-HW + 0.6, 0.76, BK + 0.9], color: '#8a5a3c' })
  b.s.push({ box: [0.9, 0.72, 0.04], at: [-HW + 0.6, 0.37, BK + 0.66], color: '#6b4a3a' })
  b.s.push({ box: [0.4, 0.1, 0.18], at: [-HW + 0.6, 0.83, BK + 0.9], color: '#1f1f24' })
  b.s.push({ box: [0.1, 0.28, 0.16], at: [-HW + 0.45, 0.96, BK + 0.9], color: '#1f1f24' })
  b.s.push({ box: [0.34, 0.08, 0.14], at: [-HW + 0.6, 1.12, BK + 0.9], color: '#1f1f24' })
  b.s.push({ box: [0.3, 0.012, 0.012], at: [-HW + 0.62, 1.13, BK + 0.98], color: '#f4c04e' })
  b.block.push([-HW + 0.6, BK + 0.9, 0.52, 0.3])
  // Dress forms in áo dài: long tunic, flowing panels, a stand
  const forms: [number, number, string][] = [
    [HW - 0.5, -2.2, '#d4473b'],
    [HW - 0.5, -1.2, '#f4c04e'],
    [HW - 0.5, -0.2, '#4f8fd8'],
    [-HW + 0.6, 1.4, '#ffffff'],
  ]
  for (const [x, z, col] of forms) {
    b.s.push({ cyl: [0.18, 0.22, 0.04, 10], at: [x, 0.02, z], color: '#5d6170' })
    b.s.push({ cyl: [0.025, 0.025, 0.85, 6], at: [x, 0.45, z], color: '#5d6170' })
    b.s.push({ cyl: [0.15, 0.19, 0.55, 12], at: [x, 1.15, z], color: col })
    b.s.push({ cyl: [0.13, 0.15, 0.08, 12], at: [x, 1.46, z], color: col })
    b.s.push({ box: [0.28, 0.75, 0.02], at: [x, 0.6, z + 0.12], rot: [0.05, 0, 0], color: col })
    b.s.push({ box: [0.28, 0.75, 0.02], at: [x, 0.6, z - 0.12], rot: [-0.05, 0, 0], color: col })
    b.s.push({ cyl: [0.05, 0.05, 0.12, 8], at: [x, 1.56, z], color: '#f6e7c4' })
    b.block.push([x, z, 0.22, 0.22])
  }
  // Fitting corner: a tall mirror and a curtain on a rail
  b.s.push({ box: [0.06, 1.8, 0.8], at: [-HW + 0.05, 1.1, -0.2], color: '#8a5a3c' })
  b.s.push({ box: [0.07, 1.65, 0.68], at: [-HW + 0.06, 1.1, -0.2], color: '#dff0f8' })
  b.s.push({ cyl: [0.015, 0.015, 1.2, 5], at: [-HW + 1.2, 2.25, 0.4], rot: [Math.PI / 2, 0, 0], color: '#b8bcc8' })
  for (let i = 0; i < 6; i++) b.s.push({ box: [0.03, 1.9, 0.2], at: [-HW + 1.2, 1.28, -0.12 + i * 0.2], rot: [0, i % 2 ? 0.3 : -0.3, 0], color: '#7a4a8a' })
  b.block.push([-HW + 1.2, 0.4, 0.15, 0.6])
  frame(b, -0.6, 1.95, BK + 0.03, 0.55, 0.75, '#ffd1e0', '#f4c04e')
  frame(b, 0.1, 1.95, BK + 0.03, 0.55, 0.75, '#cfe0ff', '#f4c04e')
  wallSign(c, { title: 'MAY ĐO ÁO DÀI', subtitle: 'Cô Hoa · Nhận may lấy ngay · Lụa Hà Đông', background: '#7a4a8a', border: '#f4c04e', color: '#ffe08a', accent: '#ffffff', aspect: 6.5 }, -0.6, 3.4, c.h - 0.4)
  c.npcs.push({ def: guest('tailor', 0, 8), at: { x: 0.9, z: 0.4 }, yaw: Math.PI * 0.9 })
  pendant(b, tx, tz, c.h, 0.9, '#7a4a8a', '#ffe7b0')
  pendant(b, 1.6, -1.6, c.h, 0.9, '#7a4a8a', '#ffe7b0')
  c.wallFans.push({ at: [HW - 0.06, 2.4, -0.7], rotY: -Math.PI / 2 })
  return c
}

const BOOKS_READ: SpotAction[] = [{ id: 'read', labelKey: 'action.readBook', icon: 'book', action: 'place.readBook', primary: true }]
const BOOK_COLORS = ['#8a3b1f', '#2f5fa8', '#3f7d5c', '#c49a6c', '#7a4a8a', '#d9b878', '#5b3a2a', '#a85a3a', '#2f3a4d', '#e8dcc0']

function oldBooks(): Ctx {
  const c = start('oldBooks', { wall: '#e9dcc4', wallLow: '#cdb894', floor: '#8a6248', floorAlt: '#7a5640', trim: '#5b3a2a' }, 'planks')
  const { b, BK, HW } = c
  // Floor-to-ceiling shelves of old books, a ladder, more shelves on the left wall
  shelfUnit(b, -2.4, BK + 0.22, 2.4, 2.5, 6, '#5b3a2a', 'books', 1, 0, 0.32, BOOK_COLORS)
  shelfUnit(b, 0.1, BK + 0.22, 2.4, 2.5, 6, '#5b3a2a', 'books', 2, 0, 0.32, BOOK_COLORS)
  shelfUnit(b, -HW + 0.2, -1.0, 1.9, 2.3, 6, '#5b3a2a', 'books', 3, Math.PI / 2, 0.32, BOOK_COLORS)
  for (const sx of [-0.25, 0.25]) b.s.push({ box: [0.05, 2.9, 0.05], at: [1.3 + sx, 1.4, BK + 0.6], rot: [0.2, 0, 0], color: '#8a5a3c' })
  for (let i = 0; i < 7; i++) b.s.push({ box: [0.5, 0.04, 0.05], at: [1.3, 0.3 + i * 0.38, BK + 0.54 - i * 0.075 + 0.25], color: '#8a5a3c' })
  // Piles on the floor, a cat asleep on one
  const piles: [number, number, number][] = [
    [-1.0, -1.6, 5],
    [-0.4, -1.8, 3],
    [1.9, 0.6, 6],
    [-1.6, 1.4, 4],
  ]
  piles.forEach(([x, z, n], p) => {
    for (let i = 0; i < n; i++) b.s.push({ box: [0.34 - (i % 2) * 0.04, 0.07, 0.26], at: [x, 0.04 + i * 0.075, z], rot: [0, (i * 0.37 + p) % 0.6, 0], color: BOOK_COLORS[(i + p * 3) % BOOK_COLORS.length] })
    b.block.push([x, z, 0.2, 0.17])
  })
  b.s.push({ sphere: [0.13, 8, 6], at: [-1.0, 0.47, -1.6], scale: [1.4, 0.7, 1], color: '#e8a243' })
  b.s.push({ sphere: [0.07, 8, 6], at: [-0.85, 0.5, -1.55], color: '#e8a243' })
  // Chú Hưng's desk: an old radio, a tea pot, his reading glasses
  const dx = HW - 1.2
  const dz = -1.3
  b.s.push({ box: [1.3, 0.06, 0.7], at: [dx, 0.76, dz], color: '#6b4a3a' })
  for (const sx of [-1, 1]) b.s.push({ box: [0.06, 0.74, 0.64], at: [dx + sx * 0.6, 0.37, dz], color: '#5b3a2a' })
  b.s.push({ box: [0.4, 0.22, 0.16], at: [dx + 0.35, 0.9, dz - 0.15], color: '#8a3b1f' })
  b.s.push({ cyl: [0.06, 0.06, 0.01, 10], at: [dx + 0.27, 0.9, dz - 0.06], rot: [Math.PI / 2, 0, 0], color: '#d9b878' })
  b.s.push({ sphere: [0.08, 8, 6], at: [dx - 0.35, 0.86, dz], scale: [1, 0.8, 1], color: '#f4f1ea' })
  for (let i = 0; i < 3; i++) b.s.push({ cyl: [0.03, 0.025, 0.04, 6], at: [dx - 0.15 + i * 0.08, 0.81, dz + 0.15], color: '#f4f1ea' })
  b.block.push([dx, dz, 0.68, 0.38])
  owner(c, 'chuSach', { x: dx, z: dz - 0.65 }, { seatY: 0.46, arms: 0.6, zone: { x: dx, z: dz + 0.9, halfX: 0.9, halfZ: 0.45 } })
  b.s.push(put(M('iChair4', 0.88), dx, 0, dz - 0.65))
  // The reading nook: armchair, lamp, round rug — sit and read a while (place.readBook)
  b.s.push({ cyl: [1.05, 1.05, 0.014, 28], at: [-1.9, 0.047, 1.5], color: '#d9b878' })
  b.s.push({ cyl: [0.92, 0.92, 0.016, 28], at: [-1.9, 0.049, 1.5], color: '#8a3b1f' })
  b.s.push({ cyl: [0.5, 0.5, 0.018, 24], at: [-1.9, 0.05, 1.5], color: '#b5562f' })
  const ac = M('iCouchSmall2', 0.78, { paint: (m) => (m === 'Couch_Beige' ? '#3f7d5c' : '#2f6b4f') })
  b.s.push(ac.length ? put(ac, -2.6, 0, 1.0, 0.6) : { box: [1.1, 0.45, 0.9], at: [-2.6, 0.22, 1.0], color: '#3f7d5c' })
  b.block.push([-2.6, 1.0, 0.6, 0.55])
  const lamp = M('iLightFloor1', 1.5, { paint: (m, col) => (m === 'Light' ? '#fff1c8' : col) })
  b.s.push(lamp.length ? put(lamp, -3.3, 0, 0.4) : { cyl: [0.02, 0.02, 1.5, 5], at: [-3.3, 0.75, 0.4], color: '#5d6170' })
  b.glow.push({ sphere: [0.1, 8, 6], at: [-3.3, 1.38, 0.4], color: '#ffe7b0' })
  c.spots.push({ id: 'vn-books', name: { vi: 'Góc đọc sách', en: 'Reading corner', de: 'Leseecke' }, zone: { x: -1.9, z: 1.6, halfX: 0.8, halfZ: 0.7 }, actions: BOOKS_READ })
  wallSign(c, { title: 'SÁCH CŨ CHÚ HƯNG', subtitle: 'Mua bán · Trao đổi · Sách ngoại văn', background: '#3a2a22', border: '#d9b878', color: '#ffe7b0', accent: '#d9b878', aspect: 5.5 }, -1.1, 3.0, c.h - 0.3)
  frame(b, HW - 0.03, 1.9, -0.2, 0.7, 0.9, '#c9b89a', '#5b3a2a', -Math.PI / 2)
  pendant(b, -1.2, -1.0, c.h, 1.0, '#3a2a22', '#ffd890', 0.18)
  pendant(b, dx, dz, c.h, 1.0, '#3a2a22', '#ffd890', 0.18)
  c.npcs.push({ def: guest('oldBooks', 0, 5), at: { x: -0.3, z: -2.2 }, yaw: Math.PI })
  c.clocks.push({ at: [HW - 0.04, 2.5, -2.0], rotY: -Math.PI / 2, r: 0.2 })
  return c
}

// --- The visa offices ------------------------------------------------------------------------------------------------

function photo(): Ctx {
  const c = start('photo', { wall: '#f4f1ec', wallLow: '#e2ddd4', floor: '#e8e4dc', floorAlt: '#d6d0c4', trim: '#c8322b' }, 'small')
  const { b, BK } = c
  // The studio: a roll of white backdrop paper, the posing stool, two softboxes, the camera on its tripod
  const sx = -1.8
  for (const dx of [-1.25, 1.25]) b.s.push({ cyl: [0.02, 0.025, 2.6, 6], at: [sx + dx, 1.3, BK + 0.3], color: '#3a3a40' })
  b.s.push({ cyl: [0.07, 0.07, 2.4, 12], at: [sx, 2.55, BK + 0.3], rot: [0, 0, Math.PI / 2], color: '#f8f8f6' })
  b.s.push({ box: [2.3, 2.5, 0.02], at: [sx, 1.3, BK + 0.36], color: '#fbfbfa' })
  b.s.push({ box: [2.3, 0.02, 1.4], at: [sx, 0.05, BK + 1.05], color: '#fbfbfa' })
  b.block.push([sx, BK + 0.32, 1.3, 0.12])
  const stool = M('iStool', 0.55)
  b.s.push(stool.length ? put(stool, sx, 0, BK + 1.3) : { cyl: [0.18, 0.15, 0.5, 8], at: [sx, 0.25, BK + 1.3], color: '#3a3a40' })
  for (const [dx, rot] of [
    [-1.5, 0.6],
    [1.4, -0.6],
  ] as const) {
    b.s.push({ cyl: [0.015, 0.015, 1.6, 4], at: [sx + dx, 0.8, BK + 1.8], color: '#3a3a40' })
    b.s.push(put([{ box: [0.6, 0.6, 0.3], at: [0, 0, 0], color: '#2f2f38' }], sx + dx, 1.75, BK + 1.8, rot))
    b.glow.push(put([{ box: [0.54, 0.54, 0.02], at: [0, 0, -0.16], color: '#f6fbff' }], sx + dx, 1.75, BK + 1.8, rot + Math.PI))
    b.block.push([sx + dx, BK + 1.8, 0.2, 0.2])
  }
  const tz = 0.6
  for (const a of [0, 2.1, 4.2]) b.s.push({ cyl: [0.012, 0.012, 1.1, 4], at: [sx + Math.cos(a) * 0.14, 0.5, tz + Math.sin(a) * 0.14], rot: [Math.cos(a) * 0.18, 0, Math.sin(a) * 0.18], color: '#3a3a40' })
  b.s.push({ box: [0.24, 0.17, 0.18], at: [sx, 1.12, tz], color: '#2a2a30' })
  b.s.push({ cyl: [0.065, 0.075, 0.14, 10], at: [sx, 1.12, tz - 0.14], rot: [Math.PI / 2, 0, 0], color: '#4a4a55' })
  b.block.push([sx, tz, 0.22, 0.22])
  owner(c, 'chuAnh', { x: sx + 0.55, z: tz + 0.35 }, { yaw: -2.6, zone: { x: sx + 0.9, z: tz + 0.9, halfX: 0.8, halfZ: 0.5 } })
  // The counter on the right: printer, a laptop, sample ID photos on the wall behind
  counter(b, 2.2, BK + 1.2, 2.2, 0.6, '#f4f1ec', '#c8322b', 0.95)
  b.s.push({ box: [0.45, 0.22, 0.35], at: [2.8, 1.06, BK + 1.15], color: '#e8e8ee' })
  b.s.push({ box: [0.34, 0.02, 0.24], at: [1.8, 0.96, BK + 1.2], color: '#2f2f38' })
  b.s.push({ box: [0.34, 0.22, 0.02], at: [1.8, 1.07, BK + 1.08], rot: [-0.25, 0, 0], color: '#3f4a5c' })
  const FACES = ['#f2cfb3', '#e8bd9a', '#f6d6c0', '#eec39f', '#e3b08c', '#f7d6bd']
  for (let i = 0; i < 12; i++) {
    const x = 1.25 + (i % 6) * 0.38
    const y = 1.6 + Math.floor(i / 6) * 0.48
    b.s.push({ box: [0.3, 0.4, 0.02], at: [x, y, BK + 0.03], color: '#ffffff' })
    b.s.push({ box: [0.24, 0.3, 0.02], at: [x, y + 0.02, BK + 0.04], color: i % 3 ? '#e8f0fa' : '#ffffff' })
    b.s.push({ sphere: [0.06, 8, 6], at: [x, y + 0.05, BK + 0.055], color: FACES[i % FACES.length] })
    b.s.push({ box: [0.16, 0.08, 0.02], at: [x, y - 0.07, BK + 0.05], color: ['#2f3a4d', '#ffffff', '#c8322b'][i % 3] })
  }
  const wait = chairRow(c, 1, -0.2, 2, '#c8322b')
  seat(c, wait, [1], 0, 0.45)
  wallSign(c, { title: 'TIỆM ẢNH HÙNG', subtitle: 'Ảnh thẻ · Ảnh visa 3,5×4,5 nền trắng · Lấy ngay 15 phút', background: '#ffffff', border: '#c8322b', color: '#c8322b', accent: '#2f3a4d', aspect: 6 }, 2.2, 2.6, c.h - 0.35)
  sidePoster(c, -1, -0.3, sign('ẢNH VISA ĐỨC', 'Nền trắng · Không đeo kính · Mặt 70–80%', '#2f3a4d', '#ffffff', '#c8322b', 1.2), 0.9, 1.75)
  tube(b, 2.2, 2.4, BK + 0.06)
  c.clocks.push({ at: [0.4, 2.6, BK + 0.04], r: 0.2 })
  return c
}

function notary(): Ctx {
  const c = start('notary', { wall: '#efe6d6', wallLow: '#ddcfb6', floor: '#e9e2d4', floorAlt: '#d2c3a8', trim: '#8a2a24' }, 'small')
  const { b, BK, HW } = c
  wainscot(b, c.w, c.d, 1.0, '#8a5a3a', '#d9b878')
  // Cabinets of binders, the long wooden counter with a glass partition and two windows
  shelfUnit(b, -1.6, BK + 0.22, 3.6, 2.3, 5, '#8a5a3a', 'binders', 1, 0, 0.32, ['#2f5fa8', '#c8322b', '#3f7d5c', '#d4a72c', '#ffffff'])
  shelfUnit(b, 2.0, BK + 0.22, 2.4, 2.3, 5, '#8a5a3a', ['binders', 'boxes'], 2, 0, 0.32, ['#2f5fa8', '#c8322b', '#d4a72c', '#e9dfc8'])
  const cz = BK + 1.55
  counter(b, -0.4, cz, 5.2, 0.6, '#b98a5c', '#8a5a3a', 1.0, '#d9b878')
  for (let i = 0; i <= 4; i++) b.s.push({ box: [0.04, 0.6, 0.04], at: [-3.0 + i * 1.3, 1.3, cz], color: '#6b4a3a' })
  b.s.push({ box: [5.2, 0.5, 0.015], at: [-0.4, 1.32, cz], color: '#d7eef4' })
  b.s.push({ box: [5.24, 0.04, 0.06], at: [-0.4, 1.6, cz], color: '#6b4a3a' })
  for (const x of [-1.6, 0.8]) {
    b.s.push({ box: [0.5, 0.12, 0.02], at: [x, 1.0, cz + 0.02], color: '#e9eef2' })
    b.s.push({ cyl: [0.05, 0.06, 0.1, 8], at: [x + 0.4, 1.06, cz - 0.1], color: '#c8322b' })
    for (let i = 0; i < 3; i++) b.s.push({ box: [0.3, 0.03, 0.22], at: [x - 0.35, 1.03 + i * 0.03, cz - 0.08], color: i % 2 ? '#f7f2e6' : '#e9dfc8' })
  }
  owner(c, 'coCongChung', { x: -1.6, z: cz - 0.65 }, { seatY: 0.46, arms: 0.8, zone: { x: -1.6, z: cz + 0.85, halfX: 0.9, halfZ: 0.5 } })
  c.npcs.push({ def: helper('notary', 'Anh Toàn', { skin: '#eec39f', hair: '#1f1a1a', hairStyle: 'short', shirt: '#ffffff', shorts: '#2f3440', shoe: '#2a2626', bag: null, accessory: 'glasses', top: 'long', bottom: 'pants', neck: 'tie', neckColor: '#8a2a24', shoeType: 'loafer' }), at: { x: 0.8, z: cz - 0.65 }, seatY: 0.46, arms: 0.8 })
  for (const x of [-1.6, 0.8]) b.s.push(put(M('iChair2', 0.88), x, 0, cz - 0.65))
  queueDisplay(b, -0.4, 2.1, cz)
  // Ticket machine, waiting chairs, a notice board, a water cooler
  b.s.push({ box: [0.4, 1.2, 0.35], at: [HW - 0.4, 0.6, -0.6], color: '#2f8c7f' })
  b.s.push({ box: [0.3, 0.2, 0.02], at: [HW - 0.4, 1.0, -0.42], color: '#cfe8f0' })
  b.s.push({ box: [0.08, 0.02, 0.04], at: [HW - 0.4, 0.8, -0.41], color: '#ffffff' })
  b.block.push([HW - 0.4, -0.6, 0.22, 0.2])
  const wait = chairRow(c, -1, -0.8, 4, '#3f5f8f')
  seat(c, wait, [0, 2], 0, 0.45)
  waterCooler(b, HW - 0.35, 0.35)
  wallSign(c, { title: 'VĂN PHÒNG CÔNG CHỨNG', subtitle: 'Dịch thuật · Sao y · Chứng thực chữ ký', background: '#8a2a24', border: '#f4c04e', color: '#ffe08a', accent: '#ffffff', aspect: 6.5 }, -0.4, 3.6, c.h - 0.4)
  sidePoster(c, 1, -1.6, sign('THÔNG BÁO', 'Mang bản gốc khi công chứng · Lấy số thứ tự', '#fffaf0', '#8a2a24', '#8a2a24', 1.2), 0.8, 1.7)
  hangingTubes(c, [-1.6, 1.6], [0.2])
  c.clocks.push({ at: [2.4, 2.65, BK + 0.04], r: 0.22 })
  c.calendars.push({ at: [-HW + 0.03, 1.75, -1.5], rotY: Math.PI / 2 })
  return c
}

function bank(): Ctx {
  const c = start('bank', { wall: '#e7efee', wallLow: '#cfe0dd', floor: '#f2f2ee', floorAlt: '#dfe6e4', trim: '#2f8c7f' }, 'small')
  const { b, BK, HW } = c
  wainscot(b, c.w, c.d, 1.1, '#2f8c7f', '#ffffff')
  // Teller counter with three windows behind glass; anh Quân at the first
  const cz = BK + 1.6
  counter(b, -0.9, cz, 5.4, 0.62, '#e9eef2', '#2f8c7f', 1.0, '#ffe08a')
  b.s.push({ box: [5.4, 0.7, 0.015], at: [-0.9, 1.4, cz], color: '#d7eef4' })
  for (let i = 0; i <= 3; i++) b.s.push({ box: [0.04, 0.72, 0.05], at: [-3.6 + i * 1.8, 1.4, cz], color: '#e9eef2' })
  b.s.push({ box: [5.44, 0.05, 0.08], at: [-0.9, 1.76, cz], color: '#e9eef2' })
  const windows = [-2.7, -0.9, 0.9]
  windows.forEach((x, i) => {
    b.s.push({ box: [0.24, 0.16, 0.04], at: [x, 1.9, cz], color: '#2f2f38' })
    b.glow.push({ box: [0.18, 0.1, 0.01], at: [x, 1.9, cz + 0.025], color: '#ff6a4d' })
    b.s.push({ box: [0.34, 0.02, 0.24], at: [x - 0.2, 1.0, cz - 0.1], color: '#2f2f38' })
    b.s.push({ box: [0.34, 0.24, 0.02], at: [x - 0.2, 1.13, cz - 0.24], rot: [-0.2, 0, 0], color: '#3f4a5c' })
    if (i < 2) b.s.push(put(M('iChair2', 0.88, { paint: (m, col) => (m === 'Cushin' ? '#2f8c7f' : col) }), x, 0, cz - 0.7))
  })
  owner(c, 'anhNganHang', { x: -2.7, z: cz - 0.7 }, { seatY: 0.46, arms: 0.8, zone: { x: -2.7, z: cz + 0.85, halfX: 0.8, halfZ: 0.5 } })
  c.npcs.push({ def: helper('bank', 'Chị Mai Hương', { skin: '#f6d6c0', hair: '#2b2222', hairStyle: 'bun', shirt: '#ffffff', shorts: '#2f8c7f', shoe: '#2a2626', bag: null, accessory: null, top: 'long', bottom: 'skirt', neck: 'scarf', neckColor: '#2f8c7f', lashes: true }), at: { x: -0.9, z: cz - 0.7 }, seatY: 0.46, arms: 0.8 })
  queueDisplay(b, 2.6, 2.3, BK + 0.06)
  // Exchange-rate board, the ATM, velvet ropes, a sofa for the queue, plants
  c.signs.push({ options: sign('TỶ GIÁ HÔM NAY', 'EUR 27.350 · USD 25.400 · JPY 168 · AUD 16.700', '#1f3a36', '#ffe08a', '#2f8c7f', 2.2), width: 1.6, at: [2.6, 1.55, BK + 0.035] })
  b.s.push({ box: [0.7, 1.7, 0.5], at: [HW - 0.45, 0.85, BK + 1.2], color: '#2f8c7f' })
  b.glow.push({ box: [0.44, 0.32, 0.02], at: [HW - 0.45, 1.28, BK + 1.46], color: '#bfe6ff' })
  b.s.push({ box: [0.36, 0.08, 0.06], at: [HW - 0.45, 0.98, BK + 1.47], color: '#2a2a30' })
  b.block.push([HW - 0.45, BK + 1.2, 0.38, 0.28])
  for (let i = 0; i < 4; i++) {
    const x = -2.8 + i * 1.2
    b.s.push({ cyl: [0.1, 0.12, 0.04, 10], at: [x, 0.02, 0.2], color: '#d4a72c' })
    b.s.push({ cyl: [0.025, 0.025, 0.9, 6], at: [x, 0.45, 0.2], color: '#d4a72c' })
    b.s.push({ sphere: [0.045, 8, 6], at: [x, 0.92, 0.2], color: '#d4a72c' })
    if (i < 3) b.s.push({ cyl: [0.02, 0.02, 1.2, 5], at: [x + 0.6, 0.82, 0.2], rot: [0, 0, Math.PI / 2], color: '#8a2a24' })
  }
  b.block.push([-1.0, 0.2, 1.9, 0.08])
  const so = M('iCouchMedium1', 0.8, { paint: (m) => (m === 'Couch_Blue' ? '#2f8c7f' : '#2f2f38') })
  b.s.push(so.length ? put(so, -2.4, 0, 2.6, Math.PI, 0.7) : { box: [1.6, 0.45, 0.7], at: [-2.4, 0.22, 2.6], color: '#2f8c7f' })
  b.block.push([-2.4, 2.6, 0.85, 0.4])
  c.npcs.push({ def: guest('bank', 0, 0), at: { x: -0.9, z: cz + 0.75 }, yaw: Math.PI })
  c.npcs.push({ def: guest('bank', 1, 7), at: { x: -2.2, z: 2.45 }, yaw: Math.PI, seatY: 0.42 })
  plant(b, -HW + 0.45, 1.4, 1.2, 6)
  plant(b, HW - 0.45, 0.4, 1.1, 7)
  wallSign(c, { title: 'NGÂN HÀNG PHỐ CỔ', subtitle: 'Tiết kiệm · Ngoại tệ · Chứng minh tài chính du học', background: '#2f8c7f', border: '#ffffff', color: '#ffffff', accent: '#ffe08a', aspect: 6.5 }, -0.9, 3.8, c.h - 0.38)
  hangingTubes(c, [-2.2, 0.8], [0.6])
  c.clocks.push({ at: [-HW + 0.04, 2.55, -0.4], rotY: Math.PI / 2, r: 0.22 })
  return c
}

function aps(): Ctx {
  const c = start('aps', { wall: '#e8edf4', wallLow: '#ccd6e4', floor: '#d8c8a8', floorAlt: '#cbb994', trim: '#2f3a4d' }, 'planks')
  const { b, BK, HW } = c
  // Black-red-gold band, a desk with the interview chair, Frau Schneider's files
  ;['#1e1e22', '#c8322b', '#f4c04e'].forEach((col, i) => b.s.push({ box: [c.w, 0.08, 0.02], at: [0, c.h - 0.2 - i * 0.08, BK + 0.02], color: col }))
  const dz = -1.3
  b.s.push({ box: [1.8, 0.06, 0.85], at: [0, 0.76, dz], color: '#c9b79c' })
  for (const sx of [-1, 1]) b.s.push({ box: [0.06, 0.74, 0.8], at: [sx * 0.87, 0.37, dz], color: '#8a7a64' })
  b.s.push({ box: [0.5, 0.32, 0.03], at: [0.35, 1.0, dz - 0.28], color: '#2f2f38' })
  b.glow.push({ box: [0.44, 0.26, 0.01], at: [0.35, 1.0, dz - 0.26], color: '#cfe0ff' })
  b.s.push({ box: [0.04, 0.12, 0.04], at: [0.35, 0.82, dz - 0.3], color: '#2f2f38' })
  for (let i = 0; i < 4; i++) b.s.push({ box: [0.26, 0.04, 0.34], at: [-0.5, 0.8 + i * 0.04, dz + 0.05], rot: [0, i * 0.05, 0], color: ['#2f5fa8', '#ffffff', '#c8322b', '#f6efe0'][i] })
  ;['#1e1e22', '#c8322b', '#f4c04e'].forEach((col, i) => b.s.push({ box: [0.12, 0.025, 0.01], at: [-0.2, 0.92 - i * 0.025, dz - 0.2], color: col }))
  b.s.push({ cyl: [0.004, 0.004, 0.18, 3], at: [-0.26, 0.88, dz - 0.2], color: '#5d6170' })
  b.block.push([0, dz, 0.95, 0.46])
  owner(c, 'coAps', { x: 0, z: dz - 0.7 }, { seatY: 0.46, arms: 0.6, zone: { x: 0, z: dz + 1.4, halfX: 1.0, halfZ: 0.5 } })
  b.s.push(put(M('iChair2', 0.88, { paint: (m, col) => (m === 'Cushin' ? '#2f3a4d' : col) }), 0, 0, dz - 0.7))
  for (const sx of [-0.45, 0.45]) b.s.push(put(M('iChair1', 0.86, { paint: () => '#3f5f8f' }), sx, 0, dz + 0.85, Math.PI))
  b.block.push([0, dz + 0.85, 0.7, 0.24])
  // Binders, a framed certificate, a poster about Germany, a coffee machine, plants
  shelfUnit(b, HW - 1.2, BK + 0.22, 1.9, 2.0, 4, '#ffffff', 'binders', 6, 0, 0.32, ['#2f3a4d', '#2f5fa8', '#d4a72c', '#c8322b'])
  frame(b, -1.8, 1.8, BK + 0.03, 0.7, 0.5, '#fbf2dc', '#d4a72c')
  frame(b, -2.8, 1.8, BK + 0.03, 0.5, 0.5, '#fbf2dc', '#d4a72c')
  c.signs.push({ options: sign('STUDIEREN IN DEUTSCHLAND', 'Học tập tại Đức · APS – Bước đầu tiên', '#2f3a4d', '#ffffff', '#d4a72c', 1.4), width: 1.0, at: [-HW + 0.03, 1.75, -1.4], rotY: Math.PI / 2, flat: true })
  b.s.push({ box: [0.5, 0.9, 0.45], at: [-HW + 0.4, 0.45, BK + 0.4], color: '#e8e8ee' })
  b.s.push({ box: [0.34, 0.42, 0.3], at: [-HW + 0.4, 1.11, BK + 0.4], color: '#2f2f38' })
  for (let i = 0; i < 3; i++) b.s.push({ cyl: [0.04, 0.035, 0.08, 8], at: [-HW + 0.3 + i * 0.1, 0.94, BK + 0.6], color: '#ffffff' })
  b.block.push([-HW + 0.4, BK + 0.4, 0.28, 0.25])
  const wait = chairRow(c, -1, 0.2, 3, '#3f5f8f')
  seat(c, wait, [1], 0, 0.45)
  plant(b, HW - 0.45, -0.2, 1.1, 8)
  wallSign(c, { title: 'APS · AKADEMISCHE PRÜFSTELLE', subtitle: 'Thẩm tra học thuật du học Đức', background: '#2f3a4d', border: '#d4a72c', color: '#ffffff', accent: '#d4a72c', aspect: 6.5 }, -0.5, 3.4, c.h - 0.7)
  hangingTubes(c, [-1.4, 1.4], [-0.6])
  c.clocks.push({ at: [HW - 0.04, 2.5, -0.9], rotY: -Math.PI / 2, r: 0.2 })
  return c
}

// --- Hàng Khay -------------------------------------------------------------------------------------------------------

const GOLD = '#f2b632'
const GOLD_HI = '#ffe08a'
const LACQUER = '#9a1f22'

function goldBoard(day: number): SignOptions {
  const q = goldQuote(day)
  return { title: 'GIÁ VÀNG HÔM NAY', subtitle: `Bán ra ${vnd(q.sell)} · Mua vào ${vnd(q.buy)} / chỉ`, background: '#1f1a17', color: '#ffd76a', border: '#c8322b', accent: '#ff6f61', aspect: 2.6 }
}

/** Gold inside a glass case: bars in a row, rings on stands, a chain on a bust. */
const goldGoods = (w: number) => (s: ShapeItem[], y: number) => {
  s.push({ box: [w - 0.1, 0.02, 0.4], at: [0, y, 0], color: '#7a1020' })
  for (let i = 0; i < Math.floor((w - 0.5) / 0.14); i++) s.push({ box: [0.09, 0.025, 0.14], at: [-w / 2 + 0.25 + i * 0.14, y + 0.025, -0.08], color: i % 2 ? GOLD : GOLD_HI })
  for (let i = 0; i < 4; i++) {
    s.push({ cyl: [0.04, 0.05, 0.06, 8], at: [-0.4 + i * 0.26, y + 0.04, 0.1], color: '#2a2a2a' })
    s.push({ torus: [0.035, 0.01, 6, 14], at: [-0.4 + i * 0.26, y + 0.1, 0.1], rot: [Math.PI / 2 - 0.4, 0, 0], color: GOLD })
  }
}

function goldShop(): Ctx {
  const c = start('goldShop', { wall: '#f6e7c4', wallLow: '#e8d3a0', floor: '#fbf6ea', floorAlt: '#e9dcc0', trim: LACQUER }, 'small')
  const { b, BK, HW } = c
  // A red lacquer back wall with gold trims
  b.s.push({ box: [c.w - 0.4, 2.3, 0.02], at: [0, 1.45, BK + 0.012], color: LACQUER })
  for (const y of [0.32, 2.58]) b.s.push({ box: [c.w - 0.4, 0.05, 0.03], at: [0, y, BK + 0.025], color: GOLD })
  // Glass cases in a U, chú Năng behind the middle one
  glassCase(b, 0, -0.9, 3.0, 0.6, 1.0, LACQUER, '#d9dde4', goldGoods(3.0))
  glassCase(b, -2.35, -1.6, 1.4, 0.6, 1.0, LACQUER, '#d9dde4', goldGoods(1.4))
  glassCase(b, 2.35, -1.6, 1.4, 0.6, 1.0, LACQUER, '#d9dde4', goldGoods(1.4))
  b.s.push({ box: [0.18, 0.05, 0.14], at: [1.2, 1.05, -0.85], color: '#e8e4dc' })
  b.s.push({ cyl: [0.06, 0.06, 0.01, 12], at: [1.2, 1.08, -0.85], color: '#b8bcc8' })
  owner(c, 'chuNang', { x: 0, z: -1.65 }, { zone: { x: 0, z: -0.15, halfX: 1.3, halfZ: 0.45 } })
  // The day's price board, a safe, the altar with a lucky cat, lanterns, a mirror
  c.signs.push({ options: goldBoard, width: 1.6, at: [-1.9, 1.55, BK + 0.04] })
  b.s.push({ box: [0.8, 1.0, 0.6], at: [HW - 0.7, 0.5, BK + 0.4], color: '#3a3f4e' })
  b.s.push({ cyl: [0.1, 0.1, 0.03, 12], at: [HW - 0.7, 0.6, BK + 0.71], rot: [Math.PI / 2, 0, 0], color: GOLD })
  b.s.push({ box: [0.05, 0.2, 0.04], at: [HW - 0.45, 0.6, BK + 0.71], color: GOLD })
  b.block.push([HW - 0.7, BK + 0.4, 0.42, 0.32])
  altar(b, 3.0, 1.75, BK + 0.2)
  b.s.push({ sphere: [0.09, 10, 8], at: [-HW + 0.8, 1.05, -1.55], color: GOLD_HI })
  b.s.push({ sphere: [0.06, 10, 8], at: [-HW + 0.8, 1.17, -1.55], color: GOLD_HI })
  for (const x of [-2.4, 0, 2.4]) lantern(b, x, -0.4, c.h, 0.5)
  b.s.push({ box: [0.06, 1.6, 0.7], at: [HW - 0.05, 1.2, -0.3], color: GOLD })
  b.s.push({ box: [0.07, 1.45, 0.58], at: [HW - 0.06, 1.2, -0.3], color: '#dff0f8' })
  plant(b, -HW + 0.45, 1.6, 1.0, 9)
  wallSign(c, CITY_PLACES.goldShop.sign, 0.4, 3.6, c.h - 0.38)
  c.npcs.push({ def: guest('goldShop', 0, 7), at: { x: 2.35, z: -0.85 }, yaw: Math.PI })
  pendant(b, 0, -0.9, c.h, 0.7, GOLD, '#fff1c8', 0.22)
  c.clocks.push({ at: [-HW + 0.04, 2.5, -0.4], rotY: Math.PI / 2, r: 0.2 })
  return c
}

const BUILDERS: Record<ShopRoomId, () => Ctx> = {
  pho,
  bunCha,
  banhCuon,
  lau,
  banhMi,
  com,
  che,
  taphoa,
  circleK,
  hoangKim,
  pharmacy,
  tailor,
  oldBooks,
  photo,
  notary,
  bank,
  aps,
  goldShop,
  restaurant,
}

export function planFor(id: ShopRoomId): Plan {
  return BUILDERS[id]()
}
