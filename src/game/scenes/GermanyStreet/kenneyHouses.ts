import type { ShapeItem } from '../shared/Shapes'
import { modelShapes, type Paint } from '../shared/models'
import { seeded } from '../VietnamStreet/decorHouses'

/**
 * 1.45 Town houses of München built from Kenney's *Modular Buildings* (CC0, pack "facade", tools/kenney2props.mjs):
 * every floor is a row of modules — windows with sills, arched windows, balconies, shop windows, doors — and the top is a
 * row of slanted roof pieces with dormers (a Munich mansard) or a flat roof. Modules are 1 × 0.625 × 1 Kenney units with
 * the front at +z; they are stretched to the house (width / columns, floor height, a facade layer SZ deep) and a plain
 * body fills the depth behind. Walls, roofs and awnings are repainted per house (Kenney's shaded palette keeps its
 * light and dark tones). Same convention as decorHouses: local space, front = +Z at z = depth / 2, centred on the origin.
 * Returns null while the pack is missing (callers keep the hand-built houses).
 */

export type ModuleStyle = 'altbau' | 'jugendstil' | 'nachkrieg' | 'palais' | 'giebel'

export interface ModuleHouseOptions {
  floors?: number
  wall?: string
  roof?: string
  /** x (local) of the front door; null = a shop front over the whole ground floor. */
  doorX?: number | null
  /** Force a shop ground floor (true) or a house door (false). */
  shop?: boolean
}

type Rng = () => number
const pick = <T,>(r: Rng, list: readonly T[]) => list[Math.floor(r() * list.length)]
const toneOf = (hex: string, k: number) => '#' + [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * k).toString(16).padStart(2, '0')).join('')

export const MUC_WALLS = ['#f3e3c3', '#f2d0b4', '#e9d8ee', '#d9e6cf', '#f6edd8', '#f1c9a8', '#dfe8ef', '#f4dc9c', '#e8c6c0', '#f7f1e3', '#cfe0e8', '#f5d6c6']
const ROOFS_RED = ['#b5524a', '#a8493c', '#9c4a3a', '#b85e44']
const ROOFS_SLATE = ['#5f6672', '#6b6f78', '#55606a']
const AWNINGS = ['#3f7d5c', '#c8322b', '#2f4f8f', '#7a4a2a', '#d98a2b', '#5a3d6b', '#2f6b6b']

const rgb = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
const lum = ([r, g, b]: number[]) => 0.299 * r + 0.587 * g + 0.114 * b
const toHex = (c: number[]) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')
/** `base` darkened / lightened like Kenney's shade `own` relative to its reference tone `ref`. */
const shadeLike = (base: string, own: string, ref: string) => {
  const k = lum(rgb(own)) / lum(rgb(ref))
  return toHex(rgb(base).map((v) => v * k))
}

/** Kenney's colours → this house's colours (glass stays glass: the night-window colours of the fancy look). */
export function facadePaint(wall: string, roof: string, awning: string): Paint {
  return (_mat, color) => {
    const c = rgb(color)
    const [r, g, b] = c
    // Kenney's palette is a gradient: the two triangles of one quad often sample two tones, which showed as a diagonal
    // split. Two fixed tones per part instead (the face and its darker frame / sill / edge).
    if (b > r + 20 && b >= g) return '#8fc4d8'
    if (Math.max(r, g, b) < 0x55) return lum(c) / lum(rgb('#3c3c43')) < 1.02 ? toneOf(roof, 0.9) : roof
    if (g > r + 25 && g > b) return lum(c) / lum(rgb('#41ab7b')) < 0.97 ? toneOf(awning, 0.85) : awning
    if (r > 225 && g > 185 && b < 215 && r - b > 25) return lum(c) / lum(rgb('#f9d8b1')) < 0.975 ? toneOf(wall, 0.9) : wall
    return color
  }
}

const FH = 3.0
const SZ = 1.8
/** Kenney's floor height (0.625) → FH. */
const SY = FH / 0.625

function row(s: ShapeItem[], names: string[], w: number, y: number, fz: number, sy: number, paint: Paint): boolean {
  const n = names.length
  const sx = w / n
  for (let i = 0; i < n; i++) {
    const m = modelShapes(names[i], { paint })
    if (!m) return false
    s.push({ group: m, at: [-w / 2 + sx * (i + 0.5), y, fz], scale: [sx, sy, SZ] })
  }
  return true
}

const UPPER: Record<ModuleStyle, string[]> = {
  altbau: ['kfWindowsSills', 'kfWindowSill', 'kfWindowsSillsRound', 'kfWindowWideSill'],
  jugendstil: ['kfWindowsSillsRound', 'kfHighTopRound', 'kfWindowsSills'],
  nachkrieg: ['kfWindowWide', 'kfWindows', 'kfWindow'],
  palais: ['kfHighTopRound', 'kfHighTopSquare', 'kfWindowsSillsRound'],
  giebel: ['kfWindowSill', 'kfWindowsSills', 'kfWindowsRound'],
}

/** A whole house from modules, or null while the facade pack is missing. */
export function moduleHouse(style: ModuleStyle, w: number, d: number, seed: number, o: ModuleHouseOptions = {}): ShapeItem[] | null {
  if (!modelShapes('kfBlock')) return null
  const r = seeded(seed)
  const floors = o.floors ?? (style === 'palais' ? 3 : style === 'giebel' ? 3 + (r() < 0.5 ? 1 : 0) : style === 'altbau' ? 4 + (r() < 0.45 ? 1 : 0) : 5)
  const sy = style === 'palais' ? SY * 1.2 : SY
  const fh = 0.625 * sy
  const H = floors * fh
  const wall = o.wall ?? pick(r, MUC_WALLS)
  const roof = o.roof ?? (style === 'palais' ? '#7fae9a' : r() < 0.62 ? pick(r, ROOFS_RED) : pick(r, ROOFS_SLATE))
  const awning = pick(r, AWNINGS)
  const paint = facadePaint(wall, roof, awning)
  const n = Math.max(2, Math.round(w / (style === 'palais' ? 2.6 : 2.3)))
  const fz = d / 2 - SZ / 2
  const s: ShapeItem[] = []
  // plain body behind the facade layer
  s.push({ box: [w, H, d - SZ - 0.02], at: [0, H / 2, -SZ / 2 - 0.01], color: wall })
  // ground floor: a shop front, a house door, or arches (palais)
  const shop = o.shop ?? (o.doorX === undefined ? r() < 0.7 : o.doorX === null)
  let ground: string[]
  if (style === 'palais') ground = Array.from({ length: n }, (_, i) => (i === Math.floor(n / 2) ? 'kfWindowDoorRound' : 'kfHighTopRound'))
  else if (shop) {
    const kind = r()
    if (kind < 0.45 && n >= 3) ground = ['kfLargeLeft', ...Array(n - 2).fill('kfLargeMiddle'), 'kfLargeRight']
    else if (kind < 0.75) ground = Array.from({ length: n }, (_, i) => (i === Math.floor(n / 2) ? 'kfDoorWindow' : 'kfAwnings'))
    else ground = Array.from({ length: n }, (_, i) => (i === n - 1 ? 'kfDoorWindowNarrow' : 'kfWindowLarge'))
  } else {
    const doorCol = o.doorX == null ? Math.floor(r() * n) : Math.max(0, Math.min(n - 1, Math.floor(((o.doorX + w / 2) / w) * n)))
    ground = Array.from({ length: n }, (_, i) => (i === doorCol ? 'kfDoorWindow' : 'kfWindowSill'))
  }
  if (!row(s, ground, w, 0, fz, sy, paint)) return null
  // upper floors: one window kind per house, a balcony now and then
  const upper = pick(r, UPPER[style])
  const balconyFloor = style === 'nachkrieg' ? -1 : r() < 0.6 ? 1 + Math.floor(r() * Math.max(1, floors - 2)) : -1
  for (let f = 1; f < floors; f++) {
    const names = Array.from({ length: n }, (_, i) => {
      if (f === balconyFloor && (n <= 2 ? i === 0 : i === Math.floor(n / 2) || (style === 'jugendstil' && i % 2 === 0))) return 'kfBalcony'
      return upper
    })
    row(s, names, w, f * fh, fz, sy, paint)
  }
  // the top
  if (style === 'nachkrieg') {
    const top = modelShapes('kfRoofFlatTop', { paint: () => '#8a8f96' })
    if (top) s.push({ group: top, at: [0, H, 0], scale: [w / 1.1, 1.4, d / 1.1] })
  } else if (style === 'giebel') {
    // a stepped gable to the street (old-town Bürgerhaus) over a short slanted roof
    const steps = 4
    const gh = w * 0.45
    for (let i = 0; i < steps; i++) {
      const sw = w * (1 - i / steps)
      s.push({ box: [sw, gh / steps, 0.4], at: [0, H + (gh / steps) * (i + 0.5), d / 2 - 0.2], color: wall })
      s.push({ box: [sw + 0.1, 0.1, 0.46], at: [0, H + (gh / steps) * (i + 1), d / 2 - 0.2], color: shadeLike(wall, '#e9c49a', '#f9d8b1') })
    }
    const rr = w / Math.sqrt(3) + 0.08
    s.push({ cyl: [rr, rr, d - 0.4, 3], at: [0, H + 0.5 * rr * 0.85, -0.2], rot: [-Math.PI / 2, 0, 0], scale: [1, 1, 0.85], color: roof })
  } else {
    // a full gable roof: slanted pieces from the eaves up to the ridge over the middle of the house, front (with
    // dormers) and back (turned round), so the roof also looks like a roof from the follow camera above
    const RH = style === 'palais' ? 2.4 : 3.0
    const rsy = RH / 0.782
    const sx = w / n
    for (let i = 0; i < n; i++) {
      const x = -w / 2 + sx * (i + 0.5)
      const front = modelShapes(style !== 'palais' && (i % 2 === 1 || n === 2) ? 'kfRoofSlantedWindow' : 'kfRoofSlanted', { paint })
      const back = modelShapes('kfRoofSlanted', { paint })
      if (front) s.push({ group: front, at: [x, H, d / 4], scale: [sx, rsy, d / 2] })
      if (back) s.push({ group: [{ group: back, scale: [sx, rsy, d / 2] }], at: [x, H, -d / 4], rot: [0, Math.PI, 0] })
    }
    if (r() < 0.55) {
      const ch = modelShapes('ktChimney', { paint: () => '#a5523f' })
      if (ch) s.push({ group: ch, at: [w * 0.25, H + RH * 0.6 - 0.15, -d * 0.2], scale: [2.4, 1.8, 2.4] })
    }
  }
  return s
}

export const MODULE_FLOOR = FH
