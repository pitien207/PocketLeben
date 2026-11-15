import { CapsuleGeometry, Color, Euler, LatheGeometry, Matrix4, Quaternion, Vector2, Vector3, type BufferGeometry } from 'three'
import type { Outfit } from '../../../data/npcs'
import type { ShapeItem } from '../../scenes/shared/Shapes'
import { lightness } from './face'
import { B, FORE, HEAD_R as R, SHIN, THIGH, UPPER } from './rig'

/**
 * Body parts of the chibi, per bone, in that bone's local space — the look of the user's
 * chibi.js (rounded lathe body, bangs in "lobes", side locks, its outfits and accessories)
 * rebuilt as plain shapes so a whole character still merges into one mesh.
 * The head sphere itself is not here: it is the separately textured face (ChibiModel).
 */

export type Carry = 'pole' | null
const WHITE = '#ffffff'
const shade = lightness
const _hsl = { h: 0, s: 0, l: 0 }
const isLight = (hex: string) => new Color(hex).getHSL(_hsl).l > 0.85
const v3 = (x: number, y: number, z: number): [number, number, number] => [x, y, z]

// --- Cached custom geometries -----------------------------------------------------------
const geoCache = new Map<string, BufferGeometry>()
function geo(key: string, make: () => BufferGeometry) {
  let g = geoCache.get(key)
  if (!g) {
    g = make()
    geoCache.set(key, g)
  }
  return g
}

/** Body width: wide enough that the shoulder joints (x ±0.24) sit on the body. */
const WIDTH = 2.45

/** Rounded body (lathe), hip at y = -0.22 of the torso bone, neck at +0.22. */
function torsoGeo(bulk: number) {
  return geo(`torso${bulk}`, () => {
    const p = [
      [0, 0], [0.055, 0.002], [0.083, 0.014], [0.094, 0.04], [0.096, 0.08],
      [0.092, 0.12], [0.088, 0.16], [0.084, 0.188], [0.07, 0.207], [0.04, 0.218], [0, 0.222],
    ].map(([r, y]) => new Vector2(r * WIDTH * bulk, y * 1.98 - 0.22))
    return new LatheGeometry(p, 20)
  })
}
/** Lathe radius of the body at a height (torso-local), for things wrapped around it. */
function torsoRadius(y: number, bulk = 1) {
  const pts = [[0, 0], [0.055, 0.002], [0.083, 0.014], [0.094, 0.04], [0.096, 0.08], [0.092, 0.12], [0.088, 0.16], [0.084, 0.188], [0.07, 0.207], [0.04, 0.218], [0, 0.222]]
  const t = (y + 0.22) / 1.98
  for (let i = 1; i < pts.length; i++) {
    if (t <= pts[i][1]) {
      const [r0, y0] = pts[i - 1]
      const [r1, y1] = pts[i]
      return (r0 + ((t - y0) / (y1 - y0)) * (r1 - r0)) * WIDTH * bulk
    }
  }
  return 0
}
const capsule = (r: number, len: number) => geo(`cap${r}_${len}`, () => new CapsuleGeometry(r, len, 4, 10))

/** Euler angles that turn +Z toward `dir` (for lobes of hair that face outward). */
const _m = new Matrix4()
const _q = new Quaternion()
const _e = new Euler()
function facing(dir: Vector3, twist = 0): [number, number, number] {
  _m.lookAt(dir.clone().multiplyScalar(3), new Vector3(), new Vector3(0, 1, 0))
  _q.setFromRotationMatrix(_m).multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), twist))
  _e.setFromQuaternion(_q)
  return [_e.x, _e.y, _e.z]
}

// --- Hair --------------------------------------------------------------------------------
function hair(o: Outfit, hat: boolean): ShapeItem[] {
  const c = o.hair
  const tie = o.hairTie ?? o.accent ?? '#e2574c'
  const style = o.hairStyle
  const s: ShapeItem[] = []
  // Cap: a sphere shifted up and back — leaves the face free, covers the crown and the nape.
  const capScale = style === 'bob' || style === 'long' ? 1.085 : style === 'buzz' ? 1.035 : 1.06
  s.push({ sphere: [R, 28, 18], at: v3(0, 0.06 * R, -0.13 * R), scale: [capScale, capScale, capScale], color: c })

  // Bangs: oval lobes hugging the forehead
  let bangs = style === 'elderBun' ? 3 : style === 'buzz' ? 0 : style === 'spiky' ? 4 : 5
  if (hat && (o.accessory === 'beanie' || o.accessory === 'helmet')) bangs = 0
  const spread = style === 'elderBun' ? 0.3 : 0.34
  for (let i = 0; i < bangs; i++) {
    const t = bangs === 1 ? 0 : i / (bangs - 1) - 0.5
    const az = t * spread * (bangs - 1)
    const el = 0.5 - Math.abs(t) * 0.12
    const dir = new Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el))
    s.push({
      sphere: [R * 0.3, 14, 10],
      at: dir.clone().multiplyScalar(R * 0.92).toArray() as [number, number, number],
      rot: facing(dir, -az * 0.5),
      scale: [1, 1.25 - Math.abs(t) * 0.3, 0.5],
      color: c,
    })
  }
  const side = (k: number): ShapeItem => ({ sphere: [R * 0.36, 14, 12], at: v3(k * R * 0.86, -R * 0.28, R * 0.12), rot: [0.15, 0, k * 0.12], scale: [0.55, 1.35, 0.7], color: c })
  const back = (): ShapeItem => ({ sphere: [R, 24, 14], at: v3(0, -R * 0.25, -R * 0.2), scale: [1.1, 0.85, 1], color: c })

  switch (style) {
    case 'short':
      if (!hat) s.push({ cyl: [0, R * 0.12, R * 0.35, 8], at: v3(R * 0.08, R * 1.08, R * 0.05), rot: [0.3, 0, -0.5], color: c })
      break
    case 'spiky':
      if (hat) break
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2
        const d = new Vector3(Math.sin(a) * 0.6, 0.8, Math.cos(a) * 0.6 - 0.25).normalize()
        const q = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), d)
        const e = new Euler().setFromQuaternion(q)
        s.push({ cyl: [0, R * 0.2, R * 0.5, 8], at: d.clone().multiplyScalar(R * 1.12).toArray() as [number, number, number], rot: [e.x, e.y, e.z], color: c })
      }
      break
    case 'bob':
      s.push(side(-1), side(1), back())
      break
    case 'long':
      s.push(side(-1), side(1), back())
      s.push({ geometry: capsule(R * 0.42, R * 0.9), at: v3(0, -R * 1.25, -R * 0.55), scale: [1.7, 1, 0.65], color: c })
      break
    case 'ponytail':
      s.push({ torus: [R * 0.09, R * 0.04, 6, 14], at: v3(0, R * 0.55, -R * 1.0), rot: [0.6, 0, 0], color: tie })
      s.push({ geometry: capsule(R * 0.2, R * 0.7), at: v3(0, R * 0.05, -R * 1.25), rot: [-0.35, 0, 0], scale: [1, 1, 0.85], color: c })
      break
    case 'twinBuns':
      for (const k of [-1, 1]) {
        s.push({ sphere: [R * 0.32, 14, 10], at: v3(k * R * 0.62, R * 0.86, -R * 0.15), color: c })
        s.push({ torus: [R * 0.16, R * 0.035, 6, 14], at: v3(k * R * 0.55, R * 0.7, -R * 0.12), rot: [Math.PI / 2 - 0.4, k * 0.6, 0], color: tie })
      }
      break
    case 'twin': // twin tails at the sides
      s.push(side(-1), side(1))
      for (const k of [-1, 1]) {
        s.push({ torus: [R * 0.12, R * 0.05, 6, 14], at: v3(k * R, R * 0.25, -R * 0.2), rot: [0, 0, Math.PI / 2], color: tie })
        s.push({ geometry: capsule(R * 0.2, R * 0.8), at: v3(k * R * 1.15, -R * 0.35, -R * 0.25), rot: [0, 0, k * 0.2], color: c })
      }
      break
    case 'bun':
    case 'elderBun':
      s.push({ sphere: [R * 0.36, 14, 10], at: v3(0, R * 0.62, -R * 0.82), color: c })
      if (style === 'elderBun') s.push({ cyl: [R * 0.02, R * 0.02, R * 0.9, 5], at: v3(0, R * 0.68, -R * 0.84), rot: [0, 0, 1.2], color: '#8a5a3a' })
      else s.push({ torus: [R * 0.2, R * 0.05, 6, 14], at: v3(0, R * 0.5, -R * 0.72), rot: [0.9, 0, 0], color: tie })
      break
    case 'braid':
      s.push(side(-1))
      for (let i = 0; i < 5; i++) s.push({ sphere: [R * 0.17, 10, 8], at: v3(R * 0.75, -R * (0.45 + i * 0.27), R * 0.1 - i * R * 0.04), scale: [1, 0.9, 1], color: c })
      s.push({ sphere: [R * 0.07, 8, 6], at: v3(R * 0.75, -R * 1.72, -R * 0.1), color: tie })
      break
    case 'curly':
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2
        if (Math.sin(a) > 0.55) continue // keep the face free
        s.push({ ico: [R * 0.32, 0], at: v3(Math.cos(a) * R * 0.9, R * 0.45, Math.sin(a) * R * 0.85 - R * 0.1), color: c })
      }
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2
        s.push({ ico: [R * 0.3, 0], at: v3(Math.cos(a) * R * 0.5, R * 0.95, Math.sin(a) * R * 0.5 - R * 0.1), color: c })
      }
      s.push(side(-1), side(1))
      break
    case 'buzz':
    default:
      break
  }
  return s
}

// --- Hats & face accessories ---------------------------------------------------------------
function accessory(o: Outfit): ShapeItem[] {
  const acc = o.accent
  switch (o.accessory) {
    case 'nonLa': // conical hat with a strap
      return [
        { cyl: [0.01, R * 1.55, R * 0.82, 20], at: v3(0, R * 1.19, -R * 0.1), rot: [-0.12, 0, 0], color: '#efd9a0' },
        { torus: [R * 0.9, 0.006, 3, 18, Math.PI * 2], at: v3(0, R * 1.05, -R * 0.12), rot: [Math.PI / 2 - 0.12, 0, 0], color: '#cdb47c' },
        { torus: [R * 0.55, 0.006, 3, 16, Math.PI * 2], at: v3(0, R * 1.32, -R * 0.13), rot: [Math.PI / 2 - 0.12, 0, 0], color: '#cdb47c' },
        { torus: [R * 0.95, 0.007, 3, 16, Math.PI], at: v3(0, -R * 0.15, R * 0.05), rot: [0, 0, Math.PI], color: acc ?? '#d6455a' },
      ]
    case 'helmet': {
      const col = acc ?? '#ffffff'
      return [
        { sphere: [R * 1.13, 22, 10, Math.PI * 0.52], at: v3(0, R * 0.3, -R * 0.06), scale: [1.04, 1, 1.04], color: col },
        { box: [R * 0.95, 0.012, R * 0.35], at: v3(0, R * 0.36, R * 1.08), rot: [0.25, 0, 0], color: '#2a2a2a' },
        { torus: [R * 1.12, 0.012, 4, 26], at: v3(0, R * 0.31, -R * 0.06), rot: [Math.PI / 2, 0, 0], scale: [1.04, 1.04, 1], color: shade(col, -0.2) },
      ]
    }
    case 'beanie': {
      const col = acc ?? '#d4473b'
      return [
        { sphere: [R * 1.1, 22, 10, Math.PI * 0.52], at: v3(0, R * 0.3, -R * 0.08), scale: [1.02, 1.05, 1.02], color: col },
        { torus: [R * 1.08, R * 0.1, 6, 26], at: v3(0, R * 0.3, -R * 0.08), rot: [Math.PI / 2, 0, 0], scale: [1.02, 1.02, 0.9], color: shade(col, -0.08) },
        { sphere: [R * 0.22, 10, 8], at: v3(0, R * 1.5, -R * 0.1), color: '#ffffff' },
      ]
    }
    case 'tyrolean': {
      const col = acc ?? '#4c5a46'
      return [
        { group: [
          { cyl: [R * 1.1, R * 1.1, 0.015, 22], color: col },
          { cyl: [R * 0.48, R * 0.66, R * 0.55, 16], at: v3(0, R * 0.27, 0), color: col },
          { cyl: [R * 0.67, R * 0.67, R * 0.12, 16], at: v3(0, R * 0.06, 0), color: '#2f3a2c' },
          { cyl: [0, R * 0.06, R * 0.75, 5], at: v3(R * 0.6, R * 0.45, -R * 0.1), rot: [0, 0, -0.5], color: '#e9e3d6' },
        ], at: v3(0, R * 0.92, -R * 0.06), rot: [-0.08, 0, 0.08] },
      ]
    }
    case 'glasses': {
      const fm = '#3a2b2e'
      return [
        ...[-1, 1].map((k): ShapeItem => ({ torus: [R * 0.27, 0.01, 4, 18], at: v3(k * R * 0.5, -R * 0.1, R * 0.97), rot: [0, k * 0.45, 0], color: fm })),
        { cyl: [0.007, 0.007, R * 0.18, 4], at: v3(0, -R * 0.12, R * 1.08), rot: [0, 0, Math.PI / 2], color: fm },
      ]
    }
    case 'sunglasses':
      return [
        ...[-1, 1].map((k): ShapeItem => ({ sphere: [R * 0.24, 12, 8], at: v3(k * R * 0.47, -R * 0.08, R * 0.93), rot: [0, k * 0.45, 0], scale: [1.15, 0.85, 0.3], color: '#2a2330' })),
        { box: [R * 0.3, 0.02, 0.02], at: v3(0, -R * 0.02, R * 1.0), color: '#2a2330' },
      ]
    case 'cap':
      return [
        { sphere: [R * 1.1, 22, 10, Math.PI / 2], at: v3(0, R * 0.25, -R * 0.08), rot: [-0.14, 0, 0], color: acc ?? '#4f86d9' },
        { cyl: [R * 0.58, R * 0.58, 0.03, 16], at: v3(0, R * 0.4, R * 0.92), rot: [0.22, 0, 0], scale: [1, 1, 1.35], color: shade(acc ?? '#4f86d9', -0.12) },
        { sphere: [R * 0.1, 6, 5], at: v3(0, R * 1.36, -R * 0.2), color: shade(acc ?? '#4f86d9', -0.12) },
      ]
    case 'beret':
      return [{ sphere: [R * 0.95, 18, 10], at: v3(R * 0.14, R * 0.86, -R * 0.08), rot: [0, 0, -0.18], scale: [1.12, 0.36, 1.12], color: acc ?? '#c8322b' }]
    case 'bow':
      return [
        { sphere: [R * 0.25, 10, 8], at: v3(R * 0.33, R * 1.05, -R * 0.17), rot: [0, 0, -0.5], scale: [1.2, 0.75, 0.45], color: acc ?? '#ff6f91' },
        { sphere: [R * 0.25, 10, 8], at: v3(R * 0.83, R * 0.83, -R * 0.17), rot: [0, 0, -0.5], scale: [1.2, 0.75, 0.45], color: acc ?? '#ff6f91' },
        { sphere: [R * 0.12, 8, 6], at: v3(R * 0.58, R * 0.94, -R * 0.12), color: shade(acc ?? '#ff6f91', -0.1) },
      ]
    case 'flowerCrown': {
      const s: ShapeItem[] = [{ torus: [R * 1.02, 0.02, 4, 20], at: v3(0, R * 0.62, -R * 0.1), rot: [Math.PI / 2 + 0.15, 0, 0], color: '#6fae5a' }]
      const colors = ['#ff9fb2', '#ffe08a', '#ffffff', '#cdb8f0', '#ff9b8f', '#a9d6ff', '#ffe08a']
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI / 2 + ((i - 3) / 6) * Math.PI * 1.25
        s.push({ ico: [R * 0.15, 0], at: v3(Math.cos(a) * R * 1.02, R * 0.62 - Math.sin(a) * R * 0.15, -Math.sin(a) * R * 1.02 - R * 0.1), color: colors[i] })
      }
      return s
    }
    case 'catEars':
      return [-1, 1].flatMap((k): ShapeItem[] => [
        { cyl: [0, R * 0.3, R * 0.55, 4], at: v3(k * R * 0.55, R * 1.15, -R * 0.06), rot: [0, Math.PI / 4, k * -0.35], color: acc ?? '#3d3540' },
        { cyl: [0, R * 0.17, R * 0.33, 4], at: v3(k * R * 0.54, R * 1.13, R * 0.04), rot: [0, Math.PI / 4, k * -0.35], color: '#ffb3c7' },
      ])
    case 'headphones':
      return [
        { torus: [R * 1.12, 0.03, 5, 16, Math.PI], at: v3(0, R * 0.1, -R * 0.05), color: '#3a3a44' },
        ...[-1, 1].map((k): ShapeItem => ({ cyl: [R * 0.3, R * 0.3, R * 0.25, 12], at: v3(k * R * 1.06, -R * 0.05, -R * 0.05), rot: [0, 0, Math.PI / 2], color: acc ?? '#ff9b8f' })),
      ]
    default:
      return []
  }
}

// --- Carried things -------------------------------------------------------------------------
export const GLASS: ShapeItem[] = [
  { cyl: [0.055, 0.045, 0.15, 10], at: [0, 0.06, 0], color: '#d8a24e' },
  { cyl: [0.058, 0.058, 0.02, 10], at: [0, 0.135, 0], color: '#f6e7c8' },
]
export const FAN: ShapeItem[] = [
  { cyl: [0.012, 0.012, 0.14, 5], at: [0, 0.05, 0], color: '#b98a64' },
  { cyl: [0.16, 0.16, 0.012, 14], at: [0, 0.2, 0], rot: [Math.PI / 2, 0, 0], scale: [1, 1, 0.75], color: '#ff9b8f' },
]
/** Đòn gánh: a bamboo pole on the right shoulder with a basket of bánh mì at each end. */
const POLE: ShapeItem[] = (() => {
  const s: ShapeItem[] = [{ cyl: [0.025, 0.025, 1.75, 6], at: [-0.22, 0.27, 0], rot: [Math.PI / 2, 0, 0], color: '#d9b878' }]
  for (const end of [-0.82, 0.82]) {
    s.push({ cyl: [0.006, 0.006, 0.48, 4], at: [-0.22, 0.03, end], color: '#7a6a5a' })
    s.push({ cyl: [0.25, 0.18, 0.2, 12], at: [-0.22, -0.28, end], color: '#d9b46b' })
    s.push({ cyl: [0.26, 0.26, 0.03, 12], at: [-0.22, -0.18, end], color: '#c49a55' })
    for (let i = 0; i < 3; i++) s.push({ sphere: [0.07, 8, 6], at: [-0.22 + (i - 1) * 0.11, -0.13, end + (i % 2) * 0.05], scale: [1, 0.8, 2.2], rot: [0, 0.6 * i, 0], color: '#e8a25a' })
  }
  return s
})()

// --- The whole body ---------------------------------------------------------------------------
/** Shapes per bone (bone-local). */
export function bodyParts(input: Outfit, carry: Carry): [number, ShapeItem[]][] {
  const top = input.top ?? 'tee'
  const longSleeves = top === 'long' || top === 'hoodie' || top === 'jacket' || top === 'aoDai' || top === 'puffer' || top === 'baba'
  const puffySleeves = top === 'dirndl'
  // A dress or dirndl brings its own skirt; an áo dài / bà ba is worn over wide trousers.
  const bottom = top === 'dress' ? 'skirt' : top === 'dirndl' ? 'dirndl' : top === 'aoDai' || top === 'baba' ? 'widePants' : (input.bottom ?? 'shorts')
  const o: Outfit = top === 'dress' ? { ...input, shorts: input.shirt } : input
  const bulk = top === 'puffer' ? 1.14 : top === 'hoodie' ? 1.05 : 1
  const shirt = o.shirt
  const pants = o.shorts
  const skin = o.skin
  const hat = !!o.accessory && ['nonLa', 'helmet', 'beanie', 'cap', 'tyrolean', 'beret'].includes(o.accessory)

  // ---- Head (hair, ears hidden by hair, hats, glasses). The face sphere is separate.
  const head: ShapeItem[] = [...hair(o, hat), ...accessory(o)]

  // ---- Torso
  const neckY = 0.205
  const torso: ShapeItem[] = [
    { geometry: torsoGeo(bulk), color: shirt },
    // neck
    { cyl: [0.06, 0.068, 0.09, 10], at: v3(0, 0.235, 0), color: skin },
  ]
  // Pants / skirt waist (pelvis)
  torso.push({ sphere: [0.18, 18, 12], at: v3(0, -0.205, 0), scale: [1.04 * bulk, 0.72, 0.88 * bulk], color: bottom === 'dirndl' ? pants : pants })

  // Prints
  if (o.pattern === 'stripes') {
    for (const y of [-0.13, -0.04, 0.05]) torso.push({ torus: [torsoRadius(y, bulk) + 0.003, 0.014, 4, 22], at: v3(0, y, 0), rot: [Math.PI / 2, 0, 0], color: o.patternColor ?? WHITE })
  } else if (o.pattern === 'flowers') {
    for (let i = 0; i < 14; i++) {
      const a = i * 2.39996
      const y = -0.15 + ((i * 0.37) % 1) * 0.28
      const r = torsoRadius(y, bulk)
      torso.push({ sphere: [0.022, 6, 4], at: v3(Math.sin(a) * r, y, Math.cos(a) * r), scale: [1, 1, 0.5], color: o.patternColor ?? '#f4d6e6' })
    }
  }

  // Collars & fronts
  const front = (y: number) => torsoRadius(y, bulk)
  switch (top) {
    case 'long':
      for (const k of [-1, 1]) torso.push({ box: [0.09, 0.022, 0.07], at: v3(k * 0.05, neckY - 0.01, 0.07), rot: [0.5, k * 0.5, k * 0.35], color: shade(shirt, 0.04) })
      for (let i = 0; i < 3; i++) torso.push({ sphere: [0.014, 6, 5], at: v3(0, 0.11 - i * 0.08, front(0.11 - i * 0.08) + 0.004), color: shade(shirt, -0.25) })
      break
    case 'hoodie':
      torso.push({ torus: [0.12, 0.05, 8, 16, Math.PI * 1.3], at: v3(0, neckY - 0.02, -0.024), rot: [Math.PI / 2 + 0.25, 0, Math.PI * 1.35], color: shirt })
      torso.push({ sphere: [0.12, 12, 8], at: v3(0, neckY - 0.04, -0.14), scale: [1.1, 0.7, 0.6], color: shade(shirt, -0.05) })
      torso.push({ box: [0.24, 0.1, 0.02], at: v3(0, -0.06, front(-0.06) + 0.004), rot: [-0.08, 0, 0], color: shade(shirt, -0.1) })
      for (const k of [-1, 1]) torso.push({ cyl: [0.006, 0.006, 0.11, 4], at: v3(k * 0.035, 0.13, front(0.13) + 0.012), color: WHITE })
      break
    case 'jacket':
      torso.push({ box: [0.09, 0.32, 0.02], at: v3(0, 0.04, front(0.04) - 0.004), color: '#fbfaf5' })
      for (const k of [-1, 1]) torso.push({ box: [0.045, 0.16, 0.02], at: v3(k * 0.06, 0.13, front(0.13) - 0.002), rot: [-0.15, 0, -k * 0.35], color: shade(shirt, -0.12) })
      break
    case 'puffer':
      torso.push({ torus: [0.09, 0.032, 6, 16], at: v3(0, neckY, 0), rot: [Math.PI / 2, 0, 0], color: shirt })
      for (let i = 0; i < 3; i++) torso.push({ torus: [torsoRadius(-0.12 + i * 0.11, bulk) * (1 - i * 0.02), 0.022, 5, 22], at: v3(0, -0.12 + i * 0.11, 0), rot: [Math.PI / 2, 0, 0], color: shirt })
      torso.push({ box: [0.012, 0.36, 0.012], at: v3(0, 0.0, front(0) + 0.02), color: shade(shirt, -0.3) })
      break
    case 'scrubs':
      torso.push({ box: [0.08, 0.1, 0.01], at: v3(0, 0.17, front(0.17) - 0.012), rot: [-0.2, 0, Math.PI / 4], color: skin })
      torso.push({ box: [0.07, 0.05, 0.01], at: v3(-0.08, 0.06, front(0.06) - 0.005), color: WHITE })
      torso.push({ box: [0.07, 0.014, 0.012], at: v3(-0.08, 0.08, front(0.08) - 0.004), color: '#4b8bd4' })
      torso.push({ box: [0.07, 0.065, 0.01], at: v3(0.08, 0.02, front(0.02) - 0.004), color: shade(shirt, -0.12) })
      break
    case 'aoDai':
    case 'baba':
      torso.push({ cyl: [0.075, 0.085, 0.07, 14], at: v3(0, neckY + 0.02, 0), color: shirt })
      torso.push({ box: [0.016, 0.15, 0.012], at: v3(0.07, 0.15, front(0.15) + 0.003), rot: [0, 0, 0.6], color: shade(shirt, -0.18) })
      if (top === 'aoDai') {
        // Front and back panels down to the shins
        torso.push({ box: [0.3, 0.38, 0.012], at: v3(0, -0.36, 0.165), rot: [0.1, 0, 0], color: shirt })
        torso.push({ box: [0.3, 0.38, 0.012], at: v3(0, -0.36, -0.165), rot: [-0.1, 0, 0], color: shirt })
      } else torso.push({ cyl: [front(-0.17) + 0.004, front(-0.17) + 0.03, 0.1, 18], at: v3(0, -0.19, 0), color: shirt })
      break
    case 'dirndl':
      // White blouse on top, laced bodice below
      torso.push({ sphere: [0.17, 14, 10], at: v3(0, 0.12, 0), scale: [1.12, 0.62, 0.98], color: o.patternColor ?? WHITE })
      for (let i = 0; i < 3; i++) {
        const y = 0.0 - i * 0.05
        torso.push({ box: [0.06, 0.008, 0.008], at: v3(0, y, front(y) + 0.004), rot: [0, 0, 0.6], color: '#e8c35a' })
        torso.push({ box: [0.06, 0.008, 0.008], at: v3(0, y, front(y) + 0.004), rot: [0, 0, -0.6], color: '#e8c35a' })
      }
      break
    case 'sleeveless':
      torso.push({ torus: [0.1, 0.018, 4, 16], at: v3(0, neckY, 0.01), rot: [Math.PI / 2, 0, 0], color: shade(shirt, -0.1) })
      break
    default: // tee / dress: round neckline
      torso.push({ torus: [0.085, 0.018, 4, 16], at: v3(0, neckY + 0.005, 0.01), rot: [Math.PI / 2, 0, 0], color: shade(shirt, -0.12) })
  }

  // Skirts
  if (bottom === 'skirt') torso.push({ cyl: [0.19, 0.31, 0.17, 18], at: v3(0, -0.245, 0), color: pants })
  if (bottom === 'dirndl') {
    torso.push({ cyl: [0.19, 0.34, 0.3, 20], at: v3(0, -0.31, 0), color: pants })
    torso.push({ box: [0.26, 0.3, 0.012], at: v3(0, -0.3, 0.27), rot: [-0.24, 0, 0], color: o.apron ?? '#f4c6cf' })
    torso.push({ torus: [0.19, 0.01, 4, 22], at: v3(0, -0.16, 0), rot: [Math.PI / 2, 0, 0], color: o.apron ?? '#f4c6cf' })
  }
  if (o.apron && bottom !== 'dirndl') {
    torso.push({ box: [0.28, 0.34, 0.012], at: v3(0, -0.3, front(-0.16) + 0.02), rot: [-0.1, 0, 0], color: o.apron })
    torso.push({ box: [0.2, 0.15, 0.012], at: v3(0, 0.0, front(0) + 0.006), rot: [-0.05, 0, 0], color: o.apron })
  }
  if (bottom === 'lederhosen') {
    const dark = shade(pants, -0.1)
    torso.push({ box: [0.16, 0.1, 0.02], at: v3(0, -0.21, 0.16), rot: [-0.15, 0, 0], color: dark })
    for (const k of [-1, 1]) {
      torso.push({ box: [0.035, 0.38, 0.016], at: v3(k * 0.09, 0.0, front(0) + 0.006), rot: [-0.06, 0, 0], color: pants })
      torso.push({ box: [0.035, 0.38, 0.016], at: v3(k * 0.09, 0.0, -front(0) - 0.006), rot: [0.06, 0, 0], color: pants })
    }
    torso.push({ box: [0.2, 0.04, 0.016], at: v3(0, 0.07, front(0.07) + 0.01), color: pants })
  }

  // Neck things
  if (o.neck === 'scarf') {
    const c = o.neckColor ?? '#d4473b'
    torso.push({ torus: [0.11, 0.045, 8, 18], at: v3(0, neckY + 0.005, 0.008), rot: [Math.PI / 2 - 0.1, 0, 0], color: c })
    torso.push({ box: [0.075, 0.22, 0.03], at: v3(0.075, 0.09, front(0.1) + 0.03), rot: [-0.15, 0, 0.1], color: c })
  } else if (o.neck === 'tie') {
    const c = o.neckColor ?? '#2c5aa0'
    torso.push({ box: [0.045, 0.035, 0.03], at: v3(0, 0.19, front(0.19) + 0.01), color: c })
    torso.push({ box: [0.05, 0.2, 0.018], at: v3(0, 0.07, front(0.07) + 0.012), rot: [-0.08, 0, 0], color: c })
  } else if (o.neck === 'redScarf') {
    torso.push({ torus: [0.1, 0.017, 5, 18], at: v3(0, neckY + 0.005, 0.008), rot: [Math.PI / 2 - 0.1, 0, 0], color: '#d8262f' })
    for (const k of [-1, 1]) torso.push({ cyl: [0.038, 0, 0.14, 3], at: v3(k * 0.026, 0.1, front(0.1) + 0.02), rot: [0, 0, k * 0.25], color: '#d8262f' })
  }

  // Backpack (rounded-ish: a box with a front pocket and straps)
  if (o.bag) {
    torso.push(
      { box: [0.3, 0.34, 0.14], at: v3(0, 0.0, -0.24), color: o.bag },
      { box: [0.22, 0.14, 0.06], at: v3(0, -0.08, -0.32), color: shade(o.bag, -0.12) },
      { box: [0.3, 0.05, 0.15], at: v3(0, 0.17, -0.24), color: shade(o.bag, 0.08) },
      ...[-1, 1].map((k): ShapeItem => ({ torus: [0.12, 0.016, 4, 12, Math.PI], at: v3(k * 0.1, 0.1, -0.06), rot: [0, Math.PI / 2, 0], color: shade(o.bag!, -0.2) })),
    )
  }
  if (carry === 'pole') torso.push(...POLE)

  // ---- Arms
  const sleeve = top === 'sleeveless' ? skin : shirt
  const upperArm: ShapeItem[] = [
    { sphere: [0.062, 10, 8], at: v3(0, -0.01, 0), color: top === 'sleeveless' ? skin : sleeve },
    { cyl: [0.05, 0.047, UPPER, 8], at: v3(0, -UPPER / 2, 0), color: longSleeves ? sleeve : skin },
  ]
  if (puffySleeves) upperArm.push({ sphere: [0.09, 12, 8], at: v3(0, -0.035, 0), scale: [1, 0.9, 1], color: o.patternColor ?? WHITE })
  else if (top === 'tee' || top === 'dress' || top === 'scrubs') upperArm.push({ cyl: [0.068, 0.066, 0.075, 10], at: v3(0, -0.035, 0), color: sleeve })
  else if (longSleeves) upperArm.push({ cyl: [0.06, 0.057, UPPER, 8], at: v3(0, -UPPER / 2, 0), color: sleeve })
  const forearm = (side: number): ShapeItem[] => [
    { sphere: [0.048, 8, 6], color: longSleeves ? sleeve : skin },
    { cyl: [0.047, 0.044, FORE - 0.04, 8], at: v3(0, -(FORE - 0.04) / 2, 0), color: longSleeves ? sleeve : skin },
    ...(longSleeves ? [{ cyl: [0.054, 0.054, 0.03, 10], at: v3(0, -FORE + 0.06, 0), color: shade(sleeve, -0.1) } as ShapeItem] : []),
    // Round hand with a thumb
    { sphere: [0.062, 12, 8], at: v3(0, -FORE, 0), scale: [0.95, 1.05, 1], color: skin },
    { sphere: [0.026, 8, 6], at: v3(-side * 0.035, -FORE + 0.012, 0.045), color: skin },
  ]

  // ---- Legs
  const pantsLeg = bottom === 'pants' || bottom === 'widePants'
  const thighColor = bottom === 'skirt' || bottom === 'dirndl' ? skin : pants
  const shinColor = pantsLeg ? pants : skin
  const thigh: ShapeItem[] = [
    { sphere: [0.07, 10, 8], color: thighColor },
    bottom === 'widePants'
      ? { cyl: [0.08, 0.088, THIGH + 0.02, 10], at: v3(0, -THIGH / 2, 0), color: pants }
      : { cyl: [bottom === 'shorts' || bottom === 'lederhosen' ? 0.082 : 0.07, bottom === 'shorts' || bottom === 'lederhosen' ? 0.078 : 0.066, THIGH + 0.02, 10], at: v3(0, -THIGH / 2, 0), color: thighColor },
  ]
  if (bottom === 'lederhosen') thigh.push({ cyl: [0.083, 0.083, 0.02, 10], at: v3(0, -THIGH + 0.01, 0), color: shade(pants, -0.15) })
  const shin: ShapeItem[] = [
    { sphere: [pantsLeg ? 0.07 : 0.06, 10, 8], color: shinColor },
    bottom === 'widePants'
      ? { cyl: [0.088, 0.1, SHIN, 10], at: v3(0, -SHIN / 2, 0), color: pants }
      : { cyl: [pantsLeg ? 0.07 : 0.058, pantsLeg ? 0.068 : 0.054, SHIN, 10], at: v3(0, -SHIN / 2, 0), color: shinColor },
  ]
  if (o.socks || bottom === 'lederhosen') shin.push({ cyl: [0.062, 0.06, SHIN * 0.75, 10], at: v3(0, -SHIN * 0.55, 0), color: o.socks ?? '#efe6d8' })
  // Shoes
  const shoe = o.shoe
  switch (o.shoeType ?? 'sneaker') {
    case 'sandal':
      shin.push(
        { sphere: [0.07, 10, 8], at: v3(0, -SHIN - 0.005, 0.03), scale: [0.95, 0.55, 1.35], color: skin },
        { box: [0.13, 0.025, 0.2], at: v3(0, -SHIN - 0.04, 0.03), color: shoe },
        { box: [0.14, 0.03, 0.06], at: v3(0, -SHIN - 0.01, 0.06), color: shade(shoe, -0.1) },
      )
      break
    case 'boot':
      shin.push(
        { cyl: [0.075, 0.08, 0.12, 10], at: v3(0, -SHIN + 0.02, 0), color: shoe },
        { sphere: [0.088, 12, 8], at: v3(0, -SHIN - 0.01, 0.03), scale: [1, 0.6, 1.38], color: shoe },
      )
      break
    case 'loafer':
      shin.push({ sphere: [0.085, 12, 8], at: v3(0, -SHIN - 0.01, 0.03), scale: [0.95, 0.55, 1.36], color: shoe })
      break
    default:
      shin.push(
        { sphere: [0.088, 12, 8], at: v3(0, -SHIN - 0.005, 0.03), scale: [0.95, 0.6, 1.36], color: shoe },
        { box: [0.15, 0.028, 0.22], at: v3(0, -SHIN - 0.045, 0.03), color: isLight(shoe) ? '#cfc8bc' : '#f4f1ea' },
      )
  }

  return [
    [B.head, head],
    [B.torso, torso],
    [B.thighL, thigh],
    [B.thighR, thigh],
    [B.shinL, shin],
    [B.shinR, shin],
    [B.armL, upperArm],
    [B.armR, upperArm],
    [B.foreL, forearm(1)],
    [B.foreR, forearm(-1)],
    [B.glass, GLASS],
    [B.fan, FAN],
  ]
}

/** Default eye colour (warm brown). */
export const DEFAULT_EYES = '#5a3424'
