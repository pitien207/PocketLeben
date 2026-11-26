import { memo, useMemo } from 'react'
import { CuboidCollider, CylinderCollider, RigidBody } from '@react-three/rapier'
import { BUILDING_GROUPS, PROP_GROUPS } from '../../systems/collisionGroups'
import { glowMaterial } from '../shared/materials'
import { PALETTE as P } from '../shared/palette'
import { modelShapes } from '../shared/models'
import { benchShapes, place, treeShapes, fluffyTreeShapes, type TreeVariant } from '../shared/props'
import { Shapes, type ShapeItem } from '../shared/Shapes'
import { LabelSheet, signDraw, type Label } from '../shared/LabelSheet'
import { fitTree, useBlockerVersion } from '../shared/treeFit'
import { FountainWater, type FountainSpec } from '../shared/FountainWater'
import {
  acrossTheIsar,
  altesRathaus,
  chinesischerTurm,
  dianatempel,
  feldherrnhalle,
  frauenkirche,
  friedensengel,
  hauptbahnhof,
  hausDerKunst,
  hofbraeuhaus,
  karlstor,
  ludwigstrasse,
  marienplatzMonuments,
  monopteros,
  neuesRathaus,
  residenz,
  sendlingerTor,
  theatinerkirche,
  type Sight,
  type Solid,
} from './landmarks'
import {
  BIERGARTEN_VM,
  BRIDGES,
  CHIN_TURM,
  EISBACH,
  EISBACH_BRIDGES,
  FRAUENPLATZ,
  FUZO,
  GARTEN,
  HBF,
  HOFGARTEN,
  ISAR,
  LINDEN,
  LUDWIG,
  MAIBAUM,
  MARIENPLATZ,
  MAXSTR,
  MONOPTEROS,
  MUC,
  ODEONSPLATZ,
  PRINZ,
  ROW_FN,
  ROW_MS,
  ROW_N1,
  STACHUS,
  UNI_FOUNTAINS,
  VIKTUALIEN,
  inRect,
} from './mucLayout'
import { cafeSet, mucRow, mucRowZ, planMucRow } from './munichHouses'
import { fountainWater, kBeerTable, kCart, kFlagPole, kHedge, kLantern, kStall, LANTERN_HEAD } from './townProps'
import { libraryPot } from '../shared/props'
import { carModelShapes, carModelsReady } from '../shared/carModels'
import { FISCHBRUNNEN } from './mucLayout'

/**
 * 1.44 München around Lindenstraße (layout in munich.ts, sights in landmarks.ts). One merged mesh per district
 * (so the camera fade and frustum culling work per district), one glow mesh for every lamp, one label sheet for
 * all the signs and one fixed body for every collider.
 */

interface District {
  s: ShapeItem[]
  glow: ShapeItem[]
  solid: Solid[]
  /** Tree trunks [x, z] (thin colliders, they never block the camera). */
  trunks: [number, number][]
  /** Trees next to houses: fitted to the room they have once the colliders exist (shared/treeFit). */
  fitted: { t: ShapeItem[]; at: [number, number, number]; rot: number; scale: number }[]
}
const district = (): District => ({ s: [], glow: [], solid: [], trunks: [], fitted: [] })
const add = (d: District, sight: Sight) => {
  d.s.push(...sight.s)
  d.glow.push(...sight.glow)
  d.solid.push(...sight.solid)
}

// --- street furniture ----------------------------------------------------------------------------
const LAMP_GREEN = '#2f4a40'
/** The Munich street lamp: a dark green post with a lantern head. */
function lamp(d: District, x: number, z: number) {
  const lib = kLantern()
  if (lib) {
    d.s.push(place(lib, [x, 0, z], (x + z) * 0.37))
    d.glow.push({ sphere: [0.17, 10, 8], at: [x, LANTERN_HEAD, z], color: '#ffe7a8' })
    return
  }
  d.s.push({ cyl: [0.07, 0.11, 4.0, 8], at: [x, 2.0, z], color: LAMP_GREEN })
  d.s.push({ cyl: [0.2, 0.12, 0.3, 6], at: [x, 4.1, z], color: LAMP_GREEN })
  d.glow.push({ cyl: [0.2, 0.15, 0.42, 6], at: [x, 4.45, z], color: '#ffe7a8' })
  d.s.push({ cyl: [0.04, 0.3, 0.25, 6], at: [x, 4.78, z], color: LAMP_GREEN })
}
/** 1.46: a red pillar hydrant (Überflurhydrant) — Poly Haven fire_hydrant, pack urban. */
function hydrant(d: District, x: number, z: number, rot = 0) {
  const m = modelShapes('uHydrant', { height: 0.85, paint: (_m, c) => (parseInt(c.slice(1, 3), 16) < 0x50 ? '#3b3b3e' : '#c8322b') })
  if (!m) return
  d.s.push(place(m, [x, 0, z], rot))
  d.solid.push([x, z, 0.3, 0.3])
}
function tree(d: District, x: number, z: number, seed: number, variant: TreeVariant = 'linden', scale = 1.15, fit = true) {
  const t = treeShapes(variant, seed)
  if (fit) d.fitted.push({ t, at: [x, 0, z], rot: seed * 0.7, scale })
  else d.s.push(place(t, [x, 0, z], seed * 0.7, scale))
  d.trunks.push([x, z])
}
function fluffy(d: District, x: number, z: number, seed: number, variant: TreeVariant = 'green', scale = 1.3) {
  d.s.push(place(fluffyTreeShapes(variant, 2, seed), [x, 0, z], seed * 0.9, scale))
  d.trunks.push([x, z])
}
function bench(d: District, x: number, z: number, rot: number) {
  d.s.push(place(benchShapes('#3a4a44'), [x, 0, z], rot))
  d.solid.push(Math.abs(Math.sin(rot)) > 0.5 ? [x, z, 0.35, 0.8] : [x, z, 0.8, 0.35])
}
/** Beer-garden set: a long table with two benches (along X when rot = 0). */
function bierbank(d: District, x: number, z: number, rot = 0) {
  const lib = kBeerTable()
  if (lib) {
    d.s.push(place(lib, [x, 0, z], rot))
    d.solid.push(Math.abs(Math.sin(rot)) > 0.5 ? [x, z, 0.9, 1.15] : [x, z, 1.15, 0.9])
    return
  }
  const s: ShapeItem[] = [
    { box: [2.2, 0.06, 0.6], at: [0, 0.76, 0], color: '#c9a06a' },
    { box: [0.06, 0.73, 0.5], at: [-0.9, 0.37, 0], color: '#8a6a4a' },
    { box: [0.06, 0.73, 0.5], at: [0.9, 0.37, 0], color: '#8a6a4a' },
    { box: [2.2, 0.05, 0.26], at: [0, 0.45, -0.62], color: '#c9a06a' },
    { box: [2.2, 0.05, 0.26], at: [0, 0.45, 0.62], color: '#c9a06a' },
    { cyl: [0.06, 0.05, 0.2, 8], at: [-0.5, 0.89, 0.05], color: '#f2d27a' },
    { cyl: [0.06, 0.05, 0.2, 8], at: [0.4, 0.89, -0.1], color: '#f2d27a' },
    { cyl: [0.062, 0.062, 0.04, 8], at: [-0.5, 1.0, 0.05], color: '#ffffff' },
  ]
  d.s.push(place(s, [x, 0, z], rot))
  d.solid.push(rot ? [x, z, 0.9, 1.15] : [x, z, 1.15, 0.9])
}
/** U-Bahn entrance: railings round a stair going down, the blue U on a post. */
function uBahn(d: District, x: number, z: number, along: 'x' | 'z') {
  const L = 4
  const W = 2.2
  const s: ShapeItem[] = [
    { box: [W, 0.03, L], at: [0, 0.012, 0], color: '#4a4a50' },
    { box: [0.08, 1.0, L], at: [-W / 2, 0.5, 0], color: '#8a9098' },
    { box: [0.08, 1.0, L], at: [W / 2, 0.5, 0], color: '#8a9098' },
    { box: [W, 1.0, 0.08], at: [0, 0.5, -L / 2], color: '#8a9098' },
  ]
  for (let i = 0; i < 6; i++) s.push({ box: [W - 0.2, 0.02, 0.3], at: [0, 0.03, -L / 2 + 0.4 + i * 0.6], color: i % 2 ? '#6a6a70' : '#5a5a60' })
  d.s.push(place(s, [x, 0, z], along === 'z' ? 0 : Math.PI / 2))
  d.s.push({ cyl: [0.05, 0.05, 2.8, 6], at: [x + (along === 'z' ? W / 2 + 0.3 : 0), 1.4, z + (along === 'z' ? 0 : W / 2 + 0.3)], color: '#5d6672' })
  d.glow.push({ box: [0.6, 0.6, 0.6], at: [x + (along === 'z' ? W / 2 + 0.3 : 0), 3.0, z + (along === 'z' ? 0 : W / 2 + 0.3)], color: '#2f62b8' })
  d.solid.push(along === 'z' ? [x, z, W / 2 + 0.1, L / 2] : [x, z, L / 2, W / 2 + 0.1])
}
function litfass(d: District, x: number, z: number) {
  d.s.push({ cyl: [0.45, 0.45, 2.6, 16], at: [x, 1.3, z], color: '#e9e2d0' })
  ;['#ff9b8f', '#a9d6ff', '#ffe08a', '#a8e6cf'].forEach((c, i) => d.s.push({ cyl: [0.46, 0.46, 0.5, 16], at: [x, 0.6 + i * 0.55, z], color: c }))
  d.s.push({ sphere: [0.5, 16, 8, Math.PI / 2], at: [x, 2.6, z], color: LAMP_GREEN })
  d.solid.push([x, z, 0.5, 0.5])
}
function planter(d: District, x: number, z: number, seed: number) {
  const pot = libraryPot(seed, '#bfb6a6', 1.3)
  if (pot) {
    d.s.push(place(pot, [x, 0, z], seed))
    d.solid.push([x, z, 0.45, 0.45])
    return
  }
  d.s.push({ box: [1.2, 0.6, 1.2], at: [x, 0.3, z], color: '#bfb6a6' })
  d.s.push({ ico: [0.55, 1], at: [x, 0.85, z], scale: [1, 0.7, 1], color: seed % 2 ? P.leafDark : P.leaf })
  for (let k = 0; k < 4; k++) d.s.push({ ico: [0.12], at: [x - 0.3 + k * 0.2, 0.95 + (k % 2) * 0.1, z + 0.35], color: ['#e0485a', '#ffd84d', '#ff9fb2', '#ffffff'][(k + seed) % 4] })
  d.solid.push([x, z, 0.6, 0.6])
}
/** Viktualienmarkt stall: a wooden hut with a green roof and a counter of goods. */
function stall(d: District, x: number, z: number, rot: number, goods: string[], roof = '#4f7f5e') {
  const lib = kStall(Math.round(x * 3 + z), roof === '#4f7f5e' ? 'green' : 'red', roof === '#4f7f5e' ? '#3f7d5c' : undefined)
  if (lib) {
    d.s.push(place(lib, [x, 0, z], rot))
    const turned = Math.abs(Math.sin(rot)) > 0.5
    d.solid.push(turned ? [x, z, 1.25, 1.45] : [x, z, 1.45, 1.25])
    return
  }
  const s: ShapeItem[] = [
    { box: [3.2, 2.3, 2.2], at: [0, 1.15, 0], color: '#b98d5e' },
    { box: [3.6, 0.15, 2.8], at: [0, 2.45, 0.2], rot: [0.12, 0, 0], color: roof },
    { box: [3.0, 1.0, 0.06], at: [0, 1.6, 1.11], color: '#3d3a40' },
    { box: [3.2, 0.12, 0.7], at: [0, 0.9, 1.4], color: '#8a6a4a' },
    { box: [3.0, 0.8, 0.06], at: [0, 0.45, 1.72], color: '#a07a52' },
  ]
  goods.forEach((c, i) => {
    const gx = -1.2 + i * (2.4 / Math.max(1, goods.length - 1))
    s.push({ box: [0.55, 0.14, 0.5], at: [gx, 1.02, 1.4], color: '#c4a074' })
    for (let k = 0; k < 3; k++) s.push({ sphere: [0.09, 6, 5], at: [gx - 0.14 + k * 0.14, 1.16, 1.4 + (k % 2) * 0.1], color: c })
  })
  for (let k = 0; k < 6; k++) s.push({ box: [0.5, 0.3, 0.05], at: [-1.25 + k * 0.5, 2.2, 1.6], color: k % 2 ? '#ffffff' : roof })
  d.s.push(place(s, [x, 0, z], rot))
  const turned = Math.abs(Math.sin(rot)) > 0.5
  d.solid.push(turned ? [x, z, 1.4, 1.9] : [x, z, 1.9, 1.4])
}
/** The Maibaum: a blue-white spiral pole with the guild signs on cross-bars and a wreath. */
function maibaum(d: District, x: number, z: number) {
  const H = 24
  d.s.push({ cyl: [0.5, 0.6, 1.0, 10], at: [x, 0.5, z], color: '#8a8a90' })
  for (let i = 0; i < 24; i++) d.s.push({ cyl: [0.26 - i * 0.004, 0.27 - i * 0.004, 1.0, 10], at: [x, 1.0 + i + 0.5, z], rot: [0.0, i * 0.4, 0.18], color: i % 2 ? '#ffffff' : '#3f7fc8' })
  const signs = ['#d4473b', '#f4c04e', '#3f7d5c', '#8a5a32', '#2f62b8', '#c9a06a']
  for (let i = 0; i < 6; i++) {
    const y = 6 + i * 2.6
    const rot = (i % 3) * (Math.PI / 3)
    d.s.push({ box: [3.0, 0.08, 0.08], at: [x, y, z], rot: [0, rot, 0], color: '#5b4a3e' })
    for (const side of [-1, 1]) {
      const sx = x + Math.cos(rot) * side * 1.35
      const sz = z - Math.sin(rot) * side * 1.35
      d.s.push({ box: [0.7, 0.75, 0.06], at: [sx, y - 0.45, sz], rot: [0, rot, 0], color: '#f6efe0' })
      d.s.push({ box: [0.4, 0.4, 0.07], at: [sx, y - 0.45, sz], rot: [0, rot, 0], color: signs[(i + (side > 0 ? 0 : 3)) % 6] })
    }
  }
  d.s.push({ torus: [0.9, 0.18, 5, 16], at: [x, H - 1, z], rot: [Math.PI / 2, 0, 0], color: '#3f7d5c' })
  d.s.push({ cyl: [0.04, 0.3, 1.4, 8], at: [x, H + 0.4, z], color: '#3f7d5c' })
  d.solid.push([x, z, 0.7, 0.7])
}

/** A row of houses along X with one solid block (fronts face north when facing = -1). */
function row(d: District, x0: number, x1: number, front: number, depth: number, facing: 1 | -1, seed: number, styles?: Parameters<typeof mucRow>[6]) {
  d.s.push(...mucRow(x0, x1, front, depth, facing, seed, styles))
  d.solid.push([(x0 + x1) / 2, front - (facing * depth) / 2, (x1 - x0) / 2, depth / 2])
}

// --- districts ---------------------------------------------------------------------------------------
/** Hauptbahnhof, the west end of Lindenstraße, Sendlinger Tor. */
function west(): District {
  const d = district()
  add(d, hauptbahnhof())
  add(d, sendlingerTor())
  for (let x = -68; x < -34; x += 8) {
    tree(d, x, LINDEN.road0 - 0.8, Math.round(x * 3))
    tree(d, x + 4, LINDEN.road1 + 2.6, Math.round(x * 5))
    lamp(d, x + 4, LINDEN.road0 - 0.8)
  }
  bench(d, -44, 12, Math.PI)
  bench(d, -62, 12, Math.PI)
  litfass(d, -38, 1.0)
  uBahn(d, -57, 1.0, 'x')
  // taxis waiting (cream Munich taxis) — parked shapes, no traffic
  for (const x of [-70, -66.5]) {
    const taxi = carModelsReady() ? carModelShapes('Taxi', '#f2e9c8') : null
    d.s.push(place(taxi ?? [{ box: [1.5, 0.9, 3.0], at: [0, 0.6, 0], color: '#f2e9c8' }, { box: [1.3, 0.55, 1.6], at: [0, 1.3, -0.2], color: '#cfe0e8' }, { box: [0.6, 0.18, 0.2], at: [0, 1.66, -0.2], color: '#f4c04e' }], [x, 0, -1.6], Math.PI / 2))
  }
  d.solid.push([-68.2, -1.6, 3.4, 0.8])
  // bike rack by the station
  for (let i = 0; i < 5; i++) d.s.push({ torus: [0.3, 0.03, 4, 12, Math.PI], at: [-41 + i * 0.6, 0.05, -3.4], rot: [0, Math.PI / 2, 0], color: P.steel })
  return d
}

/** Fußgängerzone, Karlstor, Stachus, Frauenkirche and the rows round them. */
function altstadtWest(): District {
  const d = district()
  add(d, karlstor())
  add(d, frauenkirche())
  row(d, ROW_N1.segs[0][0], ROW_N1.segs[0][1], ROW_N1.front, ROW_N1.back - ROW_N1.front, -1, 21)
  row(d, ROW_FN.x0, ROW_FN.x1, ROW_FN.front, ROW_FN.front - ROW_FN.back, 1, 23, ['giebel', 'altbau'])
  const [mx0, mx1, mback] = ROW_MS.segs[0]
  row(d, mx0, mx1, ROW_MS.front, mback - ROW_MS.front, -1, 25)
  // furniture down the middle of the Fußgängerzone
  const cz = (FUZO.z0 + FUZO.z1) / 2
  for (const x of [-52, -44, -38]) planter(d, x, cz + 1.8, Math.round(-x))
  for (const x of [-55, -47, -41, -35.5]) lamp(d, x, cz - 2.2)
  bench(d, -48.5, cz + 2.6, 0)
  litfass(d, -66, -34.5)
  d.s.push(cafeSet([-50, 0, FUZO.z1 - 1.5], 0, '#c8322b'), cafeSet([-45.5, 0, FUZO.z1 - 1.5], 0, '#c8322b'))
  d.solid.push([-50, FUZO.z1 - 1.5, 0.8, 0.6], [-45.5, FUZO.z1 - 1.5, 0.8, 0.6])
  // Frauenplatz: planters and benches south of the church
  for (const x of [-54, -40]) planter(d, x, FRAUENPLATZ.z1 - 1.6, Math.round(-x * 3))
  bench(d, -50, -33.4, 0)
  bench(d, -43, -33.4, 0)
  return d
}

/** Marienplatz: Neues Rathaus, Altes Rathaus, Mariensäule, the row south of the square. */
function marienplatz(): District {
  const d = district()
  add(d, neuesRathaus())
  add(d, altesRathaus())
  add(d, marienplatzMonuments())
  row(d, ROW_N1.segs[1][0], ROW_N1.segs[1][1], ROW_N1.front, ROW_N1.back - ROW_N1.front, -1, 31)
  const [mx0, mx1, mback] = ROW_MS.segs[1]
  row(d, mx0, mx1, ROW_MS.front, mback - ROW_MS.front, -1, 33, ['palais'])
  for (const [x, z] of [
    [-31, -24],
    [-7, -24],
    [-31, -44],
    [-7, -44],
  ]) lamp(d, x, z)
  hydrant(d, -30.0, -24.7, 0.4)
  hydrant(d, -8.0, -43.3, -2.2)
  // café tables in front of the shops, U-Bahn entrance, a Litfaßsäule
  for (const x of [-24, -20.5, -12, -8.5]) {
    d.s.push(cafeSet([x, 0, MARIENPLATZ.z1 - 1.6], 0, x < -15 ? '#f6f1e7' : '#3f7d5c'))
    d.solid.push([x, MARIENPLATZ.z1 - 1.6, 0.8, 0.6])
  }
  // blue and white Bavarian flags along the town hall
  for (let i = 0; i < 6; i++) {
    const flag = kFlagPole(i % 2 === 0)
    if (flag) {
      const x = -31 + i * 4.8
      d.s.push(place(flag, [x, 0, -44.9]))
      d.solid.push([x, -44.9, 0.15, 0.15])
    }
  }
  uBahn(d, -27.5, -39, 'z')
  bench(d, -12.5, -30, Math.PI / 2)
  bench(d, -25.5, -30, -Math.PI / 2)
  return d
}

/** Viktualienmarkt: stalls, the Maibaum, the beer garden under chestnut trees, the Hofbräuhaus. */
function viktualien(): District {
  const d = district()
  add(d, hofbraeuhaus())
  const [mx0, mx1, mback] = ROW_MS.segs[2]
  row(d, mx0, mx1, ROW_MS.front, mback - ROW_MS.front, -1, 37, ['altbau'])
  maibaum(d, MAIBAUM.x, MAIBAUM.z)
  for (const [i, x, z] of [
    [0, 6.2, -21.5],
    [1, 6.2, -26.5],
    [2, 33.4, -21],
    [3, 33.4, -26],
  ] as const) {
    const flag = kFlagPole(i % 2 === 0)
    if (flag) {
      d.s.push(place(flag, [x, 0, z], Math.PI / 2))
      d.solid.push([x, z, 0.15, 0.15])
    }
  }
  const FRUIT = ['#e0485a', '#ffd84d', '#7cc27a', '#f2a35c', '#cfe8a0', '#a14a8a', '#ffffff', '#c97b4a']
  const pickGoods = (i: number) => [0, 1, 2, 3].map((k) => FRUIT[(i * 3 + k) % FRUIT.length])
  let i = 0
  for (const [x, z, rot] of [
    [9, -42, 0],
    [9, -30, 0],
    [14.5, -42, 0],
    [14.5, -26, Math.PI],
    [26, -27, Math.PI],
    [31, -27, Math.PI],
    [26, -18, 0],
    [8.5, -36, Math.PI / 2],
  ] as const) stall(d, x, z, rot, pickGoods(i++), i % 3 === 0 ? '#c8322b' : '#4f7f5e')
  for (const [x, z, r] of [
    [12.6, -21, 0.6],
    [31.5, -31, -1.2],
    [6.8, -47.5, 1.6],
  ] as const) {
    const cart = kCart(Math.round(x))
    if (cart) {
      d.s.push(place(cart, [x, 0, z], r))
      d.solid.push([x, z, 1.0, 1.0])
    }
  }
  // the beer garden: chestnut trees and benches, the bar hut
  const bg = BIERGARTEN_VM
  for (const [x, z] of [
    [bg.x0 + 1.5, bg.z0 + 1.5],
    [bg.x1 - 1.5, bg.z0 + 1.5],
    [bg.x0 + 1.5, bg.z1 - 1.0],
    [bg.x1 - 1.5, bg.z1 - 1.0],
  ]) fluffy(d, x, z, Math.round(x * 13 + z), 'green', 1.5)
  for (const [x, z] of [
    [26.5, -44.5],
    [30.5, -44.5],
    [26.5, -41.5],
    [30.5, -41.5],
  ]) bierbank(d, x, z)
  d.s.push({ box: [3, 2.4, 2], at: [33, 1.2, -36.5], color: '#b98d5e' }, { box: [3.4, 0.15, 2.4], at: [33, 2.5, -36.5], color: '#3f7fc8' })
  d.solid.push([33, -36.5, 1.5, 1.0])
  for (const [x, z] of [
    [7, -48],
    [22, -48],
    [7, -16],
    [33, -48],
  ]) lamp(d, x, z)
  return d
}

/** Odeonsplatz, Theatinerkirche, Feldherrnhalle, Residenz, Hofgarten, the two avenues. */
function north(): District {
  const d = district()
  add(d, feldherrnhalle())
  add(d, theatinerkirche())
  add(d, residenz())
  add(d, dianatempel())
  // Hofgarten: rows of lime trees, a fence with gates along Maximilianstraße, benches
  const H = HOFGARTEN
  for (let x = H.x0 + 3; x < H.x1 - 1; x += 5.5) {
    tree(d, x, H.z1 - 1.6, Math.round(x * 11), 'linden', 1.05, false)
    tree(d, x, H.z0 + 1.6, Math.round(x * 17), 'linden', 1.05, false)
  }
  for (const [x0, x1] of [
    [H.x0, 3],
    [10, H.x1],
  ]) {
    d.s.push({ box: [x1 - x0, 0.06, 0.06], at: [(x0 + x1) / 2, 1.0, H.z1], color: '#2f3a36' })
    d.s.push({ box: [x1 - x0, 0.06, 0.06], at: [(x0 + x1) / 2, 0.25, H.z1], color: '#2f3a36' })
    for (let x = x0 + 0.2; x < x1; x += 0.35) d.s.push({ box: [0.035, 1.05, 0.035], at: [x, 0.55, H.z1], color: '#2f3a36' })
    d.solid.push([(x0 + x1) / 2, H.z1, (x1 - x0) / 2, 0.12])
  }
  for (const qz of [-80.6, -93.4]) for (const [x0, x1] of [[H.x0 + 2.5, 2.5], [10.5, H.x1 - 2.5]] as const) {
    const hedge = kHedge(x1 - x0)
    if (hedge) d.s.push(place(hedge, [(x0 + x1) / 2, 0, qz]))
  }
  for (const [x, z, r] of [
    [-6, -82, 0],
    [19, -82, 0],
    [-6, -92, Math.PI],
    [19, -92, Math.PI],
  ]) bench(d, x, z, r)
  // Odeonsplatz lamps and the avenue trees
  for (const [x, z] of [
    [-55, -76],
    [-32, -76],
    [-55, -97],
    [-32, -97],
  ]) lamp(d, x, z)
  for (let x = -70; x < 34; x += 9) {
    if (x > -58 && x < -28) continue
    tree(d, x, MAXSTR.z1 + 1.5, Math.round(x * 19), 'linden', 1.1)
    lamp(d, x + 4.5, MAXSTR.z1 + 1.5)
    tree(d, x, PRINZ.walk0 + 0.9, Math.round(x * 23), 'linden', 1.1)
  }
  for (let x = -70; x < 34; x += 12) lamp(d, x + 2, MAXSTR.walk0 + 1)
  // Maximilianstraße: fancy shop windows on the south side get flags
  uBahn(d, -53, -79, 'z')
  return d
}

/** Ludwigstraße with the LMU and the Siegestor, the Haus der Kunst. */
function ludwig(): District {
  const d = district()
  add(d, ludwigstrasse())
  add(d, hausDerKunst())
  for (let z = LUDWIG.z1 - 3; z > LUDWIG.z0 + 4; z -= 7) {
    if (Math.abs(z - (-144.5)) < 4) continue
    tree(d, LUDWIG.x1 - 1.2, z, Math.round(z * 3), 'linden', 1.2, false)
    lamp(d, LUDWIG.x0 + 1.2, z - 3.5)
  }
  bench(d, -38, -128, -Math.PI / 2)
  return d
}

/** The Englischer Garten: meadows and trees, Monopteros, Chinesischer Turm and its beer garden, the Eisbach. */
function garten(): District {
  const d = district()
  add(d, monopteros())
  add(d, chinesischerTurm())
  const G = GARTEN
  const E = EISBACH
  // trees in loose groups (not on the paths, the mound, the beer garden, the Eisbach)
  const busy = (x: number, z: number) =>
    Math.abs(z + 120.3) < 2.2 ||
    (Math.abs(x + 18.5) < 2.4 && z < -120) ||
    (Math.abs(z + 132) < 2.2 && x > -20 && x < 22) ||
    (Math.abs(z + 140) < 2.2 && x > -20 && x < -8) ||
    (Math.abs(x - 20) < 2.2 && z < -127) ||
    Math.abs(x - 10) < 2.2 ||
    Math.hypot(x - MONOPTEROS.x, z - MONOPTEROS.z) < MONOPTEROS.mound + 1 ||
    Math.hypot(x - CHIN_TURM.x, z - CHIN_TURM.z) < 10 ||
    (z > E.z0 - 2.5 && z < E.z1 + 2.5) ||
    (x < -8 && z > -120)
  let n = 0
  for (let i = 0; i < 120 && n < 34; i++) {
    const x = G.x0 + 2 + ((i * 37.7) % (G.x1 - G.x0 - 4))
    const z = G.z0 + 2 + ((i * 23.3 + (i % 7) * 5) % (G.z1 - G.z0 - 4))
    if (busy(x, z)) continue
    const variant: TreeVariant = n % 5 === 0 ? 'birch' : n % 7 === 0 ? 'pine' : n % 3 === 0 ? 'green' : 'linden'
    tree(d, x, z, i * 13 + 5, variant, 1.25 + (i % 4) * 0.12, false)
    n++
  }
  // beer garden round the tower
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + 0.2
    bierbank(d, CHIN_TURM.x + Math.cos(a) * 6.5, CHIN_TURM.z + Math.sin(a) * 6.5, -a)
  }
  // Eisbach: railings except at the bridges, the surf wave
  for (const z of [E.z0 - 0.5, E.z1 + 0.5]) {
    let x0 = E.x0
    for (const [bx0, bx1] of [...EISBACH_BRIDGES, [ISAR.walk1, ISAR.water0]]) {
      if (bx0 > x0) d.s.push({ box: [bx0 - x0, 0.06, 0.06], at: [(x0 + bx0) / 2, 0.9, z], color: '#3a4a44' })
      x0 = bx1
    }
  }
  for (const [x0, x1] of EISBACH_BRIDGES) {
    for (const z of [E.z0 - 0.7, E.z1 + 0.7]) d.s.push({ box: [0.06, 0.06, 0.06], at: [x0, 0.9, z], color: '#3a4a44' })
    for (const x of [x0, x1]) d.s.push({ box: [0.12, 0.95, E.z1 - E.z0 + 1.6], at: [x, 0.48, (E.z0 + E.z1) / 2], color: x0 > 0 && x0 < 20 ? '#8a6a4a' : '#bfb8aa' })
  }
  // the standing wave: white foam ridges
  for (let k = 0; k < 5; k++) d.s.push({ sphere: [0.7, 10, 6], at: [E.wave + k * 0.15, 0.05, E.z0 + 0.6 + k * 0.7], scale: [1.6, 0.35, 0.9], color: k % 2 ? '#ffffff' : '#dff2f6' })
  // a culvert where the Eisbach comes out from under Ludwigstraße
  d.s.push({ box: [1.2, 2.2, E.z1 - E.z0 + 2.4], at: [E.x0 - 0.4, 1.1, (E.z0 + E.z1) / 2], color: '#bfb8aa' })
  d.s.push({ box: [0.2, 1.2, E.z1 - E.z0 - 0.4], at: [E.x0 + 0.25, 0.6, (E.z0 + E.z1) / 2], color: '#3b3f44' })
  // benches along the main path
  for (const x of [0, 16, 27]) bench(d, x, -118.4, 0)
  for (const [x, z] of [
    [-4, -118.6],
    [20, -118.6],
    [-16.4, -129],
    [-8, -140],
    [20, -146],
  ]) lamp(d, x, z)
  return d
}

/** The Isar: promenade, bridges, east bank, Friedensengel, the buildings across the river. */
function isar(): District {
  const d = district()
  add(d, friedensengel())
  d.s.push(...acrossTheIsar())
  const mid = (ISAR.walk0 + ISAR.walk1) / 2
  for (let z = MUC.maxZ - 4; z > MUC.minZ + 2; z -= 9) {
    if (BRIDGES.some((b) => z > b.z0 - 3 && z < b.z1 + 3) || (z > EISBACH.z0 - 3 && z < EISBACH.z1 + 3)) continue
    tree(d, ISAR.walk1 - 0.8, z, Math.round(z * 7), z % 2 ? 'willow' : 'linden', 1.2, false)
    lamp(d, ISAR.walk0 + 0.8, z - 4.5)
    if (Math.round(z) % 3 === 0) bench(d, mid, z - 2, Math.PI / 2)
  }
  for (let z = MUC.maxZ - 8; z > -110; z -= 12) {
    if (BRIDGES.some((b) => z > b.z0 - 3 && z < b.z1 + 3) || Math.abs(z + 93) < 4) continue
    tree(d, ISAR.east1 - 1.2, z, Math.round(z * 11), 'linden', 1.2, false)
  }
  // bridge parapets over the water and the beaches
  for (const b of BRIDGES) {
    for (const z of [b.z0 + 0.2, b.z1 - 0.2]) {
      d.s.push({ box: [ISAR.beach2 - ISAR.walk1, 1.0, 0.35], at: [(ISAR.walk1 + ISAR.beach2) / 2, 0.5, z], color: '#d6ccb6' })
      d.s.push({ box: [ISAR.beach2 - ISAR.walk1, 0.12, 0.5], at: [(ISAR.walk1 + ISAR.beach2) / 2, 1.06, z], color: '#c4b9a2' })
      for (let x = ISAR.walk1 + 2; x < ISAR.beach2; x += 6) lamp(d, x, z + (z === b.z0 + 0.2 ? 0.5 : -0.5))
    }
  }
  // the east bank: a low wall with the city behind it
  d.s.push({ box: [0.4, 1.0, MUC.maxZ - MUC.minZ + 40], at: [ISAR.east1 + 0.3, 0.5, (MUC.maxZ + MUC.minZ) / 2], color: '#d6ccb6' })
  // kayaks pulled up on the beach, a little group of stones to sit on
  for (const [x, z, c] of [
    [43.8, -36, '#f4c04e'],
    [44.2, -33, '#d4473b'],
  ] as const) d.s.push({ sphere: [0.5, 10, 6], at: [x, 0.15, z], scale: [0.7, 0.4, 3.2], color: c })
  for (const [x, z] of [
    [44.5, -20],
    [43.5, -82],
    [59.5, -40],
  ]) d.s.push({ ico: [0.6, 0], at: [x, 0.2, z], scale: [1.4, 0.6, 1], color: '#b8afa0' })
  return d
}

/** Houses outside the walkable area so the city does not end at an invisible wall. */
function skyline(): District {
  const d = district()
  // west: along Z, fronts facing east (gaps where the roads and the Fußgängerzone leave the map)
  for (const [z0, z1, seed] of [
    [-160, -110, 51],
    [-98, -72, 52],
    [-58, -33, 53],
    [-21, 2, 54],
    [10, 30, 55],
  ]) d.s.push(...mucRowZ(z0, z1, MUC.minX - 2, 9, 1, seed))
  // south of Lindenstraße, fronts facing north
  // (the south row is seen across Lindenstraße: real houses; the far rows are cheap)
  d.s.push(...mucRow(-100, 33, LINDEN.south + 1.5, 9, -1, 57))
  // east bank: Haidhausen rows facing the river (holes for the Maximilianeum, the Volksbad and the bridges)
  for (const [z0, z1, seed] of [
    [-160, -110, 61],
    [-46, -32, 62],
    [-13, 1.5, 63],
  ]) d.s.push(...mucRowZ(z0, z1, ISAR.east1 + 1.0, 9, -1, seed))
  // north: the Englischer Garten goes on (trees), Leopoldstraße houses
  for (let x = -30; x < 46; x += 6) d.s.push(place(fluffyTreeShapes(x % 4 ? 'green' : 'linden', 1, x), [x + ((x * 7) % 3), 0, MUC.minZ - 6 - (x % 5)], x, 1.6))
  d.s.push(...mucRow(-100, -53, MUC.minZ - 1.5, 9, 1, 65, ['palais', 'altbau']))
  return d
}

// --- signs ---------------------------------------------------------------------------------------------
const SHOP_NAMES = ['Bäckerei Rischart', 'Apotheke', 'Buchhandlung', 'Optik Huber', 'Schuhhaus', 'Café Mozart', 'Metzgerei', 'Trachten', 'Blumen Lang', 'Drogerie', 'Feinkost', 'Eiscafé', 'Souvenirs', 'Kaufhaus', 'Uhren Kern', 'Spielwaren', 'Konditorei', 'Bank']
const SHOP_COLORS = [
  ['#2f4f8f', '#ffffff'],
  ['#ffffff', '#c8322b'],
  ['#3f7d5c', '#fff6d8'],
  ['#1f1f24', '#f4c04e'],
  ['#7a4a2a', '#fff6d8'],
  ['#f6efe0', '#5b4636'],
]

function signLabels(): Label[] {
  const L: Label[] = []
  const sign = (w: number, h: number, at: [number, number, number], rotY: number, bg: string, fg: string, title: string, sub?: string, border?: string) =>
    L.push({ w, h, at, rotY, draw: signDraw({ bg, fg, title, sub, border }) })
  // shop names over the shops of the rows facing north (Fußgängerzone, Marienplatz)
  let k = 0
  for (const [x0, x1] of ROW_N1.segs) {
    planMucRow(x0, x1, x0 === ROW_N1.segs[0][0] ? 21 : 31).forEach((lot) => {
      const [bg, fg] = SHOP_COLORS[k % SHOP_COLORS.length]
      sign(Math.min(3.4, lot.width - 1.2), 0.55, [lot.x, 3.45, ROW_N1.front - 0.12], Math.PI, bg, fg, SHOP_NAMES[k % SHOP_NAMES.length])
      k++
    })
  }
  // the sights
  const { x0, x1, z1 } = HBF
  sign(13, 1.3, [(x0 + x1) / 2 + 3, 10.6, z1 + 0.2], 0, '#ffffff', '#2a3240', 'MÜNCHEN HAUPTBAHNHOF')
  sign(1.4, 0.9, [x0 + 2.5, 7.2, z1 + 0.12], 0, '#d4473b', '#ffffff', 'DB')
  sign(5.2, 0.8, [15, 13.2, -49.92], 0, '#f2ead6', '#2f4f8f', 'HOFBRÄUHAUS', undefined, '#2f4f8f')
  sign(2.6, 0.5, [-19, 1.6, -33 + 2.62], 0, '#cfc4b0', '#4a3a2a', 'PATRONA BAVARIAE')
  // street name plates (blue-white like the real ones)
  const plate = (x: number, z: number, rotY: number, text: string) => sign(2.4, 0.42, [x, 2.9, z], rotY, '#ffffff', '#1f3f8f', text, undefined, '#1f3f8f')
  plate(-36.0, -21.9, Math.PI, 'Kaufingerstraße')
  plate(-62, -21.9, Math.PI, 'Neuhauser Straße')
  plate(-34.4, -12, -Math.PI / 2, 'Sendlinger Straße')
  plate(-27.1, -16, Math.PI / 2, 'Sendlinger Straße')
  plate(-4.4, -22.3, Math.PI, 'Marienplatz')
  plate(-56.8, -75, Math.PI / 2, 'Odeonsplatz')
  plate(-52.8, -112, Math.PI / 2, 'Ludwigstraße')
  plate(5.4, -57.9, Math.PI, 'Maximilianstraße')
  plate(23.8, -57.9, Math.PI, 'Maximilianstraße')
  plate(-21.2, -99.2, Math.PI, 'Prinzregentenstraße')
  plate(-34.6, -110.2, 0, 'Englischer Garten')
  plate(34.2, -14, Math.PI / 2, 'Viktualienmarkt')
  plate(-70.8, -4.6, 0, 'Bayerstraße')
  // U-Bahn station names
  const ubahn = (x: number, y: number, z: number, rotY: number, name: string) => sign(1.9, 0.45, [x, y, z], rotY, '#2f62b8', '#ffffff', `U  ${name}`)
  ubahn(-57, 2.3, 2.7, 0, 'Hauptbahnhof')
  ubahn(-26.2, 2.3, -39, Math.PI / 2, 'Marienplatz')
  ubahn(-53, 2.3, -76.85, 0, 'Odeonsplatz')
  // Viktualienmarkt + beer-garden boards
  sign(3.6, 0.7, [VIKTUALIEN.x1 - 0.2, 2.6, -33], Math.PI / 2, '#3f7d5c', '#fff6d8', 'VIKTUALIENMARKT', 'Mo–Sa 8–20 Uhr')
  sign(3.0, 0.6, [33, 2.9, -35.44], 0, '#3f7fc8', '#ffffff', 'BIERGARTEN')
  sign(3.4, 0.7, [CHIN_TURM.x, 2.2, CHIN_TURM.z + 2.75], 0, '#4f7f5e', '#fff6d8', 'Chinesischer Turm', 'Biergarten · seit 1791')
  sign(3.0, 0.55, [ISAR.walk1 + 0.2, 1.4, BRIDGES[1].z1 + 0.6], Math.PI / 2, '#ffffff', '#1f3f8f', 'Isar · Maximiliansbrücke', undefined, '#1f3f8f')
  sign(2.8, 0.55, [EISBACH.wave - 2, 1.2, EISBACH.z1 + 0.9], 0, '#f4c04e', '#2a2a2a', 'Eisbachwelle', 'Nur für Könner!')
  sign(4.4, 0.8, [-10, 4.6, -110.9], 0, '#e9e2d4', '#4a4f5a', 'HAUS DER KUNST')
  sign(5.2, 0.8, [-52.6, 6.6, (-146 + -113) / 2], Math.PI / 2, '#efe3c8', '#4a3a2a', 'LUDWIG-MAXIMILIANS-UNIVERSITÄT')
  return L
}

// --- the scene part -----------------------------------------------------------------------------------
const FOUNTAINS: FountainSpec[] = [
  { ...fountainWater(STACHUS.x, STACHUS.z, STACHUS.r), jet: 1.8 },
  ...UNI_FOUNTAINS.map((f) => fountainWater(f.x, f.z, 2.6)),
  fountainWater(FISCHBRUNNEN.x, FISCHBRUNNEN.z, 1.7),
]

/** Invisible walls round the map and over the water. */
function walls(): Solid[] {
  const w: Solid[] = []
  const { minX, maxX, minZ, maxZ } = MUC
  w.push([minX - 0.5, (minZ + maxZ) / 2, 0.5, (maxZ - minZ) / 2 + 1])
  w.push([maxX + 0.5, (minZ + maxZ) / 2, 0.5, (maxZ - minZ) / 2 + 1])
  w.push([(minX + maxX) / 2, minZ - 0.5, (maxX - minX) / 2 + 1, 0.5])
  w.push([(minX + maxX) / 2, maxZ + 0.5, (maxX - minX) / 2 + 1, 0.5])
  // the Isar: water between the bridges
  const zs = [minZ - 1, ...BRIDGES.flatMap((b) => [b.z0 + 0.4, b.z1 - 0.4]).sort((a, b) => a - b), maxZ + 1]
  const wx = (ISAR.water0 + ISAR.water1) / 2
  for (let i = 0; i < zs.length; i += 2) w.push([wx, (zs[i] + zs[i + 1]) / 2, (ISAR.water1 - ISAR.water0) / 2, (zs[i + 1] - zs[i]) / 2])
  // bridge parapets
  for (const b of BRIDGES) for (const z of [b.z0 + 0.2, b.z1 - 0.2]) w.push([(ISAR.walk1 + ISAR.beach2) / 2 + 1, z, (ISAR.beach2 - ISAR.walk1) / 2 - 1, 0.2])
  // the Eisbach between its bridges
  const E = EISBACH
  let x0 = E.x0 - 1
  for (const [bx0, bx1] of [...EISBACH_BRIDGES, [E.x1, E.x1]]) {
    if (bx0 > x0) w.push([(x0 + bx0) / 2, (E.z0 + E.z1) / 2, (bx0 - x0) / 2, (E.z1 - E.z0) / 2 + 0.3])
    x0 = bx1
  }
  // the Eisbach bridge rails
  for (const [bx0, bx1] of EISBACH_BRIDGES) for (const x of [bx0, bx1]) w.push([x, (E.z0 + E.z1) / 2, 0.08, (E.z1 - E.z0) / 2 + 0.8])
  // Stadtpark east hedge (was the end of the map), the Asia-Markt corner
  w.push([34.3, -8.7, 0.3, 4.1])
  return w
}

export const Munich = memo(function Munich() {
  // built once; only the trees beside houses are refitted when the colliders appear (frames 2…120)
  const parts = useMemo(() => [west(), altstadtWest(), marienplatz(), viktualien(), north(), ludwig(), garten(), isar(), skyline()], [])
  const fit = useBlockerVersion()
  const fitted = useMemo(() => parts.flatMap((p) => p.fitted.map((f) => fitTree(f.t, f.at, f.rot, f.scale))), [parts, fit])
  const glow = useMemo(() => parts.flatMap((p) => p.glow), [parts])
  const solids = useMemo(() => ({ buildings: parts.flatMap((p) => p.solid), trunks: parts.flatMap((p) => p.trunks), walls: walls() }), [parts])
  const labels = useMemo(signLabels, [])
  return (
    <>
      {parts.map((p, i) => (
        <Shapes key={i} shapes={p.s} castShadow={i < 8} receiveShadow={i < 8} />
      ))}
      <Shapes shapes={fitted} />
      <Shapes shapes={glow} material={glowMaterial} castShadow={false} receiveShadow={false} />
      <LabelSheet labels={labels} ppm={120} />
      <FountainWater fountains={FOUNTAINS} />
      <RigidBody type="fixed" colliders={false}>
        {solids.buildings.map(([x, z, hx, hz], i) => (
          <CuboidCollider key={`b${i}`} args={[hx, 4, hz]} position={[x, 4, z]} collisionGroups={Math.min(hx, hz) > 2.65 ? BUILDING_GROUPS : PROP_GROUPS} />
        ))}
        {solids.trunks.map(([x, z], i) => (
          <CylinderCollider key={`t${i}`} args={[0.8, 0.25]} position={[x, 0.8, z]} collisionGroups={PROP_GROUPS} />
        ))}
        {solids.walls.map(([x, z, hx, hz], i) => (
          <CuboidCollider key={`w${i}`} args={[hx, 4, hz]} position={[x, 4, z]} collisionGroups={PROP_GROUPS} />
        ))}
      </RigidBody>
    </>
  )
})

/** Used by the map and the tests: is (x, z) open ground of the city (not in a building)? */
export function mucWalkable(x: number, z: number) {
  const { minX, maxX, minZ, maxZ } = MUC
  if (x < minX || x > maxX || z < minZ || z > maxZ) return false
  if (inRect({ x0: ISAR.water0, x1: ISAR.water1, z0: minZ, z1: maxZ }, x, z) && !BRIDGES.some((b) => z > b.z0 && z < b.z1)) return false
  return true
}

export { MARIENPLATZ, ODEONSPLATZ }
