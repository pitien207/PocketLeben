import { useState } from 'react'
import { useT } from '../i18n'
import { useLocalize } from '../i18n/localized'
import { EMOTES } from '../game/components/RemotePlayers'
import { reconnect, sendEmote } from '../net/client'
import { useNet, type EmoteId } from '../store/netStore'
import { requestFriend, useSocial } from '../net/social'

/** Speech-bubble icon for the emote button. */
export function ChatIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" width="1em" height="1em" aria-hidden="true" {...props}>
      <path d="M5 7.5A3.5 3.5 0 0 1 8.5 4h15A3.5 3.5 0 0 1 27 7.5v10a3.5 3.5 0 0 1-3.5 3.5H15l-6 5v-5h-.5A3.5 3.5 0 0 1 5 17.5z" fill="#fff" stroke="#4a3226" strokeWidth="2.2" strokeLinejoin="round" />
      <circle cx="11" cy="12.5" r="1.8" fill="#4a3226" />
      <circle cx="16" cy="12.5" r="1.8" fill="#4a3226" />
      <circle cx="21" cy="12.5" r="1.8" fill="#4a3226" />
    </svg>
  )
}

const ORDER: EmoteId[] = ['wave', 'heart', 'laugh', 'wow', 'sad', 'dance', 'hello', 'thanks', 'luck', 'tschuess', 'follow', 'yes']

/** HUD button + popover with emotes and quick phrases (no free chat: safe for everyone). */
export function EmoteButton() {
  const t = useT()
  const localize = useLocalize()
  const status = useNet((s) => s.status)
  const [open, setOpen] = useState(false)
  if (status !== 'online') return null
  return (
    <div className="relative">
      <button
        type="button"
        aria-label={t('online.emotes')}
        title={t('online.emotes')}
        aria-expanded={open}
        data-testid="emote-button"
        onClick={() => setOpen((o) => !o)}
        className="rail-btn"
      >
        <ChatIcon />
      </button>
      {open && (
        <div className="panel pointer-events-auto absolute top-0 right-full z-30 mr-2 land:top-full land:right-0 land:mt-2 land:mr-0 w-[min(19rem,calc(100vw-4.5rem))] p-2.5" data-testid="emote-picker">
          <div className="grid grid-cols-6 gap-1.5">
            {ORDER.slice(0, 6).map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => {
                  sendEmote(e)
                  setOpen(false)
                }}
                className="grid aspect-square place-items-center rounded-xl border-2 border-outline bg-white text-2xl shadow-[0_2px_0_var(--color-outline)] active:translate-y-0.5 active:shadow-none"
                aria-label={e}
              >
                {EMOTES[e].icon}
              </button>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {ORDER.slice(6).map((e) => (
              <button
                key={e}
                type="button"
                data-testid={`emote-${e}`}
                onClick={() => {
                  sendEmote(e)
                  setOpen(false)
                }}
                className="flex items-center gap-1 rounded-xl border-2 border-outline bg-cream px-2 py-1.5 text-left text-[13px] font-black shadow-[0_2px_0_var(--color-outline)] active:translate-y-0.5 active:shadow-none"
              >
                <span className="text-lg">{EMOTES[e].icon}</span>
                <span className="truncate">{localize(EMOTES[e].text!)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const keyOf = (name: string) => name.trim().toLowerCase()

/** "+ Add" next to a player standing here (or a tag if already a friend / invited). */
function RosterAdd({ name, isFriend, pending, onAsk }: { name: string; isFriend: boolean; pending: boolean; onAsk: () => void }) {
  const t = useT()
  if (isFriend) return <span className="text-[11px] text-jade">{t('phone.friendTag')}</span>
  if (pending) return <span className="text-[11px] text-ink/50">{t('phone.pending')}</span>
  return (
    <button
      type="button"
      data-testid={'roster-add-' + keyOf(name)}
      onClick={() => {
        onAsk()
        void requestFriend(name)
      }}
      className="rounded-full border-2 border-outline bg-jade px-2 text-[11px] text-white shadow-[0_2px_0_var(--color-outline)] active:translate-y-0.5 active:shadow-none"
    >
      + {t('phone.add')}
    </button>
  )
}

/** Green "online" chip: how many players are online, who is here. */
export function OnlineChip() {
  const t = useT()
  const status = useNet((s) => s.status)
  const online = useNet((s) => s.online)
  const roster = useNet((s) => s.roster)
  const friends = useSocial((s) => s.friends)
  const outgoing = useSocial((s) => s.outgoing)
  const [asked, setAsked] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  if (status === 'off') return null
  if (status === 'replaced') {
    return (
      <button type="button" onClick={reconnect} data-testid="online-chip" className="hud-slim pointer-events-auto flex h-9 max-w-[11rem] items-center gap-1.5 px-2.5 text-[11px] leading-tight font-black text-ink sm:h-10">
        <span className="h-2.5 w-2.5 rounded-full bg-gold" /> {t('online.replaced')}
      </button>
    )
  }
  const live = status === 'online'
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        data-testid="online-chip"
        aria-label={live ? t('online.count', { n: Math.max(online, 1) }) : t('online.connecting')}
        title={live ? t('online.count', { n: Math.max(online, 1) }) : t('online.connecting')}
        className="rail-btn !flex flex-col items-center justify-center gap-0.5"
      >
        <span className={`h-2 w-2 rounded-full ${live ? 'bg-[#3fae72]' : 'animate-pulse bg-ink/40'}`} />
        <span className="text-[10px] leading-none font-black tabular-nums">{live ? Math.max(online, 1) : '…'}</span>
      </button>
      {open && live && (
        <div className="panel pointer-events-auto absolute top-0 right-full z-30 mr-2 land:top-full land:right-0 land:mt-2 land:mr-0 w-56 p-3 text-sm" data-testid="online-list">
          <p className="mb-1.5 font-display font-extrabold text-lacquer">{t('online.here')}</p>
          {roster.length === 0 ? (
            <p className="text-[13px] font-bold text-ink/65">{t('online.nobody')}</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {roster.map((p) => (
                <li key={p.id} className="flex items-center gap-1.5 font-black">
                  <span className="h-2 w-2 rounded-full bg-[#3fae72]" />
                  <span className="min-w-0 flex-1 truncate">{p.name}</span>
                  <RosterAdd name={p.name} isFriend={friends.some((f) => f.key === keyOf(p.name))} pending={outgoing.some((f) => f.key === keyOf(p.name)) || asked.includes(keyOf(p.name))} onAsk={() => setAsked([...asked, keyOf(p.name)])} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
