import { useEffect, useRef, useState, type ReactNode } from 'react'
import { formatClock } from '../game/systems/time'
import { useT } from '../i18n'
import { usePlayer } from '../store/playerStore'
import { useTime } from '../store/timeStore'
import { useUI } from '../store/uiStore'
import { useFlags } from '../store/flagsStore'
import { QuestTracker } from './QuestLog'
import { GrabCard } from './GrabCard'
import { useGrab } from '../game/systems/grab'
import { bagCapacity, bagWeight } from '../game/systems/bag'
import { useInventory } from '../store/inventoryStore'
import { Icon3d } from './Icon3d'
import { useTestMode } from '../game/systems/testMode'

/** 1.42: the rail shows Fluent 3D pictures (user: prettier icons). */
const RAIL_ICON = 'h-[22px] w-[22px] drop-shadow-[0_1.5px_0_rgba(74,50,38,0.3)]'
import { PhoneBadge } from './PhonePanel'
import { isRaining } from '../game/systems/weather'
import { SCENES } from '../game/scenes/registry'
import { SCENE_MAPS } from '../game/scenes/maps'
import { useWorld } from '../store/worldStore'
import { EmoteButton, OnlineChip } from './OnlineUI'
import { useLandscape } from './useMedia'
import { Hint } from './kit/Hint'
import { Amount } from './kit/Amount'

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
export function RailButton({ label, onClick, children, tour, testId, keys }: { label: string; onClick: () => void; children: ReactNode; tour?: string; testId?: string; keys?: string }) {
  // 1.47: a tooltip for mouse users (the label without the "(M)" — the key shows as a chip)
  return (
    <Hint label={label.replace(/\s*\([A-Z]\)$/, '')} keys={keys} side="bottom">
    <button
      type="button"
      data-tour={tour}
      data-testid={testId}
      aria-label={label}
      onClick={onClick}
      className="rail-btn"
    >
      {children}
    </button>
    </Hint>
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
      className="pointer-events-auto flex h-7 shrink-0 items-center gap-1 rounded-full border border-white/25 bg-[#2f6b52]/90 pr-2.5 pl-1.5 text-left text-white shadow-[0_2px_6px_rgba(40,25,15,0.25)] transition active:scale-95"
    >
      <Icon3d name={raining ? 'cloud-with-rain' : daytime ? 'sun' : 'crescent-moon'} className="-ml-0.5 h-[19px] w-[19px] drop-shadow-[0_1px_0_rgba(0,0,0,0.25)]" />
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

const whole = (n: number) => Math.round(n).toLocaleString('vi-VN')
const euros = (n: number) => n.toLocaleString('vi-VN', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })

/** One currency: its coin overlapping a slim dark pill with the amount; "+…" floats up when it grows. */
function Wallet({ id, label, value, text, icon, decimals = 0 }: { id: string; label: string; value: number; text: string; icon: ReactNode; decimals?: number }) {
  const gain = useMoneyGain(value)
  return (
    <div role="status" aria-label={`${label}: ${text}`} data-testid={`wallet-${id}`} className="relative flex h-7 items-center">
      <span className={`relative z-10 -mr-3 h-7 w-7 shrink-0 drop-shadow-[0_1px_0_rgba(40,25,15,0.35)] ${gain ? 'animate-coin' : ''}`} key={`coin${gain?.key ?? 0}`}>
        {icon}
      </span>
      <span className="flex h-[1.4rem] items-center rounded-full border border-white/25 bg-[#3a2a22]/80 pr-2 pl-4 font-display text-[13px] leading-none font-extrabold text-[#fff6dc] tabular-nums shadow-[0_2px_6px_rgba(40,25,15,0.25)]">
        {/* 1.47: the digits roll to the new amount (NumberFlow) */}
        <Amount value={value} decimals={decimals} />
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
      <Wallet id="eur" label="Euro" value={eur} text={euros(eur)} decimals={Number.isInteger(eur) ? 0 : 2} icon={<Icon3d name="euro-banknote" className="h-full w-full" />} />
      <Wallet id="gem" label="Kim cương" value={gems} text={whole(gems)} icon={<Icon3d name="gem-stone" className="h-full w-full" />} />
    </div>
  )
}

/** The tools, grouped in one rail under the money: a column in portrait, a row in landscape. */
function Rail({ row }: { row: boolean }) {
  const t = useT()
  const setSettingsOpen = useUI((s) => s.setSettingsOpen)
  const openPanel = useUI((s) => s.openPanel)
  const showVisa = useFlags((s) => !!s.flags['visa.path'] && !s.flags['de.arrived'])
  // 1.43 the boarding pass from gate 7 until you land; the test tools while test mode / the sandbox is on
  const showPass = useFlags((s) => !!s.flags['fly.boarded'] && !s.flags['de.arrived'])
  // 1.43 user: only the cities have a map (not rooms, the plane, the airports)
  const cityMap = useWorld((s) => !!SCENE_MAPS[s.scene])
  const testMode = useTestMode()
  return (
        <nav className={`hud-slim pointer-events-auto flex shrink-0 items-center gap-px p-0.5 ${row ? 'flex-row' : 'flex-col'}`} aria-label={t('hud.menu')}>
          <RailButton label={t('hud.bag')} onClick={() => openPanel({ type: 'bag' })} tour="bag">
            <Icon3d name="backpack" className={RAIL_ICON} />
            <BagFullBadge />
          </RailButton>
          {/* The phone (friends, chat); music on/off lives in Settings. */}
          <RailButton label={t('hud.phone')} onClick={() => openPanel({ type: 'phone' })} tour="phone">
            <Icon3d name="mobile-phone" className={RAIL_ICON} />
            <PhoneBadge />
          </RailButton>
          {cityMap && (
            <RailButton label={`${t('map.title')} (M)`} keys="M" onClick={() => openPanel({ type: 'map' })} tour="map" testId="rail-map">
              <Icon3d name="world-map" className={RAIL_ICON} />
            </RailButton>
          )}
          {showVisa && (
            <RailButton label={t('visa.title')} onClick={() => openPanel({ type: 'visa' })} tour="passport">
              <Icon3d name="identification-card" className={RAIL_ICON} />
            </RailButton>
          )}
          {showPass && (
            <RailButton label={t('hud.boardingPass')} onClick={() => openPanel({ type: 'boardingPass' })} testId="rail-pass">
              <Icon3d name="ticket" className={RAIL_ICON} />
            </RailButton>
          )}
          <OnlineChip />
          <EmoteButton />
          {testMode && (
            <RailButton label={t('test.panel')} onClick={() => openPanel({ type: 'testTools' })} testId="rail-test">
              <Icon3d name="test-tube" className={RAIL_ICON} />
            </RailButton>
          )}
          <RailButton label={t('hud.settings')} keys="Esc" onClick={() => setSettingsOpen(true)} testId="rail-settings">
            <Icon3d name="gear" className={RAIL_ICON} />
          </RailButton>
        </nav>
  )
}

export function HUD() {
  // 1.30 (user): the money is the last thing on the top line, far right; the tools sit under it — a row
  // in landscape (a column would run into the action button on a phone held sideways), a column in
  // portrait. No zoom buttons (pinch / wheel zooms).
  const land = useLandscape()
  // 1.40: while the Grab app is on, its card takes the objective's place
  const grab = useGrab((s) => s.online)
  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col gap-1.5 px-safe pt-safe" data-layout={land ? 'land' : 'portrait'}>
      {/* Row 1: status line — clock left, money far right */}
      <div className="flex items-center justify-between gap-1.5">
        <Clock />
        <Wallets />
      </div>

      {/* Row 2: the objective on the left, the tools on the right under the money */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {grab ? <GrabCard /> : <QuestTracker />}
        </div>
        <Rail row={land} />
      </div>
    </header>
  )
}
