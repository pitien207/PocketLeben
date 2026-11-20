import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useT, type I18nKey } from '../i18n'
import { formatClock } from '../game/systems/time'
import { getAccount } from '../net/auth'
import {
  acceptFriend,
  blockPlayer,
  loadDms,
  loadWorld,
  markRead,
  refreshSocial,
  removeFriend,
  requestFriend,
  sendDm,
  sendWorld,
  totalUnread,
  useSocial,
  type Person,
  type SocialError,
} from '../net/social'
import { useNet } from '../store/netStore'
import { useSettings } from '../store/settingsStore'
import { useTime } from '../store/timeStore'
import { useUI } from '../store/uiStore'
import { ChatIcon } from './OnlineUI'
import { JobBoard } from './JobBoard'
import { CoinIcon } from './icons'

type Tab = 'messages' | 'world' | 'friends' | 'jobs'

/** Phone outline for the HUD button. */
export function PhoneIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <rect x="6" y="2.5" width="12" height="19" rx="2.6" />
      <path d="M10.5 5.2h3" />
      <circle cx="12" cy="18.2" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  )
}

const STROKE = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" {...STROKE}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.6 2.6 3.8 5.6 3.8 9s-1.2 6.4-3.8 9c-2.6-2.6-3.8-5.6-3.8-9S9.4 5.6 12 3z" />
    </svg>
  )
}

function PeopleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" {...STROKE}>
      <circle cx="9" cy="8" r="3.4" />
      <path d="M2.8 20c.6-3.6 3.1-5.6 6.2-5.6s5.6 2 6.2 5.6" />
      <circle cx="17" cy="9" r="2.6" />
      <path d="M16.2 14.5c2.6-.3 4.5 1.4 5 4.5" />
    </svg>
  )
}

function NoSignalIcon() {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" {...STROKE}>
      <rect x="6" y="2.5" width="12" height="19" rx="2.6" />
      <path d="M3 3l18 18" />
    </svg>
  )
}

/** Red count on the phone button: unread messages + friend requests. */
export function PhoneBadge() {
  const n = useSocial(totalUnread)
  if (n <= 0) return null
  return (
    <span data-testid="phone-badge" className="absolute -top-1.5 -right-1.5 grid h-5 min-w-5 place-items-center rounded-full border-2 border-white bg-lacquer px-1 text-[11px] leading-none font-black text-white tabular-nums">
      {n > 9 ? '9+' : n}
    </span>
  )
}

const hhmm = (at: number) => {
  const d = new Date(at)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function Avatar({ name, online }: { name: string; online?: boolean }) {
  // A stable soft colour per name.
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360
  return (
    <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-outline font-display text-base font-extrabold text-ink uppercase" style={{ background: `hsl(${h} 70% 82%)` }}>
      {name.slice(0, 1)}
      {online !== undefined && <span className={`absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-white ${online ? 'bg-[#3fae72]' : 'bg-ink/30'}`} />}
    </span>
  )
}

function SmallButton({ children, onClick, tone = 'plain', testId }: { children: ReactNode; onClick: () => void; tone?: 'plain' | 'good' | 'bad'; testId?: string }) {
  const color = tone === 'good' ? 'bg-jade text-white' : tone === 'bad' ? 'bg-lacquer text-white' : 'bg-cream text-ink'
  return (
    <button type="button" data-testid={testId} onClick={onClick} className={`rounded-full border-2 border-outline px-2.5 py-1 text-[12px] font-black shadow-[0_2px_0_var(--color-outline)] active:translate-y-0.5 active:shadow-none ${color}`}>
      {children}
    </button>
  )
}

/** Text box + send arrow at the bottom of a chat. */
function Composer({ onSend, disabled, placeholder, testId }: { onSend: (text: string) => boolean; disabled: boolean; placeholder: string; testId: string }) {
  const t = useT()
  const [text, setText] = useState('')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (disabled || !text.trim()) return
    if (onSend(text)) setText('')
  }
  return (
    <form onSubmit={submit} className="flex items-center gap-1.5 border-t-2 border-outline/15 bg-white/70 p-2">
      <input
        data-testid={`${testId}-input`}
        value={text}
        maxLength={200}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        placeholder={disabled ? t('phone.needOnline') : placeholder}
        enterKeyHint="send"
        className="min-w-0 flex-1 rounded-full border-2 border-outline/40 bg-white px-3 py-2 text-[14px] font-bold text-ink outline-none focus:border-outline disabled:opacity-60"
      />
      <button
        type="submit"
        data-testid={`${testId}-send`}
        aria-label={t('phone.send')}
        disabled={disabled || !text.trim()}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-outline bg-jade text-white shadow-[0_2px_0_var(--color-outline)] active:translate-y-0.5 active:shadow-none disabled:opacity-40"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
          <path d="M3.4 20.4 21 12 3.4 3.6l.1 6.5L15 12 3.5 13.9z" />
        </svg>
      </button>
    </form>
  )
}

/** Scrolls to the newest line whenever the list grows. */
function useStickToBottom(dep: unknown) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (el) el.scrollTop = el.scrollHeight
  }, [dep])
  return ref
}

function WorldTab({ online }: { online: boolean }) {
  const t = useT()
  const world = useSocial((s) => s.world)
  const friends = useSocial((s) => s.friends)
  const outgoing = useSocial((s) => s.outgoing)
  const me = useNet((s) => s.key)
  const [asked, setAsked] = useState<string | null>(null)
  const list = useStickToBottom(world.length)
  useEffect(() => {
    void loadWorld()
  }, [])
  return (
    <>
      <p className="bg-gold/25 px-3 py-1.5 text-[11px] font-bold text-ink/75">{t('phone.worldNote')}</p>
      <div ref={list} className="flex flex-1 flex-col gap-1.5 overflow-y-auto overscroll-contain p-2.5" style={{ touchAction: 'pan-y' }} data-testid="world-list">
        {world.length === 0 && <p className="m-auto text-center text-[13px] font-bold text-ink/55">{t('phone.worldEmpty')}</p>}
        {world.map((m, i) => {
          const mine = m.key === me
          const canAdd = !mine && !friends.some((f) => f.key === m.key) && !outgoing.some((f) => f.key === m.key)
          return (
            <div key={`${m.at}-${i}`} className={`flex max-w-[85%] flex-col ${mine ? 'items-end self-end' : 'items-start'}`}>
              {!mine && (
                <span className="flex items-center gap-1 px-1 text-[11px] font-black text-lacquer">
                  {m.name}
                  {canAdd && asked !== m.key && (
                    <button
                      type="button"
                      aria-label={t('phone.addFriend')}
                      title={t('phone.addFriend')}
                      onClick={() => {
                        setAsked(m.key)
                        void requestFriend(m.name)
                      }}
                      className="grid h-4 w-4 place-items-center rounded-full bg-jade text-[11px] leading-none text-white"
                    >
                      +
                    </button>
                  )}
                </span>
              )}
              <span className={`rounded-2xl border-2 border-outline/25 px-2.5 py-1 text-[14px] leading-snug font-bold break-words ${mine ? 'rounded-br-md bg-[#cdeeda]' : 'rounded-bl-md bg-white'}`}>{m.text}</span>
              <span className="px-1 text-[10px] font-bold text-ink/40">{hhmm(m.at)}</span>
            </div>
          )
        })}
      </div>
      <Composer testId="world" disabled={!online} placeholder={t('phone.worldPlaceholder')} onSend={sendWorld} />
    </>
  )
}

function Conversation({ friend, online, onBack }: { friend: Person; online: boolean; onBack: () => void }) {
  const t = useT()
  const msgs = useSocial((s) => s.dms[friend.key])
  const me = useNet((s) => s.key)
  const list = useStickToBottom(msgs?.length)
  useEffect(() => {
    void loadDms(friend.key)
    markRead('messages', friend.key)
    return () => markRead('messages', null)
  }, [friend.key])
  return (
    <>
      <div className="flex items-center gap-2 border-b-2 border-outline/15 bg-white/70 px-2 py-1.5">
        <button type="button" onClick={onBack} aria-label={t('phone.back')} data-testid="dm-back" className="grid h-9 w-9 place-items-center rounded-full pb-1 text-4xl leading-none font-black text-ink active:bg-ink/10">
          ‹
        </button>
        <Avatar name={friend.name} online={friend.online} />
        <div className="leading-tight">
          <p className="font-display text-[15px] font-extrabold">{friend.name}</p>
          <p className="text-[11px] font-bold text-ink/55">{friend.online ? t('phone.isOnline') : t('phone.isOffline')}</p>
        </div>
      </div>
      <div ref={list} className="flex flex-1 flex-col gap-1.5 overflow-y-auto overscroll-contain p-2.5" style={{ touchAction: 'pan-y' }} data-testid="dm-list">
        {!msgs?.length && <p className="m-auto text-center text-[13px] font-bold text-ink/55">{t('phone.sayHi', { name: friend.name })}</p>}
        {msgs?.map((m, i) => {
          const mine = m.from === me
          return (
            <div key={`${m.at}-${i}`} className={`flex max-w-[85%] flex-col ${mine ? 'items-end self-end' : 'items-start'}`}>
              <span className={`rounded-2xl border-2 border-outline/25 px-2.5 py-1 text-[14px] leading-snug font-bold break-words ${mine ? 'rounded-br-md bg-[#cfe3ff]' : 'rounded-bl-md bg-white'}`}>{m.text}</span>
              <span className="px-1 text-[10px] font-bold text-ink/40">{hhmm(m.at)}</span>
            </div>
          )
        })}
      </div>
      <Composer testId="dm" disabled={!online} placeholder={t('phone.dmPlaceholder')} onSend={(text) => sendDm(friend.key, text)} />
    </>
  )
}

function MessagesTab({ online, chat, setChat, goFriends }: { online: boolean; chat: string | null; setChat: (k: string | null) => void; goFriends: () => void }) {
  const t = useT()
  const friends = useSocial((s) => s.friends)
  const dms = useSocial((s) => s.dms)
  const unread = useSocial((s) => s.unread)
  const friend = friends.find((f) => f.key === chat)
  if (friend) return <Conversation friend={friend} online={online} onBack={() => setChat(null)} />
  // Friends with a conversation first (newest on top), then online friends, then the rest.
  const last = (k: string) => dms[k]?.at(-1)?.at ?? 0
  const sorted = [...friends].sort((a, b) => last(b.key) - last(a.key) || Number(b.online) - Number(a.online) || a.name.localeCompare(b.name))
  return (
    <div className="flex flex-1 flex-col overflow-y-auto overscroll-contain" style={{ touchAction: 'pan-y' }}>
      {sorted.length === 0 && (
        <div className="m-auto flex flex-col items-center gap-2 p-4 text-center">
          <p className="text-[13px] font-bold text-ink/60">{t('phone.noFriends')}</p>
          <SmallButton tone="good" onClick={goFriends}>
            {t('phone.findFriends')}
          </SmallButton>
        </div>
      )}
      {sorted.map((f) => {
        const lastMsg = dms[f.key]?.at(-1)
        const n = unread[f.key] ?? 0
        return (
          <button key={f.key} type="button" data-testid={`chat-${f.key}`} onClick={() => setChat(f.key)} className="flex items-center gap-2.5 border-b border-outline/10 px-3 py-2 text-left active:bg-ink/5">
            <Avatar name={f.name} online={f.online} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-display text-[15px] font-extrabold">{f.name}</span>
              <span className={`block truncate text-[12px] ${n ? 'font-black text-ink' : 'font-bold text-ink/50'}`}>{lastMsg ? lastMsg.text : f.online ? t('phone.isOnline') : t('phone.isOffline')}</span>
            </span>
            {lastMsg && <span className="text-[10px] font-bold text-ink/40">{hhmm(lastMsg.at)}</span>}
            {n > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-lacquer px-1 text-[11px] font-black text-white">{n}</span>}
          </button>
        )
      })}
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="px-3 pt-3">
      <h3 className="mb-1.5 text-[11px] font-black tracking-wide text-ink/50 uppercase">{title}</h3>
      <div className="flex flex-col gap-1.5">{children}</div>
    </section>
  )
}

function Row({ person, children }: { person: Person; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border-2 border-outline/15 bg-white px-2 py-1.5" data-testid={`person-${person.key}`}>
      <Avatar name={person.name} online={person.online} />
      <span className="min-w-0 flex-1 truncate font-display text-[14px] font-extrabold">{person.name}</span>
      <span className="flex shrink-0 gap-1">{children}</span>
    </div>
  )
}

function FriendsTab({ openChat }: { openChat: (k: string) => void }) {
  const t = useT()
  const { friends, incoming, outgoing, blocked } = useSocial()
  const [name, setName] = useState('')
  const [note, setNote] = useState<{ text: string; good: boolean } | null>(null)
  const [menu, setMenu] = useState<string | null>(null)
  useEffect(() => {
    void refreshSocial()
  }, [])
  const add = async (e: FormEvent) => {
    e.preventDefault()
    const n = name.trim()
    if (!n) return
    const r = await requestFriend(n)
    if (r.ok) {
      setName('')
      setNote({ text: r.status === 'friends' ? t('phone.nowFriends', { name: n }) : t('phone.requestSent', { name: n }), good: true })
    } else setNote({ text: t(`phone.err.${(r.error ?? 'offline') as SocialError}` as I18nKey), good: false })
  }
  return (
    <div className="flex flex-1 flex-col overflow-y-auto overscroll-contain pb-3" style={{ touchAction: 'pan-y' }}>
      <form onSubmit={add} className="flex gap-1.5 px-3 pt-3">
        <input
          data-testid="friend-name"
          value={name}
          maxLength={24}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('phone.addPlaceholder')}
          autoCapitalize="off"
          autoCorrect="off"
          className="min-w-0 flex-1 rounded-full border-2 border-outline/40 bg-white px-3 py-2 text-[14px] font-bold text-ink outline-none focus:border-outline"
        />
        <button type="submit" data-testid="friend-add" className="rounded-full border-2 border-outline bg-jade px-3 text-[13px] font-black text-white shadow-[0_2px_0_var(--color-outline)] active:translate-y-0.5 active:shadow-none">
          {t('phone.add')}
        </button>
      </form>
      {note && <p className={`px-4 pt-1.5 text-[12px] font-bold ${note.good ? 'text-jade' : 'text-lacquer'}`}>{note.text}</p>}

      {incoming.length > 0 && (
        <Section title={t('phone.incoming')}>
          {incoming.map((p) => (
            <Row key={p.key} person={p}>
              <SmallButton tone="good" testId={`accept-${p.key}`} onClick={() => void acceptFriend(p.key)}>
                {t('phone.accept')}
              </SmallButton>
              <SmallButton onClick={() => void removeFriend(p.key)}>{t('phone.decline')}</SmallButton>
            </Row>
          ))}
        </Section>
      )}

      <Section title={`${t('phone.friendList')} · ${friends.length}`}>
        {friends.length === 0 && <p className="text-[12px] font-bold text-ink/55">{t('phone.noFriendsYet')}</p>}
        {friends.map((p) => (
          <div key={p.key}>
            <Row person={p}>
              <SmallButton tone="good" testId={`message-${p.key}`} onClick={() => openChat(p.key)}>
                <ChatIcon className="inline text-[14px]" />
              </SmallButton>
              <SmallButton onClick={() => setMenu(menu === p.key ? null : p.key)}>⋯</SmallButton>
            </Row>
            {menu === p.key && (
              <div className="flex justify-end gap-1.5 px-1 pt-1">
                <SmallButton
                  onClick={() => {
                    setMenu(null)
                    void removeFriend(p.key)
                  }}
                >
                  {t('phone.remove')}
                </SmallButton>
                <SmallButton
                  tone="bad"
                  onClick={() => {
                    setMenu(null)
                    void blockPlayer(p.key)
                  }}
                >
                  {t('phone.block')}
                </SmallButton>
              </div>
            )}
          </div>
        ))}
      </Section>

      {outgoing.length > 0 && (
        <Section title={t('phone.outgoing')}>
          {outgoing.map((p) => (
            <Row key={p.key} person={p}>
              <SmallButton onClick={() => void removeFriend(p.key)}>{t('phone.cancel')}</SmallButton>
            </Row>
          ))}
        </Section>
      )}

      {blocked.length > 0 && (
        <Section title={t('phone.blocked')}>
          {blocked.map((p) => (
            <Row key={p.key} person={{ ...p, online: false }}>
              <SmallButton onClick={() => void blockPlayer(p.key, false)}>{t('phone.unblock')}</SmallButton>
            </Row>
          ))}
        </Section>
      )}
    </div>
  )
}

function TabButton({ active, label, badge, onClick, testId, children }: { active: boolean; label: string; badge: number; onClick: () => void; testId: string; children: ReactNode }) {
  return (
    <button type="button" data-testid={testId} aria-pressed={active} onClick={onClick} className={`relative flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[11px] font-black ${active ? 'text-lacquer' : 'text-ink/50'}`}>
      <span className="text-[20px] leading-none">{children}</span>
      {label}
      {badge > 0 && <span className="absolute top-0.5 right-[calc(50%-20px)] grid h-4 min-w-4 place-items-center rounded-full bg-lacquer px-1 text-[10px] leading-none text-white">{badge > 9 ? '9+' : badge}</span>}
    </button>
  )
}

/** Nobody to talk to yet: not signed in, or playing offline. */
function Unavailable({ signedIn }: { signedIn: boolean }) {
  const t = useT()
  const setSettingsOpen = useUI((s) => s.setSettingsOpen)
  const closePanel = useUI((s) => s.closePanel)
  const setOnline = useSettings((s) => s.setOnline)
  return (
    <div className="m-auto flex flex-col items-center gap-3 p-6 text-center">
      <span className="text-5xl text-ink/45">
        <NoSignalIcon />
      </span>
      <p className="text-[14px] font-bold text-ink/70">{signedIn ? t('phone.offlineMode') : t('phone.noAccount')}</p>
      <SmallButton
        tone="good"
        onClick={() => {
          if (signedIn) setOnline(true)
          else {
            closePanel()
            setSettingsOpen(true)
          }
        }}
      >
        {signedIn ? t('phone.goOnline') : t('phone.signIn')}
      </SmallButton>
    </div>
  )
}

/** The in-game phone: private messages with friends, the world channel, friend list. */
export function PhonePanel() {
  const t = useT()
  const open = useUI((s) => s.panel?.type === 'phone')
  const closePanel = useUI((s) => s.closePanel)
  const status = useNet((s) => s.status)
  const wantOnline = useSettings((s) => s.online)
  const minutes = useTime((s) => Math.floor(s.minutes))
  const [tab, setTab] = useState<Tab>('messages')
  const [chat, setChat] = useState<string | null>(null)
  const unread = useSocial((s) => Object.values(s.unread).reduce((a, b) => a + b, 0))
  const unreadWorld = useSocial((s) => s.unreadWorld)
  const requests = useSocial((s) => s.incoming.length)

  useEffect(() => {
    if (!open) return
    if (tab !== 'jobs') markRead(tab, tab === 'messages' ? chat : null)
    return () => useSocial.getState().set({ viewing: null })
  }, [open, tab, chat])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') closePanel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, closePanel])

  if (!open) return null
  const signedIn = !!getAccount()
  const online = status === 'online'
  const usable = signedIn && wantOnline

  return (
    <div
      className="pointer-events-auto absolute inset-0 z-30 flex items-end justify-center bg-ink/30 p-3 sm:items-center"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) closePanel()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('phone.title')}
        data-testid="phone"
        className="animate-sheet relative flex h-[min(640px,calc(100dvh-1.5rem))] w-full max-w-[360px] flex-col rounded-[2.2rem] border-[3px] border-outline bg-[#2b2330] p-2.5 shadow-[0_6px_0_var(--color-outline),0_18px_40px_rgba(0,0,0,0.35)]"
      >
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.7rem] bg-paper text-ink">
          {/* Status bar: in-game time, a notch, signal and close. */}
          <div className="flex items-center justify-between bg-[#2b2330] px-4 pt-1 pb-1.5 text-[12px] font-black text-white">
            <span className="tabular-nums">{formatClock(minutes)}</span>
            <span className="h-4 w-20 rounded-full bg-black/60" />
            <span className="flex items-center gap-2">
              <span className="flex items-end gap-[2px]" aria-label={online ? t('phone.isOnline') : t('phone.isOffline')}>
                {[4, 6, 8, 10].map((h, i) => (
                  <span key={h} className={`w-[3px] rounded-sm ${online || i === 0 ? 'bg-white' : 'bg-white/30'}`} style={{ height: h }} />
                ))}
              </span>
              <button type="button" onClick={closePanel} aria-label={t('settings.close')} data-testid="phone-close" className="grid h-6 w-6 place-items-center rounded-full bg-white/15 text-[13px] active:bg-white/30">
                ✕
              </button>
            </span>
          </div>
          <div className="bg-linear-to-b from-lacquer to-[#b83a3a] px-4 py-2 font-display text-lg font-extrabold text-white [text-shadow:0_2px_0_rgba(0,0,0,0.25)]">
            {tab === 'messages' ? t('phone.messages') : tab === 'world' ? t('phone.world') : tab === 'jobs' ? t('phone.jobs') : t('phone.friends')}
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            {tab === 'jobs' ? (
              <JobBoard />
            ) : !usable ? (
              <Unavailable signedIn={signedIn} />
            ) : (
              <>
                {!online && <p className="bg-gold/30 px-3 py-1 text-center text-[11px] font-black">{t('online.connecting')}</p>}
                {tab === 'messages' && <MessagesTab online={online} chat={chat} setChat={setChat} goFriends={() => setTab('friends')} />}
                {tab === 'world' && <WorldTab online={online} />}
                {tab === 'friends' && (
                  <FriendsTab
                    openChat={(k) => {
                      setChat(k)
                      setTab('messages')
                    }}
                  />
                )}
              </>
            )}
          </div>

          <nav className="flex border-t-2 border-outline/15 bg-white/80">
            <TabButton testId="tab-jobs" active={tab === 'jobs'} label={t('phone.jobs')} badge={0} onClick={() => setTab('jobs')}>
              <CoinIcon />
            </TabButton>
            <TabButton testId="tab-messages" active={tab === 'messages'} label={t('phone.messages')} badge={unread} onClick={() => setTab('messages')}>
              <ChatIcon />
            </TabButton>
            <TabButton testId="tab-world" active={tab === 'world'} label={t('phone.world')} badge={unreadWorld} onClick={() => setTab('world')}>
              <GlobeIcon />
            </TabButton>
            <TabButton testId="tab-friends" active={tab === 'friends'} label={t('phone.friends')} badge={requests} onClick={() => setTab('friends')}>
              <PeopleIcon />
            </TabButton>
          </nav>
        </div>
      </div>
    </div>
  )
}
