import { useEffect, useMemo, useRef, useState } from 'react'
import { CONFIG } from '../../data/config'
import { useT, type I18nKey } from '../../i18n'
import { useTime } from '../../store/timeStore'
import { playSfx } from '../systems/audio'
import { formatClock, weekdayIndex } from '../systems/time'
import { encodeSlot, TERMIN_CANCELLED } from '../systems/termin'
import { MinigameFrame, useCountdown } from './common'

const GAME_SECONDS = 25
/** How long a freed slot stays bookable. */
const SLOT_MS = 950
const REFRESH_COOLDOWN_MS = 700
/**
 * Termin hunting (plan §6), office hours only (1.13): the slots of today's working hours
 * (or the next day's when it's too late) are all taken. Hit "Tải lại", and now and then one
 * frees up for a split second — tap it before someone else does. No waiting a week for it.
 */
export function TerminHunt({ title, onComplete }: { title: string; onComplete: (correct: number, total: number, value?: number) => void }) {
  const t = useT()
  const today = useTime((s) => s.day)
  // The clock at the moment the calendar opens (it doesn't move while you hunt).
  const [now] = useState(() => Math.floor(useTime.getState().minutes))
  const { dayOffset, slots } = useMemo(() => {
    const [open, close] = CONFIG.visa.terminHours
    const all: number[] = []
    for (let m = open * 60; m <= close * 60; m += 30) all.push(m)
    const later = all.filter((m) => m >= now + CONFIG.visa.terminLeadMinutes)
    // Today if there's still time on a weekday, else the next weekday (offices close at weekends).
    let off = later.length > 0 && weekdayIndex(today) < 5 ? 0 : 1
    while (weekdayIndex(today + off) >= 5) off++
    return { dayOffset: off, slots: all }
  }, [now, today])
  const bookable = (m: number) => dayOffset > 0 || m >= now + CONFIG.visa.terminLeadMinutes
  const [open, setOpen] = useState<number | null>(null)
  const [refreshes, setRefreshes] = useState(0)
  const [cooling, setCooling] = useState(false)
  const [message, setMessage] = useState<I18nKey>('mg.terminNone')
  const [booked, setBooked] = useState<number | null>(null)
  const done = useRef(false)
  const hideTimer = useRef<number | undefined>(undefined)

  const finish = (value: number | null, delay: number) => {
    if (done.current) return
    done.current = true
    window.setTimeout(() => onComplete(value !== null && value >= 0 ? 1 : 0, 1, value ?? undefined), delay)
  }

  const timer = useCountdown(GAME_SECONDS, 'termin', booked === null, () => finish(null, 600))

  useEffect(() => () => window.clearTimeout(hideTimer.current), [])

  const refresh = () => {
    if (cooling || booked !== null) return
    setCooling(true)
    window.setTimeout(() => setCooling(false), REFRESH_COOLDOWN_MS)
    const n = refreshes + 1
    setRefreshes(n)
    // Each refresh is a little more likely to show a free slot.
    const choices = slots.filter(bookable)
    if (choices.length && Math.random() < Math.min(0.75, 0.25 + n * 0.08)) {
      const slot = choices[Math.floor(Math.random() * choices.length)]
      window.setTimeout(() => {
        setOpen(slot)
        setMessage('mg.terminHint')
        window.clearTimeout(hideTimer.current)
        hideTimer.current = window.setTimeout(() => {
          setOpen((cur) => (cur === slot ? null : cur))
          setMessage('mg.terminGone')
        }, SLOT_MS)
      }, 150 + Math.random() * 300)
    } else {
      setMessage('mg.terminNone')
    }
  }

  const tap = (m: number) => {
    if (booked !== null) return
    if (m === open) {
      window.clearTimeout(hideTimer.current)
      setBooked(m)
      setOpen(null)
      playSfx('success')
      finish(encodeSlot(dayOffset, m), 1400)
    } else {
      playSfx('wrong')
    }
  }

  const dayLabel = `${t(`weekday.${weekdayIndex(today + dayOffset)}` as I18nKey)}, ${t('hud.day', { day: today + dayOffset })}`
  return (
    <MinigameFrame title={title} timer={timer} onClose={booked === null ? () => finish(TERMIN_CANCELLED, 0) : undefined}>
      <p className="mb-1 text-center text-[13px] font-black text-ink/75" data-testid="termin-day">
        📅 {dayOffset === 0 ? t('mg.terminToday') : dayOffset === 1 ? t('mg.terminTomorrow') : t('mg.terminNextWeek')} · {dayLabel}
      </p>
      <div className="mb-2 rounded-xl bg-[#e9eef5] px-3 py-1.5 text-center text-[13px] font-bold text-[#3b4a66]">
        {booked !== null ? t('mg.terminGot', { date: `${dayLabel} · ${formatClock(booked)}` }) : t(message)}
      </div>
      <div className="mb-3 grid grid-cols-6 gap-1">
        {slots.map((m) => {
          const isOpen = m === open
          const isBooked = m === booked
          const past = !bookable(m)
          return (
            <button
              key={m}
              type="button"
              data-testid={isOpen ? 'termin-open' : undefined}
              onClick={() => tap(m)}
              disabled={past}
              className={`flex h-10 items-center justify-center rounded-lg text-[12px] font-black tabular-nums transition ${
                isBooked
                  ? 'bg-jade text-white'
                  : isOpen
                    ? 'animate-pulse bg-[#6fcf97] text-white shadow-[0_0_0_3px_#ffe6a6]'
                    : past
                      ? 'bg-ink/5 text-ink/20'
                      : 'bg-ink/10 text-ink/40 line-through'
              }`}
            >
              {formatClock(m)}
            </button>
          )
        })}
      </div>
      <button
        type="button"
        onClick={refresh}
        disabled={cooling || booked !== null}
        className="w-full rounded-2xl btn-jade py-3 font-display text-lg font-extrabold disabled:opacity-50"
      >
        ⟳ {t('mg.terminRefresh')}
      </button>
    </MinigameFrame>
  )
}
