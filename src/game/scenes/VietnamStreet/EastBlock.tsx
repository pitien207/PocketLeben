import { memo, useMemo } from 'react'
import { Animal } from '../../components/animals/Animal'
import { MeshBasicMaterial } from 'three'
import { CuboidCollider, CylinderCollider, RigidBody } from '@react-three/rapier'
import type { Vec3 } from '../../../data/config'
import { NPCS } from '../../../data/npcs'
import { ActionSpot, type SpotAction } from '../../components/ActionSpot'
import { NPC } from '../../components/npc/NPC'
import { BUILDING_GROUPS, PROP_GROUPS } from '../../systems/collisionGroups'
import { groundMaterial } from '../shared/materials'
import { PALETTE as P } from '../shared/palette'
import { fluffyTreeShapes, place, softPlantShapes, stoolShapes } from '../shared/props'
import { Shapes, type ShapeItem } from '../shared/Shapes'
import { SignBoard } from '../shared/SignBoard'
import type { SignOptions } from '../shared/textures'
import { bicycleShapes, motorbikeShapes } from '../shared/vehicles'
import { BUILDING_CENTER_Z, BUILDING_DEPTH, BUILDING_FRONT_Z, EAST, SOUTH } from './layout'
import { TubeHouse, type HousePalette } from './TubeHouse'
import { fitTree, useBlockerVersion } from '../shared/treeFit'

/**
 * East of the side road (map extension 1.7): the village communal house (đình) with its
 * courtyard, a narrow alley (ngõ) hiding a cat and an old well, a sugarcane-juice shop, an
 * old bookshop, and a night market along the lake.
 */

const F = BUILDING_FRONT_Z
const RED = '#c8322b'
const GOLD = '#f4c04e'
const TILE = '#9a5a46'
const D = EAST.dinh

const DINH_SIGN: SignOptions = { title: 'ĐÌNH HÀNG GAI', subtitle: 'Di tích lịch sử · Xin giữ trật tự', background: RED, border: GOLD, color: '#ffe08a', accent: '#ffffff', aspect: 5.2 }
const SIGNS: SignOptions[] = [
  { title: 'NƯỚC MÍA · CHÈ', subtitle: 'Mía ép siêu sạch · Chè thập cẩm', background: '#3fae72', border: '#ffe08a', color: '#ffffff', accent: '#ffe08a', aspect: 6.2 },
  { title: 'SÁCH CŨ', subtitle: 'Mua · Bán · Đổi', background: '#5b4636', border: GOLD, color: '#ffe6a6', accent: '#ffffff', aspect: 4.2 },
]
const PALETTES: HousePalette[] = [
  { wall: '#ffc8b4', trim: '#fff3d6', shutter: '#3f7d5c', railing: '#2c5c43', accent: RED },
  { wall: '#dfe8f2', trim: '#ffffff', shutter: '#8a5a3a', railing: '#5b3a2a', accent: '#d4473b' },
]

/** Flat ground pieces (never fade, no shadows cast). */
function groundShapes(): ShapeItem[] {
  return [
    // Courtyard flagstones and the worn alley floor
    { box: [D.x1 - D.x0, 0.02, D.hallZ - F + 0.2], at: [(D.x0 + D.x1) / 2, 0.012, (F + D.hallZ) / 2], color: '#f1e6cf' },
    ...[0, 1, 2, 3].map((i): ShapeItem => ({ box: [2.6, 0.022, 0.06], at: [20, 0.014, F - 1.1 - i * 1.15], color: '#cbbd9f' })),
    { box: [EAST.alley.x1 - EAST.alley.x0, 0.02, 8.6], at: [(EAST.alley.x0 + EAST.alley.x1) / 2, 0.012, F - 4.3], color: '#cfc3ad' },
  ]
}

function dinhShapes(): ShapeItem[] {
  const s: ShapeItem[] = []
  const cx = (D.x0 + D.x1) / 2
  // Tam quan gate: four pillars, a beam with the name board, a little tiled roof
  for (const x of [D.x0 + 0.4, cx - 1.4, cx + 1.4, D.x1 - 0.4]) {
    s.push({ box: [0.5, 0.35, 0.5], at: [x, 0.17, F], color: '#e8dcc0' })
    s.push({ box: [0.4, 2.9, 0.4], at: [x, 1.8, F], color: RED })
    s.push({ box: [0.5, 0.18, 0.5], at: [x, 3.3, F], color: GOLD })
  }
  s.push({ box: [D.x1 - D.x0, 0.4, 0.5], at: [cx, 3.55, F], color: RED })
  s.push({ box: [3.2, 0.5, 1.4], at: [cx, 4.0, F], rot: [0, 0, 0], color: TILE })
  s.push({ box: [3.4, 0.12, 1.6], at: [cx, 3.78, F], color: '#7a4434' })
  for (const side of [-1, 1]) s.push({ cyl: [0, 0.12, 0.45, 6], at: [cx + side * 1.65, 4.25, F], rot: [0, 0, -side * 0.6], color: TILE })
  // Courtyard walls (the east one is also the alley's wall)
  s.push({ box: [0.3, 2.2, F - D.hallZ], at: [D.x0 + 0.15, 1.1, (F + D.hallZ) / 2], color: '#f2e2b8' })
  s.push({ box: [0.3, 2.6, F + 13], at: [D.x1 - 0.15, 1.3, (F - 13) / 2], color: '#efe0bd' })
  s.push({ box: [0.34, 0.12, F - D.hallZ], at: [D.x0 + 0.15, 2.25, (F + D.hallZ) / 2], color: TILE })
  // Moss on the alley side
  for (let i = 0; i < 6; i++) s.push({ sphere: [0.25, 6, 4], at: [D.x1 + 0.02, 0.15 + (i % 2) * 0.4, F - 1 - i * 1.3], scale: [0.3, 0.8, 1.4], color: '#8fae6a' })
  // Incense urn (lư hương) and two stone lanterns
  const { x: ux, z: uz } = D.urn
  s.push({ cyl: [0.5, 0.6, 0.35, 12], at: [ux, 0.17, uz], color: '#cfc8bb' })
  s.push({ cyl: [0.45, 0.32, 0.5, 14], at: [ux, 0.6, uz], color: '#b8863a' })
  s.push({ torus: [0.44, 0.05, 6, 16], at: [ux, 0.86, uz], rot: [Math.PI / 2, 0, 0], color: '#d9a43a' })
  for (let i = 0; i < 7; i++) s.push({ cyl: [0.008, 0.008, 0.4, 3], at: [ux - 0.15 + (i % 4) * 0.1, 1.05, uz - 0.08 + Math.floor(i / 4) * 0.16], rot: [(i % 3) * 0.08, 0, (i % 2 ? 1 : -1) * 0.07], color: RED })
  for (const x of [D.x0 + 1.3, D.x1 - 1.3]) {
    s.push({ box: [0.4, 0.9, 0.4], at: [x, 0.45, F - 1.4], color: '#cfc8bb' })
    s.push({ box: [0.55, 0.4, 0.55], at: [x, 1.1, F - 1.4], color: '#e8e0cf' })
    s.push({ box: [0.25, 0.22, 0.56], at: [x, 1.1, F - 1.4], color: '#ffe08a' })
    s.push({ cyl: [0, 0.4, 0.3, 4], at: [x, 1.45, F - 1.4], rot: [0, Math.PI / 4, 0], color: '#bdb5a5' })
  }
  // Frangipani (hoa sứ) in the courtyard corner
  s.push(fitTree(fluffyTreeShapes('blossom', 2, 70), [D.x0 + 1.0, 0, D.hallZ + 1.0], 0.6, 0.8))
  // The keeper's old Peugeot leaning on the east wall (secret "xeDapCo")
  s.push(place(bicycleShapes('#2f6b8f'), [D.x1 - 0.55, 0, D.hallZ + 0.95], Math.PI / 2 + 0.15))
  // Hall: raised floor, red pillars, ochre walls with lacquered doors, a big tiled roof
  const hz = D.hallZ
  const hallD = 13 + hz // hz is negative: depth from hallZ to the back wall (z = -13)
  s.push({ box: [D.x1 - D.x0 - 0.3, 0.4, hallD], at: [cx, 0.2, (hz - 13) / 2], color: '#d9cdb5' })
  for (let i = 0; i < 3; i++) s.push({ box: [2.4, 0.12, 0.3], at: [cx, 0.06 + i * 0.12, hz + 0.45 - i * 0.28], color: '#cfc3ad' })
  for (let i = 0; i < 5; i++) s.push({ cyl: [0.16, 0.18, 2.7, 10], at: [D.x0 + 0.9 + i * ((D.x1 - D.x0 - 1.8) / 4), 1.75, hz - 0.35], color: RED })
  s.push({ box: [D.x1 - D.x0 - 0.6, 2.7, 0.2], at: [cx, 1.75, hz - 1.4], color: '#f2c46d' })
  for (const dx of [-2.2, 0, 2.2]) {
    s.push({ box: [1.3, 2.0, 0.08], at: [cx + dx, 1.4, hz - 1.28], color: '#7a2a22' })
    s.push({ box: [1.3, 0.08, 0.1], at: [cx + dx, 2.42, hz - 1.26], color: GOLD })
  }
  // Altar glimpse through the middle door
  s.push({ box: [0.9, 0.5, 0.3], at: [cx, 1.0, hz - 1.18], color: '#c8322b' })
  s.push({ cyl: [0.08, 0.06, 0.12, 8], at: [cx, 1.3, hz - 1.15], color: '#d9a43a' })
  // Roof: two big slopes, a ridge with "dragon" curls at the ends
  s.push({ box: [D.x1 - D.x0 + 0.6, 0.22, 2.3], at: [cx, 3.55, hz - 0.65], rot: [0.42, 0, 0], color: TILE })
  s.push({ box: [D.x1 - D.x0 + 0.6, 0.22, 2.3], at: [cx, 3.55, hz - 2.75], rot: [-0.42, 0, 0], color: TILE })
  s.push({ box: [D.x1 - D.x0 + 0.4, 0.28, 0.3], at: [cx, 4.05, hz - 1.7], color: '#7a4434' })
  for (const side of [-1, 1]) {
    s.push({ torus: [0.28, 0.07, 6, 12, Math.PI * 1.3], at: [cx + side * (D.x1 - D.x0) * 0.5, 4.3, hz - 1.7], rot: [0, Math.PI / 2, side > 0 ? 0.5 : 2.6], color: '#3f7d5c' })
  }
  s.push({ sphere: [0.2, 10, 8], at: [cx, 4.35, hz - 1.7], color: GOLD })
  return s
}

/** The narrow alley: laundry, plants, a crate with the cat, the well at the end. */
function alleyShapes(): ShapeItem[] {
  const s: ShapeItem[] = []
  const { x0, x1, cat, well } = EAST.alley
  const mid = (x0 + x1) / 2
  // Washing line
  s.push({ box: [x1 - x0, 0.015, 0.015], at: [mid, 2.5, F - 3.2], color: P.wire })
  ;['#ff9fb2', '#a9d6ff', '#ffffff', '#ffe08a'].forEach((c, i) => s.push({ box: [0.32, 0.42, 0.03], at: [x0 + 0.3 + i * 0.4, 2.28, F - 3.2], rot: [0, 0, (i % 2 ? 1 : -1) * 0.06], color: c }))
  s.push(place(softPlantShapes(P.leafDark, '#c97b63'), [x1 - 0.3, 0, F - 1.6], 0, 0.8))
  s.push(place(softPlantShapes(P.leaf, '#d9b878'), [x0 + 0.3, 0, F - 6.6], 0, 0.7))
  // Little altar on the wall
  s.push({ box: [0.4, 0.3, 0.25], at: [x0 + 0.05, 1.5, F - 5.2], color: RED })
  s.push({ box: [0.5, 0.05, 0.3], at: [x0 + 0.05, 1.33, F - 5.2], color: GOLD })
  // Crate with a sleeping ginger cat (1.42: the library cat, an Animal in the JSX below)
  s.push({ box: [0.55, 0.45, 0.5], at: [cat.x - 0.2, 0.22, cat.z], color: '#c4a074' })
  s.push({ box: [0.57, 0.04, 0.52], at: [cat.x - 0.2, 0.32, cat.z], color: '#a07a50' })
  // Old stone well with a little wooden roof
  s.push({ cyl: [0.42, 0.45, 0.6, 14], at: [well.x, 0.3, well.z], color: '#bdb5a5' })
  s.push({ cyl: [0.32, 0.32, 0.02, 14], at: [well.x, 0.58, well.z], color: '#3f5f66' })
  for (const dx of [-0.42, 0.42]) s.push({ box: [0.07, 1.4, 0.07], at: [well.x + dx, 0.95, well.z], color: P.woodDark })
  s.push({ box: [1.1, 0.06, 0.7], at: [well.x, 1.68, well.z], rot: [0, 0, 0], color: TILE })
  s.push({ cyl: [0.04, 0.04, 0.84, 6], at: [well.x, 1.4, well.z], rot: [0, 0, Math.PI / 2], color: P.wood })
  // Moss and fern by the well
  s.push({ ico: [0.3, 0], at: [well.x + 0.6, 0.15, well.z + 0.3], scale: [1, 0.5, 1], color: '#7cb35d' })
  return s
}

function shopShapes(): ShapeItem[] {
  const s: ShapeItem[] = []
  const [mia, books] = EAST.houses
  // Sugarcane press (a green machine) with a bundle of canes, low stools
  s.push({ box: [0.7, 0.9, 0.5], at: [mia.x - 1.1, 0.45, F + 0.6], color: '#3fae72' })
  s.push({ box: [0.5, 0.25, 0.4], at: [mia.x - 1.1, 1.02, F + 0.6], color: '#c9ccd2' })
  for (let i = 0; i < 6; i++) s.push({ cyl: [0.03, 0.03, 1.6, 5], at: [mia.x - 1.75 + (i % 3) * 0.06, 0.8, F + 0.35 + Math.floor(i / 3) * 0.07], rot: [0, 0, 0.12 + i * 0.01], color: i % 2 ? '#8fae6a' : '#a6c27a' })
  for (let i = 0; i < 3; i++) s.push(place(stoolShapes([P.coral, P.sky2, P.butter][i]), [mia.x + 0.2 + i * 0.6, 0, F + 2.0], i))
  s.push({ box: [0.9, 0.36, 0.6], at: [mia.x + 0.8, 0.18, F + 2.5], color: '#a9d6ff' })
  s.push(place(motorbikeShapes(P.lilac), [mia.x + 1.6, 0, F + 1.0], Math.PI + 0.2))
  // Bookshop: a cart of second-hand books and a stack on the floor
  s.push({ box: [1.5, 0.08, 0.6], at: [books.x - 0.2, 0.8, F + 0.65], color: P.woodDark })
  for (const dx of [-0.65, 0.45]) s.push({ box: [0.06, 0.8, 0.55], at: [books.x - 0.2 + dx, 0.4, F + 0.65], color: P.woodDark })
  const BOOKS = ['#c8322b', '#2c5aa0', '#3f7d5c', '#f4c04e', '#7a4a8a', '#e8dcc0', '#d4473b']
  for (let i = 0; i < 9; i++) s.push({ box: [0.12, 0.22 + (i % 3) * 0.04, 0.18], at: [books.x - 0.85 + i * 0.15, 0.95 + (i % 3) * 0.02, F + 0.6], rot: [0, 0, (i % 4 === 3 ? 0.3 : 0)], color: BOOKS[i % BOOKS.length] })
  for (let i = 0; i < 5; i++) s.push({ box: [0.32, 0.07, 0.24], at: [books.x + 1.0, 0.04 + i * 0.075, F + 0.9], rot: [0, i * 0.15, 0], color: BOOKS[(i + 2) % BOOKS.length] })
  return s
}

/** Night market: four stalls with striped awnings and lantern strings along the lake. */
function marketShapes(): { s: ShapeItem[]; glow: ShapeItem[] } {
  const s: ShapeItem[] = []
  /** Lanterns: unlit material, so they glow in the dark. */
  const glow: ShapeItem[] = []
  const { z, stalls } = EAST.market
  const awnings = [RED, '#3f7d5c', '#2c5aa0', '#d4473b']
  const goods = [
    ['#ffe08a', '#ff9fb2', '#a8e6cf'],
    ['#e8a25a', '#f6e7c8', '#c97b4a'],
    ['#ff9b8f', '#f4c04e', '#c8322b'],
    ['#cdb8f0', '#a9d6ff', '#ffffff'],
  ]
  stalls.forEach((x, i) => {
    s.push({ box: [2.2, 0.08, 0.9], at: [x, 0.8, z], color: P.woodDark })
    s.push({ box: [2.1, 0.76, 0.06], at: [x, 0.4, z - 0.42], color: '#c4a074' })
    for (const dx of [-1.05, 1.05]) for (const dz of [-0.45, 0.45]) s.push({ cyl: [0.035, 0.035, 2.3, 5], at: [x + dx, 1.15, z + dz], color: P.darkSteel })
    // Striped awning sloping toward the street
    for (let k = 0; k < 6; k++) s.push({ box: [0.38, 0.05, 1.3], at: [x - 0.95 + k * 0.38, 2.3, z - 0.05], rot: [-0.25, 0, 0], color: k % 2 ? '#fff6e3' : awnings[i] })
    for (let k = 0; k < 6; k++) s.push({ box: [0.3, 0.14 + (k % 2) * 0.06, 0.26], at: [x - 0.8 + k * 0.32, 0.92, z + 0.1 + (k % 2) * 0.12], color: goods[i][k % 3] })
  })
  // Lantern strings between poles
  const x0 = stalls[0] - 1.6
  const x1 = stalls[stalls.length - 1] + 1.6
  for (const lz of [z - 1.2, z + 1.25]) {
    s.push({ box: [x1 - x0, 0.012, 0.012], at: [(x0 + x1) / 2, 2.7, lz], color: P.wire })
    for (let x = x0 + 0.4; x < x1; x += 0.75) {
      const c = Math.round(x * 4) % 3 === 0 ? '#ffd45e' : '#ff5a44'
      glow.push({ sphere: [0.12, 8, 6], at: [x, 2.5, lz], scale: [1, 1.2, 1], color: c })
      s.push({ cyl: [0.05, 0.05, 0.04, 6], at: [x, 2.65, lz], color: '#7a4434' })
    }
  }
  for (const px of [x0, x1]) s.push({ cyl: [0.05, 0.06, 2.8, 6], at: [px, 1.4, z], color: P.darkSteel })
  // A plastic-stool corner for eating chè
  for (let i = 0; i < 4; i++) s.push(place(stoolShapes([P.coral, P.mint, P.sky2, P.butter][i]), [stalls[1] + 1.2 + (i % 2) * 0.6, 0, z - 1.9 + Math.floor(i / 2) * 0.6], i))
  s.push(fitTree(fluffyTreeShapes('green', 2, 71), [33.0, 0, 10.4 + SOUTH], 0.5, 1.0))
  return { s, glow }
}

const lanternMaterial = new MeshBasicMaterial({ vertexColors: true })

const at = (x: number, y: number, z: number): Vec3 => [x, y, z]
const FORTUNE: SpotAction[] = [{ id: 'fortune', labelKey: 'action.fortune', icon: 'incense', action: 'place.fortune', primary: true }]
const MIA: SpotAction[] = [{ id: 'shop', labelKey: 'action.shop', icon: 'shop', action: 'de.openShop', arg: 'giaKhat', primary: true }]
const MARKET: SpotAction[] = [{ id: 'shop', labelKey: 'action.shop', icon: 'shop', action: 'de.openShop', arg: 'choDem', primary: true }]

export const EastBlock = memo(function EastBlock() {
  const ground = useMemo(groundShapes, [])
  const fit = useBlockerVersion()
  const dinh = useMemo(dinhShapes, [fit])
  const alley = useMemo(alleyShapes, [])
  const shops = useMemo(shopShapes, [])
  const market = useMemo(marketShapes, [fit])
  const [mia, books] = EAST.houses
  const cx = (D.x0 + D.x1) / 2
  const { cat, well } = EAST.alley
  return (
    <>
      <Shapes shapes={ground} material={groundMaterial} castShadow={false} />
      <Animal kind="cat" action="sleep" position={[cat.x - 0.2, 0.34, cat.z]} rotationY={Math.PI / 2} />
      {EAST.houses.map((h, i) => (
        <TubeHouse
          key={h.x}
          position={[h.x, 0, BUILDING_CENTER_Z]}
          width={h.width}
          depth={BUILDING_DEPTH}
          floors={h.floors}
          palette={PALETTES[i]}
          oldQuarter
          flag={i === 0}
          airCon={i === 0}
          bougainvillea={i === 1}
          sign={SIGNS[i]}
        />
      ))}
      <Shapes shapes={dinh} />
      <Shapes shapes={alley} />
      <Shapes shapes={shops} />
      <Shapes shapes={market.s} />
      <Shapes shapes={market.glow} material={lanternMaterial} castShadow={false} receiveShadow={false} />
      <SignBoard options={DINH_SIGN} width={2.6} position={[cx, 3.55, F + 0.3]} />
      {/* Walls and the hall block the camera; small props only the player */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[0.15, 1.2, (F - D.hallZ) / 2]} position={[D.x0 + 0.15, 1.2, (F + D.hallZ) / 2]} collisionGroups={BUILDING_GROUPS} />
        <CuboidCollider args={[0.15, 1.4, (F + 13) / 2]} position={[D.x1 - 0.15, 1.4, (F - 13) / 2]} collisionGroups={BUILDING_GROUPS} />
        <CuboidCollider args={[(D.x1 - D.x0) / 2, 2, (13 + D.hallZ) / 2]} position={[cx, 2, (D.hallZ - 13) / 2 - 0.2]} collisionGroups={BUILDING_GROUPS} />
        {[D.x0 + 0.4, cx - 1.4, cx + 1.4, D.x1 - 0.4].map((x) => (
          <CuboidCollider key={x} args={[0.25, 1.6, 0.25]} position={[x, 1.6, F]} collisionGroups={PROP_GROUPS} />
        ))}
        <CylinderCollider args={[0.5, 0.6]} position={[D.urn.x, 0.5, D.urn.z]} collisionGroups={PROP_GROUPS} />
        {[D.x0 + 1.3, D.x1 - 1.3].map((x) => (
          <CuboidCollider key={x} args={[0.25, 0.7, 0.25]} position={[x, 0.7, F - 1.4]} collisionGroups={PROP_GROUPS} />
        ))}
        <CuboidCollider args={[0.28, 0.35, 0.25]} position={[cat.x - 0.2, 0.35, cat.z]} collisionGroups={PROP_GROUPS} />
        <CylinderCollider args={[0.5, 0.45]} position={[well.x, 0.5, well.z]} collisionGroups={PROP_GROUPS} />
        <CuboidCollider args={[0.35, 0.5, 0.25]} position={[mia.x - 1.1, 0.5, F + 0.6]} collisionGroups={PROP_GROUPS} />
        <CuboidCollider args={[0.8, 0.5, 0.3]} position={[books.x - 0.2, 0.5, F + 0.65]} collisionGroups={PROP_GROUPS} />
        {EAST.market.stalls.map((x) => (
          <CuboidCollider key={x} args={[1.1, 0.5, 0.45]} position={[x, 0.5, EAST.market.z]} collisionGroups={PROP_GROUPS} />
        ))}
        <CylinderCollider args={[0.8, 0.25]} position={[33.0, 0.8, 10.4 + SOUTH]} collisionGroups={PROP_GROUPS} />
      </RigidBody>

      <ActionSpot id="vn-dinh" name={{ vi: 'Đình Hàng Gai', en: 'Hàng Gai communal house', de: 'Gemeindehaus Hàng Gai' }} zone={{ x: cx, z: D.hallZ + 1.1, halfX: 1.6, halfZ: 1.0 }} actions={FORTUNE} marker={{ at: at(cx, 2.6, D.hallZ + 0.6), when: { noFlag: 'fortune.first' } }} />
      <ActionSpot id="vn-mia" name={{ vi: 'Nước mía Cô Tư', en: 'Auntie Tư’s sugarcane juice', de: 'Tante Tưs Zuckerrohrsaft' }} zone={{ x: mia.x - 0.6, z: F + 1.2, halfX: 1.6, halfZ: 1.0 }} actions={MIA} />
      <ActionSpot id="vn-market" name={{ vi: 'Chợ đêm phố cổ', en: 'Old Quarter night market', de: 'Nachtmarkt der Altstadt' }} zone={{ x: 23.5, z: EAST.market.z - 1.3, halfX: 7.5, halfZ: 0.8 }} actions={MARKET} />

      <NPC def={NPCS.ongTu} at={{ x: cx + 1.6, z: D.hallZ + 0.9 }} yaw={0} zone={{ x: cx + 1.6, z: D.hallZ + 1.6, halfX: 1.3, halfZ: 1.0 }} />
      <NPC def={NPCS.coTu} at={{ x: mia.x - 0.4, z: F + 0.7 }} yaw={0} />
      {/* 1.41 chú Hưng and the reading corner are inside the bookshop (data/shopRooms.ts oldBooks) */}
      <NPC def={NPCS.baChe} at={{ x: EAST.market.stalls[1], z: EAST.market.z + 0.75 }} yaw={Math.PI} />
      <NPC def={NPCS.anhLongDen} at={{ x: EAST.market.stalls[3], z: EAST.market.z + 0.75 }} yaw={Math.PI} />
    </>
  )
})
