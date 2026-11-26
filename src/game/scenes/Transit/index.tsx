import { memo, useMemo } from 'react'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { gateFlight, hhmm, rowStatus, STATUS_TEXT, type FlightPlan } from '../../../data/flight'
import { NPCS, type Outfit } from '../../../data/npcs'
import { useFlags } from '../../../store/flagsStore'
import { useTime } from '../../../store/timeStore'
import { ActionSpot, type SpotAction } from '../../components/ActionSpot'
import { NPC } from '../../components/npc/NPC'
import { PROP_GROUPS } from '../../systems/collisionGroups'
import { currentFlightPlan } from '../../systems/flight'
import { guest, helper } from '../ShopRoom/people'
import { LabelSheet, signDraw, SIGN_SANS, type Label } from '../shared/LabelSheet'
import { groundMaterial } from '../shared/materials'
import { Shapes, type ShapeItem } from '../shared/Shapes'
import { GATE_SPOTS, T } from './layout'

/**
 * 1.43 Transit in Frankfurt (systems/flight.ts): follow "Anschlussflüge" (not "Ausgang"), pass the Passkontrolle at the
 * "Alle Pässe" desk, read the departures board, find the gate of your connecting flight to München.
 */

const C = {
  floor: '#dfe2e7',
  floorAlt: '#d2d7de',
  wall: '#f1f2f4',
  wallLow: '#c9ced6',
  steel: '#a9b1bd',
  dark: '#2a3140',
  glass: '#a9c4e6',
  frame: '#7d889a',
  seat: '#3d6fa8',
  yellow: '#ffd23f',
  ink: '#1d2433',
  green: '#1f8a4c',
  wood: '#c9a27a',
}

/** Signs at German airports: yellow with dark text for flights and gates, green for the way out. */
const YELLOW = { bg: C.yellow, fg: C.ink }

function floorShapes(): ShapeItem[] {
  const s: ShapeItem[] = []
  const rect = (x0: number, x1: number, z0: number, z1: number) => {
    s.push({ box: [x1 - x0, 0.04, z1 - z0], at: [(x0 + x1) / 2, 0.02, (z0 + z1) / 2], color: C.floor })
    // a soft tile grid: darker lines every 2 m
    for (let x = Math.ceil(x0 / 2) * 2; x < x1; x += 2) s.push({ box: [0.04, 0.042, z1 - z0], at: [x, 0.021, (z0 + z1) / 2], color: C.floorAlt })
    for (let z = Math.ceil(z0 / 2) * 2; z < z1; z += 2) s.push({ box: [x1 - x0, 0.042, 0.04], at: [(x0 + x1) / 2, 0.021, z], color: C.floorAlt })
  }
  const { corridor: co, control: ct, hall: h, pierG, pierH, pierEnd } = T
  rect(co.x0, co.x1, co.z0, co.z1)
  rect(ct.x0, ct.x1, ct.z0, ct.z1)
  rect(h.x0, h.x1, h.z0, h.z1)
  rect(pierG.x0, pierG.x1, pierEnd, h.z0)
  rect(pierH.x0, pierH.x1, pierEnd, h.z0)
  // A yellow guide line from the corridor through the control to the hall
  s.push({ box: [0.18, 0.045, co.z1 - ct.z0 - 1], at: [0, 0.023, (co.z1 + ct.z0) / 2], color: '#e8c547' })
  // Stage under everything
  s.push({ box: [34, 0.2, 46], at: [0, -0.1, -4], color: '#b9c0ca' })
  return s
}

function hallShapes(): ShapeItem[] {
  const s: ShapeItem[] = []
  const { corridor: co, control: ct, hall: h, pierG, pierH, pierEnd, euLane, allLane, board } = T
  const wallX = (x: number, z0: number, z1: number, hgt = 2.8, color = C.wall) => s.push({ box: [0.25, hgt, z1 - z0], at: [x, hgt / 2, (z0 + z1) / 2], color })
  const wallZ = (z: number, x0: number, x1: number, hgt = 1.1, color = C.wallLow) => s.push({ box: [x1 - x0, hgt, 0.25], at: [(x0 + x1) / 2, hgt / 2, z], color })
  // Arrival corridor (the exit doors in its left wall), its low far end
  wallX(co.x0, co.z0, T.exit.z - 0.7)
  wallX(co.x0, T.exit.z + 0.7, co.z1)
  wallX(co.x1, co.z0, co.z1)
  wallZ(co.z1, co.x0, co.x1, 0.9)
  // Frosted glass exit doors (closed for you: your suitcase flies on to München)
  s.push({ box: [0.12, 2.3, 1.4], at: [co.x0, 1.15, T.exit.z], color: '#cfe3ee' })
  s.push({ box: [0.14, 2.3, 0.05], at: [co.x0, 1.15, T.exit.z], color: C.frame })
  s.push({ box: [0.3, 0.25, 1.5], at: [co.x0, 2.4, T.exit.z], color: C.green })
  // Passkontrolle room: low back wall beside the corridor, tall side walls
  wallZ(ct.z1, ct.x0, co.x0)
  wallZ(ct.z1, co.x1, ct.x1)
  wallX(ct.x0, ct.z0, ct.z1)
  wallX(ct.x1, ct.z0, ct.z1)
  // The barrier: glass half walls with lanes and booths
  const glassZ = (x0: number, x1: number) => {
    s.push({ box: [x1 - x0, 0.5, 0.12], at: [(x0 + x1) / 2, 0.25, ct.z0], color: C.steel })
    s.push({ box: [x1 - x0, 0.6, 0.06], at: [(x0 + x1) / 2, 0.8, ct.z0], color: '#c6dcef' })
    s.push({ box: [x1 - x0, 0.06, 0.14], at: [(x0 + x1) / 2, 1.12, ct.z0], color: C.frame })
  }
  glassZ(ct.x0, euLane.x - euLane.half)
  glassZ(euLane.x + 2.0, allLane.x - allLane.half)
  glassZ(allLane.x + 2.0, ct.x1)
  for (const lane of [euLane, allLane]) {
    const bx = lane.x + 1.3
    // booth: a desk toward the lane, low walls, a little roof frame
    s.push({ box: [0.5, 1.05, 1.3], at: [lane.x + 0.85, 0.52, ct.z0], color: '#e6e9ee' })
    s.push({ box: [0.56, 0.05, 1.36], at: [lane.x + 0.85, 1.07, ct.z0], color: C.wood })
    s.push({ box: [1.4, 1.2, 0.08], at: [bx, 0.6, ct.z0 - 0.66], color: C.wallLow })
    s.push({ box: [0.08, 1.2, 1.4], at: [lane.x + 2.0, 0.6, ct.z0], color: C.wallLow })
    s.push({ box: [1.5, 0.08, 1.5], at: [bx, 2.3, ct.z0], color: C.frame })
    for (const px of [lane.x + 0.6, lane.x + 2.0]) for (const pz of [ct.z0 - 0.7, ct.z0 + 0.7]) s.push({ box: [0.06, 2.3, 0.06], at: [px, 1.15, pz], color: C.frame })
    // queue posts with belts (solid: see QUEUE / Colliders)
    for (const z of [QUEUE.z0, (QUEUE.z0 + QUEUE.z1) / 2, QUEUE.z1]) {
      for (const dx of [-QUEUE.dx, QUEUE.dx]) {
        s.push({ cyl: [0.04, 0.04, 0.95, 6], at: [lane.x + dx, 0.47, z], color: C.steel })
        s.push({ cyl: [0.12, 0.12, 0.04, 8], at: [lane.x + dx, 0.02, z], color: C.steel })
      }
    }
    for (const dx of [-QUEUE.dx, QUEUE.dx]) s.push({ box: [0.03, 0.06, QUEUE.z1 - QUEUE.z0], at: [lane.x + dx, 0.9, (QUEUE.z0 + QUEUE.z1) / 2], color: '#2c3e66' })
  }
  // A closed booth between the lanes
  s.push({ box: [1.2, 1.05, 0.9], at: [0, 0.52, ct.z0], color: '#e6e9ee' })
  // Transit hall: tall side walls, low front segments beside the control room
  wallX(h.x0, h.z0, h.z1)
  wallX(h.x1, h.z0, h.z1)
  wallZ(h.z1, h.x0, ct.x0)
  wallZ(h.z1, ct.x1, h.x1)
  // The departures board on its pylon
  s.push({ box: [5.6, 3.6, 0.3], at: [board.x, 1.8, board.z - 0.2], color: C.dark })
  s.push({ box: [5.8, 0.1, 0.4], at: [board.x, 3.62, board.z - 0.2], color: C.frame })
  // Duty free (left) and the Brezel & coffee bar (right)
  s.push({ box: [4, 0.05, 4.4], at: [-11.6, 0.03, -3.2], color: '#e9dcc8' })
  for (let i = 0; i < 3; i++) {
    s.push({ box: [0.5, 1.7, 3.6], at: [-13.3 + i * 1.5, 0.85, -3.4], color: '#f7f2ea' })
    for (let k = 0; k < 4; k++) for (let j = 0; j < 6; j++) s.push({ box: [0.3, 0.22, 0.32], at: [-13.3 + i * 1.5, 0.35 + k * 0.4, -5 + j * 0.6], color: ['#c8322b', '#2f5d9a', '#f4c04e', '#5b8f6a', '#8c6a9e'][(i + k + j) % 5] })
  }
  s.push({ box: [3.2, 1.0, 0.7], at: [11.4, 0.5, -1.6], color: C.wood })
  s.push({ box: [3.3, 0.06, 0.8], at: [11.4, 1.02, -1.6], color: '#f2ede4' })
  s.push({ box: [3.2, 2.4, 0.3], at: [11.4, 1.2, -4.6], color: '#7a4a2a' })
  for (let i = 0; i < 6; i++) s.push({ torus: [0.14, 0.05, 6, 12], at: [10.2 + i * 0.48, 1.12, -1.55], rot: [Math.PI / 2, 0, 0], color: '#b06a2a' })
  s.push({ box: [0.5, 0.6, 0.4], at: [12.6, 1.35, -1.75], color: '#2a2a30' })
  // Chairs: rows of joined airport seats
  const chairs = (x: number, z: number, n: number, rotY = 0) => {
    const g: ShapeItem[] = []
    for (let i = 0; i < n; i++) {
      const cx = (i - (n - 1) / 2) * 0.62
      g.push({ box: [0.56, 0.08, 0.5], at: [cx, 0.45, 0], color: C.seat })
      g.push({ box: [0.56, 0.5, 0.07], at: [cx, 0.74, -0.24], rot: [-0.1, 0, 0], color: C.seat })
    }
    g.push({ box: [n * 0.62, 0.06, 0.08], at: [0, 0.3, 0], color: C.steel })
    for (const lx of [-(n * 0.62) / 2 + 0.2, (n * 0.62) / 2 - 0.2]) g.push({ box: [0.06, 0.3, 0.4], at: [lx, 0.15, 0], color: C.steel })
    s.push({ group: g, at: [x, 0, z], rot: [0, rotY, 0] })
  }
  chairs(-6.5, -5.6, 5)
  chairs(6.5, -5.6, 5)
  chairs(-6.5, 0.6, 4, Math.PI)
  chairs(6.5, 0.6, 4, Math.PI)
  // Central block between the piers (lounge walls), pier walls with big windows to the apron
  s.push({ box: [12, 3.0, 16], at: [0, 1.5, (h.z0 + pierEnd) / 2], color: '#e4e7eb' })
  s.push({ box: [12.2, 0.2, 0.3], at: [0, 3.0, h.z0 + 0.1], color: C.frame })
  for (const x of [pierG.x0, pierH.x1]) {
    const side = Math.sign(x)
    s.push({ box: [0.25, 0.7, pierEnd - h.z0], at: [x, 0.35, (h.z0 + pierEnd) / 2], color: C.wallLow })
    s.push({ box: [0.12, 2.1, h.z0 - pierEnd], at: [x, 1.75, (h.z0 + pierEnd) / 2], color: C.glass })
    s.push({ box: [0.3, 0.2, h.z0 - pierEnd], at: [x, 2.9, (h.z0 + pierEnd) / 2], color: C.frame })
    for (let z = h.z0; z >= pierEnd - 0.01; z -= 2) s.push({ box: [0.2, 2.9, 0.12], at: [x, 1.45, z], color: C.frame })
    // planes waiting outside
    for (const pz of [-12, -20]) {
      s.push({ cyl: [1.3, 1.3, 11, 14], at: [x + side * 7, 1.0, pz], rot: [0, 0, Math.PI / 2], color: '#f4f6f9' })
      s.push({ sphere: [1.3, 14, 10], at: [x + side * 1.6, 1.0, pz], scale: [1.4, 1, 1], color: '#f4f6f9' })
      s.push({ box: [0.2, 2.4, 1.8], at: [x + side * 12, 2.8, pz], color: '#2f8f83' })
    }
    // apron outside
    s.push({ box: [16, 0.1, 30], at: [x + side * 8.2, -0.6, -16], color: '#4a5263' })
  }
  wallZ(pierEnd, pierG.x0, pierG.x1, 2.8, C.wall)
  wallZ(pierEnd, pierH.x0, pierH.x1, 2.8, C.wall)
  // Gates: a counter along the outer wall, chairs facing the windows on the inner side
  for (const g of GATE_SPOTS) {
    s.push({ box: [0.7, 1.05, 2.0], at: [g.x, 0.52, g.z], color: '#e6e9ee' })
    s.push({ box: [0.78, 0.05, 2.06], at: [g.x, 1.07, g.z], color: C.wood })
    s.push({ box: [0.1, 0.6, 0.5], at: [g.x - g.side * 0.25, 1.35, g.z - 0.5], color: C.dark })
    s.push({ box: [0.05, 2.3, 0.05], at: [g.x - g.side * 0.9, 1.15, g.z + 1.06], color: C.steel })
    chairs(g.side * 7.8, g.z - 0.2, 4, g.side > 0 ? Math.PI / 2 : -Math.PI / 2)
  }
  return s
}

/** The queue belts in front of the two passport lanes (z range, half width): solid, so nobody walks through them. */
const QUEUE = { z0: T.control.z0 + 1.1, z1: T.control.z1 - 1.3, dx: 0.75 }

function Colliders({ passed }: { passed: boolean }) {
  const { corridor: co, control: ct, hall: h, pierG, pierH, pierEnd, euLane, allLane, board } = T
  const b = (x0: number, x1: number, z0: number, z1: number, key: string) => (
    <CuboidCollider key={key} args={[(x1 - x0) / 2, 1.3, (z1 - z0) / 2]} position={[(x0 + x1) / 2, 1.3, (z0 + z1) / 2]} collisionGroups={PROP_GROUPS} />
  )
  const t = 0.15
  const list = [
    b(co.x0 - t, co.x0 + t, co.z0, co.z1, 'coL'),
    b(co.x1 - t, co.x1 + t, co.z0, co.z1, 'coR'),
    b(co.x0, co.x1, co.z1 - t, co.z1 + t, 'coEnd'),
    b(ct.x0, co.x0, ct.z1 - t, ct.z1 + t, 'ctBL'),
    b(co.x1, ct.x1, ct.z1 - t, ct.z1 + t, 'ctBR'),
    b(ct.x0 - t, ct.x0 + t, ct.z0, ct.z1, 'ctL'),
    b(ct.x1 - t, ct.x1 + t, ct.z0, ct.z1, 'ctR'),
    // barrier + booths
    b(ct.x0, euLane.x - euLane.half, ct.z0 - 0.3, ct.z0 + 0.3, 'bar1'),
    b(euLane.x + euLane.half, allLane.x - allLane.half, ct.z0 - 0.75, ct.z0 + 0.75, 'bar2'),
    b(allLane.x + allLane.half, ct.x1, ct.z0 - 0.75, ct.z0 + 0.75, 'bar3'),
    b(euLane.x - euLane.half, euLane.x + euLane.half, ct.z0 - 0.3, ct.z0 + 0.3, 'euGate'),
    // queue belts (user 1.43: "đi xuyên qua rào chắn")
    ...[euLane, allLane].flatMap((lane) => [-QUEUE.dx, QUEUE.dx].map((dx) => b(lane.x + dx - 0.06, lane.x + dx + 0.06, QUEUE.z0, QUEUE.z1, `q${lane.x}${dx}`))),
    // hall
    b(h.x0 - t, h.x0 + t, pierEnd, h.z1, 'hL'),
    b(h.x1 - t, h.x1 + t, pierEnd, h.z1, 'hR'),
    b(h.x0, ct.x0, h.z1 - t, h.z1 + t, 'hFL'),
    b(ct.x1, h.x1, h.z1 - t, h.z1 + t, 'hFR'),
    b(board.x - 2.9, board.x + 2.9, board.z - 0.4, board.z, 'board'),
    b(-13.6, -9.6, -5.4, -1.4, 'duty'),
    b(9.8, 13, -2.0, -1.2, 'bar'),
    b(9.6, 13.2, -4.8, -4.4, 'barBack'),
    b(-6, 6, pierEnd, h.z0, 'block'),
    b(pierG.x0, pierG.x1, pierEnd - t, pierEnd + t, 'gEnd'),
    b(pierH.x0, pierH.x1, pierEnd - t, pierEnd + t, 'hEnd'),
    b(-8.1, -4.9, -5.9, -5.3, 'ch1'),
    b(4.9, 8.1, -5.9, -5.3, 'ch2'),
    b(-7.8, -5.2, 0.3, 0.9, 'ch3'),
    b(5.2, 7.8, 0.3, 0.9, 'ch4'),
  ]
  for (const g of GATE_SPOTS) {
    list.push(b(g.x - 0.4, g.x + 0.4, g.z - 1.05, g.z + 1.05, `ct${g.id}`))
    list.push(b(g.side * 7.8 - 0.3, g.side * 7.8 + 0.3, g.z - 1.45, g.z + 1.05, `chg${g.id}`))
  }
  if (!passed) list.push(b(allLane.x - allLane.half, allLane.x + allLane.half, ct.z0 - 0.3, ct.z0 + 0.3, 'allGate'))
  return <RigidBody type="fixed" colliders={false}>{list}</RigidBody>
}

/** Little swing gates in the lanes (the "all passports" one opens once your passport is stamped). */
function LaneGates({ passed }: { passed: boolean }) {
  const shapes = useMemo<ShapeItem[]>(() => {
    const s: ShapeItem[] = []
    const lanes = passed ? [T.euLane] : [T.euLane, T.allLane]
    for (const lane of lanes) {
      for (const dx of [-0.3, 0.3]) s.push({ box: [0.56, 0.7, 0.05], at: [lane.x + dx, 0.6, T.control.z0], color: '#c8322b' })
    }
    return s
  }, [passed])
  return <Shapes shapes={shapes} castShadow={false} />
}

function staticLabels(): Label[] {
  const { corridor: co, control: ct, euLane, allLane, hall: h } = T
  const out: Label[] = []
  // At the corridor: the wrong way (green, left) and the right way (yellow, straight on)
  out.push({
    w: 4.0,
    h: 0.7,
    at: [0, 2.35, 13.4],
    draw: (ctx, W, H) => {
      ctx.fillStyle = C.green
      ctx.fillRect(0, 0, W / 2, H)
      ctx.fillStyle = C.yellow
      ctx.fillRect(W / 2, 0, W / 2, H)
      ctx.textBaseline = 'middle'
      ctx.textAlign = 'center'
      ctx.fillStyle = '#ffffff'
      ctx.font = `800 ${H * 0.36}px ${SIGN_SANS}`
      ctx.fillText('← Ausgang · Exit', W / 4, H * 0.36)
      ctx.font = `600 ${H * 0.24}px ${SIGN_SANS}`
      ctx.fillText('Gepäckausgabe · Baggage claim', W / 4, H * 0.74)
      ctx.fillStyle = C.ink
      ctx.font = `800 ${H * 0.36}px ${SIGN_SANS}`
      ctx.fillText('↓ Anschlussflüge', (W * 3) / 4, H * 0.36)
      ctx.font = `600 ${H * 0.24}px ${SIGN_SANS}`
      ctx.fillText('Flight connections · Transfer', (W * 3) / 4, H * 0.74)
    },
  })
  out.push({ w: 1.6, h: 0.42, at: [co.x0 + 0.17, 2.65, T.exit.z], rotY: Math.PI / 2, draw: signDraw({ bg: C.green, fg: '#ffffff', title: 'Ausgang · Exit', sub: 'Gepäckausgabe · Baggage claim' }) })
  out.push({ w: 3.4, h: 0.6, at: [0, 2.5, co.z0 + 0.6], draw: signDraw({ ...YELLOW, title: '↓ Anschlussflüge · Connections', sub: 'Passkontrolle · Passport control' }) })
  out.push({ w: 4.4, h: 0.62, at: [0, 2.55, ct.z1 - 0.4], draw: signDraw({ bg: C.dark, fg: '#ffffff', title: 'Passkontrolle', sub: 'Passport control · Kiểm soát hộ chiếu' }) })
  out.push({
    w: 1.9,
    h: 0.6,
    at: [euLane.x + 0.4, 2.45, ct.z0 + 0.75],
    draw: (ctx, W, H) => {
      ctx.fillStyle = '#1f4fa0'
      ctx.fillRect(0, 0, W, H)
      ctx.fillStyle = '#ffd23f'
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2
        ctx.beginPath()
        ctx.arc(H * 0.5 + Math.cos(a) * H * 0.3, H * 0.5 + Math.sin(a) * H * 0.3, H * 0.045, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.fillStyle = '#ffffff'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.font = `800 ${H * 0.36}px ${SIGN_SANS}`
      ctx.fillText('EU · EWR · CH', H * 1.0, H * 0.36)
      ctx.font = `600 ${H * 0.22}px ${SIGN_SANS}`
      ctx.fillText('Nur EU-Bürger · EU citizens only', H * 1.0, H * 0.74)
    },
  })
  out.push({ w: 1.9, h: 0.6, at: [allLane.x + 0.4, 2.45, ct.z0 + 0.75], draw: signDraw({ bg: '#ffffff', fg: C.ink, border: C.ink, title: 'Alle Pässe', sub: 'All passports · Mọi hộ chiếu' }) })
  out.push({ w: 1.1, h: 0.3, at: [0, 1.45, ct.z0 + 0.47], draw: signDraw({ bg: '#c8322b', fg: '#ffffff', title: 'Geschlossen · Closed' }) })
  out.push({ w: 3.4, h: 0.6, at: [-11.6, 2.4, -0.95], draw: signDraw({ bg: '#2f2f38', fg: '#ffd166', title: 'Duty Free', sub: 'Zollfrei einkaufen' }) })
  out.push({ w: 3.0, h: 0.6, at: [11.4, 2.55, -4.43], draw: signDraw({ bg: '#7a4a2a', fg: '#fff6e3', title: 'Brezel & Kaffee', sub: 'Bäckerei · Bakery' }) })
  // Where the piers start: G to the left, H to the right
  out.push({
    w: 8.6,
    h: 0.8,
    at: [0, 2.45, h.z0 + 0.3],
    draw: (ctx, W, H) => {
      ctx.fillStyle = C.yellow
      ctx.fillRect(0, 0, W, H)
      ctx.fillStyle = C.ink
      ctx.textBaseline = 'middle'
      ctx.font = `800 ${H * 0.5}px ${SIGN_SANS}`
      ctx.textAlign = 'left'
      ctx.fillText('←  G 10 – G 14', H * 0.3, H * 0.4)
      ctx.textAlign = 'right'
      ctx.fillText('H 27 – H 31  →', W - H * 0.3, H * 0.4)
      ctx.font = `600 ${H * 0.24}px ${SIGN_SANS}`
      ctx.textAlign = 'center'
      ctx.fillText('Flugsteige · Gates', W / 2, H * 0.42)
      ctx.fillText('Cổng ra máy bay', W / 2, H * 0.78)
    },
  })
  for (const [x, text] of [
    [-10, 'G 10 · G 12 · G 14'],
    [10, 'H 27 · H 29 · H 31'],
  ] as const) {
    out.push({ w: 3.2, h: 0.5, at: [x, 2.6, h.z0 - 0.3], draw: signDraw({ ...YELLOW, title: text }) })
  }
  // A gate number over each counter, readable as you walk down the pier
  for (const g of GATE_SPOTS) {
    out.push({ w: 1.3, h: 0.55, at: [g.x - g.side * 0.9, 2.45, g.z + 1.15], draw: signDraw({ ...YELLOW, title: `${g.id[0]} ${g.id.slice(1)}` }) })
  }
  return out
}

function boardDraw(plan: FlightPlan, now: number) {
  return (ctx: CanvasRenderingContext2D, W: number, H: number) => {
    ctx.fillStyle = '#10141d'
    ctx.fillRect(0, 0, W, H)
    const head = H * 0.14
    ctx.fillStyle = '#1d2433'
    ctx.fillRect(0, 0, W, head)
    ctx.fillStyle = '#ffd166'
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'left'
    ctx.font = `800 ${head * 0.62}px ${SIGN_SANS}`
    ctx.fillText('✈ Abflug · Departures', W * 0.02, head * 0.52)
    ctx.textAlign = 'right'
    ctx.fillText(hhmm(now), W * 0.98, head * 0.52)
    const cols = [0.02, 0.13, 0.27, 0.6, 0.71]
    const rowH = (H - head * 1.7) / plan.rows.length
    ctx.font = `600 ${head * 0.38}px ${SIGN_SANS}`
    ctx.fillStyle = '#9aa3b2'
    ctx.textAlign = 'left'
    ;['Zeit', 'Flug', 'Ziel · Destination', 'Gate', 'Bemerkung · Remarks'].forEach((t, i) => ctx.fillText(t, W * cols[i], head * 1.35))
    plan.rows.forEach((r, i) => {
      const y = head * 1.7 + rowH * (i + 0.5)
      if (i % 2) {
        ctx.fillStyle = '#161b26'
        ctx.fillRect(0, y - rowH / 2, W, rowH)
      }
      const st = rowStatus(r, now)
      ctx.fillStyle = st === 'departed' ? '#7a8294' : '#ffd166'
      ctx.font = `800 ${rowH * 0.56}px ${SIGN_SANS}`
      ctx.fillText(hhmm(r.time), W * cols[0], y)
      ctx.fillText(r.flight, W * cols[1], y)
      ctx.fillText(r.dest, W * cols[2], y)
      ctx.fillText(r.gate, W * cols[3], y)
      ctx.fillStyle = STATUS_TEXT[st].color
      ctx.font = `700 ${rowH * 0.5}px ${SIGN_SANS}`
      const remark = st === 'delayed' && r.delay ? `${STATUS_TEXT[st].de} ${hhmm(r.time + r.delay)}` : STATUS_TEXT[st].de
      ctx.fillText(remark, W * cols[4], y)
    })
  }
}

function gateDraw(plan: FlightPlan, gate: (typeof GATE_SPOTS)[number], now: number) {
  return (ctx: CanvasRenderingContext2D, W: number, H: number) => {
    const f = gateFlight(plan, gate.id, now)
    ctx.fillStyle = '#10141d'
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = C.yellow
    ctx.fillRect(0, 0, W, H * 0.3)
    ctx.fillStyle = C.ink
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'left'
    ctx.font = `800 ${H * 0.22}px ${SIGN_SANS}`
    ctx.fillText(`Gate ${gate.id}`, W * 0.05, H * 0.16)
    ctx.fillStyle = '#ffffff'
    if (!f) {
      ctx.font = `700 ${H * 0.18}px ${SIGN_SANS}`
      ctx.fillText('— kein Flug · no flight —', W * 0.05, H * 0.62)
      return
    }
    ctx.font = `800 ${H * 0.24}px ${SIGN_SANS}`
    ctx.fillText(f.dest, W * 0.05, H * 0.5)
    ctx.fillStyle = '#ffd166'
    ctx.font = `700 ${H * 0.17}px ${SIGN_SANS}`
    ctx.fillText(`${f.flight} · ${hhmm(f.time)}`, W * 0.05, H * 0.74)
    const st = rowStatus(f, now)
    ctx.fillStyle = STATUS_TEXT[st].color
    ctx.textAlign = 'right'
    ctx.fillText(STATUS_TEXT[st].de, W * 0.95, H * 0.9)
  }
}

/** The board and the gate screens: repainted every 5 game minutes (statuses change with the clock). */
function Screens({ plan }: { plan: FlightPlan }) {
  const bucket = useTime((s) => Math.floor(s.minutes / 5))
  const now = bucket * 5
  const labels = useMemo<Label[]>(
    () => [
      { w: 5.2, h: 2.6, at: [T.board.x, 2.1, T.board.z - 0.03], draw: boardDraw(plan, now) },
      ...GATE_SPOTS.map((g): Label => ({ w: 1.25, h: 0.72, at: [g.x - g.side * 0.9, 1.6, g.z + 1.15], draw: gateDraw(plan, g, now) })),
    ],
    [plan, now],
  )
  return <LabelSheet labels={labels} version={`${plan.seed}-${now}`} ppm={220} />
}

const EXIT: SpotAction[] = [{ id: 'exit', labelKey: 'action.exit', icon: 'door', action: 'flight.exitTrap', primary: true }]
const BOARD: SpotAction[] = [{ id: 'board', labelKey: 'action.readBoard', icon: 'board', action: 'flight.board', primary: true }]

const AGENT: Outfit = { skin: '#f6d6c0', hair: '#5b3a2c', hairStyle: 'bun', shirt: '#ffffff', shorts: '#23395b', shoe: '#2a2626', bag: null, accessory: null, top: 'long', bottom: 'skirt', neck: 'scarf', neckColor: '#ffd23f', lashes: true }
const AGENT2: Outfit = { skin: '#eec39f', hair: '#2a2020', hairStyle: 'short', shirt: '#ffffff', shorts: '#23395b', shoe: '#2a2626', bag: null, accessory: null, top: 'long', bottom: 'pants', neck: 'tie', neckColor: '#ffd23f' }
const AGENTS = GATE_SPOTS.map((g, i) => ({ g, def: helper('transit', `agent${g.id}`, i % 2 ? AGENT2 : AGENT) }))
const TRAVELLERS = [
  { def: guest('transit', 0, 5), path: { points: [{ x: -8, z: -0.8 }, { x: 8, z: -0.8 }], speed: 1.1, pauseSec: [1, 3] as [number, number] } },
  { def: guest('transit', 1, 12), path: { points: [{ x: -9.8, z: -9 }, { x: -9.8, z: -21.5 }], speed: 0.9, pauseSec: [2, 4] as [number, number] } },
  { def: guest('transit', 2, 7), path: { points: [{ x: 9.6, z: -21 }, { x: 9.6, z: -9.5 }], speed: 1.0, pauseSec: [1, 3] as [number, number] } },
]

const Transit = memo(function Transit() {
  const floor = useMemo(floorShapes, [])
  const hall = useMemo(hallShapes, [])
  const labels = useMemo(staticLabels, [])
  const passed = useFlags((s) => !!s.flags['fly.passport'])
  const seed = useFlags((s) => s.flags['fly.seed'])
  const plan = useMemo(() => currentFlightPlan(), [seed])
  const gates = useMemo(
    () =>
      GATE_SPOTS.map((g) => ({
        g,
        actions: [{ id: 'pass', labelKey: 'action.showPass', icon: 'ticket', action: 'flight.gate', arg: g.id, primary: true }] as SpotAction[],
        zone: { x: g.x - g.side * 1.35, z: g.z, halfX: 1.0, halfZ: 1.3 },
      })),
    [],
  )
  return (
    <>
      <Shapes shapes={floor} material={groundMaterial} castShadow={false} />
      <Shapes shapes={hall} />
      <LaneGates passed={passed} />
      <LabelSheet labels={labels} />
      <Screens plan={plan} />
      <Colliders passed={passed} />
      <ActionSpot id="transit-exit" name={{ vi: 'Ausgang · Lối ra (nhận hành lý)', en: 'Exit · Baggage claim' }} zone={{ x: T.exit.x + 0.8, z: T.exit.z, halfX: 0.8, halfZ: 0.9 }} actions={EXIT} />
      <ActionSpot id="transit-board" name={{ vi: 'Bảng điện tử · Abflug', en: 'Departures board' }} zone={{ x: T.board.x, z: T.board.z + 1.7, halfX: 2.9, halfZ: 1.4 }} actions={BOARD} />
      {gates.map(({ g, actions, zone }) => (
        <ActionSpot key={g.id} id={`gate-${g.id}`} name={{ vi: `Cổng ${g.id}`, en: `Gate ${g.id}`, de: `Flugsteig ${g.id}` }} zone={zone} actions={actions} />
      ))}
      <NPC def={NPCS.bpEu} at={{ x: T.euLane.x + 1.45, z: T.control.z0 }} yaw={-Math.PI / 2} zone={{ x: T.euLane.x, z: T.control.z0 + 1.0, halfX: 0.75, halfZ: 0.9 }} />
      <NPC def={NPCS.bpOfficer} at={{ x: T.allLane.x + 1.45, z: T.control.z0 }} yaw={-Math.PI / 2} zone={{ x: T.allLane.x, z: T.control.z0 + 1.0, halfX: 0.75, halfZ: 0.9 }} />
      {AGENTS.map(({ g, def }) => (
        <NPC key={def.id} def={def} at={{ x: g.x + g.side * 0.75, z: g.z }} yaw={g.side > 0 ? -Math.PI / 2 : Math.PI / 2} />
      ))}
      {TRAVELLERS.map((t) => (
        <NPC key={t.def.id} def={t.def} at={t.path.points[0]} path={t.path} yieldLines="yieldDe" />
      ))}
    </>
  )
})

export default Transit
