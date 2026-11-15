import { CHAPTER_NAMES } from '../data/quests'
import { jumpToChapter, skipStep, testCheats } from '../game/systems/testMode'
import { currentObjective } from '../game/systems/watchers'
import { useT } from '../i18n'
import { useLocalize } from '../i18n/localized'
import { useFlags } from '../store/flagsStore'
import { useSettings } from '../store/settingsStore'
import { useUI } from '../store/uiStore'
import { SkipIcon } from './icons'

/**
 * Test mode tools (developer's own test runs). Shown in Settings when test mode is on:
 * jump to a chapter, skip the current step, money / energy / next-day cheats.
 */
export function TestTools() {
  const t = useT()
  const localize = useLocalize()
  const on = useSettings((s) => s.testMode)
  const setTestMode = useSettings((s) => s.setTestMode)
  const setOpen = useUI((s) => s.setSettingsOpen)
  const path = useFlags((s) => s.flags['visa.path'])
  if (!on) return null
  const objective = currentObjective()
  const btn = 'rounded-xl bg-white px-2 py-2 text-[12px] font-black shadow-[inset_0_0_0_2px_#f1dcb6] active:translate-y-0.5'

  return (
    <section className="mt-3 rounded-2xl bg-amber-50 p-3 shadow-[inset_0_0_0_2px_#f4c04e]" data-testid="test-tools">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-display text-sm font-extrabold text-lacquer">🧪 {t('test.title')}</h3>
        <button type="button" onClick={() => setTestMode(false)} className="text-[11px] font-black text-ink/50 underline">
          {t('test.off')}
        </button>
      </div>
      {objective && (
        <button
          type="button"
          className={`${btn} mb-2 w-full text-left`}
          onClick={() => {
            skipStep(objective.step.id)
          }}
        >
          ⏭ {t('test.skipStep')}: <span className="font-bold">{localize(objective.step.text)}</span>
        </button>
      )}
      <p className="mb-1 text-[11px] font-black text-ink/60">{t('test.path')}</p>
      <div className="mb-2 grid grid-cols-2 gap-1">
        {(['studium', 'ausbildung'] as const).map((p) => (
          <button key={p} type="button" className={path === p ? btn.replace('bg-white', 'bg-jade text-white') : btn} onClick={() => testCheats.setPath(p)}>
            {p === 'studium' ? '🎓 ' + t('test.pathStudium') : '🩺 ' + t('test.pathAusbildung')}
          </button>
        ))}
      </div>
      <p className="mb-1 text-[11px] font-black text-ink/60">{t('test.jump')}</p>
      <div className="mb-2 grid grid-cols-1 gap-1">
        {Object.keys(CHAPTER_NAMES)
          .map(Number)
          .filter((ch) => ch > 1)
          .map((ch) => (
            <button
              key={ch}
              type="button"
              className={`${btn} text-left`}
              onClick={() => {
                jumpToChapter(ch)
                setOpen(false)
              }}
            >
              ⏩ {localize(CHAPTER_NAMES[ch])}
            </button>
          ))}
        <button
          type="button"
          className={`${btn} text-left`}
          onClick={() => {
            jumpToChapter(99)
            setOpen(false)
          }}
        >
          🏁 {t('test.toEnd')}
        </button>
      </div>
      <div className="grid grid-cols-3 gap-1">
        <button type="button" className={btn} onClick={testCheats.money}>
          💰 {t('test.money')}
        </button>
        <button type="button" className={btn} onClick={testCheats.energy}>
          ⚡ {t('test.energy')}
        </button>
        <button type="button" className={btn} onClick={testCheats.nextDay}>
          🌅 {t('test.nextDay')}
        </button>
      </div>
    </section>
  )
}

/** Small ⏭ button next to a quest step (test mode only). */
export function SkipStepButton({ stepId, className = '' }: { stepId: string; className?: string }) {
  const t = useT()
  const on = useSettings((s) => s.testMode)
  if (!on) return null
  return (
    <button
      type="button"
      aria-label={t('test.skipStep')}
      title={t('test.skipStep')}
      onClick={(e) => {
        e.stopPropagation()
        skipStep(stepId)
      }}
      className={`grid shrink-0 place-items-center rounded-full border-2 border-outline bg-gold-light px-1.5 py-0.5 text-[14px] text-ink active:translate-y-0.5 ${className}`}
    >
      <SkipIcon />
    </button>
  )
}
