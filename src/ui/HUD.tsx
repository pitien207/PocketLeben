import { useEffect, useRef, useState, type ReactNode } from 'react'
import { formatClock, weekdayIndex } from '../game/systems/time'
import { formatMoney } from '../i18n/format'
import { useT, type I18nKey } from '../i18n'
import { usePlayer } from '../store/playerStore'
import { useSettings } from '../store/settingsStore'
import { useTime } from '../store/timeStore'
import { useUI } from '../store/uiStore'
import { useFlags } from '../store/flagsStore'
import { ActionIcon } from './ActionIcon'
import { QuestTracker } from './QuestLog'
import { bagCapacity, bagWeight } from '../game/systems/bag'
import { useInventory } from '../store/inventoryStore'
import { BagIcon, BoltIcon, CoinIcon, GearIcon, MapIcon, MoodIcon, MoonIcon, RainIcon, SunIcon } from './icons'
import { PhoneBadge, PhoneIcon } from './PhonePanel'
import { isRaining } from '../game/systems/weather'
import { longDate, shortDate } from '../game/systems/calendar'
import { SCENES } from '../game/scenes/registry'
import { useWorld } from '../store/worldStore'
import { EmoteButton, OnlineChip } from './OnlineUI'

/**
 * Top HUD (1.14, slimmed down for phones): one thin status line — clock, energy, mood on the
 * left, money on the right — the objective under it, and the buttons as a narrow icon rail
 * along the right edge. Everything else stays out of the way of the street.
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
      className="hud-slim pointer-events-auto relative grid h-9 w-9 place-items-center text-[18px] text-ink transition active:translate-y-[2px] active:shadow-none sm:h-10 sm:w-10 sm:text-[20px]"
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
  const language = useSettings((s) => s.language)
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
      aria-label={`${formatClock(minutes)}, ${longDate(day, language)} — ${t('clock.title')}`}
      className="pointer-events-auto flex h-9 shrink-0 items-center gap-1.5 rounded-xl border-2 border-outline bg-jade pr-2 pl-1.5 text-left text-white shadow-[inset_0_1.5px_0_rgba(255,255,255,0.3),0_2px_0_var(--color-outline)] [text-shadow:0_1px_0_rgba(20,50,34,0.5)] transition active:translate-y-[2px] active:shadow-none sm:h-10"
    >
      <span className="text-[16px] text-gold-light">{raining ? <RainIcon /> : daytime ? <SunIcon /> : <MoonIcon />}</span>
      <span className="font-display text-[17px] leading-none font-extrabold tabular-nums sm:text-lg">{formatClock(minutes)}</span>
      <span className="hidden text-[9.5px] leading-[1.1] font-black opacity-90 min-[380px]:inline">
        {t(`weekdayShort.${weekdayIndex(day)}` as I18nKey)}
        <br />
        <span className="tabular-nums">{shortDate(day, language)}</span>
      </span>
    </button>
  )
}

function Meter({ label, icon, value, max, barClass }: { label: string; icon: ReactNode; value: number; max: number; barClass: string }) {
  const pct = Math.max(0, Math.min(100, Math.round((value / max) * 100)))
  return (
    <span role="status" aria-label={`${label}: ${Math.round(value)}/${max}`} title={label} className="flex items-center gap-1">
      <span className="text-[15px]">{icon}</span>
      <span className="hidden h-1.5 w-10 overflow-hidden rounded-full bg-ink/15 sm:block">
        <span className={`block h-full rounded-full transition-[width] duration-500 ${barClass}`} style={{ width: `${pct}%` }} />
      </span>
      <span className="min-w-[1.4em] text-right font-display text-[14px] leading-none font-extrabold tabular-nums">{Math.round(value)}</span>
    </span>
  )
}

/** Energy and mood side by side in one plate. */
function Stats() {
  const t = useT()
  const energy = usePlayer((s) => Math.round(s.energy))
  const maxEnergy = usePlayer((s) => s.maxEnergy)
  const mood = usePlayer((s) => Math.round(s.mood))
  return (
    <div className="hud-slim flex h-9 shrink-0 items-center gap-2 px-2 text-ink sm:h-10">
      <Meter label={t('hud.energy')} icon={<BoltIcon />} value={energy} max={maxEnergy} barClass={energy < 20 ? 'animate-pulse bg-lacquer' : 'bg-gold'} />
      <span className="h-4 w-px bg-outline/20" />
      <Meter label={t('hud.mood')} icon={<MoodIcon value={mood} />} value={mood} max={100} barClass="bg-rose" />
    </div>
  )
}

/** Money of the country you're in, and the other wallet small underneath. */
function Money() {
  const t = useT()
  const money = usePlayer((s) => s.money)
  const currency = usePlayer((s) => s.currency)
  const otherMoney = usePlayer((s) => s.otherMoney)
  const otherCurrency = currency === 'VND' ? 'EUR' : 'VND'
  const gain = useMoneyGain(money)
  return (
    <div className="relative">
      <div role="status" aria-label={`${t('hud.money')}: ${formatMoney(money, currency)}`} className="hud-slim flex h-9 items-center gap-1 pr-2.5 pl-1 text-ink sm:h-10">
        <CoinIcon className={`shrink-0 text-[20px] ${gain ? 'animate-coin' : ''}`} key={gain?.key} />
        <span className="flex flex-col items-end leading-none">
          <span className="font-display text-[15px] font-extrabold tabular-nums sm:text-base">{formatMoney(money, currency)}</span>
          {otherMoney > 0 && (
            <span
              data-testid="other-money"
              aria-label={`${t('hud.otherMoney')}: ${formatMoney(otherMoney, otherCurrency)}`}
              title={t('hud.otherMoney')}
              className="mt-px text-[9.5px] font-black text-ink/55 tabular-nums"
            >
              + {formatMoney(otherMoney, otherCurrency)}
            </span>
          )}
        </span>
      </div>
      {gain && (
        <span key={gain.key} className="animate-float-up absolute top-1 right-full mr-1.5 rounded-full bg-jade px-2 py-0.5 text-[12px] font-black whitespace-nowrap text-white shadow">
          +{formatMoney(gain.amount, currency)}
        </span>
      )}
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
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <Clock />
          <Stats />
        </div>
        <Money />
      </div>

      {/* Row 2: the objective (as wide as it can be) and the icon rail on the right */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <QuestTracker />
        </div>
        <nav className="flex shrink-0 flex-col items-end gap-1.5" aria-label={t('hud.menu')}>
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
