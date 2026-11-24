import { memo, useMemo } from 'react'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
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
 * office (school records check + interview). 1.41: the clerks sit inside (scenes/ShopRoom, door = ShopDoors.tsx).
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
  const [photo, , bank, aps] = OFFICES.houses
  const f = BUILDING_FRONT_Z
  const fa = houseFront(aps)
  // 1.41 the clerks and their counters are inside (scenes/ShopRoom); outside: the shop windows
  // Photo studio: sample portraits in the window
  for (let i = 0; i < 4; i++) {
    s.push({ box: [0.26, 0.34, 0.02], at: [photo.x - 1.65 + (i % 2) * 0.32, 1.25 + Math.floor(i / 2) * 0.4, f + 0.12], color: '#f7f2e6' })
    s.push({ sphere: [0.07, 8, 6], at: [photo.x - 1.65 + (i % 2) * 0.32, 1.28 + Math.floor(i / 2) * 0.4, f + 0.14], color: ['#f2cfb3', '#e8bd9a', '#f6d6c0', '#eec39f'][i] })
  }
  // Bank: an ATM by the door, a little plant
  s.push({ box: [0.6, 1.6, 0.45], at: [bank.x - 1.7, 0.8, f + 0.3], color: '#2f8c7f' })
  s.push({ box: [0.4, 0.3, 0.02], at: [bank.x - 1.7, 1.25, f + 0.53], color: '#bfe6ff' })
  s.push({ box: [0.3, 0.08, 0.04], at: [bank.x - 1.7, 0.95, f + 0.54], color: '#2a2a30' })
  s.push(place(softPlantShapes(P.leafDark, '#c49a6c'), [bank.x + 1.8, 0, f + 0.6], 0, 0.9))
  ;['#1e1e22', '#c8322b', '#f4c04e'].forEach((c, i) => s.push({ box: [2.4, 0.06, 0.03], at: [aps.x, 3.05 - i * 0.06, fa + 0.06], color: c }))
  s.push({ box: [0.5, 0.36, 0.03], at: [aps.x + 1.5, 1.6, fa + 0.06], color: '#d4a72c' })
  return s
}

export const VisaOffices = memo(function VisaOffices() {
  const shapes = useMemo(propShapes, [])
  const bank = OFFICES.houses[2]
  const f = BUILDING_FRONT_Z
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
        <CuboidCollider args={[0.3, 0.8, 0.25]} position={[bank.x - 1.7, 0.8, f + 0.3]} collisionGroups={PROP_GROUPS} />
      </RigidBody>
      {/* 1.41 the clerks work inside (data/shopRooms.ts): the doors are ShopDoors.tsx */}
    </>
  )
})
