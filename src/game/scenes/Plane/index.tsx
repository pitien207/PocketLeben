import { memo, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { LEG1, SEAT_LETTERS, TAKEN_SEATS, type SeatLetter } from '../../../data/flight'
import { NPCS } from '../../../data/npcs'
import type { InteractableDef } from '../../../store/interactionStore'
import { useInteractable } from '../../components/Interactable'
import { NPC } from '../../components/npc/NPC'
import { runAction } from '../../systems/actions'
import { PROP_GROUPS } from '../../systems/collisionGroups'
import { playerState } from '../../systems/playerState'
import { guest } from '../ShopRoom/people'
import { LabelSheet, signDraw, SIGN_SANS, type Label } from '../shared/LabelSheet'
import { groundMaterial } from '../shared/materials'
import { Shapes, type ShapeItem } from '../shared/Shapes'
import { BRIDGE, CABIN, ROWS, rowZ, seatAt, seatSpot, seatX, seatZone, SEAT_W } from './layout'

/**
 * 1.43 Boarding the first flight (systems/flight.ts): walk the jet bridge from gate 7, step through the front door,
 * find your seat by the row numbers over the aisle and sit down. A night flight: dark windows, the apron far below.
 */

const C = {
  wall: '#eef1f6',
  wallOut: '#f7f9fc',
  stripe: '#2f8f83',
  carpet: '#46557a',
  aisle: '#7a3b4b',
  seat: '#2f5d9a',
  seatDark: '#24497c',
  cover: '#f2f4f7',
  arm: '#9aa3b2',
  bin: '#f6f7fa',
  binLine: '#cfd6e0',
  window: '#1c2848',
  shade: '#dfe5ee',
  steel: '#b8c0cc',
  bridgeFloor: '#c9ced6',
  bridgeLow: '#7d889a',
  glass: '#2a3a5c',
  apron: '#252c3a',
  line: '#e8c547',
}

function cabinShapes(): ShapeItem[] {
  const s: ShapeItem[] = []
  const { halfW, front, tail, door, partitionZ } = CABIN
  const len = front - tail
  const midZ = (front + tail) / 2
  // Floor, aisle runner
  s.push({ box: [halfW * 2, 0.05, len], at: [0, 0.025, midZ], color: C.carpet })
  s.push({ box: [CABIN.aisle * 2, 0.055, partitionZ - tail - 1.2], at: [0, 0.03, (partitionZ + tail + 1.2) / 2], color: C.aisle })
  // Side walls (the −X one has the door gap), a teal cheat line outside, windows per row inside
  const wall = (x: number, z0: number, z1: number) => {
    s.push({ box: [0.2, 2.3, z1 - z0], at: [x, 1.15, (z0 + z1) / 2], color: C.wall })
    s.push({ box: [0.04, 0.16, z1 - z0], at: [x + Math.sign(x) * 0.12, 1.35, (z0 + z1) / 2], color: C.stripe })
  }
  wall(halfW + 0.1, tail, front)
  wall(-halfW - 0.1, tail, door[0])
  wall(-halfW - 0.1, door[1], front)
  // Door frame
  for (const z of door) s.push({ box: [0.3, 2.3, 0.1], at: [-halfW - 0.1, 1.15, z], color: C.steel })
  s.push({ box: [0.3, 0.2, door[1] - door[0] + 0.1], at: [-halfW - 0.1, 2.2, (door[0] + door[1]) / 2], color: C.steel })
  for (const row of ROWS) {
    for (const side of [-1, 1]) {
      const z = rowZ(row) + 0.25
      s.push({ box: [0.04, 0.46, 0.34], at: [side * (halfW - 0.005), 1.3, z], color: C.shade })
      s.push({ box: [0.05, 0.36, 0.26], at: [side * (halfW - 0.01), 1.28, z], color: C.window })
    }
  }
  // Front: a low bulkhead (the camera looks over it), galley counters, a trolley, the coffee corner
  s.push({ box: [halfW * 2 + 0.4, 1.0, 0.16], at: [0, 0.5, front + 0.08], color: C.wall })
  s.push({ box: [2.6, 0.95, 0.5], at: [1.2, 0.475, front - 0.3], color: C.steel })
  s.push({ box: [2.6, 0.04, 0.55], at: [1.2, 0.97, front - 0.3], color: '#dfe3ea' })
  s.push({ box: [0.4, 0.9, 0.6], at: [-0.2, 0.47, front - 0.35], color: '#c3cad6' })
  for (let i = 0; i < 4; i++) s.push({ box: [0.5, 0.18, 0.4], at: [0.4 + i * 0.6, 1.25, front - 0.25], color: i % 2 ? '#e7ebf1' : '#d4dae4' })
  // Partition in front of row 20 (both sides of the aisle) with a screen
  for (const side of [-1, 1]) {
    const x = side * (CABIN.aisle + (halfW - CABIN.aisle) / 2)
    s.push({ box: [halfW - CABIN.aisle, 1.6, 0.1], at: [x, 0.8, partitionZ], color: C.wall })
    s.push({ box: [0.9, 0.5, 0.03], at: [x, 1.2, partitionZ - 0.065], color: '#20283a' })
  }
  // Overhead bins along both walls, from the partition to the tail
  const binLen = partitionZ - tail - 1.2
  // (slim and high against the wall, so the follow camera still sees a passenger in the window seat)
  for (const side of [-1, 1]) {
    s.push({ box: [0.42, 0.34, binLen], at: [side * (halfW - 0.21), 2.14, partitionZ - binLen / 2], color: C.bin })
    s.push({ box: [0.04, 0.04, binLen], at: [side * (halfW - 0.44), 1.99, partitionZ - binLen / 2], color: C.binLine })
    // the rail the row numbers hang from
    s.push({ box: [0.05, 0.05, binLen], at: [side * 1.3, 1.78, partitionZ - binLen / 2], color: C.binLine })
    for (let z = partitionZ - 0.2; z > partitionZ - binLen; z -= 3.15) s.push({ box: [0.04, 0.36, 0.04], at: [side * 1.3, 1.96, z], color: C.binLine })
  }
  // Seats: pan, backrest with a white head cover, armrests, legs, a screen on the back for the row behind
  for (const row of ROWS) {
    const zr = rowZ(row)
    for (const l of SEAT_LETTERS) {
      const x = seatX(l as SeatLetter)
      s.push({ box: [SEAT_W - 0.06, 0.12, 0.46], at: [x, 0.42, zr - 0.02], color: C.seat })
      s.push({ box: [SEAT_W - 0.06, 0.78, 0.12], at: [x, 0.8, zr - 0.31], rot: [-0.12, 0, 0], color: C.seatDark })
      s.push({ box: [SEAT_W - 0.16, 0.2, 0.13], at: [x, 1.08, zr - 0.33], rot: [-0.12, 0, 0], color: C.cover })
      s.push({ box: [0.3, 0.18, 0.02], at: [x, 0.92, zr - 0.385], rot: [-0.12, 0, 0], color: '#1f2738' })
    }
    for (const side of [-1, 1]) {
      // four armrests per block of three, legs at the ends
      for (let k = 0; k < 4; k++) {
        const ax = side * (0.85 - SEAT_W / 2 + k * SEAT_W)
        s.push({ box: [0.06, 0.08, 0.42], at: [ax, 0.62, zr - 0.04], color: C.arm })
      }
      for (const lx of [0.75, 2.15]) s.push({ box: [0.05, 0.36, 0.34], at: [side * lx, 0.18, zr - 0.05], color: '#5a6272' })
    }
  }
  // Tail: two lavatories and the rear galley
  for (const side of [-1, 1]) {
    const x = side * (CABIN.aisle + (halfW - CABIN.aisle) / 2)
    s.push({ box: [halfW - CABIN.aisle, 2.1, 1.2], at: [x, 1.05, tail + 0.6], color: '#e3e7ee' })
    s.push({ box: [0.5, 1.6, 0.04], at: [x, 0.95, tail + 1.22], color: '#cfd6e0' })
  }
  s.push({ box: [CABIN.aisle * 2, 1.0, 0.5], at: [0, 0.5, tail + 0.25], color: C.steel })
  return s
}

/** Outside: the lower fuselage, wings with engines, the tail fin, the nose — and the apron far below. */
function outsideShapes(): ShapeItem[] {
  const s: ShapeItem[] = []
  const { halfW, front, tail } = CABIN
  const len = front - tail
  const midZ = (front + tail) / 2
  s.push({ box: [halfW * 2 + 0.4, 2.2, len], at: [0, -1.15, midZ], color: C.wallOut })
  s.push({ box: [halfW * 2 - 0.6, 0.6, len - 1], at: [0, -2.5, midZ], color: '#e4e8ee' })
  s.push({ sphere: [2.7, 18, 12], at: [0, -1.2, front + 2.4], scale: [1, 0.85, 1], color: C.wallOut })
  s.push({ box: [1.1, 0.42, 0.06], at: [-0.75, 0.62, front + 3.55], rot: [-0.8, 0, 0], color: '#1c2848' })
  s.push({ box: [1.1, 0.42, 0.06], at: [0.75, 0.62, front + 3.55], rot: [-0.8, 0, 0], color: '#1c2848' })
  for (const side of [-1, 1]) {
    s.push({ box: [11, 0.22, 3.6], at: [side * (halfW + 5.6), -0.35, -8.5], rot: [0, side * 0.28, side * 0.04], color: '#e8ecf2' })
    s.push({ cyl: [0.75, 0.75, 2.6, 16], at: [side * (halfW + 3.6), -1.2, -7.4], rot: [Math.PI / 2, 0, 0], color: '#d7dde6' })
    s.push({ cyl: [0.55, 0.55, 0.1, 16], at: [side * (halfW + 3.6), -1.2, -6.06], rot: [Math.PI / 2, 0, 0], color: '#2f3646' })
    s.push({ box: [4.2, 0.14, 1.8], at: [side * (halfW + 1.8), 0.5, tail - 1.6], rot: [0, side * 0.3, 0], color: '#e8ecf2' })
  }
  s.push({ box: [0.24, 4.2, 3.2], at: [0, 2.4, tail - 1.6], rot: [-0.35, 0, 0], color: C.stripe })
  s.push({ box: [0.26, 1.0, 1.2], at: [0, 3.4, tail - 2.3], rot: [-0.35, 0, 0], color: '#f4d06a' })
  s.push({ sphere: [2.4, 14, 10], at: [0, -1.4, tail - 1.8], scale: [1, 0.8, 1.2], color: C.wallOut })
  // Apron with lines and a baggage cart
  s.push({ box: [70, 0.2, 70], at: [0, -4.6, -2], color: C.apron })
  for (let i = -3; i <= 3; i++) s.push({ box: [0.25, 0.22, 60], at: [i * 9, -4.48, -2], color: i === 0 ? C.line : '#59627a' })
  s.push({ box: [3.4, 1.0, 1.8], at: [9, -4.0, 6], color: '#e7a33a' })
  s.push({ box: [3.0, 0.9, 1.6], at: [5.0, -4.05, 6.3], color: '#8a93a6' })
  return s
}

function bridgeShapes(): ShapeItem[] {
  const s: ShapeItem[] = []
  const { x0, x1, z0, z1, turnZ1 } = BRIDGE
  const doorX = -CABIN.halfW - 0.2
  // Floors: the long tube and the turn to the door
  s.push({ box: [x1 - x0, 0.06, z1 - z0], at: [(x0 + x1) / 2, 0.03, (z0 + z1) / 2], color: C.bridgeFloor })
  s.push({ box: [doorX - x1 + 0.1, 0.06, turnZ1 - z0], at: [(x1 + doorX) / 2, 0.03, (z0 + turnZ1) / 2], color: C.bridgeFloor })
  s.push({ box: [0.6, 0.065, z1 - z0 - 1], at: [(x0 + x1) / 2, 0.035, (z0 + z1) / 2 + 0.5], color: '#a8b0bd' })
  const glassWall = (x: number, za: number, zb: number) => {
    s.push({ box: [0.12, 0.9, zb - za], at: [x, 0.45, (za + zb) / 2], color: C.bridgeLow })
    s.push({ box: [0.08, 1.3, zb - za], at: [x, 1.55, (za + zb) / 2], color: C.glass })
    s.push({ box: [0.16, 0.12, zb - za], at: [x, 2.26, (za + zb) / 2], color: C.bridgeLow })
    for (let z = za; z <= zb + 0.01; z += 1.6) s.push({ box: [0.16, 2.3, 0.1], at: [x, 1.15, z], color: C.bridgeLow })
  }
  glassWall(x0 - 0.06, z0, z1)
  glassWall(x1 + 0.06, turnZ1, z1)
  // Turn: walls along x (low so the camera sees in)
  s.push({ box: [doorX - x0, 0.9, 0.12], at: [(x0 + doorX) / 2, 0.45, z0 - 0.06], color: C.bridgeLow })
  s.push({ box: [doorX - x1, 0.9, 0.12], at: [(x1 + doorX) / 2, 0.45, turnZ1 + 0.06], color: C.bridgeLow })
  // The gate end (where you come in) and the bridge's legs down to the apron
  s.push({ box: [x1 - x0 + 0.3, 0.9, 0.16], at: [(x0 + x1) / 2, 0.45, z1 + 0.08], color: '#9aa3b2' })
  for (const z of [5, 11]) {
    s.push({ box: [0.3, 4.6, 0.3], at: [(x0 + x1) / 2, -2.3, z], color: '#59627a' })
    s.push({ box: [1.6, 0.5, 0.8], at: [(x0 + x1) / 2, -4.3, z], color: '#3a4152' })
  }
  return s
}

/** Row numbers over the aisle, facing whoever walks in from the front: "27 · A B C". */
function rowLabels(): Label[] {
  const out: Label[] = []
  for (const row of ROWS) {
    for (const side of [1, -1]) {
      const letters = side > 0 ? 'A B C' : 'D E F'
      out.push({
        w: 0.62,
        h: 0.24,
        at: [side * 1.3, 1.62, rowZ(row) + 0.05],
        draw: (ctx, W, H) => {
          ctx.fillStyle = '#1f2738'
          ctx.fillRect(0, 0, W, H)
          ctx.fillStyle = '#ffffff'
          ctx.textBaseline = 'middle'
          ctx.textAlign = 'left'
          ctx.font = `800 ${H * 0.72}px ${SIGN_SANS}`
          ctx.fillText(String(row), W * 0.07, H * 0.55)
          ctx.fillStyle = '#ffd166'
          ctx.textAlign = 'right'
          ctx.font = `800 ${H * 0.5}px ${SIGN_SANS}`
          ctx.fillText(letters, W * 0.94, H * 0.55)
        },
      })
    }
  }
  const sign = (title: string, sub: string, at: [number, number, number], w: number, rotY = 0, bg = '#2f8f83'): Label => ({ w, h: w * 0.3, at, rotY, draw: signDraw({ bg, fg: '#ffffff', title, sub }) })
  out.push(sign(`${LEG1.flight} · ${LEG1.toCity}`, 'Sông Hồng Air · Cổng 7', [(BRIDGE.x0 + BRIDGE.x1) / 2, 2.1, BRIDGE.z1 - 0.1], 2.0))
  out.push(sign('Chào mừng quý khách', 'Willkommen an Bord · Welcome', [-CABIN.halfW - 0.36, 2.55, (CABIN.door[0] + CABIN.door[1]) / 2], 1.5, -Math.PI / 2))
  out.push(sign('Hàng 20 – 33 →', 'Reihen · Rows', [0, 1.95, CABIN.partitionZ + 0.07], 1.1, 0, '#1f2738'))
  out.push(sign('WC', '', [-1.55, 1.85, CABIN.tail + 1.25], 0.5, 0, '#1f2738'))
  out.push(sign('WC', '', [1.55, 1.85, CABIN.tail + 1.25], 0.5, 0, '#1f2738'))
  return out
}

function Colliders() {
  const { halfW, front, tail, door, partitionZ } = CABIN
  const { x0, x1, z0, z1, turnZ1 } = BRIDGE
  const doorX = -halfW - 0.2
  const box = (cx: number, cz: number, hx: number, hz: number, key: string, hy = 1.2) => (
    <CuboidCollider key={key} args={[hx, hy, hz]} position={[cx, hy, cz]} collisionGroups={PROP_GROUPS} />
  )
  const list = [
    box(halfW + 0.15, (front + tail) / 2, 0.15, (front - tail) / 2 + 0.3, 'wr'),
    box(-halfW - 0.15, (tail + door[0]) / 2, 0.15, (door[0] - tail) / 2, 'wl1'),
    box(-halfW - 0.15, (door[1] + front) / 2 + 0.15, 0.15, (front - door[1]) / 2 + 0.15, 'wl2'),
    box(0, front + 0.1, halfW + 0.3, 0.15, 'front'),
    box(0, tail - 0.1, halfW + 0.3, 0.15, 'tail'),
    box(1.2, front - 0.3, 1.3, 0.28, 'galley'),
    box(-0.2, front - 0.35, 0.2, 0.3, 'oven'),
    box((CABIN.aisle + halfW) / 2, partitionZ, (halfW - CABIN.aisle) / 2, 0.06, 'pr'),
    box(-(CABIN.aisle + halfW) / 2, partitionZ, (halfW - CABIN.aisle) / 2, 0.06, 'pl'),
    box((CABIN.aisle + halfW) / 2, tail + 0.6, (halfW - CABIN.aisle) / 2, 0.6, 'lavR'),
    box(-(CABIN.aisle + halfW) / 2, tail + 0.6, (halfW - CABIN.aisle) / 2, 0.6, 'lavL'),
    box(0, tail + 0.25, CABIN.aisle, 0.25, 'rearGalley'),
    // Jet bridge
    box(x0 - 0.1, (z0 + z1) / 2, 0.1, (z1 - z0) / 2 + 0.2, 'bx0'),
    box(x1 + 0.1, (turnZ1 + z1) / 2, 0.1, (z1 - turnZ1) / 2, 'bx1'),
    box((x0 + x1) / 2, z1 + 0.15, (x1 - x0) / 2 + 0.2, 0.12, 'bend'),
    box((x0 + doorX) / 2, z0 - 0.12, (doorX - x0) / 2 + 0.2, 0.12, 'tz0'),
    box((x1 + doorX) / 2, turnZ1 + 0.12, (doorX - x1) / 2, 0.12, 'tz1'),
  ]
  // Backrests: one thin block per row and side (you can step into a row, the seats in front stop you)
  for (const row of ROWS) {
    for (const side of [-1, 1]) {
      list.push(box(side * (0.85 + SEAT_W), rowZ(row) - 0.31, SEAT_W * 1.5, 0.06, `br${row}${side}`, 0.55))
    }
  }
  return <RigidBody type="fixed" colliders={false}>{list}</RigidBody>
}

/** Offers "Sit down" for the seat you stand next to (one interactable that follows you). */
function SeatPicker() {
  const [seat, setSeat] = useState<string | null>(null)
  const last = useRef<string | null>(null)
  const frame = useRef(0)
  useFrame(() => {
    if (++frame.current % 4) return
    const p = playerState.position
    const s = playerState.locked ? null : seatAt(p.x, p.z)
    const free = s && !TAKEN_SEATS.includes(s) ? s : null
    if (free !== last.current) {
      last.current = free
      setSeat(free)
    }
  })
  const def = useMemo<InteractableDef | null>(
    () =>
      seat
        ? {
            id: 'plane-seat',
            name: { vi: `Ghế ${seat}`, en: `Seat ${seat}` },
            zone: seatZone(seat),
            priority: 1,
            actions: [{ id: 'sit', labelKey: 'action.sitSeat', icon: 'seat', primary: true, onPress: () => runAction('plane.sit', seat) }],
          }
        : null,
    [seat],
  )
  useInteractable(def)
  return null
}

const PASSENGERS = TAKEN_SEATS.map((code, i) => {
  const m = /^(\d+)([A-F])$/.exec(code)!
  return { def: guest('plane', i, i + 2), at: seatSpot(Number(m[1]), m[2] as SeatLetter) }
})

const Plane = memo(function Plane() {
  const cabin = useMemo(cabinShapes, [])
  const outside = useMemo(outsideShapes, [])
  const bridge = useMemo(bridgeShapes, [])
  const labels = useMemo(rowLabels, [])
  return (
    <>
      <Shapes shapes={cabin} />
      <Shapes shapes={bridge} />
      <Shapes shapes={outside} material={groundMaterial} castShadow={false} />
      <LabelSheet labels={labels} />
      <Colliders />
      <SeatPicker />
      <NPC def={NPCS.tiepVien} at={{ x: -1.3, z: 2.55 }} yaw={-1.9} zone={{ x: -1.6, z: 1.6, halfX: 1.0, halfZ: 1.0 }} />
      <NPC def={NPCS.tiepVien2} at={{ x: 0.0, z: CABIN.tail + 0.9 }} yaw={0} />
      {PASSENGERS.map((p) => (
        <NPC key={p.def.id} def={p.def} at={{ x: p.at.x, z: p.at.z }} yaw={0} seatY={CABIN.sitY} />
      ))}
    </>
  )
})

export default Plane
