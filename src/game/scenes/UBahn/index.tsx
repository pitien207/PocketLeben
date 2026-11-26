import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { CuboidCollider } from '@react-three/rapier'
import type { Group } from 'three'
import { U_BEYOND, U_GLEIS, U_LINE, U_LINE_COLOR, U_STATIONS, type Gleis, type UStationId } from '../../../data/transit'
import { useFlags } from '../../../store/flagsStore'
import { ActionSpot, type SpotAction } from '../../components/ActionSpot'
import { NPC } from '../../components/npc/NPC'
import { playSfx } from '../../systems/audio'
import { PROP_GROUPS } from '../../systems/collisionGroups'
import { gleisDir, trainAt } from '../../systems/transit'
import { guest } from '../ShopRoom/people'
import { LabelSheet, SIGN_SANS, type Label } from '../shared/LabelSheet'
import { glowMaterial, groundMaterial } from '../shared/materials'
import { modelShapes } from '../shared/models'
import { benchShapes } from '../shared/props'
import { TICKET_ACTIONS, ticketMachineLabels, ticketMachineShapes, ticketMachineZone } from '../shared/ticketMachine'
import { Shapes, type ShapeItem } from '../shared/Shapes'
import { U } from './layout'

/**
 * 1.48 München U-Bahn station (systems/transit.ts): island platform, Gleis 1 (south) and Gleis 2 (north) on either
 * side, trains (Kenney Train Kit subway cars, MVG blue) coming in, standing with open doors, leaving — both ways — the
 * departure displays (DFI) counting down, station names on the walls, the U3 / U6 line plan, way signs and the exit.
 */

const C = {
  floor: '#cfcac2',
  floorLine: '#bdb7ad',
  edge: '#e4e0d8',
  tactile: '#e8c547',
  white: '#f5f5f2',
  bed: '#3a3936',
  sleeper: '#5b5046',
  pitWall: '#575a5e',
  upper: '#e9e7e2',
  steel: '#9aa3ad',
  dark: '#15181d',
  navy: '#0d2a4a',
  mvg: '#0065ae',
  bench: '#8a95a3',
}

const shade = (hex: string, k: number) => {
  const n = parseInt(hex.slice(1), 16)
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)))
  return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => ch(v).toString(16).padStart(2, '0')).join('')
}

/** Floor, platform edges, track beds, walls with the station's tiles, tunnel mouths, stairs, pillars, benches. */
function hallShapes(wall: string): ShapeItem[] {
  const s: ShapeItem[] = []
  const L = U.halfX * 2
  const { edge, track, bed, wall: wz, height: H } = U
  // platform floor + tile grid
  s.push({ box: [L, 0.1, edge * 2], at: [0, -0.05, 0], color: C.floor })
  for (let x = -U.halfX + 2; x < U.halfX; x += 2) s.push({ box: [0.04, 0.012, edge * 2 - 0.6], at: [x, 0.006, 0], color: C.floorLine })
  for (const side of [-1, 1]) {
    // edge stone, tactile strip, white safety line
    s.push({ box: [L, 0.03, 0.3], at: [0, 0.015, side * (edge - 0.15)], color: C.edge })
    s.push({ box: [L, 0.035, 0.32], at: [0, 0.018, side * (edge - 0.55)], color: C.tactile })
    s.push({ box: [L, 0.032, 0.07], at: [0, 0.016, side * (edge - 0.9)], color: C.white })
    // the platform's face down to the track bed
    s.push({ box: [L, -bed, 0.12], at: [0, bed / 2, side * (edge + 0.06)], color: C.pitWall })
    // track bed with sleepers + a drain channel, the power rail by the wall
    const tz = side * track
    s.push({ box: [L, 0.1, wz - edge], at: [0, bed - 0.05, side * ((wz + edge) / 2)], color: C.bed })
    s.push({ box: [L, 0.14, 0.18], at: [0, bed + 0.25, side * (wz - 0.55)], color: '#6d6a62' })
    s.push({ box: [L, 0.05, 0.08], at: [0, bed + 0.34, side * (wz - 0.55)], color: '#b8b2a5' })
    const rail = modelShapes('klRailroad', { scale: 1.6 })
    for (let x = -U.halfX; x < U.halfX; x += 4 * 1.6) {
      if (rail) s.push({ group: rail, at: [x + 3.2, bed, tz], rot: [0, Math.PI / 2, 0] })
      else {
        for (let k = 0; k < 8; k++) s.push({ box: [0.25, 0.1, 2.2], at: [x + 0.4 + k * 0.8, bed + 0.05, tz], color: C.sleeper })
        for (const r of [-0.72, 0.72]) s.push({ box: [6.4, 0.14, 0.08], at: [x + 3.2, bed + 0.17, tz + r], color: '#9ba3b0' })
      }
    }
    // side wall: station tiles low, light panels high, a light strip on top
    s.push({ box: [L, 2.6, 0.3], at: [0, bed + 1.3, side * (wz + 0.15)], color: wall })
    s.push({ box: [L, 0.12, 0.34], at: [0, bed + 2.66, side * (wz + 0.15)], color: shade(wall, 0.75) })
    s.push({ box: [L, H - bed - 2.72, 0.3], at: [0, (bed + 2.72 + H) / 2, side * (wz + 0.15)], color: C.upper })
    // vertical tile joints every 1.2 m (a darker hairline)
    for (let x = -U.halfX + 1.2; x < U.halfX; x += 1.2) s.push({ box: [0.03, 2.5, 0.02], at: [x, bed + 1.3, side * (wz - 0.005)], color: shade(wall, 0.85) })
    // end walls: tunnel mouths over the track, solid across the platform
    for (const end of [-1, 1]) {
      const x = end * U.halfX
      s.push({ box: [0.4, H - bed, edge * 2], at: [x + end * 0.2, (H + bed) / 2, 0], color: C.upper })
      // the wall round the tunnel: above it, and its two sides
      s.push({ box: [0.4, H - 3.2, wz - edge], at: [x + end * 0.2, (H + 3.2) / 2, side * ((wz + edge) / 2)], color: shade(C.upper, 0.92) })
      s.push({ box: [1.4, 3.2 - bed + 0.02, wz - edge], at: [x + end * 0.9, (3.2 + bed) / 2, side * ((wz + edge) / 2)], color: C.dark })
    }
  }
  // stairs + escalators up to the exit (a solid block with steps and handrails)
  const st = U.stairs
  const w = st.x1 - st.x0
  s.push({ box: [w, H - 0.6, st.z * 2], at: [(st.x0 + st.x1) / 2, (H - 0.6) / 2 + 0.6, 0], color: shade(wall, 0.9) })
  s.push({ box: [w + 0.2, 0.6, st.z * 2 + 0.2], at: [(st.x0 + st.x1) / 2, 0.3, 0], color: C.steel })
  // the stairs rise toward +x: steps on the west face, escalator handrails
  for (let k = 0; k < 9; k++) s.push({ box: [0.32, 0.18, st.z * 2 - 0.5], at: [st.x0 - 0.2 + k * 0.05, 0.1 + k * 0.2, 0], color: k % 2 ? '#9c9890' : '#b0aca3' })
  for (const zz of [-st.z + 0.08, st.z - 0.08]) s.push({ box: [w * 1.05, 0.1, 0.12], at: [(st.x0 + st.x1) / 2, 1.2, zz], rot: [0, 0, 0.42], color: '#2f343b' })
  s.push({ box: [w + 0.4, 0.3, st.z * 2 + 0.4], at: [(st.x0 + st.x1) / 2, H - 0.15, 0], color: C.upper })
  // pillars (round, tiled) down the middle
  for (const x of U.pillars) {
    s.push({ cyl: [0.42, 0.42, H, 14], at: [x, H / 2, 0], color: shade(wall, 1.05) })
    s.push({ cyl: [0.46, 0.46, 0.25, 14], at: [x, 0.12, 0], color: C.steel })
  }
  // benches between the pillars + bins
  const bench = benchShapes('#6d7682')
  for (const x of [-20, -12.5, 12.5, 20]) {
    s.push({ group: bench, at: [x, 0, -0.7], rot: [0, 0, 0] })
    s.push({ group: bench, at: [x, 0, 0.7], rot: [0, Math.PI, 0] })
  }
  for (const x of [-27, 6, 27]) {
    s.push({ cyl: [0.25, 0.22, 0.85, 10], at: [x, 0.43, 0], color: '#5a6470' })
    s.push({ cyl: [0.26, 0.26, 0.06, 10], at: [x, 0.88, 0], color: '#3a3f46' })
  }
  // hangers of the displays and signs (thin rods up into the dark)
  for (const x of [-13, 13])
    for (const side of [-1, 1]) for (const dx of [-0.9, 0.9]) s.push({ box: [0.04, 1.1, 0.04], at: [x + dx, 4.0, side * 2.6], color: C.steel })
  for (const x of [-5.4, 5.4]) for (const side of [-1, 1]) s.push({ box: [0.04, 0.9, 0.04], at: [x, 4.1, side * 2.45], color: C.steel })
  return s
}

/** Light strips along the walls and over the platform (glow → bloom). */
function glowShapes(): ShapeItem[] {
  const s: ShapeItem[] = []
  const L = U.halfX * 2 - 1
  for (const side of [-1, 1]) {
    s.push({ box: [L, 0.08, 0.14], at: [0, U.height - 0.3, side * (U.wall - 0.05)], color: '#fff3d8' })
    for (let x = -U.halfX + 3; x < U.halfX - 2; x += 6) s.push({ box: [2.6, 0.05, 0.22], at: [x, U.height - 0.05, side * 2.2], color: '#fffaf0' })
  }
  return s
}

// --- Signs ---------------------------------------------------------------------------------------------------------------

/** The white-on-blue "U" square. */
function uLogo(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(x, y, size, size)
  ctx.fillStyle = C.mvg
  const b = size * 0.1
  ctx.fillRect(x + b, y + b, size - 2 * b, size - 2 * b)
  ctx.fillStyle = '#ffffff'
  ctx.font = `800 ${size * 0.78}px ${SIGN_SANS}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('U', x + size / 2, y + size * 0.54)
}

function stationSign(name: string) {
  return (ctx: CanvasRenderingContext2D, W: number, H: number) => {
    ctx.fillStyle = C.mvg
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, H * 0.06, W, H * 0.03)
    ctx.fillRect(0, H * 0.91, W, H * 0.03)
    uLogo(ctx, H * 0.18, H * 0.18, H * 0.64)
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    let size = H * 0.56
    ctx.font = `800 ${size}px ${SIGN_SANS}`
    while (ctx.measureText(name).width > W - H * 1.2 && size > 10) {
      size *= 0.92
      ctx.font = `800 ${size}px ${SIGN_SANS}`
    }
    ctx.fillText(name, H * 1.0, H * 0.52)
  }
}

function waySign(lines: { text: string; sub?: string; arrow?: string; badges?: string[] }[], bg = C.navy) {
  return (ctx: CanvasRenderingContext2D, W: number, H: number) => {
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)
    const rowH = H / lines.length
    lines.forEach((l, i) => {
      const y = rowH * i
      if (i) {
        ctx.fillStyle = 'rgba(255,255,255,0.25)'
        ctx.fillRect(W * 0.03, y, W * 0.94, 2)
      }
      let x = rowH * 0.25
      if (l.arrow) {
        ctx.fillStyle = '#ffffff'
        ctx.font = `800 ${rowH * 0.62}px ${SIGN_SANS}`
        ctx.textAlign = 'left'
        ctx.textBaseline = 'middle'
        ctx.fillText(l.arrow, x, y + rowH * 0.52)
        x += rowH * 0.75
      }
      for (const b of l.badges ?? []) {
        ctx.fillStyle = U_LINE_COLOR[b] ?? C.mvg
        const bw = rowH * 0.95
        ctx.fillRect(x, y + rowH * 0.2, bw, rowH * 0.6)
        ctx.fillStyle = '#ffffff'
        ctx.font = `800 ${rowH * 0.42}px ${SIGN_SANS}`
        ctx.textAlign = 'center'
        ctx.fillText(b, x + bw / 2, y + rowH * 0.52)
        x += bw + rowH * 0.15
      }
      ctx.fillStyle = '#ffffff'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      let size = rowH * (l.sub ? 0.4 : 0.5)
      ctx.font = `800 ${size}px ${SIGN_SANS}`
      while (ctx.measureText(l.text).width > W - x - rowH * 0.3 && size > 8) {
        size *= 0.92
        ctx.font = `800 ${size}px ${SIGN_SANS}`
      }
      ctx.fillText(l.text, x + rowH * 0.1, y + rowH * (l.sub ? 0.36 : 0.52))
      if (l.sub) {
        ctx.globalAlpha = 0.85
        ctx.font = `600 ${rowH * 0.26}px ${SIGN_SANS}`
        ctx.fillText(l.sub, x + rowH * 0.1, y + rowH * 0.74)
        ctx.globalAlpha = 1
      }
    })
  }
}

/** U3 / U6 line plan with this station marked. */
function linePlan(here: UStationId) {
  return (ctx: CanvasRenderingContext2D, W: number, H: number) => {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = C.navy
    ctx.fillRect(0, 0, W, H * 0.2)
    ctx.fillStyle = '#ffffff'
    ctx.font = `800 ${H * 0.12}px ${SIGN_SANS}`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText('Liniennetz · U3  U6', H * 0.12, H * 0.1)
    const names = [...[...U_BEYOND.north].reverse(), ...U_LINE.map((id) => U_STATIONS[id].name), ...U_BEYOND.south]
    const y = H * 0.55
    const x0 = W * 0.06
    const x1 = W * 0.94
    ctx.fillStyle = U_LINE_COLOR.U3
    ctx.fillRect(x0, y - H * 0.06, x1 - x0, H * 0.05)
    ctx.fillStyle = U_LINE_COLOR.U6
    ctx.fillRect(x0, y + H * 0.01, x1 - x0, H * 0.05)
    names.forEach((n, i) => {
      const x = x0 + ((x1 - x0) * i) / (names.length - 1)
      const inMap = U_LINE.some((id) => U_STATIONS[id].name === n)
      const isHere = U_STATIONS[here].name === n
      ctx.beginPath()
      ctx.arc(x, y, H * (isHere ? 0.075 : 0.05), 0, Math.PI * 2)
      ctx.fillStyle = isHere ? '#e2001a' : '#ffffff'
      ctx.fill()
      ctx.lineWidth = H * 0.018
      ctx.strokeStyle = '#1d1d1b'
      ctx.stroke()
      ctx.save()
      ctx.translate(x, y - H * 0.1)
      ctx.rotate(-0.55)
      ctx.fillStyle = inMap ? '#1d1d1b' : '#9a9a9a'
      ctx.font = `${isHere ? 800 : 600} ${H * 0.085}px ${SIGN_SANS}`
      ctx.textAlign = 'left'
      ctx.fillText(n, 0, 0)
      ctx.restore()
      if (isHere) {
        ctx.fillStyle = '#e2001a'
        ctx.font = `800 ${H * 0.08}px ${SIGN_SANS}`
        ctx.textAlign = 'center'
        ctx.fillText('Sie sind hier', x, y + H * 0.2)
      }
    })
  }
}

function poster(title: string, sub: string, bg: string, fg = '#ffffff') {
  return (ctx: CanvasRenderingContext2D, W: number, H: number) => {
    ctx.fillStyle = '#d9d6cf'
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = bg
    ctx.fillRect(W * 0.05, H * 0.04, W * 0.9, H * 0.92)
    ctx.fillStyle = fg
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    let size = W * 0.16
    ctx.font = `800 ${size}px ${SIGN_SANS}`
    while (ctx.measureText(title).width > W * 0.8 && size > 8) {
      size *= 0.92
      ctx.font = `800 ${size}px ${SIGN_SANS}`
    }
    ctx.fillText(title, W / 2, H * 0.32)
    ctx.globalAlpha = 0.9
    ctx.font = `600 ${W * 0.08}px ${SIGN_SANS}`
    ctx.fillText(sub, W / 2, H * 0.62)
    ctx.globalAlpha = 1
  }
}

const POSTERS = [
  poster('Deutsch lernen', 'Abendkurse A1 – B1', '#2a9d8f'),
  poster('Biergarten', 'Ab 11 Uhr geöffnet', '#e9c46a', '#3a2a10'),
  poster('Pfand', 'gehört daneben', '#577590'),
  poster('Kunstareal', 'Museen am Sonntag 1 €', '#9b5de5'),
  poster('Auer Dult', 'Markt · Mai', '#f4a261', '#3a2a10'),
  poster('Isar', 'Sommer am Fluss', '#4d908e'),
]

function staticLabels(here: UStationId): Label[] {
  const st = U_STATIONS[here]
  const labels: Label[] = []
  const g1 = U_GLEIS[1].ends
  const g2 = U_GLEIS[2].ends
  for (const side of [-1, 1]) {
    const z = side * (U.wall - 0.02)
    const rotY = side < 0 ? 0 : Math.PI
    for (const x of [-22, -6.5, 6.5, 22]) labels.push({ w: 4.6, h: 0.95, at: [x, 2.7, z], rotY, draw: stationSign(st.name) })
    ;[-27, -14.5, 14.5, 27].forEach((x, i) => labels.push({ w: 1.5, h: 2.1, at: [x, 1.3, z], rotY, draw: POSTERS[(i + (side > 0 ? 3 : 0)) % POSTERS.length] }))
    labels.push({ w: 6.2, h: 1.7, at: [0, 1.45, z], rotY, draw: linePlan(here) })
  }
  // way signs over the walkways beside the stairs, both faces
  const way = (z: number, g: Gleis) => {
    const ends = g === 1 ? g1 : g2
    const draw = waySign([
      { text: `Gleis ${g}`, sub: ends.map((e) => `${e.line} ${e.to}`).join(' · '), badges: ends.map((e) => e.line) },
      { text: `Ausgang · ${st.exit}`, arrow: '↑' },
    ])
    for (const x of [-5.4, 5.4]) {
      labels.push({ w: 3.4, h: 1.0, at: [x, 3.45, z], rotY: 0, draw })
      labels.push({ w: 3.4, h: 1.0, at: [x, 3.45, z], rotY: Math.PI, draw })
    }
  }
  way(-2.45, 1)
  way(2.45, 2)
  // the exit over the foot of the stairs
  const exit = waySign([{ text: 'Ausgang', sub: st.exit, arrow: '↑' }], C.mvg)
  labels.push({ w: 2.6, h: 0.8, at: [U.stairs.x0 - 0.05, 2.9, 0], rotY: -Math.PI / 2, draw: exit })
  labels.push({ w: 2.6, h: 0.8, at: [U.stairs.x1 + 0.05, 2.9, 0], rotY: Math.PI / 2, draw: exit })
  // gleis numbers on the pillars, facing each track
  for (const x of U.pillars)
    for (const side of [-1, 1]) {
      const g = side < 0 ? 1 : 2
      labels.push({
        w: 0.6,
        h: 0.6,
        at: [x, 2.2, side * 0.44],
        rotY: side < 0 ? Math.PI : 0,
        draw: (ctx, W, H) => {
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, W, H)
          ctx.fillStyle = C.navy
          ctx.font = `800 ${H * 0.7}px ${SIGN_SANS}`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(String(g), W / 2, H * 0.55)
        },
      })
    }
  return labels
}

/** One departure display: line, destination, minutes; the next train under it. */
function dfiDraw(g: Gleis, text: { line: string; to: string; when: string; next: string }) {
  return (ctx: CanvasRenderingContext2D, W: number, H: number) => {
    ctx.fillStyle = '#1d1f24'
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = '#0b1220'
    ctx.fillRect(W * 0.02, H * 0.05, W * 0.96, H * 0.9)
    ctx.fillStyle = U_LINE_COLOR[text.line] ?? C.mvg
    ctx.fillRect(W * 0.05, H * 0.14, H * 0.62, H * 0.4)
    ctx.fillStyle = '#ffffff'
    ctx.font = `800 ${H * 0.28}px ${SIGN_SANS}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text.line, W * 0.05 + H * 0.31, H * 0.35)
    ctx.textAlign = 'left'
    ctx.fillStyle = '#ffd166'
    let size = H * 0.32
    ctx.font = `800 ${size}px ${SIGN_SANS}`
    while (ctx.measureText(text.to).width > W * 0.62 && size > 8) {
      size *= 0.92
      ctx.font = `800 ${size}px ${SIGN_SANS}`
    }
    ctx.fillText(text.to, W * 0.07 + H * 0.66, H * 0.35)
    ctx.textAlign = 'right'
    ctx.font = `800 ${H * 0.3}px ${SIGN_SANS}`
    ctx.fillText(text.when, W * 0.95, H * 0.35)
    ctx.textAlign = 'left'
    ctx.fillStyle = 'rgba(255,209,102,0.75)'
    ctx.font = `600 ${H * 0.19}px ${SIGN_SANS}`
    ctx.fillText(`Gleis ${g}  ·  danach ${text.next}`, W * 0.06, H * 0.76)
  }
}

/** Display texts change a few times a minute: poll twice a second, repaint only when the words change. */
function Displays() {
  const [txt, setTxt] = useState('')
  useEffect(() => {
    const tick = () => {
      const parts = ([1, 2] as Gleis[]).map((g) => {
        const t = trainAt(g)
        const when = t.phase === 'standing' ? 'sofort' : t.eta < 45 ? `${Math.max(1, Math.ceil(t.eta / 30))} min` : `${Math.ceil(t.eta / 30)} min`
        const shown = t.phase === 'standing' ? t.end : t.phase === 'leaving' || t.phase === 'away' ? t.next : t.end
        const nxt = shown === t.end ? t.next : t.end
        return `${shown.line}|${shown.to}|${when}|${nxt.line} ${nxt.to}`
      })
      setTxt(parts.join('#'))
    }
    tick()
    const id = window.setInterval(tick, 500)
    return () => window.clearInterval(id)
  }, [])
  const labels = useMemo<Label[]>(() => {
    const rows = txt.split('#')
    const out: Label[] = []
    ;([1, 2] as Gleis[]).forEach((g, i) => {
      const [line = 'U6', to = '', when = '', next = ''] = (rows[i] ?? '').split('|')
      const draw = dfiDraw(g, { line, to, when, next })
      const side = g === 1 ? -1 : 1
      for (const x of [-13, 13]) {
        out.push({ w: 2.6, h: 0.72, at: [x, 3.3, side * 2.6], rotY: side < 0 ? 0 : Math.PI, draw })
        out.push({ w: 2.6, h: 0.72, at: [x, 3.3, side * 2.6], rotY: side < 0 ? Math.PI : 0, draw })
      }
    })
    return out
  }, [txt])
  return <LabelSheet labels={labels} version={txt} ppm={180} />
}

// --- Trains --------------------------------------------------------------------------------------------------------------

const TRAIN_PAINT: Record<string, string> = { '#cb4248': C.mvg, '#9ba3c3': '#dfe3e8', '#6f748c': '#a3abb5', '#99bcec': '#3d5470', '#3e3e46': '#2b2e33' }

function trainShapes(): { body: ShapeItem[]; doors: ShapeItem[] } {
  const body: ShapeItem[] = []
  const doors: ShapeItem[] = []
  const k = U.carScale
  const n = U.cars
  for (let i = 0; i < n; i++) {
    const name = i === 0 ? 'klSubwayA' : i === n - 1 ? 'klSubwayC' : 'klSubwayB'
    const z = ((n - 1) / 2 - i) * U.car
    const m = modelShapes(name, { scale: k, paint: (_m, c) => TRAIN_PAINT[c] ?? c })
    // the back car is the front car turned round
    if (m) body.push({ group: m, at: [0, 0, z], rot: [0, i === n - 1 ? 0 : 0, 0] })
    else body.push({ box: [2.9, 3.2, U.car - 0.2], at: [0, 1.7, z], color: '#dfe3e8' }, { box: [2.95, 0.4, U.car - 0.2], at: [0, 2.0, z], color: C.mvg })
    const half = (name === 'klSubwayB' ? 1.1 : 1.35) * k * 0.5
    // open doors: dark gaps on the platform side (local −x) and the lit inside
    for (const dz of [-U.car * 0.24, U.car * 0.24]) {
      doors.push({ box: [0.05, 2.0, 1.25], at: [-half - 0.02, 2.2, z + dz], color: '#1b1f26' })
      doors.push({ box: [0.03, 1.6, 0.9], at: [-half - 0.05, 2.25, z + dz], color: '#f2e2b8' })
    }
  }
  return { body, doors }
}

function Train({ g, shapes }: { g: Gleis; shapes: { body: ShapeItem[]; doors: ShapeItem[] } }) {
  const group = useRef<Group>(null)
  const doors = useRef<Group>(null)
  const open = useRef(false)
  const dir = gleisDir(g)
  useFrame(() => {
    const t = trainAt(g)
    const gr = group.current
    if (!gr) return
    gr.visible = t.phase !== 'away'
    gr.position.x = t.x
    if (doors.current) doors.current.visible = t.doorsOpen
    if (t.doorsOpen !== open.current) {
      open.current = t.doorsOpen
      playSfx(t.doorsOpen ? 'ding' : 'bell')
    }
  })
  return (
    <group ref={group} position={[0, U.bed, (g === 1 ? -1 : 1) * U.track]} rotation={[0, dir > 0 ? Math.PI / 2 : -Math.PI / 2, 0]}>
      <Shapes shapes={shapes.body} />
      <group ref={doors} visible={false}>
        <Shapes shapes={shapes.doors} castShadow={false} />
      </group>
    </group>
  )
}

// --- Colliders, spots, people ----------------------------------------------------------------------------------------------

function Colliders() {
  const b = (x0: number, x1: number, z0: number, z1: number, key: string) => (
    <CuboidCollider key={key} args={[(x1 - x0) / 2, 1.4, (z1 - z0) / 2]} position={[(x0 + x1) / 2, 1.4, (z0 + z1) / 2]} collisionGroups={PROP_GROUPS} />
  )
  const e = U.edge
  const st = U.stairs
  return (
    <>
      {b(-U.halfX, U.halfX, -e - 0.3, -e + 0.05, 'edge1')}
      {b(-U.halfX, U.halfX, e - 0.05, e + 0.3, 'edge2')}
      {b(-U.halfX - 0.4, -U.halfX + 0.1, -e, e, 'endW')}
      {b(U.halfX - 0.1, U.halfX + 0.4, -e, e, 'endE')}
      {b(st.x0 - 0.3, st.x1 + 0.1, -st.z - 0.1, st.z + 0.1, 'stairs')}
      {U.pillars.map((x) => b(x - 0.42, x + 0.42, -0.42, 0.42, `p${x}`))}
      {[-20, -12.5, 12.5, 20].map((x) => b(x - 0.9, x + 0.9, -1.0, 1.0, `b${x}`))}
    </>
  )
}

/** 1.49 ticket machines: against the stair block, one facing each platform side. */
const MACHINES: { x: number; z: number; rotY: number }[] = [
  { x: -2.2, z: -1.7, rotY: Math.PI },
  { x: 2.2, z: 1.7, rotY: 0 },
]
const machineParts = () => {
  const s: ShapeItem[] = []
  const glow: ShapeItem[] = []
  const labels: Label[] = []
  for (const m of MACHINES) {
    const p = ticketMachineShapes(m.x, m.z, m.rotY)
    s.push(...p.s)
    glow.push(...p.glow)
    labels.push(...ticketMachineLabels(m.x, m.z, m.rotY))
  }
  return { s, glow, labels }
}

const EXIT: SpotAction[] = [{ id: 'exit', labelKey: 'action.ubahnExit', icon: 'door', action: 'ubahn.exit', primary: true }]
const BOARD1: SpotAction[] = [{ id: 'board', labelKey: 'action.ubahnBoard', icon: 'metro', action: 'ubahn.board', arg: '1', primary: true }]
const BOARD2: SpotAction[] = [{ id: 'board', labelKey: 'action.ubahnBoard', icon: 'metro', action: 'ubahn.board', arg: '2', primary: true }]

const PEOPLE = [
  { def: guest('ubahn', 0, 3), at: { x: -17, z: -2.3 }, yaw: Math.PI },
  { def: guest('ubahn', 1, 9), at: { x: 10.5, z: 2.5 }, yaw: 0 },
  { def: guest('ubahn', 2, 6), at: { x: 18.3, z: -2.4 }, yaw: Math.PI },
]
const WALKERS = [
  { def: guest('ubahn', 3, 11), path: { points: [{ x: -26, z: -2.2 }, { x: -7, z: -2.2 }], speed: 1.1, pauseSec: [2, 5] as [number, number] } },
  { def: guest('ubahn', 4, 4), path: { points: [{ x: 26, z: 2.3 }, { x: 7, z: 2.3 }], speed: 1.0, pauseSec: [1, 4] as [number, number] } },
]

const UBahn = memo(function UBahn() {
  const at = useFlags((s) => s.flags['ubahn.at'])
  const here = (typeof at === 'string' && at in U_STATIONS ? at : 'marienplatz') as UStationId
  const wall = U_STATIONS[here].wall
  const hall = useMemo(() => hallShapes(wall), [wall])
  const glow = useMemo(glowShapes, [])
  const labels = useMemo(() => staticLabels(here), [here])
  const train = useMemo(trainShapes, [])
  const machines = useMemo(machineParts, [])
  return (
    <>
      <Shapes shapes={hall} />
      <Shapes shapes={glow} material={glowMaterial} castShadow={false} receiveShadow={false} />
      <mesh position={[0, U.bed - 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]} material={groundMaterial}>
        <planeGeometry args={[U.halfX * 2 + 6, U.wall * 2 + 2]} />
      </mesh>
      <LabelSheet labels={labels} version={here} ppm={150} />
      <Displays />
      <Shapes shapes={machines.s} />
      <Shapes shapes={machines.glow} material={glowMaterial} castShadow={false} receiveShadow={false} />
      <LabelSheet labels={machines.labels} ppm={300} />
      {MACHINES.map((m, i) => (
        <CuboidCollider key={`tm${i}`} args={[0.4, 0.9, 0.25]} position={[m.x, 0.9, m.z]} collisionGroups={PROP_GROUPS} />
      ))}
      {MACHINES.map((m, i) => (
        <ActionSpot key={`tms${i}`} id={`tickets-ubahn-${i}`} name={{ vi: 'Máy bán vé MVV', en: 'MVV ticket machine', de: 'Fahrkartenautomat' }} zone={ticketMachineZone(m.x, m.z, m.rotY)} actions={TICKET_ACTIONS} priority={2} />
      ))}
      <Train g={1} shapes={train} />
      <Train g={2} shapes={train} />
      <Colliders />
      <ActionSpot id="ubahn-exit" name={{ vi: `Lối ra · ${U_STATIONS[here].exit}`, en: `Exit · ${U_STATIONS[here].exit}`, de: `Ausgang · ${U_STATIONS[here].exit}` }} zone={{ x: U.stairs.x0 - 1.4, z: 0, halfX: 1.1, halfZ: 1.3 }} actions={EXIT} />
      <ActionSpot id="ubahn-gleis1" name={{ vi: 'Gleis 1 · đi về phía nam', en: 'Platform 1 · southbound', de: 'Gleis 1' }} zone={{ x: 0, z: -(U.edge - 1.0), halfX: U.halfX - 2, halfZ: 0.55 }} actions={BOARD1} />
      <ActionSpot id="ubahn-gleis2" name={{ vi: 'Gleis 2 · đi về phía bắc', en: 'Platform 2 · northbound', de: 'Gleis 2' }} zone={{ x: 0, z: U.edge - 1.0, halfX: U.halfX - 2, halfZ: 0.55 }} actions={BOARD2} />
      {PEOPLE.map((p) => (
        <NPC key={p.def.id} def={p.def} at={p.at} yaw={p.yaw} />
      ))}
      {WALKERS.map((w) => (
        <NPC key={w.def.id} def={w.def} at={w.path.points[0]} path={w.path} yieldLines="yieldDe" />
      ))}
    </>
  )
})

export default UBahn
