import { CONFIG } from '../../data/config'
import type { QaSetId } from '../../data/interviews'
import type { I18nKey } from '../../i18n'
import type { Localized } from '../../i18n/localized'
import { useMinigame, type MinigameResult } from '../../store/minigameStore'
import { usePlayer } from '../../store/playerStore'
import { useTime } from '../../store/timeStore'
import { pushToast } from '../../store/toastStore'
import { useUI } from '../../store/uiStore'
import { registerActions } from './actions'
import { playSfx } from './audio'
import { flagNumber, getFlag, registerTests, setFlag } from './conditions'
import { pay } from './effects'
import { spendTime } from './time'
import { travelTo } from './travel'

/**
 * Chapters 4–5 (plan §6 4B + 5): nursing exams, the permanent contract, a Tết trip home,
 * your own flat, permanent residence (the story's ending) and citizenship (post-game).
 */

const c = CONFIG.career
const today = () => useTime.getState().day
const L = (vi: string, en: string, de: string): Localized => ({ vi, en, de })

/** A written test: a short "exam paper" card, then the Q&A mini-game. Once per day. */
function writtenTest(opts: { dayKey: string; set: QaSetId; questions: number; pass: number; title: Localized; done: (r: MinigameResult) => void }) {
  if (getFlag(opts.dayKey) === today()) {
    pushToast('toast.examTomorrow', 'info')
    return false
  }
  setFlag(opts.dayKey, today())
  const ui = useUI.getState()
  ui.setTransition({ label: opts.title, long: false, icon: '📝', tone: 'paper' })
  window.setTimeout(() => {
    useUI.getState().setTransition(null)
    useMinigame.getState().start({ kind: 'qa', set: opts.set, count: opts.questions, passScore: opts.pass }, (r) => {
      spendTime(90)
      if (r.passed) {
        playSfx('stamp')
        usePlayer.getState().changeMood(15)
      } else {
        usePlayer.getState().changeMood(-8)
      }
      opts.done(r)
    })
  }, 1300)
  return true
}

// --- Chapter 4: exams ----------------------------------------------------------------

function careExam(arg?: string) {
  const final = arg === 'final'
  const cfg = final ? c.final : c.zwischen
  const doneKey = final ? 'care.examen' : 'care.zwischen'
  if (getFlag(doneKey)) return false
  if (final && !getFlag('care.zwischen')) {
    pushToast('toast.zwischenFirst', 'info')
    return false
  }
  if (flagNumber('stats.berufsschule') < cfg.school || flagNumber('stats.careShifts') < cfg.shifts) {
    pushToast('toast.examNotReady', 'info', { school: cfg.school, shifts: cfg.shifts })
    return false
  }
  return writtenTest({
    dayKey: final ? 'care.finalDay' : 'care.zwischenDay',
    set: final ? 'abschlusspruefung' : 'zwischenpruefung',
    questions: cfg.questions,
    pass: cfg.pass,
    title: final ? L('Thi tốt nghiệp điều dưỡng', 'Final nursing exam', 'Abschlussprüfung Pflege') : L('Thi giữa khóa', 'Mid-term exam', 'Zwischenprüfung'),
    done: (r) => {
      if (r.passed) {
        setFlag(doneKey, today())
        pushToast(final ? 'toast.examenPassed' : 'toast.zwischenPassed', 'good')
      } else {
        pushToast('toast.careExamFailed', 'bad')
      }
    },
  })
}

// --- Chapter 5: career -------------------------------------------------------------------

function contractInterview() {
  if (getFlag('job.fulltime')) return false
  if (!getFlag('care.examen')) {
    pushToast('toast.needExamen', 'info')
    return false
  }
  return writtenTest({
    dayKey: 'job.interviewDay',
    set: 'jobInterview',
    questions: c.interview.questions,
    pass: c.interview.pass,
    title: L('Phỏng vấn với giám đốc viện', 'Interview with the director', 'Gespräch mit der Heimleitung'),
    done: (r) => {
      if (r.passed) {
        setFlag('job.fulltime', today())
        pushToast('toast.contractSigned', 'good', { mult: c.proPayMultiplier })
      } else {
        pushToast('toast.interviewRetry', 'bad')
      }
    },
  })
}

// --- Tết trip home ---------------------------------------------------------------------

function bookTrip() {
  if (getFlag('trip.away')) return false
  if (!getFlag('job.fulltime')) {
    pushToast('toast.needContract', 'info')
    return false
  }
  if (!pay(c.tripCost)) return false
  setFlag('trip.away', today())
  setFlag('trip.reunion', false)
  playSfx('coin')
  travelTo('home', 'default', {
    long: true,
    label: L('Bay về Hà Nội ăn Tết… ✈ Nội Bài', 'Flying home for Tết… ✈ Nội Bài', 'Heimflug zum Tết-Fest… ✈ Nội Bài'),
    onArrive: () => {
      const t = useTime.getState()
      t.setTime(t.day + 1, 10 * 60)
      usePlayer.getState().changeMood(10)
    },
  })
  return true
}

function returnTrip() {
  if (!getFlag('trip.away')) return false
  if (!getFlag('trip.reunion')) {
    pushToast('toast.greetFamilyFirst', 'info')
    return false
  }
  travelTo('germany', 'default', {
    long: true,
    label: L('Bay về Đức… ✈ Frankfurt', 'Flying back to Germany… ✈ Frankfurt', 'Rückflug nach Deutschland… ✈ Frankfurt'),
    onArrive: () => {
      const t = useTime.getState()
      t.setTime(t.day + c.tripDays - 1, 9 * 60)
      setFlag('trip.away', false)
      setFlag('trip.done', true)
      usePlayer.getState().changeMood(8)
      usePlayer.getState().restoreEnergy(100)
    },
  })
  return true
}

/** Lucky money for the little sister. */
function liXi() {
  if (getFlag('trip.lixiDay') === today()) return false
  if (!pay(20)) return false
  setFlag('trip.lixiDay', today())
  usePlayer.getState().changeMood(8)
  playSfx('coin')
  return true
}

// --- Own flat ------------------------------------------------------------------------------

function rentFlat() {
  if (getFlag('de.ownFlat')) return false
  if (!getFlag('job.fulltime')) {
    pushToast('toast.needContract', 'info')
    return false
  }
  if (!pay(c.flatDeposit)) return false
  setFlag('de.ownFlat', today())
  usePlayer.getState().changeMood(15)
  playSfx('success')
  pushToast('toast.flatRented', 'good', { rent: c.flatRentPerWeek })
  return true
}

// --- Residence (ending) and citizenship -------------------------------------------------------

function lidTest() {
  if (getFlag('pr.lid')) return false
  return writtenTest({
    dayKey: 'pr.lidDay',
    set: 'lebenInDeutschland',
    questions: c.residence.questions,
    pass: c.residence.pass,
    title: L('Bài thi „Leben in Deutschland“', '“Life in Germany” test', 'Test „Leben in Deutschland“'),
    done: (r) => {
      if (r.passed) {
        setFlag('pr.lid', today())
        pushToast('toast.lidPassed', 'good')
      } else {
        pushToast('toast.careExamFailed', 'bad')
      }
    },
  })
}

/** What is still missing for permanent residence (first one wins), or null. */
export function residenceMissing(): I18nKey | null {
  if (!getFlag('job.fulltime')) return 'toast.needContract'
  if (!getFlag('de.ownFlat')) return 'toast.needOwnFlat'
  if (flagNumber('stats.rentPaid') < c.residence.rentWeeks) return 'toast.needRentWeeks'
  if (!getFlag('pr.lid')) return 'toast.needLid'
  return null
}

function applyResidence() {
  if (getFlag('pr.granted')) return false
  const missing = residenceMissing()
  if (missing) {
    pushToast(missing, 'info', { weeks: c.residence.rentWeeks, paid: flagNumber('stats.rentPaid') })
    return false
  }
  spendTime(60)
  setFlag('pr.granted', today())
  playSfx('stamp')
  pushToast('toast.residenceGranted', 'good')
  showEnding()
  return true
}

/** The end of the story: a celebration card, then free play. */
export function showEnding() {
  setFlag('story.done', true)
  window.setTimeout(() => useUI.getState().openPanel({ type: 'ending' }), 1800)
}

function applyCitizenship() {
  if (getFlag('cz.granted')) return false
  if (!getFlag('pr.granted')) {
    pushToast('toast.needResidence', 'info')
    return false
  }
  if (getFlag('cz.day') === today()) {
    pushToast('toast.examTomorrow', 'info')
    return false
  }
  if (!pay(c.citizenship.fee)) return false
  return writtenTest({
    dayKey: 'cz.day',
    set: 'einbuergerung',
    questions: c.citizenship.questions,
    pass: c.citizenship.pass,
    title: L('Phỏng vấn nhập quốc tịch', 'Citizenship interview', 'Einbürgerungsgespräch'),
    done: (r) => {
      if (r.passed) {
        setFlag('cz.granted', today())
        pushToast('toast.citizenGranted', 'good')
      } else {
        pushToast('toast.interviewRetry', 'bad')
      }
    },
  })
}

registerActions({
  'care.exam': careExam,
  'career.interview': contractInterview,
  'trip.book': bookTrip,
  'trip.return': returnTrip,
  'trip.lixi': liXi,
  'de.rentFlat': rentFlat,
  'pr.lidTest': lidTest,
  'pr.apply': applyResidence,
  'cz.apply': applyCitizenship,
  'story.ending': () => {
    useUI.getState().openPanel({ type: 'ending' })
    return true
  },
})

registerTests({
  'care.schoolDoneToday': () => getFlag('care.schoolDay') === today(),
  'care.zwischenReady': () => flagNumber('stats.berufsschule') >= c.zwischen.school && flagNumber('stats.careShifts') >= c.zwischen.shifts,
  'care.finalReady': () => flagNumber('stats.berufsschule') >= c.final.school && flagNumber('stats.careShifts') >= c.final.shifts,
  'care.zwischenToday': () => getFlag('care.zwischenDay') === today(),
  'care.finalToday': () => getFlag('care.finalDay') === today(),
  'job.interviewToday': () => getFlag('job.interviewDay') === today(),
  'pr.lidToday': () => getFlag('pr.lidDay') === today(),
  'pr.rentWeeks': () => flagNumber('stats.rentPaid') >= c.residence.rentWeeks,
  'pr.ready': () => residenceMissing() === null,
})
