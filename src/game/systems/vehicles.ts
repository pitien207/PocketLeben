import { create } from 'zustand'
import { CONFIG } from '../../data/config'
import { isVehicleId, VEHICLE_LIST, VEHICLES, type VehicleDef, type VehicleId } from '../../data/vehicles'
import { useFlags } from '../../store/flagsStore'
import { usePlayer } from '../../store/playerStore'
import { useTime } from '../../store/timeStore'
import { useUI } from '../../store/uiStore'
import { useWorld } from '../../store/worldStore'
import { registerActions } from './actions'
import { playSfx } from './audio'
import { getFlag, registerTests, setFlag } from './conditions'
import { playerState } from './playerState'
import { say, vnd } from './say'

/**
 * 1.35 Your own vehicle (data/vehicles.ts). Flags (saved): `veh.own.<id>` = day bought (false once sold),
 * `veh.fuel.<id>` 0–1 (missing = full), `veh.plate.<id>`, `veh.current` = the one the ride button takes.
 * Riding is not saved: you start every session on foot. The Player reads `rideState`/`useRide` every frame,
 * calls `burnFuel(metres)` and `dismount()` when the scene does not allow riding.
 */

interface RideState {
  /** The vehicle you sit on, or null on foot. */
  riding: VehicleId | null
  /** Fuel of the ridden vehicle in whole percent (for the HUD). */
  fuelPct: number
}

export const useRide = create<RideState>()(() => ({ riding: null, fuelPct: 100 }))

/** Fuel of the ridden vehicle, exact; saved to the flags in steps (CONFIG.vehicles.saveStep). */
const live = { fuel: 1, saved: 1 }

export const ownsVehicle = (id: VehicleId) => typeof getFlag(`veh.own.${id}`) === 'number'
export const ownedVehicles = (): VehicleDef[] => VEHICLE_LIST.filter((v) => ownsVehicle(v.id))
export function fuelOf(id: VehicleId) {
  if (useRide.getState().riding === id) return live.fuel
  const f = getFlag(`veh.fuel.${id}`)
  return typeof f === 'number' ? Math.max(0, Math.min(1, f)) : 1
}
export const plateOf = (id: VehicleId) => String(getFlag(`veh.plate.${id}`) ?? '')

/** The vehicle the ride button takes: `veh.current` if you still own it, else the first you own. */
export function currentVehicle(): VehicleDef | null {
  const cur = getFlag('veh.current')
  if (isVehicleId(cur) && ownsVehicle(cur)) return VEHICLES[cur]
  return ownedVehicles()[0] ?? null
}

export const rideAllowed = (scene = useWorld.getState().scene) => CONFIG.vehicles.rideScenes.includes(scene)

function saveFuel() {
  const id = useRide.getState().riding
  if (!id) return
  live.saved = live.fuel
  setFlag(`veh.fuel.${id}`, Math.round(live.fuel * 1000) / 1000)
}

/** Get on the current (or given) vehicle. Returns false (with a note) when that's not possible here. */
export function mount(id?: VehicleId): boolean {
  const def = id ? VEHICLES[id] : currentVehicle()
  if (!def || !ownsVehicle(def.id)) return false
  if (!rideAllowed()) {
    say({ vi: 'Ở đây không đi xe được — ra ngoài phố đã nhé.', en: 'You can’t ride here.' }, 'info')
    return false
  }
  if (playerState.locked || playerState.pose) return false
  if (def.tank > 0 && fuelOf(def.id) <= 0.001) {
    playSfx('wrong')
    say({ vi: `${def.name.vi} hết xăng rồi! Dắt bộ ra Xăng Dầu Phố Cổ (Phố Tràng Tiền) đổ xăng nhé.`, en: 'Out of fuel — refill at the petrol station.' }, 'bad')
    return false
  }
  live.fuel = fuelOf(def.id)
  live.saved = live.fuel
  setFlag('veh.current', def.id)
  useRide.setState({ riding: def.id, fuelPct: Math.round(live.fuel * 100) })
  playSfx(def.kind === 'bicycle' ? 'bell' : 'honk')
  return true
}

/**
 * 1.40 Grab (systems/grab.ts): with a passenger on the back you may not just get off (`blockGetOff` returns why);
 * `onGetOff` hears every dismount, also the forced ones (out of fuel, a room, sitting down).
 */
export const rideHooks: { blockGetOff: (() => string | null) | null; onGetOff: (() => void) | null } = { blockGetOff: null, onGetOff: null }

export function dismount() {
  if (!useRide.getState().riding) return
  saveFuel()
  useRide.setState({ riding: null })
  rideHooks.onGetOff?.()
}

export function toggleRide() {
  if (useRide.getState().riding) {
    const why = rideHooks.blockGetOff?.()
    if (why) {
      playSfx('wrong')
      say({ vi: why, en: why }, 'info')
      return
    }
    dismount()
  } else mount()
}

/** Called by the Player with the distance ridden this frame. */
export function burnFuel(metres: number) {
  const id = useRide.getState().riding
  if (!id || metres <= 0) return
  const def = VEHICLES[id]
  if (def.tank <= 0) return
  const before = live.fuel
  live.fuel = Math.max(0, live.fuel - metres / def.range)
  const pct = Math.ceil(live.fuel * 100)
  if (pct !== useRide.getState().fuelPct) useRide.setState({ fuelPct: pct })
  if (live.saved - live.fuel >= CONFIG.vehicles.saveStep) saveFuel()
  if (live.fuel <= 0) {
    dismount()
    playSfx('fail')
    say({ vi: `Xe hết xăng, phải xuống dắt bộ! Xăng Dầu Phố Cổ ở Phố Tràng Tiền, cạnh showroom xe.`, en: 'Out of fuel! The petrol station is on Phố Tràng Tiền.' }, 'bad')
  } else if (before > 0.1 && live.fuel <= 0.1) {
    say({ vi: 'Đèn báo xăng nháy đỏ — sắp hết xăng rồi!', en: 'The fuel light is blinking.' }, 'bad')
  }
}

/** A Hà Nội plate: 29–33, a series letter + digit, five digits. */
function newPlate() {
  const r = (n: number) => Math.floor(Math.random() * n)
  const letters = 'ABCDEFGHKLMNPSTUVXYZ'
  const digits = String(10000 + r(90000))
  return `${29 + r(5)}-${letters[r(letters.length)]}${1 + r(9)} ${digits.slice(0, 3)}.${digits.slice(3)}`
}

export const showroomOpen = () => {
  const h = useTime.getState().minutes / 60
  const [from, to] = CONFIG.vehicles.hours
  return h >= from && h < to
}

export function buyVehicle(id: VehicleId): boolean {
  const def = VEHICLES[id]
  const p = usePlayer.getState()
  if (ownsVehicle(id)) return false
  if (p.currency !== 'VND' || p.money < def.price) {
    playSfx('wrong')
    say({ vi: `Chưa đủ tiền: ${def.name.vi} giá ${vnd(def.price)}.`, en: 'Not enough money.' }, 'bad')
    return false
  }
  p.addMoney(-def.price)
  setFlag(`veh.own.${id}`, useTime.getState().day)
  setFlag(`veh.fuel.${id}`, 1)
  setFlag(`veh.plate.${id}`, def.kind === 'bicycle' ? '' : newPlate())
  setFlag('veh.current', id)
  playSfx('till')
  say(
    def.kind === 'bicycle'
      ? { vi: `Đã mua ${def.name.vi}! Bấm nút xe (phím F) để đạp đi.`, en: `Bought the ${def.name.en}! Tap the ride button (F).` }
      : { vi: `Đã mua ${def.name.vi}, biển số ${plateOf(id)}, đầy bình xăng! Bấm nút xe (phím F) để lên xe.`, en: `Bought the ${def.name.en}, full tank! Tap the ride button (F).` },
    'good',
  )
  return true
}

export const resaleOf = (def: VehicleDef) => Math.round((def.price * CONFIG.vehicles.resale) / 100_000) * 100_000

export function sellVehicle(id: VehicleId): boolean {
  const def = VEHICLES[id]
  if (def.borrowed || !ownsVehicle(id) || usePlayer.getState().currency !== 'VND') return false
  if (useRide.getState().riding === id) dismount()
  const pay = resaleOf(def)
  usePlayer.getState().addMoney(pay)
  setFlag(`veh.own.${id}`, false)
  setFlag(`veh.fuel.${id}`, 1)
  setFlag(`veh.plate.${id}`, '')
  if (getFlag('veh.current') === id) setFlag('veh.current', ownedVehicles()[0]?.id ?? '')
  playSfx('coin')
  say({ vi: `Đã bán lại ${def.name.vi}: nhận ${vnd(pay)}.`, en: `Sold the ${def.name.en} for ${vnd(pay)}.` }, 'good')
  return true
}

export function chooseVehicle(id: VehicleId) {
  if (!ownsVehicle(id)) return
  const riding = useRide.getState().riding
  setFlag('veh.current', id)
  if (riding && riding !== id) {
    dismount()
    mount(id)
  }
  playSfx('click')
}

/** Xăng Dầu Phố Cổ: fill the current engine vehicle (as much as the money allows). */
function refuel() {
  const say2 = (vi: string, en: string, tone: 'info' | 'bad' | 'good' = 'info') => say({ vi: `Anh bơm xăng: „${vi}"`, en }, tone)
  const engines = ownedVehicles().filter((v) => v.tank > 0)
  if (engines.length === 0) {
    say2(
      ownedVehicles().length ? 'Xe đạp thì đổ xăng vào đâu em! Muốn xe máy thì sang showroom ngay bên cạnh.' : 'Chưa có xe thì đổ vào đâu em? Showroom xe ngay bên cạnh đấy, sang xem đi!',
      'No engine to fill. The showroom is next door.',
    )
    return true
  }
  const cur = currentVehicle()
  const def = cur && cur.tank > 0 ? cur : engines.slice().sort((a, b) => fuelOf(a.id) - fuelOf(b.id))[0]
  const fuel = fuelOf(def.id)
  const litres = (1 - fuel) * def.tank
  if (litres < 0.05) {
    say2(`${def.name.vi} vẫn đầy bình mà em!`, 'The tank is still full.')
    return true
  }
  const { fuelPrice, fuelStep } = CONFIG.vehicles
  const full = Math.ceil((litres * fuelPrice) / fuelStep) * fuelStep
  const p = usePlayer.getState()
  if (p.currency !== 'VND' || p.money < fuelStep) {
    playSfx('wrong')
    say2(`Đầy bình hết ${vnd(full)}, em không đủ tiền rồi.`, 'Not enough money.', 'bad')
    return true
  }
  const pay = Math.min(full, Math.floor(p.money / fuelStep) * fuelStep)
  const added = pay >= full ? 1 - fuel : pay / fuelPrice / def.tank
  const next = Math.min(1, fuel + added)
  p.addMoney(-pay)
  setFlag(`veh.fuel.${def.id}`, Math.round(next * 1000) / 1000)
  if (useRide.getState().riding === def.id) {
    live.fuel = next
    live.saved = next
    useRide.setState({ fuelPct: Math.round(next * 100) })
  }
  playSfx('till')
  const l = (added * def.tank).toFixed(1).replace('.', ',')
  say(
    pay >= full
      ? { vi: `Đổ đầy bình ${def.name.vi}: ${l} lít, ${vnd(pay)}.`, en: `Filled up: ${l} l for ${vnd(pay)}.` }
      : { vi: `Đổ được ${l} lít cho ${def.name.vi} (${vnd(pay)}) — hết tiền rồi.`, en: `Put in ${l} l for ${vnd(pay)}.` },
    'good',
  )
  return true
}

function openShowroom() {
  if (!showroomOpen()) {
    const [from, to] = CONFIG.vehicles.hours
    playSfx('door')
    say({ vi: `Showroom đã kéo cửa (mở ${from}h–${to}h). Xe bạn đã mua vẫn đi được bình thường.`, en: 'The showroom is closed.' }, 'info')
    return true
  }
  useUI.getState().openPanel({ type: 'vehicles' })
  return true
}

registerActions({
  'veh.shop': openShowroom,
  'veh.ride': () => {
    toggleRide()
    return true
  },
  'place.gas': refuel,
})

registerTests({
  'veh.owned': () => ownedVehicles().length > 0,
  'veh.riding': () => useRide.getState().riding !== null,
})

// Selling or loading another save can take the ridden vehicle away.
useFlags.subscribe((s, prev) => {
  if (s.flags === prev.flags) return
  const id = useRide.getState().riding
  if (id && typeof s.flags[`veh.own.${id}`] !== 'number') useRide.setState({ riding: null })
})
