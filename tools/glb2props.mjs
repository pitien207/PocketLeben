// Converts static Quaternius models (CC0, https://quaternius.com) into the game's model packs (1.33):
// src/assets/models/<pack>.bin + <pack>.json, read by src/game/scenes/shared/models.ts.
//
//   node tools/glb2props.mjs <folder>
//
// <folder> holds the GLBs in sub-folders named like the fan mirror https://github.com/trebeljahr/quaternius-showcase
// (public/glb/<pack>/<Name>.glb): nature_pack, simple_nature_pack, house_interior_pack, buildings_pack_3,
// street_pack, cyberpunk_pack, medieval_village_pack, survival_pack.
//
// Per model: groups per material (original colour + material name, so the game can repaint e.g. the leaves),
// Int16 millimetre vertices (welded; flat normals are computed in the game) and Uint16 indices. Every model
// stands on y = 0 and is centred on x / z, scaled to game size (an entry may be [file, scale]: some packs are
// miniatures — a two-storey house is 2.7 m high).
import fs from 'node:fs'
import path from 'node:path'
import { readGlb, simplifyGroup, staticGroups } from './glb.mjs'

const SRC = process.argv[2]
if (!SRC) throw new Error('usage: node tools/glb2props.mjs <folder> [pack…]')
/** Pack names to build (none = all). */
const ONLY = process.argv.slice(3)
const OUT = path.resolve('src/assets/models')

const range = (prefix, file, n) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`${prefix}${i + 1}`, file.replace('#', String(i + 1))]))

const PACKS = {
  /** Trees, bushes, flowers, rocks, potted plants — every Việt Nam scene. */
  nature: {
    source: 'Quaternius Ultimate Nature Pack, Simple Nature Pack, Ultimate House Interior Pack (CC0)',
    models: {
      ...range('common', 'nature_pack/CommonTree_#', 5),
      ...range('palm', 'nature_pack/PalmTree_#', 4),
      ...range('willow', 'nature_pack/Willow_#', 5),
      ...range('birch', 'nature_pack/BirchTree_#', 3),
      ...range('pine', 'nature_pack/PineTree_#', 3),
      ...range('simple', 'simple_nature_pack/Tree#', 4),
      bush1: 'nature_pack/Bush_1',
      bush2: 'nature_pack/Bush_2',
      berries1: 'nature_pack/BushBerries_1',
      berries2: 'nature_pack/BushBerries_2',
      ...range('shrub', 'simple_nature_pack/Bush#', 3),
      flowers: 'nature_pack/Flowers',
      ...range('plant', 'nature_pack/Plant_#', 5),
      grass1: 'nature_pack/Grass',
      grass2: 'nature_pack/Grass_2',
      lilypad: 'nature_pack/Lilypad',
      ...range('rock', 'nature_pack/Rock_#', 3),
      rockMoss1: 'nature_pack/Rock_Moss_1',
      stump: 'nature_pack/TreeStump',
      ...range('pot', 'house_interior_pack/Houseplant_#', 8),
    },
  },
  /** Buildings and street furniture for the new district (Hàng Khay) and the old quarter's facades. */
  city: {
    source: 'Quaternius Ultimate Buildings (Textured Buildings, colour version), Modular Streets, Cyberpunk Game Kit, Medieval Village, Survival packs (CC0)',
    models: {
      ...Object.fromEntries(
        ['1Story_Sign', '2Story', '2Story_Balcony', '2Story_Center', '2Story_Columns', '2Story_Double', '2Story_Sidehouse', '2Story_Sign', '2Story_Wide', '3Story_Balcony', '3Story_Small', '4Story', '4Story_Center', '4Story_Wide_2Doors', '6Story_Stack'].map((n) => [`b${n}`, [`buildings_pack_3/${n}_Mat`, 2.8]]),
      ),
      streetlight: ['street_pack/Streetlight_Single', 4],
      streetlight2: ['street_pack/Streetlight_Double', 4],
      trafficLight: ['street_pack/TrafficLight', 4],
      trafficLight2: ['street_pack/TrafficLight_2', 4],
      signStop: ['street_pack/Sign_Stop', 4],
      signNoParking: ['street_pack/Sign_NoParking', 4],
      ac: ['cyberpunk_pack/AC', 0.8],
      acSide: ['cyberpunk_pack/AC_Side', 0.8],
      acStack: ['cyberpunk_pack/AC_Stacked', 0.8],
      antenna1: ['cyberpunk_pack/Antenna_1', 1.4],
      antenna2: ['cyberpunk_pack/Antenna_2', 1.4],
      stall1: ['medieval_village_pack/MarketStand_1', 2.3],
      stall2: ['medieval_village_pack/MarketStand_2', 2.3],
      bench1: ['medieval_village_pack/Bench_1', 1.5],
      bench2: ['medieval_village_pack/Bench_2', 1.5],
      barrel: ['medieval_village_pack/Barrel', 4.5],
      crate: ['medieval_village_pack/Crate', 4],
      gazebo: ['medieval_village_pack/Gazebo', 2.6],
      well: ['medieval_village_pack/Well', 2],
      trashcan: ['survival_pack/Trashcan', 0.16],
      gasCan: ['survival_pack/GasCan', 1],
      propane: ['survival_pack/PropaneTank', 1.2],
    },
  },
  /** 1.41 shop interiors (scenes/ShopRoom): shelves, chairs, sofas, lamps, cabinets, carpets, curtains. Name = `i` + file without `_`. */
  /** 1.42 crops for the back yard's beds, grass tufts, bamboo, an orange tree (Quaternius Crops Pack, CC0). Size them with modelShapes(name, { height }). */
  farm: {
    source: 'Quaternius Crops Pack (CC0)',
    models: Object.fromEntries(
      ['Lettuce_1', 'Lettuce_2', 'Lettuce_3', 'Lettuce_4', 'Corn_2', 'Corn_3', 'Corn_4', 'Rice_2', 'Rice_3', 'Rice_4', 'Tomato_3', 'Tomato_4', 'Grass_1', 'Grass_2', 'Grass_3', 'Grass_4', 'Bamboo_2', 'Bamboo_3', 'Orange_3', 'Orange_4', 'Carrot_3', 'Pumpkin_3', 'Flower_2', 'Flower_3'].map((n) => ['f' + n.replace(/_/g, ''), `crops_pack/${n}`]),
    ),
  },
  interior: {
    source: 'Quaternius Ultimate House Interior Pack (CC0)',
    models: Object.fromEntries(
      [
        'Bookshelf', 'Chair_1', 'Chair_2', 'Chair_3', 'Chair_4', 'Couch_Medium1', 'Couch_Medium2', 'Couch_Small1', 'Couch_Small2',
        'Shelf_1', 'Shelf_2', 'Shelf_Large', 'Shelf_Small1', 'Shelf_Small2', 'Table_RoundLarge', 'Table_RoundSmall', 'Table_RoundSmall2',
        'Light_Ceiling1', 'Light_Ceiling2', 'Light_Ceiling3', 'Light_Ceiling4', 'Light_CeilingSingle', 'Light_Chandelier', 'Light_Floor1',
        'Light_Floor2', 'Light_Desk', 'Light_Stand1', 'Light_Cube', 'Light_Small', 'Drawer_1', 'Drawer_2', 'Drawer_3', 'Drawer_4', 'Drawer_5',
        'NightStand_1', 'NightStand_2', 'Kitchen_Fridge', 'Kitchen_Cabinet1', 'Kitchen_2Drawers', 'Kitchen_Sink', 'Kitchen_Oven', 'Carpet_1',
        'Carpet_2', 'Carpet_Round', 'Curtains_Double', 'Curtains_Single', 'Window_Large1', 'Window_Small1', 'Door_1', 'Door_Double',
        'Trashcan_Small1', 'Trashcan_Cylindric', 'Bathroom_Mirror1', 'Column_Round1', 'Column_SquareSmall', 'Stool', 'Houseplant_1',
        'Houseplant_4', 'Houseplant_7',
        // 1.42 the home
        'Bed_Single', 'Bed_King', 'Kitchen_Cabinet2', 'Kitchen_CabinetSmall', 'Kitchen_1Drawers', 'Kitchen_3Drawers', 'Bathroom_WashingMachine',
        'NightStand_3', 'Shelf_Small3', 'Plate_1', 'Light_Ceiling5', 'Window_Large2', 'Door_2', 'Door_3', 'Trashcan_Green', 'Light_Floor3',
      ].map((n) => ['i' + n.replace(/_/g, ''), [`house_interior_pack/${n}`, 0.5]]),
    ),
  },
}

/** Share of the triangles kept per group (1.33 performance pass): trees and plants are cut hard, buildings a little. */
/**
 * 1.48 'bus' = CC-BY 3.0 models from poly.pizza (credit in data/credits.ts): a city bus (Nick Ladd, 'Montreal Bus') and a bus
 * shelter (Zsky, 'Bus Stop'). Own pack because the licence is not CC0. The folder
 * holds them as polypizza/<file>.glb. Entry [file, scale, opts]: opts.alignZ turns the model so its long axis runs along z
 * (the bus file is rotated 45°), opts.flip turns it 180° (front = +z), opts.rotY turns it by that many radians.
 */
PACKS.bus = {
  source: 'poly.pizza (CC-BY 3.0): Montreal Bus by Nick Ladd, Bus Stop by Zsky',
  models: {
    pBus: ['polypizza/busMtl', 2.45, { alignZ: true, flip: true }],
    pShelter: ['polypizza/stop', 0.095],
  },
}

const KEEP = {
  nature: (name, tris) => (tris < 300 ? 1 : /^(simple|shrub|rock|grass)/.test(name) ? 1 : tris > 1500 ? 0.22 : 0.45),
  city: (name, tris) => (tris < 400 ? 1 : /^b/.test(name) ? 0.6 : 0.5),
  interior: (name, tris) => (tris < 600 ? 1 : 0.6),
  farm: (name, tris) => (tris < 300 ? 1 : 0.5),
  bus: (name, tris) => (tris < 300 ? 1 : 0.6),
}

for (const [pack, def] of Object.entries(PACKS)) {
  if (ONLY.length && !ONLY.includes(pack)) continue
  const pos16 = []
  const idx16 = []
  const manifest = { source: def.source, models: {} }
  let tris = 0
  for (const [name, entry] of Object.entries(def.models)) {
    const [file, scale, opts = {}] = Array.isArray(entry) ? entry : [entry, 1]
    const g = readGlb(path.join(SRC, `${file}.glb`))
    const groups = staticGroups(g)
    for (const grp of groups) for (let k = 0; k < grp.pos.length; k++) grp.pos[k] *= scale
    // 1.48: turn about y (alignZ = the main horizontal axis → z, found from the xz covariance)
    let turn = opts.rotY ?? 0
    if (opts.alignZ) {
      let sx = 0
      let sz = 0
      let n = 0
      for (const grp of groups) for (let k = 0; k < grp.pos.length; k += 3) ((sx += grp.pos[k]), (sz += grp.pos[k + 2]), n++)
      const cx = sx / n
      const cz = sz / n
      let xx = 0
      let zz = 0
      let xz = 0
      for (const grp of groups)
        for (let k = 0; k < grp.pos.length; k += 3) {
          const dx = grp.pos[k] - cx
          const dz = grp.pos[k + 2] - cz
          xx += dx * dx
          zz += dz * dz
          xz += dx * dz
        }
      // angle of the main axis from +x (atan2(z, x)), then turn it onto +z
      const ang = 0.5 * Math.atan2(2 * xz, xx - zz)
      turn += Math.PI / 2 - ang
      // 1.49 PCA is only close (mirrors, a door bulge): refine to the turn that makes the model narrowest (min-width box)
      let bestW = Infinity
      let bestT = turn
      for (let dt = -0.2; dt <= 0.2; dt += 0.0005) {
        const c = Math.cos(turn + dt)
        const sn = Math.sin(turn + dt)
        let x0 = Infinity
        let x1 = -Infinity
        for (const grp of groups)
          for (let k = 0; k < grp.pos.length; k += 3) {
            const x = grp.pos[k] * c - grp.pos[k + 2] * sn
            if (x < x0) x0 = x
            if (x > x1) x1 = x
          }
        if (x1 - x0 < bestW) {
          bestW = x1 - x0
          bestT = turn + dt
        }
      }
      turn = bestT
    }
    if (opts.flip) turn += Math.PI
    if (turn) {
      // rotate (x, z) by "turn" (x' = x cos − z sin, z' = x sin + z cos)
      const c = Math.cos(turn)
      const sn = Math.sin(turn)
      for (const grp of groups)
        for (let k = 0; k < grp.pos.length; k += 3) {
          const x = grp.pos[k]
          const z = grp.pos[k + 2]
          grp.pos[k] = x * c - z * sn
          grp.pos[k + 2] = x * sn + z * c
        }
    }
    const min = [Infinity, Infinity, Infinity]
    const max = [-Infinity, -Infinity, -Infinity]
    for (const grp of groups) for (let k = 0; k < grp.pos.length; k++) ((min[k % 3] = Math.min(min[k % 3], grp.pos[k])), (max[k % 3] = Math.max(max[k % 3], grp.pos[k])))
    const shift = [(min[0] + max[0]) / 2, min[1], (min[2] + max[2]) / 2]
    const size = [0, 1, 2].map((a) => +(max[a] - min[a]).toFixed(3))
    if (Math.max(...size) > 60) throw new Error(`${name}: ${size} m is too big for Int16 millimetres`)
    const model = { size, groups: [] }
    for (const grp of groups) {
      // Weld, then (big groups) drop triangles: the packs are detailed for close-ups, the street shows dozens.
      const weld = new Map()
      let local = []
      const remap = []
      for (let k = 0; k < grp.pos.length / 3; k++) {
        const p = [0, 1, 2].map((a) => Math.round((grp.pos[k * 3 + a] - shift[a]) * 1000))
        const key = p.join(',')
        let at = weld.get(key)
        if (at == null) {
          at = local.length / 3
          weld.set(key, at)
          local.push(...p)
        }
        remap.push(at)
      }
      let idx = grp.idx.map((i) => remap[i])
      const keep = KEEP[pack](name, idx.length / 3)
      if (keep < 1) {
        const s = await simplifyGroup(local, idx, keep).catch((e) => {
          throw new Error(`${name}/${grp.mat}: ${idx.length} indices, ${local.length / 3} vertices: ${e.message}`)
        })
        local = s.used.flatMap((i) => local.slice(i * 3, i * 3 + 3))
        idx = s.idx
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
    console.log(pack, name.padEnd(26), size.join(' × ').padEnd(22), model.groups.map((x) => `${x.mat}:${x.i[1] / 3}`).join(' '))
  }
  manifest.int16Bytes = pos16.length * 2
  const buf = Buffer.alloc(pos16.length * 2 + idx16.length * 2)
  pos16.forEach((v, k) => buf.writeInt16LE(v, k * 2))
  idx16.forEach((v, k) => buf.writeUInt16LE(v, pos16.length * 2 + k * 2))
  fs.mkdirSync(OUT, { recursive: true })
  fs.writeFileSync(path.join(OUT, `${pack}.bin`), buf)
  fs.writeFileSync(path.join(OUT, `${pack}.json`), JSON.stringify(manifest))
  console.log(`${pack}.bin`, buf.length, 'bytes,', tris, 'triangles')
}
