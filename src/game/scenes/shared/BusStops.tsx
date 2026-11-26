import { memo, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CuboidCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier'
import type { Group } from 'three'
import { CONFIG } from '../../../data/config'
import { BUS_EDGE, BUS_STOPS, busLineOf, busStopsIn, type BusLine, type BusScene, type BusStop, type BusStopId } from '../../../data/transit'
import { ActionSpot, type SpotAction } from '../../components/ActionSpot'
import { PROP_GROUPS } from '../../systems/collisionGroups'
import { clearOccupant, gapAhead, setOccupant } from '../../systems/laneTraffic'
import { playerState } from '../../systems/playerState'
import { streetHorn } from '../../systems/audio'
import { busArrivals, busRuntime, type BusPhase } from '../../systems/transit'
import { LabelSheet, SIGN_SANS, type Label } from './LabelSheet'
import { libraryCarShapes } from './libraryCars'
import { glowMaterial } from './materials'
import { modelShapes } from './models'
import { Shapes, type ShapeItem } from './Shapes'
import { TICKET_ACTIONS, ticketMachineLabels, ticketMachineShapes, ticketMachineZone } from './ticketMachine'

/** 1.49 München stops have a ticket machine beside the shelter (downstream end, toward the back of the pavement). */
const machineAt = (st: BusStop) => ({ x: st.x + st.lane.dir * 2.45, z: st.z - st.face * 0.5, rotY: st.face > 0 ? 0 : Math.PI })

/**
 * 1.48 Bus stops (data/transit.ts) for one city scene: shelter (poly.pizza "Bus Stop" by Zsky, CC-BY 3.0), stop sign,
 * timetable, the bus bay painted in the lane, and each stop's own bus (poly.pizza "Montreal Bus" by Nick Ladd, CC-BY 3.0,
 * repainted per city) that drives in along the kerb lane, waits with its doors open, and drives off. Cars queue behind
 * it (systems/laneTraffic.ts). Boarding: ActionSpot → `bus.board` → ui/TransitPanel.tsx.
 */

const VN = { frame: '#2f7ac0', glass: '#cfe6f6', sign: '#1f5fae', bay: '#f2c230' }
const DE = { frame: '#69737f', glass: '#d7e6ee', sign: '#1f8a4c', bay: '#f2c230' }

/** Paint of the city bus per line: body, roof / front band, accents (the original Montreal colours → ours). */
function busPaint(line: BusLine): Record<string, string> {
  const vn = line.scene === 'vietnam'
  const body = line.color
  const light = vn ? '#f5ecd2' : '#f6f7f8'
  const accent = vn ? '#f2c230' : '#f6f7f8'
  return {
    '#a0a0a0': vn ? body : light,
    '#d0dadd': vn ? body : light,
    '#ebf2f0': light,
    '#ffffff': light,
    '#009ee6': vn ? accent : body,
    '#ffeb38': vn ? body : light,
    '#ff9b00': vn ? accent : body,
  }
}

function shelterShapes(stops: BusStop[], scene: BusScene): { s: ShapeItem[]; glow: ShapeItem[] } {
  const c = scene === 'vietnam' ? VN : DE
  const s: ShapeItem[] = []
  const glow: ShapeItem[] = []
  const shelter = modelShapes('pShelter', { paint: { BlueBusStop: c.frame, LightBlue_BusStop: c.glass } })
  for (const st of stops) {
    const rot = st.face > 0 ? 0 : Math.PI
    if (shelter) s.push({ group: shelter, at: [st.x, 0, st.z], rot: [0, rot, 0] })
    else {
      s.push({ box: [3.6, 0.12, 2.2], at: [st.x, 2.5, st.z], color: c.frame })
      s.push({ box: [3.6, 2.4, 0.08], at: [st.x, 1.2, st.z - st.face * 1.0], color: c.glass })
      s.push({ box: [2.6, 0.08, 0.5], at: [st.x, 0.5, st.z - st.face * 0.7], color: c.frame })
    }
    // the stop sign pole by the kerb (downstream end of the shelter), its sign is a label
    const px = st.x + st.lane.dir * 2.6
    const pz = st.z + st.face * 0.9
    s.push({ cyl: [0.05, 0.05, 3.0, 8], at: [px, 1.5, pz], color: '#5d6672' })
    s.push({ cyl: [0.12, 0.14, 0.12, 10], at: [px, 0.06, pz], color: '#4a525c' })
    // bus bay painted in the lane: a yellow box (Hà Nội) / a zigzag line (München) along the kerb
    const bx = st.x + st.lane.dir * 1.5
    const kerbZ = st.lane.z - st.face * 1.15
    const len = 13
    if (scene === 'vietnam') {
      s.push({ box: [len, 0.012, 0.14], at: [bx, 0.013, kerbZ], color: c.bay })
      s.push({ box: [len, 0.012, 0.14], at: [bx, 0.013, st.lane.z + st.face * 1.1], color: c.bay })
      for (const e of [-1, 1]) s.push({ box: [0.14, 0.012, 2.25], at: [bx + (e * len) / 2, 0.013, st.lane.z], color: c.bay })
    } else {
      for (let k = 0; k < 10; k++) {
        const x = bx - len / 2 + (k + 0.5) * (len / 10)
        s.push({ box: [len / 10 / Math.cos(0.5), 0.012, 0.1], at: [x, 0.013, kerbZ + st.face * 0.45], rot: [0, k % 2 ? 0.5 : -0.5, 0], color: c.bay })
      }
    }
    // a little lamp under the roof (lit at night)
    glow.push({ box: [2.4, 0.04, 0.12], at: [st.x, 2.36, st.z - st.face * 0.2], color: '#fff2cc' })
    if (scene === 'germany') {
      const m = machineAt(st)
      const p = ticketMachineShapes(m.x, m.z, m.rotY)
      s.push(...p.s)
      glow.push(...p.glow)
    }
  }
  return { s, glow }
}

function stopSignDraw(st: BusStop, line: BusLine, scene: BusScene) {
  return (ctx: CanvasRenderingContext2D, W: number, H: number) => {
    if (scene === 'germany') {
      // the German stop sign: green H on a yellow disc, the stop name and the line under it
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, W, H)
      const r = W * 0.42
      ctx.beginPath()
      ctx.arc(W / 2, r + W * 0.06, r, 0, Math.PI * 2)
      ctx.fillStyle = '#f7d117'
      ctx.fill()
      ctx.lineWidth = W * 0.05
      ctx.strokeStyle = '#1f8a4c'
      ctx.stroke()
      ctx.fillStyle = '#1f8a4c'
      ctx.font = `800 ${r * 1.3}px ${SIGN_SANS}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('H', W / 2, r + W * 0.1)
      ctx.fillStyle = '#1d1d1b'
      let size = W * 0.14
      ctx.font = `800 ${size}px ${SIGN_SANS}`
      while (ctx.measureText(st.name.de ?? st.name.en).width > W * 0.92 && size > 6) {
        size *= 0.92
        ctx.font = `800 ${size}px ${SIGN_SANS}`
      }
      ctx.fillText(st.name.de ?? st.name.en, W / 2, H * 0.68)
      ctx.fillStyle = line.color
      ctx.fillRect(W * 0.3, H * 0.77, W * 0.4, H * 0.15)
      ctx.fillStyle = '#ffffff'
      ctx.font = `800 ${H * 0.11}px ${SIGN_SANS}`
      ctx.fillText(line.number, W / 2, H * 0.85)
      return
    }
    // Hà Nội: blue plate "ĐIỂM DỪNG XE BUÝT", the stop, the route numbers
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = VN.sign
    ctx.fillRect(W * 0.04, H * 0.03, W * 0.92, H * 0.94)
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `800 ${H * 0.085}px ${SIGN_SANS}`
    ctx.fillText('ĐIỂM DỪNG', W / 2, H * 0.12)
    ctx.fillText('XE BUÝT', W / 2, H * 0.21)
    // a little bus picture
    ctx.fillRect(W * 0.22, H * 0.3, W * 0.56, H * 0.17)
    ctx.fillStyle = VN.sign
    for (let i = 0; i < 3; i++) ctx.fillRect(W * (0.27 + i * 0.16), H * 0.33, W * 0.11, H * 0.06)
    ctx.beginPath()
    ctx.arc(W * 0.33, H * 0.47, W * 0.05, 0, Math.PI * 2)
    ctx.arc(W * 0.67, H * 0.47, W * 0.05, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    let size = H * 0.1
    ctx.font = `800 ${size}px ${SIGN_SANS}`
    while (ctx.measureText(st.name.vi).width > W * 0.86 && size > 6) {
      size *= 0.92
      ctx.font = `800 ${size}px ${SIGN_SANS}`
    }
    ctx.fillText(st.name.vi, W / 2, H * 0.62)
    ctx.fillStyle = line.color
    ctx.fillRect(W * 0.28, H * 0.74, W * 0.44, H * 0.16)
    ctx.fillStyle = '#ffffff'
    ctx.font = `800 ${H * 0.12}px ${SIGN_SANS}`
    ctx.fillText(line.number, W / 2, H * 0.825)
  }
}

/** Timetable on the shelter's back wall: the line's stops with this one marked. */
function timetableDraw(st: BusStop, line: BusLine, scene: BusScene) {
  return (ctx: CanvasRenderingContext2D, W: number, H: number) => {
    const de = scene === 'germany'
    ctx.fillStyle = '#fbfbf7'
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = line.color
    ctx.fillRect(0, 0, W, H * 0.2)
    ctx.fillStyle = '#ffffff'
    ctx.font = `800 ${H * 0.13}px ${SIGN_SANS}`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(de ? `Bus ${line.number} · Fahrplan` : `Tuyến ${line.number} · Lộ trình`, W * 0.05, H * 0.1)
    const n = line.stops.length
    const x0 = W * 0.1
    const x1 = W * 0.9
    const y = H * 0.55
    ctx.fillStyle = line.color
    ctx.fillRect(x0, y - H * 0.025, x1 - x0, H * 0.05)
    line.stops.forEach((id, i) => {
      const x = n > 1 ? x0 + ((x1 - x0) * i) / (n - 1) : W / 2
      const here = id === st.id
      ctx.beginPath()
      ctx.arc(x, y, H * (here ? 0.07 : 0.05), 0, Math.PI * 2)
      ctx.fillStyle = here ? '#e2001a' : '#ffffff'
      ctx.fill()
      ctx.lineWidth = H * 0.02
      ctx.strokeStyle = '#1d1d1b'
      ctx.stroke()
      const nm = BUS_STOPS[id].name
      ctx.fillStyle = '#1d1d1b'
      ctx.textAlign = 'center'
      ctx.font = `${here ? 800 : 600} ${H * 0.09}px ${SIGN_SANS}`
      ctx.fillText(de ? (nm.de ?? nm.en) : nm.vi, x, y + (i % 2 ? H * 0.17 : -H * 0.14))
    })
    ctx.fillStyle = '#555'
    ctx.font = `600 ${H * 0.08}px ${SIGN_SANS}`
    ctx.textAlign = 'left'
    ctx.fillText(de ? 'tagsüber alle 5–10 Min · Ticket 3,90 €' : 'Giãn cách 5–10 phút · Vé lượt 8.000đ', W * 0.05, H * 0.9)
  }
}

function busLabels(line: BusLine): Label[] {
  const vn = line.scene === 'vietnam'
  const last = BUS_STOPS[line.stops[line.stops.length - 1]].name
  const text = `${line.number}  ${vn ? last.vi : (last.de ?? last.en)}`
  const draw = (ctx: CanvasRenderingContext2D, W: number, H: number) => {
    ctx.fillStyle = '#121212'
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = '#ffb000'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    let size = H * 0.66
    ctx.font = `800 ${size}px ${SIGN_SANS}`
    while (ctx.measureText(text).width > W * 0.94 && size > 6) {
      size *= 0.92
      ctx.font = `800 ${size}px ${SIGN_SANS}`
    }
    ctx.fillText(text, W / 2, H * 0.54)
  }
  // destination display over the windscreen and on the door side (the bus model is 2.5 × 2.75 × 10.1 m, front +z)
  return [
    { w: 1.7, h: 0.3, at: [0, 2.48, 5.07], draw },
    { w: 2.2, h: 0.28, at: [-1.27, 2.45, 2.2], rotY: -Math.PI / 2, draw },
  ]
}

/** One stop's bus: wait → drive in → stand (doors open) → drive off. */
function StopBus({ stop }: { stop: BusStop }) {
  const line = busLineOf(stop.id)
  const shapes = useMemo<ShapeItem[]>(() => libraryCarShapes('pBus', null, busPaint(line)) ?? [{ box: [2.5, 2.8, 10], at: [0, 1.5, 0], color: line.color }], [line])
  const labels = useMemo(() => busLabels(line), [line])
  const group = useRef<Group>(null)
  const rb = useRef<RapierRigidBody>(null)
  const dir = stop.lane.dir
  const busX = stop.x + dir * 1.5
  const c = CONFIG.transit
  const occ = `bus-${stop.id}`
  const honked = useRef(false)
  // stagger the stops so their buses do not all come at once
  // 1.49 buses come in from the end of the street (in the fog) and drive off to the other end — before, each one
  // appeared 70 m up the road, which could be right at the previous stop (München: the Hbf bus popped up at Lindenstraße)
  const edge = BUS_EDGE[stop.scene]
  const startX = -dir * edge
  const st = useRef<{ phase: BusPhase; x: number; v: number; t: number }>({ phase: 'wait', x: startX, v: 0, t: 4 + (stop.id.length * 7) % 20 })
  useEffect(
    () => () => {
      clearOccupant(occ)
      busRuntime.delete(stop.id)
    },
    [occ, stop.id],
  )
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.1)
    const s = st.current
    if (busArrivals.has(stop.id)) {
      busArrivals.delete(stop.id)
      s.phase = 'dwell'
      s.x = busX
      s.v = 0
      s.t = c.busDwell
    }
    const half = 5.05
    // the player standing in the lane ahead stops the bus too
    const p = playerState.position
    const inLane = Math.abs(p.z - stop.lane.z) < 1.4
    const pAhead = (p.x - s.x) * dir - half
    const gap = Math.min(gapAhead(occ, s.x, stop.lane.z, dir, half), inLane && pAhead > -1 ? pAhead : Infinity)
    // 1.49 the bus sounds its air horn at a player standing in its way
    if (inLane && pAhead > -1 && pAhead < 8 && (s.phase === 'in' || s.phase === 'out')) {
      if (!honked.current) streetHorn('bus')
      honked.current = true
    } else if (!inLane || pAhead > 12) honked.current = false
    const capGap = (v: number) => (gap < 2 ? 0 : gap < 9 ? Math.min(v, (c.busSpeed * (gap - 2)) / 7) : v)
    let eta = 0
    if (s.phase === 'wait') {
      s.t -= dt
      eta = s.t + (busX - startX) * dir / c.busSpeed + 3
      if (s.t <= 0) {
        s.phase = 'in'
        s.x = startX
        s.v = c.busSpeed
      }
    } else if (s.phase === 'in') {
      const left = (busX - s.x) * dir
      const want = Math.min(c.busSpeed, Math.sqrt(Math.max(0, 2 * 1.4 * left)) + 0.3)
      s.v = capGap(Math.min(want, s.v + 3 * dt))
      s.x += dir * Math.min(s.v * dt, Math.max(0, left))
      eta = left / Math.max(2, s.v) + 0.5
      if (left <= 0.05) {
        s.phase = 'dwell'
        s.x = busX
        s.v = 0
        s.t = c.busDwell
      }
    } else if (s.phase === 'dwell') {
      s.t -= dt
      if (s.t <= 0) s.phase = 'out'
    } else {
      s.v = capGap(Math.min(c.busSpeed, s.v + 1.6 * dt))
      s.x += dir * s.v * dt
      if (s.x * dir > edge) {
        s.phase = 'wait'
        const [a, b] = c.busGap
        s.t = a + Math.random() * (b - a)
      }
      eta = c.busGap[0] + (busX - startX) * dir / c.busSpeed + 3
    }
    busRuntime.set(stop.id, { phase: s.phase, eta })
    const g = group.current
    if (g) {
      g.visible = s.phase !== 'wait'
      g.position.x = s.x
    }
    if (s.phase === 'wait') clearOccupant(occ)
    else setOccupant(occ, s.x, stop.lane.z, dir, half)
    rb.current?.setNextKinematicTranslation({ x: s.x, y: s.phase === 'wait' ? -20 : 0, z: stop.lane.z })
  })
  const yaw = dir > 0 ? Math.PI / 2 : -Math.PI / 2
  return (
    <>
      <group ref={group} position={[busX, 0, stop.lane.z]} rotation={[0, yaw, 0]} visible={false}>
        <Shapes shapes={shapes} />
        <LabelSheet labels={labels} version={line.id} ppm={160} />
      </group>
      <RigidBody ref={rb} type="kinematicPosition" colliders={false} position={[busX, -20, stop.lane.z]} rotation={[0, yaw, 0]}>
        <CuboidCollider args={[1.22, 1.3, 5.0]} position={[0, 1.3, 0]} />
      </RigidBody>
    </>
  )
}

const BOARD = (id: BusStopId): SpotAction[] => [{ id: 'bus', labelKey: 'action.busBoard', icon: 'bus', action: 'bus.board', arg: id, primary: true }]

export const BusStops = memo(function BusStops({ scene }: { scene: BusScene }) {
  const stops = useMemo(() => busStopsIn(scene), [scene])
  const { s, glow } = useMemo(() => shelterShapes(stops, scene), [stops, scene])
  const labels = useMemo<Label[]>(() => {
    const out: Label[] = []
    for (const st of stops) {
      const line = busLineOf(st.id)
      const sign = stopSignDraw(st, line, scene)
      const px = st.x + st.lane.dir * 2.6
      const pz = st.z + st.face * 0.9
      const w = scene === 'germany' ? 0.62 : 0.6
      const h = scene === 'germany' ? 0.95 : 0.9
      // the sign plate faces along the road, both ways
      out.push({ w, h, at: [px, 2.55, pz], rotY: Math.PI / 2, draw: sign })
      out.push({ w, h, at: [px, 2.55, pz], rotY: -Math.PI / 2, draw: sign })
      // timetable inside on the back wall, facing the road
      out.push({ w: 1.9, h: 0.75, at: [st.x - 0.4, 1.55, st.z - st.face * 0.98], rotY: st.face > 0 ? 0 : Math.PI, draw: timetableDraw(st, line, scene) })
      if (scene === 'germany') {
        const m = machineAt(st)
        out.push(...ticketMachineLabels(m.x, m.z, m.rotY))
      }
    }
    return out
  }, [stops, scene])
  return (
    <>
      <Shapes shapes={s} />
      <Shapes shapes={glow} material={glowMaterial} castShadow={false} receiveShadow={false} />
      <LabelSheet labels={labels} version={scene} ppm={170} />
      {stops.map((st) => (
        <CuboidCollider key={`c-${st.id}`} args={[1.75, 1.2, 0.12]} position={[st.x, 1.2, st.z - st.face * 1.02]} collisionGroups={PROP_GROUPS} />
      ))}
      {stops.map((st) => (
        <ActionSpot
          key={st.id}
          id={`bus-${st.id}`}
          name={{ vi: `Bến xe buýt ${st.name.vi}`, en: `Bus stop ${st.name.en}`, de: `Haltestelle ${st.name.de ?? st.name.en}` }}
          zone={{ x: st.x, z: st.z + st.face * 0.4, halfX: 2.6, halfZ: 1.4 }}
          actions={BOARD(st.id)}
        />
      ))}
      {stops.map((st) => (
        <StopBus key={`bus-${st.id}`} stop={st} />
      ))}
      {scene === 'germany' &&
        stops.map((st) => {
          const m = machineAt(st)
          return (
            <group key={`tm-${st.id}`}>
              <CuboidCollider args={[0.4, 0.9, 0.25]} position={[m.x, 0.9, m.z]} collisionGroups={PROP_GROUPS} />
              <ActionSpot id={`tickets-${st.id}`} name={{ vi: 'Máy bán vé MVV', en: 'MVV ticket machine', de: 'Fahrkartenautomat' }} zone={ticketMachineZone(m.x, m.z, m.rotY)} actions={TICKET_ACTIONS} priority={2} />
            </group>
          )
        })}
    </>
  )
})

