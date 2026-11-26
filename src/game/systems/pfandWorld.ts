import { CONFIG } from '../../data/config'
import { PFAND_SCENE, PFAND_SPOTS } from '../../../server/pfandSpots.mjs'
import { onNetMessage, sendNet } from '../../net/client'
import { useNet } from '../../store/netStore'
import { usePfand, type Bottle } from '../../store/pfandStore'
import { useWorld } from '../../store/worldStore'
import { grantBottle, roomForBottle } from './pfand'
import { playerState } from './playerState'

/**
 * 1.44 Pfand bottles all over München.
 * - Online (server with the 'pfand' feature, in a München room): the server spawns them for everyone in the room
 *   (server/pfand.mjs) — max 10, unpicked ones vanish, 1 in 1000 is golden. Reaching one asks the server
 *   (`pfand.take`); whoever asks first gets it.
 * - Offline (no account, playing offline, the sandbox, an older server): this module spawns my own with the same
 *   rules from CONFIG.pfand, but a golden one is 1 in 5.
 * `tickPfand` runs every frame while the München scene is on (GermanyStreet/PfandBottles.tsx).
 */

const net = { feat: false, room: '' }
/** The clock of the offline bottles (ms). Tests move `offset` forward instead of touching performance.now. */
export const pfandClock = { offset: 0 }
const clockNow = () => performance.now() + pfandClock.offset
const cfg = CONFIG.pfand
const between = ([a, b]: [number, number]) => a + Math.random() * (b - a)
const at = (spot: number, kind: number, gold: boolean, id: number, until?: number): Bottle => {
  const [x, z] = PFAND_SPOTS[spot] ?? [0, 0]
  return { id, spot, x, z, kind, gold, until }
}

/** Are we on the shared server bottles right now? */
export const pfandShared = () => net.feat && net.room.split('#')[0] === PFAND_SCENE && useNet.getState().status === 'online'

function setMode(mode: 'local' | 'shared') {
  if (usePfand.getState().mode === mode) return
  usePfand.getState().set({ mode, bottles: [], pending: [] })
  local.next = 0
}

type Wire = [number, number, number, number]
const fromWire = ([id, spot, kind, gold]: Wire) => at(spot, kind, !!gold, id)

/** Called once from boot.tsx (after startNet). */
export function startPfand() {
  onNetMessage((msg) => {
    const s = usePfand.getState()
    switch (msg.t) {
      case 'welcome':
        net.feat = Array.isArray(msg.feat) && (msg.feat as string[]).includes('pfand')
        net.room = ''
        break
      case 'room':
        net.room = typeof msg.room === 'string' ? msg.room : ''
        // the bottle list follows in 'pfand' (only for München rooms)
        if (pfandShared()) {
          usePfand.getState().set({ mode: 'shared', bottles: [], pending: [] })
          local.next = 0
        } else if (s.mode === 'shared') setMode('local')
        break
      case 'pfand':
        if (s.mode === 'shared') s.set({ bottles: (msg.l as Wire[]).map(fromWire), pending: [] })
        break
      case 'pfand+':
        if (s.mode === 'shared') s.set({ bottles: [...s.bottles, fromWire(msg.b as Wire)] })
        break
      case 'pfand-':
        if (s.mode === 'shared') s.set({ bottles: s.bottles.filter((b) => b.id !== msg.id) })
        break
      case 'pfand.got':
        s.set({ bottles: s.bottles.filter((b) => b.id !== msg.id), pending: s.pending.filter((id) => id !== msg.id) })
        grantBottle(!!msg.gold)
        break
      case 'pfand.no':
        // too late (someone else) or the server saw me too far away (my last snapshot lags after a jump): show it
        // again if it is still there and ask once more in a moment
        s.set({ pending: s.pending.filter((id) => id !== msg.id) })
        if (lastTry.id === msg.id) lastTry.at = clockNow() - 2100
        break
      case 'net.closed':
        net.room = ''
        net.feat = false
        setMode('local')
        break
    }
  })
}

// --- offline bottles -----------------------------------------------------------------------------------
// ids of offline bottles: never 0…small, so they cannot clash with ones still in the store after a hot reload
const local = { next: 0, id: 1_000_000 + Math.floor(Math.random() * 1_000_000) }

function freeSpot(bottles: Bottle[]): number | null {
  const p = playerState.position
  const ok: number[] = []
  PFAND_SPOTS.forEach(([x, z], i) => {
    if (Math.hypot(p.x - x, p.z - z) < cfg.playerGap) return
    if (bottles.some((b) => Math.hypot(b.x - x, b.z - z) < cfg.bottleGap)) return
    ok.push(i)
  })
  return ok.length ? ok[Math.floor(Math.random() * ok.length)] : null
}

function spawnLocal(bottles: Bottle[], now: number): Bottle | null {
  const spot = freeSpot(bottles)
  if (spot === null) return null
  return at(spot, Math.floor(Math.random() * 3), Math.random() < cfg.goldChanceOffline, local.id++, now + between(cfg.lifeSec) * 1000)
}

function tickLocal(now: number) {
  const s = usePfand.getState()
  let list = s.bottles
  let changed = false
  if (local.next === 0) {
    // first visit (or back from offline → online → offline): a few bottles are already lying around
    local.next = now + between(cfg.gapSec) * 1000
    if (!list.length) {
      for (let i = 0; i < cfg.start; i++) {
        const b = spawnLocal(list, now)
        if (b) list = [...list, b]
      }
      changed = true
    }
  }
  const alive = list.filter((b) => (b.until ?? Infinity) > now)
  if (alive.length !== list.length) {
    list = alive
    changed = true
  }
  if (now >= local.next) {
    local.next = now + between(cfg.gapSec) * 1000
    if (list.length < cfg.max) {
      const b = spawnLocal(list, now)
      if (b) {
        list = [...list, b]
        changed = true
      }
    }
  }
  if (changed) s.set({ bottles: list })
}

// --- picking up ------------------------------------------------------------------------------------------
let lastTry = { id: -1, at: 0 }

/** Every frame in München: spawn / expire offline bottles, pick up the one under my feet. */
export function tickPfand() {
  if (useWorld.getState().scene !== PFAND_SCENE) return
  const now = clockNow()
  const shared = pfandShared()
  if (!shared && usePfand.getState().mode === 'shared') setMode('local')
  if (!shared) tickLocal(now)
  const s = usePfand.getState()
  const p = playerState.position
  const b = s.bottles.find((o) => !s.pending.includes(o.id) && Math.hypot(o.x - p.x, o.z - p.z) < cfg.pickupRadius)
  if (!b) return
  // standing on a bottle with a full bag: say so once, not every frame
  if (lastTry.id === b.id && now - lastTry.at < 2500) return
  lastTry = { id: b.id, at: now }
  if (!roomForBottle()) return
  if (s.mode === 'shared') {
    if (sendNet({ t: 'pfand.take', id: b.id })) s.set({ pending: [...s.pending, b.id] })
    return
  }
  s.set({ bottles: s.bottles.filter((o) => o.id !== b.id) })
  grantBottle(b.gold)
}

/** Dev / tests: drop a bottle at a spot (offline mode only). */
export function devSpawnBottle(spot: number, gold = false) {
  const s = usePfand.getState()
  s.set({ bottles: [...s.bottles, at(spot, 0, gold, local.id++, clockNow() + 600_000)] })
}

export { PFAND_SPOTS }
