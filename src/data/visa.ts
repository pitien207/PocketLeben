import type { Localized } from '../i18n/localized'
import type { Condition } from './conditions'

/**
 * Visa documents (story 2.1, chapter 2). Each document is a list of steps done in order. A step
 * either costs money/time/energy when you do it, or completes by itself (`auto`), e.g. once a paper
 * arrives after `waitDays`. Steps with `at` happen in a real place (photo studio, notary, APS office,
 * the desk/laptop at home); the visa file then shows "Chỉ đường". Documents with an `office` price can
 * instead be left to chị Mai's office (Văn phòng Mai Anh, Hàng Bông) — Tuấn brings them the next day.
 */

export type VisaPath = 'studium' | 'ausbildung'

/** Places where document steps are done. 'desk' = the study desk / laptop at home. */
export type VisaOffice = 'photo' | 'notary' | 'bank' | 'aps' | 'desk'

export interface DocStep {
  label: Localized
  /** VND; 'insurance' = depends on the path (CONFIG.visa.insurance). */
  cost?: number | 'insurance'
  minutes?: number
  energy?: number
  /** After this step, the next one completes by itself this many days later. */
  waitDays?: number
  /** Completes on its own when this holds. */
  auto?: Condition
  /** Done in person at this place, not from the visa file. */
  at?: VisaOffice
  /** Queue in the morning: only on weekdays between 7:00 and this hour. */
  morningBefore?: number
}

export interface DocDef {
  id: string
  name: Localized
  /** Only needed for this path. */
  path?: VisaPath
  steps: DocStep[]
  /** Văn phòng Mai Anh does the whole document for this price (VND), ready the next day. */
  office?: number
}

const L = (vi: string, en: string): Localized => ({ vi, en })

export const VISA_DOCS: DocDef[] = [
  {
    id: 'passport',
    name: L('Hộ chiếu', 'Passport'),
    steps: [
      { label: L('Làm hộ chiếu', 'Apply for a passport'), cost: 200_000, minutes: 120, waitDays: 1 },
      // Saves from before 2.1 (one-step passport) have no ready flag: that counts as collected.
      { label: L('Nhận hộ chiếu', 'Collect the passport'), auto: { any: [{ dayReached: 'doc.passport.ready' }, { noFlag: 'doc.passport.ready' }] } },
    ],
  },
  { id: 'photos', name: L('Ảnh sinh trắc 35×45', 'Biometric photos 35×45'), steps: [{ label: L('Chụp ảnh ở tiệm ảnh', 'Photos at the studio'), cost: 100_000, minutes: 30, at: 'photo' }] },
  // The originals (diploma, three years of school records, birth certificate) are in the paper cabinet at home.
  {
    id: 'diploma',
    name: L('Dịch thuật công chứng (bằng THPT, học bạ, khai sinh)', 'Certified translations (diploma, records, birth certificate)'),
    office: 2_000_000,
    steps: [{ label: L('Dịch & công chứng 10 trang ở cô Phương', 'Translate & notarize 10 pages (Ms Phương)'), cost: 1_500_000, minutes: 240, at: 'notary' }],
  },
  {
    id: 'criminal',
    name: L('Lý lịch tư pháp', 'Criminal record certificate'),
    path: 'ausbildung',
    office: 500_000,
    steps: [{ label: L('Xếp hàng ở Sở Tư pháp (sáng, trước 11h)', 'Queue at the Justice Dept. (mornings, before 11)'), cost: 200_000, minutes: 180, energy: 10, morningBefore: 11 }],
  },
  {
    id: 'health',
    name: L('Giấy khám sức khỏe', 'Health certificate'),
    path: 'ausbildung',
    office: 800_000,
    steps: [{ label: L('Khám ở phòng khám Hàng Bông (sáng, trước 11h)', 'Check-up at the Hàng Bông clinic (mornings, before 11)'), cost: 600_000, minutes: 180, energy: 10, morningBefore: 11 }],
  },
  { id: 'german', name: L('Chứng chỉ tiếng Đức B1', 'German B1 certificate'), steps: [{ label: L('Thi đậu B1', 'Pass B1'), auto: { germanLevel: 3 } }] },
  {
    id: 'cv',
    name: L('CV + thư động lực (tiếng Đức)', 'CV + motivation letter (German)'),
    office: 800_000,
    steps: [{ label: L('Tự viết ở bàn học (ghép câu)', 'Write them at your desk (sentences)'), minutes: 90, energy: 10, at: 'desk' }],
  },
  { id: 'insurance', name: L('Bảo hiểm những ngày đầu', 'Insurance for the first days'), steps: [{ label: L('Mua bảo hiểm', 'Buy insurance'), cost: 'insurance' }] },
  {
    id: 'aps',
    name: L('Chứng chỉ APS', 'APS certificate'),
    path: 'studium',
    steps: [
      { label: L('Nộp hồ sơ APS', 'Hand in the APS file'), cost: 3_600_000, minutes: 30, at: 'aps' },
      { label: L('Phỏng vấn APS (ngày có đợt)', 'APS interview (on a round day)'), at: 'aps' },
    ],
  },
  {
    id: 'admission',
    name: L('Thư mời Studienkolleg (uni-assist)', 'Studienkolleg admission (uni-assist)'),
    path: 'studium',
    steps: [
      { label: L('Nộp đơn uni-assist (75 €)', 'Apply via uni-assist (€75)'), cost: 2_400_000, minutes: 90, waitDays: 2 },
      { label: L('Nhận thư mời', 'Receive the admission'), auto: { dayReached: 'doc.admission.ready' } },
    ],
  },
  {
    id: 'sperr',
    name: L('Sperrkonto 11.904 € (hoặc giấy bảo lãnh)', 'Blocked account €11,904 (or a guarantee)'),
    path: 'studium',
    steps: [{ label: L('Họp gia đình về tiền Sperrkonto', 'Family meeting about the money'), auto: { flag: 'sperr.done' } }],
  },
  {
    id: 'contract',
    name: L('Hợp đồng học nghề Sonnenhof', 'Training contract (Sonnenhof)'),
    path: 'ausbildung',
    steps: [
      // Cầu nối: the contract is already signed.
      { label: L('Gửi hồ sơ xin học nghề', 'Send applications'), minutes: 120, energy: 10, waitDays: 1, auto: { flag: 'cauNoi.signed' } },
      { label: L('Nhận hợp đồng từ Sonnenhof', 'Contract from Sonnenhof'), auto: { any: [{ dayReached: 'doc.contract.ready' }, { flag: 'cauNoi.signed' }] } },
    ],
  },
  {
    id: 'ba',
    name: L('Cơ quan Lao động Đức (BA) đồng ý', 'Federal Employment Agency (BA) approval'),
    path: 'ausbildung',
    steps: [{ label: L('Chờ BA đồng ý (2 ngày sau hợp đồng)', 'Waiting for the BA (2 days after the contract)'), auto: { dayReached: 'doc.ba.ready' } }],
  },
  {
    id: 'portal',
    name: L('Đơn visa trên Auslandsportal', 'Visa application on the Auslandsportal'),
    office: 500_000,
    steps: [{ label: L('Tự điền đơn (laptop ở nhà)', 'Fill it in yourself (laptop at home)'), minutes: 45, at: 'desk' }],
  },
]

export const VISA_PATH_NAMES: Record<VisaPath, Localized> = {
  studium: { vi: 'Du học (Studium)', en: 'University (Studium)', de: 'Studium' },
  ausbildung: { vi: 'Học nghề điều dưỡng (Ausbildung)', en: 'Nursing training (Ausbildung)', de: 'Ausbildung Pflege' },
}
