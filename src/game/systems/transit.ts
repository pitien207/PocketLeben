import { CONFIG } from '../../data/config'
import {
  BUS_STOPS,
  busLineOf,
  busSpawnKey,
  U_GLEIS,
  U_STATIONS,
  uSpawnKey,
  uStationsAhead,
  type BusStopId,
  type Gleis,
  type UStationId,
} from '../../data/transit'
import { formatMoney } from '../../i18n/format'
import { usePlayer } from '../../store/playerStore'
import { useTime } from '../../store/timeStore'
import { useUI } from '../../store/uiStore'
import { useWorld } from '../../store/worldStore'
import { registerActions } from './actions'
import { playSfx } from './audio'
import { bumpFlag, getFlag, registerTests, setFlag } from './conditions'
import { say } from './say'
import { travelTo } from './travel'
import { dismount, rideHooks, useRide } from './vehicles'

/**
 * 1.48 Buses (Hà Nội, München) and the München U-Bahn (data/transit.ts).
 * - Trains run on a clock (real seconds, `transitClock.offset` for tests): every `trainPeriod` a train comes into each
 *   platform, stands with open doors, leaves. Platform 2 runs half a period later. You board while the doors are open.
 * - Buses: each stop has its own bus (shared/BusStops.tsx drives it and writes `busRuntime`); you board while it waits.
 * - Riding = a fade to the stop / station you picked (panel ui/TransitPanel.tsx), paying the ticket, game time passing.
 *   On arrival the bus / train you came with is standing there.
 */

export const transitClock = { offset: 0 }
export const transitNow = () => performance.now() / 1000 + transitClock.offset

// --- U-Bahn --------------------------------------------------------------------------------------------------------------

export type TrainPhase = 'away' | 'arriving' | 'standing' | 'leaving'
export interface TrainState {
  phase: TrainPhase
  /** Position of the train's middle along the platform (0 = centred). */
  x: number
  /** Seconds until the next train stands at the platform (0 = it stands there now). */
  eta: number
  doorsOpen: boolean
  end: { line: string; to: string }
  /** The next train's end station (shown on the display while this one stands). */
  next: { line: string; to: string }
}

/** Where a train enters / leaves the station (metres from the centre). */
export const TRAIN_FAR = 120

/** Platform 1 trains drive toward +x, platform 2 toward −x. */
export const gleisDir = (g: Gleis): 1 | -1 => (g === 1 ? 1 : -1)

export function trainAt(g: Gleis, t = transitNow()): TrainState {
  const c = CONFIG.transit
  const P = c.trainPeriod
  const tt = t + (g === 2 ? P / 2 : 0)
  const cycle = Math.floor(tt / P)
  const local = ((tt % P) + P) % P
  const dir = gleisDir(g)
  const ends = U_GLEIS[g].ends
  const end = ends[((cycle % 2) + 2) % 2]
  const next = ends[(((cycle + 1) % 2) + 2) % 2]
  const standEnd = c.trainArrive + c.trainDwell
  if (local < c.trainArrive) {
    const e = local / c.trainArrive
    return { phase: 'arriving', x: -dir * TRAIN_FAR * (1 - e) * (1 - e), eta: c.trainArrive - local, doorsOpen: false, end, next }
  }
  if (local < standEnd) {
    const open = local > c.trainArrive + 0.8 && local < standEnd - 1.4
    return { phase: 'standing', x: 0, eta: 0, doorsOpen: open, end, next }
  }
  if (local < standEnd + c.trainLeave) {
    const e = (local - standEnd) / c.trainLeave
    return { phase: 'leaving', x: dir * TRAIN_FAR * e * e, eta: P - local + c.trainArrive, doorsOpen: false, end: next, next }
  }
  return { phase: 'away', x: dir * TRAIN_FAR * 4, eta: P - local + c.trainArrive, doorsOpen: false, end: next, next }
}

/** Shift the clock so a train of platform g has just stopped (you got off it). */
function trainStandingNow(g: Gleis) {
  const c = CONFIG.transit
  const P = c.trainPeriod
  const tt = transitNow() + (g === 2 ? P / 2 : 0)
  const local = ((tt % P) + P) % P
  transitClock.offset += c.trainArrive + 1.2 - local
}

export const currentStation = (): UStationId => {
  const at = getFlag('ubahn.at')
  return typeof at === 'string' && at in U_STATIONS ? (at as UStationId) : 'marienplatz'
}

const fareEur = () => CONFIG.transit.fareEur

// --- MVV passes (1.49): bought at a Fahrkartenautomat (U-Bahn platform, bus stops in München) -------------------------

export type PassKind = keyof typeof CONFIG.transit.passes
export const PASS_NAMES: Record<PassKind, { de: string; vi: string }> = {
  day: { de: 'Tageskarte', vi: 'Vé ngày' },
  week: { de: 'Wochenkarte', vi: 'Vé tuần' },
  month: { de: 'Monatskarte', vi: 'Vé tháng' },
}
/** Last game day the pass is valid (inclusive), or −1. */
export function passUntil(): number {
  const v = Number(getFlag('pass.until') ?? -1)
  return Number.isFinite(v) ? v : -1
}
export const hasPass = () => passUntil() >= useTime.getState().day

function buyPass(arg?: string) {
  const kind = arg as PassKind
  const def = CONFIG.transit.passes[kind]
  if (!def) return false
  if (!payFare(def.price)) return false
  const today = useTime.getState().day
  // a new pass starts when the old one ends (no lost days)
  const from = Math.max(today, passUntil() + 1)
  setFlag('pass.until', from + def.days - 1)
  setFlag('pass.kind', kind)
  bumpFlag('stats.passesBought')
  playSfx('till')
  const left = from + def.days - 1 - today
  say({ vi: `Đã mua ${PASS_NAMES[kind].vi} (${PASS_NAMES[kind].de}) — đi U-Bahn và xe buýt miễn phí ${left === 0 ? 'đến hết hôm nay' : `thêm ${left} ngày nữa`}.`, en: `Bought a ${PASS_NAMES[kind].de}.` }, 'good')
  return true
}

function openMachine() {
  useUI.getState().openPanel({ type: 'tickets' })
  return true
}

/** The ticket of one ride in München: free with a valid pass, else a single ticket. */
function payRideDe(): boolean {
  if (hasPass()) return true
  return payFare(fareEur())
}

/** Pay a ticket in the wallet of the scene's country. False (and a message) when you are short. */
function payFare(amount: number): boolean {
  const p = usePlayer.getState()
  if (p.money < amount) {
    playSfx('wrong')
    say({ vi: `Không đủ tiền vé (${formatMoney(amount, p.currency)}).`, en: `Not enough money for a ticket (${formatMoney(amount, p.currency)}).` }, 'bad')
    return false
  }
  p.addMoney(-amount)
  playSfx('coin')
  return true
}

/** Leave your own bike / car at the stop (not with a Grab passenger). */
function offTheBike(): boolean {
  if (!useRide.getState().riding) return true
  const why = rideHooks.blockGetOff?.()
  if (why) {
    playSfx('wrong')
    say({ vi: why, en: why }, 'info')
    return false
  }
  dismount()
  return true
}

function ubahnEnter(arg?: string) {
  const id = arg as UStationId
  const st = U_STATIONS[id]
  if (!st) return false
  if (!offTheBike()) return false
  setFlag('ubahn.at', id)
  playSfx('door')
  travelTo('ubahn', 'default', { minutes: 1, label: { vi: `U-Bahn ${st.name}`, en: `U-Bahn ${st.name}`, de: `U-Bahn ${st.name}` } })
  return true
}

function ubahnExit() {
  const id = currentStation()
  playSfx('door')
  travelTo('germany', uSpawnKey(id), { minutes: 1, label: { vi: U_STATIONS[id].exit, en: U_STATIONS[id].exit, de: U_STATIONS[id].exit } })
  return true
}

const secs = (s: number) => Math.max(1, Math.ceil(s))

function ubahnBoard(arg?: string) {
  const g = (Number(arg) === 2 ? 2 : 1) as Gleis
  const train = trainAt(g)
  if (!train.doorsOpen) {
    playSfx('wrong')
    const t = train.phase === 'standing' ? 0 : train.eta
    say(
      t > 0
        ? { vi: `Tàu ${train.end.line} → ${train.end.to} tới sau ${secs(t)} giây.`, en: `${train.end.line} to ${train.end.to} arrives in ${secs(t)} s.` }
        : { vi: 'Cửa đang đóng — đợi chuyến sau nhé.', en: 'The doors are closing — wait for the next one.' },
      'info',
    )
    return false
  }
  if (!uStationsAhead(currentStation(), g).length) {
    say({ vi: `Chuyến này đi ra ngoài bản đồ (${train.end.to}). Sang Gleis ${g === 1 ? 2 : 1} để đi chiều kia.`, en: `This train leaves the map. Take platform ${g === 1 ? 2 : 1}.` }, 'info')
    return false
  }
  useUI.getState().openPanel({ type: 'ubahn', gleis: g })
  return true
}

/** arg "g:dest" */
function ubahnGo(arg?: string) {
  const [gs, dest] = (arg ?? '').split(':')
  const g = (Number(gs) === 2 ? 2 : 1) as Gleis
  const to = dest as UStationId
  const from = currentStation()
  const ahead = uStationsAhead(from, g)
  const n = ahead.indexOf(to) + 1
  if (!n) return false
  if (!trainAt(g).doorsOpen) return ubahnBoard(String(g))
  if (!payRideDe()) return false
  const end = trainAt(g).end
  useUI.getState().closePanel()
  bumpFlag('stats.ubahnRides')
  travelTo('ubahn', `gleis${g}`, {
    minutes: n * CONFIG.transit.ubahnMinutesPerStop,
    label: { vi: `${end.line} → ${U_STATIONS[to].name}`, en: `${end.line} → ${U_STATIONS[to].name}`, de: `${end.line} → ${U_STATIONS[to].name}` },
    subtitle: { vi: `${n} ga · hướng ${end.to}`, en: `${n} stop(s) · towards ${end.to}`, de: `${n} Station(en) · Richtung ${end.to}` },
    onArrive: () => {
      setFlag('ubahn.at', to)
      trainStandingNow(g)
    },
  })
  return true
}

// --- Buses ---------------------------------------------------------------------------------------------------------------

export type BusPhase = 'wait' | 'in' | 'dwell' | 'out'
/** Written every frame by shared/BusStops.tsx: what each stop's bus is doing and when it will stand at the stop. */
export const busRuntime = new Map<BusStopId, { phase: BusPhase; eta: number }>()
/** Stops whose bus must stand there right now (you just got off it). */
export const busArrivals = new Set<BusStopId>()

const busFare = () => (usePlayer.getState().currency === 'EUR' ? fareEur() : CONFIG.transit.busFareVnd)

function busBoard(arg?: string) {
  const id = arg as BusStopId
  const stop = BUS_STOPS[id]
  if (!stop) return false
  const bus = busRuntime.get(id)
  const line = busLineOf(id)
  if (!bus || bus.phase !== 'dwell') {
    playSfx('wrong')
    const eta = bus ? secs(bus.eta) : 20
    say({ vi: `Xe buýt ${line.number} tới sau khoảng ${eta} giây.`, en: `Bus ${line.number} arrives in about ${eta} s.`, de: `Bus ${line.number} kommt in etwa ${eta} s.` }, 'info')
    return false
  }
  useUI.getState().openPanel({ type: 'bus', stop: id })
  return true
}

/** arg "from:to" */
function busGo(arg?: string) {
  const [from, to] = (arg ?? '').split(':') as [BusStopId, BusStopId]
  const a = BUS_STOPS[from]
  const b = BUS_STOPS[to]
  if (!a || !b || a.scene !== b.scene || from === to) return false
  const line = busLineOf(from)
  const stops = Math.abs(line.stops.indexOf(to) - line.stops.indexOf(from))
  if (busRuntime.get(from)?.phase !== 'dwell') return busBoard(from)
  if (!offTheBike()) return false
  if (usePlayer.getState().currency === 'EUR' ? !payRideDe() : !payFare(busFare())) return false
  useUI.getState().closePanel()
  bumpFlag('stats.busRides')
  travelTo(b.scene, busSpawnKey(to), {
    minutes: stops * CONFIG.transit.busMinutesPerStop,
    label: { vi: `Xe buýt ${line.number} → ${b.name.vi}`, en: `Bus ${line.number} → ${b.name.en}`, de: `Bus ${line.number} → ${b.name.de ?? b.name.en}` },
    onArrive: () => busArrivals.add(to),
  })
  return true
}

registerActions({
  'ubahn.enter': ubahnEnter,
  'ubahn.exit': ubahnExit,
  'ubahn.board': ubahnBoard,
  'ubahn.go': ubahnGo,
  'bus.board': busBoard,
  'bus.go': busGo,
  'ticket.machine': openMachine,
  'ticket.buy': buyPass,
})

registerTests({
  /** Down in a U-Bahn station. */
  'ubahn.inside': () => useWorld.getState().scene === 'ubahn',
  'transit.rodeBus': () => Number(getFlag('stats.busRides') ?? 0) > 0,
  'transit.rodeUbahn': () => Number(getFlag('stats.ubahnRides') ?? 0) > 0,
  /** 1.49 a valid MVV day / week / month pass. */
  'transit.hasPass': hasPass,
})
