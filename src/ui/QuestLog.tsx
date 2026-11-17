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
import { Sheet } from './Sheet'
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

function QuestCard({ q, onGo, startOpen }: { q: QuestDef; onGo: (stepId: string, text: string) => void; startOpen: boolean }) {
  const localize = useLocalize()
  const [open, setOpen] = useState(startOpen)
  const done = questComplete(q)
  const { steps, done: n } = stepsOf(q)
  const color = done ? JADE : q.side ? GOLD : '#d4473b'
  return (
    <li className="overflow-hidden rounded-2xl border-2 border-outline bg-white shadow-[0_3px_0_var(--color-outline)]" data-testid={`quest-${q.id}`}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="relative flex w-full items-center gap-2.5 py-2 pr-2.5 pl-3 text-left">
        <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: color }} />
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: `${color}1f` }}>
          <Icon3d name={done ? 'trophy' : q.side ? 'star' : 'scroll'} className="h-8 w-8" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="mb-0.5 flex items-center gap-1">
            <span className="rounded-full px-1.5 text-[9.5px] font-black tracking-wide text-white uppercase" style={{ background: color }}>
              {done ? 'Đã xong' : q.side ? 'Phụ' : 'Chính'}
            </span>
          </span>
          <span className={`block text-[15px] leading-tight font-black ${done ? 'text-ink/55' : 'text-ink'}`}>{localize(q.title)}</span>
        </span>
        <Ring value={steps.length ? n / steps.length : 0} size={40} color={color}>
          <span className="text-[10.5px] font-black text-ink tabular-nums">
            {n}/{steps.length}
          </span>
        </Ring>
        <m.svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0 text-ink/45" animate={{ rotate: open ? 180 : 0 }} aria-hidden="true">
          <path d="M3.5 6l4.5 4.5L12.5 6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </m.svg>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <m.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: 'easeOut' }} className="overflow-hidden">
            <div className="border-t-2 border-dashed border-ink/10 px-3 pt-2 pb-3">
              <StepTimeline q={q} onGo={onGo} />
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </li>
  )
}

function Fold({ label, count, children, startOpen = false }: { label: string; count: number; children: ReactNode; startOpen?: boolean }) {
  const [open, setOpen] = useState(startOpen)
  return (
    <div className="mt-2">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 rounded-xl bg-ink/5 px-3 py-1.5 text-left text-[12.5px] font-black text-ink/60">
        <Icon3d name="check-mark-button" className="h-4 w-4" />
        <span className="flex-1">
          {label} ({count})
        </span>
        <m.svg viewBox="0 0 16 16" className="h-4 w-4" animate={{ rotate: open ? 180 : 0 }} aria-hidden="true">
          <path d="M3.5 6l4.5 4.5L12.5 6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </m.svg>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <m.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="pt-2">{children}</div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function QuestLog() {
  const t = useT()
  const localize = useLocalize()
  const panel = useUI((s) => s.panel)
  const closePanel = useUI((s) => s.closePanel)
  useFlags((s) => s.flags)
  const setFocus = useGuide((s) => s.setFocus)
  const [tab, setTab] = useState<'quests' | 'secrets'>('quests')
  if (panel?.type !== 'quests') return null

  const visible = QUESTS.filter(questVisible)
  const chapters = [...new Set(visible.map((q) => q.chapter))].sort((a, b) => b - a)
  const current = chapters[0]
  const go = (stepId: string, text: string) => {
    setFocus(stepId)
    closePanel()
    pushToast('toast.guideTo', 'info', { step: text })
  }

  return (
    <Sheet title={t('quests.title')} onClose={closePanel}>
      <LazyMotion features={domAnimation}>
        {SECRETS_ENABLED && (
          <div className="mb-3 flex rounded-full border-2 border-outline bg-cream p-1">
            {(['quests', 'secrets'] as const).map((id) => (
              <button
                key={id}
                type="button"
                data-testid={`tab-${id}`}
                onClick={() => setTab(id)}
                className={`flex-1 rounded-full px-2 py-1.5 text-[13px] font-extrabold transition ${tab === id ? 'bg-lacquer text-gold-light shadow' : 'text-ink/60'}`}
              >
                {t(id === 'quests' ? 'quests.tabQuests' : 'quests.tabSecrets')}
              </button>
            ))}
          </div>
        )}
        {SECRETS_ENABLED && tab === 'secrets' && <SecretList />}
        {(tab === 'quests' || !SECRETS_ENABLED) &&
          chapters.map((ch) => {
            const quests = visible.filter((q) => q.chapter === ch)
            const main = quests.filter((q) => !q.side)
            const all = main.flatMap((q) => questSteps(q))
            const doneSteps = all.filter((s) => stepDone(s.id)).length
            const open = quests.filter((q) => !questComplete(q)).sort((a, b) => Number(!!a.side) - Number(!!b.side))
            const finished = quests.filter((q) => questComplete(q))
            const [prefix, name] = localize(CHAPTER_NAMES[ch]).split(' · ')
            const list = (qs: QuestDef[], openFirst: boolean) => (
              <ul className="flex flex-col gap-2">
                {qs.map((q, i) => (
                  <QuestCard key={q.id} q={q} onGo={go} startOpen={openFirst && (i === 0 || !q.side)} />
                ))}
              </ul>
            )
            const banner = (
              <div className="relative mb-2 flex items-center gap-3 overflow-hidden rounded-2xl border-2 border-outline bg-[linear-gradient(135deg,#fff3d6,#ffd9a8)] p-3 shadow-[0_3px_0_var(--color-outline)]">
                <Icon3d name={CHAPTER_ICON[ch] ?? 'scroll'} className="h-14 w-14 shrink-0 drop-shadow-[0_3px_0_rgba(74,50,38,0.2)]" />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-black tracking-wide text-[#c2410c] uppercase">{prefix}</p>
                  <p className="font-display text-[17px] leading-tight font-extrabold text-ink">{name ?? prefix}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full border-2 border-outline bg-white">
                      <m.div className="h-full rounded-full bg-[linear-gradient(90deg,#3fae72,#8fd3ae)]" initial={false} animate={{ width: `${all.length ? (doneSteps / all.length) * 100 : 0}%` }} transition={{ duration: 0.6 }} />
                    </div>
                    <span className="text-[11px] font-black text-ink/60 tabular-nums">
                      {doneSteps}/{all.length}
                    </span>
                  </div>
                </div>
              </div>
            )
            if (ch !== current) {
              return (
                <section key={ch} className="mb-3">
                  <Fold label={localize(CHAPTER_NAMES[ch])} count={finished.length}>
                    {list(quests, false)}
                  </Fold>
                </section>
              )
            }
            return (
              <section key={ch} className="mb-3" data-testid="quest-chapter">
                {banner}
                {open.length ? list(open, true) : <p className="py-3 text-center text-[13px] font-bold text-ink/50">Chương này xong hết rồi!</p>}
                {finished.length > 0 && (
                  <Fold label="Đã hoàn thành" count={finished.length}>
                    {list(finished, false)}
                  </Fold>
                )}
              </section>
            )
          })}
      </LazyMotion>
    </Sheet>
  )
}
