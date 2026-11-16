import { CONFIG } from '../../data/config'
import { VISA_DOCS, type DocDef, type DocStep, type VisaOffice, type VisaPath } from '../../data/visa'
import { decodeSlot, TERMIN_CANCELLED } from './termin'
import { formatClock } from './time'
import { useMinigame } from '../../store/minigameStore'
import { usePlayer } from '../../store/playerStore'
import { useTime } from '../../store/timeStore'
import { pushToast } from '../../store/toastStore'
import { useUI } from '../../store/uiStore'
import { useWorld } from '../../store/worldStore'
import { registerActions } from './actions'
import { playSfx } from './audio'
import { bumpFlag, check, flagNumber, getFlag, registerTests, setFlag } from './conditions'
import { pay } from './effects'
import { spendTime } from './time'
import { travelTo } from './travel'

/**
 * The visa chapter (plan §6 chapter 2, milestone M5): choose a path, collect documents,
 * prove your finances, hunt a Termin, pass the embassy interview, fly to Germany.
 */

export const docFlag = (id: string) => `doc.${id}`
export const docReadyFlag = (id: string) => `doc.${id}.ready`

export function visaPath(): VisaPath | null {
  const p = getFlag('visa.path')
  return p === 'studium' || p === 'ausbildung' ? p : null
}

export function docsFor(path: VisaPath | null): DocDef[] {
  return VISA_DOCS.filter((d) => !d.path || d.path === path)
}

/**
 * Completed steps of a document. Auto steps count as soon as their condition holds
 * (those conditions only ever become true), so this is pure and safe during render.
 */
export function docProgress(doc: DocDef): number {
  let done = flagNumber(docFlag(doc.id))
  while (done < doc.steps.length && doc.steps[done].auto && check(doc.steps[done].auto)) done++
  return done
}

export function stepCost(step: DocStep): number {
  if (step.cost === 'finance') {
    const path = visaPath()
    return path ? CONFIG.visa.financeProof[path] : 0
  }
  return step.cost ?? 0
}

export function docsComplete(): boolean {
  const path = visaPath()
  if (!path) return false
  return docsFor(path).every((d) => docProgress(d) >= d.steps.length)
}

/** Press the next step of a document. Steps done in a place (`at`) only go through `office`. */
export function doDocStep(id: string, office?: VisaOffice, quiet = false) {
  const doc = VISA_DOCS.find((d) => d.id === id)
  if (!doc) return false
  const done = docProgress(doc)
  const step = doc.steps[done]
  if (!step || step.auto) return false
  if (step.at && step.at !== office) return false
  const player = usePlayer.getState()
  if (step.energy && player.energy < step.energy) {
    pushToast('toast.tooTired', 'bad')
    return false
  }
  const cost = stepCost(step)
  if (cost > 0 && !pay(cost)) return false
  if (step.cost === 'finance') setFlag('visa.blocked', cost)
  if (step.energy) player.spendEnergy(step.energy)
  if (step.minutes) spendTime(step.minutes)
  if (step.waitDays) setFlag(docReadyFlag(id), useTime.getState().day + step.waitDays)
  setFlag(docFlag(id), done + 1)
  if (!quiet) playSfx('stamp')
  return true
}

/** Next steps waiting at this office (for this path). */
export function pendingAt(office: VisaOffice) {
  return docsFor(visaPath()).filter((d) => d.steps[docProgress(d)]?.at === office)
}

const officeOpen = () => {
  const h = useTime.getState().minutes / 60
  return h >= CONFIG.visa.officeHours[0] && h < CONFIG.visa.officeHours[1]
}

/** Photo studio: biometric photos (35×45 mm, white background). */
function takePhotos() {
  if (!visaPath()) return false
  if (!doDocStep('photos', 'photo')) return false
  pushToast('toast.photosDone', 'good')
  return true
}

/** Home: the paper cabinet with the original diploma and birth certificate. */
function takeOriginals() {
  if (!visaPath()) {
    pushToast('toast.papersNotYet', 'info')
    return false
  }
  if (getFlag('visa.originals')) {
    pushToast('toast.papersAlready', 'info')
    return false
  }
  setFlag('visa.originals', true)
  spendTime(10)
  playSfx('pickup')
  pushToast('toast.papersTaken', 'good')
  return true
}

/** Notary: translate + notarize every paper you brought, in one visit. */
function notarize() {
  const docs = pendingAt('notary')
  if (docs.length === 0) return false
  if (!getFlag('visa.originals')) {
    pushToast('toast.needOriginals', 'bad')
    return false
  }
  const total = docs.reduce((sum, d) => sum + d.steps.slice(docProgress(d)).filter((s) => s.at === 'notary').reduce((a, s) => a + stepCost(s), 0), 0)
  if (usePlayer.getState().money < total) {
    pushToast('toast.notEnoughMoney', 'bad')
    return false
  }
  for (const d of docs) while (d.steps[docProgress(d)]?.at === 'notary' && doDocStep(d.id, 'notary', true));
  playSfx('stamp')
  pushToast('toast.notaryDone', 'good')
  return true
}

/** Bank: the clerk looks at your balance. Enough = proof done, nothing is taken or printed. */
function proveFunds() {
  const path = visaPath()
  if (!path || pendingAt('bank').length === 0) return false
  const need = CONFIG.visa.financeProof[path]
  const money = usePlayer.getState().money
  if (money < need) {
    pushToast('toast.financeShort', 'bad', { missing: formatVnd(need - money) })
    return false
  }
  doDocStep('finance', 'bank')
  pushToast('toast.financeOk', 'good')
  return true
}

const formatVnd = (n: number) => `${Math.round(n).toLocaleString('vi-VN')} ₫`

/** Bank: change money between the two wallets. arg = amount of the current currency, or 'all'. */
function exchangeMoney(arg?: string) {
  const p = usePlayer.getState()
  const amount = arg === 'all' ? p.money : Number(arg)
  if (!(amount > 0) || amount > p.money) {
    pushToast('toast.notEnoughMoney', 'bad')
    return false
  }
  p.exchange(amount)
  spendTime(10)
  playSfx('coin')
  pushToast('toast.exchanged', 'good')
  return true
}

/** Any bank: change the whole other wallet into the money of the country you're in. */
function exchangeBack() {
  const p = usePlayer.getState()
  if (p.otherMoney <= 0) return false
  const rate = CONFIG.visa.vndPerEur
  const got = p.currency === 'EUR' ? Math.round((p.otherMoney / rate) * 100) / 100 : Math.round(p.otherMoney * rate)
  usePlayer.setState({ otherMoney: 0, money: p.currency === 'EUR' ? Math.round((p.money + got) * 100) / 100 : p.money + got })
  spendTime(10)
  playSfx('coin')
  pushToast('toast.exchanged', 'good')
  return true
}

/** APS office: pay and hand in the file, wait your turn, then the interview (Q&A like the real one). */
function apsInterview() {
  if (visaPath() !== 'studium') return false
  const doc = VISA_DOCS.find((d) => d.id === 'aps')!
  const day = useTime.getState().day
  if (getFlag('aps.failDay') === day) {
    pushToast('toast.apsTomorrow', 'info')
    return false
  }
  if (docProgress(doc) === 0) {
    if (!doDocStep('aps', 'aps')) return false
  }
  if (docProgress(doc) !== 1) return false
  spendTime(CONFIG.visa.apsWaitMinutes)
  useMinigame.getState().start({ kind: 'qa', set: 'aps', count: 6, passScore: CONFIG.visa.apsPassScore }, (r) => {
    if (r.passed) {
      setFlag(docFlag('aps'), 2)
      usePlayer.getState().changeMood(10)
      playSfx('stamp')
      pushToast('toast.apsPassed', 'good')
    } else {
      setFlag('aps.failDay', useTime.getState().day)
      usePlayer.getState().changeMood(-6)
      pushToast('toast.apsFailed', 'bad')
    }
  })
  return true
}

export const terminDay = () => {
  const d = getFlag('visa.terminDay')
  return typeof d === 'number' ? d : null
}

export const visaReady = () => check({ dayReached: 'visa.readyDay' })

function choosePath(arg?: string) {
  if (arg !== 'studium' && arg !== 'ausbildung') return false
  setFlag('visa.path', arg)
  pushToast('toast.pathChosen', 'good')
  return true
}

function openPanel() {
  useUI.getState().openPanel({ type: 'visa' })
  return true
}

function hunt() {
  if (!visaPath()) return false
  const booked = terminDay()
  const { day } = useTime.getState()
  if (booked !== null && booked >= day) {
    pushToast('toast.terminAlready', 'info', { day: booked })
    return false
  }
  if (getFlag('visa.readyDay')) return false
  const rejected = getFlag('visa.rejectedDay')
  if (typeof rejected === 'number' && day < rejected + CONFIG.visa.rejectCooldownDays) {
    pushToast('toast.rejectCooldown', 'info')
    return false
  }
  bumpFlag('stats.terminTries')
  useMinigame.getState().start({ kind: 'termin', attempts: CONFIG.visa.terminAttempts }, (r) => {
    if (r.value === TERMIN_CANCELLED) return
    if (r.passed && r.value !== undefined) {
      const slot = decodeSlot(r.value)
      const at = useTime.getState().day + slot.dayOffset
      setFlag('visa.terminDay', at)
      setFlag('visa.terminTime', slot.minutes)
      if (flagNumber('stats.terminTries') === 1) setFlag('achv.terminFirstTry', true)
      bumpFlag('stats.termins')
      pushToast('toast.terminBookedAt', 'good', { day: at, time: formatClock(slot.minutes) })
    } else {
      pushToast('toast.terminMissed', 'bad')
    }
  })
  return true
}

/** At the embassy, on the Termin day. */
function interview() {
  const path = visaPath()
  const day = useTime.getState().day
  if (!path || terminDay() !== day) {
    pushToast('toast.noTerminToday', 'bad')
    return false
  }
  setFlag('visa.terminDay', 0)
  if (!docsComplete()) {
    setFlag('visa.rejectedDay', day)
    usePlayer.getState().changeMood(-10)
    playSfx('fail')
    pushToast('toast.visaMissingDocs', 'bad')
    return true
  }
  useMinigame.getState().start(
    { kind: 'qa', set: path === 'studium' ? 'embassyStudium' : 'embassyAusbildung', count: 5, passScore: CONFIG.visa.interviewPassScore },
    (r) => {
      if (r.passed) {
        setFlag('visa.readyDay', useTime.getState().day + CONFIG.visa.approvalWaitDays)
        usePlayer.getState().changeMood(15)
        playSfx('stamp')
        pushToast('toast.visaApproved', 'good', { days: CONFIG.visa.approvalWaitDays })
      } else {
        setFlag('visa.rejectedDay', useTime.getState().day)
        usePlayer.getState().changeMood(-12)
        pushToast('toast.visaRejected', 'bad')
      }
    },
  )
  return true
}

function buyFlight() {
  if (!visaReady() || getFlag('visa.flight')) return false
  if (!pay(CONFIG.visa.flightCost)) return false
  setFlag('visa.flight', true)
  pushToast('toast.flightBought', 'good')
  return true
}

function rideTo(scene: 'embassy' | 'airport' | 'vietnam') {
  if (!pay(CONFIG.visa.xeOmFare)) return false
  travelTo(scene, scene === 'vietnam' ? 'xeOm' : 'default', { minutes: CONFIG.visa.xeOmMinutes })
  playSfx('honk')
  return true
}

function xeOmEmbassy() {
  const booked = terminDay()
  const { day, minutes } = useTime.getState()
  if (!booked) {
    pushToast('toast.noTermin', 'info')
    return false
  }
  if (booked > day) {
    pushToast('toast.terminLater', 'info', { day: booked })
    return false
  }
  if (booked < day) {
    setFlag('visa.terminDay', 0)
    pushToast('toast.terminExpired', 'bad')
    return false
  }
  const [open, close] = CONFIG.visa.embassyHours
  if (minutes / 60 < open || minutes / 60 >= close) {
    pushToast('toast.embassyClosed', 'info', { open, close })
    return false
  }
  return rideTo('embassy')
}

function xeOmAirport() {
  if (!visaReady()) {
    pushToast('toast.noVisaYet', 'info')
    return false
  }
  if (!getFlag('visa.flight')) {
    pushToast('toast.noFlight', 'info')
    return false
  }
  return rideTo('airport')
}

/**
 * Board the plane, next morning in Germany. Both wallets travel with you: the euros you exchanged
 * at the bank are what you spend there (an old save's blocked account goes back to your đồng).
 */
function depart() {
  if (!getFlag('visa.flight')) return false
  const player = usePlayer.getState()
  const blocked = flagNumber('visa.blocked')
  if (blocked > 0) player.addMoney(blocked)
  // Few euros in the wallet: a reminder (the Sparbank in Germany can still change đồng).
  if (usePlayer.getState().otherMoney < 100) pushToast('toast.noEuros', 'info')
  travelTo('germany', 'default', {
    long: true,
    label: { vi: 'Bay sang Đức… ✈ Frankfurt', en: 'Flying to Germany… ✈ Frankfurt', de: 'Flug nach Deutschland… ✈ Frankfurt' },
    onArrive: () => {
      setFlag('visa.blocked', 0)
      const t = useTime.getState()
      t.setTime(t.day + 1, 9 * 60)
      setFlag('de.arrived', t.day + 1)
      usePlayer.getState().changeMood(10)
    },
  })
  return true
}

registerActions({
  'visa.choosePath': choosePath,
  'visa.openPanel': openPanel,
  'visa.termin': hunt,
  'visa.interview': interview,
  'visa.buyFlight': buyFlight,
  'xeOm.embassy': xeOmEmbassy,
  'xeOm.airport': xeOmAirport,
  'xeOm.home': () => rideTo('vietnam'),
  'flight.depart': depart,
  'visa.photo': takePhotos,
  'visa.originals': takeOriginals,
  'visa.notary': notarize,
  'visa.bankCheck': proveFunds,
  'bank.exchange': exchangeMoney,
  'bank.exchangeBack': exchangeBack,
  'aps.interview': apsInterview,
})

const docDone = (id: string) => {
  const doc = VISA_DOCS.find((d) => d.id === id)
  return !!doc && docProgress(doc) >= doc.steps.length
}

registerTests({
  'visa.docsComplete': docsComplete,
  'wallet.hasOther': () => usePlayer.getState().otherMoney > 0,
  // Offices and documents (1.13)
  'office.open': officeOpen,
  'visa.photosDone': () => docDone('photos'),
  'visa.passportDone': () => docDone('passport'),
  'visa.originals': () => !!getFlag('visa.originals') || (docProgress(VISA_DOCS.find((d) => d.id === 'diploma')!) > 0 && docProgress(VISA_DOCS.find((d) => d.id === 'birth')!) > 0),
  'visa.notaryDone': () => docDone('diploma') && docDone('birth'),
  'visa.writingDone': () => docDone('cv') && docDone('motivation') && docDone('insurance'),
  'visa.financeDone': () => docDone('finance'),
  'visa.apsDone': () => docDone('aps'),
  'visa.apsPaid': () => docProgress(VISA_DOCS.find((d) => d.id === 'aps')!) === 1,
  'visa.apsTriedToday': () => getFlag('aps.failDay') === useTime.getState().day,
  'visa.pathDocDone': () => (visaPath() === 'studium' ? docDone('admission') : docDone('contract')),
  'visa.pending.photo': () => pendingAt('photo').length > 0,
  'visa.pending.notary': () => pendingAt('notary').length > 0,
  'visa.pending.bank': () => pendingAt('bank').length > 0,
  'visa.pending.aps': () => pendingAt('aps').length > 0,
  'visa.enoughFunds': () => {
    const path = visaPath()
    return !!path && usePlayer.getState().money >= CONFIG.visa.financeProof[path]
  },
  'visa.terminToday': () => terminDay() === useTime.getState().day,
  'visa.canHunt': () => !!visaPath() && !getFlag('visa.readyDay') && !(terminDay() !== null && (terminDay() ?? 0) >= useTime.getState().day),
  'visa.ready': visaReady,
  // For the step-by-step guide
  'visa.terminLater': () => (terminDay() ?? 0) > useTime.getState().day,
  'visa.waiting': () => typeof getFlag('visa.readyDay') === 'number' && !visaReady(),
  'visa.embassyOpen': () => {
    const h = useTime.getState().minutes / 60
    return h >= CONFIG.visa.embassyHours[0] && h < CONFIG.visa.embassyHours[1]
  },
})

/** For the HUD: is the visa panel relevant right now? */
export const visaChapterActive = () => !!visaPath() && useWorld.getState().scene !== 'germany' && !getFlag('de.arrived')
