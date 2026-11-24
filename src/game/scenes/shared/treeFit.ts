import { useEffect, useRef, useSyncExternalStore } from 'react'
import { useFrame } from '@react-three/fiber'
import { useRapier } from '@react-three/rapier'
import { Box3, type BufferGeometry } from 'three'
import type { Vec3 } from '../../../data/config'
import { GROUP } from '../../systems/collisionGroups'
import type { ShapeGroup, ShapeItem } from './Shapes'

/**
 * 1.42 — trees no longer poke through houses (user: "nhiều cây đang chọc xuyên qua nhà").
 * The library trees (1.33) have crowns 3–4 m wide; many stand on pavements 1 m from a facade or a balcony.
 * Instead of hand-tuning every call site, the scene's real building colliders are read once after they exist
 * over the first frames (`<TreeClearance />`, mounted in every outdoor scene), and `fitTree()` squeezes a crown sideways so it ends
 * before the nearest wall (+ `BALCONY` for balconies and signs). The tree keeps its height: a narrow, pruned
 * street tree. Components that place trees add `useBlockerVersion()` to their memo deps so they rebuild once.
 */

interface Box {
  x0: number
  z0: number
  x1: number
  z1: number
}

/** Balconies, awnings and signs stick out of the colliders by about this much. */
const BALCONY = 0.75
/** Only things that reach up into a crown count (walls, not railings or low kerbs). */
const MIN_TOP = 2.4
/** Never narrower than this share of the crown. */
const MIN_FIT = 0.4

let boxes: Box[] = []
let version = 0
const listeners = new Set<() => void>()
const emit = () => {
  version++
  for (const l of listeners) l()
}

/** Re-render (rebuild the merged tree meshes) when the building footprints become known. */
export function useBlockerVersion() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => version,
  )
}

/** Distance in the ground plane from (x, z) to the nearest building footprint (0 inside one). */
export function roomAround(x: number, z: number): number {
  let best = Infinity
  for (const b of boxes) {
    const dx = Math.max(b.x0 - x, 0, x - b.x1)
    const dz = Math.max(b.z0 - z, 0, z - b.z1)
    const d = Math.hypot(dx, dz)
    if (d < best) best = d
  }
  return best
}

const geoBox = new WeakMap<BufferGeometry, Box3>()
/** Half the widest horizontal extent of some shapes around their local origin (metres). */
function radiusOf(items: ShapeItem[], k = 1): number {
  let r = 0
  for (const it of items) {
    const at = it.at ?? [0, 0, 0]
    const s = it.scale ?? [1, 1, 1]
    const off = Math.hypot(at[0], at[2])
    let own: number
    if ('group' in it) own = radiusOf(it.group) * Math.max(s[0], s[2])
    else if ('geometry' in it) {
      let bb = geoBox.get(it.geometry)
      if (!bb) {
        it.geometry.computeBoundingBox()
        bb = it.geometry.boundingBox!.clone()
        geoBox.set(it.geometry, bb)
      }
      own = Math.max(Math.abs(bb.min.x), Math.abs(bb.max.x), Math.abs(bb.min.z), Math.abs(bb.max.z)) * Math.max(s[0], s[2])
    } else if ('ico' in it) own = it.ico[0] * Math.max(s[0], s[2])
    else if ('sphere' in it) own = it.sphere[0] * Math.max(s[0], s[2])
    else if ('cyl' in it) own = Math.max(it.cyl[0], it.cyl[1]) * Math.max(s[0], s[2])
    else own = 0
    r = Math.max(r, (off + own) * k)
  }
  return r
}

/**
 * Like `place(tree, at, rotY, scale)`, but the crown ends before the nearest building: the tree gets smaller (a
 * younger tree) and, when that is not enough, a little narrower — never a thin column (user saw "flames").
 */
export function fitTree(tree: ShapeItem[], at: Vec3, rotY = 0, scale = 1): ShapeGroup {
  const r = radiusOf(tree, scale)
  const room = boxes.length ? roomAround(at[0], at[2]) : Infinity
  const h = r > 0 && room < r ? Math.max(MIN_FIT, room / r) : 1
  // share the fit: shrink the whole tree first (down to 0.62), the rest sideways
  const u = Math.max(0.62, Math.sqrt(h))
  const side = Math.max(0.62, h / u)
  return { group: tree, at, rot: [0, rotY, 0], scale: [scale * u * side, scale * u, scale * u * side] }
}

/** Test hook: the footprints and the distance to them. */
export const treeClearance = { boxes: () => boxes, roomAround }
if (import.meta.env.DEV) (globalThis as { __treeFit?: unknown }).__treeFit = treeClearance

/** Frames (after mounting) at which the colliders are read again: Rapier creates them over the first frames. */
const READ_AT = new Set([2, 20, 60, 120])

/**
 * Reads the building colliders of the loaded scene a few times over the first frames (Rapier creates them in
 * effects, not all at once) and publishes their footprints whenever their number changed. Mount it once per
 * outdoor scene, inside <Physics>.
 */
export function TreeClearance() {
  const { world } = useRapier()
  useEffect(
    () => () => {
      boxes = []
      emit()
    },
    [],
  )
  const frames = useRef(0)
  useFrame(() => {
    if (frames.current > 120) return
    if (!READ_AT.has(++frames.current)) return
    const out: Box[] = []
    world.forEachCollider((c) => {
      const membership = c.collisionGroups() >>> 16
      if (!(membership & (1 << GROUP.cameraBlocker))) return
      if (c.isSensor()) return
      const t = c.translation()
      const q = c.rotation()
      const shape = c.shape as unknown as { halfExtents?: { x: number; y: number; z: number }; radius?: number; halfHeight?: number }
      let hx: number, hy: number, hz: number
      if (shape.halfExtents) {
        ;({ x: hx, y: hy, z: hz } = shape.halfExtents)
      } else if (shape.radius !== undefined && shape.halfHeight !== undefined) {
        if (shape.radius < 0.6) return // posts, trunks, bollards
        hx = hz = shape.radius
        hy = shape.halfHeight
      } else return
      if (t.y + hy < MIN_TOP) return
      // Yaw only (buildings stand upright): the footprint's bounding box
      const yaw = Math.atan2(2 * (q.w * q.y + q.x * q.z), 1 - 2 * (q.y * q.y + q.x * q.x))
      const c0 = Math.abs(Math.cos(yaw))
      const s0 = Math.abs(Math.sin(yaw))
      const ex = hx * c0 + hz * s0 + BALCONY
      const ez = hx * s0 + hz * c0 + BALCONY
      out.push({ x0: t.x - ex, x1: t.x + ex, z0: t.z - ez, z1: t.z + ez })
    })
    if (out.length === boxes.length) return
    boxes = out
    emit()
  })
  return null
}
