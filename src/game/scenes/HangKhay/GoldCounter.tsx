import { memo, useMemo } from 'react'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { NPCS } from '../../../data/npcs'
import { useTime } from '../../../store/timeStore'
import { NPC } from '../../components/npc/NPC'
import { PROP_GROUPS } from '../../systems/collisionGroups'
import { goldQuote } from '../../systems/gold'
import { vnd } from '../../systems/say'
import { Shapes, type ShapeItem } from '../shared/Shapes'
import { SignBoard } from '../shared/SignBoard'
import type { SignOptions } from '../shared/textures'
import { BUILDINGS } from './layout'

/**
 * 1.34 Tiệm Vàng Kim Thành (city place `goldShop`, its sign and door come from the HangKhay scene): an open glass
 * counter on the pavement east of the door with chú Năng behind it, and a price board with today's price.
 * The board's text changes once per game day (systems/gold.ts `goldQuote`).
 */

const SHOP = BUILDINGS.find((b) => b.id === 'goldShop')!
/** Fronts face north: "along" = metres east of the door, the counter stands this far out from the facade. */
const CASE = { x: SHOP.x + 1.7, z: SHOP.z - 1.3, w: 1.3, d: 0.55, h: 0.78 }
const BOARD = { x: SHOP.x + 3.25, z: SHOP.z - 1.5 }
const LACQUER = '#9a1f22'
const GOLD = '#f2b632'
const GOLD_HI = '#ffe08a'

function counterShapes(): ShapeItem[] {
  const s: ShapeItem[] = []
  const { x, z, w, d, h } = CASE
  // Lacquered base with a gold trim line, a red velvet tray on top
  s.push({ box: [w, h, d], at: [x, h / 2, z], color: LACQUER })
  s.push({ box: [w + 0.02, 0.04, d + 0.02], at: [x, h * 0.62, z], color: GOLD })
  s.push({ box: [w - 0.08, 0.03, d - 0.08], at: [x, h + 0.015, z], color: '#7a1020' })
  // Glass case: thin silver frame (the panes are left out so you can look in from above)
  const top = h + 0.32
  for (const dx of [-w / 2, w / 2]) for (const dz of [-d / 2, d / 2]) s.push({ box: [0.025, 0.32, 0.025], at: [x + dx, h + 0.16, z + dz], color: '#d9dde4' })
  for (const dz of [-d / 2, d / 2]) s.push({ box: [w, 0.025, 0.025], at: [x, top, z + dz], color: '#d9dde4' })
  for (const dx of [-w / 2, w / 2]) s.push({ box: [0.025, 0.025, d], at: [x + dx, top, z], color: '#d9dde4' })
  s.push({ box: [w - 0.04, 0.06, 0.01], at: [x, h + 0.06, z - d / 2], color: '#cfeaf2' })
  // Gold bars (vàng miếng) in a row, rings (nhẫn tròn) on little stands, a chain on a bust
  for (let i = 0; i < 5; i++) {
    const bx = x - w / 2 + 0.16 + i * 0.13
    s.push({ box: [0.09, 0.025, 0.14], at: [bx, h + 0.045, z - 0.08], color: i % 2 ? GOLD : GOLD_HI })
    s.push({ box: [0.07, 0.005, 0.1], at: [bx, h + 0.06, z - 0.08], color: '#c8322b' })
  }
  for (let i = 0; i < 3; i++) {
    const rx = x + 0.2 + i * 0.14
    s.push({ cyl: [0.04, 0.05, 0.06, 8], at: [rx, h + 0.06, z + 0.1], color: '#2a2a2a' })
    s.push({ torus: [0.035, 0.01, 6, 14], at: [rx, h + 0.12, z + 0.1], rot: [Math.PI / 2 - 0.4, 0, 0], color: GOLD })
  }
  s.push({ cyl: [0.06, 0.08, 0.22, 8], at: [x - 0.42, h + 0.12, z + 0.12], color: '#2a2a2a' })
  s.push({ torus: [0.07, 0.012, 6, 16], at: [x - 0.42, h + 0.19, z + 0.12], rot: [Math.PI / 2 + 0.6, 0, 0], color: GOLD_HI })
  // Small scale (cân tiểu ly) at the end of the counter
  s.push({ box: [0.18, 0.05, 0.14], at: [x + w / 2 - 0.13, top + 0.04, z + 0.05], color: '#e8e4dc' })
  s.push({ cyl: [0.06, 0.06, 0.01, 12], at: [x + w / 2 - 0.13, top + 0.07, z + 0.05], color: '#b8bcc8' })
  // Price board on a stand
  s.push({ cyl: [0.035, 0.035, 1.2, 6], at: [BOARD.x, 0.6, BOARD.z], color: '#3a3f4e' })
  s.push({ box: [0.5, 0.05, 0.35], at: [BOARD.x, 0.025, BOARD.z], color: '#3a3f4e' })
  // A lucky red lantern and a gold "Thần Tài" box on the facade
  s.push({ sphere: [0.2, 10, 8], at: [CASE.x - 0.5, 2.25, SHOP.z - 0.35], scale: [1, 0.85, 1], color: '#d4302a' })
  s.push({ cyl: [0.12, 0.12, 0.05, 10], at: [CASE.x - 0.5, 2.45, SHOP.z - 0.35], color: GOLD })
  s.push({ box: [0.03, 0.25, 0.03], at: [CASE.x - 0.5, 1.98, SHOP.z - 0.35], color: GOLD })
  return s
}

function boardOptions(day: number): SignOptions {
  const q = goldQuote(day)
  return {
    title: 'GIÁ VÀNG HÔM NAY',
    subtitle: `Bán ra ${vnd(q.sell)} · Mua vào ${vnd(q.buy)} / chỉ`,
    background: '#1f1a17',
    color: '#ffd76a',
    border: '#c8322b',
    accent: '#ff6f61',
    aspect: 2.6,
  }
}

export const GoldCounter = memo(function GoldCounter() {
  const shapes = useMemo(counterShapes, [])
  const day = useTime((s) => s.day)
  const board = useMemo(() => boardOptions(day), [day])
  return (
    <>
      <Shapes shapes={shapes} />
      <SignBoard options={board} width={1.25} position={[BOARD.x, 1.42, BOARD.z]} rotation={[0, Math.PI, 0]} />
      <NPC def={NPCS.chuNang} at={{ x: CASE.x, z: SHOP.z - 0.55 }} yaw={Math.PI} zone={{ x: CASE.x, z: CASE.z - 0.85, halfX: 0.9, halfZ: 0.55 }} />
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[CASE.w / 2, 0.6, CASE.d / 2]} position={[CASE.x, 0.6, CASE.z]} collisionGroups={PROP_GROUPS} />
        <CuboidCollider args={[0.25, 0.8, 0.2]} position={[BOARD.x, 0.8, BOARD.z]} collisionGroups={PROP_GROUPS} />
      </RigidBody>
    </>
  )
})
