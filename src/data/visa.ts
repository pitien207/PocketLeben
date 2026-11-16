import type { Localized } from '../i18n/localized'
import type { Condition } from './conditions'

/**
 * Visa documents (plan §6 chapter 2: collect, translate, notarize). Each document is a
 * list of steps done in order. A step either costs money/time/energy when you press it,
 * or completes by itself (`auto`), e.g. once a certificate arrives after `waitDays`.
 * Steps with `at` happen in a real place (1.13): the photo studio, the notary, the bank, the
 * APS office (west end of Phố Hàng Gai) — the visa file then shows "Chỉ đường" instead of a button.
 */

export type VisaPath = 'studium' | 'ausbildung'

/** Places on the street where document steps are done (scenes/VietnamStreet/VisaOffices.tsx). */
export type VisaOffice = 'photo' | 'notary' | 'bank' | 'aps'

export interface DocStep {
  label: Localized
  /** VND, or 'finance' = the path's financial-proof amount (Sperrkonto). */
  cost?: number | 'finance'
  minutes?: number
  energy?: number
  /** After this step, the next one completes by itself this many days later. */
  waitDays?: number
  /** Completes on its own when this holds. */
  auto?: Condition
  /** Done in person at this place (talk to the clerk), not from the visa file. */
  at?: VisaOffice
}

export interface DocDef {
  id: string
  name: Localized
  /** Only needed for this path. */
  path?: VisaPath
  steps: DocStep[]
}

const L = (vi: string, en: string): Localized => ({ vi, en })

export const VISA_DOCS: DocDef[] = [
  { id: 'passport', name: L('Hộ chiếu', 'Passport'), steps: [{ label: L('Làm hộ chiếu', 'Apply for passport'), cost: 200_000, minutes: 120 }] },
  { id: 'photos', name: L('Ảnh thẻ biometric', 'Biometric photos'), steps: [{ label: L('Chụp ảnh thẻ ở tiệm ảnh', 'Photos at the photo studio'), cost: 50_000, minutes: 30, at: 'photo' }] },
  // The originals are at home in the paper cabinet (flag visa.originals); the notary needs them.
  {
    id: 'diploma',
    name: L('Bằng tốt nghiệp THPT', 'School diploma'),
    steps: [
      { label: L('Dịch thuật', 'Translate'), cost: 150_000, minutes: 40, at: 'notary' },
      { label: L('Công chứng', 'Notarize'), cost: 80_000, minutes: 20, at: 'notary' },
    ],
  },
  {
    id: 'birth',
    name: L('Giấy khai sinh', 'Birth certificate'),
    steps: [
      { label: L('Dịch thuật', 'Translate'), cost: 100_000, minutes: 30, at: 'notary' },
      { label: L('Công chứng', 'Notarize'), cost: 50_000, minutes: 20, at: 'notary' },
    ],
  },
  { id: 'german', name: L('Chứng chỉ tiếng Đức B1', 'German B1 certificate'), steps: [{ label: L('Thi đậu B1', 'Pass B1'), auto: { germanLevel: 3 } }] },
  { id: 'cv', name: L('Sơ yếu lý lịch (Lebenslauf)', 'CV (Lebenslauf)'), steps: [{ label: L('Viết CV', 'Write CV'), minutes: 90, energy: 8 }] },
  { id: 'motivation', name: L('Thư động lực', 'Motivation letter'), steps: [{ label: L('Viết thư', 'Write letter'), minutes: 120, energy: 10 }] },
  { id: 'insurance', name: L('Bảo hiểm du lịch', 'Travel health insurance'), steps: [{ label: L('Mua bảo hiểm', 'Buy insurance'), cost: 300_000 }] },
  {
    id: 'finance',
    name: L('Chứng minh tài chính', 'Proof of funds'),
    // The bank clerk checks your balance: enough money = done, nothing is taken.
    steps: [{ label: L('Chứng minh tài chính ở ngân hàng', 'Show your funds at the bank'), minutes: 20, at: 'bank' }],
  },
  {
    id: 'aps',
    name: L('Chứng chỉ APS', 'APS certificate'),
    path: 'studium',
    steps: [
      { label: L('Nộp hồ sơ APS', 'Apply for APS'), cost: 800_000, minutes: 30, at: 'aps' },
      { label: L('Phỏng vấn APS', 'APS interview'), at: 'aps' },
    ],
  },
  {
    id: 'admission',
    name: L('Thư mời nhập học (Zulassung)', 'University admission'),
    path: 'studium',
    steps: [
      { label: L('Nộp đơn vào đại học', 'Apply to university'), cost: 300_000, minutes: 90, waitDays: 1 },
      { label: L('Nhận thư mời', 'Receive admission'), auto: { dayReached: 'doc.admission.ready' } },
    ],
  },
  {
    id: 'contract',
    name: L('Hợp đồng học nghề', 'Training contract'),
    path: 'ausbildung',
    steps: [
      { label: L('Gửi hồ sơ xin học nghề', 'Send applications'), minutes: 120, energy: 10, waitDays: 1 },
      { label: L('Nhận hợp đồng từ Sonnenhof', 'Contract from Sonnenhof'), auto: { dayReached: 'doc.contract.ready' } },
    ],
  },
]

export const VISA_PATH_NAMES: Record<VisaPath, Localized> = {
  studium: { vi: 'Du học (Studium)', en: 'University (Studium)', de: 'Studium' },
  ausbildung: { vi: 'Học nghề điều dưỡng (Ausbildung)', en: 'Nursing training (Ausbildung)', de: 'Ausbildung Pflege' },
}
