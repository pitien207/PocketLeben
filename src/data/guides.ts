import type { Localized } from '../i18n/localized'
import { formatMoney } from '../i18n/format'
import type { SceneId } from '../store/worldStore'
import type { Condition } from './conditions'
import { CONFIG } from './config'
import { SHOP_ROOM_LIST, shopDoorSpot, shopScene } from './shopRooms'

/**
 * Step-by-step guide data: for every story step, where to go (target), how to do it
 * (hint), and what can block it with a way out (blockers). Plus the map of doors between
 * scenes, so the guide can point to the right exit when the target is somewhere else.
 *
 * Hints may contain {placeholders}, filled in by game/systems/guide.ts (guideVars):
 * {xp} {need} {termin} {ready} {amtTermin}.
 */

/** Something to point at inside a scene. */
export type GuidePoint = { npc: string } | { spot: string } | { at: [number, number, number] }

/** A place in the world, or a button on the HUD. */
export type GuideTarget = ({ scene: SceneId } & GuidePoint) | { ui: GuideUi }
export type GuideUi = 'passport' | 'clock' | 'bag' | 'quest'

export interface GuideBlocker {
  when: Condition
  hint: Localized
  /** Where to go to fix it (default: keep pointing at the step's target). */
  target?: GuideTarget
}

export interface StepGuide {
  /** First entry whose `if` holds wins (no `if` = always). */
  targets: { if?: Condition; target: GuideTarget }[]
  hint: Localized
  /** Checked in order after the global blockers; the first that holds is shown. */
  blockers?: GuideBlocker[]
}

const L = (vi: string, en: string, de: string): Localized => ({ vi, en, de })
const vnd = (n: number) => formatMoney(n, 'VND')
const lvl = CONFIG.german.levels

// --- Common targets ------------------------------------------------------------------
const TEACHER: GuideTarget = { scene: 'classroom', npc: 'thayMinh' }
const MAI: GuideTarget = { scene: 'maiOffice', npc: 'chiMai' }
const CAFE: GuideTarget = { scene: 'vietnam', npc: 'chiVy' }
const HOME_BED: GuideTarget = { scene: 'home', spot: 'home-bed' }
const HOME_DESK: GuideTarget = { scene: 'home', spot: 'home-desk' }
const PASSPORT: GuideTarget = { ui: 'passport' }
// Visa offices at the west end of the street (1.13) and the paper cabinet at home
// 1.41 the clerks work inside their offices (data/shopRooms.ts)
const PHOTO: GuideTarget = { scene: 'shop.photo', npc: 'chuAnh' }
const NOTARY: GuideTarget = { scene: 'shop.notary', npc: 'coCongChung' }
const BANK: GuideTarget = { scene: 'shop.bank', npc: 'anhNganHang' }
const APS: GuideTarget = { scene: 'shop.aps', npc: 'coAps' }
const PAPERS: GuideTarget = { scene: 'home', spot: 'home-papers' }
const CLOCK: GuideTarget = { ui: 'clock' }

/** Văn phòng Mai Anh: Mon–Sat 8–18. */
const maiClosed: GuideBlocker = {
  when: { all: [{ not: { test: 'mai.open' } }, { not: { scene: 'maiOffice' } }] },
  hint: L('Văn phòng Mai Anh mở 8–18h, thứ Hai–Bảy. Bấm đồng hồ để chờ.', 'The Mai Anh office is open Mon–Sat, 8:00–18:00. Tap the clock to wait.', 'Büro Mai Anh: Mo–Sa 8–18 Uhr. Tippe auf die Uhr.'),
  target: { ui: 'clock' },
}

// --- Reusable blockers -------------------------------------------------------------------
const needMoney = (amount: number, what: Localized): GuideBlocker => ({
  when: { all: [{ country: 'vn' }, { not: { money: amount } }] },
  hint: {
    vi: `Cần ${vnd(amount)} cho ${what.vi}. Đi làm thêm (Bảng việc trên điện thoại: trà sữa, Circle K, Grab, gia sư) hoặc vay bố mẹ ở nhà.`,
    en: `You need ${vnd(amount)} for ${what.en}. Work side jobs (job board on your phone: café, Circle K, Grab, tutoring) or borrow from your parents.`,
    de: `Du brauchst ${vnd(amount)} für ${what.de ?? what.en}. Nebenjobs (Jobbörse im Handy) oder bei den Eltern leihen.`,
  },
  target: CAFE,
})

/** Photo studio, notary, bank, APS: office hours. */
const vnOfficeClosed: GuideBlocker = {
  when: { all: [{ not: { test: 'office.open' } }, { scene: 'vietnam' }] },
  hint: L(
    `Các văn phòng mở ${CONFIG.visa.officeHours[0]}–${CONFIG.visa.officeHours[1]}h. Bấm đồng hồ để chờ đến giờ làm việc.`,
    `The offices at the end of the street are open ${CONFIG.visa.officeHours[0]}:00–${CONFIG.visa.officeHours[1]}:00. Tap the clock to wait.`,
    `Die Büros am Straßenende haben ${CONFIG.visa.officeHours[0]}–${CONFIG.visa.officeHours[1]} Uhr geöffnet. Tippe auf die Uhr zum Warten.`,
  ),
  target: CLOCK,
}

const schoolClosed: GuideBlocker = {
  when: { all: [{ not: { test: 'school.open' } }, { not: { scene: 'classroom' } }] },
  hint: L(
    'Trung tâm Đức ngữ mở 7–21h. Bấm đồng hồ để chờ, hoặc về nhà tự học ở bàn học / đi ngủ.',
    'The German centre is open 7:00–21:00. Tap the clock to wait, or study at your home desk / go to bed.',
    'Das Sprachzentrum ist 7–21 Uhr geöffnet. Tippe auf die Uhr zum Warten oder lerne zu Hause.',
  ),
  target: HOME_DESK,
}

const needXp: GuideBlocker = {
  when: { not: { germanXpReady: true } },
  hint: L(
    'Chưa đủ XP để thi ({xp}/{need}). Vào lớp → Thầy Minh → Học một buổi, hoặc tự học ở bàn học nhà mình (½ XP).',
    'Not enough XP for the exam yet ({xp}/{need}). Class → Teacher Minh → Take a lesson, or study at your desk at home (½ XP).',
    'Noch nicht genug XP ({xp}/{need}). Kurs → Lehrer Minh → Lektion, oder zu Hause lernen (½ XP).',
  ),
}

/** Applied to every step before its own blockers. */
export const GLOBAL_BLOCKERS: GuideBlocker[] = [
  {
    when: { all: [{ not: { energy: 12 } }, { country: 'vn' }] },
    hint: L(
      'Bạn mệt lắm rồi! Ăn gì đó (túi đồ, tạp hóa Cô Liên, trà đá Bà Thu) hoặc về nhà ngủ / chợp mắt.',
      'You’re exhausted! Eat something (bag, Cô Liên’s grocery, Bà Thu’s tea) or go home to sleep / nap.',
      'Du bist erschöpft! Iss etwas oder geh nach Hause schlafen.',
    ),
    target: HOME_BED,
  },
  {
    when: { all: [{ not: { energy: 12 } }, { country: 'de' }] },
    hint: L(
      'Bạn mệt lắm rồi! Mua gì ăn ở tiệm bánh / quán Döner, hoặc về phòng ngủ.',
      'You’re exhausted! Grab food at the bakery or Döner stand, or go to bed.',
      'Du bist erschöpft! Hol dir etwas zu essen oder geh schlafen.',
    ),
    target: { scene: 'wg', spot: 'wg-bed' },
  },
  // Two wallets (1.13): almost out of euros in Germany but đồng left → change them at the Sparbank.
  {
    when: { all: [{ country: 'de' }, { not: { money: 30 } }, { test: 'wallet.hasOther' }] },
    hint: L(
      'Sắp hết Euro rồi! Ra ngân hàng Sparbank trên Lindenstraße → bà Wagner → Đổi hết tiền Việt sang Euro.',
      'Almost out of euros! Go to the Sparbank on Lindenstraße → Ms Wagner → change all your đồng into euros.',
      'Fast keine Euro mehr! Zur Sparbank in der Lindenstraße → Frau Wagner → alle Dong in Euro tauschen.',
    ),
    target: { scene: 'germany', npc: 'wagner' },
  },
]

// --- One guide per story step ----------------------------------------------------------
// --- Chapters 4–5 --------------------------------------------------------------------------
const ANNA: GuideTarget = { scene: 'careHome', npc: 'anna' }
const CLERK: GuideTarget = { scene: 'buergeramt', npc: 'clerk' }
const WG_BED: GuideTarget = { scene: 'wg', spot: 'wg-bed' }
const car = CONFIG.career

/** A care shift can't start: done today, wrong hours, too tired. */
const SHIFT_BLOCKERS: GuideBlocker[] = [
  {
    when: { test: 'care.shiftDoneToday' },
    hint: L('Hôm nay làm ca rồi. Về phòng ngủ, mai làm tiếp.', 'You already worked today. Sleep and come back tomorrow.', 'Heute schon gearbeitet. Morgen wieder.'),
    target: { scene: 'wg', spot: 'wg-bed' },
  },
  {
    when: { not: { test: 'care.shiftHours' } },
    hint: L(
      `Ca làm bắt đầu ${CONFIG.care.startHours[0]}–${CONFIG.care.startHours[1]}h. Bấm đồng hồ để chờ hoặc ngủ đến sáng.`,
      `Shifts start ${CONFIG.care.startHours[0]}:00–${CONFIG.care.startHours[1]}:00. Wait or sleep until morning.`,
      `Schichtbeginn ${CONFIG.care.startHours[0]}–${CONFIG.care.startHours[1]} Uhr. Warte oder schlaf bis morgens.`,
    ),
    target: CLOCK,
  },
  {
    when: { not: { energy: CONFIG.care.energyCost } },
    hint: L('Không đủ sức làm ca. Ăn gì đó hoặc ngủ một giấc.', 'Too tired for a shift. Eat something or sleep.', 'Zu müde für eine Schicht. Iss oder schlaf.'),
    target: { scene: 'wg', spot: 'wg-bed' },
  },
]

const schoolDoneToday: GuideBlocker = {
  when: { test: 'care.schoolDoneToday' },
  hint: L(
    'Hôm nay học Berufsschule rồi. Làm một ca chăm sóc hoặc ngủ, mai học tiếp.',
    'You already had Berufsschule today. Work a shift or sleep and study tomorrow.',
    'Heute schon Berufsschule. Arbeite eine Schicht oder schlaf, morgen weiter.',
  ),
  target: WG_BED,
}

const officeClosed: GuideBlocker = {
  when: { all: [{ not: { test: 'de.officeOpen' } }, { not: { scene: 'buergeramt' } }] },
  hint: L(
    'Bürgeramt chỉ mở thứ Hai–Sáu, 8–16h. Bấm đồng hồ để chờ.',
    'The Bürgeramt is open Mon–Fri, 8:00–16:00. Tap the clock to wait.',
    'Das Bürgeramt hat Mo–Fr 8–16 Uhr geöffnet. Tippe auf die Uhr.',
  ),
  target: CLOCK,
}

const triedToday = (test: string): GuideBlocker => ({
  when: { test },
  hint: L('Hôm nay thử rồi. Ngủ một giấc, mai thử lại nhé.', 'You already tried today. Sleep and try again tomorrow.', 'Heute schon versucht. Schlaf, morgen wieder.'),
  target: WG_BED,
})

const needEur = (amount: number, what: Localized): GuideBlocker => ({
  when: { all: [{ country: 'de' }, { not: { money: amount } }] },
  hint: {
    vi: `Cần ${amount} € cho ${what.vi}. Làm thêm ca ở Sonnenhof hoặc nhặt chai Pfand.`,
    en: `You need ${amount} € for ${what.en}. Work more shifts at Sonnenhof or collect Pfand bottles.`,
    de: `Du brauchst ${amount} € für ${what.de ?? what.en}. Mehr Schichten oder Pfand sammeln.`,
  },
  target: ANNA,
})

// --- Chapter 4A (Studium) ------------------------------------------------------------------
const PROF: GuideTarget = { scene: 'university', npc: 'profSchulz' }
const uni = CONFIG.uni

const uniClosed: GuideBlocker = {
  when: { all: [{ not: { test: 'uni.open' } }] },
  hint: L(
    `Giảng đường mở thứ Hai–Sáu, ${uni.hours[0]}–${uni.hours[1]}h. Bấm đồng hồ để chờ hoặc ngủ đến sáng.`,
    `The university is open Mon–Fri, ${uni.hours[0]}:00–${uni.hours[1]}:00. Wait or sleep until morning.`,
    `Die Uni ist Mo–Fr ${uni.hours[0]}–${uni.hours[1]} Uhr geöffnet. Warte oder schlaf bis morgen.`,
  ),
  target: CLOCK,
}

export const STEP_GUIDES: Record<string, StepGuide> = {
  // Chapter 1 — German in Hà Nội
  'start.teacher': {
    targets: [{ target: TEACHER }],
    hint: L(
      'Đi vào ngõ giữa nhà mình và tiệm trà sữa, tới Trung tâm Đức ngữ ở cuối ngõ, bấm Vào lớp rồi nói chuyện với Thầy Minh.',
      'Walk up the lane between your home and the café to the German centre at the end, tap Go to class, then talk to Teacher Minh.',
      'Geh die Gasse zwischen deinem Haus und dem Café hinauf zum Sprachzentrum, tippe „Zum Unterricht“ und sprich mit Lehrer Minh.',
    ),
    blockers: [schoolClosed],
  },
  'start.enroll': {
    targets: [{ target: TEACHER }],
    hint: L(
      `Nói chuyện với Thầy Minh → chọn Đăng ký khóa A1 (${vnd(lvl[0].courseFee)}).`,
      `Talk to Teacher Minh → Enrol in the A1 course (${vnd(lvl[0].courseFee)}).`,
      `Sprich mit Lehrer Minh → Für A1 anmelden (${vnd(lvl[0].courseFee)}).`,
    ),
    blockers: [needMoney(lvl[0].courseFee, L('khóa A1', 'the A1 course', 'den A1-Kurs')), schoolClosed],
  },
  'a1.xp': {
    targets: [{ if: { not: { test: 'school.open' } }, target: HOME_DESK }, { target: TEACHER }],
    hint: L(
      'Vào lớp → Thầy Minh → Học một buổi. Trả lời đúng để nhận XP ({xp}/{need}). Hoặc về nhà tự học ở bàn học (½ XP).',
      'Go to class → Teacher Minh → Take a lesson. Right answers give XP ({xp}/{need}). Or study at your desk at home (½ XP).',
      'Zum Kurs → Lehrer Minh → Lektion. Richtige Antworten geben XP ({xp}/{need}). Oder zu Hause lernen (½ XP).',
    ),
  },
  'a1.exam': {
    targets: [{ target: TEACHER }],
    hint: L(
      `Nói chuyện với Thầy Minh → Thi chứng chỉ A1 (${vnd(lvl[0].examFee)}). Bạn sẽ sang phòng thi; đúng 70% là đậu.`,
      `Talk to Teacher Minh → Take the A1 exam (${vnd(lvl[0].examFee)}). You’ll go to the exam room; 70% to pass.`,
      `Sprich mit Lehrer Minh → A1-Prüfung (${vnd(lvl[0].examFee)}). 70 % zum Bestehen.`,
    ),
    blockers: [needXp, needMoney(lvl[0].examFee, L('lệ phí thi A1', 'the A1 exam fee', 'die A1-Prüfungsgebühr')), schoolClosed],
  },
  'a2.enroll': {
    targets: [{ target: TEACHER }],
    hint: L(
      `Nói chuyện với Thầy Minh → Đăng ký khóa A2 (${vnd(lvl[1].courseFee)}).`,
      `Talk to Teacher Minh → Enrol in A2 (${vnd(lvl[1].courseFee)}).`,
      `Sprich mit Lehrer Minh → Für A2 anmelden (${vnd(lvl[1].courseFee)}).`,
    ),
    blockers: [needMoney(lvl[1].courseFee, L('khóa A2', 'the A2 course', 'den A2-Kurs')), schoolClosed],
  },
  'a2.exam': {
    targets: [{ target: TEACHER }],
    hint: L(
      `Học thêm cho đủ XP rồi nói chuyện với Thầy Minh → Thi A2 (${vnd(lvl[1].examFee)}).`,
      `Study until you have enough XP, then Teacher Minh → A2 exam (${vnd(lvl[1].examFee)}).`,
      `Lerne bis genug XP, dann Lehrer Minh → A2-Prüfung (${vnd(lvl[1].examFee)}).`,
    ),
    blockers: [needXp, needMoney(lvl[1].examFee, L('lệ phí thi A2', 'the A2 exam fee', 'die A2-Gebühr')), schoolClosed],
  },
  'b1.enroll': {
    targets: [{ target: TEACHER }],
    hint: L(
      `Nói chuyện với Thầy Minh → Đăng ký khóa B1 (${vnd(lvl[2].courseFee)}).`,
      `Talk to Teacher Minh → Enrol in B1 (${vnd(lvl[2].courseFee)}).`,
      `Sprich mit Lehrer Minh → Für B1 anmelden (${vnd(lvl[2].courseFee)}).`,
    ),
    blockers: [needMoney(lvl[2].courseFee, L('khóa B1', 'the B1 course', 'den B1-Kurs')), schoolClosed],
  },
  'b1.exam': {
    targets: [{ target: TEACHER }],
    hint: L(
      `Học thêm cho đủ XP rồi nói chuyện với Thầy Minh → Thi B1 (${vnd(lvl[2].examFee)}). Có B1 là đủ điều kiện làm visa!`,
      `Study until you have enough XP, then Teacher Minh → B1 exam (${vnd(lvl[2].examFee)}). B1 is what the visa needs!`,
      `Lerne bis genug XP, dann Lehrer Minh → B1-Prüfung (${vnd(lvl[2].examFee)}). B1 braucht man fürs Visum!`,
    ),
    blockers: [needXp, needMoney(lvl[2].examFee, L('lệ phí thi B1', 'the B1 exam fee', 'die B1-Gebühr')), schoolClosed],
  },

  // Chapter 1 additions (story 2.1)
  'start.job': {
    targets: [{ target: CAFE }],
    hint: L(
      `Xin việc làm thêm: Tiệm Trà Sữa Phố Cổ (đầu phố, nói chuyện với chị Vy → Làm ca, ${vnd(450_000)}/ca) hoặc Circle K góc ngõ Hàng Bông (phỏng vấn 3 câu với chị quản lý). Mỗi việc làm được 1 lần/ngày.`,
      `Get a side job: the Old Quarter café counter (${vnd(450_000)} a shift) or Circle K at the Hàng Bông corner (3-question interview). Each job once a day.`,
      `Such dir einen Nebenjob: Café-Theke (${vnd(450_000)} pro Schicht) oder Circle K an der Ecke Hàng Bông (Vorstellungsgespräch). Jeder Job einmal am Tag.`,
    ),
  },
  'na.tutor': {
    targets: [{ target: { scene: 'home', npc: 'emGai' } }],
    hint: L('Về nhà, nói chuyện với Na → Kèm em học Toán (mỗi ngày một buổi, 3 buổi).', 'Go home, talk to Na → help her with maths (one session a day, 3 in total).', 'Zu Hause mit Na reden → Mathe-Nachhilfe (eine Sitzung pro Tag, 3 insgesamt).'),
    blockers: [{ when: { test: 'family.naTutorToday' }, hint: L('Hôm nay kèm Na rồi, mai tiếp nhé.', 'You already helped Na today — tomorrow again.', 'Heute schon geholfen — morgen wieder.'), target: HOME_BED }],
  },
  'a2.cauNoi': {
    targets: [{ target: MAI }],
    hint: L(
      'Sang Văn phòng Mai Anh (tầng 2, đầu phố Hàng Bông — ngõ bên cạnh tiệm trà sữa) → nói chuyện với chị Mai về Chương trình Cầu nối Sonnenhof.',
      'Go to the Mai Anh office (upstairs, at the start of Hàng Bông — the lane beside the café) → ask Mai about the Sonnenhof bridge programme.',
      'Zum Büro Mai Anh (1. Stock, Anfang Hàng Bông — Gasse neben dem Café) → Mai nach dem Brückenprogramm Sonnenhof fragen.',
    ),
    blockers: [maiClosed],
  },
  'cn.interview': {
    targets: [{ target: MAI }],
    hint: L('Chị Mai → Phỏng vấn online với chị Anna (Sonnenhof): 4 câu tiếng Đức A2, cần 50%.', 'Mai → online interview with Anna (Sonnenhof): 4 questions in A2 German, 50% to pass.', 'Mai → Online-Interview mit Anna (Sonnenhof): 4 Fragen, 50 % zum Bestehen.'),
    blockers: [maiClosed],
  },
  'cn.read': {
    targets: [{ target: MAI }],
    hint: L('Chị Mai → Đọc kỹ hợp đồng: tìm 3 điều khoản quan trọng (lương, thời hạn ràng buộc, tiền hoàn lại).', 'Mai → Read the contract: find the 3 key clauses (salary, binding period, repayment).', 'Mai → Vertrag lesen: die 3 wichtigen Klauseln finden.'),
    blockers: [maiClosed],
  },
  'cn.choose': {
    targets: [{ target: MAI }],
    hint: L(
      'Chị Mai → Ký Cầu nối (B1 + thi B1 + vé máy bay miễn phí, nhưng chỉ còn đường Ausbildung) hoặc Tự đi (giữ cả hai đường, tự trả hết).',
      'Mai → Sign (free B1 course + exam + flight, but Ausbildung only) or Go alone (both paths open, you pay everything).',
      'Mai → Unterschreiben (B1, Prüfung, Flug gratis — nur Ausbildung) oder allein gehen (beide Wege, alles selbst zahlen).',
    ),
    blockers: [maiClosed],
  },
  'linh.study': {
    targets: [{ target: { scene: 'classroom', npc: 'hvLinh' } }],
    hint: L('Vào lớp Thầy Minh, nói chuyện với Linh → Học nhóm.', 'Go to Teacher Minh’s class, talk to Linh → Study together.', 'Im Kurs mit Linh reden → zusammen lernen.'),
    blockers: [schoolClosed],
  },
  'linh.talk': {
    targets: [{ target: { scene: 'classroom', npc: 'hvLinh' } }],
    hint: L('Sau khi đậu A2: nói chuyện với Linh trong lớp. Linh có chuyện muốn khoe.', 'After A2: talk to Linh in class. She has news.', 'Nach A2: mit Linh im Kurs reden. Sie hat Neuigkeiten.'),
    blockers: [schoolClosed],
  },
  'hk.visit': {
    targets: [{ target: { scene: 'shop.hoangKim', npc: 'anhKhai' } }],
    hint: L('Văn phòng Hoàng Kim (biển LED nhấp nháy, bên kia ngõ Hàng Bông, đối diện văn phòng chị Mai) → nói chuyện với anh Khải.', 'Hoàng Kim office (blinking LED sign, across the Hàng Bông lane from Mai’s office) → talk to Khải.', 'Büro Hoàng Kim (LED-Schild, gegenüber von Mais Büro) → mit Khải reden.'),
  },
  'hk.spot': {
    targets: [{ target: { scene: 'shop.hoangKim', npc: 'anhKhai' } }],
    hint: L('Anh Khải → Xem hợp đồng: tìm 3 dấu hiệu lừa đảo.', 'Khải → Look at the contract: find 3 signs of a scam.', 'Khải → Vertrag ansehen: 3 Betrugszeichen finden.'),
  },
  'hk.warn': {
    targets: [{ if: { all: [{ scene: 'shop.hoangKim' }, { flag: 'linh.told' }] }, target: { scene: 'shop.hoangKim', npc: 'hvLinh' } }, { target: { scene: 'classroom', npc: 'hvLinh' } }],
    hint: L('Nói với Linh những gì bạn biết về Hoàng Kim (trong lớp, hoặc khi Linh ngồi ở văn phòng Hoàng Kim).', 'Tell Linh what you know about Hoàng Kim (in class, or when she sits in the Hoàng Kim office).', 'Erzähl Linh, was du über Hoàng Kim weißt.'),
  },

  // Chapter 2 — the visa (story 2.1)
  'path.mai': {
    targets: [{ target: MAI }],
    hint: L(
      'Văn phòng Mai Anh: đi vào ngõ Hàng Bông (cạnh tiệm trà sữa), cửa có cầu thang hẹp lên tầng 2. Nói chuyện với chị Mai.',
      'Mai Anh office: walk into the Hàng Bông lane (beside the café), the door with the narrow stairs. Talk to Mai.',
      'Büro Mai Anh: in die Hàng-Bông-Gasse (neben dem Café), die Tür mit der schmalen Treppe. Mit Mai reden.',
    ),
    blockers: [maiClosed],
  },
  'path.choose': {
    targets: [{ target: MAI }],
    hint: L(
      'Chị Mai → chọn Studium (cần Studienkolleg, APS, Sperrkonto 11.904 €) hoặc Ausbildung điều dưỡng (có lương ~1.490 €, không cần Sperrkonto).',
      'Mai → choose Studium (Studienkolleg, APS, €11,904 blocked account) or nursing Ausbildung (paid ~€1,490, no blocked account).',
      'Mai → Studium (Studienkolleg, APS, Sperrkonto 11.904 €) oder Pflege-Ausbildung (~1.490 €, kein Sperrkonto).',
    ),
    blockers: [maiClosed],
  },
  'sperr.meeting': {
    targets: [{ target: { scene: 'home', npc: 'bo' } }],
    hint: L('Buổi tối (sau 18h) về nhà nói chuyện với Bố: họp gia đình về tiền Sperrkonto.', 'In the evening (after 18:00) go home and talk to Dad: the family meeting about the blocked account.', 'Abends (ab 18 Uhr) zu Hause mit Papa reden: Familienrat zum Sperrkonto.'),
    blockers: [{ when: { not: { test: 'family.evening' } }, hint: L('Cả nhà chỉ họp buổi tối, sau 18h. Bấm đồng hồ để chờ.', 'The family meets in the evening, after 18:00. Tap the clock to wait.', 'Familienrat erst abends ab 18 Uhr.'), target: CLOCK }],
  },
  'sperr.email': {
    targets: [{ target: HOME_DESK }],
    hint: L('Bàn học ở nhà → Viết email cho cô Lan (tiếng Đức B1).', 'Home desk → Write cô Lan an email (B1 German).', 'Schreibtisch → E-Mail an Frau Lan (B1).'),
  },
  'sperr.call': {
    targets: [{ target: HOME_DESK }],
    hint: L('Tối hôm sau (sau 18h): bàn học ở nhà → Gọi video cho cô Lan. 3 câu hỏi, cần 2 câu tốt.', 'The next evening (after 18:00): home desk → video-call cô Lan. 3 questions, 2 good answers.', 'Am nächsten Abend: Schreibtisch → Videoanruf mit Frau Lan.'),
    blockers: [{ when: { not: { test: 'family.lanCallReady' } }, hint: L('Cô Lan hẹn gọi tối mai (sau 18h). Bấm đồng hồ để chờ.', 'Cô Lan calls tomorrow evening (after 18:00). Wait with the clock.', 'Frau Lan ruft morgen Abend an.'), target: CLOCK }],
  },
  'visa.docs': {
    targets: [{ target: PASSPORT }],
    hint: L(
      'Bấm cuốn hộ chiếu → Hồ sơ visa → làm từng giấy tờ: tự làm (rẻ, tốn thời gian) hoặc 💼 nhờ văn phòng chị Mai (mai có).',
      'Tap the passport → visa file → each document: do it yourself (cheaper, slower) or 💼 leave it to Mai’s office (ready tomorrow).',
      'Pass → Visa-Mappe → jedes Dokument selbst (günstig, langsam) oder 💼 von Mais Büro (morgen fertig).',
    ),
  },
  'visa.passport': {
    targets: [{ target: PASSPORT }],
    hint: L(`Hồ sơ visa → Làm hộ chiếu (${vnd(200_000)}), hôm sau nhận.`, `Visa file → Apply for a passport (${vnd(200_000)}), ready the next day.`, `Visa-Mappe → Pass beantragen (${vnd(200_000)}), am nächsten Tag fertig.`),
    blockers: [{ when: { test: 'visa.passportApplied' }, hint: L('Hộ chiếu đang làm, mai có. Ngủ một giấc hoặc làm giấy tờ khác.', 'The passport is being made — ready tomorrow.', 'Der Pass wird gemacht — morgen fertig.'), target: HOME_BED }, needMoney(200_000, L('hộ chiếu', 'the passport', 'den Pass'))],
  },
  'visa.photos': {
    targets: [{ target: PHOTO }],
    hint: L(
      `Cuối phố phía tây (qua cây đa) → Tiệm ảnh Hùng → Chụp ảnh sinh trắc 35×45 (${vnd(100_000)}).`,
      `West end of the street (past the banyan) → Hùng’s photo studio → biometric photos 35×45 (${vnd(100_000)}).`,
      `Westende → Fotostudio Hùng → biometrische Fotos (${vnd(100_000)}).`,
    ),
    blockers: [vnOfficeClosed, needMoney(100_000, L('ảnh', 'the photos', 'die Fotos'))],
  },
  'visa.originals': {
    targets: [{ target: PAPERS }],
    hint: L('Về nhà → tủ giấy tờ cạnh tivi → Lấy bằng THPT, học bạ và giấy khai sinh (bản gốc).', 'Go home → the paper cabinet by the TV → take the diploma, school records and birth certificate (originals).', 'Nach Hause → Dokumentenschrank → Originale nehmen.'),
  },
  'visa.notary': {
    targets: [{ if: { not: { test: 'visa.originals' } }, target: PAPERS }, { target: NOTARY }],
    hint: L(
      `Tự làm: cô Phương (công chứng, trên phố đi bộ Hàng Đào) → 10 trang, ${vnd(1_500_000)}, mất ~4 giờ. Hoặc 💼 văn phòng chị Mai: ${vnd(2_000_000)}, mai có.`,
      `Yourself: Ms Phương (notary, west end) → 10 pages, ${vnd(1_500_000)}, ~4 hours. Or 💼 Mai’s office: ${vnd(2_000_000)}, ready tomorrow.`,
      `Selbst: Frau Phương (Notariat) → 10 Seiten, ${vnd(1_500_000)}, ~4 Std. Oder 💼 Mais Büro: ${vnd(2_000_000)}, morgen fertig.`,
    ),
    blockers: [
      { when: { not: { test: 'visa.originals' } }, hint: L('Chưa có bản gốc: về nhà lấy trong tủ giấy tờ trước đã.', 'No originals yet: fetch them from the paper cabinet at home first.', 'Erst die Originale von zu Hause holen.'), target: PAPERS },
      { when: { test: 'visa.notaryOffice' }, hint: L('Văn phòng chị Mai đang dịch, mai có.', 'Mai’s office is translating — ready tomorrow.', 'Mais Büro übersetzt — morgen fertig.'), target: HOME_BED },
      vnOfficeClosed,
      needMoney(1_500_000, L('dịch thuật công chứng', 'translation and notary', 'Übersetzung und Beglaubigung')),
    ],
  },
  'visa.criminal': {
    targets: [{ target: PASSPORT }],
    hint: L(
      `Hồ sơ visa → Lý lịch tư pháp: tự xếp hàng ở Sở Tư pháp buổi sáng (thứ Hai–Sáu, trước 11h, ${vnd(200_000)}) hoặc 💼 văn phòng chị Mai (${vnd(500_000)}).`,
      `Visa file → Criminal record: queue at the Justice Department in the morning (Mon–Fri, before 11:00, ${vnd(200_000)}) or 💼 Mai’s office (${vnd(500_000)}).`,
      `Visa-Mappe → Führungszeugnis: morgens anstehen (Mo–Fr vor 11 Uhr) oder 💼 Mais Büro.`,
    ),
  },
  'visa.health': {
    targets: [{ target: PASSPORT }],
    hint: L(
      `Hồ sơ visa → Khám sức khỏe ở phòng khám Hàng Bông buổi sáng (thứ Hai–Sáu, trước 11h, ${vnd(600_000)}) hoặc 💼 văn phòng chị Mai (${vnd(800_000)}).`,
      `Visa file → Health check at the Hàng Bông clinic in the morning (Mon–Fri, before 11:00, ${vnd(600_000)}) or 💼 Mai’s office (${vnd(800_000)}).`,
      `Visa-Mappe → Gesundheitszeugnis morgens (Mo–Fr vor 11 Uhr) oder 💼 Mais Büro.`,
    ),
  },
  'visa.writing': {
    targets: [{ if: { test: 'visa.cvToWrite' }, target: HOME_DESK }, { target: PASSPORT }],
    hint: L(
      `Bàn học ở nhà → Viết CV + thư động lực (ghép câu tiếng Đức, +XP). Hoặc 💼 nhờ văn phòng viết (${vnd(800_000)}) — nhưng lãnh sự sẽ hỏi „Haben Sie diesen Brief selbst geschrieben?"`,
      `Home desk → Write CV + motivation letter (German sentences, +XP). Or 💼 the office writes it (${vnd(800_000)}) — but the consul will ask whether you wrote it yourself.`,
      `Schreibtisch → Lebenslauf + Motivationsschreiben (+XP). Oder 💼 vom Büro (${vnd(800_000)}) — dann fragt die Botschaft nach.`,
    ),
  },
  'visa.insurance': {
    targets: [{ target: PASSPORT }],
    hint: L(`Hồ sơ visa → Mua bảo hiểm (Ausbildung ${vnd(700_000)}, Studium ${vnd(3_000_000)}).`, `Visa file → Buy insurance (Ausbildung ${vnd(700_000)}, Studium ${vnd(3_000_000)}).`, `Visa-Mappe → Versicherung kaufen.`),
  },
  'visa.aps': {
    targets: [{ target: APS }],
    hint: L(
      `Văn phòng APS (phố Tràng Tiền, đại lộ phía bắc, gần Bưu điện) → Frau Schneider → Nộp hồ sơ (${vnd(3_600_000)}). Phỏng vấn chỉ có vào ngày có đợt (2 tuần một đợt) — trả lời bằng tiếng Đức về các môn lớp 12.`,
      `APS office (west end) → Ms Schneider → Hand in the file (${vnd(3_600_000)}). Interviews only on round days (every 2 weeks) — in German, about your year-12 subjects.`,
      `APS-Büro → Frau Schneider → Unterlagen (${vnd(3_600_000)}). Interviews nur an Rundentagen (alle 2 Wochen).`,
    ),
    blockers: [
      { when: { all: [{ test: 'visa.apsPaid' }, { not: { test: 'visa.apsRoundToday' } }] }, hint: L('Hồ sơ APS đã nộp. Chờ đến ngày có đợt phỏng vấn (hỏi Frau Schneider), trong lúc đó làm giấy tờ khác.', 'APS file handed in. Wait for the interview round (ask Ms Schneider) — do other papers meanwhile.', 'APS abgegeben. Auf die Interviewrunde warten.'), target: PASSPORT },
      vnOfficeClosed,
      { when: { all: [{ not: { test: 'visa.apsPaid' } }, { not: { money: 3_600_000 } }, { country: 'vn' }] }, hint: L(`Cần ${vnd(3_600_000)} phí APS. Đi làm thêm hoặc vay bố mẹ.`, `You need ${vnd(3_600_000)} for APS. Work or borrow from your parents.`, `Du brauchst ${vnd(3_600_000)} für APS.`), target: CAFE },
    ],
  },
  'visa.admission': {
    targets: [{ target: PASSPORT }],
    hint: L(`Hồ sơ visa → Nộp đơn Studienkolleg qua uni-assist (75 € ≈ ${vnd(2_400_000)}), thư mời về sau 2 ngày.`, `Visa file → Apply to a Studienkolleg via uni-assist (€75 ≈ ${vnd(2_400_000)}); the letter comes 2 days later.`, `Visa-Mappe → uni-assist (75 €); Zulassung nach 2 Tagen.`),
    blockers: [{ when: { test: 'visa.admissionSent' }, hint: L('Đã nộp uni-assist, chờ thư mời (2 ngày).', 'Applied — waiting for the letter (2 days).', 'Beworben — warte 2 Tage.'), target: HOME_BED }],
  },
  'visa.sperr': {
    targets: [{ target: { scene: 'home', npc: 'bo' } }],
    hint: L('Sperrkonto 11.904 €: họp gia đình với Bố buổi tối (thế chấp sổ đỏ, nhờ cô Lan, hoặc đổi sang Ausbildung).', 'Blocked account €11,904: family meeting with Dad in the evening (mortgage, cô Lan, or switch to Ausbildung).', 'Sperrkonto: Familienrat mit Papa am Abend.'),
  },
  'visa.contract': {
    targets: [{ target: PASSPORT }],
    hint: L('Hồ sơ visa → Gửi hồ sơ xin học nghề; hợp đồng Sonnenhof về sau 1 ngày. (Cầu nối: có sẵn.)', 'Visa file → Send applications; the Sonnenhof contract comes a day later. (Bridge programme: already done.)', 'Visa-Mappe → Bewerbungen; Vertrag nach 1 Tag.'),
    blockers: [{ when: { test: 'visa.contractSent' }, hint: L('Đã gửi hồ sơ, chờ hợp đồng (1 ngày).', 'Sent — waiting for the contract (1 day).', 'Gesendet — warte 1 Tag.'), target: HOME_BED }],
  },
  'visa.ba': {
    targets: [{ target: HOME_BED }],
    hint: L('Cơ quan Lao động Đức (BA) xét hợp đồng, tự động đồng ý sau 2 ngày. Trong lúc đó làm giấy tờ khác.', 'The German employment agency (BA) checks the contract — automatic approval after 2 days. Do other papers meanwhile.', 'Die BA prüft den Vertrag — nach 2 Tagen automatisch.'),
  },
  'visa.portal': {
    targets: [{ if: { test: 'visa.portalToFill' }, target: HOME_DESK }, { target: PASSPORT }],
    hint: L(
      `Laptop ở bàn học → Điền đơn Auslandsportal (8 ô, chép đúng từ hộ chiếu — cẩn thận Họ và Tên!). Hoặc 💼 văn phòng điền hộ (${vnd(500_000)}).`,
      `Laptop at the home desk → Fill in the Auslandsportal form (8 fields, copy the passport exactly — mind surname vs given name!). Or 💼 the office does it (${vnd(500_000)}).`,
      `Laptop → Auslandsportal ausfüllen (8 Felder — Vor- und Nachname!). Oder 💼 das Büro (${vnd(500_000)}).`,
    ),
  },
  'visa.termin': {
    targets: [{ target: PASSPORT }],
    hint: L(
      `Hồ sơ visa → Săn lịch VFS (miễn phí, ô trống hiện lên thì bấm thật nhanh!). Hoặc 💼 nhờ Tuấn săn hộ (${vnd(500_000)}, có lịch sau 2–4 ngày). Ai rao BÁN lịch là lừa đảo!`,
      `Visa file → Hunt a VFS slot (free — tap fast when one appears!). Or 💼 Tuấn hunts it (${vnd(500_000)}, 2–4 days). Anyone SELLING slots is a scammer!`,
      `Visa-Mappe → VFS-Termin jagen (kostenlos). Oder 💼 Tuấn sucht (${vnd(500_000)}). Wer Termine VERKAUFT, betrügt!`,
    ),
    blockers: [{ when: { test: 'visa.officeTermin' }, hint: L('Tuấn đang săn lịch hộ, đủ giấy tờ là có lịch sau 2–4 ngày.', 'Tuấn is hunting your slot — 2–4 days once your papers are complete.', 'Tuấn sucht einen Termin.'), target: PASSPORT }],
  },
  'visa.submit': {
    targets: [{ if: { scene: 'embassy' }, target: { scene: 'embassy', npc: 'vfsClerk' } }, { target: { scene: 'vietnam', npc: 'anhTu' } }],
    hint: L(
      `Đúng ngày hẹn ({termin}): Anh Tú xe ôm → Đại sứ quán / VFS → quầy VFS: nộp hồ sơ, lấy vân tay, đóng phí visa 75 € (${vnd(2_400_000)}) + phí VFS ${vnd(700_000)}.`,
      `On the day ({termin}): Tú (xe ôm) → embassy / VFS → VFS window: hand in, fingerprints, visa fee €75 (${vnd(2_400_000)}) + VFS fee ${vnd(700_000)}.`,
      `Am Termintag ({termin}): Tú → Botschaft / VFS → VFS-Schalter: abgeben, Fingerabdrücke, 75 € + VFS-Gebühr.`,
    ),
    blockers: [
      { when: { test: 'visa.terminLater' }, hint: L('Lịch hẹn của bạn là {termin}. Bấm đồng hồ hoặc ngủ đến hôm đó.', 'Your appointment is on {termin}. Wait or sleep until then.', 'Dein Termin ist am {termin}.'), target: HOME_BED },
      { when: { all: [{ test: 'visa.terminToday' }, { not: { test: 'visa.embassyOpen' } }, { not: { scene: 'embassy' } }] }, hint: L('VFS mở 8–17h. Bấm đồng hồ để chờ.', 'VFS is open 8:00–17:00. Tap the clock.', 'VFS 8–17 Uhr.'), target: CLOCK },
      { when: { not: { flag: 'visa.terminDay', atLeast: 1 } }, hint: L('Chưa có lịch hẹn (hoặc bị trả hồ sơ). Mở Hồ sơ visa → săn lịch lại.', 'No appointment (or your file was sent back). Open the visa file → hunt again.', 'Kein Termin. Visa-Mappe → neu jagen.'), target: PASSPORT },
      needMoney(3_100_000, L('phí visa và phí VFS', 'the visa and VFS fees', 'Visum- und VFS-Gebühr')),
    ],
  },
  'visa.interview': {
    targets: [{ target: { scene: 'embassy', npc: 'officer' } }],
    hint: L('Nộp ở quầy VFS xong thì sang quầy bà Lehmann → phỏng vấn (5 câu, cần 60%).', 'After the VFS window, go to Ms Lehmann’s window → interview (5 questions, 60% to pass).', 'Nach dem VFS-Schalter zu Frau Lehmann → Interview.'),
    blockers: [
      { when: { test: 'visa.canRemonstrate' }, hint: L('Bị từ chối: mở Hồ sơ visa → Viết đơn khiếu nại (Remonstration) trong 7 ngày, hoặc săn lịch nộp lại.', 'Rejected: open the visa file → write a Remonstration within 7 days, or hunt a new slot.', 'Abgelehnt: Remonstration schreiben oder neu beantragen.'), target: PASSPORT },
      { when: { not: { flag: 'visa.terminDay', atLeast: 1 } }, hint: L('Chưa có lịch hẹn. Mở Hồ sơ visa → săn lịch.', 'No appointment. Open the visa file → hunt a slot.', 'Kein Termin. Visa-Mappe → Termin jagen.'), target: PASSPORT },
      { when: { test: 'visa.terminLater' }, hint: L('Lịch hẹn của bạn là {termin}.', 'Your appointment is on {termin}.', 'Dein Termin ist am {termin}.'), target: HOME_BED },
    ],
  },
  'dep.visa': {
    targets: [{ target: HOME_BED }],
    hint: L(
      'Visa đang được xử lý, có kết quả ngày {ready} (3 ngày). Trong lúc đó đi làm, đổi Euro, chào bạn bè.',
      'Your visa is being processed; ready on {ready} (3 days). Meanwhile: work, change euros, say goodbye.',
      'Dein Visum wird bearbeitet, fertig am {ready}.',
    ),
  },
  'dep.flight': {
    targets: [{ if: { test: 'visa.ready' }, target: MAI }, { target: PASSPORT }],
    hint: L(
      `Vé máy bay: văn phòng chị Mai (${vnd(17_000_000)}, có người dẫn ra sân bay) hoặc tự đặt trên laptop ở nhà (giá đổi theo ngày, 15–20 triệu). Ký Cầu nối thì Sonnenhof gửi vé miễn phí.`,
      `Flight: Mai’s office (${vnd(17_000_000)}, someone takes you to the airport) or book it yourself on the home laptop (price changes daily, 15–20 million). With the bridge programme Sonnenhof sends it free.`,
      `Flug: Mais Büro (${vnd(17_000_000)}) oder selbst am Laptop (15–20 Mio.). Brückenprogramm: gratis.`,
    ),
    blockers: [maiClosed],
  },
  'dep.exchange': {
    targets: [{ target: BANK }],
    hint: L(
      'Ngân hàng Phố Cổ (cuối phố phía tây) → anh Quân → Mua Euro (1 € = 31.500đ). Lương đầu tiên cuối tuần đầu mới về: tuần đầu cần khoảng 600 €.',
      'Old Quarter bank (west end) → Quân → Buy euros (€1 = 31,500đ). Your first pay comes at the end of the first week: you need about €600.',
      'Bank am Westende → Herr Quân → Euro kaufen (1 € = 31.500đ). Für die erste Woche ~600 €.',
    ),
    blockers: [vnOfficeClosed],
  },
  'dep.airport': {
    targets: [{ if: { scene: 'airport' }, target: { scene: 'airport', npc: 'me' } }, { target: { scene: 'vietnam', npc: 'anhTu' } }],
    hint: L(
      'Nói chuyện với Anh Tú xe ôm → Sân bay Nội Bài. Chào Mẹ, Bố và Na rồi ra cửa lên máy bay (Gate 7).',
      'Talk to Tú → Nội Bài Airport. Say goodbye to Mum, Dad and Na, then go to Gate 7.',
      'Sprich mit Tú → Flughafen Nội Bài. Verabschiede dich und geh zu Gate 7.',
    ),
  },

  // Chapter 3 — arriving in Germany
  'arr.wg': {
    targets: [{ target: { scene: 'wg', npc: 'lena' } }],
    hint: L(
      'Vào Lindenstraße 12 (cửa bên trái phố) → nói chuyện với Lena → WG-Casting. Trả lời thân thiện, gọn gàng là được nhận!',
      'Go into Lindenstraße 12 (left side of the street) → talk to Lena → WG casting. Be friendly and tidy!',
      'Geh in die Lindenstraße 12 → sprich mit Lena → WG-Casting. Sei freundlich und ordentlich!',
    ),
    blockers: [
      {
        when: { test: 'de.castedToday' },
        hint: L(
          'Hôm nay đã xem phòng rồi. Ngủ một đêm ở hostel (cửa nhà WG) rồi mai thử lại.',
          'You already had a viewing today. Spend a night at the hostel (WG door) and try again tomorrow.',
          'Heute schon besichtigt. Übernachte im Hostel (WG-Tür) und versuch es morgen.',
        ),
        target: { scene: 'germany', spot: 'de-wg' },
      },
    ],
  },
  'arr.anmeldung': {
    targets: [
      { if: { all: [{ test: 'de.amtTerminToday' }, { not: { test: 'de.numberCalled' } }] }, target: { scene: 'buergeramt', spot: 'ticket-machine' } },
      { target: { scene: 'buergeramt', npc: 'clerk' } },
    ],
    hint: L(
      'Vào Bürgeramt → ông Becker → Đặt Termin. Đúng ngày hẹn: lấy số ở máy, chờ được gọi, rồi điền tờ khai Anmeldung với ông Becker.',
      'Bürgeramt → Mr Becker → book a Termin. On that day: take a number at the machine, wait, then fill in the form with Mr Becker.',
      'Bürgeramt → Herr Becker → Termin buchen. Am Termin-Tag: Nummer ziehen, warten, dann das Formular ausfüllen.',
    ),
    blockers: [
      {
        when: { test: 'de.amtTerminLater' },
        hint: L(
          'Termin ở Bürgeramt là {amtTermin}. Bấm đồng hồ để chờ hoặc về phòng ngủ đến hôm đó.',
          'Your Bürgeramt Termin is on {amtTermin}. Wait or sleep until then.',
          'Dein Bürgeramt-Termin ist am {amtTermin}. Warte oder schlaf bis dahin.',
        ),
        target: CLOCK,
      },
      {
        when: { all: [{ not: { test: 'de.officeOpen' } }, { not: { scene: 'buergeramt' } }] },
        hint: L(
          'Bürgeramt chỉ mở thứ Hai–Sáu, 8–16h. Bấm đồng hồ để chờ.',
          'The Bürgeramt is open Mon–Fri, 8:00–16:00. Tap the clock to wait.',
          'Das Bürgeramt hat Mo–Fr 8–16 Uhr geöffnet. Tippe auf die Uhr.',
        ),
        target: CLOCK,
      },
    ],
  },
  'arr.bank': {
    targets: [{ target: { scene: 'germany', npc: 'wagner' } }],
    hint: L(
      'Sparbank ở cuối phố bên phải: nói chuyện với bà Wagner → Mở tài khoản.',
      'Sparbank is at the far right end of the street: talk to Ms Wagner → Open an account.',
      'Die Sparbank ist rechts am Ende der Straße: Frau Wagner → Konto eröffnen.',
    ),
  },
  'arr.insurance': {
    targets: [{ target: { scene: 'wg', spot: 'wg-laptop' } }],
    hint: L(
      'Về phòng WG → bàn có laptop → Bảo hiểm.',
      'Back to your WG room → the laptop desk → Insurance.',
      'Zurück in die WG → Laptop → Versicherung.',
    ),
  },

  // Chapter 4 — the first workday
  'fd.ticket': {
    targets: [{ target: { scene: 'germany', spot: 'de-tram' } }],
    hint: L(
      `Ra trạm tram giữa phố → Mua vé tuần (${CONFIG.germany.ticketPerWeek} €). Đi tàu không vé có thể bị phạt!`,
      `Go to the tram stop mid-street → Weekly ticket (${CONFIG.germany.ticketPerWeek} €). Riding without one can get you fined!`,
      `Zur Haltestelle → Wochenticket (${CONFIG.germany.ticketPerWeek} €). Schwarzfahren kostet Strafe!`,
    ),
  },
  'fd.anna': {
    targets: [{ target: { scene: 'careHome', npc: 'anna' } }],
    hint: L(
      'Ở trạm tram → Đi làm. Tới viện dưỡng lão Sonnenhof, nói chuyện với chị Anna.',
      'At the tram stop → Tram to work. At the Sonnenhof care home, talk to Anna.',
      'Haltestelle → Zur Arbeit. Im Pflegeheim Sonnenhof mit Anna sprechen.',
    ),
  },
  'fd.shift': {
    targets: [{ target: { scene: 'careHome', npc: 'anna' } }],
    hint: L(
      'Nói chuyện với chị Anna → Bắt đầu ca. Nhìn biểu tượng trên đầu các cụ, lại gần và bấm đúng việc trước khi vòng chờ hết.',
      'Talk to Anna → Start the shift. Watch the icons above the residents, walk over and tap the right care before the ring runs out.',
      'Anna → Schicht beginnen. Achte auf die Symbole über den Bewohnern und hilf rechtzeitig.',
    ),
    blockers: SHIFT_BLOCKERS,
  },

  // Chapter 4 — training and exams
  'tr.school': {
    targets: [{ target: ANNA }],
    hint: L(
      'Ở viện dưỡng lão → chị Anna → Học lý thuyết (Berufsschule). Mỗi ngày học được một buổi.',
      'At the care home → Anna → Study theory (Berufsschule). One lesson per day.',
      'Im Pflegeheim → Anna → Berufsschule. Ein Tag pro Tag.',
    ),
    blockers: [schoolDoneToday],
  },
  'tr.shifts': {
    targets: [{ target: ANNA }],
    hint: L('Chị Anna → Bắt đầu ca. Mỗi ngày một ca.', 'Anna → Start the shift. One shift per day.', 'Anna → Schicht beginnen. Eine pro Tag.'),
    blockers: SHIFT_BLOCKERS,
  },
  'tr.zwischen': {
    targets: [{ target: ANNA }],
    hint: L(
      'Chị Anna → Thi giữa khóa. Câu hỏi về vệ sinh, uống nước, phòng loét, ghi chép, giữ bí mật, xử lý té ngã.',
      'Anna → Mid-term exam. Questions on hygiene, drinking, pressure sores, records, confidentiality and falls.',
      'Anna → Zwischenprüfung. Fragen zu Hygiene, Trinken, Dekubitus, Dokumentation, Schweigepflicht, Stürzen.',
    ),
    blockers: [triedToday('care.zwischenToday')],
  },
  'ex.school': {
    targets: [{ target: ANNA }],
    hint: L(`Tiếp tục học Berufsschule với chị Anna (cần ${car.final.school} buổi).`, `Keep attending Berufsschule with Anna (${car.final.school} in total).`, `Weiter Berufsschule bei Anna (${car.final.school} insgesamt).`),
    blockers: [schoolDoneToday],
  },
  'ex.shifts': {
    targets: [{ target: ANNA }],
    hint: L(`Làm thêm ca chăm sóc (tổng ${car.final.shifts} ca).`, `Work more care shifts (${car.final.shifts} in total).`, `Mehr Schichten (${car.final.shifts} insgesamt).`),
    blockers: SHIFT_BLOCKERS,
  },
  'ex.final': {
    targets: [{ target: ANNA }],
    hint: L(
      'Chị Anna → Thi tốt nghiệp. Bình tĩnh, chọn câu trả lời quan tâm đến người bệnh và làm việc nhóm.',
      'Anna → Final exam. Stay calm and pick the answers that care for the resident and the team.',
      'Anna → Abschlussprüfung. Ruhig bleiben, an Bewohner und Team denken.',
    ),
    blockers: [triedToday('care.finalToday')],
  },

  // Chapter 4A — university
  'uni.enroll': {
    targets: [{ target: { scene: 'university', spot: 'uni-office' } }],
    hint: L(
      `Ra trạm tram → Đi tram tới đại học. Vào phòng đào tạo (bên phải) → Nhập học (${uni.semesterFee} €, gồm vé tàu cả học kỳ).`,
      `Tram stop → Tram to the university. Student office (on the right) → Enrol (${uni.semesterFee} €, includes a semester transit pass).`,
      `Haltestelle → Zur Uni. Studierendensekretariat (rechts) → Immatrikulation (${uni.semesterFee} €, inkl. Semesterticket).`,
    ),
    blockers: [
      {
        when: { noFlag: 'de.insurance' },
        hint: L('Cần bảo hiểm y tế để nhập học. Về phòng WG → laptop → Bảo hiểm.', 'You need health insurance to enrol. WG room → laptop → Insurance.', 'Für die Immatrikulation brauchst du eine Krankenversicherung: WG → Laptop.'),
        target: { scene: 'wg', spot: 'wg-laptop' },
      },
      uniClosed,
    ],
  },
  'uni.first': {
    targets: [{ target: PROF }],
    hint: L('GS. Schulz ở bục giảng → Nghe bài giảng. Trả lời 3 câu hỏi về điều dưỡng.', 'Prof. Schulz at the lectern → Attend the lecture. Answer three questions.', 'Prof. Schulz am Pult → Vorlesung. Drei Fragen beantworten.'),
    blockers: [uniClosed],
  },
  'uni.job': {
    targets: [{ target: ANNA }],
    hint: L('Werkstudent: đi tram tới viện dưỡng lão Sonnenhof → chị Anna → Bắt đầu ca. Lương trả tiền nhà và tiền ăn.', 'Werkstudent: tram to the Sonnenhof care home → Anna → Start the shift. The pay covers rent and food.', 'Werkstudent: Tram zum Pflegeheim → Anna → Schicht beginnen.'),
    blockers: SHIFT_BLOCKERS,
  },
  'uni.lectures': {
    targets: [{ target: PROF }],
    hint: L('Mỗi ngày (thứ Hai–Sáu) nghe một buổi giảng.', 'One lecture per weekday.', 'Eine Vorlesung pro Werktag.'),
    blockers: [triedToday('uni.lectureToday'), uniClosed],
  },
  'uni.group': {
    targets: [{ target: { scene: 'university', spot: 'uni-library' } }],
    hint: L('Thư viện (góc trái) → Học nhóm với Kenji: ghép câu tiếng Đức.', 'Library (left corner) → Group work with Kenji: build German sentences.', 'Bibliothek (links) → Gruppenarbeit mit Kenji.'),
    blockers: [triedToday('uni.groupToday'), uniClosed],
  },
  'uni.klausur': {
    targets: [{ target: PROF }],
    hint: L('GS. Schulz → Thi học kỳ (Klausur): chăm sóc kích hoạt, phòng té ngã, BMI, chăm sóc giảm nhẹ, trích dẫn nguồn.', 'Prof. Schulz → Klausur: activating care, fall prevention, BMI, palliative care, citing sources.', 'Prof. Schulz → Klausur: aktivierende Pflege, Sturzprophylaxe, BMI, Palliativpflege, Zitieren.'),
    blockers: [triedToday('uni.klausurToday'), uniClosed],
  },
  'uni.lectures2': {
    targets: [{ target: PROF }],
    hint: L(`Tiếp tục nghe giảng (tổng ${uni.thesis.lectures} buổi).`, `Keep attending lectures (${uni.thesis.lectures} in total).`, `Weiter Vorlesungen (${uni.thesis.lectures} insgesamt).`),
    blockers: [triedToday('uni.lectureToday'), uniClosed],
  },
  'uni.shifts': {
    targets: [{ target: ANNA }],
    hint: L(`Làm thêm ca Werkstudent ở Sonnenhof (tổng ${uni.thesis.shifts} ca).`, `Work more Werkstudent shifts (${uni.thesis.shifts} in total).`, `Mehr Werkstudent-Schichten (${uni.thesis.shifts} insgesamt).`),
    blockers: SHIFT_BLOCKERS,
  },
  'uni.thesis': {
    targets: [{ target: PROF }],
    hint: L('GS. Schulz → Bảo vệ luận văn: nói rõ đề tài, phương pháp, kết quả và cách áp dụng ở Sonnenhof.', 'Prof. Schulz → Thesis defence: topic, method, findings and how you’ll use them at Sonnenhof.', 'Prof. Schulz → Verteidigung: Thema, Methode, Ergebnis, Praxis.'),
    blockers: [triedToday('uni.thesisToday'), uniClosed],
  },

  // Chapter 5 — a new life
  'c5.contract': {
    targets: [{ target: ANNA }],
    hint: L(
      'Chị Anna → Phỏng vấn với ông Vogel. Trả lời lịch sự, linh hoạt, có hỏi lại về đào tạo thêm.',
      'Anna → Interview with Mr Vogel. Be polite and flexible, and ask about further training.',
      'Anna → Gespräch mit Herrn Vogel. Höflich, flexibel, nach Weiterbildung fragen.',
    ),
    blockers: [triedToday('job.interviewToday')],
  },
  'c5.proShifts': {
    targets: [{ target: ANNA }],
    hint: L(`Làm ca với lương mới (×${car.proPayMultiplier}). Để dành tiền cho chuyến về quê ăn Tết!`, `Work shifts on the new pay (×${car.proPayMultiplier}). Save up for the trip home!`, `Schichten mit neuem Lohn (×${car.proPayMultiplier}). Spar für die Heimreise!`),
    blockers: SHIFT_BLOCKERS,
  },
  'tet.ticket': {
    targets: [{ target: { scene: 'wg', spot: 'wg-laptop' } }],
    hint: L(`Về phòng → laptop → Đặt vé về Hà Nội ăn Tết (${car.tripCost} €).`, `Back home → laptop → Book a flight home for Tết (${car.tripCost} €).`, `Zuhause → Laptop → Heimflug zum Tết (${car.tripCost} €).`),
    blockers: [needEur(car.tripCost, L('vé máy bay', 'the flight', 'den Flug'))],
  },
  'tet.family': {
    targets: [{ target: { scene: 'home', npc: 'bo' } }],
    hint: L('Về tới nhà rồi! Nói chuyện với Bố để chúc Tết. Đừng quên lì xì em gái và ăn cơm mẹ nấu.', 'You’re home! Talk to Dad to wish him a happy Tết. Don’t forget lucky money for your sister.', 'Zuhause! Sprich mit Papa und wünsch ein frohes Tết.'),
  },
  'tet.back': {
    targets: [{ target: { scene: 'home', spot: 'home-exit' } }],
    hint: L('Ra cửa → Ra sân bay, bay về Đức.', 'At the door → To the airport, fly back to Germany.', 'Zur Tür → Zum Flughafen, zurück nach Deutschland.'),
  },
  'home.save': {
    targets: [{ target: ANNA }],
    hint: L(`Để dành ${car.flatDeposit} € tiền đặt cọc: làm ca, nhặt Pfand, bớt ăn ngoài.`, `Save ${car.flatDeposit} € for the deposit: work shifts, collect Pfand, eat out less.`, `Spar ${car.flatDeposit} € Kaution: Schichten, Pfand, weniger auswärts essen.`),
    blockers: SHIFT_BLOCKERS,
  },
  'home.flat': {
    targets: [{ target: { scene: 'germany', spot: 'de-wg' } }],
    hint: L(`Ra cửa Lindenstraße 12 → Thuê căn hộ riêng (đặt cọc ${car.flatDeposit} €, ${car.flatRentPerWeek} €/tuần).`, `At the Lindenstraße 12 door → Rent your own flat (deposit ${car.flatDeposit} €, ${car.flatRentPerWeek} €/week).`, `An der Tür Lindenstraße 12 → Eigene Wohnung mieten (Kaution ${car.flatDeposit} €).`),
    blockers: [needEur(car.flatDeposit, L('tiền đặt cọc', 'the deposit', 'die Kaution'))],
  },
  'pr.rent': {
    targets: [{ target: CLOCK }],
    hint: L(`Tiền nhà được trừ mỗi sáng thứ Hai. Cần đủ ${car.residence.rentWeeks} tuần — cứ làm việc và sống bình thường nhé.`, `Rent is paid every Monday morning. You need ${car.residence.rentWeeks} weeks — just keep working and living.`, `Die Miete geht jeden Montag ab. ${car.residence.rentWeeks} Wochen nötig — einfach weiterleben.`),
  },
  'pr.lid': {
    targets: [{ target: CLERK }],
    hint: L(
      'Bürgeramt → ông Becker → Thi „Leben in Deutschland“: 16 bang, cờ đen-đỏ-vàng, Điều 1 Hiến pháp, bức tường Berlin 1989, bầu cử 4 năm/lần từ 18 tuổi.',
      'Bürgeramt → Mr Becker → “Life in Germany” test: 16 states, black-red-gold, Article 1, the Wall fell in 1989, elections every 4 years from 18.',
      'Bürgeramt → Herr Becker → „Leben in Deutschland“: 16 Länder, Schwarz-Rot-Gold, Artikel 1, Mauerfall 1989, Wahl alle 4 Jahre ab 18.',
    ),
    blockers: [officeClosed, triedToday('pr.lidToday')],
  },
  'pr.apply': {
    targets: [{ target: CLERK }],
    hint: L('Bürgeramt → ông Becker → Nộp hồ sơ định cư.', 'Bürgeramt → Mr Becker → Apply for permanent residence.', 'Bürgeramt → Herr Becker → Niederlassungserlaubnis beantragen.'),
    blockers: [officeClosed],
  },
}

/**
 * Doors between scenes: how to get from `from` to `to`, and what to walk to in `from`.
 * The guide finds a path through this graph (route() in game/systems/guide.ts).
 */
export const SCENE_LINKS: { from: SceneId; to: SceneId; via: GuidePoint; label: Localized }[] = [
  { from: 'vietnam', to: 'home', via: { spot: 'home' }, label: L('Vào nhà', 'Go home', 'Nach Hause') },
  { from: 'vietnam', to: 'maiOffice', via: { spot: 'mai-door' }, label: L('Lên Văn phòng Mai Anh', 'Up to the Mai Anh office', 'Hoch ins Büro Mai Anh') },
  { from: 'maiOffice', to: 'vietnam', via: { spot: 'mai-exit' }, label: L('Ra phố', 'Out to the street', 'Auf die Straße') },
  { from: 'home', to: 'vietnam', via: { spot: 'home-exit' }, label: L('Ra phố', 'Out to the street', 'Auf die Straße') },
  // 1.42 the back yard
  { from: 'home', to: 'homeYard', via: { spot: 'home-backdoor' }, label: L('Ra vườn sau', 'Out to the yard', 'In den Hof') },
  { from: 'homeYard', to: 'home', via: { spot: 'yard-door' }, label: L('Vào nhà', 'Back inside', 'Ins Haus') },
  { from: 'vietnam', to: 'classroom', via: { spot: 'center-door' }, label: L('Vào Trung tâm Đức ngữ', 'Into the German centre', 'Ins Sprachzentrum') },
  { from: 'classroom', to: 'vietnam', via: { spot: 'class-exit' }, label: L('Ra phố', 'Out to the street', 'Auf die Straße') },
  { from: 'examHall', to: 'classroom', via: { spot: 'exam-exit' }, label: L('Về lớp', 'Back to class', 'Zurück zum Kurs') },
  { from: 'vietnam', to: 'embassy', via: { npc: 'anhTu' }, label: L('Đi xe ôm Anh Tú', 'Ride with Tú (xe ôm)', 'Mit Tú (Motorradtaxi)') },
  { from: 'embassy', to: 'vietnam', via: { spot: 'embassy-exit' }, label: L('Về nhà bằng xe ôm', 'Ride home', 'Nach Hause fahren') },
  { from: 'vietnam', to: 'airport', via: { npc: 'anhTu' }, label: L('Đi xe ôm Anh Tú', 'Ride with Tú (xe ôm)', 'Mit Tú (Motorradtaxi)') },
  { from: 'airport', to: 'vietnam', via: { spot: 'airport-exit' }, label: L('Về nhà', 'Go back home', 'Zurück nach Hause') },
  { from: 'airport', to: 'germany', via: { spot: 'gate' }, label: L('Lên máy bay', 'Board the plane', 'Einsteigen') },
  { from: 'germany', to: 'wg', via: { spot: 'de-wg' }, label: L('Vào Lindenstraße 12', 'Into Lindenstraße 12', 'In die Lindenstraße 12') },
  { from: 'wg', to: 'germany', via: { spot: 'wg-exit' }, label: L('Ra phố', 'Out to the street', 'Auf die Straße') },
  { from: 'germany', to: 'buergeramt', via: { spot: 'de-amt' }, label: L('Vào Bürgeramt', 'Into the Bürgeramt', 'Ins Bürgeramt') },
  { from: 'buergeramt', to: 'germany', via: { spot: 'buergeramt-exit' }, label: L('Ra phố', 'Out to the street', 'Auf die Straße') },
  { from: 'germany', to: 'careHome', via: { spot: 'de-tram' }, label: L('Đi tram tới chỗ làm', 'Tram to work', 'Mit der Tram zur Arbeit') },
  { from: 'careHome', to: 'germany', via: { spot: 'care-exit' }, label: L('Đi tram về', 'Tram home', 'Mit der Tram zurück') },
  { from: 'germany', to: 'university', via: { spot: 'de-tram' }, label: L('Đi tram tới đại học', 'Tram to the university', 'Mit der Tram zur Uni') },
  { from: 'university', to: 'germany', via: { spot: 'uni-exit' }, label: L('Đi tram về', 'Tram home', 'Mit der Tram zurück') },
  // Chapter 5: the Tết trip (book on the WG laptop, fly back from home)
  { from: 'wg', to: 'home', via: { spot: 'wg-laptop' }, label: L('Đặt vé về Hà Nội', 'Book a flight home', 'Heimflug buchen') },
  { from: 'home', to: 'germany', via: { spot: 'home-exit' }, label: L('Bay về Đức', 'Fly back to Germany', 'Zurück nach Deutschland') },
  // 1.41 every shop room: its street door and the mat inside
  ...SHOP_ROOM_LIST.flatMap((r) => [
    { from: 'vietnam' as SceneId, to: shopScene(r.id) as SceneId, via: { spot: shopDoorSpot(r.id) }, label: L(`Vào ${r.name.vi}`, `Into ${r.name.en}`, `Hinein: ${r.name.en}`) },
    { from: shopScene(r.id) as SceneId, to: 'vietnam' as SceneId, via: { spot: 'shop-exit' }, label: L('Ra phố', 'Out to the street', 'Auf die Straße') },
  ]),
]

/** Onboarding target: the first friendly face near the spawn. */
export const ONBOARDING_NPC: GuideTarget = { scene: 'vietnam', npc: 'baSau' }
