import { useEffect, useReducer, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import type { Group } from 'three'
import { useLocalize, type Localized } from '../../i18n/localized'
import { remotes } from '../../net/client'
import { useNet, type EmoteId } from '../../store/netStore'
import { damp, dampAngle } from '../systems/math'
import { playerState } from '../systems/playerState'
import { ChibiModel, type MotionState } from './ChibiModel'

/** What each emote shows above the head (emoji are fine in content). */
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

/** One other player: eases toward their latest snapshot (a jump of > 4 m snaps straight there). */
function RemotePlayer({ id, name }: { id: number; name: string }) {
  const root = useRef<Group>(null)
  const facing = useRef<Group>(null)
  const motion = useRef<MotionState>({ speed: 0 })
  const emote = useNet((s) => s.emotes[id])
  const outfitKey = useRef('')
  const [, rerender] = useReducer((n: number) => n + 1, 0)
  const r0 = remotes.get(id)
  outfitKey.current = JSON.stringify(r0?.outfit ?? null)

  useFrame((_, rawDt) => {
    const r = remotes.get(id)
    const g = root.current
    if (!r || !g) return
    // Outfit changed (they bought clothes): rebuild the model (geometry is cached per outfit).
    if (JSON.stringify(r.outfit) !== outfitKey.current) rerender()
    const dt = Math.min(rawDt, 0.1)
    const far = Math.hypot(r.snap.x - r.x, r.snap.z - r.z) > 4
    r.x = far ? r.snap.x : damp(r.x, r.snap.x, 10, dt)
    r.z = far ? r.snap.z : damp(r.z, r.snap.z, 10, dt)
    r.yaw = dampAngle(r.yaw, r.snap.yaw, 12, dt)
    g.position.set(r.x, 0, r.z)
    if (facing.current) facing.current.rotation.y = r.yaw
    Object.assign(motion.current, r.snap.motion)
  })

  return (
    <group ref={root} position={[r0?.x ?? 0, 0, r0?.z ?? 0]}>
      <group ref={facing}>
        <ChibiModel motion={motion} outfit={r0?.outfit} />
      </group>
      <NamePlate name={name} />
      <EmoteBubble emote={emote} />
    </group>
  )
}

/** Everyone else in my room (only public scenes have rooms; homes and exams are private). */
export function RemotePlayers() {
  const roster = useNet((s) => s.roster)
  const status = useNet((s) => s.status)
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
  useFrame(() => {
    root.current?.position.copy(playerState.position)
  })
  return (
    <group ref={root}>
      <EmoteBubble emote={emote} />
    </group>
  )
}
