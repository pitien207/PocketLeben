import { BufferAttribute, BufferGeometry, Color } from 'three'
import binUrl from '../../../assets/models/cars.bin?url'
import manifest from '../../../assets/models/cars.json'
import type { ShapeItem } from './Shapes'

/**
 * The traffic cars (1.22): six low-poly cars from the Quaternius Cars Pack (CC0), converted by
 * tools/obj2cars.mjs into cars.bin (Int16 millimetre vertices + Uint16 indices per material) and
 * cars.json. Loaded once on demand; each car becomes Shapes items (one per material) so it still
 * merges into ONE vertex-coloured mesh. The body is painted in the traffic colour.
 */

interface Group {
  mat: string
  color: string
  paint?: 'body' | 'dark'
  /** [offset, count] in Int16 components (x, y, z). */
  v: [number, number]
  /** [offset, count] in indices. */
  i: [number, number]
}
interface Model {
  name: string
  /** Width, height, length in metres. */
  size: [number, number, number]
  groups: Group[]
}
const DATA = manifest as unknown as { models: Model[]; int16Bytes: number }

export const CAR_MODELS = DATA.models.map((m) => m.name)

let parts: Map<string, BufferGeometry[]> | null = null
let loading: Promise<void> | null = null

export const carModelsReady = () => parts !== null

/** Fetches and builds the car geometry once (later calls share the promise). */
export function loadCarModels(): Promise<void> {
  loading ??= fetch(binUrl)
    .then((r) => {
      if (!r.ok) throw new Error(`cars.bin ${r.status}`)
      return r.arrayBuffer()
    })
    .then((buf) => {
      const ints = new Int16Array(buf, 0, DATA.int16Bytes / 2)
      const index = new Uint16Array(buf, DATA.int16Bytes)
      const map = new Map<string, BufferGeometry[]>()
      for (const m of DATA.models) {
        map.set(
          m.name,
          m.groups.map((g) => {
            const pos = new Float32Array(g.v[1])
            for (let k = 0; k < g.v[1]; k++) pos[k] = ints[g.v[0] + k] / 1000
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
      parts = map
    })
    .catch((e) => {
      // Offline without the file cached: keep the hand-built cars (props.ts carShapes).
      loading = null
      console.warn('car models', e)
    })
  return loading
}

const shade = (color: string, l: number) => '#' + new Color(color).offsetHSL(0, 0, l).getHexString()

/** One car as Shapes items, or null while the models are not loaded. */
export function carModelShapes(name: string, color: string): ShapeItem[] | null {
  const geo = parts?.get(name)
  const model = DATA.models.find((m) => m.name === name)
  if (!geo || !model) return null
  return model.groups.map((g, k) => ({ geometry: geo[k], color: g.paint === 'body' ? color : g.paint === 'dark' ? shade(color, -0.16) : g.color }))
}
