import { useEffect, useRef, useState, type ReactNode } from 'react'
import { formatClock } from '../game/systems/time'
import { useT } from '../i18n'
import { usePlayer } from '../store/playerStore'
import { useTime } from '../store/timeStore'
import { useUI } from '../store/uiStore'
import { useFlags } from '../store/flagsStore'
import { ActionIcon } from './ActionIcon'
import { QuestTracker } from './QuestLog'
import { bagCapacity, bagWeight } from '../game/systems/bag'
import { useInventory } from '../store/inventoryStore'
import { BagIcon, GearIcon, MapIcon, MoonIcon, RainIcon, SunIcon } from './icons'
import { PhoneBadge, PhoneIcon } from './PhonePanel'
import { isRaining } from '../game/systems/weather'
import { SCENES } from '../game/scenes/registry'
import { useWorld } from '../store/worldStore'
import { EmoteButton, OnlineChip } from './OnlineUI'

/**
 * Top HUD (1.18): one thin line — the clock pill on the left, the three currencies (đồng, euro,
 * diamonds) on the right — the objective under it, and the tools grouped in ONE narrow rail
 * along the right edge. No energy, no mood. Everything else stays out of the way of the street.
 */

/** Red dot on the bag button when the backpack is (almost) full. */
function BagFullBadge() {
  useInventory((s) => s.items)
  useFlags((s) => s.flags)
  if (bagWeight() < bagCapacity() * 0.9) return null
  return <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-white bg-lacquer" />
}

/** One icon of the right-hand rail. */
export function RailButton({ label, onClick, children, tour, testId }: { label: string; onClick: () => void; children: ReactNode; tour?: string; testId?: string }) {
  return (
    <button
      type="button"
      data-tour={tour}
      data-testid={testId}
      aria-label={label}
      title={label}
      onClick={onClick}
      className="rail-btn"
    >
      {children}
    </button>
  )
}

/** Shows "+12.000 ₫" floating up next to the money whenever it increases. */
function useMoneyGain(money: number) {
  const previous = useRef(money)
  const [gain, setGain] = useState<{ amount: number; key: number } | null>(null)
  useEffect(() => {
    const delta = money - previous.current
    previous.current = money
    if (delta <= 0) return
    setGain({ amount: delta, key: Date.now() })
    const id = window.setTimeout(() => setGain(null), 1600)
    return () => window.clearTimeout(id)
  }, [money])
  return gain
}

/** Clock + date; tap for the clock panel (wait, schedule, time speed). */
function Clock() {
  const t = useT()
  const openPanel = useUI((s) => s.openPanel)
  const minutes = useTime((s) => Math.floor(s.minutes))
  const day = useTime((s) => s.day)
  const hour = minutes / 60
  const daytime = hour >= 6 && hour < 18.5
  const country = useWorld((s) => SCENES[s.scene].country)
  const raining = isRaining(day, minutes, country)
  return (
    <button
      type="button"
      onClick={() => openPanel({ type: 'clock' })}
      data-tour="clock"
      aria-label={`${formatClock(minutes)} — ${t('clock.title')}`}
      className="pointer-events-auto flex h-7 shrink-0 items-center gap-1 rounded-full border border-white/25 bg-[#2f6b52]/90 pr-2.5 pl-1.5 text-left text-white shadow-[0_2px_6px_rgba(40,25,15,0.25)] backdrop-blur-sm transition active:scale-95"
    >
      <span className="text-[14px] text-gold-light">{raining ? <RainIcon /> : daytime ? <SunIcon /> : <MoonIcon />}</span>
      <span className="font-display text-[14px] leading-none font-extrabold tabular-nums">{formatClock(minutes)}</span>
    </button>
  )
}

/** A gold đồng coin. */
function DongIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="w-dong" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe58a" />
          <stop offset="1" stopColor="#f2a81d" />
        </linearGradient>
      </defs>
      {/* 1.28: an embossed "đ" (no underline), a milled rim and a shine */}
      <circle cx="12" cy="12.7" r="10.2" fill="#a8650f" />
      <circle cx="12" cy="11.5" r="10.2" fill="url(#w-dong)" stroke="#8a5210" strokeWidth="1.1" />
      <circle cx="12" cy="11.5" r="8.4" fill="none" stroke="#c98a1c" strokeWidth="1.4" strokeDasharray="0.9 1.1" opacity="0.7" />
      <circle cx="12" cy="11.5" r="6.9" fill="#ffd45a" stroke="#b9781a" strokeWidth="0.8" />
      <text x="12.2" y="15.3" textAnchor="middle" fontSize="10.5" fontWeight="900" fontFamily="'Be Vietnam Pro', sans-serif" fill="#fff3c4" opacity="0.9">
        đ
      </text>
      <text x="12" y="15" textAnchor="middle" fontSize="10.5" fontWeight="900" fontFamily="'Be Vietnam Pro', sans-serif" fill="#8a5210">
        đ
      </text>
      <path d="M6.2 7.6a7 7 0 0 1 4.6-3" stroke="#ffffff" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.75" />
    </svg>
  )
}

/** A silver-blue euro coin with a gold rim. */
function EuroIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="w-euro" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#eef4ff" />
          <stop offset="1" stopColor="#9db4d8" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12.6" r="10" fill="#8a6a1c" />
      <circle cx="12" cy="11.4" r="10" fill="#f4c64a" stroke="#8a6a1c" strokeWidth="1.2" />
      <circle cx="12" cy="11.4" r="7" fill="url(#w-euro)" stroke="#5f7396" strokeWidth="1" />
      <path d="M14.8 8.6a3.6 3.6 0 1 0 0 5.6M8 10.5h4.6M8 12.4h4.2" fill="none" stroke="#2f4a7a" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

/** A cut diamond. */
function GemIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="w-gem" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#b9f3ff" />
          <stop offset="0.5" stopColor="#4cc9f0" />
          <stop offset="1" stopColor="#4361ee" />
        </linearGradient>
      </defs>
      <path d="M7 3.5h10l5 6-10 11.5L2 9.5z" fill="url(#w-gem)" stroke="#1d3a8a" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M2 9.5h20M7 3.5l2.5 6L12 21l2.5-11.5 2.5-6M9.5 9.5 12 3.5l2.5 6" fill="none" stroke="#e8fbff" strokeWidth="0.9" strokeLinejoin="round" opacity="0.9" />
      <path d="M7.4 4.6 4.3 8.6h4.2z" fill="#ffffff" opacity="0.55" />
    </svg>
  )
}

const whole = (n: number) => Math.round(n).toLocaleString('vi-VN')
const euros = (n: number) => n.toLocaleString('vi-VN', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })

/** One currency: its coin overlapping a slim dark pill with the amount; "+…" floats up when it grows. */
function Wallet({ id, label, value, text, icon }: { id: string; label: string; value: number; text: string; icon: ReactNode }) {
  const gain = useMoneyGain(value)
  return (
    <div role="status" aria-label={`${label}: ${text}`} title={label} data-testid={`wallet-${id}`} className="relative flex h-7 items-center">
      <span className={`relative z-10 -mr-3 h-7 w-7 shrink-0 drop-shadow-[0_1px_0_rgba(40,25,15,0.35)] ${gain ? 'animate-coin' : ''}`} key={`coin${gain?.key ?? 0}`}>
        {icon}
      </span>
      <span className="flex h-[1.4rem] items-center rounded-full border border-white/25 bg-[#3a2a22]/80 pr-2 pl-4 font-display text-[13px] leading-none font-extrabold text-[#fff6dc] tabular-nums shadow-[0_2px_6px_rgba(40,25,15,0.25)] backdrop-blur-sm">
        {text}
      </span>
      {gain && (
        <span key={`up${gain.key}`} className="animate-float-up absolute top-full right-0 mt-0.5 rounded-full bg-jade px-1.5 py-0.5 text-[11px] font-black whitespace-nowrap text-white shadow">
          +{id === 'eur' ? euros(gain.amount) : whole(gain.amount)}
        </span>
      )}
    </div>
  )
}

/** Đồng, euros and diamonds, each on its own (1.18). */
function Wallets() {
  const money = usePlayer((s) => s.money)
  const currency = usePlayer((s) => s.currency)
  const otherMoney = usePlayer((s) => s.otherMoney)
  const gems = usePlayer((s) => s.gems)
  const vnd = currency === 'VND' ? money : otherMoney
  const eur = currency === 'EUR' ? money : otherMoney
  return (
    <div className="pointer-events-auto flex shrink-0 items-center gap-1.5">
      <Wallet id="vnd" label="Việt Nam đồng" value={vnd} text={whole(vnd)} icon={<DongIcon />} />
      <Wallet id="eur" label="Euro" value={eur} text={euros(eur)} icon={<EuroIcon />} />
      <Wallet id="gem" label="Kim cương" value={gems} text={whole(gems)} icon={<GemIcon />} />
    </div>
  )
}

export function HUD() {
  const t = useT()
  const setSettingsOpen = useUI((s) => s.setSettingsOpen)
  const openPanel = useUI((s) => s.openPanel)
  const showVisa = useFlags((s) => !!s.flags['visa.path'] && !s.flags['de.arrived'])

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col gap-1.5 px-safe pt-safe">
      {/* Row 1: status line */}
      <div className="flex items-center justify-between gap-1.5">
        <Clock />
        <Wallets />
      </div>

      {/* Row 2: the objective (as wide as it can be) and the icon rail on the right */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <QuestTracker />
        </div>
        <nav className="hud-slim pointer-events-auto flex shrink-0 flex-col items-center gap-px p-0.5" aria-label={t('hud.menu')}>
          <RailButton label={t('hud.bag')} onClick={() => openPanel({ type: 'bag' })} tour="bag">
            <BagIcon />
            <BagFullBadge />
          </RailButton>
          {/* The phone (friends, chat); music on/off lives in Settings. */}
          <RailButton label={t('hud.phone')} onClick={() => openPanel({ type: 'phone' })} tour="phone">
            <PhoneIcon />
            <PhoneBadge />
          </RailButton>
          <RailButton label={`${t('map.title')} (M)`} onClick={() => openPanel({ type: 'map' })} tour="map">
            <MapIcon />
          </RailButton>
          {showVisa && (
            <RailButton label={t('visa.title')} onClick={() => openPanel({ type: 'visa' })} tour="passport">
              <ActionIcon name="passport" />
            </RailButton>
          )}
          <OnlineChip />
          <EmoteButton />
          <RailButton label={t('hud.settings')} onClick={() => setSettingsOpen(true)}>
            <GearIcon />
          </RailButton>
        </nav>
      </div>
    </header>
  )
}
