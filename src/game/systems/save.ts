import { CONFIG } from '../../data/config'
import { getItem } from '../../data/items'
import { useFlags } from '../../store/flagsStore'
import { useInventory } from '../../store/inventoryStore'
import { initialStats, usePlayer, type PlayerStats } from '../../store/playerStore'
import { useTime } from '../../store/timeStore'
import { useWorld, type SceneId } from '../../store/worldStore'
import { SCENES } from '../scenes/registry'
import { cameraState } from './cameraState'
import { playerState } from './playerState'
import { isSandbox, SANDBOX_SAVE_KEY } from '../../sandbox'

/**
 * Save / load (plan §5.8): one versioned JSON blob in localStorage, written
 * automatically shortly after anything changes, plus export/import as a text code.
 */

const KEY = 'visa-hunter-save'
/** 1.43 the sandbox (Chơi thử) plays on its own save. */
const key = () => (isSandbox() ? SANDBOX_SAVE_KEY : KEY)
const VERSION = 1

export interface SaveData {
  version: number
  savedAt: number
  player: PlayerStats
  time: { day: number; minutes: number }
  inventory: Record<string, number>
  flags: Record<string, number | boolean | string>
  position: { x: number; z: number; yaw: number } | null
  /** Added in 0.4 — older saves start in Vietnam. */
  scene?: SceneId
}

function collect(): SaveData {
  const { money, currency, otherMoney, gems, energy, maxEnergy, mood, skills, german, outfit, wardrobe, gender } = usePlayer.getState()
  const { day, minutes } = useTime.getState()
  const p = playerState.position
  const hasPosition = Number.isFinite(p.x) && Number.isFinite(p.z) && (p.x !== 0 || p.z !== 0)
  return {
    version: VERSION,
    savedAt: Date.now(),
    player: { money, currency, otherMoney, gems, energy, maxEnergy, mood, skills, german, outfit, wardrobe, gender },
    time: { day, minutes },
    inventory: useInventory.getState().items,
    flags: useFlags.getState().flags,
    position: hasPosition ? { x: p.x, z: p.z, yaw: cameraState.yaw } : null,
    scene: useWorld.getState().scene,
  }
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

function isSaveData(v: unknown): v is SaveData {
  if (!isObj(v) || v.version !== VERSION) return false
  const { player, time, inventory, flags } = v
  return (
    isObj(player) &&
    isNum(player.money) &&
    isNum(player.energy) &&
    isNum(player.maxEnergy) &&
    isNum(player.mood) &&
    isObj(player.skills) &&
    isObj(time) &&
    isNum(time.day) &&
    isNum(time.minutes) &&
    isObj(inventory) &&
    isObj(flags)
  )
}

/** Put a save into the stores: the clock first (day watchers then see the old state, which the rest overwrites). */
function applyStores(data: SaveData) {
  useTime.getState().setTime(Math.max(1, Math.floor(data.time.day)), Math.max(0, data.time.minutes % 1440))
  usePlayer.getState().hydrate({ ...initialStats(), ...data.player })
  // 1.42: a save from another version may name items that no longer exist — drop them instead of crashing the bag
  useInventory.getState().hydrate(Object.fromEntries(Object.entries(data.inventory).filter(([id, n]) => getItem(id) && Number.isFinite(n) && n > 0)))
  useFlags.getState().hydrate(data.flags)
}

function apply(data: SaveData) {
  applyStores(data)
  const scene = data.scene && data.scene in SCENES ? data.scene : 'vietnam'
  useWorld.getState().setScene(scene)
  cameraState.baseZoom = SCENES[scene].cameraZoom ?? 1
  if (data.position) {
    playerState.teleportTo = { x: data.position.x, z: data.position.z }
    cameraState.yaw = data.position.yaw
  }
}

/** Load the saved game into the stores. Returns true if a save was found. */
export function loadGame(): boolean {
  try {
    const raw = localStorage.getItem(key())
    if (!raw) return false
    const data: unknown = JSON.parse(raw)
    if (!isSaveData(data)) return false
    apply(data)
    return true
  } catch {
    return false
  }
}

let suspended = false

/** Stop all saving (before reloading into an imported save or a fresh start). */
export function suspendSaving() {
  suspended = true
}

export function saveGame() {
  if (suspended) return
  try {
    localStorage.setItem(key(), JSON.stringify(collect()))
  } catch {
    // Storage full or blocked (private mode): the game keeps running without saving.
  }
}

/** Save shortly after any change, every few seconds for the position, and when the page is hidden. */
export function startAutosave(): () => void {
  let timer: number | undefined
  const schedule = () => {
    window.clearTimeout(timer)
    timer = window.setTimeout(saveGame, CONFIG.save.debounceMs)
  }
  const unsubscribers = [
    useWorld.subscribe(schedule),
    usePlayer.subscribe(schedule),
    // The clock ticks every second: saving on each tick would never let the debounce fire (and
    // costs a JSON + localStorage write). The 10 s interval saves the time; a new day saves at once.
    useTime.subscribe((t, prev) => t.day !== prev.day && schedule()),
    useInventory.subscribe(schedule),
    useFlags.subscribe(schedule),
  ]
  const interval = window.setInterval(saveGame, CONFIG.save.positionIntervalMs)
  const onHide = () => {
    if (document.visibilityState === 'hidden') saveGame()
  }
  document.addEventListener('visibilitychange', onHide)
  window.addEventListener('pagehide', saveGame)
  return () => {
    window.clearTimeout(timer)
    window.clearInterval(interval)
    unsubscribers.forEach((u) => u())
    document.removeEventListener('visibilitychange', onHide)
    window.removeEventListener('pagehide', saveGame)
  }
}

// UTF-8 safe base64 so the save code can be copied anywhere.
function toBase64(text: string) {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}

function fromBase64(code: string) {
  const binary = atob(code.trim())
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export function exportSave(): string {
  return toBase64(JSON.stringify(collect()))
}

/** Validate and store a save code. The caller reloads the page to apply it. */
export function importSave(code: string): boolean {
  try {
    const data: unknown = JSON.parse(fromBase64(code))
    if (!isSaveData(data)) return false
    localStorage.setItem(key(), JSON.stringify(data))
    return true
  } catch {
    return false
  }
}

export function resetSave() {
  try {
    localStorage.removeItem(key())
  } catch {
    // ignore
  }
}

/** 1.43 test tools: the whole game state now (to go back to it later). */
export function collectState(): SaveData {
  return collect()
}

/** 1.43 test tools: put an earlier state back in place, without a reload (the caller travels to its scene). */
export function applyState(data: SaveData) {
  applyStores(data)
}

/** 1.43 test tools: a brand-new game (day 1, no flags) that keeps the character's look. */
export function newGameState(): SaveData {
  const { gender, outfit, wardrobe } = usePlayer.getState()
  return {
    version: VERSION,
    savedAt: Date.now(),
    player: { ...initialStats(), gender, outfit, wardrobe },
    time: { day: 1, minutes: CONFIG.time.startMinutes },
    inventory: {},
    flags: {},
    position: null,
    scene: 'vietnam',
  }
}

/** 1.43 What a character looks like (kept when the sandbox starts over). */
export function currentLook() {
  const { gender, outfit, wardrobe } = usePlayer.getState()
  return { gender, outfit, wardrobe }
}

/**
 * 1.43 A new sandbox game: take the look from `look` (a milestone reset) or from the real save on this device.
 * Returns false when there is none (then the character is created as usual).
 */
export function seedSandboxLook(look: unknown): boolean {
  let src: unknown = look
  if (!isObj(src)) {
    try {
      const real: unknown = JSON.parse(localStorage.getItem(KEY) ?? 'null')
      src = isObj(real) && isObj(real.player) ? real.player : null
    } catch {
      src = null
    }
  }
  if (!isObj(src) || !isObj(src.outfit) || (src.gender !== 'male' && src.gender !== 'female')) return false
  const p = usePlayer.getState()
  p.hydrate({ ...initialStats(), money: p.money, currency: p.currency, otherMoney: p.otherMoney, gender: src.gender, outfit: src.outfit as unknown as PlayerStats['outfit'], wardrobe: Array.isArray(src.wardrobe) ? (src.wardrobe as PlayerStats['wardrobe']) : p.wardrobe })
  return true
}
