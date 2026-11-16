import { formatMoney } from '../../i18n/format'
import type { Localized } from '../../i18n/localized'
import { CONFIG } from '../config'
import type { DialogueDef } from '../dialogueTypes'
import { VISA_DOCS } from '../visa'

/**
 * The visa offices at the west end of Phố Hàng Gai (1.13): photo studio, notary, bank, APS.
 * The work happens in systems/visa.ts actions (visa.photo, visa.notary, visa.bankCheck,
 * bank.exchange, aps.interview); results are told by toasts.
 */

const L = (vi: string, en: string, de?: string): Localized => ({ vi, en, de })
const BYE = L('Dạ em cảm ơn ạ.', 'Thank you!', 'Danke!')
const OPEN = CONFIG.visa.officeHours
const closed = (vi: string, en: string): DialogueDef['nodes'][string] => ({
  text: L(`${vi} Giờ làm việc ${OPEN[0]}h–${OPEN[1]}h, em bấm đồng hồ để chờ nhé.`, `${en} Open ${OPEN[0]}:00–${OPEN[1]}:00 — tap the clock to wait.`),
})

/** Translation + notary fees still to pay for the papers you bring. */
function notaryCost() {
  let sum = 0
  for (const id of ['diploma', 'birth']) {
    const doc = VISA_DOCS.find((d) => d.id === id)
    if (doc) for (const s of doc.steps) if (s.at === 'notary' && typeof s.cost === 'number') sum += s.cost
  }
  return sum
}

export const OFFICE_DIALOGUES: Record<string, DialogueDef> = {
  chuAnh: {
    start: [{ if: { not: { test: 'office.open' } }, node: 'closed' }, { if: { test: 'visa.pending.photo' }, node: 'photo' }, { node: 'hello' }],
    nodes: {
      closed: closed('Tiệm đóng cửa rồi cháu ơi.', 'The studio is closed.'),
      photo: {
        text: [
          L(
            'Ảnh visa Đức hả cháu? Chuẩn biometric: 3,5×4,5 cm, nền trắng, nhìn thẳng, không cười hở răng, vén tóc cho lộ tai nhé.',
            'German visa photos? Biometric standard: 35×45 mm, white background, look straight, no big smile, hair behind the ears.',
          ),
        ],
        choices: [
          { text: L('Chụp ảnh thẻ visa', 'Take visa photos', 'Passbilder machen'), cost: 50_000, effect: { type: 'action', id: 'visa.photo' }, next: 'done' },
          { text: L('Sao phải lộ tai ạ?', 'Why the ears?', 'Warum die Ohren?'), next: 'ears' },
          { text: L('Để lúc khác ạ', 'Maybe later', 'Später') },
        ],
      },
      ears: {
        text: L('Quy định của Đại sứ quán đấy, máy nhận diện khuôn mặt cần thấy rõ. Ngày xưa chú chụp hỏng mấy lần vì cái tai đấy!', 'Embassy rules: face recognition needs to see your face clearly. I got it wrong a few times back then because of the ears!'),
        next: 'photo',
      },
      done: {
        text: L('Nhìn vào ống kính… cười mỉm thôi… Tách! Xong rồi, sáu tấm ảnh đẹp lắm. Chúc cháu đi Đức suôn sẻ!', 'Look into the lens… a small smile… click! Done — six lovely photos. Good luck in Germany!'),
      },
      hello: {
        text: [
          L('Tiệm ảnh của chú chụp ảnh thẻ, ảnh hộ chiếu, ảnh visa lấy ngay. Cần gì cứ ghé nhé!', 'My studio does ID photos, passport and visa photos while you wait. Drop by anytime!'),
          L('Hồi trước cả phố này ai đi Đức cũng chụp ảnh ở đây đấy.', 'Everyone from this street who went to Germany had their photos taken here.'),
        ],
        choices: [{ text: BYE }],
      },
    },
  },

  coCongChung: {
    vars: () => ({ fee: formatMoney(notaryCost(), 'VND') }),
    start: [
      { if: { not: { test: 'office.open' } }, node: 'closed' },
      { if: { all: [{ test: 'visa.pending.notary' }, { not: { test: 'visa.originals' } }] }, node: 'needOriginals' },
      { if: { test: 'visa.pending.notary' }, node: 'notary' },
      { node: 'hello' },
    ],
    nodes: {
      closed: closed('Văn phòng công chứng hết giờ làm việc rồi em.', 'The notary office is closed.'),
      needOriginals: {
        text: [
          L('Em muốn dịch thuật công chứng bằng tốt nghiệp với giấy khai sinh à? Phải mang bản gốc đến thì cô mới đóng dấu được.', 'You want your diploma and birth certificate translated and notarized? I need the originals to stamp them.'),
          L('Bản gốc chắc để ở nhà, trong tủ giấy tờ ấy. Em về lấy rồi quay lại nhé.', 'The originals are probably at home, in the paper cabinet. Fetch them and come back.'),
        ],
      },
      notary: {
        text: L('Bản gốc đây rồi. Cô cho dịch sang tiếng Đức rồi công chứng cả bằng THPT lẫn giấy khai sinh, tổng cộng {fee}. Mất khoảng hai tiếng.', 'Here are the originals. I’ll have the diploma and birth certificate translated into German and notarize both: {fee} in total, about two hours.'),
        choices: [
          { text: L('Dịch thuật & công chứng tất cả', 'Translate & notarize everything', 'Übersetzen & beglaubigen'), cost: notaryCost(), effect: { type: 'action', id: 'visa.notary' }, next: 'done' },
          { text: L('Công chứng là gì ạ?', 'What does notarizing mean?', 'Was heißt beglaubigen?'), next: 'what' },
          { text: L('Để lúc khác ạ', 'Maybe later', 'Später') },
        ],
      },
      what: {
        text: L('Là cơ quan nhà nước xác nhận bản sao, bản dịch đúng với bản gốc. Đại sứ quán Đức chỉ nhận bản có dấu đỏ thôi em.', 'An official confirms that the copy and translation match the original. The German embassy only accepts papers with the red stamp.'),
        next: 'notary',
      },
      done: {
        text: L('Xong rồi đây: bản dịch tiếng Đức, dấu đỏ, chữ ký đầy đủ. Em giữ cẩn thận nhé.', 'All done: German translations, red stamps and signatures. Keep them safe.'),
      },
      hello: {
        text: L('Văn phòng công chứng đây em. Dịch thuật, sao y, chứng thực chữ ký — làm nhanh trong ngày.', 'Notary office. Translations, certified copies, signatures — same day.'),
        choices: [{ text: BYE }],
      },
    },
  },

  anhNganHang: {
    vars: () => ({
      studium: formatMoney(CONFIG.visa.financeProof.studium, 'VND'),
      ausbildung: formatMoney(CONFIG.visa.financeProof.ausbildung, 'VND'),
      rate: formatMoney(CONFIG.visa.vndPerEur, 'VND'),
    }),
    start: [{ if: { not: { test: 'office.open' } }, node: 'closed' }, { node: 'hello' }],
    nodes: {
      closed: closed('Ngân hàng đóng cửa rồi em, mai quay lại nhé.', 'The bank is closed — come back tomorrow.'),
      hello: {
        text: L('Chào em, anh là Quân. Anh giúp gì được cho em?', 'Hello, I’m Quân. How can I help?'),
        choices: [
          { text: L('Chứng minh tài chính đi Đức', 'Proof of funds for Germany', 'Finanzierungsnachweis'), if: { test: 'visa.pending.bank' }, next: 'finance' },
          { text: L('Đổi tiền Việt sang Euro', 'Change đồng into euros', 'Dong in Euro tauschen'), if: { country: 'vn' }, next: 'exchange' },
          { text: L('Đổi hết Euro về tiền Việt', 'Change all my euros into đồng', 'Alle Euro in Dong tauschen'), if: { test: 'wallet.hasOther' }, effect: { type: 'action', id: 'bank.exchangeBack' } },
          { text: L('Tỷ giá hôm nay thế nào ạ?', 'What’s today’s rate?', 'Wie ist der Kurs?'), next: 'rate' },
          { text: BYE },
        ],
      },
      finance: {
        text: L(
          'Đi du học cần chứng minh {studium}, học nghề {ausbildung} trong tài khoản. Anh kiểm tra số dư cho em: đủ thì anh xác nhận luôn, không phải mở thêm giấy tờ gì cả.',
          'For university you need {studium} in your account, for vocational training {ausbildung}. I’ll check your balance: if it’s enough I confirm it right away — no extra paperwork.',
        ),
        choices: [
          { text: L('Anh kiểm tra giúp em', 'Please check it', 'Bitte prüfen'), effect: { type: 'action', id: 'visa.bankCheck' } },
          { text: L('Để em đi làm thêm đã', 'Let me earn a bit more first', 'Ich verdiene erst mehr') },
        ],
      },
      exchange: {
        text: L('Đổi bao nhiêu em? Tỷ giá hôm nay: 1 € = {rate}. Sang Đức thì tiêu bằng Euro, còn tiền Việt vẫn nằm trong ví của em.', 'How much? Today: €1 = {rate}. In Germany you pay in euros; your đồng stay in your wallet.'),
        choices: [
          { text: L('Đổi 300.000 ₫ (100 €)', 'Change 300,000 ₫ (€100)', '300.000 ₫ (100 €)'), effect: { type: 'action', id: 'bank.exchange', arg: '300000' } },
          { text: L('Đổi 1.500.000 ₫ (500 €)', 'Change 1,500,000 ₫ (€500)', '1.500.000 ₫ (500 €)'), effect: { type: 'action', id: 'bank.exchange', arg: '1500000' } },
          { text: L('Đổi hết tiền Việt', 'Change all my đồng', 'Alles tauschen'), effect: { type: 'action', id: 'bank.exchange', arg: 'all' } },
          { text: L('Thôi để sau ạ', 'Not now', 'Später') },
        ],
      },
      rate: {
        text: L('1 € = {rate}. Nhớ đổi đủ Euro trước khi bay nhé, sang đó tiêu toàn bằng Euro đấy.', '€1 = {rate}. Change enough euros before you fly — over there it’s all euros.'),
        next: 'hello',
      },
    },
  },

  coAps: {
    start: [
      { if: { not: { test: 'office.open' } }, node: 'closed' },
      { if: { not: { flag: 'visa.path', is: 'studium' } }, node: 'notStudium' },
      { if: { test: 'visa.apsDone' }, node: 'done' },
      { if: { test: 'visa.apsTriedToday' }, node: 'tomorrow' },
      { if: { test: 'visa.apsPaid' }, node: 'ready' },
      { node: 'hello' },
    ],
    nodes: {
      closed: closed('Văn phòng APS đóng cửa rồi.', 'The APS office is closed.'),
      notStudium: {
        text: L('Guten Tag! APS chỉ dành cho người đi du học đại học thôi. Học nghề (Ausbildung) thì không cần đâu em.', 'Guten Tag! APS is only for university applicants. You don’t need it for vocational training.'),
      },
      hello: {
        text: [
          L(
            'Guten Tag! Đây là APS — Akademische Prüfstelle. Chúng tôi kiểm tra học bạ, bằng cấp của em là thật, rồi phỏng vấn ngắn bằng tiếng Đức về những môn em đã học.',
            'Guten Tag! This is APS — the Academic Evaluation Centre. We check that your school records are genuine, then hold a short interview in German about what you studied.',
          ),
        ],
        choices: [
          { text: L('Nộp hồ sơ & phỏng vấn', 'Hand in my file & interview', 'Unterlagen abgeben & Interview'), cost: 800_000, effect: { type: 'action', id: 'aps.interview' } },
          { text: L('Phỏng vấn hỏi những gì ạ?', 'What does the interview ask?', 'Was wird gefragt?'), next: 'tips' },
          { text: L('Để em chuẩn bị thêm', 'I’ll prepare a bit more', 'Ich bereite mich vor') },
        ],
      },
      tips: {
        text: [
          L('Giới thiệu bản thân, các môn lớp 12, môn em thích, một kiến thức cụ thể — ví dụ định luật Ôm hay đạo hàm —, điểm tốt nghiệp và ngành em muốn học.', 'Introduce yourself, your year-12 subjects, your favourite one, something concrete you learned — Ohm’s law or derivatives, say —, your final grade and what you want to study.'),
          L('Trả lời bằng tiếng Đức, thật thà. Khai sai học bạ là trượt ngay, không có lần hai đâu!', 'Answer in German, honestly. Faking your records means instant failure!'),
        ],
        next: 'hello',
      },
      ready: {
        text: L('Hồ sơ của em đã nộp. Mời em vào phòng phỏng vấn nhé. Bereit?', 'Your file is in. Please come into the interview room. Ready?'),
        choices: [
          { text: L('Bắt đầu phỏng vấn', 'Start the interview', 'Interview beginnen'), effect: { type: 'action', id: 'aps.interview' } },
          { text: L('Cho em ôn thêm chút', 'Let me revise a little', 'Ich wiederhole noch') },
        ],
      },
      tomorrow: {
        text: L('Hôm nay em chưa đạt. Ôn lại kiến thức các môn rồi ngày mai quay lại phỏng vấn tiếp nhé.', 'You didn’t pass today. Revise your subjects and come back tomorrow for another interview.'),
      },
      done: {
        text: L('Chứng chỉ APS của em đây. Nhớ nộp kèm hồ sơ xin đại học và visa nhé. Viel Erfolg!', 'Here is your APS certificate. Include it with your university and visa applications. Viel Erfolg!'),
      },
    },
  },
}
