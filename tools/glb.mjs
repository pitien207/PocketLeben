// Tiny GLB reader for the asset converters (tools/glb2people.mjs, tools/glb2props.mjs).
// Only what the Quaternius packs use: one binary buffer, float/uint accessors, node TRS / matrix.
import fs from 'node:fs'
import { Matrix4, Quaternion, Vector3 } from 'three'

export function readGlb(file) {
  const b = fs.readFileSync(file)
  if (b.toString('utf8', 0, 4) !== 'glTF') throw new Error(`${file}: not a GLB`)
  const jsonLen = b.readUInt32LE(12)
  const json = JSON.parse(b.subarray(20, 20 + jsonLen).toString('utf8'))
  const binStart = 20 + jsonLen + 8
  const bin = b.subarray(binStart, binStart + b.readUInt32LE(20 + jsonLen))
  const COMPONENTS = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }
  const TYPES = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array }

  /** Accessor → plain array of numbers (normalized ints become 0…1). */
  function accessor(i) {
    const a = json.accessors[i]
    const n = COMPONENTS[a.type]
    const T = TYPES[a.componentType]
    const view = json.bufferViews[a.bufferView]
    const stride = view.byteStride || n * T.BYTES_PER_ELEMENT
    const base = (view.byteOffset || 0) + (a.byteOffset || 0)
    const out = new Array(a.count * n)
    const dv = new DataView(bin.buffer, bin.byteOffset, bin.byteLength)
    const get = {
      5120: (o) => dv.getInt8(o),
      5121: (o) => dv.getUint8(o),
      5122: (o) => dv.getInt16(o, true),
      5123: (o) => dv.getUint16(o, true),
      5125: (o) => dv.getUint32(o, true),
      5126: (o) => dv.getFloat32(o, true),
    }[a.componentType]
    const max = { 5121: 255, 5123: 65535, 5120: 127, 5122: 32767 }[a.componentType]
    for (let k = 0; k < a.count; k++)
      for (let c = 0; c < n; c++) {
        const v = get(base + k * stride + c * T.BYTES_PER_ELEMENT)
        out[k * n + c] = a.normalized && max ? v / max : v
      }
    return { data: out, n, count: a.count }
  }

  const parent = new Map()
  json.nodes.forEach((node, i) => (node.children || []).forEach((c) => parent.set(c, i)))
  const localMatrix = (node) =>
    node.matrix
      ? new Matrix4().fromArray(node.matrix)
      : new Matrix4().compose(new Vector3(...(node.translation || [0, 0, 0])), new Quaternion(...(node.rotation || [0, 0, 0, 1])), new Vector3(...(node.scale || [1, 1, 1])))
  const worldCache = new Map()
  function world(i) {
    if (worldCache.has(i)) return worldCache.get(i)
    const p = parent.get(i)
    const m = p == null ? localMatrix(json.nodes[i]) : world(p).clone().multiply(localMatrix(json.nodes[i]))
    worldCache.set(i, m)
    return m
  }

  /** linear 0…1 → sRGB hex */
  const toSrgb = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)
  const hex = (rgb) => '#' + rgb.slice(0, 3).map((c) => Math.round(Math.min(1, Math.max(0, toSrgb(c))) * 255).toString(16).padStart(2, '0')).join('')
  const materialName = (i) => (i == null ? 'default' : json.materials[i].name)
  const materialColor = (i) => hex(json.materials?.[i]?.pbrMetallicRoughness?.baseColorFactor ?? [0.8, 0.8, 0.8, 1])

  return { json, accessor, world, parent, materialName, materialColor }
}

/** Everything a static model draws, flattened into world space: groups per material. */
export function staticGroups(g) {
  const groups = new Map()
  g.json.nodes.forEach((node, ni) => {
    if (node.mesh == null) return
    const m = g.world(ni)
    for (const prim of g.json.meshes[node.mesh].primitives) {
      if (prim.mode != null && prim.mode !== 4) continue
      const pos = g.accessor(prim.attributes.POSITION)
      const idx = prim.indices != null ? g.accessor(prim.indices).data : [...Array(pos.count).keys()]
      const name = g.materialName(prim.material)
      if (!groups.has(name)) groups.set(name, { mat: name, color: g.materialColor(prim.material), pos: [], idx: [] })
      const grp = groups.get(name)
      const base = grp.pos.length / 3
      const v = new Vector3()
      for (let k = 0; k < pos.count; k++) {
        v.set(pos.data[k * 3], pos.data[k * 3 + 1], pos.data[k * 3 + 2]).applyMatrix4(m)
        grp.pos.push(v.x, v.y, v.z)
      }
      for (const i of idx) grp.idx.push(base + i)
    }
  })
  return [...groups.values()]
}

/**
 * Fewer triangles (meshoptimizer, shipped with three): keeps `keep` of the triangles of a group whose vertices are
 * `pos` (flat xyz) and returns { idx, used } — new indices into a compacted vertex list and, for each new vertex,
 * its old index (so other per-vertex data such as bone weights can be carried over). Open borders stay put, so
 * neighbouring material groups still meet.
 */
export async function simplifyGroup(pos, idx, keep, error = 0.04) {
  const { MeshoptSimplifier } = await import('three/examples/jsm/libs/meshopt_simplifier.module.js')
  await MeshoptSimplifier.ready
  const target = Math.max(3, Math.floor((idx.length * keep) / 3) * 3)
  const [out] = MeshoptSimplifier.simplify(new Uint32Array(idx), new Float32Array(pos), 3, target, error, ['LockBorder'])
  const used = []
  const map = new Map()
  const newIdx = []
  for (const i of out) {
    if (!map.has(i)) {
      map.set(i, used.length)
      used.push(i)
    }
    newIdx.push(map.get(i))
  }
  return { idx: newIdx, used }
}
