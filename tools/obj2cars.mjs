// Converts the Quaternius "Cars Pack" (CC0, https://quaternius.com/packs/cars.html) OBJ/MTL files into
// the game's compact car data: src/assets/models/cars.bin + cars.json.
//
//   node tools/obj2cars.mjs <folder with NormalCar1.obj/.mtl, …>
//
// Each car is split by material. Per group: Int16 vertices (millimetres, already scaled and centred,
// front = +Z, ground at y = 0) and Uint16 triangle indices. The game rebuilds flat-shaded geometry
// from it and merges the groups into one vertex-coloured mesh (shared/carModels.ts).
import fs from 'node:fs'
import path from 'node:path'

const SRC = process.argv[2]
if (!SRC) throw new Error('usage: node tools/obj2cars.mjs <folder>')
const OUT = path.resolve('src/assets/models')
const SCALE = 0.8 // the pack's cars are ~4.2 m long; ours are ~3.4 m next to the chibi characters
const MODELS = ['NormalCar1', 'NormalCar2', 'SportsCar', 'SportsCar2', 'SUV', 'Taxi']
/** Material painted in the traffic colour (the taxi keeps its yellow). */
const BODY = { NormalCar1: 'Blue', NormalCar2: 'LightBlue', SportsCar: 'Orange', SportsCar2: 'White', SUV: 'White' }
/** Material painted in a darker shade of the traffic colour. */
const BODY_DARK = { SportsCar: 'DarkOrange' }
/** Colours that read better in the game's pastel light than the pack's originals. */
const OVERRIDE = { Windows: '#4a5868', Headlights: '#fff3c4', Black: '#2a2a30', TailLights: '#e8463b' }

const toSrgb = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)
const hex = (rgb) => '#' + rgb.map((c) => Math.round(Math.min(1, Math.max(0, toSrgb(c))) * 255).toString(16).padStart(2, '0')).join('')

function readMtl(file) {
  const out = {}
  let cur = null
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const [k, ...rest] = line.trim().split(/\s+/)
    if (k === 'newmtl') cur = rest.join(' ')
    // Blender writes base colour × 0.8² as Kd
    else if (k === 'Kd' && cur) out[cur] = hex(rest.map(Number).map((v) => Math.min(1, v / 0.64)))
  }
  return out
}

function readObj(file) {
  const verts = []
  const groups = new Map() // material → triangles of OBJ vertex indices
  let mat = 'default'
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (line.startsWith('v ')) verts.push(line.trim().split(/\s+/).slice(1).map(Number))
    else if (line.startsWith('usemtl ')) mat = line.slice(7).trim()
    else if (line.startsWith('f ')) {
      const idx = line.trim().split(/\s+/).slice(1).map((t) => {
        const i = parseInt(t.split('/')[0], 10)
        return i < 0 ? verts.length + i : i - 1
      })
      if (!groups.has(mat)) groups.set(mat, [])
      const tris = groups.get(mat)
      for (let k = 1; k + 1 < idx.length; k++) tris.push(idx[0], idx[k], idx[k + 1]) // fan
    }
  }
  return { verts, groups }
}

const int16 = []
const uint16 = []
const manifest = { source: 'Quaternius Cars Pack (CC0) — https://quaternius.com/packs/cars.html', models: [] }
for (const name of MODELS) {
  const mtl = readMtl(path.join(SRC, `${name}.mtl`))
  const { verts, groups } = readObj(path.join(SRC, `${name}.obj`))
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  for (const v of verts) for (let i = 0; i < 3; i++) ((min[i] = Math.min(min[i], v[i])), (max[i] = Math.max(max[i], v[i])))
  const centre = [(min[0] + max[0]) / 2, min[1], (min[2] + max[2]) / 2]
  const model = { name, size: [0, 1, 2].map((i) => +((max[i] - min[i]) * SCALE).toFixed(3)), groups: [] }
  for (const [mat, tris] of groups) {
    // Compact the vertices this group uses
    const remap = new Map()
    const local = []
    const indices = tris.map((i) => {
      if (!remap.has(i)) {
        remap.set(i, local.length / 3)
        const v = verts[i]
        local.push(...[0, 1, 2].map((a) => Math.round((v[a] - centre[a]) * SCALE * 1000)))
      }
      return remap.get(i)
    })
    if (local.length / 3 > 65535) throw new Error(`${name}/${mat}: too many vertices`)
    model.groups.push({
      mat,
      color: OVERRIDE[mat] ?? mtl[mat] ?? '#cccccc',
      paint: BODY[name] === mat ? 'body' : BODY_DARK[name] === mat ? 'dark' : undefined,
      v: [int16.length, local.length],
      i: [uint16.length, indices.length],
    })
    int16.push(...local)
    uint16.push(...indices)
  }
  manifest.models.push(model)
  console.log(name, model.size.join(' × '), 'm,', groups.size, 'materials,', [...groups.values()].reduce((s, t) => s + t.length / 3, 0), 'triangles')
}
manifest.int16Bytes = int16.length * 2
fs.mkdirSync(OUT, { recursive: true })
const buf = Buffer.alloc(int16.length * 2 + uint16.length * 2)
int16.forEach((v, k) => buf.writeInt16LE(v, k * 2))
uint16.forEach((v, k) => buf.writeUInt16LE(v, int16.length * 2 + k * 2))
fs.writeFileSync(path.join(OUT, 'cars.bin'), buf)
fs.writeFileSync(path.join(OUT, 'cars.json'), JSON.stringify(manifest, null, 1))
console.log('cars.bin', buf.length, 'bytes')
