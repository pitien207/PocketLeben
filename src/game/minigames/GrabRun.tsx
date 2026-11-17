import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import bikeUrl from '../../assets/grab/bike.png'
import barrierUrl from '../../assets/grab/barrier.png'
import coneUrl from '../../assets/grab/cone.png'
import { CONFIG } from '../../data/config'
import { NPCS, type Outfit } from '../../data/npcs'
import { SENTENCES } from '../../data/vocab'
import { formatMoney } from '../../i18n/format'
import { usePlayer } from '../../store/playerStore'
import { useTime } from '../../store/timeStore'
import { Icon3d, SvgIcon3d } from '../../ui/Icon3d'
import { Portrait } from '../../ui/Portrait'
import { playSfx } from '../systems/audio'
import { bumpFlag, flagNumber, getFlag, setFlag } from '../systems/conditions'
import { grabNet } from '../systems/jobs'
import { weekdayIndex } from '../systems/time'
import { shuffle } from './common'
import { burst } from './juice'

/**
 * Chạy Grab (story 2.1 §11.1): a real-time ride on a top-down map of the Old Quarter. 1.26: a big map
 * (8 × 9 crossings) seen through a camera that follows the scooter, a minimap, an arrow to the
 * target when it is off screen, top-down sprites (Kenney Racing Pack, CC0) — and much harder:
 * real cars driving the streets (bump into one = stopped, −1 star), road works closing streets,
 * moving traffic jams, a tight ETA, customers who cancel when you are far too late, and order
 * offers that expire. Tap / swipe a direction: the scooter keeps going and turns at the next
 * crossing that allows it. One-way streets, and the weekend walking street (fine) as before.
 */

const G = CONFIG.vnJobs.grab
const vnd = (n: number) => formatMoney(n, 'VND')
const pick = <V,>(list: V[]) => list[Math.floor(Math.random() * list.length)]
const INK = '#4a3226'
const CAR_URLS = Object.values(import.meta.glob('../../assets/grab/car-*.png', { query: '?url', import: 'default', eager: true }) as Record<string, string>)

// --------------------------------------------------------------------------------------- map

const COLS = 8
const ROWS = 9
const U = 64
const M = 30
const W = M * 2 + U * (COLS - 1)
const H = M * 2 + U * (ROWS - 1)
/** Pins of the first row stick out above the map. */
const MIN_Y = -34
const px = (v: number) => M + v * U
/** The camera's window onto the map (map units). */
const VIEW_W = 210
const VIEW_H = 280
/** Asphalt width of a street / of the wide streets (Tràng Tiền, Hàng Gai). */
const ROAD_W = 18
const WIDE_W = 24

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
const edgeEnds = (k: string) => k.split('-').map((p) => p.split(',').map(Number)) as [[number, number], [number, number]]

/** Hồ Gươm fills the blocks between these crossings; the node in the middle is water. */
const LAKE = { x0: 5, y0: 5, x1: 7, y1: 7 }
const NO_ROAD = new Set([
  ek(6, 5, 6, 6),
  ek(5, 6, 6, 6),
  ek(6, 6, 7, 6),
  ek(6, 6, 6, 7),
  // merged blocks, so the map isn't a plain grid (checked: still strongly connected)
  ek(0, 1, 0, 2),
  ek(2, 1, 2, 2),
  ek(6, 2, 7, 2),
  ek(1, 5, 1, 6),
  ek(0, 6, 1, 6),
  ek(3, 7, 3, 8),
  ek(4, 1, 4, 2),
  ek(7, 7, 7, 8),
])
const EDGES: [Node, Node][] = []
for (let y = 0; y < ROWS; y++)
  for (let x = 0; x < COLS; x++) {
    if (x + 1 < COLS && !NO_ROAD.has(ek(x, y, x + 1, y))) EDGES.push([{ x, y }, { x: x + 1, y }])
    if (y + 1 < ROWS && !NO_ROAD.has(ek(x, y, x, y + 1))) EDGES.push([{ x, y }, { x, y: y + 1 }])
  }
const EDGE_KEYS = EDGES.map(([a, b]) => ek(a.x, a.y, b.x, b.y))
const ROAD = new Set(EDGE_KEYS)
const NODES: Node[] = []
for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if ([0, 1, 2, 3].some((d) => ROAD.has(ek(x, y, x + DX[d], y + DY[d])))) NODES.push({ x, y })

/** One-way streets: the only direction you may ride them. */
const ONE_WAY = new Map<string, Dir>()
for (let x = 0; x < 7; x++) ONE_WAY.set(ek(x, 1, x + 1, 1), 0)
for (let x = 0; x < 5; x++) ONE_WAY.set(ek(x, 6, x + 1, 6), 2)
for (let y = 3; y < 8; y++) ONE_WAY.set(ek(2, y, 2, y + 1), 1)
for (let y = 0; y < 5; y++) ONE_WAY.set(ek(5, y, 5, y + 1), 3)
for (let y = 0; y < 4; y++) ONE_WAY.set(ek(7, y, 7, y + 1), 1)
/** Phố đi bộ Hàng Đào (weekend). */
const WALK = new Set([1, 2, 3, 4].map((x) => ek(x, 3, x + 1, 3)))
const WIDE_ROWS = new Set([0, 4])
const ROW_NAMES = ['Tràng Tiền', 'Hàng Bạc', 'Hàng Buồm', 'Hàng Đào', 'Hàng Gai', 'Hàng Trống', 'Lò Sũ', 'Hàng Khay', 'Bà Triệu']

/** May you ride from (x, y) in direction d? (`closed` = road works.) */
const canGo = (x: number, y: number, d: Dir, closed?: Set<string>) => {
  const k = ek(x, y, x + DX[d], y + DY[d])
  if (!ROAD.has(k) || closed?.has(k)) return false
  const only = ONE_WAY.get(k)
  return only === undefined || only === d
}

/** Shortest way along the roads (one-way streets, road works; optionally around the walking street). */
function route(a: Node, b: Node, avoidWalk: boolean, closed?: Set<string>): Node[] {
  const prev = new Map<string, string>()
  const seen = new Set([nk(a.x, a.y)])
  const queue: Node[] = [a]
  while (queue.length) {
    const c = queue.shift()!
    if (c.x === b.x && c.y === b.y) break
    for (const d of [0, 1, 2, 3] as Dir[]) {
      if (!canGo(c.x, c.y, d, closed)) continue
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

/** Every crossing can still reach every other one (road works must never trap you). */
function connected(closed: Set<string>) {
  const reach = (forward: boolean) => {
    const seen = new Set([nk(NODES[0].x, NODES[0].y)])
    const queue = [NODES[0]]
    while (queue.length) {
      const c = queue.shift()!
      for (const d of [0, 1, 2, 3] as Dir[]) {
        const n = { x: c.x + DX[d], y: c.y + DY[d] }
        const ok = forward ? canGo(c.x, c.y, d, closed) : canGo(n.x, n.y, ((d + 2) % 4) as Dir, closed)
        if (!ok || seen.has(nk(n.x, n.y))) continue
        seen.add(nk(n.x, n.y))
        queue.push(n)
      }
    }
    return seen.size === NODES.length
  }
  return reach(true) && reach(false)
}

// ------------------------------------------------------------------------------------ orders

interface Shop {
  id: string
  name: string
  at: Node
  color: string
  icon: string
}
const SHOPS: Shop[] = [
  { id: 'pho', name: 'Phở Gia Truyền', at: { x: 1, y: 4 }, color: '#e2574c', icon: 'steaming-bowl' },
  { id: 'banhMi', name: 'Bánh mì Phố Cổ', at: { x: 4, y: 4 }, color: '#f39a2b', icon: 'baguette-bread' },
  { id: 'traSua', name: 'Tiệm Trà Sữa', at: { x: 0, y: 4 }, color: '#ff8fab', icon: 'bubble-tea' },
  { id: 'caPhe', name: 'Cà phê trứng', at: { x: 3, y: 1 }, color: '#8a5a3c', icon: 'hot-beverage' },
  { id: 'bunCha', name: 'Bún chả Hàng Mành', at: { x: 1, y: 0 }, color: '#d9a05b', icon: 'oden' },
  { id: 'che', name: 'Chè Bốn Mùa', at: { x: 7, y: 1 }, color: '#7cc27a', icon: 'shaved-ice' },
  { id: 'kem', name: 'Kem Tràng Tiền', at: { x: 5, y: 0 }, color: '#7fb8e8', icon: 'soft-ice-cream' },
  { id: 'xoi', name: 'Xôi Yến', at: { x: 3, y: 7 }, color: '#f4c04e', icon: 'rice-ball' },
]
const SHOP_ICON: Record<string, string> = Object.fromEntries(SHOPS.map((s) => [s.id, s.icon]))

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
  no: number
  fare: number
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

/** How long an offer waits on the phone (s). */
const OFFER_TTL = 9
/** Late by this factor of the ETA: the customer cancels. */
const CANCEL_AT = 1.7

// -------------------------------------------------------------------------------------- state

interface Bike {
  x: number
  y: number
  dir: Dir | null
  t: number
  want: Dir | null
  pause: number
  face: Dir
}
interface Car {
  x: number
  y: number
  dir: Dir
  t: number
  speed: number
  url: string
}
interface Order {
  offer: Offer
  leg: 'pick' | 'drop'
  time: number
  fined: boolean
  hits: number
}
interface Float {
  text: string
  x: number
  y: number
  age: number
  good: boolean
  icon?: string
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
  cars: Car[]
  order: Order | null
  offers: Offer[] | null
  offerAge: number
  jams: string[]
  jamClock: number
  closed: Set<string>
  closeClock: number
  fares: number
  tips: number
  fines: number
  delivered: number
  cancelled: number
  crashes: number
  crashCool: number
  shake: number
  stars: number[]
  floats: Float[]
  hint: { text: string; left: number } | null
  specials: Set<Rider>
  cam: { x: number; y: number }
  help: number
}

export interface GrabOutcome {
  delivered: number
  stars: number[]
  fares: number
  tips: number
  fines: number
  cancelled: number
  crashes: number
}

// ---------------------------------------------------------------------------------------- art

function ShopIcon({ id, size = 18 }: { id: string; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <SvgIcon3d name={SHOP_ICON[id] ?? 'shopping-bags'} x={0} y={0} size={24} />
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
      const x0 = px(x) + 15
      const y0 = px(y) + 15
      const w = U - 30
      const houses: ReactNode[] = []
      const n = 4
      for (let i = 0; i < n; i++) {
        const hw = w / n
        for (const hy of [y0, y0 + w - 11]) {
          const c = ROOF[Math.floor(hash(x, y, i + hy) * ROOF.length)]
          houses.push(<rect key={`sh${i}-${hy}`} x={x0 + i * hw + 1.8} y={hy + 2.2} width={hw - 1.2} height={11} rx="1.4" fill="#000000" opacity="0.16" />)
          houses.push(<rect key={`${i}-${hy}`} x={x0 + i * hw + 0.6} y={hy} width={hw - 1.2} height={11} rx="1.4" fill={c} stroke={INK} strokeWidth="0.9" />)
          houses.push(<path key={`rg${i}-${hy}`} d={`M${x0 + i * hw + 1.6} ${hy + 5.5}h${hw - 3.2}`} stroke={INK} strokeWidth="0.6" opacity="0.35" />)
          houses.push(<rect key={`r${i}-${hy}`} x={x0 + i * hw + 2} y={hy + 3.5} width={hw - 4} height="2" rx="1" fill="#ffffff" opacity="0.35" />)
        }
      }
      for (const side of [0, 1]) {
        const c = ROOF[Math.floor(hash(x, y, 9 + side) * ROOF.length)]
        houses.push(<rect key={`ss${side}`} x={(side ? x0 + w - 10 : x0) + 1.2} y={y0 + 14.2} width="10" height={w - 24} rx="1.4" fill="#000000" opacity="0.16" />)
        houses.push(<rect key={`s${side}`} x={side ? x0 + w - 10 : x0} y={y0 + 12} width="10" height={w - 24} rx="1.4" fill={c} stroke={INK} strokeWidth="0.9" />)
      }
      const tree = hash(x, y, 3) > 0.3
      blocks.push(
        <g key={`b${x}${y}`}>
          <rect x={x0 - 2} y={y0 - 2} width={w + 4} height={w + 4} rx="4" fill="#d9e8c4" />
          {houses}
          {tree && <ellipse cx={x0 + w / 2 + 1.5} cy={y0 + w / 2 + 6} rx="7" ry="2.6" fill="#000000" opacity="0.15" />}
          {tree && <SvgIcon3d name={hash(x, y, 5) > 0.5 ? 'deciduous-tree' : 'evergreen-tree'} x={x0 + w / 2 - 9} y={y0 + w / 2 - 10} size={18} />}
        </g>,
      )
    }
  const lx = px(LAKE.x0) + 15
  const ly = px(LAKE.y0) + 15
  const lw = px(LAKE.x1) - px(LAKE.x0) - 30
  const lh = px(LAKE.y1) - px(LAKE.y0) - 30
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
  const roadW = (a: Node, b: Node) => (a.y === b.y && WIDE_ROWS.has(a.y) ? WIDE_W : ROAD_W)
  const line = (a: Node, b: Node, stroke: string, width: number, extra: Record<string, string | number> = {}) => (
    <line x1={px(a.x)} y1={px(a.y)} x2={px(b.x)} y2={px(b.y)} stroke={stroke} strokeWidth={width} strokeLinecap="square" {...extra} />
  )
  const sidewalks = EDGES.map(([a, b]) => <g key={`sw${ek(a.x, a.y, b.x, b.y)}`}>{line(a, b, '#e7dcc6', roadW(a, b) + 12)}</g>)
  const curbs = EDGES.map(([a, b]) => <g key={`cb${ek(a.x, a.y, b.x, b.y)}`}>{line(a, b, '#f4f1ea', roadW(a, b) + 3)}</g>)
  const asphalt = EDGES.map(([a, b]) => {
    const k = ek(a.x, a.y, b.x, b.y)
    const walk = weekend && WALK.has(k)
    return <g key={`as${k}`}>{line(a, b, walk ? '#f6c9d4' : '#3f454b', roadW(a, b))}</g>
  })
  // Lane markings stop short of the crossings
  const markings = EDGES.map(([a, b]) => {
    const k = ek(a.x, a.y, b.x, b.y)
    if (weekend && WALK.has(k)) return null
    const wide = roadW(a, b) === WIDE_W
    const inset = 16
    const horiz = a.y === b.y
    const x1 = px(a.x) + (horiz ? inset : 0)
    const y1 = px(a.y) + (horiz ? 0 : inset)
    const x2 = px(b.x) - (horiz ? inset : 0)
    const y2 = px(b.y) - (horiz ? 0 : inset)
    return wide ? (
      <g key={`mk${k}`}>
        <line x1={x1} y1={y1 - 1.3} x2={x2} y2={y2 - 1.3} stroke="#f4c04e" strokeWidth="1.1" />
        <line x1={x1} y1={y1 + 1.3} x2={x2} y2={y2 + 1.3} stroke="#f4c04e" strokeWidth="1.1" />
      </g>
    ) : (
      <line key={`mk${k}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ffffff" strokeWidth="1.2" strokeDasharray="6 5" opacity="0.85" />
    )
  })
  // Zebra crossings on every arm of a crossing
  const zebras: ReactNode[] = []
  for (const n of NODES)
    for (const d of [0, 1, 2, 3] as Dir[]) {
      const m = { x: n.x + DX[d], y: n.y + DY[d] }
      const k = ek(n.x, n.y, m.x, m.y)
      if (!ROAD.has(k) || (weekend && WALK.has(k))) continue
      const w = d % 2 === 0 ? (WIDE_ROWS.has(n.y) ? WIDE_W : ROAD_W) : ROAD_W
      const off = 13
      const cx = px(n.x) + DX[d] * off
      const cy = px(n.y) + DY[d] * off
      for (let i = 0; i < 4; i++) {
        const t = -w / 2 + 2.5 + (i * (w - 5)) / 3.4
        zebras.push(
          d % 2 === 0 ? (
            <rect key={`z${k}${d}${i}`} x={cx - 2.5} y={px(n.y) + t} width="5" height="2.2" rx="0.4" fill="#ffffff" opacity="0.9" />
          ) : (
            <rect key={`z${k}${d}${i}`} x={px(n.x) + t} y={cy - 2.5} width="2.2" height="5" rx="0.4" fill="#ffffff" opacity="0.9" />
          ),
        )
      }
    }
  // Crossings: a clean square of asphalt over the joins
  const crossings = NODES.map((n) => {
    const w = (WIDE_ROWS.has(n.y) ? WIDE_W : ROAD_W) + 0.5
    return <rect key={`x${n.x},${n.y}`} x={px(n.x) - w / 2} y={px(n.y) - w / 2} width={w} height={w} rx="2" fill={weekend && n.y === 3 && n.x >= 1 && n.x <= 5 ? '#f6c9d4' : '#3f454b'} />
  })
  const roads = (
    <g>
      {sidewalks}
      {curbs}
      {asphalt}
      {crossings}
      {markings}
      {zebras}
    </g>
  )
  const walkers = weekend
    ? [1, 2, 3, 4].flatMap((x) => [0.25, 0.6, 0.85].map((f, i) => <circle key={`w${x}${i}`} cx={px(x + f)} cy={px(3) + (i % 2 ? 3 : -3)} r="2.2" fill={['#e2574c', '#4f86d9', '#f4c04e'][(x + i) % 3]} stroke={INK} strokeWidth="0.6" />))
    : null
  const arrows = [...ONE_WAY.entries()].map(([k, d]) => {
    const [a, b] = edgeEnds(k)
    return (
      <g key={`o${k}`} transform={`translate(${px((a[0] + b[0]) / 2)} ${px((a[1] + b[1]) / 2)}) rotate(${d * 90})`}>
        <path d="M-6 -3.5l5 3.5-5 3.5M0 -3.5l5 3.5-5 3.5" stroke="#ffe08a" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    )
  })
  const label = (text: string, x: number, y: number, vertical = false, color = INK) => (
    <text key={text} x={x} y={y} fontSize="7.5" fontWeight="900" fill={color} opacity="0.8" textAnchor="middle" transform={vertical ? `rotate(-90 ${x} ${y})` : undefined} style={{ paintOrder: 'stroke', stroke: '#fbf3e4', strokeWidth: 2.4 }}>
      {text}
    </text>
  )
  const labels = [
    ...ROW_NAMES.map((n, y) => label(y === 3 && weekend ? `${n} · phố đi bộ` : n, px(y % 2 ? 2.5 : 3.5), px(y) - 20, false, y === 3 && weekend ? '#d6336c' : INK)),
    label('Phùng Hưng', px(0) - 20, px(2.5), true),
    label('Hàng Bông', px(1) - 20, px(6.5), true),
    label('Hàng Ngang', px(3) - 20, px(2.5), true),
    label('Lê Thái Tổ', px(5) - 20, px(5.5), true),
    label('Đinh Tiên Hoàng', px(7) + 22, px(5.5), true),
  ]
  return (
    <g>
      <rect x={-200} y={MIN_Y - 200} width={W + 400} height={H - MIN_Y + 400} fill="#cfe3c0" />
      {blocks}
      {lake}
      {roads}
      {walkers}
      {arrows}
      {labels}
    </g>
  )
}

function Pin({ at, color, children, pulse }: { at: Node; color: string; children: ReactNode; pulse?: boolean }) {
  return (
    <g transform={`translate(${px(at.x)} ${px(at.y)})`}>
      {pulse && (
        <circle r="10" fill="none" stroke={color} strokeWidth="2.5">
          <animate attributeName="r" values="8;22" dur="1.2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.9;0" dur="1.2s" repeatCount="indefinite" />
        </circle>
      )}
      <g>
        <animateTransform attributeName="transform" type="translate" values="0 0;0 -3;0 0" dur="0.9s" repeatCount="indefinite" />
        <path d="M0 0c-3-5-12-10-12-19a12 12 0 0 1 24 0c0 9-9 14-12 19z" fill={color} stroke={INK} strokeWidth="1.6" />
        <circle cy="-19" r="9" fill="#ffffff" />
        <g transform="translate(-9 -28)">{children}</g>
      </g>
    </g>
  )
}

/** A top-down sprite drawn along its heading (the sprites face north). */
const Sprite = ({ href, x, y, w, h, dir }: { href: string; x: number; y: number; w: number; h: number; dir: Dir }) => (
  <g transform={`translate(${x} ${y}) rotate(${((dir + 1) % 4) * 90})`}>
    <ellipse cx="1.5" cy="2" rx={w / 2 + 1} ry={h / 2} fill={INK} opacity="0.2" />
    <image href={href} x={-w / 2} y={-h / 2} width={w} height={h} />
  </g>
)

// ---------------------------------------------------------------------------------------- game

export function GrabGame({ rain, rank, onComplete }: { rain: boolean; rank: number; onComplete: (correct: number, total: number, extra?: number) => void }) {
  const day = useTime.getState().day
  const minutes = useTime.getState().minutes
  const weekend = weekdayIndex(day) >= 5
  const early = minutes < 8 * 60
  const dusk = minutes >= 18 * 60
  const speed = G.speed * (rain ? 0.85 : 1) * (1 + rank * 0.06)

  const randomJams = useCallback(() => shuffle(EDGE_KEYS.filter((k) => !WALK.has(k))).slice(0, 4 + rank), [rank])
  /** Road works: a few streets closed, never so many that you could get trapped. */
  const randomClosures = useCallback(() => {
    for (let i = 0; i < 25; i++) {
      const set = new Set(shuffle(EDGE_KEYS.filter((k) => !WALK.has(k))).slice(0, 2 + rank))
      if (connected(set)) return set
    }
    return new Set<string>()
  }, [rank])

  const g = useRef<Game>(null as unknown as Game)
  if (!g.current) {
    const start = { x: 3, y: 4 }
    const cars: Car[] = []
    for (let i = 0; i < 5 + rank * 2; i++) {
      const n = pick(NODES.filter((q) => Math.abs(q.x - start.x) + Math.abs(q.y - start.y) > 2))
      const dirs = ([0, 1, 2, 3] as Dir[]).filter((d) => canGo(n.x, n.y, d))
      cars.push({ x: n.x, y: n.y, dir: pick(dirs), t: Math.random(), speed: (0.75 + Math.random() * 0.45) * (1 + rank * 0.08), url: CAR_URLS[i % CAR_URLS.length] })
    }
    g.current = {
      left: G.seconds,
      bike: { ...start, dir: null, t: 0, want: null, pause: 0, face: 3 },
      cars,
      order: null,
      offers: null,
      offerAge: 0,
      jams: randomJams(),
      jamClock: 12,
      closed: randomClosures(),
      closeClock: 15,
      fares: 0,
      tips: 0,
      fines: 0,
      delivered: 0,
      cancelled: 0,
      crashes: 0,
      crashCool: 0,
      shake: 0,
      stars: [],
      floats: [],
      hint: null,
      specials: new Set(),
      cam: { x: px(start.x), y: px(start.y) },
      help: 6,
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
  const mapRef = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState({ w: 360, h: 420 })
  useEffect(() => {
    const el = mapRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth || 360, h: el.clientHeight || 420 }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  // What the camera really shows: the view box covers the map area (slice), so one side is cropped.
  const scale = Math.max(box.w / VIEW_W, box.h / VIEW_H)
  const visW = box.w / scale
  const visH = box.h / scale

  const hint = (text: string) => {
    g.current.hint = { text, left: 2 }
  }

  const makeOffer = useCallback(
    (kind: 'food' | 'ride', from: Node, rider: Rider = 'normal'): Offer => {
      const s = g.current
      let a: Node
      let b: Node
      let shop: Shop | undefined
      const far = (p: Node, q: Node, d: number) => Math.abs(p.x - q.x) + Math.abs(p.y - q.y) >= d
      const onWalk = (n: Node) => weekend && n.y === 3 && n.x >= 1 && n.x <= 5
      if (kind === 'food') {
        shop = pick(SHOPS.filter((sh) => far(sh.at, from, 2)))
        a = shop.at
      } else a = pick(NODES.filter((n) => far(n, from, 2) && !onWalk(n)))
      do b = pick(NODES)
      while (!far(a, b, 5) || onWalk(b))
      const l1 = route(from, a, weekend, s?.closed).length - 1
      const l2 = route(a, b, weekend, s?.closed).length - 1
      const fare = Math.round(((G.fareBase + G.farePerEdge * (l2 + l1 * 0.5)) * (rain ? 1 + G.rainBonus : 1)) / 1000) * 1000
      // A tight ETA: little room for detours (1.26: much harder)
      const eta = ((l1 + l2) / speed) * (1.22 - rank * 0.05) + 2
      return { kind, shop, rider: kind === 'ride' ? rider : undefined, from: a, to: b, no: 2 + Math.floor(Math.random() * 90), fare: rider === 'xoi' ? 0 : fare, legs: [l1, l2], eta }
    },
    [weekend, rain, speed, rank],
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
    s.offerAge = 0
    playSfx('pickup')
  }, [early, makeOffer])

  const end = useCallback(() => {
    const s = g.current
    setConfirm(false)
    setSummary({ delivered: s.delivered, stars: s.stars, fares: s.fares, tips: s.tips, fines: s.fines, cancelled: s.cancelled, crashes: s.crashes })
    playSfx('success')
  }, [])

  /** Arrived at a crossing: pickup / drop. */
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
        s.floats.push({ text: o.offer.kind === 'food' ? 'Đã lấy món!' : 'Khách lên xe!', x: px(b.x), y: px(b.y) - 20, age: 0, good: true })
        return
      }
      const r = o.time / o.offer.eta
      const stars = Math.max(1, (r <= 1 ? 5 : r <= 1.2 ? 4 : r <= 1.45 ? 3 : 2) - o.hits)
      const tip = stars === 5 && o.offer.rider !== 'xoi' ? G.tip + Math.floor(Math.random() * 3) * 5_000 : 0
      s.fares += o.offer.fare
      s.tips += tip
      s.delivered++
      s.stars.push(stars)
      s.order = null
      playSfx('coin')
      if (stars === 5) burst(mapRef.current, 'coins')
      s.floats.push({ text: `${o.offer.fare + tip > 0 ? '+' + vnd(o.offer.fare + tip) + ' ' : ''}${'★'.repeat(stars)}`, x: px(b.x), y: px(b.y) - 20, age: 0, good: stars >= 4 })
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
      s.help = Math.max(0, s.help - dt)
      if (!s.order && !s.offers) newOffers()
      if (!s.order && s.offers) {
        s.offerAge += dt
        if (s.offerAge >= OFFER_TTL) {
          s.offers = null
          hint('Đơn đã chuyển cho tài xế khác — nhận nhanh hơn nhé!')
        }
      }
      const o = s.order
      if (o) {
        o.time += dt
        if (o.time > o.offer.eta * CANCEL_AT) {
          s.order = null
          s.cancelled++
          s.stars.push(1)
          playSfx('fail')
          s.floats.push({ text: 'Khách hủy đơn! ★', x: s.cam.x, y: s.cam.y - 30, age: 0, good: false, icon: 'pouting-face' })
          hint('Trễ quá lâu — khách đã hủy đơn, bị đánh giá 1★.')
        }
      }
      s.jamClock -= dt
      if (s.jamClock <= 0) {
        s.jamClock = 12
        s.jams = randomJams()
      }
      s.closeClock -= dt
      if (s.closeClock <= 0) {
        s.closeClock = 15
        s.closed = randomClosures()
      }
      if (s.hint) {
        s.hint.left -= dt
        if (s.hint.left <= 0) s.hint = null
      }
      s.crashCool = Math.max(0, s.crashCool - dt)
      s.shake = Math.max(0, s.shake - dt)
      for (const f of s.floats) f.age += dt
      s.floats = s.floats.filter((f) => f.age < 1.5)

      // Cars drive on, turning at random where the road allows (they don't reverse unless trapped)
      for (const c of s.cars) {
        c.t += c.speed * dt
        while (c.t >= 1) {
          c.x += DX[c.dir]
          c.y += DY[c.dir]
          c.t -= 1
          const opts = ([0, 1, 2, 3] as Dir[]).filter((d) => d !== (c.dir + 2) % 4 && canGo(c.x, c.y, d, s.closed))
          c.dir = opts.length ? pick(opts) : (((c.dir + 2) % 4) as Dir)
        }
      }

      const b = s.bike
      if (b.pause > 0) b.pause -= dt
      else {
        if (b.dir === null && b.want !== null) {
          if (canGo(b.x, b.y, b.want, s.closed)) {
            b.dir = b.want
            b.face = b.want
            b.want = null
            enterEdge(b)
          }
        }
        if (b.dir !== null) {
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
            if (b.want !== null && b.want !== b.dir && canGo(b.x, b.y, b.want, s.closed)) {
              b.dir = b.want
              b.face = b.want
              b.want = null
            } else if (!canGo(b.x, b.y, b.dir, s.closed)) {
              if (s.closed.has(ek(b.x, b.y, b.x + DX[b.dir], b.y + DY[b.dir]))) hint('Đường đang sửa — rẽ lối khác!')
              b.dir = null
              b.t = 0
              break
            }
            enterEdge(b)
          }
        }
      }

      // Bumping into a car: stopped for a moment, and the customer takes a star off
      const bxp = px(b.x + (b.dir !== null ? DX[b.dir] * b.t : 0))
      const byp = px(b.y + (b.dir !== null ? DY[b.dir] * b.t : 0))
      if (s.crashCool <= 0) {
        for (const c of s.cars) {
          const [cx, cy] = carPos(c)
          if (Math.hypot(cx - bxp, cy - byp) < 11.5) {
            s.crashCool = 1.8
            s.shake = 0.35
            s.crashes++
            b.pause = 0.9
            if (s.order) s.order.hits++
            playSfx('wrong')
            playSfx('honk')
            s.floats.push({ text: s.order ? 'Va quẹt! −1★' : 'Va quẹt!', x: bxp, y: byp - 22, age: 0, good: false, icon: 'collision' })
            break
          }
        }
      }

      // The camera follows the scooter (eased), never leaving the map
      const k = 1 - Math.exp(-dt * 6)
      s.cam.x += (bxp - s.cam.x) * k
      s.cam.y += (byp - s.cam.y) * k
      render()
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
      s.floats.push({ text: `Phạt ${vnd(G.fine)}!`, x: px(b.x), y: px(b.y) - 20, age: 0, good: false })
      hint('Phố đi bộ cuối tuần — CSGT thổi còi phạt!')
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [arrive, end, newOffers, randomJams, randomClosures, render, speed, weekend])

  const steer = useCallback(
    (d: Dir) => {
      const s = g.current
      if (paused.current) return
      const b = s.bike
      if (b.dir === null && b.pause <= 0 && !canGo(b.x, b.y, d, s.closed)) {
        const k = ek(b.x, b.y, b.x + DX[d], b.y + DY[d])
        playSfx('wrong')
        hint(s.closed.has(k) ? 'Đường đang sửa — rẽ lối khác!' : ROAD.has(k) ? 'Phố một chiều — đi ngược chiều là bị phạt đấy!' : 'Không có đường đi lối này.')
        return
      }
      b.want = d
    },
    [],
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

  const accept = (of: Offer) => {
    const s = g.current
    s.offers = null
    s.order = { offer: of, leg: 'pick', time: 0, fined: false, hits: 0 }
    playSfx('click')
    if (s.bike.dir === null) arrive(s.bike)
  }

  const answer = (ok: boolean) => {
    if (!talk) return
    if (!talk.note) {
      playSfx(ok ? 'right' : 'wrong')
      if (ok) {
        if (talk.rider === 'tourist') {
          const extra = 50_000 + Math.floor(Math.random() * 6) * 10_000
          g.current.tips += extra
          g.current.floats.push({ text: `Tip +${vnd(extra)}`, x: g.current.cam.x, y: g.current.cam.y - 20, age: 0, good: true })
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
  /** As the crow flies, ~250 m per block (1.28: no route line, find your own way). */
  const distM = target ? Math.round(Math.hypot(px(target.x) - bx, px(target.y) - by) / U) * 250 : 0
  const distLabel = distM >= 1000 ? `${(distM / 1000).toFixed(1).replace('.', ',')} km` : distM > 0 ? `${distM} m` : 'tới nơi'
  const secs = Math.ceil(s.left)
  const earned = s.fares + s.tips - s.fines
  const etaLeft = o ? Math.max(0, 1 - o.time / o.offer.eta) : 0
  const late = o ? o.time > o.offer.eta : false
  const passenger = o && o.leg === 'drop' && o.offer.kind === 'ride' ? RIDER_LOOK[o.offer.rider ?? 'normal'].outfit.shirt : null
  const load = o && o.leg === 'drop' && o.offer.kind === 'food' ? (SHOP_ICON[o.offer.shop?.id ?? ''] ?? null) : null

  // Camera window (clamped to the map), with a little shake after a bump
  const cx = Math.min(W - visW / 2, Math.max(visW / 2, s.cam.x)) + (s.shake > 0 ? (Math.random() - 0.5) * 6 : 0)
  const cy = Math.min(H - visH / 2, Math.max(MIN_Y + visH / 2, s.cam.y)) + (s.shake > 0 ? (Math.random() - 0.5) * 6 : 0)
  const viewBox = `${cx - VIEW_W / 2} ${cy - VIEW_H / 2} ${VIEW_W} ${VIEW_H}`
  // Arrow at the screen edge toward a target that is off screen
  let edgeArrow: { x: number; y: number; angle: number } | null = null
  if (target) {
    const tx = px(target.x)
    const ty = px(target.y) - 14
    const hx = visW / 2 - 24
    const hy = visH / 2 - 24
    const dx = tx - cx
    const dy = ty - cy
    if (Math.abs(dx) > hx || Math.abs(dy) > hy) {
      const f = Math.min(hx / Math.max(1e-6, Math.abs(dx)), hy / Math.max(1e-6, Math.abs(dy)))
      edgeArrow = { x: cx + dx * f, y: cy + dy * f, angle: (Math.atan2(dy, dx) * 180) / Math.PI }
    }
  }
  const avgStars = s.stars.length ? (s.stars.reduce((a, v) => a + v, 0) / s.stars.length).toFixed(1).replace('.', ',') : '–'

  return (
    <div className="pointer-events-auto absolute inset-0 z-40 flex justify-center bg-[#4a3226]/60 select-none" style={{ touchAction: 'none' }} onContextMenu={(e) => e.preventDefault()} data-testid="grab-game">
      <section className="relative flex h-full w-full max-w-md flex-col overflow-hidden bg-[#eef6ee] text-ink" role="dialog" aria-modal="true" aria-label="Chạy Grab">
        {/* App bar */}
        <div className="shrink-0 border-b-2 border-outline bg-[linear-gradient(#45bb7c,#2f9e64)] px-3 pb-1.5 text-white" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 6px)' }}>
          <div className="flex items-center gap-2">
            <span className="flex min-w-0 flex-col leading-none">
              <span className="font-display text-[19px] font-extrabold tracking-wide drop-shadow-[0_1px_0_rgba(0,0,0,0.25)]">Grab</span>
              <span className="mt-0.5 flex gap-1 text-[9.5px] font-black whitespace-nowrap">
                <span className="rounded-full bg-white/25 px-1.5">{['Tài xế mới', 'Quen việc', 'Tài xế giỏi'][rank]}</span>
                {rain && <span className="rounded-full bg-[#2f6b8f] px-1.5">Mưa +{Math.round(G.rainBonus * 100)}%</span>}
                {weekend && <span className="rounded-full bg-[#d6336c] px-1.5">Cuối tuần</span>}
              </span>
            </span>
            <span className="ml-auto rounded-full border-2 border-outline bg-white px-2 py-0.5 text-[14px] font-black text-ink tabular-nums" data-testid="grab-earned">
              <Icon3d name="money-bag" className="-my-1 mr-0.5 inline-block h-5 w-5 align-[-4px]" />
              {vnd(Math.max(0, earned))}
            </span>
            <span data-testid="grab-time" className={`rounded-full border-2 border-outline px-2 py-0.5 text-[14px] font-black tabular-nums ${secs <= 10 ? 'animate-pulse bg-lacquer text-gold-light' : 'bg-white text-ink'}`}>
              <Icon3d name="stopwatch" className="-my-1 mr-0.5 inline-block h-5 w-5 align-[-4px]" />
              {secs}s
            </span>
            <button type="button" data-testid="grab-quit" aria-label="Tắt app" onClick={() => setConfirm(true)} className="grid h-8 w-8 place-items-center rounded-full border-2 border-outline bg-cream text-sm font-black text-ink shadow-[0_2px_0_var(--color-outline)] active:translate-y-0.5">
              ✕
            </button>
          </div>
        </div>

        {/* Order / offers */}
        <div className="shrink-0 px-2 pt-1.5">
          {o ? (
            <div className={`flex items-center gap-2.5 rounded-2xl border-2 border-outline px-2.5 py-2 shadow-[0_3px_0_var(--color-outline)] ${late ? 'bg-[#ffe3e3]' : 'bg-white'}`} data-testid="grab-order" data-leg={o.leg}>
              <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-outline [&>*]:h-full [&>*]:w-full" style={{ background: o.offer.shop?.color ?? '#fff6e3' }}>
                {o.offer.kind === 'food' ? <ShopIcon id={o.offer.shop!.id} size={36} /> : <Portrait outfit={RIDER_LOOK[o.offer.rider ?? 'normal'].outfit} size={52} />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 text-[10px] font-black tracking-wide uppercase">
                  <span className={`rounded-full px-1.5 py-px ${o.leg === 'pick' ? 'bg-[#3fae72] text-white' : 'bg-[#e4f6ea] text-[#2f8c5a]'}`}>{o.leg === 'pick' ? '1 · ' : '✓ '}{o.offer.kind === 'food' ? 'Lấy món' : 'Đón khách'}</span>
                  <span className="text-ink/30">›</span>
                  <span className={`rounded-full px-1.5 py-px ${o.leg === 'drop' ? 'bg-[#d6336c] text-white' : 'bg-ink/8 text-ink/45'}`}>2 · Giao</span>
                  <span className="ml-auto text-ink/55 normal-case" data-testid="grab-dist">
                    {distLabel}
                  </span>
                </div>
                <p className="truncate text-[15px] leading-tight font-black">
                  {o.leg === 'pick' ? (o.offer.kind === 'food' ? o.offer.shop!.name : RIDER_LOOK[o.offer.rider ?? 'normal'].name) : `Số ${o.offer.no} ${ROW_NAMES[o.offer.to.y]}`}
                </p>
                <div className="mt-1 flex items-center gap-1.5">
                  <Icon3d name="stopwatch" className="h-4 w-4" />
                  <span className={`text-[10px] font-black ${late ? 'text-lacquer' : 'text-ink/55'}`}>{late ? 'TRỄ!' : 'ETA'}</span>
                  <div className="h-3 flex-1 overflow-hidden rounded-full border-2 border-outline bg-white">
                    <div className={`h-full transition-[width] ${etaLeft > 0.4 ? 'bg-[#6fcf97]' : etaLeft > 0.15 ? 'bg-[#f4c04e]' : 'bg-[#e8697d]'}`} style={{ width: `${etaLeft * 100}%` }} />
                  </div>
                  <span className="text-[12px] font-black text-[#2f8c5a] tabular-nums">{o.offer.fare ? vnd(o.offer.fare) : 'xôi'}</span>
                </div>
              </div>
            </div>
          ) : s.offers ? (
            <div className="grid grid-cols-2 gap-1.5">
              {s.offers.map((of, i) => (
                <button key={i} type="button" data-testid={`grab-offer-${i}`} onClick={() => accept(of)} className="animate-pop relative flex flex-col overflow-hidden rounded-2xl border-2 border-outline bg-white px-2 pt-1.5 pb-2 text-left shadow-[0_3px_0_var(--color-outline)] active:translate-y-0.5">
                  <span className="flex items-center gap-1.5">
                    <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-outline [&>*]:h-full [&>*]:w-full" style={{ background: of.shop?.color ?? '#fff6e3' }}>
                      {of.kind === 'food' ? <ShopIcon id={of.shop!.id} size={26} /> : <Portrait outfit={RIDER_LOOK[of.rider ?? 'normal'].outfit} size={38} />}
                    </span>
                    <span className="min-w-0 text-[12.5px] leading-tight font-black">{of.kind === 'food' ? of.shop!.name : RIDER_LOOK[of.rider ?? 'normal'].name}</span>
                  </span>
                  <span className="mt-0.5 line-clamp-2 text-[11px] leading-tight font-bold text-ink/65">{of.kind === 'food' ? `Giao đồ ăn → ${ROW_NAMES[of.to.y]}` : RIDER_LINE[of.rider ?? 'normal']}</span>
                  <span className="mt-0.5 flex items-center justify-between text-[12px] font-black">
                    <span className="text-ink/55">{((of.legs[0] + of.legs[1]) * 0.25).toFixed(1).replace('.', ',')} km</span>
                    <span className="text-[#2f8c5a]">{of.fare ? vnd(of.fare) : 'gói xôi'}</span>
                  </span>
                  <span className="absolute inset-x-0 bottom-0 h-1 bg-[#f4c04e]" style={{ width: `${Math.max(0, 1 - s.offerAge / OFFER_TTL) * 100}%` }} />
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-ink/20 py-3 text-center text-[13px] font-bold text-ink/50">Đang tìm đơn…</div>
          )}
        </div>

        {/* Shift so far */}
        <div className="mx-2 mt-1.5 flex shrink-0 items-center justify-between gap-1 rounded-full bg-white/80 px-3 py-0.5 text-[11.5px] font-black text-ink/70" data-testid="grab-stats">
          <span className="flex items-center gap-1">
            <Icon3d name="shopping-bags" className="h-4 w-4" />
            <b className="text-ink">{s.delivered}</b> đơn
          </span>
          <span className="flex items-center gap-1">
            <Icon3d name="star" className="h-4 w-4" />
            <b className="text-ink">{avgStars}</b>
          </span>
          <span className="flex items-center gap-1">
            <Icon3d name="money-bag" className="h-4 w-4" />
            tip <b className="text-ink">{vnd(s.tips)}</b>
          </span>
          {s.crashes > 0 && <b className="text-lacquer">Va quẹt {s.crashes}</b>}
          {s.fines > 0 && <b className="text-lacquer">−{vnd(s.fines)}</b>}
        </div>

        {/* Map: a camera that follows the scooter */}
        <div
          ref={mapRef}
          className="relative mx-2 mt-1.5 min-h-0 flex-1 overflow-hidden rounded-2xl border-2 border-outline bg-[#cfe3c0] shadow-[0_3px_0_var(--color-outline)]"
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
          <svg viewBox={viewBox} preserveAspectRatio="xMidYMid slice" className="h-full w-full" aria-hidden="true">
            {static_}
            {s.jams.map((k) => {
              const [a2, b2] = edgeEnds(k)
              return (
                <g key={`j${k}`}>
                  <line x1={px(a2[0])} y1={px(a2[1])} x2={px(b2[0])} y2={px(b2[1])} stroke="#e8463b" strokeWidth={ROAD_W - 2} strokeLinecap="butt" opacity="0.45" />
                  {[0.28, 0.5, 0.72].map((f, i) => (
                    <Sprite key={i} href={CAR_URLS[(i + k.length) % CAR_URLS.length]} x={px(a2[0] + (b2[0] - a2[0]) * f)} y={px(a2[1] + (b2[1] - a2[1]) * f)} w={9} h={15} dir={a2[1] === b2[1] ? (i % 2 ? 0 : 2) : i % 2 ? 1 : 3} />
                  ))}
                </g>
              )
            })}
            {[...s.closed].map((k) => {
              const [a2, b2] = edgeEnds(k)
              const mx = px((a2[0] + b2[0]) / 2)
              const my = px((a2[1] + b2[1]) / 2)
              const horiz = a2[1] === b2[1]
              return (
                <g key={`c${k}`} data-testid="grab-closed">
                  <line x1={px(a2[0])} y1={px(a2[1])} x2={px(b2[0])} y2={px(b2[1])} stroke="#f4c04e" strokeWidth={ROAD_W} strokeDasharray="6 6" opacity="0.5" />
                  <g transform={`translate(${mx} ${my}) rotate(${horiz ? 90 : 0})`}>
                    <image href={barrierUrl} x={-12} y={-4} width={24} height={8} />
                  </g>
                  {[-0.32, 0.32].map((f) => (
                    <image key={f} href={coneUrl} x={mx + (horiz ? f * U : 0) - 3} y={my + (horiz ? 0 : f * U) - 3} width={6} height={6} />
                  ))}
                  <SvgIcon3d name="construction" x={mx - 8} y={my - 20} size={16} />
                </g>
              )
            })}
            {o && o.leg === 'pick' && (
              <Pin at={o.offer.from} color={o.offer.shop?.color ?? '#3fae72'} pulse>
                {o.offer.kind === 'food' ? <SvgIcon3d name={SHOP_ICON[o.offer.shop!.id]} x={0} y={0} size={18} /> : <circle cx="9" cy="9" r="6" fill={RIDER_LOOK[o.offer.rider ?? 'normal'].outfit.shirt} stroke={INK} strokeWidth="1.2" />}
              </Pin>
            )}
            {o && (
              <Pin at={o.offer.to} color={o.leg === 'drop' ? '#d6336c' : '#c9ccd2'} pulse={o.leg === 'drop'}>
                <SvgIcon3d name="house" x={0} y={0} size={18} />
              </Pin>
            )}
            {!o && s.offers && s.offers.map((of, i) => <circle key={i} cx={px(of.from.x)} cy={px(of.from.y)} r="7" fill={of.shop?.color ?? '#3fae72'} stroke={INK} strokeWidth="1.4" opacity="0.85" />)}
            {s.cars.map((c, i) => {
              const [x, y] = carPos(c)
              return <Sprite key={i} href={c.url} x={x} y={y} w={9.5} h={16.5} dir={c.dir} />
            })}
            <g transform={`translate(${bx} ${by})`} data-testid="grab-bike">
              {dusk && <circle r="18" fill="#fff6c8" opacity="0.3" />}
              {s.crashCool > 0.9 && <SvgIcon3d name="collision" x={-11} y={-11} size={22} />}
              <Sprite href={bikeUrl} x={0} y={0} w={10} h={22} dir={b.face} />
              <g className="animate-bob">
                {load && <SvgIcon3d name={load} x={-8} y={-30} size={16} />}
                {passenger && <circle cx="0" cy="-20" r="5" fill={passenger} stroke={INK} strokeWidth="1.2" />}
                {b.want !== null && (
                  <text x={12} y={-12} textAnchor="middle" fontSize="13" fontWeight="900" fill="#3f7fe0" style={{ paintOrder: 'stroke', stroke: '#ffffff', strokeWidth: 3 }}>
                    {ARROWS[b.want]}
                  </text>
                )}
              </g>
            </g>
            {dusk && <rect x={-200} y={MIN_Y - 200} width={W + 400} height={H - MIN_Y + 400} fill="#28305a" opacity="0.25" pointerEvents="none" />}
            {edgeArrow && target && (
              <g transform={`translate(${edgeArrow.x} ${edgeArrow.y})`} data-testid="grab-edge-arrow">
                <circle r="16" fill={o?.leg === 'drop' ? '#d6336c' : '#3fae72'} opacity="0.25">
                  <animate attributeName="r" values="13;19;13" dur="1.2s" repeatCount="indefinite" />
                </circle>
                <circle r="13" fill="#ffffff" stroke={o?.leg === 'drop' ? '#d6336c' : '#3fae72'} strokeWidth="3" />
                <text y="25" textAnchor="middle" fontSize="8.5" fontWeight="900" fill={INK} style={{ paintOrder: 'stroke', stroke: '#ffffff', strokeWidth: 2.6 }}>
                  {distLabel}
                </text>
                {o && <SvgIcon3d name={o.leg === 'drop' ? 'house' : o.offer.kind === 'food' ? SHOP_ICON[o.offer.shop!.id] : 'motor-scooter'} x={-8} y={-8} size={16} />}
                <g transform={`rotate(${edgeArrow.angle})`}>
                  <path d="M16 -6l10 6-10 6z" fill={o?.leg === 'drop' ? '#d6336c' : '#3fae72'} stroke="#ffffff" strokeWidth="1.5" />
                </g>
              </g>
            )}
            {s.floats.map((f, i) => (
              <g key={i} opacity={1 - f.age / 1.5}>
                {f.icon && <SvgIcon3d name={f.icon} x={f.x - 10} y={f.y - f.age * 22 - 30} size={20} />}
                <text x={f.x} y={f.y - f.age * 22} textAnchor="middle" fontSize="12" fontWeight="900" fill={f.good ? '#2f8c5a' : '#d4202a'} style={{ paintOrder: 'stroke', stroke: '#ffffff', strokeWidth: 3 }}>
                  {f.text}
                </text>
              </g>
            ))}
          </svg>
          {rain && <div className="animate-rain pointer-events-none absolute inset-0 opacity-60" style={{ backgroundImage: 'repeating-linear-gradient(105deg, transparent 0 14px, rgba(255,255,255,0.75) 14px 15px, transparent 15px 34px)', backgroundSize: '60px 60px' }} />}
          {(s.hint || s.help > 0) && (
            <p className="animate-pop absolute bottom-2 left-1/2 w-[92%] -translate-x-1/2 rounded-xl border-2 border-outline bg-[#fff3c9] px-2 py-1 text-center text-[12px] leading-snug font-black shadow-[0_2px_0_var(--color-outline)]" data-testid="grab-hint">
              {s.hint?.text ?? 'Không có chỉ đường — nhìn ghim và mũi tên để tự tìm lối. Né ô tô, tắc đường (đỏ), đường đang sửa và phố một chiều (»).'}
            </p>
          )}
        </div>

        {/* Controls: a big cross */}
        <div className="mx-auto mt-1.5 grid w-[min(100%,22rem)] shrink-0 grid-cols-3 grid-rows-2 gap-1.5 rounded-[1.6rem] border-2 border-outline bg-[linear-gradient(#f6e7cb,#e9d2a8)] p-1.5 shadow-[0_3px_0_var(--color-outline)]" style={{ marginBottom: 'calc(env(safe-area-inset-bottom) + 8px)' }}>
          {(
            [
              [3, 'col-start-2 row-start-1'],
              [2, 'col-start-1 row-start-2'],
              [1, 'col-start-2 row-start-2'],
              [0, 'col-start-3 row-start-2'],
            ] as [Dir, string][]
          ).map(([d, pos]) => (
            <button
              key={d}
              type="button"
              data-testid={`pad-${ARROWS[d]}`}
              onPointerDown={(e) => {
                e.preventDefault()
                steer(d)
              }}
              aria-label={ARROWS[d]}
              className={`${pos} grid h-14 place-items-center rounded-2xl active:translate-y-0.5 [@media(min-height:760px)]:h-16 ${b.want === d ? 'btn-jade' : 'btn-lacquer'}`}
            >
              <svg viewBox="0 0 24 24" className="h-8 w-8 drop-shadow-[0_2px_0_rgba(0,0,0,0.25)]" style={{ transform: `rotate(${d * 90}deg)` }} aria-hidden="true">
                <path d="M5 12h11M12 6l6 6-6 6" fill="none" stroke="#fff7e0" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ))}
        </div>

        {talk && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-ink/45 p-5">
            <div className="panel animate-pop w-full max-w-xs p-4 text-ink" data-testid="grab-talk">
              <div className="flex items-center gap-2">
                <span className="rounded-full border-2 border-outline bg-cream">
                  <Portrait outfit={RIDER_LOOK[talk.rider].outfit} size={56} />
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
              onComplete(n, Math.max(1, n + summary.cancelled), Math.max(0, summary.fares + summary.tips - summary.fines))
            }}
          />
        )}
      </section>
    </div>
  )
}

/** A car's position on the map, on the right-hand side of its street. */
function carPos(c: Car): [number, number] {
  const x = px(c.x + DX[c.dir] * c.t) - DY[c.dir] * 4.5
  const y = px(c.y + DY[c.dir] * c.t) + DX[c.dir] * 4.5
  return [x, y]
}

function GrabSummary({ o, rank, onClose }: { o: GrabOutcome; rank: number; onClose: () => void }) {
  const gross = Math.max(0, o.fares + o.tips - o.fines)
  const net = grabNet(gross, rank)
  const avg = o.stars.length ? o.stars.reduce((a, b) => a + b, 0) / o.stars.length : 0
  const bonus = net + G.fuel - gross
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (avg >= 4.3 && o.delivered >= 3) burst(box.current, 'big')
  }, [avg, o.delivered])
  return (
    <div className="absolute inset-0 z-10 grid place-items-center bg-ink/45 p-5">
      <div ref={box} className="panel animate-pop relative w-full max-w-xs p-5 pt-7 text-ink" data-testid="grab-summary">
        <h2 className="absolute -top-5 left-1/2 -translate-x-1/2 rounded-full ribbon px-6 py-1 text-xl whitespace-nowrap">Hết giờ chạy!</h2>
        <Icon3d name="motor-scooter" className="animate-pop absolute -top-9 -left-5 h-16 w-16 -rotate-6" />
        {avg >= 4 && <Icon3d name="glowing-star" className="animate-pop absolute -top-8 -right-4 h-14 w-14 rotate-12" />}
        <div className="mb-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-mint/60 p-2">
            <div className="text-xl font-black tabular-nums">{o.delivered}</div>
            <div className="text-[11px] font-bold">Đơn xong</div>
          </div>
          <div className="rounded-2xl bg-butter/70 p-2">
            <div className="text-xl font-black tabular-nums">{avg ? avg.toFixed(1).replace('.', ',') : '–'}★</div>
            <div className="text-[11px] font-bold">Đánh giá</div>
          </div>
          <div className="rounded-2xl bg-rose/40 p-2">
            <div className="text-xl font-black tabular-nums">{o.cancelled + o.crashes}</div>
            <div className="text-[11px] font-bold">Hủy · va quẹt</div>
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
