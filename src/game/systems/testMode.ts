import { CONFIG } from '../../data/config'
import type { Condition } from '../../data/conditions'
import { QUESTS } from '../../data/quests'
import { SCENES } from '../scenes/registry'
import { usePlayer } from '../../store/playerStore'
import { useSettings } from '../../store/settingsStore'
import { useTime } from '../../store/timeStore'
import { pushToast } from '../../store/toastStore'
import { useWorld } from '../../store/worldStore'
import { flagNumber, getFlag, setFlag } from './conditions'
import { docFlag, docsFor, visaPath } from './visa'
import { travelTo } from './travel'
import { showEnding } from './career'
import { currentObjective } from './watchers'

/**
 * Test mode (for the developer's own test runs): skip story steps to reach later chapters
 * quickly. Turned on by tapping the version line in Settings 5 times, or with `?test=1`.
 *
 * Skipping a step makes its condition really true (flags, German level, travel…) so the
 * rest of the game behaves as if you had done it, then marks the step done.
 */

const today = () => useTime.getState().day
const stepFlag = (id: string) => `quest.${id}`

/** Make a condition hold, as far as plain state allows. */
function satisfy(c: Condition | undefined) {
  if (!c) return
  if ('all' in c) return c.all.forEach(satisfy)
  if ('any' in c) return satisfy(c.any[0])
  if ('flag' in c) {
    if (c.is !== undefined) setFlag(c.flag, c.is)
    else if (c.atLeast !== undefined) setFlag(c.flag, Math.max(c.atLeast, flagNumber(c.flag)))
    else if (!getFlag(c.flag)) setFlag(c.flag, today())
    return
  }
  if ('germanLevel' in c) {
    const g = usePlayer.getState().german
    if (g.level < c.germanLevel) usePlayer.getState().setGerman({ level: c.germanLevel, xp: 0 })
    return
  }
  if ('germanXpReady' in c) {
    const g = usePlayer.getState().german
    const need = CONFIG.german.levels[g.level]?.xpToExam ?? 0
    if (g.xp < need) usePlayer.getState().setGerman({ ...g, xp: need })
    return
  }
  if ('money' in c) {
    const p = usePlayer.getState()
    if (p.money < c.money) p.addMoney(c.money - p.money)
  }
}

/** Steps whose condition is a named test, or that need travel, get a hand-written skip. */
const SKIPS: Record<string, () => void> = {
  'path.choose': () => setFlag('visa.path', visaPath() ?? 'ausbildung'),
  'visa.docs': () => {
    if (!visaPath()) setFlag('visa.path', 'ausbildung')
    for (const d of docsFor(visaPath())) setFlag(docFlag(d.id), d.steps.length)
  },
  'visa.termin': () => setFlag('visa.terminDay', today()),
  'visa.interview': () => setFlag('visa.readyDay', today()),
  'dep.visa': () => setFlag('visa.readyDay', Math.min(flagNumber('visa.readyDay') || today(), today())),
  'dep.flight': () => setFlag('visa.flight', true),
  'dep.airport': () => {
    setFlag('visa.flight', true)
    if (!getFlag('de.arrived')) {
      const p = usePlayer.getState()
      if (p.currency === 'VND') p.setMoney((p.money + flagNumber('visa.blocked')) / CONFIG.visa.vndPerEur, 'EUR')
      setFlag('visa.blocked', 0)
      setFlag('de.arrived', today())
    }
    if (SCENES[useWorld.getState().scene].country !== 'de') travelTo('germany', 'default', { minutes: 0 })
  },
  'arr.anmeldung': () => {
    if (!getFlag('de.wg')) setFlag('de.wg', today())
    setFlag('de.anmeldung', today())
  },
  'fd.ticket': () => setFlag('de.ticketUntil', today() + 6),
  'tet.ticket': skipTrip,
  'tet.family': skipTrip,
  'tet.back': skipTrip,
  'uni.thesis': () => {
    setFlag('uni.degree', today())
    if (!getFlag('care.examen')) setFlag('care.examen', today())
  },
  'pr.apply': () => {
    if (!getFlag('pr.granted')) {
      setFlag('pr.granted', today())
      showEnding()
    }
  },
}

/** The whole Tết trip at once: no need to fly back and forth while testing. */
function skipTrip() {
  setFlag('trip.reunion', true)
  setFlag('trip.done', true)
  setFlag('trip.away', false)
  if (SCENES[useWorld.getState().scene].country !== 'de') travelTo('germany', 'default', { minutes: 0 })
}

export function testModeOn(): boolean {
  return useSettings.getState().testMode
}

/** Skip one story step (test mode only). */
export function skipStep(id: string): boolean {
  if (!testModeOn()) return false
  const step = QUESTS.flatMap((q) => q.steps).find((s) => s.id === id)
  if (!step) return false
  const custom = SKIPS[id]
  if (custom) custom()
  else satisfy(step.done)
  setFlag(stepFlag(id), true)
  return true
}

/** Skip main-story steps until the first quest of `chapter` is the objective. */
export function jumpToChapter(chapter: number): number {
  if (!testModeOn()) return 0
  let skipped = 0
  for (let guard = 0; guard < 80; guard++) {
    const next = currentObjective()
    if (!next || next.quest.chapter >= chapter) break
    skipStep(next.step.id)
    skipped++
  }
  pushToast('toast.testJumped', 'info', { n: skipped })
  return skipped
}

/** Handy test cheats. */
export const testCheats = {
  /** Switch between the Studium and Ausbildung paths (chapter 4 branches). */
  setPath: (path: 'studium' | 'ausbildung') => setFlag('visa.path', path),
  money: () => {
    const p = usePlayer.getState()
    p.addMoney(p.currency === 'EUR' ? 1000 : 5_000_000)
  },
  energy: () => {
    const p = usePlayer.getState()
    p.restoreEnergy(100)
    p.changeMood(100)
  },
  nextDay: () => {
    const t = useTime.getState()
    t.setTime(t.day + 1, 8 * 60)
  },
}

/** `?test=1` in the URL turns test mode on (handy on a phone); `?test=0` turns it off. */
const param = new URLSearchParams(window.location.search).get('test')
if (param === '1' || param === '0') useSettings.getState().setTestMode(param === '1')
