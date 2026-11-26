import { BufferGeometry, Float32BufferAttribute } from 'three'
import type { Vec3 } from '../../../data/config'
import type { ShapeItem } from './Shapes'

/**
 * 1.46: a Vietnamese temple / đình roof — a hip roof of terracotta tiles whose eaves sweep up at the four corners (đao
 * cong), a dark underside, a ridge with curled ends and a pearl. No open library has this shape (they are all
 * European or Japanese), so it is a height field: y = rise·(1 − m) + curl·corner, where m is the hip-roof distance from
 * the ridge (0 at the ridge, 1 at the eave) and `corner` grows only toward the four corners.
 * Local space: centred on `at`, y = at[1] at the eave line, length along x.
 */
export interface VnRoofOptions {
  /** Height of the ridge above the eaves. */
  rise?: number
  /** How far the corners curl up. */
  curl?: number
  overhang?: number
  color?: string
  under?: string
  ridge?: string
  /** Stacked tiers (each smaller, with a short wall between) — Ngọc Sơn's gate and hall have two. */
  tiers?: number
  wall?: string
  pearl?: string | false
}

const cache = new Map<string, [BufferGeometry, BufferGeometry]>()

function roofGeometry(w: number, d: number, rise: number, curl: number): [BufferGeometry, BufferGeometry] {
  const key = [w, d, rise, curl].map((v) => v.toFixed(2)).join('|')
  const hit = cache.get(key)
  if (hit) return hit
  const hl = w / 2
  const hd = d / 2
  const rl = Math.max(0, hl - hd * 0.85)
  const xs = new Set<number>()
  const NX = 18
  const NZ = 8
  for (let i = 0; i <= NX; i++) xs.add(+(-hl + (2 * hl * i) / NX).toFixed(4))
  xs.add(+(-rl).toFixed(4))
  xs.add(+rl.toFixed(4))
  const X = [...xs].sort((a, b) => a - b)
  const Z = Array.from({ length: NZ + 1 }, (_, i) => -hd + (2 * hd * i) / NZ)
  const height = (x: number, z: number) => {
    const ax = Math.abs(x)
    const az = Math.abs(z)
    const m = Math.min(1, Math.max(az / hd, hl > rl ? Math.max(0, ax - rl) / (hl - rl) : 0))
    const corner = (ax / hl) ** 4 * (az / hd) ** 1.5 + (az / hd) ** 4 * (ax / hl) ** 6 * 0.5
    return rise * (1 - m) + curl * Math.min(1.2, corner)
  }
  const top: number[] = []
  const under: number[] = []
  const T = 0.12
  for (let i = 0; i < X.length - 1; i++)
    for (let j = 0; j < NZ; j++) {
      const p = (x: number, z: number): Vec3 => [x, height(x, z), z]
      const a = p(X[i], Z[j])
      const b = p(X[i + 1], Z[j])
      const c = p(X[i + 1], Z[j + 1])
      const e = p(X[i], Z[j + 1])
      // split along the diagonal that follows the hip on each quarter (fewer kinks)
      const flip = X[i] + X[i + 1] > 0 !== Z[j] + Z[j + 1] > 0
      const tris = flip ? [a, e, b, b, e, c] : [a, e, c, a, c, b]
      for (const v of tris) top.push(...v)
      for (let k = tris.length - 1; k >= 0; k--) under.push(tris[k][0], tris[k][1] - T, tris[k][2])
    }
  const make = (arr: number[]) => {
    const g = new BufferGeometry()
    g.setAttribute('position', new Float32BufferAttribute(arr, 3))
    g.computeVertexNormals()
    return g
  }
  const out: [BufferGeometry, BufferGeometry] = [make(top), make(under)]
  cache.set(key, out)
  return out
}

/** One or more roof tiers as Shapes items in world space (`at` = centre of the lowest eave line). */
export function vnRoofShapes(at: Vec3, w: number, d: number, o: VnRoofOptions = {}): ShapeItem[] {
  const tiers = o.tiers ?? 1
  const color = o.color ?? '#b8573a'
  const s: ShapeItem[] = []
  let y = at[1]
  for (let t = 0; t < tiers; t++) {
    const k = 1 - t * 0.34
    const ov = o.overhang ?? 0.7
    const rw = w * k + ov * 2
    const rd = d * k + ov * 2
    const rise = (o.rise ?? Math.min(2.2, d * 0.42)) * (t === tiers - 1 ? 1 : 0.55)
    const curl = o.curl ?? Math.min(0.9, rd * 0.16)
    const [top, under] = roofGeometry(rw, rd, rise, curl)
    s.push({ geometry: top, at: [at[0], y, at[2]], color, grad: [0.82, 1.05] })
    s.push({ geometry: under, at: [at[0], y, at[2]], color: o.under ?? '#5b3427' })
    if (t < tiers - 1) {
      // the short wall between two tiers (where the name board of a gate hangs)
      s.push({ box: [w * k * 0.62, rise + 0.75, d * k * 0.5], at: [at[0], y + rise * 0.5 + 0.2, at[2]], color: o.wall ?? '#f2c46d' })
      y += rise + 0.55
      continue
    }
    // ridge with curled ends (rồng chầu, simplified) and the pearl in the middle
    const rl = Math.max(0.3, rw / 2 - (rd / 2) * 0.85)
    const ry = y + rise
    const ridge = o.ridge ?? '#7a4434'
    s.push({ box: [rl * 2 + 0.2, 0.26, 0.26], at: [at[0], ry + 0.08, at[2]], color: ridge })
    for (const side of [-1, 1]) {
      s.push({ torus: [0.26, 0.07, 6, 12, Math.PI * 1.3], at: [at[0] + side * (rl + 0.1), ry + 0.3, at[2]], rot: [0, Math.PI / 2, side > 0 ? 0.5 : 2.6], color: '#3f7d5c' })
      // little upturned tips at the four corners
      for (const sz of [-1, 1])
        s.push({ cyl: [0.02, 0.09, 0.5, 5], at: [at[0] + side * (rw / 2 - 0.05), y + curl * 1.1 + 0.12, at[2] + sz * (rd / 2 - 0.05)], rot: [sz * -0.45, 0, side * -0.75], color: ridge })
    }
    if (o.pearl !== false) s.push({ sphere: [0.2, 10, 8], at: [at[0], ry + 0.42, at[2]], color: o.pearl ?? '#f4c04e' })
  }
  return s
}
