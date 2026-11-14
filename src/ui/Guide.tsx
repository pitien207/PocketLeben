import { useEffect, useState } from 'react'
import { CHAPTER_NAMES } from '../data/quests'
import { fillGuide, finishTour, skipTour } from '../game/systems/guide'
import { SCENES } from '../game/scenes/registry'
import { useT, type I18nKey } from '../i18n'
import { useLocalize } from '../i18n/localized'
import { useDialogue } from '../store/dialogueStore'
import { useGuide, type TourStep } from '../store/guideStore'
import { useSettings } from '../store/settingsStore'
import { useUI } from '../store/uiStore'
import { useWorld } from '../store/worldStore'
import { Sheet } from './Sheet'
import { useIsTouch } from './useIsTouch'

/** On-screen rectangle of a HUD element marked with data-tour="…", polled while needed. */
function useAnchorRect(name: string | null) {
  const [rect, setRect] = useState<DOMRect | null>(null)
  useEffect(() => {
    if (!name) {
      setRect(null)
      return
    }
    const read = () => {
      const el = document.querySelector(`[data-tour="${name}"]`)
      const r = el?.getBoundingClientRect()
      setRect((prev) => {
        if (!r || r.width === 0) return null
        if (prev && Math.abs(prev.x - r.x) < 0.5 && Math.abs(prev.y - r.y) < 0.5 && Math.abs(prev.width - r.width) < 0.5) return prev
        return r
      })
    }
    read()
    const id = window.setInterval(read, 300)
    return () => window.clearInterval(id)
  }, [name])
  return rect
}

/** A pulsing gold ring around a HUD element ("press this"). */
function Spotlight({ rect }: { rect: DOMRect }) {
  const pad = 6
  return (
    <div
      aria-hidden="true"
      className="guide-spotlight pointer-events-none fixed z-[45] rounded-2xl"
      style={{ left: rect.left - pad, top: rect.top - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }}
    />
  )
}

/** Arrow at the edge of the screen when the target is off-screen (moved by GuideSystem every frame). */
export function GuideEdgeArrow() {
  return (
    <div id="guide-edge" aria-hidden="true" className="pointer-events-none absolute top-0 left-0 z-[15] opacity-0 transition-opacity duration-300" style={{ willChange: 'transform' }}>
      <div className="absolute -top-6 -left-6 grid h-12 w-12 place-items-center">
        <svg viewBox="0 0 48 48" className="h-12 w-12 drop-shadow-[0_2px_2px_rgba(91,70,54,0.4)]">
          <circle cx="24" cy="24" r="17" fill="#fff6e3" stroke="#ffc531" strokeWidth="4" />
          <path d="M44 24 32 15v6H18v6h14v6z" fill="#c8322b" />
        </svg>
      </div>
      <span className="absolute top-6 -left-8 w-16 rounded-full bg-ink/80 py-0.5 text-center text-[11px] font-black text-cream tabular-nums" />
    </div>
  )
}

/** When the step is "press a HUD button" (passport, clock…), make that button glow. */
export function GuideUiPulse() {
  const ui = useGuide((s) => (s.tour ? null : (s.guide?.ui ?? null)))
  const arrows = useSettings((s) => s.guideArrows)
  const panelOpen = useUI((s) => s.panel !== null)
  const rect = useAnchorRect(arrows && !panelOpen ? ui : null)
  return rect ? <Spotlight rect={rect} /> : null
}

/** "?" sheet: the current step, how to do it, what's blocking it, the way there. */
export function GuideCard() {
  const t = useT()
  const localize = useLocalize()
  const panel = useUI((s) => s.panel)
  const openPanel = useUI((s) => s.openPanel)
  const closePanel = useUI((s) => s.closePanel)
  const guide = useGuide((s) => s.guide)
  const scene = useWorld((s) => s.scene)
  if (panel?.type !== 'guide') return null

  const go = (ui: string) => {
    if (ui === 'clock') openPanel({ type: 'clock' })
    else if (ui === 'passport') openPanel({ type: 'visa' })
    else if (ui === 'bag') openPanel({ type: 'bag' })
    else openPanel({ type: 'quests' })
  }

  return (
    <Sheet title={t('guide.title')} onClose={closePanel}>
      {!guide ? (
        <p className="py-3 text-center font-bold">{t('guide.allDone')}</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          <div>
            <div className="mb-1 flex items-center justify-between text-xs font-black text-lacquer">
              <span>{localize(CHAPTER_NAMES[guide.chapter])}</span>
              <span className="tabular-nums">{t('guide.progress', { done: guide.done, total: guide.total })}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-ink/10">
              <div className="h-full rounded-full bg-jade" style={{ width: `${(guide.done / Math.max(1, guide.total)) * 100}%` }} />
            </div>
          </div>

          <p className="rounded-2xl bg-white/85 px-3 py-2 font-display text-lg leading-snug font-extrabold shadow-[inset_0_0_0_2px_#f1dcb6]">
            🎯 {localize(guide.stepText)}
          </p>

          {guide.blocked && (
            <div className="rounded-2xl bg-[#fff1cc] px-3 py-2 text-sm font-bold shadow-[inset_0_0_0_2px_#f4c04e]">
              <p className="mb-0.5 text-xs font-black text-lacquer uppercase">⚠️ {t('guide.blocked')}</p>
              {fillGuide(localize(guide.blocked))}
            </div>
          )}

          <div className="rounded-2xl bg-mint/40 px-3 py-2 text-sm font-bold">
            <p className="mb-0.5 text-xs font-black text-jade uppercase">💡 {t('guide.how')}</p>
            {fillGuide(localize(guide.hint))}
          </div>

          {guide.destination && (
            <p className="rounded-2xl bg-white/70 px-3 py-2 text-sm font-bold">
              📍 {t('guide.route', { here: localize(SCENES[scene].name), there: localize(SCENES[guide.destination].name) })}
              {guide.via && (
                <>
                  <br />➡️ <span className="font-black">{localize(guide.via)}</span>
                </>
              )}
            </p>
          )}
          {guide.point && !guide.destination && <p className="text-center text-xs font-bold text-ink/70">✨ {t('guide.followArrow')}</p>}
          {guide.ui && <p className="text-center text-xs font-bold text-ink/70">👆 {t('guide.pressButton')}</p>}

          <div className="mt-1 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => openPanel({ type: 'quests' })} className="rounded-xl bg-ink/10 px-2 py-2 text-sm font-black active:translate-y-0.5">
              📜 {t('guide.allQuests')}
            </button>
            {guide.ui ? (
              <button type="button" onClick={() => go(guide.ui!)} className="rounded-xl btn-jade px-2 py-2 text-sm font-black active:translate-y-0.5">
                {t(`guide.open.${guide.ui}` as I18nKey)}
              </button>
            ) : (
              <button type="button" onClick={closePanel} className="rounded-xl btn-lacquer px-2 py-2 text-sm font-black active:translate-y-0.5">
                {t('guide.letsGo')}
              </button>
            )}
          </div>
        </div>
      )}
    </Sheet>
  )
}

const TOUR_ORDER: TourStep[] = ['move', 'camera', 'interact', 'bag', 'clock', 'done']

/**
 * First-time tour: one short card per control, with the matching button lit up.
 * Advances by itself when the player does the thing; "Bỏ qua" ends it for good.
 */
export function Onboarding() {
  const t = useT()
  const isTouch = useIsTouch()
  const tour = useGuide((s) => s.tour)
  const panelOpen = useUI((s) => s.panel !== null)
  const transition = useUI((s) => s.transition !== null)
  const ready = useUI((s) => s.sceneReady)
  const talking = useDialogue((s) => s.npcId !== null)
  const anchorName = tour === 'move' ? (isTouch ? 'joystick' : null) : tour === 'interact' ? 'actions' : tour === 'bag' ? 'bag' : tour === 'clock' ? 'clock' : null
  const rect = useAnchorRect(tour && !panelOpen && !talking ? anchorName : null)
  if (!tour || !ready || panelOpen || talking || transition) return null

  const n = TOUR_ORDER.indexOf(tour) + 1
  const keyFor: Record<TourStep, I18nKey> = {
    move: isTouch ? 'tour.move.touch' : 'tour.move.desktop',
    camera: isTouch ? 'tour.camera.touch' : 'tour.camera.desktop',
    interact: 'tour.interact',
    bag: 'tour.bag',
    clock: 'tour.clock',
    done: 'tour.done',
  }
  const atTop = tour === 'bag' || tour === 'clock'
  return (
    <>
      {rect && <Spotlight rect={rect} />}
      <div
        className="pointer-events-none absolute inset-x-0 z-[46] flex justify-center px-4"
        style={atTop ? { top: 'calc(max(0.625rem, env(safe-area-inset-top)) + 11rem)' } : { bottom: 'calc(max(1rem, env(safe-area-inset-bottom)) + 11.5rem)' }}
      >
        <div role="dialog" aria-label={t('tour.title')} className="panel animate-pop pointer-events-auto w-full max-w-xs p-3.5 pt-3 text-ink">
          <div className="mb-1 flex items-center justify-between text-[11px] font-black text-lacquer uppercase">
            <span>{t('tour.title')}</span>
            <span className="tabular-nums">{t('tour.step', { n, total: TOUR_ORDER.length })}</span>
          </div>
          <p className="text-[15px] leading-snug font-extrabold">
            {tour === 'camera' && <span className="mr-1 inline-block animate-[sway_1.2s_ease-in-out_infinite]">👆</span>}
            {t(keyFor[tour])}
          </p>
          <div className="mt-2.5 flex justify-end gap-2">
            {tour === 'done' ? (
              <button type="button" onClick={finishTour} className="rounded-xl btn-lacquer px-4 py-1.5 text-sm font-black active:translate-y-0.5">
                {t('tour.start')}
              </button>
            ) : (
              <button type="button" onClick={skipTour} className="rounded-xl bg-ink/10 px-3 py-1.5 text-xs font-black active:translate-y-0.5">
                {t('tour.skip')}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
