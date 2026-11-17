import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { CONFIG } from '../../data/config'
import { NPCS, type Outfit } from '../../data/npcs'
import { SENTENCES } from '../../data/vocab'
import { formatMoney } from '../../i18n/format'
import { usePlayer } from '../../store/playerStore'
import { useTime } from '../../store/timeStore'
import { Portrait } from '../../ui/Portrait'
import { playSfx } from '../systems/audio'
import { bumpFlag, flagNumber, getFlag, setFlag } from '../systems/conditions'
import { grabNet } from '../systems/jobs'
import { weekdayIndex } from '../systems/time'
import { shuffle } from './common'

/**
 * Chạy Grab (story 2.1 §11.1), rebuilt in 1.21 as a real-time ride on a top-down map of the Old
 * Quarter. The phone offers two orders — food to deliver or a passenger — pick one, ride to the
 * pickup, then to the drop before the ETA runs out. Tap or swipe a direction: the scooter keeps
 * going and turns at the next crossing that allows it. Traffic jams move around (the GPS doesn't
 * know about them), one-way streets only go one way, and on the weekend Hàng Đào is a walking
 * street — riding into it costs a fine. Rain pays more but the road is slower.
 */

const G = CONFIG.vnJobs.grab
const vnd = (n: number) => formatMoney(n, 'VND')
const pick = <V,>(list: V[]) => list[Math.floor(Math.random() * list.length)]
const INK = '#4a3226'

// --------------------------------------------------------------------------------------- map

const COLS = 6
const ROWS = 7
const U = 54
const M = 20
const W = M * 2 + U * (COLS - 1)
/** Extra room on top so the pins of the first row are not cut off. */
const TOP = 16
const H = M * 2 + U * (ROWS - 1) + TOP
const px = (v: number) => M + v * U

type Dir = 0 | 1 | 2 | 3
const DX = [1, 0, -1, 0]
const DY = [0, 1, 0, -1]
const ARROWS = ['→', '↓', '←', '↑']
interface Node {
  x: number
  y: number
}
const nk = (x: number, y: number) => `${x},${y}`
const ek = (x1: number, y1: number, x2: number, y2: number) => (x1 < x2 || (x1 === x2 && y1 < y2) ? `${x1},${y1}-${x2},${y2}` : `${x2},${y2}-${x1},${y1}`)

/** Hồ Gươm fills the blocks between these crossings; the node in the middle is water. */
const LAKE = { x0: 3, y0: 4, x1: 5, y1: 6 }
const NO_ROAD = new Set([
  ek(4, 4, 4, 5),
  ek(3, 5, 4, 5),
  ek(4, 5, 5, 5),
  ek(4, 5, 4, 6),
  // closed blocks, so the map isn't a plain grid
  ek(0, 1, 0, 2),
  ek(2, 1, 2, 2),
  ek(4, 2, 5, 2),
  ek(1, 4, 1, 5),
  ek(0, 5, 1, 5),
  ek(1, 6, 2, 6),
])
const EDGES: [Node, Node][] = []
for (let y = 0; y < ROWS; y++)
  for (let x = 0; x < COLS; x++) {
    if (x + 1 < COLS && !NO_ROAD.has(ek(x, y, x + 1, y))) EDGES.push([{ x, y }, { x: x + 1, y }])
    if (y + 1 < ROWS && !NO_ROAD.has(ek(x, y, x, y + 1))) EDGES.push([{ x, y }, { x, y: y + 1 }])
  }
const ROAD = new Set(EDGES.map(([a, b]) => ek(a.x, a.y, b.x, b.y)))
const NODES: Node[] = []
for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if ([0, 1, 2, 3].some((d) => ROAD.has(ek(x, y, x + DX[d], y + DY[d])))) NODES.push({ x, y })

/** One-way streets: the only direction you may ride them. */
const ONE_WAY = new Map<string, Dir>()
for (let x = 0; x < COLS - 1; x++) ONE_WAY.set(ek(x, 1, x + 1, 1), 0)
for (let y = 0; y < 4; y++) ONE_WAY.set(ek(4, y, 4, y + 1), 3)
for (let y = 3; y < ROWS - 1; y++) ONE_WAY.set(ek(2, y, 2, y + 1), 1)
/** Phố đi bộ Hàng Đào (weekend evenings in real life; here: all weekend). */
const WALK = new Set([0, 1, 2, 3].map((x) => ek(x, 2, x + 1, 2)))
const WIDE_ROWS = new Set([0, 3])
const ROW_NAMES = ['Tràng Tiền', 'Hàng Bạc', 'Hàng Đào', 'Hàng Gai', 'Hàng Trống', 'Lò Sũ', 'Hàng Khay']

const canGo = (x: number, y: number, d: Dir) => {
  const k = ek(x, y, x + DX[d], y + DY[d])
  if (!ROAD.has(k)) return false
  const only = ONE_WAY.get(k)
  return only === undefined || only === d
}

/** Shortest way along the roads (respecting one-way streets; optionally around the walking street). */
function route(a: Node, b: Node, avoidWalk: boolean): Node[] {
  const prev = new Map<string, string>()
  const seen = new Set([nk(a.x, a.y)])
  const queue: Node[] = [a]
  while (queue.length) {
    const c = queue.shift()!
    if (c.x === b.x && c.y === b.y) break
    for (const d of [0, 1, 2, 3] as Dir[]) {
      if (!canGo(c.x, c.y, d)) continue
      const n = { x: c.x + DX[d], y: c.y + DY[d] }
      if (avoidWalk && WALK.has(ek(c.x, c.y, n.x, n.y))) continue
      const k = nk(n.x, n.y)
      if (seen.has(k)) continue
      seen.add(k)
      prev.set(k, nk(c.x, c.y))
      queue.push(n)
    }
  }
  const out: Node[] = []
  let k: string | undefined = nk(b.x, b.y)
  if (!seen.has(k)) return [a, b]
  while (k) {
    const [x, y] = k.split(',').map(Number)
    out.unshift({ x, y })
    k = prev.get(k)
  }
  return out
}

// ------------------------------------------------------------------------------------ orders

interface Shop {
  id: string
  name: string
  at: Node
  color: string
}
const SHOPS: Shop[] = [
  { id: 'pho', name: 'Phở Gia Truyền', at: { x: 1, y: 3 }, color: '#e2574c' },
  { id: 'banhMi', name: 'Bánh mì Phố Cổ', at: { x: 4, y: 3 }, color: '#f39a2b' },
  { id: 'traSua', name: 'Tiệm Trà Sữa', at: { x: 0, y: 3 }, color: '#ff8fab' },
  { id: 'caPhe', name: 'Cà phê trứng', at: { x: 3, y: 1 }, color: '#8a5a3c' },
  { id: 'bunCha', name: 'Bún chả Hàng Mành', at: { x: 1, y: 0 }, color: '#d9a05b' },
  { id: 'che', name: 'Chè Bốn Mùa', at: { x: 5, y: 1 }, color: '#7cc27a' },
]

type Rider = 'normal' | 'jakob' | 'tourist' | 'khai' | 'xoi'
const RIDER_LOOK: Record<Rider, { name: string; outfit: Outfit }> = {
  normal: { name: 'Khách đi xe', outfit: { skin: '#fbdcc4', hair: '#3a2a26', hairStyle: 'bob', shirt: '#cdb8f0', shorts: '#4f5d75', shoe: '#ffffff', bag: null, accessory: null, lashes: true, expression: 'happy' } },
  jakob: { name: 'Herr Jakob', outfit: { skin: '#ffe6d6', hair: '#d8c8a8', hairStyle: 'short', shirt: '#7fa6c8', shorts: '#4f5d75', shoe: '#5d6170', bag: null, accessory: 'glasses', eye: '#3f7fbf', expression: 'happy' } },
  tourist: { name: 'Khách Tây', outfit: { skin: '#ffe0cc', hair: '#e8c46a', hairStyle: 'ponytail', shirt: '#ffd166', shorts: '#4f5d75', shoe: '#ffffff', bag: null, accessory: 'cap', eye: '#4f9a6b', lashes: true, expression: 'happy' } },
  khai: { name: 'Anh Khải', outfit: NPCS.anhKhai?.outfit ?? { skin: '#e8b994', hair: '#1c1818', hairStyle: 'short', shirt: '#2f3a4d', shorts: '#2f3a4d', shoe: '#2f2f38', bag: null, accessory: 'sunglasses' } },
  xoi: { name: 'Bà bán xôi', outfit: { skin: '#f0c8a8', hair: '#cfcfd6', hairStyle: 'elderBun', shirt: '#9fd3b4', shorts: '#4f5d75', shoe: '#c49a6c', bag: null, accessory: 'nonLa' } },
}
const RIDER_LINE: Record<Rider, string> = {
  normal: 'Em ơi cho chị đi nhờ nhé!',
  jakob: 'Chào em! Hôm nay mình nói tiếng Đức hay tiếng Việt?',
  tourist: 'Can you tell me about the Old Quarter on the way?',
  khai: '(gọi điện liên tục) „Bao đậu visa, không cần B1 đâu chị…"',
  xoi: 'Cháu chở bà ra chợ Đồng Xuân với.',
}

interface Offer {
  kind: 'food' | 'ride'
  shop?: Shop
  rider?: Rider
  from: Node
  to: Node
  /** Street number of the drop, for the card. */
  no: number
  fare: number
  /** Edges: you → pickup, pickup → drop. */
  legs: [number, number]
  eta: number
}

const QUIZ: { q: string; options: string[] }[] = [
  { q: '„Phố Hàng Gai xưa bán gì vậy?"', options: ['Đay gai, dây thừng', 'Lụa tơ tằm', 'Đồ đồng'] },
  { q: '„Hồ Gươm gắn với truyền thuyết gì?"', options: ['Vua Lê trả gươm cho Rùa Thần', 'Thánh Gióng bay về trời', 'Sơn Tinh – Thủy Tinh'] },
  { q: '„Đình Hàng Gai thờ ai?"', options: ['Thành hoàng làng', 'Phật Bà Quan Âm', 'Vua Hùng'] },
  { q: '„Cây cầu đỏ sang đền Ngọc Sơn tên gì?"', options: ['Cầu Thê Húc', 'Cầu Long Biên', 'Cầu Rồng'] },
  { q: '„Năm 1989 ở Đức có chuyện gì lớn?"', options: ['Bức tường Berlin sụp đổ', 'Đức vô địch World Cup', 'Đồng Euro ra đời'] },
]

// -------------------------------------------------------------------------------------- state

interface Bike {
  x: number
  y: number
  dir: Dir | null
  /** Progress along the current edge, 0–1. */
  t: number
  want: Dir | null
  pause: number
  face: Dir
}
interface Order {
  offer: Offer
  leg: 'pick' | 'drop'
  time: number
  fined: boolean
}
interface Float {
  text: string
  x: number
  y: number
  age: number
  good: boolean
}
interface Talk {
  rider: Rider
  q: string
  options: { t: string; ok: boolean }[]
  note?: string
}
interface Game {
  left: number
  bike: Bike
  order: Order | null
  offers: Offer[] | null
  jams: string[]
  jamClock: number
  fares: number
  tips: number
  fines: number
  delivered: number
  stars: number[]
  floats: Float[]
  hint: { text: string; left: number } | null
  specials: Set<Rider>
}

export interface GrabOutcome {
  delivered: number
  stars: number[]
  fares: number
  tips: number
  fines: number
}

// ---------------------------------------------------------------------------------------- art

function ShopIcon({ id, size = 18 }: { id: string; size?: number }) {
  const sw = { stroke: INK, strokeWidth: 1.4, strokeLinejoin: 'round' as const }
  let g: ReactNode
  switch (id) {
    case 'pho':
      g = (
        <>
          <path d="M3 10h18c0 5-4 8-9 8s-9-3-9-8z" fill="#ffffff" {...sw} />
          <path d="M5 10c2-1 4 1 7 0s5-1 7 0" stroke="#f4c04e" strokeWidth="1.6" fill="none" />
          <path d="M15 3l-4 7M18 4l-5 6" stroke="#c49a6c" strokeWidth="1.4" strokeLinecap="round" />
        </>
      )
      break
    case 'banhMi':
      g = (
        <>
          <path d="M3 14c0-4 5-7 10-7s8 2 8 5-4 6-10 6-8-1-8-4z" fill="#e8b25e" {...sw} />
          <path d="M8 10l2 3M12 9l2 3M16 9l2 3" stroke="#b97a35" strokeWidth="1.3" strokeLinecap="round" />
        </>
      )
      break
    case 'traSua':
      g = (
        <>
          <path d="M6 7h12l-1.5 13h-9z" fill="#d8ab7e" {...sw} />
          <rect x="5" y="5" width="14" height="2.6" rx="1" fill="#ff8fab" {...sw} />
          <path d="M13 5l2-4" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="10" cy="17" r="1.3" fill={INK} />
          <circle cx="13.5" cy="17.5" r="1.3" fill={INK} />
        </>
      )
      break
    case 'caPhe':
      g = (
        <>
          <path d="M4 9h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z" fill="#fff6ea" {...sw} />
          <path d="M17 11h2a2 2 0 0 1 0 4h-2" fill="none" {...sw} />
          <ellipse cx="10.5" cy="9" rx="6.5" ry="1.8" fill="#f4d58a" />
          <path d="M8 6c-1-1 1-2 0-3M12 6c-1-1 1-2 0-3" stroke="#c9ccd2" strokeWidth="1.2" fill="none" />
        </>
      )
      break
    case 'bunCha':
      g = (
        <>
          <rect x="3" y="11" width="18" height="7" rx="2" fill="#5d6170" {...sw} />
          <path d="M4 11l2-3M9 11l2-3M14 11l2-3M19 11l1-2" stroke={INK} strokeWidth="1" />
          <ellipse cx="8" cy="9" rx="3" ry="2" fill="#a8603a" {...sw} />
          <ellipse cx="15" cy="9" rx="3" ry="2" fill="#a8603a" {...sw} />
          <path d="M7 4c-1-1 1-2 0-3M15 4c-1-1 1-2 0-3" stroke="#c9ccd2" strokeWidth="1.2" fill="none" />
        </>
      )
      break
    default:
      g = (
        <>
          <path d="M6 4h12l-2 16H8z" fill="#ffffff" {...sw} />
          <path d="M6.6 9h10.8l-.5 4H7.1z" fill="#a8d86b" />
          <path d="M7.2 13h9.6l-.6 5H7.8z" fill="#f4c04e" />
          <circle cx="10" cy="7" r="1.2" fill="#e2574c" />
        </>
      )
  }
  return (
    <svg viewBox="0 0 24 22" width={size} height={size} aria-hidden="true">
      {g}
    </svg>
  )
}

const hash = (x: number, y: number, k: number) => {
  const v = Math.sin(x * 127.1 + y * 311.7 + k * 74.7) * 43758.5453
  return v - Math.floor(v)
}
const ROOF = ['#e8735a', '#f4c04e', '#9fd3b4', '#f8a5b4', '#7fb8e8', '#e3b27a', '#cdb8f0', '#fff3d6']

/** The map that never changes in a shift: blocks of tube houses, trees, the lake, roads, signs. */
function StaticMap({ weekend }: { weekend: boolean }) {
  const blocks: ReactNode[] = []
  for (let y = 0; y < ROWS - 1; y++)
    for (let x = 0; x < COLS - 1; x++) {
      if (x >= LAKE.x0 && x < LAKE.x1 && y >= LAKE.y0 && y < LAKE.y1) continue
      const x0 = px(x) + 9
      const y0 = px(y) + 9
      const w = U - 18
      const houses: ReactNode[] = []
      // A ring of narrow tube houses around the block; a little courtyard tree in the middle
      const n = 4
      for (let i = 0; i < n; i++) {
        const hw = w / n
        for (const [hy, hh] of [
          [y0, 11],
          [y0 + w - 11, 11],
        ] as const) {
          const c = ROOF[Math.floor(hash(x, y, i + hy) * ROOF.length)]
          houses.push(<rect key={`${i}-${hy}`} x={x0 + i * hw + 0.6} y={hy} width={hw - 1.2} height={hh} rx="1.4" fill={c} stroke={INK} strokeWidth="0.9" />)
          houses.push(<rect key={`r${i}-${hy}`} x={x0 + i * hw + 2} y={hy + 3.5} width={hw - 4} height="2" rx="1" fill="#ffffff" opacity="0.35" />)
        }
      }
      for (const side of [0, 1]) {
        const c = ROOF[Math.floor(hash(x, y, 9 + side) * ROOF.length)]
        houses.push(<rect key={`s${side}`} x={side ? x0 + w - 10 : x0} y={y0 + 12} width="10" height={w - 24} rx="1.4" fill={c} stroke={INK} strokeWidth="0.9" />)
      }
      const tree = hash(x, y, 3) > 0.35
      blocks.push(
        <g key={`b${x}${y}`}>
          <rect x={x0 - 2} y={y0 - 2} width={w + 4} height={w + 4} rx="5" fill="#e9dcc4" />
          {houses}
          {tree && (
            <g>
              <circle cx={x0 + w / 2} cy={y0 + w / 2} r="6.5" fill="#6fae5f" stroke={INK} strokeWidth="0.9" />
              <circle cx={x0 + w / 2 - 2} cy={y0 + w / 2 - 2} r="2.2" fill="#9fd3b4" />
            </g>
          )}
        </g>,
      )
    }
  // Hồ Gươm with Tháp Rùa and the red Thê Húc bridge to the temple island
  const lx = px(LAKE.x0) + 9
  const ly = px(LAKE.y0) + 9
  const lw = px(LAKE.x1) - px(LAKE.x0) - 18
  const lh = px(LAKE.y1) - px(LAKE.y0) - 18
  const lake = (
    <g>
      <rect x={lx - 2} y={ly - 2} width={lw + 4} height={lh + 4} rx="18" fill="#9fd3b4" />
      <rect x={lx + 3} y={ly + 3} width={lw - 6} height={lh - 6} rx="16" fill="#7cc4dc" stroke={INK} strokeWidth="1.2" />
      <path d={`M${lx + 14} ${ly + 22}q12 -4 24 0M${lx + 40} ${ly + lh - 24}q10 -4 20 0`} stroke="#ffffff" strokeWidth="1.6" fill="none" opacity="0.6" strokeLinecap="round" />
      <ellipse cx={lx + lw / 2 + 4} cy={ly + lh / 2 + 4} rx="7" ry="5" fill="#9fd3b4" stroke={INK} strokeWidth="0.9" />
      <rect x={lx + lw / 2} y={ly + lh / 2 - 2} width="8" height="9" fill="#e8dcc4" stroke={INK} strokeWidth="0.9" />
      <ellipse cx={lx + lw - 16} cy={ly + 16} rx="9" ry="7" fill="#9fd3b4" stroke={INK} strokeWidth="0.9" />
      <rect x={lx + lw - 20} y={ly + 11} width="9" height="7" rx="1" fill="#e2574c" stroke={INK} strokeWidth="0.9" />
      <path d={`M${lx + lw - 8} ${ly + 10}q6 -6 12 -10`} stroke="#d4202a" strokeWidth="3" fill="none" strokeLinecap="round" />
      <text x={lx + 22} y={ly + lh - 12} fontSize="8" fontWeight="900" fill="#2f6b8f" opacity="0.8">
        Hồ Gươm
      </text>
    </g>
  )
  const roads = EDGES.map(([a, b]) => {
    const k = ek(a.x, a.y, b.x, b.y)
    const wide = a.y === b.y && WIDE_ROWS.has(a.y)
    const walk = weekend && WALK.has(k)
    return (
      <g key={k}>
        <line x1={px(a.x)} y1={px(a.y)} x2={px(b.x)} y2={px(b.y)} stroke="#d9cdb5" strokeWidth={wide ? 22 : 18} strokeLinecap="round" />
        <line x1={px(a.x)} y1={px(a.y)} x2={px(b.x)} y2={px(b.y)} stroke={walk ? '#ffc9d6' : '#6f7480'} strokeWidth={wide ? 15 : 11} strokeLinecap="round" />
        {wide && !walk && <line x1={px(a.x)} y1={px(a.y)} x2={px(b.x)} y2={px(b.y)} stroke="#ffffff" strokeWidth="1.3" strokeDasharray="5 5" opacity="0.7" />}
      </g>
    )
  })
  const walkers = weekend
    ? [0, 1, 2, 3].flatMap((x) =>
        [0.25, 0.6, 0.85].map((f, i) => <circle key={`w${x}${i}`} cx={px(x + f)} cy={px(2) + (i % 2 ? 2.5 : -2.5)} r="2" fill={['#e2574c', '#4f86d9', '#f4c04e'][(x + i) % 3]} stroke={INK} strokeWidth="0.6" />),
      )
    : null
  const arrows = [...ONE_WAY.entries()].map(([k, d]) => {
    const [a, b] = k.split('-').map((s) => s.split(',').map(Number))
    const cx = px((a[0] + b[0]) / 2)
    const cy = px((a[1] + b[1]) / 2)
    return (
      <g key={`o${k}`} transform={`translate(${cx} ${cy}) rotate(${d * 90})`}>
        <path d="M-6 -3.5l5 3.5-5 3.5M0 -3.5l5 3.5-5 3.5" stroke="#ffffff" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    )
  })
  const label = (text: string, x: number, y: number, vertical = false, color = INK) => (
    <text key={text} x={x} y={y} fontSize="7.5" fontWeight="900" fill={color} opacity="0.75" textAnchor="middle" transform={vertical ? `rotate(-90 ${x} ${y})` : undefined} style={{ paintOrder: 'stroke', stroke: '#fbf3e4', strokeWidth: 2.4 }}>
      {text}
    </text>
  )
  const labels = [
    label('Tràng Tiền', px(2.5), px(0) - 11),
    label('Hàng Bạc  →', px(1.5), px(1) - 8),
    label(weekend ? 'Hàng Đào · phố đi bộ' : 'Hàng Đào', px(2), px(2) - 8, false, weekend ? '#d6336c' : INK),
    label('Hàng Gai', px(2.5), px(3) - 10),
    label('Hàng Trống', px(1.5), px(4) - 8),
    label('Hàng Khay', px(4), px(6) + 13),
    label('Hàng Bông', px(1) - 8, px(1.5), true),
    label('Lê Thái Tổ', px(3) - 8, px(5), true),
    label('Đinh Tiên Hoàng', px(5) + 13, px(4.5), true),
  ]
  return (
    <g>
      <rect x="0" y={-TOP} width={W} height={H} fill="#cfe3c0" />
      {blocks}
      {lake}
      {roads}
      {walkers}
      {arrows}
      {labels}
    </g>
  )
}

/** Bố's blue Wave from above, the rider in the green helmet; a food box or a passenger behind. */
function Scooter({ load, passenger }: { load: boolean; passenger: string | null }) {
  return (
    <g>
      <ellipse cx="0" cy="2" rx="13" ry="6" fill={INK} opacity="0.2" />
      <rect x="-12" y="-4.5" width="24" height="9" rx="4.5" fill="#7fb8e8" stroke={INK} strokeWidth="1.4" />
      <rect x="7" y="-8" width="2.6" height="16" rx="1.3" fill="#3b4252" stroke={INK} strokeWidth="0.8" />
      <circle cx="12.5" cy="0" r="1.8" fill="#fff6c8" stroke={INK} strokeWidth="0.6" />
      {load && <rect x="-16" y="-6" width="9" height="12" rx="1.5" fill="#3fae72" stroke={INK} strokeWidth="1.2" />}
      {load && <path d="M-14 -2h5M-14 1h5" stroke="#ffffff" strokeWidth="1" />}
      {passenger && <circle cx="-7" cy="0" r="4.8" fill={passenger} stroke={INK} strokeWidth="1.2" />}
      <circle cx="1" cy="0" r="5.4" fill="#3fae72" stroke={INK} strokeWidth="1.3" />
      <path d="M3.5 -3a4 4 0 0 1 0 6" stroke="#ffffff" strokeWidth="1.3" fill="none" opacity="0.8" />
    </g>
  )
}

function Pin({ at, color, children, pulse }: { at: Node; color: string; children: ReactNode; pulse?: boolean }) {
  return (
    <g transform={`translate(${px(at.x)} ${px(at.y)})`}>
      {pulse && (
        <circle r="10" fill="none" stroke={color} strokeWidth="2.5">
          <animate attributeName="r" values="8;20" dur="1.2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.9;0" dur="1.2s" repeatCount="indefinite" />
        </circle>
      )}
      <g>
        <animateTransform attributeName="transform" type="translate" values="0 0;0 -3;0 0" dur="0.9s" repeatCount="indefinite" />
        <path d="M0 0c-3-5-11-9-11-17a11 11 0 0 1 22 0c0 8-8 12-11 17z" fill={color} stroke={INK} strokeWidth="1.5" />
        <circle cy="-17" r="8" fill="#ffffff" />
        <g transform="translate(-8 -25)">{children}</g>
      </g>
    </g>
  )
}

// ---------------------------------------------------------------------------------------- game

export function GrabGame({ rain, rank, onComplete }: { rain: boolean; rank: number; onComplete: (correct: number, total: number, extra?: number) => void }) {
  const day = useTime.getState().day
  const minutes = useTime.getState().minutes
  const weekend = weekdayIndex(day) >= 5
  const early = minutes < 8 * 60
  const dusk = minutes >= 18 * 60
  const speed = G.speed * (rain ? 0.85 : 1) * (1 + rank * 0.06)

  const g = useRef<Game>(null as unknown as Game)
  const randomJams = useCallback(() => {
    const free = EDGES.map(([a, b]) => ek(a.x, a.y, b.x, b.y)).filter((k) => !WALK.has(k))
    return shuffle(free).slice(0, 3 + rank)
  }, [rank])
  if (!g.current) {
    g.current = {
      left: G.seconds,
      bike: { x: 2, y: 3, dir: null, t: 0, want: null, pause: 0, face: 0 },
      order: null,
      offers: null,
      jams: randomJams(),
      jamClock: 12,
      fares: 0,
      tips: 0,
      fines: 0,
      delivered: 0,
      stars: [],
      floats: [],
      hint: null,
      specials: new Set(),
    }
  }
  const [, setFrame] = useState(0)
  const render = useCallback(() => setFrame((n) => n + 1), [])
  const [talk, setTalk] = useState<Talk | null>(null)
  const [confirm, setConfirm] = useState(false)
  const [summary, setSummary] = useState<GrabOutcome | null>(null)
  const paused = useRef(false)
  paused.current = !!talk || confirm || !!summary
  const swipe = useRef<{ x: number; y: number } | null>(null)

  const hint = (text: string) => {
    g.current.hint = { text, left: 1.8 }
  }

  const makeOffer = useCallback(
    (kind: 'food' | 'ride', from: Node, rider: Rider = 'normal'): Offer => {
      let a: Node
      let b: Node
      let shop: Shop | undefined
      const far = (p: Node, q: Node, d: number) => Math.abs(p.x - q.x) + Math.abs(p.y - q.y) >= d
      if (kind === 'food') {
        shop = pick(SHOPS.filter((s) => far(s.at, from, 1)))
        a = shop.at
      } else {
        a = pick(NODES.filter((n) => far(n, from, 2) && !(weekend && n.y === 2 && n.x < 5)))
      }
      do b = pick(NODES)
      while (!far(a, b, 4) || (weekend && b.y === 2 && b.x < 5))
      const l1 = route(from, a, weekend).length - 1
      const l2 = route(a, b, weekend).length - 1
      const fare = Math.round(((G.fareBase + G.farePerEdge * (l2 + l1 * 0.5)) * (rain ? 1 + G.rainBonus : 1)) / 1000) * 1000
      const eta = ((l1 + l2) / speed) * 1.45 + 4
      return { kind, shop, rider: kind === 'ride' ? rider : undefined, from: a, to: b, no: 2 + Math.floor(Math.random() * 90), fare: rider === 'xoi' ? 0 : fare, legs: [l1, l2], eta }
    },
    [weekend, rain, speed],
  )

  const newOffers = useCallback(() => {
    const s = g.current
    const at = { x: s.bike.x, y: s.bike.y }
    let rider: Rider = 'normal'
    const roll = Math.random()
    if (early && !getFlag('grab.xoiDay') && !s.specials.has('xoi')) rider = 'xoi'
    else if (roll < 0.22 && flagNumber('grab.jakob') < 5 && !s.specials.has('jakob')) rider = 'jakob'
    else if (roll < 0.42 && !s.specials.has('tourist')) rider = 'tourist'
    else if (roll < 0.55 && !getFlag('khai.overheard') && !s.specials.has('khai')) rider = 'khai'
    const second: Offer = Math.random() < 0.55 || rider !== 'normal' ? makeOffer('ride', at, rider) : makeOffer('food', at)
    s.offers = Math.random() < 0.5 ? [makeOffer('food', at), second] : [second, makeOffer('food', at)]
    playSfx('pickup')
  }, [early, makeOffer])

  const end = useCallback(() => {
    const s = g.current
    setConfirm(false)
    setSummary({ delivered: s.delivered, stars: s.stars, fares: s.fares, tips: s.tips, fines: s.fines })
    playSfx('success')
  }, [])

  /** Arrived at a crossing: pickup / drop / fines. */
  const arrive = useCallback(
    (b: Bike) => {
      const s = g.current
      const o = s.order
      if (!o) return
      const target = o.leg === 'pick' ? o.offer.from : o.offer.to
      if (b.x !== target.x || b.y !== target.y) return
      b.dir = null
      b.t = 0
      b.want = null
      b.pause = 0.45
      if (o.leg === 'pick') {
        o.leg = 'drop'
        playSfx('honk')
        s.floats.push({ text: o.offer.kind === 'food' ? 'Đã lấy món!' : 'Khách lên xe!', x: px(b.x), y: px(b.y) - 16, age: 0, good: true })
        return
      }
      // Delivered
      const r = o.time / o.offer.eta
      const stars = r <= 1 ? 5 : r <= 1.25 ? 4 : r <= 1.55 ? 3 : 2
      const tip = stars === 5 && o.offer.rider !== 'xoi' ? G.tip + Math.floor(Math.random() * 3) * 5_000 : 0
      s.fares += o.offer.fare
      s.tips += tip
      s.delivered++
      s.stars.push(stars)
      s.order = null
      playSfx('coin')
      s.floats.push({ text: `${o.offer.fare + tip > 0 ? '+' + vnd(o.offer.fare + tip) + ' ' : ''}${'★'.repeat(stars)}`, x: px(b.x), y: px(b.y) - 16, age: 0, good: stars >= 4 })
      const rider = o.offer.rider
      if (rider && rider !== 'normal') s.specials.add(rider)
      if (rider === 'jakob') {
        const n = flagNumber('grab.jakob') + 1
        setFlag('grab.jakob', n)
        if (n >= 5) setFlag('jakob.bakery', true)
        const sentence = pick(SENTENCES.filter((x) => x.level <= 2))
        const others = shuffle(SENTENCES.filter((x) => x.de !== sentence.de)).slice(0, 2)
        setTalk({
          rider,
          q: n >= 5 ? `„Khi nào sang Lindenberg, nhớ đến tiệm bánh của em gái tôi nhé!" — rồi ông hỏi: „${sentence.de}" nghĩa là gì?` : `Herr Jakob sửa tiếng Đức cho em: „${sentence.de}" nghĩa là gì?`,
          options: shuffle([{ t: sentence.meaning.vi, ok: true }, ...others.map((x) => ({ t: x.meaning.vi, ok: false }))]),
        })
      } else if (rider === 'tourist') {
        const qz = pick(QUIZ)
        setTalk({ rider, q: qz.q, options: shuffle(qz.options.map((t, i) => ({ t, ok: i === 0 }))) })
      } else if (rider === 'khai') {
        setFlag('khai.overheard', true)
        setTalk({ rider, q: 'Bạn nghe lén được cả cuộc gọi: Hoàng Kim hứa „không cần B1, bao đậu"… Phải báo cho Linh!', options: [{ t: 'Ghi nhớ, lát nhắn Linh', ok: true }], note: 'khai' })
      } else if (rider === 'xoi') {
        setFlag('grab.xoiDay', useTime.getState().day)
        usePlayer.getState().restoreEnergy(15)
        setTalk({ rider, q: 'Bà không có tiền lẻ, bà gửi cháu gói xôi nóng nhé. „Cháu ăn đi cho có sức chạy xe!"', options: [{ t: 'Cháu cảm ơn bà ạ!', ok: true }], note: 'xoi' })
      }
    },
    [],
  )

  // Game loop
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    let shown = 0
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      const s = g.current
      if (paused.current) return
      s.left -= dt
      if (s.left <= 0) {
        s.left = 0
        end()
        return
      }
      if (!s.order && !s.offers) newOffers()
      if (s.order) s.order.time += dt
      s.jamClock -= dt
      if (s.jamClock <= 0) {
        s.jamClock = 12
        s.jams = randomJams()
      }
      if (s.hint) {
        s.hint.left -= dt
        if (s.hint.left <= 0) s.hint = null
      }
      for (const f of s.floats) f.age += dt
      s.floats = s.floats.filter((f) => f.age < 1.4)

      const b = s.bike
      if (b.pause > 0) b.pause -= dt
      else {
        if (b.dir === null && b.want !== null) {
          if (canGo(b.x, b.y, b.want)) {
            b.dir = b.want
            b.face = b.want
            b.want = null
            enterEdge(b)
          }
        }
        if (b.dir !== null) {
          // Turn back in the middle of a street
          if (b.want !== null && b.want === (b.dir + 2) % 4 && b.t > 0) {
            const nx = b.x + DX[b.dir]
            const ny = b.y + DY[b.dir]
            if (canGo(nx, ny, b.want)) {
              b.x = nx
              b.y = ny
              b.t = 1 - b.t
              b.dir = b.want
              b.face = b.want
            } else hint('Phố một chiều — không quay đầu được!')
            b.want = null
          }
          const k = ek(b.x, b.y, b.x + DX[b.dir], b.y + DY[b.dir])
          const mult = (s.jams.includes(k) ? 0.33 : 1) * (weekend && WALK.has(k) ? 0.5 : 1)
          b.t += speed * mult * dt
          while (b.t >= 1 && b.dir !== null) {
            b.x += DX[b.dir]
            b.y += DY[b.dir]
            b.t -= 1
            arrive(b)
            if (b.dir === null) break
            if (b.want !== null && b.want !== b.dir && canGo(b.x, b.y, b.want)) {
              b.dir = b.want
              b.face = b.want
              b.want = null
            } else if (!canGo(b.x, b.y, b.dir)) {
              b.dir = null
              b.t = 0
              break
            }
            enterEdge(b)
          }
        }
      }
      if (b.dir !== null || s.floats.length || now - shown > 120) {
        shown = now
        render()
      }
    }
    /** Starting down a street: the walking-street fine. */
    function enterEdge(b: Bike) {
      const s = g.current
      if (b.dir === null || !weekend) return
      const k = ek(b.x, b.y, b.x + DX[b.dir], b.y + DY[b.dir])
      if (!WALK.has(k)) return
      const o = s.order
      if (o?.fined) return
      if (o) o.fined = true
      s.fines += G.fine
      playSfx('whistle')
      s.floats.push({ text: `Phạt ${vnd(G.fine)}!`, x: px(b.x), y: px(b.y) - 16, age: 0, good: false })
      hint('Phố đi bộ cuối tuần — CSGT thổi còi phạt!')
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [arrive, end, newOffers, randomJams, render, speed, weekend])

  const steer = useCallback(
    (d: Dir) => {
      const s = g.current
      if (paused.current) return
      const b = s.bike
      if (b.dir === null && b.pause <= 0 && !canGo(b.x, b.y, d)) {
        const k = ek(b.x, b.y, b.x + DX[d], b.y + DY[d])
        playSfx('wrong')
        hint(ROAD.has(k) ? 'Phố một chiều — đi ngược chiều là bị phạt đấy!' : 'Không có đường đi lối này.')
        render()
        return
      }
      b.want = d
      render()
    },
    [render],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const m: Record<string, Dir> = { ArrowRight: 0, KeyD: 0, ArrowDown: 1, KeyS: 1, ArrowLeft: 2, KeyA: 2, ArrowUp: 3, KeyW: 3 }
      if (e.code === 'Escape' && !summary && !talk) {
        setConfirm((c) => !c)
        return
      }
      const d = m[e.code]
      if (d !== undefined) {
        e.preventDefault()
        steer(d)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [steer, summary, talk])

  const accept = (o: Offer) => {
    const s = g.current
    s.offers = null
    s.order = { offer: o, leg: 'pick', time: 0, fined: false }
    playSfx('click')
    if (s.bike.dir === null) arrive(s.bike)
    render()
  }

  const answer = (ok: boolean) => {
    if (!talk) return
    if (!talk.note) {
      playSfx(ok ? 'right' : 'wrong')
      if (ok) {
        if (talk.rider === 'tourist') {
          const extra = 50_000 + Math.floor(Math.random() * 6) * 10_000
          g.current.tips += extra
          g.current.floats.push({ text: `Tip +${vnd(extra)}`, x: px(g.current.bike.x), y: px(g.current.bike.y) - 16, age: 0, good: true })
        } else usePlayer.getState().addGermanXp(3)
        bumpFlag('grab.talksOk')
      }
    }
    setTalk(null)
  }

  const static_ = useMemo(() => <StaticMap weekend={weekend} />, [weekend])

  const s = g.current
  const b = s.bike
  const o = s.order
  const bx = px(b.x + (b.dir !== null ? DX[b.dir] * b.t : 0))
  const by = px(b.y + (b.dir !== null ? DY[b.dir] * b.t : 0))
  const target = o ? (o.leg === 'pick' ? o.offer.from : o.offer.to) : null
  const gps = target ? route({ x: b.dir !== null ? b.x + DX[b.dir] : b.x, y: b.dir !== null ? b.y + DY[b.dir] : b.y }, target, weekend) : []
  const gpsPath = target ? `M${bx} ${by}` + gps.map((n) => `L${px(n.x)} ${px(n.y)}`).join('') : ''
  const secs = Math.ceil(s.left)
  const earned = s.fares + s.tips - s.fines
  const etaLeft = o ? Math.max(0, 1 - o.time / o.offer.eta) : 0
  const passengerColor = o && o.leg === 'drop' && o.offer.kind === 'ride' ? RIDER_LOOK[o.offer.rider ?? 'normal'].outfit.shirt : null

  return (
    <div className="pointer-events-auto absolute inset-0 z-40 flex justify-center bg-[#4a3226]/60 select-none" style={{ touchAction: 'none' }} onContextMenu={(e) => e.preventDefault()} data-testid="grab-game">
      <section className="relative flex h-full w-full max-w-md flex-col overflow-hidden bg-[#eef6ee] text-ink" role="dialog" aria-modal="true" aria-label="Chạy Grab">
        {/* App bar */}
        <div className="shrink-0 border-b-2 border-outline bg-[#3fae72] px-3 pb-1.5 text-white" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 6px)' }}>
          <div className="flex items-center gap-2">
            <span className="flex min-w-0 flex-col leading-none">
              <span className="font-display text-[17px] font-extrabold tracking-wide">Grab</span>
              <span className="mt-0.5 flex gap-1 text-[9.5px] font-black whitespace-nowrap">
                <span className="rounded-full bg-white/25 px-1.5">{['Tài xế mới', 'Quen việc', 'Tài xế giỏi'][rank]}</span>
                {rain && <span className="rounded-full bg-[#2f6b8f] px-1.5">Mưa +{Math.round(G.rainBonus * 100)}%</span>}
                {weekend && <span className="rounded-full bg-[#d6336c] px-1.5">Cuối tuần</span>}
              </span>
            </span>
            <span className="ml-auto rounded-full border-2 border-outline bg-white px-2 py-0.5 text-[13px] font-black text-ink tabular-nums" data-testid="grab-earned">
              {vnd(Math.max(0, earned))}
            </span>
            <span data-testid="grab-time" className={`rounded-full border-2 border-outline px-2 py-0.5 text-[13px] font-black tabular-nums ${secs <= 10 ? 'animate-pulse bg-lacquer text-gold-light' : 'bg-white text-ink'}`}>
              {secs}s
            </span>
            <button type="button" data-testid="grab-quit" aria-label="Tắt app" onClick={() => setConfirm(true)} className="grid h-7 w-7 place-items-center rounded-full border-2 border-outline bg-cream text-sm font-black text-ink shadow-[0_2px_0_var(--color-outline)] active:translate-y-0.5">
              ✕
            </button>
          </div>
        </div>

        {/* Order / offers */}
        <div className="shrink-0 px-2 pt-1.5">
          {o ? (
            <div className="flex items-center gap-2 rounded-2xl border-2 border-outline bg-white px-2 py-1.5 shadow-[0_3px_0_var(--color-outline)]" data-testid="grab-order" data-leg={o.leg}>
              <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-outline" style={{ background: o.offer.shop?.color ?? '#fff6e3' }}>
                {o.offer.kind === 'food' ? <ShopIcon id={o.offer.shop!.id} size={28} /> : <Portrait outfit={RIDER_LOOK[o.offer.rider ?? 'normal'].outfit} size={40} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] leading-tight font-black">
                  {o.leg === 'pick' ? (o.offer.kind === 'food' ? `Lấy món ở ${o.offer.shop!.name}` : `Đón ${RIDER_LOOK[o.offer.rider ?? 'normal'].name}`) : `Giao tới số ${o.offer.no} ${ROW_NAMES[o.offer.to.y]}`}
                </p>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="text-[10px] font-black text-ink/55">ETA</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full border-2 border-outline bg-white">
                    <div className={`h-full ${etaLeft > 0.4 ? 'bg-[#6fcf97]' : etaLeft > 0.15 ? 'bg-[#f4c04e]' : 'bg-[#e8697d]'}`} style={{ width: `${etaLeft * 100}%` }} />
                  </div>
                  <span className="text-[11px] font-black tabular-nums">{o.offer.fare ? vnd(o.offer.fare) : 'xôi'}</span>
                </div>
              </div>
            </div>
          ) : s.offers ? (
            <div className="grid grid-cols-2 gap-1.5">
              {s.offers.map((of, i) => (
                <button key={i} type="button" data-testid={`grab-offer-${i}`} onClick={() => accept(of)} className="animate-pop flex flex-col rounded-2xl border-2 border-outline bg-white px-2 py-1.5 text-left shadow-[0_3px_0_var(--color-outline)] active:translate-y-0.5">
                  <span className="flex items-center gap-1.5">
                    <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-outline" style={{ background: of.shop?.color ?? '#fff6e3' }}>
                      {of.kind === 'food' ? <ShopIcon id={of.shop!.id} size={20} /> : <Portrait outfit={RIDER_LOOK[of.rider ?? 'normal'].outfit} size={30} />}
                    </span>
                    <span className="min-w-0 text-[11.5px] leading-tight font-black">{of.kind === 'food' ? of.shop!.name : RIDER_LOOK[of.rider ?? 'normal'].name}</span>
                  </span>
                  <span className="mt-0.5 line-clamp-2 text-[10.5px] leading-tight font-bold text-ink/65">{of.kind === 'food' ? `Giao đồ ăn → ${ROW_NAMES[of.to.y]}` : RIDER_LINE[of.rider ?? 'normal']}</span>
                  <span className="mt-0.5 flex items-center justify-between text-[11px] font-black">
                    <span className="text-ink/55">{((of.legs[0] + of.legs[1]) * 0.25).toFixed(1).replace('.', ',')} km</span>
                    <span className="text-[#2f8c5a]">{of.fare ? vnd(of.fare) : 'gói xôi'}</span>
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {/* Shift so far */}
        <div className="mx-2 mt-1.5 flex shrink-0 items-center justify-between rounded-full bg-white/70 px-3 py-0.5 text-[11px] font-black text-ink/70" data-testid="grab-stats">
          <span>
            Đã giao <b className="text-ink">{s.delivered}</b>
          </span>
          <span>
            ★ <b className="text-ink">{s.stars.length ? (s.stars.reduce((a, v) => a + v, 0) / s.stars.length).toFixed(1).replace('.', ',') : '–'}</b>
          </span>
          <span>
            Tip <b className="text-ink">{vnd(s.tips)}</b>
          </span>
          {s.fines > 0 && <b className="text-lacquer">Phạt −{vnd(s.fines)}</b>}
        </div>

        {/* Map: as big as fits, keeping its shape */}
        <div className="mx-2 mt-1.5 grid min-h-0 flex-1 place-items-center [container-type:size]">
        <div
          className="relative overflow-hidden rounded-2xl border-2 border-outline bg-[#cfe3c0] shadow-[0_3px_0_var(--color-outline)]"
          style={{ width: `min(100cqw, calc(100cqh * ${W / H}))`, height: `min(100cqh, calc(100cqw * ${H / W}))` }}
          onPointerDown={(e) => {
            swipe.current = { x: e.clientX, y: e.clientY }
          }}
          onPointerUp={(e) => {
            const st = swipe.current
            swipe.current = null
            if (!st) return
            const dx = e.clientX - st.x
            const dy = e.clientY - st.y
            if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return
            steer(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 0 : 2) : dy > 0 ? 1 : 3)
          }}
          data-testid="grab-map"
          data-bike={`${b.x},${b.y}`}
          data-dir={b.dir ?? ''}
          data-target={target ? `${target.x},${target.y}` : ''}
        >
          <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" aria-hidden="true">
            <g transform={`translate(0 ${TOP})`}>
            {static_}
            {s.jams.map((k) => {
              const [a2, b2] = k.split('-').map((p) => p.split(',').map(Number))
              const horiz = a2[1] === b2[1]
              return (
                <g key={`j${k}`}>
                  <line x1={px(a2[0])} y1={px(a2[1])} x2={px(b2[0])} y2={px(b2[1])} stroke="#e8463b" strokeWidth="8" strokeLinecap="round" opacity="0.55" />
                  {[0.3, 0.5, 0.7].map((f, i) => {
                    const cx = px(a2[0] + (b2[0] - a2[0]) * f)
                    const cy = px(a2[1] + (b2[1] - a2[1]) * f)
                    return <rect key={i} x={cx - (horiz ? 5 : 3)} y={cy - (horiz ? 3 : 5)} width={horiz ? 10 : 6} height={horiz ? 6 : 10} rx="1.5" fill={['#f4c04e', '#ffffff', '#4f86d9'][i]} stroke={INK} strokeWidth="0.8" />
                  })}
                </g>
              )
            })}
            {dusk && <rect x="0" y={-TOP} width={W} height={H} fill="#28305a" opacity="0.28" />}
            {target && <path d={gpsPath} stroke="#3f7fe0" strokeWidth="3.2" fill="none" strokeDasharray="1 6" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />}
            {o && o.leg === 'pick' && (
              <Pin at={o.offer.from} color={o.offer.shop?.color ?? '#3fae72'} pulse>
                {o.offer.kind === 'food' ? <ShopIcon id={o.offer.shop!.id} size={16} /> : <circle cx="8" cy="8" r="5" fill={RIDER_LOOK[o.offer.rider ?? 'normal'].outfit.shirt} stroke={INK} strokeWidth="1.2" />}
              </Pin>
            )}
            {o && (
              <Pin at={o.offer.to} color={o.leg === 'drop' ? '#d6336c' : '#c9ccd2'} pulse={o.leg === 'drop'}>
                <path d="M3 9l5-5 5 5v6H3z" fill="#fff3d6" stroke={INK} strokeWidth="1.2" strokeLinejoin="round" />
              </Pin>
            )}
            {!o && s.offers && s.offers.map((of, i) => <circle key={i} cx={px(of.from.x)} cy={px(of.from.y)} r="6" fill={of.shop?.color ?? '#3fae72'} stroke={INK} strokeWidth="1.2" opacity="0.8" />)}
            <g transform={`translate(${bx} ${by}) rotate(${b.face * 90})`} data-testid="grab-bike">
              <Scooter load={!!o && o.leg === 'drop' && o.offer.kind === 'food'} passenger={passengerColor} />
              {dusk && <path d="M13 0l26 -9v18z" fill="#fff6c8" opacity="0.35" />}
            </g>
            {b.want !== null && (
              <text x={bx} y={by - 15} textAnchor="middle" fontSize="13" fontWeight="900" fill="#3f7fe0" style={{ paintOrder: 'stroke', stroke: '#ffffff', strokeWidth: 3 }}>
                {ARROWS[b.want]}
              </text>
            )}
            {s.floats.map((f, i) => (
              <text key={i} x={Math.max(48, Math.min(W - 48, f.x))} y={f.y - f.age * 22} textAnchor="middle" fontSize="11" fontWeight="900" fill={f.good ? '#2f8c5a' : '#d4202a'} opacity={1 - f.age / 1.4} style={{ paintOrder: 'stroke', stroke: '#ffffff', strokeWidth: 3 }}>
                {f.text}
              </text>
            ))}
            </g>
          </svg>
          {rain && <div className="animate-rain pointer-events-none absolute inset-0 opacity-60" style={{ backgroundImage: 'repeating-linear-gradient(105deg, transparent 0 14px, rgba(255,255,255,0.75) 14px 15px, transparent 15px 34px)', backgroundSize: '60px 60px' }} />}
          {s.hint && (
            <p className="animate-pop absolute top-2 left-1/2 w-[90%] -translate-x-1/2 rounded-xl border-2 border-outline bg-[#fff3c9] px-2 py-1 text-center text-[12px] font-black shadow-[0_2px_0_var(--color-outline)]" data-testid="grab-hint">
              {s.hint.text}
            </p>
          )}
          {!o && s.offers && (
            <p className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-ink/70 px-3 py-0.5 text-[11px] font-black whitespace-nowrap text-white">Chọn 1 đơn ở trên ↑</p>
          )}
        </div>
        </div>

        {/* Controls */}
        <div className="shrink-0 px-2 pt-1.5" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 8px)' }}>
          <p className="mb-1 text-center text-[10.5px] font-bold text-ink/55">Bấm hướng (hoặc vuốt bản đồ): xe rẽ ở ngã tư kế tiếp · đỏ = tắc đường · » = một chiều</p>
          <div className="grid grid-cols-4 gap-1.5">
            {([2, 3, 1, 0] as Dir[]).map((d) => (
              <button
                key={d}
                type="button"
                data-testid={`pad-${ARROWS[d]}`}
                onPointerDown={(e) => {
                  e.preventDefault()
                  steer(d)
                }}
                className={`h-14 rounded-2xl text-2xl font-black active:translate-y-0.5 [@media(min-height:760px)]:h-[4.6rem] [@media(min-height:760px)]:text-3xl ${b.want === d ? 'btn-jade' : 'btn-lacquer'}`}
              >
                {ARROWS[d]}
              </button>
            ))}
          </div>
        </div>

        {talk && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-ink/45 p-5">
            <div className="panel animate-pop w-full max-w-xs p-4 text-ink" data-testid="grab-talk">
              <div className="flex items-center gap-2">
                <span className="rounded-full border-2 border-outline bg-cream">
                  <Portrait outfit={RIDER_LOOK[talk.rider].outfit} size={48} />
                </span>
                <b className="font-display text-lg">{RIDER_LOOK[talk.rider].name}</b>
              </div>
              <p className="mt-2 text-[14px] leading-snug font-bold">{talk.q}</p>
              <div className="mt-3 flex flex-col gap-2">
                {talk.options.map((op, i) => (
                  <button key={i} type="button" data-testid={`grab-talk-${i}`} onClick={() => answer(op.ok)} className="rounded-2xl border-2 border-outline bg-cream px-3 py-2.5 text-left text-[14px] font-extrabold shadow-[0_3px_0_var(--color-outline)] active:translate-y-0.5">
                    {op.t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {confirm && !summary && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-ink/45 p-5">
            <div className="panel w-full max-w-xs p-4 text-center text-ink">
              <p className="font-display text-xl font-extrabold text-lacquer">Tắt app, về nghỉ?</p>
              <p className="mt-2 text-sm font-bold">Còn {secs}s. Tiền các cuốc đã chạy vẫn được giữ, nhưng hôm nay không chạy lại được{o ? ' — đơn đang chạy sẽ bị hủy' : ''}.</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" data-testid="grab-stay" onClick={() => setConfirm(false)} className="rounded-2xl btn-jade py-2.5 font-extrabold active:translate-y-0.5">
                  Chạy tiếp
                </button>
                <button type="button" data-testid="grab-leave" onClick={end} className="rounded-2xl btn-lacquer py-2.5 font-extrabold active:translate-y-0.5">
                  Tắt app
                </button>
              </div>
            </div>
          </div>
        )}

        {summary && (
          <GrabSummary
            o={summary}
            rank={rank}
            onClose={() => {
              const n = summary.delivered
              onComplete(n, Math.max(1, n), Math.max(0, summary.fares + summary.tips - summary.fines))
            }}
          />
        )}
      </section>
    </div>
  )
}

function GrabSummary({ o, rank, onClose }: { o: GrabOutcome; rank: number; onClose: () => void }) {
  const gross = Math.max(0, o.fares + o.tips - o.fines)
  const net = grabNet(gross, rank)
  const avg = o.stars.length ? o.stars.reduce((a, b) => a + b, 0) / o.stars.length : 0
  // Rank bonus (+10 % / +20 %), as jobs.ts pays it
  const bonus = net + G.fuel - gross
  return (
    <div className="absolute inset-0 z-10 grid place-items-center bg-ink/45 p-5">
      <div className="panel animate-pop relative w-full max-w-xs p-5 pt-7 text-ink" data-testid="grab-summary">
        <h2 className="absolute -top-5 left-1/2 -translate-x-1/2 rounded-full ribbon px-6 py-1 text-xl whitespace-nowrap">Hết giờ chạy!</h2>
        <div className="mb-3 grid grid-cols-2 gap-2 text-center">
          <div className="rounded-2xl bg-mint/60 p-2">
            <div className="text-xl font-black tabular-nums">{o.delivered}</div>
            <div className="text-xs font-bold">Đơn hoàn thành</div>
          </div>
          <div className="rounded-2xl bg-butter/70 p-2">
            <div className="text-xl font-black tabular-nums">{avg ? avg.toFixed(1).replace('.', ',') : '–'} ★</div>
            <div className="text-xs font-bold">Đánh giá</div>
          </div>
        </div>
        <Row label="Tiền cuốc" value={vnd(o.fares)} />
        <Row label="Tip" value={vnd(o.tips)} />
        {o.fines > 0 && <Row label="Bị phạt" value={`−${vnd(o.fines)}`} bad />}
        {bonus > 0 && <Row label="Thưởng hạng" value={`+${vnd(bonus)}`} />}
        <Row label="Tiền xăng" value={`−${vnd(G.fuel)}`} bad />
        <div className="my-1 border-t-2 border-dashed border-ink/15" />
        <div className="flex justify-between text-lg font-black">
          <span>Còn lại</span>
          <span className={`tabular-nums ${net < 0 ? 'text-lacquer' : ''}`}>{net < 0 ? `−${vnd(-net)}` : vnd(net)}</span>
        </div>
        <button type="button" autoFocus data-testid="grab-claim" onClick={onClose} className="mt-4 w-full rounded-2xl btn-jade py-3 font-display text-lg font-extrabold active:translate-y-1 active:shadow-none">
          Nhận tiền
        </button>
      </div>
    </div>
  )
}

const Row = ({ label, value, bad }: { label: string; value: string; bad?: boolean }) => (
  <div className={`flex justify-between py-0.5 font-bold ${bad ? 'text-lacquer' : ''}`}>
    <span>{label}</span>
    <span className="tabular-nums">{value}</span>
  </div>
)
