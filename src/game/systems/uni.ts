import { CONFIG } from '../../data/config'
import type { Localized } from '../../i18n/localized'
import { useMinigame } from '../../store/minigameStore'
import { usePlayer } from '../../store/playerStore'
import { useTime } from '../../store/timeStore'
import { pushToast } from '../../store/toastStore'
import { useUI } from '../../store/uiStore'
import { UNIVERSITY } from '../scenes/interiors'
import { registerActions } from './actions'
import { playSfx } from './audio'
import { bumpFlag, flagNumber, getFlag, registerTests, setFlag } from './conditions'
import { pay } from './effects'
import { sitAt, standUp } from './seat'
import { spendTime, weekdayIndex } from './time'

/**
 * Chapter 4A — Studium: a dual nursing degree (B.Sc. Pflegewissenschaft) at Universität
 * München. Enrol, attend lectures, do group work in the library, pass the semester
 * exam (Klausur) and defend the Bachelor thesis. Werkstudent shifts at the care home pay
 * the bills. The degree also makes you a qualified nurse, so chapter 5 is shared.
 */

const u = CONFIG.uni
const today = () => useTime.getState().day
const L = (vi: string, en: string, de: string): Localized => ({ vi, en, de })

export const uniOpen = () => {
  const h = useTime.getState().minutes / 60
  return weekdayIndex(today()) < 5 && h >= u.hours[0] && h < u.hours[1]
}

function needOpen(): boolean {
  if (uniOpen()) return true
  pushToast('toast.uniClosed', 'info', { open: u.hours[0], close: u.hours[1] })
  return false
}

function needEnrolled(): boolean {
  if (getFlag('uni.enrolled')) return true
  pushToast('toast.notEnrolled', 'info')
  return false
}

function enroll() {
  if (getFlag('uni.enrolled')) return false
  if (getFlag('visa.path') !== 'studium') {
    pushToast('toast.uniVisitor', 'info')
    return false
  }
  if (!needOpen()) return false
  if (!getFlag('de.insurance')) {
    pushToast('toast.enrollNeedsInsurance', 'info')
    return false
  }
  if (!pay(u.semesterFee)) return false
  spendTime(45)
  setFlag('uni.enrolled', today())
  // The semester fee includes a transit pass for the whole semester.
  setFlag('de.ticketUntil', Math.max(flagNumber('de.ticketUntil'), today() + 180))
  playSfx('stamp')
  pushToast('toast.enrolledUni', 'good', { fee: u.semesterFee })
  return true
}

/** A lecture: bell card, sit in row 2, three questions from the professor. Once a day. */
function lecture() {
  if (!needEnrolled() || !needOpen()) return false
  if (getFlag('uni.lectureDay') === today()) {
    pushToast('toast.lectureDoneToday', 'info')
    return false
  }
  const p = usePlayer.getState()
  if (p.energy < u.lectureEnergy) {
    pushToast('toast.tooTired', 'bad')
    return false
  }
  setFlag('uni.lectureDay', today())
  p.spendEnergy(u.lectureEnergy)
  const n = flagNumber('stats.lectures') + 1
  useUI.getState().setTransition({ label: L(`Vorlesung · Buổi ${n}`, `Lecture · No. ${n}`, `Vorlesung · Nr. ${n}`), long: false, icon: '🎓', tone: 'chalk' })
  playSfx('bell')
  window.setTimeout(() => {
    sitAt(UNIVERSITY.seat)
    window.setTimeout(() => {
      useUI.getState().setTransition(null)
      useMinigame.getState().start({ kind: 'qa', set: 'vorlesung', count: u.lectureQuestions, passScore: 0 }, (r) => {
        spendTime(u.lectureMinutes)
        bumpFlag('stats.lectures')
        usePlayer.getState().addSkillXp('pflege', 5 + r.correct * 3)
        usePlayer.getState().changeMood(r.correct >= 2 ? 4 : -2)
        pushToast('toast.lectureDone', 'good', { n: flagNumber('stats.lectures'), xp: 5 + r.correct * 3 })
        standUp()
      })
    }, 350)
  }, 900)
  return true
}

/** Group project in the library with Kenji: build German sentences together. Once a day. */
function groupWork() {
  if (!needEnrolled() || !needOpen()) return false
  if (getFlag('uni.groupDay') === today()) {
    pushToast('toast.lectureDoneToday', 'info')
    return false
  }
  setFlag('uni.groupDay', today())
  useMinigame.getState().start({ kind: 'sentence', level: 3, count: 4 }, (r) => {
    spendTime(120)
    bumpFlag('stats.groupWork')
    usePlayer.getState().changeMood(r.correct >= 3 ? 6 : 0)
    pushToast('toast.groupWorkDone', 'good', { n: flagNumber('stats.groupWork') })
  })
  return true
}

function writtenExam(opts: { dayKey: string; set: 'klausur' | 'bachelorDefense'; questions: number; pass: number; title: Localized; onPass: () => void }) {
  if (getFlag(opts.dayKey) === today()) {
    pushToast('toast.examTomorrow', 'info')
    return false
  }
  setFlag(opts.dayKey, today())
  useUI.getState().setTransition({ label: opts.title, long: false, icon: '📝', tone: 'paper' })
  window.setTimeout(() => {
    useUI.getState().setTransition(null)
    useMinigame.getState().start({ kind: 'qa', set: opts.set, count: opts.questions, passScore: opts.pass }, (r) => {
      spendTime(120)
      if (r.passed) {
        playSfx('stamp')
        usePlayer.getState().changeMood(15)
        opts.onPass()
      } else {
        usePlayer.getState().changeMood(-8)
        pushToast('toast.careExamFailed', 'bad')
      }
    })
  }, 1300)
  return true
}

function klausur() {
  if (getFlag('uni.klausur') || !needEnrolled() || !needOpen()) return false
  const k = u.klausur
  if (flagNumber('stats.lectures') < k.lectures || flagNumber('stats.groupWork') < k.groupWork) {
    pushToast('toast.klausurNotReady', 'info', { lectures: k.lectures, group: k.groupWork })
    return false
  }
  return writtenExam({
    dayKey: 'uni.klausurDay',
    set: 'klausur',
    questions: k.questions,
    pass: k.pass,
    title: L('Thi học kỳ · Klausur', 'Semester exam · Klausur', 'Klausur'),
    onPass: () => {
      setFlag('uni.klausur', today())
      pushToast('toast.klausurPassed', 'good')
    },
  })
}

function thesis() {
  if (getFlag('uni.degree') || !needEnrolled() || !needOpen()) return false
  const t = u.thesis
  if (!getFlag('uni.klausur') || flagNumber('stats.lectures') < t.lectures || flagNumber('stats.careShifts') < t.shifts) {
    pushToast('toast.thesisNotReady', 'info', { lectures: t.lectures, shifts: t.shifts })
    return false
  }
  return writtenExam({
    dayKey: 'uni.thesisDay',
    set: 'bachelorDefense',
    questions: t.questions,
    pass: t.pass,
    title: L('Bảo vệ luận văn cử nhân', 'Bachelor thesis defence', 'Verteidigung der Bachelorarbeit'),
    onPass: () => {
      setFlag('uni.degree', today())
      // The dual degree includes the state nursing exam: chapter 5 is the same for both paths.
      if (!getFlag('care.examen')) setFlag('care.examen', today())
      pushToast('toast.degreePassed', 'good')
    },
  })
}

registerActions({
  'uni.enroll': enroll,
  'uni.lecture': lecture,
  'uni.groupWork': groupWork,
  'uni.klausur': klausur,
  'uni.thesis': thesis,
})

registerTests({
  'uni.open': uniOpen,
  'uni.lectureToday': () => getFlag('uni.lectureDay') === today(),
  'uni.groupToday': () => getFlag('uni.groupDay') === today(),
  'uni.klausurToday': () => getFlag('uni.klausurDay') === today(),
  'uni.thesisToday': () => getFlag('uni.thesisDay') === today(),
  'uni.klausurReady': () => flagNumber('stats.lectures') >= u.klausur.lectures && flagNumber('stats.groupWork') >= u.klausur.groupWork,
})
