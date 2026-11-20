import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { NPCS } from '../../../data/npcs'
import { useFlags } from '../../../store/flagsStore'
import { ActionSpot, type SpotAction } from '../../components/ActionSpot'
import { NPC } from '../../components/npc/NPC'
import { BUILDING_GROUPS } from '../../systems/collisionGroups'
import { PALETTE as P } from '../shared/palette'
import { place, softPlantShapes } from '../shared/props'
import { Shapes, type ShapeItem } from '../shared/Shapes'
import { SignBoard } from '../shared/SignBoard'
import type { SignOptions } from '../shared/textures'
import { HANG_BONG } from './layout'

/**
 * Phố Hàng Bông, the side road (story 2.1): Văn phòng tư vấn Mai Anh (west side, narrow stairs to
 * the 2nd floor), the Hoàng Kim agency across the road with its blinking LED sign, and the
 * Circle K on the corner of Hàng Gai.
 */

const { mai: M, hoangKim: H, circleK: K } = HANG_BONG

const MAI_SIGN: SignOptions = {
  title: 'TƯ VẤN DU HỌC MAI ANH',
  subtitle: 'Tầng 2 · Du học & học nghề Đức · Có hóa đơn đỏ',
  background: '#2f6fb0',
  border: '#ffffff',
  color: '#ffffff',
  accent: '#ffe08a',
  aspect: 5.2,
}
const LED: SignOptions[] = [
  { title: 'BAO VISA 100%', subtitle: 'CÔNG TY HOÀNG KIM', background: '#1a1a22', border: '#ff3b3b', color: '#ff4d4d', accent: '#ffd23f', aspect: 4.6 },
  { title: 'KHÔNG CẦN B1', subtitle: 'BAY NGAY · LO HẾT', background: '#1a1a22', border: '#ffd23f', color: '#ffd23f', accent: '#ff4d4d', aspect: 4.6 },
  { title: 'LƯƠNG 100 TRIỆU', subtitle: 'ĐĂNG KÝ HÔM NAY', background: '#1a1a22', border: '#ff3b3b', color: '#4dff88', accent: '#ffd23f', aspect: 4.6 },
]
const CK_SIGN: SignOptions = { title: 'CIRCLE K', subtitle: 'Cửa hàng tiện lợi · 24/7', background: '#d4202a', border: '#ffffff', color: '#ffffff', accent: '#ffd9a0', aspect: 3.4 }
const PLAQUE: SignOptions = { title: 'PHỐ HÀNG BÔNG', subtitle: 'Q. Hoàn Kiếm', background: '#2c5aa0', border: '#ffffff', color: '#ffffff', accent: '#ffffff', aspect: 2.6 }

function maiShapes(): ShapeItem[] {
  const s: ShapeItem[] = []
  const cx = (M.x0 + M.x1) / 2
  const cz = (M.z0 + M.z1) / 2
  const w = M.x1 - M.x0
  const d = M.z1 - M.z0
  const f = M.x1
  s.push({ box: [w, 9.4, d], at: [cx, 4.7, cz], color: '#f3d9c4' })
  for (const y of [3.2, 6.4]) s.push({ box: [0.22, 0.18, d + 0.1], at: [f + 0.06, y, cz], color: '#fff3d6' })
  s.push({ box: [w + 0.4, 0.22, d + 0.4], at: [cx, 9.5, cz], color: '#c8653d' })
  // Ground floor: a narrow door onto the stairs, mailboxes, a shoe rack
  s.push({ box: [0.08, 2.4, 1.1], at: [f + 0.02, 1.2, M.door], color: '#fff3d6' })
  s.push({ box: [0.08, 2.15, 0.9], at: [f + 0.05, 1.08, M.door], color: '#3a2b24' })
  for (let i = 0; i < 6; i++) s.push({ box: [0.5 - i * 0.02, 0.06, 0.8], at: [f - 0.25 - i * 0.12, 0.08 + i * 0.3, M.door], color: '#8e5a34' })
  ;['#c8322b', '#2f6fb0', '#3f7d5c'].forEach((c, i) => s.push({ box: [0.08, 0.22, 0.3], at: [f + 0.06, 1.3, M.door - 1.0 - i * 0.34], color: c }))
  s.push({ box: [0.3, 0.4, 0.8], at: [f + 0.2, 0.2, M.door + 1.05], color: '#b98a5a' })
  // 2nd floor (the office): a wide window with photos of smiling students, an AC unit
  s.push({ box: [0.06, 1.5, d - 1.2], at: [f + 0.03, 4.75, cz], color: '#cfe8f6' })
  ;['#ffe08a', '#ffb3c7', '#a9d6ff', '#b8e6c9'].forEach((c, i) => s.push({ box: [0.03, 0.42, 0.34], at: [f + 0.07, 4.9 + (i % 2) * 0.1, cz - 1.1 + i * 0.72], color: c }))
  s.push({ box: [0.36, 0.5, 0.8], at: [f + 0.2, 5.75, cz + 1.6], color: '#f4f4f4' })
  // 3rd floor: green shutters and a balcony with plants
  for (const sz of [-1, 1]) s.push({ box: [0.06, 1.6, 0.6], at: [f + 0.05, 7.9, cz + sz * 0.75], color: '#3f7d5c' })
  s.push({ box: [0.6, 0.1, d - 0.8], at: [f + 0.3, 7.05, cz], color: '#fff3d6' })
  for (let i = 0; i <= 8; i++) s.push({ box: [0.03, 0.75, 0.03], at: [f + 0.58, 7.45, M.z0 + 0.6 + i * ((d - 1.2) / 8)], color: '#2c5c43' })
  s.push(place(softPlantShapes(P.leafDark, P.terracotta), [f + 0.3, 7.1, cz - 1.4], 0, 0.6))
  s.push(place(softPlantShapes(P.blossom, P.terracotta), [f + 0.3, 7.1, cz + 1.4], 0, 0.6))
  return s
}

function hoangKimShapes(): ShapeItem[] {
  const s: ShapeItem[] = []
  const cx = (H.x0 + H.x1) / 2
  const cz = (H.z0 + H.z1) / 2
  const w = H.x1 - H.x0
  const d = H.z1 - H.z0
  const f = H.x0
  // Upper floors: glossy grey with gold trims (a little too fancy)
  s.push({ box: [w, 4.2, d], at: [cx, 4.7, cz], color: '#d9dde6' })
  s.push({ box: [w + 0.3, 0.2, d + 0.3], at: [cx, 6.9, cz], color: '#d4a72c' })
  s.push({ box: [0.06, 2.6, d - 0.8], at: [f - 0.03, 4.9, cz], color: '#4b5d73' })
  // Ground floor: open shop front with a desk, chairs, a water cooler, posters of planes
  s.push({ box: [0.4, 2.6, d], at: [H.x1 - 0.2, 1.3, cz], color: '#eef0f4' })
  for (const z of [H.z0 + 0.1, H.z1 - 0.1]) s.push({ box: [w, 2.6, 0.2], at: [cx, 1.3, z], color: '#d9dde6' })
  s.push({ box: [w - 0.4, 0.02, d - 0.3], at: [cx - 0.1, 0.012, cz], color: '#f4f1ea' })
  s.push({ box: [w, 0.2, d], at: [cx, 2.7, cz], color: '#c9ced8' })
  s.push({ box: [0.7, 0.06, 1.3], at: [H.desk.x, 0.76, H.desk.z], color: '#2f2f38' })
  for (const sz of [-1, 1]) s.push({ box: [0.66, 0.74, 0.05], at: [H.desk.x, 0.37, H.desk.z + sz * 0.6], color: '#2f2f38' })
  s.push({ box: [0.22, 0.012, 0.3], at: [H.desk.x - 0.05, 0.8, H.desk.z - 0.1], color: '#ffffff' })
  s.push({ cyl: [0.14, 0.14, 0.9, 10], at: [H.x1 - 0.55, 0.45, H.z1 - 0.5], color: '#e8f4f8' })
  ;['#ffd23f', '#ff4d4d'].forEach((c, i) => s.push({ box: [0.03, 0.7, 0.9], at: [H.x1 - 0.42, 1.6, cz - 0.7 + i * 1.4], color: c }))
  return s
}

function circleKShapes(): ShapeItem[] {
  const s: ShapeItem[] = []
  const cx = (K.x0 + K.x1) / 2
  const cz = (K.z0 + K.z1) / 2
  const w = K.x1 - K.x0
  const d = K.z1 - K.z0
  const f = K.z1
  // Shop: white box, glass front on the Hàng Gai side, red band
  s.push({ box: [w, 3.0, d], at: [cx, 1.5, cz], color: '#f6f6f6' })
  s.push({ box: [w - 0.3, 2.1, 0.06], at: [cx, 1.15, f + 0.02], color: '#bfe6f2' })
  s.push({ box: [0.06, 2.1, d - 0.8], at: [K.x0 - 0.02, 1.15, cz], color: '#bfe6f2' })
  s.push({ box: [w + 0.06, 0.32, d + 0.06], at: [cx, 2.55, cz], color: '#d4202a' })
  s.push({ box: [w + 0.06, 0.12, d + 0.06], at: [cx, 2.3, cz], color: '#f39a2b' })
  // Shelves behind the glass, a drinks fridge glow
  for (let i = 0; i < 3; i++) s.push({ box: [w - 0.6, 0.05, 0.3], at: [cx, 0.6 + i * 0.45, cz - 0.5], color: ['#ffd23f', '#a9d6ff', '#ff9fb2'][i] })
  // Two floors of housing above
  s.push({ box: [w, 5.6, d], at: [cx, 5.8, cz], color: '#f0b9a0' })
  s.push({ box: [w + 0.3, 0.2, d + 0.3], at: [cx, 8.7, cz], color: '#c8653d' })
  for (const y of [4.6, 7.1]) s.push({ box: [w - 0.8, 1.2, 0.06], at: [cx, y, f + 0.02], color: '#cfe8f6' })
  // Plastic stools and a table outside, like every corner store in Hà Nội
  for (const x of [cx - 0.55, cx + 0.55]) s.push({ cyl: [0.16, 0.13, 0.32, 8], at: [x, 0.16, f + 0.7], color: '#2f8c7f' })
  s.push({ box: [0.6, 0.04, 0.45], at: [cx, 0.45, f + 0.75], color: '#d4202a' })
  return s
}

const MAI_DOOR: SpotAction[] = [{ id: 'enter', labelKey: 'action.enterOffice', icon: 'door', action: 'mai.enter', primary: true }]

/**
 * The LED sign of Hoàng Kim cycles through its promises. All three boards are built once and only
 * shown in turn (1.21): rebuilding a canvas texture + material every 0.9 s made the game stutter.
 * They are all visible on the first frame so their textures are uploaded up front.
 */
function LedSign() {
  const boards = useRef<(Group | null)[]>([])
  const clock = useRef({ t: 0, i: -1, frames: 0 })
  useFrame((_, dt) => {
    const c = clock.current
    // Let the first frames draw all three (texture upload), then cycle.
    if (++c.frames < 3) return
    c.t += Math.min(dt, 0.1)
    const i = Math.floor(c.t / 0.9) % LED.length
    if (i === c.i) return
    c.i = i
    boards.current.forEach((b, k) => b && (b.visible = k === i))
  })
  return (
    <>
      {LED.map((o, k) => (
        <group key={k} ref={(g) => void (boards.current[k] = g)}>
          <SignBoard options={o} width={3.4} position={[H.x0 - 0.12, 3.05, (H.z0 + H.z1) / 2]} rotation={[0, -Math.PI / 2, 0]} />
        </group>
      ))}
    </>
  )
}

export function HangBong() {
  const shapes = useMemo(() => [...maiShapes(), ...hoangKimShapes(), ...circleKShapes()], [])
  // Linh signs papers inside Hoàng Kim once she has told you about it (until you leave for Germany).
  const linhThere = useFlags((s) => !!s.flags['linh.told'] && !s.flags['de.arrived'])
  return (
    <>
      <Shapes shapes={shapes} />
      <SignBoard options={MAI_SIGN} width={3.6} position={[M.x1 + 0.12, 2.75, (M.z0 + M.z1) / 2]} rotation={[0, Math.PI / 2, 0]} />
      <LedSign />
      <SignBoard options={CK_SIGN} width={1.8} position={[(K.x0 + K.x1) / 2, 2.55, K.z1 + 0.08]} />
      <SignBoard options={PLAQUE} width={0.9} position={[M.x1 - 0.5, 2.6, M.z1 + 0.06]} />
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[(M.x1 - M.x0) / 2, 4.7, (M.z1 - M.z0) / 2]} position={[(M.x0 + M.x1) / 2, 4.7, (M.z0 + M.z1) / 2]} collisionGroups={BUILDING_GROUPS} />
        <CuboidCollider args={[(H.x1 - H.x0) / 2, 3.4, (H.z1 - H.z0) / 2]} position={[(H.x0 + H.x1) / 2, 3.4, (H.z0 + H.z1) / 2]} collisionGroups={BUILDING_GROUPS} />
        <CuboidCollider args={[(K.x1 - K.x0) / 2, 4.4, (K.z1 - K.z0) / 2]} position={[(K.x0 + K.x1) / 2, 4.4, (K.z0 + K.z1) / 2]} collisionGroups={BUILDING_GROUPS} />
      </RigidBody>
      <ActionSpot id="mai-door" nameKey="interact.maiOffice" zone={{ x: M.x1 + 0.6, z: M.door, halfX: 0.6, halfZ: 0.8 }} actions={MAI_DOOR} />
      <NPC def={NPCS.anhKhai} at={H.khai} yaw={-Math.PI / 2} zone={{ x: H.khai.x - 0.3, z: H.khai.z, halfX: 0.9, halfZ: 1.1 }} />
      {linhThere && <NPC def={NPCS.hvLinh} at={{ x: H.desk.x + 0.55, z: H.desk.z }} yaw={-Math.PI / 2} seatY={0.45} zone={{ x: H.x0 - 0.6, z: H.desk.z, halfX: 0.6, halfZ: 0.7 }} />}
      <NPC def={NPCS.chiQuanLy} at={K.manager} yaw={0} zone={{ x: K.manager.x, z: K.manager.z + 0.4, halfX: 1.0, halfZ: 0.9 }} />
    </>
  )
}
