import { CONFIG } from '../../data/config'
import { VISA_DOCS, type DocDef, type DocStep, type VisaOffice, type VisaPath } from '../../data/visa'
import { decodeSlot, TERMIN_CANCELLED } from './termin'
import { formatClock, weekdayIndex } from './time'
import { useMinigame } from '../../store/minigameStore'
import { usePlayer } from '../../store/playerStore'
import { useTime } from '../../store/timeStore'
import { pushToast } from '../../store/toastStore'
import { useUI } from '../../store/uiStore'
import { useWorld } from '../../store/worldStore'
import { useFlags } from '../../store/flagsStore'
import { registerActions } from './actions'
import { playSfx } from './audio'
import { bumpFlag, check, flagNumber, getFlag, registerTests, setFlag } from './conditions'
import { pay } from './effects'
import { spendTime } from './time'
import { travelTo } from './travel'
import { dateLabel, L, say, vnd } from './say'

/**
 * The visa chapter (story 2.1 §2): choose a path, collect documents yourself or through
 * Văn phòng Mai Anh, fill in the Auslandsportal, hunt a VFS slot, hand in the file at VFS,
 * pass the embassy interview (or write a Remonstration), exchange euros and fly.
 */

const V = CONFIG.visa
export const docFlag = (id: string) => `doc.${id}`
export const docReadyFlag = (id: string) => `doc.${id}.ready`
/** Day on which chị Mai's office hands over a document it was paid to do. */
export const officeFlag = (id: string) => `doc.${id}.office`

const today = () => useTime.getState().day
const hour = () => useTime.getState().minutes / 60

export function visaPath(): VisaPath | null {
  const p = getFlag('visa.path')
  return p === 'studium' || p === 'ausbildung' ? p : null
}

export function docsFor(path: VisaPath | null): DocDef[] {
  return VISA_DOCS.filter((d) => !d.path || d.path === path)
}

export const docById = (id: string) => VISA_DOCS.find((d) => d.id === id)

/** Paid the office and waiting for Tuấn to bring it. */
export function officePending(doc: DocDef) {
  const d = getFlag(officeFlag(doc.id))
  return typeof d === 'number' && today() < d
}

/** A step the player does (vs one that only waits for its condition). */
export const manual = (s: DocStep) => s.cost !== undefined || s.minutes !== undefined || s.at !== undefined

/**
 * Completed steps of a document. Auto steps count as soon as their condition holds
 * (those conditions only ever become true), so this is pure and safe during render.
 */
export function docProgress(doc: DocDef): number {
  const byOffice = getFlag(officeFlag(doc.id))
  if (typeof byOffice === 'number' && today() >= byOffice) return doc.steps.length
  let done = flagNumber(docFlag(doc.id))
  while (done < doc.steps.length && doc.steps[done].auto && check(doc.steps[done].auto)) done++
  return done
}

export const docDone = (id: string) => {
  const doc = docById(id)
  return !!doc && docProgress(doc) >= doc.steps.length
}

export function stepCost(step: DocStep): number {
  if (step.cost === 'insurance') return V.insurance[visaPath() ?? 'ausbildung']
  return step.cost ?? 0
}

export function docsComplete(): boolean {
  const path = visaPath()
  if (!path) return false
  return docsFor(path).every((d) => docProgress(d) >= d.steps.length)
}

const officeOpen = () => hour() >= V.officeHours[0] && hour() < V.officeHours[1]
const weekday = () => weekdayIndex(today()) < 5

/** Do the next step of a document. Steps done in a place (`at`) only go through `office`. */
export function doDocStep(id: string, office?: VisaOffice, quiet = false) {
  const doc = docById(id)
  if (!doc || officePending(doc)) return false
  const done = docProgress(doc)
  const step = doc.steps[done]
  if (!step || !manual(step)) return false
  if (step.at && step.at !== office) return false
  if (step.morningBefore !== undefined && (!weekday() || hour() < 7 || hour() >= step.morningBefore)) {
    say(L('Phải đi xếp hàng từ sáng sớm (thứ Hai–Sáu, 7–{h}h) mới kịp lấy số.', 'You have to queue early (Mon–Fri, 7:00–{h}:00) to get a number.', 'Man muss früh anstehen (Mo–Fr, 7–{h} Uhr).'), 'info', { h: step.morningBefore })
    return false
  }
  const player = usePlayer.getState()
  if (step.energy && player.energy < step.energy) {
    pushToast('toast.tooTired', 'bad')
    return false
  }
  const cost = stepCost(step)
  if (cost > 0 && !pay(cost)) return false
  if (step.energy) player.spendEnergy(step.energy)
  if (step.minutes) spendTime(step.minutes)
  if (step.waitDays) setFlag(docReadyFlag(id), today() + step.waitDays)
  setFlag(docFlag(id), done + 1)
  if (!quiet) playSfx('stamp')
  return true
}

/** Next steps waiting at this place (for this path). */
export function pendingAt(office: VisaOffice) {
  return docsFor(visaPath()).filter((d) => !officePending(d) && d.steps[docProgress(d)]?.at === office)
}

// --- Văn phòng Mai Anh (story 2.1 §2.0) -----------------------------------------------------

/** Documents the office can still take over (not done, not already paid for). */
export function officeOptions(): DocDef[] {
  return docsFor(visaPath()).filter((d) => d.office && !officePending(d) && docProgress(d) < d.steps.length)
}

const needOriginals = (doc: DocDef) => doc.id === 'diploma' && !getFlag('visa.originals')

function officeTake(doc: DocDef) {
  setFlag(officeFlag(doc.id), today() + 1)
  if (doc.id === 'cv') setFlag('cv.ghost', true)
}

/** Pay Tuấn to do one document (arg = doc id): ready tomorrow. */
function officeBuy(arg?: string) {
  const doc = arg ? docById(arg) : undefined
  if (!doc?.office || !visaPath() || !officeOptions().includes(doc)) return false
  if (needOriginals(doc)) {
    say(L('Tuấn: „Anh/chị mang bản gốc bằng THPT, học bạ với khai sinh qua đây đã nhé."', 'Tuấn: “Bring me the original diploma, records and birth certificate first.”'), 'bad')
    return false
  }
  if (!pay(doc.office)) return false
  officeTake(doc)
  playSfx('coin')
  say(L('Tuấn: „Anh/chị đưa giấy tờ đây, mai em trả." Cô Thoa đưa hóa đơn đỏ.', 'Tuấn: “Leave it with me, it’s ready tomorrow.” Ms Thoa hands you a proper receipt.'), 'good')
  return true
}

/** The office package: every office document + the VFS slot hunt, for a fixed price. */
export const packageAvailable = () =>
  !!visaPath() && !getFlag('office.package') && docsFor(visaPath()).every((d) => !d.office || (!officePending(d) && docProgress(d) === 0))

function officePackage() {
  if (!packageAvailable()) return false
  if (!getFlag('visa.originals')) {
    say(L('Tuấn: „Trọn gói thì em cần bản gốc bằng THPT, học bạ, khai sinh. Anh/chị về nhà lấy rồi qua nhé."', 'Tuấn: “For the package I need the original diploma, records and birth certificate. Fetch them from home first.”'), 'bad')
    return false
  }
  if (!pay(V.officePackage)) return false
  for (const d of officeOptions()) officeTake(d)
  setFlag('office.package', true)
  setFlag('office.termin', true)
  playSfx('stamp')
  say(L('Chị Mai: „Chị làm được, nhưng em phải hiểu từng tờ giấy trong hồ sơ của em. Lãnh sự hỏi gì mà em không biết là trượt đấy."', 'Mai: “I can do it, but you must understand every paper in your file. If the consul asks and you don’t know, you fail.”'), 'info')
  return true
}

/** Tuấn hunts the VFS slot (he can't buy one earlier, only search). */
function officeTermin() {
  if (!visaPath() || getFlag('office.termin') || getFlag('visa.readyDay')) return false
  if (!pay(V.officeTermin)) return false
  setFlag('office.termin', true)
  say(L('Tuấn: „Em săn lịch VFS hộ cho. Đủ giấy tờ là có lịch sau 2–4 ngày."', 'Tuấn: “I’ll hunt the VFS slot for you. Once your papers are complete you get one 2–4 days later.”'), 'good')
  officeTick()
  return true
}

/** Background: the office books the slot once the papers are complete; BA follows the contract. */
function officeTick() {
  if (!visaPath()) return
  // BA approval: two days after the training contract arrived.
  if (visaPath() === 'ausbildung' && getFlag(docReadyFlag('ba')) === undefined && docDone('contract')) {
    setFlag(docReadyFlag('ba'), today() + V.baWaitDays)
  }
  const booked = terminDay()
  if (getFlag('office.termin') && docsComplete() && !(booked !== null && booked >= today()) && !getFlag('visa.readyDay') && !getFlag('visa.submitted')) {
    const [a, b] = V.officeTerminDays
    let day = today() + a + Math.floor(Math.random() * (b - a + 1))
    while (weekdayIndex(day) >= 5) day++
    setFlag('visa.terminDay', day)
    setFlag('visa.terminTime', (9 + Math.floor(Math.random() * 6)) * 60 + (Math.random() < 0.5 ? 0 : 30))
    say(L('📩 Tuấn: „Có lịch VFS rồi nhé: ngày {d}!"', '📩 Tuấn: “Got you a VFS slot: {d}!”', '📩 Tuấn: „VFS-Termin am {d}!“'), 'good', { d: dateLabel(day) })
  }
  // Cầu nối pays the flight once the visa is approved.
  if (getFlag('cauNoi.signed') && typeof getFlag('visa.readyDay') === 'number' && !getFlag('visa.flight')) {
    setFlag('visa.flight', 'cauNoi')
    say(L('✈️ Sonnenhof gửi vé máy bay qua email: Hà Nội → Frankfurt, miễn phí (Chương trình Cầu nối).', '✈️ Sonnenhof emails your plane ticket: Hà Nội → Frankfurt, free (bridge programme).'), 'good')
  }
}

// --- Places ------------------------------------------------------------------------------------

/** Photo studio: biometric photos (35×45 mm, white background). */
function takePhotos() {
  if (!visaPath()) return false
  if (!doDocStep('photos', 'photo')) return false
  pushToast('toast.photosDone', 'good')
  return true
}

/** Home: the paper cabinet with the original diploma, school records and birth certificate. */
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

/** Notary: translate + notarize the ten pages. */
function notarize() {
  const docs = pendingAt('notary')
  if (docs.length === 0) return false
  if (!getFlag('visa.originals')) {
    pushToast('toast.needOriginals', 'bad')
    return false
  }
  if (!doDocStep('diploma', 'notary', true)) return false
  playSfx('stamp')
  pushToast('toast.notaryDone', 'good')
  return true
}

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
  // In Germany you change đồng into euros (bank buys đồng), in Vietnam euros into đồng (bank buys euros).
  const got = p.currency === 'EUR' ? Math.round((p.otherMoney / V.eurBuy) * 100) / 100 : Math.round(p.otherMoney * V.eurSell)
  usePlayer.setState({ otherMoney: 0, money: p.currency === 'EUR' ? Math.round((p.money + got) * 100) / 100 : p.money + got })
  spendTime(10)
  playSfx('coin')
  pushToast('toast.exchanged', 'good')
  return true
}

/** Euros in hand while in Vietnam (the second wallet), or the main wallet in Germany. */
export const eurosInHand = () => {
  const p = usePlayer.getState()
  return p.currency === 'EUR' ? p.money : p.otherMoney
}

// --- APS (Studium) ------------------------------------------------------------------------------

/** APS interviews happen only on round days (every two game weeks). */
export const isApsRound = (day: number) => day >= V.apsFirstRound && (day - V.apsFirstRound) % V.apsRoundEvery === 0
export function nextApsRound(from = today()) {
  let d = Math.max(from, V.apsFirstRound)
  while (!isApsRound(d)) d++
  return d
}

/** APS office: pay and hand in the file; on a round day, wait your turn and do the interview. */
function apsInterview() {
  if (visaPath() !== 'studium') return false
  const doc = docById('aps')!
  if (docProgress(doc) === 0) {
    if (!doDocStep('aps', 'aps')) return false
    if (!isApsRound(today())) {
      say(L('Frau Schneider: „Hồ sơ nhận rồi. Đợt phỏng vấn tiếp theo là ngày {d}, em nhớ đến đúng hẹn nhé."', 'Ms Schneider: “File received. The next interview round is on {d} — be on time.”'), 'info', { d: dateLabel(nextApsRound()) })
      return true
    }
  }
  if (docProgress(doc) !== 1) return false
  if (!isApsRound(today())) {
    say(L('Hôm nay không có đợt phỏng vấn APS. Đợt tiếp theo: ngày {d}.', 'No APS interviews today. Next round: {d}.', 'Heute keine APS-Interviews. Nächste Runde: {d}.'), 'info', { d: dateLabel(nextApsRound()) })
    return false
  }
  if (getFlag('aps.failDay') === today()) {
    pushToast('toast.apsTomorrow', 'info')
    return false
  }
  spendTime(V.apsWaitMinutes)
  useMinigame.getState().start({ kind: 'qa', set: 'aps', count: 6, passScore: V.apsPassScore }, (r) => {
    if (r.passed) {
      setFlag(docFlag('aps'), 2)
      usePlayer.getState().changeMood(10)
      playSfx('stamp')
      pushToast('toast.apsPassed', 'good')
    } else {
      setFlag('aps.failDay', today())
      usePlayer.getState().changeMood(-6)
      say(L('Chưa đạt phỏng vấn APS. Ôn lại rồi chờ đợt sau (ngày {d}).', 'APS interview not passed. Revise and wait for the next round ({d}).'), 'bad', { d: dateLabel(nextApsRound(today() + 1)) })
    }
  })
  return true
}

// --- Writing at the desk: CV + letter, Auslandsportal --------------------------------------------

function writeCv() {
  const doc = docById('cv')!
  if (!visaPath() || docProgress(doc) > 0 || officePending(doc)) return false
  const p = usePlayer.getState()
  if (p.energy < 10) {
    pushToast('toast.tooTired', 'bad')
    return false
  }
  useMinigame.getState().start({ kind: 'letter', set: 'cv' }, (r) => {
    p.spendEnergy(5)
    spendTime(45)
    if (r.passed) {
      doDocStep('cv', 'desk')
      usePlayer.getState().addGermanXp(Math.round(r.correct * 3))
      say(L('CV và thư động lực xong! Tự viết nên câu nào em cũng hiểu.', 'CV and letter done! You wrote every sentence yourself.'), 'good')
    } else {
      say(L('Thư còn nhiều lỗi quá, viết lại lần nữa nhé.', 'Too many mistakes in the letter — try again.'), 'bad')
    }
  })
  return true
}

/** The 8-field visa form. A wrong field isn't shown: VFS sends the file back on the day. */
function fillPortal() {
  const doc = docById('portal')!
  if (!visaPath() || officePending(doc) || getFlag('visa.submitted')) return false
  if (docProgress(doc) > 0 && getFlag(officeFlag('portal')) !== undefined) return false
  useMinigame.getState().start({ kind: 'form' }, (r) => {
    if (r.value === TERMIN_CANCELLED) return
    if (docProgress(doc) === 0) doDocStep('portal', 'desk')
    else spendTime(30)
    setFlag('portal.errors', r.total - r.correct)
    say(L('Đã gửi đơn trên Auslandsportal. Mã đơn được lưu lại để mang ra VFS.', 'Application sent on the Auslandsportal. Keep the reference for VFS.'), 'good')
  })
  return true
}

// --- Termin, VFS, interview ---------------------------------------------------------------------

export const terminDay = () => {
  const d = getFlag('visa.terminDay')
  return typeof d === 'number' ? d : null
}

export const visaReady = () => check({ dayReached: 'visa.readyDay' })

function choosePath(arg?: string) {
  if (arg !== 'studium' && arg !== 'ausbildung') return false
  if (arg === 'studium' && getFlag('cauNoi.signed')) {
    say(L('Em đã ký Chương trình Cầu nối rồi, chỉ đi được Ausbildung thôi.', 'You signed the bridge programme — only Ausbildung is possible.'), 'info')
    return false
  }
  setFlag('visa.path', arg)
  pushToast('toast.pathChosen', 'good')
  return true
}

function openPanel() {
  useUI.getState().openPanel({ type: 'visa' })
  return true
}

const canHunt = () => {
  const booked = terminDay()
  return !!visaPath() && !getFlag('visa.readyDay') && !getFlag('office.termin') && !(booked !== null && booked >= today())
}

function hunt() {
  if (!visaPath()) return false
  const booked = terminDay()
  if (booked !== null && booked >= today()) {
    pushToast('toast.terminAlready', 'info', { day: dateLabel(booked) })
    return false
  }
  if (getFlag('visa.readyDay')) return false
  const rejected = getFlag('visa.rejectedDay')
  if (typeof rejected === 'number' && today() < rejected + V.rejectCooldownDays) {
    pushToast('toast.rejectCooldown', 'info')
    return false
  }
  bumpFlag('stats.terminTries')
  useMinigame.getState().start({ kind: 'termin', attempts: V.terminAttempts }, (r) => {
    if (r.value === TERMIN_CANCELLED) return
    if (r.passed && r.value !== undefined) {
      const slot = decodeSlot(r.value)
      const at = today() + slot.dayOffset
      setFlag('visa.terminDay', at)
      setFlag('visa.terminTime', slot.minutes)
      if (flagNumber('stats.terminTries') === 1) setFlag('achv.terminFirstTry', true)
      bumpFlag('stats.termins')
      pushToast('toast.terminBookedAt', 'good', { day: dateLabel(at), time: formatClock(slot.minutes) })
    } else {
      pushToast('toast.terminMissed', 'bad')
    }
  })
  return true
}

/** Lose the appointment: VFS sent the file back. */
function loseTermin() {
  setFlag('visa.terminDay', 0)
  setFlag('office.termin', false)
  usePlayer.getState().changeMood(-10)
  playSfx('fail')
}

/** VFS counter (embassy scene): hand in the file, biometrics, pay the visa + service fee. */
function submitVfs() {
  const path = visaPath()
  if (!path || terminDay() !== today()) {
    pushToast('toast.noTerminToday', 'bad')
    return false
  }
  if (getFlag('visa.submitted') === today()) return false
  if (!docsComplete()) {
    loseTermin()
    pushToast('toast.visaMissingDocs', 'bad')
    return true
  }
  if (flagNumber('portal.errors') > 0) {
    loseTermin()
    say(L('Chị VFS: „Đơn Auslandsportal của em điền sai thông tin, không khớp hộ chiếu. Em sửa đơn rồi đặt lịch lại nhé." (Họ và Tên có bị đảo không?)', 'VFS: “Your Auslandsportal form doesn’t match your passport. Fix it and book again.” (Surname and given name swapped?)'), 'bad')
    return true
  }
  const fees = V.vfsVisaFee + V.vfsServiceFee
  if (!pay(fees)) return false
  spendTime(45)
  setFlag('visa.submitted', today())
  playSfx('stamp')
  say(L('Đã nộp hồ sơ, lấy vân tay và đóng {fee}. Giờ sang quầy phỏng vấn của bà Lehmann.', 'File handed in, fingerprints taken, {fee} paid. Now the interview window (Ms Lehmann).'), 'good', { fee: vnd(fees) })
  return true
}

/** At the embassy, on the Termin day, after VFS. */
function interview() {
  const path = visaPath()
  if (!path || terminDay() !== today()) {
    pushToast('toast.noTerminToday', 'bad')
    return false
  }
  if (getFlag('visa.submitted') !== today()) {
    say(L('Bà Lehmann: „Bitte zuerst zum VFS-Schalter." (Nộp hồ sơ ở quầy VFS trước đã.)', 'Ms Lehmann: “Bitte zuerst zum VFS-Schalter.” (Hand in your file at the VFS window first.)'), 'info')
    return false
  }
  setFlag('visa.terminDay', 0)
  useMinigame.getState().start(
    {
      kind: 'qa',
      set: path === 'studium' ? 'embassyStudium' : 'embassyAusbildung',
      count: 5,
      passScore: V.interviewPassScore,
      add: getFlag('cv.ghost') ? 'embassyGhost' : undefined,
    },
    (r) => {
      if (r.passed) approve()
      else {
        setFlag('visa.rejectedDay', today())
        setFlag('visa.submitted', 0)
        setFlag('office.termin', false)
        bumpFlag('stats.visaRejected')
        usePlayer.getState().changeMood(-12)
        pushToast('toast.visaRejected', 'bad')
        say(L('Có thể nộp lại (săn lịch, đóng phí lại) hoặc viết đơn khiếu nại (Remonstration) trong 7 ngày, trong Hồ sơ visa.', 'You can apply again (new slot, fees again) or write a Remonstration within 7 days — see the visa file.'), 'info')
      }
    },
  )
  return true
}

function approve() {
  setFlag('visa.readyDay', today() + V.approvalWaitDays)
  setFlag('visa.rejectedDay', 0)
  usePlayer.getState().changeMood(15)
  playSfx('stamp')
  pushToast('toast.visaApproved', 'good', { days: V.approvalWaitDays })
}

export const canRemonstrate = () => {
  const r = getFlag('visa.rejectedDay')
  return typeof r === 'number' && r > 0 && today() < r + V.remonstrationDays && !getFlag('remo.used') && !getFlag('visa.readyDay')
}

/** Remonstration: a formal letter asking the embassy to look again — free if it's well written. */
function remonstrate() {
  if (!canRemonstrate()) return false
  useMinigame.getState().start({ kind: 'letter', set: 'remo' }, (r) => {
    setFlag('remo.used', true)
    spendTime(60)
    if (r.passed) {
      say(L('📩 Đại sứ quán: „Ihre Remonstration wurde geprüft." Hồ sơ được xét lại — visa được duyệt!', '📩 Embassy: “Your Remonstration was reviewed.” The visa is approved!'), 'good')
      approve()
    } else {
      say(L('📩 Đại sứ quán giữ nguyên quyết định. Em phải nộp lại từ đầu (săn lịch mới).', '📩 The embassy keeps its decision. You have to apply again (new slot).'), 'bad')
    }
  })
  return true
}

// --- Flight & departure ---------------------------------------------------------------------------

/** Laptop at home: today's price (changes every day). */
export function laptopFlightPrice(day = today()) {
  const [a, b] = V.flightLaptop
  const steps = (b - a) / 500_000
  return a + (((day * 7919) % (steps + 1)) | 0) * 500_000
}

/** Chị Mai's office books it (fixed price, someone takes you to the airport). */
function buyFlight() {
  if (!visaReady() || getFlag('visa.flight')) return false
  if (!pay(V.flightCost)) return false
  setFlag('visa.flight', 'mai')
  pushToast('toast.flightBought', 'good')
  return true
}

function buyFlightLaptop() {
  if (!visaReady() || getFlag('visa.flight')) return false
  if (!pay(laptopFlightPrice())) return false
  setFlag('visa.flight', 'laptop')
  spendTime(30)
  pushToast('toast.flightBought', 'good')
  return true
}

function rideTo(scene: 'embassy' | 'airport' | 'vietnam') {
  if (!pay(V.xeOmFare)) return false
  travelTo(scene, scene === 'vietnam' ? 'xeOm' : 'default', { minutes: V.xeOmMinutes })
  playSfx('honk')
  return true
}

function xeOmEmbassy() {
  const booked = terminDay()
  const { minutes } = useTime.getState()
  if (!booked) {
    pushToast('toast.noTermin', 'info')
    return false
  }
  if (booked > today()) {
    pushToast('toast.terminLater', 'info', { day: dateLabel(booked) })
    return false
  }
  if (booked < today()) {
    setFlag('visa.terminDay', 0)
    setFlag('office.termin', false)
    pushToast('toast.terminExpired', 'bad')
    return false
  }
  const [open, close] = V.embassyHours
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

/** Nội Bài: Mẹ's envelope (and Bố's, behind her back). Once. */
function envelopes() {
  if (getFlag('dep.envelopes')) return false
  setFlag('dep.envelopes', true)
  const total = V.envelopes.me + V.envelopes.bo
  usePlayer.setState((s) => (s.currency === 'EUR' ? { money: s.money + total } : { otherMoney: Math.round((s.otherMoney + total) * 100) / 100 }))
  playSfx('coin')
  usePlayer.getState().changeMood(8)
  return true
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
  if (eurosInHand() < 100) pushToast('toast.noEuros', 'info')
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
  'visa.submit': submitVfs,
  'visa.interview': interview,
  'visa.remonstrate': remonstrate,
  'visa.buyFlight': buyFlight,
  'visa.flightLaptop': buyFlightLaptop,
  'visa.writeCv': writeCv,
  'visa.portal': fillPortal,
  'xeOm.embassy': xeOmEmbassy,
  'xeOm.airport': xeOmAirport,
  'xeOm.home': () => rideTo('vietnam'),
  'flight.depart': depart,
  'family.envelopes': envelopes,
  'visa.photo': takePhotos,
  'visa.originals': takeOriginals,
  'visa.notary': notarize,
  'bank.exchange': exchangeMoney,
  'bank.exchangeBack': exchangeBack,
  'aps.interview': apsInterview,
  'office.buy': officeBuy,
  'office.package': officePackage,
  'office.termin': officeTermin,
})

// Tuấn's menu: one test per document the office can take over.
registerTests(Object.fromEntries(VISA_DOCS.filter((d) => d.office).map((d) => [`office.can.${d.id}`, () => officeOptions().includes(d)])))

registerTests({
  'visa.docsComplete': docsComplete,
  'wallet.hasOther': () => usePlayer.getState().otherMoney > 0,
  'wallet.euroGoal': () => eurosInHand() >= V.exchangeGoal,
  // Offices and documents
  'office.open': officeOpen,
  'visa.photosDone': () => docDone('photos'),
  'visa.passportDone': () => docDone('passport'),
  'visa.passportApplied': () => flagNumber(docFlag('passport')) > 0 || docDone('passport'),
  'visa.originals': () => !!getFlag('visa.originals') || docDone('diploma'),
  'visa.notaryDone': () => docDone('diploma'),
  'visa.notaryOffice': () => officePending(docById('diploma')!),
  'visa.criminalDone': () => docDone('criminal'),
  'visa.healthDone': () => docDone('health'),
  'visa.writingDone': () => docDone('cv'),
  'visa.cvPending': () => officePending(docById('cv')!),
  'visa.insuranceDone': () => docDone('insurance'),
  'visa.apsDone': () => docDone('aps'),
  'visa.apsPaid': () => docProgress(docById('aps')!) === 1,
  'visa.apsRoundToday': () => isApsRound(today()),
  'visa.apsTriedToday': () => getFlag('aps.failDay') === today(),
  'visa.admissionDone': () => docDone('admission'),
  'visa.admissionSent': () => flagNumber(docFlag('admission')) > 0,
  'visa.sperrDone': () => docDone('sperr'),
  'visa.contractDone': () => docDone('contract'),
  'visa.contractSent': () => flagNumber(docFlag('contract')) > 0,
  'visa.baDone': () => docDone('ba'),
  'visa.portalDone': () => docDone('portal'),
  'visa.pathDocDone': () => (visaPath() === 'studium' ? docDone('admission') : docDone('contract')),
  'visa.pending.photo': () => pendingAt('photo').length > 0,
  'visa.pending.notary': () => pendingAt('notary').length > 0,
  'visa.pending.aps': () => pendingAt('aps').length > 0,
  'visa.pending.desk': () => pendingAt('desk').length > 0,
  'visa.cvToWrite': () => !!visaPath() && docProgress(docById('cv')!) === 0 && !officePending(docById('cv')!),
  'visa.portalToFill': () => !!visaPath() && !getFlag('visa.submitted') && !officePending(docById('portal')!) && getFlag(officeFlag('portal')) === undefined,
  'visa.terminToday': () => terminDay() === today(),
  'visa.submittedToday': () => getFlag('visa.submitted') === today(),
  'visa.canHunt': canHunt,
  'visa.officeTermin': () => !!getFlag('office.termin'),
  'visa.ready': visaReady,
  'visa.canRemonstrate': canRemonstrate,
  'visa.hasFlight': () => !!getFlag('visa.flight'),
  'office.packageAvailable': packageAvailable,
  'office.hasOptions': () => officeOptions().length > 0,
  'office.terminAvailable': () => !!visaPath() && !getFlag('office.termin') && !getFlag('visa.readyDay'),
  // For the step-by-step guide
  'visa.terminLater': () => (terminDay() ?? 0) > today(),
  'visa.waiting': () => typeof getFlag('visa.readyDay') === 'number' && !visaReady(),
  'visa.embassyOpen': () => hour() >= V.embassyHours[0] && hour() < V.embassyHours[1],
})

/** For the HUD: is the visa panel relevant right now? */
export const visaChapterActive = () => !!visaPath() && useWorld.getState().scene !== 'germany' && !getFlag('de.arrived')

/** Background checks (office bookings, BA approval, Cầu nối flight). Started from boot. */
export function startVisa() {
  officeTick()
  let last = ''
  return useFlags.subscribe(() => {
    // Cheap guard: only look again when the day or a doc flag changed.
    const key = `${today()}|${getFlag('visa.path')}|${getFlag('office.termin')}|${getFlag(docFlag('contract'))}|${getFlag('visa.readyDay')}|${getFlag('visa.flight')}|${getFlag(officeFlag('contract'))}|${getFlag('cauNoi.signed')}|${docsComplete()}`
    if (key === last) return
    last = key
    window.setTimeout(officeTick, 0)
  })
}
