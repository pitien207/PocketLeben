import { CONFIG } from '../data/config'
import { BUS_STOPS, busLineOf, U_BEYOND, U_GLEIS, U_LINE_COLOR, U_STATIONS, uStationsAhead, type BusStopId, type Gleis } from '../data/transit'
import { runAction } from '../game/systems/actions'
import { currentStation, hasPass, PASS_NAMES, passUntil, trainAt, type PassKind } from '../game/systems/transit'
import { useFlags } from '../store/flagsStore'
import { useTime } from '../store/timeStore'
import { useT } from '../i18n'
import { usePlayer } from '../store/playerStore'
import { useUI } from '../store/uiStore'
import { Money } from './kit/Amount'
import { Sheet } from './Sheet'

/**
 * 1.48 Where to ride (systems/transit.ts): from a bus stop (`bus` panel) or on a U-Bahn platform with the doors open
 * (`ubahn` panel). One row per stop ahead with the number of stops, minutes and the ticket; tap = pay and ride.
 */

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span className="grid h-7 min-w-9 shrink-0 place-items-center rounded-md px-1.5 font-display text-[14px] leading-none font-extrabold text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.2)]" style={{ background: color }}>
      {text}
    </span>
  )
}

function Row({ name, stops, minutes, fare, onGo, testId, disabled }: { name: string; stops: number; minutes: number; fare: number; onGo?: () => void; testId?: string; disabled?: boolean }) {
  const t = useT()
  const currency = usePlayer((s) => s.currency)
  const money = usePlayer((s) => s.money)
  useFlags((st) => st.flags['pass.until'])
  const pass = !disabled && currency === 'EUR' && hasPass()
  const short = !disabled && !pass && money < fare
  return (
    <button
      type="button"
      data-testid={testId}
      disabled={disabled || short}
      onClick={onGo}
      className={`flex w-full items-center gap-3 rounded-2xl border-2 px-3 py-2 text-left transition ${
        disabled ? 'border-dashed border-ink/15 bg-white/30 text-ink/40' : 'btn-paper'
      } disabled:cursor-default`}
    >
      <span className="relative grid h-4 w-4 shrink-0 place-items-center">
        <span className={`h-3.5 w-3.5 rounded-full border-[3px] ${disabled ? 'border-ink/25 bg-white' : 'border-outline bg-white'}`} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] leading-tight font-extrabold">{name}</span>
        <span className="block text-[11px] font-bold text-ink/55">
          {disabled ? t('transit.beyond') : `${t('transit.stops', { n: stops })} · ${t('transit.minutes', { m: minutes })}`}
        </span>
      </span>
      {!disabled && (
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[12px] font-black tabular-nums ${pass ? 'bg-jade text-white' : short ? 'bg-lacquer text-gold-light' : 'bg-gold-light text-ink'}`}>
          {pass ? 'Có vé' : currency === 'EUR' ? `${fare.toFixed(2).replace('.', ',')} €` : `${Math.round(fare).toLocaleString('vi-VN')}đ`}
        </span>
      )}
    </button>
  )
}

function Wallet() {
  const t = useT()
  const money = usePlayer((s) => s.money)
  const currency = usePlayer((s) => s.currency)
  return (
    <span className="ml-auto flex items-center gap-1 text-[12px] font-bold text-ink/60">
      {t('transit.wallet')}
      <Money amount={money} currency={currency} className="font-display text-[14px] font-extrabold text-ink" />
    </span>
  )
}

function BusPanel({ stop }: { stop: BusStopId }) {
  const t = useT()
  const closePanel = useUI((s) => s.closePanel)
  const from = BUS_STOPS[stop]
  const line = busLineOf(stop)
  const de = from.scene === 'germany'
  const fare = de ? CONFIG.transit.fareEur : CONFIG.transit.busFareVnd
  const i = line.stops.indexOf(stop)
  const dests = line.stops.filter((id) => id !== stop)
  const nameOf = (id: BusStopId) => (de ? (BUS_STOPS[id].name.de ?? BUS_STOPS[id].name.en) : BUS_STOPS[id].name.vi)
  return (
    <Sheet title={de ? `Bus ${line.number}` : `Xe buýt ${line.number}`} icon="bus" onClose={closePanel}>
      <div className="mb-3 flex items-center gap-2" data-testid="transit-panel">
        <Badge text={line.number} color={line.color} />
        <span className="min-w-0">
          <span className="block text-[11px] font-black text-ink/55 uppercase">{de ? 'Haltestelle' : 'Bến'} {nameOf(stop)}</span>
          <span className="block truncate text-[13px] font-extrabold">{de ? line.towards.de ?? line.towards.en : line.towards.vi}</span>
        </span>
        <Wallet />
      </div>
      <p className="mb-2 font-display text-[15px] font-extrabold text-lacquer">{t('transit.pick')}</p>
      <div className="flex flex-col gap-2">
        {dests.map((id) => {
          const n = Math.abs(line.stops.indexOf(id) - i)
          return (
            <Row
              key={id}
              testId={`transit-dest-${id}`}
              name={nameOf(id)}
              stops={n}
              minutes={n * CONFIG.transit.busMinutesPerStop}
              fare={fare}
              onGo={() => runAction('bus.go', `${stop}:${id}`)}
            />
          )
        })}
      </div>
    </Sheet>
  )
}

function UBahnPanel({ gleis }: { gleis: Gleis }) {
  const t = useT()
  const closePanel = useUI((s) => s.closePanel)
  const here = currentStation()
  const train = trainAt(gleis)
  const ahead = uStationsAhead(here, gleis)
  const beyond = U_GLEIS[gleis].dir === 'south' ? U_BEYOND.south : U_BEYOND.north
  const fare = CONFIG.transit.fareEur
  return (
    <Sheet title={`Gleis ${gleis}`} icon="metro" onClose={closePanel}>
      <div className="mb-3 flex items-center gap-2" data-testid="transit-panel">
        <Badge text={train.end.line} color={U_LINE_COLOR[train.end.line] ?? '#0065ae'} />
        <span className="min-w-0">
          <span className="block text-[11px] font-black text-ink/55 uppercase">U-Bahn {U_STATIONS[here].name}</span>
          <span className="block truncate text-[13px] font-extrabold">Richtung {train.end.to}</span>
        </span>
        <Wallet />
      </div>
      <p className="mb-2 font-display text-[15px] font-extrabold text-lacquer">{t('transit.pick')}</p>
      <div className="flex flex-col gap-2">
        {ahead.map((id, k) => (
          <Row
            key={id}
            testId={`transit-dest-${id}`}
            name={U_STATIONS[id].name}
            stops={k + 1}
            minutes={(k + 1) * CONFIG.transit.ubahnMinutesPerStop}
            fare={fare}
            onGo={() => runAction('ubahn.go', `${gleis}:${id}`)}
          />
        ))}
        {beyond.map((n) => (
          <Row key={n} name={n} stops={0} minutes={0} fare={fare} disabled />
        ))}
      </div>
    </Sheet>
  )
}

const euro = (v: number) => `${v.toFixed(2).replace('.', ',')} €`

/** 1.49 Fahrkartenautomat: single ride price, the three passes, what you hold now. */
function TicketPanel() {
  const closePanel = useUI((st) => st.closePanel)
  const money = usePlayer((st) => st.money)
  const today = useTime((st) => st.day)
  useFlags((st) => st.flags['pass.until'])
  const until = passUntil()
  const left = until - today
  const kinds = Object.keys(CONFIG.transit.passes) as PassKind[]
  const BLURB: Record<PassKind, string> = {
    day: 'Đi không giới hạn đến hết hôm nay.',
    week: '7 ngày đi U-Bahn, buýt, tram thoải mái.',
    month: '30 ngày — rẻ nhất nếu ngày nào cũng đi làm / đi học.',
  }
  return (
    <Sheet title="Fahrkartenautomat" icon="ticket" onClose={closePanel}>
      <div data-testid="ticket-panel" className="mb-3 flex items-center gap-2 rounded-2xl bg-[#0d2a4a] px-3 py-2 text-white">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-[#0065ae] font-display text-lg font-extrabold">M</span>
        <span className="min-w-0 flex-1 text-[12px] leading-snug font-bold">
          {left >= 0 ? (
            <span data-testid="ticket-status" className="text-[#9be7b0]">
              Đang có vé — còn {left === 0 ? 'đến hết hôm nay' : `${left + 1} ngày (kể cả hôm nay)`}. Đi U-Bahn, buýt miễn phí.
            </span>
          ) : (
            <span data-testid="ticket-status">Chưa có vé. Không mua thì mỗi lượt trả vé lẻ {euro(CONFIG.transit.fareEur)} (Einzelfahrt).</span>
          )}
        </span>
        <Wallet />
      </div>
      <div className="flex flex-col gap-2">
        {kinds.map((k) => {
          const p = CONFIG.transit.passes[k]
          const short = money < p.price
          return (
            <button
              key={k}
              type="button"
              data-testid={`ticket-${k}`}
              disabled={short}
              onClick={() => runAction('ticket.buy', k)}
              className="btn-paper flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left disabled:opacity-60"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] leading-tight font-extrabold">
                  {PASS_NAMES[k].de} <span className="text-[12px] font-bold text-ink/55">· {PASS_NAMES[k].vi}</span>
                </span>
                <span className="block text-[11px] font-bold text-ink/60">{BLURB[k]}</span>
              </span>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[12px] font-black tabular-nums ${short ? 'bg-lacquer text-gold-light' : 'bg-gold-light text-ink'}`}>{euro(p.price)}</span>
            </button>
          )
        })}
      </div>
      <p className="mt-2 text-[11px] font-bold text-ink/50">Vé mới bắt đầu khi vé cũ hết hạn — không mất ngày nào.</p>
    </Sheet>
  )
}

export function TransitPanel() {
  const panel = useUI((s) => s.panel)
  if (panel?.type === 'bus' && panel.stop in BUS_STOPS) return <BusPanel stop={panel.stop as BusStopId} />
  if (panel?.type === 'ubahn') return <UBahnPanel gleis={panel.gleis} />
  if (panel?.type === 'tickets') return <TicketPanel />
  return null
}
