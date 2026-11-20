import { useState } from 'react'
import { buyGold, CHI_PER_CAY, formatChi, goldChange, goldHistory, goldQuote, sellGold, type GoldQuote } from '../game/systems/gold'
import { formatMoney } from '../i18n/format'
import { useFlags } from '../store/flagsStore'
import { usePlayer } from '../store/playerStore'
import { useTime } from '../store/timeStore'
import { useUI } from '../store/uiStore'
import { Icon3d } from './Icon3d'
import { Sheet } from './Sheet'

/**
 * 1.34 Tiệm Vàng Kim Thành: today's price (bán ra / mua vào per chỉ, change since yesterday, last 14 days), your
 * gold and a buy / sell form by chỉ or cây. Logic and prices: game/systems/gold.ts.
 */

type Mode = 'buy' | 'sell'
type Unit = 'chi' | 'cay'

/** A small gold bar (vàng miếng), drawn in SVG. */
function GoldBar({ className = 'h-6 w-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 26" className={className} aria-hidden>
      <path d="M8 4h24l6 18H2z" fill="#f2b632" stroke="#4a3226" strokeWidth="2" strokeLinejoin="round" />
      <path d="M10 6h20l2 6H8z" fill="#ffe08a" />
      <rect x="15" y="12" width="10" height="5" rx="1" fill="#c8322b" opacity=".85" />
    </svg>
  )
}

function Sparkline({ data }: { data: GoldQuote[] }) {
  if (data.length < 2) return null
  const vals = data.map((q) => q.sell)
  const lo = Math.min(...vals)
  const hi = Math.max(...vals)
  const span = hi - lo || 1
  const W = 140
  const H = 34
  const pts = vals.map((v, i) => `${((i / (vals.length - 1)) * W).toFixed(1)},${(H - 3 - ((v - lo) / span) * (H - 6)).toFixed(1)}`)
  const up = vals[vals.length - 1] >= vals[0]
  const color = up ? '#3fbf6f' : '#ff6f61'
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-9 w-full short:h-6" preserveAspectRatio="none" aria-label="Giá vàng 14 ngày qua">
      <polyline points={`0,${H} ${pts.join(' ')} ${W},${H}`} fill={color} opacity="0.15" stroke="none" />
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={W} cy={pts[pts.length - 1].split(',')[1]} r="2.6" fill={color} />
    </svg>
  )
}

function PriceBoard({ day }: { day: number }) {
  const q = goldQuote(day)
  const ch = goldChange(day)
  const pct = `${(Math.abs(ch) * 100).toFixed(1).replace('.', ',')}%`
  const chip = ch > 0.0005 ? { t: `▲ ${pct}`, c: 'bg-[#3fbf6f]/25 text-[#8ff0b0]' } : ch < -0.0005 ? { t: `▼ ${pct}`, c: 'bg-[#ff6f61]/25 text-[#ffb0a8]' } : { t: '— 0%', c: 'bg-white/15 text-white/80' }
  return (
    <div data-testid="gold-board" className="rounded-2xl border-2 border-outline bg-[#1f1a17] p-2.5 text-[#ffd76a] shadow-[inset_0_2px_0_rgba(255,255,255,.08)]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-black tracking-wider text-[#ffd76a]/80 uppercase">Giá vàng 9999 / chỉ</span>
        <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-black tabular-nums ${chip.c}`} data-testid="gold-change">
          {chip.t}
        </span>
      </div>
      <div className="mt-1 grid grid-cols-2 gap-2">
        <div>
          <div className="text-[10px] font-bold text-white/60">Tiệm bán ra</div>
          <div className="font-display text-lg leading-tight font-extrabold tabular-nums short:text-base" data-testid="gold-sell">
            {formatMoney(q.sell)}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-bold text-white/60">Tiệm mua vào</div>
          <div className="font-display text-lg leading-tight font-extrabold text-[#ffe9b0] tabular-nums short:text-base" data-testid="gold-buy">
            {formatMoney(q.buy)}
          </div>
        </div>
      </div>
      <Sparkline data={goldHistory(14, day)} />
      <div className="text-[10px] font-bold text-white/55">1 cây = 10 chỉ · 1 chỉ = 3,75 g</div>
    </div>
  )
}

export function GoldPanel() {
  const panel = useUI((s) => s.panel)
  if (panel?.type !== 'gold') return null
  return <GoldSheet key={panel.mode} initial={panel.mode} />
}

function GoldSheet({ initial }: { initial: Mode }) {
  const closePanel = useUI((s) => s.closePanel)
  const day = useTime((s) => s.day)
  const money = usePlayer((s) => s.money)
  const currency = usePlayer((s) => s.currency)
  const held = useFlags((s) => (typeof s.flags['gold.chi'] === 'number' ? (s.flags['gold.chi'] as number) : 0))
  const paid = useFlags((s) => (typeof s.flags['gold.paid'] === 'number' ? (s.flags['gold.paid'] as number) : 0))
  const [mode, setMode] = useState<Mode>(initial === 'sell' && held > 0 ? 'sell' : 'buy')
  const [unit, setUnit] = useState<Unit>('chi')
  const [qty, setQty] = useState(1)

  const q = goldQuote(day)
  const per = unit === 'cay' ? CHI_PER_CAY : 1
  const unitPrice = mode === 'buy' ? q.sell : q.buy
  const maxChi = mode === 'buy' ? (currency === 'VND' ? Math.floor(money / q.sell) : 0) : held
  const maxQty = Math.floor(maxChi / per)
  const n = Math.max(1, qty)
  const chi = n * per
  const total = unitPrice * chi
  const ok = chi <= maxChi
  const value = held * q.buy
  const gain = value - paid

  const pick = (m: Mode) => {
    setMode(m)
    setQty(1)
  }
  const confirm = () => {
    if (!ok) return
    const done = mode === 'buy' ? buyGold(chi) : sellGold(chi)
    if (done) {
      setQty(1)
      if (mode === 'sell' && held - chi <= 0) setMode('buy')
    }
  }

  const tab = (m: Mode, label: string, disabled = false) => (
    <button
      type="button"
      disabled={disabled}
      data-testid={`gold-tab-${m}`}
      onClick={() => pick(m)}
      className={`flex-1 rounded-xl py-1.5 text-sm font-black ${mode === m ? 'bg-[#b3261e] text-butter shadow-[0_2px_0_var(--color-outline)]' : disabled ? 'text-ink/30' : 'text-ink/70'}`}
    >
      {label}
    </button>
  )

  return (
    <Sheet title="Tiệm Vàng Kim Thành" onClose={closePanel}>
      <div className="grid gap-3 land:grid-cols-2 land:items-start">
        <div className="flex flex-col gap-2">
          <PriceBoard day={day} />
          <div className="flex items-center gap-2 rounded-2xl bg-white/80 p-2 shadow-[inset_0_0_0_2px_#f1dcb6]" data-testid="gold-held">
            <Icon3d name="money-bag" className="h-9 w-9 shrink-0" />
            <div className="min-w-0 text-sm leading-tight">
              <div className="font-extrabold">
                Vàng của bạn: <span className="text-[#b3261e]">{held ? formatChi(held) : 'chưa có'}</span>
              </div>
              <div className="text-[12px] font-bold text-ink/70">Tiền mặt: {formatMoney(money, currency)}</div>
              {held > 0 && (
                <div className="text-[12px] font-bold text-ink/70">
                  Bán lại hôm nay: {formatMoney(value)} ·{' '}
                  <span className={gain >= 0 ? 'text-jade' : 'text-lacquer'}>{gain >= 0 ? `lãi ${formatMoney(gain)}` : `lỗ ${formatMoney(-gain)}`}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex gap-1 rounded-2xl bg-ink/10 p-1">
            {tab('buy', 'Mua vàng')}
            {tab('sell', 'Bán vàng', held <= 0)}
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1 rounded-full bg-ink/10 p-0.5 text-[13px] font-black">
              {(['chi', 'cay'] as Unit[]).map((u) => (
                <button
                  key={u}
                  type="button"
                  data-testid={`gold-unit-${u}`}
                  onClick={() => {
                    setUnit(u)
                    setQty(1)
                  }}
                  className={`rounded-full px-3 py-1 ${unit === u ? 'bg-cream shadow-[0_1px_0_var(--color-outline)]' : 'text-ink/60'}`}
                >
                  {u === 'chi' ? 'Chỉ' : 'Cây'}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <button type="button" aria-label="Bớt" data-testid="gold-minus" onClick={() => setQty(Math.max(1, n - 1))} className="grid h-9 w-9 place-items-center rounded-full border-2 border-outline bg-cream text-lg font-black shadow-[0_2px_0_var(--color-outline)] active:translate-y-0.5">
                −
              </button>
              <span className="min-w-[2.6rem] text-center font-display text-xl font-extrabold tabular-nums" data-testid="gold-qty">
                {n}
              </span>
              <button type="button" aria-label="Thêm" data-testid="gold-plus" onClick={() => setQty(Math.min(Math.max(1, maxQty), n + 1))} className="grid h-9 w-9 place-items-center rounded-full border-2 border-outline bg-cream text-lg font-black shadow-[0_2px_0_var(--color-outline)] active:translate-y-0.5">
                +
              </button>
            </div>
          </div>
          {maxQty > 1 && (
            <button type="button" data-testid="gold-max" onClick={() => setQty(maxQty)} className="self-end text-[12px] font-black text-[#b3261e] underline">
              {mode === 'buy' ? 'Mua hết số tiền' : 'Bán hết'} ({maxQty} {unit === 'chi' ? 'chỉ' : 'cây'})
            </button>
          )}
          <div className="flex items-center gap-2 rounded-2xl bg-[#fff3d6] px-2 py-1.5 shadow-[inset_0_0_0_2px_#f1dcb6]">
            <GoldBar className="h-6 w-9 shrink-0" />
            <div className="min-w-0 flex-1 text-[12px] leading-tight font-bold text-ink/70">
              <div className="whitespace-nowrap">{formatChi(chi)} ×</div>
              <div className="whitespace-nowrap tabular-nums">{formatMoney(unitPrice)}</div>
            </div>
            <div className="shrink-0 text-right font-display text-lg leading-tight font-extrabold tabular-nums" data-testid="gold-total">
              {mode === 'buy' ? '−' : '+'}
              {formatMoney(total)}
            </div>
          </div>
          <button
            type="button"
            data-testid="gold-confirm"
            onClick={confirm}
            disabled={!ok}
            className={`rounded-2xl py-2.5 text-base font-black active:translate-y-1 active:shadow-none ${ok ? (mode === 'buy' ? 'btn-lacquer' : 'btn-jade') : 'bg-ink/15 text-ink/50'}`}
          >
            {!ok ? (mode === 'buy' ? (currency !== 'VND' ? 'Tiệm chỉ nhận tiền đồng' : 'Chưa đủ tiền') : 'Không đủ vàng để bán') : mode === 'buy' ? `Mua ${formatChi(chi)}` : `Bán ${formatChi(chi)}`}
          </button>
        </div>
      </div>
    </Sheet>
  )
}
