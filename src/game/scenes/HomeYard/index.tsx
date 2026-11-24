import { memo, useEffect, useMemo, useState } from 'react'
import { Animal } from '../../components/animals/Animal'
import { CuboidCollider, CylinderCollider, RigidBody } from '@react-three/rapier'
import { useFlags } from '../../../store/flagsStore'
import { useTime } from '../../../store/timeStore'
import { ActionSpot, type SpotAction } from '../../components/ActionSpot'
import { BUILDING_GROUPS, PROP_GROUPS } from '../../systems/collisionGroups'
import { houseLevel } from '../../systems/family'
import { yardHens } from '../../systems/homeYard'
import { glowMaterial, groundMaterial, WINDOW_GLASS } from '../shared/materials'
import { modelShapes, pickBy } from '../shared/models'
import { libraryTree, place } from '../shared/props'
import { Shapes, type ShapeItem } from '../shared/Shapes'
import { Chickens, type Flock } from './Chickens'
import { YARD } from './layout'

/**
 * 1.42 The back yard of the family's tube house (user: "đằng sau có cửa bấm vào ra phần vườn sau nhà có nuôi gà").
 * Outdoors (sky, sun, rain), walled in by brick with the neighbours' backs rising round it, open towards the camera
 * like the rooms. The house's back wall with the green door is in the north (z = YARD.house), the hens' coop and run
 * on the west, three raised vegetable beds on the east, water jars, a banana tree, a washing line.
 * Logic: systems/homeYard.ts (feed the hens → eggs tomorrow; water the beds three times → pick a bunch of greens).
 * The yard follows the debts like the house: hens get sold, the beds dry out, the washing is patched.
 */

const { w: W, house: HZ, front: FZ, run, coop, beds } = YARD
const BRICK = '#b5654a'
const BRICK_DARK = '#9a5440'

function groundShapes(): ShapeItem[] {
  const s: ShapeItem[] = []
  // Outside the walls (seen over them), the yard's packed earth, a brick path from the door
  s.push({ box: [70, 0.02, 70], at: [0, -0.005, 0], color: '#bfae8c' })
  s.push({ box: [W, 0.03, FZ - HZ], at: [0, 0.012, (HZ + FZ) / 2], color: '#c9a87a' })
  for (let z = HZ + 0.6; z < FZ - 0.2; z += 0.42) {
    for (const [i, x] of [-0.36, 0, 0.36].entries()) s.push({ box: [0.34, 0.035, 0.36], at: [x + ((Math.round(z * 10) % 2) * 0.1 - 0.05), 0.02, z], color: (i + Math.round(z * 3)) % 3 ? '#c27a5c' : '#b06a4e' })
  }
  // grass tufts round the edges
  for (let i = 0; i < 46; i++) {
    const a = Math.sin(i * 12.9898) * 43758.5453
    const r = a - Math.floor(a)
    const x = -W / 2 + 0.3 + ((i * 0.37 + r) % 1) * (W - 0.6)
    const z = HZ + 0.5 + r * (FZ - HZ - 1)
    if (Math.abs(x) < 0.9) continue
    const grass = modelShapes(i % 2 ? 'fGrass1' : 'fGrass2', { height: 0.18 + r * 0.14, paint: { Green_Grass: i % 3 ? '#7fb85a' : '#6aa54c' } })
    if (grass) s.push(place(grass, [x, 0.02, z], i * 1.3))
  }
  return s
}

/** The house's back, the brick walls and the neighbours' backs. */
function wallShapes(): { s: ShapeItem[]; glow: ShapeItem[] } {
  const s: ShapeItem[] = []
  const glow: ShapeItem[] = []
  // Our house: three floors of yellow plaster, a balcony with plants, the water tank on the roof
  s.push({ box: [W + 1, 9.6, 4], at: [0, 4.8, HZ - 2], color: '#f1d48c' })
  s.push({ box: [W + 1.1, 0.25, 4.1], at: [0, 9.7, HZ - 2], color: '#c8653d' })
  s.push({ cyl: [0.55, 0.55, 1.3, 14], at: [-3.2, 10.5, HZ - 2.2], rot: [0, 0, Math.PI / 2], color: '#d9dde3' })
  for (const fy of [3.6, 6.8]) {
    s.push({ box: [W - 3, 0.12, 0.9], at: [0, fy - 0.45, HZ + 0.45], color: '#e8dcc4' })
    for (let x = -W / 2 + 1.7; x < W / 2 - 1.5; x += 0.25) s.push({ box: [0.04, 0.8, 0.04], at: [x, fy, HZ + 0.86], color: '#3f5a52' })
    s.push({ box: [W - 3, 0.05, 0.05], at: [0, fy + 0.4, HZ + 0.86], color: '#3f5a52' })
    for (const x of [-3.6, -1.2, 1.2, 3.6]) {
      s.push({ box: [1.2, 1.3, 0.06], at: [x, fy + 0.6, HZ + 0.02], color: '#f6ead0' })
      s.push({ box: [1.0, 1.1, 0.07], at: [x, fy + 0.6, HZ + 0.03], color: pickBy(WINDOW_GLASS, Math.round(x * 3 + fy)) })
      s.push({ box: [0.05, 1.1, 0.08], at: [x, fy + 0.6, HZ + 0.04], color: '#f6ead0' })
    }
    for (let i = 0; i < 4; i++) s.push({ cyl: [0.16, 0.12, 0.25, 8], at: [-3 + i * 2, fy - 0.27, HZ + 0.6], color: '#c97b63' }, { ico: [0.22, 0], at: [-3 + i * 2, fy, HZ + 0.6], color: '#6db85c' })
  }
  // Ground floor: the green back door (spot "yard-door"), a tin awning, a kitchen window, a bulb
  s.push({ box: [1.3, 2.4, 0.08], at: [0, 1.2, HZ + 0.02], color: '#2c5c43' })
  for (const sx of [-1, 1]) {
    s.push({ box: [0.52, 2.18, 0.06], at: [sx * 0.27, 1.1, HZ + 0.07], color: '#3f7d5c' })
    s.push({ box: [0.36, 0.84, 0.03], at: [sx * 0.27, 1.6, HZ + 0.11], color: '#cfe8f6' })
    s.push({ sphere: [0.03, 8, 6], at: [sx * 0.07, 1.06, HZ + 0.13], color: '#f4c04e' })
  }
  s.push({ box: [1.8, 0.18, 0.9], at: [0, 0.09, HZ + 0.45], color: '#cfc3ad' })
  s.push({ box: [2.2, 0.05, 1.3], at: [0, 2.75, HZ + 0.6], rot: [-0.18, 0, 0], color: '#8fa3b0' })
  for (const sx of [-1, 1]) s.push({ box: [0.05, 0.9, 0.05], at: [sx * 1.0, 2.5, HZ + 1.15], color: '#7a8a96' })
  s.push({ box: [1.4, 1.0, 0.06], at: [3.0, 1.7, HZ + 0.02], color: '#f6ead0' }, { box: [1.2, 0.8, 0.07], at: [3.0, 1.7, HZ + 0.03], color: WINDOW_GLASS[0] })
  for (let i = 0; i < 6; i++) s.push({ box: [1.2, 0.03, 0.05], at: [3.0, 1.35 + i * 0.13, HZ + 0.08], color: '#9aa7b0' })
  glow.push({ sphere: [0.08, 10, 8], at: [-0.95, 2.45, HZ + 0.25], color: '#ffe7b0' })
  // Brick walls east and west (2.3 m) with a coping, the low wall in front (open to the camera)
  for (const side of [-1, 1]) {
    const x = side * (W / 2 + 0.12)
    s.push({ box: [0.24, 2.3, FZ - HZ], at: [x, 1.15, (HZ + FZ) / 2], color: BRICK })
    s.push({ box: [0.34, 0.08, FZ - HZ], at: [x, 2.34, (HZ + FZ) / 2], color: '#d9cdb5' })
    for (let z = HZ + 0.25; z < FZ; z += 0.5) for (let y = 0.2; y < 2.2; y += 0.34) if ((Math.round(z * 4) + Math.round(y * 3)) % 5 === 0) s.push({ box: [0.25, 0.12, 0.36], at: [x - side * 0.01, y, z], color: BRICK_DARK })
    // moss at the foot
    s.push({ box: [0.26, 0.25, FZ - HZ - 0.4], at: [x - side * 0.01, 0.12, (HZ + FZ) / 2], color: '#7f9a55' })
  }
  for (const sx of [-1, 1]) {
    const x0 = sx > 0 ? 1.4 : -W / 2
    const x1 = sx > 0 ? W / 2 : -1.4
    s.push({ box: [x1 - x0, 0.75, 0.24], at: [(x0 + x1) / 2, 0.375, FZ], color: BRICK })
    s.push({ box: [x1 - x0 + 0.1, 0.07, 0.34], at: [(x0 + x1) / 2, 0.78, FZ], color: '#d9cdb5' })
    for (let i = 0; i < 3; i++) s.push({ cyl: [0.13, 0.1, 0.2, 8], at: [(x0 + x1) / 2 - 1.5 + i * 1.5, 0.92, FZ], color: '#c97b63' }, { ico: [0.18, 0], at: [(x0 + x1) / 2 - 1.5 + i * 1.5, 1.12, FZ], color: i % 2 ? '#e86a8a' : '#6db85c' })
  }
  // A wrought-iron gate in the gap
  for (let x = -1.3; x <= 1.31; x += 0.2) s.push({ box: [0.03, 1.2, 0.03], at: [x, 0.6, FZ], color: '#3f5a52' })
  s.push({ box: [2.7, 0.05, 0.05], at: [0, 1.15, FZ], color: '#3f5a52' }, { box: [2.7, 0.05, 0.05], at: [0, 0.15, FZ], color: '#3f5a52' })
  // The neighbours' backs: tall narrow houses, windows, AC units, water tanks, washing
  const colors = ['#e8c9a0', '#d9e2c4', '#f0d0c4', '#cfdbe6', '#efe2b5']
  let k = 0
  for (const side of [-1, 1]) {
    for (let z = HZ - 2; z < FZ + 1; z += 3.6, k++) {
      const h = 6 + ((k * 7) % 5) * 1.1
      const x = side * (W / 2 + 2.4)
      s.push({ box: [4, h, 3.4], at: [x, h / 2, z + 1.7], color: colors[k % colors.length] })
      s.push({ box: [4.1, 0.2, 3.5], at: [x, h + 0.1, z + 1.7], color: '#c8653d' })
      for (let fy = 3; fy < h - 1; fy += 2.6) {
        s.push({ box: [0.07, 1.0, 1.0], at: [x - side * 2.02, fy, z + 1.7], color: pickBy(WINDOW_GLASS, k * 3 + fy) })
        if ((k + fy) % 3 < 1) s.push({ box: [0.4, 0.42, 0.7], at: [x - side * 2.2, fy - 0.9, z + 0.7], color: '#eef1f4' })
      }
      if (k % 2) s.push({ cyl: [0.45, 0.45, 1.1, 12], at: [x, h + 0.75, z + 1.2], rot: [0, 0, Math.PI / 2], color: '#d9dde3' })
    }
  }
  return { s, glow }
}

/** The hens' home: a bamboo coop with a tin roof, nests with straw, a fenced run, a trough and a water dish. */
function coopShapes(level: number, eggs: boolean, fed: boolean): ShapeItem[] {
  const s: ShapeItem[] = []
  const { x0, x1, z0, z1 } = coop
  const cx = (x0 + x1) / 2
  const cz = (z0 + z1) / 2
  // Raised floor, back + side walls of planks, bamboo front, a slanted tin roof
  s.push({ box: [x1 - x0, 0.12, z1 - z0], at: [cx, 0.42, cz], color: '#a07850' })
  for (const [x, z] of [[x0 + 0.1, z0 + 0.1], [x1 - 0.1, z0 + 0.1], [x0 + 0.1, z1 - 0.1], [x1 - 0.1, z1 - 0.1]]) s.push({ box: [0.1, 1.9, 0.1], at: [x, 0.95, z], color: '#7a5636' })
  s.push({ box: [x1 - x0, 1.3, 0.06], at: [cx, 1.1, z0 + 0.05], color: '#b08a5e' })
  for (const x of [x0 + 0.05, x1 - 0.05]) s.push({ box: [0.06, 1.3, z1 - z0], at: [x, 1.1, cz], color: '#b08a5e' })
  for (let x = x0 + 0.18; x < x1 - 0.1; x += 0.14) s.push({ cyl: [0.025, 0.025, 1.25, 5], at: [x, 1.1, z1 - 0.05], color: '#d9bd6a' })
  s.push({ box: [0.5, 0.7, 0.04], at: [cx + 0.4, 0.85, z1 + 0.01], rot: [0, level >= 3 ? 0.5 : 0, 0], color: '#a07850' })
  s.push({ box: [x1 - x0 + 0.5, 0.05, z1 - z0 + 0.6], at: [cx, 2.0, cz], rot: [0.22, 0, 0], color: level >= 3 ? '#8a9aa6' : '#a9b6c0' })
  for (let x = x0 - 0.2; x < x1 + 0.2; x += 0.3) s.push({ box: [0.03, 0.06, z1 - z0 + 0.6], at: [x, 2.03, cz], rot: [0.22, 0, 0], color: '#93a1ac' })
  if (level >= 2) s.push({ box: [1.1, 0.06, 0.9], at: [cx - 0.5, 2.08, cz], rot: [0.22, 0, 0.05], color: '#3f78c0' })
  // Nests: straw in wooden boxes along the back wall, eggs when they are there
  for (const nx of [x0 + 0.55, x0 + 1.35]) {
    s.push({ box: [0.6, 0.3, 0.5], at: [nx, 0.63, z0 + 0.35], color: '#8a6440' })
    s.push({ cyl: [0.24, 0.2, 0.12, 10], at: [nx, 0.8, z0 + 0.35], color: '#e3c27a' })
    if (eggs) for (let i = 0; i < 2; i++) s.push({ sphere: [0.06, 8, 6], at: [nx - 0.05 + i * 0.1, 0.88, z0 + 0.33 + i * 0.03], scale: [1, 1.3, 1], color: i ? '#f2d3a8' : '#fbe7cc' })
  }
  s.push({ cyl: [0.025, 0.025, x1 - x0 - 0.3, 5], at: [cx + 0.3, 1.25, cz + 0.2], rot: [0, 0, Math.PI / 2], color: '#7a5636' })
  // The run: posts and chicken wire (a light grid), a gate by the path
  const { x0: rx0, x1: rx1, z1: rz1 } = run
  const wire = '#c8ccd0'
  const fence = (ax: number, az: number, bx: number, bz: number) => {
    const len = Math.hypot(bx - ax, bz - az)
    const n = Math.max(1, Math.round(len / 1.1))
    const rot = Math.atan2(bx - ax, bz - az)
    for (let i = 0; i <= n; i++) s.push({ box: [0.07, 0.85, 0.07], at: [ax + ((bx - ax) * i) / n, 0.42, az + ((bz - az) * i) / n], color: '#8a6440' })
    for (const y of [0.15, 0.45, 0.78]) s.push({ box: [0.015, 0.015, len], at: [(ax + bx) / 2, y, (az + bz) / 2], rot: [0, rot, 0], color: wire })
    for (let t = 0.1; t < len; t += 0.18) s.push({ box: [0.008, 0.66, 0.008], at: [ax + ((bx - ax) * t) / len, 0.45, az + ((bz - az) * t) / len], color: wire })
  }
  fence(rx0, z1, rx0, rz1)
  fence(rx0, rz1, rx1, rz1)
  fence(rx1, rz1, rx1, run.gate + 0.5)
  fence(rx1, run.gate - 0.5, rx1, z1)
  s.push({ box: [0.06, 0.8, 1.0], at: [rx1 + 0.02, 0.45, run.gate], rot: [0, 0.35, 0], color: '#a07850' })
  // Trough and water dish; grain scattered when fed today
  s.push({ box: [1.1, 0.14, 0.24], at: [run.feeder.x, 0.07, run.feeder.z], color: '#8a6440' }, { box: [1.0, 0.03, 0.16], at: [run.feeder.x, 0.135, run.feeder.z], color: fed ? '#e9c76a' : '#6a4a30' })
  s.push({ cyl: [0.2, 0.2, 0.08, 12], at: [run.water.x, 0.04, run.water.z], color: '#d4473b' }, { cyl: [0.17, 0.17, 0.02, 12], at: [run.water.x, 0.08, run.water.z], color: '#9fd8f0' })
  if (fed) {
    for (let i = 0; i < 40; i++) {
      const a = Math.sin(i * 78.233) * 43758.5453
      const r = a - Math.floor(a)
      s.push({ box: [0.03, 0.012, 0.02], at: [run.feeder.x - 0.9 + r * 1.8, 0.03, run.feeder.z - 0.5 + ((i * 0.618) % 1) * 1.1], rot: [0, r * 3, 0], color: '#f1d27a' })
    }
  }
  // A sack of rice husks and a basket by the gate
  s.push({ cyl: [0.22, 0.26, 0.55, 10], at: [rx1 + 0.45, 0.28, run.gate - 1.0], color: '#d9c49a' }, { cyl: [0.24, 0.22, 0.06, 10], at: [rx1 + 0.45, 0.57, run.gate - 1.0], color: '#c9b088' })
  s.push({ cyl: [0.2, 0.15, 0.22, 10], at: [rx1 + 0.4, 0.11, run.gate + 0.9], color: '#c49a6c' })
  // Poverty: a sign — "Bán gà" (hens for sale)
  if (level >= 2) {
    s.push({ box: [0.6, 0.4, 0.03], at: [rx1 + 0.05, 1.05, z1 + 0.6], rot: [0, -Math.PI / 2, 0.06], color: '#d9b878' })
    s.push({ box: [0.45, 0.06, 0.035], at: [rx1 + 0.03, 1.1, z1 + 0.6], rot: [0, -Math.PI / 2, 0.06], color: '#c8322b' })
  }
  return s
}

/** Three raised beds: rau muống, cải, hành — wet and green when watered, dry and weedy as things get worse. */
function bedShapes(level: number, wet: boolean, ripe: boolean): ShapeItem[] {
  const s: ShapeItem[] = []
  const soil = wet ? '#5a4030' : level >= 2 ? '#b09070' : '#8a6a4a'
  const leaf = level >= 2 ? ['#a8b060', '#9a9050'] : ['#7cc263', '#5f9c4a']
  beds.forEach((b, bi) => {
    const len = b.z1 - b.z0
    const cz = (b.z0 + b.z1) / 2
    s.push({ box: [b.w + 0.12, 0.28, len + 0.12], at: [b.x, 0.14, cz], color: '#9a7a5a' })
    s.push({ box: [b.w, 0.05, len], at: [b.x, 0.29, cz], color: soil })
    // 1.42 Quaternius crops (CC0): rau muống (leafy rice-like clumps), cải (lettuce heads), cà chua (tomato plants)
    const n = level >= 3 ? 3 : level >= 2 ? 5 : 7
    const stage = ripe ? 4 : 3
    const names = [`fRice${stage}`, `fLettuce${stage}`, `fTomato${stage}`]
    const heights = [ripe ? 0.55 : 0.4, ripe ? 0.3 : 0.22, ripe ? 0.9 : 0.65]
    const paint = { Green: leaf[0], DarkGreen: leaf[1], LightGreen: level >= 2 ? '#c8b870' : '#a8d86b', Red: '#e8473a' }
    for (let i = 0; i < n; i++) {
      const z = b.z0 + 0.35 + (i * (len - 0.7)) / Math.max(1, n - 1)
      for (const dx of bi === 2 ? [0] : [-0.24, 0.24]) {
        const m = modelShapes(names[bi], { height: heights[bi] * (0.85 + ((i * 7 + bi) % 3) * 0.1), maxWidth: bi === 2 ? 0.7 : 0.48, paint })
        if (m) s.push(place(m, [b.x + dx, 0.31, z], i * 2.1 + dx))
      }
    }
    if (level >= 2) for (let i = 0; i < 6; i++) s.push({ cyl: [0.01, 0.02, 0.4, 3], at: [b.x - 0.4 + (i % 3) * 0.4, 0.45, b.z0 + 0.2 + i * (len / 6)], rot: [0.2, i, 0.1], color: '#9aa05a' })
  })
  // Water jars (chum) with a coconut-shell ladle, a watering can, a garden hoe
  const { jars } = YARD
  for (const [i, [x, z]] of jars.entries()) {
    s.push({ sphere: [0.42, 14, 10], at: [x, 0.45, z], scale: [1, 1.15, 1], color: i ? '#8a5a3a' : '#7a4e32' })
    s.push({ cyl: [0.3, 0.34, 0.08, 14], at: [x, 0.92, z], color: '#6a4228' })
    s.push({ cyl: [0.29, 0.29, 0.02, 14], at: [x, 0.9, z], color: '#7fb2c4' })
  }
  s.push({ sphere: [0.09, 8, 6, Math.PI / 2], at: [jars[0][0] + 0.12, 0.97, jars[0][1]], rot: [Math.PI, 0, 0], color: '#8a6440' }, { cyl: [0.012, 0.012, 0.45, 4], at: [jars[0][0] + 0.32, 1.05, jars[0][1]], rot: [0, 0, 1.2], color: '#c49a6c' })
  s.push({ cyl: [0.12, 0.14, 0.26, 10], at: [jars[1][0] - 0.75, 0.13, jars[1][1]], color: '#3fae72' }, { cyl: [0.02, 0.025, 0.32, 5], at: [jars[1][0] - 0.92, 0.25, jars[1][1]], rot: [0, 0, 0.9], color: '#3fae72' })
  return s
}

/** Banana plants, a guava tree, the washing line, a bike, stools — the yard's life. */
function lifeShapes(level: number): ShapeItem[] {
  const s: ShapeItem[] = []
  for (const [x, z, k] of YARD.bananas) {
    s.push({ cyl: [0.09, 0.14, 2.0, 8], at: [x, 1.0, z], color: '#8fae5a' })
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + k
      s.push({ box: [0.34, 0.03, 1.25], at: [x + Math.sin(a) * 0.55, 2.05 + (i % 2) * 0.18, z + Math.cos(a) * 0.55], rot: [-0.55, a, 0], color: i % 2 ? '#7cc263' : '#6aaf55' })
    }
    s.push({ sphere: [0.14, 8, 6], at: [x + 0.18, 1.7, z + 0.1], scale: [1, 1.4, 1], color: '#8a3a4a' })
  }
  const tree = modelShapes('fOrange4', { height: 2.7, paint: { Green_Tree: level >= 2 ? '#8aa85a' : '#6db85c', Orange: '#f39a2b', Wood: '#7c5b45' } }) ?? libraryTree('green', 77)
  if (tree) s.push(place(tree, [YARD.tree.x, 0, YARD.tree.z], 0.7))
  for (let i = 0; i < 6; i++) {
    const b = modelShapes('fBamboo3', { height: 2.6 + (i % 3) * 0.5, paint: { Green: '#7fb85a', DarkGreen2: '#5a8a42' } })
    if (b) s.push(place(b, [-W / 2 + 0.5 + (i % 3) * 0.3, 0, FZ - 0.5 - Math.floor(i / 3) * 0.3], i))
  }
  // Washing line between two poles
  const { x0, x1, z } = YARD.line
  for (const x of [x0, x1]) s.push({ cyl: [0.03, 0.04, 2.1, 6], at: [x, 1.05, z], color: '#8a8f98' })
  s.push({ box: [x1 - x0, 0.012, 0.012], at: [(x0 + x1) / 2, 1.95, z], color: '#4a4a4a' })
  const cloth = level >= 1 ? ['#9a8f7c', '#7f8da3', '#b39a72', '#8f8a80'] : ['#ff9fb2', '#7fb8e8', '#ffe08a', '#a8e6cf', '#ffffff']
  cloth.forEach((c, i) => {
    const x = x0 + 0.45 + i * ((x1 - x0 - 0.9) / Math.max(1, cloth.length - 1))
    s.push({ box: [0.42, 0.55 - (i % 2) * 0.15, 0.02], at: [x, 1.66 + (i % 2) * 0.07, z], rot: [0, 0, (i % 2 ? 1 : -1) * 0.04], color: c })
    if (level >= 1) s.push({ box: [0.12, 0.12, 0.025], at: [x + 0.08, 1.6, z], color: '#c2a98a' })
  })
  // A bicycle leaning on the east wall, plastic stools, a basin, a straw broom
  s.push({ torus: [0.3, 0.03, 6, 14], at: [-W / 2 + 0.25, 0.32, 2.6], rot: [0, Math.PI / 2, 0], color: '#2f2f38' }, { torus: [0.3, 0.03, 6, 14], at: [-W / 2 + 0.25, 0.32, 3.65], rot: [0, Math.PI / 2, 0], color: '#2f2f38' })
  s.push({ box: [0.04, 0.04, 1.0], at: [-W / 2 + 0.25, 0.62, 3.12], rot: [0.15, 0, 0], color: '#c8322b' }, { box: [0.18, 0.05, 0.28], at: [-W / 2 + 0.25, 0.86, 2.9], color: '#3a3a3a' })
  for (const [i, c] of ['#d4473b', '#3f8fd4'].entries()) s.push({ cyl: [0.16, 0.19, 0.3, 10], at: [1.6 + i * 0.5, 0.15, 3.9 - i * 0.2], color: c })
  s.push({ cyl: [0.38, 0.3, 0.14, 14], at: [-1.6, 0.07, YARD.line.z + 0.8], color: '#3f8fd4' })
  // the dog's woven basket by the door (the dog itself is an Animal)
  s.push({ cyl: [0.42, 0.36, 0.14, 16], at: [DOG.x, 0.07, DOG.z], color: '#c49a6c' }, { cyl: [0.36, 0.36, 0.03, 16], at: [DOG.x, 0.13, DOG.z], color: '#d9534f' })
  // Level 3: a broken pot, a pile of junk to sell
  if (level >= 3) {
    s.push({ cyl: [0.2, 0.15, 0.2, 8], at: [2.4, 0.08, YARD.house + 1.2], rot: [0.9, 0, 0.3], color: '#c97b63' })
    for (let i = 0; i < 5; i++) s.push({ box: [0.4, 0.06, 0.3], at: [-1.9, 0.05 + i * 0.07, YARD.house + 1.0], rot: [0, i * 0.3, 0], color: i % 2 ? '#b98a5a' : '#d9cdb5' })
  }
  return s
}

const DOOR: SpotAction[] = [{ id: 'enter', labelKey: 'action.toHouse', icon: 'door', action: 'yard.toHouse', primary: true }]
const COOP: SpotAction[] = [
  { id: 'eggs', labelKey: 'action.takeEggs', icon: 'egg', action: 'yard.eggs', primary: true, if: { test: 'yard.eggsReady' } },
  { id: 'feed', labelKey: 'action.feedHens', icon: 'chicken', action: 'yard.feed', primary: true, if: { not: { test: 'yard.eggsReady' } } },
  { id: 'feed2', labelKey: 'action.feedHens', icon: 'chicken', action: 'yard.feed', if: { test: 'yard.eggsReady' } },
]
const BEDS: SpotAction[] = [
  { id: 'harvest', labelKey: 'action.harvestGreens', icon: 'garden', action: 'yard.harvest', primary: true, if: { test: 'yard.canHarvest' } },
  { id: 'water', labelKey: 'action.waterBeds', icon: 'water', action: 'yard.water', primary: true, if: { not: { test: 'yard.canHarvest' } } },
  { id: 'water2', labelKey: 'action.waterBeds', icon: 'water', action: 'yard.water', if: { test: 'yard.canHarvest' } },
]

/** Where the cat sleeps (on the coop roof) and the dog lies (by the back door). */
const CAT = { x: (coop.x0 + coop.x1) / 2 + 0.5, y: 2.06, z: (coop.z0 + coop.z1) / 2 + 0.1 }
const DOG = { x: -1.7, z: HZ + 1.3 }

const HomeYard = memo(function HomeYard() {
  // the dog lies with its head down, and looks up now and then
  const [dogAction, setDogAction] = useState<'idle' | 'idle2'>('idle2')
  useEffect(() => {
    const t = window.setInterval(() => setDogAction((a) => (a === 'idle2' ? 'idle' : 'idle2')), 7000)
    return () => window.clearInterval(t)
  }, [])
  const level = useFlags(() => houseLevel())
  const day = useTime((s) => s.day)
  const fed = useFlags((s) => s.flags['yard.fedDay'] === day)
  const eggs = useFlags((s) => s.flags['yard.fedDay'] === day - 1 && s.flags['yard.eggDay'] !== day)
  const wet = useFlags((s) => s.flags['yard.waterDay'] === day)
  const ripe = useFlags((s) => (Number(s.flags['yard.waterCount']) || 0) >= 3)
  const ground = useMemo(groundShapes, [])
  const walls = useMemo(wallShapes, [])
  const coopS = useMemo(() => coopShapes(level, eggs, fed), [level, eggs, fed])
  const bedS = useMemo(() => bedShapes(level, wet, ripe), [level, wet, ripe])
  const life = useMemo(() => lifeShapes(level), [level])
  const flock = useMemo<Flock>(() => ({ hens: yardHens(level), rooster: level < 2, chicks: level === 0 ? 4 : 0 }), [level])
  const { x0: rx0, x1: rx1, z1: rz1 } = run
  return (
    <>
      <Shapes shapes={ground} material={groundMaterial} castShadow={false} />
      <Shapes shapes={walls.s} />
      <Shapes shapes={walls.glow} material={glowMaterial} castShadow={false} />
      <Shapes shapes={coopS} />
      <Shapes shapes={bedS} />
      <Shapes shapes={life} />
      <Chickens flock={flock} />
      {/* 1.42 library animals: the ginger cat asleep on the coop roof, the yellow dog in its basket */}
      <Animal kind="cat" action="sleep" position={[CAT.x, CAT.y, CAT.z]} rotationY={-0.9} />
      <Animal kind="dog" action={dogAction} position={[DOG.x, 0.12, DOG.z]} rotationY={0.5} />
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[W / 2 + 1, 3, 1]} position={[0, 3, HZ - 1]} collisionGroups={BUILDING_GROUPS} />
        {[-1, 1].map((side) => (
          <CuboidCollider key={side} args={[0.2, 1.2, (FZ - HZ) / 2 + 0.3]} position={[side * (W / 2 + 0.12), 1.2, (HZ + FZ) / 2]} collisionGroups={PROP_GROUPS} />
        ))}
        <CuboidCollider args={[W / 2, 1, 0.2]} position={[0, 1, FZ]} collisionGroups={PROP_GROUPS} />
        {/* the run and the coop */}
        <CuboidCollider args={[(rx1 - rx0) / 2, 0.5, (rz1 - coop.z0) / 2]} position={[(rx0 + rx1) / 2, 0.5, (coop.z0 + rz1) / 2]} collisionGroups={PROP_GROUPS} />
        {beds.map((b) => (
          <CuboidCollider key={b.x} args={[b.w / 2 + 0.06, 0.3, (b.z1 - b.z0) / 2 + 0.06]} position={[b.x, 0.3, (b.z0 + b.z1) / 2]} collisionGroups={PROP_GROUPS} />
        ))}
        {YARD.jars.map(([x, z]) => (
          <CylinderCollider key={x} args={[0.5, 0.45]} position={[x, 0.5, z]} collisionGroups={PROP_GROUPS} />
        ))}
        {YARD.bananas.map(([x, z]) => (
          <CylinderCollider key={x} args={[1, 0.2]} position={[x, 1, z]} collisionGroups={PROP_GROUPS} />
        ))}
        <CylinderCollider args={[1, 0.25]} position={[YARD.tree.x, 1, YARD.tree.z]} collisionGroups={PROP_GROUPS} />
        <CylinderCollider args={[0.3, 0.45]} position={[DOG.x, 0.3, DOG.z]} collisionGroups={PROP_GROUPS} />
        <CuboidCollider args={[0.55, 1.5, 0.4]} position={[-W / 2 + 0.8, 1.5, FZ - 0.65]} collisionGroups={PROP_GROUPS} />
      </RigidBody>
      <ActionSpot id="yard-door" nameKey="interact.yardDoor" zone={{ x: 0, z: HZ + 1.15, halfX: 0.9, halfZ: 0.6 }} actions={DOOR} />
      <ActionSpot id="yard-coop" nameKey="interact.coop" zone={{ x: rx1 + 0.7, z: run.gate, halfX: 0.7, halfZ: 1.1 }} actions={COOP} />
      <ActionSpot id="yard-beds" nameKey="interact.beds" zone={{ x: (beds[0].x + beds[2].x) / 2, z: beds[0].z1 + 0.75, halfX: 2.0, halfZ: 0.6 }} actions={BEDS} />
    </>
  )
})

export default HomeYard
