import { CONFIG } from '../../data/config'
import { useDialogue } from '../../store/dialogueStore'
import { useMinigame } from '../../store/minigameStore'
import { usePlayer } from '../../store/playerStore'
import { useTime } from '../../store/timeStore'
import { pushToast } from '../../store/toastStore'
import { useUI } from '../../store/uiStore'
import { useWorld } from '../../store/worldStore'
import { registerActions } from './actions'
import { playSfx } from './audio'
import { bumpFlag, getFlag, registerTests, setFlag } from './conditions'
import { openDialogue } from './dialogue'
import { pay } from './effects'
import { spendTime, weekdayIndex } from './time'
import { travelTo } from './travel'
import { L, say, vnd } from './say'

/**
 * Story 2.1, chapters 1–2 in Vietnam: Văn phòng Mai Anh, the Sonnenhof bridge programme (Cầu nối),
 * Linh and the Hoàng Kim agency, chú Hưng's 1989 letter, scam text messages and the new morning
 * events. Visa paperwork lives in visa.ts, family and debt in family.ts, side jobs in jobs.ts.
 */

const today = () => useTime.getState().day
const hour = () => useTime.getState().minutes / 60

/** Văn phòng Mai Anh: Mon–Sat 8–18. */
const maiOpen = () => weekdayIndex(today()) < 6 && hour() >= 8 && hour() < 18

function enterMai() {
  if (!maiOpen()) {
    say(L('Văn phòng Mai Anh đóng cửa rồi (thứ Hai–Bảy, 8–18h).', 'The Mai Anh office is closed (Mon–Sat, 8:00–18:00).', 'Büro Mai Anh geschlossen (Mo–Sa, 8–18 Uhr).'), 'info')
    return false
  }
  playSfx('door')
  travelTo('maiOffice', 'default', { minutes: 2 })
  return true
}

function leaveMai() {
  playSfx('door')
  travelTo('vietnam', 'maiDoor', { minutes: 2 })
  return true
}

// --- Cầu nối Sonnenhof (story 2.1 §1.5) ---------------------------------------------------------

function cauNoiInterview() {
  if (getFlag('cauNoi.interviewed') || getFlag('cauNoi.decided')) return false
  if (getFlag('cauNoi.triedDay') === today()) {
    say(L('Chị Anna hẹn phỏng vấn lại vào ngày mai.', 'Anna will interview you again tomorrow.', 'Anna macht morgen ein neues Interview.'), 'info')
    return false
  }
  useMinigame.getState().start({ kind: 'qa', set: 'cauNoi', count: 4, passScore: 0.5 }, (r) => {
    setFlag('cauNoi.triedDay', today())
    spendTime(30)
    if (r.passed) {
      setFlag('cauNoi.interviewed', true)
      say(L('Anna: „Sehr gut! Chị gửi hợp đồng cho em. Đọc thật kỹ trước khi ký nhé."', 'Anna: “Sehr gut! I’ll send you the contract. Read it carefully before you sign.”'), 'good')
    } else {
      say(L('Anna: „Chúng ta thử lại ngày mai nhé, em cứ bình tĩnh."', 'Anna: “Let’s try again tomorrow, take it easy.”'), 'info')
    }
  })
  return true
}

function cauNoiRead() {
  if (!getFlag('cauNoi.interviewed') || getFlag('cauNoi.read')) return false
  useMinigame.getState().start({ kind: 'clauses', doc: 'cauNoi' }, (r) => {
    spendTime(20)
    if (r.passed) {
      setFlag('cauNoi.read', true)
      say(L('Đã hiểu hợp đồng: lương 1.490 € brutto, 2 năm làm ở Sonnenhof sau tốt nghiệp, nghỉ sớm thì hoàn tối đa 3.000 €.', 'Contract understood: €1,490 gross, 2 years at Sonnenhof after graduating, at most €3,000 back if you leave early.'), 'good')
    } else {
      say(L('Đọc lại cho kỹ nhé, hợp đồng thì không được đọc lướt!', 'Read it again — never skim a contract!'), 'bad')
    }
  })
  return true
}

function cauNoiSign() {
  if (!getFlag('cauNoi.read') || getFlag('cauNoi.decided')) return false
  setFlag('cauNoi.signed', true)
  setFlag('cauNoi.decided', 'signed')
  playSfx('stamp')
  usePlayer.getState().changeMood(8)
  say(L('Đã ký Cầu nối! Khóa B1, lệ phí thi B1 và vé máy bay do Sonnenhof trả. Chương 2 chỉ còn đường Ausbildung.', 'Signed! Sonnenhof pays the B1 course, the B1 exam and the flight. In chapter 2 only Ausbildung is possible.'), 'good')
  return true
}

function cauNoiDecline() {
  if (getFlag('cauNoi.decided')) return false
  setFlag('cauNoi.decided', 'alone')
  say(L('Bạn quyết định tự đi: giữ cả hai đường, nhưng phải tự lo hết chi phí.', 'You decide to go alone: both paths stay open, but you pay for everything.'), 'info')
  return true
}

// --- Linh and Hoàng Kim (story 2.1 §1.6, §2.0) ---------------------------------------------------

function studyWithLinh() {
  if (getFlag('linh.studyDay') === today()) {
    say(L('Linh: „Hôm nay học đủ rồi, mai mình học tiếp nha!"', 'Linh: “Enough for today, let’s continue tomorrow!”'), 'info')
    return false
  }
  if (usePlayer.getState().energy < 6) return pushToast('toast.tooTired', 'bad'), false
  useMinigame.getState().start({ kind: 'vocab', level: usePlayer.getState().german.level, count: 5 }, (r) => {
    setFlag('linh.studyDay', today())
    setFlag('linh.studied', true)
    bumpFlag('stats.linhStudy')
    usePlayer.getState().spendEnergy(5)
    spendTime(45)
    const xp = 4 + r.correct * 2
    usePlayer.getState().addGermanXp(xp)
    say(L('Học nhóm với Linh: +{xp} XP. Linh: „Tớ mà sang được Đức thì mẹ tớ khỏi phải đi cấy thuê nữa."', 'Studying with Linh: +{xp} XP. Linh: “If I make it to Germany, my mum won’t have to work other people’s rice fields any more.”'), 'good', { xp })
  })
  return true
}

/** The Hoàng Kim contract: find the three scam signs. */
function spotScam() {
  if (getFlag('scam.spotted')) return false
  useMinigame.getState().start({ kind: 'clauses', doc: 'hoangKim' }, (r) => {
    spendTime(15)
    if (r.passed) {
      setFlag('scam.spotted', true)
      usePlayer.getState().changeMood(10)
      say(L('Tìm đủ 3 dấu hiệu lừa! Phải nói cho Linh biết.', 'All 3 scam signs found! You must tell Linh.'), 'good')
    } else {
      say(L('Anh Khải cười: „Hợp đồng chuẩn mà em." Hmm… nhìn lại kỹ hơn xem.', 'Khải grins: “It’s a proper contract.” Hmm… look again more carefully.'), 'info')
    }
  })
  return true
}

// --- Phone messages: scams and family news (story 2.1 §7) ---------------------------------------

/** Open the "message" conversation once nothing else is on screen. */
function showMessage(kind: string) {
  setFlag('sms.pending', kind)
  let tries = 0
  const tryOpen = () => {
    const ui = useUI.getState()
    const busy = ui.daySummary || ui.sleeping || ui.transition || ui.panel || useDialogue.getState().npcId || useMinigame.getState().active
    if (busy && tries++ < 60) {
      window.setTimeout(tryOpen, 700)
      return
    }
    if (!busy && getFlag('sms.pending') === kind) openDialogue('tinNhan')
  }
  window.setTimeout(tryOpen, 2800)
}

function smsResolve(arg?: string) {
  const kind = getFlag('sms.pending')
  setFlag('sms.pending', 0)
  const p = usePlayer.getState()
  if (kind === 'goethe') {
    if (arg === 'pay') {
      p.addMoney(-Math.min(p.money, 3_000_000))
      p.changeMood(-10)
      bumpFlag('stats.scammed')
      say(L('Mất 3.000.000 ₫… Goethe-Institut không bao giờ đòi tiền qua tin nhắn.', 'Lost 3,000,000 ₫… The Goethe-Institut never asks for money by text.'), 'bad')
    } else {
      p.changeMood(5)
      setFlag('achv.alert', true)
      say(L('Gọi lên Goethe hỏi: „Chúng tôi không gửi tin nhắn đó, cảm ơn bạn đã cảnh giác!" (+5)', 'You call the Goethe-Institut: “We didn’t send that — thanks for being careful!” (+5)'), 'good')
    }
  } else if (kind === 'vfs') {
    if (arg === 'pay') {
      p.addMoney(-Math.min(p.money, CONFIG.visa.scamSlotPrice))
      p.changeMood(-10)
      bumpFlag('stats.scammed')
      say(L('Chuyển 3.000.000 ₫ xong thì số kia chặn bạn. Không có lịch hẹn nào cả. Lịch VFS miễn phí, ai bán là lừa.', 'You transfer 3,000,000 ₫ and the number blocks you. No appointment. VFS slots are free — anyone selling them is a scammer.'), 'bad')
    } else {
      say(L('Xóa tin nhắn. Chị Mai đã dặn: lịch hẹn miễn phí, ai bán là lừa.', 'Message deleted. Mai warned you: slots are free, sellers are scammers.'), 'good')
    }
  } else if (kind === 'wedding') {
    if (arg === 'pay') {
      if (!pay(500_000)) return false
      p.changeMood(4)
      spendTime(180)
      say(L('Đám cưới vui quá, gặp lại cả lớp cấp 3!', 'A lovely wedding — the whole high-school class is there!'), 'good')
    } else {
      p.changeMood(-5)
      say(L('Bạn nhắn xin lỗi không đi được… hơi áy náy.', 'You text that you can’t come… you feel a bit bad.'), 'info')
    }
  } else if (kind === 'screen') {
    if (arg === 'pay') {
      if (!pay(1_200_000)) return false
      setFlag('phone.cracked', 0)
      say(L('Thay màn hình mới, nét căng!', 'New screen, crystal clear!'), 'good')
    } else {
      setFlag('phone.cracked', true)
      say(L('Dùng tạm màn hình vỡ… nhìn mỏi mắt lắm (−2 tâm trạng mỗi sáng đến khi thay).', 'You keep using the cracked screen… (−2 mood every morning until you replace it).'), 'info')
    }
  }
  return true
}

/** Replace the cracked screen later (job board on the phone). */
function fixScreen() {
  if (!getFlag('phone.cracked') || !pay(1_200_000)) return false
  setFlag('phone.cracked', 0)
  say(L('Thay màn hình mới, nét căng!', 'New screen, crystal clear!'), 'good')
  return true
}

/** Morning events with a choice or a consequence (data/events.ts `action`). */
function morning(arg?: string) {
  const p = usePlayer.getState()
  switch (arg) {
    case 'goethe':
    case 'vfs':
    case 'wedding':
    case 'screen':
      showMessage(arg)
      return true
    case 'powerCut':
      setFlag('event.powerCut', today())
      return true
    case 'gio': {
      // The family goes to the countryside for grandfather's death anniversary: the day is gone.
      window.setTimeout(() => {
        const t = useTime.getState()
        if (t.minutes < 19 * 60) t.setTime(t.day, 19 * 60)
        p.changeMood(10)
        if (useWorld.getState().scene !== 'home') travelTo('home', 'default', { minutes: 0 })
      }, 3200)
      return true
    }
  }
  return false
}

registerActions({
  'mai.enter': enterMai,
  'mai.leave': leaveMai,
  'cauNoi.hear': () => (setFlag('cauNoi.heard', true), true),
  'cauNoi.interview': cauNoiInterview,
  'cauNoi.read': cauNoiRead,
  'cauNoi.sign': cauNoiSign,
  'cauNoi.decline': cauNoiDecline,
  'linh.study': studyWithLinh,
  'hk.contract': spotScam,
  'sms.resolve': smsResolve,
  'phone.fixScreen': fixScreen,
  'event.morning': morning,
})

registerTests({
  'mai.open': maiOpen,
  'cauNoi.open': () => usePlayer.getState().german.level >= 2 && !getFlag('cauNoi.decided'),
  'linh.canStudy': () => getFlag('linh.studyDay') !== today(),
  'sms.goethe': () => getFlag('sms.pending') === 'goethe',
  'sms.vfs': () => getFlag('sms.pending') === 'vfs',
  'sms.wedding': () => getFlag('sms.pending') === 'wedding',
  'sms.screen': () => getFlag('sms.pending') === 'screen',
  'phone.cracked': () => !!getFlag('phone.cracked'),
  'vn.beforeDeparture': () => getFlag('de.arrived') === undefined,
})

/** Cracked phone screen: −2 mood each morning until it's replaced. Started from boot. */
export function startVnStory() {
  let lastDay = today()
  return useTime.subscribe((s) => {
    if (s.day === lastDay) return
    lastDay = s.day
    if (getFlag('phone.cracked')) window.setTimeout(() => usePlayer.getState().changeMood(-2), 3400)
  })
}

export const formatVnd = vnd
