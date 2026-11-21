// Converts KayKit "Restaurant Bits" (CC0, Kay Lousberg, https://github.com/KayKit-Game-Assets/KayKit-Restaurant-Bits-1.0)
// into the game's model pack "food" (1.40): src/assets/models/food.bin + food.json, read by
// src/game/scenes/shared/models.ts exactly like the Quaternius packs (tools/glb2props.mjs).
//
//   node tools/kaykit2props.mjs <folder> [--sizes]
//
// <folder> holds the .gltf + .bin files of `addons/kaykit_restaurant_bits/Assets/gltf` and
// `restaurantbits_texture.png`. KayKit paints with ONE gradient atlas (8 × 4 swatches) instead of material colours:
// every triangle is put into the group of the swatch its UV centre falls in, and the group gets the average colour
// of those samples, so the model still becomes a few flat-coloured Shapes items (one draw call with the scene).
// `--sizes` only prints each model's size at scale 1.
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { Vector3 } from 'three'
import { readGltf, simplifyGroup } from './glb.mjs'

const SRC = process.argv[2]
if (!SRC) throw new Error('usage: node tools/kaykit2props.mjs <folder> [--sizes]')
const SIZES = process.argv.includes('--sizes')
const OUT = path.resolve('src/assets/models')

/** name in the game → [file, scale]. Kept at KayKit's own size (a table is 1 m high); scenes size them with
 * modelShapes(…, { height }). */
const S = 1
const MODELS = {
  potLarge: ['pot_large', S],
  potA: ['pot_A', S],
  potStew: ['pot_A_stew', S],
  potB: ['pot_B_stew', S],
  stockPot: ['stew_pot', S],
  bowl: ['bowl', S],
  bowlSmall: ['bowl_small', S],
  stewBowl: ['stew_bowl', S],
  plate: ['plate', S],
  plateSmall: ['plate_small', S],
  foodStew: ['food_stew', S],
  foodDinner: ['food_dinner', S],
  stool: ['chair_stool', S],
  chairA: ['chair_A', S],
  chairB: ['chair_B', S],
  tableSmall: ['table_round_A_small', S],
  tableRound: ['table_round_A', S],
  tableRoundB: ['table_round_B', S],
  crate: ['crate', S],
  crateCarrots: ['crate_carrots', S],
  crateOnions: ['crate_onions', S],
  crateTomatoes: ['crate_tomatoes', S],
  crateLettuce: ['crate_lettuce', S],
  cratePotatoes: ['crate_potatoes', S],
  crateBuns: ['crate_buns', S],
  jarA: ['jar_A_large', S],
  jarAm: ['jar_A_medium', S],
  jarB: ['jar_B_medium', S],
  jarBl: ['jar_B_large', S],
  jarC: ['jar_C_small', S],
  jarD: ['jar_D_large', S],
  stove: ['stove_single', S],
  stoveTop: ['stove_single_countertop', S],
  stoveMulti: ['stove_multi', S],
  counter: ['kitchencounter_straight_A', S],
  counterDeco: ['kitchencounter_straight_A_decorated', S],
  counterSink: ['kitchencounter_sink', S],
  kitchenTable: ['kitchentable_A', S],
  kitchenTableDeco: ['kitchentable_A_large_decorated', S],
  fridge: ['fridge_B', S],
  fridgeDeco: ['fridge_A_decorated', S],
  hood: ['extractorhood', S],
  shelfDeco: ['shelf_papertowel_decorated', S],
  menu: ['menu', S],
  panA: ['pan_A', S],
  panB: ['pan_B', S],
  board: ['cuttingboard', S],
  knife: ['knife', S],
  ketchup: ['ketchup', S],
  mustard: ['mustard', S],
  dishrack: ['dishrack_plates', S],
  lidLarge: ['lid_large', S],
  cabinet: ['kitchencabinet', S],
  oven: ['oven', S],
  papertowel: ['papertowel', S],
}

// --- A small PNG reader (8-bit RGB / RGBA, not interlaced: what the atlas is) ---------------------------------------
function readPng(file) {
  const b = fs.readFileSync(file)
  let p = 8
  let w = 0
  let h = 0
  let type = 0
  const idat = []
  while (p < b.length) {
    const len = b.readUInt32BE(p)
    const kind = b.toString('ascii', p + 4, p + 8)
    const data = b.subarray(p + 8, p + 8 + len)
    if (kind === 'IHDR') {
      w = data.readUInt32BE(0)
      h = data.readUInt32BE(4)
      if (data[8] !== 8 || data[12] !== 0) throw new Error('PNG: only 8-bit, non-interlaced')
      type = data[9]
    } else if (kind === 'IDAT') idat.push(data)
    else if (kind === 'IEND') break
    p += 12 + len
  }
  const bpp = type === 6 ? 4 : type === 2 ? 3 : 0
  if (!bpp) throw new Error('PNG: only RGB / RGBA')
  const raw = zlib.inflateSync(Buffer.concat(idat))
  const stride = w * bpp
  const px = Buffer.alloc(h * stride)
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)]
    const src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1))
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? px[y * stride + x - bpp] : 0
      const up = y > 0 ? px[(y - 1) * stride + x] : 0
      const c = x >= bpp && y > 0 ? px[(y - 1) * stride + x - bpp] : 0
      let v = src[x]
      if (f === 1) v += a
      else if (f === 2) v += up
      else if (f === 3) v += (a + up) >> 1
      else if (f === 4) {
        const pp = a + up - c
        const pa = Math.abs(pp - a)
        const pb = Math.abs(pp - up)
        const pc = Math.abs(pp - c)
        v += pa <= pb && pa <= pc ? a : pb <= pc ? up : c
      }
      px[y * stride + x] = v & 255
    }
  }
  return { w, h, sample: (u, v) => {
    const x = Math.min(w - 1, Math.max(0, Math.floor((((u % 1) + 1) % 1) * w)))
    const y = Math.min(h - 1, Math.max(0, Math.floor((((v % 1) + 1) % 1) * h)))
    const o = y * stride + x * bpp
    return [px[o], px[o + 1], px[o + 2]]
  } }
}

const atlas = readPng(path.join(SRC, 'restaurantbits_texture.png'))
const hex = (rgb) => '#' + rgb.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')

/** Triangles of a model in world space, grouped by atlas swatch (8 columns × 4 rows). */
function swatchGroups(g) {
  const groups = new Map()
  g.json.nodes.forEach((node, ni) => {
    if (node.mesh == null) return
    const m = g.world(ni)
    for (const prim of g.json.meshes[node.mesh].primitives) {
      if (prim.mode != null && prim.mode !== 4) continue
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
        let u = 0.5
        let w = 0.5
        if (uv) {
          u = (uv[tri[0] * 2] + uv[tri[1] * 2] + uv[tri[2] * 2]) / 3
          w = (uv[tri[0] * 2 + 1] + uv[tri[1] * 2 + 1] + uv[tri[2] * 2 + 1]) / 3
        }
        const cell = `s${Math.min(7, Math.floor((((u % 1) + 1) % 1) * 8))}_${Math.min(3, Math.floor((((w % 1) + 1) % 1) * 4))}`
        if (!groups.has(cell)) groups.set(cell, { mat: cell, sum: [0, 0, 0], n: 0, pos: [], idx: [] })
        const grp = groups.get(cell)
        const c = atlas.sample(u, w)
        for (let a = 0; a < 3; a++) grp.sum[a] += c[a]
        grp.n++
        for (const i of tri) {
          grp.idx.push(grp.pos.length / 3)
          grp.pos.push(world[i * 3], world[i * 3 + 1], world[i * 3 + 2])
        }
      }
    }
  })
  return [...groups.values()].map((g) => ({ mat: g.mat, color: hex(g.sum.map((s) => s / g.n)), pos: g.pos, idx: g.idx }))
}

const pos16 = []
const idx16 = []
const manifest = { source: 'KayKit Restaurant Bits by Kay Lousberg (CC0)', models: {} }
let tris = 0
for (const [name, [file, scale]] of Object.entries(MODELS)) {
  const g = readGltf(path.join(SRC, `${file}.gltf`))
  const groups = swatchGroups(g)
  const s = SIZES ? 1 : scale
  for (const grp of groups) for (let k = 0; k < grp.pos.length; k++) grp.pos[k] *= s
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  for (const grp of groups) for (let k = 0; k < grp.pos.length; k++) ((min[k % 3] = Math.min(min[k % 3], grp.pos[k])), (max[k % 3] = Math.max(max[k % 3], grp.pos[k])))
  const shift = [(min[0] + max[0]) / 2, min[1], (min[2] + max[2]) / 2]
  const size = [0, 1, 2].map((a) => +(max[a] - min[a]).toFixed(3))
  const model = { size, groups: [] }
  for (const grp of groups) {
    const weld = new Map()
    let local = []
    let idx = grp.idx.map((i) => {
      const p = [0, 1, 2].map((a) => Math.round((grp.pos[i * 3 + a] - shift[a]) * 1000))
      const key = p.join(',')
      let at = weld.get(key)
      if (at == null) {
        at = local.length / 3
        weld.set(key, at)
        local.push(...p)
      }
      return at
    })
    // Vegetable crates and decorated counters are dense: a street shows them small, so most triangles go.
    const n = idx.length / 3
    if (n > 500) {
      const r = await simplifyGroup(local, idx, n > 1200 ? 0.25 : 0.45, 0.06)
      local = r.used.flatMap((i) => local.slice(i * 3, i * 3 + 3))
      idx = r.idx
    }
    const v0 = pos16.length / 3
    const count = local.length / 3
    if (count > 65535) throw new Error(`${name}/${grp.mat}: too many vertices`)
    pos16.push(...local)
    const i0 = idx16.length
    idx16.push(...idx)
    model.groups.push({ mat: grp.mat, color: grp.color, v: [v0, count], i: [i0, idx.length] })
    tris += idx.length / 3
  }
  manifest.models[name] = model
  console.log(name.padEnd(18), size.join(' × ').padEnd(24), model.groups.map((x) => `${x.color}:${x.i[1] / 3}`).join(' '))
}
if (!SIZES) {
  manifest.int16Bytes = pos16.length * 2
  const buf = Buffer.alloc(pos16.length * 2 + idx16.length * 2)
  pos16.forEach((v, k) => buf.writeInt16LE(v, k * 2))
  idx16.forEach((v, k) => buf.writeUInt16LE(v, pos16.length * 2 + k * 2))
  fs.writeFileSync(path.join(OUT, 'food.bin'), buf)
  fs.writeFileSync(path.join(OUT, 'food.json'), JSON.stringify(manifest))
  console.log('food.bin', buf.length, 'bytes,', tris, 'triangles')
}
