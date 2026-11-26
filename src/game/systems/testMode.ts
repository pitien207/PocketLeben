import { CONFIG } from '../../data/config'
import { MUC_SIGHT_IDS } from '../../data/munich'
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
import { currentObjective, stepDone, withDayMuted } from './watchers'
import { ensureFlightPlan } from './flight'
import { create } from 'zustand'
import { isSandbox, SANDBOX_UNDO_KEY } from '../../sandbox'
import { applyState, collectState, newGameState, seedSandboxLook, type SaveData } from './save'
import { closeDialogue } from './dialogue'
import { useMinigame } from '../../store/minigameStore'
import { dismount, useRide } from './vehicles'
import { grabOffline } from './grab'
import { playerState } from './playerState'
import { cameraState } from './cameraState'
import { standUp } from './seat'
import { say } from './say'
import { useUI } from '../../store/uiStore'
import { useGuide } from '../../store/guideStore'
import type { SceneId } from '../../store/worldStore'

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
  // 1.44 München: seeing every sight
  'muc.all': () => MUC_SIGHT_IDS.forEach((id) => setFlag(`muc.seen.${id}`, true)),
  // Story 2.1 (chapter 1)
  'start.job': () => setFlag('stats.shifts', Math.max(1, flagNumber('stats.shifts'))),
  'path.choose': () => setFlag('visa.path', visaPath() ?? 'ausbildung'),
  'visa.docs': () => {
    if (!visaPath()) setFlag('visa.path', 'ausbildung')
    setFlag('visa.originals', true)
    setFlag('sperr.done', true)
    for (const d of docsFor(visaPath())) {
      setFlag(docFlag(d.id), d.steps.length)
      if (d.steps.some((st) => st.waitDays)) setFlag(`doc.${d.id}.ready`, today())
    }
    setFlag('doc.ba.ready', today())
    setFlag('portal.errors', 0)
  },
  // One step per paper (story 2.1)
  'visa.passport': () => {
    setFlag(docFlag('passport'), 1)
    setFlag('doc.passport.ready', today())
  },
  'visa.photos': () => setFlag(docFlag('photos'), 1),
  'visa.originals': () => setFlag('visa.originals', true),
  'visa.notary': () => {
    setFlag('visa.originals', true)
    setFlag(docFlag('diploma'), 1)
  },
  'visa.criminal': () => setFlag(docFlag('criminal'), 1),
  'visa.health': () => setFlag(docFlag('health'), 1),
  'visa.writing': () => setFlag(docFlag('cv'), 1),
  'visa.insurance': () => setFlag(docFlag('insurance'), 1),
  'visa.aps': () => setFlag(docFlag('aps'), 2),
  'visa.admission': () => {
    setFlag(docFlag('admission'), 1)
    setFlag('doc.admission.ready', today())
  },
  'visa.sperr': () => {
    setFlag('sperr.done', true)
    setFlag('sperr.via', 'mortgage')
  },
  'sperr.meeting': () => setFlag('sperr.done', true),
  'sperr.email': () => setFlag('sperr.done', true),
  'sperr.call': () => setFlag('sperr.done', true),
  'visa.contract': () => {
    setFlag(docFlag('contract'), 1)
    setFlag('doc.contract.ready', today())
  },
  'visa.ba': () => setFlag('doc.ba.ready', today()),
  'visa.portal': () => {
    setFlag(docFlag('portal'), 1)
    setFlag('portal.errors', 0)
  },
  'visa.termin': () => setFlag('visa.terminDay', today()),
  'visa.submit': () => {
    if (!flagNumber('visa.terminDay')) setFlag('visa.terminDay', today())
    setFlag('visa.submitted', today())
  },
  'visa.interview': () => setFlag('visa.readyDay', today()),
  'dep.visa': () => setFlag('visa.readyDay', Math.min(flagNumber('visa.readyDay') || today(), today())),
  'dep.flight': () => setFlag('visa.flight', 'test'),
  'dep.exchange': () => {
    const p = usePlayer.getState()
    if (p.currency === 'VND' && p.otherMoney < CONFIG.visa.exchangeGoal) usePlayer.setState({ otherMoney: CONFIG.visa.exchangeGoal })
  },
  // 1.43 the first flight is four steps; only the last one travels (a loop of skips may travel only once)
  'dep.airport': () => {
    if (!getFlag('visa.flight')) setFlag('visa.flight', 'test')
    ensureFlightPlan()
    setFlag('fly.boarded', today())
  },
  'dep.seat': () => {
    ensureFlightPlan()
    setFlag('fly.seated', today())
  },
  'dep.passport': () => setFlag('fly.passport', today()),
  'dep.gate': () => {
    if (!getFlag('visa.flight')) setFlag('visa.flight', true)
    if (!getFlag('de.arrived')) {
      const p = usePlayer.getState()
      // Test shortcut: change all đồng into euros, as if done at the bank.
      if (p.currency === 'VND') {
        p.addMoney(flagNumber('visa.blocked'))
        p.exchange(p.money)
      }
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
  return useSettings.getState().testMode || isSandbox()
}

/** For components: test tools are on (the setting, or the sandbox). */
export function useTestMode(): boolean {
  const on = useSettings((s) => s.testMode)
  return on || SANDBOX
}
const SANDBOX = isSandbox()

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

/** Skip one step from the test buttons: the state before it can be brought back (undoTest). */
export function skipWithUndo(id: string): boolean {
  if (!testModeOn()) return false
  remember()
  return skipStep(id)
}

/** Skip main-story steps until the first quest of `chapter` is the objective. */
export function jumpToChapter(chapter: number): number {
  if (!testModeOn()) return 0
  remember()
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

// --- 1.43 Milestones (test tools + the sandbox) -------------------------------------------------

export interface Milestone {
  id: string
  chapter: number
  label: string
  /** Skip story steps until this one is the objective. */
  step?: string
  /** Chapter 4 branches: the path is set before skipping. */
  path?: 'studium' | 'ausbildung'
  /** Where to stand afterwards (default: stay). */
  scene?: SceneId
  spawn?: string
  /** Clock / extra state once the steps are skipped. */
  then?: () => void
  /** Skip everything (the ending). */
  end?: boolean
}

/** Same day, this time of day (test tools: a Termin booked for today must stay today). */
function clockAt(minutes: number) {
  const t = useTime.getState()
  t.setTime(t.day, minutes)
}

export const MILESTONES: Milestone[] = [
  { id: 'start', chapter: 1, label: 'Ngày đầu ở Hà Nội', scene: 'vietnam' },
  { id: 'a1', chapter: 1, label: 'Thi A1', step: 'a1.exam', scene: 'vietnam' },
  { id: 'b1', chapter: 1, label: 'Học B1', step: 'b1.enroll', scene: 'vietnam' },
  { id: 'path', chapter: 2, label: 'Chọn đường (văn phòng chị Mai)', step: 'path.mai', scene: 'vietnam', spawn: 'maiDoor' },
  { id: 'visaDocs', chapter: 2, label: 'Làm giấy tờ visa', step: 'visa.passport', scene: 'vietnam' },
  { id: 'interview', chapter: 2, label: 'Phỏng vấn Đại sứ quán', step: 'visa.interview', scene: 'embassy', then: () => clockAt(9 * 60) },
  { id: 'airport', chapter: 2, label: 'Sân bay Nội Bài (chào gia đình)', step: 'dep.airport', scene: 'airport', then: () => clockAt(20 * 60) },
  { id: 'plane', chapter: 2, label: 'Lên máy bay — tìm ghế', step: 'dep.seat', scene: 'plane', then: () => clockAt(23 * 60 + 15) },
  { id: 'transit', chapter: 2, label: 'Transit München — hải quan', step: 'dep.passport', scene: 'transit', then: () => clockAt(6 * 60 + 5) },
  { id: 'gate', chapter: 2, label: 'Transit — bảng điện tử & cổng bay', step: 'dep.gate', scene: 'transit', spawn: 'hall', then: () => clockAt(7 * 60) },
  { id: 'arrive', chapter: 3, label: 'Đến Đức — tìm phòng WG', step: 'arr.wg', scene: 'germany', then: () => clockAt(12 * 60) },
  { id: 'anmeldung', chapter: 3, label: 'Bürgeramt (Anmeldung)', step: 'arr.anmeldung', scene: 'germany' },
  { id: 'ausbildung', chapter: 4, label: 'Học nghề: ngày đầu đi làm', step: 'fd.ticket', path: 'ausbildung', scene: 'germany' },
  { id: 'zwischen', chapter: 4, label: 'Học nghề: thi giữa khóa', step: 'tr.zwischen', path: 'ausbildung', scene: 'germany' },
  { id: 'studium', chapter: 4, label: 'Du học: nhập học', step: 'uni.enroll', path: 'studium', scene: 'germany' },
  { id: 'klausur', chapter: 4, label: 'Du học: thi Klausur', step: 'uni.klausur', path: 'studium', scene: 'germany' },
  { id: 'contract', chapter: 5, label: 'Hợp đồng chính thức', step: 'c5.contract', scene: 'germany' },
  { id: 'tet', chapter: 5, label: 'Về quê ăn Tết', step: 'tet.ticket', scene: 'germany' },
  { id: 'flat', chapter: 5, label: 'Thuê nhà riêng', step: 'home.flat', scene: 'germany' },
  { id: 'end', chapter: 5, label: 'Đoạn kết — định cư', end: true },
]

/** Skip main-story steps until `stepId` is the objective (or everything, without one). */
function skipUntil(stepId?: string): number {
  useGuide.getState().setFocus(null)
  let n = 0
  for (let guard = 0; guard < 160; guard++) {
    const next = currentObjective()
    if (!next || (stepId && next.step.id === stepId)) break
    skipStep(next.step.id)
    n++
  }
  return n
}

/** Travel once the fade of an earlier skip (e.g. the flight to Germany) is over. */
function travelWhenFree(scene: SceneId, spawn = 'default', then?: () => void) {
  const go = () => {
    if (useUI.getState().transition) {
      window.setTimeout(go, 200)
      return
    }
    travelTo(scene, spawn, { minutes: 0, onArrive: then })
  }
  window.setTimeout(go, 30)
}

/**
 * Jump to a milestone. Forward = skip the steps in between (as the test tools always did). Backward (or the other
 * path after arriving in Germany) = a new game (same look) skipped forward to it — in place, no reload. Either way
 * the state before the jump is remembered, so ↶ (undoTest) brings it back.
 */
export function goToMilestone(id: string): boolean {
  const m = MILESTONES.find((x) => x.id === id)
  if (!m || !testModeOn()) return false
  const otherPath = !!m.path && !!visaPath() && visaPath() !== m.path && !!getFlag('de.arrived')
  const behind = id === 'start' ? !!getFlag('quest.start.teacher') || today() > 1 : (!!m.step && stepDone(m.step)) || otherPath
  remember()
  closeAll()
  if (behind) withDayMuted(() => applyState(newGameState()))
  if (m.path) setFlag('visa.path', m.path)
  const n = m.end ? skipUntil() : m.step ? skipUntil(m.step) : 0
  const done = () => {
    m.then?.()
    pushToast('toast.testJumped', 'info', { n })
  }
  if (m.scene) travelWhenFree(m.scene, m.spawn, done)
  else done()
  return true
}

/** The sandbox's money never runs out (both wallets stay full). */
function startSandboxMoney() {
  const FULL = { VND: 999_000_000, EUR: 99_999 } as const
  const LOW = { VND: 300_000_000, EUR: 30_000 } as const
  const top = () => {
    const s = usePlayer.getState()
    const other = s.currency === 'VND' ? 'EUR' : 'VND'
    const patch: { money?: number; otherMoney?: number } = {}
    if (s.money < LOW[s.currency]) patch.money = FULL[s.currency]
    if (s.otherMoney < LOW[other]) patch.otherMoney = FULL[other]
    if (patch.money !== undefined || patch.otherMoney !== undefined) usePlayer.setState(patch)
  }
  top()
  usePlayer.subscribe(top)
}

/**
 * Boot of a sandbox game (boot.tsx): endless money, the look of the real character for a new sandbox game,
 * and a milestone to jump to after a reset. Returns true when the look was taken (no character creation).
 */
export function startSandbox(hadSave: boolean): boolean {
  const looked = !hadSave && seedSandboxLook(null)
  startSandboxMoney()
  return looked
}

// --- 1.43 Going back (user: "skip bước mới nhưng phải quay lại được bước cũ") ----------------------------------

/** One remembered state: what the objective was, and the whole game. */
interface Snap {
  label: string
  data: SaveData
}
const UNDO_KEY = () => (isSandbox() ? SANDBOX_UNDO_KEY : 'visa-hunter-test-undo')
const UNDO_MAX = 12

function readUndo(): Snap[] {
  try {
    const list: unknown = JSON.parse(window.sessionStorage.getItem(UNDO_KEY()) ?? '[]')
    return Array.isArray(list) ? (list as Snap[]) : []
  } catch {
    return []
  }
}

/** The labels of the remembered states (newest last), for the test tools. */
export const useTestUndo = create<{ labels: string[] }>(() => ({ labels: readUndo().map((x) => x.label) }))

function writeUndo(list: Snap[]) {
  let kept = list.slice(-UNDO_MAX)
  // sessionStorage full: keep fewer
  while (kept.length) {
    try {
      window.sessionStorage.setItem(UNDO_KEY(), JSON.stringify(kept))
      break
    } catch {
      kept = kept.slice(1)
    }
  }
  if (!kept.length) {
    try {
      window.sessionStorage.removeItem(UNDO_KEY())
    } catch {
      // ignore
    }
  }
  useTestUndo.setState({ labels: kept.map((x) => x.label) })
}

/** Remember the state as it is now (before a skip or a jump). */
function remember() {
  const obj = currentObjective()
  const label = obj ? obj.step.text.vi : 'Đoạn kết'
  writeUndo([...readUndo(), { label, data: collectState() }])
}

/** Close whatever is open (panels, talk, mini-games, the ride) before the state changes under it. */
function closeAll() {
  const ui = useUI.getState()
  ui.closePanel()
  ui.setDaySummary(null)
  ui.setNewDayOpen(false)
  ui.setChapterCard(null)
  closeDialogue()
  if (useMinigame.getState().active) useMinigame.setState({ active: null, onDone: null })
  if (useRide.getState().riding) dismount()
  grabOffline()
  if (playerState.pose) standUp()
  useGuide.getState().setFocus(null)
}

/** Go back to the state before the last skip / jump (test tools, also in the real game in test mode). */
export function undoTest(): boolean {
  if (!testModeOn()) return false
  const list = readUndo()
  const snap = list.pop()
  if (!snap) return false
  writeUndo(list)
  closeAll()
  const data = snap.data
  const scene = data.scene && data.scene in SCENES ? data.scene : 'vietnam'
  // Change the place first, then the state: a night-time state put in while still on another street would make
  // you pass out there (TimeSystem) before the fade is over.
  travelWhenFree(scene, 'default', () => {
    withDayMuted(() => applyState(data))
    if (data.position) {
      playerState.teleportTo = { x: data.position.x, z: data.position.z }
      cameraState.yaw = data.position.yaw
    }
  })
  say({ vi: `Đã quay lại: ${snap.label}`, en: `Back to: ${snap.label}` }, 'info')
  return true
}
