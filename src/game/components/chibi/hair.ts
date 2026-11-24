import { BufferGeometry, Color, Euler, Matrix4, Quaternion, Vector3 } from 'three'
import type { Outfit } from '../../../data/npcs'
import type { ShapeItem } from '../../scenes/shared/Shapes'
import { lightness } from './face'
import { clump, grid, keyed, lerp, segs, smooth, sweep, tip, type P3 } from './geom'
import { HEAD_R as R } from './rig'

/**
 * Hair, built as real hair shapes instead of stacked balls:
 * - a shell that grows from the crown and ends in a cut line (bangs over the forehead, side
 *   locks framing the face, nape or a curtain down the back), split into strand clumps that end
 *   in soft points, with thickness at the cut so the edge reads as hair;
 * - swept locks for everything that hangs or is tied: ponytail, twin tails, braid, buns (a coiled
 *   lock), side wisps, an ahoge, spikes, curls. Locks taper, split into clumps toward the tip and
 *   start under a hair tie.
 * All in the head bone's space (origin = head centre, +Z = face), merged into the body mesh.
 */

/** Head sphere scale (ChibiModel.headSphere) — the shell follows the same ellipsoid. */
const HX = 1.04
const HY = 0.95
const HZ = 0.98
/** Polar angle where the shell stops following the skull and falls straight down. */
const FALL = 1.85

const geoCache = new Map<string, BufferGeometry>()
function cached(key: string, make: () => BufferGeometry) {
  let g = geoCache.get(key)
  if (!g) {
    g = make()
    geoCache.set(key, g)
  }
  return g
}

interface ShellSpec {
  /** Cut line: polar angle of the hem by |azimuth| (0 = front, π = back); > FALL hangs down. */
  len: [number, number][]
  /** Extra length of the clump points by |azimuth|. */
  tips: [number, number][]
  /** Clumps around the head. */
  strands: number
  /** Depth of the clumps (fraction of the radius). */
  ridge: number
  /** Distance from the scalp (fraction of the radius), at the crown and at the sides. */
  lift: number
  /** Pull the cut line inward (a bob that curls under). */
  tuck?: number
  /** Shift of the bang points sideways (radians): side-swept fringe. */
  sweepSide?: number
  /** Side parting at this azimuth (a small dent from the crown). */
  part?: number
  /** Lumpy (curly) surface. */
  curls?: number
  /**
   * Hair pulled back to a tie at this direction (ponytail, buns): the shell hugs the skull
   * instead of falling as a curtain, and the strands at the back run toward the tie.
   */
  gather?: P3
  /** Short hair: hugs the skull down to the nape instead of falling as a curtain. */
  hug?: boolean
}

const SHELLS: Record<string, ShellSpec> = {
  bob: { len: [[0, 1.3], [0.85, 1.36], [1.15, 2.3], [1.7, 2.45], [2.4, 2.6], [Math.PI, 2.62]], tips: [[0, 0.15], [1.2, 0.1], [Math.PI, 0.05]], strands: 15, ridge: 0.05, lift: 0.075, tuck: 0.09, part: 0.35 },
  long: { len: [[0, 1.3], [0.85, 1.38], [1.12, 2.75], [1.6, 3.05], [2.3, 3.45], [Math.PI, 3.55]], tips: [[0, 0.15], [1.2, 0.22], [Math.PI, 0.25]], strands: 15, ridge: 0.06, lift: 0.08, part: 0.35 },
  ponytail: { len: [[0, 1.3], [0.85, 1.38], [1.1, 1.75], [1.4, 2.05], [2.1, 2.6], [Math.PI, 2.78]], tips: [[0, 0.15], [1.1, 0.1], [1.5, 0.04], [Math.PI, 0.04]], strands: 15, ridge: 0.05, lift: 0.055, gather: [0, 0.42, -0.91] },
  twin: { len: [[0, 1.3], [0.85, 1.38], [1.1, 2.2], [1.4, 2.2], [2.2, 2.5], [Math.PI, 2.55]], tips: [[0, 0.15], [1.1, 0.2], [1.5, 0.06], [Math.PI, 0.1]], strands: 15, ridge: 0.05, lift: 0.06, part: 0 },
  bun: { len: [[0, 1.28], [0.85, 1.36], [1.1, 1.75], [1.4, 2.05], [2.1, 2.6], [Math.PI, 2.78]], tips: [[0, 0.14], [1.1, 0.1], [1.5, 0.04], [Math.PI, 0.04]], strands: 15, ridge: 0.05, lift: 0.055, gather: [0, 0.6, -0.8] },
  short: { len: [[0, 1.2], [0.7, 1.28], [1.2, 1.95], [1.7, 2.35], [Math.PI, 2.72]], tips: [[0, 0.16], [1.2, 0.1], [Math.PI, 0.12]], strands: 13, ridge: 0.06, lift: 0.085, sweepSide: 0.22, part: -0.5, hug: true },
  spiky: { len: [[0, 1.18], [0.7, 1.26], [1.2, 1.95], [1.7, 2.35], [Math.PI, 2.7]], tips: [[0, 0.22], [1.2, 0.18], [Math.PI, 0.22]], strands: 11, ridge: 0.09, lift: 0.1, hug: true },
  curly: { len: [[0, 1.25], [0.9, 1.4], [1.2, 2.3], [Math.PI, 2.55]], tips: [[0, 0.08], [Math.PI, 0.08]], strands: 12, ridge: 0.03, lift: 0.1, curls: 0.07 },
  buzz: { len: [[0, 1.02], [0.9, 1.15], [1.3, 1.95], [1.7, 2.35], [Math.PI, 2.7]], tips: [[0, 0]], strands: 12, ridge: 0, lift: 0.035, hug: true },
  elderBun: { len: [[0, 0.82], [0.9, 1.15], [1.35, 2.0], [1.7, 2.4], [Math.PI, 2.78]], tips: [[0, 0]], strands: 18, ridge: 0.05, lift: 0.05, gather: [0, 0.15, -0.99] },
}
SHELLS.braid = { ...SHELLS.ponytail, gather: [0.75, -0.25, -0.62] }
// 1.42 (user: "làm thêm nhiều kiểu tóc")
SHELLS.highPony = { ...SHELLS.ponytail, gather: [0, 0.82, -0.57] }
SHELLS.sideSwept = { len: [[0, 1.4], [0.6, 1.3], [1.2, 1.95], [1.7, 2.35], [Math.PI, 2.68]], tips: [[0, 0.24], [1.2, 0.1], [Math.PI, 0.1]], strands: 13, ridge: 0.065, lift: 0.095, sweepSide: 0.7, part: -0.95, hug: true }
SHELLS.pixie = { len: [[0, 1.34], [0.7, 1.4], [1.1, 1.98], [1.6, 2.12], [Math.PI, 2.45]], tips: [[0, 0.2], [1.1, 0.18], [Math.PI, 0.12]], strands: 14, ridge: 0.07, lift: 0.08, sweepSide: 0.45, part: 0.5, hug: true }
SHELLS.wavy = { ...SHELLS.long, curls: 0.04, strands: 13, ridge: 0.075 }
SHELLS.halfUp = { ...SHELLS.long, part: undefined }
SHELLS.mohawk = { ...SHELLS.buzz }
SHELLS.afro = { len: [[0, 1.22], [0.9, 1.45], [1.3, 2.15], [Math.PI, 2.4]], tips: [[0, 0.05]], strands: 10, ridge: 0.02, lift: 0.3, curls: 0.12 }
SHELLS.shoulder = { len: [[0, 1.3], [0.85, 1.36], [1.15, 2.6], [1.7, 2.78], [2.4, 2.86], [Math.PI, 2.9]], tips: [[0, 0.15], [1.2, 0.16], [Math.PI, 0.1]], strands: 15, ridge: 0.06, lift: 0.08, tuck: -0.07, part: 0.35 }
SHELLS.twinBuns = { ...SHELLS.bun, gather: undefined, len: SHELLS.twin.len, part: 0 }

/** Point on the skull ellipsoid, pushed out by `lift`, at polar angle th and azimuth a. */
function skull(th: number, a: number, lift: number): Vector3 {
  const s = Math.sin(th)
  return new Vector3(s * Math.sin(a) * HX, Math.cos(th) * HY, s * Math.cos(a) * HZ).multiplyScalar(R * (1 + lift))
}

/**
 * The hair shell. u = azimuth, v = from the crown to the cut line. The last rows fold back
 * inside (thickness), so the cut shows a real edge and you never look into a hollow.
 */
function shellGeometry(spec: ShellSpec, hat: boolean, k: number): BufferGeometry {
  const nu = segs(spec.strands * 4.6, k, spec.strands * 2)
  const nv = segs(16, k, 7)
  const nIn = Math.max(2, Math.round(nv * 0.35))
  const strands = spec.strands
  const gather = spec.gather ? new Vector3(...spec.gather) : null
  // a frame around the tie direction (for the gathered strands)
  const gn = gather?.clone().normalize() ?? new Vector3(0, 0, -1)
  const gu = new Vector3(1, 0, 0).addScaledVector(gn, -gn.x).normalize()
  const gv = new Vector3().crossVectors(gn, gu)
  const lenAt = (a: number) => {
    const aa = Math.abs(a)
    const sw = spec.sweepSide ?? 0
    // clump index that this azimuth falls in (bang points shifted sideways for a swept fringe)
    const x = ((a + Math.PI) / (Math.PI * 2)) * strands + (aa < 1.2 ? sw * (1 - aa / 1.2) : 0)
    return keyed(spec.len, aa) + keyed(spec.tips, aa) * (tip(x) - 0.35)
  }
  const point = (a: number, v: number, inner: boolean) => {
    const L = lenAt(a)
    const s = v * L
    const th = Math.min(s, FALL)
    const x = ((a + Math.PI) / (Math.PI * 2)) * strands
    // clumps get deeper toward the ends; flat on the crown (and under a hat)
    let ridge = spec.ridge * smooth(0.25, 1.1, s) * (hat && th < 1.4 ? 0 : 1)
    let ridgeShape = clump(x) - 0.6
    if (gather) {
      // at the back the strands run toward the tie: clumps measured around the tie direction
      const d = skull(th, a, 0).normalize()
      const w = smooth(0.9, 1.8, Math.abs(a))
      const gx = Math.atan2(d.dot(gu), d.dot(gv)) / (Math.PI * 2) * strands * 0.8
      const near = smooth(0.25, 0.9, gather.clone().normalize().angleTo(d))
      ridgeShape = lerp(ridgeShape, clump(gx) - 0.6, w)
      ridge = lerp(ridge, spec.ridge * 1.3 * near, w)
    }
    let lift = spec.lift * (1 + 0.45 * Math.cos(th) * Math.max(0, Math.cos(th))) // volume on top
    if (hat && th < 1.45) lift = Math.min(lift, 0.025)
    if (spec.part !== undefined) lift -= 0.035 * Math.exp(-(((a - spec.part) / 0.09) ** 2)) * (1 - smooth(0.1, 0.9, th))
    if (spec.curls) lift += spec.curls * Math.abs(Math.sin(a * 7.3 + th * 2) * Math.sin(th * 6.5 + a * 2.1))
    if (spec.tuck) lift -= spec.tuck * smooth(0.82, 1, v) * smooth(1.5, 2, th)
    let r = 1 + lift + ridge * ridgeShape
    if (inner) r -= 0.045 + 0.02 * smooth(0.9, 1.05, v)
    if (gather || spec.hug) return skull(s, a, (r - 1) * (1 - 0.55 * smooth(FALL, 2.6, s)))
    const p = skull(th, a, r - 1)
    if (s > FALL) {
      // a curtain falling from the skull, slightly away from the body
      const out = new Vector3(Math.sin(a), 0, Math.cos(a)).multiplyScalar(0.16)
      const drop = (s - FALL) * R
      p.addScaledVector(new Vector3(out.x, -1, out.z).normalize(), drop)
      // strands keep their clumps on the curtain
      const n = new Vector3(Math.sin(a) * HX, 0, Math.cos(a) * HZ).normalize()
      p.addScaledVector(n, R * ridge * (clump(x) - 0.6) * 0.6)
    }
    return p
  }
  return grid(nu, nv + nIn, (u, _v, _i, j) => {
    const a = u * Math.PI * 2 - Math.PI
    if (j <= nv) return point(a, j / nv, false).toArray() as P3
    const back = (j - nv) / nIn
    return point(a, 1 - back * 0.32, true).toArray() as P3
  }, true)
}

/** A light band across the top (the anime "angel ring"), only for close-up detail. */
function shineGeometry(spec: ShellSpec, k: number): BufferGeometry {
  const nu = segs(spec.strands * 4, k, 24)
  const strands = spec.strands
  return grid(nu, 2, (u, v) => {
    const a = (u - 0.5) * 2.3
    const x = ((a + Math.PI) / (Math.PI * 2)) * strands
    const th = 0.6 + v * 0.13 * tip(x, 0.7) - 0.03 * Math.cos(a)
    const lift = spec.lift * (1 + 0.45 * Math.cos(th) ** 2) + spec.ridge * smooth(0.25, 1.1, th) * (clump(x) - 0.6) + 0.006
    return skull(th, a, lift).toArray() as P3
  }, false)
}

// --- Locks ---------------------------------------------------------------------------------
const r = (x: number, y: number, z: number): P3 => [x * R, y * R, z * R]
/** Radius profile through keys [t, radius in R]. */
const prof = (keys: [number, number][]) => (t: number) => keyed(keys, t) * R

function ponytailGeo(k: number) {
  return cached(`pony${k}`, () =>
    sweep([r(0, 0.47, -1.0), r(0, 0.56, -1.17), r(0, 0.36, -1.33), r(0.02, -0.05, -1.38), r(0.04, -0.5, -1.3), r(0, -0.9, -1.18), r(-0.05, -1.2, -1.1)], {
      rings: segs(26, k, 12), radial: segs(14, k, 7),
      radius: prof([[0, 0.15], [0.1, 0.27], [0.4, 0.31], [0.78, 0.2], [1, 0]]),
      lobes: 5, lobeDepth: (t) => lerp(0.12, 0.55, t), twist: 0.7, flat: 0.92, up: [0, 0, -1], capStart: true,
    }),
  )
}
/** 1.42 a ponytail tied high on the crown, swinging out and down the back. */
function highPonyGeo(k: number) {
  return cached(`hpony${k}`, () =>
    sweep([r(0, 0.9, -0.6), r(0, 1.1, -0.78), r(0, 1.05, -1.05), r(0.02, 0.72, -1.3), r(0.03, 0.25, -1.42), r(0, -0.2, -1.36), r(-0.04, -0.6, -1.22)], {
      rings: segs(26, k, 12), radial: segs(14, k, 7),
      radius: prof([[0, 0.14], [0.1, 0.26], [0.4, 0.3], [0.78, 0.19], [1, 0]]),
      lobes: 5, lobeDepth: (t) => lerp(0.12, 0.55, t), twist: 0.7, flat: 0.9, up: [0, 0, -1], capStart: true,
    }),
  )
}
function twinTailGeo(side: number, k: number) {
  return cached(`twin${side}${k}`, () =>
    sweep([r(1.05 * side, 0.28, -0.2), r(1.24 * side, 0.26, -0.24), r(1.42 * side, 0.02, -0.3), r(1.46 * side, -0.45, -0.3), r(1.36 * side, -0.95, -0.24), r(1.2 * side, -1.32, -0.18)], {
      rings: segs(22, k, 10), radial: segs(12, k, 6),
      radius: prof([[0, 0.1], [0.12, 0.18], [0.45, 0.2], [0.8, 0.12], [1, 0]]),
      lobes: 4, lobeDepth: (t) => lerp(0.12, 0.5, t), twist: 0.5 * side, flat: 0.85, up: [side, 0, 0], capStart: true,
    }),
  )
}
function braidGeo(k: number) {
  const plaits = 6
  return cached(`braid${k}`, () =>
    sweep([r(0.86, -0.25, 0.05), r(0.88, -0.7, 0.3), r(0.8, -1.2, 0.58), r(0.7, -1.62, 0.7)], {
      rings: segs(plaits * 7, k, plaits * 4), radial: segs(10, k, 6),
      // each plait swells and crosses from one side to the other
      radius: (t) => R * (0.16 + 0.06 * Math.abs(Math.cos(Math.PI * t * plaits))) * (1 - smooth(0.88, 1, t) * 0.55),
      offset: (t) => [0, R * 0.05 * Math.sin(Math.PI * t * plaits)],
      lobes: 2, lobeDepth: () => 0.18, twist: plaits / 2, flat: 0.85, up: [1, 0, 0], capStart: true, capEnd: true,
    }),
  )
}
function braidTuftGeo(k: number) {
  return cached(`tuft${k}`, () =>
    sweep([r(0.7, -1.66, 0.71), r(0.67, -1.8, 0.74), r(0.66, -1.98, 0.74)], {
      rings: segs(8, k, 4), radial: segs(10, k, 6), radius: prof([[0, 0.08], [0.35, 0.15], [1, 0]]),
      lobes: 4, lobeDepth: () => 0.6, up: [1, 0, 0], capStart: true,
    }),
  )
}
/** A bun = one lock coiled into a spiral (in bun space: +Y = out of the head). */
function bunGeo(size: number, k: number) {
  return cached(`bun${size}${k}`, () => {
    const pts: P3[] = []
    const turns = 2.2
    for (let i = 0; i <= 18; i++) {
      const t = i / 18
      const ang = t * Math.PI * 2 * turns
      const rr = size * (1 - 0.62 * t)
      pts.push([Math.cos(ang) * rr, size * (1.15 * t - 0.3), Math.sin(ang) * rr])
    }
    return sweep(pts, {
      rings: segs(40, k, 18), radial: segs(10, k, 6),
      radius: (t) => size * (0.62 - 0.25 * t) * (1 - smooth(0.9, 1, t) * 0.7),
      lobes: 3, lobeDepth: () => 0.25, twist: 6, up: [0, 1, 0], capStart: true, capEnd: true,
    })
  })
}
function wispGeo(side: number, k: number) {
  return cached(`wisp${side}${k}`, () =>
    sweep([r(0.86 * side, 0.15, 0.48), r(0.96 * side, -0.25, 0.46), r(0.98 * side, -0.62, 0.42), r(0.9 * side, -0.88, 0.45)], {
      rings: segs(12, k, 6), radial: segs(8, k, 5), radius: prof([[0, 0.12], [0.3, 0.13], [1, 0]]),
      lobes: 2, lobeDepth: (t) => lerp(0.1, 0.4, t), flat: 0.6, up: [side, 0, 0.3], capStart: true,
    }),
  )
}
function ahogeGeo(k: number) {
  return cached(`ahoge${k}`, () =>
    sweep([r(0.02, 1.0, 0.1), r(0.04, 1.22, 0.16), r(0.12, 1.38, 0.05), r(0.16, 1.36, -0.12)], {
      rings: segs(10, k, 5), radial: segs(7, k, 5), radius: prof([[0, 0.07], [0.3, 0.06], [1, 0]]), flat: 0.6, up: [1, 0, 0], capStart: true,
    }),
  )
}
function spikeGeo(dir: Vector3, len: number, k: number) {
  const key = `spike${dir.toArray().map((x) => x.toFixed(2)).join()}${len}${k}`
  return cached(key, () => {
    const base = dir.clone().multiplyScalar(R * 0.98)
    const bend = new Vector3(0, 0.35, -0.35).multiplyScalar(len * R * 0.35)
    const mid = base.clone().addScaledVector(dir, len * R * 0.55).add(bend.clone().multiplyScalar(0.4))
    const end = base.clone().addScaledVector(dir, len * R).add(bend)
    return sweep([base.toArray() as P3, mid.toArray() as P3, end.toArray() as P3], {
      rings: segs(7, k, 4), radial: segs(7, k, 5), radius: prof([[0, 0.24], [0.5, 0.13], [1, 0]]), flat: 0.7, up: [0, 1, 0], capStart: true,
    })
  })
}
function curlGeo(side: number, k: number) {
  return cached(`curl${side}${k}`, () => {
    const pts: P3[] = []
    for (let i = 0; i <= 14; i++) {
      const t = i / 14
      const ang = t * Math.PI * 3.2
      pts.push(r(side * (0.98 + 0.1 * Math.cos(ang)), -0.55 - 0.75 * t, 0.05 + 0.1 * Math.sin(ang)))
    }
    return sweep(pts, { rings: segs(24, k, 10), radial: segs(7, k, 5), radius: prof([[0, 0.13], [0.7, 0.1], [1, 0]]), up: [0, 0, 1], capStart: true })
  })
}

/** Euler angles that turn +Z toward `dir`. */
const _m = new Matrix4()
const _q = new Quaternion()
const _e = new Euler()
function facing(dir: Vector3): P3 {
  _m.lookAt(dir.clone().multiplyScalar(3), new Vector3(), new Vector3(0, 1, 0))
  _q.setFromRotationMatrix(_m)
  _e.setFromQuaternion(_q)
  return [_e.x, _e.y, _e.z]
}
/** A scrunchie at `at`, its opening along `dir`. */
function tie(at: P3, dir: Vector3, size: number, color: string): ShapeItem {
  return { torus: [size * R, size * R * 0.42, 6, 16], at, rot: facing(dir), color }
}

/** Hair shapes for an outfit, in head space. `k` = detail (segment) factor. */
export function hairShapes(o: Outfit, hat: boolean, k: number): ShapeItem[] {
  const style = o.hairStyle
  const c = o.hair
  const tieColor = o.hairTie ?? o.accent ?? '#e2574c'
  const spec = SHELLS[style] ?? SHELLS.bob
  const kk = Math.round(k * 20) / 20
  const s: ShapeItem[] = [{ geometry: cached(`shell-${style}-${hat}-${kk}`, () => shellGeometry(spec, hat, kk)), color: c }]
  if (kk >= 0.6 && !hat && style !== 'buzz') {
    s.push({ geometry: cached(`shine-${style}-${kk}`, () => shineGeometry(spec, kk)), color: lightness(c, isDark(c) ? 0.13 : 0.07) })
  }
  const dark = lightness(c, -0.06)
  switch (style) {
    case 'ponytail':
      s.push({ geometry: ponytailGeo(kk), color: c })
      s.push(tie(r(0, 0.48, -1.03), new Vector3(0, 0.25, -1).normalize(), 0.12, tieColor))
      s.push({ geometry: wispGeo(1, kk), color: c }, { geometry: wispGeo(-1, kk), color: c })
      break
    case 'twin':
      for (const side of [-1, 1]) {
        s.push({ geometry: twinTailGeo(side, kk), color: c })
        s.push(tie(r(1.06 * side, 0.28, -0.2), new Vector3(side, 0, -0.15).normalize(), 0.1, tieColor))
      }
      break
    case 'braid':
      s.push({ geometry: braidGeo(kk), color: c }, { geometry: braidTuftGeo(kk), color: c })
      s.push(tie(r(0.7, -1.66, 0.71), new Vector3(-0.15, -1, 0.15).normalize(), 0.09, tieColor))
      s.push({ geometry: wispGeo(-1, kk), color: c })
      break
    case 'bun':
      if (hat) break
      s.push({ group: [{ geometry: bunGeo(0.3 * R, kk), color: c }, { sphere: [0.2 * R, 10, 8], color: dark }], at: r(0, 0.66, -0.82), rot: [-0.75, 0, 0] })
      s.push(tie(r(0, 0.56, -0.74), new Vector3(0, 0.6, -0.8).normalize(), 0.17, tieColor))
      s.push({ geometry: wispGeo(1, kk), color: c }, { geometry: wispGeo(-1, kk), color: c })
      break
    case 'twinBuns':
      if (hat) break
      for (const side of [-1, 1]) {
        const dir = new Vector3(side * 0.62, 0.78, -0.12).normalize()
        s.push({ group: [{ geometry: bunGeo(0.24 * R, kk), color: c }, { sphere: [0.16 * R, 10, 8], color: dark }], at: dir.clone().multiplyScalar(R * 1.02).toArray() as P3, rot: [-0.1, 0, -side * 0.68] })
        s.push(tie(dir.clone().multiplyScalar(R * 0.98).toArray() as P3, dir, 0.13, tieColor))
      }
      break
    case 'elderBun':
      s.push({ group: [{ geometry: bunGeo(0.28 * R, kk), color: c }, { sphere: [0.19 * R, 10, 8], color: dark }], at: r(0, 0.18, -1.02), rot: [-1.45, 0, 0] })
      s.push({ cyl: [R * 0.02, R * 0.02, R * 0.95, 5], at: r(0, 0.24, -1.12), rot: [0, 0, 1.25], color: '#8a5a3a' })
      break
    case 'short':
      if (!hat) s.push({ geometry: ahogeGeo(kk), color: c })
      break
    case 'spiky': {
      if (hat) break
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2 + 0.3
        const front = Math.cos(a) > 0.5
        const d = new Vector3(Math.sin(a) * 0.62, front ? 0.62 : 0.82, Math.cos(a) * 0.62 - 0.2).normalize()
        s.push({ geometry: spikeGeo(d, front ? 0.42 : 0.6, kk), color: c })
      }
      break
    }
    case 'curly':
      for (const side of [-1, 1]) s.push({ geometry: curlGeo(side, kk), color: c })
      break
    // --- 1.42 ---
    case 'highPony':
      s.push({ geometry: highPonyGeo(kk), color: c })
      s.push(tie(r(0, 0.9, -0.62), new Vector3(0, 0.75, -0.65).normalize(), 0.12, tieColor))
      s.push({ geometry: wispGeo(1, kk), color: c }, { geometry: wispGeo(-1, kk), color: c })
      break
    case 'sideSwept':
      s.push({ geometry: wispGeo(-1, kk), color: c })
      break
    case 'pixie':
      s.push({ geometry: wispGeo(1, kk), color: c }, { geometry: wispGeo(-1, kk), color: c })
      if (!hat) s.push({ geometry: ahogeGeo(kk), color: c })
      break
    case 'wavy':
      for (const side of [-1, 1]) s.push({ geometry: curlGeo(side, kk), color: c })
      break
    case 'halfUp':
      if (hat) break
      s.push({ group: [{ geometry: bunGeo(0.2 * R, kk), color: c }, { sphere: [0.13 * R, 10, 8], color: dark }], at: r(0, 0.84, -0.6), rot: [-0.6, 0, 0] })
      s.push(tie(r(0, 0.76, -0.55), new Vector3(0, 0.8, -0.6).normalize(), 0.12, tieColor))
      break
    case 'mohawk':
      if (hat) break
      for (let i = 0; i < 7; i++) {
        const t = 0.55 - i * 0.33
        s.push({ geometry: spikeGeo(new Vector3(0, Math.cos(t), Math.sin(t)).normalize(), i === 0 ? 0.42 : 0.56, kk), color: c })
      }
      break
    case 'afro':
      break
    default:
      break
  }
  return s
}

function isDark(hex: string) {
  const hsl = { h: 0, s: 0, l: 0 }
  new Color(hex).getHSL(hsl)
  return hsl.l < 0.35
}
