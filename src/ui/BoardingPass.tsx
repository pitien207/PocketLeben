import { hhmm, LEG1, rowStatus, STATUS_TEXT, type FlightPlan } from '../data/flight'
import { currentFlightPlan } from '../game/systems/flight'
import { useT } from '../i18n'
import { getAccount } from '../net/auth'
import { useFlags } from '../store/flagsStore'
import { useTime } from '../store/timeStore'
import { useUI } from '../store/uiStore'
import { Icon3d } from './Icon3d'
import { Sheet } from './Sheet'

/**
 * 1.43 The first flight (systems/flight.ts): the boarding pass (seat for the cabin, the connecting flight without a
 * gate — that's on the board) and the departures board of the transit airport, readable on a phone.
 */

function usePlan(): FlightPlan {
  // re-read when the seed changes
  useFlags((s) => s.flags['fly.seed'])
  return currentFlightPlan()
}

function Field({ label, value, testId }: { label: string; value: string; testId?: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[9px] leading-tight font-black text-ink/45 uppercase">{label}</div>
      <div data-testid={testId} className="font-display text-sm leading-tight font-extrabold whitespace-nowrap text-ink">
        {value}
      </div>
    </div>
  )
}

/** One coupon of the pass: route + flight details on the left, the seat big on the right. */
function Coupon({ from, fromCity, to, toCity, flight, boarding, dep, gate, seat, highlight, testPrefix }: { from: string; fromCity: string; to: string; toCity: string; flight: string; boarding: number; dep: number; gate: string; seat: string; highlight?: boolean; testPrefix: string }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border-2 border-outline bg-white ${highlight ? 'shadow-[0_3px_0_var(--color-outline)]' : 'opacity-90'}`}>
      <div className="flex items-center justify-between gap-2 bg-[#2f8f83] px-3 py-1 text-white">
        <span className="truncate font-display text-[12px] font-extrabold tracking-wide">{flight.startsWith('SH') ? 'SÔNG HỒNG AIR' : 'RHEINFLUG'}</span>
        <span className="shrink-0 text-[9px] font-black tracking-[0.14em]">BOARDING PASS</span>
      </div>
      <div className="flex gap-2.5 px-3 pt-1.5 pb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1">
            <div>
              <div className="font-display text-2xl leading-none font-extrabold">{from}</div>
              <div className="text-[10px] font-bold text-ink/55">{fromCity}</div>
            </div>
            <Icon3d name="airplane" className="h-6 w-6 shrink-0" />
            <div className="text-right">
              <div className="font-display text-2xl leading-none font-extrabold">{to}</div>
              <div className="text-[10px] font-bold text-ink/55">{toCity}</div>
            </div>
          </div>
          <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1">
            <Field label="Chuyến bay" value={flight} testId={`${testPrefix}-flight`} />
            <Field label="Cổng · Gate" value={gate} testId={`${testPrefix}-gate`} />
            <Field label="Lên máy bay" value={hhmm(boarding)} />
            <Field label="Cất cánh" value={hhmm(dep)} />
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-center justify-center rounded-xl border-2 border-outline bg-butter px-2.5 py-1">
          <div className="text-[9px] font-black text-ink/55 uppercase">Ghế · Sitz</div>
          <div data-testid={`${testPrefix}-seat`} className="font-display text-3xl leading-none font-extrabold text-ink">
            {seat}
          </div>
        </div>
      </div>
      <div className="h-4 bg-[repeating-linear-gradient(90deg,#1d2433_0_2px,transparent_2px_4px,#1d2433_4px_5px,transparent_5px_8px)] opacity-80" />
    </div>
  )
}

export function BoardingPassPanel() {
  const panel = useUI((s) => s.panel)
  const closePanel = useUI((s) => s.closePanel)
  const t = useT()
  const plan = usePlan()
  if (panel?.type !== 'boardingPass') return null
  const name = (getAccount()?.name ?? 'Hành khách').toUpperCase()
  return (
    <Sheet title={t('hud.boardingPass')} onClose={closePanel}>
      <div className="flex flex-col gap-2.5" data-testid="boarding-pass">
        <div className="text-[11px] font-black tracking-[0.12em] text-ink/55">HÀNH KHÁCH · PASSAGIER: <span className="text-ink">{name}</span></div>
        <div className="grid gap-2.5 land:grid-cols-2">
          <Coupon testPrefix="bp1" from={LEG1.from} fromCity={LEG1.fromCity} to={LEG1.to} toCity={LEG1.toCity} flight={LEG1.flight} boarding={LEG1.boarding} dep={LEG1.dep} gate={LEG1.gate} seat={plan.seat} highlight />
          <Coupon testPrefix="bp2" from="MUC" fromCity="München" to={plan.leg2.to} toCity={plan.leg2.toCity} flight={plan.leg2.flight} boarding={plan.leg2.boarding} dep={plan.leg2.dep} gate="—" seat={plan.leg2.seat} />
        </div>
        <p className="rounded-xl bg-butter/60 px-3 py-2 text-[12px] leading-snug font-bold text-ink/75">
          Ghế <b>{plan.seat}</b>: hàng {plan.row}, chữ {plan.letter}. Chặng 2 chưa có cổng — ở München xem <b>bảng điện tử „Abflug"</b> để biết cổng của chuyến <b>{plan.leg2.flight}</b>.
        </p>
      </div>
    </Sheet>
  )
}

export function FlightBoardPanel() {
  const panel = useUI((s) => s.panel)
  const closePanel = useUI((s) => s.closePanel)
  const plan = usePlan()
  const now = useTime((s) => s.minutes)
  if (panel?.type !== 'flightBoard') return null
  return (
    <Sheet title="Abflug · Departures" onClose={closePanel}>
      <div className="flex flex-col gap-2" data-testid="flight-board">
        <div className="overflow-hidden rounded-xl border-2 border-outline bg-[#10141d] text-[#ffd166]" style={{ fontFamily: "'Barlow Condensed', 'Arial Narrow', sans-serif" }}>
          <div className="flex items-center justify-between bg-[#1d2433] px-3 py-1.5 text-[15px] font-extrabold">
            <span>✈ Abflug · Departures</span>
            <span className="tabular-nums">{hhmm(now)}</span>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-semibold tracking-wide text-[#9aa3b2] uppercase">
                <th className="px-2 py-1">Zeit</th>
                <th className="px-1 py-1">Flug</th>
                <th className="px-1 py-1">Ziel</th>
                <th className="px-1 py-1">Gate</th>
                <th className="px-2 py-1">Bemerkung</th>
              </tr>
            </thead>
            <tbody>
              {plan.rows.map((r, i) => {
                const st = rowStatus(r, now)
                const remark = st === 'delayed' && r.delay ? `${STATUS_TEXT[st].de} ${hhmm(r.time + r.delay)}` : STATUS_TEXT[st].de
                return (
                  <tr key={r.flight} data-testid={`board-row-${i}`} data-flight={r.flight} data-gate={r.gate} className={`text-[15px] leading-tight font-extrabold tabular-nums short:text-[13px] ${i % 2 ? 'bg-[#161b26]' : ''} ${st === 'departed' ? 'text-[#7a8294]' : ''}`}>
                    <td className="px-2 py-0.5">{hhmm(r.time)}</td>
                    <td className="px-1 py-0.5 whitespace-nowrap">{r.flight}</td>
                    <td className="px-1 py-0.5">{r.dest}</td>
                    <td className="px-1 py-0.5">{r.gate}</td>
                    <td className="px-2 py-0.5 text-[13px] font-bold whitespace-nowrap" style={{ color: STATUS_TEXT[st].color }}>
                      {remark}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] leading-snug font-bold text-ink/65">
          {(['departed', 'boarding', 'open', 'delayed', 'lastCall'] as const).map((k) => (
            <span key={k} className="mr-2 whitespace-nowrap">
              <b>{STATUS_TEXT[k].de}</b> = {STATUS_TEXT[k].vi}
            </span>
          ))}
        </p>
        <p className="rounded-xl bg-butter/60 px-3 py-2 text-[12px] leading-snug font-bold text-ink/75">
          Thẻ của bạn: chuyến <b>{plan.leg2.flight}</b> đi Frankfurt, cất cánh {hhmm(plan.leg2.dep)}. So số hiệu chuyến bay, không chỉ tên thành phố!
        </p>
      </div>
    </Sheet>
  )
}
