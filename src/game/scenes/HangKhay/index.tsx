import { memo, useEffect, useMemo } from 'react'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { MeshLambertMaterial } from 'three'
import { CITY_PLACES } from '../../../data/cityPlaces'
import { NPCS } from '../../../data/npcs'
import { ActionSpot, type SpotAction } from '../../components/ActionSpot'
import { NPC } from '../../components/npc/NPC'
import { Traffic } from '../../components/npc/Traffic'
import { BUILDING_GROUPS, PROP_GROUPS } from '../../systems/collisionGroups'
import { glowMaterial, groundMaterial } from '../shared/materials'
import { modelFrontAt, modelShapes, modelSize, pickBy } from '../shared/models'
import { PALETTE as P } from '../shared/palette'
import { libraryTree, place, softPlantShapes, stoolShapes } from '../shared/props'
import { FountainWater, type FountainSpec } from '../shared/FountainWater'
import { Shapes, type ShapeItem } from '../shared/Shapes'
import { SignBoard } from '../shared/SignBoard'
import { makeTileTexture } from '../shared/textures'
import { motorbikeShapes } from '../shared/vehicles'
import { LAKE } from '../VietnamStreet/layout'
import { ActiveArea } from '../../components/ActiveArea'
import { LampPools } from '../VietnamStreet/LampPools'
import type { Vec3 } from '../../../data/config'
import { BA_TRIEU, BUILDINGS, FLOWER_MARKET, inPickleCourt, OZ, PARK, PLAY, PROMENADE, ROAD, SCHOOL_YARD, SHORE_Z, SOUTH_PAVE, TRAFFIC, WALKERS, type Building } from './layout'
import { PickleCourt } from './PickleCourt'
import { fitTree, useBlockerVersion } from '../shared/treeFit'

/**
 * Phố Hàng Khay (1.33; part of the Hàng Gai scene since 1.34): the south shore of Hồ Gươm — a lakeside promenade, a four-lane street, a row of functional
 * buildings (library models from the Quaternius "Ultimate Buildings" pack, painted in Hà Nội colours, each with a
 * sign and a door: data/cityPlaces.ts), Phố Bà Triệu with the hospital, the school and Vườn hoa Hàng Khay.
 */

const FAR = 90
const TRUNK = '#7c5b45'

const shade = (hex: string, l: number) => {
  const n = parseInt(hex.slice(1), 16)
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * (1 + l))))
  return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, '0')).join('')
}

/** Model placement: centre and rotation from the front edge and facing. */
function placement(b: Building): { at: Vec3; rotY: number; w: number; d: number; h: number } {
  const [w, h, d] = modelSize(b.model)
  if (b.face === 'north') return { at: [b.x, 0, b.z + d / 2], rotY: Math.PI, w, d, h }
  if (b.face === 'west') return { at: [b.x + d / 2, 0, b.z], rotY: -Math.PI / 2, w, d, h }
  return { at: [b.x - d / 2, 0, b.z], rotY: Math.PI / 2, w, d, h }
}
/** A point `out` metres in front of the facade, `along` metres to the right of the door. */
function front(b: Building, out: number, along = 0): [number, number] {
  if (b.face === 'north') return [b.x - along, b.z - out]
  if (b.face === 'west') return [b.x - out, b.z + along]
  return [b.x + out, b.z - along]
}
const faceYaw = (b: Building) => (b.face === 'north' ? Math.PI : b.face === 'west' ? -Math.PI / 2 : Math.PI / 2)

function buildingShapes(b: Building): ShapeItem[] {
  const { at, rotY } = placement(b)
  const wall = b.wall
  const wall2 = b.wall2 ?? shade(wall, 0.08)
  const items = modelShapes(b.model, {
    paint: {
      Bricks: wall,
      Light: wall2,
      Main: shade(wall, -0.22),
      White: b.trim ?? '#ffffff',
      Dark: '#4f5866',
      Black: '#2f3138',
      Wood: '#a3734f',
      DarkWood: '#6b4a35',
      DarkBrown: '#5a4030',
      RoofBricks: '#b0563c',
      // Glass in the colours the night shader lights up (shared/materials.ts WINDOW_GLASS)
      Glass: '#bfe6f2',
      Windows: '#8fc4d8',
    },
  })
  return items ? [place(items, at, rotY)] : []
}

function groundShapes(): ShapeItem[] {
  const s: ShapeItem[] = []
  const roadZ = (ROAD.z0 + ROAD.z1) / 2
  const roadW = ROAD.z1 - ROAD.z0
  // Hàng Khay: asphalt, double line, lane dashes, kerbs, two zebra crossings
  s.push({ box: [FAR * 2, 0.02, roadW], at: [0, 0.005, roadZ], color: P.road })
  for (const dz of [-0.14, 0.14]) s.push({ box: [FAR * 2, 0.01, 0.1], at: [0, 0.02, roadZ + dz], color: '#ffd76a' })
  for (let x = -FAR; x < FAR; x += 2.4) {
    if (x > BA_TRIEU.x0 - 1 && x < BA_TRIEU.x1 + 1) continue
    for (const dz of [-roadW / 4, roadW / 4]) s.push({ box: [1.3, 0.01, 0.12], at: [x, 0.02, roadZ + dz], color: P.roadLine })
  }
  for (const z of [ROAD.z0, ROAD.z1]) s.push({ box: [FAR * 2, 0.12, 0.22], at: [0, 0.06, z], color: P.curb })
  for (const cx of [-20, (BA_TRIEU.x0 + BA_TRIEU.x1) / 2, 30]) for (let z = ROAD.z0 + 0.45; z < ROAD.z1 - 0.2; z += 0.8) s.push({ box: [2.6, 0.012, 0.42], at: [cx, 0.021, z], color: P.roadLine })
  // Phố Bà Triệu: two lanes going south, kerbs
  const bw = BA_TRIEU.x1 - BA_TRIEU.x0
  const blen = BA_TRIEU.z1 + 20 - SOUTH_PAVE.z0
  const bz = (SOUTH_PAVE.z0 + BA_TRIEU.z1 + 20) / 2
  s.push({ box: [bw, 0.02, blen], at: [(BA_TRIEU.x0 + BA_TRIEU.x1) / 2, 0.006, bz], color: P.road })
  for (let z = SOUTH_PAVE.z0 + 3; z < BA_TRIEU.z1 + 18; z += 2.4) s.push({ box: [0.12, 0.01, 1.3], at: [(BA_TRIEU.x0 + BA_TRIEU.x1) / 2, 0.02, z], color: P.roadLine })
  for (const x of [BA_TRIEU.x0, BA_TRIEU.x1]) s.push({ box: [0.22, 0.12, blen - 0.6], at: [x, 0.06, bz + 0.3], color: P.curb })
  // Lake embankment and the iron railing
  // (1.34: the water and Tháp Rùa are drawn by HoGuom.tsx; the railing stops at the east lake path)
  const railX = (LAKE.east - FAR) / 2
  s.push({ box: [(FAR + LAKE.east), 0.36, 0.5], at: [railX, 0.16, SHORE_Z], color: '#cfc8bb' })
  s.push({ box: [(FAR + LAKE.east), 0.04, 0.55], at: [railX, 0.35, SHORE_Z], color: '#e3ddd1' })
  for (let x = -FAR; x <= LAKE.east; x += 0.6) s.push({ box: [0.05, 0.75, 0.05], at: [x, 0.72, SHORE_Z], color: '#2c4a3a' })
  for (const [y, t] of [[1.08, 0.06], [0.6, 0.05]] as const) s.push({ box: [(FAR + LAKE.east), t, t], at: [railX, y, SHORE_Z], color: '#2c4a3a' })
  // Park: lawn, a cross of paths and a round plaza with the fountain
  const { x0, x1, z0, z1, fountain } = PARK
  s.push({ box: [x1 - x0, 0.03, z1 - z0], at: [(x0 + x1) / 2, 0.012, (z0 + z1) / 2], color: '#9fd27e' })
  s.push({ box: [x1 - x0, 0.03, 2.4], at: [(x0 + x1) / 2, 0.022, fountain.z], color: '#e3d6bf' })
  s.push({ box: [2.4, 0.03, z1 - z0], at: [fountain.x, 0.022, (z0 + z1) / 2], color: '#e3d6bf' })
  s.push({ box: [2.2, 0.03, 13], at: [-46, 0.02, OZ + 23.5], color: '#e3d6bf' })
  s.push({ cyl: [6.5, 6.5, 0.03, 32], at: [fountain.x, 0.025, fountain.z], color: '#e3d6bf' })
  s.push({ cyl: [3.2, 3.4, 0.55, 28], at: [fountain.x, 0.27, fountain.z], color: '#d8d0c2' })
  s.push({ cyl: [2.9, 2.9, 0.05, 28], at: [fountain.x, 0.57, fountain.z], color: '#9fd3e0' })
  s.push({ cyl: [0.5, 0.7, 1.1, 14], at: [fountain.x, 0.9, fountain.z], color: '#e6dfd2' })
  s.push({ cyl: [1.0, 0.8, 0.22, 18], at: [fountain.x, 1.5, fountain.z], color: '#e6dfd2' })
  // School yard: sand-coloured ground, a fence with a gate on Bà Triệu, a flag pole
  const Y = SCHOOL_YARD
  s.push({ box: [Y.x1 - Y.x0, 0.035, Y.z1 - Y.z0], at: [(Y.x0 + Y.x1) / 2, 0.03, (Y.z0 + Y.z1) / 2], color: '#e2d2ae' })
  for (let x = Y.x0; x <= Y.x1; x += 0.5) s.push({ box: [0.05, 1.2, 0.05], at: [x, 0.6, Y.z1], color: '#3f6b5a' })
  for (let z = Y.z0; z <= Y.z1; z += 0.5) s.push({ box: [0.05, 1.2, 0.05], at: [Y.x0, 0.6, z], color: '#3f6b5a' })
  s.push({ box: [Y.x1 - Y.x0, 0.05, 0.05], at: [(Y.x0 + Y.x1) / 2, 1.18, Y.z1], color: '#3f6b5a' })
  s.push({ box: [0.05, 0.05, Y.z1 - Y.z0], at: [Y.x0, 1.18, (Y.z0 + Y.z1) / 2], color: '#3f6b5a' })
  s.push({ cyl: [0.05, 0.06, 7, 8], at: [Y.x0 + 2, 3.5, Y.z0 + 2], color: '#d9d6dc' })
  s.push({ box: [1.4, 0.9, 0.03], at: [Y.x0 + 2.72, 6.45, Y.z0 + 2], color: '#da251d' })
  s.push({ cyl: [0.18, 0.18, 0.035, 5], at: [Y.x0 + 2.72, 6.45, Y.z0 + 2.02], rot: [Math.PI / 2, 0, 0], color: '#ffde00' })
  // A basketball hoop
  s.push({ cyl: [0.06, 0.06, 3, 8], at: [Y.x0 + 6, 1.5, Y.z1 - 1.0], color: '#5d6170' })
  s.push({ box: [1.1, 0.75, 0.05], at: [Y.x0 + 6, 3.0, Y.z1 - 1.2], color: '#ffffff' })
  s.push({ torus: [0.22, 0.02, 4, 14], at: [Y.x0 + 6, 2.75, Y.z1 - 1.5], rot: [Math.PI / 2, 0, 0], color: '#ff6a2b' })
  return s
}

/** Trees, flower beds, benches, lamps, parked bikes. */
function propShapes(): { solid: ShapeItem[]; glow: ShapeItem[]; lamps: [number, number, number][] } {
  const s: ShapeItem[] = []
  const glow: ShapeItem[] = []
  const lamps: [number, number, number][] = []
  // 1.34: nothing may stand inside something else — every tree / lamp / bench / bush takes a circle
  const taken: [number, number, number][] = []
  const free = (x: number, z: number, r: number) => {
    if (inPickleCourt(x, z, r)) return false
    if (taken.some(([tx, tz, tr]) => Math.hypot(tx - x, tz - z) < tr + r)) return false
    taken.push([x, z, r])
    return true
  }
  const tree = (variant: Parameters<typeof libraryTree>[0], x: number, z: number, seed: number, k = 1) => {
    if (!free(x, z, 1.4 * k)) return
    const t = libraryTree(variant, seed)
    if (t) s.push(fitTree(t, [x, 0, z], seed * 1.7, k))
  }
  const lamp = (x: number, z: number) => {
    if (!free(x, z, 0.5)) return
    const m = modelShapes('streetlight', { paint: { Green: '#2c4a3a', Light: '#fff1c4', Glass: '#fff1c4' } })
    if (m) s.push(place(m, [x, 0, z]))
    glow.push({ sphere: [0.2, 10, 8], at: [x, 4.05, z], color: '#ffe3a8' })
    lamps.push([x, z, 4.8])
  }
  const bench = (x: number, z: number, rotY: number) => {
    if (!free(x, z, 0.9)) return
    const m = modelShapes('bench1', { scale: 1.5, paint: { Wood: '#a3734f' } })
    if (m) s.push(place(m, [x, 0, z], rotY))
  }
  // Promenade: willows on the bank, benches facing the water, palms and flower beds by the road
  for (let i = 0; i < 13; i++) tree('willow', -45 + i * 6 + (i % 2) * 1.2, SHORE_Z - 0.9 - (i % 3) * 0.3, i + 500, 1.05 + (i % 3) * 0.1)
  // 1.42 fix: the benches stood at z = 0.4 — on Hàng Gai! — instead of on the promenade (local OZ + 0.4)
  for (let x = -42; x < 44; x += 9) bench(x, OZ + 0.4, Math.PI)
  for (let x = -45; x < 46; x += 12) lamp(x, PROMENADE.z1 - 0.7)
  for (let x = -39; x < 44; x += 12) {
    // Flower bed: a low stone edge, bushes and flowers
    s.push({ box: [4.2, 0.35, 1.3], at: [x, 0.17, PROMENADE.z1 - 1.5], color: '#cfc8bb' })
    s.push({ box: [4.0, 0.06, 1.1], at: [x, 0.36, PROMENADE.z1 - 1.5], color: P.soil })
    const bush = modelShapes(pickBy(['bush1', 'bush2', 'berries1'], x), { scale: 0.7, paint: { Green: '#6fb85f', Berry: '#e8475a' } })
    if (bush) s.push(place(bush, [x - 1.2, 0.36, PROMENADE.z1 - 1.5], x))
    for (let k = 0; k < 4; k++) {
      const f = modelShapes('flowers', { scale: 0.9, paint: { Cyan: pickBy(['#ff8fb3', '#ffd34d', '#ff6f61', '#c9a3ef'], x + k), Yellow: '#fff3a8', Green: '#5fa553' } })
      if (f) s.push(place(f, [x + 0.1 + k * 0.6, 0.36, PROMENADE.z1 - 1.5 + ((k % 2) - 0.5) * 0.4], k))
    }
  }
  // South pavement: a row of street trees and lamps, parked scooters
  for (let x = -44; x < 46; x += 8) if (x < BA_TRIEU.px0 - 1 || x > BA_TRIEU.px1 + 1) tree(x % 3 === 0 ? 'blossom' : 'green', x, SOUTH_PAVE.z0 + 0.9, x + 600, 1.25)
  for (let x = -32; x < 46; x += 16) lamp(x, SOUTH_PAVE.z0 + 0.7)
  for (let i = 0; i < 14; i++) {
    const x = -38 + i * 2.1 + (i > 6 ? 40 : 0)
    s.push(place(motorbikeShapes(pickBy([P.rose, P.sky2, P.butter, P.mint, P.lilac, '#ffffff'], i)), [x, 0, SOUTH_PAVE.z1 - 1.0], Math.PI / 2 + ((i % 3) - 1) * 0.12))
  }
  // Bà Triệu: trees and lamps on both pavements
  for (let z = OZ + 32; z < OZ + 63; z += 7) {
    tree('green', BA_TRIEU.x1 + 0.45, z, z + 700, 1.0)
    if (z > OZ + 42) tree(z % 2 ? 'blossom' : 'green', BA_TRIEU.x0 - 0.45, z + 2, z + 720, 1.0)
  }
  for (let z = OZ + 24; z < OZ + 63; z += 13) {
    lamp(BA_TRIEU.x0 - 0.35, z + 3.5)
    lamp(BA_TRIEU.x1 + 0.35, z + 3.5)
  }
  // Park: many kinds of trees, lawns with bushes, rocks and flowers, benches along the paths, a gazebo
  const { x0, x1, z0, z1, fountain } = PARK
  const kinds: Parameters<typeof libraryTree>[0][] = ['green', 'blossom', 'palm', 'green', 'pine', 'blossom', 'green', 'willow']
  let n = 0
  for (let x = x0 + 3; x < x1 - 2; x += 6.5) {
    for (let z = z0 + 3; z < z1 - 2; z += 6.5) {
      const jx = x + Math.sin(n * 3.1) * 1.4
      const jz = z + Math.cos(n * 1.7) * 1.4
      n++
      if (Math.abs(jx - fountain.x) < 8 && Math.abs(jz - fountain.z) < 8) continue
      if (Math.abs(jx - fountain.x) < 2.5 || Math.abs(jz - fountain.z) < 2.5) continue
      if (jx > SCHOOL_YARD.x0 - 1 && jz < SCHOOL_YARD.z1 + 1) continue
      if (jx > FLOWER_MARKET.x - 4) continue
      if (n % 3 === 2) {
        if (!free(jx, jz, 1.2)) continue
        const b = modelShapes(pickBy(['bush1', 'bush2', 'berries1', 'berries2', 'shrub1', 'shrub2'], n), { scale: 0.9 + (n % 3) * 0.15, paint: { Green: '#6db85c', Leaves: '#7cc263', Tree: TRUNK, Berry: pickBy(['#e8475a', '#ffd34d', '#ff8fb3'], n) } })
        if (b) s.push(place(b, [jx, 0, jz], n))
        const r = modelShapes(pickBy(['rock1', 'rock2', 'rock3', 'rockMoss1'], n), { scale: 0.8, paint: { Rock: '#b8b2a6', Green: '#7cae5a' } })
        if (r) s.push(place(r, [jx + 1.2, 0, jz + 0.8], n))
      } else tree(kinds[n % kinds.length], jx, jz, n + 800, 1.15)
    }
  }
  for (const [x, z, r] of [
    [fountain.x - 9, fountain.z - 1.6, 0],
    [fountain.x + 9, fountain.z + 1.6, Math.PI],
    [fountain.x - 1.6, fountain.z - 9, Math.PI / 2],
    [fountain.x + 1.6, fountain.z + 9, -Math.PI / 2],
  ] as [number, number, number][])
    bench(x, z, r)
  for (const [x, z] of [
    [fountain.x - 7, fountain.z - 7],
    [fountain.x + 7, fountain.z + 7],
  ])
    lamp(x, z)
  const gazebo = modelShapes('gazebo', { scale: 1.25, paint: { RoofTiles_Red: '#b0563c', Wood: '#a3734f' } })
  if (gazebo) s.push(place(gazebo, [x0 + 7, 0, z1 - 7], 0.4))
  // Flower beds around the fountain
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    const f = modelShapes('flowers', { scale: 1.1, paint: { Cyan: pickBy(['#ff8fb3', '#ffd34d', '#ff6f61', '#c9a3ef', '#ffffff'], i), Yellow: '#fff3a8', Green: '#5fa553' } })
    if (f) s.push(place(f, [fountain.x + Math.cos(a) * 4.6, 0, fountain.z + Math.sin(a) * 4.6], a))
  }
  // Flower market: stalls with buckets of flowers along the park edge
  for (let i = 0; i < 4; i++) {
    const z = FLOWER_MARKET.z0 + i * 3.2
    const stall = modelShapes(i % 2 ? 'stall2' : 'stall1', { paint: { RoofTiles_Red: pickBy(['#e86a92', '#f2a65a', '#7fb8a8'], i), Beige: '#f6efe0', Wood: '#a3734f' } })
    if (stall) s.push(place(stall, [FLOWER_MARKET.x, 0, z], Math.PI / 2))
    for (let k = 0; k < 3; k++) {
      s.push({ cyl: [0.2, 0.16, 0.3, 10], at: [FLOWER_MARKET.x + 1.3, 0.15, z - 0.8 + k * 0.8], color: pickBy(['#5d8fd9', '#e8e2d6', '#7a8f9f'], k + i) })
      const f = modelShapes('flowers', { scale: 0.8, paint: { Cyan: pickBy(['#ff8fb3', '#ffd34d', '#ff6f61', '#ffffff', '#f4a6c8'], k + i * 3), Yellow: '#fff3a8', Green: '#5fa553' } })
      if (f) s.push(place(f, [FLOWER_MARKET.x + 1.3, 0.25, z - 0.8 + k * 0.8], k))
    }
  }
  s.push(place(stoolShapes('#5d8fd9'), [FLOWER_MARKET.x + 2.2, 0, FLOWER_MARKET.z0 + 4.2]))
  // the market's sign stands on two posts (it floated before)
  for (const dz of [-1.55, 1.55]) s.push({ cyl: [0.05, 0.06, 3.0, 8], at: [FLOWER_MARKET.x + 2.1, 1.5, FLOWER_MARKET.z0 - 2.0 + dz], color: '#6b4a35' })
  // Potted plants at a few doors
  for (const b of BUILDINGS) {
    if (!b.id || b.face !== 'north') continue
    const [px, pz] = front(b, 1.4, 2.6)
    s.push(place(softPlantShapes(P.leaf, '#e9e6df', px * 3), [px, 0, pz], 0, 1.1))
  }
  return { solid: s, glow, lamps }
}

/** Far-away blocks and trees beyond the edges (no colliders). */
function skylineShapes(): ShapeItem[] {
  const s: ShapeItem[] = []
  const colors = ['#f2c46d', '#f4dfae', '#e8b04a', '#f6e7c4', '#d9c6a1', '#f0b9a0', '#cfe0c8', '#d9cbe8']
  let k = 0
  const block = (x: number, z: number, w: number, d: number) => {
    const h = 6 + ((k * 7) % 5) * 2.5
    s.push({ box: [w, h, d], at: [x, h / 2, z], color: colors[k % colors.length] })
    s.push({ box: [w + 0.2, 0.3, d + 0.2], at: [x, h + 0.15, z], color: '#c8653d' })
    k++
  }
  for (let x = -70; x < 72; x += 9) {
    if (x > BA_TRIEU.px0 - 6 && x < BA_TRIEU.px1 + 3) continue
    block(x, PLAY.maxZ + 8 + (k % 2) * 3, 8, 7)
  }
  for (let z = OZ + 22; z < OZ + 70; z += 9) {
    block(PLAY.minX - 9 - (k % 2) * 2, z, 7, 8)
    block(PLAY.maxX + 9 + (k % 2) * 2, z, 7, 8)
  }
  for (let i = 0; i < 18; i++) {
    const t = libraryTree(i % 3 ? 'green' : 'blossom', i + 900, 1)
    if (t) s.push(place(t, [-60 + i * 7, 0, PLAY.maxZ + 3.5], i, 1.2))
  }
  return s
}


/** 1.42 the park fountain: moving water (shared/FountainWater). */
const PARK_FOUNTAIN: FountainSpec[] = [{ x: PARK.fountain.x, z: PARK.fountain.z, basinY: 0.6, basinR: 2.9, bowlY: 1.62, bowlR: 0.95, topY: 1.75, jet: 1.0 }]

function CityDoor({ b }: { b: Building }) {
  const place = b.id ? CITY_PLACES[b.id] : null
  const actions = useMemo<SpotAction[]>(() => (b.id ? [{ id: 'enter', labelKey: 'action.enterPlace', icon: 'door', action: 'city.visit', arg: b.id, primary: true }] : []), [b.id])
  if (!place) return null
  const [x, z] = front(b, 1.0)
  const horiz = b.face === 'north'
  return <ActionSpot id={`city-${b.id}`} name={place.name} zone={{ x, z, halfX: horiz ? 1.8 : 0.9, halfZ: horiz ? 0.9 : 1.8 }} actions={actions} />
}

function Signs() {
  return (
    <>
      {BUILDINGS.filter((b) => b.id).map((b) => {
        const { w, d } = placement(b)
        const width = Math.min(w * 0.8, b.model === 'b4Story_Wide_2Doors' ? 9 : 5.2)
        const y = b.model === 'b1Story_Sign' ? 3.3 : 3.75
        // 1.36: flat on the real wall at that height (the bounding box front includes steps and canopies)
        const wall = modelFrontAt(b.model, y - 0.55, y + 0.55, width / 2)
        const [x, z] = front(b, wall === null ? 0.42 : 0.1 - (d / 2 - wall))
        return <SignBoard key={b.id} options={CITY_PLACES[b.id!].sign} width={width} position={[x, y, z]} rotation={[0, faceYaw(b), 0]} />
      })}
      <SignBoard options={CITY_PLACES.flowerMarket.sign} width={3.4} position={[FLOWER_MARKET.x + 2.1, 2.6, FLOWER_MARKET.z0 - 2.0]} rotation={[0, Math.PI / 2, 0]} />
    </>
  )
}

/** Traffic and people of this district run while the player is on this side of the lake (with some margin). */
const nearSouthShore = (_x: number, z: number) => z > LAKE.south - 30

export const HangKhay = memo(function HangKhay() {
  const ground = useMemo(groundShapes, [])
  const fit = useBlockerVersion()
  const props = useMemo(propShapes, [fit])
  const houses = useMemo(() => BUILDINGS.flatMap(buildingShapes), [])
  const skyline = useMemo(skylineShapes, [])
  const paving = useMemo(() => {
    const w = PLAY.maxX - PLAY.minX + 1.2
    const d = PARK.z0 - PLAY.minZ
    const map = makeTileTexture(P.pavement, P.pavementGrout, w / 2, d / 2)
    return { w, d, material: new MeshLambertMaterial({ map }) }
  }, [])
  useEffect(
    () => () => {
      paving.material.map?.dispose()
      paving.material.dispose()
    },
    [paving],
  )
  const fm = FLOWER_MARKET
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, PLAY.minZ + paving.d / 2]} material={paving.material} receiveShadow>
        <planeGeometry args={[paving.w, paving.d]} />
      </mesh>
      <Shapes shapes={ground} material={groundMaterial} castShadow={false} />
      <Shapes shapes={houses} />
      <Shapes shapes={props.solid} />
      <FountainWater fountains={PARK_FOUNTAIN} />
      <Shapes shapes={props.glow} material={glowMaterial} castShadow={false} receiveShadow={false} />
      <Shapes shapes={skyline} castShadow={false} receiveShadow={false} />
      <LampPools spots={props.lamps} />
      <Signs />
      <PickleCourt />
      {BUILDINGS.map((b) => (
        <CityDoor key={`${b.model}-${b.x}-${b.z}`} b={b} />
      ))}

      <ActiveArea when={nearSouthShore}>
        <Traffic lanes={TRAFFIC} perLane={2} kinds={['motorbike', 'car', 'motorbike', 'bicycle', 'motorbike', 'car']} />
      <NPC def={NPCS.bacTapDuong} at={WALKERS.bacTapDuong[0]} path={{ points: WALKERS.bacTapDuong, pauseSec: [2, 6] }} />
      <NPC def={NPCS.anhChayBo} at={WALKERS.anhChayBo[0]} path={{ points: WALKERS.anhChayBo, speed: 2.6, pauseSec: [0.5, 2] }} />
      <NPC def={NPCS.chiDiDao} at={WALKERS.chiDiDao[0]} path={{ points: WALKERS.chiDiDao, pauseSec: [1, 4] }} />
      <NPC def={NPCS.coDoanhNhan} at={WALKERS.coDoanhNhan[0]} path={{ points: WALKERS.coDoanhNhan, pauseSec: [1, 3] }} />
      <NPC def={NPCS.coBanHoa} at={{ x: fm.x + 2.2, z: fm.z0 + 4.2 }} yaw={Math.PI / 2} seatY={0.33} activity="fan" />
      {/* 1.41 chú Thành welcomes you inside Nhà hàng Bờ Hồ (data/shopRooms.ts restaurant) */}
      <NPC def={NPCS.baoVeTruong} at={{ x: BA_TRIEU.px0 - 0.2, z: OZ + 41.2 }} yaw={Math.PI / 2} />
      </ActiveArea>

      <RigidBody type="fixed" colliders={false}>
        {BUILDINGS.map((b) => {
          const { at, w, d, h } = placement(b)
          const side = b.face !== 'north'
          return <CuboidCollider key={`c-${b.model}-${b.x}-${b.z}`} args={[(side ? d : w) / 2, h / 2, (side ? w : d) / 2]} position={[at[0], h / 2, at[2]]} collisionGroups={BUILDING_GROUPS} />
        })}
        {/* Lake railing, the outer edges, the school yard fence, the fountain */}
        <CuboidCollider args={[(FAR + LAKE.east) / 2, 3, 0.3]} position={[(LAKE.east - FAR) / 2, 3, SHORE_Z]} collisionGroups={PROP_GROUPS} />
        <CuboidCollider args={[0.5, 4, 35]} position={[PLAY.minX - 0.5, 4, OZ + 32]} collisionGroups={PROP_GROUPS} />
        <CuboidCollider args={[0.5, 4, 35]} position={[PLAY.maxX + 0.5, 4, OZ + 32]} collisionGroups={PROP_GROUPS} />
        <CuboidCollider args={[FAR, 4, 0.5]} position={[0, 4, PLAY.maxZ + 0.5]} collisionGroups={PROP_GROUPS} />
        <CuboidCollider args={[(SCHOOL_YARD.x1 - SCHOOL_YARD.x0) / 2, 1, 0.1]} position={[(SCHOOL_YARD.x0 + SCHOOL_YARD.x1) / 2, 1, SCHOOL_YARD.z1]} collisionGroups={PROP_GROUPS} />
        <CuboidCollider args={[0.1, 1, (SCHOOL_YARD.z1 - SCHOOL_YARD.z0) / 2]} position={[SCHOOL_YARD.x0, 1, (SCHOOL_YARD.z0 + SCHOOL_YARD.z1) / 2]} collisionGroups={PROP_GROUPS} />
        <CuboidCollider args={[3.2, 0.6, 3.2]} position={[PARK.fountain.x, 0.6, PARK.fountain.z]} collisionGroups={PROP_GROUPS} />
      </RigidBody>
    </group>
  )
})

