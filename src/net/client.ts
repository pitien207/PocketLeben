import type { Outfit } from '../data/npcs'
import type { MotionState } from '../game/components/ChibiModel'
import { localSnapshot, type PlayerSnapshot } from '../game/systems/netState'
import { playerState } from '../game/systems/playerState'
import { usePlayer } from '../store/playerStore'
import { useNet, type EmoteId } from '../store/netStore'
import { useSettings } from '../store/settingsStore'
import { useWorld } from '../store/worldStore'
import { getAccount, pushCloudSave, SERVER_URL } from './auth'

/**
 * Multiplayer client (docs/MULTIPLAYER_PLAN.md, phase 1 "see each other"): one WebSocket,
 * my PlayerSnapshot 10× a second, other players' snapshots into `remotes`. Each player
 * keeps their own clock and progress; only position, pose, outfit and emotes are shared.
 */

export interface Remote {
  id: number
  name: string
  /** Latest received snapshot (the model eases toward it). */
  snap: PlayerSnapshot
  /** Smoothed position for drawing. */
  x: number
  z: number
  yaw: number
  motion: MotionState
  outfit: Outfit
  /** JSON of the outfit, computed when it arrives (the model rebuilds when it changes). */
  outfitKey: string
}

/** Read every frame by RemotePlayers: plain objects, no React state per update. */
export const remotes = new Map<number, Remote>()

let ws: WebSocket | null = null
let retry = 0
let retryTimer: number | undefined
let sendTimer: number | undefined
let lastSent = ''
let lastSentAt = 0
let wanted = false

function rosterUpdate() {
  useNet.getState().set({ roster: [...remotes.values()].map((r) => ({ id: r.id, name: r.name })) })
}

/** My connection id (the batched room updates include everyone, me too). */
let myId = -1

/** A snapshot arrived. Batched updates leave the outfit out when it hasn't changed (1.21). */
function upsert(id: number, name: string | undefined, s: PlayerSnapshot | null) {
  if (!s || id === myId) return
  const r = remotes.get(id)
  if (r) {
    if (!s.outfit) s = { ...s, outfit: r.outfit }
    else {
      const key = JSON.stringify(s.outfit)
      if (key !== r.outfitKey) {
        r.outfit = s.outfit
        r.outfitKey = key
      }
    }
    r.snap = s
    if (name) r.name = name
    return
  }
  if (!s.outfit) return // never seen and no outfit yet: wait for the full snapshot ('join' / 'room')
  remotes.set(id, { id, name: name ?? '?', snap: s, x: s.x, z: s.z, yaw: s.yaw, motion: { ...s.motion }, outfit: s.outfit, outfitKey: JSON.stringify(s.outfit) })
  rosterUpdate()
}

function snapshot(): PlayerSnapshot {
  const p = playerState.position
  const m = localSnapshot.motion ?? { speed: 0 }
  return {
    scene: useWorld.getState().scene,
    x: Math.round(p.x * 100) / 100,
    z: Math.round(p.z * 100) / 100,
    yaw: Math.round(localSnapshot.yaw * 100) / 100,
    motion: { speed: Math.round(m.speed * 100) / 100, sit: m.sit, seatY: m.seatY, ride: m.ride ?? null, pedal: m.pedal, sip: m.sip, held: m.held ?? null },
    outfit: usePlayer.getState().outfit,
    veh: localSnapshot.veh,
  }
}

/** Other modules (friends, chat) listen to server messages and send their own. */
const listeners = new Set<(msg: { t: string; [k: string]: unknown }) => void>()
export function onNetMessage(fn: (msg: { t: string; [k: string]: unknown }) => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
export function sendNet(msg: unknown) {
  send(msg)
  return ws?.readyState === WebSocket.OPEN
}

function send(msg: unknown) {
  if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg))
}

function tick() {
  const s = snapshot()
  const text = JSON.stringify(s)
  const now = Date.now()
  // Only when something changed, plus a heartbeat every 2 s.
  if (text === lastSent && now - lastSentAt < 2000) return
  lastSent = text
  lastSentAt = now
  send({ t: 'snap', s })
}

function onMessage(ev: MessageEvent<string>) {
  let msg: { t: string; [k: string]: unknown }
  try {
    msg = JSON.parse(ev.data)
  } catch {
    return
  }
  const net = useNet.getState()
  for (const fn of listeners) fn(msg)
  switch (msg.t) {
    case 'welcome':
      retry = 0
      myId = typeof msg.id === 'number' ? msg.id : -1
      net.set({ status: 'online', name: msg.name as string, key: (msg.key as string) ?? null })
      lastSent = ''
      tick()
      send({ t: 'ping', at: Date.now() })
      break
    case 'room':
      remotes.clear()
      for (const p of msg.players as { id: number; name: string; s: PlayerSnapshot }[]) upsert(p.id, p.name, p.s)
      rosterUpdate()
      break
    case 'join':
      upsert(msg.id as number, msg.name as string, msg.s as PlayerSnapshot)
      break
    case 'snap':
      upsert(msg.id as number, undefined, msg.s as PlayerSnapshot)
      break
    case 'snaps':
      // One message per room tick with everyone who moved: [id, snapshot][]
      for (const [id, snap] of msg.l as [number, PlayerSnapshot][]) upsert(id, undefined, snap)
      break
    case 'leave':
      remotes.delete(msg.id as number)
      rosterUpdate()
      break
    case 'emote': {
      const id = msg.id as number
      net.set({ emotes: { ...net.emotes, [id]: { e: msg.e as EmoteId, key: Date.now() } } })
      break
    }
    case 'chat':
      // A world message from someone in my room also pops up above their head.
      if (typeof msg.id === 'number') net.set({ chats: { ...net.chats, [msg.id]: { text: msg.text as string, key: Date.now() } } })
      break
    case 'pong':
      net.set({ online: msg.online as number })
      break
  }
}

function socketUrl() {
  const base = SERVER_URL || window.location.origin
  return `${base.replace(/^http/, 'ws')}/ws`
}

function connect() {
  const account = getAccount()
  if (!wanted || !account || ws) return
  useNet.getState().set({ status: 'connecting', name: account.name })
  const socket = new WebSocket(socketUrl())
  ws = socket
  socket.onopen = () => socket.send(JSON.stringify({ t: 'auth', token: account.token, caps: ['batch'] }))
  socket.onmessage = onMessage
  socket.onclose = (e) => {
    if (ws !== socket) return
    ws = null
    remotes.clear()
    rosterUpdate()
    if (e.code === 4002) {
      useNet.getState().set({ status: 'replaced' })
      return
    }
    useNet.getState().set({ status: wanted ? 'offline' : 'off' })
    if (!wanted) return
    // Back off: 2 s, 4 s, 8 s … up to 30 s.
    retry++
    window.clearTimeout(retryTimer)
    retryTimer = window.setTimeout(connect, Math.min(30_000, 1000 * 2 ** retry))
  }
}

function disconnect() {
  window.clearTimeout(retryTimer)
  const socket = ws
  ws = null
  socket?.close()
  remotes.clear()
  rosterUpdate()
  useNet.getState().set({ status: 'off', online: 0 })
}

function update() {
  const should = !!getAccount() && useSettings.getState().online
  if (should === wanted) return
  wanted = should
  if (wanted) {
    retry = 0
    connect()
  } else disconnect()
}

/** Show an emote above my head and send it to the room. */
export function sendEmote(e: EmoteId) {
  useNet.getState().set({ myEmote: { e, key: Date.now() } })
  send({ t: 'emote', e })
}

/** Reconnect after "playing in another tab" took over. */
export function reconnect() {
  wanted = false
  update()
}

/** Called once from boot.tsx. */
export function startNet() {
  update()
  window.addEventListener('vh-account', update)
  useSettings.subscribe(update)
  sendTimer = window.setInterval(tick, 100)
  // Online player count + latency check.
  window.setInterval(() => send({ t: 'ping', at: Date.now() }), 15_000)
  // Cloud save: every 30 s if something changed, and when the page is hidden.
  window.setInterval(() => void pushCloudSave(), 30_000)
  const flush = () => void pushCloudSave(true)
  window.addEventListener('pagehide', flush)
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flush())
  return () => window.clearInterval(sendTimer)
}
