import { ACHIEVEMENTS } from '../../data/achievements'
import { EVENT_CHANCE, EVENTS } from '../../data/events'
import { QUESTS, type QuestDef, type QuestStep } from '../../data/quests'
import { useGuide } from '../../store/guideStore'
import { currentLanguage, localize } from '../../i18n/localized'
import { useFlags } from '../../store/flagsStore'
import { usePlayer } from '../../store/playerStore'
import { useTime } from '../../store/timeStore'
import { pushToast } from '../../store/toastStore'
import { useWorld } from '../../store/worldStore'
import { playSfx } from './audio'
import { bumpFlag, check, flagNumber, getFlag, setFlag } from './conditions'
import { useUI } from '../../store/uiStore'
import { useSettings } from '../../store/settingsStore'
import { shortDate } from './calendar'
import { chargeRent } from './germany'
import { SCENES } from '../scenes/registry'
import { runAction } from './actions'

/**
 * Background game logic that reacts to state changes: quest progress, achievements,
 * daily events and rent. Started once from main.tsx.
 */

const stepFlag = (id: string) => `quest.${id}`

export function stepDone(id: string): boolean {
  return !!getFlag(stepFlag(id))
}

/** Part of this player's quest (e.g. APS only on the Studium path). */
export function stepApplies(s: QuestStep): boolean {
  return !s.when || check(s.when)
}

export function questSteps(q: QuestDef): QuestStep[] {
  return q.steps.filter(stepApplies)
}

export function questComplete(q: QuestDef): boolean {
  return questSteps(q).every((s) => stepDone(s.id))
}

/** A later main quest is already complete: this one was skipped or done out of order. */
function superseded(q: QuestDef): boolean {
  if (q.side) return false
  return QUESTS.slice(QUESTS.indexOf(q) + 1).some((later) => !later.side && questApplies(later) && questComplete(later))
}

/** Part of this player's story (path branches: Studium vs Ausbildung). */
export function questApplies(q: QuestDef): boolean {
  return !q.when || check(q.when)
}

export function questVisible(q: QuestDef): boolean {
  if (!questApplies(q)) return false
  if (!q.after) return true
  const ids = Array.isArray(q.after) ? q.after : [q.after]
  const prevs = QUESTS.filter((p) => ids.includes(p.id) && questApplies(p))
  return prevs.length === 0 || prevs.some((p) => questComplete(p) || superseded(p)) || superseded(q)
}

/** The next thing to do: first unfinished step of the first open main quest. */
export function currentObjective(): { quest: QuestDef; step: QuestStep; focused?: boolean } | null {
  // The step picked in the quest log comes first, while it's open and not done.
  const focus = useGuide.getState().focus
  if (focus) {
    for (const q of QUESTS) {
      const s = q.steps.find((st) => st.id === focus)
      if (s && questVisible(q) && stepApplies(s) && !stepDone(s.id)) return { quest: q, step: s, focused: true }
    }
  }
  for (const q of QUESTS) {
    if (q.side || !questVisible(q) || questComplete(q) || superseded(q)) continue
    const s = questSteps(q).find((st) => !stepDone(st.id))
    if (s) return { quest: q, step: s }
  }
  return null
}

let busy = false

/** After a story step: say what comes next (once the dust settles). */
function announceNextStep() {
  if (!useSettings.getState().guideHints) return
  window.setTimeout(() => {
    const next = currentObjective()
    if (next) pushToast('toast.nextStep', 'info', { step: localize(next.step.text, currentLanguage()) })
  }, 1600)
}

function evaluate() {
  if (busy) return
  busy = true
  let mainStepDone = false
  try {
    // Quest steps are "sticky": once done, they stay done.
    // Steps of quests that aren't open yet are marked silently, so doing things
    // out of order still counts once the quest shows up.
    for (const q of QUESTS) {
      const visible = questVisible(q)
      const wasComplete = questComplete(q)
      for (const s of q.steps) {
        if (stepDone(s.id) || !check(s.done)) continue
        setFlag(stepFlag(s.id), true)
        bumpFlag('log.steps')
        if (visible && !q.side) mainStepDone = true
        if (visible) pushToast('toast.stepDone', 'good', { step: localize(s.text, currentLanguage()) })
      }
      if (visible && !wasComplete && questComplete(q)) {
        playSfx('success')
        pushToast('toast.questDone', 'good', { quest: localize(q.title, currentLanguage()) })
      }
    }
    for (const a of ACHIEVEMENTS) {
      const key = `achv.got.${a.id}`
      if (getFlag(key) || !check(a.when)) continue
      setFlag(key, true)
      playSfx('success')
      pushToast('toast.achievement', 'good', { icon: a.icon, name: localize(a.name, currentLanguage()) })
    }
  } finally {
    busy = false
  }
  if (mainStepDone) announceNextStep()
}

/** VND in Vietnam, EUR in Germany: switch wallets whenever the scene's country changes. */
function syncCurrency() {
  const country = SCENES[useWorld.getState().scene].country
  usePlayer.getState().switchCurrency(country === 'de' ? 'EUR' : 'VND')
}

/** Remember where the day started, for tomorrow's summary card. */
function snapshotDay(day: number) {
  const p = usePlayer.getState()
  setFlag('log.day', day)
  setFlag('log.money', p.money)
  setFlag('log.cur', p.currency)
  setFlag('log.germanXp', 0)
  setFlag('log.steps', 0)
}

/** The day rolled over (midnight or sleep): prepare yesterday's summary. */
function closeDay(day: number) {
  const p = usePlayer.getState()
  const sameCurrency = getFlag('log.cur') === p.currency
  useUI.getState().setDaySummary({
    day,
    money: sameCurrency ? Math.round((p.money - flagNumber('log.money')) * 100) / 100 : 0,
    currency: p.currency,
    germanXp: flagNumber('log.germanXp'),
    steps: flagNumber('log.steps'),
    passedOut: false,
  })
  snapshotDay(day)
  // Still up at midnight: a quiet note instead of the full card.
  if (!useUI.getState().sleeping) pushToast('toast.midnight', 'info', { date: shortDate(day, useSettings.getState().language) })
}

/** A random morning event, at most once per day. */
function morningEvent(day: number) {
  if (getFlag('event.day') === day) return
  setFlag('event.day', day)
  // Automated tests can switch random events off (dev only).
  if (import.meta.env.DEV && (window as unknown as { __noEvents?: boolean }).__noEvents) return
  if (Math.random() > EVENT_CHANCE) return
  // Money events are in the local currency: skip them while visiting home with euros.
  const wrongCurrency = (SCENES[useWorld.getState().scene].country === 'vn') !== (usePlayer.getState().currency === 'VND')
  const pool = EVENTS.filter((e) => check(e.when) && !(e.money && wrongCurrency))
  const total = pool.reduce((s, e) => s + (e.weight ?? 1), 0)
  let roll = Math.random() * total
  const event = pool.find((e) => (roll -= e.weight ?? 1) <= 0)
  if (!event) return
  const p = usePlayer.getState()
  if (event.money) p.addMoney(event.money)
  if (event.energy) (event.energy > 0 ? p.restoreEnergy : p.spendEnergy)(Math.abs(event.energy))
  if (event.mood) p.changeMood(event.mood)
  window.setTimeout(() => pushToast('toast.event', event.mood && event.mood < 0 ? 'bad' : 'info', { text: localize(event.text, currentLanguage()) }), 2600)
  if (event.id === 'gioOngNoi') setFlag('event.gio', day)
  if (event.action) runAction(event.action.id, event.action.arg)
}

export function startWatchers(): () => void {
  syncCurrency()
  useWorld.subscribe((s, prev) => s.scene !== prev.scene && syncCurrency())
  let timer: number | undefined
  const schedule = () => {
    window.clearTimeout(timer)
    timer = window.setTimeout(evaluate, 120)
  }
  let lastDay = useTime.getState().day
  const unsubs = [
    useFlags.subscribe(schedule),
    usePlayer.subscribe(schedule),
    useWorld.subscribe(schedule),
    useTime.subscribe((s) => {
      if (s.day !== lastDay) {
        lastDay = s.day
        closeDay(s.day)
        chargeRent()
        morningEvent(s.day)
      }
      schedule()
    }),
  ]
  if (getFlag('log.day') === undefined) snapshotDay(useTime.getState().day)
  // Quietly mark anything already true at startup (no toasts for loaded progress).
  for (const q of QUESTS) for (const s of q.steps) if (!stepDone(s.id) && check(s.done)) setFlag(stepFlag(s.id), true)
  for (const a of ACHIEVEMENTS) if (!getFlag(`achv.got.${a.id}`) && check(a.when)) setFlag(`achv.got.${a.id}`, true)
  return () => {
    window.clearTimeout(timer)
    unsubs.forEach((u) => u())
  }
}
