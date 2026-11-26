// Converts Kenney 3D kits (CC0, https://kenney.nl) into the game's model packs (1.45), read by
// src/game/scenes/shared/models.ts exactly like the Quaternius / KayKit packs:
//
//   node tools/kenney2props.mjs <pack> <kit folder> [--sizes]
//
// pack "town"   = Fantasy Town Kit   (market stalls, fountains, lanterns, banners, carts, hedges, benches)
// pack "facade" = Modular Buildings  (European town-house modules: windows with sills, balconies, awnings, doors, roofs)
// pack "street" = City Kit (Roads)   (1.46: electricity poles + wires, street lights, traffic lights, signs, cones, barriers)
// pack "towers" = City Kit (Commercial) (1.46: low-detail blocks for the distant skyline, awnings, parasols)
// pack "vehicles" = Car Kit (1.48: sedans, SUVs, taxi, police, ambulance, fire / garbage trucks, vans, trucks)
// pack "rail" = Train Kit (1.48: U-Bahn subway cars, city trains, trams, tracks)
//
// <kit folder> is the unpacked zip (it holds "Models/GLB format/*.glb" + "…/Textures/colormap.png"). Kenney paints with
// ONE small palette texture: every triangle takes the colour under its UV centre and triangles of the same colour
// become one group (`mat` = "c" + hex), so a model is a few flat-coloured Shapes items (one draw call with the scene)
// and scenes can repaint a colour (e.g. the wall colour of a house) with modelShapes(…, { paint }).
// `--sizes` prints each model's size at scale 1 and writes nothing.
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { Vector3 } from 'three'
import { readGlb, simplifyGroup } from './glb.mjs'

const [PACK, SRC] = process.argv.slice(2)
if (!PACK || !SRC) throw new Error('usage: node tools/kenney2props.mjs <town|facade> <kit folder> [--sizes]')
const SIZES = process.argv.includes('--sizes')
const OUT = path.resolve('src/assets/models')

/** name in the game → Kenney file (scale 1: one Kenney unit = 1 m; scenes size them). */
const PACKS = {
  town: {
    source: 'Fantasy Town Kit by Kenney (CC0)',
    prefix: 'kt',
    models: {
      Stall: 'stall', StallGreen: 'stall-green', StallRed: 'stall-red', StallBench: 'stall-bench', StallStool: 'stall-stool',
      Cart: 'cart', CartHigh: 'cart-high',
      Fountain: 'fountain-round', FountainDetail: 'fountain-round-detail', FountainSquare: 'fountain-square-detail', FountainCenter: 'fountain-center',
      Lantern: 'lantern', BannerRed: 'banner-red', BannerGreen: 'banner-green',
      Hedge: 'hedge', HedgeLarge: 'hedge-large', HedgeCurved: 'hedge-curved', HedgeGate: 'hedge-gate',
      Fence: 'fence', FenceGate: 'fence-gate', PillarStone: 'pillar-stone', Overhang: 'overhang',
      RockSmall: 'rock-small', RockLarge: 'rock-large', RockWide: 'rock-wide', Poles: 'poles', Wheel: 'wheel',
      StairsStone: 'stairs-wide-stone', Chimney: 'chimney',
    },
  },
  facade: {
    source: 'Modular Buildings by Kenney (CC0)',
    prefix: 'kf',
    models: {
      Block: 'building-block', Window: 'building-window', Windows: 'building-windows', WindowSill: 'building-window-sill',
      WindowsSills: 'building-windows-sills', WindowsSillsRound: 'building-windows-sills-round', WindowsRound: 'building-windows-round',
      WindowWide: 'building-window-wide', WindowWideSill: 'building-window-wide-sill', WindowLarge: 'building-window-large',
      Balcony: 'building-window-balcony', Awnings: 'building-window-awnings', HighTopRound: 'building-windows-high-top-round',
      HighTopSquare: 'building-windows-high-top-square', HighMiddle: 'building-windows-high-middle',
      Door: 'building-door', DoorWindow: 'building-door-window', DoorWindowNarrow: 'building-door-window-narrow',
      WindowDoorRound: 'building-window-door-window-round', WindowDoor: 'building-window-door-window',
      LargeLeft: 'building-window-large-left', LargeMiddle: 'building-window-large-middle', LargeRight: 'building-window-large-right',
      RoofGable: 'roof-gable', RoofGableEnd: 'roof-gable-end', RoofSlanted: 'roof-slanted', RoofSlantedWindow: 'roof-slanted-window',
      RoofSlantedDetail: 'roof-slanted-detail', RoofSlantedFlat: 'roof-slanted-flat',
      RoofFlatSide: 'roof-flat-border-side', RoofFlatStraight: 'roof-flat-border-straight', RoofFlatTop: 'roof-flat-top',
      RoofAwningA: 'roof-flat-awning-a', RoofAwningB: 'roof-flat-awning-b', AcA: 'detail-ac-a',
    },
  },
}
PACKS.street = {
  source: 'City Kit (Roads) by Kenney (CC0)',
  prefix: 'kr',
  models: {
    Pole: 'electricity-pole', PoleWide: 'electricity-pole-wide', PoleSingle: 'electricity-pole-single', Side: 'electricity-side',
    SideSingle: 'electricity-side-single', Wires: 'electricity-wires', WiresWide: 'electricity-wires-wide',
    LightCurved: 'light-curved', LightCurvedDouble: 'light-curved-double', LightSquare: 'light-square', LightSquareDouble: 'light-square-double',
    Traffic: 'traffic-light', TrafficHanging: 'traffic-light-hanging', SignStreet: 'road-sign-street', SignEmpty: 'road-sign-empty',
    SignStop: 'road-sign-stop', SignWarning: 'road-sign-warning', Cone: 'construction-cone', Barrier: 'construction-barrier',
    Fence: 'construction-fence', WorkLight: 'construction-light', Dumpster: 'dumpster',
  },
}
PACKS.towers = {
  source: 'City Kit (Commercial) by Kenney (CC0)',
  prefix: 'kc',
  models: {
    LowA: 'low-detail-building-a', LowB: 'low-detail-building-b', LowC: 'low-detail-building-c', LowD: 'low-detail-building-d',
    LowE: 'low-detail-building-e', LowF: 'low-detail-building-f', LowG: 'low-detail-building-g', LowH: 'low-detail-building-h',
    LowI: 'low-detail-building-i', LowJ: 'low-detail-building-j', LowK: 'low-detail-building-k', LowL: 'low-detail-building-l',
    LowM: 'low-detail-building-m', LowN: 'low-detail-building-n', LowWideA: 'low-detail-building-wide-a', LowWideB: 'low-detail-building-wide-b',
    SkyA: 'building-skyscraper-a', SkyB: 'building-skyscraper-b', SkyC: 'building-skyscraper-c', SkyD: 'building-skyscraper-d', SkyE: 'building-skyscraper-e',
    Awning: 'detail-awning', AwningWide: 'detail-awning-wide', Overhang: 'detail-overhang', OverhangWide: 'detail-overhang-wide',
    ParasolA: 'detail-parasol-a', ParasolB: 'detail-parasol-b',
  },
}
PACKS.vehicles = {
  source: 'Car Kit by Kenney (CC0)',
  prefix: 'kv',
  // one flat colour per palette cell (16 columns × 4 rows): the gradient split each car into dozens of tones
  cells: [16, 4],
  // the wheels are round and detailed (≈ 1000 triangles per car): keep 40 % of big groups
  simplify: 0.4,
  models: {
    Sedan: 'sedan', SedanSports: 'sedan-sports', Hatchback: 'hatchback-sports', Suv: 'suv', SuvLuxury: 'suv-luxury', Taxi: 'taxi',
    Police: 'police', Ambulance: 'ambulance', Firetruck: 'firetruck', Garbage: 'garbage-truck', Delivery: 'delivery',
    DeliveryFlat: 'delivery-flat', Van: 'van', Truck: 'truck', TruckFlat: 'truck-flat', Tractor: 'tractor',
  },
}
// 1.48: Train Kit — the U-Bahn (subway cars a = front, b = middle, c = back), trams, rails
PACKS.rail = {
  source: 'Train Kit by Kenney (CC0)',
  prefix: 'kl',
  cells: [16, 4],
  models: {
    SubwayA: 'train-electric-subway-a', SubwayB: 'train-electric-subway-b', SubwayC: 'train-electric-subway-c',
    CityA: 'train-electric-city-a', CityB: 'train-electric-city-b', CityC: 'train-electric-city-c',
    TramModern: 'train-tram-modern', TramClassic: 'train-tram-classic', TramRound: 'train-tram-round',
    Track: 'track', TrackDetailed: 'track-detailed', TrackSingle: 'track-single-detailed', RailStraight: 'railroad-rail-straight',
    Railroad: 'railroad-straight',
  },
}
const cfg = PACKS[PACK]
if (!cfg) throw new Error(`unknown pack ${PACK}`)

// --- PNG reader (8-bit, non-interlaced; RGB / RGBA / palette) ------------------------------------------------------
function readPng(file) {
  const b = fs.readFileSync(file)
  let p = 8
  let w = 0
  let h = 0
  let type = 0
  let plte = null
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
    } else if (kind === 'PLTE') plte = data
    else if (kind === 'IDAT') idat.push(data)
    else if (kind === 'IEND') break
    p += 12 + len
  }
  const bpp = type === 6 ? 4 : type === 2 ? 3 : type === 3 ? 1 : 0
  if (!bpp) throw new Error(`PNG: colour type ${type} not supported`)
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
  return (u, v) => {
    const x = Math.min(w - 1, Math.max(0, Math.floor((((u % 1) + 1) % 1) * w)))
    const y = Math.min(h - 1, Math.max(0, Math.floor((((v % 1) + 1) % 1) * h)))
    if (type === 3) {
      const i = px[y * stride + x] * 3
      return [plte[i], plte[i + 1], plte[i + 2]]
    }
    const o = y * stride + x * bpp
    return [px[o], px[o + 1], px[o + 2]]
  }
}

const GLB_DIR = (() => {
  const c = [path.join(SRC, 'Models', 'GLB format'), SRC]
  return c.find((d) => fs.existsSync(d) && fs.readdirSync(d).some((f) => f.endsWith('.glb')))
})()
if (!GLB_DIR) throw new Error('no GLB folder found')
const texFile = [path.join(GLB_DIR, 'Textures', 'colormap.png'), path.join(SRC, 'Models', 'Textures', 'colormap.png')].find((f) => fs.existsSync(f))
if (!texFile) throw new Error('colormap.png not found')
const sample = readPng(texFile)
const hex = (rgb) => '#' + rgb.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')

/** Triangles of a model in world space, grouped by the palette colour under each triangle. */
function colourGroups(g) {
  const groups = new Map()
  g.json.nodes.forEach((node, ni) => {
    if (node.mesh == null) return
    const m = g.world(ni)
    for (const prim of g.json.meshes[node.mesh].primitives) {
      if (prim.mode != null && prim.mode !== 4) continue
      const pos = g.accessor(prim.attributes.POSITION)
      // a material without the palette texture (Kenney's water) has one colour: its base colour factor (linear → sRGB)
      const mat = prim.material != null ? g.json.materials?.[prim.material] : null
      const pbr = mat?.pbrMetallicRoughness
      const fixed = pbr && !pbr.baseColorTexture ? (pbr.baseColorFactor ?? [1, 1, 1, 1]).slice(0, 3).map((v) => 255 * Math.pow(v, 1 / 2.2)) : null
      const fixedMat = fixed && /water/i.test(mat?.name ?? '') ? 'water' : null
      const uv = !fixed && prim.attributes.TEXCOORD_0 != null ? g.accessor(prim.attributes.TEXCOORD_0).data : null
      const idx = prim.indices != null ? g.accessor(prim.indices).data : [...Array(pos.count).keys()]
      const world = []
      const v = new Vector3()
      for (let k = 0; k < pos.count; k++) {
        v.set(pos.data[k * 3], pos.data[k * 3 + 1], pos.data[k * 3 + 2]).applyMatrix4(m)
        world.push(v.x, v.y, v.z)
      }
      for (let t = 0; t < idx.length; t += 3) {
        const tri = [idx[t], idx[t + 1], idx[t + 2]]
        let c = fixed ?? [200, 200, 200]
        if (uv) {
          const u = (uv[tri[0] * 2] + uv[tri[1] * 2] + uv[tri[2] * 2]) / 3
          const w = (uv[tri[0] * 2 + 1] + uv[tri[1] * 2 + 1] + uv[tri[2] * 2 + 1]) / 3
          c = cfg.cells ? sample((Math.floor((((u % 1) + 1) % 1) * cfg.cells[0]) + 0.5) / cfg.cells[0], (Math.floor((((w % 1) + 1) % 1) * cfg.cells[1]) + 0.5) / cfg.cells[1]) : sample(u, w)
        }
        const col = hex(c)
        const key = fixedMat ?? col
        if (!groups.has(key)) groups.set(key, { mat: fixedMat ?? 'c' + col.slice(1), color: col, pos: [], idx: [] })
        const grp = groups.get(key)
        for (const i of tri) {
          grp.idx.push(grp.pos.length / 3)
          grp.pos.push(world[i * 3], world[i * 3 + 1], world[i * 3 + 2])
        }
      }
    }
  })
  return [...groups.values()]
}

const pos16 = []
const idx16 = []
const manifest = { source: cfg.source, models: {} }
let tris = 0
for (const [short, file] of Object.entries(cfg.models)) {
  const name = cfg.prefix + short
  const f = path.join(GLB_DIR, `${file}.glb`)
  if (!fs.existsSync(f)) {
    console.log('MISSING', file)
    continue
  }
  const g = readGlb(f)
  const groups = colourGroups(g)
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  for (const grp of groups) for (let k = 0; k < grp.pos.length; k++) ((min[k % 3] = Math.min(min[k % 3], grp.pos[k])), (max[k % 3] = Math.max(max[k % 3], grp.pos[k])))
  // facades keep Kenney's own origin (modules snap on a 1 m grid); props are centred on x/z with the base at y = 0
  const shift = PACK === 'facade' ? [0, 0, 0] : [(min[0] + max[0]) / 2, min[1], (min[2] + max[2]) / 2]
  const size = [0, 1, 2].map((a) => +(max[a] - min[a]).toFixed(3))
  const model = { size, min: min.map((v) => +v.toFixed(3)), max: max.map((v) => +v.toFixed(3)), groups: [] }
  for (const grp of groups) {
    const weld = new Map()
    const local = []
    const all = grp.idx.map((i) => {
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
    // drop triangles that collapsed to (almost) nothing after rounding to millimetres: no normal, NaN light
    const idx = []
    for (let t = 0; t < all.length; t += 3) {
      const [a, b, c] = [all[t], all[t + 1], all[t + 2]]
      if (a === b || b === c || a === c) continue
      const P = (i) => [local[i * 3], local[i * 3 + 1], local[i * 3 + 2]]
      const [pa, pb, pc] = [P(a), P(b), P(c)]
      const u = [pb[0] - pa[0], pb[1] - pa[1], pb[2] - pa[2]]
      const v = [pc[0] - pa[0], pc[1] - pa[1], pc[2] - pa[2]]
      const cr = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]
      if (Math.hypot(...cr) < 2) continue
      idx.push(a, b, c)
    }
    if (!idx.length) continue
    let verts = local
    let tri = idx
    if (cfg.simplify && idx.length / 3 > 300) {
      const out = await simplifyGroup(local, idx, cfg.simplify, 0.02)
      verts = out.used.flatMap((i) => local.slice(i * 3, i * 3 + 3))
      tri = out.idx
    }
    const v0 = pos16.length / 3
    pos16.push(...verts)
    const i0 = idx16.length
    idx16.push(...tri)
    model.groups.push({ mat: grp.mat, color: grp.color, v: [v0, verts.length / 3], i: [i0, tri.length] })
    tris += tri.length / 3
  }
  manifest.models[name] = model
  console.log(name.padEnd(20), size.join(' × ').padEnd(22), `min ${model.min.join(',')}`.padEnd(26), model.groups.map((x) => `${x.color}:${x.i[1] / 3}`).join(' '))
}
if (!SIZES) {
  if (pos16.length / 3 > 65535 * 8) throw new Error('pack too big')
  manifest.int16Bytes = pos16.length * 2
  const buf = Buffer.alloc(pos16.length * 2 + idx16.length * 2)
  pos16.forEach((v, k) => buf.writeInt16LE(v, k * 2))
  idx16.forEach((v, k) => buf.writeUInt16LE(v, pos16.length * 2 + k * 2))
  fs.writeFileSync(path.join(OUT, `${PACK}.bin`), buf)
  fs.writeFileSync(path.join(OUT, `${PACK}.json`), JSON.stringify(manifest))
  console.log(`${PACK}.bin`, buf.length, 'bytes,', tris, 'triangles')
}
