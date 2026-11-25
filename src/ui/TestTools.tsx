import { CHAPTER_NAMES } from '../data/quests'
import { goToMilestone, jumpToChapter, MILESTONES, skipWithUndo, testCheats, undoTest, useTestMode, useTestUndo } from '../game/systems/testMode'
import { SCENES } from '../game/scenes/registry'
import { travelTo } from '../game/systems/travel'
import { useWorld } from '../store/worldStore'
import { currentObjective, stepDone } from '../game/systems/watchers'
import { useT } from '../i18n'
import { useLocalize } from '../i18n/localized'
import { isSandbox, leaveSandbox } from '../sandbox'
import { useFlags } from '../store/flagsStore'
import { useSettings } from '../store/settingsStore'
import { useUI } from '../store/uiStore'
import { SkipIcon, UndoIcon } from './icons'
import { Sheet } from './Sheet'

const SANDBOX = isSandbox()

/**
 * Test mode tools (developer's own test runs, and the 1.43 sandbox "Chơi thử"). Shown in Settings and in their own
 * panel (rail button) when test mode is on: go back (↶, the state before the last skip / jump), milestones (jump
 * anywhere, also back), skip the current step, scene travel, path switch, chapter jumps, money / next-day cheats.
 */
export function TestTools() {
  const t = useT()
  const localize = useLocalize()
  const on = useTestMode()
  const setTestMode = useSettings((s) => s.setTestMode)
  const setOpen = useUI((s) => s.setSettingsOpen)
  const closePanel = useUI((s) => s.closePanel)
  const path = useFlags((s) => s.flags['visa.path'])
  // re-render when steps get done (the milestone list marks the passed ones)
  useFlags((s) => s.flags)
  const undo = useTestUndo((s) => s.labels)
  const scene = useWorld((s) => s.scene)
  if (!on) return null
  const objective = currentObjective()
  const btn = 'rounded-xl bg-white px-2 py-2 text-[12px] font-black shadow-[inset_0_0_0_2px_#f1dcb6] active:translate-y-0.5'
  const close = () => {
    setOpen(false)
    closePanel()
  }

  return (
    <section className="mt-3 rounded-2xl bg-amber-50 p-3 shadow-[inset_0_0_0_2px_#f4c04e]" data-testid="test-tools">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="font-display text-sm font-extrabold text-lacquer">🧪 {SANDBOX ? t('test.sandbox') : t('test.title')}</h3>
        {SANDBOX ? (
          <button type="button" data-testid="sandbox-exit" onClick={leaveSandbox} className="shrink-0 text-[11px] font-black text-ink/60 underline">
            {t('test.sandboxExit')}
          </button>
        ) : (
          <button type="button" onClick={() => setTestMode(false)} className="text-[11px] font-black text-ink/50 underline">
            {t('test.off')}
          </button>
        )}
      </div>
      {undo.length > 0 && (
        <button type="button" data-testid="test-undo" className={`${btn} mb-1 flex w-full items-center gap-1.5 text-left`} onClick={() => undoTest()}>
          <UndoIcon className="shrink-0 text-[15px] text-lacquer" />
          <span className="min-w-0">
            {t('test.undo')}: <span className="font-bold">{undo[undo.length - 1]}</span>
            <span className="ml-1 text-ink/45">({undo.length})</span>
          </span>
        </button>
      )}
      {objective && (
        <button
          type="button"
          data-testid="test-skip"
          className={`${btn} mb-2 flex w-full items-center gap-1.5 text-left`}
          onClick={() => {
            skipWithUndo(objective.step.id)
          }}
        >
          <SkipIcon className="shrink-0 text-[15px] text-jade" />
          <span className="min-w-0">
            {t('test.skipStep')}: <span className="font-bold">{localize(objective.step.text)}</span>
          </span>
        </button>
      )}

      <p className="mb-0.5 text-[11px] font-black text-ink/60">{t('test.milestones')}</p>
      <p className="mb-1 text-[10px] leading-snug font-bold text-ink/45">{t('test.milestoneHint')}</p>
      <div className="mb-2 grid grid-cols-2 gap-1 land:grid-cols-3" data-testid="milestones">
        {MILESTONES.map((m) => {
          const passed = m.id === 'start' ? true : m.step ? stepDone(m.step) : false
          const current = !!m.step && objective?.step.id === m.step
          return (
            <button
              key={m.id}
              type="button"
              data-testid={`milestone-${m.id}`}
              data-passed={passed && !current ? '1' : undefined}
              className={`${btn} text-left leading-tight ${current ? 'bg-jade text-white' : passed ? 'bg-[#f3ead8] text-ink/70' : ''}`}
              onClick={() => {
                if (goToMilestone(m.id)) close()
              }}
            >
              <span className="block text-[9px] font-black text-ink/45">{current ? '▶ ' : passed ? '✓ ' : ''}C{m.chapter}</span>
              {m.label}
            </button>
          )
        })}
      </div>

      {/* 1.43 the map is only in the cities now: scene travel for tests lives here */}
      <details className="mb-2">
        <summary className="cursor-pointer text-[11px] font-black text-ink/60">{t('map.travel')}</summary>
        <div className="mt-1 flex flex-wrap gap-1" data-testid="test-travel">
          {Object.values(SCENES)
            .filter((s) => s.id !== scene)
            .map((s) => (
              <button
                key={s.id}
                type="button"
                className="rounded-lg bg-white px-2 py-1 text-[11px] font-black shadow-[inset_0_0_0_2px_#f1dcb6] active:translate-y-0.5"
                onClick={() => {
                  close()
                  travelTo(s.id, 'default', { minutes: 0 })
                }}
              >
                {localize(s.name)}
              </button>
            ))}
        </div>
      </details>

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
                close()
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
            close()
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
      {SANDBOX && (
        <button
          type="button"
          data-testid="sandbox-restart"
          className={`${btn} mt-2 w-full`}
          onClick={() => {
            if (goToMilestone('start')) close()
          }}
        >
          ↺ {t('test.sandboxReset')}
        </button>
      )}
    </section>
  )
}

/** 1.43 the test tools in their own sheet (rail button while test mode / the sandbox is on). */
export function TestPanel() {
  const panel = useUI((s) => s.panel)
  const closePanel = useUI((s) => s.closePanel)
  const t = useT()
  if (panel?.type !== 'testTools') return null
  return (
    <Sheet title={t('test.panel')} onClose={closePanel}>
      <TestTools />
    </Sheet>
  )
}

/** Small ⏭ button next to a quest step (test mode only). */
export function SkipStepButton({ stepId, className = '' }: { stepId: string; className?: string }) {
  const t = useT()
  const on = useTestMode()
  if (!on) return null
  return (
    <button
      type="button"
      aria-label={t('test.skipStep')}
      title={t('test.skipStep')}
      onClick={(e) => {
        e.stopPropagation()
        skipWithUndo(stepId)
      }}
      className={`grid shrink-0 place-items-center rounded-full border-2 border-outline bg-gold-light px-1.5 py-0.5 text-[14px] text-ink active:translate-y-0.5 ${className}`}
    >
      <SkipIcon />
    </button>
  )
}

/** 1.43 ↶ next to the objective: back to the state before the last skip / jump (test mode, when there is one). */
export function UndoStepButton({ className = '' }: { className?: string }) {
  const t = useT()
  const on = useTestMode()
  const undo = useTestUndo((s) => s.labels)
  if (!on || undo.length === 0) return null
  return (
    <button
      type="button"
      data-testid="undo-step"
      aria-label={`${t('test.undo')}: ${undo[undo.length - 1]}`}
      title={`${t('test.undo')}: ${undo[undo.length - 1]}`}
      onClick={(e) => {
        e.stopPropagation()
        undoTest()
      }}
      className={`grid shrink-0 place-items-center rounded-full border-2 border-outline bg-white px-1.5 py-0.5 text-[14px] text-ink active:translate-y-0.5 ${className}`}
    >
      <UndoIcon />
    </button>
  )
}
