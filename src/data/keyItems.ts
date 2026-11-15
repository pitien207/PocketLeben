import type { Localized } from '../i18n/localized'
import type { Condition } from './conditions'

/**
 * Important items (giấy tờ quan trọng): shown in the bag while their condition holds.
 * They weigh a little but can never be thrown away. Derived from story flags, so they
 * need no saving of their own.
 */

export type PaperKind =
  | 'passport'
  | 'passportDe'
  | 'certificate'
  | 'diploma'
  | 'folder'
  | 'visa'
  | 'ticket'
  | 'document'
  | 'contract'
  | 'bankCard'
  | 'insuranceCard'
  | 'studentId'
  | 'wgKey'
  | 'flatKey'
  | 'residence'

export interface KeyItemDef {
  id: string
  icon: PaperKind
  name: Localized
  desc: Localized
  weight: number
  when: Condition
}

const K = (id: string, icon: PaperKind, vi: string, en: string, de: string, dVi: string, dEn: string, weight: number, when: Condition): KeyItemDef => ({
  id,
  icon,
  name: { vi, en, de },
  desc: { vi: dVi, en: dEn },
  weight,
  when,
})

const studium: Condition = { flag: 'visa.path', is: 'studium' }

export const KEY_ITEMS: KeyItemDef[] = [
  K('passport', 'passport', 'Hộ chiếu', 'Passport', 'Reisepass', 'Đi đâu cũng phải mang theo.', 'Never leave home without it.', 0.05, { not: { flag: 'cz.granted' } }),
  K('passportDe', 'passportDe', 'Hộ chiếu Đức', 'German passport', 'Deutscher Reisepass', 'Công dân Đức rồi!', 'A German citizen now!', 0.05, { flag: 'cz.granted' }),
  K('certA1', 'certificate', 'Chứng chỉ A1', 'A1 certificate', 'Zertifikat A1', 'Goethe/telc A1 — bước đầu tiên.', 'Goethe/telc A1 — the first step.', 0.02, { all: [{ germanLevel: 1 }, { not: { germanLevel: 3 } }] }),
  K('certB1', 'certificate', 'Chứng chỉ B1', 'B1 certificate', 'Zertifikat B1', 'Cần cho visa, hợp đồng và định cư.', 'Needed for the visa, the contract and residence.', 0.02, { germanLevel: 3 }),
  K('visaFolder', 'folder', 'Hồ sơ visa', 'Visa folder', 'Visumsmappe', 'Giấy tờ, bản dịch, công chứng.', 'Documents, translations, certified copies.', 0.4, { all: [{ flag: 'visa.path' }, { noFlag: 'de.arrived' }] }),
  K('visa', 'visa', 'Visa Đức', 'German visa', 'Deutsches Visum', 'Dán trong hộ chiếu. Quý lắm!', 'Stuck in your passport. Precious!', 0.01, { all: [{ dayReached: 'visa.readyDay' }, { noFlag: 'pr.granted' }] }),
  K('flight', 'ticket', 'Vé máy bay', 'Plane ticket', 'Flugticket', 'Hà Nội → Frankfurt.', 'Hanoi → Frankfurt.', 0.01, { all: [{ flag: 'visa.flight' }, { noFlag: 'de.arrived' }] }),
  K('meldung', 'document', 'Giấy Anmeldung', 'Registration certificate', 'Meldebescheinigung', 'Xác nhận đăng ký cư trú.', 'Proof of registered address.', 0.02, { flag: 'de.anmeldung' }),
  K('bankCard', 'bankCard', 'Thẻ ngân hàng', 'Bank card', 'Bankkarte', 'Girokonto ở Sparbank.', 'Current account at Sparbank.', 0.01, { flag: 'de.bank' }),
  K('insurance', 'insuranceCard', 'Thẻ bảo hiểm y tế', 'Health insurance card', 'Versichertenkarte', 'Đi khám không lo.', 'See a doctor worry-free.', 0.01, { flag: 'de.insurance' }),
  K('wgKey', 'wgKey', 'Chìa khóa WG', 'WG key', 'WG-Schlüssel', 'Lindenstraße 12, tầng 3.', 'Lindenstraße 12, 3rd floor.', 0.03, { all: [{ flag: 'de.wg' }, { noFlag: 'de.ownFlat' }] }),
  K('flatKey', 'flatKey', 'Chìa khóa căn hộ', 'Flat key', 'Wohnungsschlüssel', 'Tổ ấm của riêng mình.', 'A home of your own.', 0.03, { flag: 'de.ownFlat' }),
  K('studentId', 'studentId', 'Thẻ sinh viên', 'Student ID', 'Studierendenausweis', 'Kèm vé tàu cả học kỳ.', 'Includes the semester transit ticket.', 0.01, { all: [studium, { flag: 'uni.enrolled' }, { noFlag: 'uni.degree' }] }),
  K('diplomaPflege', 'diploma', 'Bằng điều dưỡng', 'Nursing diploma', 'Pflege-Examen', 'Pflegefachkraft — chính thức!', 'Qualified nurse — official!', 0.05, { flag: 'care.examen' }),
  K('diplomaUni', 'diploma', 'Bằng cử nhân', 'Bachelor’s degree', 'Bachelorurkunde', 'B.Sc. Pflegewissenschaft.', 'B.Sc. Nursing Science.', 0.05, { flag: 'uni.degree' }),
  K('contract', 'contract', 'Hợp đồng lao động', 'Employment contract', 'Arbeitsvertrag', 'Không thời hạn ở Sonnenhof.', 'Permanent, at Sonnenhof.', 0.05, { flag: 'job.fulltime' }),
  K('residence', 'residence', 'Thẻ định cư', 'Residence permit', 'Niederlassungserlaubnis', 'Được ở lại nước Đức lâu dài.', 'Here to stay in Germany.', 0.01, { flag: 'pr.granted' }),
]
