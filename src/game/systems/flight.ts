import { flightPlan, gateFlight, GATES, hhmm, LEG1, type FlightPlan, type GateId } from '../../data/flight'
import { useMinigame } from '../../store/minigameStore'
import { usePlayer } from '../../store/playerStore'
import { useTime } from '../../store/timeStore'
import { pushToast } from '../../store/toastStore'
import { useUI } from '../../store/uiStore'
import { useWorld } from '../../store/worldStore'
import { parseSeat, seatSpot } from '../scenes/Plane/layout'
import { registerActions } from './actions'
import { playSfx } from './audio'
import { bumpFlag, flagNumber, getFlag, registerTests, setFlag } from './conditions'
import { playerState } from './playerState'
import { L, say } from './say'
import { sitAt, standUp } from './seat'
import { travelTo } from './travel'
import { eurosInHand } from './visa'

/**
 * 1.43 The first flight to Germany, played instead of a fade (user: "cảnh lên máy bay… transit… tìm cổng"):
 *  1. Nội Bài gate 7 (`flight.depart`) → jet bridge + cabin (scene `plane`): find the seat on your boarding pass.
 *  2. The right seat → night flight → München (scene `transit`): follow "Anschlussflüge" (the "Ausgang" only leads
 *     to the baggage hall), Passkontrolle at "Alle Pässe" (a Q&A in German), read the departures board, find the gate.
 *  3. The right gate → RF … to Frankfurt → Lindenstraße (`de.arrived`).
 * Flags: fly.seed (the plan, data/flight.ts), fly.boarded, fly.seated, fly.passport, fly.boardRead, fly.wrongSeat,
 * fly.wrongGate, fly.done. Only the FIRST trip (the Tết trip home stays a fade).
 */

/** The plan for the flags as they are (UI: never writes a flag while rendering). */
export function currentFlightPlan(): FlightPlan {
  return flightPlan(flagNumber('fly.seed') || 1)
}

/** Make sure a plan exists (actions only). */
export function ensureFlightPlan(): FlightPlan {
  let seed = flagNumber('fly.seed')
  if (!seed) {
    seed = 1 + Math.floor(Math.random() * 999_998)
    setFlag('fly.seed', seed)
  }
  return flightPlan(seed)
}

const today = () => useTime.getState().day
const sceneNow = () => useWorld.getState().scene

/** Nội Bài, gate 7: the boarding pass is scanned, down the jet bridge. */
function depart() {
  if (!getFlag('visa.flight')) return false
  if (getFlag('de.arrived')) return false
  const player = usePlayer.getState()
  const blocked = flagNumber('visa.blocked')
  if (blocked > 0) {
    player.addMoney(blocked)
    setFlag('visa.blocked', 0)
  }
  if (eurosInHand() < 100) pushToast('toast.noEuros', 'info')
  ensureFlightPlan()
  playSfx('beep')
  travelTo('plane', 'default', {
    long: true,
    label: L(`Cổng ${LEG1.gate} · ${LEG1.flight} đi ${LEG1.toCity}`, `Gate ${LEG1.gate} · ${LEG1.flight} to ${LEG1.toCity}`),
    subtitle: L(`${hhmm(LEG1.boarding)} — mời quý khách lên máy bay`, `${hhmm(LEG1.boarding)} — boarding now`),
    onArrive: () => {
      // The night flight leaves at 23:45: wait at the gate until boarding starts (never back in time).
      const t = useTime.getState()
      if (t.minutes < LEG1.boarding && t.minutes >= 5 * 60) t.setTime(t.day, LEG1.boarding)
      setFlag('fly.boarded', today())
    },
    onDone: () => useUI.getState().openPanel({ type: 'boardingPass' }),
  })
  return true
}

let sitTimer: number | undefined

/** Sit down in a seat of the cabin. The right one → take-off; a wrong one → its owner turns up. */
function sit(code?: string) {
  const p = code ? parseSeat(code) : null
  if (!p || playerState.locked || sceneNow() !== 'plane') return false
  const plan = ensureFlightPlan()
  const spot = seatSpot(p.row, p.letter)
  sitAt(spot, 0, 0.78)
  window.clearTimeout(sitTimer)
  if (code === plan.seat) {
    setFlag('fly.seated', today())
    playSfx('bell')
    say(L(`Đúng ghế ${code}! Thắt dây an toàn, tắt điện thoại… Máy bay bắt đầu lăn bánh.`, `Seat ${code} — right! Seatbelt on, phone off… the plane starts to taxi.`), 'good')
    sitTimer = window.setTimeout(takeOff, 2600)
    return true
  }
  const wrong = bumpFlag('fly.wrongSeat')
  sitTimer = window.setTimeout(() => {
    standUp()
    say(
      L(
        `Một hành khách đến: „Entschuldigung… xin lỗi, ${code} là ghế của tôi!" Xem lại thẻ lên máy bay nhé.`,
        `A passenger arrives: "Excuse me, ${code} is my seat!" Check your boarding pass.`,
      ),
      'bad',
    )
    // 1.43 user: find the seat yourself — the attendant only tells you how to read it (from the 3rd wrong seat)
    if (wrong >= 3)
      window.setTimeout(
        () =>
          say(
            L(
              'Tiếp viên: „Anh/chị mở thẻ lên máy bay (nút vé) xem lại số ghế nhé — số là hàng, chữ là vị trí trong hàng. Biển số hàng treo ngay trên lối đi ạ."',
              'Attendant: "Open your boarding pass (ticket button) and check the seat — the number is the row, the letter the place in the row. Row signs hang above the aisle."',
            ),
            'info',
          ),
        1800,
      )
  }, 1500)
  return true
}

function takeOff() {
  travelTo('transit', 'default', {
    long: true,
    label: L(`✈ Bay đêm ${LEG1.flight}: Hà Nội → München`, `✈ Night flight ${LEG1.flight}: Hanoi → Munich`),
    subtitle: L('11 tiếng trên trời… Hạ cánh 06:05 giờ Đức', '11 hours in the air… landing 06:05 German time'),
    tone: 'night',
    onArrive: () => {
      const t = useTime.getState()
      // Took off before midnight → land the next morning.
      t.setTime(t.minutes >= 12 * 60 ? t.day + 1 : t.day, LEG1.arr)
      usePlayer.getState().changeMood(4)
    },
  })
}

/** The green "Ausgang" door in the arrival corridor: the way to the baggage hall, not to your connection. */
function exitTrap() {
  bumpFlag('fly.exitTried')
  say(
    L(
      'Lối này ra ngoài lấy hành lý (Gepäckausgabe). Vali của bạn đã được gửi thẳng tới Frankfurt — đi theo biển vàng „Anschlussflüge / Flight connections" mới đúng!',
      'This way leads out to baggage claim. Your suitcase is checked through to Frankfurt — follow the yellow "Anschlussflüge / Flight connections" signs!',
    ),
    'info',
  )
  return true
}

/** Passkontrolle at the "Alle Pässe" desk: a few questions in German. */
function passport() {
  if (getFlag('fly.passport') || sceneNow() !== 'transit') return false
  useMinigame.getState().start({ kind: 'qa', set: 'einreise', count: 4, passScore: 0.5 }, (r) => {
    if (r.passed) {
      setFlag('fly.passport', today())
      playSfx('stamp')
      say(L('„Willkommen in Deutschland!" — Cộp! Dấu nhập cảnh đã đóng vào hộ chiếu. Cửa chắn mở.', '“Welcome to Germany!” — stamp! The barrier opens.'), 'good')
    } else {
      say(L('Ông Krüger nhíu mày: „Noch einmal, bitte — langsam." (Lần nữa nhé, từ từ thôi.) Nói chuyện lại với ông ấy.', 'Mr Krüger frowns: “Once more, please — slowly.” Talk to him again.'), 'info')
    }
  })
  return true
}

/** The departures board (a panel, readable on a phone). */
function readBoard() {
  ensureFlightPlan()
  setFlag('fly.boardRead', true)
  useUI.getState().openPanel({ type: 'flightBoard' })
  return true
}

/** Show the boarding pass at a gate counter. */
function atGate(id?: string) {
  if (!id || !(GATES as readonly string[]).includes(id) || sceneNow() !== 'transit') return false
  const plan = ensureFlightPlan()
  const now = useTime.getState().minutes
  if (id === plan.leg2.gate) {
    say(L(`„${plan.leg2.flight} nach Frankfurt — richtig! Gute Reise!" (Đúng chuyến rồi, chúc đi vui vẻ!)`, `“${plan.leg2.flight} to Frankfurt — that's right! Have a good trip!”`), 'good')
    playSfx('beep')
    window.setTimeout(arrive, 900)
    return true
  }
  bumpFlag('fly.wrongGate')
  const f = gateFlight(plan, id as GateId, now)
  if (f?.decoy)
    say(
      L(
        `„Das ist ${f.flight} — Ihr Flug ist ${plan.leg2.flight}." Chuyến này cũng đi Frankfurt nhưng là số hiệu khác! Xem lại bảng điện tử.`,
        `“This is ${f.flight} — your flight is ${plan.leg2.flight}.” Also Frankfurt, but another flight number! Check the board.`,
      ),
      'bad',
    )
  else if (f)
    say(
      L(`„Dieser Flug geht nach ${f.dest}." (Chuyến ở cổng ${id} bay đi ${f.dest}.) Không phải chuyến của bạn — xem lại bảng điện tử.`, `“This flight goes to ${f.dest}.” Not yours — check the departures board.`),
      'bad',
    )
  else say(L(`Cổng ${id} đang trống, không có chuyến nào. Xem lại bảng điện tử nhé.`, `Gate ${id} has no flight right now. Check the board.`), 'bad')
  return true
}

/** The short hop to Frankfurt, then the train to the new home: chapter 3 begins. */
function arrive() {
  const plan = ensureFlightPlan()
  travelTo('germany', 'default', {
    long: true,
    label: L(`✈ ${plan.leg2.flight} München → Frankfurt`, `✈ ${plan.leg2.flight} Munich → Frankfurt`),
    subtitle: L('Rồi tàu ICE về Lindenberg… Chào nước Đức!', 'Then the ICE train to Lindenberg… Hallo Deutschland!'),
    onArrive: () => {
      setFlag('visa.blocked', 0)
      const t = useTime.getState()
      t.setTime(t.day, Math.min(Math.max(t.minutes + 60, 12 * 60), 20 * 60))
      setFlag('de.arrived', t.day)
      setFlag('fly.done', true)
      usePlayer.getState().changeMood(10)
    },
  })
}

registerActions({
  'flight.depart': depart,
  'plane.sit': sit,
  'flight.passPanel': () => {
    useUI.getState().openPanel({ type: 'boardingPass' })
    return true
  },
  'flight.exitTrap': exitTrap,
  'flight.passport': passport,
  'flight.board': readBoard,
  'flight.gate': atGate,
})

registerTests({
  /** The boarding pass matters (from gate 7 until you land in Germany). */
  'fly.passActive': () => !!getFlag('fly.boarded') && !getFlag('de.arrived'),
  'fly.inTransit': () => sceneNow() === 'transit',
})

// Dev / headless tests: the plan of this save.
if (import.meta.env.DEV) (window as unknown as { __flight?: () => FlightPlan }).__flight = currentFlightPlan

