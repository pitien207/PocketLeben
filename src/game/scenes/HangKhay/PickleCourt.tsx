import { useMemo } from 'react'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { MeshLambertMaterial } from 'three'
import { ActionSpot, type SpotAction } from '../../components/ActionSpot'
import { PROP_GROUPS } from '../../systems/collisionGroups'
import { groundMaterial } from '../shared/materials'
import { modelShapes } from '../shared/models'
import { place } from '../shared/props'
import { Shapes, type ShapeItem } from '../shared/Shapes'
import { SignBoard } from '../shared/SignBoard'
import type { SignOptions } from '../shared/textures'
import { PICKLE } from './layout'

/**
 * 1.39 Sân pickleball Hàng Khay, in the north-west corner of Vườn hoa Hàng Khay: a blue court with its kitchen
 * zones on a green apron, a net, a low chain-link fence with a gate on the park side, benches and a sign. The
 * gate's spot opens the lobby (systems/pickleball.ts `pickle.open`; the match is the mini-game `pickleball`).
 * The court's long side runs along x. Real sizes: 13.41 × 6.10 m, kitchen 2.13 m each side of the net.
 */

const HALF_L = 6.705
const HALF_W = 3.05
const KITCHEN = 2.13
const LINE = 0.06
const FENCE_H = 1.9

const SIGN: SignOptions = { title: 'SÂN PICKLEBALL', subtitle: 'Đấu 1–1 · Mời bạn bè · Thắng anh Bảo', background: '#2f6fb1', color: '#ffffff', border: '#ffe08a', accent: '#ffe08a', aspect: 4.2 }

/** Netting: dark and see-through. */
const netMaterial = new MeshLambertMaterial({ color: '#1f252b', transparent: true, opacity: 0.5, depthWrite: false })
const chainMaterial = new MeshLambertMaterial({ color: '#2c4a3a', transparent: true, opacity: 0.28, depthWrite: false })

function groundShapes(): ShapeItem[] {
  const { x, z, hx, hz } = PICKLE
  const s: ShapeItem[] = []
  s.push({ box: [hx * 2, 0.02, hz * 2], at: [x, 0.036, z], color: '#4f9a6a' })
  s.push({ box: [HALF_L * 2, 0.012, HALF_W * 2], at: [x, 0.05, z], color: '#3e7fc1' })
  s.push({ box: [KITCHEN * 2, 0.012, HALF_W * 2], at: [x, 0.053, z], color: '#4c90d2' })
  const line = (cx: number, cz: number, lx: number, lz: number) => s.push({ box: [lx, 0.01, lz], at: [cx, 0.06, cz], color: '#ffffff' })
  for (const sx of [-1, 1]) {
    line(x + sx * HALF_L, z, LINE, HALF_W * 2 + LINE) // baselines
    line(x + sx * KITCHEN, z, LINE, HALF_W * 2) // kitchen lines
    line(x + sx * (KITCHEN + HALF_L) / 2, z, HALF_L - KITCHEN, LINE) // centre lines
  }
  for (const sz of [-1, 1]) line(x, z + sz * HALF_W, HALF_L * 2 + LINE, LINE) // sidelines
  return s
}

function solidShapes(): ShapeItem[] {
  const { x, z, hx, hz, gate } = PICKLE
  const s: ShapeItem[] = []
  const post = '#2c4a3a'
  // net posts + the white tape on top of the net
  for (const sz of [-1, 1]) s.push({ cyl: [0.045, 0.05, 0.95, 10], at: [x, 0.475, z + sz * (HALF_W + 0.3)], color: '#33363d' })
  s.push({ box: [0.05, 0.06, HALF_W * 2 + 0.6], at: [x, 0.88, z], color: '#f6f6f2' })
  // fence posts and rails (gate gap on the park side, +z)
  const posts: [number, number][] = []
  for (let px = x - hx; px <= x + hx + 0.01; px += hx / 4) {
    posts.push([px, z - hz])
    if (Math.abs(px - gate) > 1.2) posts.push([px, z + hz])
  }
  for (let pz = z - hz + hz / 2; pz < z + hz - 0.01; pz += hz / 2) {
    posts.push([x - hx, pz])
    posts.push([x + hx, pz])
  }
  posts.push([gate - 1.05, z + hz], [gate + 1.05, z + hz])
  for (const [px, pz] of posts) s.push({ cyl: [0.04, 0.045, FENCE_H, 8], at: [px, FENCE_H / 2, pz], color: post })
  const rail = (x0: number, x1: number, zz: number) => {
    for (const y of [FENCE_H, 0.95]) s.push({ box: [x1 - x0, 0.04, 0.04], at: [(x0 + x1) / 2, y, zz], color: post })
  }
  const railZ = (z0: number, z1: number, xx: number) => {
    for (const y of [FENCE_H, 0.95]) s.push({ box: [0.04, 0.04, z1 - z0], at: [xx, y, (z0 + z1) / 2], color: post })
  }
  rail(x - hx, x + hx, z - hz)
  rail(x - hx, gate - 1.05, z + hz)
  rail(gate + 1.05, x + hx, z + hz)
  railZ(z - hz, z + hz, x - hx)
  railZ(z - hz, z + hz, x + hx)
  // gate arch
  s.push({ box: [2.2, 0.08, 0.08], at: [gate, FENCE_H + 0.3, z + hz], color: post })
  for (const sx of [-1, 1]) s.push({ cyl: [0.05, 0.05, FENCE_H + 0.3, 8], at: [gate + sx * 1.05, (FENCE_H + 0.3) / 2, z + hz], color: post })
  // benches on the apron (north side), a ball basket and a paddle rack
  for (const bx of [-3.8, 3.8]) {
    const bench = modelShapes('bench1', { scale: 1.4, paint: { Wood: '#a3734f' } })
    if (bench) s.push(place(bench, [x + bx, 0.04, z - hz + 0.55], 0))
    else s.push({ box: [1.6, 0.45, 0.45], at: [x + bx, 0.25, z - hz + 0.55], color: '#a3734f' })
  }
  s.push({ cyl: [0.28, 0.24, 0.55, 12], at: [x - 1.3, 0.3, z - hz + 0.5], color: '#ffffff' })
  for (let i = 0; i < 6; i++) s.push({ sphere: [0.07, 8, 6], at: [x - 1.3 + ((i % 3) - 1) * 0.12, 0.6, z - hz + 0.45 + Math.floor(i / 3) * 0.12], color: '#e8f34a' })
  for (let i = 0; i < 3; i++) {
    s.push({ box: [0.26, 0.32, 0.03], at: [x + 1.2 + i * 0.34, 0.95, z - hz + 0.08], color: ['#ff7a59', '#4c90d2', '#9b6fd1'][i] })
    s.push({ box: [0.05, 0.2, 0.03], at: [x + 1.2 + i * 0.34, 0.7, z - hz + 0.08], color: '#4a3226' })
  }
  // sign posts by the gate
  for (const dx of [-1.25, 1.25]) s.push({ cyl: [0.05, 0.06, 2.6, 8], at: [gate + 3.2 + dx, 1.3, z + hz + 0.6], color: '#6b4a35' })
  return s
}

/** The see-through parts: the net and the chain-link panels. */
function netShapes(): { net: ShapeItem[]; chain: ShapeItem[] } {
  const { x, z, hx, hz, gate } = PICKLE
  const net: ShapeItem[] = [{ box: [0.02, 0.8, HALF_W * 2 + 0.6], at: [x, 0.47, z], color: '#ffffff' }]
  const chain: ShapeItem[] = []
  const panelX = (x0: number, x1: number, zz: number) => chain.push({ box: [x1 - x0, FENCE_H, 0.02], at: [(x0 + x1) / 2, FENCE_H / 2, zz], color: '#ffffff' })
  panelX(x - hx, x + hx, z - hz)
  panelX(x - hx, gate - 1.05, z + hz)
  panelX(gate + 1.05, x + hx, z + hz)
  for (const xx of [x - hx, x + hx]) chain.push({ box: [0.02, FENCE_H, hz * 2], at: [xx, FENCE_H / 2, z], color: '#ffffff' })
  return { net, chain }
}

export function PickleCourt() {
  const ground = useMemo(groundShapes, [])
  const solid = useMemo(solidShapes, [])
  const see = useMemo(netShapes, [])
  const { x, z, hx, hz, gate } = PICKLE
  const actions = useMemo<SpotAction[]>(() => [{ id: 'play', labelKey: 'action.pickleball', icon: 'start', action: 'pickle.open', primary: true }], [])
  return (
    <group>
      <Shapes shapes={ground} material={groundMaterial} castShadow={false} />
      <Shapes shapes={solid} />
      <Shapes shapes={see.net} material={netMaterial} castShadow={false} receiveShadow={false} />
      <Shapes shapes={see.chain} material={chainMaterial} castShadow={false} receiveShadow={false} />
      <SignBoard options={SIGN} width={2.9} position={[gate + 3.2, 2.15, z + hz + 0.66]} rotation={[0, 0, 0]} />
      <ActionSpot
        id="pickleball"
        name={{ vi: 'Sân pickleball', en: 'Pickleball court' }}
        zone={{ x: gate, z: z + hz + 0.4, halfX: 1.7, halfZ: 1.5 }}
        actions={actions}
        hit={{ at: [gate, 1.2, z + hz], size: [2.2, 2.4, 1.2] }}
      />
      {/* a second spot at the net, for players already on the court */}
      <ActionSpot id="pickleball-net" name={{ vi: 'Sân pickleball', en: 'Pickleball court' }} zone={{ x, z: z - HALF_W - 0.7, halfX: 2.4, halfZ: 0.9 }} actions={actions} />
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[hx, 1, 0.08]} position={[x, 1, z - hz]} collisionGroups={PROP_GROUPS} />
        <CuboidCollider args={[(gate - 1.05 - (x - hx)) / 2, 1, 0.08]} position={[(x - hx + gate - 1.05) / 2, 1, z + hz]} collisionGroups={PROP_GROUPS} />
        <CuboidCollider args={[(x + hx - (gate + 1.05)) / 2, 1, 0.08]} position={[(gate + 1.05 + x + hx) / 2, 1, z + hz]} collisionGroups={PROP_GROUPS} />
        <CuboidCollider args={[0.08, 1, hz]} position={[x - hx, 1, z]} collisionGroups={PROP_GROUPS} />
        <CuboidCollider args={[0.08, 1, hz]} position={[x + hx, 1, z]} collisionGroups={PROP_GROUPS} />
        {/* the net (low, you walk round it) */}
        <CuboidCollider args={[0.06, 0.5, HALF_W + 0.35]} position={[x, 0.5, z]} collisionGroups={PROP_GROUPS} />
      </RigidBody>
    </group>
  )
}
