import { create } from 'zustand'
import { CONFIG } from '../../data/config'
import { EATERY_DEFS, type EateryId } from '../../data/eateries'
import type { Outfit } from '../../data/npcs'
import { VEHICLES } from '../../data/vehicles'
import { useDialogue } from '../../store/dialogueStore'
import { useFlags } from '../../store/flagsStore'
import { useMinigame } from '../../store/minigameStore'
import { usePlayer } from '../../store/playerStore'
import { useTime } from '../../store/timeStore'
import { useUI } from '../../store/uiStore'
import { useWorld } from '../../store/worldStore'
import { registerActions } from './actions'
import { playSfx } from './audio'
import { bumpFlag, flagNumber, getFlag, registerTests, setFlag } from './conditions'
import { eateryOpen } from './eateries'
import { houseLevel } from './family'
import { GRAB_STOPS, roadDist, type GrabStop } from './grabStops'
import { jobRank, rankMultiplier, recordJob } from './jobs'
import { playerState } from './playerState'
import { L, say, vnd } from './say'
import { currentVehicle, ownedVehicles, rideHooks, useRide } from './vehicles'
import { isRaining } from './weather'

/**
 * 1.40 Chạy Grab ngay trong thành phố (user: no mini-game any more). Turn the app on (phone → Việc, or ask Bố to
 * lend his Wave first) and offers pop up in the HUD card (ui/GrabCard.tsx): carry a passenger (`ride`, motorbike or
 * car), bring food from an eatery (`food`) or a parcel from the post office (`parcel`). Accept one, ride to the
 * pick-up (the guide arrow points there, systems/guide.ts), stop next to it, then ride to the drop-off. Paid on
 * delivery: base + metres, rain bonus, rank bonus, a tip for 5 stars. You need a vehicle of your own or Bố's Wave
 * (vehicle `boWave`, lent — no uniform needed).
 *
 * Nothing here is saved except the flags (`job.grab`, `grab.done`, `grab.starSum`, `grab.starCount`, ranks via
 * jobs.ts): the app is off when you load a game. Timers count only while you can drive (no panel, dialogue, …).
 * GrabWorld (components/GrabWorld.tsx) calls `grabTick` every frame and draws the waiting customers; the Player
 * draws the passenger / the delivery box.
 */

export type GrabKind = 'ride' | 'food' | 'parcel'

export interface GrabOffer {
  id: number
  kind: GrabKind
  from: GrabStop
  to: GrabStop
  /** Road metres pick-up → drop-off. */
  dist: number
  /** Road metres from you to the pick-up when it was offered. */
  toPickup: number
  fare: number
  /** Seconds for the whole job (to the pick-up and the trip) that still earn 5 stars. */
  eta: number
  /** Customer (GRAB_PEOPLE index). */
  who: number
  /** What is carried ("2 suất bún chả") — '' for a passenger. */
  item: string
  /** Grab clock (seconds) when the offer disappears. */
  expires: number
  rain: boolean
}

export interface GrabOrder extends GrabOffer {
  stage: 'pickup' | 'drop'
  /** Grab clock when accepted. */
  started: number
  /** Seconds stopped at the current point (pick-up / drop-off needs CONFIG holdSec). */
  hold: number
}

export interface GrabResult {
  kind: GrabKind
  stars: number
  pay: number
  tip: number
  failed?: string
}

interface GrabState {
  online: boolean
  offers: GrabOffer[]
  order: GrabOrder | null
  /** This shift (since the app went on). */
  shiftEarned: number
  shiftDone: number
  /** The last finished fare (the card shows it for a few seconds). */
  last: (GrabResult & { at: number }) | null
  /** A short hint in the card ("Lên xe đã", "Dừng lại cạnh khách"…). */
  hint: string | null
}

export const useGrab = create<GrabState>()(() => ({ online: false, offers: [], order: null, shiftEarned: 0, shiftDone: 0, last: null, hint: null }))

const G = CONFIG.vnJobs.grab

/** Customers: a name and how they look (passengers ride on the back; others wait at the door). */
export const GRAB_PEOPLE: { name: string; outfit: Outfit }[] = [
  { name: 'Chị Hà', outfit: { skin: '#f5cfb0', hair: '#2b2222', hairStyle: 'long', shirt: '#ffffff', shorts: '#2c3a5a', shoe: '#ffffff', bag: '#d4473b', accessory: 'sunglasses', bottom: 'skirt', top: 'long', lashes: true, expression: 'happy' } },
  { name: 'Anh Tuấn Anh', outfit: { skin: '#e8b994', hair: '#1f1a1a', hairStyle: 'short', shirt: '#8fb8de', shorts: '#2a2a30', shoe: '#5b4038', bag: '#3a3a40', accessory: null, bottom: 'pants', top: 'long', neck: 'tie', neckColor: '#2c3a5a', expression: 'neutral' } },
  { name: 'Bác Bình', outfit: { skin: '#e0b08a', hair: '#bdb6bd', hairStyle: 'short', shirt: '#cfe0c8', shorts: '#5d6b8a', shoe: '#5d6170', bag: null, accessory: 'cap', accent: '#2f6b4f', bottom: 'pants', top: 'long', expression: 'happy' } },
  { name: 'Em Linh Chi', outfit: { skin: '#fbe2d0', hair: '#3a2a22', hairStyle: 'twin', shirt: '#ff9fb2', shorts: '#4f8fd8', shoe: '#ffffff', bag: '#ffd23f', accessory: 'bow', accent: '#ff6f91', bottom: 'skirt', top: 'tee', lashes: true, expression: 'happy' } },
  { name: 'Mr. Jakob', outfit: { skin: '#f6d5c0', hair: '#e0b45e', hairStyle: 'curly', shirt: '#7fc27a', shorts: '#c9b79a', shoe: '#8a5a3c', bag: '#5b4038', accessory: 'sunglasses', bottom: 'shorts', top: 'tee', eye: '#4f86d9', expression: 'happy' } },
  { name: 'Cô Nga', outfit: { skin: '#f0c8a8', hair: '#2b2222', hairStyle: 'bun', shirt: '#b8a0d8', shorts: '#2a2628', shoe: '#7aa6c9', bag: null, accessory: 'nonLa', bottom: 'pants', top: 'baba', pattern: 'flowers', patternColor: '#ffffff', shoeType: 'sandal', lashes: true, expression: 'happy' } },
  { name: 'Anh Khoa', outfit: { skin: '#e8b994', hair: '#2a2020', hairStyle: 'spiky', shirt: '#2a2a30', shorts: '#3f4a5c', shoe: '#ffffff', bag: '#3a3a40', accessory: 'headphones', bottom: 'pants', top: 'hoodie', expression: 'neutral' } },
  { name: 'Chị Thảo', outfit: { skin: '#f7d6bd', hair: '#7a2a3a', hairStyle: 'shoulder', shirt: '#f2e6cf', shorts: '#4f6fa8', shoe: '#ffffff', bag: '#e8dcc0', accessory: 'mask', accent: '#bfe3f2', top: 'cardigan', patternColor: '#ffb59e', bottom: 'overalls', lashes: true, eyeShape: 'sparkle', expression: 'happy' } },
  { name: 'Anh Đức', outfit: { skin: '#e8b994', hair: '#1f1a1a', hairStyle: 'sideSwept', shirt: '#5b8f6a', shorts: '#3f4a5c', shoe: '#5d4a3e', bag: '#3a3a40', accessory: 'bucketHat', accent: '#5f7a4a', top: 'polo', bottom: 'pants', faceMark: 'freckles', expression: 'neutral' } },
  { name: 'Chị Mai Phương', outfit: { skin: '#fbdcc4', hair: '#5b3a2c', hairStyle: 'ponytail', shirt: '#ffe08a', shorts: '#ffffff', shoe: '#d4473b', bag: '#ffffff', accessory: null, bottom: 'skirt', top: 'dress', lashes: true, expression: 'happy' } },
]

const PARCELS = ['Hộp quà sinh nhật', 'Thùng sách', 'Túi hồ sơ gấp', 'Hộp điện thoại mới', 'Kiện quần áo', 'Thư bảo đảm', 'Thùng hoa quả quê gửi lên']

// --- The clock and helpers ----------------------------------------------------------------------------------------

/** Seconds of play while the app could be used (panels, dialogues and mini-games pause it). */
export const grabClock = { t: 0 }
let offerId = 1
let nextOfferAt = 0
let lastPos = { x: 0, z: 0 }
let speed = 0

const hour = () => useTime.getState().minutes / 60
const inHours = () => hour() >= G.hours[0] && hour() < G.hours[1]
const rand = (a: number, b: number) => a + Math.random() * (b - a)
const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)]
const round1k = (n: number) => Math.round(n / 1000) * 1000

/** Bố's Wave is yours while you are registered and the house is not at level 3 (he sells it then). */
const waveLent = () => !!getFlag('job.grab') && houseLevel() < 3
/** Any vehicle at all (yours or Bố's)? */
export const hasGrabVehicle = () => ownedVehicles().length > 0

const pickupOpen = (s: GrabStop) => {
  if (s.food === 'nhaHang') return hour() >= 10 && hour() < 22
  if (s.food) return eateryOpen(s.food as EateryId)
  if (s.post) return hour() >= G.postHours[0] && hour() < G.postHours[1]
  return true
}

function itemFor(kind: GrabKind, from: GrabStop) {
  if (kind === 'parcel') return pick(PARCELS)
  if (kind === 'food') return from.food === 'nhaHang' ? pick(['2 suất cơm gia đình', '1 lẩu cua đồng', '3 suất nem + cơm']) : pick(EATERY_DEFS[from.food as EateryId].orders)
  return ''
}

/** The point you are heading for now, and what to call it. */
export function grabTarget(): { x: number; z: number; label: string } | null {
  const { online, order } = useGrab.getState()
  if (!online || !order || useWorld.getState().scene !== 'vietnam') return null
  const s = order.stage === 'pickup' ? order.from : order.to
  return { x: s.x, z: s.z, label: s.name }
}

/** A passenger is sitting behind you. */
export const passengerAboard = () => {
  const o = useGrab.getState().order
  return !!o && o.kind === 'ride' && o.stage === 'drop'
}

// --- Offers -------------------------------------------------------------------------------------------------------

function makeOffer(): GrabOffer | null {
  const veh = currentVehicle()
  if (!veh) return null
  const p = { x: playerState.position.x, z: playerState.position.z }
  const kinds: GrabKind[] = []
  const w = G.weights
  const pool: [GrabKind, number][] = [
    ['ride', veh.kind === 'bicycle' ? 0 : w.ride],
    ['food', w.food],
    ['parcel', pickupOpen(GRAB_STOPS.find((s) => s.post)!) ? w.parcel : 0],
  ]
  const total = pool.reduce((a, [, x]) => a + x, 0)
  let r = Math.random() * total
  for (const [k, x] of pool) {
    if ((r -= x) <= 0 && x > 0) {
      kinds.push(k)
      break
    }
  }
  const kind = kinds[0] ?? 'food'
  const taken = new Set(useGrab.getState().offers.map((o) => o.from.id))
  const near = (list: GrabStop[], n: number) => list.map((s) => ({ s, d: roadDist(p, s) })).sort((a, b) => a.d - b.d).slice(0, n)
  let from: GrabStop | undefined
  if (kind === 'food') {
    const open = GRAB_STOPS.filter((s) => s.food && pickupOpen(s) && !taken.has(s.id))
    from = pick(near(open, 3))?.s
  } else if (kind === 'parcel') {
    from = GRAB_STOPS.find((s) => s.post)
  } else {
    const spots = GRAB_STOPS.filter((s) => !s.food && !s.post && !taken.has(s.id))
    const close = near(spots, 8).filter((x) => x.d > 12)
    from = pick(close.length ? close : near(spots, 4))?.s
  }
  if (!from) return null
  const drops = GRAB_STOPS.filter((s) => s.id !== from.id && !s.post && (kind === 'ride' || !s.food)).map((s) => ({ s, d: roadDist(from, s) }))
  const fitting = drops.filter((x) => x.d >= 45 && x.d <= 260)
  const to = pick(fitting.length ? fitting : drops)
  if (!to) return null
  const dist = to.d
  const toPickup = roadDist(p, from)
  const rain = isRaining(useTime.getState().day, useTime.getState().minutes, 'vn')
  const rates = G[kind]
  const fare = round1k((rates.base + rates.perMetre * dist) * (rain ? 1 + G.rainBonus : 1) * rankMultiplier('grab'))
  const v = CONFIG.player.walkSpeed * veh.speed * G.etaSpeed
  const eta = Math.round((toPickup + dist) / v + G.etaExtra + (kind === 'food' ? 6 : 0))
  return { id: offerId++, kind, from, to: to.s, dist: Math.round(dist), toPickup: Math.round(toPickup), fare, eta, who: Math.floor(Math.random() * GRAB_PEOPLE.length), item: itemFor(kind, from), expires: grabClock.t + G.offerTtl, rain }
}

// --- Going on / off -----------------------------------------------------------------------------------------------

export function grabOnline(): boolean {
  if (useGrab.getState().online) return true
  if (!hasGrabVehicle()) {
    say(
      getFlag('job.grab')
        ? L('Bố bán xe Wave rồi… Muốn chạy Grab thì phải có xe riêng (Showroom Xe Phố Cổ, Phố Tràng Tiền).', 'Dad sold the Wave… you need a vehicle of your own.')
        : L('Chạy Grab phải có xe! Hỏi mượn xe Wave của bố (ở nhà) hoặc mua xe ở Showroom Xe Phố Cổ.', 'You need a vehicle: borrow Dad’s Wave or buy one.'),
      'info',
    )
    return false
  }
  if (useWorld.getState().scene !== 'vietnam') {
    say(L('Ra phố đã rồi hãy bật app Grab nhé.', 'Go out into the street first.'), 'info')
    return false
  }
  if (!inHours()) {
    say(L('App Grab: giờ này vắng khách lắm ({a}–{b}h).', 'Grab app: hardly anyone at this hour ({a}–{b}).'), 'info', { a: G.hours[0], b: G.hours[1] })
    return false
  }
  useGrab.setState({ online: true, offers: [], order: null, shiftEarned: 0, shiftDone: 0, last: null, hint: null })
  nextOfferAt = grabClock.t + 1.5
  setFlag('job.grab.used', true)
  playSfx('ding')
  say(
    useRide.getState().riding
      ? L('Đã bật app Grab. Cuốc mới sẽ hiện ở góc trên — bấm „Nhận" để chạy!', 'Grab is on. Offers show up top — tap “Accept”!')
      : L('Đã bật app Grab. Lên xe (nút xe / phím F) rồi nhận cuốc nhé!', 'Grab is on. Get on your vehicle (F) and take a fare!'),
    'good',
  )
  return true
}

export function grabOffline(reason?: string) {
  const s = useGrab.getState()
  if (!s.online) return
  if (s.order) fail(reason ?? 'Bạn tắt app giữa chừng — cuốc bị hủy.', false)
  const { shiftDone, shiftEarned } = useGrab.getState()
  useGrab.setState({ online: false, offers: [], order: null, hint: null })
  if (shiftDone > 0) say(L('Tắt app Grab: {n} cuốc, +{m}.', 'Grab off: {n} fares, +{m}.'), 'good', { n: shiftDone, m: vnd(shiftEarned) })
  else if (reason) say({ vi: reason, en: reason }, 'info')
}

export function acceptOffer(id?: number) {
  const s = useGrab.getState()
  if (!s.online || s.order) return false
  const offer = id === undefined ? s.offers[0] : s.offers.find((o) => o.id === id)
  if (!offer) return false
  useGrab.setState({ order: { ...offer, stage: 'pickup', started: grabClock.t, hold: 0 }, offers: [], hint: null })
  playSfx('click')
  const what = offer.kind === 'ride' ? `Đón ${GRAB_PEOPLE[offer.who].name} ở ${offer.from.name}` : offer.kind === 'food' ? `Lấy đồ ăn ở ${offer.from.name}` : `Lấy hàng ở ${offer.from.name}`
  say({ vi: `Đã nhận cuốc! ${what} — theo mũi tên nhé.`, en: 'Fare accepted — follow the arrow.' }, 'good')
  return true
}

export function skipOffer(id: number) {
  useGrab.setState((s) => ({ offers: s.offers.filter((o) => o.id !== id) }))
}

export function cancelOrder() {
  if (!useGrab.getState().order) return
  fail('Bạn đã hủy cuốc. Khách chấm 1★…', true)
}

// --- Finishing a fare ---------------------------------------------------------------------------------------------

function rate(stars: number) {
  bumpFlag('grab.starSum', stars)
  bumpFlag('grab.starCount')
}

/** Average stars of all fares (5 before the first one). */
export function grabRating() {
  const n = flagNumber('grab.starCount')
  return n ? flagNumber('grab.starSum') / n : 5
}

function fail(why: string, rated: boolean) {
  const o = useGrab.getState().order
  if (!o) return
  if (rated) rate(1)
  useGrab.setState({ order: null, hint: null, last: { kind: o.kind, stars: rated ? 1 : 0, pay: 0, tip: 0, failed: why, at: grabClock.t } })
  nextOfferAt = grabClock.t + 3
  playSfx('fail')
  say({ vi: why, en: why }, 'bad')
}

function complete(o: GrabOrder) {
  const took = grabClock.t - o.started
  const k = took / o.eta
  const stars = k <= 1 ? 5 : k <= 1.25 ? 4 : k <= 1.6 ? 3 : 2
  const tip = stars === 5 && o.kind !== 'parcel' ? round1k(G.tip * rand(0.5, 1.6)) : 0
  const pay = o.fare + tip
  usePlayer.getState().addMoney(pay)
  rate(stars)
  bumpFlag('grab.done')
  bumpFlag(`grab.${o.kind}`)
  recordJob('grab')
  playSfx('coin')
  useGrab.setState((s) => ({ order: null, hint: null, shiftEarned: s.shiftEarned + pay, shiftDone: s.shiftDone + 1, last: { kind: o.kind, stars, pay, tip, at: grabClock.t } }))
  nextOfferAt = grabClock.t + rand(1.5, 3.5)
  const who = GRAB_PEOPLE[o.who].name
  const thanks = stars >= 5 ? pick(['Cảm ơn em, chạy nhanh mà êm quá!', 'Tuyệt vời, 5 sao cho em!', 'Đồ còn nóng hổi luôn, cảm ơn nhé!']) : stars >= 4 ? 'Cảm ơn em nhé.' : 'Hơi lâu đấy em…'
  say({ vi: `${who}: „${thanks}" ${'★'.repeat(stars)} · +${vnd(pay)}${tip ? ` (tip ${vnd(tip)})` : ''}`, en: `${stars}★ · +${vnd(pay)}` }, stars >= 4 ? 'good' : 'info')
}

// --- Every frame (GrabWorld) --------------------------------------------------------------------------------------

/** Can the app run right now (timers, offers)? Not while a panel, a dialogue or a mini-game has the screen. */
function paused() {
  const ui = useUI.getState()
  return ui.panel !== null || ui.sleeping || ui.transition !== null || ui.fastForward !== null || ui.newDayOpen || useDialogue.getState().npcId !== null || useMinigame.getState().active !== null
}

function setHint(hint: string | null) {
  if (useGrab.getState().hint !== hint) useGrab.setState({ hint })
}

export function grabTick(dt: number) {
  const p = playerState.position
  if (dt > 0) speed = speed + (Math.hypot(p.x - lastPos.x, p.z - lastPos.z) / dt - speed) * Math.min(1, dt * 8)
  lastPos = { x: p.x, z: p.z }
  const s = useGrab.getState()
  if (!s.online || paused()) return
  grabClock.t += dt
  const now = grabClock.t

  // Offers come and go while you have no fare
  if (!s.order) {
    const live = s.offers.filter((o) => o.expires > now)
    if (live.length !== s.offers.length) useGrab.setState({ offers: live })
    if (now >= nextOfferAt && live.length < G.maxOffers) {
      if (!inHours()) {
        grabOffline('Hết giờ chạy Grab rồi (6–23h), app tự tắt.')
        return
      }
      const offer = makeOffer()
      if (offer) {
        useGrab.setState({ offers: [...live, offer] })
        playSfx('ding')
      }
      nextOfferAt = now + rand(G.offerGap[0], G.offerGap[1])
    }
    setHint(useRide.getState().riding ? null : 'Lên xe để chạy (nút xe / phím F)')
    return
  }

  const o = s.order
  if (now - o.started > o.eta * G.giveUp) {
    fail(o.stage === 'pickup' ? `${GRAB_PEOPLE[o.who].name} chờ lâu quá nên đã hủy cuốc (1★).` : `${GRAB_PEOPLE[o.who].name} chờ lâu quá, hủy đơn và chấm 1★.`, true)
    return
  }
  const target = o.stage === 'pickup' ? o.from : o.to
  const d = Math.hypot(p.x - target.x, p.z - target.z)
  const riding = !!useRide.getState().riding
  // At the pick-up you must be on your vehicle; a passenger can only be dropped from it too
  const needRide = o.stage === 'pickup' || o.kind === 'ride'
  if (d > G.radius) {
    if (o.hold) useGrab.setState({ order: { ...o, hold: 0 } })
    setHint(!riding && needRide ? 'Lên xe đã (nút xe / phím F)' : null)
    return
  }
  if (needRide && !riding) {
    setHint(o.stage === 'pickup' ? 'Lên xe đã rồi mới đón được (phím F)' : 'Khách đang ngồi sau xe!')
    return
  }
  if (speed > G.stopSpeed && riding) {
    setHint('Dừng xe lại cạnh điểm hẹn')
    if (o.hold) useGrab.setState({ order: { ...o, hold: 0 } })
    return
  }
  setHint(null)
  const hold = o.hold + dt
  if (hold < G.holdSec) {
    useGrab.setState({ order: { ...o, hold } })
    return
  }
  if (o.stage === 'pickup') {
    useGrab.setState({ order: { ...o, stage: 'drop', hold: 0 } })
    playSfx(o.kind === 'ride' ? 'door' : 'pickup')
    const who = GRAB_PEOPLE[o.who].name
    say(
      {
        vi: o.kind === 'ride' ? `${who} lên xe: „Cho chị/anh đến ${o.to.name} nhé!"` : o.kind === 'food' ? `Nhận ${o.item} — giao đến ${o.to.name} cho ${who}.` : `Nhận ${o.item.toLowerCase()} — giao đến ${o.to.name}.`,
        en: 'Picked up — now to the drop-off.',
      },
      'info',
    )
    return
  }
  complete(o)
}

// --- Hooks into the rest of the game -------------------------------------------------------------------------------

rideHooks.blockGetOff = () => (passengerAboard() ? 'Đang chở khách — đến nơi rồi hãy xuống xe!' : null)
rideHooks.onGetOff = () => {
  // Forced off the vehicle (out of fuel, a door, sitting down) with someone on the back: they get off too.
  if (passengerAboard()) fail('Xe dừng giữa đường, khách xuống bắt xe khác (1★).', true)
}

// Leaving the street (home, an office, the airport…) switches the app off.
useWorld.subscribe((s, prev) => {
  if (s.scene !== prev.scene && s.scene !== 'vietnam') grabOffline('App Grab tự tắt khi bạn rời phố.')
})
useUI.subscribe((s, prev) => {
  if (s.sleeping && !prev.sleeping) grabOffline()
})

/** Bố's Wave comes and goes with `job.grab` and the house level (he sells it at level 3, buys it back later). */
let syncing = false
useFlags.subscribe((s, prev) => {
  if (s.flags === prev.flags || syncing) return
  const want = waveLent()
  const has = typeof s.flags['veh.own.boWave'] === 'number'
  if (want === has) return
  syncing = true
  try {
    if (want) {
      setFlag('veh.own.boWave', useTime.getState().day)
      if (getFlag('veh.fuel.boWave') === undefined) setFlag('veh.fuel.boWave', 1)
      if (!getFlag('veh.plate.boWave')) setFlag('veh.plate.boWave', '29-H1 268.39')
      if (!getFlag('veh.current')) setFlag('veh.current', 'boWave')
    } else {
      setFlag('veh.own.boWave', false)
      if (getFlag('veh.current') === 'boWave') setFlag('veh.current', ownedVehicles()[0]?.id ?? '')
    }
  } finally {
    syncing = false
  }
})

/** Bố lends you his Wave (dialogue): free, no uniform. */
function grabRegister() {
  if (getFlag('job.grab')) return false
  if (houseLevel() >= 3) {
    say(L('Bố bán xe Wave rồi… không còn xe để cho mượn.', 'Dad sold the Wave… nothing to lend.'), 'bad')
    return false
  }
  setFlag('job.grab', true)
  setFlag('veh.current', 'boWave')
  playSfx('success')
  say(L('Bố đưa chìa khóa xe Wave! Bấm nút xe (phím F) để lên xe, rồi mở điện thoại → Việc → „Bật app Grab".', 'Dad hands you the Wave’s keys! Ride with F, then phone → Jobs → “Turn on Grab”.'), 'good')
  return true
}

function toggleApp() {
  if (useGrab.getState().online) grabOffline()
  else grabOnline()
  return true
}

registerActions({
  'job.grabRegister': grabRegister,
  'job.grab': toggleApp,
  'grab.on': grabOnline,
  'grab.off': () => (grabOffline(), true),
  'grab.accept': () => acceptOffer(),
})

registerTests({
  'grab.online': () => useGrab.getState().online,
  'grab.hasVehicle': hasGrabVehicle,
})

/** Rank of the Grab job (for the card). */
export const grabRank = () => jobRank('grab')
export const vehicleOfRide = () => {
  const r = useRide.getState().riding
  return r ? VEHICLES[r] : null
}
