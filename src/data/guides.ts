import type { Localized } from '../i18n/localized'
import { formatMoney } from '../i18n/format'
import type { SceneId } from '../store/worldStore'
import type { Condition } from './conditions'
import { CONFIG } from './config'

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
const MAI: GuideTarget = { scene: 'vietnam', npc: 'chiMai' }
const CAFE: GuideTarget = { scene: 'vietnam', spot: 'cafe-counter' }
const HOME_BED: GuideTarget = { scene: 'home', spot: 'home-bed' }
const HOME_DESK: GuideTarget = { scene: 'home', spot: 'home-desk' }
const PASSPORT: GuideTarget = { ui: 'passport' }
const CLOCK: GuideTarget = { ui: 'clock' }

// --- Reusable blockers -------------------------------------------------------------------
const needMoney = (amount: number, what: Localized): GuideBlocker => ({
  when: { all: [{ country: 'vn' }, { not: { money: amount } }] },
  hint: {
    vi: `Cần ${vnd(amount)} cho ${what.vi}. Làm ca ở quán Cà phê Phố Cổ (đầu phố) để kiếm thêm tiền.`,
    en: `You need ${vnd(amount)} for ${what.en}. Work a shift at the Old Quarter café (top of the street) to earn more.`,
    de: `Du brauchst ${vnd(amount)} für ${what.de ?? what.en}. Arbeite eine Schicht im Altstadt-Café (Straßenanfang).`,
  },
  target: CAFE,
})

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
]

// --- One guide per story step ----------------------------------------------------------
export const STEP_GUIDES: Record<string, StepGuide> = {
  // Chapter 1 — German in Hà Nội
  'start.teacher': {
    targets: [{ target: TEACHER }],
    hint: L(
      'Đi vào ngõ giữa nhà mình và quán cà phê, tới Trung tâm Đức ngữ ở cuối ngõ, bấm Vào lớp rồi nói chuyện với Thầy Minh.',
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

  // Chapter 2 — the visa
  'path.mai': {
    targets: [{ target: MAI }],
    hint: L(
      'Chị Mai ngồi ở bàn ngoài hiên quán cà phê đầu phố. Lại gần và bấm Nói chuyện.',
      'Mai sits at a terrace table outside the café. Walk up and tap Talk.',
      'Mai sitzt an einem Tisch vor dem Café. Geh hin und tippe „Reden“.',
    ),
  },
  'path.choose': {
    targets: [{ target: MAI }],
    hint: L(
      'Nói chuyện với chị Mai → chọn Du học (Studium) hoặc Học nghề điều dưỡng (Ausbildung). Ausbildung cần ít tiền chứng minh hơn và có lương.',
      'Talk to Mai → choose Studium or nursing Ausbildung. Ausbildung needs less proof of funds and is paid.',
      'Sprich mit Mai → Studium oder Pflege-Ausbildung. Die Ausbildung braucht weniger Geldnachweis und ist bezahlt.',
    ),
  },
  'visa.docs': {
    targets: [{ target: PASSPORT }],
    hint: L(
      'Bấm cuốn hộ chiếu trên màn hình → Hồ sơ visa → làm từng giấy tờ (tốn tiền và thời gian; vài giấy phải chờ vài ngày).',
      'Tap the passport on screen → visa file → do each document (costs money and time; some take a few days).',
      'Tippe auf den Pass → Visa-Mappe → erledige jedes Dokument (kostet Geld und Zeit; manche dauern Tage).',
    ),
    blockers: [needMoney(200_000, L('giấy tờ tiếp theo', 'the next document', 'das nächste Dokument'))],
  },
  'visa.termin': {
    targets: [{ target: PASSPORT }],
    hint: L(
      'Mở Hồ sơ visa → Săn lịch hẹn: khi một ô trống hiện lên, bấm thật nhanh trước khi người khác lấy mất!',
      'Open the visa file → Hunt a Termin: when a free slot appears, tap it fast before someone else does!',
      'Visa-Mappe → Termin jagen: Wenn ein freier Termin erscheint, schnell tippen!',
    ),
  },
  'visa.interview': {
    targets: [{ target: { scene: 'embassy', npc: 'officer' } }],
    hint: L(
      'Đúng ngày hẹn ({termin}): nói chuyện với Anh Tú xe ôm ở góc phố → Đại sứ quán Đức, rồi nói chuyện với cán bộ visa để phỏng vấn.',
      'On your Termin day ({termin}): talk to Tú the xe ôm driver at the corner → German Embassy, then talk to the visa officer.',
      'Am Termin-Tag ({termin}): Sprich mit Tú (Motorradtaxi) → Deutsche Botschaft, dann mit der Visabeamtin.',
    ),
    blockers: [
      {
        when: { test: 'visa.terminLater' },
        hint: L(
          'Lịch hẹn của bạn là {termin}. Bấm đồng hồ để chờ hoặc về nhà ngủ cho đến hôm đó.',
          'Your Termin is on {termin}. Tap the clock to wait, or go home and sleep until then.',
          'Dein Termin ist am {termin}. Tippe auf die Uhr oder schlaf bis dahin.',
        ),
        target: HOME_BED,
      },
      {
        when: { all: [{ test: 'visa.terminToday' }, { not: { test: 'visa.embassyOpen' } }, { not: { scene: 'embassy' } }] },
        hint: L(
          'Đại sứ quán mở 8–17h. Bấm đồng hồ để chờ đến giờ làm việc.',
          'The embassy is open 8:00–17:00. Tap the clock to wait.',
          'Die Botschaft ist 8–17 Uhr geöffnet. Tippe auf die Uhr zum Warten.',
        ),
        target: CLOCK,
      },
      {
        when: { not: { flag: 'visa.terminDay', atLeast: 1 } },
        hint: L(
          'Bạn chưa có lịch hẹn (hoặc đã lỡ hẹn). Mở Hồ sơ visa → Săn lịch hẹn lại.',
          'You have no Termin (or missed it). Open the visa file → hunt a new one.',
          'Kein Termin (oder verpasst). Visa-Mappe → neuen Termin jagen.',
        ),
        target: PASSPORT,
      },
    ],
  },
  'dep.visa': {
    targets: [{ target: HOME_BED }],
    hint: L(
      'Visa đang được xử lý, có kết quả ngày {ready}. Về nhà ngủ hoặc bấm đồng hồ để chờ — trong lúc đó cứ đi làm kiếm thêm tiền vé máy bay!',
      'Your visa is being processed; ready on {ready}. Sleep or wait — meanwhile earn money for the flight!',
      'Dein Visum wird bearbeitet, fertig am {ready}. Schlaf oder warte — und verdiene Geld für den Flug!',
    ),
  },
  'dep.flight': {
    targets: [{ target: MAI }],
    hint: L(
      `Nói chuyện với chị Mai → Mua vé máy bay (${vnd(CONFIG.visa.flightCost)}), hoặc mua trong Hồ sơ visa.`,
      `Talk to Mai → Buy a plane ticket (${vnd(CONFIG.visa.flightCost)}), or buy it in the visa file.`,
      `Sprich mit Mai → Flug kaufen (${vnd(CONFIG.visa.flightCost)}), oder in der Visa-Mappe.`,
    ),
    blockers: [needMoney(CONFIG.visa.flightCost, L('vé máy bay', 'the plane ticket', 'den Flug'))],
  },
  'dep.airport': {
    targets: [{ if: { scene: 'airport' }, target: { scene: 'airport', npc: 'me' } }, { target: { scene: 'airport', spot: 'gate' } }],
    hint: L(
      'Nói chuyện với Anh Tú xe ôm → Sân bay Nội Bài. Chào Mẹ một câu rồi ra cửa lên máy bay (Gate 7).',
      'Talk to Tú → Nội Bài Airport. Say goodbye to Mum, then go to the boarding gate (Gate 7).',
      'Sprich mit Tú → Flughafen Nội Bài. Verabschiede dich von Mama und geh zum Gate 7.',
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
    blockers: [
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
    ],
  },
}

/**
 * Doors between scenes: how to get from `from` to `to`, and what to walk to in `from`.
 * The guide finds a path through this graph (route() in game/systems/guide.ts).
 */
export const SCENE_LINKS: { from: SceneId; to: SceneId; via: GuidePoint; label: Localized }[] = [
  { from: 'vietnam', to: 'home', via: { spot: 'home' }, label: L('Vào nhà', 'Go home', 'Nach Hause') },
  { from: 'home', to: 'vietnam', via: { spot: 'home-exit' }, label: L('Ra phố', 'Out to the street', 'Auf die Straße') },
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
]

/** Onboarding target: the first friendly face near the spawn. */
export const ONBOARDING_NPC: GuideTarget = { scene: 'vietnam', npc: 'baSau' }
