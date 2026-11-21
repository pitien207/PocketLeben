import { useEffect, useState } from 'react'
import { CONFIG } from '../data/config'
import { acceptOffer, cancelOrder, GRAB_PEOPLE, grabClock, grabOffline, grabRating, skipOffer, useGrab, type GrabKind, type GrabOffer } from '../game/systems/grab'
import { playerState } from '../game/systems/playerState'
import { useRide } from '../game/systems/vehicles'
import { formatMoney } from '../i18n/format'
import { useDialogue } from '../store/dialogueStore'
import { useUI } from '../store/uiStore'
import { Icon3d } from './Icon3d'

/**
 * 1.40 The Grab app while it is on (systems/grab.ts): it takes the quest tracker's place in the HUD. Offers with
 * Nhận / Bỏ (desktop: G = take the first one), then the fare in progress — where to, how far, the clock against the
 * ETA, a bar while you stop at the point — and the result of the last fare. Live numbers refresh 5× a second.
 */

const GREEN = '#00b14f'
const vnd = (n: number) => formatMoney(n, 'VND')
const ICON: Record<GrabKind, string> = { ride: 'motor-scooter', food: 'takeout-box', parcel: 'package' }
const KIND: Record<GrabKind, string> = { ride: 'Chở khách', food: 'Giao đồ ăn', parcel: 'Giao hàng' }
const clock = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, '0')}`
const metres = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1).replace('.', ',')} km` : `${Math.round(m)} m`)

/** Re-render a few times a second (distances, timers). */
function useTicker(ms: number) {
  const [, set] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => set((n) => n + 1), ms)
    return () => window.clearInterval(id)
  }, [ms])
}

function OfferRow({ o }: { o: GrabOffer }) {
  const left = Math.max(0, o.expires - grabClock.t)
  const pct = Math.min(100, (left / CONFIG.vnJobs.grab.offerTtl) * 100)
  return (
    <div className="relative overflow-hidden rounded-lg bg-white/85 px-1.5 pt-1 pb-1.5 shadow-[inset_0_0_0_1.5px_rgba(74,50,38,0.25)]" data-testid="grab-offer">
      <div className="flex items-center gap-1.5">
        <Icon3d name={ICON[o.kind]} className="h-6 w-6 shrink-0" />
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-[11px] font-black text-ink">
            {KIND[o.kind]} · <span style={{ color: GREEN }}>{vnd(o.fare)}</span>
            {o.rain ? ' ☔' : ''}
          </span>
          <span className="block truncate text-[10px] font-bold text-ink/65">
            {o.from.name} → {o.to.name}
          </span>
          <span className="block truncate text-[9.5px] font-bold text-ink/50">
            Cách {metres(o.toPickup)} · đi {metres(o.dist)}
            {o.item ? ` · ${o.item}` : ` · ${GRAB_PEOPLE[o.who].name}`}
          </span>
        </span>
        <span className="flex shrink-0 flex-col gap-1">
          <button type="button" data-testid="grab-accept" onClick={() => acceptOffer(o.id)} className="rounded-md px-2 py-0.5 text-[11px] font-black text-white shadow-[0_2px_0_#00733a] active:translate-y-0.5" style={{ background: GREEN }}>
            Nhận
          </button>
          <button type="button" data-testid="grab-skip" onClick={() => skipOffer(o.id)} className="rounded-md bg-ink/8 px-2 py-0.5 text-[10px] font-black text-ink/60">
            Bỏ
          </button>
        </span>
      </div>
      <span className="absolute bottom-0 left-0 h-[3px] transition-[width] duration-200" style={{ width: `${pct}%`, background: GREEN }} />
    </div>
  )
}

export function GrabCard() {
  useTicker(200)
  const s = useGrab()
  const riding = useRide((r) => r.riding)
  // Keyboard: G takes the first offer (not while typing or talking)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (e.repeat || e.code !== 'KeyG' || el?.closest('input, textarea, [contenteditable="true"]')) return
      if (useUI.getState().panel || useDialogue.getState().npcId) return
      acceptOffer()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  if (!s.online) return null
  const o = s.order
  const now = grabClock.t
  const last = s.last && now - s.last.at < 6 ? s.last : null
  const target = o ? (o.stage === 'pickup' ? o.from : o.to) : null
  const dist = target ? Math.hypot(playerState.position.x - target.x, playerState.position.z - target.z) : 0
  const took = o ? now - o.started : 0
  const late = o ? took > o.eta : false

  return (
    <div className="pointer-events-auto flex w-full max-w-[min(17.5rem,100%)] flex-col gap-1" data-testid="grab-card">
      <div className="hud-slim flex items-center gap-1.5 py-0.5 pr-1 pl-1.5">
        <span className="rounded px-1.5 py-px text-[10px] font-black tracking-wide text-white" style={{ background: GREEN }}>
          GRAB
        </span>
        <span className="min-w-0 flex-1 truncate text-[10.5px] font-extrabold text-ink/80 tabular-nums">
          {grabRating().toFixed(1).replace('.', ',')}★ · {s.shiftDone} cuốc · {vnd(s.shiftEarned)}
        </span>
        <button type="button" data-testid="grab-off" onClick={() => grabOffline()} className="rounded-md bg-ink/8 px-1.5 py-0.5 text-[10px] font-black text-ink/70">
          Tắt app
        </button>
      </div>

      {o && target && (
        <div className="hud-slim relative overflow-hidden px-1.5 pt-1 pb-1.5" data-testid="grab-order" data-stage={o.stage}>
          <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: GREEN }} />
          <div className="flex items-center gap-1.5 pl-1">
            <Icon3d name={ICON[o.kind]} className="h-6 w-6 shrink-0" />
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-[8.5px] font-black tracking-wide uppercase" style={{ color: GREEN }}>
                {o.stage === 'pickup' ? (o.kind === 'ride' ? `Đón ${GRAB_PEOPLE[o.who].name}` : o.kind === 'food' ? 'Lấy đồ ăn' : 'Lấy hàng ở bưu điện') : o.kind === 'ride' ? 'Chở khách đến' : `Giao cho ${GRAB_PEOPLE[o.who].name}`}
              </span>
              <span className="block truncate text-[11.5px] font-extrabold text-ink">{target.name}</span>
              <span className="block truncate text-[10px] font-bold text-ink/60 tabular-nums">
                <span data-testid="grab-dist">{metres(dist)}</span> · <span className={late ? 'text-lacquer' : ''}>⏱ {clock(took)} / {clock(o.eta)}</span> · {vnd(o.fare)}
              </span>
              {o.item && <span className="block truncate text-[9.5px] font-bold text-ink/50">{o.item}</span>}
            </span>
            <button type="button" data-testid="grab-cancel" onClick={cancelOrder} className="shrink-0 self-start rounded-md bg-ink/8 px-1.5 py-0.5 text-[10px] font-black text-ink/60">
              Hủy
            </button>
          </div>
          {o.hold > 0 && (
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink/10">
              <div className="h-full" style={{ width: `${Math.min(100, (o.hold / CONFIG.vnJobs.grab.holdSec) * 100)}%`, background: GREEN }} />
            </div>
          )}
        </div>
      )}

      {!o && s.offers.map((offer) => <OfferRow key={offer.id} o={offer} />)}
      {!o && s.offers.length === 0 && !last && (
        <div className="hud-slim flex items-center gap-1.5 px-2 py-1 text-[10.5px] font-bold text-ink/60" data-testid="grab-waiting">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full" style={{ background: GREEN }} />
          {riding ? 'Đang tìm cuốc gần bạn…' : 'Đang tìm cuốc… (lên xe để chạy)'}
        </div>
      )}
      {last && (
        <div className={`hud-slim px-2 py-1 text-[10.5px] font-extrabold ${last.failed ? 'text-lacquer' : 'text-ink'}`} data-testid="grab-last">
          {last.failed ? last.failed : `${'★'.repeat(last.stars)}${'☆'.repeat(5 - last.stars)} · +${vnd(last.pay)}${last.tip ? ` (tip ${vnd(last.tip)})` : ''}`}
        </div>
      )}
      {s.hint && (
        <div className="hud-slim px-2 py-0.5 text-[10px] font-black text-[#c2410c]" data-testid="grab-hint">
          {s.hint}
        </div>
      )}
    </div>
  )
}
