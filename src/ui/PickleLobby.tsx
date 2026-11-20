import { useEffect, useState } from 'react'
import { useNet } from '../store/netStore'
import { useUI } from '../store/uiStore'
import { useSocial } from '../net/social'
import { answerAsk, askJoin, createRoom, inviteById, inviteByUser, leaveRoom, replyInvite, startMatch, usePickle, watchLobby, type PbInvite } from '../net/pickleball'
import { canPlayHere, goToCourt, pickleStats, playBot } from '../game/systems/pickleball'
import { useWorld } from '../store/worldStore'
import { useFlags } from '../store/flagsStore'
import { useMinigame } from '../store/minigameStore'
import { Sheet } from './Sheet'

/**
 * 1.39 Sân pickleball Hàng Khay — the lobby window: your room (who is in it, join requests, start), every room on
 * the server (ask to join), people to invite (players around you + friends online), and matches against the computer.
 * Logic: net/pickleball.ts (server/pickleball.mjs), systems/pickleball.ts.
 */

const btn = 'rounded-xl border-2 border-outline px-3 py-1.5 text-sm font-black shadow-[0_2px_0_var(--color-outline)] active:translate-y-0.5 active:shadow-none disabled:opacity-45 disabled:active:translate-y-0'

function Paddle({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <rect x="5" y="2" width="12" height="14" rx="5" fill="#ff7a59" stroke="#4a3226" strokeWidth="1.8" transform="rotate(-20 11 9)" />
      <rect x="12.5" y="14" width="3" height="8" rx="1.4" fill="#4a3226" transform="rotate(-20 14 18)" />
      <circle cx="19" cy="5" r="2.6" fill="#e8f34a" stroke="#8a8f22" strokeWidth="1" />
    </svg>
  )
}

export function PickleLobby() {
  const panel = useUI((s) => s.panel)
  if (panel?.type !== 'pickleball') return null
  return <LobbySheet />
}

function LobbySheet() {
  const closePanel = useUI((s) => s.closePanel)
  const status = useNet((s) => s.status)
  const online = status === 'online'
  const myName = useNet((s) => s.name)
  const rooms = usePickle((s) => s.rooms)
  const room = usePickle((s) => s.room)
  const asked = usePickle((s) => s.asked)
  const invited = usePickle((s) => s.invited)
  const roster = useNet((s) => s.roster)
  const friends = useSocial((s) => s.friends)
  useFlags((s) => s.flags['pb.played'])
  const stats = pickleStats()

  useEffect(() => {
    if (!online) return
    watchLobby(true)
    return () => watchLobby(false)
  }, [online])

  const iAmHost = !!room && room.host.name === myName
  const full = !!room?.guest
  const people = [
    ...roster.map((r) => ({ key: `id:${r.id}`, name: r.name, invite: () => inviteById(r.id), where: 'gần đây' })),
    ...friends.filter((f) => f.online && !roster.some((r) => r.name.toLowerCase() === f.key)).map((f) => ({ key: `u:${f.key}`, name: f.name, invite: () => inviteByUser(f.key), where: 'bạn bè' })),
  ]
  const canInvite = online && (!room || (iAmHost && !full && room.state === 'open'))
  const recently = (name: string) => (invited[name] ?? 0) > Date.now() - 20_000

  return (
    <Sheet title="Sân Pickleball Hàng Khay" onClose={closePanel}>
      <div className="grid gap-3 land:grid-cols-2 land:items-start" data-testid="pb-lobby">
        <div className="flex flex-col gap-2">
          {/* my room */}
          {!online ? (
            <div className="rounded-2xl bg-white/80 p-3 text-sm shadow-[inset_0_0_0_2px_#f1dcb6]" data-testid="pb-offline">
              <p className="font-black">Chưa vào mạng</p>
              <p className="mt-1 text-ink/75">Đăng nhập tài khoản và bật “Online” trong Cài đặt để tạo phòng, xin vào phòng hoặc mời người khác đấu 1–1. Trong lúc chờ, đấu thử với máy nhé!</p>
            </div>
          ) : room ? (
            <div className="rounded-2xl bg-white/85 p-3 shadow-[inset_0_0_0_2px_#f1dcb6]" data-testid="pb-myroom">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black tracking-wider text-ink/60 uppercase">Phòng của bạn · số {room.id}</span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-black ${room.state === 'playing' ? 'bg-[#ff6f61]/20 text-[#b3261e]' : 'bg-[#3fbf6f]/20 text-[#1f7a45]'}`}>
                  {room.state === 'playing' ? 'Đang đấu' : full ? 'Đủ người' : 'Đang chờ'}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2 font-black">
                <Paddle />
                <span className="truncate">{room.host.name}</span>
                <span className="text-ink/40">vs</span>
                <span className={`truncate ${room.guest ? '' : 'text-ink/40 italic'}`} data-testid="pb-guest">
                  {room.guest?.name ?? 'đang chờ đối thủ…'}
                </span>
              </div>
              {iAmHost && room.asks.length > 0 && (
                <div className="mt-2 flex flex-col gap-1.5">
                  {room.asks.map((a) => (
                    <div key={a.id} className="flex items-center gap-2 rounded-xl bg-butter/40 px-2 py-1 text-sm" data-testid="pb-ask">
                      <span className="min-w-0 flex-1 truncate font-bold">{a.name} xin vào</span>
                      <button type="button" className={`${btn} btn-jade px-2 py-1`} data-testid="pb-ask-yes" onClick={() => answerAsk(a.id, true)}>
                        Đồng ý
                      </button>
                      <button type="button" className={`${btn} bg-cream px-2 py-1`} onClick={() => answerAsk(a.id, false)}>
                        Không
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-3 flex gap-2">
                {iAmHost ? (
                  <button type="button" data-testid="pb-start" disabled={!full || room.state !== 'open'} className={`${btn} btn-lacquer flex-1`} onClick={() => startMatch()}>
                    {full ? 'Bắt đầu trận!' : 'Chờ đối thủ…'}
                  </button>
                ) : (
                  <span className="flex-1 self-center text-sm font-bold text-ink/70">Chờ {room.host.name} bắt đầu…</span>
                )}
                <button type="button" data-testid="pb-leave" className={`${btn} bg-cream`} onClick={() => leaveRoom()}>
                  Rời phòng
                </button>
              </div>
            </div>
          ) : (
            <button type="button" data-testid="pb-create" className={`${btn} btn-lacquer flex items-center justify-center gap-2 py-2.5 text-base`} onClick={() => createRoom()}>
              <Paddle /> Tạo phòng mới
            </button>
          )}

          {/* against the computer */}
          <div className="rounded-2xl bg-white/70 p-2.5 shadow-[inset_0_0_0_2px_#f1dcb6]">
            <p className="text-[11px] font-black tracking-wider text-ink/60 uppercase">Đấu với máy (anh Bảo)</p>
            <div className="mt-1.5 flex gap-1.5">
              {['Dễ', 'Vừa', 'Khó'].map((label, i) => (
                <button key={label} type="button" data-testid={`pb-bot-${i}`} disabled={!!room?.guest} className={`${btn} flex-1 bg-cream`} onClick={() => playBot(i)}>
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-ink/60">
              Đã chơi {stats.played} trận · thắng người {stats.wins} · thắng máy {stats.botWins}
            </p>
          </div>
          <p className="text-[11px] leading-snug text-ink/60">
            Luật nhanh: tính điểm mỗi pha, tới 11 (hơn 2). Bóng giao và bóng trả đầu tiên phải nảy rồi mới đánh; đứng trong vùng bếp (sát lưới) thì không đánh bóng chưa nảy. Cần đánh: cần gạt trái để chạy, nút ĐÁNH / Bỏ nhỏ / Lốp.
          </p>
        </div>

        {online && (
          <div className="flex flex-col gap-2">
            {/* all rooms */}
            <div className="rounded-2xl bg-white/80 p-2.5 shadow-[inset_0_0_0_2px_#f1dcb6]" data-testid="pb-rooms">
              <p className="text-[11px] font-black tracking-wider text-ink/60 uppercase">Các phòng ({rooms.length})</p>
              {rooms.length === 0 && <p className="mt-1 text-sm text-ink/60">Chưa có phòng nào — tạo một phòng rồi mời bạn bè!</p>}
              <div className="mt-1 flex max-h-44 flex-col gap-1 overflow-y-auto short:max-h-28">
                {rooms.map((r) => {
                  const mine = room?.id === r.id
                  const waiting = r.state === 'open' && !r.guest
                  const pending = asked.includes(r.id)
                  return (
                    <div key={r.id} className="flex items-center gap-2 rounded-xl bg-cream/70 px-2 py-1 text-sm" data-testid="pb-room">
                      <span className="min-w-0 flex-1 truncate font-bold">
                        {r.host}
                        {r.guest ? ` vs ${r.guest}` : ''}
                      </span>
                      <span className="text-[11px] font-black text-ink/55">{r.state === 'playing' ? 'Đang đấu' : r.guest ? '2/2' : '1/2'}</span>
                      {!mine && (
                        <button type="button" data-testid="pb-ask-join" disabled={!waiting || pending} className={`${btn} btn-jade px-2 py-1 text-xs`} onClick={() => askJoin(r.id)}>
                          {pending ? 'Đã xin' : 'Xin vào'}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* people to invite */}
            <div className="rounded-2xl bg-white/80 p-2.5 shadow-[inset_0_0_0_2px_#f1dcb6]" data-testid="pb-people">
              <p className="text-[11px] font-black tracking-wider text-ink/60 uppercase">Mời người chơi</p>
              {people.length === 0 && <p className="mt-1 text-sm text-ink/60">Không có ai ở gần hay bạn bè online. Rủ bạn bè vào game nhé!</p>}
              <div className="mt-1 flex max-h-44 flex-col gap-1 overflow-y-auto short:max-h-28">
                {people.map((p) => (
                  <div key={p.key} className="flex items-center gap-2 rounded-xl bg-cream/70 px-2 py-1 text-sm">
                    <span className="min-w-0 flex-1 truncate font-bold">{p.name}</span>
                    <span className="text-[11px] text-ink/50">{p.where}</span>
                    <button type="button" data-testid="pb-invite" disabled={!canInvite || recently(p.name)} className={`${btn} bg-butter px-2 py-1 text-xs`} onClick={p.invite}>
                      {recently(p.name) ? 'Đã mời' : 'Mời'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Sheet>
  )
}

/**
 * Invitations and join requests pop up anywhere in the game (top centre), so nobody has to sit in the lobby.
 * Requests show here only while the lobby window is closed (it lists them itself).
 */
export function PickleInvites() {
  const invites = usePickle((s) => s.invites)
  const room = usePickle((s) => s.room)
  const myName = useNet((s) => s.name)
  const lobbyOpen = useUI((s) => s.panel?.type === 'pickleball')
  const busy = useMinigame((s) => !!s.active)
  useWorld((s) => s.scene)
  const here = canPlayHere()
  const [now, setNow] = useState(() => Date.now())
  const asks = room && room.host.name === myName && !room.guest && !lobbyOpen ? room.asks : []
  const live = invites.filter((i) => now - i.at < 30_000)
  const any = live.length > 0 || asks.length > 0
  useEffect(() => {
    if (!invites.length) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [invites.length])
  if (!any || busy) return null

  const accept = (i: PbInvite) => {
    if (!replyInvite(i.room, true)) return
    goToCourt()
    useUI.getState().openPanel({ type: 'pickleball' })
  }
  return (
    <div className="pointer-events-none absolute top-14 left-1/2 z-30 flex w-[min(22rem,92vw)] -translate-x-1/2 flex-col gap-2 short:top-12">
      {live.map((i) => (
        <div key={`i${i.room}`} data-testid="pb-invite-card" className="panel animate-sheet pointer-events-auto flex items-center gap-2 p-2.5 text-ink">
          <Paddle className="h-8 w-8 shrink-0" />
          <div className="min-w-0 flex-1 text-sm leading-tight">
            <p className="truncate font-black">{i.name} mời bạn</p>
            <p className="text-ink/70">{here ? 'đấu pickleball 1–1 ở sân Hàng Khay' : '— sân ở Hà Nội, bạn đang ở Đức'}</p>
          </div>
          <button type="button" data-testid="pb-invite-yes" disabled={!here} className={`${btn} btn-jade px-2.5`} onClick={() => accept(i)}>
            Vào chơi
          </button>
          <button type="button" data-testid="pb-invite-no" className={`${btn} bg-cream px-2`} onClick={() => replyInvite(i.room, false)}>
            Thôi
          </button>
        </div>
      ))}
      {asks.map((a) => (
        <div key={`a${a.id}`} data-testid="pb-ask-card" className="panel animate-sheet pointer-events-auto flex items-center gap-2 p-2.5 text-ink">
          <Paddle className="h-8 w-8 shrink-0" />
          <p className="min-w-0 flex-1 truncate text-sm font-black">{a.name} xin vào phòng pickleball của bạn</p>
          <button type="button" className={`${btn} btn-jade px-2.5`} onClick={() => answerAsk(a.id, true)}>
            Đồng ý
          </button>
          <button type="button" className={`${btn} bg-cream px-2`} onClick={() => answerAsk(a.id, false)}>
            Không
          </button>
        </div>
      ))}
    </div>
  )
}
