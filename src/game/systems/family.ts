import { CONFIG } from '../../data/config'
import { useFlags } from '../../store/flagsStore'
import { useMinigame } from '../../store/minigameStore'
import { usePlayer } from '../../store/playerStore'
import { useTime } from '../../store/timeStore'
import { pushToast } from '../../store/toastStore'
import { useWorld } from '../../store/worldStore'
import { registerActions } from './actions'
import { playSfx } from './audio'
import { bumpFlag, flagNumber, getFlag, registerTests, setFlag } from './conditions'
import { pay } from './effects'
import { spendTime, weekdayIndex } from './time'
import { L, say, vnd } from './say'

/**
 * Family and debt (story 2.1 §1.7–1.8, §2.2). Borrow 1/3/5 million from Bố or Mẹ (once a day),
 * and the yellow tube house gets poorer with the first loan, then at 15 / 30 million; repaying Mẹ restores it in reverse.
 * Also: Mẹ's xôi for breakfast, the weekly household contribution, tutoring Na, and the family
 * meeting about the Sperrkonto (mortgage the sổ đỏ, or ask cô Lan in Leipzig).
 */

const F = CONFIG.family
const today = () => useTime.getState().day
const hour = () => useTime.getState().minutes / 60

export const debtTotal = () => flagNumber('debt.total')
export const mortgaged = () => !!getFlag('debt.mortgage')

/** 0–3 by what the family lent you. The sổ đỏ mortgage is shown on top of it ("Đặc biệt"). */
export function houseLevel(debt = debtTotal()): number {
  let level = 0
  for (const at of F.debtLevels) if (debt >= at) level++
  return level
}

/** What the house looked like last time you walked in (for the little cutscene). */
export const houseKey = () => `${houseLevel()}${mortgaged() ? 'm' : ''}`

function borrow(arg?: string) {
  const [who, raw] = (arg ?? '').split(':')
  const amount = Number(raw)
  if ((who !== 'bo' && who !== 'me') || !F.loanSizes.includes(amount)) return false
  if (getFlag('debt.day') === today()) {
    say(L('Hôm nay con vừa vay rồi… Để mai hẵng tính.', 'You already borrowed today… Maybe tomorrow.', 'Heute schon geliehen… Morgen vielleicht.'), 'info')
    return false
  }
  const before = houseLevel()
  setFlag('debt.day', today())
  setFlag('debt.total', debtTotal() + amount)
  bumpFlag(`debt.count.${who}`)
  bumpFlag('debt.count')
  const p = usePlayer.getState()
  p.addMoney(amount)
  p.changeMood(F.loanMood)
  playSfx('coin')
  const after = houseLevel()
  setFlag('debt.peak', Math.max(flagNumber('debt.peak'), after))
  if (after >= 3) setFlag('debt.everLevel3', true)
  say(L('+{a} (nợ bố mẹ: {d})', '+{a} (owed to your parents: {d})', '+{a} (Schulden bei den Eltern: {d})'), 'info', { a: vnd(amount), d: vnd(debtTotal()) })
  if (after > before && after >= 3) say(L('Bố phải bán chiếc xe Wave… Không chạy Grab được nữa.', 'Dad had to sell his Wave motorbike… No more Grab.'), 'bad')
  return true
}

const NA_MESSAGES: Record<number, ReturnType<typeof L>> = {
  2: L('📱 Na: „Thợ đến trát lại tường rồi! Bố còn chuộc lại xe Wave nữa đó."', '📱 Na: “The builders fixed the wall! And Dad got his Wave back.”'),
  1: L('📱 Na: „Bố mua lại tivi rồi! Bố xem bóng đá to tiếng lắm 😂"', '📱 Na: “Dad bought the TV back! He watches football so loud 😂”'),
  0: L('📱 Na: „Mẹ lau hết mạng nhện, cắm hoa tươi lên bàn thờ rồi."', '📱 Na: “Mum cleaned the cobwebs and put fresh flowers on the altar.”'),
}

/** Give money back to Mẹ. arg = amount or 'all'. */
function repay(arg?: string) {
  const debt = debtTotal()
  if (debt <= 0) return false
  const money = usePlayer.getState().money
  const amount = Math.min(debt, arg === 'all' ? money : Number(arg))
  if (!(amount > 0)) {
    pushToast('toast.notEnoughMoney', 'bad')
    return false
  }
  if (!pay(amount)) return false
  const before = houseLevel()
  setFlag('debt.total', debt - amount)
  bumpFlag('debt.repaid', amount)
  playSfx('coin')
  const after = houseLevel()
  for (let l = before - 1; l >= after; l--) if (NA_MESSAGES[l] && l > 0) window.setTimeout(() => say(NA_MESSAGES[l], 'good'), 1200)
  if (debt - amount <= 0) {
    setFlag('debt.peak', 0)
    usePlayer.getState().changeMood(F.repaidMood)
    window.setTimeout(() => say(L('Bố treo lại đồng hồ lên tường, mẹ cắm hoa tươi lên bàn thờ. Cả nhà cười. (+20 tâm trạng)', 'Dad hangs the clock back on the wall, Mum puts fresh flowers on the altar. Everyone smiles. (+20 mood)'), 'good'), 1400)
  } else {
    say(L('Con trả mẹ {a}. Còn nợ {d}.', 'You give Mum {a}. Still owed: {d}.', 'Du gibst Mama {a}. Noch offen: {d}.'), 'good', { a: vnd(amount), d: vnd(debt - amount) })
  }
  return true
}

const week = () => Math.floor((today() - 1) / 7)

/** Góp tiền nhà: once a game week, optional. */
function contribute(arg?: string) {
  const amount = Number(arg)
  if (!F.contributions.includes(amount) || getFlag('family.contribWeek') === week()) return false
  if (!pay(amount)) return false
  setFlag('family.contribWeek', week())
  bumpFlag('family.contribWeeks')
  bumpFlag('family.contribTotal', amount)
  usePlayer.getState().changeMood(4)
  playSfx('coin')
  return true
}

/** Mẹ leaves xôi on the table: free breakfast before 8:00. */
function eatXoi() {
  if (getFlag('xoi.day') === today() || hour() >= F.xoiBefore) return false
  setFlag('xoi.day', today())
  usePlayer.getState().restoreEnergy(F.xoiEnergy)
  spendTime(10)
  playSfx('sip')
  say(L('Xôi mẹ để phần, vẫn còn ấm. (+10 năng lượng)', 'Mum’s sticky rice, still warm. (+10 energy)', 'Mamas Klebreis, noch warm. (+10 Energie)'), 'good')
  return true
}

/** "Kèm em học": Maths with Na, three evenings → Bin's mother asks for a tutor. */
function tutorNa() {
  if (getFlag('na.tutorDay') === today()) {
    say(L('Na: „Hôm nay học đủ rồi, mai anh/chị kèm tiếp nhé!"', 'Na: “Enough for today, let’s continue tomorrow!”'), 'info')
    return false
  }
  if (usePlayer.getState().energy < 6) {
    pushToast('toast.tooTired', 'bad')
    return false
  }
  useMinigame.getState().start({ kind: 'tutor', rank: 0 }, (r) => {
    setFlag('na.tutorDay', today())
    usePlayer.getState().spendEnergy(5)
    usePlayer.getState().changeMood(F.tutorNaMood)
    spendTime(60)
    const n = bumpFlag('stats.naTutor')
    if (n >= F.tutorNaSessions && !getFlag('job.tutor.unlocked')) {
      setFlag('job.tutor.unlocked', true)
      window.setTimeout(
        () =>
          say(
            L('Na khoe với cô chủ nhiệm. Mẹ bé Bin (Hàng Bông) nhắn: „Cháu dạy Toán lớp 8 cho Bin nhà cô được không?" → Mở việc Gia sư (Bảng việc trên điện thoại).', 'Na told her teacher. Bin’s mother (Hàng Bông) texts: “Could you tutor my Bin in year-8 maths?” → Tutoring unlocked (job board on your phone).'),
            'good',
          ),
        900,
      )
    } else {
      say(L('Na hiểu bài hơn rồi! (+5 tâm trạng) {n}/3', 'Na gets it now! (+5 mood) {n}/3'), 'good', { n: Math.min(n, F.tutorNaSessions) })
    }
    void r
  })
  return true
}

/** Family meeting, option A: mortgage the house (sổ đỏ) for the blocked account. */
function mortgage() {
  if (getFlag('visa.path') !== 'studium' || getFlag('sperr.done')) return false
  setFlag('debt.mortgage', F.mortgage)
  setFlag('sperr.done', true)
  setFlag('sperr.via', 'mortgage')
  usePlayer.getState().changeMood(-10)
  say(L('Anh Quân ở ngân hàng làm hồ sơ vay thế chấp cho bố. Cảnh ký giấy rất im lặng. Sperrkonto 11.904 € đã mở.', 'Quân at the bank draws up the mortgage for Dad. The signing is very quiet. The €11,904 blocked account is open.'), 'info')
  return true
}

/** Option B, step 1: decide to ask cô Lan (needs the 1989 letter from chú Hưng). */
function askLan() {
  if (getFlag('visa.path') !== 'studium' || getFlag('sperr.done') || !getFlag('lan.letter')) return false
  setFlag('sperr.lan', 'email')
  say(L('Viết email cho cô Lan bằng tiếng Đức ở bàn học (laptop) nhé.', 'Write cô Lan an email in German at your desk (laptop).'), 'info')
  return true
}

/** Option B, step 2: the email at the desk (B1 letter). */
function writeLanEmail() {
  if (getFlag('sperr.lan') !== 'email') return false
  useMinigame.getState().start({ kind: 'letter', set: 'lanEmail' }, (r) => {
    spendTime(45)
    if (r.passed) {
      setFlag('sperr.lan', 'call')
      say(L('📩 Cô Lan trả lời: „Tối mai cô gọi video cho cháu nhé." (Gọi từ laptop ở nhà, buổi tối.)', '📩 Cô Lan replies: “I’ll video-call you tomorrow evening.” (Laptop at home, evening.)'), 'good')
      setFlag('sperr.lanCallDay', today() + 1)
    } else {
      say(L('Email còn lỗi, viết lại cho chỉn chu nhé.', 'The email still has mistakes — rewrite it carefully.'), 'bad')
    }
  })
  return true
}

/** Option B, step 3: the video call — three questions, two good answers. */
function callLan() {
  if (getFlag('sperr.lan') !== 'call' || today() < flagNumber('sperr.lanCallDay') || hour() < 18) {
    say(L('Cô Lan hẹn gọi buổi tối (sau 18h).', 'Cô Lan will call in the evening (after 18:00).'), 'info')
    return false
  }
  useMinigame.getState().start({ kind: 'qa', set: 'coLan', count: 3, passScore: 0.6 }, (r) => {
    spendTime(40)
    if (r.passed) {
      setFlag('sperr.done', true)
      setFlag('sperr.via', 'lan')
      setFlag('lan.sponsor', true)
      setFlag('sperr.lan', 'done')
      usePlayer.getState().changeMood(12)
      say(L('Cô Lan: „Cô sẽ ký Verpflichtungserklärung ở Sở Ngoại kiều. Sang Leipzig thì nhớ ghé thăm cô!"', 'Cô Lan: “I’ll sign the Verpflichtungserklärung at the foreigners’ office. Visit me in Leipzig!”'), 'good')
    } else {
      setFlag('sperr.lanCallDay', today() + 1)
      say(L('Cô Lan: „Cháu suy nghĩ thêm rồi mai mình nói chuyện tiếp nhé."', 'Cô Lan: “Think about it a bit more, let’s talk again tomorrow.”'), 'info')
    }
  })
  return true
}

/** Option C: switch to Ausbildung (no blocked account needed). */
function switchToAusbildung() {
  if (getFlag('visa.path') !== 'studium') return false
  setFlag('visa.path', 'ausbildung')
  setFlag('sperr.lan', 0)
  say(L('Đổi sang Ausbildung: không cần Sperrkonto. Hồ sơ visa đã cập nhật.', 'Switched to Ausbildung: no blocked account needed. Visa file updated.'), 'good')
  return true
}

registerActions({
  'family.borrow': borrow,
  'family.repay': repay,
  'family.contribute': contribute,
  'family.xoi': eatXoi,
  'family.tutorNa': tutorNa,
  'family.mortgage': mortgage,
  'family.askLan': askLan,
  'family.lanEmail': writeLanEmail,
  'family.lanCall': callLan,
  'family.toAusbildung': switchToAusbildung,
})

registerTests({
  'family.canBorrow': () => getFlag('debt.day') !== today(),
  'family.inDebt': () => debtTotal() > 0,
  'family.level1': () => houseLevel() >= 1,
  'family.level2': () => houseLevel() >= 2,
  'family.level3': () => houseLevel() >= 3,
  'family.waveSold': () => houseLevel() >= 3,
  'family.mortgaged': mortgaged,
  'family.canContribute': () => getFlag('family.contribWeek') !== week(),
  'family.xoiReady': () => getFlag('xoi.day') !== today() && hour() < F.xoiBefore,
  'family.naTutorToday': () => getFlag('na.tutorDay') === today(),
  'family.evening': () => hour() >= 18,
  'family.meetingDue': () => getFlag('visa.path') === 'studium' && !getFlag('sperr.done'),
  'family.lanEmail': () => getFlag('sperr.lan') === 'email',
  'family.lanCall': () => getFlag('sperr.lan') === 'call',
  'family.lanCallReady': () => getFlag('sperr.lan') === 'call' && today() >= flagNumber('sperr.lanCallDay') && hour() >= 18,
  'family.weekday': () => weekdayIndex(today()) < 5,
})

/** Morning guilt at level ≥ 2, and the night shift's tiredness. Started from boot. */
export function startFamily() {
  let lastDay = today()
  return useTime.subscribe((s) => {
    if (s.day === lastDay) return
    lastDay = s.day
    window.setTimeout(() => {
      const p = usePlayer.getState()
      if (useWorld.getState().scene === 'home' && houseLevel() >= 2 && getFlag('de.arrived') === undefined) {
        p.changeMood(F.morningGuiltMood)
        say(L('Nhìn vết nứt trên tường mà thấy có lỗi… (−3 tâm trạng)', 'Looking at the crack in the wall, you feel guilty… (−3 mood)'), 'bad')
      }
      if (getFlag('job.nightTired') === s.day) {
        p.spendEnergy(10)
        say(L('Sau ca đêm vẫn còn mệt… (−10 năng lượng)', 'Still tired after the night shift… (−10 energy)'), 'bad')
      }
    }, 3200)
  })
}

/** Cutscene check: the house changed since you last walked in. */
export function houseChanged() {
  const shown = getFlag('house.shown')
  return (typeof shown === 'string' ? shown : '0') !== houseKey()
}
export const markHouseShown = () => useFlags.getState().setFlag('house.shown', houseKey())
