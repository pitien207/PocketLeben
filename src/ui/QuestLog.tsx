import { useEffect, useRef, useState } from 'react'
import { CHAPTER_NAMES, QUESTS } from '../data/quests'
import { fillGuide } from '../game/systems/guide'
import { useGuide } from '../store/guideStore'
import { useSettings } from '../store/settingsStore'
import { currentObjective, questComplete, questVisible, stepDone } from '../game/systems/watchers'
import { useT } from '../i18n'
import { useLocalize } from '../i18n/localized'
import { useFlags } from '../store/flagsStore'
import { useUI } from '../store/uiStore'
import { Sheet } from './Sheet'

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
  return (
    <div className="pointer-events-auto flex w-[min(17rem,calc(100vw-1.5rem))] items-stretch gap-1 sm:w-80" data-tour="quest">
      <button
        type="button"
        key={flash}
        onClick={() => openPanel({ type: 'quests' })}
        className={`hud-chip relative flex min-w-0 flex-1 items-start gap-1.5 px-2.5 py-1.5 text-left ${flash ? 'step-done-flash' : ''}`}
      >
        <span className="mt-0.5 text-sm">{flash ? '✅' : '🎯'}</span>
        <span className="min-w-0">
          <span className="block text-[12px] leading-snug font-extrabold text-ink">{localize(objective.step.text)}</span>
          {guide && guide.stepId === stepId && (
            <span className="block text-[10px] font-black text-ink/60 tabular-nums">
              {t('guide.progress', { done: guide.done, total: guide.total })}
            </span>
          )}
          {blocked && <span className="line-clamp-2 text-[11px] leading-tight font-bold text-lacquer">⚠️ {fillGuide(localize(blocked))}</span>}
        </span>
      </button>
      {hints && (
        <button
          type="button"
          aria-label={t('guide.title')}
          onClick={() => openPanel({ type: 'guide' })}
          className={`hud-chip grid w-9 shrink-0 place-items-center font-display text-xl font-extrabold ${blocked ? 'text-lacquer' : 'text-jade'}`}
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
  if (panel?.type !== 'quests') return null

  const visible = QUESTS.filter(questVisible)
  const chapters = [...new Set(visible.map((q) => q.chapter))].sort((a, b) => b - a)

  return (
    <Sheet title={t('quests.title')} onClose={closePanel}>
      {chapters.map((ch) => (
        <section key={ch} className="mb-3">
          <h3 className="mb-1.5 font-display text-sm font-extrabold text-lacquer">{localize(CHAPTER_NAMES[ch])}</h3>
          <ul className="flex flex-col gap-2">
            {visible
              .filter((q) => q.chapter === ch)
              .map((q) => {
                const done = questComplete(q)
                return (
                  <li key={q.id} className={`rounded-2xl bg-white/80 p-2.5 shadow-[inset_0_0_0_2px_#f1dcb6] ${done ? 'opacity-60' : ''}`}>
                    <div className="mb-1 flex items-center gap-1.5 text-[15px] font-black">
                      {done ? '✅' : q.side ? '⭐' : '📜'} {localize(q.title)}
                    </div>
                    <ul className="flex flex-col gap-0.5">
                      {q.steps.map((s) => {
                        const ok = stepDone(s.id)
                        return (
                          <li key={s.id} className={`flex gap-1.5 text-[13px] font-bold ${ok ? 'text-jade line-through' : 'text-ink'}`}>
                            <span>{ok ? '✓' : '○'}</span>
                            <span>{localize(s.text)}</span>
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
