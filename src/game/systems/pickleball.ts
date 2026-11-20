import { leaveRoom, setMatchStarter, startPickleNet, type PbMatch } from '../../net/pickleball'
import { say } from './say'
import { useFlags } from '../../store/flagsStore'
import { useMinigame, type MinigameResult } from '../../store/minigameStore'
import { useUI } from '../../store/uiStore'
import { useWorld } from '../../store/worldStore'
import { SCENES } from '../scenes/registry'
import { registerActions } from './actions'
import { closeDialogue } from './dialogue'
import { playSfx } from './audio'
import { playerState } from './playerState'
import { placeAtSpawn, travelTo } from './travel'

/**
 * 1.39 Sân pickleball Hàng Khay: the court's door spot runs `pickle.open` → the lobby window (ui/PickleLobby.tsx).
 * A match (online from the lobby, or against the computer) is the full-screen mini-game `pickleball`; afterwards the
 * lobby opens again so you can play a rematch. Flags: `pb.played`, `pb.wins` (online), `pb.botWins`.
 */

const num = (id: string) => {
  const v = useFlags.getState().flags[id]
  return typeof v === 'number' ? v : 0
}
const bump = (id: string) => useFlags.getState().setFlag(id, num(id) + 1)

export function pickleStats() {
  return { played: num('pb.played'), wins: num('pb.wins'), botWins: num('pb.botWins') }
}

function record(r: MinigameResult) {
  const p = r.pickle
  if (!p) return
  bump('pb.played')
  if (p.won) bump(p.online ? 'pb.wins' : 'pb.botWins')
}

/** Back to the lobby after a match (both modes). */
function afterMatch(r: MinigameResult) {
  record(r)
  useUI.getState().openPanel({ type: 'pickleball' })
}

export function playBot(level: number) {
  useUI.getState().closePanel()
  useMinigame.getState().start({ kind: 'pickleball', mode: 'bot', level }, afterMatch)
}

/** The match is played on the court in Hà Nội (the 3D view needs it): not from Germany. */
export const canPlayHere = () => SCENES[useWorld.getState().scene].country === 'vn'

function startOnline(_m: PbMatch) {
  const mg = useMinigame.getState()
  if (mg.active && mg.active.kind !== 'pickleball') return
  closeDialogue()
  useUI.getState().closePanel()
  const begin = () => {
    playSfx('bell')
    useMinigame.getState().start({ kind: 'pickleball', mode: 'online', level: 1 }, afterMatch)
  }
  if (useWorld.getState().scene === 'vietnam') return begin()
  if (!canPlayHere()) {
    leaveRoom()
    say({ vi: 'Sân pickleball ở Hà Nội — bạn đang ở Đức nên không vào trận được.', en: 'The court is in Hà Nội.' }, 'bad')
    return
  }
  travelTo('vietnam', 'pickleball', { label: { vi: 'Ra sân pickleball Hàng Khay', en: 'To the pickleball court' }, onArrive: begin })
}

/** Near the court already? (the gate spawn in the Hàng Gai scene) */
function nearCourt() {
  const s = SCENES.vietnam.spawns.pickleball
  return useWorld.getState().scene === 'vietnam' && Math.hypot(playerState.position.x - s.x, playerState.position.z - s.z) < 14
}

/** An invitation was accepted: go over to the court (Hà Nội only; PickleInvites does not accept from Germany). */
export function goToCourt() {
  if (nearCourt()) return
  const scene = useWorld.getState().scene
  if (scene === 'vietnam') {
    placeAtSpawn('vietnam', 'pickleball')
    return
  }
  if (SCENES[scene].country === 'vn') travelTo('vietnam', 'pickleball', { label: { vi: 'Ra sân pickleball Hàng Khay', en: 'To the pickleball court' } })
}

registerActions({
  'pickle.open': () => {
    playSfx('click')
    useUI.getState().openPanel({ type: 'pickleball' })
    return true
  },
})

let started = false
/** Once from boot. */
export function startPickleball() {
  if (started) return
  started = true
  startPickleNet()
  setMatchStarter(startOnline)
}
