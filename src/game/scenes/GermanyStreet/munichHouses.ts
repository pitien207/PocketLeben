import { PALETTE as P } from '../shared/palette'
import { place, softPlantShapes } from '../shared/props'
import type { ShapeItem } from '../shared/Shapes'
import type { Vec3 } from '../../../data/config'
import { seeded, win } from '../VietnamStreet/decorHouses'
import { moduleHouse } from './kenneyHouses'

/**
 * 1.44 München houses that are there to be looked at: five styles of the old town, each a list of primitives in
 * local space — the front faces +Z at z = depth / 2, the footprint is centred on the origin (same convention as
 * VietnamStreet/decorHouses.ts). Rows of them are merged into ONE mesh per district. Window panes use the
 * WINDOW_GLASS colours, so they light up at night with the fancy look.
 */

export type MucStyle = 'altbau' | 'giebel' | 'jugendstil' | 'nachkrieg' | 'palais'
type Rng = () => number
const pick = <T,>(r: Rng, list: readonly T[]) => list[Math.floor(r() * list.length)]

export const GLASS = '#bfe6f2'
export const GLASS2 = '#8fc4d8'
const WALLS = ['#f3e3c3', '#f2d0b4', '#e9d8ee', '#d9e6cf', '#f6edd8', '#f1c9a8', '#dfe8ef', '#f4dc9c', '#e8c6c0', '#f7f1e3']
const ROOF_RED = '#b5524a'
const ROOF_DARK = '#7b6a68'
const ROOF_SLATE = '#5f6672'
const COPPER = '#7fae9a'
const AWNINGS = ['#3f7d5c', '#c8322b', '#2f4f8f', '#7a4a2a', '#d98a2b', '#5a3d6b']

/** A gabled roof with the ridge along X (eaves to the street). */
export function roofX(s: ShapeItem[], w: number, d: number, y: number, color: string, k = 0.5) {
  const r = d / Math.sqrt(3) + 0.15
  s.push({ cyl: [r, r, w + 0.25, 3], at: [0, y + 0.5 * r * k, 0], rot: [-Math.PI / 2, 0, Math.PI / 2], scale: [1, 1, k], color })
}

/** A gabled roof with the ridge along Z (gable to the street). */
export function roofZ(s: ShapeItem[], w: number, d: number, y: number, color: string, k = 0.8, x = 0) {
  const r = w / Math.sqrt(3) + 0.12
  s.push({ cyl: [r, r, d + 0.2, 3], at: [x, y + 0.5 * r * k, 0], rot: [-Math.PI / 2, 0, 0], scale: [1, 1, k], color })
}

/** Ground floor: a shop (big panes, awning) or a house door with two windows. */
function groundFloor(s: ShapeItem[], w: number, f: number, r: Rng, wall: string, trim: string) {
  s.push({ box: [w + 0.06, 0.5, 0.08], at: [0, 0.25, f + 0.02], color: '#b8aa98' })
  if (r() < 0.72) {
    const panes = Math.max(1, Math.floor((w - 0.8) / 2.2))
    const pw = (w - 0.8) / panes
    for (let i = 0; i < panes; i++) {
      const x = -w / 2 + 0.4 + pw * (i + 0.5)
      if (i === Math.floor(panes / 2) && panes > 1) {
        s.push({ box: [1.1, 2.3, 0.08], at: [x, 1.15, f + 0.03], color: '#5b4a3e' })
        s.push({ box: [0.9, 2.1, 0.09], at: [x, 1.15, f + 0.04], color: GLASS2 })
      } else {
        s.push({ box: [pw - 0.3, 2.0, 0.07], at: [x, 1.45, f + 0.02], color: '#3d3a40' })
        s.push({ box: [pw - 0.42, 1.88, 0.08], at: [x, 1.45, f + 0.03], color: GLASS })
      }
    }
    s.push({ box: [w - 0.4, 0.42, 0.1], at: [0, 2.78, f + 0.05], color: trim })
    if (r() < 0.65) {
      const c = pick(r, AWNINGS)
      s.push({ box: [w - 0.5, 0.06, 1.15], at: [0, 2.6, f + 0.55], rot: [0.32, 0, 0], color: c })
      s.push({ box: [w - 0.5, 0.22, 0.05], at: [0, 2.38, f + 1.1], color: c })
    }
  } else {
    const dx = (r() - 0.5) * (w - 2.6)
    s.push({ box: [1.45, 2.7, 0.08], at: [dx, 1.35, f + 0.02], color: trim })
    s.push({ box: [1.15, 2.4, 0.1], at: [dx, 1.2, f + 0.04], color: pick(r, ['#6a4a3a', '#3f5f4f', '#4a4f6a']) })
    s.push({ cyl: [0.55, 0.55, 0.1, 10, ], at: [dx, 2.4, f + 0.04], rot: [Math.PI / 2, 0, 0], scale: [1, 1, 0.5], color: GLASS2 })
    for (const side of [-1, 1]) {
      const wx = dx + side * 2.0
      if (Math.abs(wx) > w / 2 - 0.6) continue
      win(s, wx, 1.6, f, 0.9, 1.25, '#ffffff', GLASS)
    }
  }
  s.push({ box: [w + 0.1, 0.14, 0.2], at: [0, 3.05, f + 0.07], color: wall === '#f7f1e3' ? '#d8cdb8' : trim })
}

/** Rows of windows on the upper floors. */
function upperWindows(s: ShapeItem[], w: number, f: number, floors: number, FH: number, r: Rng, trim: string, opts: { pediment?: boolean; boxes?: boolean } = {}) {
  const cols = Math.max(2, Math.floor((w - 0.6) / 1.55))
  const glass = r() < 0.5 ? GLASS : GLASS2
  for (let fl = 1; fl < floors; fl++) {
    const y = fl * FH + 1.5
    for (let c = 0; c < cols; c++) {
      const x = -w / 2 + (w / cols) * (c + 0.5)
      win(s, x, y, f, 0.82, 1.5, '#ffffff', glass)
      s.push({ box: [1.08, 0.08, 0.2], at: [x, y - 0.83, f + 0.08], color: trim })
      if (opts.pediment && fl === 1) s.push({ box: [1.1, 0.12, 0.16], at: [x, y + 0.95, f + 0.07], color: trim })
      if (opts.boxes && (fl + c) % 2 === 0) {
        s.push({ box: [0.84, 0.18, 0.2], at: [x, y - 0.7, f + 0.16], color: '#a8563a' })
        for (let k = 0; k < 3; k++) s.push({ ico: [0.1], at: [x - 0.26 + k * 0.26, y - 0.56, f + 0.2], color: k % 2 ? '#ff6b5e' : '#e0485a' })
      }
    }
    s.push({ box: [w + 0.1, 0.1, 0.12], at: [0, (fl + 1) * FH - 0.05, f + 0.04], color: trim })
  }
}

function dormers(s: ShapeItem[], w: number, f: number, H: number, wall: string, roof: string) {
  const n = Math.max(1, Math.floor(w / 2.8))
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + (w / n) * (i + 0.5)
    s.push({ box: [0.9, 0.95, 0.8], at: [x, H + 0.8, f - 1.0], color: wall })
    s.push({ box: [0.6, 0.6, 0.05], at: [x, H + 0.78, f - 0.58], color: GLASS2 })
    s.push({ box: [1.05, 0.12, 0.95], at: [x, H + 1.32, f - 1.0], color: roof })
  }
}

/** The classic: pastel plaster, white trim, flower boxes, a steep tiled roof with dormers. */
function altbau(w: number, d: number, r: Rng): ShapeItem[] {
  const s: ShapeItem[] = []
  const floors = 4 + (r() < 0.45 ? 1 : 0)
  const FH = 3.1
  const H = floors * FH + 0.3
  const f = d / 2
  const wall = pick(r, WALLS)
  const trim = '#fffaf0'
  s.push({ box: [w, H, d], at: [0, H / 2, 0], color: wall })
  groundFloor(s, w, f, r, wall, trim)
  upperWindows(s, w, f, floors, FH, r, trim, { pediment: r() < 0.5, boxes: r() < 0.5 })
  s.push({ box: [w + 0.3, 0.32, 0.36], at: [0, H, f + 0.06], color: trim })
  const roof = r() < 0.6 ? ROOF_RED : ROOF_DARK
  roofX(s, w, d, H + 0.15, roof, 0.55)
  dormers(s, w, f, H, wall, roof)
  if (r() < 0.6) s.push({ box: [0.5, 1.4, 0.5], at: [w * 0.28, H + 1.6, -0.5], color: '#a5523f' })
  return s
}

/** Old-town Bürgerhaus with a stepped gable to the street (Gothic Munich). */
function giebel(w: number, d: number, r: Rng): ShapeItem[] {
  const s: ShapeItem[] = []
  const floors = 3 + (r() < 0.5 ? 1 : 0)
  const FH = 3.0
  const H = floors * FH + 0.2
  const f = d / 2
  const wall = pick(r, ['#f6edd8', '#f3e3c3', '#e8c6c0', '#f4dc9c', '#f7f1e3', '#e3d0b4'])
  const trim = pick(r, ['#c8a070', '#ffffff', '#9a6a4a'])
  s.push({ box: [w, H, d], at: [0, H / 2, 0], color: wall })
  groundFloor(s, w, f, r, wall, trim)
  upperWindows(s, w, f, floors, FH, r, trim, { boxes: r() < 0.4 })
  // Stepped gable: shrinking blocks up the front, the roof ridge runs away from the street
  const steps = 4
  const gh = w * 0.42
  for (let i = 0; i < steps; i++) {
    const sw = w * (1 - i / steps)
    s.push({ box: [sw, gh / steps, 0.45], at: [0, H + (gh / steps) * (i + 0.5), f - 0.22], color: wall })
    s.push({ box: [sw + 0.12, 0.1, 0.5], at: [0, H + (gh / steps) * (i + 1), f - 0.2], color: trim })
  }
  win(s, 0, H + gh * 0.32, f - 0.0, 0.55, 0.8, '#ffffff', GLASS2)
  roofZ(s, w * 0.96, d - 0.5, H - 0.05, r() < 0.7 ? ROOF_RED : ROOF_DARK, 0.85)
  return s
}

/** Jugendstil: a bay window up the middle, curved gable, decorative bands. */
function jugendstil(w: number, d: number, r: Rng): ShapeItem[] {
  const s: ShapeItem[] = []
  const floors = 5
  const FH = 3.0
  const H = floors * FH + 0.3
  const f = d / 2
  const wall = pick(r, ['#e9d8ee', '#d9e6cf', '#dfe8ef', '#f2d0b4', '#f6edd8'])
  const trim = pick(r, ['#ffffff', '#c9b48a', '#8fae9a'])
  s.push({ box: [w, H, d], at: [0, H / 2, 0], color: wall })
  groundFloor(s, w, f, r, wall, trim)
  upperWindows(s, w, f, floors, FH, r, trim, { pediment: true })
  // Erker (bay) on floors 1–3
  const ew = Math.min(2.6, w * 0.4)
  s.push({ box: [ew, FH * 3, 0.9], at: [0, FH + FH * 1.5, f + 0.45], color: wall })
  for (let fl = 1; fl <= 3; fl++) win(s, 0, fl * FH + 1.5, f + 0.9, ew * 0.6, 1.5, '#ffffff', GLASS)
  s.push({ box: [ew + 0.2, 0.2, 1.05], at: [0, FH * 4 + 0.1, f + 0.5], color: trim })
  // Curved gable
  s.push({ cyl: [w * 0.32, w * 0.32, 0.4, 16, ], at: [0, H, f - 0.2], rot: [Math.PI / 2, 0, 0], color: wall })
  s.push({ torus: [w * 0.32, 0.08, 4, 16, Math.PI], at: [0, H, f - 0.0], color: trim })
  win(s, 0, H + w * 0.12, f + 0.01, 0.6, 0.75, '#ffffff', GLASS2)
  for (const yy of [FH * 1 - 0.05, FH * 4 + 0.6]) s.push({ box: [w + 0.06, 0.18, 0.1], at: [0, yy, f + 0.03], color: trim })
  s.push({ box: [w + 0.3, 0.3, 0.36], at: [0, H, f + 0.06], color: trim })
  roofX(s, w, d, H + 0.1, ROOF_SLATE, 0.5)
  return s
}

/** Rebuilt after the war: flat facade, ribbon windows, a flat roof. */
function nachkrieg(w: number, d: number, r: Rng): ShapeItem[] {
  const s: ShapeItem[] = []
  const floors = 5
  const FH = 3.0
  const H = floors * FH
  const f = d / 2
  const wall = pick(r, ['#ece6da', '#d9d4cc', '#efe3c8', '#e3e8ea', '#f2e8d8'])
  s.push({ box: [w, H, d], at: [0, H / 2, 0], color: wall })
  groundFloor(s, w, f, r, wall, '#9aa0a8')
  for (let fl = 1; fl < floors; fl++) {
    const y = fl * FH + 1.55
    s.push({ box: [w - 0.6, 1.45, 0.06], at: [0, y, f + 0.02], color: '#6a7078' })
    s.push({ box: [w - 0.75, 1.32, 0.07], at: [0, y, f + 0.03], color: r() < 0.5 ? GLASS : GLASS2 })
    const n = Math.max(2, Math.floor(w / 1.4))
    for (let i = 1; i < n; i++) s.push({ box: [0.06, 1.32, 0.09], at: [-w / 2 + 0.375 + ((w - 0.75) / n) * i, y, f + 0.04], color: '#6a7078' })
  }
  s.push({ box: [w + 0.3, 0.25, d + 0.3], at: [0, H + 0.1, 0], color: '#8a8f96' })
  if (r() < 0.6) s.push({ box: [w * 0.4, 1.4, d * 0.3], at: [0, H + 0.9, -d * 0.15], color: '#bfbab0' })
  return s
}

/** Classical palace (Ludwigstraße style): rusticated base, pilasters, a pediment, low copper roof. */
function palais(w: number, d: number, r: Rng): ShapeItem[] {
  const s: ShapeItem[] = []
  const floors = 3
  const FH = 3.8
  const H = floors * FH + 0.4
  const f = d / 2
  const wall = pick(r, ['#efe3c8', '#e6d8bc', '#f2e6d0', '#e9e3d6'])
  const trim = '#fdf8ec'
  s.push({ box: [w, H, d], at: [0, H / 2, 0], color: wall })
  for (let i = 0; i < 6; i++) s.push({ box: [w + 0.05, 0.08, 0.08], at: [0, 0.5 + i * 0.6, f + 0.02], color: '#d6c8aa' })
  const cols = Math.max(3, Math.floor(w / 2.2))
  for (let c = 0; c < cols; c++) {
    const x = -w / 2 + (w / cols) * (c + 0.5)
    for (let fl = 0; fl < floors; fl++) {
      const y = fl * FH + (fl === 0 ? 1.7 : 2.0)
      win(s, x, y, f + 0.02, 0.95, fl === 0 ? 1.7 : 2.0, '#ffffff', fl === 0 ? GLASS2 : GLASS)
    }
    if (c > 0) s.push({ box: [0.32, H - FH - 0.6, 0.14], at: [x - w / cols / 2, FH + (H - FH) / 2 - 0.3, f + 0.06], color: trim })
  }
  s.push({ box: [w + 0.1, 0.25, 0.25], at: [0, FH, f + 0.08], color: trim })
  s.push({ box: [w + 0.4, 0.4, 0.45], at: [0, H, f + 0.12], color: trim })
  // Pediment over the middle
  const pw = Math.min(w * 0.45, 7)
  s.push({ cyl: [pw / Math.sqrt(3), pw / Math.sqrt(3), 0.35, 3], at: [0, H + 0.2 + pw / Math.sqrt(3) * 0.25, f - 0.05], rot: [-Math.PI / 2, 0, 0], scale: [1, 1, 0.5], color: trim })
  roofX(s, w, d, H + 0.15, COPPER, 0.32)
  return s
}

const BUILDERS: Record<MucStyle, (w: number, d: number, r: Rng) => ShapeItem[]> = { altbau, giebel, jugendstil, nachkrieg, palais }
const WIDTHS: Record<MucStyle, [number, number]> = { altbau: [6.5, 9], giebel: [5, 6.5], jugendstil: [7, 9], nachkrieg: [8, 11], palais: [12, 16] }
const ORDER: MucStyle[] = ['altbau', 'giebel', 'altbau', 'jugendstil', 'nachkrieg', 'giebel', 'altbau', 'altbau', 'jugendstil', 'giebel', 'nachkrieg']

export interface MucLot {
  x: number
  width: number
  style: MucStyle
}

/** Split x0…x1 into houses (seeded; the last one takes what is left). */
export function planMucRow(x0: number, x1: number, seed: number, styles: MucStyle[] = ORDER): MucLot[] {
  const r = seeded(seed)
  const lots: MucLot[] = []
  let x = x0
  let i = Math.floor(r() * styles.length)
  while (x1 - x > 4.2) {
    const style = styles[i++ % styles.length]
    const [a, b] = WIDTHS[style]
    let w = a + r() * (b - a)
    if (x1 - x - w < 4.2) w = x1 - x
    lots.push({ x: x + w / 2, width: w, style })
    x += w
  }
  if (lots.length && x < x1) {
    const last = lots[lots.length - 1]
    const w = last.width + (x1 - x)
    lots[lots.length - 1] = { ...last, x: x1 - w / 2, width: w }
  }
  return lots
}

/** 1.45: built from Kenney modules (kenneyHouses.ts); the hand-built styles below only while the facade pack is missing. */
export function mucHouse(style: MucStyle, width: number, depth: number, seed: number): ShapeItem[] {
  return moduleHouse(style, width, depth, seed) ?? BUILDERS[style](width, depth, seeded(seed))
}

/**
 * A row of houses along X. `front` = z of the facades, `facing` +1 = fronts face +Z (south), −1 = north.
 * Returns the merged shape list (one place() per house).
 */
export function mucRow(x0: number, x1: number, front: number, depth: number, facing: 1 | -1, seed: number, styles?: MucStyle[], cheap = false): ShapeItem[] {
  const cz = front - (facing * depth) / 2
  // (cheap = the hand-built houses; 1.45 the Kenney modules are lighter, so nothing passes it any more)
  const house = (st: MucStyle, w: number, sd: number) => (cheap ? BUILDERS[st](w, depth, seeded(sd)) : mucHouse(st, w, depth, sd))
  return planMucRow(x0, x1, seed, styles).map((lot, i) => place(house(lot.style, lot.width, seed * 100 + i), [lot.x, 0, cz], facing > 0 ? 0 : Math.PI))
}

/** A row along Z (fronts face +X when facing = 1). */
export function mucRowZ(z0: number, z1: number, front: number, depth: number, facing: 1 | -1, seed: number, styles?: MucStyle[]): ShapeItem[] {
  const cx = front - (facing * depth) / 2
  return planMucRow(z0, z1, seed, styles).map((lot, i) => place(mucHouse(lot.style, lot.width, depth, seed * 100 + i), [cx, 0, lot.x], facing > 0 ? Math.PI / 2 : -Math.PI / 2))
}

/** Potted shrubs / a café table cluster in front of a shop. */
export function cafeSet(at: Vec3, rot = 0, umbrella = '#ffffff'): ShapeItem {
  const s: ShapeItem[] = [
    { cyl: [0.4, 0.4, 0.04, 12], at: [0, 0.74, 0], color: '#f6f1e7' },
    { cyl: [0.04, 0.04, 0.72, 6], at: [0, 0.37, 0], color: '#3a3a40' },
  ]
  for (const a of [0, Math.PI]) {
    const x = Math.cos(a) * 0.65
    const z = Math.sin(a) * 0.65
    s.push({ box: [0.4, 0.05, 0.4], at: [x, 0.45, z], color: '#3a3a40' })
    s.push({ box: [0.05, 0.42, 0.4], at: [x + Math.cos(a) * 0.2, 0.68, z], color: '#3a3a40' })
  }
  s.push({ cyl: [0.025, 0.025, 2.2, 5], at: [0, 1.1, 0], color: '#d8d8d8' })
  s.push({ cyl: [0.02, 1.2, 0.4, 10], at: [0, 2.25, 0], color: umbrella })
  return place(s, at, rot)
}

/** A potted plant in front of a door. */
export const mucPlant = (at: Vec3, seed: number) => place(softPlantShapes(P.leafDark, '#b8aa98', seed), at, 0, 1.1)
