import { memo, useMemo } from 'react'
import { NPCS } from '../../../data/npcs'
import { ActionSpot, type SpotAction } from '../../components/ActionSpot'
import { NPC } from '../../components/npc/NPC'
import { WallClock, WallFan } from '../shared/Decor'
import { PALETTE as P } from '../shared/palette'
import { place, plantShapes } from '../shared/props'
import { DOORMAT, Room } from '../shared/Room'
import type { ShapeItem } from '../shared/Shapes'
import { SignBoard } from '../shared/SignBoard'
import type { SignOptions } from '../shared/textures'

/**
 * Văn phòng tư vấn Mai Anh (story 2.1 §2.0): 2nd floor on Hàng Bông, up a narrow staircase.
 * Walls full of photos of smiling students at Frankfurt airport, a fish tank, a tea machine.
 * Chị Mai advises, em Tuấn (three phones) does the paperwork, cô Thoa takes the money.
 */

const W = 7.4
const D = 6
const BACK = -D / 2
const STYLE = { wall: '#f6ecd8', wallLow: '#e8d6b4', floor: '#d8b48a', floorAlt: '#cda57a', trim: '#ffffff', window: '#cfe8f6' }
const EXIT = { x: 2.9, z: 2.3 }
export const MAI_OFFICE = {
  mai: { x: -1.6, z: -1.75 },
  tuan: { x: 1.3, z: -1.75 },
  thoa: { x: -3.05, z: 1.0 },
}

const WALL_SIGN: SignOptions = {
  title: 'MAI ANH · Du học & Học nghề Đức',
  subtitle: '„Hồ sơ đẹp thì visa mới đẹp"',
  background: '#2f6fb0',
  border: '#ffffff',
  color: '#ffffff',
  accent: '#ffe08a',
  aspect: 5.5,
}
const PRICE_LIST: SignOptions = {
  title: 'BẢNG GIÁ DỊCH VỤ',
  subtitle: 'Dịch thuật 2tr · LLTP+KSK 1,3tr · CV 800k · Auslandsportal 500k · Lịch VFS 500k · Trọn gói 5,5tr',
  background: '#fffaf0',
  border: '#2f6fb0',
  color: '#2f6fb0',
  accent: '#c8322b',
  aspect: 2.2,
}

function desk(x: number, z: number, top: string): ShapeItem[] {
  return [
    { box: [1.5, 0.06, 0.75], at: [x, 0.76, z], color: top },
    { box: [0.06, 0.74, 0.7], at: [x - 0.7, 0.37, z], color: P.darkSteel },
    { box: [0.06, 0.74, 0.7], at: [x + 0.7, 0.37, z], color: P.darkSteel },
  ]
}

function furniture(): ShapeItem[] {
  const s: ShapeItem[] = []
  // Mai's desk: laptop, a stack of files, a name plate; two chairs for clients
  s.push(...desk(MAI_OFFICE.mai.x, MAI_OFFICE.mai.z + 0.7, '#8e5a34'))
  s.push({ box: [0.42, 0.02, 0.3], at: [MAI_OFFICE.mai.x - 0.3, 0.8, MAI_OFFICE.mai.z + 0.65], color: '#2f2f38' })
  s.push({ box: [0.4, 0.26, 0.02], at: [MAI_OFFICE.mai.x - 0.3, 0.93, MAI_OFFICE.mai.z + 0.5], rot: [-0.25, 0, 0], color: '#3f4a5c' })
  ;['#ffe08a', '#a9d6ff', '#ffb3c7'].forEach((c, i) => s.push({ box: [0.3, 0.05, 0.22], at: [MAI_OFFICE.mai.x + 0.4, 0.81 + i * 0.05, MAI_OFFICE.mai.z + 0.7], color: c }))
  for (const dx of [-0.4, 0.4]) {
    s.push({ box: [0.44, 0.05, 0.42], at: [MAI_OFFICE.mai.x + dx, 0.46, MAI_OFFICE.mai.z + 1.5], color: '#2f6fb0' })
    s.push({ box: [0.44, 0.45, 0.05], at: [MAI_OFFICE.mai.x + dx, 0.7, MAI_OFFICE.mai.z + 1.72], color: '#2f6fb0' })
  }
  // Tuấn's desk: three phones, a printer, piles of passports
  s.push(...desk(MAI_OFFICE.tuan.x, MAI_OFFICE.tuan.z + 0.7, '#cfd6e0'))
  for (let i = 0; i < 3; i++) s.push({ box: [0.08, 0.015, 0.15], at: [MAI_OFFICE.tuan.x - 0.5 + i * 0.16, 0.8, MAI_OFFICE.tuan.z + 0.75], rot: [0, i * 0.3, 0], color: '#2f2f38' })
  s.push({ box: [0.45, 0.22, 0.35], at: [MAI_OFFICE.tuan.x + 0.45, 0.9, MAI_OFFICE.tuan.z + 0.6], color: '#e8e8ee' })
  for (let i = 0; i < 4; i++) s.push({ box: [0.12, 0.02, 0.17], at: [MAI_OFFICE.tuan.x + 0.05, 0.8 + i * 0.02, MAI_OFFICE.tuan.z + 0.9], color: '#7a1f2b' })
  // Cô Thoa's counter by the stairs: cash box, receipt book (hóa đơn đỏ)
  s.push({ box: [0.7, 1.0, 1.6], at: [MAI_OFFICE.thoa.x + 0.75, 0.5, MAI_OFFICE.thoa.z], color: '#8e5a34' })
  s.push({ box: [0.8, 0.05, 1.7], at: [MAI_OFFICE.thoa.x + 0.75, 1.02, MAI_OFFICE.thoa.z], color: '#f4f1ea' })
  s.push({ box: [0.3, 0.14, 0.24], at: [MAI_OFFICE.thoa.x + 0.75, 1.12, MAI_OFFICE.thoa.z - 0.4], color: '#3f4a5c' })
  s.push({ box: [0.22, 0.03, 0.3], at: [MAI_OFFICE.thoa.x + 0.75, 1.06, MAI_OFFICE.thoa.z + 0.3], color: '#c8322b' })
  // Photo wall: smiling students at Frankfurt airport
  const colors = ['#ffe08a', '#ffb3c7', '#a9d6ff', '#b8e6c9', '#cdb8f0', '#ffc3a0']
  for (let i = 0; i < 12; i++) {
    const x = -3.2 + (i % 6) * 0.5
    const y = 1.55 + Math.floor(i / 6) * 0.55
    s.push({ box: [0.4, 0.46, 0.02], at: [x, y, BACK + 0.02], color: '#ffffff' })
    s.push({ box: [0.32, 0.36, 0.02], at: [x, y + 0.02, BACK + 0.035], color: colors[i % colors.length] })
    s.push({ sphere: [0.05, 6, 4], at: [x, y + 0.06, BACK + 0.05], color: '#f6d6bc' })
  }
  // Fish tank on a cabinet, tea machine
  s.push({ box: [1.1, 0.75, 0.45], at: [3.0, 0.38, BACK + 0.3], color: '#5b4038' })
  s.push({ box: [1.0, 0.6, 0.4], at: [3.0, 1.06, BACK + 0.3], color: '#9fd8f0' })
  s.push({ box: [1.0, 0.12, 0.4], at: [3.0, 0.82, BACK + 0.3], color: '#e8d6a0' })
  ;['#ff9b3d', '#ffd23f', '#ff6b5e'].forEach((c, i) => s.push({ sphere: [0.045, 6, 4], at: [2.7 + i * 0.28, 1.0 + (i % 2) * 0.12, BACK + 0.28], scale: [1.6, 1, 1], color: c }))
  s.push({ box: [0.5, 0.9, 0.45], at: [3.4, 0.45, -0.6], color: '#e8e8ee' })
  s.push({ box: [0.32, 0.4, 0.3], at: [3.4, 1.1, -0.6], color: '#2f2f38' })
  for (let i = 0; i < 3; i++) s.push({ cyl: [0.04, 0.035, 0.08, 8], at: [3.3 + i * 0.1, 0.95, -0.4], color: '#ffffff' })
  s.push(place(plantShapes(P.leafDark, '#ffffff'), [-3.3, 0, -2.4], 0, 1.1))
  s.push(place(plantShapes(P.leaf, '#c49a6c'), [0.0, 0, 2.5], 0, 1.0))
  // Top of the staircase and the doormat
  s.push({ box: [1.3, 0.025, 0.7], at: [EXIT.x, 0.055, EXIT.z], color: DOORMAT })
  s.push({ box: [0.08, 0.9, 1.2], at: [EXIT.x - 0.75, 0.45, EXIT.z], color: '#8e5a34' })
  return s
}

const EXIT_ACTIONS: SpotAction[] = [{ id: 'exit', labelKey: 'action.toStreet', icon: 'door', action: 'mai.leave', primary: true }]

const MaiOffice = memo(function MaiOffice() {
  const shapes = useMemo(furniture, [])
  return (
    <>
      <Room
        w={W}
        d={D}
        style={STYLE}
        windows={[1.8]}
        furniture={shapes}
        blockers={[
          [MAI_OFFICE.mai.x, MAI_OFFICE.mai.z + 0.7, 0.78, 0.4],
          [MAI_OFFICE.tuan.x, MAI_OFFICE.tuan.z + 0.7, 0.78, 0.4],
          [MAI_OFFICE.thoa.x + 0.75, MAI_OFFICE.thoa.z, 0.4, 0.85],
          [3.0, BACK + 0.3, 0.55, 0.25],
          [3.4, -0.6, 0.28, 0.25],
        ]}
      />
      <SignBoard options={WALL_SIGN} width={3.2} position={[-1.9, 2.72, BACK + 0.03]} />
      <SignBoard options={PRICE_LIST} width={1.3} position={[W / 2 - 0.03, 1.7, 0.9]} rotation={[0, -Math.PI / 2, 0]} flat />
      <WallClock position={[1.2, 2.65, BACK + 0.04]} radius={0.22} />
      <WallFan position={[-W / 2 + 0.05, 2.3, -0.6]} rotation={[0, Math.PI / 2, 0]} />

      <NPC def={NPCS.chiMai} at={MAI_OFFICE.mai} yaw={0} seatY={0.46} zone={{ x: MAI_OFFICE.mai.x, z: MAI_OFFICE.mai.z + 1.55, halfX: 1.0, halfZ: 0.6 }} />
      <NPC def={NPCS.tuan} at={MAI_OFFICE.tuan} yaw={0} seatY={0.46} arms={1} zone={{ x: MAI_OFFICE.tuan.x, z: MAI_OFFICE.tuan.z + 1.5, halfX: 0.9, halfZ: 0.6 }} />
      <NPC def={NPCS.coThoa} at={MAI_OFFICE.thoa} yaw={Math.PI / 2} zone={{ x: MAI_OFFICE.thoa.x + 1.6, z: MAI_OFFICE.thoa.z, halfX: 0.5, halfZ: 0.9 }} />

      <ActionSpot id="mai-exit" nameKey="interact.exit" zone={{ x: EXIT.x, z: EXIT.z, halfX: 0.8, halfZ: 0.6 }} actions={EXIT_ACTIONS} />
    </>
  )
})

export default MaiOffice
