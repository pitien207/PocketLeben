import { CONFIG } from '../../data/config'
import type { Localized } from '../../i18n/localized'
import { useMinigame } from '../../store/minigameStore'
import { usePlayer } from '../../store/playerStore'
import { useTime } from '../../store/timeStore'
import { pushToast } from '../../store/toastStore'
import { useUI } from '../../store/uiStore'
import { registerActions } from './actions'
import { playSfx } from './audio'
import { bumpFlag, flagNumber, getFlag, registerTests, setFlag } from './conditions'
import { spendTime, weekdayIndex } from './time'
import { ownedVehicles } from './vehicles'
import { L, say, vnd } from './say'

/**
 * Side jobs in Vietnam (story 2.1 §11.1): the bubble-tea shop (id `cafe`), Circle K, Grab, tutoring. Each at most once a
 * day; after 8 and 20 times you rank up (+10 % / +20 % pay, a little harder). The phone has a
 * "job board" with today's four jobs.
 */

export type VnJob = 'cafe' | 'circleK' | 'grab' | 'tutor'
export const VN_JOBS: VnJob[] = ['cafe', 'circleK', 'grab', 'tutor']
const J = CONFIG.vnJobs
const today = () => useTime.getState().day
const hour = () => useTime.getState().minutes / 60

export const jobCount = (job: VnJob) => flagNumber(`job.${job}.count`)
/** Done today already? Always false while CONFIG.vnJobs.oncePerDay is off (testing). */
export const jobDoneToday = (job: VnJob) => J.oncePerDay && getFlag(`job.${job}.day`) === today()
/** 0 = Mới, 1 = Quen việc, 2 = Giỏi. */
export function jobRank(job: VnJob) {
  const n = jobCount(job)
  return n >= J.rankAt[1] ? 2 : n >= J.rankAt[0] ? 1 : 0
}
export const rankMultiplier = (job: VnJob) => 1 + J.rankBonus[jobRank(job)]

export const RANK_NAMES: Localized[] = [L('Mới', 'New', 'Neu'), L('Quen việc', 'Skilled', 'Geübt'), L('Giỏi', 'Expert', 'Profi')]

/** Mark a job as done today; announce a rank-up. */
export function recordJob(job: VnJob) {
  const before = jobRank(job)
  setFlag(`job.${job}.day`, today())
  bumpFlag(`job.${job}.count`)
  bumpFlag('stats.jobsVn')
  if (jobRank(job) > before) {
    playSfx('success')
    say(L('Lên hạng „{r}"! +{p}% tiền mỗi lần.', 'Rank up: “{r}”! +{p}% pay.', 'Aufstieg: „{r}“! +{p} % Lohn.'), 'good', { r: RANK_NAMES[jobRank(job)].vi, p: Math.round(J.rankBonus[jobRank(job)] * 100) })
  }
}

export function jobUnlocked(job: VnJob) {
  if (job === 'cafe') return teaBanLeft() <= 0
  // Circle K takes anyone: talking to chị Hạnh (or starting a shift) hires you on the spot.
  if (job === 'circleK') return true
  // 1.40: any vehicle will do — your own, or Bố's Wave (systems/grab.ts)
  if (job === 'grab') return ownedVehicles().length > 0
  return !!getFlag('job.tutor.unlocked')
}

const alreadyToday = () => say(L('Hôm nay làm việc này rồi. Mai quay lại nhé!', 'You already did this job today. Come back tomorrow!', 'Heute schon erledigt. Morgen wieder!'), 'info')

function finishPay(job: VnJob, base: number, energy: number, minutes: number) {
  const p = usePlayer.getState()
  const total = Math.max(0, Math.round((base * rankMultiplier(job)) / 1000) * 1000)
  p.addMoney(total)
  p.spendEnergy(energy)
  spendTime(minutes)
  recordJob(job)
  playSfx('coin')
  return total
}

// --- Tiệm trà sữa Phố Cổ ------------------------------------------------------------------------

const TEA = J.tea
/** Early walk-outs chị Vy still remembers. */
export const teaStrikes = () => flagNumber('job.cafe.quits')
/** Days left until you may work at the tea shop again (0 = not fired). */
export const teaBanLeft = () => Math.max(0, flagNumber('job.cafe.banUntil') - today())

/** Wage of a tea shift: the share worked × satisfaction × rank. */
export function teaWage(o: { meter: number; fraction: number }, rank: number) {
  const { min, max } = CONFIG.work.payMultiplier
  const mult = min + ((max - min) * o.meter) / 100
  return Math.round((TEA.pay * o.fraction * mult * (1 + J.rankBonus[rank])) / 1000) * 1000
}

function teaShift() {
  if (useMinigame.getState().active) return false
  const ban = teaBanLeft()
  if (ban > 0) {
    say(L('Chị Vy: „Em bỏ ca giữa chừng nhiều quá. {n} ngày nữa hãy quay lại xin việc."', 'Vy: “You walked out too often. Come back in {n} days.”'), 'bad', { n: ban })
    return false
  }
  if (hour() < TEA.hours[0] || hour() >= TEA.hours[1]) return pushToast('toast.cafeClosed', 'info', { open: TEA.hours[0], close: TEA.hours[1] }), false
  if (jobDoneToday('cafe')) return alreadyToday(), false
  if (usePlayer.getState().energy < TEA.energy) return pushToast('toast.tooTired', 'bad'), false
  const rank = jobRank('cafe')
  useMinigame.getState().start({ kind: 'bubbleTea', rank, strikes: teaStrikes() }, (r) => {
    const o = r.tea
    if (!o) return
    const p = usePlayer.getState()
    const wage = teaWage(o, rank)
    p.addMoney(wage + o.tips)
    p.spendEnergy(Math.round(TEA.energy * o.fraction))
    p.addSkillXp('barista', Math.round(TEA.xp * o.fraction))
    p.changeMood(Math.round((o.meter - 50) * CONFIG.needs.workMoodFactor * o.fraction))
    spendTime(Math.round(TEA.minutes * o.fraction))
    bumpFlag('stats.shifts')
    bumpFlag('stats.served', o.served)
    playSfx('coin')
    if (!o.quit) {
      recordJob('cafe')
      say(L('Xong ca trà sữa: +{m}', 'Tea shift done: +{m}'), 'good', { m: vnd(wage + o.tips) })
      if (teaStrikes() > 0 && o.meter >= 50) {
        bumpFlag('job.cafe.quits', -1)
        say(L('Chị Vy: „Hôm nay làm đến nơi đến chốn đấy. Chị ghi nhận."', 'Vy: “A proper shift today. Noted.”'), 'good')
      }
      return
    }
    // Walked out early: the day is used up, no rank progress, and a strike.
    setFlag('job.cafe.day', today())
    p.changeMood(-3)
    const n = bumpFlag('job.cafe.quits')
    if (n >= TEA.maxQuits) {
      setFlag('job.cafe.banUntil', today() + TEA.banDays + 1)
      setFlag('job.cafe.quits', 0)
      bumpFlag('job.cafe.fired')
      say(L('Chị Vy: „Em bỏ ca {n} lần rồi. Chị cho em nghỉ việc {d} ngày, về suy nghĩ lại đi."', 'Vy: “That is {n} walk-outs. You are off for {d} days.”'), 'bad', { n, d: TEA.banDays })
    } else if (n === TEA.maxQuits - 1) {
      say(L('Chị Vy: „Lần thứ {n} em bỏ ca rồi đấy. Thêm lần nữa là chị cho nghỉ việc."', 'Vy: “Walk-out number {n}. Once more and you are out.”'), 'bad', { n })
    } else {
      say(L('Chị Vy cau mày: „Khách đang đông mà em về à? Lần sau làm cho hết ca nhé."', 'Vy frowns: “Leaving while it is busy? Finish your shift next time.”'), 'bad')
    }
  })
  return true
}

// --- Circle K ---------------------------------------------------------------------------------

const CK = J.circleK
const isNight = () => hour() >= 22 || hour() < 6

/**
 * Pay of a Circle K shift: the share of customers served right scales it 60–100 %, wrong change
 * comes off it, walking out early pays only the share of the shift worked; then the rank bonus.
 */
export function circleKWage(o: { score: number; deduct: number; fraction: number }, night: boolean, rank: number) {
  const base = (night ? CK.night : CK.day) * (0.6 + 0.4 * o.score) * o.fraction - o.deduct
  return Math.max(0, Math.round((base * (1 + J.rankBonus[rank])) / 1000) * 1000)
}

/** No interview: chị Hạnh is short of staff and takes you on the spot. */
function circleKHire() {
  if (getFlag('job.circleK.hired')) return false
  setFlag('job.circleK.hired', true)
  say(L('Chị Hạnh: „Ok, chị nhận em luôn! Ca ngày 6–22h, ca đêm 22–6h. Áo đồng phục treo trong kho nhé."', 'Hạnh: “Okay, you’re hired! Day shift 6–22, night shift 22–6. Your uniform is in the back.”'), 'good')
  return true
}

function circleKShift() {
  if (useMinigame.getState().active) return false
  if (jobDoneToday('circleK')) return alreadyToday(), false
  if (!getFlag('job.circleK.hired')) circleKHire()
  const night = isNight()
  const energy = night ? CK.nightEnergy : CK.energy
  const rank = jobRank('circleK')
  useMinigame.getState().start({ kind: 'circleK', night, rank }, (r) => {
    const fraction = r.fraction ?? 1
    const deduct = r.value ?? 0
    const got = circleKWage({ score: r.score, deduct, fraction }, night, rank)
    const p = usePlayer.getState()
    p.addMoney(got)
    p.spendEnergy(Math.round(energy * fraction))
    spendTime(Math.round(CK.minutes * fraction))
    playSfx('coin')
    if (fraction < 1) {
      setFlag('job.circleK.day', today())
      say(L('Nghỉ ca Circle K sớm: +{m}', 'Left the Circle K shift early: +{m}'), 'info', { m: vnd(got) })
      return
    }
    recordJob('circleK')
    if (night) setFlag('job.nightTired', today() + 1)
    say(L('Xong ca Circle K: +{m}', 'Circle K shift done: +{m}', 'Circle-K-Schicht: +{m}'), 'good', { m: vnd(got) })
    if (deduct) say(L('Thối sai tiền: trừ {d} vào lương.', 'Wrong change: {d} taken off your pay.'), 'bad', { d: vnd(deduct) })
  })
  return true
}

// --- Grab: live in the city since 1.40, see systems/grab.ts ------------------------------------------------------

// --- Tutoring Bin -----------------------------------------------------------------------------

function tutorShift() {
  if (!getFlag('job.tutor.unlocked')) return false
  if (jobDoneToday('tutor')) return alreadyToday(), false
  const T = J.tutor
  if (weekdayIndex(today()) >= 5 || hour() < T.hours[0] || hour() >= T.hours[1]) {
    return say(L('Dạy Bin: thứ Hai–Sáu, 18–21h.', 'Tutoring Bin: Mon–Fri, 18:00–21:00.', 'Nachhilfe: Mo–Fr, 18–21 Uhr.'), 'info'), false
  }
  if (usePlayer.getState().energy < T.energy) return pushToast('toast.tooTired', 'bad'), false
  const ui = useUI.getState()
  ui.setTransition({ label: L('Sang nhà bé Bin · phố Hàng Bông', 'Off to Bin’s · Hàng Bông street', 'Zu Bin · Hàng-Bông-Straße'), long: false, icon: '📚', tone: 'paper' })
  window.setTimeout(() => {
    useUI.getState().setTransition(null)
    useMinigame.getState().start({ kind: 'tutor', rank: jobRank('tutor') }, (r) => {
      const pay = getFlag('job.tutor.up') ? T.payUp : T.pay
      const got = finishPay('tutor', pay, T.energy, T.minutes)
      bumpFlag('tutor.scoreSum', Math.round(r.score * 100))
      say(L('Dạy Bin xong: +{m}', 'Tutoring done: +{m}', 'Nachhilfe: +{m}'), 'good', { m: vnd(got) })
      if (getFlag('visa.path') && Math.random() < 0.5) window.setTimeout(() => say(L('Bin: „Anh/chị đi Đức rồi ai dạy em?"', 'Bin: “Who will teach me when you’re in Germany?”'), 'info'), 1200)
      // After 8 lessons: Bin's mid-term. Good average → bonus and a second pupil.
      if (jobCount('tutor') === T.midterm && !getFlag('job.tutor.midterm')) {
        setFlag('job.tutor.midterm', true)
        const avg = flagNumber('tutor.scoreSum') / T.midterm
        window.setTimeout(() => {
          if (avg >= 70) {
            setFlag('job.tutor.up', true)
            usePlayer.getState().addMoney(T.midtermBonus)
            say(L('Bin được 8,5 điểm giữa kỳ! Mẹ Bin thưởng {b} và giới thiệu thêm một học trò (→ {p}/buổi).', 'Bin scored 8.5 in the mid-term! His mum gives you {b} and finds a second pupil (→ {p} a lesson).'), 'good', {
              b: vnd(T.midtermBonus),
              p: vnd(T.payUp),
            })
          } else {
            say(L('Bin được 6 điểm giữa kỳ. Cố thêm nhé!', 'Bin scored 6 in the mid-term. Keep going!'), 'info')
          }
        }, 1500)
      }
    })
  }, 900)
  return true
}

registerActions({
  'job.tea': teaShift,
  'job.circleK': circleKShift,
  'job.circleKHire': circleKHire,
  // Old saves / dialogues: the interview is gone, this just hires.
  'job.circleKInterview': circleKHire,
  'job.tutor': tutorShift,
})

registerTests({
  'job.cafeToday': () => jobDoneToday('cafe'),
  'job.teaBanned': () => teaBanLeft() > 0,
  'job.teaWarned': () => teaStrikes() > 0,
  'job.circleKToday': () => jobDoneToday('circleK'),
  'job.circleKHired': () => !!getFlag('job.circleK.hired'),
  'job.grabReady': () => jobUnlocked('grab'),
  'job.anyJob': () => !!getFlag('job.circleK.hired') || flagNumber('stats.shifts') > 0,
})
