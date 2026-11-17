import type { Localized } from '../i18n/localized'

/**
 * Paperwork mini-games (story 2.1): German letters (CV + motivation letter, the email to cô Lan,
 * the Remonstration), the 8-field Auslandsportal form, and documents in which you look for
 * the important (or suspicious) clauses.
 */

const L = (vi: string, en: string, de?: string): Localized => ({ vi, en, de })

// --- Letters: for each part pick the sentence that is correct German and the right tone. ----------

export interface LetterPart {
  /** What this part of the letter is for. */
  prompt: Localized
  /** German sentences; `ok` marks the right one. */
  options: { de: string; ok?: boolean; why?: Localized }[]
}

export interface LetterSet {
  title: Localized
  /** Shown above the letter. */
  intro: Localized
  passScore: number
  parts: LetterPart[]
}

const GRAMMAR = L('Sai ngữ pháp', 'Grammar mistake', 'Grammatikfehler')
const TONE = L('Không hợp với thư trang trọng', 'Wrong tone for a formal letter', 'Falscher Ton')
const LIE = L('Nói quá sự thật — lãnh sự sẽ hỏi lại!', 'Exaggerated — the consul will ask!', 'Übertrieben')

export const LETTER_SETS = {
  cv: {
    title: L('CV + thư động lực', 'CV + motivation letter', 'Lebenslauf + Motivationsschreiben'),
    intro: L('Ghép thư động lực bằng tiếng Đức: mỗi phần chọn câu đúng ngữ pháp, đúng giọng thư.', 'Build your motivation letter in German: pick the correct, polite sentence for each part.'),
    passScore: 0.67,
    parts: [
      {
        prompt: L('Lời chào đầu thư', 'Greeting'),
        options: [{ de: 'Sehr geehrte Damen und Herren,', ok: true }, { de: 'Hallo Leute!', why: TONE }, { de: 'Sehr geehrter Damen und Herren,', why: GRAMMAR }],
      },
      {
        prompt: L('Mở đầu: em xin gì', 'Opening: what you apply for'),
        options: [
          { de: 'hiermit bewerbe ich mich bei Ihnen.', ok: true },
          { de: 'hiermit ich bewerbe mich bei Ihnen.', why: GRAMMAR },
          { de: 'ich will nach Deutschland, weil dort ist es schön.', why: TONE },
        ],
      },
      {
        prompt: L('Trình độ tiếng Đức', 'Your German'),
        options: [
          { de: 'Ich habe das Goethe-Zertifikat B1.', ok: true },
          { de: 'Ich habe B1-Zertifikat gemacht haben.', why: GRAMMAR },
          { de: 'Ich spreche perfekt Deutsch, Englisch und Französisch.', why: LIE },
        ],
      },
      {
        prompt: L('Vì sao em chọn nghề này', 'Why this field'),
        options: [
          { de: 'Ich möchte Menschen helfen und in der Pflege arbeiten.', ok: true },
          { de: 'Ich möchte in der Pflege arbeiten, weil ich helfe gern Menschen.', why: GRAMMAR },
          { de: 'Ich möchte viel Geld verdienen und reisen.', why: TONE },
        ],
      },
      {
        prompt: L('Một dòng trong Lebenslauf', 'A line of the CV'),
        options: [
          { de: '2025: Abitur, Hà Nội (Note 8,2)', ok: true },
          { de: '2025: Abitur, beste Schülerin von ganz Vietnam', why: LIE },
          { de: 'Abitur 2025 gemacht ich habe', why: GRAMMAR },
        ],
      },
      {
        prompt: L('Lời chào cuối thư', 'Closing'),
        options: [{ de: 'Mit freundlichen Grüßen', ok: true }, { de: 'Mit freundlichem Grüßen', why: GRAMMAR }, { de: 'Tschüss und Küsschen', why: TONE }],
      },
    ],
  },
  lanEmail: {
    title: L('Email gửi cô Lan', 'Email to cô Lan', 'E-Mail an Frau Lan'),
    intro: L('Viết email bằng tiếng Đức (B1) nhờ cô Lan ở Leipzig bảo lãnh tài chính.', 'Write a German (B1) email asking cô Lan in Leipzig for a financial guarantee.'),
    passScore: 0.6,
    parts: [
      {
        prompt: L('Lời chào', 'Greeting'),
        options: [{ de: 'Liebe Frau Lan,', ok: true }, { de: 'Hey Lan!!', why: TONE }, { de: 'Lieber Frau Lan,', why: GRAMMAR }],
      },
      {
        prompt: L('Em là ai', 'Who you are'),
        options: [
          { de: 'Herr Hưng aus der Buchhandlung in Hà Nội hat mir Ihre Adresse gegeben.', ok: true },
          { de: 'Herr Hưng hat gegeben mir Ihre Adresse.', why: GRAMMAR },
          { de: 'Ich habe Ihre Adresse im Internet gefunden.', why: L('Cô Lan sẽ nghĩ đây là thư rác', 'She’ll think it’s spam', 'Klingt nach Spam') },
        ],
      },
      {
        prompt: L('Em cần gì', 'What you need'),
        options: [
          { de: 'Ich möchte in Deutschland Pflege studieren und brauche eine Verpflichtungserklärung.', ok: true },
          { de: 'Können Sie mir bitte 12.000 Euro schicken?', why: L('Không phải xin tiền, mà xin giấy bảo lãnh', 'You need a guarantee, not cash', 'Es geht um eine Erklärung, nicht um Geld') },
          { de: 'Ich möchte studieren in Deutschland Pflege.', why: GRAMMAR },
        ],
      },
      {
        prompt: L('Cảm ơn', 'Thanks'),
        options: [
          { de: 'Ich weiß, dass das eine große Bitte ist. Vielen Dank, dass Sie darüber nachdenken.', ok: true },
          { de: 'Ich weiß, dass das ist eine große Bitte.', why: GRAMMAR },
          { de: 'Bitte antworten Sie schnell, ich habe keine Zeit.', why: TONE },
        ],
      },
      {
        prompt: L('Lời chào cuối', 'Closing'),
        options: [{ de: 'Herzliche Grüße aus Hà Nội', ok: true }, { de: 'Bye bye', why: TONE }, { de: 'Herzlichen Grüße aus Hà Nội', why: GRAMMAR }],
      },
    ],
  },
  remo: {
    title: L('Đơn khiếu nại (Remonstration)', 'Remonstration letter', 'Remonstration'),
    intro: L('Viết thư trang trọng đề nghị Đại sứ quán xét lại hồ sơ. Lịch sự, rõ ràng, có giấy tờ kèm theo.', 'Write a formal letter asking the embassy to review your file. Polite, clear, with documents attached.'),
    passScore: 0.8,
    parts: [
      {
        prompt: L('Tiêu đề', 'Subject'),
        options: [
          { de: 'Remonstration gegen die Ablehnung meines Visumantrags', ok: true },
          { de: 'Warum kein Visum???', why: TONE },
          { de: 'Beschwerde über Frau Lehmann', why: TONE },
        ],
      },
      {
        prompt: L('Lời chào', 'Greeting'),
        options: [{ de: 'Sehr geehrte Damen und Herren,', ok: true }, { de: 'Liebe Botschaft,', why: TONE }, { de: 'Sehr geehrte Dame und Herren,', why: GRAMMAR }],
      },
      {
        prompt: L('Nêu sự việc', 'What happened'),
        options: [
          { de: 'mein Antrag auf ein nationales Visum wurde leider abgelehnt.', ok: true },
          { de: 'Sie haben mein Visum falsch abgelehnt!', why: TONE },
          { de: 'mein Antrag auf ein nationales Visum wurde leider ablehnen.', why: GRAMMAR },
        ],
      },
      {
        prompt: L('Bằng chứng', 'Evidence'),
        options: [
          { de: 'Ich lege meine Unterlagen und das B1-Zertifikat noch einmal bei.', ok: true },
          { de: 'Ich habe keine neuen Unterlagen, aber ich will das Visum.', why: L('Không có lý do để xét lại', 'No reason to review', 'Kein Grund zur Prüfung') },
          { de: 'Ich lege bei meine Unterlagen noch einmal.', why: GRAMMAR },
        ],
      },
      {
        prompt: L('Đề nghị', 'Request'),
        options: [
          { de: 'Ich bitte Sie, meinen Antrag erneut zu prüfen.', ok: true },
          { de: 'Sie müssen mir sofort das Visum geben.', why: TONE },
          { de: 'Ich bitte Sie, mein Antrag erneut prüfen.', why: GRAMMAR },
        ],
      },
      {
        prompt: L('Lời chào cuối', 'Closing'),
        options: [{ de: 'Mit freundlichen Grüßen', ok: true }, { de: 'Danke im voraus und tschüss', why: TONE }, { de: 'Mit freundliche Grüßen', why: GRAMMAR }],
      },
    ],
  },
} satisfies Record<string, LetterSet>

export type LetterSetId = keyof typeof LETTER_SETS

// --- Auslandsportal: copy the passport into the form. -----------------------------------------------

/** What the passport says (shown above the form). */
export const PASSPORT_DATA = {
  surname: 'NGUYỄN',
  given: 'MINH AN',
  birth: '14.03.2006',
  number: 'C4271936',
}

export interface FormField {
  label: string
  hint: Localized
  /** The first option is the right one (they are shuffled on screen). */
  options: string[] | { studium: string[]; ausbildung: string[] }
}

export const PORTAL_FIELDS: FormField[] = [
  { label: 'Familienname', hint: L('Họ', 'Surname'), options: ['NGUYEN', 'MINH AN', 'NGUYEN MINH AN'] },
  { label: 'Vorname(n)', hint: L('Tên đệm và tên', 'Given names'), options: ['MINH AN', 'NGUYEN', 'AN'] },
  { label: 'Geburtsdatum', hint: L('Ngày sinh (TT.MM.JJJJ)', 'Date of birth (DD.MM.YYYY)'), options: ['14.03.2006', '03.14.2006', '14.03.2003'] },
  { label: 'Reisepassnummer', hint: L('Số hộ chiếu', 'Passport number'), options: ['C4271936', 'C4721936', 'C427193'] },
  {
    label: 'Zweck des Aufenthalts',
    hint: L('Mục đích', 'Purpose'),
    options: {
      ausbildung: ['Berufsausbildung (§ 16a AufenthG)', 'Studium (§ 16b AufenthG)', 'Tourismus / Besuch'],
      studium: ['Studium / Studienkolleg (§ 16b AufenthG)', 'Berufsausbildung (§ 16a AufenthG)', 'Tourismus / Besuch'],
    },
  },
  {
    label: 'Anschrift in Deutschland',
    hint: L('Địa chỉ ở Đức', 'Address in Germany'),
    options: {
      ausbildung: ['Pflegeheim Sonnenhof, Lindenberg', 'Hotel am Flughafen Frankfurt', 'Noch unbekannt'],
      studium: ['Studienkolleg Lindenberg (Wohnheim)', 'Hotel am Flughafen Frankfurt', 'Noch unbekannt'],
    },
  },
  { label: 'Geplante Einreise', hint: L('Ngày dự kiến nhập cảnh', 'Planned entry'), options: ['in 4 Wochen', 'gestern', 'irgendwann'] },
  { label: 'Ort der Antragstellung', hint: L('Nơi nộp hồ sơ', 'Where you apply'), options: ['Hanoi (VFS Global)', 'Berlin', 'Ho-Chi-Minh-Stadt'] },
]

// --- Documents with clauses to find --------------------------------------------------------------

export interface ClauseDoc {
  title: Localized
  /** What to look for. */
  task: Localized
  lines: { text: Localized; mark?: Localized }[]
  /** Wrong taps allowed. */
  mistakes: number
}

export const CLAUSE_DOCS = {
  cauNoi: {
    title: L('Hợp đồng Chương trình Cầu nối Sonnenhof', 'Sonnenhof bridge programme contract', 'Vertrag Brückenprogramm Sonnenhof'),
    task: L('Tìm 3 điều khoản quan trọng nhất: lương, thời hạn ràng buộc, số tiền phải hoàn lại.', 'Find the 3 key clauses: salary, how long you are bound, what you would pay back.'),
    mistakes: 2,
    lines: [
      { text: L('Arbeitgeber: Pflegeheim Sonnenhof GmbH, Lindenberg (Deutschland)', 'Employer: Sonnenhof care home, Lindenberg (Germany)') },
      { text: L('Sonnenhof trả: học phí B1, lệ phí thi B1, vé máy bay Hà Nội → Frankfurt.', 'Sonnenhof pays: B1 course, B1 exam fee, flight Hà Nội → Frankfurt.') },
      { text: L('Ausbildungsvergütung: 1.490 € brutto/Monat im 1. Jahr (≈ 1.150 € netto).', 'Training pay: €1,490 gross per month in year 1 (≈ €1,150 net).'), mark: L('Lương: ghi rõ trước thuế và sau thuế', 'Salary: gross and net stated') },
      { text: L('Probezeit: 6 Monate. Urlaub: 30 Tage im Jahr.', 'Probation: 6 months. Holidays: 30 days a year.') },
      { text: L('Nach dem Abschluss: 2 Jahre Arbeit als Pflegefachkraft im Sonnenhof.', 'After graduating: 2 years as a nurse at Sonnenhof.'), mark: L('Thời hạn ràng buộc: 2 năm sau tốt nghiệp', 'Bound for 2 years after graduating') },
      { text: L('Arbeitszeit: 38,5 Stunden pro Woche, Schichtdienst.', 'Working time: 38.5 hours a week, shifts.') },
      { text: L('Bei Kündigung vorher: anteilige Rückzahlung der Kosten, höchstens 3.000 €.', 'If you quit earlier: you repay part of the costs, at most €3,000.'), mark: L('Hoàn lại: tối đa 3.000 €, theo tỷ lệ', 'Repayment: at most €3,000, pro rata') },
      { text: L('Gerichtsstand: Lindenberg. Vertrag auf Deutsch und Vietnamesisch.', 'Jurisdiction: Lindenberg. Contract in German and Vietnamese.') },
    ],
  },
  hoangKim: {
    title: L('Hợp đồng dịch vụ — Công ty Hoàng Kim', 'Service contract — Hoàng Kim company', 'Dienstleistungsvertrag — Hoàng Kim'),
    task: L('Tìm 3 dấu hiệu lừa đảo trong tờ hợp đồng.', 'Find 3 signs of a scam in this contract.'),
    mistakes: 2,
    lines: [
      { text: L('Bên A: Công ty TNHH Hoàng Kim. Bên B: học viên.', 'Party A: Hoàng Kim Ltd. Party B: the student.') },
      { text: L('Nơi làm việc: một đối tác uy tín tại CHLB Đức.', 'Workplace: a reputable partner in Germany.'), mark: L('Không ghi tên chủ ở Đức!', 'No German employer named!') },
      { text: L('Ngành: điều dưỡng hoặc nhà hàng (tùy sắp xếp).', 'Field: nursing or restaurant (as arranged).') },
      { text: L('Mức lương: 100 triệu đồng/tháng.', 'Salary: 100 million đồng a month.'), mark: L('Không nói trước thuế hay sau thuế', 'Doesn’t say gross or net') },
      { text: L('Thời gian xuất cảnh dự kiến: 3–6 tháng sau khi ký.', 'Expected departure: 3–6 months after signing.') },
      { text: L('Phí dịch vụ: 250.000.000đ, đóng trước 70%. Phí không hoàn lại trong mọi trường hợp.', 'Service fee: 250,000,000đ, 70% up front. Not refundable in any case.'), mark: L('Phí không hoàn lại', 'Non-refundable fee') },
      { text: L('Học viên tự học tiếng Đức theo hướng dẫn của công ty.', 'The student learns German following the company’s advice.') },
      { text: L('Hợp đồng lập thành 2 bản tiếng Việt.', 'Two copies, in Vietnamese.') },
    ],
  },
} satisfies Record<string, ClauseDoc>

export type ClauseDocId = keyof typeof CLAUSE_DOCS
