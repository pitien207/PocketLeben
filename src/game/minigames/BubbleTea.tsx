import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { CONFIG } from '../../data/config'
import type { Outfit } from '../../data/npcs'
import { formatMoney } from '../../i18n/format'
import type { TeaOutcome } from '../../store/minigameStore'
import { LockIcon, TrashIcon } from '../../ui/icons'
import { Portrait } from '../../ui/Portrait'
import { playSfx } from '../systems/audio'
import { teaWage } from '../systems/jobs'

/**
 * The shift at Tiệm Trà Sữa Phố Cổ: customers queue under the awning and order a cup — size,
 * tea, toppings. Pick the cup, scoop the toppings, HOLD a tea tap until the gauge is in the green,
 * then seal it. Walking out (✕) ends the shift early, and chị Vy remembers that.
 */


const T = CONFIG.vnJobs.tea
const vnd = (n: number) => formatMoney(n, 'VND')
const pick = <V,>(list: V[]) => list[Math.floor(Math.random() * list.length)]

type Size = 'M' | 'L'
interface Tea {
  id: string
  name: string
  color: string
  rank: number
}
interface Topping {
  id: string
  name: string
  color: string
  shape: 'pearl' | 'cube' | 'cream'
  rank: number
}

const TEAS: Tea[] = [
  { id: 'traSua', name: 'trà sữa', color: '#d8ab7e', rank: 0 },
  { id: 'matcha', name: 'matcha', color: '#a8c66c', rank: 0 },
  { id: 'hongTra', name: 'hồng trà', color: '#c8683c', rank: 0 },
  { id: 'lucTra', name: 'lục trà', color: '#d3dd7c', rank: 1 },
  { id: 'olong', name: 'ô long', color: '#c99a4e', rank: 1 },
  { id: 'traThai', name: 'trà Thái', color: '#f08e3e', rank: 2 },
]
const TOPPINGS: Topping[] = [
  { id: 'den', name: 'trân châu đen', color: '#3a2a26', shape: 'pearl', rank: 0 },
  { id: 'trang', name: 'trân châu trắng', color: '#f4efe6', shape: 'pearl', rank: 0 },
  { id: 'pudding', name: 'pudding trứng', color: '#f6cf5a', shape: 'cube', rank: 0 },
  { id: 'thachDua', name: 'thạch dừa', color: '#eaf6f0', shape: 'cube', rank: 1 },
  { id: 'suongSao', name: 'sương sáo', color: '#4a3a3a', shape: 'cube', rank: 1 },
  { id: 'dauDo', name: 'đậu đỏ', color: '#a8433a', shape: 'pearl', rank: 1 },
  { id: 'nhaDam', name: 'nha đam', color: '#cfeab0', shape: 'cube', rank: 2 },
  { id: 'kemCheese', name: 'kem cheese', color: '#fff3c9', shape: 'cream', rank: 2 },
]

interface Customer {
  /** How they call themselves ("bà", "anh"…). */
  self: string
  patience: number
  outfit: Outfit
  thanks: string
}
const base = { shorts: '#4f5d75', shoe: '#ffffff', bag: null, accessory: null } as const
const CUSTOMERS: Customer[] = [
  { self: 'bà', patience: 1.35, thanks: 'Ngon quá, bà cảm ơn cháu!', outfit: { ...base, skin: '#f3d3bb', hair: '#cfcfd6', hairStyle: 'elderBun', shirt: '#f3b6c4', expression: 'happy' } },
  { self: 'chị', patience: 1, thanks: 'Chuẩn vị luôn, cảm ơn em!', outfit: { ...base, skin: '#fbdcc4', hair: '#f2a7b8', hairStyle: 'bob', shirt: '#ffe08a', lashes: true, expression: 'happy' } },
  { self: 'anh', patience: 0.9, thanks: 'Ổn áp! Cảm ơn em nhé.', outfit: { ...base, skin: '#e8b994', hair: '#3a2c2c', hairStyle: 'short', shirt: '#7fb8e8', accessory: 'glasses' } },
  { self: 'em', patience: 1.1, thanks: 'Yeah! Em cảm ơn ạ!', outfit: { ...base, skin: '#ffe0c9', hair: '#2b2222', hairStyle: 'twin', shirt: '#ffffff', neck: 'redScarf', lashes: true, expression: 'happy' } },
  { self: 'chú', patience: 0.85, thanks: 'Được đấy, cảm ơn cháu.', outfit: { ...base, skin: '#e0b08a', hair: '#4a4448', hairStyle: 'buzz', shirt: '#9fd3b4' } },
  { self: 'cô', patience: 1.15, thanks: 'Khéo tay ghê, cô cảm ơn!', outfit: { ...base, skin: '#f0c8a8', hair: '#2b2222', hairStyle: 'bun', shirt: '#cdb8f0', lashes: true, expression: 'happy' } },
]

interface Cup {
  size: Size
  tea: string | null
  fill: number
  toppings: string[]
}
interface Order {
  size: Size
  tea: Tea
  toppings: Topping[]
  who: Customer
  left: number
  max: number
}
interface Say {
  who: Customer
  text: string
  good: boolean
  left: number
}
interface Game {
  left: number
  cup: Cup | null
  order: Order | null
  say: Say | null
  gap: number
  pouring: string | null
  sealing: number
  served: number
  failed: number
  tips: number
  meter: number
  queue: Customer[]
}

/** The gauge runs 0 → OVER; pour into [GOOD) for a perfect cup, at least OK for an acceptable one. */
const GOOD: [number, number] = [0.76, 0.94]
const OK = 0.55
const FULL = 1
const OVER = 1.1
const POUR_SPEED: Record<Size, number> = { M: 0.62, L: 0.46 }

function newOrder(rank: number, who: Customer): Order {
  const teas = TEAS.filter((t) => t.rank <= rank)
  const tops = TOPPINGS.filter((t) => t.rank <= rank)
  const n = rank === 0 ? 1 : Math.random() < 0.15 ? 0 : Math.random() < 0.3 + rank * 0.15 ? 2 : 1
  const chosen: Topping[] = []
  while (chosen.length < n) {
    const t = pick(tops)
    if (!chosen.includes(t)) chosen.push(t)
  }
  const max = (T.patienceSec + chosen.length * 3) * who.patience * (1 - rank * 0.1)
  return { size: Math.random() < 0.5 ? 'M' : 'L', tea: pick(teas), toppings: chosen, who, left: max, max }
}

/** Why the cup is wrong (in the customer's words), or null when it matches the order. */
function complaint(cup: Cup, o: Order): string | null {
  const s = o.who.self
  const S = s[0].toUpperCase() + s.slice(1)
  if (cup.size !== o.size) return `Ơ, ${s} gọi size ${o.size} mà…`
  if (cup.tea !== o.tea.id) return `${S} gọi ${o.tea.name} cơ mà?`
  const want = o.toppings.map((t) => t.id).sort().join()
  if ([...cup.toppings].sort().join() !== want) return o.toppings.length ? `Nhầm topping rồi, ${s} gọi ${o.toppings.map((t) => t.name).join(' + ')}.` : `${S} đâu có gọi topping…`
  if (cup.fill < OK) return `Ly gì mà vơi thế này…`
  return null
}

// ---------------------------------------------------------------------------------------- art

const INK = '#4a3226'

function CupArt({ cup, sealed, className }: { cup: Cup | null; sealed?: boolean; className?: string }) {
  if (!cup) {
    return (
      <svg viewBox="0 0 60 84" className={className} aria-hidden="true">
        <ellipse cx="30" cy="74" rx="18" ry="4" fill={INK} opacity="0.12" />
        <path d="M14 24h32l-4 50H18z" fill="none" stroke={INK} strokeWidth="2" strokeDasharray="4 4" opacity="0.35" />
      </svg>
    )
  }
  const big = cup.size === 'L'
  const top = big ? 10 : 22
  const half = big ? 19 : 16.5
  const bottom = 74
  const h = bottom - top
  const tea = TEAS.find((t) => t.id === cup.tea)
  const level = Math.min(1, cup.fill / FULL)
  const y = bottom - h * level
  const path = `M${30 - half} ${top}h${half * 2}l-4 ${h}H${30 - half + 4}z`
  return (
    <svg viewBox="0 0 60 84" className={className} aria-hidden="true">
      <defs>
        <clipPath id="tea-cup-clip">
          <path d={path} />
        </clipPath>
      </defs>
      <ellipse cx="30" cy="76" rx="18" ry="4" fill={INK} opacity="0.15" />
      <path d={path} fill="#ffffff" opacity="0.75" />
      <g clipPath="url(#tea-cup-clip)">
        {tea && <rect x="0" y={y} width="60" height={bottom - y + 2} fill={tea.color} />}
        {tea && <rect x="0" y={y} width="60" height="3" fill="#ffffff" opacity="0.45" />}
        {cup.toppings.map((id, i) => {
          const t = TOPPINGS.find((x) => x.id === id)
          if (!t) return null
          const rowY = bottom - 5 - i * 8
          return t.shape === 'cream' ? (
            <rect key={id} x="0" y={Math.max(top, y - 6)} width="60" height="7" fill={t.color} />
          ) : (
            [0, 1, 2, 3].map((k) =>
              t.shape === 'pearl' ? (
                <circle key={id + k} cx={19 + k * 7.5 + (i % 2) * 2} cy={rowY} r="3.3" fill={t.color} stroke={INK} strokeWidth="0.8" />
              ) : (
                <rect key={id + k} x={16 + k * 7.5 + (i % 2) * 2} y={rowY - 3} width="6" height="6" rx="1.2" fill={t.color} stroke={INK} strokeWidth="0.8" />
              ),
            )
          )
        })}
      </g>
      <path d={path} fill="none" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
      <path d={`M${30 - half + 4} ${top + 5}l2 ${h - 14}`} stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
      <circle cx="43" cy={top + h * 0.55} r="5.5" fill="#ffffff" stroke={INK} strokeWidth="1.2" />
      <text x="43" y={top + h * 0.55 + 2.6} textAnchor="middle" fontSize="7" fontWeight="900" fill={INK}>
        {cup.size}
      </text>
      {sealed && <rect x={30 - half - 2} y={top - 4} width={half * 2 + 4} height="5" rx="2" fill="#ff8fab" stroke={INK} strokeWidth="1.6" />}
    </svg>
  )
}

function StackArt({ size }: { size: Size }) {
  const n = size === 'L' ? 6 : 5
  const half = size === 'L' ? 15 : 12.5
  return (
    <svg viewBox="0 0 40 64" className="h-full w-full" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <path key={i} d={`M${20 - half} ${58 - i * 4 - 20}h${half * 2}l-2.5 20h-${half * 2 - 5}z`} fill="#fdfaf2" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" opacity={i === n - 1 ? 1 : 0.95} />
      ))}
      <text x="20" y={58 - (n - 1) * 4 - 7} textAnchor="middle" fontSize="10" fontWeight="900" fill={INK}>
        {size}
      </text>
    </svg>
  )
}

function DispenserArt({ color, pouring, locked }: { color: string; pouring: boolean; locked: boolean }) {
  return (
    <svg viewBox="0 0 40 66" className="h-full w-full" aria-hidden="true" opacity={locked ? 0.45 : 1}>
      <rect x="13" y="1" width="14" height="5" rx="2" fill="#c9ccd2" stroke={INK} strokeWidth="1.6" />
      <rect x="6" y="5" width="28" height="6" rx="2.5" fill="#e3e5ea" stroke={INK} strokeWidth="1.6" />
      <rect x="5" y="10" width="30" height="38" rx="5" fill="#ffffff" stroke={INK} strokeWidth="1.8" />
      <path d="M7 20h26v23a3 3 0 0 1-3 3H10a3 3 0 0 1-3-3z" fill={locked ? '#e6ddd0' : color} />
      <rect x="9" y="14" width="3" height="26" rx="1.5" fill="#ffffff" opacity="0.7" />
      <rect x="8" y="48" width="24" height="5" rx="2" fill="#8e98ab" stroke={INK} strokeWidth="1.6" />
      <path d="M17 53h6v5h-2v3h-2v-3h-2z" fill="#5d6170" stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
      {pouring && <rect x="18.6" y="61" width="2.8" height="5" rx="1" fill={color} />}
    </svg>
  )
}

function TrayArt({ t, locked }: { t: Topping; locked: boolean }) {
  const dots: [number, number][] = [[12, 14], [22, 11], [32, 15], [16, 23], [27, 22], [36, 25], [10, 30], [22, 31], [32, 33]]
  return (
    <svg viewBox="0 0 46 44" className="h-full w-full" aria-hidden="true">
      <rect x="1.5" y="1.5" width="43" height="41" rx="6" fill="#dfe2e8" stroke={INK} strokeWidth="1.8" />
      <rect x="5" y="5" width="36" height="34" rx="4" fill={locked ? '#efe9df' : '#f7f4ee'} stroke="#aab0bd" strokeWidth="1" />
      {!locked &&
        (t.shape === 'cream' ? (
          <path d="M8 26c2-10 8-14 15-14s13 4 15 14c-4 7-10 9-15 9s-11-2-15-9z" fill={t.color} stroke={INK} strokeWidth="1" />
        ) : (
          dots.map(([x, y], i) =>
            t.shape === 'pearl' ? (
              <circle key={i} cx={x} cy={y} r="4.6" fill={t.color} stroke={INK} strokeWidth="0.9" />
            ) : (
              <rect key={i} x={x - 4.5} y={y - 4.5} width="9" height="9" rx="2" fill={t.color} stroke={INK} strokeWidth="0.9" transform={`rotate(${i * 17} ${x} ${y})`} />
            ),
          )
        ))}
    </svg>
  )
}

function SealerArt({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 56 60" className="h-full w-full" aria-hidden="true">
      <circle cx="14" cy="9" r="7" fill="#ffd9a0" stroke={INK} strokeWidth="1.6" />
      <circle cx="42" cy="9" r="7" fill="#ffd9a0" stroke={INK} strokeWidth="1.6" />
      <rect x="6" y="12" width="44" height="22" rx="4" fill="#c9ccd2" stroke={INK} strokeWidth="1.8" />
      <rect x="10" y="17" width="20" height="7" rx="2" fill={active ? '#ffe08a' : '#3fae72'} stroke={INK} strokeWidth="1.2" />
      <circle cx="41" cy="22" r="5" fill="#f39a2b" stroke={INK} strokeWidth="1.4" />
      <rect x="12" y={active ? 38 : 34} width="32" height="5" rx="1.5" fill="#8e98ab" stroke={INK} strokeWidth="1.4" />
      <rect x="9" y="50" width="38" height="8" rx="3" fill="#aab0bd" stroke={INK} strokeWidth="1.8" />
      <path d="M13 34v16M43 34v16" stroke={INK} strokeWidth="1.8" />
    </svg>
  )
}

const Plate = ({ children }: { children: ReactNode }) => (
  <span className="rounded-md border-2 border-outline bg-[#f6dfb4] px-2 py-0.5 text-[11px] font-black tracking-wide text-ink shadow-[0_2px_0_var(--color-outline)]">{children}</span>
)

/** The words of an order that matter, in pink. */
const Key = ({ children }: { children: ReactNode }) => <b className="font-black text-[#d6336c]">{children}</b>

// --------------------------------------------------------------------------------------- game

export function BubbleTeaGame({ rank, strikes, onDone }: { rank: number; strikes: number; onDone: (o: TeaOutcome) => void }) {
  const g = useRef<Game>(null as unknown as Game)
  if (!g.current) {
    g.current = { left: T.seconds, cup: null, order: null, say: null, gap: 0.7, pouring: null, sealing: 0, served: 0, failed: 0, tips: 0, meter: 60, queue: [pick(CUSTOMERS), pick(CUSTOMERS), pick(CUSTOMERS)] }
  }
  const [, setFrame] = useState(0)
  const render = useCallback(() => setFrame((n) => n + 1), [])
  const [confirm, setConfirm] = useState(false)
  const [summary, setSummary] = useState<TeaOutcome | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  const paused = useRef(false)
  paused.current = confirm || !!summary
  const hintTimer = useRef(0)

  const warn = useCallback((text: string) => {
    playSfx('wrong')
    setHint(text)
    window.clearTimeout(hintTimer.current)
    hintTimer.current = window.setTimeout(() => setHint(null), 1600)
  }, [])
  useEffect(() => () => window.clearTimeout(hintTimer.current), [])

  const end = useCallback((quit: boolean) => {
    const s = g.current
    const fraction = Math.max(0, Math.min(1, 1 - s.left / T.seconds))
    s.pouring = null
    setConfirm(false)
    setSummary({ served: s.served, failed: s.failed, meter: Math.round(s.meter), tips: s.tips, fraction: quit ? fraction : 1, quit })
    playSfx(quit ? 'fail' : 'success')
  }, [])

  const judge = useCallback(() => {
    const s = g.current
    const { cup, order } = s
    if (!cup || !order) return
    const bad = complaint(cup, order)
    if (bad) {
      s.failed++
      s.meter = Math.max(0, s.meter - 12)
      s.say = { who: order.who, text: bad, good: false, left: 1.5 }
      playSfx('wrong')
    } else {
      const perfect = cup.fill >= GOOD[0] && cup.fill < GOOD[1]
      const fast = order.left / order.max >= 0.4
      const tip = perfect && fast ? T.tip : 0
      s.served++
      s.tips += tip
      s.meter = Math.min(100, s.meter + (perfect ? 8 : 4))
      s.say = { who: order.who, text: perfect ? order.who.thanks + (tip ? ` (+${vnd(tip)})` : '') : `Hơi ${cup.fill >= GOOD[1] ? 'đầy' : 'vơi'} một chút, nhưng được rồi.`, good: true, left: 1.2 }
      playSfx(tip ? 'coin' : 'right')
    }
    s.cup = null
    s.order = null
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
      if (s.say) {
        s.say.left -= dt
        if (s.say.left <= 0) {
          s.say = null
          s.gap = 0.5
        }
      } else if (!s.order) {
        s.gap -= dt
        if (s.gap <= 0) {
          const who = s.queue.shift() ?? pick(CUSTOMERS)
          s.queue.push(pick(CUSTOMERS))
          s.order = newOrder(rank, who)
          playSfx('bell')
        }
      } else {
        s.order.left -= dt
        if (s.order.left <= 0) {
          s.failed++
          s.meter = Math.max(0, s.meter - 15)
          s.say = { who: s.order.who, text: 'Lâu quá… thôi không mua nữa!', good: false, left: 1.4 }
          s.order = null
          playSfx('wrong')
        }
      }
      if (s.pouring && s.cup) {
        // Small steps even on a stuttering phone, or the tea would jump past the green zone.
        s.cup.fill = Math.min(OVER, s.cup.fill + POUR_SPEED[s.cup.size] * Math.min(dt, 0.04))
        if (s.cup.fill >= OVER) {
          // Overflow: the cup is ruined.
          s.pouring = null
          s.cup = null
          s.meter = Math.max(0, s.meter - 4)
          warn('Tràn ly rồi! Làm lại ly khác.')
        }
      }
      if (s.sealing > 0) {
        s.sealing -= dt
        if (s.sealing <= 0) {
          s.sealing = 0
          judge()
        }
      }
      if (s.pouring || s.sealing > 0 || now - shown > 90) {
        shown = now
        render()
      }
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [rank, end, judge, render, warn])

  // Releasing anywhere stops the tap.
  useEffect(() => {
    const stop = () => {
      if (g.current.pouring) {
        g.current.pouring = null
        render()
      }
    }
    window.addEventListener('pointerup', stop)
    window.addEventListener('pointercancel', stop)
    window.addEventListener('blur', stop)
    return () => {
      window.removeEventListener('pointerup', stop)
      window.removeEventListener('pointercancel', stop)
      window.removeEventListener('blur', stop)
    }
  }, [render])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape' && !summary) setConfirm((c) => !c)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [summary])

  const s = g.current
  const busy = s.sealing > 0

  const takeCup = (size: Size) => {
    if (busy) return
    if (s.cup && (s.cup.tea || s.cup.toppings.length)) return warn('Đang pha dở một ly. Bỏ vào thùng rác nếu muốn làm lại.')
    s.cup = { size, tea: null, fill: 0, toppings: [] }
    playSfx('click')
    render()
  }
  const addTopping = (t: Topping) => {
    if (busy) return
    if (t.rank > rank) return warn('Món này chị Vy chưa giao cho em (lên hạng sẽ mở).')
    if (!s.cup) return warn('Lấy ly trước đã (M hoặc L).')
    if (s.cup.toppings.includes(t.id)) return warn('Cho topping này rồi.')
    if (s.cup.toppings.length >= 3) return warn('Ly đầy topping rồi!')
    s.cup.toppings.push(t.id)
    playSfx('pickup')
    render()
  }
  const startPour = (t: Tea) => {
    if (busy) return
    if (t.rank > rank) return warn('Bình này chị Vy chưa giao cho em (lên hạng sẽ mở).')
    if (!s.cup) return warn('Lấy ly trước đã (M hoặc L).')
    if (s.cup.tea && s.cup.tea !== t.id) return warn('Ly này đã có trà khác. Bỏ đi làm lại nhé.')
    s.cup.tea = t.id
    s.pouring = t.id
    render()
  }
  const seal = () => {
    if (busy) return
    if (!s.cup) return warn('Chưa có ly nào để dập nắp.')
    if (!s.cup.tea) return warn('Ly chưa có trà. Giữ tay vào bình trà để rót.')
    if (!s.order) return warn('Chưa có khách gọi món.')
    s.pouring = null
    s.sealing = 0.45
    playSfx('stamp')
    render()
  }
  const trash = () => {
    if (busy || !s.cup) return
    s.cup = null
    playSfx('click')
    render()
  }

  // What to do next (shown small above the cup; a real help on the first shifts).
  const step = !s.order ? 'Chờ khách…' : !s.cup ? `1 · Lấy ly size ${s.order.size}` : s.order.toppings.some((t) => !s.cup!.toppings.includes(t.id)) ? '2 · Cho topping vào ly' : s.cup.fill < GOOD[0] ? '3 · Giữ bình trà tới vạch xanh' : '4 · Dập nắp & giao'

  const speaker = s.say?.who ?? s.order?.who ?? null
  const patience = s.order ? Math.max(0, s.order.left / s.order.max) : 0
  const secs = Math.ceil(s.left)
  const fillPct = s.cup ? Math.min(100, (s.cup.fill / OVER) * 100) : 0

  return (
    <div className="pointer-events-auto absolute inset-0 z-40 flex justify-center bg-[#4a3226]/60 select-none" style={{ touchAction: 'none' }} onContextMenu={(e) => e.preventDefault()} data-testid="tea-game">
      <section className="relative flex h-full w-full max-w-md flex-col overflow-hidden bg-[#fbe9c9] text-ink" role="dialog" aria-modal="true" aria-label="Tiệm trà sữa">
        {/* Awning */}
        <div
          className="h-7 shrink-0 border-b-2 border-outline"
          style={{ background: 'repeating-linear-gradient(90deg,#f8a5b4 0 26px,#fff6ea 26px 52px)', paddingTop: 'env(safe-area-inset-top)' }}
        />
        <div className="-mt-0.5 h-3 shrink-0" style={{ background: 'radial-gradient(circle at 13px 0,#f8a5b4 12px,transparent 13px) 0 0/52px 12px, radial-gradient(circle at 39px 0,#fff6ea 12px,transparent 13px) 0 0/52px 12px' }} />

        {/* Shift status */}
        <div className="flex shrink-0 items-center gap-2 px-3 pt-1">
          <div className="flex -space-x-2">
            {s.queue.slice(0, 3).map((c, i) => (
              <span key={i} className="rounded-full border-2 border-outline bg-cream" style={{ opacity: 1 - i * 0.2 }}>
                <Portrait outfit={c.outfit} size={30} />
              </span>
            ))}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[11px] font-black">
              <span className="whitespace-nowrap">HÀI LÒNG</span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full border-2 border-outline bg-white">
                <div className={`h-full ${s.meter >= 66 ? 'bg-[#6fcf97]' : s.meter >= 33 ? 'bg-[#f4c04e]' : 'bg-[#e8697d]'}`} style={{ width: `${s.meter}%` }} />
              </div>
            </div>
            <div className="mt-0.5 text-[11px] font-bold text-ink/70">
              Đã bán <b className="text-ink">{s.served}</b> · Hỏng <b className="text-ink">{s.failed}</b> · Tip <b className="text-ink">{vnd(s.tips)}</b>
            </div>
          </div>
          <span data-testid="tea-time" className={`rounded-full border-2 border-outline px-2 py-0.5 text-sm font-black tabular-nums ${secs <= 10 ? 'animate-pulse bg-lacquer text-gold-light' : 'bg-white'}`}>{secs}s</span>
          <button type="button" data-testid="tea-quit" aria-label="Nghỉ ca" onClick={() => setConfirm(true)} className="grid h-8 w-8 place-items-center rounded-full border-2 border-outline bg-cream text-base font-black shadow-[0_2px_0_var(--color-outline)] active:translate-y-0.5">
            ✕
          </button>
        </div>

        {/* Customer + order */}
        <div className="flex min-h-[5.6rem] shrink-0 items-center gap-2 px-3 py-1.5">
          {speaker ? (
            <>
              <span className="shrink-0 rounded-full border-2 border-outline bg-cream shadow-[0_3px_0_var(--color-outline)]">
                <Portrait outfit={{ ...speaker.outfit, expression: s.say ? (s.say.good ? 'happy-closed' : 'sad') : patience < 0.3 ? 'sad' : speaker.outfit.expression }} size={62} />
              </span>
              <div className="relative min-w-0 flex-1 rounded-2xl border-2 border-outline bg-white px-3 py-2 text-[14px] leading-snug font-bold shadow-[0_3px_0_var(--color-outline)]" data-testid="tea-order">
                {s.say ? (
                  <span className={s.say.good ? 'text-[#2f8c5a]' : 'text-lacquer'}>{s.say.text}</span>
                ) : s.order ? (
                  <>
                    <span>
                      Làm cho {s.order.who.self} 1 ly <Key>{s.order.tea.name}</Key> size <Key>{s.order.size}</Key>{' '}
                      {s.order.toppings.length ? (
                        <>
                          với{' '}
                          {s.order.toppings.map((t, i) => (
                            <span key={t.id}>
                              {i > 0 && ' và '}
                              <Key>{t.name}</Key>
                            </span>
                          ))}
                        </>
                      ) : (
                        <Key>không topping</Key>
                      )}{' '}
                      nha!
                    </span>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className="text-[10px] font-black tracking-wide text-ink/60">KIÊN NHẪN</span>
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full border-2 border-outline bg-white">
                        <div className={`h-full ${patience > 0.5 ? 'bg-[#f4c04e]' : patience > 0.25 ? 'bg-[#f39a2b]' : 'bg-[#e8697d]'}`} style={{ width: `${patience * 100}%` }} />
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            </>
          ) : (
            <p className="w-full text-center text-sm font-bold text-ink/50">Khách đang tới…</p>
          )}
        </div>

        {/* Tea counter */}
        <div className="shrink-0 border-t-2 border-outline bg-[#f6dcae] px-2 pt-1 pb-2">
          <Plate>QUẦY TRÀ</Plate>
          <div className="mt-1 flex items-end gap-1">
            {(['M', 'L'] as Size[]).map((size) => (
              <button
                key={size}
                type="button"
                data-testid={`tea-cup-${size}`}
                onClick={() => takeCup(size)}
                className={`h-[4.4rem] w-[13%] shrink-0 rounded-xl border-2 p-0.5 active:translate-y-0.5 ${s.order && !s.cup && s.order.size === size ? 'border-[#3fae72] bg-[#e4f6ea]' : 'border-transparent'}`}
              >
                <StackArt size={size} />
              </button>
            ))}
            <div className="flex min-w-0 flex-1 items-end gap-0.5 rounded-xl border-2 border-outline bg-[#fff6e3] px-1 pt-1 shadow-[0_3px_0_var(--color-outline)]">
              {TEAS.map((t) => {
                const locked = t.rank > rank
                const wanted = !locked && s.order?.tea.id === t.id && !!s.cup && s.cup.fill < GOOD[0]
                return (
                  <button
                    key={t.id}
                    type="button"
                    data-testid={`tea-tap-${t.id}`}
                    onPointerDown={(e) => {
                      e.preventDefault()
                      startPour(t)
                    }}
                    className={`relative flex min-w-0 flex-1 flex-col items-center rounded-lg border-2 pb-0.5 ${wanted ? 'border-[#e8697d] bg-[#ffe9ee]' : 'border-transparent'}`}
                  >
                    <span className="block h-[3.4rem] w-full">
                      <DispenserArt color={t.color} pouring={s.pouring === t.id} locked={locked} />
                    </span>
                    <span className={`flex h-[1.35rem] w-full items-center justify-center text-center text-[8.5px] leading-[1.05] font-black uppercase ${locked ? 'text-ink/35' : ''}`}>{t.name}</span>
                    {locked && <LockIcon className="absolute top-5 left-1/2 -translate-x-1/2 text-sm text-[#d98a2b]" />}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Mixing station */}
        <div className="flex min-h-0 flex-1 flex-col border-t-2 border-outline bg-[#f3d6a4] px-2 pt-1 pb-2">
          <div className="flex items-center gap-2">
            <Plate>PHA LY</Plate>
            <span className="min-w-0 flex-1 truncate text-[12px] font-extrabold text-[#8a5a2b]" data-testid="tea-step">
              {hint ?? step}
            </span>
            <button type="button" data-testid="tea-trash" aria-label="Bỏ ly" onClick={trash} className={`grid h-9 w-9 place-items-center rounded-xl border-2 border-outline bg-[#c9ccd2] text-lg shadow-[0_2px_0_var(--color-outline)] active:translate-y-0.5 ${s.cup ? '' : 'opacity-40'}`}>
              <TrashIcon />
            </button>
          </div>
          <div className="mt-1 flex min-h-0 flex-1 gap-2">
            <div className="flex w-[36%] shrink-0 flex-col gap-1.5">
              <div className="relative flex min-h-0 flex-1 flex-col items-center rounded-2xl border-2 border-outline bg-[#e9bf86] p-1.5 shadow-[0_3px_0_var(--color-outline)]">
                <CupArt cup={s.cup} sealed={busy} className="min-h-0 w-full flex-1" />
                {/* Pour gauge: stop in the green */}
                <div className="relative mt-1 h-3.5 w-full overflow-hidden rounded-full border-2 border-outline" data-testid="tea-gauge" data-fill={s.cup ? s.cup.fill.toFixed(3) : '0'}>
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(90deg,#e8697d 0,#f39a2b ${(OK / OVER) * 100}%,#f4c04e ${(GOOD[0] / OVER) * 100 - 1}%,#55c27d ${(GOOD[0] / OVER) * 100}%,#55c27d ${(GOOD[1] / OVER) * 100}%,#f39a2b ${(GOOD[1] / OVER) * 100 + 1}%,#e8697d 100%)`,
                    }}
                  />
                  <div className="absolute top-0 h-full w-1.5 -translate-x-1/2 rounded-sm border border-outline bg-white" style={{ left: `${fillPct}%` }} />
                </div>
              </div>
              <button
                type="button"
                data-testid="tea-seal"
                onClick={seal}
                className={`flex h-[3.6rem] shrink-0 items-center gap-1 rounded-2xl border-2 border-outline px-1.5 text-left text-[11px] leading-tight font-black shadow-[0_3px_0_var(--color-outline)] active:translate-y-0.5 active:shadow-none ${s.cup && s.cup.fill >= OK ? 'bg-[#ffd0da]' : 'bg-[#fff6e3]'}`}
              >
                <span className="h-full w-11 shrink-0 py-0.5">
                  <SealerArt active={busy} />
                </span>
                DẬP NẮP
                <br />& GIAO
              </button>
            </div>
            <div className="grid min-w-0 flex-1 auto-rows-fr grid-cols-3 gap-1 rounded-2xl border-2 border-outline bg-[#c9ccd2] p-1 shadow-[0_3px_0_var(--color-outline)] max-sm:[@media(min-height:740px)]:grid-cols-2">
              {TOPPINGS.map((t) => {
                const locked = t.rank > rank
                const inCup = !!s.cup?.toppings.includes(t.id)
                const wanted = !locked && !inCup && !!s.cup && !!s.order?.toppings.some((x) => x.id === t.id)
                return (
                  <button
                    key={t.id}
                    type="button"
                    data-testid={`tea-top-${t.id}`}
                    onClick={() => addTopping(t)}
                    className={`relative flex min-h-0 flex-col items-center rounded-lg border-2 p-0.5 active:translate-y-0.5 ${wanted ? 'border-[#e8697d] bg-[#ffe9ee]' : inCup ? 'border-[#3fae72] bg-[#e4f6ea]' : 'border-transparent'}`}
                  >
                    <span className="block min-h-0 w-full flex-1">
                      <TrayArt t={t} locked={locked} />
                    </span>
                    <span className={`flex h-[1.4rem] w-full shrink-0 items-center justify-center text-center text-[9.5px] leading-[1.05] font-black ${locked ? 'text-ink/35' : ''}`}>{t.name}</span>
                    {locked && <LockIcon className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-3/4 text-base text-[#d98a2b]" />}
                  </button>
                )
              })}
            </div>
          </div>
          <div style={{ height: 'env(safe-area-inset-bottom)' }} />
        </div>

        {confirm && !summary && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-ink/45 p-5">
            <div className="panel w-full max-w-xs p-4 text-center text-ink">
              <p className="font-display text-xl font-extrabold text-lacquer">Nghỉ ca sớm?</p>
              <p className="mt-2 text-sm font-bold">
                Còn {secs}s nữa mới hết ca. Bỏ về giữa chừng thì chỉ được trả phần đã làm, và <b>chị Vy sẽ không vui</b>.
              </p>
              <p className="mt-1 text-xs font-extrabold text-lacquer">
                Lần nghỉ sớm thứ {strikes + 1}/{T.maxQuits}
                {strikes + 1 >= T.maxQuits ? ` — lần này là bị cho nghỉ việc ${T.banDays} ngày!` : ''}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" data-testid="tea-stay" onClick={() => setConfirm(false)} className="rounded-2xl btn-jade py-2.5 font-extrabold active:translate-y-0.5">
                  Làm tiếp
                </button>
                <button type="button" data-testid="tea-leave" onClick={() => end(true)} className="rounded-2xl btn-lacquer py-2.5 font-extrabold active:translate-y-0.5">
                  Nghỉ ca
                </button>
              </div>
            </div>
          </div>
        )}

        {summary && <Summary o={summary} rank={rank} onClose={() => onDone(summary)} />}
      </section>
    </div>
  )
}

function Summary({ o, rank, onClose }: { o: TeaOutcome; rank: number; onClose: () => void }) {
  const wage = teaWage(o, rank)
  return (
    <div className="absolute inset-0 z-10 grid place-items-center bg-ink/45 p-5">
      <div className="panel animate-pop relative w-full max-w-xs p-5 pt-7 text-ink" data-testid="tea-summary">
        <h2 className="absolute -top-5 left-1/2 -translate-x-1/2 rounded-full ribbon px-6 py-1 text-xl whitespace-nowrap">{o.quit ? 'Nghỉ ca sớm' : 'Hết ca!'}</h2>
        <div className="mb-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-mint/60 p-2">
            <div className="text-xl font-black tabular-nums">{o.served}</div>
            <div className="text-xs font-bold">Ly đã bán</div>
          </div>
          <div className="rounded-2xl bg-rose/40 p-2">
            <div className="text-xl font-black tabular-nums">{o.failed}</div>
            <div className="text-xs font-bold">Khách phật ý</div>
          </div>
          <div className="rounded-2xl bg-butter/70 p-2">
            <div className="text-xl font-black tabular-nums">{o.meter}%</div>
            <div className="text-xs font-bold">Hài lòng</div>
          </div>
        </div>
        <div className="flex justify-between py-0.5 font-bold">
          <span>Lương ca{o.quit ? ` (${Math.round(o.fraction * 100)}% ca)` : ''}</span>
          <span className="tabular-nums">{vnd(wage)}</span>
        </div>
        <div className="flex justify-between py-0.5 font-bold">
          <span>Tiền tip</span>
          <span className="tabular-nums">{vnd(o.tips)}</span>
        </div>
        <div className="my-1 border-t-2 border-dashed border-ink/15" />
        <div className="flex justify-between text-lg font-black">
          <span>Tổng</span>
          <span className="tabular-nums">{vnd(wage + o.tips)}</span>
        </div>
        {o.quit && <p className="mt-2 text-center text-xs font-extrabold text-lacquer">Chị Vy nhìn theo, không nói gì…</p>}
        <button type="button" autoFocus data-testid="tea-claim" onClick={onClose} className="mt-4 w-full rounded-2xl btn-lacquer py-3 font-display text-lg font-extrabold active:translate-y-1 active:shadow-none">
          Nhận lương
        </button>
      </div>
    </div>
  )
}
