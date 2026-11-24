import { BufferAttribute, BufferGeometry } from 'three'
import natureUrl from '../../../assets/models/nature.bin?url'
import natureJson from '../../../assets/models/nature.json'
import cityUrl from '../../../assets/models/city.bin?url'
import cityJson from '../../../assets/models/city.json'
import foodUrl from '../../../assets/models/food.bin?url'
import foodJson from '../../../assets/models/food.json'
import interiorUrl from '../../../assets/models/interior.bin?url'
import interiorJson from '../../../assets/models/interior.json'
import farmUrl from '../../../assets/models/farm.bin?url'
import farmJson from '../../../assets/models/farm.json'
import type { Vec3 } from '../../../data/config'
import type { ShapeItem } from './Shapes'

/**
 * Library models (1.33): CC0 low-poly models by Quaternius — trees, bushes, flowers, potted plants (pack
 * "nature"), buildings and street furniture (pack "city") — converted by tools/glb2props.mjs into Int16
 * vertices + Uint16 indices per material. Each model becomes Shapes items (one per material, flat-shaded), so
 * it still merges into the scene's ONE vertex-coloured mesh and can be repainted per material.
 *
 * Packs are fetched before a scene mounts (registry.ts `withModels`), so scene code can call `modelShapes`
 * synchronously; while a pack is missing (offline without cache) it returns null and callers keep their
 * hand-built shapes.
 */

/** 1.40 "food" = KayKit Restaurant Bits (CC0, tools/kaykit2props.mjs): pots, bowls, stools, tables, crates, jars… */
/** 1.41 "interior" = Quaternius Ultimate House Interior (CC0): shelves, chairs, sofas, lamps, cabinets for the shop rooms (names start with i). */
export type ModelPack = 'nature' | 'city' | 'food' | 'interior' | 'farm'
interface Group {
  mat: string
  color: string
  /** [first vertex, vertex count] in the pack's Int16 xyz data. */
  v: [number, number]
  /** [first index, index count]. */
  i: [number, number]
}
interface Model {
  /** Width, height, depth in metres (standing on y = 0, centred on x / z). */
  size: Vec3
  groups: Group[]
}
interface Manifest {
  models: Record<string, Model>
  int16Bytes: number
}
const PACKS: Record<ModelPack, { url: string; data: Manifest }> = {
  nature: { url: natureUrl, data: natureJson as unknown as Manifest },
  city: { url: cityUrl, data: cityJson as unknown as Manifest },
  food: { url: foodUrl, data: foodJson as unknown as Manifest },
  interior: { url: interiorUrl, data: interiorJson as unknown as Manifest },
  /** 1.42 Quaternius Crops (CC0): vegetables, grass, bamboo, an orange tree (names start with f). */
  farm: { url: farmUrl, data: farmJson as unknown as Manifest },
}

const built = new Map<string, BufferGeometry[]>()
const loading: Partial<Record<ModelPack, Promise<void>>> = {}
const ready: Partial<Record<ModelPack, boolean>> = {}

const PACK_ORDER: ModelPack[] = ['nature', 'city', 'food', 'interior', 'farm']
const packOf = (name: string): ModelPack | null => PACK_ORDER.find((p) => name in PACKS[p].data.models) ?? null

export const modelPackReady = (pack: ModelPack) => !!ready[pack]

/** Fetches and builds a pack once (later calls share the promise). Never rejects. */
export function loadModelPack(pack: ModelPack): Promise<void> {
  loading[pack] ??= fetch(PACKS[pack].url)
    .then((r) => {
      if (!r.ok) throw new Error(`${pack}.bin ${r.status}`)
      return r.arrayBuffer()
    })
    .then((buf) => {
      const { data } = PACKS[pack]
      const ints = new Int16Array(buf, 0, data.int16Bytes / 2)
      const index = new Uint16Array(buf, data.int16Bytes)
      for (const [name, m] of Object.entries(data.models)) {
        built.set(
          name,
          m.groups.map((g) => {
            const pos = new Float32Array(g.v[1] * 3)
            for (let k = 0; k < pos.length; k++) pos[k] = ints[g.v[0] * 3 + k] / 1000
            const indexed = new BufferGeometry()
            indexed.setAttribute('position', new BufferAttribute(pos, 3))
            indexed.setIndex(new BufferAttribute(index.slice(g.i[0], g.i[0] + g.i[1]), 1))
            // Flat shading, like the rest of the low-poly world
            const flat = indexed.toNonIndexed()
            flat.computeVertexNormals()
            indexed.dispose()
            return flat
          }),
        )
      }
      ready[pack] = true
    })
    .catch((e) => {
      loading[pack] = undefined
      console.warn('model pack', pack, e)
    })
  return loading[pack]!
}

export const loadModelPacks = (packs: ModelPack[]) => Promise.all(packs.map(loadModelPack)).then(() => undefined)

/** Size [w, h, d] of a model in metres (known without loading). */
export function modelSize(name: string): Vec3 {
  const pack = packOf(name)
  return pack ? PACKS[pack].data.models[name].size : [1, 1, 1]
}

/** A colour per material name (missing = the model's own colour), or a function of (material, own colour). */
export type Paint = Record<string, string> | ((mat: string, color: string) => string)

export interface ModelOptions {
  paint?: Paint
  /** Brightness from the bottom to the top of each painted part (e.g. leaves lit from above). */
  grad?: Record<string, [number, number]>
  /** Scale so the model is this tall (metres); otherwise `scale`. */
  height?: number
  /** 1.34: …but never wider than this (metres, x or z) — big crowns poked into balconies and signs. */
  maxWidth?: number
  scale?: number
}

/** One model as Shapes items in local space (origin on the ground), or null while its pack is not loaded. */
export function modelShapes(name: string, o: ModelOptions = {}): ShapeItem[] | null {
  const geo = built.get(name)
  const pack = packOf(name)
  if (!geo || !pack) return null
  const m = PACKS[pack].data.models[name]
  let k = o.height ? o.height / m.size[1] : (o.scale ?? 1)
  if (o.maxWidth) k = Math.min(k, o.maxWidth / Math.max(m.size[0], m.size[2]))
  const paint = o.paint
  const items: ShapeItem[] = m.groups.map((g, i) => {
    const color = !paint ? g.color : typeof paint === 'function' ? paint(g.mat, g.color) : (paint[g.mat] ?? g.color)
    const grad = o.grad?.[g.mat]
    return grad ? { geometry: geo[i], color, grad } : { geometry: geo[i], color }
  })
  return k === 1 ? items : [{ group: items, scale: [k, k, k] }]
}

/**
 * 1.36: how far forward (local +z, the model's front) the model reaches between heights y0…y1 within |x| < xHalf —
 * the real wall (or balcony) where a sign can hang. The bounding box also holds steps and canopies that stick out,
 * so signs placed on it floated in the air. Null when the pack is not loaded or nothing is there.
 */
export function modelFrontAt(name: string, y0: number, y1: number, xHalf: number): number | null {
  const geo = built.get(name)
  if (!geo) return null
  let best = -Infinity
  for (const g of geo) {
    const p = g.attributes.position.array
    for (let i = 0; i < p.length; i += 3) {
      const y = p[i + 1]
      if (y >= y0 && y <= y1 && Math.abs(p[i]) < xHalf && p[i + 2] > best) best = p[i + 2]
    }
  }
  return best === -Infinity ? null : best
}

/** Deterministic pick from a list by an integer / float seed. */
export function pickBy<T>(list: readonly T[], seed: number): T {
  const h = Math.abs(Math.floor(Math.sin(seed * 127.1 + 311.7) * 43758.5453))
  return list[h % list.length]
}
