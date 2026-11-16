import { BufferGeometry, Color, Euler, ExtrudeGeometry, Float32BufferAttribute, Matrix4, Quaternion, Shape, Uint16BufferAttribute, Vector3 } from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { Outfit } from '../../../data/npcs'
import type { ShapeItem } from '../../scenes/shared/Shapes'
import { lightness as shade } from './face'
import { clamp01, grid, lerp, segs, smooth, sweep, type P3 } from './geom'
import { B, BIND, SHIN } from './rig'

/**
 * Clothes that sit on the body instead of being boxes stuck onto it:
 * - the torso is a garment lathe (shirt down to its hem, with a real lip) over a pelvis lathe
 *   (shorts / trousers), both slightly oval like a body;
 * - collars, plackets, pockets, lapels, aprons, straps and ties are patches cut out of the body
 *   surface (they follow its curve), with a little thickness;
 * - arms and legs are ONE continuous tube each, skinned to both bones with a soft blend at the
 *   elbow / knee, so a sleeve or a trouser leg is part of the limb: sleeve hems, cuffs and socks
 *   are bands of that tube with a lip, nothing floats;
 * - skirts are flared lathes with pleats and an inside; shoes have soles with rounded edges.
 * Torso pieces are in torso-bone space (origin at the waist, y −0.22 … +0.22).
 */

/** Depth of the body relative to its width (a slightly oval body). */
export const SZ = 0.9

const PROFILE = [[0, 0], [0.055, 0.002], [0.083, 0.014], [0.094, 0.04], [0.096, 0.08], [0.092, 0.12], [0.088, 0.16], [0.084, 0.188], [0.07, 0.207], [0.04, 0.218], [0, 0.222]]
const WIDTH = 2.45
/** Radius of the bare body at a height (torso space). */
export function bodyR(y: number, bulk = 1) {
  const t = (y + 0.22) / 1.98
  if (t <= 0) return 0.096 * WIDTH * bulk * 0.98
  for (let i = 1; i < PROFILE.length; i++) {
    if (t <= PROFILE[i][1]) {
      const [r0, y0] = PROFILE[i - 1]
      const [r1, y1] = PROFILE[i]
      return (r0 + ((t - y0) / (y1 - y0)) * (r1 - r0)) * WIDTH * bulk
    }
  }
  return 0
}
/** Point at angle a (0 = front, π/2 = left side) and height y, r from the axis (oval). */
export const around = (a: number, y: number, r: number): P3 => [Math.sin(a) * r, y, Math.cos(a) * r * SZ]

const geoCache = new Map<string, BufferGeometry>()
function cached(key: string, make: () => BufferGeometry) {
  let g = geoCache.get(key)
  if (!g) {
    g = make()
    geoCache.set(key, g)
  }
  return g
}

const _m = new Matrix4()
const _q = new Quaternion()
const _e = new Euler()
/** Euler angles that turn +Z toward `dir`. */
export function facing(dir: Vector3, twist = 0): P3 {
  _m.lookAt(dir.clone().multiplyScalar(3), new Vector3(), new Vector3(0, 1, 0))
  _q.setFromRotationMatrix(_m).multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), twist))
  _e.setFromQuaternion(_q)
  return [_e.x, _e.y, _e.z]
}

// --- Lathes ---------------------------------------------------------------------------------
/**
 * Lathe through `profile` given TOP to BOTTOM as [r, y]; oval like the body. `pleats` folds the
 * cloth (count, depth by y); `inside` builds the reverse surface instead (the inside of a skirt).
 */
function lathe(profile: [number, number][], radial: number, pleats?: { n: number; depth: (y: number) => number }, inside = false) {
  return grid(radial, profile.length - 1, (u, _v, _i, j) => {
    const [r, y] = profile[j]
    const a = u * Math.PI * 2
    let rr = r
    if (pleats) {
      const x = u * pleats.n
      rr *= 1 + pleats.depth(y) * (Math.abs(x - Math.floor(x) - 0.5) * 2 - 0.5)
    }
    return around(a, y, rr)
  }, true, inside)
}
/** A soft round band (like a rib collar or a waistband) around the body at height y. */
function ring(r: number, y: number, tube: number, radial: number, tall = 1) {
  const p: [number, number][] = []
  const n = radial >= 20 ? 6 : 3
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI
    p.push([r + Math.sin(t) * tube, y + Math.cos(t) * tube * tall])
  }
  return lathe(p, radial)
}

// --- Patches on the body ------------------------------------------------------------------
interface PatchSpec {
  /** Top and bottom heights. */
  top: number
  bottom: number
  /** Left / right edge as distance along the surface from the centre line, by height. */
  left: (y: number) => number
  right: (y: number) => number
  /** Centre line angle: 0 = front, π = back. */
  centre?: number
  /** Surface radius by height (default: the body) and height above it. */
  surf?: (y: number) => number
  lift?: number
  /** Puff in the middle (pockets). */
  puff?: number
  thick?: number
  nu?: number
  nv?: number
}
/** A piece of cloth cut out of a surface of revolution, with an edge (two layers + rim). */
function patch(p: PatchSpec): BufferGeometry {
  const nu = p.nu ?? 6
  const nv = p.nv ?? 6
  const surf = p.surf ?? ((y: number) => bodyR(y))
  const c = p.centre ?? 0
  const thick = p.thick ?? 0.006
  const at = (u: number, v: number, depth: number): P3 => {
    const y = lerp(p.top, p.bottom, v)
    const s = lerp(p.left(y), p.right(y), u)
    const puff = (p.puff ?? 0) * Math.sin(Math.PI * u) * Math.sin(Math.PI * v)
    const r = surf(y) + (p.lift ?? 0.003) + puff - depth
    return around(c + s / Math.max(0.03, surf(y)), y, r)
  }
  const outer = grid(nu, nv, (u, v) => at(u, v, 0), false)
  const inner = grid(nu, nv, (u, v) => at(u, v, thick), false, true)
  // rim: walk the border, a quad strip between the layers (both windings: it is very thin)
  const border: [number, number][] = []
  for (let i = 0; i < nu; i++) border.push([i / nu, 0])
  for (let j = 0; j < nv; j++) border.push([1, j / nv])
  for (let i = nu; i > 0; i--) border.push([i / nu, 1])
  for (let j = nv; j > 0; j--) border.push([0, j / nv])
  const pos: number[] = []
  for (let i = 0; i < border.length; i++) {
    const [u0, v0] = border[i]
    const [u1, v1] = border[(i + 1) % border.length]
    const a = at(u0, v0, 0)
    const b = at(u1, v1, 0)
    const cc = at(u0, v0, thick)
    const d = at(u1, v1, thick)
    pos.push(...a, ...cc, ...b, ...b, ...cc, ...d, ...a, ...b, ...cc, ...b, ...d, ...cc)
  }
  const rim = new BufferGeometry()
  rim.setAttribute('position', new Float32BufferAttribute(pos, 3))
  rim.computeVertexNormals()
  const merged = mergeGeometries([outer.toNonIndexed(), inner.toNonIndexed(), rim], false)!
  return merged
}

/** Small round thing sitting on the body surface (button, flower), facing outward. */
function onSurface(a: number, y: number, size: [number, number, number], color: string, lift = 0.004, surf = bodyR): ShapeItem {
  const r = surf(y) + lift
  const n = new Vector3(Math.sin(a), 0.15, Math.cos(a) / SZ).normalize()
  return { sphere: [1, 8, 6], at: around(a, y, r), rot: facing(n), scale: size, color }
}

// --- Torso garments ------------------------------------------------------------------------
interface TopCut {
  hem: number
  ease: number
  flare: number
  /** Quilting (puffer) or nothing. */
  quilt?: number
}
const CUTS: Record<string, TopCut> = {
  tee: { hem: -0.13, ease: 0.006, flare: 0.012 },
  long: { hem: -0.14, ease: 0.006, flare: 0.01 },
  sleeveless: { hem: -0.13, ease: 0.004, flare: 0.01 },
  hoodie: { hem: -0.155, ease: 0.016, flare: 0.004 },
  jacket: { hem: -0.19, ease: 0.014, flare: 0.022 },
  puffer: { hem: -0.17, ease: 0.026, flare: 0.006, quilt: 0.014 },
  scrubs: { hem: -0.16, ease: 0.01, flare: 0.016 },
  baba: { hem: -0.2, ease: 0.008, flare: 0.04 },
  aoDai: { hem: -0.1, ease: 0.003, flare: 0.004 },
  dress: { hem: -0.09, ease: 0.004, flare: 0 },
  dirndl: { hem: -0.1, ease: 0.003, flare: 0 },
}

/** The top as a lathe from the neckline down to a hem with a lip. */
function topGeo(cut: TopCut, bulk: number, radial: number, n: number) {
  const prof: [number, number][] = []
  const neckR = 0.082
  prof.push([neckR - 0.012, 0.207], [neckR, 0.214])
  for (let i = 1; i <= n; i++) {
    const y = lerp(0.208, cut.hem, i / n)
    let r = Math.max(neckR + 0.004, bodyR(y, bulk) + cut.ease)
    // drape: below the chest the cloth falls a little straighter, and flares at the hem
    r += cut.flare * smooth(0.02, cut.hem, y)
    if (cut.quilt) r += cut.quilt * Math.sqrt(Math.abs(Math.sin(((y - cut.hem) / 0.075) * Math.PI)))
    prof.push([r, y])
  }
  const [rh, yh] = prof[prof.length - 1]
  prof.push([rh - 0.002, yh - 0.006], [rh - 0.018, yh - 0.004], [rh - 0.03, yh + 0.01])
  return lathe(prof, radial)
}
/** Shorts / trousers top: from under the shirt down round the seat (the legs come out below). */
function pelvisGeo(radial: number, bulk: number) {
  const prof: [number, number][] = [[0.2 * bulk, -0.06], [0.222 * bulk, -0.11], [0.226 * bulk, -0.16], [0.214 * bulk, -0.21], [0.185, -0.255], [0.13, -0.29], [0.05, -0.305], [0.001, -0.307]]
  return lathe(prof, radial)
}
/** Flared skirt with pleats and an inside: waist → hem. */
function skirtGeo(waist: number, hem: number, rWaist: number, rHem: number, pleatN: number, depth: number, radial: number, inside: boolean) {
  const prof: [number, number][] = []
  const n = 7
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const y = lerp(waist, hem, t)
    const r = lerp(rWaist, rHem, Math.pow(t, 0.85)) - (inside ? 0.007 : 0)
    prof.push([r, y])
  }
  if (!inside) {
    const [r, y] = prof[prof.length - 1]
    prof.push([r - 0.004, y - 0.004], [r - 0.008, y - 0.002])
  }
  return lathe(prof, radial, { n: pleatN, depth: (y) => depth * smooth(waist, hem, y) }, inside)
}

// --- Limbs (skinned to two bones) --------------------------------------------------------------
interface Ring {
  y: number
  r: number
  color: string
  /** Start a new piece here (crisp colour line / hem lip). */
  split?: boolean
}

/**
 * One limb as a tube around the vertical line (x, z) in model space, rings top → bottom, with a
 * round cap on top. Vertices blend from `upper` to `lower` around `jointY`.
 */
function limbTube(x: number, z: number, rings: Ring[], radial: number, upper: number, lower: number, jointY: number, blend: number): BufferGeometry {
  // cap
  const capRings: Ring[] = []
  const top = rings[0]
  for (let i = 3; i >= 1; i--) {
    const phi = (i / 4) * (Math.PI / 2)
    capRings.push({ y: top.y + Math.sin(phi) * top.r * 0.9, r: Math.cos(phi) * top.r, color: top.color })
  }
  capRings.unshift({ y: top.y + top.r * 0.9, r: 0.0005, color: top.color })
  const all = [...capRings, ...rings]
  // split into pieces
  const pieces: Ring[][] = [[]]
  for (let i = 0; i < all.length; i++) {
    const rg = all[i]
    if (rg.split && pieces[pieces.length - 1].length > 0) {
      const prev = pieces[pieces.length - 1]
      prev.push({ ...rg, color: prev[prev.length - 1].color })
      pieces.push([])
    }
    pieces[pieces.length - 1].push(rg)
  }
  const out: BufferGeometry[] = []
  const col = new Color()
  for (const piece of pieces) {
    if (piece.length < 2) continue
    const g = grid(radial, piece.length - 1, (u, _v, _i, j) => {
      const a = u * Math.PI * 2
      const rg = piece[j]
      return [x + Math.sin(a) * rg.r, rg.y, z + Math.cos(a) * rg.r]
    }, true)
    const n = g.attributes.position.count
    const colors = new Float32Array(n * 3)
    const index = new Uint16Array(n * 4)
    const weight = new Float32Array(n * 4)
    for (let v = 0; v < n; v++) {
      const j = Math.floor(v / radial)
      const rg = piece[j]
      col.set(rg.color)
      colors.set([col.r, col.g, col.b], v * 3)
      const w = smooth(jointY + blend, jointY - blend, rg.y)
      index.set([upper, lower, 0, 0], v * 4)
      weight.set([1 - w, w, 0, 0], v * 4)
    }
    g.setAttribute('color', new Float32BufferAttribute(colors, 3))
    g.setAttribute('skinIndex', new Uint16BufferAttribute(index, 4))
    g.setAttribute('skinWeight', new Float32BufferAttribute(weight, 4))
    out.push(g.toNonIndexed())
    g.dispose()
  }
  const merged = mergeGeometries(out, false)!
  for (const g of out) g.dispose()
  return merged
}

/** Skin radius of the arm / leg along its length (model-space y). */
const ARM: [number, number][] = [[0.664, 0.058], [0.63, 0.055], [0.59, 0.051], [0.55, 0.049], [0.51, 0.047], [0.49, 0.046], [0.47, 0.046], [0.43, 0.045], [0.39, 0.044], [0.35, 0.042]]
const LEG: [number, number][] = [[0.3, 0.07], [0.26, 0.068], [0.22, 0.066], [0.19, 0.063], [0.17, 0.061], [0.14, 0.058], [0.11, 0.055], [0.085, 0.051], [0.072, 0.046]]
const radiusAt = (table: [number, number][], y: number) => {
  for (let i = 1; i < table.length; i++) {
    if (y >= table[i][0]) {
      const [y0, r0] = table[i - 1]
      const [y1, r1] = table[i]
      return lerp(r0, r1, (y0 - y) / (y0 - y1))
    }
  }
  return table[table.length - 1][1]
}

interface Cover {
  /** Lowest point of the cover (sleeve hem / trouser hem). */
  to: number
  color: string
  ease: (y: number) => number
  /** Lip at the hem: extra radius and its colour. */
  lip?: number
  cuff?: { h: number; color: string; extra: number }
}
interface Band {
  from: number
  to: number
  color: string
  extra: number
}

/** Rings of a limb: skin, with a cover from the top down to `cover.to`, and coloured bands. */
function limbRings(table: [number, number][], skin: string, cover: Cover | null, bands: Band[], step = 0.02): Ring[] {
  const top = table[0][0]
  const end = table[table.length - 1][0]
  const ys = new Set<number>()
  for (let y = top; y > end; y -= step) ys.add(+y.toFixed(4))
  ys.add(end)
  for (const b of bands) {
    ys.add(b.from)
    ys.add(b.to)
  }
  if (cover && cover.to > end - 1e-6) ys.add(cover.to)
  if (cover?.cuff) ys.add(+(cover.to + cover.cuff.h).toFixed(4))
  const rings: Ring[] = []
  const sorted = [...ys].filter((y) => y <= top && y >= end).sort((a, b) => b - a)
  for (const y of sorted) {
    const base = radiusAt(table, y)
    const band = bands.find((b) => y <= b.from && y >= b.to)
    const covered = cover && y >= cover.to - 1e-6
    if (covered) {
      const r = base + cover.ease(y)
      const cuff = cover.cuff
      const cuffTop = cuff ? +(cover.to + cuff.h).toFixed(4) : -1
      let ring: Ring
      if (cuff && Math.abs(y - cuffTop) < 1e-6) {
        rings.push({ y, r, color: cover.color })
        ring = { y: y - 0.0002, r: r + cuff.extra, color: cuff.color, split: true }
      } else if (cuff && y < cuffTop) ring = { y, r: r + cuff.extra, color: cuff.color }
      else ring = { y, r, color: cover.color }
      rings.push(ring)
      if (Math.abs(y - cover.to) < 1e-6) {
        // hem: a lip that turns in to the skin underneath
        const lip = cover.lip ?? 0.004
        ring.r += lip
        rings.push({ y: y - 0.004, r: ring.r - Math.abs(lip) * 0.4 - 0.002, color: ring.color })
        rings.push({ y: y - 0.005, r: base + 0.002, color: skin, split: true })
      }
      continue
    }
    if (band) {
      const first = Math.abs(y - band.from) < 1e-6
      rings.push({ y, r: base + band.extra, color: band.color, split: first })
      if (Math.abs(y - band.to) < 1e-6) rings.push({ y: y - 0.003, r: base + 0.001, color: skin, split: true })
      continue
    }
    rings.push({ y, r: base, color: skin })
  }
  return rings
}

/** Arms + legs for an outfit, skinned (model space). */
export function limbGeometries(o: Outfit, k: number): BufferGeometry[] {
  const top = o.top ?? 'tee'
  const bottom = top === 'dress' ? 'skirt' : top === 'dirndl' ? 'dirndl' : top === 'aoDai' || top === 'baba' ? 'widePants' : (o.bottom ?? 'shorts')
  const shirt = o.shirt
  const pants = o.shorts
  const skin = o.skin
  const radial = segs(14, k, 6)
  // Sleeves
  let sleeve: Cover | null
  switch (top) {
    case 'sleeveless':
      sleeve = null
      break
    case 'long':
    case 'jacket':
    case 'scrubs':
      sleeve = top === 'scrubs'
        ? { to: 0.57, color: shirt, ease: (y) => 0.012 + 0.012 * smooth(0.64, 0.57, y), lip: 0.003 }
        : { to: 0.37, color: shirt, ease: (y) => 0.009 + 0.004 * smooth(0.52, 0.47, y) - 0.004 * smooth(0.47, 0.4, y), cuff: { h: 0.03, color: shade(shirt, -0.06), extra: 0.006 } }
      break
    case 'hoodie':
      sleeve = { to: 0.37, color: shirt, ease: (y) => 0.014 + 0.006 * smooth(0.45, 0.4, y), cuff: { h: 0.028, color: shade(shirt, -0.08), extra: -0.004 } }
      break
    case 'puffer':
      sleeve = { to: 0.37, color: shirt, ease: (y) => 0.02 + 0.012 * Math.sqrt(Math.abs(Math.sin(((y - 0.37) / 0.08) * Math.PI))), cuff: { h: 0.025, color: shade(shirt, -0.12), extra: -0.006 } }
      break
    case 'aoDai':
      sleeve = { to: 0.36, color: shirt, ease: () => 0.004, lip: 0.002 }
      break
    case 'baba':
      sleeve = { to: 0.37, color: shirt, ease: (y) => 0.01 + 0.02 * smooth(0.5, 0.37, y), lip: 0.003 }
      break
    case 'dirndl':
      sleeve = { to: 0.585, color: o.patternColor ?? '#ffffff', ease: (y) => 0.012 + 0.032 * Math.sin(clamp01((0.67 - y) / 0.085) * Math.PI), lip: -0.012 }
      break
    default: // tee, dress
      sleeve = { to: 0.575, color: shirt, ease: (y) => 0.015 + 0.01 * smooth(0.64, 0.575, y), lip: 0.003 }
  }
  // Legs
  let leg: Cover | null
  const bands: Band[] = []
  switch (bottom) {
    case 'pants':
      leg = { to: 0.072, color: pants, ease: (y) => 0.012 + 0.006 * smooth(0.14, 0.08, y), lip: 0.004 }
      break
    case 'widePants':
      leg = { to: 0.072, color: pants, ease: (y) => 0.018 + 0.03 * smooth(0.26, 0.08, y), lip: 0.003 }
      break
    case 'skirt':
    case 'dirndl':
      leg = null
      break
    case 'lederhosen':
      leg = { to: 0.2, color: pants, ease: (y) => 0.014 + 0.008 * smooth(0.26, 0.2, y), cuff: { h: 0.018, color: shade(pants, -0.15), extra: 0.003 } }
      break
    default: // shorts
      leg = { to: 0.2, color: pants, ease: (y) => 0.013 + 0.012 * smooth(0.27, 0.2, y), lip: 0.004 }
  }
  if (o.socks || bottom === 'lederhosen') bands.push({ from: bottom === 'lederhosen' ? 0.165 : 0.13, to: 0.072, color: o.socks ?? '#efe6d8', extra: 0.004 })
  const step = k >= 0.6 ? 0.022 : 0.04
  const armR = limbRings(ARM, skin, sleeve, [], step)
  const legR = limbRings(LEG, skin, leg, bands, step)
  const sx = BIND[B.armL][0]
  const ey = BIND[B.foreL][1]
  const hx = BIND[B.thighL][0]
  const ky = BIND[B.shinL][1]
  return [
    cached(`armL${JSON.stringify(armR)}${radial}`, () => limbTube(sx, 0, armR, radial, B.armL, B.foreL, ey, 0.04)),
    cached(`armR${JSON.stringify(armR)}${radial}`, () => limbTube(-sx, 0, armR, radial, B.armR, B.foreR, ey, 0.04)),
    cached(`legL${JSON.stringify(legR)}${radial}`, () => limbTube(hx, 0, legR, radial, B.thighL, B.shinL, ky, 0.035)),
    cached(`legR${JSON.stringify(legR)}${radial}`, () => limbTube(-hx, 0, legR, radial, B.thighR, B.shinR, ky, 0.035)),
  ]
}

// --- Shoes (shin space: origin at the knee) ------------------------------------------------------
function soleGeo(w: number, l: number, h: number, k: number) {
  const curve = k >= 0.6 ? 5 : 3
  return cached(`sole${w}${l}${h}${curve}`, () => {
    const s = new Shape()
    const rx = w / 2
    const ry = l / 2
    // a foot outline: rounder and wider at the toes
    s.moveTo(0, -ry)
    s.bezierCurveTo(rx * 0.9, -ry, rx * 0.85, -ry * 0.2, rx, ry * 0.3)
    s.bezierCurveTo(rx * 1.08, ry * 0.95, rx * 0.4, ry, 0, ry)
    s.bezierCurveTo(-rx * 0.4, ry, -rx * 1.08, ry * 0.95, -rx, ry * 0.3)
    s.bezierCurveTo(-rx * 0.85, -ry * 0.2, -rx * 0.9, -ry, 0, -ry)
    const g = new ExtrudeGeometry(s, { depth: h - 0.01, bevelEnabled: true, bevelThickness: 0.005, bevelSize: 0.006, bevelSegments: 1, curveSegments: curve })
    g.rotateX(Math.PI / 2)
    g.translate(0, h - 0.005, 0)
    return g
  })
}
export function shoeShapes(o: Outfit, k: number): ShapeItem[] {
  const shoe = o.shoe
  const skin = o.skin
  const foot = -SHIN // ankle height in shin space
  const ground = foot - 0.06
  const light = (hex: string) => new Color(hex).getHSL({ h: 0, s: 0, l: 0 }).l > 0.85
  const soleColor = light(shoe) ? '#cfc8bc' : '#f4f1ea'
  switch (o.shoeType ?? 'sneaker') {
    case 'sandal':
      return [
        { geometry: soleGeo(0.135, 0.225, 0.028, k), at: [0, ground, 0.03], color: shoe },
        { sphere: [0.07, 12, 8, Math.PI / 2], at: [0, ground + 0.026, 0.03], scale: [0.95, 0.75, 1.4], color: skin },
        { torus: [0.06, 0.013, 5, 14, Math.PI], at: [0, ground + 0.03, 0.065], rot: [0, 0, 0], scale: [1.05, 0.75, 1], color: shade(shoe, -0.12) },
        { torus: [0.055, 0.011, 5, 12, Math.PI], at: [0, ground + 0.03, 0.0], scale: [1.05, 0.7, 1], color: shade(shoe, -0.12) },
      ]
    case 'boot':
      return [
        { geometry: soleGeo(0.15, 0.235, 0.03, k), at: [0, ground, 0.03], color: shade(shoe, -0.3) },
        { cyl: [0.072, 0.077, 0.11, 14], at: [0, foot + 0.005, 0], color: shoe },
        { torus: [0.073, 0.012, 5, 16], at: [0, foot + 0.06, 0], rot: [Math.PI / 2, 0, 0], color: shade(shoe, -0.12) },
        { sphere: [0.085, 14, 8, Math.PI / 2], at: [0, ground + 0.028, 0.035], scale: [0.95, 0.75, 1.3], color: shoe },
      ]
    case 'loafer':
      return [
        { geometry: soleGeo(0.13, 0.215, 0.018, k), at: [0, ground, 0.03], color: shade(shoe, -0.15) },
        { sphere: [0.082, 14, 8, Math.PI / 2], at: [0, ground + 0.016, 0.03], scale: [0.92, 0.6, 1.3], color: shoe },
        { sphere: [0.05, 10, 6, Math.PI / 2], at: [0, ground + 0.03, 0.0], scale: [1, 0.9, 1], color: skin },
        { sphere: [0.016, 8, 6], at: [0, ground + 0.046, 0.095], scale: [1.6, 0.8, 0.8], color: shade(shoe, 0.15) },
      ]
    default: {
      // sneaker: sole with a toe bumper, padded upper, collar, laces
      const s: ShapeItem[] = [
        { geometry: soleGeo(0.14, 0.23, 0.03, k), at: [0, ground, 0.03], color: soleColor },
        { sphere: [0.085, 16, 10, Math.PI / 2], at: [0, ground + 0.026, 0.028], scale: [0.92, 0.72, 1.3], color: shoe },
        { torus: [0.047, 0.013, 6, 16], at: [0, ground + 0.082, -0.005], rot: [Math.PI / 2 + 0.25, 0, 0], color: shade(shoe, -0.12) },
        { sphere: [0.05, 10, 6, Math.PI / 2], at: [0, ground + 0.026, 0.1], scale: [1.15, 0.45, 0.75], color: soleColor },
      ]
      if (k >= 0.4) for (let i = 0; i < 3; i++) s.push({ box: [0.05, 0.007, 0.012], at: [0, ground + 0.08 - i * 0.011, 0.04 + i * 0.019], rot: [0.75, 0, 0], color: light(shoe) ? '#9aa3b5' : '#ffffff' })
      return s
    }
  }
}

// --- The torso -----------------------------------------------------------------------------------
export function torsoShapes(input: Outfit, k: number): ShapeItem[] {
  const top = input.top ?? 'tee'
  const bottom = top === 'dress' ? 'skirt' : top === 'dirndl' ? 'dirndl' : top === 'aoDai' || top === 'baba' ? 'widePants' : (input.bottom ?? 'shorts')
  const o: Outfit = top === 'dress' ? { ...input, shorts: input.shirt } : input
  const shirt = o.shirt
  const pants = o.shorts
  const skin = o.skin
  const WHITE = '#ffffff'
  const bulk = top === 'puffer' ? 1.08 : top === 'hoodie' ? 1.03 : 1
  const radial = segs(30, k, 12)
  const kk = Math.round(k * 20) / 20
  const cut = CUTS[top] ?? CUTS.tee
  // Small details (prints, buttons, laces…) stay out of the coarse ink-outline mesh.
  const fine = k >= 0.4
  const shirtR = (y: number) => Math.max(0.086, bodyR(y, bulk) + cut.ease + cut.flare * smooth(0.02, cut.hem, y))
  const s: ShapeItem[] = [
    { geometry: cached(`top-${top}-${kk}`, () => topGeo(cut, bulk, radial, segs(16, k, 8))), color: shirt },
    { geometry: cached(`pelvis-${bulk}-${kk}`, () => pelvisGeo(radial, bulk)), color: bottom === 'skirt' || bottom === 'dirndl' ? pants : pants },
    // neck
    { cyl: [0.058, 0.066, 0.1, 12], at: [0, 0.24, 0], color: skin },
  ]
  const P = (key: string, spec: PatchSpec, color: string) => s.push({ geometry: cached(`${key}-${top}-${kk}`, () => patch({ ...spec, nu: segs(spec.nu ?? 6, k + 0.2, 2), nv: segs(spec.nv ?? 6, k + 0.2, 2) })), color })

  // ---- prints
  if (fine && o.pattern === 'stripes') {
    for (const y of [-0.1, -0.03, 0.04, 0.11]) {
      const r = shirtR(y)
      s.push({ geometry: cached(`stripe${y}${top}${kk}`, () => lathe([[r + 0.0005, y + 0.014], [r + 0.0035, y + 0.01], [r + 0.0035, y - 0.01], [r + 0.0005, y - 0.014]], radial)), color: o.patternColor ?? WHITE })
    }
  } else if (fine && o.pattern === 'flowers') {
    for (let i = 0; i < 16; i++) {
      const a = i * 2.39996
      const y = cut.hem + 0.03 + ((i * 0.37) % 1) * (0.17 - cut.hem)
      s.push(onSurface(a, y, [0.02, 0.02, 0.006], o.patternColor ?? '#f4d6e6', 0.004, shirtR))
      s.push(onSurface(a, y, [0.007, 0.007, 0.004], '#ffe08a', 0.009, shirtR))
    }
  }

  // ---- necklines & fronts
  const neckRib = (color: string, r = 0.087, tube = 0.011) => s.push({ geometry: cached(`rib${r}${tube}${kk}`, () => ring(r, 0.209, tube, radial, 0.9)), color })
  switch (top) {
    case 'long': {
      s.push({ geometry: cached(`stand${kk}`, () => lathe([[0.066, 0.262], [0.07, 0.258], [0.08, 0.215], [0.07, 0.21]], radial)), color: shirt })
      for (const side of [-1, 1]) {
        P(`collar${side}`, {
          top: 0.226, bottom: 0.152, nu: 4, nv: 4, lift: 0.012, thick: 0.007,
          surf: (y) => Math.max(0.084, shirtR(y)),
          left: (y) => side < 0 ? lerp(-0.034, -0.085, smooth(0.152, 0.226, y)) : lerp(0.034, 0.004, smooth(0.152, 0.226, y)),
          right: (y) => side < 0 ? lerp(-0.034, -0.004, smooth(0.152, 0.226, y)) : lerp(0.034, 0.085, smooth(0.152, 0.226, y)),
        }, shade(shirt, 0.03))
      }
      P('placket', { top: 0.17, bottom: cut.hem + 0.006, left: () => -0.013, right: () => 0.013, nu: 1, nv: 8, surf: shirtR, lift: 0.0015, thick: 0.004 }, shade(shirt, -0.04))
      if (fine) for (const y of [0.13, 0.06, -0.01, -0.08]) s.push(onSurface(0, y, [0.011, 0.011, 0.005], shade(shirt, -0.28), 0.006, shirtR))
      break
    }
    case 'hoodie': {
      // hood resting on the shoulders, its rolled rim, the drawstrings, the kangaroo pocket
      s.push({ geometry: cached(`hood${kk}`, () => hoodGeo(segs(16, k, 8))), color: shade(shirt, -0.04) })
      s.push({ geometry: cached(`hoodRim${kk}`, () => sweep(hoodRim(), { rings: segs(22, k, 10), radial: segs(8, k, 5), radius: () => 0.024, up: [0, 1, 0] })), color: shirt })
      if (fine) for (const side of [-1, 1]) {
        s.push({ geometry: cached(`string${side}${kk}`, () => sweep([[side * 0.035, 0.205, 0.088], [side * 0.036, 0.16, shirtR(0.16) * SZ + 0.006], [side * 0.04, 0.1, shirtR(0.1) * SZ + 0.006]], { rings: 6, radial: 4, radius: () => 0.0055, up: [0, 0, 1] })), color: WHITE })
        s.push({ cyl: [0.007, 0.007, 0.018, 6], at: [side * 0.04, 0.09, shirtR(0.09) * SZ + 0.006], color: WHITE })
      }
      P('pocket', { top: -0.035, bottom: -0.13, left: (y) => lerp(-0.105, -0.075, smooth(-0.13, -0.035, y)), right: (y) => lerp(0.105, 0.075, smooth(-0.13, -0.035, y)), surf: shirtR, puff: 0.01, thick: 0.006, nu: 6, nv: 4 }, shade(shirt, -0.05))
      s.push({ geometry: cached(`hoodHem${kk}`, () => ring(shirtR(cut.hem) - 0.004, cut.hem + 0.012, 0.012, radial, 1.3)), color: shade(shirt, -0.08) })
      break
    }
    case 'jacket': {
      const v = (y: number) => 0.07 * smooth(-0.03, 0.21, y)
      P('shirtV', { top: 0.212, bottom: -0.03, left: (y) => -v(y), right: (y) => v(y), surf: shirtR, lift: 0.0012, thick: 0.002, nu: 3, nv: 6 }, WHITE)
      for (const side of [-1, 1]) {
        P(`lapel${side}`, {
          top: 0.205, bottom: -0.02, lift: 0.007, thick: 0.006, surf: shirtR, nu: 3, nv: 6,
          left: (y) => side < 0 ? -v(y) - 0.012 - 0.05 * Math.sin(clamp01((y + 0.02) / 0.22) * Math.PI) : v(y),
          right: (y) => side < 0 ? -v(y) : v(y) + 0.012 + 0.05 * Math.sin(clamp01((y + 0.02) / 0.22) * Math.PI),
        }, shade(shirt, -0.07))
      }
      if (fine) for (const y of [-0.06, -0.12]) s.push(onSurface(0.04, y, [0.012, 0.012, 0.005], shade(shirt, -0.3), 0.005, shirtR))
      P('pocketL', { top: -0.085, bottom: -0.095, left: () => -0.17, right: () => -0.09, surf: shirtR, nu: 2, nv: 1, thick: 0.004 }, shade(shirt, -0.12))
      P('pocketR', { top: -0.085, bottom: -0.095, left: () => 0.09, right: () => 0.17, surf: shirtR, nu: 2, nv: 1, thick: 0.004 }, shade(shirt, -0.12))
      break
    }
    case 'puffer': {
      s.push({ geometry: cached(`pufCollar${kk}`, () => lathe([[0.07, 0.28], [0.088, 0.276], [0.1, 0.24], [0.104, 0.21], [0.09, 0.2]], radial)), color: shirt })
      P('zip', { top: 0.27, bottom: cut.hem - 0.004, left: () => -0.006, right: () => 0.006, surf: (y) => y > 0.205 ? 0.098 : shirtR(y) + 0.012, nu: 1, nv: 10, thick: 0.004 }, shade(shirt, -0.32))
      break
    }
    case 'scrubs': {
      const v = (y: number) => 0.055 * smooth(0.12, 0.215, y)
      P('vneck', { top: 0.212, bottom: 0.12, left: (y) => -v(y), right: (y) => v(y), surf: shirtR, lift: 0.0012, thick: 0.002, nu: 3, nv: 4 }, skin)
      for (const side of [-1, 1]) P(`vtrim${side}`, { top: 0.214, bottom: 0.118, left: (y) => side * v(y) - 0.007, right: (y) => side * v(y) + 0.007, surf: shirtR, lift: 0.002, thick: 0.004, nu: 1, nv: 4 }, shade(shirt, -0.12))
      P('chestPocket', { top: 0.09, bottom: 0.025, left: () => -0.15, right: () => -0.07, surf: shirtR, thick: 0.005, nu: 3, nv: 2 }, shade(shirt, -0.07))
      if (fine) s.push({ box: [0.007, 0.05, 0.007], at: [-0.095, 0.095, shirtR(0.095) * SZ * Math.cos(0.42) + 0.012], color: '#4b8bd4' })
      P('hipPocketL', { top: -0.06, bottom: -0.13, left: () => -0.17, right: () => -0.08, surf: shirtR, thick: 0.005, nu: 3, nv: 2 }, shade(shirt, -0.07))
      P('hipPocketR', { top: -0.06, bottom: -0.13, left: () => 0.08, right: () => 0.17, surf: shirtR, thick: 0.005, nu: 3, nv: 2 }, shade(shirt, -0.07))
      break
    }
    case 'aoDai':
    case 'baba': {
      s.push({ geometry: cached(`mandarin${kk}`, () => lathe([[0.068, 0.27], [0.072, 0.266], [0.08, 0.215], [0.074, 0.21]], radial)), color: shirt })
      if (top === 'aoDai') {
        // the closure from the collar across to the right armpit
        P('aoDaiLine', { top: 0.205, bottom: 0.1, left: (y) => lerp(0.15, 0.0, smooth(0.1, 0.205, y)) - 0.004, right: (y) => lerp(0.15, 0.0, smooth(0.1, 0.205, y)) + 0.004, surf: shirtR, lift: 0.0015, thick: 0.003, nu: 1, nv: 6 }, shade(shirt, -0.12))
        s.push({ geometry: cached(`aoDaiFront${kk}`, () => panelGeo(1, segs(8, k, 4), segs(10, k, 5))), color: shirt })
        s.push({ geometry: cached(`aoDaiBack${kk}`, () => panelGeo(-1, segs(8, k, 4), segs(10, k, 5))), color: shirt })
      } else {
        P('babaPlacket', { top: 0.2, bottom: cut.hem + 0.008, left: () => -0.01, right: () => 0.01, surf: shirtR, lift: 0.0015, thick: 0.003, nu: 1, nv: 8 }, shade(shirt, -0.06))
        if (fine) for (const y of [0.15, 0.08, 0.01, -0.06, -0.13]) s.push(onSurface(0, y, [0.01, 0.01, 0.005], shade(shirt, -0.25), 0.005, shirtR))
      }
      break
    }
    case 'dirndl': {
      // white blouse above the laced bodice
      const blouse = o.patternColor ?? WHITE
      s.push({ geometry: cached(`blouse${kk}`, () => lathe([[0.075, 0.216], [0.09, 0.212], [bodyR(0.17) + 0.01, 0.17], [bodyR(0.12) + 0.012, 0.12], [bodyR(0.08) + 0.004, 0.08], [bodyR(0.07) - 0.01, 0.075]], radial)), color: blouse })
      neckRib(blouse, 0.09, 0.012)
      for (let i = 0; i < (fine ? 4 : 0); i++) {
        const y0 = 0.06 - i * 0.04
        for (const dir of [-1, 1]) P(`lace${i}${dir}`, { top: y0, bottom: y0 - 0.035, left: (y) => dir * lerp(-0.025, 0.025, (y0 - y) / 0.035) - 0.003, right: (y) => dir * lerp(-0.025, 0.025, (y0 - y) / 0.035) + 0.003, surf: shirtR, lift: 0.0015, thick: 0.002, nu: 1, nv: 2 }, '#e8c35a')
      }
      break
    }
    case 'sleeveless':
      P('scoop', { top: 0.212, bottom: 0.14, left: (y) => -0.085 * Math.sqrt(smooth(0.13, 0.215, y)), right: (y) => 0.085 * Math.sqrt(smooth(0.13, 0.215, y)), surf: shirtR, lift: 0.0012, thick: 0.002, nu: 5, nv: 4 }, skin)
      neckRib(shade(shirt, -0.1), 0.095, 0.008)
      for (const side of [-1, 1]) s.push({ torus: [0.058, 0.009, 5, 16], at: [side * 0.228, 0.13, 0], rot: [0, 0, Math.PI / 2 - side * 0.25], color: shade(shirt, -0.1) })
      break
    default: // tee, dress
      neckRib(shade(shirt, -0.1))
  }

  // ---- skirts
  if (bottom === 'skirt') {
    const hem = top === 'dress' ? -0.37 : -0.33
    const rh = top === 'dress' ? 0.32 : 0.3
    s.push({ geometry: cached(`skirt${hem}${kk}`, () => skirtGeo(-0.07, hem, 0.208, rh, 14, 0.12, radial, false)), color: pants })
    s.push({ geometry: cached(`skirtIn${hem}${kk}`, () => skirtGeo(-0.07, hem, 0.208, rh, 14, 0.12, radial, true)), color: shade(pants, -0.18) })
    s.push({ geometry: cached(`waist${kk}`, () => ring(0.212, -0.085, 0.012, radial, 1.2)), color: shade(pants, -0.06) })
    if (fine && o.pattern === 'flowers' && top === 'dress') {
      for (let i = 0; i < 12; i++) {
        const a = i * 2.39996 + 0.5
        const t = 0.2 + ((i * 0.53) % 1) * 0.65
        const y = lerp(-0.07, hem, t)
        const sr = () => lerp(0.208, rh, Math.pow(t, 0.85)) - 0.004
        s.push(onSurface(a, y, [0.022, 0.022, 0.006], o.patternColor ?? '#f4d6e6', 0.006, sr))
      }
    }
  }
  if (bottom === 'dirndl') {
    s.push({ geometry: cached(`dSkirt${kk}`, () => skirtGeo(-0.06, -0.43, 0.205, 0.34, 18, 0.1, radial, false)), color: pants })
    s.push({ geometry: cached(`dSkirtIn${kk}`, () => skirtGeo(-0.06, -0.43, 0.205, 0.34, 18, 0.1, radial, true)), color: shade(pants, -0.18) })
    const apron = o.apron ?? '#f4c6cf'
    const skirtSurf = (y: number) => lerp(0.205, 0.34, Math.pow(clamp01((y + 0.06) / -0.37), 0.85)) + 0.02
    P('dApron', { top: -0.08, bottom: -0.39, left: (y) => -0.11 - 0.03 * smooth(-0.08, -0.39, y), right: (y) => 0.11 + 0.03 * smooth(-0.08, -0.39, y), surf: skirtSurf, thick: 0.004, nu: 6, nv: 8 }, apron)
    s.push({ geometry: cached(`apronBand${kk}`, () => ring(0.212, -0.075, 0.012, radial, 1.1)), color: apron })
    for (const side of [-1, 1]) s.push({ sphere: [0.035, 10, 8], at: [side * 0.035, -0.08, -0.205], scale: [1.2, 0.8, 0.5], rot: [0, 0, side * 0.5], color: apron })
  }
  if (o.apron && bottom !== 'dirndl') {
    const hang = (y: number) => (y > -0.14 ? shirtR(y) + 0.004 : shirtR(-0.14) + 0.006 + (-0.14 - y) * 0.15)
    P('apron', { top: -0.06, bottom: -0.35, left: () => -0.15, right: () => 0.15, surf: hang, thick: 0.004, nu: 6, nv: 8 }, o.apron)
    P('apronBib', { top: 0.1, bottom: -0.06, left: () => -0.09, right: () => 0.09, surf: hang, thick: 0.004, nu: 4, nv: 4 }, o.apron)
    s.push({ geometry: cached(`apronTie${top}${kk}`, () => ring(shirtR(-0.07) + 0.002, -0.07, 0.008, radial, 1.2)), color: o.apron })
  }
  if (bottom === 'lederhosen') {
    const dark = shade(pants, -0.1)
    P('lhFlap', { top: -0.13, bottom: -0.24, left: () => -0.08, right: () => 0.08, surf: (y) => bodyR(Math.max(y, -0.2)) + 0.03, thick: 0.006, nu: 3, nv: 3 }, dark)
    for (const side of [-1, 1]) {
      P(`lhStrapF${side}`, { top: 0.2, bottom: -0.12, left: () => side * 0.085 - 0.018, right: () => side * 0.085 + 0.018, surf: shirtR, lift: 0.004, thick: 0.005, nu: 1, nv: 10 }, pants)
      P(`lhStrapB${side}`, { top: 0.2, bottom: -0.12, centre: Math.PI, left: () => side * 0.07 - 0.018, right: () => side * 0.07 + 0.018, surf: shirtR, lift: 0.004, thick: 0.005, nu: 1, nv: 10 }, pants)
    }
    P('lhBar', { top: 0.085, bottom: 0.055, left: () => -0.085, right: () => 0.085, surf: shirtR, lift: 0.01, thick: 0.006, nu: 3, nv: 1 }, pants)
  }

  // ---- neck things
  if (o.neck === 'scarf') {
    const c = o.neckColor ?? '#d4473b'
    s.push({ geometry: cached(`scarfRoll${kk}`, () => ring(0.1, 0.215, 0.034, radial, 0.8)), color: c })
    s.push({ geometry: cached(`scarfTail${top}${kk}`, () => sweep([[0.07, 0.2, 0.13], [0.08, 0.13, shirtR(0.13) * SZ + 0.02], [0.085, 0.02, shirtR(0.02) * SZ + 0.018], [0.09, -0.04, shirtR(-0.04) * SZ + 0.02]], { rings: 8, radial: 8, radius: () => 0.036, flat: 0.28, up: [0, 0, 1] })), color: c })
  } else if (o.neck === 'tie') {
    const c = o.neckColor ?? '#2c5aa0'
    s.push(onSurface(0, 0.198, [0.024, 0.018, 0.014], c, 0.012, shirtR))
    P('tie', { top: 0.188, bottom: -0.035, left: (y) => -tieW(y), right: (y) => tieW(y), surf: shirtR, lift: 0.006, thick: 0.005, nu: 2, nv: 7 }, c)
  } else if (o.neck === 'redScarf') {
    s.push({ geometry: cached(`redRing${kk}`, () => ring(0.094, 0.212, 0.012, radial, 0.9)), color: '#d8262f' })
    for (const side of [-1, 1]) {
      const cx = (y: number) => side * (0.012 + (0.19 - y) * 0.3)
      const w = (y: number) => 0.02 * smooth(0.06, 0.19, y)
      P(`redTail${side}`, { top: 0.19, bottom: 0.06, left: (y) => cx(y) - w(y), right: (y) => cx(y) + w(y), surf: shirtR, lift: 0.005, thick: 0.004, nu: 1, nv: 4 }, '#d8262f')
    }
    s.push(onSurface(0, 0.19, [0.016, 0.014, 0.01], '#b81d26', 0.01, shirtR))
  }

  // ---- backpack: rounded bag, front pocket, straps over the shoulders
  if (o.bag) {
    const bag = o.bag
    s.push(
      { geometry: cached(`bagBody${k >= 0.6}`, () => new RoundedBoxGeometry(0.3, 0.34, 0.14, k >= 0.6 ? 3 : 1, 0.05)), at: [0, 0.0, -0.268], color: bag },
      { geometry: cached(`bagPocket${k >= 0.6}`, () => new RoundedBoxGeometry(0.22, 0.14, 0.06, k >= 0.6 ? 2 : 1, 0.025)), at: [0, -0.08, -0.345], color: shade(bag, -0.1) },
      { torus: [0.04, 0.009, 4, 10, Math.PI], at: [0, 0.17, -0.27], color: shade(bag, -0.2) },
    )
    for (const side of [-1, 1]) {
      s.push({ geometry: cached(`strap${side}${top}${kk}`, () => sweep(strapPath(side, shirtR), { rings: segs(18, k, 9), radial: 6, radius: () => 0.02, flat: 0.3, up: [side, 0, 0] })), color: shade(bag, -0.2) })
    }
  }
  return s
}

const tieW = (y: number) => (y > -0.005 ? lerp(0.017, 0.032, smooth(0.188, -0.005, y)) : 0.032 * clamp01((y + 0.035) / 0.03))

function strapPath(side: number, surf: (y: number) => number): P3[] {
  const onFront = (x: number, y: number, lift: number): P3 => {
    const r = surf(y) + lift
    const a = Math.asin(Math.min(0.95, x / r))
    return around(a, y, r)
  }
  return [
    [side * 0.1, 0.16, -0.21],
    [side * 0.11, 0.222, -0.08],
    [side * 0.115, 0.226, 0.02],
    onFront(side * 0.12, 0.17, 0.012),
    onFront(side * 0.13, 0.06, 0.012),
    onFront(side * 0.15, -0.04, 0.012),
    [side * 0.2, -0.09, 0.08],
    [side * 0.19, -0.1, -0.16],
  ]
}

/** Hood lying on the upper back (a soft shell behind the neck). */
function hoodGeo(n: number) {
  return grid(n, Math.max(4, Math.round(n / 2)), (u, v) => {
    const a = Math.PI + (u - 0.5) * 2.6
    const y = lerp(0.235, 0.06, v)
    const base = Math.max(0.1, bodyR(Math.min(y, 0.2)) + 0.02)
    const r = base + 0.045 * Math.sin(Math.PI * Math.min(1, v * 1.2)) * (1 - Math.abs(u - 0.5) * 1.2)
    return around(a, y, r)
  }, false)
}
function hoodRim(): P3[] {
  const pts: P3[] = []
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI + (i / 8 - 0.5) * 3.6
    const front = Math.cos(a) > 0
    pts.push(around(a, front ? 0.205 : 0.235, front ? 0.105 : 0.135))
  }
  return pts
}

/** Áo dài flap (front or back) falling from the waist to the ankles, softly curved and flared. */
function panelGeo(side: number, nu: number, nv: number) {
  const top = -0.1
  const bottom = -0.44
  const surface = (inner: boolean) =>
    grid(nu, nv, (u, v) => {
      const y = lerp(top, bottom, v)
      const half = lerp(0.15, 0.17, v)
      const t = (u - 0.5) * 2
      const x = t * half * (side > 0 ? 1 : -1)
      // wraps round the hips at the top, falls freer (and a little forward) toward the hem
      const wrap = lerp(0.55, 0.32, v)
      const depth = (bodyR(top) * SZ + 0.014) * (1 - wrap * t * t) + 0.035 * v * v + 0.008 * Math.sin(t * Math.PI * 2 + 1) * v
      // rounded bottom corners
      const yy = y + (v > 0.85 ? (Math.abs(t) ** 3) * 0.03 * (v - 0.85) / 0.15 : 0)
      return [x, yy, side * (depth - (inner ? 0.004 : 0))]
    }, false, inner)
  return mergeGeometries([surface(false).toNonIndexed(), surface(true).toNonIndexed()], false)!
}
