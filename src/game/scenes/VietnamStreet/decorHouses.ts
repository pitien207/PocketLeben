import { PALETTE as P } from '../shared/palette'
import { place, plantShapes } from '../shared/props'
import type { ShapeItem } from '../shared/Shapes'

/**
 * Houses that are only there to be looked at (1.17, the north quarter): six styles of Hà Nội
 * street architecture, each a list of primitives in local space — the front faces +Z at
 * z = depth / 2, the footprint is centred on the origin. Everything is seeded, so the street
 * looks the same on every visit. All of them end up in ONE merged mesh (NorthQuarter.tsx).
 */

export type DecorStyle = 'colonial' | 'modern' | 'tapThe' | 'oldLow' | 'pastel' | 'hotel'

export function seeded(seed: number) {
  let a = (seed * 2654435761) >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Rng = () => number
const pick = <T,>(r: Rng, list: T[]) => list[Math.floor(r() * list.length)]

const TILE = '#c8653d'
const TILE_DARK = '#b4552f'
const SHUTTER_GREENS = ['#3f7d5c', '#4f8a8b', '#5d7a4a', '#2f6b6b']

/** Terracotta roof sloping down to the street, with a few ribs and a ridge. */
function tiledRoof(s: ShapeItem[], w: number, y: number, f: number, slope = 2.4, pitch = 0.42) {
  const rz = f - slope * 0.42
  s.push({ box: [w + 0.3, 0.12, slope], at: [0, y + 0.5, rz], rot: [pitch, 0, 0], color: TILE })
  const ribs = Math.max(4, Math.round(w / 0.5))
  for (let i = 0; i <= ribs; i++) s.push({ box: [0.09, 0.08, slope], at: [-w / 2 - 0.1 + (i * (w + 0.2)) / ribs, y + 0.57, rz], rot: [pitch, 0, 0], color: i % 2 ? TILE_DARK : '#c96a40' })
  s.push({ box: [w + 0.34, 0.16, 0.2], at: [0, y + 0.5 + Math.sin(pitch) * slope * 0.5 + 0.06, rz - Math.cos(pitch) * slope * 0.5], color: '#9c4628' })
}

/** A window with a frame; `shutters` adds two louvred leaves folded open beside it. */
function win(s: ShapeItem[], x: number, y: number, f: number, w: number, h: number, frame: string, glass: string, shutters?: string) {
  s.push({ box: [w + 0.14, h + 0.14, 0.05], at: [x, y, f + 0.01], color: frame })
  s.push({ box: [w, h, 0.06], at: [x, y, f + 0.02], color: glass })
  s.push({ box: [0.04, h, 0.07], at: [x, y, f + 0.025], color: frame })
  if (shutters) {
    for (const side of [-1, 1]) {
      s.push({ box: [w * 0.5, h, 0.05], at: [x + side * (w * 0.75 + 0.06), y, f + 0.03], color: shutters })
      for (let l = 0; l < 3; l++) s.push({ box: [w * 0.5 - 0.08, 0.03, 0.02], at: [x + side * (w * 0.75 + 0.06), y - h * 0.3 + l * h * 0.3, f + 0.06], color: frame })
    }
  }
}

/** A balcony slab with a simple railing. */
function balcony(s: ShapeItem[], x: number, y: number, f: number, w: number, slab: string, rail: string, deep = 0.7) {
  s.push({ box: [w, 0.12, deep], at: [x, y, f + deep / 2], color: slab })
  s.push({ box: [w, 0.06, 0.06], at: [x, y + 0.85, f + deep - 0.04], color: rail })
  const posts = Math.max(3, Math.round(w / 0.35))
  for (let i = 0; i <= posts; i++) s.push({ box: [0.035, 0.8, 0.035], at: [x - w / 2 + 0.04 + (i * (w - 0.08)) / posts, y + 0.45, f + deep - 0.04], color: rail })
  for (const side of [-1, 1]) s.push({ box: [0.05, 0.06, deep], at: [x + side * (w / 2 - 0.03), y + 0.85, f + deep / 2], color: rail })
}

/** French colonial town house: ochre walls, tall shuttered windows, white cornices, a slate mansard. */
function colonial(w: number, d: number, r: Rng): ShapeItem[] {
  const s: ShapeItem[] = []
  const floors = 2 + (r() < 0.5 ? 1 : 0)
  const FH = 3.2
  const H = floors * FH
  const f = d / 2
  const wall = pick(r, ['#f2c46d', '#e8b04a', '#f6e2a8', '#efc98a'])
  const shutter = pick(r, SHUTTER_GREENS)
  const trim = '#fff6e0'
  s.push({ box: [w, H, d], at: [0, H / 2, 0], color: wall })
  s.push({ box: [w + 0.06, 0.7, 0.06], at: [0, 0.35, f + 0.01], color: '#c9a56a' })
  // Pilasters at the corners
  for (const side of [-1, 1]) s.push({ box: [0.32, H, 0.1], at: [side * (w / 2 - 0.16), H / 2, f + 0.04], color: trim })
  const bays = Math.max(2, Math.floor((w - 0.6) / 1.7))
  const step = (w - 0.7) / bays
  const mid = (bays - 1) / 2
  for (let fl = 0; fl < floors; fl++) {
    const y0 = fl * FH
    s.push({ box: [w + 0.2, 0.2, 0.22], at: [0, y0 + FH - 0.05, f + 0.08], color: trim })
    for (let b = 0; b < bays; b++) {
      const x = (b - mid) * step
      const door = fl === 0 && Math.abs(b - mid) < 0.6
      if (door) {
        s.push({ box: [1.15, 2.5, 0.06], at: [x, 1.25, f + 0.02], color: trim })
        s.push({ box: [0.98, 2.3, 0.07], at: [x, 1.17, f + 0.03], color: '#5b4030' })
        s.push({ box: [0.03, 2.3, 0.08], at: [x, 1.17, f + 0.035], color: '#3a2a20' })
        s.push({ box: [1.5, 0.14, 0.5], at: [x, 0.07, f + 0.25], color: '#d9cdb5' })
      } else {
        win(s, x, y0 + 1.75, f, 0.62, 1.7, trim, '#5f7f8a', shutter)
        // little arch above
        s.push({ box: [0.9, 0.12, 0.08], at: [x, y0 + 2.72, f + 0.04], color: trim })
      }
    }
  }
  // Central balcony on the first floor
  balcony(s, 0, FH + 0.05, f, Math.min(w - 1.2, step * 1.4 + 0.6), trim, '#2c5c43', 0.6)
  // Mansard: stepped slate blocks with two dormers
  const slate = pick(r, ['#6b7280', '#7a6f6a', '#8a5a4a'])
  s.push({ box: [w + 0.3, 0.22, d + 0.3], at: [0, H + 0.11, 0], color: trim })
  s.push({ box: [w - 0.1, 0.9, d - 0.1], at: [0, H + 0.67, 0], color: slate })
  s.push({ box: [w - 1.0, 0.6, d - 1.0], at: [0, H + 1.42, 0], color: slate })
  s.push({ box: [w - 2.0, 0.2, d - 2.0], at: [0, H + 1.82, 0], color: '#565c68' })
  for (const side of [-1, 1]) {
    const x = side * (w * 0.24)
    s.push({ box: [0.8, 0.8, 0.3], at: [x, H + 0.72, f - 0.02], color: trim })
    s.push({ box: [0.5, 0.5, 0.31], at: [x, H + 0.7, f - 0.01], color: '#5f7f8a' })
    s.push({ box: [0.95, 0.12, 0.4], at: [x, H + 1.16, f - 0.02], color: slate })
  }
  return s
}

/** A new narrow house: white render, storey-high glass, a steel fin, a roof garden. */
function modern(w: number, d: number, r: Rng): ShapeItem[] {
  const s: ShapeItem[] = []
  const floors = 4 + (r() < 0.4 ? 1 : 0)
  const FH = 3.0
  const H = floors * FH
  const f = d / 2
  const wall = pick(r, ['#f4f4f0', '#e9e6df', '#3f444d', '#dfe7ea'])
  const dark = wall === '#3f444d'
  const accent = pick(r, ['#d98a45', '#3f7d8a', '#c8322b', '#8a9a5b'])
  const glass = '#8fc4d8'
  s.push({ box: [w, H, d], at: [0, H / 2, 0], color: wall })
  // Ground floor: garage roller door + a slim entrance
  s.push({ box: [w * 0.56, 2.3, 0.06], at: [-w * 0.16, 1.15, f + 0.02], color: '#9aa1ad' })
  for (let i = 0; i < 7; i++) s.push({ box: [w * 0.56, 0.03, 0.02], at: [-w * 0.16, 0.3 + i * 0.3, f + 0.06], color: '#7d8490' })
  s.push({ box: [0.9, 2.3, 0.06], at: [w * 0.3, 1.15, f + 0.02], color: dark ? '#c9a56a' : '#5b4030' })
  s.push({ box: [0.05, 0.4, 0.05], at: [w * 0.3 - 0.3, 1.2, f + 0.07], color: P.steel })
  s.push({ box: [w + 0.1, 0.16, 0.5], at: [0, 2.72, f + 0.2], color: dark ? '#2f333a' : '#d9d6cf' })
  for (let fl = 1; fl < floors; fl++) {
    const y = fl * FH
    s.push({ box: [w - 0.9, 2.2, 0.06], at: [-0.2, y + 1.4, f + 0.02], color: glass })
    for (let m = 0; m < 3; m++) s.push({ box: [0.05, 2.2, 0.08], at: [-0.2 - (w - 0.9) / 2 + (m * (w - 0.9)) / 2, y + 1.4, f + 0.03], color: dark ? '#22252b' : '#5d6170' })
    s.push({ box: [w - 0.9, 0.05, 0.08], at: [-0.2, y + 1.0, f + 0.03], color: dark ? '#22252b' : '#5d6170' })
    if (fl % 2 === 1) {
      // glass-railed balcony
      s.push({ box: [w - 0.7, 0.1, 0.6], at: [-0.2, y + 0.2, f + 0.3], color: dark ? '#2f333a' : '#e3e0d9' })
      s.push({ box: [w - 0.7, 0.7, 0.03], at: [-0.2, y + 0.6, f + 0.58], color: '#cfe8f0' })
    }
  }
  // The vertical fin
  s.push({ box: [0.3, H - 2.6, 0.5], at: [w / 2 - 0.25, 2.9 + (H - 2.6) / 2, f + 0.2], color: accent })
  // Roof garden under a pergola
  s.push({ box: [w, 0.5, 0.14], at: [0, H + 0.25, f - 0.07], color: wall })
  for (let i = 0; i < 4; i++) s.push({ box: [w - 0.4, 0.07, 0.1], at: [0, H + 2.1, f - 0.5 - i * 0.6], color: '#8e5a34' })
  for (const side of [-1, 1]) s.push({ box: [0.09, 2.1, 0.09], at: [side * (w / 2 - 0.3), H + 1.05, f - 0.5], color: '#8e5a34' })
  s.push(place(plantShapes(P.leafDark, '#e9e6df'), [-w / 2 + 0.7, H, f - 0.9], 0.3, 1.5))
  s.push(place(plantShapes(P.leaf, accent), [w / 2 - 0.8, H, f - 1.3], 1.2, 1.2))
  return s
}

/** Khu tập thể: an old apartment block, every flat with its own iron cage, washing and water tank. */
function tapThe(w: number, d: number, r: Rng): ShapeItem[] {
  const s: ShapeItem[] = []
  const floors = 4
  const FH = 2.75
  const H = floors * FH
  const f = d / 2
  const wall = pick(r, ['#e9d9a8', '#e3cf9c', '#d9d2b8'])
  s.push({ box: [w, H, d], at: [0, H / 2, 0], color: wall })
  // Rain streaks and patched render
  for (let i = 0; i < 7; i++) s.push({ box: [0.25 + r() * 0.5, 1 + r() * 2.5, 0.03], at: [-w / 2 + 0.4 + r() * (w - 0.8), H - 1 - r() * 3, f + 0.005], color: i % 2 ? '#cdbd8c' : '#bfb08a' })
  const bays = Math.max(3, Math.round(w / 2.3))
  const bw = w / bays
  const cages = ['#7fb0c9', '#9ccc9c', '#c98a5a', '#d9c36a', '#b9a3c9', '#8fa3ad']
  const cloth = ['#ff9fb2', '#a9d6ff', '#ffffff', '#ffe08a', '#a8e6cf', '#cdb8f0']
  for (let fl = 1; fl < floors; fl++) {
    const y = fl * FH
    for (let b = 0; b < bays; b++) {
      const x = -w / 2 + bw * (b + 0.5)
      // the stair bay in the middle stays open: slit windows
      if (b === Math.floor(bays / 2)) {
        for (let k = 0; k < 3; k++) s.push({ box: [bw * 0.4, 0.22, 0.05], at: [x, y + 0.6 + k * 0.6, f + 0.02], color: '#6e5658' })
        continue
      }
      const cage = pick(r, cages)
      s.push({ box: [bw - 0.5, 1.6, 0.05], at: [x, y + 1.35, f + 0.02], color: '#5a5560' })
      // "chuồng cọp": slab, roof sheet, bars
      s.push({ box: [bw - 0.25, 0.08, 0.8], at: [x, y + 0.5, f + 0.4], color: '#cfc8bb' })
      s.push({ box: [bw - 0.2, 0.05, 0.9], at: [x, y + 2.3, f + 0.42], rot: [0.12, 0, 0], color: cage })
      const bars = 5
      for (let k = 0; k <= bars; k++) s.push({ box: [0.03, 1.75, 0.03], at: [x - (bw - 0.3) / 2 + (k * (bw - 0.3)) / bars, y + 1.4, f + 0.78], color: cage })
      for (const yy of [0.75, 1.5]) s.push({ box: [bw - 0.3, 0.03, 0.03], at: [x, y + yy, f + 0.78], color: cage })
      for (const side of [-1, 1]) s.push({ box: [0.03, 1.75, 0.78], at: [x + side * (bw - 0.3) / 2, y + 1.4, f + 0.4], color: cage })
      // washing, a plant, sometimes an AC unit
      if (r() < 0.7) for (let k = 0; k < 3; k++) s.push({ box: [0.3, 0.4, 0.02], at: [x - 0.4 + k * 0.38, y + 1.85, f + 0.6], rot: [0, 0, (k % 2 ? 1 : -1) * 0.06], color: pick(r, cloth) })
      if (r() < 0.5) s.push(place(plantShapes(P.leaf, '#c97b63'), [x + bw * 0.25, y + 0.54, f + 0.5], r() * 3, 0.7))
      if (r() < 0.35) s.push({ box: [0.6, 0.4, 0.26], at: [x - bw * 0.2, y + 0.75, f + 0.5], color: '#f4f4f4' })
    }
  }
  // Ground floor: tiny shops with awnings and the dark stair entrance
  for (let b = 0; b < bays; b++) {
    const x = -w / 2 + bw * (b + 0.5)
    if (b === Math.floor(bays / 2)) {
      s.push({ box: [bw * 0.55, 2.3, 0.06], at: [x, 1.15, f + 0.02], color: '#4a3f42' })
      for (let k = 0; k < 4; k++) s.push({ box: [bw * 0.5, 0.1, 0.25], at: [x, 0.05 + k * 0.1, f + 0.5 - k * 0.12], color: '#cfc8bb' })
      continue
    }
    const aw = pick(r, ['#d4473b', '#3f7d8a', '#f4c04e', '#4f86d9', '#3fae72'])
    s.push({ box: [bw - 0.4, 2.2, 0.06], at: [x, 1.1, f + 0.02], color: r() < 0.5 ? '#6e5658' : '#9aa1ad' })
    s.push({ box: [bw - 0.2, 0.06, 1.0], at: [x, 2.45, f + 0.5], rot: [0.28, 0, 0], color: aw })
    s.push({ box: [bw - 0.2, 0.2, 0.03], at: [x, 2.24, f + 0.98], color: '#ffffff' })
    if (r() < 0.6) s.push({ box: [0.9, 0.8, 0.45], at: [x - 0.2, 0.4, f + 0.4], color: pick(r, ['#a9d6ff', '#ffffff', '#c49a6c']) })
  }
  // Roof: parapet, water tanks, an antenna
  s.push({ box: [w + 0.1, 0.4, d + 0.1], at: [0, H + 0.2, 0], color: '#d9cdb0' })
  for (let i = 0; i < 2; i++) {
    const x = -w / 4 + i * (w / 2)
    s.push({ cyl: [0.45, 0.45, 1.5, 12], at: [x, H + 1.25, -0.5], rot: [0, 0, Math.PI / 2], color: P.steel })
    for (const zs of [-1, 1]) s.push({ box: [1.3, 0.5, 0.07], at: [x, H + 0.6, -0.5 + zs * 0.3], color: P.darkSteel })
  }
  s.push({ cyl: [0.02, 0.02, 2.2, 4], at: [w / 2 - 0.8, H + 1.5, 0.5], color: P.darkSteel })
  for (let k = 0; k < 3; k++) s.push({ box: [0.9 - k * 0.2, 0.02, 0.02], at: [w / 2 - 0.8, H + 1.8 + k * 0.3, 0.5], color: P.darkSteel })
  return s
}

/** A low Old Quarter house: dark wooden front, two tiers of tiled roof, stepped gable walls, lanterns. */
function oldLow(w: number, d: number, r: Rng): ShapeItem[] {
  const s: ShapeItem[] = []
  const f = d / 2
  const H = 3.1
  const wood = pick(r, ['#6b4a32', '#7a5236', '#5b3f2c'])
  const wall = pick(r, ['#f1e3c0', '#e9d6a8', '#f6ead0'])
  s.push({ box: [w, H, d], at: [0, H / 2, 0], color: wall })
  // Wooden front: folding panels with a lattice transom
  s.push({ box: [w - 0.5, 2.5, 0.07], at: [0, 1.25, f + 0.02], color: wood })
  const panels = Math.max(4, Math.round((w - 0.5) / 0.6))
  for (let i = 0; i < panels; i++) {
    const x = -(w - 0.5) / 2 + ((i + 0.5) * (w - 0.5)) / panels
    const open = i === Math.floor(panels / 2)
    s.push({ box: [(w - 0.5) / panels - 0.08, 1.75, 0.03], at: [x, 0.95, f + 0.06], color: open ? '#3a2a20' : '#8a6040' })
    s.push({ box: [(w - 0.5) / panels - 0.08, 0.4, 0.03], at: [x, 2.2, f + 0.06], color: '#a8703f' })
  }
  s.push({ box: [w - 0.3, 0.14, 0.5], at: [0, 0.07, f + 0.25], color: '#bdb5a5' })
  // Lower roof over the front
  tiledRoof(s, w, H - 0.3, f + 0.5, 2.2, 0.5)
  // Attic block with a small shuttered window, then the upper roof
  s.push({ box: [w - 0.2, 1.7, d - 1.6], at: [0, H + 0.85, -0.8], color: wall })
  win(s, 0, H + 0.95, f - 1.62, 0.7, 0.7, wood, '#3a2a20')
  tiledRoof(s, w, H + 1.5, f - 1.5, 2.6, 0.5)
  // Stepped gable walls (đầu hồi bít đốc)
  for (const side of [-1, 1]) {
    for (let k = 0; k < 3; k++) s.push({ box: [0.26, 0.5, d - 0.6 - k * 1.6], at: [side * (w / 2 - 0.13), H + 0.25 + k * 0.5 + 1.0, -0.2 - k * 0.3], color: '#f6ead0' })
    s.push({ box: [0.3, 0.9, d], at: [side * (w / 2 - 0.15), H + 0.45, 0], color: '#f6ead0' })
  }
  // Red lanterns under the eave
  for (const x of [-w * 0.28, w * 0.28]) {
    s.push({ cyl: [0.008, 0.008, 0.3, 3], at: [x, 2.65, f + 0.9], color: P.wire })
    s.push({ sphere: [0.17, 8, 6], at: [x, 2.38, f + 0.9], scale: [1, 0.85, 1], color: '#d4473b' })
    s.push({ cyl: [0.05, 0.05, 0.05, 6], at: [x, 2.22, f + 0.9], color: '#f4c04e' })
  }
  return s
}

/** The everyday nhà ống: pastel paint, a balcony on every floor, a tank or a pediment on top. */
function pastel(w: number, d: number, r: Rng): ShapeItem[] {
  const s: ShapeItem[] = []
  const floors = 3 + (r() < 0.45 ? 1 : 0)
  const FH = 2.9
  const H = floors * FH
  const f = d / 2
  const wall = pick(r, ['#f0b9a0', '#cfe0c8', '#cfe0ee', '#f6d6de', '#e6dcf2', '#f6e7c4', '#d9ecd0', '#ffd9a8'])
  const trim = '#fffaf0'
  const rail = pick(r, ['#2c5c43', '#2f5f60', '#5b3a2a', '#4f5d75', '#8a4a4a'])
  const shutter = pick(r, [...SHUTTER_GREENS, '#8a5a3a', '#4f6fa8'])
  s.push({ box: [w, H, d], at: [0, H / 2, 0], color: wall })
  // Ground floor: closed roller shutter, or a wooden door and a barred window
  if (r() < 0.5) {
    s.push({ box: [w - 0.7, 2.3, 0.06], at: [0, 1.15, f + 0.02], color: pick(r, ['#9aa1ad', '#7fa3b8', '#b8a08a']) })
    for (let i = 0; i < 7; i++) s.push({ box: [w - 0.7, 0.03, 0.02], at: [0, 0.3 + i * 0.3, f + 0.06], color: '#6d7480' })
  } else {
    s.push({ box: [1.0, 2.2, 0.07], at: [-w * 0.2, 1.1, f + 0.02], color: '#6b4a32' })
    s.push({ box: [0.03, 2.2, 0.08], at: [-w * 0.2, 1.1, f + 0.03], color: '#3a2a20' })
    win(s, w * 0.22, 1.5, f, 0.9, 1.0, trim, '#5f7f8a')
    for (let k = 0; k < 4; k++) s.push({ box: [0.025, 1.0, 0.025], at: [w * 0.22 - 0.36 + k * 0.24, 1.5, f + 0.08], color: rail })
  }
  s.push({ box: [w + 0.1, 0.14, 0.4], at: [0, 2.6, f + 0.15], color: trim })
  for (let fl = 1; fl < floors; fl++) {
    const y = fl * FH
    balcony(s, 0, y, f, w - 0.2, trim, rail, 0.75)
    s.push({ box: [w * 0.4, 2.0, 0.06], at: [0, y + 1.15, f + 0.02], color: '#8fb8c8' })
    s.push({ box: [0.04, 2.0, 0.07], at: [0, y + 1.15, f + 0.025], color: trim })
    for (const side of [-1, 1]) s.push({ box: [w * 0.2, 2.0, 0.05], at: [side * w * 0.32, y + 1.15, f + 0.03], color: shutter })
    if (r() < 0.6) s.push(place(plantShapes(P.leaf, pick(r, ['#c97b63', '#d9b878', '#ffffff'])), [(r() < 0.5 ? -1 : 1) * (w / 2 - 0.45), y + 0.07, f + 0.42], r() * 3, 0.8))
    if (r() < 0.3) s.push({ box: [0.66, 0.44, 0.26], at: [w / 2 - 0.5, y + 2.45, f + 0.14], color: '#f4f4f4' })
  }
  // Top: pediment or a water tank
  s.push({ box: [w + 0.12, 0.5, 0.18], at: [0, H + 0.25, f - 0.09], color: trim })
  if (r() < 0.5) {
    s.push({ box: [w * 0.45, 0.4, 0.2], at: [0, H + 0.7, f - 0.09], color: trim })
    s.push({ cyl: [0.14, 0.14, 0.08, 10], at: [0, H + 0.7, f + 0.03], rot: [Math.PI / 2, 0, 0], color: wall })
  } else {
    s.push({ cyl: [0.45, 0.45, 1.5, 12], at: [0.2, H + 1.0, -d * 0.15], rot: [0, 0, Math.PI / 2], color: P.steel })
    for (const side of [-1, 1]) s.push({ box: [0.08, 0.55, 0.6], at: [0.2 + side * 0.55, H + 0.28, -d * 0.15], color: P.darkSteel })
  }
  return s
}

/** A mini hotel: tiled façade, rows of identical windows, a tall blade sign (no text) and a glass lobby. */
function hotel(w: number, d: number, r: Rng): ShapeItem[] {
  const s: ShapeItem[] = []
  const floors = 5 + (r() < 0.5 ? 1 : 0)
  const FH = 2.8
  const H = floors * FH
  const f = d / 2
  const wall = pick(r, ['#9fc7d8', '#d9b8c4', '#e8d9a0', '#b8d4b0'])
  const trim = '#ffffff'
  const blade = pick(r, ['#d4202a', '#2c5aa0', '#d98a2b'])
  s.push({ box: [w, H, d], at: [0, H / 2, 0], color: wall })
  // Glass lobby with a canopy
  s.push({ box: [w - 0.8, 2.3, 0.06], at: [0, 1.15, f + 0.02], color: '#bfe6f2' })
  for (const x of [-(w - 0.8) / 4, 0, (w - 0.8) / 4]) s.push({ box: [0.05, 2.3, 0.08], at: [x, 1.15, f + 0.03], color: '#c9a84a' })
  s.push({ box: [w - 0.2, 0.16, 1.1], at: [0, 2.6, f + 0.5], color: blade })
  s.push({ box: [w - 0.2, 0.3, 0.05], at: [0, 2.85, f + 1.02], color: '#ffe08a' })
  for (const side of [-1, 1]) s.push(place(plantShapes(P.leafDark, '#ffffff'), [side * (w / 2 - 0.45), 0, f + 0.5], side, 1.1))
  const cols = Math.max(2, Math.round((w - 1.2) / 1.5))
  for (let fl = 1; fl < floors; fl++) {
    const y = fl * FH
    s.push({ box: [w - 0.9, 0.1, 0.45], at: [-0.3, y + 0.25, f + 0.22], color: trim })
    s.push({ box: [w - 0.9, 0.45, 0.04], at: [-0.3, y + 0.5, f + 0.43], color: trim })
    for (let c = 0; c < cols; c++) {
      const x = -0.3 - (w - 1.4) / 2 + ((c + 0.5) * (w - 1.4)) / cols
      win(s, x, y + 1.55, f, 0.85, 1.25, trim, '#6f93a8')
    }
  }
  // Blade sign up the side, lit plates instead of letters
  s.push({ box: [0.5, H - 4.2, 0.22], at: [w / 2 - 0.3, 3.4 + (H - 4.2) / 2, f + 0.5], color: blade })
  const plates = Math.floor((H - 4.8) / 1.1)
  for (let i = 0; i < plates; i++) s.push({ box: [0.34, 0.7, 0.24], at: [w / 2 - 0.3, 4.1 + i * 1.1, f + 0.5], color: i % 2 ? '#ffe08a' : '#ffffff' })
  // Roof: a frame for a big sign, the lift house
  s.push({ box: [w + 0.1, 0.4, d + 0.1], at: [0, H + 0.2, 0], color: trim })
  s.push({ box: [2.0, 1.6, 2.0], at: [-w / 2 + 1.3, H + 1.2, -d / 2 + 1.4], color: wall })
  s.push({ box: [w - 1.0, 0.9, 0.1], at: [0.3, H + 1.3, f - 0.3], color: blade })
  for (const x of [-(w - 1.4) / 2 + 0.3, (w - 1.4) / 2 + 0.3]) s.push({ box: [0.08, 0.9, 0.08], at: [x, H + 0.6, f - 0.34], color: P.darkSteel })
  return s
}

const BUILDERS: Record<DecorStyle, (w: number, d: number, r: Rng) => ShapeItem[]> = { colonial, modern, tapThe, oldLow, pastel, hotel }

/** Preferred frontage of each style (metres), so wide styles are not squeezed into slivers. */
const WIDTHS: Record<DecorStyle, [number, number]> = {
  colonial: [6.2, 7.6],
  modern: [4.2, 5.0],
  tapThe: [9.0, 11.0],
  oldLow: [4.4, 5.6],
  pastel: [3.7, 4.5],
  hotel: [5.4, 6.4],
}
const ORDER: DecorStyle[] = ['pastel', 'colonial', 'oldLow', 'modern', 'pastel', 'tapThe', 'oldLow', 'hotel', 'colonial', 'pastel', 'modern']

export interface DecorLot {
  style: DecorStyle
  /** Centre of the frontage along the row, and its width. */
  x: number
  width: number
}

/** Split a row [x0, x1] into lots of mixed styles (never two of the same next to each other). */
export function planRow(x0: number, x1: number, seed: number): DecorLot[] {
  const r = seeded(seed)
  const lots: DecorLot[] = []
  let x = x0
  let i = Math.floor(r() * ORDER.length)
  while (x1 - x > 3.4) {
    let style = ORDER[i % ORDER.length]
    i++
    const left = x1 - x
    let [min, max] = WIDTHS[style]
    if (left < min) {
      // whatever fits: a narrow pastel house takes any gap ≥ 3.4 m
      style = 'pastel'
      ;[min, max] = [Math.min(left, 3.4), left]
    }
    let width = min + r() * (max - min)
    // never leave a sliver nobody can build on
    if (left - width < 3.4) width = left
    lots.push({ style, x: x + width / 2, width: width - 0.08 })
    x += width
  }
  return lots
}

export function decorHouse(style: DecorStyle, width: number, depth: number, seed: number): ShapeItem[] {
  const shapes = BUILDERS[style](width, depth, seeded(seed))
  // 1.23: about four in ten of the old houses have hoa giấy (bougainvillea) climbing the front.
  // Not on pastel lots (their sign hangs on the balcony) nor on the modern / hotel fronts.
  const r = seeded(seed * 7 + 3)
  if ((style === 'colonial' || style === 'tapThe' || style === 'oldLow') && r() < 0.42) shapes.push(...bougainvillea(width, depth / 2, r))
  return shapes
}

const BLOOMS = ['#e0457b', '#c2368f', '#f06aa0', '#d94f8c', '#f58cb6']
const LEAF = '#5f9e57'

/** Hoa giấy: a woody stem up one corner, a mass of magenta bracts along the first-floor cornice, a few trailing strands. */
function bougainvillea(w: number, f: number, r: Rng): ShapeItem[] {
  const s: ShapeItem[] = []
  const side = r() < 0.5 ? -1 : 1
  const x0 = side * (w / 2 - 0.25)
  const reach = Math.min(w * 0.55, 2.4)
  s.push({ cyl: [0.03, 0.045, 3.0, 5], at: [x0, 1.5, f + 0.1], color: '#6b4a32' })
  for (let j = 0; j < 4; j++) s.push({ ico: [0.13, 0], at: [x0 + (r() - 0.5) * 0.2, 0.9 + j * 0.55, f + 0.14], color: j % 2 ? LEAF : pick(r, BLOOMS) })
  const n = 10 + Math.floor(r() * 6)
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1)
    s.push({
      ico: [0.2 + r() * 0.16, 0],
      at: [x0 - side * t * reach, 3.2 + Math.sin(t * Math.PI) * 0.3 + (r() - 0.5) * 0.25, f + 0.12 + r() * 0.18],
      rot: [r() * 3, r() * 3, 0],
      color: i % 3 === 0 ? LEAF : pick(r, BLOOMS),
    })
  }
  for (let k = 0; k < 3; k++) {
    const x = x0 - side * (0.3 + r() * (reach - 0.3))
    for (let j = 0; j < 3; j++) s.push({ ico: [0.09 + r() * 0.05, 0], at: [x + (r() - 0.5) * 0.1, 2.95 - j * 0.22, f + 0.15], color: j === 2 ? LEAF : pick(r, BLOOMS) })
  }
  return s
}
