import type { ShapeItem } from '../shared/Shapes'
import { modelShapes, type Paint } from '../shared/models'
import { facadePaint } from '../GermanyStreet/kenneyHouses'

/**
 * 1.46 Hà Nội houses from open libraries (user: "nhà cửa chỉ là các hình khối tự tạo, nhìn khá xấu — tham khảo thư viện").
 * Facades are Kenney *Modular Buildings* modules (pack "facade", CC0) like München's houses (1.45), but laid out the Hà Nội
 * way: narrow nhà ống with a balcony on every floor, shop fronts on the ground floor, flat roofs with the stainless water
 * tank (KayKit water tower, repainted), AC units and potted plants (Quaternius), terracotta roofs on the old houses,
 * ochre colonial houses with tall arched windows, mini hotels, khu tập thể blocks.
 * Same convention as decorHouses: local space, front = +Z at z = depth / 2, centred on the origin.
 * Returns null while the pack is missing (callers keep the hand-built houses).
 */

/** tubeTiled = a nhà ống with the Old Quarter terracotta roof over the front. */
export type HanoiStyle = 'tube' | 'tubeTiled' | 'colonial' | 'oldLow' | 'modern' | 'tapThe' | 'hotel'

export interface HanoiHouseOptions {
  floors?: number
  /** Floor height in metres (TubeHouse uses 2.8 so its hand-built shop front and sign still fit). */
  fh?: number
  wall?: string
  /** Colour of the balcony railings, window bars and the flat roof edge (dark parts of the modules). */
  rail?: string
  awning?: string
  /** false = no ground-floor modules: a plain wall up to the front instead (the caller draws its own shop front). */
  ground?: boolean
  /** Only the floors above the ground floor (and the roof): the caller has an open room down there (eateries, shops). */
  upperOnly?: boolean
  /** No balcony on the first floor (a shop sign hangs there). */
  noBalcony1?: boolean
  /** Colour of the louvred shutters (cửa chớp). */
  shutter?: string
  /** Ground floor: a shop front (true) or a house door (false); default by seed. */
  shop?: boolean
  roofTank?: boolean
  airCon?: boolean
  plants?: boolean
}

type Rng = () => number
const pick = <T,>(r: Rng, list: readonly T[]) => list[Math.floor(r() * list.length)]

/** Kenney's module is 1 × 0.625 × 1; the facade layer is SZ deep. */
const SZ = 1.6
const KH = 0.625

export const HN_WALLS = ['#f2c46d', '#f6d6a8', '#f0b9a0', '#cfe0c8', '#cfe0ee', '#f6d6de', '#e6dcf2', '#f6e7c4', '#d9ecd0', '#ffd9a8', '#f4e3b5', '#e9c9a0']
const COLONIAL_WALLS = ['#f2c46d', '#e8b04a', '#f4cf7a', '#efc98a']
const RAILS = ['#2c5c43', '#2f5f60', '#3b3b44', '#4f5d75', '#5b3a2a', '#2f4f8f']
const AWNINGS = ['#d4473b', '#3f7d8a', '#f4c04e', '#4f86d9', '#3fae72', '#c8322b', '#2f8c7f']
const TILE = '#c8653d'
const SHUTTERS = ['#3f7d5c', '#4f8a8b', '#5d7a4a', '#2f6b6b', '#8a5a3a', '#4f6fa8', '#3f7d5c']
/** Share of a bay taken by the window / door module; the rest is wall where the shutters fold. */
const BAY = 0.52

function row(s: ShapeItem[], names: string[], w: number, y: number, fz: number, sy: number, paint: Paint, sz = SZ): boolean {
  const n = names.length
  const sx = w / n
  for (let i = 0; i < n; i++) {
    const m = modelShapes(names[i], { paint })
    if (!m) return false
    s.push({ group: m, at: [-w / 2 + sx * (i + 0.5), y, fz], scale: [sx, sy, sz] })
  }
  return true
}

/** A library model placed in local space (null-safe). */
function put(s: ShapeItem[], name: string, at: [number, number, number], o: { height?: number; scale?: number; rotY?: number; paint?: Paint; maxWidth?: number } = {}) {
  const m = modelShapes(name, { height: o.height, scale: o.scale, paint: o.paint, maxWidth: o.maxWidth })
  if (m) s.push({ group: m, at, rot: [0, o.rotY ?? 0, 0] })
}

const STEEL: Paint = (_m, c) => {
  const v = parseInt(c.slice(1, 3), 16)
  return v < 0x60 ? '#8d959e' : '#cfd6dd'
}

/** The roof of a flat-roofed house: Kenney flat-roof slab, the steel water tank, an antenna, a few pots. */
function flatRoof(s: ShapeItem[], w: number, d: number, H: number, r: Rng, rail: string, o: HanoiHouseOptions) {
  const front = 0
  const top = modelShapes('kfRoofFlatTop', { paint: () => '#b9b3a6' })
  if (top) s.push({ group: top, at: [0, H, 0], scale: [w / 1.1, 1.2, d / 1.1] })
  else s.push({ box: [w, 0.25, d], at: [0, H + 0.12, 0], color: '#b9b3a6' })
  // a low parapet to the street, a little lighter than the roof slab
  s.push({ box: [w, 0.55, 0.18 + front], at: [0, H + 0.27, d / 2 + front / 2 - 0.09], color: '#e9e2d2' })
  s.push({ box: [w + 0.08, 0.08, 0.24], at: [0, H + 0.58, d / 2 + front - 0.09], color: rail })
  if (o.roofTank ?? r() < 0.7) {
    const k = r()
    put(s, 'cWatertower', [w * (k < 0.5 ? -0.18 : 0.18), H + 0.15, -d * 0.22], { height: 1.7, paint: STEEL })
  }
  if (r() < 0.45) put(s, 'antenna1', [w / 2 - 0.5, H + 0.15, -d * 0.35], { height: 1.8 })
  if (o.plants ?? r() < 0.75) {
    put(s, pick(r, ['pot1', 'pot6', 'pot7']), [-w / 2 + 0.6, H + 0.15, d / 2 - 0.7], { height: 0.9, rotY: r() * 3 })
    if (w > 4) put(s, pick(r, ['pot5', 'pot2', 'pot8']), [w / 2 - 0.6, H + 0.15, d / 2 - 0.7], { height: 0.8, rotY: r() * 3 })
  }
}

/** A terracotta roof (Kenney slanted pieces) front and back, ridge along the street. */
function tiledRoof(s: ShapeItem[], w: number, d: number, H: number, RH: number, dormers: boolean, paint: Paint) {
  const n = Math.max(1, Math.round(w / 2))
  const sx = w / n
  const rsy = RH / 0.782
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + sx * (i + 0.5)
    const front = modelShapes(dormers && (i % 2 === 1 || n === 1) ? 'kfRoofSlantedWindow' : 'kfRoofSlanted', { paint })
    const back = modelShapes('kfRoofSlanted', { paint })
    if (front) s.push({ group: front, at: [x, H, d / 4], scale: [sx, rsy, d / 2] })
    if (back) s.push({ group: [{ group: back, scale: [sx, rsy, d / 2] }], at: [x, H, -d / 4], rot: [0, Math.PI, 0] })
  }
}

/** AC units hung on the facade beside a window, at some floors. */
function airCons(s: ShapeItem[], w: number, d: number, floors: number, fh: number, r: Rng, onBalcony = false) {
  for (let f = 1; f < floors; f++) {
    if (r() > 0.45) continue
    const side = r() < 0.5 ? -1 : 1
    // 1.46: half of them the Poly Haven outdoor unit (pack urban), the others Kenney's
    const ph = r() < 0.5 ? modelShapes('uAircon', { height: 0.62 }) : null
    if (ph) {
      s.push({ group: ph, at: onBalcony ? [side * (w / 2 - 0.6), f * fh + 0.14, d / 2 + 0.3] : [side * (w / 2 - 0.55), f * fh + fh * 0.7, d / 2 + 0.1] })
      continue
    }
    if (onBalcony) {
      // the outdoor unit stands on the balcony slab against the railing
      const m = modelShapes('kfAcA')
      if (m) s.push({ group: m, at: [side * (w / 2 - 0.55), f * fh + 0.14, d / 2 + 0.35], scale: [3.4, 4.2, 2.4] })
      continue
    }
    const m = modelShapes('kfAcA')
    if (m) s.push({ group: m, at: [side * (w / 2 - 0.4), f * fh + fh * 0.78, d / 2 + 0.02], scale: [3.6, 3.6, 2.2] })
  }
}

/** Potted plants on the balconies (Quaternius pots). */
function balconyPlants(s: ShapeItem[], w: number, d: number, f: number, fh: number, r: Rng) {
  if (r() < 0.35) return
  const side = r() < 0.5 ? -1 : 1
  put(s, pick(r, ['pot5', 'pot2', 'pot3', 'pot1']), [side * (w / 2 - 0.45), f * fh + 0.12, d / 2 - 0.1], { height: 0.75, rotY: r() * 6 })
}

const BLOOMS = ['#e0457b', '#c2368f', '#f06aa0', '#d94f8c']

/** Hoa giấy over the first-floor cornice: library bushes painted magenta, one climbing up a corner. */
export function bougainvilleaLib(w: number, f: number, y: number, r: Rng): ShapeItem[] | null {
  const s: ShapeItem[] = []
  const side = r() < 0.5 ? -1 : 1
  const x0 = side * (w / 2 - 0.35)
  const reach = Math.min(w * 0.55, 2.4)
  const bloom = pick(r, BLOOMS)
  const paint: Paint = (_m, c) => (parseInt(c.slice(3, 5), 16) > parseInt(c.slice(1, 3), 16) + 10 && r() < 0.75 ? bloom : '#5f9e57')
  const n = 3 + Math.floor(r() * 2)
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1)
    const m = modelShapes(pick(r, ['bush1', 'bush2', 'berries1', 'berries2']), { height: 0.75, paint })
    if (!m) return null
    s.push({ group: m, at: [x0 - side * t * reach, y - 0.1 + Math.sin(t * Math.PI) * 0.25, f + 0.25], rot: [0, r() * 6, 0], scale: [1.1, 0.8, 0.7] })
  }
  const stem = modelShapes('bush2', { height: 1.4, paint })
  if (stem) s.push({ group: stem, at: [x0, 0, f + 0.25], scale: [0.6, 1.6, 0.5] })
  return s
}


/** A row of window bays: the library module in the middle (BAY of the width), plain wall strips beside it. */
function bays(s: ShapeItem[], names: string[], w: number, y: number, fz: number, sy: number, paint: Paint, wall: string): boolean {
  const n = names.length
  const sx = w / n
  const fh = KH * sy
  for (let i = 0; i < n; i++) {
    const m = modelShapes(names[i], { paint })
    if (!m) return false
    const x = -w / 2 + sx * (i + 0.5)
    s.push({ group: m, at: [x, y, fz], scale: [sx * BAY, sy, SZ] })
    const strip = (sx * (1 - BAY)) / 2
    for (const side of [-1, 1]) s.push({ box: [strip, fh, SZ], at: [x + side * (sx * BAY + strip) / 2, y + fh / 2, fz], color: wall })
  }
  // a thin cornice line between the floors
  s.push({ box: [w + 0.06, 0.12, 0.12], at: [0, y + 0.06, fz + SZ / 2 + 0.04], color: '#fff6e0' })
  return true
}

/** Two louvred leaves folded open on both sides of an opening (half width hw, from y0 to y1) on the wall at z. */
function shutters(s: ShapeItem[], x: number, hw: number, y0: number, y1: number, z: number, color: string) {
  const h = y1 - y0
  const lw = hw * 0.92
  for (const side of [-1, 1]) {
    const cx = x + side * (hw + lw / 2 + 0.02)
    s.push({ box: [lw, h, 0.05], at: [cx, y0 + h / 2, z + 0.03], color })
    const slats = Math.max(2, Math.round(h / 0.4))
    for (let k = 0; k < slats; k++) s.push({ box: [lw - 0.08, 0.025, 0.02], at: [cx, y0 + 0.12 + (k * (h - 0.24)) / Math.max(1, slats - 1), z + 0.065], color: '#f4efe4' })
  }
}

/** The nhà ống balcony: a slab and a wrought-iron railing with a top rail. */
function ironBalcony(s: ShapeItem[], x: number, w: number, y: number, z: number, deep: number, slab: string, rail: string) {
  s.push({ box: [w, 0.14, deep], at: [x, y + 0.07, z + deep / 2], color: slab })
  s.push({ box: [w, 0.06, 0.06], at: [x, y + 1.0, z + deep - 0.03], color: rail })
  s.push({ box: [w, 0.04, 0.04], at: [x, y + 0.25, z + deep - 0.03], color: rail })
  const bars = Math.max(4, Math.round(w / 0.24))
  for (let i = 0; i <= bars; i++) s.push({ box: [0.03, 0.85, 0.03], at: [x - w / 2 + 0.03 + (i * (w - 0.06)) / bars, y + 0.57, z + deep - 0.03], color: rail })
  for (const side of [-1, 1]) {
    s.push({ box: [0.05, 0.06, deep], at: [x + side * (w / 2 - 0.03), y + 1.0, z + deep / 2], color: rail })
    s.push({ box: [0.03, 0.85, 0.03], at: [x + side * (w / 2 - 0.03), y + 0.57, z + deep / 2], color: rail })
  }
}

/** Cửa cuốn: a corrugated roller shutter with its box on top. */
function rollerShutter(s: ShapeItem[], x: number, w: number, h: number, z: number, color: string) {
  s.push({ box: [w, h, 0.05], at: [x, h / 2, z + 0.025], color })
  for (let i = 1; i < Math.floor(h / 0.18); i++) s.push({ box: [w, 0.025, 0.02], at: [x, i * 0.18, z + 0.06], color: '#6d7480' })
  s.push({ box: [w + 0.1, 0.28, 0.3], at: [x, h + 0.14, z + 0.12], color: '#c9ccd2' })
}

/** Khu tập thể: every flat added its own "chuồng cọp" cage in front of the windows. */
function tapTheCages(s: ShapeItem[], w: number, n: number, y: number, fh: number, z: number, r: Rng) {
  const sx = w / n
  const cages = ['#7fb0c9', '#9ccc9c', '#c98a5a', '#d9c36a', '#b9a3c9', '#8fa3ad']
  const cloth = ['#ff9fb2', '#a9d6ff', '#ffffff', '#ffe08a', '#a8e6cf', '#cdb8f0']
  for (let b = 0; b < n; b++) {
    if (b === Math.floor(n / 2) || r() < 0.2) continue
    const x = -w / 2 + sx * (b + 0.5)
    const c = pick(r, cages)
    const cw = sx - 0.25
    s.push({ box: [cw, 0.08, 0.8], at: [x, y + 0.45, z + 0.4], color: '#cfc8bb' })
    s.push({ box: [cw + 0.1, 0.05, 0.95], at: [x, y + fh - 0.35, z + 0.44], rot: [0.12, 0, 0], color: c })
    const bars = 6
    for (let k = 0; k <= bars; k++) s.push({ box: [0.03, fh - 0.85, 0.03], at: [x - cw / 2 + (k * cw) / bars, y + 0.45 + (fh - 0.85) / 2, z + 0.78], color: c })
    for (const yy of [0.35, 0.7]) s.push({ box: [cw, 0.03, 0.03], at: [x, y + 0.45 + (fh - 0.85) * yy, z + 0.78], color: c })
    for (const side of [-1, 1]) s.push({ box: [0.03, fh - 0.85, 0.78], at: [x + (side * cw) / 2, y + 0.45 + (fh - 0.85) / 2, z + 0.4], color: c })
    if (r() < 0.7) for (let k = 0; k < 3; k++) s.push({ box: [0.3, 0.4, 0.02], at: [x - 0.4 + k * 0.38, y + fh - 0.75, z + 0.6], rot: [0, 0, (k % 2 ? 1 : -1) * 0.06], color: pick(r, cloth) })
  }
}

/** The little pediment on top of a nhà ống façade (often with the year it was built in a round medallion). */
function pediment(s: ShapeItem[], w: number, d: number, H: number, wall: string, r: Rng) {
  if (r() < 0.35) return
  const pw = Math.min(w * 0.5, 2.2)
  s.push({ box: [pw, 0.55, 0.2], at: [0, H + 0.82, d / 2 - 0.1], color: '#fff6e0' })
  s.push({ box: [pw * 0.6, 0.28, 0.2], at: [0, H + 1.23, d / 2 - 0.1], color: '#fff6e0' })
  s.push({ cyl: [0.18, 0.18, 0.06, 14], at: [0, H + 0.85, d / 2 + 0.02], rot: [Math.PI / 2, 0, 0], color: wall })
}

/** Gable walls (đầu hồi) at both ends of a tiled roof, so the roof reads as a Vietnamese house, not a cottage. */
function gableWalls(s: ShapeItem[], w: number, d: number, H: number, RH: number, wall: string) {
  for (const side of [-1, 1]) {
    for (let k = 0; k < 3; k++) s.push({ box: [0.22, RH / 3, d * (1 - k / 3) + 0.2], at: [side * (w / 2 + 0.06), H + (RH / 3) * (k + 0.5), 0], color: wall })
  }
}

/** A whole house from library modules, or null while the facade pack is missing. */
export function hanoiHouse(kind: HanoiStyle, w: number, d: number, r: Rng, o: HanoiHouseOptions = {}): ShapeItem[] | null {
  if (!modelShapes('kfBlock') || (globalThis as { __noLibHouses?: boolean }).__noLibHouses) return null
  const style = kind === 'tubeTiled' ? 'tube' : kind
  const fh =
    o.fh ?? (style === 'colonial' ? 3.2 : style === 'tapThe' ? 2.75 : style === 'hotel' ? 2.8 : style === 'oldLow' ? 3.1 : 2.9)
  const floors =
    o.floors ??
    (style === 'colonial'
      ? 2 + (r() < 0.5 ? 1 : 0)
      : style === 'oldLow'
        ? 1
        : style === 'tapThe'
          ? 4
          : style === 'hotel'
            ? 5 + (r() < 0.5 ? 1 : 0)
            : style === 'modern'
              ? 4 + (r() < 0.4 ? 1 : 0)
              : 3 + (r() < 0.45 ? 1 : 0))
  const sy = fh / KH
  const H = floors * fh
  const wall =
    o.wall ??
    (style === 'colonial'
      ? pick(r, COLONIAL_WALLS)
      : style === 'modern'
        ? pick(r, ['#f4f4f0', '#e9e6df', '#dfe7ea', '#cfd4da'])
        : style === 'tapThe'
          ? pick(r, ['#e9d9a8', '#e3cf9c', '#d9d2b8'])
          : style === 'hotel'
            ? pick(r, ['#9fc7d8', '#d9b8c4', '#e8d9a0', '#b8d4b0'])
            : style === 'oldLow'
              ? pick(r, ['#f1e3c0', '#e9d6a8', '#f6ead0'])
              : pick(r, HN_WALLS))
  const tiled = style === 'oldLow' || style === 'colonial' || kind === 'tubeTiled'
  const rail = o.rail ?? (style === 'colonial' ? '#2c5c43' : pick(r, RAILS))
  const roof = tiled ? (style === 'colonial' && r() < 0.5 ? '#6b7280' : TILE) : rail
  const awning = o.awning ?? pick(r, AWNINGS)
  const paint = facadePaint(wall, roof, awning)
  const n = Math.max(1, Math.round(w / (style === 'tapThe' ? 2.3 : style === 'colonial' ? 2.2 : 2.0)))
  const fz = d / 2 - SZ / 2
  const s: ShapeItem[] = []
  // plain body behind the facade layer
  if (o.upperOnly) s.push({ box: [w, H - fh, d - SZ - 0.02], at: [0, fh + (H - fh) / 2, -SZ / 2 - 0.01], color: wall })
  else s.push({ box: [w, H, d - SZ - 0.02], at: [0, H / 2, -SZ / 2 - 0.01], color: wall })
  // ground floor
  if (o.upperOnly) {
    // nothing: the caller's room
  } else if (o.ground === false) {
    s.push({ box: [w, fh, SZ], at: [0, fh / 2, fz], color: wall })
  } else {
    const shop = o.shop ?? (style === 'colonial' ? r() < 0.3 : style === 'oldLow' ? true : r() < 0.75)
    let ground: string[]
    const mid = Math.floor(n / 2)
    if (style === 'hotel' || style === 'modern') ground = n >= 3 ? ['kfLargeLeft', ...Array(n - 2).fill('kfLargeMiddle'), 'kfLargeRight'] : Array.from({ length: n }, (_, i) => (i === n - 1 ? 'kfDoorWindowNarrow' : 'kfWindowLarge'))
    else if (style === 'colonial') ground = Array.from({ length: n }, (_, i) => (i === mid ? 'kfWindowDoorRound' : shop ? 'kfAwnings' : 'kfHighTopRound'))
    else if (style === 'oldLow') ground = Array.from({ length: n }, (_, i) => (i === mid ? 'kfWindowDoor' : 'kfAwnings'))
    else if (shop) ground = Array.from({ length: n }, (_, i) => (i === n - 1 && n > 1 ? 'kfDoorWindowNarrow' : r() < 0.5 ? 'kfAwnings' : 'kfLargeMiddle'))
    else ground = Array.from({ length: n }, (_, i) => (i === mid ? 'kfDoorWindow' : 'kfWindowSill'))
    if (style === 'tube' && !shop) {
      // a closed house front: the roller shutter (cửa cuốn) and a narrow door beside it
      s.push({ box: [w, fh, SZ], at: [0, fh / 2, fz], color: wall })
      rollerShutter(s, -w * 0.12, w * 0.68, fh * 0.8, fz + SZ / 2, pick(r, ['#9aa1ad', '#7fa3b8', '#b8a08a', '#a7b0a0']))
      s.push({ box: [0.9, fh * 0.75, 0.06], at: [w / 2 - 0.65, (fh * 0.75) / 2, fz + SZ / 2 + 0.02], color: '#6b4a32' })
    } else if (!row(s, ground, w, 0, fz, sy, paint)) return null
  }
  // upper floors
  if (o.upperOnly) s.push({ box: [w, 0.2, d], at: [0, fh - 0.1, 0], color: wall })
  const front = fz + SZ / 2
  const shutter = o.shutter ?? (style === 'colonial' ? pick(r, ['#3f7d5c', '#2f6b6b', '#4f8a8b']) : pick(r, SHUTTERS))
  const vn = style === 'tube' || style === 'colonial'
  const upper =
    style === 'colonial'
      ? 'kfHighTopRound'
      : style === 'modern'
        ? pick(r, ['kfWindowWide', 'kfWindowWideSill'])
        : style === 'hotel'
          ? pick(r, ['kfWindowWideSill', 'kfWindowsSills'])
          : style === 'tapThe'
            ? 'kfWindows'
            : 'kfWindowsSills'
  for (let f = 1; f < floors; f++) {
    const y = f * fh
    // nhà ống: French doors onto an iron-railed balcony on every floor but (sometimes) the top one
    const balconyFloor = f === 1 && o.noBalcony1 ? false : style === 'tube' ? f < floors - 1 || r() < 0.55 : style === 'colonial' ? f === 1 || (f === 2 && floors > 3) : false
    if (vn) {
      const names = Array.from({ length: n }, () => (balconyFloor ? (style === 'colonial' ? 'kfWindowDoorRound' : 'kfDoorWindow') : upper))
      if (!bays(s, names, w, y, fz, sy, paint, wall)) return null
      // louvred shutters folded open beside every opening (cửa chớp)
      const sx = w / n
      const glass = balconyFloor ? [0, 0.5] : style === 'colonial' ? [0, 0.47] : [0.12, 0.5]
      for (let i = 0; i < n; i++) shutters(s, -w / 2 + sx * (i + 0.5), (sx * BAY) / 2, y + glass[0] * sy, y + glass[1] * sy, front, shutter)
      if (balconyFloor) {
        const bw = style === 'colonial' ? Math.min(w - 0.6, sx * 1.4) : w - 0.12
        ironBalcony(s, style === 'colonial' ? -w / 2 + sx * (Math.floor(n / 2) + 0.5) : 0, bw, y, front, style === 'colonial' ? 0.55 : 0.8, '#efe8da', rail)
      }
    } else {
      const names = Array.from({ length: n }, (_, i) => {
        if (style === 'tapThe') return i === Math.floor(n / 2) ? 'kfWindow' : 'kfWindows'
        if (style === 'modern') return f % 2 === 1 && i === 0 ? 'kfBalcony' : upper
        return upper
      })
      row(s, names, w, y, fz, sy, paint)
      if (style === 'tapThe') tapTheCages(s, w, n, y, fh, front, r)
    }
    if (style === 'tube' || style === 'tapThe') balconyPlants(s, w, d + (style === 'tube' && balconyFloor ? 1.2 : 0.3), f, fh, r)
  }
  if (o.airCon ?? style !== 'oldLow') airCons(s, w, d, floors, fh, r, vn)
  // the top
  if (style === 'oldLow') {
    // a low Old Quarter house: a tiled roof to the street (no dormers: those are European), red lanterns
    tiledRoof(s, w, d, H, 2.2, false, paint)
    gableWalls(s, w, d, H, 2.2, '#f6ead0')
    for (const x of [-w * 0.28, w * 0.28]) {
      s.push({ cyl: [0.008, 0.008, 0.3, 3], at: [x, fh - 0.45, d / 2 + 0.55], color: '#3a3a40' })
      s.push({ sphere: [0.17, 8, 6], at: [x, fh - 0.72, d / 2 + 0.55], scale: [1, 0.85, 1], color: '#d4473b' })
      s.push({ cyl: [0.05, 0.05, 0.05, 6], at: [x, fh - 0.88, d / 2 + 0.55], color: '#f4c04e' })
    }
  } else if (kind === 'tubeTiled') {
    s.push({ box: [w + 0.16, 0.18, d], at: [0, H + 0.09, 0], color: '#fff6e0' })
    tiledRoof(s, w, d, H + 0.18, 2.0, false, paint)
    gableWalls(s, w, d, H + 0.18, 2.0, '#f6ead0')
  } else if (style === 'colonial') {
    // white cornice, then a mansard of slanted pieces with dormers (the French houses do have them)
    s.push({ box: [w + 0.25, 0.25, d + 0.1], at: [0, H + 0.12, 0], color: '#fff6e0' })
    tiledRoof(s, w, d, H + 0.25, 2.4, true, paint)
  } else {
    flatRoof(s, w, d, H, r, rail, o)
    if (style === 'tube') pediment(s, w, d, H, wall, r)
    if (style === 'hotel') {
      // the hotel's roof sign frame and lift house
      s.push({ box: [Math.min(2.0, w * 0.35), 1.6, 2.0], at: [-w / 2 + 1.2, H + 0.8, -d / 2 + 1.4], color: wall })
    }
  }
  return s
}

/** Module floor heights by style (for signs placed by callers). */
export const HANOI_FLOOR = 2.9
