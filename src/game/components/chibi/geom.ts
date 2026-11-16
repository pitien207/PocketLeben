import { BufferGeometry, CatmullRomCurve3, Float32BufferAttribute, Quaternion, Vector3 } from 'three'

/**
 * Small geometry helpers for the chibi: parametric surfaces (hair shells, cloth) and swept
 * locks (ponytails, braids, buns). Everything is built once per outfit and cached by the caller.
 */

export type P3 = [number, number, number]

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
export const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** Rounded "clump" profile, 0 at the creases (integers), 1 in the middle of a clump. */
export const clump = (x: number) => Math.sqrt(Math.abs(Math.sin(Math.PI * x)))
/** Pointed tip profile: 1 at the middle of a clump, 0 at the creases. */
export const tip = (x: number, sharp = 1.4) => Math.pow(1 - Math.abs(2 * (x - Math.floor(x)) - 1), sharp)

/** Piecewise-smooth curve through keys [x, y] (x ascending), cosine-eased between keys. */
export function keyed(keys: [number, number][], x: number) {
  if (x <= keys[0][0]) return keys[0][1]
  for (let i = 1; i < keys.length; i++) {
    const [x1, y1] = keys[i]
    if (x <= x1) {
      const [x0, y0] = keys[i - 1]
      const t = (x - x0) / (x1 - x0)
      return lerp(y0, y1, (1 - Math.cos(Math.PI * t)) / 2)
    }
  }
  return keys[keys.length - 1][1]
}

/**
 * Indexed grid surface. `fn(u, v)` with u, v in [0, 1]; with `wrapU` the last column joins the first
 * (smooth normals across the seam). Triangles face outward for a surface going around +Y with
 * u = azimuth (0 = +Z, ¼ = +X) and v going down; `flip` reverses them.
 */
export function grid(nu: number, nv: number, fn: (u: number, v: number, i: number, j: number) => P3, wrapU: boolean, flip = false): BufferGeometry {
  const cols = wrapU ? nu : nu + 1
  const pos = new Float32Array(cols * (nv + 1) * 3)
  let p = 0
  for (let j = 0; j <= nv; j++) {
    for (let i = 0; i < cols; i++) {
      const v = fn(i / nu, j / nv, i, j)
      pos[p++] = v[0]
      pos[p++] = v[1]
      pos[p++] = v[2]
    }
  }
  const idx: number[] = []
  for (let j = 0; j < nv; j++) {
    for (let i = 0; i < nu; i++) {
      const a = j * cols + i
      const b = j * cols + (wrapU ? (i + 1) % cols : i + 1)
      const c = (j + 1) * cols + i
      const d = (j + 1) * cols + (wrapU ? (i + 1) % cols : i + 1)
      if (flip) idx.push(a, b, c, b, d, c)
      else idx.push(a, c, b, c, d, b)
    }
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

/** Parallel-transport frames along a polyline (no sudden flips like Frenet frames). */
function frames(pts: Vector3[], up: Vector3) {
  const T: Vector3[] = []
  const N: Vector3[] = []
  const Bn: Vector3[] = []
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)]
    const b = pts[Math.min(pts.length - 1, i + 1)]
    T.push(b.clone().sub(a).normalize())
  }
  let n = up.clone().addScaledVector(T[0], -up.dot(T[0]))
  if (n.lengthSq() < 1e-6) n = new Vector3(1, 0, 0).addScaledVector(T[0], -T[0].x)
  n.normalize()
  const q = new Quaternion()
  for (let i = 0; i < pts.length; i++) {
    if (i > 0) {
      q.setFromUnitVectors(T[i - 1], T[i])
      n = n.clone().applyQuaternion(q).normalize()
    }
    N.push(n)
    Bn.push(new Vector3().crossVectors(T[i], n).normalize())
  }
  return { T, N, B: Bn }
}

export interface SweepOptions {
  /** Rings along the path and vertices per ring. */
  rings: number
  radial: number
  /** Radius along the path (t in [0, 1]); reach 0 at t = 1 for a pointed tip. */
  radius: (t: number) => number
  /** Strand clumps around the lock and their depth along the path. */
  lobes?: number
  lobeDepth?: (t: number) => number
  /** Turns of the clumps along the path (a twisted lock). */
  twist?: number
  /** Cross-section squash along the binormal (1 = round). */
  flat?: number
  /** Offset of the centre in (normal, binormal) at t — braids wiggle with it. */
  offset?: (t: number) => [number, number]
  /** "Up" hint for the first frame's normal. */
  up?: P3
  /** Close the start with a cap (the end closes itself when the radius is 0). */
  capStart?: boolean
  capEnd?: boolean
}

/** A lock of hair (or a strap, a tail…) swept along a smooth curve through `points`. */
export function sweep(points: P3[], o: SweepOptions): BufferGeometry {
  const curve = new CatmullRomCurve3(points.map((p) => new Vector3(...p)), false, 'centripetal')
  const pts = curve.getSpacedPoints(o.rings)
  const { N, B: Bn } = frames(pts, new Vector3(...(o.up ?? [0, 0, 1])))
  const lobes = o.lobes ?? 0
  const flat = o.flat ?? 1
  const twist = o.twist ?? 0
  const pos: number[] = []
  const ring = o.radial
  for (let i = 0; i < pts.length; i++) {
    const t = i / (pts.length - 1)
    const r = Math.max(0, o.radius(t))
    const depth = lobes ? (o.lobeDepth?.(t) ?? 0.2) : 0
    const [dn, db] = o.offset?.(t) ?? [0, 0]
    const c = pts[i].clone().addScaledVector(N[i], dn).addScaledVector(Bn[i], db)
    for (let k = 0; k < ring; k++) {
      const phi = (k / ring) * Math.PI * 2
      const lobe = lobes ? 1 + depth * (clump((k / ring) * lobes + twist * t) - 0.6) : 1
      const rr = r * lobe
      const v = c.clone().addScaledVector(N[i], Math.cos(phi) * rr).addScaledVector(Bn[i], Math.sin(phi) * rr * flat)
      pos.push(v.x, v.y, v.z)
    }
  }
  const idx: number[] = []
  for (let i = 0; i < pts.length - 1; i++) {
    for (let k = 0; k < ring; k++) {
      const a = i * ring + k
      const b = i * ring + ((k + 1) % ring)
      const c = (i + 1) * ring + k
      const d = (i + 1) * ring + ((k + 1) % ring)
      idx.push(a, b, c, b, d, c)
    }
  }
  const capAt = (i: number, outward: number) => {
    const centre = pos.length / 3
    const p = pts[i]
    pos.push(p.x, p.y, p.z)
    for (let k = 0; k < ring; k++) {
      const a = i * ring + k
      const b = i * ring + ((k + 1) % ring)
      if (outward < 0) idx.push(centre, b, a)
      else idx.push(centre, a, b)
    }
  }
  if (o.capStart) capAt(0, -1)
  if (o.capEnd) capAt(pts.length - 1, 1)
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

/** Segment count scaled by the detail factor, with a floor. */
export const segs = (n: number, k: number, min: number) => Math.max(min, Math.round(n * k))
