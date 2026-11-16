import { formatMoney } from '../../i18n/format'
import type { Localized } from '../../i18n/localized'
import { CONFIG } from '../config'
import type { DialogueDef } from '../dialogueTypes'
import { VISA_DOCS } from '../visa'
import { nextApsRound } from '../../game/systems/visa'
import { dateLabel } from '../../game/systems/say'

/**
 * The visa offices at the west end of Phố Hàng Gai (1.13): photo studio, notary, bank, APS.
 * The work happens in systems/visa.ts actions (visa.photo, visa.notary, bank.exchange,
 * aps.interview); results are told by toasts. Story 2.1: no proof of funds at the bank any more.
 */

const L = (vi: string, en: string, de?: string): Localized => ({ vi, en, de })
const BYE = L('Dạ em cảm ơn ạ.', 'Thank you!', 'Danke!')
const OPEN = CONFIG.visa.officeHours
const closed = (vi: string, en: string): DialogueDef['nodes'][string] => ({
  text: L(`${vi} Giờ làm việc ${OPEN[0]}h–${OPEN[1]}h, em bấm đồng hồ để chờ nhé.`, `${en} Open ${OPEN[0]}:00–${OPEN[1]}:00 — tap the clock to wait.`),
})

/** Translation + notary fee for the ten pages (story 2.1: 1.500.000 ₫). */
function notaryCost() {
  const step = VISA_DOCS.find((d) => d.id === 'diploma')?.steps[0]
  return typeof step?.cost === 'number' ? step.cost : 0
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
          { text: L('Chụp ảnh thẻ visa', 'Take visa photos', 'Passbilder machen'), cost: 100_000, effect: { type: 'action', id: 'visa.photo' }, next: 'done' },
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
          L('Em muốn dịch thuật công chứng bằng THPT, học bạ với giấy khai sinh à? Phải mang bản gốc đến thì cô mới đóng dấu được.', 'You want your diploma, school records and birth certificate translated and notarized? I need the originals to stamp them.'),
          L('Bản gốc chắc để ở nhà, trong tủ giấy tờ ấy. Em về lấy rồi quay lại nhé.', 'The originals are probably at home, in the paper cabinet. Fetch them and come back.'),
        ],
      },
      notary: {
        text: L('Cô dịch sang tiếng Đức rồi công chứng bằng THPT, học bạ ba năm và giấy khai sinh. Mười trang, tổng {fee}. Em đi về rồi chiều quay lại lấy, mất khoảng bốn tiếng.', 'I’ll translate the diploma, three years of school records and the birth certificate into German and notarize them. Ten pages, {fee} in total. Come back in the afternoon — about four hours.'),
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
      rate: formatMoney(CONFIG.visa.eurBuy, 'VND'),
      sell: formatMoney(CONFIG.visa.eurSell, 'VND'),
    }),
    start: [{ if: { not: { test: 'office.open' } }, node: 'closed' }, { node: 'hello' }],
    nodes: {
      closed: closed('Ngân hàng đóng cửa rồi em, mai quay lại nhé.', 'The bank is closed — come back tomorrow.'),
      hello: {
        text: L('Chào em, anh là Quân. Anh giúp gì được cho em?', 'Hello, I’m Quân. How can I help?'),
        choices: [
          { text: L('Học nghề có cần chứng minh tài chính không anh?', 'Do I need proof of funds for training?', 'Brauche ich einen Finanzierungsnachweis?'), next: 'finance' },
          { text: L('Đổi tiền Việt sang Euro', 'Change đồng into euros', 'Dong in Euro tauschen'), if: { country: 'vn' }, next: 'exchange' },
          { text: L('Đổi hết Euro về tiền Việt', 'Change all my euros into đồng', 'Alle Euro in Dong tauschen'), if: { test: 'wallet.hasOther' }, effect: { type: 'action', id: 'bank.exchangeBack' } },
          { text: L('Tỷ giá hôm nay thế nào ạ?', 'What’s today’s rate?', 'Wie ist der Kurs?'), next: 'rate' },
          { text: BYE },
        ],
      },
      finance: {
        text: L(
          'Học nghề có lương trên 1.048 € trước thuế thì không cần đâu em. Còn du học thì phải mở Sperrkonto 11.904 €, gần ba trăm bảy mươi triệu, hoặc có người ở Đức bảo lãnh.',
          'Paid training above €1,048 gross a month needs no proof. University needs a blocked account of €11,904 — almost 375 million đồng — or a guarantor in Germany.',
        ),
        next: 'hello',
      },
      exchange: {
        text: L('Đổi bao nhiêu em? Hôm nay ngân hàng bán Euro giá 1 € = {rate}, mua lại giá {sell}. Sang Đức thì tiêu bằng Euro, còn tiền Việt vẫn nằm trong ví của em. Tuần đầu bên đó cần ít nhất khoảng 600 € đấy.', 'How much? Today the bank sells €1 for {rate} and buys it back for {sell}. In Germany you pay in euros; your đồng stay in your wallet. You’ll need at least about €600 for the first week.'),
        choices: [
          { text: L('Mua 100 € (3.150.000 ₫)', 'Buy €100 (3,150,000 ₫)', '100 € kaufen'), effect: { type: 'action', id: 'bank.exchange', arg: '3150000' } },
          { text: L('Mua 300 € (9.450.000 ₫)', 'Buy €300 (9,450,000 ₫)', '300 € kaufen'), effect: { type: 'action', id: 'bank.exchange', arg: '9450000' } },
          { text: L('Mua 600 € (18.900.000 ₫)', 'Buy €600 (18,900,000 ₫)', '600 € kaufen'), effect: { type: 'action', id: 'bank.exchange', arg: '18900000' } },
          { text: L('Đổi hết tiền Việt', 'Change all my đồng', 'Alles tauschen'), effect: { type: 'action', id: 'bank.exchange', arg: 'all' } },
          { text: L('Thôi để sau ạ', 'Not now', 'Später') },
        ],
      },
      rate: {
        text: L('Ngân hàng bán 1 € = {rate}, mua lại 1 € = {sell}. Đổi đi đổi lại là mất tiền chênh lệch đấy, tính kỹ rồi hẵng đổi.', 'The bank sells €1 for {rate} and buys it back for {sell}. Changing back and forth loses money — plan it.'),
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
      { if: { all: [{ test: 'visa.apsPaid' }, { test: 'visa.apsRoundToday' }] }, node: 'ready' },
      { if: { test: 'visa.apsPaid' }, node: 'wait' },
      { node: 'hello' },
    ],
    vars: () => ({ next: dateLabel(nextApsRound()) }),
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
          { text: L('Nộp hồ sơ APS', 'Hand in my APS file', 'APS-Unterlagen abgeben'), cost: 3_600_000, effect: { type: 'action', id: 'aps.interview' } },
          { text: L('Khi nào có đợt phỏng vấn ạ?', 'When are the interview rounds?', 'Wann sind die Interviewrunden?'), next: 'rounds' },
          { text: L('Phỏng vấn hỏi những gì ạ?', 'What does the interview ask?', 'Was wird gefragt?'), next: 'tips' },
          { text: L('Để em chuẩn bị thêm', 'I’ll prepare a bit more', 'Ich bereite mich vor') },
        ],
      },
      rounds: {
        text: L('Chúng tôi chỉ phỏng vấn theo đợt, hai tuần một lần. Đợt tiếp theo: {next}. Lỡ đợt thì chờ đợt sau nhé.', 'We interview in rounds, every two weeks. Next round: {next}. Miss it and you wait for the following one.'),
        next: 'hello',
      },
      tips: {
        text: [
          L('Giới thiệu bản thân, các môn lớp 12, môn em thích, một kiến thức cụ thể — ví dụ định luật Ôm hay đạo hàm —, điểm tốt nghiệp và ngành em muốn học.', 'Introduce yourself, your year-12 subjects, your favourite one, something concrete you learned — Ohm’s law or derivatives, say —, your final grade and what you want to study.'),
          L('Trả lời bằng tiếng Đức, thật thà. Khai sai học bạ là trượt ngay, không có lần hai đâu!', 'Answer in German, honestly. Faking your records means instant failure!'),
        ],
        next: 'hello',
      },
      wait: {
        text: L('Hồ sơ của em đã nộp rồi. Hôm nay không có đợt phỏng vấn, đợt tiếp theo là {next}.', 'Your file is in. No interviews today — the next round is {next}.'),
      },
      ready: {
        text: L('Hôm nay có đợt phỏng vấn. Hồ sơ của em đã nộp. Mời em vào phòng nhé. Bereit?', 'Interview round today, and your file is in. Please come in. Ready?'),
        choices: [
          { text: L('Bắt đầu phỏng vấn', 'Start the interview', 'Interview beginnen'), effect: { type: 'action', id: 'aps.interview' } },
          { text: L('Cho em ôn thêm chút', 'Let me revise a little', 'Ich wiederhole noch') },
        ],
      },
      tomorrow: {
        text: L('Hôm nay em chưa đạt. Ôn lại kiến thức các môn rồi chờ đợt sau ({next}) nhé.', 'You didn’t pass today. Revise and come back for the next round ({next}).'),
      },
      done: {
        text: L('Chứng chỉ APS của em đây. Nhớ nộp kèm hồ sơ xin đại học và visa nhé. Viel Erfolg!', 'Here is your APS certificate. Include it with your university and visa applications. Viel Erfolg!'),
      },
    },
  },
}
