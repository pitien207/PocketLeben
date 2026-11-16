import { useEffect, useRef, useState } from 'react'
import { CHAPTER_NAMES, QUESTS } from '../data/quests'
import { fillGuide } from '../game/systems/guide'
import { useGuide } from '../store/guideStore'
import { useSettings } from '../store/settingsStore'
import { currentObjective, questComplete, questSteps, questVisible, stepDone } from '../game/systems/watchers'
import { pushToast } from '../store/toastStore'
import { useT } from '../i18n'
import { useLocalize } from '../i18n/localized'
import { useFlags } from '../store/flagsStore'
import { useUI } from '../store/uiStore'
import { Sheet } from './Sheet'
import { SkipStepButton } from './TestTools'
import { CheckIcon, PinIcon, ScrollIcon, StarIcon, TargetIcon } from './icons'
import { SecretList } from './SecretCard'
import { SECRETS_ENABLED } from '../data/secrets'

/**
 * "Next objective" chip under the clock: the step, chapter progress, a warning when the
 * step is blocked, and a "?" button for the step-by-step hint. Flashes green when a step is done.
 */
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
  const progress = guide && guide.stepId === stepId ? `${guide.done}/${guide.total}` : null
  // Slim (1.14): one plate, at most two lines; the blocker shows as one red line under it.
  return (
    <div className="pointer-events-auto flex w-full max-w-[min(21rem,100%)] items-stretch gap-1" data-tour="quest">
      <button
        type="button"
        key={flash}
        onClick={() => openPanel({ type: 'quests' })}
        className={`hud-slim relative flex min-w-0 flex-1 items-center gap-1.5 px-2 py-1 text-left ${flash ? 'step-done-flash' : ''}`}
      >
        <span className={`shrink-0 text-[15px] ${blocked ? 'text-lacquer' : ''}`}>{flash ? <CheckIcon /> : objective.focused ? <PinIcon /> : <TargetIcon />}</span>
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 text-[11.5px] leading-[1.2] font-extrabold text-ink sm:text-[12.5px]" data-testid="tracker-step">
            {localize(objective.step.text)}
          </span>
          {blocked && <span className="mt-0.5 line-clamp-1 text-[10.5px] leading-tight font-bold text-lacquer">{fillGuide(localize(blocked))}</span>}
        </span>
        {progress && <span className="shrink-0 self-start rounded-full bg-ink/8 px-1.5 py-px text-[9.5px] font-black text-ink/55 tabular-nums">{progress}</span>}
      </button>
      {objective.focused && (
        <button
          type="button"
          aria-label={t('quests.unfocus')}
          title={t('quests.unfocus')}
          onClick={() => useGuide.getState().setFocus(null)}
          className="hud-slim grid w-7 shrink-0 place-items-center text-[12px] font-black text-ink/60"
        >
          ✕
        </button>
      )}
      <SkipStepButton stepId={objective.step.id} className="hud-slim px-1.5 text-sm" />
      {hints && (
        <button
          type="button"
          aria-label={t('guide.title')}
          onClick={() => openPanel({ type: 'guide' })}
          className={`hud-slim grid w-8 shrink-0 place-items-center font-display text-lg font-extrabold ${blocked ? 'text-lacquer' : 'text-jade'}`}
        >
          <span className={blocked ? 'animate-pulse' : ''}>?</span>
        </button>
      )}
    </div>
  )
}

export function QuestLog() {
  const t = useT()
  const localize = useLocalize()
  const panel = useUI((s) => s.panel)
  const closePanel = useUI((s) => s.closePanel)
  useFlags((s) => s.flags)
  const focus = useGuide((s) => s.focus)
  const setFocus = useGuide((s) => s.setFocus)
  const [tab, setTab] = useState<'quests' | 'secrets'>('quests')
  if (panel?.type !== 'quests') return null

  const visible = QUESTS.filter(questVisible)
  const chapters = [...new Set(visible.map((q) => q.chapter))].sort((a, b) => b - a)

  return (
    <Sheet title={t('quests.title')} onClose={closePanel}>
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
      {(tab === 'quests' || !SECRETS_ENABLED) && chapters.map((ch) => (
        <section key={ch} className="mb-3">
          <h3 className="mb-1.5 font-display text-sm font-extrabold text-lacquer">{localize(CHAPTER_NAMES[ch])}</h3>
          <ul className="flex flex-col gap-2">
            {visible
              .filter((q) => q.chapter === ch)
              .map((q) => {
                const done = questComplete(q)
                const steps = questSteps(q)
                const doneSteps = steps.filter((s) => stepDone(s.id)).length
                return (
                  <li key={q.id} className={`rounded-2xl bg-white/80 p-2.5 shadow-[inset_0_0_0_2px_#f1dcb6] ${done ? 'opacity-60' : ''}`}>
                    <div className="mb-1 flex items-center gap-1.5 text-[15px] font-black">
                      <span className="flex-1">
                        <span className="mr-1 inline-block align-[-3px] text-[20px]">{done ? <CheckIcon /> : q.side ? <StarIcon /> : <ScrollIcon />}</span>
                        {localize(q.title)}
                      </span>
                      <span className="text-[11px] font-black text-ink/50 tabular-nums">{t('quests.progress', { done: doneSteps, total: steps.length })}</span>
                    </div>
                    <div className="mb-1.5 h-1.5 overflow-hidden rounded-full bg-ink/10">
                      <div className={`h-full rounded-full ${q.side ? 'bg-gold' : 'bg-jade'}`} style={{ width: `${(doneSteps / steps.length) * 100}%` }} />
                    </div>
                    <ul className="flex flex-col gap-0.5">
                      {steps.map((s) => {
                        const ok = stepDone(s.id)
                        const focused = focus === s.id
                        return (
                          <li key={s.id} className={`flex items-center gap-1.5 text-[13px] font-bold ${ok ? 'text-jade line-through' : 'text-ink'}`}>
                            <span className="w-4 shrink-0 text-center">{ok ? '✓' : focused ? <PinIcon className="inline align-[-2px]" /> : '○'}</span>
                            {ok ? (
                              <span className="flex-1">{localize(s.text)}</span>
                            ) : (
                              <button
                                type="button"
                                data-testid={`quest-step-${s.id}`}
                                onClick={() => {
                                  setFocus(s.id)
                                  closePanel()
                                  pushToast('toast.guideTo', 'info', { step: localize(s.text) })
                                }}
                                className={`flex-1 rounded-lg px-1 py-0.5 text-left underline decoration-dotted underline-offset-2 hover:bg-gold-light/60 ${focused ? 'bg-gold-light/70' : ''}`}
                              >
                                {localize(s.text)}
                              </button>
                            )}
                            {!ok && <span className="shrink-0 text-[11px] font-black text-lacquer">{t('quests.directions')}</span>}
                            {!ok && <SkipStepButton stepId={s.id} />}
                          </li>
                        )
                      })}
                    </ul>
                  </li>
                )
              })}
          </ul>
        </section>
      ))}
    </Sheet>
  )
}
