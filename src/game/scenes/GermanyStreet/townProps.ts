import type { ShapeItem } from '../shared/Shapes'
import { modelShapes, type Paint } from '../shared/models'
import { place } from '../shared/props'
import type { FountainSpec } from '../shared/FountainWater'

/**
 * 1.45 Street furniture of München from library models instead of hand-built boxes:
 * Kenney *Fantasy Town Kit* (CC0, pack "town": stalls, benches, fountains, lanterns, carts, hedges) and KayKit
 * *Restaurant Bits* (CC0, pack "food": vegetable crates for the market). Every helper returns null while its pack is
 * missing (callers keep their old shapes). Kenney's stone is blue-grey: it is repainted to Munich's warm limestone.
 */

const rgb = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
const lum = ([r, g, b]: number[]) => 0.299 * r + 0.587 * g + 0.114 * b
const toHex = (c: number[]) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')
const shadeLike = (base: string, own: string, ref: string) => {
  const k = lum(rgb(own)) / lum(rgb(ref))
  return toHex(rgb(base).map((v) => v * k))
}
const isStone = ([r, g, b]: number[]) => b > r + 12 && b > g && lum([r, g, b]) < 215

/** Blue-grey stone → warm limestone, water → a deep pool colour (the ripple layer of FountainWater lies on it). */
export const STONE_PAINT: Paint = (mat, color) => {
  if (mat === 'water') return '#4f97ad'
  // everything else (Kenney's little coloured bits round the spout) becomes stone too
  return isStone(rgb(color)) ? shadeLike('#d9cdb4', color, '#8a90ad') : '#cfc3a8'
}

/** Wood (Kenney's orange-brown) → a darker, more natural wood. */
const woodPaint =
  (wood: string, canopy?: string): Paint =>
  (_mat, color) => {
    const c = rgb(color)
    const [r, g, b] = c
    if (canopy && (g > r + 20 || (r > 200 && g < 110))) return shadeLike(canopy, color, g > r ? '#57b69f' : '#e2505b')
    if (r > 150 && g > 100 && g < 160 && b < 120) return shadeLike(wood, color, '#c88463')
    if (isStone(c)) return shadeLike('#d9cdb4', color, '#8a90ad')
    return color
  }

const CRATES = ['crateCarrots', 'crateOnions', 'crateTomatoes', 'crateLettuce', 'cratePotatoes', 'crateBuns']

/** A Viktualienmarkt stall (Kenney stall with a canopy) with crates of vegetables on its counter. Front = +z. */
export function kStall(seed: number, canopy: 'green' | 'red', canopyColor?: string): ShapeItem[] | null {
  const m = modelShapes(canopy === 'green' ? 'ktStallGreen' : 'ktStallRed', { paint: woodPaint('#9a6a44', canopyColor) })
  if (!m) return null
  const s: ShapeItem[] = [{ group: m, scale: [2.8, 2.5, 2.4] }]
  for (let i = 0; i < 3; i++) {
    const c = modelShapes(CRATES[(seed + i * 2) % CRATES.length], { height: 0.3, maxWidth: 0.75 })
    if (c) s.push(place(c, [-0.85 + i * 0.85, 0.92, 0.55], (i - 1) * 0.15))
  }
  return s
}

/** A beer-garden set: a long table and two benches (Kenney), length along X. */
export function kBeerTable(): ShapeItem[] | null {
  const paint = woodPaint('#b08a5a')
  const t = modelShapes('ktStall', { paint })
  const b = modelShapes('ktStallBench', { paint })
  if (!t || !b) return null
  const s: ShapeItem[] = [
    place([{ group: t, scale: [1.0, 2.05, 2.2] }], [0, 0, 0], Math.PI / 2),
    place([{ group: b, scale: [1.2, 2.0, 2.3] }], [0, 0, -0.62], Math.PI / 2),
    place([{ group: b, scale: [1.2, 2.0, 2.3] }], [0, 0, 0.62], Math.PI / 2),
  ]
  // two Maß on the table
  for (const [x, z] of [
    [-0.5, 0.06],
    [0.45, -0.1],
  ]) {
    s.push({ cyl: [0.065, 0.055, 0.2, 8], at: [x, 0.86, z], color: '#f2d27a' })
    s.push({ cyl: [0.068, 0.068, 0.05, 8], at: [x, 0.98, z], color: '#ffffff' })
  }
  return s
}

/** The old-style street lantern (Kenney), dark green, 4.2 m. The glowing head is added by the caller. */
export function kLantern(): ShapeItem[] | null {
  const m = modelShapes('ktLantern', { height: 4.2, paint: (_m, c) => (lum(rgb(c)) > 200 ? '#fff2c8' : shadeLike('#2f4a40', c, '#747990')) })
  return m
}
export const LANTERN_HEAD = 3.75

/** A round stone fountain (Kenney fountain-round-detail) of radius r, and its water for FountainWater. */
export function kFountain(r: number): ShapeItem[] | null {
  const m = modelShapes('ktFountainDetail', { paint: STONE_PAINT })
  if (!m) return null
  return [{ group: m, scale: [r, 1.6, r] }]
}
export const fountainWater = (x: number, z: number, r: number): FountainSpec => ({ x, z, basinY: 0.25, basinR: r * 0.9, bowlY: 0.63, bowlR: r * 0.26, topY: 0.8, jet: 0.9 + r * 0.15 })

/** A market cart with crates. */
export function kCart(seed: number): ShapeItem[] | null {
  const m = modelShapes('ktCart', { paint: woodPaint('#8a5a3a') })
  if (!m) return null
  const s: ShapeItem[] = [{ group: m, scale: [1.6, 1.6, 1.6] }]
  const c = modelShapes(CRATES[seed % CRATES.length], { height: 0.3, maxWidth: 0.7 })
  if (c) s.push(place(c, [0, 0.62, 0.1], 0.2))
  return s
}

/** A clipped hedge, `len` metres along X (Kenney hedge-large pieces, 1 unit each). */
export function kHedge(len: number): ShapeItem[] | null {
  const n = Math.max(1, Math.round(len / 1.6))
  // the planter's stone gets warm, the leaves stay green
  const piece = modelShapes('ktHedgeLarge', { paint: (_m, c) => (isStone(rgb(c)) ? shadeLike('#d9cdb4', c, '#8a90ad') : c) })
  if (!piece) return null
  const k = len / n
  const s: ShapeItem[] = []
  for (let i = 0; i < n; i++) s.push(place([{ group: piece, scale: [2, 1.6, k] }], [-len / 2 + k * (i + 0.5), 0, 0], Math.PI / 2))
  return s
}

/** A Bavarian flag on a white pole: a Kenney banner repainted blue or white (faces ±z). */
export function kFlagPole(blue: boolean): ShapeItem[] | null {
  const m = modelShapes('ktBannerRed', { paint: (_mat, c) => (parseInt(c.slice(1, 3), 16) > 150 && parseInt(c.slice(3, 5), 16) < 120 ? (blue ? '#3f7fc8' : '#f6f6f2') : '#d8d8d8') })
  if (!m) return null
  return [
    { cyl: [0.06, 0.08, 6.5, 8], at: [0, 3.25, 0], color: '#f2f2ee' },
    { sphere: [0.12, 8, 6], at: [0, 6.55, 0], color: '#e8c35a' },
    place([{ group: m, scale: [3, 3.6, 3] }], [0, 3.3, 0], Math.PI / 2),
  ]
}
