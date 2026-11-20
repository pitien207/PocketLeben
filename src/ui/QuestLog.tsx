import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, domAnimation, LazyMotion, m } from 'motion/react'
import { CHAPTER_NAMES, QUESTS, type QuestDef } from '../data/quests'
import { SECRETS_ENABLED } from '../data/secrets'
import { fillGuide } from '../game/systems/guide'
import { currentObjective, questComplete, questSteps, questVisible, stepDone } from '../game/systems/watchers'
import { useT } from '../i18n'
import { useLocalize } from '../i18n/localized'
import { useFlags } from '../store/flagsStore'
import { useGuide } from '../store/guideStore'
import { useSettings } from '../store/settingsStore'
import { pushToast } from '../store/toastStore'
import { useUI } from '../store/uiStore'
import { Icon3d } from './Icon3d'
import { SecretList } from './SecretCard'

import { SkipStepButton } from './TestTools'

/**
 * Quests (1.29, user: the old list was boring). Animations with Motion (motion.dev, MIT): the HUD
 * card slides to the next step and pops a check when one is done; the quest log has a chapter
 * banner with its progress, quest cards that open and close, steps as a timeline (done / now /
 * later) with a "Chỉ đường" pill on the current one, finished quests folded away. 3D icons from
 * Fluent Emoji.
 */

const CHAPTER_ICON: Record<number, string> = { 1: 'house-with-garden', 2: 'passport-control', 3: 'airplane', 4: 'bookmark-tabs', 5: 'world-map' }
const JADE = '#2f9e64'
const GOLD = '#e8a33a'

/** A ring that fills with progress, something in the middle. */
function Ring({ value, size, color = JADE, children }: { value: number; size: number; color?: string; children?: ReactNode }) {
  const r = size / 2 - 3
  const c = 2 * Math.PI * r
  return (
    <span className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="#fffaf0" stroke="#f1dcb6" strokeWidth="3.5" />
        <m.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round" strokeDasharray={c} initial={false} animate={{ strokeDashoffset: c * (1 - Math.max(0, Math.min(1, value))) }} transition={{ duration: 0.6, ease: 'easeOut' }} />
      </svg>
      <span className="relative">{children}</span>
    </span>
  )
}

const stepsOf = (q: QuestDef) => {
  const steps = questSteps(q)
  return { steps, done: steps.filter((s) => stepDone(s.id)).length }
}

// ------------------------------------------------------------------------------- HUD tracker

/** "Next objective" card under the clock: the quest, the step, its progress (tap = quest log). */
export function QuestTracker() {
  const t = useT()
  const localize = useLocalize()
  useFlags((s) => s.flags) // re-render when progress changes
  const openPanel = useUI((s) => s.openPanel)
  const guide = useGuide((s) => s.guide)
  const hints = useSettings((s) => s.guideHints)
  const objective = currentObjective()
  const stepId = objective?.step.id ?? null
  const last = useRef(stepId)
  const [flash, setFlash] = useState(0)
  useEffect(() => {
    if (last.current && stepId !== last.current) setFlash(Date.now())
    last.current = stepId
  }, [stepId])
  useEffect(() => {
    if (!flash) return
    const id = window.setTimeout(() => setFlash(0), 1400)
    return () => window.clearTimeout(id)
  }, [flash])

  if (!objective) return null
  const blocked = hints && guide?.stepId === stepId ? guide.blocked : null
  const { steps, done } = stepsOf(objective.quest)
  return (
    <LazyMotion features={domAnimation}>
      {/* 1.30 (user): compact — a slim plate like the tool rail, no hint (light bulb) button. */}
      <div className="pointer-events-auto flex w-full max-w-[min(17.5rem,100%)] items-stretch gap-1" data-tour="quest">
        <button
          type="button"
          onClick={() => openPanel({ type: 'quests' })}
          className={`hud-slim relative flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden py-0.5 pr-2 pl-1 text-left ${flash ? 'step-done-flash' : ''}`}
        >
          <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: blocked ? '#d4202a' : objective.focused ? '#d6336c' : JADE }} />
          <Ring value={steps.length ? done / steps.length : 0} size={28} color={blocked ? '#d4202a' : JADE}>
            <AnimatePresence mode="wait" initial={false}>
              <m.span key={flash ? 'ok' : objective.focused ? 'pin' : blocked ? 'warn' : 'aim'} initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }} transition={{ type: 'spring', stiffness: 420, damping: 18 }} className="block">
                <Icon3d name={flash ? 'check-mark-button' : objective.focused ? 'round-pushpin' : blocked ? 'warning' : 'bullseye'} className="h-4 w-4" />
              </m.span>
            </AnimatePresence>
          </Ring>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[8.5px] leading-tight font-black tracking-wide text-[#c2410c] uppercase">
              {localize(objective.quest.title)} · {done}/{steps.length}
            </span>
            <AnimatePresence mode="popLayout" initial={false}>
              <m.span key={stepId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }} className="line-clamp-2 text-[11px] leading-[1.2] font-extrabold text-ink" data-testid="tracker-step">
                {localize(objective.step.text)}
              </m.span>
            </AnimatePresence>
            {blocked && <span className="line-clamp-1 block text-[10px] leading-tight font-bold text-lacquer">{fillGuide(localize(blocked))}</span>}
          </span>
        </button>
        {objective.focused && (
          <button type="button" aria-label={t('quests.unfocus')} title={t('quests.unfocus')} onClick={() => useGuide.getState().setFocus(null)} className="hud-slim grid w-7 shrink-0 place-items-center text-[11px] font-black text-ink/60">
            ✕
          </button>
        )}
        <SkipStepButton stepId={objective.step.id} className="hud-slim px-1.5 text-sm" />
      </div>
    </LazyMotion>
  )
}

// --------------------------------------------------------------------------------- quest log

function StepTimeline({ q, onGo }: { q: QuestDef; onGo: (stepId: string, text: string) => void }) {
  const localize = useLocalize()
  const t = useT()
  const focus = useGuide((s) => s.focus)
  const { steps } = stepsOf(q)
  const current = steps.find((s) => !stepDone(s.id))?.id
  return (
    <ol className="relative mt-1 flex flex-col">
      {steps.map((s, i) => {
        const ok = stepDone(s.id)
        const now = s.id === current
        const focused = focus === s.id
        const text = localize(s.text)
        return (
          <li key={s.id} className="relative flex gap-2.5 pb-2 last:pb-0">
            {i < steps.length - 1 && <span className={`absolute top-6 bottom-0 left-[11px] w-0.5 ${ok ? 'bg-[#8fd3ae]' : 'bg-ink/12'}`} />}
            <span className="relative z-[1] mt-0.5 grid h-6 w-6 shrink-0 place-items-center">
              {ok ? (
                <m.span initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="grid h-6 w-6 place-items-center rounded-full border-2 border-[#1f7a4c] bg-[#3fae72] text-white">
                  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
                    <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </m.span>
              ) : now ? (
                <span className="relative grid h-6 w-6 place-items-center">
                  <span className="absolute inset-0 animate-ping rounded-full bg-[#f4c04e]/60" />
                  <span className="relative h-5 w-5 rounded-full border-[3px] border-[#e8a33a] bg-white" />
                </span>
              ) : (
                <span className="h-3.5 w-3.5 rounded-full border-2 border-ink/25 bg-white" />
              )}
            </span>
            <div className={`min-w-0 flex-1 ${now ? 'rounded-xl border-2 border-[#f4c04e] bg-[#fff8e1] px-2 py-1.5' : 'pt-0.5'}`}>
              {ok ? (
                <p className="text-[13px] leading-snug font-bold text-ink/45 line-through decoration-ink/25">{text}</p>
              ) : (
                <button type="button" data-testid={`quest-step-${s.id}`} onClick={() => onGo(s.id, text)} className={`block w-full text-left text-[13.5px] leading-snug font-extrabold ${now ? 'text-ink' : 'text-ink/70'}`}>
                  {text}
                </button>
              )}
              {!ok && (now || focused) && (
                <div className="mt-1 flex items-center gap-1.5">
                  <button type="button" onClick={() => onGo(s.id, text)} className={`inline-flex items-center gap-1 rounded-full border-2 border-outline px-2 py-0.5 text-[11.5px] font-black shadow-[0_2px_0_var(--color-outline)] active:translate-y-0.5 ${focused ? 'bg-[#ffd0dc]' : 'bg-white'}`}>
                    <Icon3d name={focused ? 'round-pushpin' : 'compass'} className="h-4 w-4" />
                    {focused ? 'Đang chỉ đường' : t('quests.directions')}
                  </button>
                  <SkipStepButton stepId={s.id} />
                </div>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

// ------------------------------------------------------------------------------ quest journal
/**
 * 1.36 (user: the quest board looked cheap): a journal over the game — a lacquer-red header, the chapter's banner
 * with its progress, tabs (Đang làm / Đã xong), a list of quests on the left and the picked quest on the right
 * (big 3D icon, progress ring, the steps with "Chỉ đường"). On a narrow portrait screen the details sit under the list.
 */

type JournalTab = 'now' | 'done'

function QuestRow({ q, on, onPick }: { q: QuestDef; on: boolean; onPick: () => void }) {
  const localize = useLocalize()
  const done = questComplete(q)
  const { steps, done: n } = stepsOf(q)
  const color = done ? JADE : q.side ? GOLD : '#d4473b'
  return (
    <li>
      <button
        type="button"
        onClick={onPick}
        data-testid={`quest-${q.id}`}
        className={`relative flex w-full items-center gap-2.5 overflow-hidden rounded-2xl py-2 pr-2.5 pl-3 text-left transition ${on ? 'bg-white shadow-[0_0_0_2.5px_var(--color-gold),0_6px_16px_rgba(74,50,38,0.18)]' : 'bg-white/70 shadow-[inset_0_0_0_1.5px_rgba(74,50,38,0.12)] hover:bg-white'}`}
      >
        <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: color }} />
        <Icon3d name={done ? 'trophy' : q.side ? 'star' : 'scroll'} className="h-9 w-9 shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="rounded-full px-1.5 text-[9px] leading-[1.5] font-black tracking-wide text-white uppercase" style={{ background: color }}>
              {done ? 'Đã xong' : q.side ? 'Phụ' : 'Chính'}
            </span>
            <span className="text-[10.5px] font-black text-ink/45 tabular-nums">
              {n}/{steps.length}
            </span>
          </span>
          <span className={`mt-0.5 block truncate text-[14px] leading-tight font-black ${done ? 'text-ink/55' : 'text-ink'}`}>{localize(q.title)}</span>
          <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-ink/10">
            <m.span className="block h-full rounded-full" style={{ background: color }} initial={false} animate={{ width: `${steps.length ? (n / steps.length) * 100 : 0}%` }} transition={{ duration: 0.5 }} />
          </span>
        </span>
      </button>
    </li>
  )
}

function QuestDetail({ q, onGo }: { q: QuestDef; onGo: (stepId: string, text: string) => void }) {
  const localize = useLocalize()
  const done = questComplete(q)
  const { steps, done: n } = stepsOf(q)
  const color = done ? JADE : q.side ? GOLD : '#d4473b'
  return (
    <AnimatePresence mode="wait" initial={false}>
      <m.div key={q.id} initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.22, ease: 'easeOut' }} className="flex min-h-0 flex-col" data-testid="quest-detail">
        <div className="relative flex items-center gap-3 overflow-hidden rounded-2xl p-3 text-white shadow-[0_4px_0_rgba(74,50,38,0.35)]" style={{ background: `linear-gradient(135deg, ${color}, ${color}cc 60%, #4a3226)` }}>
          <span className="pointer-events-none absolute -top-10 -right-6 h-32 w-32 rounded-full bg-white/15" />
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white/20 shadow-[inset_0_0_0_2px_rgba(255,255,255,0.35)]">
            <Icon3d name={done ? 'trophy' : q.side ? 'star' : 'scroll'} className="h-12 w-12 drop-shadow-[0_3px_2px_rgba(0,0,0,0.25)]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10.5px] font-black tracking-[0.12em] uppercase opacity-85">{done ? 'Đã hoàn thành' : q.side ? 'Nhiệm vụ phụ' : 'Nhiệm vụ chính'}</p>
            <p className="font-display text-[19px] leading-tight font-extrabold drop-shadow-[0_1px_0_rgba(0,0,0,0.2)]">{localize(q.title)}</p>
          </div>
          <Ring value={steps.length ? n / steps.length : 0} size={48} color="#ffd76a">
            <span className="text-[12px] font-black text-ink tabular-nums">
              {n}/{steps.length}
            </span>
          </Ring>
        </div>
        <div className="mt-2.5 min-h-0 flex-1 overflow-y-auto rounded-2xl bg-white/80 px-3 py-2.5 shadow-[inset_0_0_0_1.5px_rgba(74,50,38,0.12)]">
          <StepTimeline q={q} onGo={onGo} />
        </div>
      </m.div>
    </AnimatePresence>
  )
}

export function QuestLog() {
  const t = useT()
  const localize = useLocalize()
  const panel = useUI((s) => s.panel)
  const closePanel = useUI((s) => s.closePanel)
  useFlags((s) => s.flags)
  const setFocus = useGuide((s) => s.setFocus)
  const [tab, setTab] = useState<JournalTab>('now')
  const [pick, setPick] = useState<string | null>(null)
  const [secrets, setSecrets] = useState(false)
  useEffect(() => {
    if (panel?.type !== 'quests') return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closePanel()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [panel, closePanel])
  if (panel?.type !== 'quests') return null

  const visible = QUESTS.filter(questVisible)
  const chapters = [...new Set(visible.map((q) => q.chapter))].sort((a, b) => b - a)
  const current = chapters[0]
  const inChapter = visible.filter((q) => q.chapter === current)
  const all = inChapter.filter((q) => !q.side).flatMap((q) => questSteps(q))
  const doneSteps = all.filter((s) => stepDone(s.id)).length
  const open = visible.filter((q) => !questComplete(q)).sort((a, b) => Number(!!a.side) - Number(!!b.side) || b.chapter - a.chapter)
  const finished = visible.filter((q) => questComplete(q)).sort((a, b) => b.chapter - a.chapter)
  const list = tab === 'now' ? open : finished
  const picked = list.find((q) => q.id === pick) ?? list[0] ?? null
  const [prefix, name] = localize(CHAPTER_NAMES[current] ?? CHAPTER_NAMES[1]).split(' · ')
  const go = (stepId: string, text: string) => {
    setFocus(stepId)
    closePanel()
    pushToast('toast.guideTo', 'info', { step: text })
  }

  return (
    <div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-[#2a1c16]/55 p-2 sm:p-4" onPointerDown={(e) => e.target === e.currentTarget && closePanel()}>
      <LazyMotion features={domAnimation}>
        <m.div
          role="dialog"
          aria-modal="true"
          aria-label={t('quests.title')}
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          className="relative flex max-h-full w-full max-w-[56rem] flex-col overflow-hidden rounded-[1.6rem] border-[3px] border-outline bg-[#fbf3e2] text-ink shadow-[0_6px_0_var(--color-outline),0_24px_60px_rgba(0,0,0,0.35)]"
          data-testid="quest-journal"
        >
          {/* Header: lacquer ribbon with the chapter */}
          <div className="relative flex items-center gap-3 bg-[linear-gradient(180deg,#d4473b,#a3261f)] px-4 py-2.5 text-white short:py-1.5">
            <Icon3d name={CHAPTER_ICON[current] ?? 'scroll'} className="h-11 w-11 shrink-0 drop-shadow-[0_3px_0_rgba(0,0,0,0.25)] short:h-9 short:w-9" />
            <div className="min-w-0 flex-1">
              <p className="text-[10.5px] font-black tracking-[0.14em] text-[#ffe08a] uppercase">{prefix}</p>
              <p className="font-display truncate text-[18px] leading-tight font-extrabold short:text-[16px]">{name ?? prefix}</p>
              <div className="mt-1 flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/25">
                  <m.div className="h-full rounded-full bg-[linear-gradient(90deg,#ffd76a,#ffefb0)]" initial={false} animate={{ width: `${all.length ? (doneSteps / all.length) * 100 : 0}%` }} transition={{ duration: 0.6 }} />
                </div>
                <span className="text-[11px] font-black tabular-nums opacity-90">
                  {doneSteps}/{all.length}
                </span>
              </div>
            </div>
            <button type="button" onClick={closePanel} aria-label="Đóng" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/20 text-[18px] font-black shadow-[inset_0_0_0_2px_rgba(255,255,255,0.4)] hover:bg-white/30">
              ✕
            </button>
          </div>
          {/* Tabs */}
          <div className="flex gap-1.5 border-b-2 border-ink/10 px-3 pt-2 pb-2">
            {(
              [
                ['now', `Đang làm · ${open.length}`],
                ['done', `Đã xong · ${finished.length}`],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                data-testid={`journal-tab-${id}`}
                onClick={() => {
                  setTab(id)
                  setSecrets(false)
                  setPick(null)
                }}
                className={`rounded-full px-3.5 py-1 text-[13px] font-black transition ${tab === id && !secrets ? 'btn-lacquer' : 'bg-white/70 text-ink/60 shadow-[inset_0_0_0_1.5px_rgba(74,50,38,0.15)]'}`}
              >
                {label}
              </button>
            ))}
            {SECRETS_ENABLED && (
              <button type="button" data-testid="tab-secrets" onClick={() => setSecrets(true)} className={`rounded-full px-3.5 py-1 text-[13px] font-black ${secrets ? 'btn-lacquer' : 'bg-white/70 text-ink/60'}`}>
                {t('quests.tabSecrets')}
              </button>
            )}
          </div>
          {secrets ? (
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              <SecretList />
            </div>
          ) : (
            <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto p-3 land:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] land:overflow-hidden" data-testid="quest-chapter">
              <ul className="flex min-h-0 flex-col gap-1.5 land:overflow-y-auto land:pr-1">
                {list.length ? (
                  list.map((q) => <QuestRow key={q.id} q={q} on={picked?.id === q.id} onPick={() => setPick(q.id)} />)
                ) : (
                  <li className="py-6 text-center text-[13px] font-bold text-ink/50">{tab === 'now' ? 'Chương này xong hết rồi!' : 'Chưa có nhiệm vụ nào xong.'}</li>
                )}
              </ul>
              {picked && <QuestDetail q={picked} onGo={go} />}
            </div>
          )}
        </m.div>
      </LazyMotion>
    </div>
  )
}
