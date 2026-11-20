import { memo, useMemo } from 'react'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { NPCS } from '../../../data/npcs'
import { NPC } from '../../components/npc/NPC'
import { PROP_GROUPS } from '../../systems/collisionGroups'
import { place, softPlantShapes } from '../shared/props'
import { PALETTE as P } from '../shared/palette'
import { Shapes, type ShapeItem } from '../shared/Shapes'
import type { SignOptions } from '../shared/textures'
import { BUILDING_DEPTH, BUILDING_FRONT_Z, houseFront, OFFICES } from './layout'
import { TubeHouse, type HousePalette } from './TubeHouse'

/**
 * West end of Phố Hàng Gai (1.13): where the visa papers are made — a photo studio (biometric
 * photos), the notary (translation + red stamps), a bank (proof of funds, đổi tiền) and the APS
 * office (school records check + interview). Each has a clerk at the counter by the door.
 */

const PALETTES: HousePalette[] = [
  { wall: '#f6d6a8', trim: '#fff3d6', shutter: '#3f7d5c', railing: '#2c5c43', accent: '#c8322b' },
  { wall: '#e9e2d4', trim: '#ffffff', shutter: '#7a4a2a', railing: '#5b3a2a', accent: '#c8322b' },
  { wall: '#cfe4dc', trim: '#ffffff', shutter: '#2f8c7f', railing: '#2f5f60', accent: '#2f8c7f' },
  { wall: '#dfe6f2', trim: '#ffffff', shutter: '#3f5f8f', railing: '#2f3a4d', accent: '#d4a72c' },
]

const SIGNS: SignOptions[] = [
  { title: 'TIỆM ẢNH HÙNG', subtitle: 'Ảnh thẻ · Ảnh visa 3,5×4,5 · Lấy ngay', background: '#ffffff', border: '#c8322b', color: '#c8322b', accent: '#2f3a4d', aspect: 6.5 },
  { title: 'VĂN PHÒNG CÔNG CHỨNG', subtitle: 'Dịch thuật · Sao y · Chứng thực', background: '#8a2a24', border: '#f4c04e', color: '#ffe08a', accent: '#ffffff', aspect: 6.5 },
  { title: 'NGÂN HÀNG PHỐ CỔ', subtitle: 'Tiết kiệm · Ngoại tệ · Chứng minh tài chính', background: '#2f8c7f', border: '#ffffff', color: '#ffffff', accent: '#ffe08a', aspect: 6.5 },
  { title: 'APS · AKADEMISCHE PRÜFSTELLE', subtitle: 'Thẩm tra học thuật du học Đức', background: '#2f3a4d', border: '#d4a72c', color: '#ffffff', accent: '#d4a72c', aspect: 6.5 },
]

function propShapes(): ShapeItem[] {
  const s: ShapeItem[] = []
  const [photo, notary, bank, aps] = OFFICES.houses
  const f = BUILDING_FRONT_Z
  const fn = houseFront(notary)
  const fa = houseFront(aps)
  // Photo studio: white backdrop, a camera on a tripod, a softbox, sample portraits in the window
  s.push({ box: [1.6, 1.8, 0.04], at: [photo.x + 0.7, 1.0, f + 0.12], color: '#ffffff' })
  for (const a of [0, 2.1, 4.2]) s.push({ cyl: [0.012, 0.012, 1.1, 4], at: [photo.x - 0.5 + Math.cos(a) * 0.14, 0.5, f + 1.25 + Math.sin(a) * 0.14], rot: [Math.cos(a) * 0.18, 0, Math.sin(a) * 0.18], color: P.darkSteel })
  s.push({ box: [0.22, 0.16, 0.18], at: [photo.x - 0.5, 1.12, f + 1.25], color: '#2a2a30' })
  s.push({ cyl: [0.06, 0.07, 0.12, 10], at: [photo.x - 0.5, 1.12, f + 1.12], rot: [Math.PI / 2, 0, 0], color: '#4a4a55' })
  s.push({ box: [0.55, 0.55, 0.3], at: [photo.x - 1.5, 1.7, f + 0.6], rot: [0, 0.6, 0], color: '#f4f4f8' })
  s.push({ cyl: [0.015, 0.015, 1.4, 4], at: [photo.x - 1.5, 0.7, f + 0.6], color: P.darkSteel })
  for (let i = 0; i < 4; i++) {
    s.push({ box: [0.26, 0.34, 0.02], at: [photo.x - 1.65 + (i % 2) * 0.32, 1.25 + Math.floor(i / 2) * 0.4, f + 0.12], color: '#f7f2e6' })
    s.push({ sphere: [0.07, 8, 6], at: [photo.x - 1.65 + (i % 2) * 0.32, 1.28 + Math.floor(i / 2) * 0.4, f + 0.14], color: ['#f2cfb3', '#e8bd9a', '#f6d6c0', '#eec39f'][i] })
  }
  // Notary: a wooden counter with stamps and file trays, a shelf of binders
  s.push({ box: [2.2, 0.95, 0.55], at: [notary.x, 0.48, fn + 0.35], color: '#8a5a3a' })
  s.push({ box: [2.26, 0.05, 0.6], at: [notary.x, 0.97, fn + 0.35], color: '#b98a5c' })
  s.push({ cyl: [0.05, 0.06, 0.1, 8], at: [notary.x + 0.6, 1.05, fn + 0.35], color: '#c8322b' })
  s.push({ cyl: [0.012, 0.012, 0.1, 6], at: [notary.x + 0.6, 1.13, fn + 0.35], color: '#2a2a30' })
  for (let i = 0; i < 3; i++) s.push({ box: [0.32, 0.03, 0.24], at: [notary.x - 0.6, 1.01 + i * 0.05, fn + 0.33], color: i % 2 ? '#f7f2e6' : '#e9dfc8' })
  for (let i = 0; i < 8; i++) s.push({ box: [0.09, 0.36, 0.28], at: [notary.x + 1.3 + (i % 4) * 0.11, 0.95 + Math.floor(i / 4) * 0.45, fn + 0.2], color: ['#2f5fa8', '#c8322b', '#3f7d5c', '#d4a72c'][i % 4] })
  s.push({ box: [0.5, 1.3, 0.3], at: [notary.x + 1.47, 0.65, fn + 0.17], color: '#8a5a3a' })
  // Bank: glass counter, an ATM by the door, a little plant
  s.push({ box: [2.0, 0.95, 0.5], at: [bank.x + 0.2, 0.48, f + 0.3], color: '#e9eef2' })
  s.push({ box: [2.0, 0.55, 0.03], at: [bank.x + 0.2, 1.25, f + 0.52], color: '#bfe0e8' })
  s.push({ box: [0.6, 1.6, 0.45], at: [bank.x - 1.7, 0.8, f + 0.3], color: '#2f8c7f' })
  s.push({ box: [0.4, 0.3, 0.02], at: [bank.x - 1.7, 1.25, f + 0.53], color: '#bfe6ff' })
  s.push({ box: [0.3, 0.08, 0.04], at: [bank.x - 1.7, 0.95, f + 0.54], color: '#2a2a30' })
  s.push(place(softPlantShapes(P.leafDark, '#c49a6c'), [bank.x + 1.8, 0, f + 0.6], 0, 0.9))
  // APS: a desk with two chairs, black-red-gold stripe over the door, a plaque
  s.push({ box: [1.4, 0.06, 0.6], at: [aps.x - 0.6, 0.75, fa + 0.5], color: '#c9b79c' })
  for (const dx of [-1.25, 0.05]) s.push({ box: [0.05, 0.72, 0.5], at: [aps.x + dx, 0.36, fa + 0.5], color: '#8a7a64' })
  for (const [dx, dz] of [[-0.6, 0.12], [-0.6, 1.05]] as const) s.push({ box: [0.4, 0.45, 0.32], at: [aps.x + dx, 0.23, fa + dz], color: '#3f5f8f' })
  ;['#1e1e22', '#c8322b', '#f4c04e'].forEach((c, i) => s.push({ box: [2.4, 0.06, 0.03], at: [aps.x, 3.05 - i * 0.06, fa + 0.06], color: c }))
  s.push({ box: [0.5, 0.36, 0.03], at: [aps.x + 1.5, 1.6, fa + 0.06], color: '#d4a72c' })
  return s
}

export const VisaOffices = memo(function VisaOffices() {
  const shapes = useMemo(propShapes, [])
  const [photo, notary, bank, aps] = OFFICES.houses
  const f = BUILDING_FRONT_Z
  const fn = houseFront(notary)
  const fa = houseFront(aps)
  return (
    <>
      {OFFICES.houses.map((h, i) => (
        <TubeHouse
          key={h.x}
          position={[h.x, 0, houseFront(h) - BUILDING_DEPTH / 2]}
          width={h.width}
          depth={BUILDING_DEPTH}
          floors={h.floors}
          palette={PALETTES[i]}
          oldQuarter
          flag={i === 0}
          airCon={i !== 1}
          bougainvillea={i === 1}
          roofTank={i === 3}
          sign={SIGNS[i]}
        />
      ))}
      <Shapes shapes={shapes} />
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[1.1, 0.5, 0.3]} position={[notary.x, 0.5, fn + 0.35]} collisionGroups={PROP_GROUPS} />
        <CuboidCollider args={[1.0, 0.5, 0.25]} position={[bank.x + 0.2, 0.5, f + 0.3]} collisionGroups={PROP_GROUPS} />
        <CuboidCollider args={[0.3, 0.8, 0.25]} position={[bank.x - 1.7, 0.8, f + 0.3]} collisionGroups={PROP_GROUPS} />
        <CuboidCollider args={[0.7, 0.4, 0.3]} position={[aps.x - 0.6, 0.4, fa + 0.5]} collisionGroups={PROP_GROUPS} />
      </RigidBody>
      <NPC def={NPCS.chuAnh} at={{ x: photo.x + 0.5, z: f + 0.9 }} yaw={0} zone={{ x: photo.x, z: f + 1.6, halfX: 1.5, halfZ: 1.0 }} />
      <NPC def={NPCS.coCongChung} at={{ x: notary.x, z: fn + 0.95 }} yaw={0} zone={{ x: notary.x, z: fn + 1.7, halfX: 1.5, halfZ: 1.0 }} />
      <NPC def={NPCS.anhNganHang} at={{ x: bank.x + 0.2, z: f + 0.9 }} yaw={0} zone={{ x: bank.x, z: f + 1.6, halfX: 1.5, halfZ: 1.0 }} />
      <NPC def={NPCS.coAps} at={{ x: aps.x + 0.9, z: fa + 0.9 }} yaw={0} zone={{ x: aps.x, z: fa + 1.7, halfX: 1.5, halfZ: 1.0 }} />
    </>
  )
})
