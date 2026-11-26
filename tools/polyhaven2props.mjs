// 1.46: Poly Haven models (CC0, https://polyhaven.com — realistic photo-textured props) → the game's model pack
// "urban" (src/assets/models/urban.bin + urban.json), read by src/game/scenes/shared/models.ts like every other pack.
//
//   node tools/polyhaven2props.mjs <folder> [--sizes]
//
// <folder>/<asset>/<asset>.gltf + .bin + textures/<map>_diff_1k.png (the 1k glTF download, diffuse maps as PNG).
// The game draws flat vertex colours in one merged mesh, so a textured model is turned into a few flat-coloured
// groups: every triangle samples its diffuse map (UV centre + three points toward the corners), the colours are
// clustered (k-means, `k` per model), small speckles take their neighbours' colour, and each colour group is then
// simplified to the model's triangle budget (meshoptimizer; sloppy pass when the clean one stops early). Modular kits
// (the power poles) instead keep one colour per part and simplify every part on its own.
import fs from 'node:fs'
import path from 'node:path'
import { Vector3 } from 'three'
import { readGltf, readPng } from './glb.mjs'

const SRC = process.argv[2]
if (!SRC) throw new Error('usage: node tools/polyhaven2props.mjs <folder> [--sizes]')
const SIZES = process.argv.includes('--sizes')
const OUT = path.resolve('src/assets/models')

/**
 * name in the game → { a: asset, only / skip: node-name filters, k: colours, tris: triangle budget, clean: only the
 * border-keeping simplification (may stay above the budget, never shards), perNode: one flat colour per glTF node (a part
 * such as the pole, a crossarm, an insulator) and each part simplified on its own as a closed mesh, s: scale }.
 * Real-world size (metres) is kept; names start with "u".
 */
/** Bolts, nails, rings and clamps: many triangles, invisible from the street. */
const POLE_SKIP = /bolt|nail|ring_|fastener/

const MODELS = {
  // Hà Nội power poles (modular_electricity_poles presets: pole + crossarms + insulators + fuse / transformer)
  uPoleTransformer: { a: 'modular_electricity_poles', only: /^preset_01_/, skip: POLE_SKIP, perNode: true, tris: 900 },
  uPoleCross: { a: 'modular_electricity_poles', only: /^preset_02_/, skip: POLE_SKIP, perNode: true, tris: 700 },
  uPoleFuse: { a: 'modular_electricity_poles', only: /^preset_03_/, skip: POLE_SKIP, perNode: true, tris: 800 },
  uTransformer: { a: 'modular_electricity_poles', only: /^transformer_01$/, k: 3, tris: 300 },
  uAircon: { a: 'exterior_aircon_unit', only: /^exterior_aircon_unit$/, k: 4, tris: 200 },
  uUtilityBox: { a: 'utility_box_01', k: 3, tris: 160 },
  uUtilityBox2: { a: 'utility_box_02', k: 3, tris: 200 },
  uCrate: { a: 'plastic_crate_02', k: 2, tris: 160 },
  uChair: { a: 'plastic_monobloc_chair_01', k: 2, tris: 260 },
  uGasTank: { a: 'small_lpg_tank', k: 3, tris: 200 },
  uLampTall: { a: 'street_lamp_01', k: 3, tris: 400 },
  uLampWall: { a: 'street_lamp_02', k: 3, tris: 300 },
  uClayPot: { a: 'planter_pot_clay', k: 2, tris: 120 },
  uVase: { a: 'ceramic_vase_03', k: 3, tris: 120 },
  uBarrier: { a: 'concrete_road_barrier', k: 3, tris: 220 },
  uHydrant: { a: 'fire_hydrant', only: /^fire_hydrant(_cap_0\d)?$/, k: 3, tris: 240 },
  uTrashbag: { a: 'trashbag', k: 2, tris: 160 },
  uManhole: { a: 'water_manhole_cover', k: 2, tris: 80 },
  uTrashCan: { a: 'metal_trash_can', only: /^metal_trash_can(_lid|_handle_left|_handle_right)?$/, k: 3, tris: 200 },
  uCafeSet: { a: 'outdoor_table_chair_set_01', k: 3, tris: 500 },
  uPicnic: { a: 'wooden_picnic_table', k: 2, tris: 300 },
  uBrassPot: { a: 'brass_pot_01', k: 2, tris: 200 },
  uChineseStool: { a: 'chinese_stool', k: 3, tris: 300 },
  uChineseChair: { a: 'chinese_armchair', k: 3, tris: 500 },
  uWaterBarrel: { a: 'Barrel_02', k: 2, tris: 200 },
  uShutter: { a: 'rollershutter_door', only: /^rollershutter_door$/, k: 2, tris: 120 },
  uSecurityLight: { a: 'security_light', k: 2, tris: 160 },
  uLantern: { a: 'wooden_lantern_01', k: 3, tris: 300 },
}

const hex = (rgb) => '#' + rgb.map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('')
const toSrgb = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)

const pngCache = new Map()
function texture(dir, uri) {
  const file = path.join(dir, decodeURIComponent(uri).replace(/\.jpe?g$/i, '.png'))
  if (!pngCache.has(file)) pngCache.set(file, fs.existsSync(file) ? readPng(file) : null)
  return pngCache.get(file)
}

/** All triangles of the chosen nodes in world space with their sampled colour (sRGB 0…255) and area. */
function triangles(g, dir, only, skip) {
  const out = []
  g.json.nodes.forEach((node, ni) => {
    if (node.mesh == null || (only && !only.test(node.name || '')) || (skip && skip.test(node.name || ''))) return
    const m = g.world(ni)
    for (const prim of g.json.meshes[node.mesh].primitives) {
      if (prim.mode != null && prim.mode !== 4) continue
      const mat = g.json.materials?.[prim.material]
      const pbr = mat?.pbrMetallicRoughness ?? {}
      const factor = (pbr.baseColorFactor ?? [1, 1, 1, 1]).slice(0, 3).map((c) => toSrgb(c))
      const texIndex = pbr.baseColorTexture?.index
      const tex = texIndex != null ? texture(dir, g.json.images[g.json.textures[texIndex].source].uri) : null
      const pos = g.accessor(prim.attributes.POSITION)
      const uv = prim.attributes.TEXCOORD_0 != null ? g.accessor(prim.attributes.TEXCOORD_0).data : null
      const idx = prim.indices != null ? g.accessor(prim.indices).data : [...Array(pos.count).keys()]
      const world = []
      const v = new Vector3()
      for (let k = 0; k < pos.count; k++) {
        v.set(pos.data[k * 3], pos.data[k * 3 + 1], pos.data[k * 3 + 2]).applyMatrix4(m)
        world.push(v.x, v.y, v.z)
      }
      for (let t = 0; t < idx.length; t += 3) {
        const tri = [idx[t], idx[t + 1], idx[t + 2]]
        const p = tri.map((i) => [world[i * 3], world[i * 3 + 1], world[i * 3 + 2]])
        const e1 = [0, 1, 2].map((a) => p[1][a] - p[0][a])
        const e2 = [0, 1, 2].map((a) => p[2][a] - p[0][a])
        const cr = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]
        const area = Math.hypot(...cr) / 2
        if (!(area > 1e-9)) continue
        let c = factor.map((f) => f * 255)
        if (tex && uv) {
          const us = tri.map((i) => [uv[i * 2], uv[i * 2 + 1]])
          const cu = (us[0][0] + us[1][0] + us[2][0]) / 3
          const cv = (us[0][1] + us[1][1] + us[2][1]) / 3
          const sum = [0, 0, 0]
          const pts = [[cu, cv], ...us.map(([a, b]) => [(cu * 2 + a) / 3, (cv * 2 + b) / 3])]
          for (const [a, b] of pts) {
            const s = tex.sample(a, b)
            for (let q = 0; q < 3; q++) sum[q] += s[q] / pts.length
          }
          c = sum.map((s, q) => s * factor[q])
        }
        out.push({ p, c, area, node: ni })
      }
    }
  })
  return out
}

/** k-means on colours weighted by area (deterministic start: spread over the brightness order). */
function cluster(tris, k) {
  const sorted = [...tris].sort((a, b) => a.c[0] + a.c[1] + a.c[2] - (b.c[0] + b.c[1] + b.c[2]))
  let centres = Array.from({ length: k }, (_, i) => sorted[Math.floor(((i + 0.5) / k) * sorted.length)].c.slice())
  for (let it = 0; it < 12; it++) {
    const sum = centres.map(() => [0, 0, 0, 0])
    for (const t of tris) {
      let best = 0
      let bd = Infinity
      centres.forEach((c, i) => {
        const d = (c[0] - t.c[0]) ** 2 + (c[1] - t.c[1]) ** 2 + (c[2] - t.c[2]) ** 2
        if (d < bd) ((bd = d), (best = i))
      })
      t.label = best
      const s = sum[best]
      for (let q = 0; q < 3; q++) s[q] += t.c[q] * t.area
      s[3] += t.area
    }
    centres = centres.map((c, i) => (sum[i][3] > 0 ? sum[i].slice(0, 3).map((v) => v / sum[i][3]) : c))
  }
  return centres
}

/** Speckle filter: a triangle takes the label most of its edge neighbours (by area) carry, 3 passes. */
function smoothLabels(tris) {
  const key = (p) => p.map((v) => Math.round(v * 1000)).join(',')
  const byVertex = new Map()
  tris.forEach((t, i) => t.p.forEach((p) => {
    const k = key(p)
    if (!byVertex.has(k)) byVertex.set(k, [])
    byVertex.get(k).push(i)
  }))
  for (let pass = 0; pass < 3; pass++) {
    const next = tris.map((t, ti) => {
      const votes = new Map()
      votes.set(t.label, t.area * 1.5)
      for (const p of t.p) for (const j of byVertex.get(key(p))) if (j !== ti) votes.set(tris[j].label, (votes.get(tris[j].label) ?? 0) + tris[j].area)
      let best = t.label
      let bv = -1
      for (const [l, v] of votes) if (v > bv) ((bv = v), (best = l))
      return best
    })
    tris.forEach((t, i) => (t.label = next[i]))
  }
}

async function simplify(pos, idx, target, clean = false) {
  const { MeshoptSimplifier } = await import('three/examples/jsm/libs/meshopt_simplifier.module.js')
  await MeshoptSimplifier.ready
  const n = idx.length / 3
  if (n <= target) return idx
  const want = Math.max(3, target * 3)
  if (clean === 'node') return [...MeshoptSimplifier.simplify(new Uint32Array(idx), new Float32Array(pos), 3, want, 0.03, [])[0]]
  let [out] = MeshoptSimplifier.simplify(new Uint32Array(idx), new Float32Array(pos), 3, want, 0.05, ['LockBorder'])
  if (clean) return [...out]
  if (out.length > want * 1.3) [out] = MeshoptSimplifier.simplify(new Uint32Array(idx), new Float32Array(pos), 3, want, 0.08, [])
  if (out.length > want * 1.3) out = MeshoptSimplifier.simplifySloppy(new Uint32Array(out), new Float32Array(pos), 3, null, want, 0.5)[0]
  return [...out]
}

const pos16 = []
const idx16 = []
const manifest = { source: 'Poly Haven (CC0), https://polyhaven.com', models: {} }
let total = 0
for (const [name, def] of Object.entries(MODELS)) {
  const dir = path.join(SRC, def.a)
  const g = readGltf(path.join(dir, `${def.a}.gltf`))
  const tris = triangles(g, dir, def.only, def.skip)
  if (!tris.length) throw new Error(`${name}: no triangles`)
  const s = SIZES ? 1 : (def.s ?? 1)
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  for (const t of tris) for (const p of t.p) for (let a = 0; a < 3; a++) ((p[a] *= s), (min[a] = Math.min(min[a], p[a])), (max[a] = Math.max(max[a], p[a])))
  const shift = [(min[0] + max[0]) / 2, min[1], (min[2] + max[2]) / 2]
  const size = [0, 1, 2].map((a) => +(max[a] - min[a]).toFixed(3))
  let centres
  if (def.perNode) {
    const nodes = [...new Set(tris.map((t) => t.node))]
    const sum = nodes.map(() => [0, 0, 0, 0])
    for (const t of tris) {
      t.label = nodes.indexOf(t.node)
      const q = sum[t.label]
      for (let a = 0; a < 3; a++) q[a] += t.c[a] * t.area
      q[3] += t.area
    }
    centres = sum.map((q) => q.slice(0, 3).map((v) => v / q[3]))
  } else {
    centres = cluster(tris, Math.min(def.k, tris.length))
    smoothLabels(tris)
  }
  const totalArea = tris.reduce((a, t) => a + t.area, 0)
  const model = { size, groups: [] }
  for (let l = 0; l < centres.length; l++) {
    const mine = tris.filter((t) => t.label === l)
    if (!mine.length) continue
    const area = mine.reduce((a, t) => a + t.area, 0)
    const weld = new Map()
    const local = []
    const idx = []
    for (const t of mine)
      for (const p of t.p) {
        const q = [0, 1, 2].map((a) => Math.round((p[a] - shift[a]) * 1000))
        const k = q.join(',')
        let at = weld.get(k)
        if (at == null) ((at = local.length / 3), weld.set(k, at), local.push(...q))
        idx.push(at)
      }
    // budget by share of the surface (small coloured bits keep a minimum so they do not vanish)
    const target = Math.max(12, Math.round((def.tris * area) / totalArea))
    const simple = await simplify(local.map((v) => v / 1000), idx, target, def.perNode ? 'node' : def.clean)
    const used = new Map()
    const verts = []
    const out = simple.map((i) => {
      if (!used.has(i)) (used.set(i, verts.length / 3), verts.push(local[i * 3], local[i * 3 + 1], local[i * 3 + 2]))
      return used.get(i)
    })
    // drop slivers the simplifier left (zero normals give NaN light — see CLAUDE.md 1.45)
    const keep = []
    for (let t = 0; t < out.length; t += 3) {
      const [a, b, c] = [out[t], out[t + 1], out[t + 2]].map((i) => verts.slice(i * 3, i * 3 + 3))
      const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]
      const e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]
      const cr = Math.hypot(e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0])
      if (cr > 1) keep.push(out[t], out[t + 1], out[t + 2])
    }
    if (!keep.length) continue
    const v0 = pos16.length / 3
    if (verts.length / 3 > 65535) throw new Error(`${name}: too many vertices`)
    pos16.push(...verts)
    const i0 = idx16.length
    idx16.push(...keep)
    model.groups.push({ mat: def.perNode ? `n${l}` : `c${l}`, color: hex(centres[l]), v: [v0, verts.length / 3], i: [i0, keep.length] })
    total += keep.length / 3
  }
  // brightest-last order keeps the names c0 (darkest) … stable for paint maps
  manifest.models[name] = model
  console.log(name.padEnd(16), size.join(' × ').padEnd(22), String(tris.length).padStart(6), '→', model.groups.map((x) => `${x.color}:${x.i[1] / 3}`).join(' '))
}
if (!SIZES) {
  for (const v of pos16) if (Math.abs(v) > 32767) throw new Error('model larger than ±32 m')
  manifest.int16Bytes = pos16.length * 2
  const buf = Buffer.alloc(pos16.length * 2 + idx16.length * 2)
  pos16.forEach((v, k) => buf.writeInt16LE(v, k * 2))
  idx16.forEach((v, k) => buf.writeUInt16LE(v, pos16.length * 2 + k * 2))
  fs.writeFileSync(path.join(OUT, 'urban.bin'), buf)
  fs.writeFileSync(path.join(OUT, 'urban.json'), JSON.stringify(manifest))
  console.log('urban.bin', buf.length, 'bytes,', total, 'triangles')
}
