import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { CONFIG } from '../../data/config'
import { NPCS, type Outfit } from '../../data/npcs'
import { formatMoney } from '../../i18n/format'
import { usePlayer } from '../../store/playerStore'
import { Portrait } from '../../ui/Portrait'
import { playSfx } from '../systems/audio'
import { setFlag } from '../systems/conditions'
import { circleKWage } from '../systems/jobs'
import { burst, Reaction } from './juice'
import { Icon3d, SvgIcon3d } from '../../ui/Icon3d'

/**
 * A shift at the corner convenience store (story 2.1 §11.1), full screen like the bubble-tea game:
 * customers bring their things to the till — tap each one to scan it, heat the bánh bao in the
 * microwave (stop the clock on the second), then count the change out of the cash drawer note by
 * note (or check a bank transfer on the customer's phone). Between customers chị Hạnh brings a
 * crate: put each thing on the right shelf, the older date to the front. Night shifts add one
 * night-time event.
 */

const C = CONFIG.vnJobs.circleK
const vnd = (n: number) => formatMoney(n, 'VND')
const pick = <V,>(list: V[]) => list[Math.floor(Math.random() * list.length)]
const INK = '#4a3226'

export interface ShiftOutcome {
  /** Customers / crate tasks done without a mistake. */
  ok: number
  all: number
  served: number
  /** Money the shop lost through wrong change (taken off the wage). */
  deduct: number
  /** Share of the shift worked (1 unless the player walked out). */
  fraction: number
}

// ------------------------------------------------------------------------------------- goods

type ShelfId = 'fridge' | 'freezer' | 'noodle' | 'drinks' | 'snacks'
interface Item {
  id: string
  name: string
  price: number
  shelf: ShelfId
  /** Microwave seconds, when the customer may ask to heat it. */
  hot?: number
  /** 3D icon (ui/Icon3d). */
  icon: string
}
const ITEMS: Item[] = [
  { id: 'miLy', name: 'Mì ly', price: 12_000, shelf: 'noodle', icon: 'steaming-bowl' },
  { id: 'suaHop', name: 'Sữa hộp', price: 8_000, shelf: 'fridge', icon: 'beverage-box' },
  { id: 'suaTuoi', name: 'Sữa tươi', price: 9_000, shelf: 'fridge', icon: 'glass-of-milk' },
  { id: 'kem', name: 'Kem ốc quế', price: 15_000, shelf: 'freezer', icon: 'soft-ice-cream' },
  { id: 'banhQuy', name: 'Bánh quy', price: 22_000, shelf: 'snacks', icon: 'cookie' },
  { id: 'caPhe', name: 'Cà phê nóng', price: 18_000, shelf: 'drinks', icon: 'hot-beverage' },
  { id: 'traXanh', name: 'Trà xanh', price: 10_000, shelf: 'drinks', icon: 'teacup-without-handle' },
  { id: 'nuocNgot', name: 'Nước ngọt', price: 11_000, shelf: 'drinks', icon: 'cup-with-straw' },
  { id: 'comNam', name: 'Cơm nắm', price: 18_000, shelf: 'fridge', hot: 40, icon: 'rice-ball' },
  { id: 'banhBao', name: 'Bánh bao', price: 25_000, shelf: 'freezer', hot: 50, icon: 'dumpling' },
  { id: 'xucXich', name: 'Xúc xích', price: 15_000, shelf: 'fridge', hot: 30, icon: 'hot-dog' },
  { id: 'banhMiKep', name: 'Bánh mì kẹp', price: 22_000, shelf: 'fridge', hot: 35, icon: 'sandwich' },
  { id: 'bongNgo', name: 'Bỏng ngô', price: 20_000, shelf: 'snacks', icon: 'popcorn' },
  { id: 'keo', name: 'Kẹo', price: 5_000, shelf: 'snacks', icon: 'candy' },
  { id: 'socola', name: 'Sô-cô-la', price: 16_000, shelf: 'snacks', icon: 'chocolate-bar' },
]
const SHELVES: { id: ShelfId; name: string }[] = [
  { id: 'fridge', name: 'Tủ mát' },
  { id: 'freezer', name: 'Tủ đông' },
  { id: 'noodle', name: 'Kệ mì' },
  { id: 'drinks', name: 'Kệ nước' },
  { id: 'snacks', name: 'Kệ bánh kẹo' },
]
/** The notes in the cash drawer. */
const DRAWER = [1_000, 2_000, 5_000, 10_000, 20_000, 50_000, 100_000, 200_000]

// ----------------------------------------------------------------------------------- people

interface Persona {
  self: string
  patience: number
  thanks: string
  outfit: Outfit
}
const base = { shorts: '#4f5d75', shoe: '#ffffff', bag: null, accessory: null } as const
const DAY: Persona[] = [
  { self: 'chị', patience: 1, thanks: 'Nhanh ghê, cảm ơn em nha!', outfit: { ...base, skin: '#fbdcc4', hair: '#3a2a26', hairStyle: 'bob', shirt: '#f8a5b4', lashes: true, expression: 'happy' } },
  { self: 'anh', patience: 0.85, thanks: 'Ok, cảm ơn em.', outfit: { ...base, skin: '#e8b994', hair: '#2b2222', hairStyle: 'short', shirt: '#5d7fb8', accessory: 'glasses' } },
  { self: 'bà', patience: 1.35, thanks: 'Bà cảm ơn cháu, cháu ngoan quá!', outfit: { ...base, skin: '#f3d3bb', hair: '#cfcfd6', hairStyle: 'elderBun', shirt: '#c9b3e6', expression: 'happy' } },
  { self: 'em', patience: 1.1, thanks: 'Em cảm ơn ạ!', outfit: { ...base, skin: '#ffe0c9', hair: '#2b2222', hairStyle: 'twin', shirt: '#ffffff', neck: 'redScarf', lashes: true, expression: 'happy' } },
  { self: 'chú', patience: 0.8, thanks: 'Được đấy, cảm ơn cháu.', outfit: { ...base, skin: '#e0b08a', hair: '#4a4448', hairStyle: 'buzz', shirt: '#f4c04e', accessory: 'helmet' } },
  { self: 'tôi', patience: 1.15, thanks: 'Thank you! Cảm ơn nhiều!', outfit: { ...base, skin: '#ffe6d6', hair: '#e8c46a', hairStyle: 'long', shirt: '#9fd3b4', eye: '#3f7fbf', expression: 'happy' } },
]
const NIGHT: Persona[] = [
  { self: 'em', patience: 1, thanks: 'Cứu em đêm nay rồi, cảm ơn ạ!', outfit: { ...base, skin: '#f9d4b8', hair: '#2b2222', hairStyle: 'short', shirt: '#6b7cb8', top: 'hoodie', accessory: 'glasses' } },
  { self: 'anh', patience: 0.85, thanks: 'Cảm ơn em, trực đêm vất vả nhỉ.', outfit: { ...base, skin: '#e8b994', hair: '#1c1818', hairStyle: 'short', shirt: '#2f3a4d', accessory: 'cap' } },
  { self: 'chị', patience: 1.1, thanks: 'Vừa hết ca trực, cảm ơn em nhé.', outfit: { ...base, skin: '#fbdcc4', hair: '#3a2a26', hairStyle: 'bun', shirt: '#a8e6cf', lashes: true } },
  { self: 'chú', patience: 0.9, thanks: 'Ừ, cảm ơn cháu.', outfit: { ...base, skin: '#e0b08a', hair: '#4a4448', hairStyle: 'buzz', shirt: '#7f8da3' } },
]
const HANH = NPCS.chiQuanLy.outfit

const NIGHT_EVENTS: { text: string; choices: { text: string; flag?: string; reply: string }[] }[] = [
  { text: '2 giờ sáng: một nhóm sinh viên ôn thi kéo vào mua 20 gói mì.', choices: [{ text: 'Tính thật nhanh, chúc cả nhóm thi tốt!', reply: '„Mai thi xong bọn em quay lại cảm ơn!"' }] },
  {
    text: 'Có người say nằm ngủ ngay trước cửa.',
    choices: [
      { text: 'Gọi bảo vệ, mang cho chú chai nước', reply: 'Chú tỉnh dần, lí nhí cảm ơn rồi đi về.' },
      { text: 'Kệ chú ấy', reply: 'Khách vào phải bước qua chú… chị Hạnh nhắn: „Lần sau gọi bảo vệ nhé em."' },
    ],
  },
  { text: 'Mất điện! Máy tính tiền tắt phụt.', choices: [{ text: 'Bình tĩnh, tính tay bằng giấy bút', reply: 'Mười phút sau có điện lại. Sổ sách vẫn khớp từng đồng.' }] },
  { text: '3 giờ sáng: Linh vào mua cà phê lon. „Tớ học bài cả đêm…"', choices: [{ text: 'Ngồi ôn từ vựng cùng Linh 10 phút', flag: 'linh.nightTalk', reply: 'Hai đứa đọc to „der, die, das" giữa cửa hàng vắng. Linh cười: „Mai thi chắc đậu!"' }] },
]

// --------------------------------------------------------------------------------- the round

interface Customer {
  who: Persona
  items: Item[]
  scanned: boolean[]
  heat: Item | null
  phase: 'scan' | 'heat' | 'pay'
  pay: { kind: 'cash'; notes: number[] } | { kind: 'qr'; sent: number }
  slip: boolean
  left: number
  max: number
}
type Task = { kind: 'shelf'; item: Item } | { kind: 'fifo'; item: Item; dates: [number, number] }
interface Crate {
  tasks: Task[]
  i: number
  left: number
  max: number
}
interface Say {
  who: Outfit
  text: string
  good: boolean
  left: number
}
interface Game {
  left: number
  cust: Customer | null
  crate: Crate | null
  say: Say | null
  gap: number
  tray: number[]
  micro: { t: number; running: boolean; done: boolean }
  ok: number
  all: number
  served: number
  deduct: number
  meter: number
  sinceCrate: number
  queue: Persona[]
  eventShown: boolean
  laser: number
  hint: { text: string; left: number } | null
  /** Emoji over the customer, a key per customer for the walk-in (1.24). */
  react: { text: string; key: number } | null
  custKey: number
  n: number
}

const sum = (list: number[]) => list.reduce((a, b) => a + b, 0)
const total = (c: Customer) => sum(c.items.map((i) => i.price))
const paid = (c: Customer) => (c.pay.kind === 'cash' ? sum(c.pay.notes) : c.pay.sent)

function newCustomer(who: Persona, rank: number): Customer {
  const n = Math.min(4, 1 + Math.floor(Math.random() * (rank === 0 ? 2 : rank === 1 ? 3 : 4)))
  const items: Item[] = []
  while (items.length < n) {
    const it = pick(ITEMS)
    if (!items.includes(it)) items.push(it)
  }
  const hotOnes = items.filter((i) => i.hot)
  const heat = hotOnes.length && Math.random() < 0.7 ? pick(hotOnes) : null
  const t = sum(items.map((i) => i.price))
  let pay: Customer['pay']
  if (rank >= 1 && Math.random() < 0.3) {
    // Bank transfer: sometimes a little short (a typo, or on purpose…)
    const short = Math.random() < 0.35 ? pick([1_000, 2_000, 5_000, 10_000].filter((d) => d < t)) : 0
    pay = { kind: 'qr', sent: t - short }
  } else {
    const big = [10_000, 20_000, 50_000, 100_000, 200_000, 500_000].find((v) => v >= t) ?? 500_000
    const notes = [big]
    // "Có lẻ không em?" — a small note on top so the change comes out round
    const odd = t % 10_000
    if (rank >= 1 && big > t && [1_000, 2_000, 5_000].includes(odd) && Math.random() < 0.5) notes.push(odd)
    pay = { kind: 'cash', notes }
  }
  const max = (8 + n * 2.5 + (heat ? 6 : 0) + 7) * who.patience * (1 - rank * 0.08)
  return { who, items, scanned: items.map(() => false), heat, phase: 'scan', pay, slip: false, left: max, max }
}

function newCrate(rank: number): Crate {
  const tasks: Task[] = []
  const n = rank >= 1 ? 3 : 2
  const fifo = Math.random() < 0.6
  while (tasks.length < n) {
    if (fifo && tasks.length === n - 1) {
      const d1 = 3 + Math.floor(Math.random() * 9)
      const d2 = d1 + 2 + Math.floor(Math.random() * 9)
      tasks.push({ kind: 'fifo', item: pick(ITEMS.filter((i) => i.shelf === 'fridge')), dates: Math.random() < 0.5 ? [d1, d2] : [d2, d1] })
    } else {
      const item = pick(ITEMS)
      if (!tasks.some((t) => t.item === item)) tasks.push({ kind: 'shelf', item })
    }
  }
  const max = (6 + n * 3.5) * (1 - rank * 0.08)
  return { tasks, i: 0, left: max, max }
}

// --------------------------------------------------------------------------------------- art

export function ItemArt({ id, className }: { id: string; className?: string }) {
  const item = ITEMS.find((i) => i.id === id)
  return <Icon3d name={item?.icon ?? 'shopping-bags'} className={`drop-shadow-[0_2px_0_rgba(74,50,38,0.25)] ${className ?? ''}`} />
}

const NOTE_COLORS: Record<number, [string, string]> = {
  1_000: ['#c9c08a', '#8a7f45'],
  2_000: ['#c4a184', '#7f5f45'],
  5_000: ['#8f93d0', '#4f5394'],
  10_000: ['#e3c06a', '#9a7428'],
  20_000: ['#7fb2e3', '#3d6e9e'],
  50_000: ['#e39abf', '#9e4f78'],
  100_000: ['#8fcf95', '#3f8a4a'],
  200_000: ['#e3967a', '#a04a32'],
  500_000: ['#7fd0e0', '#2f8a9e'],
}

/** A cute Vietnamese banknote: colour by value, big number, a little lotus watermark. */
export function NoteArt({ v, className }: { v: number; className?: string }) {
  const [fill, dark] = NOTE_COLORS[v] ?? ['#dddddd', '#888888']
  const label = v >= 1_000 ? `${v / 1_000}K` : String(v)
  return (
    <svg viewBox="0 0 64 32" className={className} aria-hidden="true">
      <rect x="1" y="1" width="62" height="30" rx="3.5" fill={fill} stroke={INK} strokeWidth="1.6" />
      <rect x="4" y="4" width="56" height="24" rx="2" fill="none" stroke={dark} strokeWidth="1" opacity="0.6" />
      <circle cx="48" cy="16" r="8" fill="#ffffff" opacity="0.35" />
      <path d="M48 10c2 2 2 5 0 8-2-3-2-6 0-8zM42.5 15c2.6-.4 4.6 1 5.5 3-2.4.6-4.6-.6-5.5-3zM53.5 15c-2.6-.4-4.6 1-5.5 3 2.4.6 4.6-.6 5.5-3z" fill={dark} opacity="0.55" />
      <text x="20" y="21.5" textAnchor="middle" fontSize="13" fontWeight="900" fill={INK} fontFamily="Barlow Condensed, sans-serif">
        {label}
      </text>
    </svg>
  )
}

function ShelfArt({ id }: { id: ShelfId }) {
  const frame = { stroke: INK, strokeWidth: 1.6, strokeLinejoin: 'round' as const }
  const rows = [14, 27, 40]
  let goods: ReactNode = null
  if (id === 'fridge') {
    goods = (
      <>
        <rect x="4" y="3" width="52" height="44" rx="4" fill="#d9f0fb" {...frame} />
        {rows.map((y, r) => [10, 20, 30, 40, 50].map((x, k) => <rect key={`${r}${k}`} x={x - 3.5} y={y - 8} width="7" height="8" rx="1.5" fill={['#ffffff', '#f8a5b4', '#7fb8e8'][(k + r) % 3]} stroke={INK} strokeWidth="0.8" />))}
        <path d="M8 6v38" stroke="#ffffff" strokeWidth="2.5" opacity="0.8" strokeLinecap="round" />
      </>
    )
  } else if (id === 'freezer') {
    goods = (
      <>
        <rect x="3" y="18" width="54" height="29" rx="4" fill="#ffffff" {...frame} />
        <path d="M5 18l4-10h42l4 10z" fill="#cfeaf6" {...frame} />
        {[12, 21, 30, 39, 48].map((x, k) => (
          <g key={k}>
            <rect x={x - 3} y="9" width="6" height="9" rx="3" fill={['#ff9fb2', '#ffe08a', '#a8d86b', '#c9b3e6', '#fff6ea'][k]} stroke={INK} strokeWidth="0.8" />
          </g>
        ))}
        <path d="M10 30h40M10 37h40" stroke="#bcd9e8" strokeWidth="2" strokeLinecap="round" />
      </>
    )
  } else {
    const color = id === 'noodle' ? ['#e2574c', '#f4c04e', '#fffaf0'] : id === 'drinks' ? ['#4f86d9', '#e2574c', '#a8d86b'] : ['#f39a2b', '#4f86d9', '#e8697d']
    goods = (
      <>
        <rect x="4" y="3" width="52" height="44" rx="3" fill="#f3e3c4" {...frame} />
        {rows.map((y) => (
          <rect key={y} x="4" y={y} width="52" height="3" fill="#b98a5a" />
        ))}
        {rows.map((y, r) =>
          [11, 21, 31, 41, 50].map((x, k) =>
            id === 'drinks' ? (
              <rect key={`${r}${k}`} x={x - 2.5} y={y - 10} width="5" height="10" rx="1.6" fill={color[(k + r) % 3]} stroke={INK} strokeWidth="0.7" />
            ) : id === 'noodle' ? (
              <path key={`${r}${k}`} d={`M${x - 4} ${y - 8}h8l-1.2 8h-5.6z`} fill={color[(k + r) % 3]} stroke={INK} strokeWidth="0.7" />
            ) : (
              <path key={`${r}${k}`} d={`M${x - 4} ${y - 9}h8l.8 9h-9.6z`} fill={color[(k + r) % 3]} stroke={INK} strokeWidth="0.7" />
            ),
          ),
        )}
      </>
    )
  }
  return (
    <svg viewBox="0 0 60 50" className="h-full w-full" aria-hidden="true">
      {goods}
    </svg>
  )
}

function MicrowaveArt({ item, t, running, done }: { item: Item | null; t: number; running: boolean; done: boolean }) {
  return (
    <svg viewBox="0 0 150 92" className="h-full w-full" aria-hidden="true">
      <rect x="3" y="3" width="144" height="84" rx="9" fill="#e9ecf1" stroke={INK} strokeWidth="2.2" />
      <rect x="11" y="11" width="94" height="68" rx="6" fill={running ? '#ffcf7a' : '#3b4252'} stroke={INK} strokeWidth="2" />
      {running && <rect x="11" y="11" width="94" height="68" rx="6" fill="#fff2b8" className="animate-pulse" opacity="0.6" />}
      <ellipse cx="58" cy="66" rx="34" ry="7" fill="#ffffff" opacity={running ? 0.85 : 0.35} />
      {item && (
        <g transform={running ? `rotate(${(t * 40) % 360} 58 46)` : undefined}>
          <SvgIcon3d name={item.icon} x={38} y={24} size={40} />
        </g>
      )}
      {done && (
        <g stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.9">
          <path d="M48 20c-3-4 3-6 0-10M58 18c-3-4 3-6 0-10M68 20c-3-4 3-6 0-10" />
        </g>
      )}
      <path d="M17 16l12-1M17 21l6-.5" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      <rect x="112" y="13" width="28" height="15" rx="2.5" fill="#1d2b22" stroke={INK} strokeWidth="1.4" />
      <text x="126" y="25" textAnchor="middle" fontSize="12" fontWeight="900" fill="#7dffb0" fontFamily="monospace">
        {String(Math.min(99, Math.floor(t))).padStart(2, '0')}
      </text>
      {[0, 1, 2].map((r) => [0, 1].map((c) => <rect key={`${r}${c}`} x={114 + c * 13} y={35 + r * 10} width="10" height="7" rx="2" fill="#c9ccd2" stroke={INK} strokeWidth="1" />))}
      <circle cx="126" cy="73" r="7" fill="#c9ccd2" stroke={INK} strokeWidth="1.4" />
      <path d="M126 73l4-3" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function PhoneArt({ amount }: { amount: number }) {
  return (
    <svg viewBox="0 0 70 110" className="h-full w-full" aria-hidden="true">
      <rect x="3" y="3" width="64" height="104" rx="10" fill="#2f2f38" stroke={INK} strokeWidth="2" />
      <rect x="8" y="12" width="54" height="86" rx="4" fill="#ffffff" />
      <rect x="8" y="12" width="54" height="16" rx="4" fill="#3fae72" />
      <text x="35" y="23.5" textAnchor="middle" fontSize="7" fontWeight="900" fill="#ffffff">
        NGÂN HÀNG
      </text>
      <circle cx="35" cy="45" r="10" fill="#e4f6ea" stroke="#3fae72" strokeWidth="2" />
      <path d="M30 45l4 4 7-8" stroke="#3fae72" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <text x="35" y="66" textAnchor="middle" fontSize="6.5" fontWeight="800" fill="#6b6878">
        Thành công
      </text>
      <text x="35" y="80" textAnchor="middle" fontSize="11" fontWeight="900" fill={INK}>
        {vnd(amount)}
      </text>
      <rect x="25" y="5.5" width="20" height="3" rx="1.5" fill="#45434f" />
    </svg>
  )
}

const seeded = (i: number) => {
  const v = Math.sin(i * 91.7 + 13.1) * 43758.5453
  return v - Math.floor(v)
}
const GOODS = ['#e2574c', '#f4c04e', '#4f86d9', '#a8d86b', '#f8a5b4', '#ffffff', '#f39a2b', '#cdb8f0', '#7fd0e0']

/** The shop behind the customer: shelves full of goods, the drinks fridge, ceiling lights, floor tiles. */
function ShopBackdrop({ night }: { night: boolean }) {
  const wall = night ? '#3a4466' : '#fbf3e4'
  const shelves: ReactNode[] = []
  let n = 0
  for (const [sx, sw] of [
    [8, 96],
    [112, 96],
  ] as const) {
    shelves.push(<rect key={`u${sx}`} x={sx} y="34" width={sw} height="118" rx="3" fill={night ? '#c9ccd2' : '#e3e5ea'} stroke={INK} strokeWidth="1.6" />)
    for (let r = 0; r < 4; r++) {
      const y = 40 + r * 28
      shelves.push(<rect key={`s${sx}${r}`} x={sx + 2} y={y + 22} width={sw - 4} height="4" fill="#b98a5a" />)
      let x = sx + 5
      while (x < sx + sw - 10) {
        const kind = Math.floor(seeded(n) * 3)
        const w = kind === 0 ? 8 : kind === 1 ? 11 : 7
        const h = kind === 0 ? 18 : kind === 1 ? 14 : 20
        const c = GOODS[Math.floor(seeded(n + 50) * GOODS.length)]
        shelves.push(<rect key={`g${n}`} x={x} y={y + 22 - h} width={w} height={h} rx={kind === 2 ? 3 : 1.4} fill={c} stroke={INK} strokeWidth="0.7" />)
        if (kind !== 2) shelves.push(<rect key={`h${n}`} x={x + 1.5} y={y + 22 - h + 3} width={w - 3} height="2.4" fill="#ffffff" opacity="0.5" />)
        x += w + 1.5
        n++
      }
    }
  }
  return (
    <svg viewBox="0 0 320 190" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 h-full w-full" aria-hidden="true">
      <rect width="320" height="190" fill={wall} />
      {/* ceiling lights */}
      {[50, 160, 270].map((x) => (
        <g key={x}>
          <rect x={x - 26} y="6" width="52" height="7" rx="3.5" fill="#fffbe8" stroke={INK} strokeWidth="1.2" />
          <path d={`M${x - 26} 13l-10 24h72l-10-24z`} fill="#fff6c8" opacity={night ? 0.22 : 0.35} />
        </g>
      ))}
      {shelves}
      {/* drinks fridge with glowing glass doors */}
      <rect x="218" y="26" width="94" height="128" rx="4" fill="#d4202a" stroke={INK} strokeWidth="1.6" />
      {[0, 1].map((d) => (
        <g key={d}>
          <rect x={224 + d * 43} y="34" width="39" height="114" rx="2" fill="#dff3fb" stroke={INK} strokeWidth="1.2" />
          {[0, 1, 2, 3].map((r) =>
            [0, 1, 2, 3].map((k) => (
              <rect key={`${r}${k}`} x={227 + d * 43 + k * 9} y={42 + r * 27} width="6" height="17" rx="2" fill={GOODS[(r * 4 + k + d * 3) % GOODS.length]} stroke={INK} strokeWidth="0.6" />
            )),
          )}
          {[0, 1, 2, 3].map((r) => (
            <rect key={`l${r}`} x={225 + d * 43} y={59 + r * 27} width="37" height="2" fill="#9fb8c8" />
          ))}
          <rect x={258 + d * 43 - 40 + 37} y="80" width="2.4" height="16" rx="1" fill="#c9ccd2" stroke={INK} strokeWidth="0.5" />
          <path d={`M${228 + d * 43} 38l10 0-14 30z`} fill="#ffffff" opacity="0.5" />
        </g>
      ))}
      {/* promo poster */}
      <g transform="rotate(-3 168 22)">
        <rect x="140" y="14" width="58" height="16" rx="2" fill="#ffe08a" stroke={INK} strokeWidth="1.2" />
        <text x="169" y="25.5" textAnchor="middle" fontSize="8" fontWeight="900" fill="#d4202a">
          MUA 2 TẶNG 1
        </text>
      </g>
      {/* floor */}
      <rect x="0" y="152" width="320" height="38" fill={night ? '#5d6680' : '#efe6d6'} />
      {Array.from({ length: 12 }, (_, i) => (
        <path key={i} d={`M${i * 30 - 20} 190L${i * 26 + 4} 152`} stroke={night ? '#4a536b' : '#ddd0bb'} strokeWidth="1.4" />
      ))}
      <path d="M0 164h320M0 177h320" stroke={night ? '#4a536b' : '#ddd0bb'} strokeWidth="1.4" />
    </svg>
  )
}

const Plate = ({ children }: { children: ReactNode }) => (
  <span className="rounded-md border-2 border-outline bg-white px-2 py-0.5 text-[11px] font-black tracking-wide text-[#d4202a] shadow-[0_2px_0_var(--color-outline)]">{children}</span>
)
const Key = ({ children }: { children: ReactNode }) => <b className="font-black text-[#d4202a]">{children}</b>

// -------------------------------------------------------------------------------------- game

export function CircleKGame({ night, rank, onDone }: { night: boolean; rank: number; onDone: (o: ShiftOutcome) => void }) {
  const people = night ? NIGHT : DAY
  const g = useRef<Game>(null as unknown as Game)
  if (!g.current) {
    g.current = {
      left: C.seconds,
      cust: null,
      crate: null,
      say: null,
      gap: 0.6,
      tray: [],
      micro: { t: 0, running: false, done: false },
      ok: 0,
      all: 0,
      served: 0,
      deduct: 0,
      meter: 60,
      sinceCrate: 0,
      queue: [pick(people), pick(people), pick(people)],
      eventShown: false,
      laser: 0,
      hint: null,
      react: null,
      custKey: 0,
      n: 0,
    }
  }
  const [, setFrame] = useState(0)
  const render = useCallback(() => setFrame((n) => n + 1), [])
  const [confirm, setConfirm] = useState(false)
  const [event, setEvent] = useState<(typeof NIGHT_EVENTS)[number] | null>(null)
  const [eventReply, setEventReply] = useState<string | null>(null)
  const [summary, setSummary] = useState<ShiftOutcome | null>(null)
  const paused = useRef(false)
  paused.current = confirm || !!summary || !!event
  const faceRef = useRef<HTMLSpanElement>(null)
  const lcdRef = useRef<HTMLDivElement>(null)

  const hint = useCallback((text: string) => {
    g.current.hint = { text, left: 1.8 }
  }, [])

  const end = useCallback((quit: boolean) => {
    const s = g.current
    setConfirm(false)
    const fraction = quit ? Math.max(0, Math.min(1, 1 - s.left / C.seconds)) : 1
    setSummary({ ok: s.ok, all: s.all, served: s.served, deduct: s.deduct, fraction })
    playSfx(quit ? 'fail' : 'success')
  }, [])

  /** A customer is done: thanks or a complaint, then the next one. */
  const finishCustomer = useCallback((good: boolean, text: string) => {
    const s = g.current
    const c = s.cust
    if (!c) return
    s.all++
    if (good && !c.slip) s.ok++
    s.served++
    s.meter = Math.max(0, Math.min(100, s.meter + (good && !c.slip ? 7 : -10)))
    s.say = { who: c.who.outfit, text, good: good && !c.slip, left: good ? 1.1 : 1.6 }
    s.react = { text: good && !c.slip ? pick(['smiling-face-with-smiling-eyes', 'face-savoring-food', 'smiling-face-with-hearts', 'smiling-face-with-heart-eyes']) : 'pouting-face', key: ++s.n }
    s.cust = null
    s.tray = []
    s.micro = { t: 0, running: false, done: false }
    s.sinceCrate++
  }, [])

  // Game clock
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    let shown = 0
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      const dt = Math.min(0.25, (now - last) / 1000)
      last = now
      const s = g.current
      if (paused.current) return
      s.left -= dt
      if (s.left <= 0) {
        s.left = 0
        end(false)
        return
      }
      if (night && !s.eventShown && s.left < C.seconds * 0.55 && !s.say) {
        s.eventShown = true
        setEvent(pick(NIGHT_EVENTS))
        playSfx('bell')
        return
      }
      if (s.hint) {
        s.hint.left -= dt
        if (s.hint.left <= 0) s.hint = null
      }
      if (s.laser > 0) s.laser = Math.max(0, s.laser - dt)
      if (s.say) {
        s.say.left -= dt
        if (s.say.left <= 0) {
          s.say = null
          s.gap = 0.45
        }
      } else if (s.cust) {
        s.cust.left -= dt
        if (s.cust.left <= 0) {
          s.cust.slip = true
          playSfx('wrong')
          finishCustomer(false, `Lâu quá… thôi ${s.cust.who.self} sang cửa hàng khác!`)
        }
      } else if (s.crate) {
        s.crate.left -= dt
        if (s.crate.left <= 0) {
          const missed = s.crate.tasks.length - s.crate.i
          s.all += missed
          s.meter = Math.max(0, s.meter - 6)
          s.crate = null
          s.say = { who: HANH, text: 'Thôi để chị xếp nốt. Lần sau nhanh tay hơn nhé!', good: false, left: 1.5 }
          playSfx('wrong')
        }
      } else {
        s.gap -= dt
        if (s.gap <= 0) {
          if (s.sinceCrate >= 3 || (s.sinceCrate >= 2 && Math.random() < 0.4)) {
            s.crate = newCrate(rank)
            s.sinceCrate = 0
            playSfx('door')
          } else {
            const who = s.queue.shift() ?? pick(people)
            s.queue.push(pick(people))
            s.cust = newCustomer(who, rank)
            s.custKey++
            playSfx('ding')
          }
        }
      }
      const m = s.micro
      if (m.running) {
        m.t += dt * (13 + rank * 3)
        if (m.t >= 99) {
          m.t = 99
          stopMicro()
        }
      }
      if (m.running || s.laser > 0 || now - shown > 100) {
        shown = now
        render()
      }
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
    // stopMicro reads the ref only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rank, night, end, finishCustomer, render])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape' && !summary && !event) setConfirm((c) => !c)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [summary, event])

  const s = g.current
  const c = s.cust
  const tol = rank >= 2 ? 2 : rank === 1 ? 3 : 4

  // ----- actions
  const scan = (i: number) => {
    if (!c || c.phase !== 'scan' || c.scanned[i]) return
    c.scanned[i] = true
    s.laser = 0.25
    playSfx('beep')
    if (c.scanned.every(Boolean)) c.phase = c.heat ? 'heat' : 'pay'
    render()
  }
  const startMicro = () => {
    if (!c || c.phase !== 'heat' || s.micro.running) return
    s.micro = { t: 0, running: true, done: false }
    playSfx('click')
    render()
  }
  function stopMicro() {
    const cur = g.current.cust
    const m = g.current.micro
    if (!cur || !cur.heat || !m.running) return
    m.running = false
    m.done = true
    const diff = m.t - cur.heat.hot!
    if (Math.abs(diff) <= tol) {
      playSfx('ding')
      hint(`Nóng hổi vừa thổi vừa ăn!`)
    } else {
      cur.slip = true
      playSfx('wrong')
      hint(diff < 0 ? `${cur.who.self[0].toUpperCase()}${cur.who.self.slice(1)}: „Ơ, vẫn còn lạnh ngắt…"` : `${cur.who.self[0].toUpperCase()}${cur.who.self.slice(1)}: „Nóng bỏng tay, hơi khét rồi…"`)
    }
    window.setTimeout(() => {
      const now = g.current.cust
      if (now === cur && now.phase === 'heat') {
        now.phase = 'pay'
        render()
      }
    }, 650)
    render()
  }
  const addNote = (v: number) => {
    if (!c || c.phase !== 'pay' || c.pay.kind !== 'cash') return
    if (s.tray.length >= 8) return hint('Khay đầy rồi! Bấm vào tờ tiền trong khay để cất lại.')
    s.tray.push(v)
    playSfx('pickup')
    render()
  }
  const removeNote = (i: number) => {
    s.tray.splice(i, 1)
    playSfx('click')
    render()
  }
  const giveChange = () => {
    if (!c || c.phase !== 'pay' || c.pay.kind !== 'cash') return
    const due = paid(c) - total(c)
    const given = sum(s.tray)
    const self = c.who.self
    if (given === due) {
      playSfx('till')
      burst(lcdRef.current, 'coins')
      finishCustomer(true, c.slip ? `Ừ, cảm ơn em.` : c.who.thanks)
    } else if (given > due) {
      s.deduct += given - due
      c.slip = true
      playSfx('wrong')
      finishCustomer(false, `Ơ… em thối thừa ${vnd(given - due)} kìa! (khách cầm đi mất)`)
    } else {
      c.slip = true
      playSfx('wrong')
      finishCustomer(false, `Thiếu ${vnd(due - given)} rồi em ơi! ${self === 'tôi' ? 'Not enough!' : 'Đưa nốt cho ' + self + ' đi.'}`)
    }
    render()
  }
  const checkTransfer = (claimShort: boolean) => {
    if (!c || c.phase !== 'pay' || c.pay.kind !== 'qr') return
    const short = total(c) - c.pay.sent
    if (short > 0 && claimShort) {
      playSfx('right')
      finishCustomer(true, `Ơ chết, ${c.who.self} chuyển thiếu ${vnd(short)} thật. Đây, ${c.who.self} gửi thêm!`)
    } else if (short > 0) {
      s.deduct += short
      c.slip = true
      playSfx('wrong')
      finishCustomer(false, `(Khách đi rồi mới thấy: chuyển thiếu ${vnd(short)}…)`)
    } else if (claimShort) {
      c.slip = true
      playSfx('wrong')
      finishCustomer(false, `${c.who.self[0].toUpperCase()}${c.who.self.slice(1)} chuyển đủ rồi mà, em xem kỹ lại đi!`)
    } else {
      playSfx('till')
      finishCustomer(true, c.who.thanks)
    }
    render()
  }
  const shelve = (answer: ShelfId | 0 | 1) => {
    const cr = s.crate
    if (!cr) return
    const task = cr.tasks[cr.i]
    const right = task.kind === 'shelf' ? answer === task.item.shelf : answer === (task.dates[0] < task.dates[1] ? 0 : 1)
    s.all++
    if (right) {
      s.ok++
      playSfx('right')
    } else {
      playSfx('wrong')
      hint(task.kind === 'shelf' ? `Chị Hạnh: „${task.item.name} để ở ${SHELVES.find((x) => x.id === task.item.shelf)!.name.toLowerCase()} chứ em!"` : 'Chị Hạnh: „Hàng sắp hết hạn để ra trước, bán trước chứ!"')
    }
    cr.i++
    if (cr.i >= cr.tasks.length) {
      s.crate = null
      s.meter = Math.min(100, s.meter + 4)
      s.say = { who: HANH, text: 'Gọn gàng lắm, cảm ơn em!', good: true, left: 1 }
    }
    render()
  }

  // ----- view
  const speaker: Outfit | null = s.say?.who ?? c?.who.outfit ?? (s.crate ? HANH : null)
  const patience = c ? Math.max(0, c.left / c.max) : s.crate ? Math.max(0, s.crate.left / s.crate.max) : 0
  const secs = Math.ceil(s.left)
  const task = s.crate?.tasks[s.crate.i]
  const Self = c ? c.who.self[0].toUpperCase() + c.who.self.slice(1) : ''
  const showDue = rank === 0

  let line: ReactNode = null
  if (s.say) line = <span className={s.say.good ? 'text-[#2f8c5a]' : 'text-lacquer'}>{s.say.text}</span>
  else if (c && c.phase === 'scan') line = <span>{c.items.length > 2 ? `Tính tiền giúp ${c.who.self} mấy món này nhé!` : `${Self} lấy ${c.items.map((i) => i.name.toLowerCase()).join(' với ')}.`}</span>
  else if (c && c.phase === 'heat') line = (
    <span>
      Hâm nóng giúp {c.who.self} cái <Key>{c.heat!.name.toLowerCase()}</Key> nhé — <Key>{c.heat!.hot} giây</Key>!
    </span>
  )
  else if (c && c.pay.kind === 'cash') line = (
    <span>
      {Self} gửi <Key>{vnd(paid(c))}</Key>
      {c.pay.notes.length > 1 ? ' (có lẻ đây em)' : ''}.
    </span>
  )
  else if (c && c.pay.kind === 'qr') line = <span>{Self} chuyển khoản rồi nhé, em xem màn hình đi.</span>
  else if (task) line = task.kind === 'shelf' ? (
    <span>
      Hàng về! Xếp <Key>{task.item.name.toLowerCase()}</Key> lên kệ nào em?
    </span>
  ) : (
    <span>
      Hai lốc <Key>{task.item.name.toLowerCase()}</Key>: lốc nào xếp ra <Key>trước</Key>?
    </span>
  )

  return (
    <div className="pointer-events-auto absolute inset-0 z-40 flex justify-center bg-[#4a3226]/60 select-none" style={{ touchAction: 'manipulation' }} onContextMenu={(e) => e.preventDefault()} data-testid="ck-game">
      <section className={`relative flex h-full w-full max-w-md flex-col overflow-hidden text-ink sx-safe land:grid land:max-w-[68rem] land:grid-cols-2 land:grid-rows-[auto_auto_minmax(0,1fr)_auto] ${night ? 'bg-[#dfe3ee]' : 'bg-[#f7f3ec]'}`} role="dialog" aria-modal="true" aria-label="Cửa hàng tiện lợi">
        {/* Landscape (1.30): the shop floor + till on the left, the work area on the right. */}
        {/* Fascia: red band with the orange and white stripes */}
        <div className="shrink-0 border-b-2 border-outline land:col-span-2" style={{ paddingTop: 'env(safe-area-inset-top)', background: '#d4202a' }}>
          <div className="flex h-8 items-center justify-center gap-2">
            <span className={`font-display text-[15px] font-extrabold tracking-wide text-white ${night ? 'drop-shadow-[0_0_6px_#ff6b5e]' : ''}`}>CIRCLE K · 24/7</span>
            <span className="rounded-full bg-white/90 px-1.5 text-[10px] font-black text-[#d4202a]">{night ? 'CA ĐÊM' : 'CA NGÀY'}</span>
          </div>
          <div className="h-1.5 bg-[#f39a2b]" />
          <div className="h-1 bg-white" />
        </div>

        {/* Shift status */}
        <div className="flex shrink-0 items-center gap-2 px-3 pt-1.5 land:col-span-2">
          <div className="flex -space-x-2">
            {s.queue.slice(0, 3).map((p, i) => (
              <span key={i} className="rounded-full border-2 border-outline bg-cream" style={{ opacity: 1 - i * 0.2 }}>
                <Portrait outfit={p.outfit} size={28} />
              </span>
            ))}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[11px] font-black">
              <span>HÀI LÒNG</span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full border-2 border-outline bg-white">
                <div className={`h-full transition-[width] ${s.meter >= 66 ? 'bg-[#6fcf97]' : s.meter >= 33 ? 'bg-[#f4c04e]' : 'bg-[#e8697d]'}`} style={{ width: `${s.meter}%` }} />
              </div>
            </div>
            <div className="mt-0.5 text-[11px] font-bold text-ink/70">
              Khách <b className="text-ink">{s.served}</b> · Đúng <b className="text-ink">{s.ok}</b>/{s.all}
              {s.deduct > 0 && <b className="text-lacquer"> · −{vnd(s.deduct)}</b>}
            </div>
          </div>
          <span data-testid="ck-time" className={`rounded-full border-2 border-outline px-2 py-0.5 text-sm font-black tabular-nums ${secs <= 10 ? 'animate-pulse bg-lacquer text-gold-light' : 'bg-white'}`}>
            <Icon3d name="stopwatch" className="-my-1 mr-0.5 inline-block h-5 w-5 align-[-3px]" />
            {secs}s
          </span>
          <button type="button" data-testid="ck-quit" aria-label="Nghỉ ca" onClick={() => setConfirm(true)} className="grid h-8 w-8 place-items-center rounded-full border-2 border-outline bg-cream text-base font-black shadow-[0_2px_0_var(--color-outline)] active:translate-y-0.5">
            ✕
          </button>
        </div>

        {/* Shop floor: shelves behind, the customer at the till */}
        <div className="relative mx-2 mt-1.5 flex min-h-[7.4rem] flex-1 flex-col overflow-hidden rounded-2xl border-2 border-outline land:col-start-1 land:row-start-3 land:min-h-0" style={{ background: night ? 'linear-gradient(#2f3a5c,#46507a)' : 'linear-gradient(#fdf6e8,#f1e4cc)' }}>
          <ShopBackdrop night={night} />
          <div className="relative flex min-h-0 flex-1 items-end gap-2 px-2 pt-1.5 pb-1">
          {speaker ? (
            <>
              <span
                key={s.custKey}
                ref={faceRef}
                className="animate-walk-in relative h-[60px] w-[60px] shrink-0 rounded-full border-2 border-outline bg-cream shadow-[0_3px_0_var(--color-outline)] [@media(min-height:740px)]:h-[104px] [@media(min-height:740px)]:w-[104px] [&>*]:h-full [&>*]:w-full"
              >
                {s.react && <Reaction key={s.react.key} text={s.react.text} className="-top-3 -right-2" />}
                <Portrait outfit={{ ...speaker, expression: s.say ? (s.say.good ? 'happy-closed' : 'sad') : patience < 0.3 ? 'sad' : speaker.expression }} size={60} />
              </span>
              <div className="relative min-w-0 flex-1 rounded-2xl border-2 border-outline bg-white px-3 py-1.5 text-[14px] leading-snug font-bold shadow-[0_3px_0_var(--color-outline)]" data-testid="ck-line">
                {line}
                {!s.say && (c || s.crate) && (
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="text-[10px] font-black tracking-wide text-ink/55">KIÊN NHẪN</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full border-2 border-outline bg-white">
                      <div className={`h-full ${patience > 0.5 ? 'bg-[#f4c04e]' : patience > 0.25 ? 'bg-[#f39a2b]' : 'bg-[#e8697d]'}`} style={{ width: `${patience * 100}%` }} />
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className={`relative w-full text-center text-sm font-bold ${night ? 'text-white/70' : 'text-ink/50'}`}>Leng keng… có khách vào.</p>
          )}
          </div>
          {/* The counter top: what the customer put down; scanned things go into the bag */}
          <div className="relative flex h-11 shrink-0 items-end gap-1 border-t-2 border-outline px-2 pb-0.5" style={{ background: 'linear-gradient(#f2d3a0,#d9a86a)' }}>
            {c?.items.map((it, i) => (
              <ItemArt key={it.id} id={it.id} className={`h-9 w-9 transition-all duration-300 ${c.scanned[i] ? 'translate-x-3 scale-75 opacity-0' : ''}`} />
            ))}
            {c?.heat && c.phase !== 'scan' && <ItemArt id={c.heat.id} className="h-9 w-9" />}
            {s.crate && (
              <svg viewBox="0 0 40 36" className="h-9 w-10" aria-hidden="true">
                <path d="M4 12h32v22H4z" fill="#c49a6c" stroke={INK} strokeWidth="1.6" />
                <path d="M4 12l6-8h20l6 8" fill="#d9b07a" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
                <path d="M14 12v8h12v-8" fill="#e9d0a4" stroke={INK} strokeWidth="1.2" />
              </svg>
            )}
            {c && c.scanned.some(Boolean) && (
              <svg viewBox="0 0 40 40" className="ml-auto h-10 w-10" aria-hidden="true">
                <path d="M9 14h22l2 22H7z" fill="#ffffff" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" opacity="0.92" />
                <path d="M14 14c0-6 4-8 6-8s6 2 6 8" fill="none" stroke={INK} strokeWidth="1.6" />
                <path d="M11 20h18" stroke="#d4202a" strokeWidth="2.4" />
                <text x="20" y="31" textAnchor="middle" fontSize="9" fontWeight="900" fill={INK}>
                  {c.scanned.filter(Boolean).length}
                </text>
              </svg>
            )}
          </div>
        </div>

        {/* The till: register display + scanner */}
        <div className="mx-2 mt-1.5 flex shrink-0 items-stretch gap-2 land:col-start-1 land:row-start-4 land:mb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <div ref={lcdRef} className="relative flex-1 rounded-xl border-2 border-outline bg-[#1d2b22] px-2.5 py-1 font-mono text-[12px] leading-[1.35] font-black text-[#7dffb0] shadow-[0_3px_0_var(--color-outline)]" data-testid="ck-lcd">
            <div className="flex justify-between">
              <span>TỔNG</span>
              <span data-testid="ck-total">{c ? vnd(sum(c.items.filter((_, i) => c.scanned[i]).map((i) => i.price))) : '—'}</span>
            </div>
            <div className="flex justify-between opacity-90">
              <span>{c?.pay.kind === 'qr' ? 'CHUYỂN KHOẢN' : 'KHÁCH ĐƯA'}</span>
              <span>{c && c.phase === 'pay' ? (c.pay.kind === 'qr' ? 'xem điện thoại' : vnd(paid(c))) : '—'}</span>
            </div>
            <div className="flex justify-between text-[#ffe08a]">
              <span>THỐI LẠI</span>
              <span data-testid="ck-due">{c && c.phase === 'pay' && c.pay.kind === 'cash' ? (showDue ? vnd(paid(c) - total(c)) : '???') : '—'}</span>
            </div>
            <span className="pointer-events-none absolute inset-0 rounded-[10px] bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.12)_50%)] bg-[length:100%_3px]" />
          </div>
          <div className="relative w-[4.6rem] shrink-0 overflow-hidden rounded-xl border-2 border-outline bg-[#c9ccd2] shadow-[0_3px_0_var(--color-outline)]">
            <svg viewBox="0 0 70 60" className="h-full w-full" aria-hidden="true">
              <rect x="8" y="34" width="54" height="20" rx="4" fill="#3b4252" stroke={INK} strokeWidth="1.6" />
              <rect x="14" y="38" width="42" height="6" rx="2" fill={s.laser > 0 ? '#ff6b5e' : '#2a2f3a'} />
              <path d="M22 30l10-20 16 4-8 18z" fill="#45434f" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
              <rect x="30" y="8" width="16" height="7" rx="2" fill="#e2574c" stroke={INK} strokeWidth="1.2" transform="rotate(14 38 11)" />
              {s.laser > 0 && <path d="M8 41h54" stroke="#ff3b30" strokeWidth="2" opacity="0.9" />}
            </svg>
          </div>
        </div>

        {/* Work area: changes with the step */}
        <div className="mx-2 mt-1.5 mb-2 flex min-h-[15.5rem] shrink-0 flex-col rounded-2xl border-2 border-outline bg-[#e9dcc4] p-2 shadow-[0_3px_0_var(--color-outline)] land:col-start-2 land:row-span-2 land:row-start-3 land:ml-0 land:mb-[max(0.5rem,env(safe-area-inset-bottom))] land:min-h-0 short:p-1.5">
          <div className="flex items-center gap-2">
            <Plate>{c ? (c.phase === 'scan' ? 'QUÉT HÀNG' : c.phase === 'heat' ? 'LÒ VI SÓNG' : c.pay.kind === 'qr' ? 'KIỂM TRA' : 'NGĂN KÉO TIỀN') : s.crate ? 'XẾP KỆ' : 'QUẦY'}</Plate>
            <span className="min-w-0 flex-1 truncate text-[12px] font-extrabold text-[#8a5a2b]" data-testid="ck-step">
              {s.hint?.text ??
                (c
                  ? c.phase === 'scan'
                    ? 'Bấm từng món để quét mã'
                    : c.phase === 'heat'
                      ? `Dừng lò đúng ${c.heat!.hot} giây (±${tol})`
                      : c.pay.kind === 'qr'
                        ? `Hóa đơn ${vnd(total(c))} — khách chuyển đủ chưa?`
                        : 'Bấm tờ tiền để thối, rồi bấm „Thối tiền"'
                  : s.crate
                    ? `Thùng hàng: ${s.crate.i + 1}/${s.crate.tasks.length}`
                    : 'Chờ khách…')}
            </span>
          </div>

          {c && c.phase === 'scan' && (
            <div className="mt-2 flex min-h-0 flex-1 flex-wrap content-center justify-center gap-2">
              {c.items.map((it, i) => (
                <button
                  key={it.id}
                  type="button"
                  data-testid={`ck-item-${i}`}
                  onClick={() => scan(i)}
                  disabled={c.scanned[i]}
                  className={`relative flex h-[6.6rem] w-[calc(50%-0.25rem)] flex-col items-center justify-center rounded-2xl short:h-[6rem] short:w-[calc(25%-0.4rem)] border-2 border-outline shadow-[0_3px_0_var(--color-outline)] transition active:translate-y-0.5 ${c.scanned[i] ? 'bg-[#e4f6ea] opacity-60' : 'bg-white'}`}
                >
                  <ItemArt id={it.id} className="h-14 w-14" />
                  <span className="text-[11px] leading-tight font-black">{it.name}</span>
                  <span className="text-[10px] font-bold text-ink/60">{c.scanned[i] ? vnd(it.price) : '▮▯▮▮▯▮▯▮'}</span>
                  {c.scanned[i] && <span className="absolute top-1 right-1.5 text-sm font-black text-[#2f8c5a]">✓</span>}
                </button>
              ))}
            </div>
          )}

          {c && c.phase === 'heat' && (
            <div className="mt-1 flex min-h-0 flex-1 flex-col items-center justify-center gap-2">
              <div className="relative h-[8.5rem] w-full max-w-[17rem] short:h-[6.6rem]">
                <MicrowaveArt item={c.heat} t={s.micro.t} running={s.micro.running} done={s.micro.done} />
                <span className="absolute -top-1 -left-1 rotate-[-6deg] rounded-md border-2 border-outline bg-[#ffe08a] px-1.5 py-0.5 text-[12px] font-black shadow-[0_2px_0_var(--color-outline)]">
                  {c.heat!.hot}s
                </span>
              </div>
              <button
                type="button"
                data-testid="ck-micro"
                onClick={() => (s.micro.running ? stopMicro() : startMicro())}
                disabled={s.micro.done}
                className={`w-full max-w-[17rem] rounded-2xl py-3 font-display text-lg font-extrabold active:translate-y-0.5 short:py-2 ${s.micro.running ? 'btn-lacquer' : 'btn-jade'} ${s.micro.done ? 'opacity-50' : ''}`}
              >
                {s.micro.running ? 'DỪNG!' : s.micro.done ? 'Xong' : 'BẤM ĐỂ HÂM'}
              </button>
            </div>
          )}

          {c && c.phase === 'pay' && c.pay.kind === 'cash' && (
            <div className="mt-1.5 flex min-h-0 flex-1 flex-col gap-1.5 short:mt-1 short:gap-1">
              <div className="flex items-center gap-1.5 rounded-xl bg-white/70 px-2 py-1 short:py-0.5">
                <span className="text-[10px] font-black text-ink/60">KHÁCH ĐƯA</span>
                {c.pay.notes.map((v, i) => (
                  <NoteArt key={i} v={v} className="h-7 w-14" />
                ))}
                <span className="ml-auto text-[10px] font-black text-ink/60">HÓA ĐƠN</span>
                <b className="text-[13px] tabular-nums">{vnd(total(c))}</b>
              </div>
              <div className="flex min-h-[2.6rem] items-center gap-1 rounded-xl border-2 border-dashed border-ink/25 bg-[#fff8ea] px-1.5 py-1" data-testid="ck-tray">
                <span className="text-[10px] leading-tight font-black text-ink/55">
                  THỐI
                  <br />
                  <b className="text-[12px] text-ink tabular-nums">{vnd(sum(s.tray))}</b>
                </span>
                <div className="flex min-w-0 flex-1 flex-wrap gap-0.5">
                  {s.tray.map((v, i) => (
                    <button key={i} type="button" onClick={() => removeNote(i)} className="animate-pop" aria-label={`Cất ${vnd(v)}`}>
                      <NoteArt v={v} className="h-6 w-12" />
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid min-h-0 flex-1 grid-cols-4 content-center gap-1.5 rounded-xl bg-[#3b4252] p-1.5 shadow-[inset_0_2px_0_rgba(0,0,0,0.3)] short:grid-cols-5 short:gap-1 short:p-1">
                {DRAWER.map((v) => (
                  <button key={v} type="button" data-testid={`ck-note-${v}`} onClick={() => addNote(v)} className="rounded-lg bg-[#2a2f3a] p-0.5 active:translate-y-0.5" aria-label={vnd(v)}>
                    <NoteArt v={v} className="h-auto w-full" />
                  </button>
                ))}
              </div>
              <div className="grid shrink-0 grid-cols-[1fr_2fr] gap-1.5">
                <button
                  type="button"
                  data-testid="ck-clear"
                  onClick={() => {
                    s.tray = []
                    render()
                  }}
                  className="rounded-2xl border-2 border-outline bg-cream py-2.5 font-extrabold shadow-[0_3px_0_var(--color-outline)] active:translate-y-0.5 short:py-1.5"
                >
                  Cất lại
                </button>
                <button type="button" data-testid="ck-give" onClick={giveChange} className="rounded-2xl btn-jade py-2.5 font-extrabold active:translate-y-0.5 short:py-1.5">
                  {paid(c) === total(c) && s.tray.length === 0 ? 'Đủ tiền, cảm ơn!' : 'Thối tiền'}
                </button>
              </div>
            </div>
          )}

          {c && c.phase === 'pay' && c.pay.kind === 'qr' && (
            <div className="mt-1.5 flex min-h-0 flex-1 items-center gap-3">
              <div className="h-[11rem] w-[38%] shrink-0 short:h-[9.5rem]" data-testid="ck-phone" data-sent={c.pay.sent}>
                <PhoneArt amount={c.pay.sent} />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <p className="text-[13px] leading-snug font-bold">
                  Hóa đơn: <b className="tabular-nums">{vnd(total(c))}</b>
                </p>
                <button type="button" data-testid="ck-qr-ok" onClick={() => checkTransfer(false)} className="rounded-2xl btn-jade py-3 font-extrabold active:translate-y-0.5">
                  Đã nhận đủ ✓
                </button>
                <button type="button" data-testid="ck-qr-short" onClick={() => checkTransfer(true)} className="rounded-2xl btn-lacquer py-3 font-extrabold active:translate-y-0.5">
                  Chuyển thiếu!
                </button>
              </div>
            </div>
          )}

          {!c && task && task.kind === 'shelf' && (
            <div className="mt-1.5 flex min-h-0 flex-1 flex-col gap-1.5">
              <div className="flex items-center justify-center gap-2">
                <span className="grid h-14 w-14 place-items-center rounded-xl border-2 border-outline bg-[#c49a6c] shadow-[0_2px_0_var(--color-outline)]">
                  <ItemArt id={task.item.id} className="h-11 w-11" />
                </span>
                <b className="text-[15px]">{task.item.name}</b>
              </div>
              <div className="grid min-h-0 flex-1 grid-cols-3 gap-1.5">
                {SHELVES.map((sh) => (
                  <button key={sh.id} type="button" data-testid={`ck-shelf-${sh.id}`} onClick={() => shelve(sh.id)} className="flex min-h-0 flex-col items-center rounded-xl border-2 border-outline bg-white p-1 shadow-[0_2px_0_var(--color-outline)] active:translate-y-0.5">
                    <span className="block min-h-0 w-full flex-1">
                      <ShelfArt id={sh.id} />
                    </span>
                    <span className="text-[10.5px] font-black">{sh.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {!c && task && task.kind === 'fifo' && (
            <div className="mt-2 grid min-h-0 flex-1 grid-cols-2 content-center gap-2">
              {task.dates.map((d, i) => (
                <button key={i} type="button" data-testid={`ck-fifo-${i}`} data-date={d} onClick={() => shelve(i as 0 | 1)} className="flex flex-col items-center rounded-2xl border-2 border-outline bg-white py-2 shadow-[0_3px_0_var(--color-outline)] active:translate-y-0.5">
                  <span className="flex">
                    <ItemArt id={task.item.id} className="h-12 w-12" />
                    <ItemArt id={task.item.id} className="-ml-5 h-12 w-12" />
                  </span>
                  <span className="mt-1 rounded-md bg-[#fff3c9] px-2 py-0.5 font-mono text-[13px] font-black">HSD {String(d).padStart(2, '0')}/11</span>
                </button>
              ))}
            </div>
          )}

          {!c && !s.crate && (
            <div className="grid min-h-0 flex-1 place-items-center">
              <p className="text-center text-[13px] font-bold text-ink/50">{s.say ? '' : night ? 'Đêm khuya, cửa hàng vắng tanh… à, lại có khách!' : 'Lau quầy một chút trong lúc chờ khách…'}</p>
            </div>
          )}
          <div style={{ height: 'env(safe-area-inset-bottom)' }} />
        </div>

        {event && (
          <div className="absolute inset-0 z-10 modal-scroll bg-[#1c2238]/70 p-5">
            <div className="panel animate-pop w-full max-w-xs p-4 text-ink" data-testid="ck-event">
              <p className="font-display text-lg font-extrabold text-[#d4202a]">Ca đêm</p>
              <p className="mt-1 text-[15px] leading-snug font-bold">{eventReply ?? event.text}</p>
              <div className="mt-3 flex flex-col gap-2">
                {eventReply ? (
                  <button
                    type="button"
                    data-testid="ck-event-ok"
                    onClick={() => {
                      setEvent(null)
                      setEventReply(null)
                    }}
                    className="rounded-2xl btn-jade py-2.5 font-extrabold"
                  >
                    Làm tiếp
                  </button>
                ) : (
                  event.choices.map((ch, i) => (
                    <button
                      key={i}
                      type="button"
                      data-testid={`ck-event-${i}`}
                      onClick={() => {
                        if (ch.flag) {
                          setFlag(ch.flag, true)
                          usePlayer.getState().addGermanXp(4)
                        }
                        setEventReply(ch.reply)
                      }}
                      className="rounded-2xl border-2 border-outline bg-cream px-3 py-2.5 text-left font-extrabold shadow-[0_3px_0_var(--color-outline)] active:translate-y-0.5"
                    >
                      {ch.text}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {confirm && !summary && (
          <div className="absolute inset-0 z-10 modal-scroll bg-ink/45 p-5">
            <div className="panel w-full max-w-xs p-4 text-center text-ink">
              <p className="font-display text-xl font-extrabold text-lacquer">Nghỉ ca sớm?</p>
              <p className="mt-2 text-sm font-bold">Còn {secs}s nữa mới hết ca. Về bây giờ thì chỉ được trả phần đã làm, và hôm nay không vào ca lại được.</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" data-testid="ck-stay" onClick={() => setConfirm(false)} className="rounded-2xl btn-jade py-2.5 font-extrabold active:translate-y-0.5">
                  Làm tiếp
                </button>
                <button type="button" data-testid="ck-leave" onClick={() => end(true)} className="rounded-2xl btn-lacquer py-2.5 font-extrabold active:translate-y-0.5">
                  Nghỉ ca
                </button>
              </div>
            </div>
          </div>
        )}

        {summary && <Summary o={summary} night={night} rank={rank} onClose={() => onDone(summary)} />}
      </section>
    </div>
  )
}

function Summary({ o, night, rank, onClose }: { o: ShiftOutcome; night: boolean; rank: number; onClose: () => void }) {
  const score = o.all > 0 ? o.ok / o.all : 0
  const wage = circleKWage({ score, deduct: o.deduct, fraction: o.fraction }, night, rank)
  const before = circleKWage({ score, deduct: 0, fraction: o.fraction }, night, rank)
  const quit = o.fraction < 1
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!quit && score >= 0.85) burst(box.current, 'big')
  }, [quit, score])
  return (
    <div className="absolute inset-0 z-10 modal-scroll bg-ink/45 p-5">
      <div ref={box} className="panel animate-pop relative w-full max-w-xs p-5 pt-7 text-ink" data-testid="ck-summary">
        <h2 className="absolute -top-5 left-1/2 -translate-x-1/2 rounded-full ribbon px-6 py-1 text-xl whitespace-nowrap">{quit ? 'Nghỉ ca sớm' : 'Hết ca!'}</h2>
        {!quit && score >= 0.5 && <Icon3d name="party-popper" className="animate-pop absolute -top-8 -right-4 h-16 w-16 rotate-12" />}
        <div className="mb-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-mint/60 p-2">
            <Icon3d name="shopping-bags" className="mx-auto -mt-1 h-7 w-7" />
            <div className="text-xl font-black tabular-nums">{o.served}</div>
            <div className="text-xs font-bold">Khách</div>
          </div>
          <div className="rounded-2xl bg-butter/70 p-2">
            <div className="text-xl font-black tabular-nums">{Math.round(score * 100)}%</div>
            <div className="text-xs font-bold">Làm đúng</div>
          </div>
          <div className="rounded-2xl bg-rose/40 p-2">
            <div className="text-xl font-black tabular-nums">{o.all - o.ok}</div>
            <div className="text-xs font-bold">Sai sót</div>
          </div>
        </div>
        <div className="flex justify-between py-0.5 font-bold">
          <span>Lương ca{quit ? ` (${Math.round(o.fraction * 100)}% ca)` : ''}</span>
          <span className="tabular-nums">{vnd(before)}</span>
        </div>
        {o.deduct > 0 && (
          <div className="flex justify-between py-0.5 font-bold text-lacquer">
            <span>Thối sai, trừ lương</span>
            <span className="tabular-nums">−{vnd(before - wage)}</span>
          </div>
        )}
        <div className="my-1 border-t-2 border-dashed border-ink/15" />
        <div className="flex justify-between text-lg font-black">
          <span>Tổng</span>
          <span className="tabular-nums">{vnd(wage)}</span>
        </div>
        <p className="mt-2 text-center text-xs font-extrabold text-ink/60">{score >= 0.85 ? 'Chị Hạnh: „Làm được việc đấy em!"' : score >= 0.5 ? 'Chị Hạnh: „Ổn, mai nhanh tay hơn nhé."' : 'Chị Hạnh thở dài nhìn sổ quỹ…'}</p>
        <button type="button" autoFocus data-testid="ck-claim" onClick={onClose} className="mt-4 w-full rounded-2xl btn-lacquer py-3 font-display text-lg font-extrabold active:translate-y-1 active:shadow-none">
          Nhận lương
        </button>
      </div>
    </div>
  )
}
