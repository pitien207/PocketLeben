import { useEffect, useReducer, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import type { Group } from 'three'
import { useLocalize, type Localized } from '../../i18n/localized'
import { remotes, type RemoteSample } from '../../net/client'
import { useNet, type EmoteId } from '../../store/netStore'
import { damp, dampAngle } from '../systems/math'
import { playerState } from '../systems/playerState'
import { ChibiModel, type MotionState } from './ChibiModel'
import { isVehicleId, VEHICLES } from '../../data/vehicles'
import { rideAnchorsOf } from '../scenes/shared/ownVehicles'
import { VehicleMesh } from './PlayerVehicle'
import { matchHiddenRemotes } from '../minigames/pickleball/session'

/** What each emote shows above the head (emoji are fine in content). */

/** 1.42: how far in the past remote players are drawn (the server batches every 100 ms; this hides jitter). */
const INTERP_DELAY = 130
/** At most this long past the newest sample we keep moving in the last direction (a late packet). */
const MAX_EXTRAPOLATE = 250

/** Position at time t from the samples (interpolated; briefly extrapolated past the newest one). */
function sampleAt(buf: RemoteSample[], t: number): { x: number; z: number; yaw: number } | null {
  const n = buf.length
  if (!n) return null
  if (n === 1 || t <= buf[0].t) return buf[0]
  for (let i = n - 1; i > 0; i--) {
    const a = buf[i - 1]
    const b = buf[i]
    if (t >= a.t && t <= b.t) {
      const k = (t - a.t) / Math.max(1, b.t - a.t)
      let dy = b.yaw - a.yaw
      dy = Math.atan2(Math.sin(dy), Math.cos(dy))
      return { x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k, yaw: a.yaw + dy * k }
    }
  }
  // newer than the newest sample: keep going a little in the last direction, then stop
  const a = buf[n - 2]
  const b = buf[n - 1]
  const span = Math.max(1, b.t - a.t)
  const over = Math.min(t - b.t, MAX_EXTRAPOLATE)
  // they stopped (the newest sample says so), or the samples are far apart in time → no extrapolation
  if (!b.moving || span > 400) return b
  const k = over / span
  return { x: b.x + (b.x - a.x) * k, z: b.z + (b.z - a.z) * k, yaw: b.yaw }
}

export const EMOTES: Record<EmoteId, { icon: string; text?: Localized }> = {
  wave: { icon: '👋' },
  heart: { icon: '💖' },
  laugh: { icon: '😆' },
  wow: { icon: '😮' },
  sad: { icon: '🥲' },
  dance: { icon: '💃' },
  hello: { icon: '👋', text: { vi: 'Xin chào!', en: 'Hello!', de: 'Hallo!' } },
  thanks: { icon: '🙏', text: { vi: 'Cảm ơn nha!', en: 'Thank you!', de: 'Danke!' } },
  luck: { icon: '🍀', text: { vi: 'Viel Glück!', en: 'Viel Glück!', de: 'Viel Glück!' } },
  tschuess: { icon: '✋', text: { vi: 'Tschüss!', en: 'Tschüss!', de: 'Tschüss!' } },
  follow: { icon: '👉', text: { vi: 'Đi theo mình!', en: 'Follow me!', de: 'Komm mit!' } },
  yes: { icon: '👍', text: { vi: 'Ok luôn!', en: 'Okay!', de: 'Alles klar!' } },
}

const SHOW_MS = 3500

/** Emote bubble; hides itself after a few seconds. */
export function EmoteBubble({ emote, y = 2.15 }: { emote: { e: EmoteId; key: number } | null | undefined; y?: number }) {
  const localize = useLocalize()
  const [visible, setVisible] = useState<number | null>(null)
  useEffect(() => {
    if (!emote) return
    const left = SHOW_MS - (Date.now() - emote.key)
    if (left <= 0) return
    setVisible(emote.key)
    const id = window.setTimeout(() => setVisible(null), left)
    return () => window.clearTimeout(id)
  }, [emote])
  if (!emote || visible !== emote.key) return null
  const def = EMOTES[emote.e]
  return (
    <Html position={[0, y, 0]} center distanceFactor={9} zIndexRange={[6, 0]} style={{ pointerEvents: 'none' }}>
      <div
        key={emote.key}
        data-testid="emote-bubble"
        className="animate-bubble relative flex w-max items-center gap-1 rounded-2xl border-[2.5px] border-outline bg-white px-2.5 py-1 font-extrabold text-ink shadow-[0_3px_0_var(--color-outline)]"
      >
        <span className="text-2xl leading-none">{def.icon}</span>
        {def.text && <span className="text-[13px]">{localize(def.text)}</span>}
        <span className="absolute -bottom-[8px] left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-r-[2.5px] border-b-[2.5px] border-outline bg-white" />
      </div>
    </Html>
  )
}

const CHAT_MS = 6000

/** A world-chat line above someone's head (only people in my room are drawn). */
export function ChatBubble({ chat, y = 2.15 }: { chat: { text: string; key: number } | null | undefined; y?: number }) {
  const [visible, setVisible] = useState<number | null>(null)
  useEffect(() => {
    if (!chat) return
    const left = CHAT_MS - (Date.now() - chat.key)
    if (left <= 0) return
    setVisible(chat.key)
    const id = window.setTimeout(() => setVisible(null), left)
    return () => window.clearTimeout(id)
  }, [chat])
  if (!chat || visible !== chat.key) return null
  return (
    <Html position={[0, y, 0]} center distanceFactor={9} zIndexRange={[7, 0]} style={{ pointerEvents: 'none' }}>
      <div
        key={chat.key}
        data-testid="chat-bubble"
        className="animate-bubble relative w-max max-w-[220px] rounded-2xl border-[2.5px] border-outline bg-white px-2.5 py-1 text-[13px] leading-snug font-bold break-words text-ink shadow-[0_3px_0_var(--color-outline)]"
      >
        {chat.text}
        <span className="absolute -bottom-[8px] left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-r-[2.5px] border-b-[2.5px] border-outline bg-white" />
      </div>
    </Html>
  )
}

/** The newer of an emote and a chat line wins the spot above the head. */
function Bubbles({ emote, chat }: { emote: { e: EmoteId; key: number } | null | undefined; chat: { text: string; key: number } | null | undefined }) {
  if (chat && (!emote || chat.key > emote.key)) return <ChatBubble chat={chat} />
  return <EmoteBubble emote={emote} />
}

function NamePlate({ name }: { name: string }) {
  return (
    <Html position={[0, 1.78, 0]} center distanceFactor={10} zIndexRange={[3, 0]} style={{ pointerEvents: 'none' }}>
      <div data-testid="nameplate" className="flex w-max items-center gap-1 rounded-full border-2 border-outline bg-paper/95 px-2 py-px text-[12px] font-black text-ink shadow-[0_2px_0_var(--color-outline)]">
        <span className="h-2 w-2 rounded-full bg-[#3fae72]" />
        {name}
      </div>
    </Html>
  )
}

/**
 * Many players in one street (1.21): only the MAX_SHOWN nearest within SHOW_RANGE are drawn, and
 * name plates (DOM, repositioned every frame) only within NAME_RANGE. Recomputed 4× a second.
 */
const MAX_SHOWN = 12
const SHOW_RANGE_SQ = 60 * 60
const NAME_RANGE_SQ = 20 * 20
const shownRemotes = new Set<number>()
const namedRemotes = new Set<number>()
function pickShown() {
  const p = playerState.position
  const list = [...remotes.values()].map((r) => ({ id: r.id, d: (r.x - p.x) ** 2 + (r.z - p.z) ** 2 })).filter((e) => e.d < SHOW_RANGE_SQ)
  list.sort((a, b) => a.d - b.d)
  shownRemotes.clear()
  namedRemotes.clear()
  for (const e of list.slice(0, MAX_SHOWN)) {
    shownRemotes.add(e.id)
    if (e.d < NAME_RANGE_SQ) namedRemotes.add(e.id)
  }
}

/** One other player: eases toward their latest snapshot (a jump of > 4 m snaps straight there). */
function RemotePlayer({ id, name }: { id: number; name: string }) {
  const root = useRef<Group>(null)
  const facing = useRef<Group>(null)
  const motion = useRef<MotionState>({ speed: 0 })
  const emote = useNet((s) => s.emotes[id])
  const chat = useNet((s) => s.chats[id])
  const outfitKey = useRef('')
  const [named, setNamed] = useState(false)
  const [, rerender] = useReducer((n: number) => n + 1, 0)
  const r0 = remotes.get(id)
  outfitKey.current = r0?.outfitKey ?? ''
  // 1.35: the vehicle they ride (unknown ids from newer clients are ignored).
  const veh = r0?.snap.veh
  const vehDef = isVehicleId(veh) ? VEHICLES[veh] : null
  const vehKey = useRef<string | null>(null)
  vehKey.current = veh ?? null
  // 1.39 holding a pickleball paddle (a match on the court): the model carries one
  const paddle = r0?.snap.motion.held === 'paddle'
  const paddleKey = useRef(false)
  paddleKey.current = paddle

  useFrame((_, rawDt) => {
    const r = remotes.get(id)
    const g = root.current
    if (!r || !g) return
    // (1.39: my pickleball opponent is drawn by the match view)
    g.visible = shownRemotes.has(id) && !matchHiddenRemotes.has(id)
    const wantName = namedRemotes.has(id)
    if (wantName !== named) setNamed(wantName)
    // Outfit changed (they bought clothes): rebuild the model (geometry is cached per outfit).
    if (r.outfitKey !== outfitKey.current || (r.snap.veh ?? null) !== vehKey.current || (r.snap.motion.held === 'paddle') !== paddleKey.current) rerender()
    const dt = Math.min(rawDt, 0.1)
    // 1.42 snapshot interpolation: draw the player INTERP_DELAY ms in the past, between two real samples
    const target = sampleAt(r.buf, performance.now() - INTERP_DELAY)
    if (target) {
      // a light final smoothing hides the step when a late packet corrects the extrapolation
      const far = Math.hypot(target.x - r.x, target.z - r.z) > 6
      r.x = far ? target.x : damp(r.x, target.x, 25, dt)
      r.z = far ? target.z : damp(r.z, target.z, 25, dt)
      r.yaw = dampAngle(r.yaw, target.yaw, 18, dt)
    } else {
      r.x = damp(r.x, r.snap.x, 10, dt)
      r.z = damp(r.z, r.snap.z, 10, dt)
      r.yaw = dampAngle(r.yaw, r.snap.yaw, 12, dt)
    }
    g.position.set(r.x, 0, r.z)
    if (facing.current) facing.current.rotation.y = r.yaw
    Object.assign(motion.current, r.snap.motion)
  })

  return (
    <group ref={root} position={[r0?.x ?? 0, 0, r0?.z ?? 0]}>
      <group ref={facing}>
        {vehDef && <VehicleMesh def={vehDef} shadows={false} />}
        <group position={[0, 0, vehDef ? (rideAnchorsOf(vehDef)?.riderZ ?? 0) : 0]} visible={vehDef?.kind !== 'car'}>
          <ChibiModel motion={motion} outfit={r0?.outfit} carry={paddle ? 'paddle' : null} />
        </group>
      </group>
      {named && <NamePlate name={name} />}
      <Bubbles emote={emote} chat={chat} />
    </group>
  )
}

/** Everyone else in my room (only public scenes have rooms; homes and exams are private). */
export function RemotePlayers() {
  const roster = useNet((s) => s.roster)
  const status = useNet((s) => s.status)
  const since = useRef(1)
  useFrame((_, dt) => {
    since.current += dt
    if (since.current < 0.25) return
    since.current = 0
    pickShown()
  })
  if (status !== 'online') return null
  return (
    <>
      {roster.map((p) => (
        <RemotePlayer key={p.id} id={p.id} name={p.name} />
      ))}
    </>
  )
}

/** My own emote bubble, following the player. */
export function LocalEmote() {
  const root = useRef<Group>(null)
  const emote = useNet((s) => s.myEmote)
  const chat = useNet((s) => s.chats[-1])
  useFrame(() => {
    root.current?.position.copy(playerState.position)
  })
  return (
    <group ref={root}>
      <Bubbles emote={emote} chat={chat} />
    </group>
  )
}
