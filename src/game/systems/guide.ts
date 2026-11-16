import { GLOBAL_BLOCKERS, ONBOARDING_NPC, SCENE_LINKS, type GuidePoint, type GuideTarget } from '../../data/guides'
import { QUESTS } from '../../data/quests'
import { useFlags } from '../../store/flagsStore'
import { useDialogue } from '../../store/dialogueStore'
import { useGuide, type ActiveGuide, type GuidePointRef, type TourStep } from '../../store/guideStore'
import { usePlayer } from '../../store/playerStore'
import { useSettings } from '../../store/settingsStore'
import { useTime } from '../../store/timeStore'
import { useUI } from '../../store/uiStore'
import { useWorld, type SceneId } from '../../store/worldStore'
import { dateLabel } from './say'
import { cameraState } from './cameraState'
import { check, flagNumber, getFlag, germanXpNeeded, setFlag } from './conditions'
import { playerState } from './playerState'
import { formatClock } from './time'
import { currentObjective, questApplies, questSteps, stepDone } from './watchers'

/**
 * The step-by-step guide (data in data/guides.ts): which step is next, what blocks it,
 * where to walk — through other scenes if needed — plus the first-time tour.
 * Results live in useGuide; the 3D arrow (components/GuideSystem) and the HUD read them.
 */

// --- Routing between scenes ------------------------------------------------------------

/** First door on the shortest way from `from` to `to` (breadth-first over SCENE_LINKS). */
export function route(from: SceneId, to: SceneId) {
  if (from === to) return null
  const queue: SceneId[] = [from]
  const firstLink = new Map<SceneId, (typeof SCENE_LINKS)[number]>()
  const seen = new Set<SceneId>([from])
  while (queue.length) {
    const scene = queue.shift()!
    for (const link of SCENE_LINKS) {
      if (link.from !== scene || seen.has(link.to)) continue
      seen.add(link.to)
      firstLink.set(link.to, scene === from ? link : firstLink.get(scene)!)
      if (link.to === to) return firstLink.get(to)!
      queue.push(link.to)
    }
  }
  return null
}

const toRef = (p: GuidePoint): GuidePointRef => ('npc' in p ? { kind: 'npc', id: p.npc } : 'spot' in p ? { kind: 'spot', id: p.spot } : { kind: 'at', at: p.at })

// --- Placeholder values for hint texts --------------------------------------------------

export function guideVars(): Record<string, string | number> {
  const g = usePlayer.getState().german
  const date = (key: string) => {
    const d = flagNumber(key)
    return d > 0 ? dateLabel(d) : '—'
  }
  return {
    xp: Math.min(g.xp, germanXpNeeded(g.level)),
    need: germanXpNeeded(g.level),
    termin: date('visa.terminDay') + (flagNumber('visa.terminTime') > 0 ? ` ${formatClock(flagNumber('visa.terminTime'))}` : ''),
    ready: date('visa.readyDay'),
    amtTermin: date('de.anmeldungTermin') + (flagNumber('de.anmeldungTime') > 0 ? ` ${formatClock(flagNumber('de.anmeldungTime'))}` : ''),
  }
}

export function fillGuide(text: string) {
  const vars = guideVars()
  return text.replace(/\{(\w+)\}/g, (m, key: string) => (key in vars ? String(vars[key]) : m))
}

// --- The guide for the current objective -------------------------------------------------

function chapterProgress(chapter: number) {
  let done = 0
  let total = 0
  for (const q of QUESTS) {
    if (q.side || q.chapter !== chapter || !questApplies(q)) continue
    for (const s of questSteps(q)) {
      total++
      if (stepDone(s.id)) done++
    }
  }
  return { done, total }
}

function placeTarget(target: GuideTarget | undefined, scene: SceneId) {
  const out: Pick<ActiveGuide, 'point' | 'ui' | 'destination' | 'via'> = { point: null, ui: null, destination: null, via: null }
  if (!target) return out
  if ('ui' in target) {
    out.ui = target.ui
    return out
  }
  if (target.scene === scene) {
    out.point = toRef(target)
    return out
  }
  out.destination = target.scene
  const link = route(scene, target.scene)
  if (link) {
    out.point = toRef(link.via)
    out.via = link.label
  }
  return out
}

export function computeGuide(): ActiveGuide | null {
  const objective = currentObjective()
  if (!objective) return null
  const { quest, step } = objective
  const scene = useWorld.getState().scene
  const guide = step.guide
  const blocker = [...GLOBAL_BLOCKERS, ...(guide?.blockers ?? [])].find((b) => check(b.when)) ?? null
  const target = blocker?.target ?? guide?.targets.find((t) => check(t.if))?.target
  const result: ActiveGuide = {
    stepId: step.id,
    stepText: step.text,
    hint: guide?.hint ?? step.text,
    blocked: blocker?.hint ?? null,
    ...placeTarget(target, scene),
    chapter: quest.chapter,
    ...chapterProgress(quest.chapter),
  }

  // The first-time tour takes over the pointer.
  const tour = useGuide.getState().tour
  if (tour && tour !== 'done') {
    result.point = null
    result.ui = null
    result.via = null
    result.destination = null
    if (tour === 'interact') Object.assign(result, placeTarget(ONBOARDING_NPC, scene))
    if (tour === 'bag') result.ui = 'bag'
    if (tour === 'clock') result.ui = 'clock'
  }
  return result
}

// --- First-time tour ---------------------------------------------------------------------

const TOUR_FLAG = 'tut.done'
let tourStart = { x: 0, z: 0, yaw: 0 }
/** Saw the dialogue / panel for the current tour step (advance once it closes). */
let tourSeen = false

function setTour(step: TourStep | null) {
  tourSeen = false
  tourStart = { x: playerState.position.x, z: playerState.position.z, yaw: cameraState.yaw }
  useGuide.getState().setTour(step)
}

export function skipTour() {
  setFlag(TOUR_FLAG, true)
  setTour(null)
}

export const finishTour = skipTour

function tourTick() {
  const tour = useGuide.getState().tour
  if (!tour) return
  // Finished elsewhere (another tab, an imported save…): stop showing it.
  if (getFlag(TOUR_FLAG)) {
    setTour(null)
    return
  }
  if (tour === 'done') return
  const ui = useUI.getState()
  if (!ui.sceneReady || ui.transition) return
  const p = playerState.position
  switch (tour) {
    case 'move':
      if (Math.hypot(p.x - tourStart.x, p.z - tourStart.z) > 1.5) setTour('camera')
      break
    case 'camera':
      if (Math.abs(Math.sin((cameraState.yaw - tourStart.yaw) / 2)) > 0.25) setTour('interact')
      break
    case 'interact': {
      const busy = useDialogue.getState().npcId !== null || ui.panel !== null || ui.sleeping
      if (busy) tourSeen = true
      else if (tourSeen) setTour('bag')
      break
    }
    case 'bag':
      if (ui.panel?.type === 'bag') tourSeen = true
      else if (tourSeen && !ui.panel) setTour('clock')
      break
    case 'clock':
      if (ui.panel?.type === 'clock') tourSeen = true
      else if (tourSeen && !ui.panel) setTour('done')
      break
  }
}

/** New players (no lessons yet, tour never finished or skipped) get the tour on the street. */
function maybeStartTour() {
  // 1.18: the user removed the tutorial at the start. The flag is still set, because the story
  // (chapter cards, secrets) waits for it.
  if (!getFlag(TOUR_FLAG)) setFlag(TOUR_FLAG, true)
}

// --- Keep the guide up to date ---------------------------------------------------------

export function startGuide(): () => void {
  let timer: number | undefined
  const refresh = () => {
    window.clearTimeout(timer)
    timer = window.setTimeout(() => {
      maybeStartTour()
      useGuide.getState().setGuide(computeGuide())
    }, 120)
  }
  let tenMinutes = -1
  const unsubs = [
    useFlags.subscribe(refresh),
    useWorld.subscribe(refresh),
    useGuide.subscribe((s, prev) => {
      if (s.tour !== prev.tour || s.focus !== prev.focus) refresh()
    }),
    useUI.subscribe((s, prev) => {
      if (s.sceneReady !== prev.sceneReady) refresh()
    }),
    usePlayer.subscribe((s, prev) => {
      if (s.money !== prev.money || Math.floor(s.energy) !== Math.floor(prev.energy) || s.german !== prev.german) refresh()
    }),
    useSettings.subscribe((s, prev) => {
      if (s.language !== prev.language) refresh()
    }),
    useTime.subscribe((s) => {
      const bucket = s.day * 1000 + Math.floor(s.minutes / 10)
      if (bucket !== tenMinutes) {
        tenMinutes = bucket
        refresh()
      }
    }),
  ]
  const tick = window.setInterval(tourTick, 250)
  refresh()
  return () => {
    window.clearTimeout(timer)
    window.clearInterval(tick)
    unsubs.forEach((u) => u())
  }
}
