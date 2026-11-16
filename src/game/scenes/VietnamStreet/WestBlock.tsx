import { memo, useMemo } from 'react'
import { CuboidCollider, CylinderCollider, RigidBody } from '@react-three/rapier'
import { NPCS } from '../../../data/npcs'
import { NPC } from '../../components/npc/NPC'
import { PROP_GROUPS } from '../../systems/collisionGroups'
import { PALETTE as P } from '../shared/palette'
import { cafeTableSetShapes, place, stoolShapes, treeShapes } from '../shared/props'
import { Shapes, type ShapeItem } from '../shared/Shapes'
import type { SignOptions } from '../shared/textures'
import { BUILDING_DEPTH, BUILDING_FRONT_Z, houseFront, WEST } from './layout'
import { TubeHouse, type HousePalette } from './TubeHouse'

/**
 * The street continues west (map extension): a phở shop with low plastic tables on the
 * sidewalk, a pharmacy with its green cross, an áo dài tailor, and an old banyan tree
 * (cây đa) with a tiny shrine at the end of the block.
 */

const PALETTES: HousePalette[] = [
  { wall: '#f0b9a0', trim: '#fff3d6', shutter: '#3f7d5c', railing: '#2c5c43', accent: '#c8322b' },
  { wall: '#cfe0c8', trim: '#ffffff', shutter: '#4f8a8b', railing: '#2f5f60', accent: '#3f7d5c' },
  { wall: '#f6e7c4', trim: '#fff3d6', shutter: '#8a5a3a', railing: '#5b3a2a', accent: '#d4473b' },
]

const SIGNS: SignOptions[] = [
  { title: 'PHỞ GIA TRUYỀN', subtitle: 'Phở bò · Phở gà · Quẩy', background: '#c8322b', border: '#f4c04e', color: '#ffe08a', accent: '#ffffff', aspect: 6.5 },
  { title: 'NHÀ THUỐC', subtitle: 'Dầu gió · Cao dán · Thuốc cảm', background: '#ffffff', border: '#2f8c7f', color: '#2f8c7f', accent: '#d4473b', aspect: 6.5 },
  { title: 'MAY ĐO ÁO DÀI', subtitle: 'Nhận may lấy ngay', background: '#7a4a8a', border: '#f4c04e', color: '#ffe08a', accent: '#ffffff', aspect: 6.5 },
]

function propShapes(): ShapeItem[] {
  const s: ShapeItem[] = []
  const [pho, pharmacy, tailor] = WEST.houses
  const f = BUILDING_FRONT_Z
  const fph = houseFront(pharmacy)
  // Phở: big simmering pot on a coal stove, a glass cabinet of noodles, low tables outside
  s.push({ cyl: [0.32, 0.36, 0.5, 12], at: [pho.x - 1.4, 0.25, f + 0.75], color: '#5d6170' })
  s.push({ cyl: [0.38, 0.34, 0.55, 14], at: [pho.x - 1.4, 0.78, f + 0.75], color: '#b8bcc8' })
  s.push({ cyl: [0.36, 0.36, 0.03, 14], at: [pho.x - 1.4, 1.07, f + 0.75], color: '#8e98ab' })
  for (let i = 0; i < 3; i++) s.push({ sphere: [0.08, 6, 4], at: [pho.x - 1.4 + (i - 1) * 0.12, 1.2 + i * 0.12, f + 0.75], scale: [1, 1.6, 1], color: '#ffffff' })
  s.push({ box: [1.0, 0.9, 0.5], at: [pho.x - 0.2, 0.45, f + 0.6], color: '#a9d6ff' })
  s.push({ box: [1.04, 0.05, 0.54], at: [pho.x - 0.2, 0.92, f + 0.6], color: '#c8322b' })
  for (let i = 0; i < 4; i++) s.push({ box: [0.2, 0.04, 0.2], at: [pho.x - 0.5 + i * 0.2, 0.6, f + 0.6], color: '#fff6e3' })
  s.push(place(cafeTableSetShapes([P.coral, P.sky2]), [pho.x - 0.6, 0, f + 2.3], 0.2))
  s.push(place(cafeTableSetShapes([P.butter, P.coral]), [pho.x + 1.3, 0, f + 2.6], -0.3))
  // Pharmacy: green cross lightbox, display shelves
  s.push({ box: [0.6, 0.18, 0.08], at: [pharmacy.x + 1.6, 2.9, fph + 0.45], color: '#3fae72' })
  s.push({ box: [0.18, 0.6, 0.08], at: [pharmacy.x + 1.6, 2.9, fph + 0.45], color: '#3fae72' })
  s.push({ box: [1.2, 0.9, 0.4], at: [pharmacy.x - 0.6, 0.45, fph + 0.45], color: '#ffffff' })
  for (let i = 0; i < 6; i++) s.push({ box: [0.14, 0.18, 0.12], at: [pharmacy.x - 1.05 + i * 0.18, 1.0, fph + 0.45], color: ['#ff9fb2', '#a9d6ff', '#ffe08a', '#a8e6cf'][i % 4] })
  // Tailor: two dress forms with áo dài (long tunic + flowing panels)
  for (const [dx, c] of [[-0.9, '#d4473b'], [0.9, '#f4c04e']] as const) {
    const x = tailor.x + dx
    s.push({ cyl: [0.03, 0.03, 0.9, 6], at: [x, 0.45, f + 0.55], color: P.darkSteel })
    s.push({ cyl: [0.16, 0.2, 0.55, 10], at: [x, 1.15, f + 0.55], color: c })
    s.push({ box: [0.3, 0.75, 0.02], at: [x, 0.62, f + 0.65], color: c })
    s.push({ sphere: [0.08, 8, 6], at: [x, 1.5, f + 0.55], color: '#f6e7c4' })
  }
  // Banyan tree (cây đa) with a tiny red shrine at its roots
  const { x: bx, z: bz } = WEST.banyan
  s.push(place(treeShapes('green'), [bx, 0, bz], 0.4, 1.9))
  s.push({ cyl: [0.5, 0.75, 0.3, 10], at: [bx, 0.15, bz], color: '#cfc8bb' })
  s.push({ box: [0.45, 0.5, 0.35], at: [bx + 0.85, 0.55, bz + 0.2], color: '#c8322b' })
  s.push({ box: [0.55, 0.08, 0.45], at: [bx + 0.85, 0.83, bz + 0.2], color: '#f4c04e' })
  s.push({ cyl: [0.05, 0.05, 0.3, 4], at: [bx + 0.85, 0.15, bz + 0.2], color: '#5b4a3e' })
  for (let i = 0; i < 3; i++) s.push({ cyl: [0.005, 0.005, 0.18, 3], at: [bx + 0.78 + i * 0.05, 0.96, bz + 0.3], color: '#c8322b' })
  // A row of stools waiting for the evening crowd
  for (let i = 0; i < 3; i++) s.push(place(stoolShapes([P.coral, P.sky2, P.mint][i]), [-22.9 + i * 0.6, 0, f + 2.4], i))
  return s
}

export const WestBlock = memo(function WestBlock() {
  const shapes = useMemo(propShapes, [])
  const [pho, pharmacy, tailor] = WEST.houses
  const f = BUILDING_FRONT_Z
  const fph = houseFront(pharmacy)
  return (
    <>
      {WEST.houses.map((h, i) => (
        <TubeHouse
          key={h.x}
          position={[h.x, 0, houseFront(h) - BUILDING_DEPTH / 2]}
          width={h.width}
          depth={BUILDING_DEPTH}
          floors={h.floors}
          palette={PALETTES[i]}
          oldQuarter
          flag={i !== 1}
          airCon={i !== 2}
          bougainvillea={i === 2}
          roofTank={i === 1}
          sign={SIGNS[i]}
        />
      ))}
      <Shapes shapes={shapes} />
      <RigidBody type="fixed" colliders={false}>
        <CylinderCollider args={[0.8, 0.8]} position={[WEST.banyan.x, 0.8, WEST.banyan.z]} collisionGroups={PROP_GROUPS} />
        <CuboidCollider args={[0.85, 0.5, 0.35]} position={[pho.x - 0.8, 0.5, f + 0.7]} collisionGroups={PROP_GROUPS} />
        <CuboidCollider args={[0.65, 0.5, 0.25]} position={[pharmacy.x - 0.6, 0.5, fph + 0.45]} collisionGroups={PROP_GROUPS} />
      </RigidBody>
      <NPC def={NPCS.bacPho} at={{ x: pho.x - 0.8, z: f + 1.35 }} yaw={0} zone={{ x: pho.x - 0.2, z: f + 2.0, halfX: 2.0, halfZ: 1.2 }} />
      <NPC def={NPCS.coThuoc} at={{ x: pharmacy.x - 0.6, z: fph + 1.05 }} yaw={0} zone={{ x: pharmacy.x - 0.4, z: fph + 1.7, halfX: 1.4, halfZ: 0.9 }} />
      <NPC def={NPCS.coMay} at={{ x: tailor.x, z: f + 1.0 }} yaw={0} zone={{ x: tailor.x, z: f + 1.6, halfX: 1.4, halfZ: 0.9 }} />
    </>
  )
})
