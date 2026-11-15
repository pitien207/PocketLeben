import type { Localized } from '../i18n/localized'
import type { Condition } from './conditions'
import { CONFIG } from './config'
import { STEP_GUIDES, type StepGuide } from './guides'

/**
 * Story quests (plan §5.4): chapters of quests, each a checklist of steps. A step is done
 * when its condition holds (and stays done). A quest appears once the quest in `after`
 * is complete (or a later main quest already is, so a skipped step never blocks the story).
 * The HUD shows the first unfinished step of the first open main quest.
 */

export interface QuestStep {
  id: string
  text: Localized
  done: Condition
  /** Where to go and how (data/guides.ts), for the step-by-step guide. */
  guide?: StepGuide
}

export interface QuestDef {
  id: string
  chapter: number
  title: Localized
  /** Opens once this quest (or any of these, for path branches) is complete. */
  after?: string | string[]
  /** Only part of the story while this holds (e.g. the Studium or Ausbildung path). */
  when?: Condition
  /** Side quests don't drive the objective tracker. */
  side?: boolean
  steps: QuestStep[]
}

const L = (vi: string, en: string): Localized => ({ vi, en })
const C = CONFIG.career
const U = CONFIG.uni
const STUDIUM: Condition = { flag: 'visa.path', is: 'studium' }
const AUSBILDUNG: Condition = { not: STUDIUM }
const step = (id: string, vi: string, en: string, done: Condition): QuestStep => ({ id, text: L(vi, en), done, guide: STEP_GUIDES[id] })

export const CHAPTER_NAMES: Record<number, Localized> = {
  1: L('Chương 1 · Học tiếng Đức ở Việt Nam', 'Chapter 1 · Learning German in Vietnam'),
  2: L('Chương 2 · Hành trình visa', 'Chapter 2 · The visa journey'),
  3: L('Chương 3 · Đặt chân đến Đức', 'Chapter 3 · Arriving in Germany'),
  4: L('Chương 4 · Học nghề / Đại học ở Đức', 'Chapter 4 · Training / university in Germany'),
  5: L('Chương 5 · Cuộc sống mới ở Đức', 'Chapter 5 · A new life in Germany'),
}

export const QUESTS: QuestDef[] = [
  {
    id: 'start',
    chapter: 1,
    title: L('Bắt đầu hành trình', 'The journey begins'),
    steps: [
      step('start.teacher', 'Đến Trung tâm tiếng Đức trong ngõ, gặp Thầy Minh', 'Visit the German centre in the lane and meet Teacher Minh', { flag: 'talked.thayMinh' }),
      step('start.enroll', 'Đăng ký khóa A1', 'Enrol in the A1 course', { flag: 'course.0' }),
    ],
  },
  {
    id: 'saigon',
    chapter: 1,
    title: L('Sống ở Hà Nội', 'Life in Hanoi'),
    side: true,
    steps: [
      step('start.shift', 'Làm một ca ở quán cà phê', 'Work a shift at the café', { flag: 'stats.shifts', atLeast: 1 }),
      step('sg.traDa', 'Uống trà đá ở quán Bà Thu', 'Have iced tea at Granny Thu’s stall', { flag: 'stats.traDa', atLeast: 1 }),
      step('sg.clothes', 'Mua đồ mới ở sạp Chị Hằng', 'Buy new clothes at Hằng’s stall', { flag: 'stats.clothes', atLeast: 1 }),
    ],
  },
  {
    id: 'phoCo',
    chapter: 1,
    title: L('Phố cổ của tôi', 'My Old Quarter'),
    after: 'start',
    side: true,
    steps: [
      step('pc.fortune', 'Xin một quẻ ở Đình Hàng Gai (phía đông, qua đường bên)', 'Draw a fortune stick at the Hàng Gai đình (east, past the side road)', { flag: 'fortune.first' }),
      step('pc.leipzig', 'Nghe Chú Hưng hiệu sách cũ kể chuyện nước Đức năm 1989', 'Hear Uncle Hưng at the old bookshop tell his 1989 Germany story', { flag: 'story.leipzig' }),
      step('pc.lanterns', 'Ngắm chợ đêm lên đèn bên Hồ Gươm (sau 19h)', 'See the night market light up by the lake (after 7 pm)', { flag: 'secret.denLong' }),
    ],
  },
  {
    id: 'a1',
    chapter: 1,
    title: L('Chứng chỉ A1', 'A1 certificate'),
    after: 'start',
    steps: [
      step('a1.xp', 'Học bài cho đủ XP (lớp học hoặc tự học ở nhà)', 'Earn enough XP (class or self-study at home)', { any: [{ germanXpReady: true }, { germanLevel: 1 }] }),
      step('a1.exam', 'Thi đậu A1', 'Pass the A1 exam', { germanLevel: 1 }),
    ],
  },
  {
    id: 'a2',
    chapter: 1,
    title: L('Chứng chỉ A2', 'A2 certificate'),
    after: 'a1',
    steps: [
      step('a2.enroll', 'Đăng ký khóa A2', 'Enrol in the A2 course', { flag: 'course.1' }),
      step('a2.exam', 'Thi đậu A2', 'Pass the A2 exam', { germanLevel: 2 }),
    ],
  },
  {
    id: 'b1',
    chapter: 1,
    title: L('Chứng chỉ B1', 'B1 certificate'),
    after: 'a2',
    steps: [
      step('b1.enroll', 'Đăng ký khóa B1', 'Enrol in the B1 course', { flag: 'course.2' }),
      step('b1.exam', 'Thi đậu B1', 'Pass the B1 exam', { germanLevel: 3 }),
    ],
  },
  {
    id: 'path',
    chapter: 2,
    title: L('Chọn con đường', 'Choose your path'),
    after: 'b1',
    steps: [
      step('path.mai', 'Gặp chị Mai tư vấn du học (bàn ngoài quán cà phê)', 'Meet Mai the advisor (café terrace)', { flag: 'talked.chiMai' }),
      step('path.choose', 'Chọn Studium hoặc Ausbildung', 'Choose Studium or Ausbildung', { flag: 'visa.path' }),
    ],
  },
  {
    id: 'kyNiem',
    chapter: 2,
    title: L('Hành trang kỷ niệm', 'Packing memories'),
    after: 'path',
    side: true,
    steps: [
      step('kn.scarf', 'Tìm chiếc khăn bà nội đan (ở nhà, cuối giường)', 'Find the scarf Grandma knitted (at home, foot of the bed)', { flag: 'secret.khanBa' }),
      step('kn.photo', 'Tìm ảnh cưới của bố mẹ (bàn thờ)', 'Find Mum and Dad’s wedding photo (the altar)', { flag: 'secret.anhCu' }),
      step('kn.letter', 'Đọc lá thư năm 1989 trong hiệu sách cũ', 'Read the 1989 letter in the old bookshop', { flag: 'secret.thuCu' }),
    ],
  },
  {
    id: 'visa',
    chapter: 2,
    title: L('Hồ sơ visa', 'The visa application'),
    after: 'path',
    steps: [
      step('visa.docs', 'Hoàn thành mọi giấy tờ trong Hồ sơ visa', 'Complete every document in the visa file', { test: 'visa.docsComplete' }),
      step('visa.termin', 'Săn được Termin ở Đại sứ quán', 'Get an embassy Termin', { any: [{ flag: 'visa.terminDay', atLeast: 1 }, { flag: 'visa.readyDay' }] }),
      step('visa.interview', 'Đi xe ôm tới Đại sứ quán đúng ngày và phỏng vấn đậu', 'Ride to the embassy on the day and pass the interview', { flag: 'visa.readyDay' }),
    ],
  },
  {
    id: 'departure',
    chapter: 2,
    title: L('Lên đường', 'Departure'),
    after: 'visa',
    steps: [
      step('dep.visa', 'Chờ visa được cấp', 'Wait for the visa', { test: 'visa.ready' }),
      step('dep.flight', 'Mua vé máy bay (chị Mai)', 'Buy a plane ticket (Mai)', { flag: 'visa.flight' }),
      step('dep.airport', 'Ra sân bay, chào gia đình và lên máy bay', 'Go to the airport, say goodbye, board the plane', { flag: 'de.arrived' }),
    ],
  },
  {
    id: 'arrival',
    chapter: 3,
    title: L('Chào nước Đức!', 'Hallo Deutschland!'),
    after: 'departure',
    steps: [
      step('arr.wg', 'Tìm phòng: WG-Casting ở Lindenstraße 12', 'Find a room: WG casting at Lindenstraße 12', { flag: 'de.wg' }),
      step('arr.anmeldung', 'Anmeldung ở Bürgeramt (cần Termin + lấy số)', 'Register at the Bürgeramt (Termin + number)', { flag: 'de.anmeldung' }),
      step('arr.bank', 'Mở tài khoản ở Sparbank', 'Open an account at Sparbank', { flag: 'de.bank' }),
      step('arr.insurance', 'Đăng ký bảo hiểm y tế (laptop trong phòng WG)', 'Sign up for health insurance (laptop in your WG room)', { flag: 'de.insurance' }),
    ],
  },
  {
    id: 'firstDay',
    chapter: 4,
    title: L('Ngày làm việc đầu tiên', 'The first workday'),
    after: 'arrival',
    when: AUSBILDUNG,
    steps: [
      step('fd.ticket', 'Mua vé tàu ở máy bán vé', 'Buy a transit ticket at the machine', { any: [{ flag: 'de.ticketUntil' }, { flag: 'talked.anna' }] }),
      step('fd.anna', 'Đi tàu tới viện dưỡng lão, gặp chị Anna', 'Take the tram to the care home, meet Anna', { flag: 'talked.anna' }),
      step('fd.shift', 'Hoàn thành một ca chăm sóc', 'Finish a care shift', { flag: 'stats.careShifts', atLeast: 1 }),
    ],
  },
  {
    id: 'life',
    chapter: 4,
    title: L('Cuộc sống ở Đức', 'Life in Germany'),
    after: 'arrival',
    side: true,
    steps: [
      step('life.rent', 'Trả tiền thuê nhà tuần đầu tiên', 'Pay your first week’s rent', { flag: 'stats.rentPaid', atLeast: 1 }),
      step('life.pfand', 'Nhặt và trả 20 chai Pfand', 'Collect and return 20 Pfand bottles', { flag: 'stats.bottles', atLeast: 20 }),
      step('life.clothes', 'Mua đồ ở chợ Flohmarkt', 'Buy something at the flea market', { flag: 'stats.clothes', atLeast: 1 }),
      step('life.call', 'Gọi video về cho gia đình (laptop phòng WG)', 'Video-call your family (WG laptop)', { flag: 'stats.calls', atLeast: 1 }),
    ],
  },
  {
    id: 'leihOma',
    chapter: 4,
    title: L('Bà ngoại ở nước Đức', 'A grandmother in Germany'),
    after: 'arrival',
    side: true,
    steps: [
      step('lo.meet', 'Làm quen Bà Gerda ở hồ vịt Stadtpark (phía đông)', 'Meet Oma Gerda at the Stadtpark duck pond (east end)', { flag: 'talked.omaGerda' }),
      step('lo.ducks', 'Cho vịt ăn bằng một ổ Brötchen', 'Feed the ducks a Brötchen', { flag: 'stats.ducks', atLeast: 1 }),
      step('lo.words', 'Học từ mới với Bà Gerda 3 ngày', 'Learn words with Oma Gerda on 3 days', { flag: 'stats.gerdaWords', atLeast: 3 }),
      step('lo.igel', 'Tìm chú nhím Herbert của bà', 'Find her hedgehog friend Herbert', { flag: 'secret.igel' }),
      step('lo.kaffee', 'Uống Kaffee với Bà Gerda', 'Have Kaffee with Oma Gerda', { flag: 'gerda.friend' }),
    ],
  },
  {
    id: 'notAlone',
    chapter: 4,
    title: L('Không ai cô đơn', 'Nobody is alone'),
    after: 'arrival',
    side: true,
    steps: [
      step('na.bottle', 'Tìm thư trong chai ở đài phun nước phía tây', 'Find the message in a bottle at the west fountain', { flag: 'secret.flaschenpost' }),
      step('na.note', 'Tìm tờ ghi chú cũ trong thư viện Đại học (tram)', 'Find the old note in the university library (tram)', { flag: 'secret.notizUni' }),
      step('na.call', 'Gọi video về nhà kể chuyện', 'Video-call home and tell them', { flag: 'stats.calls', atLeast: 1 }),
    ],
  },
  {
    id: 'training',
    chapter: 4,
    title: L('Học nghề điều dưỡng', 'Nursing training'),
    after: 'firstDay',
    when: AUSBILDUNG,
    steps: [
      step('tr.school', `Học ${C.zwischen.school} buổi lý thuyết Berufsschule`, `Attend ${C.zwischen.school} Berufsschule theory lessons`, { flag: 'stats.berufsschule', atLeast: C.zwischen.school }),
      step('tr.shifts', `Hoàn thành ${C.zwischen.shifts} ca chăm sóc`, `Finish ${C.zwischen.shifts} care shifts`, { flag: 'stats.careShifts', atLeast: C.zwischen.shifts }),
      step('tr.zwischen', 'Thi đậu giữa khóa (Zwischenprüfung)', 'Pass the mid-term exam (Zwischenprüfung)', { flag: 'care.zwischen' }),
    ],
  },
  {
    id: 'examen',
    chapter: 4,
    title: L('Kỳ thi tốt nghiệp', 'The final exam'),
    after: 'training',
    when: AUSBILDUNG,
    steps: [
      step('ex.school', `Học đủ ${C.final.school} buổi Berufsschule`, `Attend ${C.final.school} Berufsschule lessons in total`, { flag: 'stats.berufsschule', atLeast: C.final.school }),
      step('ex.shifts', `Hoàn thành tổng cộng ${C.final.shifts} ca chăm sóc`, `Finish ${C.final.shifts} care shifts in total`, { flag: 'stats.careShifts', atLeast: C.final.shifts }),
      step('ex.final', 'Thi đậu tốt nghiệp — trở thành Pflegefachkraft!', 'Pass the final exam — become a qualified nurse!', { flag: 'care.examen' }),
    ],
  },
  {
    id: 'uniStart',
    chapter: 4,
    title: L('Sinh viên năm nhất', 'First-year student'),
    after: 'arrival',
    when: STUDIUM,
    steps: [
      step('uni.enroll', `Nhập học ở Đại học Lindenberg (đi tram, ${U.semesterFee} €)`, `Enrol at Lindenberg University (tram, ${U.semesterFee} €)`, { flag: 'uni.enrolled' }),
      step('uni.first', 'Nghe bài giảng đầu tiên của GS. Schulz', 'Attend Prof. Schulz’s first lecture', { flag: 'stats.lectures', atLeast: 1 }),
      step('uni.job', 'Làm Werkstudent: một ca ở viện dưỡng lão Sonnenhof', 'Werkstudent job: one shift at the Sonnenhof care home', { flag: 'stats.careShifts', atLeast: 1 }),
    ],
  },
  {
    id: 'semester',
    chapter: 4,
    title: L('Học kỳ đầu tiên', 'The first semester'),
    after: 'uniStart',
    when: STUDIUM,
    steps: [
      step('uni.lectures', `Nghe ${U.klausur.lectures} buổi giảng`, `Attend ${U.klausur.lectures} lectures`, { flag: 'stats.lectures', atLeast: U.klausur.lectures }),
      step('uni.group', `Học nhóm ${U.klausur.groupWork} lần ở thư viện`, `Do ${U.klausur.groupWork} group sessions in the library`, { flag: 'stats.groupWork', atLeast: U.klausur.groupWork }),
      step('uni.klausur', 'Thi đậu học kỳ (Klausur)', 'Pass the semester exam (Klausur)', { flag: 'uni.klausur' }),
    ],
  },
  {
    id: 'bachelor',
    chapter: 4,
    title: L('Tốt nghiệp cử nhân', 'The Bachelor’s degree'),
    after: 'semester',
    when: STUDIUM,
    steps: [
      step('uni.lectures2', `Nghe đủ ${U.thesis.lectures} buổi giảng`, `Attend ${U.thesis.lectures} lectures in total`, { flag: 'stats.lectures', atLeast: U.thesis.lectures }),
      step('uni.shifts', `Làm ${U.thesis.shifts} ca Werkstudent`, `Work ${U.thesis.shifts} Werkstudent shifts`, { flag: 'stats.careShifts', atLeast: U.thesis.shifts }),
      step('uni.thesis', 'Bảo vệ luận văn — nhận bằng cử nhân điều dưỡng!', 'Defend your thesis — earn the nursing Bachelor’s!', { flag: 'uni.degree' }),
    ],
  },
  {
    id: 'career',
    chapter: 5,
    title: L('Điều dưỡng chính thức', 'Qualified nurse'),
    after: ['examen', 'bachelor'],
    steps: [
      step('c5.contract', 'Phỏng vấn và ký hợp đồng chính thức ở Sonnenhof', 'Interview for and sign a permanent contract at Sonnenhof', { flag: 'job.fulltime' }),
      step('c5.proShifts', `Làm ${C.proShifts} ca với lương Pflegefachkraft`, `Work ${C.proShifts} shifts on a qualified nurse’s pay`, { flag: 'stats.proShifts', atLeast: C.proShifts }),
    ],
  },
  {
    id: 'tet',
    chapter: 5,
    title: L('Tết đoàn viên', 'Tết reunion'),
    after: 'career',
    steps: [
      step('tet.ticket', `Đặt vé về Hà Nội ăn Tết (laptop phòng WG, ${C.tripCost} €)`, `Book a flight home for Tết (WG laptop, ${C.tripCost} €)`, { any: [{ flag: 'trip.away' }, { flag: 'trip.done' }] }),
      step('tet.family', 'Về nhà đoàn tụ, chúc Tết bố mẹ', 'Get home and wish your parents a happy Tết', { any: [{ flag: 'trip.reunion' }, { flag: 'trip.done' }] }),
      step('tet.back', 'Bay về lại Đức', 'Fly back to Germany', { flag: 'trip.done' }),
    ],
  },
  {
    id: 'newHome',
    chapter: 5,
    title: L('Tổ ấm riêng', 'A home of your own'),
    after: 'tet',
    steps: [
      step('home.save', `Để dành ${C.flatDeposit} € tiền đặt cọc (Kaution)`, `Save ${C.flatDeposit} € for the deposit (Kaution)`, { any: [{ all: [{ country: 'de' }, { money: C.flatDeposit }] }, { flag: 'de.ownFlat' }] }),
      step('home.flat', 'Thuê căn hộ riêng ở Lindenstraße 12', 'Rent your own flat at Lindenstraße 12', { flag: 'de.ownFlat' }),
    ],
  },
  {
    id: 'residence',
    chapter: 5,
    title: L('Định cư ở Đức', 'Settling in Germany'),
    after: 'newHome',
    steps: [
      step('pr.rent', `Ở Đức và đóng tiền nhà đủ ${C.residence.rentWeeks} tuần`, `Live in Germany and pay rent for ${C.residence.rentWeeks} weeks`, { flag: 'stats.rentPaid', atLeast: C.residence.rentWeeks }),
      step('pr.lid', 'Thi đậu „Leben in Deutschland“ (Bürgeramt)', 'Pass the “Life in Germany” test (Bürgeramt)', { flag: 'pr.lid' }),
      step('pr.apply', 'Nộp hồ sơ và nhận giấy định cư (Niederlassungserlaubnis)', 'Apply for and receive permanent residence (Niederlassungserlaubnis)', { flag: 'pr.granted' }),
    ],
  },
  {
    id: 'dreams',
    chapter: 5,
    title: L('Ước mơ tiếp theo', 'The next dreams'),
    after: 'residence',
    side: true,
    steps: [
      step('dream.citizen', 'Nhập quốc tịch Đức (Bürgeramt)', 'Become a German citizen (Bürgeramt)', { flag: 'cz.granted' }),
      step('dream.savings', `Tiết kiệm được ${C.goalSavings.toLocaleString('de-DE')} €`, `Save ${C.goalSavings.toLocaleString('en-US')} €`, { all: [{ country: 'de' }, { money: C.goalSavings }] }),
      step('dream.shifts', 'Hoàn thành 50 ca chăm sóc', 'Finish 50 care shifts', { flag: 'stats.careShifts', atLeast: 50 }),
      step('dream.pfand', 'Trả 1.000 chai Pfand', 'Return 1,000 Pfand bottles', { flag: 'stats.bottles', atLeast: 1000 }),
    ],
  },
]
