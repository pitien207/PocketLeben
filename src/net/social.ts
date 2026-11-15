import { create } from 'zustand'
import { pushToast } from '../store/toastStore'
import { useNet } from '../store/netStore'
import { api } from './auth'
import { onNetMessage, sendNet } from './client'

/**
 * Friends, private messages and the world channel (server/social.mjs). Lists come over HTTP,
 * live messages over the multiplayer WebSocket. The phone (ui/Phone.tsx) shows it all.
 */

export interface Person {
  key: string
  name: string
  online: boolean
}
export interface ChatLine {
  key: string
  name: string
  text: string
  at: number
}
export interface DmLine {
  from: string
  text: string
  at: number
}

export type SocialError = 'notFound' | 'self' | 'already' | 'tooMany' | 'offline' | 'notFriends'

interface SocialState {
  friends: Person[]
  incoming: Person[]
  outgoing: Person[]
  blocked: Person[]
  world: ChatLine[]
  /** Conversations by friend key (loaded when opened, then live). */
  dms: Record<string, DmLine[]>
  /** Unread private messages by friend key, and in the world channel. */
  unread: Record<string, number>
  unreadWorld: number
  /** Which screen of the phone is in front (to know what counts as read). */
  viewing: { tab: 'messages' | 'world' | 'friends'; chat: string | null } | null
  set: (patch: Partial<Omit<SocialState, 'set'>>) => void
}

export const useSocial = create<SocialState>()((set) => ({
  friends: [],
  incoming: [],
  outgoing: [],
  blocked: [],
  world: [],
  dms: {},
  unread: {},
  unreadWorld: 0,
  viewing: null,
  set: (patch) => set(patch),
}))

const S = () => useSocial.getState()

export async function refreshSocial() {
  try {
    const r = await api<{ friends: Person[]; incoming: Person[]; outgoing: Person[]; blocked: Person[] }>('GET', 'social')
    if (r.ok) S().set({ friends: r.data.friends, incoming: r.data.incoming, outgoing: r.data.outgoing, blocked: r.data.blocked })
  } catch {
    // offline: keep what we have
  }
}

export async function loadWorld() {
  try {
    const r = await api<{ msgs: ChatLine[] }>('GET', 'chat/world', undefined, undefined)
    if (r.ok) S().set({ world: r.data.msgs })
  } catch {
    // ignore
  }
}

export async function loadDms(key: string) {
  try {
    const r = await api<{ msgs: DmLine[] }>('GET', `dm?with=${encodeURIComponent(key)}`)
    if (r.ok) S().set({ dms: { ...S().dms, [key]: r.data.msgs } })
  } catch {
    // ignore
  }
}

async function post(path: string, body: unknown): Promise<{ ok: boolean; status?: string; error?: SocialError }> {
  try {
    const r = await api<{ status?: string; error?: SocialError }>('POST', path, body)
    await refreshSocial()
    return { ok: r.ok, status: r.data.status, error: r.data.error }
  } catch {
    return { ok: false, error: 'offline' }
  }
}

export const requestFriend = (name: string) => post('friends/request', { name })
export const acceptFriend = (key: string) => post('friends/accept', { key })
export const removeFriend = (key: string) => post('friends/remove', { key })
export const blockPlayer = (key: string, block = true) => post('block', { key, block })

// Same gaps as the server (server/social.mjs): too fast → keep the text in the box and say so.
let lastWorldAt = 0
let lastDmAt = 0
const tooFast = (last: number, gap: number) => {
  if (Date.now() - last >= gap) return false
  pushToast('toast.chatSlow', 'info')
  return true
}

/** Send to the world channel. False if not sent (empty, too fast, not connected). */
export function sendWorld(text: string) {
  const t = text.trim()
  if (!t || tooFast(lastWorldAt, 2000)) return false
  const sent = sendNet({ t: 'chat', text: t.slice(0, 200) })
  if (sent) lastWorldAt = Date.now()
  return sent
}

export function sendDm(to: string, text: string) {
  const t = text.trim()
  if (!t || tooFast(lastDmAt, 600)) return false
  const sent = sendNet({ t: 'dm', to, text: t.slice(0, 200) })
  if (sent) lastDmAt = Date.now()
  return sent
}

export function markRead(tab: 'messages' | 'world' | 'friends', chat: string | null) {
  const s = S()
  s.set({ viewing: { tab, chat } })
  if (tab === 'world') s.set({ unreadWorld: 0 })
  if (chat && s.unread[chat]) s.set({ unread: { ...s.unread, [chat]: 0 } })
}

export const totalUnread = (s: SocialState) => s.unreadWorld + Object.values(s.unread).reduce((a, b) => a + b, 0) + s.incoming.length

let started = false
/** Called once from boot.tsx: listens to live messages, refreshes lists when online. */
export function startSocial() {
  if (started) return
  started = true
  onNetMessage((msg) => {
    const s = S()
    const me = useNet.getState().key
    switch (msg.t) {
      case 'welcome':
        void refreshSocial()
        void loadWorld()
        break
      case 'chat': {
        const line = { key: msg.key as string, name: msg.name as string, text: msg.text as string, at: msg.at as number }
        if (s.blocked.some((b) => b.key === line.key)) return
        s.set({ world: [...s.world, line].slice(-80) })
        if (line.key === me) {
          const net = useNet.getState()
          net.set({ chats: { ...net.chats, [-1]: { text: line.text, key: Date.now() } } })
        } else if (s.viewing?.tab !== 'world') s.set({ unreadWorld: s.unreadWorld + 1 })
        break
      }
      case 'dm': {
        const withKey = msg.with as string
        const line = { from: msg.from as string, text: msg.text as string, at: msg.at as number }
        s.set({ dms: { ...s.dms, [withKey]: [...(s.dms[withKey] ?? []), line] } })
        if (line.from !== me && s.viewing?.chat !== withKey) {
          s.set({ unread: { ...s.unread, [withKey]: (s.unread[withKey] ?? 0) + 1 } })
          pushToast('toast.dm', 'info', { name: msg.name as string })
        }
        break
      }
      case 'social':
        void refreshSocial()
        if (msg.kind === 'request') pushToast('toast.friendRequest', 'info', { name: msg.name as string })
        if (msg.kind === 'accepted') pushToast('toast.friendAccepted', 'good', { name: msg.name as string })
        break
      case 'presence':
        s.set({ friends: s.friends.map((f) => (f.key === msg.key ? { ...f, online: !!msg.online } : f)) })
        break
      case 'chatSlow':
        pushToast('toast.chatSlow', 'info')
        break
    }
  })
}
