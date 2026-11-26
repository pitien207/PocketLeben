import { memo, useMemo } from 'react'
import { CuboidCollider, CylinderCollider, RigidBody } from '@react-three/rapier'
import type { Vec3 } from '../../../data/config'
import { NPCS } from '../../../data/npcs'
import { ActionSpot, type SpotAction } from '../../components/ActionSpot'
import { NPC } from '../../components/npc/NPC'
import { BUILDING_GROUPS, PROP_GROUPS } from '../../systems/collisionGroups'
import { fluffyTreeShapes, place } from '../shared/props'
import { Shapes, type ShapeItem } from '../shared/Shapes'
import { vnRoofShapes } from '../shared/vnRoof'
import { modelShapes } from '../shared/models'
import { SignBoard } from '../shared/SignBoard'
import type { SignOptions } from '../shared/textures'
import { NGOC_SON as N } from './layout'

/**
 * Đền Ngọc Sơn (map extension 1.10): from the lakeside you walk through the Đài Nghiên gate,
 * past Tháp Bút, over the red Thê Húc bridge (a gentle arch you really walk on) to Jade Island:
 * Đắc Nguyệt pavilion, a courtyard with an incense urn and a banyan, the temple hall, and the
 * Trấn Ba pavilion with the preserved giant turtle.
 */

const RED = '#d6362c'
const DARK_RED = '#9e2a22'
const GOLD = '#f4c04e'
const TILE = '#7a4434'
const STONE = '#ddd0b2'

/** Deck height along the bridge (t = 0 at the shore, 1 at the island). */
export const deckY = (t: number) => N.bridge.peak * Math.sin(Math.PI * Math.min(1, Math.max(0, t)))
const SEGMENTS = 14

function bridgeShapes(): ShapeItem[] {
  const s: ShapeItem[] = []
  const { x, z0, z1, width } = N.bridge
  const len = z1 - z0
  const seg = len / SEGMENTS
  for (let i = 0; i < SEGMENTS; i++) {
    const t0 = i / SEGMENTS
    const t1 = (i + 1) / SEGMENTS
    const y0 = deckY(t0)
    const y1 = deckY(t1)
    const pitch = Math.atan2(y1 - y0, seg)
    const z = z0 + len * ((t0 + t1) / 2)
    const y = (y0 + y1) / 2
    // Planks (dark red), the red railing with posts, and piers into the water
    s.push({ box: [width, 0.1, seg + 0.04], at: [x, y + 0.03, z], rot: [-pitch, 0, 0], color: '#b52b23' })
    for (const k of [-1, 1]) {
      const rx = x + k * (width / 2 - 0.05)
      s.push({ box: [0.09, 0.09, seg + 0.04], at: [rx, y + 0.75, z], rot: [-pitch, 0, 0], color: RED })
      s.push({ box: [0.06, 0.06, seg + 0.04], at: [rx, y + 0.42, z], rot: [-pitch, 0, 0], color: RED })
      s.push({ box: [0.09, 0.78, 0.09], at: [rx, y + 0.39, z - seg / 2], color: RED })
      if (i % 3 === 1) s.push({ cyl: [0.07, 0.08, y + 0.5, 6], at: [rx, (y - 0.5) / 2, z], color: DARK_RED })
    }
  }
  return s
}

/** A temple roof with upturned corners (1.46: the curved hip roof of shared/vnRoof.ts). */
function roof(at: Vec3, w: number, d: number, tiers = 2): ShapeItem[] {
  return vnRoofShapes(at, w, d, { tiers, color: TILE, overhang: 0.45, rise: Math.min(1.6, d * 0.45) })
}

function islandShapes(): ShapeItem[] {
  const s: ShapeItem[] = []
  const { x, z, rx, rz } = N.island
  // Stone rim + grass + paths
  s.push({ cyl: [1, 1.04, 0.5, 30], at: [x, -0.2, z], scale: [rx + 0.35, 1, rz + 0.35], color: '#bdb5a5' })
  s.push({ cyl: [1, 1, 0.06, 30], at: [x, 0.03, z], scale: [rx, 1, rz], color: '#9ccc78' })
  // Đắc Nguyệt pavilion over the island entrance (walk under it)
  const g = N.gateZ
  for (const k of [-1, 1]) {
    s.push({ box: [0.4, 2.7, 0.4], at: [x + k * 1.25, 1.35, g], color: RED })
    s.push({ box: [0.5, 0.3, 0.5], at: [x + k * 1.25, 0.15, g], color: STONE })
  }
  s.push({ box: [3.2, 0.35, 1.2], at: [x, 2.85, g], color: '#f2c46d' })
  s.push(...roof([x, 3.25, g], 3.2, 2.2, 2))
  // Courtyard: incense urn, two lanterns, the old banyan
  const u = N.urn
  s.push({ cyl: [0.55, 0.65, 0.35, 12], at: [u.x, 0.18, u.z], color: '#cfc8bb' })
  // 1.46: the bronze urn is Poly Haven's brass pot (pack urban); hand-built without the pack
  const urn = modelShapes('uBrassPot', { height: 0.72, paint: (_m: string, c: string) => (parseInt(c.slice(1, 3), 16) > 0xb0 ? '#d9a43a' : '#9a6a2a') })
  if (urn) s.push({ group: urn, at: [u.x, 0.35, u.z] })
  else {
    s.push({ cyl: [0.5, 0.35, 0.55, 14], at: [u.x, 0.62, u.z], color: '#b8863a' })
    s.push({ torus: [0.48, 0.05, 6, 16], at: [u.x, 0.9, u.z], rot: [Math.PI / 2, 0, 0], color: '#d9a43a' })
  }
  for (let i = 0; i < 9; i++) s.push({ cyl: [0.008, 0.008, 0.42, 3], at: [u.x - 0.2 + (i % 5) * 0.1, 1.08, u.z - 0.1 + Math.floor(i / 5) * 0.2], rot: [0, 0, ((i % 3) - 1) * 0.07], color: '#c8322b' })
  for (const k of [-1, 1]) {
    s.push({ box: [0.4, 1.0, 0.4], at: [x + k * 2.6, 0.5, u.z + 0.6], color: '#cfc8bb' })
    s.push({ box: [0.6, 0.45, 0.6], at: [x + k * 2.6, 1.2, u.z + 0.6], color: '#e8e0cf' })
    s.push({ box: [0.3, 0.25, 0.61], at: [x + k * 2.6, 1.2, u.z + 0.6], color: '#ffe08a' })
  }
  s.push(place(fluffyTreeShapes('green', 2, 51), [N.banyan.x, 0, N.banyan.z], 0.8, 1.8))
  s.push({ cyl: [0.6, 0.85, 0.35, 10], at: [N.banyan.x, 0.18, N.banyan.z], color: '#cfc8bb' })
  // Temple hall (Đền Ngọc Sơn): stone platform, red pillars, ochre walls, lacquered doors, altar
  const h = N.hall
  s.push({ box: [h.w + 0.8, 0.45, h.d + 0.8], at: [x, 0.22, h.z], color: STONE })
  for (let i = 0; i < 3; i++) s.push({ box: [2.4, 0.15, 0.32], at: [x, 0.08 + i * 0.15, h.z + h.d / 2 + 0.75 - i * 0.28], color: '#cfc3ad' })
  for (let i = 0; i < 6; i++) s.push({ cyl: [0.17, 0.19, 2.6, 10], at: [x - h.w / 2 + 0.4 + i * ((h.w - 0.8) / 5), 1.75, h.z + h.d / 2 - 0.2], color: RED })
  s.push({ box: [h.w - 0.4, 2.6, h.d - 1.2], at: [x, 1.75, h.z - 0.5], color: '#f2c46d' })
  for (const dx of [-2.2, 0, 2.2]) {
    s.push({ box: [1.3, 2.0, 0.08], at: [x + dx, 1.45, h.z + h.d / 2 - 1.08], color: '#7a2a22' })
    s.push({ box: [1.3, 0.08, 0.1], at: [x + dx, 2.47, h.z + h.d / 2 - 1.06], color: GOLD })
  }
  s.push({ box: [1.1, 0.7, 0.4], at: [x, 1.0, h.z + h.d / 2 - 1.3], color: '#c8322b' })
  s.push({ sphere: [0.22, 10, 8], at: [x, 1.55, h.z + h.d / 2 - 1.3], color: GOLD })
  s.push(...roof([x, 3.35, h.z], h.w, h.d, 2))
  // Trấn Ba pavilion with the preserved giant turtle in a glass case
  const t = N.turtle
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) s.push({ cyl: [0.12, 0.14, 2.3, 8], at: [t.x + sx * 1.1, 1.15, t.z + sz * 0.9], color: RED })
  s.push(...roof([t.x, 2.55, t.z], 2.4, 2.0, 1))
  s.push({ box: [2.0, 0.6, 1.4], at: [t.x, 0.3, t.z], color: '#8e6844' })
  s.push({ box: [1.9, 0.6, 1.3], at: [t.x, 0.9, t.z], color: '#cfe8f6' })
  s.push({ sphere: [0.55, 14, 8], at: [t.x, 0.75, t.z], scale: [1.3, 0.45, 1], color: '#6f7a4a' })
  s.push({ sphere: [0.16, 10, 8], at: [t.x + 0.78, 0.72, t.z], scale: [1.3, 0.8, 0.9], color: '#8a8f63' })
  // Willows on the island edge
  for (let i = 0; i < 5; i++) {
    const a = 0.6 + i * 1.1
    s.push(place(fluffyTreeShapes('willow', 2, i + 60), [x + Math.cos(a) * (rx - 0.6), 0, z + Math.sin(a) * (rz - 0.6)], a, 0.85))
  }
  return s
}

/** On the lakeside: Đài Nghiên gate (the ink slab on a toad), Tháp Bút (the brush tower). */
function shoreShapes(): ShapeItem[] {
  const s: ShapeItem[] = []
  const { x } = N.bridge
  const gz = N.shoreGateZ
  for (const k of [-1, 1]) {
    s.push({ box: [0.45, 2.6, 0.45], at: [x + k * 1.2, 1.3, gz], color: '#cfc8bb' })
    s.push({ sphere: [0.26, 8, 6], at: [x + k * 1.2, 2.75, gz], color: '#cfc8bb' })
  }
  s.push({ box: [2.9, 0.4, 0.5], at: [x, 2.5, gz], color: '#bdb5a5' })
  // The ink slab (Đài Nghiên) on top
  s.push({ box: [1.2, 0.18, 0.7], at: [x, 2.85, gz], rot: [0, 0, 0.08], color: '#8a8f80' })
  // Tháp Bút: a stone obelisk on a little rock, a brush tip at the top
  const tb = N.penTower
  s.push({ ico: [1.1, 0], at: [tb.x, 0.2, tb.z], scale: [1, 0.45, 1], color: '#9a9a8a' })
  for (let i = 0; i < 5; i++) s.push({ box: [0.7 - i * 0.09, 1.0, 0.7 - i * 0.09], at: [tb.x, 0.9 + i * 1.0, tb.z], color: i % 2 ? '#cfc8bb' : STONE })
  s.push({ cyl: [0.0, 0.18, 0.7, 6], at: [tb.x, 5.75, tb.z], color: '#3a3a3a' })
  return s
}

const NAME_SIGN: SignOptions = { title: 'ĐỀN NGỌC SƠN', subtitle: 'Thê Húc kiều · Đắc Nguyệt lầu', background: RED, border: GOLD, color: '#ffe08a', accent: '#ffffff', aspect: 5 }
const INCENSE: SpotAction[] = [{ id: 'incense', labelKey: 'action.incense', icon: 'incense', action: 'place.incense', primary: true }]

export const NgocSon = memo(function NgocSon() {
  const bridge = useMemo(bridgeShapes, [])
  const island = useMemo(islandShapes, [])
  const shore = useMemo(shoreShapes, [])
  const { x, z0, z1, width } = N.bridge
  const len = z1 - z0
  const seg = len / SEGMENTS
  const I = N.island
  return (
    <>
      <Shapes shapes={bridge} />
      <Shapes shapes={island} />
      <Shapes shapes={shore} />
      <SignBoard options={NAME_SIGN} width={2.4} position={[x, 2.15, N.shoreGateZ + 0.27]} />
      <RigidBody type="fixed" colliders={false}>
        {/* Walkable deck: one tilted box per segment, plus railings as invisible walls */}
        {Array.from({ length: SEGMENTS }, (_, i) => {
          const t0 = i / SEGMENTS
          const t1 = (i + 1) / SEGMENTS
          const y0 = deckY(t0)
          const y1 = deckY(t1)
          const pitch = Math.atan2(y1 - y0, seg)
          const z = z0 + len * ((t0 + t1) / 2)
          return <CuboidCollider key={i} args={[width / 2, 0.08, seg / 2 + 0.03]} position={[x, (y0 + y1) / 2 - 0.02, z]} rotation={[-pitch, 0, 0]} />
        })}
        {[-1, 1].map((k) => (
          <CuboidCollider key={k} args={[0.08, 1.5, len / 2]} position={[x + k * (width / 2 + 0.05), 1.2, (z0 + z1) / 2]} collisionGroups={PROP_GROUPS} />
        ))}
        {/* Island edge: a ring of walls (12 boxes around the ellipse) with the bridge gap */}
        {Array.from({ length: 16 }, (_, i) => {
          const a = (i / 16) * Math.PI * 2
          if (Math.abs(Math.sin(a) + 1) < 0.08) return null // the bridge side (north, -Z)
          const px = I.x + Math.cos(a) * (I.rx + 0.25)
          const pz = I.z + Math.sin(a) * (I.rz + 0.25)
          return <CuboidCollider key={i} args={[0.25, 1.5, 1.6]} position={[px, 1.2, pz]} rotation={[0, -a, 0]} collisionGroups={PROP_GROUPS} />
        })}
        {/* Gate pillars, urn, lanterns, banyan, turtle pavilion, the temple hall, Tháp Bút */}
        {[-1, 1].map((k) => (
          <CuboidCollider key={`g${k}`} args={[0.22, 1.4, 0.22]} position={[x + k * 1.25, 1.4, N.gateZ]} collisionGroups={PROP_GROUPS} />
        ))}
        {[-1, 1].map((k) => (
          <CuboidCollider key={`s${k}`} args={[0.24, 1.4, 0.24]} position={[x + k * 1.2, 1.4, N.shoreGateZ]} collisionGroups={PROP_GROUPS} />
        ))}
        <CylinderCollider args={[0.6, 0.65]} position={[N.urn.x, 0.6, N.urn.z]} collisionGroups={PROP_GROUPS} />
        {[-1, 1].map((k) => (
          <CuboidCollider key={`l${k}`} args={[0.25, 0.8, 0.25]} position={[x + k * 2.6, 0.8, N.urn.z + 0.6]} collisionGroups={PROP_GROUPS} />
        ))}
        <CylinderCollider args={[1, 0.85]} position={[N.banyan.x, 1, N.banyan.z]} collisionGroups={PROP_GROUPS} />
        <CuboidCollider args={[1.05, 0.9, 0.75]} position={[N.turtle.x, 0.9, N.turtle.z]} collisionGroups={PROP_GROUPS} />
        <CuboidCollider args={[N.hall.w / 2, 2, (N.hall.d - 1.2) / 2]} position={[x, 2, N.hall.z - 0.5]} collisionGroups={BUILDING_GROUPS} />
        <CylinderCollider args={[2.8, 0.9]} position={[N.penTower.x, 2.8, N.penTower.z]} collisionGroups={BUILDING_GROUPS} />
      </RigidBody>
      <ActionSpot id="vn-ngocson" name={{ vi: 'Đền Ngọc Sơn', en: 'Ngọc Sơn Temple', de: 'Ngọc-Sơn-Tempel' }} zone={{ x: N.urn.x, z: N.urn.z + 1.2, halfX: 1.4, halfZ: 0.9 }} actions={INCENSE} />
      <NPC def={NPCS.cuTu} at={{ x: x + 1.8, z: N.hall.z + N.hall.d / 2 + 0.9 }} yaw={Math.PI} zone={{ x: x + 1.8, z: N.hall.z + N.hall.d / 2 + 0.2, halfX: 1.2, halfZ: 1.0 }} />
      <NPC def={NPCS.duKhach} at={{ x: x - 2.4, z: N.urn.z - 1.2 }} yaw={2.4} />
      <NPC def={NPCS.duKhach2} at={{ x: N.turtle.x - 1.6, z: N.turtle.z + 0.2 }} yaw={1.4} />
    </>
  )
})
