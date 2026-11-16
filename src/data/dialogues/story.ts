import type { Localized } from '../../i18n/localized'
import { formatMoney } from '../../i18n/format'
import { CONFIG } from '../config'
import type { DialogueDef } from '../dialogueTypes'

/**
 * Street characters of the Vietnam story (xe ôm, phở, pharmacy, tailor, clothes stall, barber).
 * Thầy Minh, chị Mai, the embassy officer and the family moved to vn21.ts (story 2.1).
 */

const L = (vi: string, en: string, de?: string): Localized => ({ vi, en, de })

export const STORY_DIALOGUES: Record<string, DialogueDef> = {
  xeOm: {
    vars: () => ({ fare: formatMoney(CONFIG.visa.xeOmFare) }),
    start: 'hello',
    nodes: {
      hello: {
        text: [
          L('Đi đâu em? {fare} một cuốc, đi nhanh như gió!', 'Where to? {fare} a ride, fast as the wind!'),
          L('Xe ôm đây! Đi đâu anh chở, đường nào anh cũng thuộc.', 'Motorbike taxi! I know every road in town.'),
        ],
        choices: [
          { text: L('Đại sứ quán Đức', 'German Embassy'), if: { flag: 'visa.path' }, cost: CONFIG.visa.xeOmFare, effect: { type: 'action', id: 'xeOm.embassy' } },
          { text: L('Sân bay Nội Bài', 'Nội Bài Airport'), if: { flag: 'visa.readyDay' }, cost: CONFIG.visa.xeOmFare, effect: { type: 'action', id: 'xeOm.airport' } },
          { text: L('Anh kể chuyện gì vui đi', 'Tell me something fun'), next: 'story' },
          { text: L('Dạ thôi anh.', 'Not now.') },
        ],
      },
      story: {
        text: [
          L('Hôm qua anh chở một ông Tây, ông ấy cứ nói „Danke" mãi, anh tưởng ông ấy kêu „đắng"!', 'Yesterday a foreigner kept saying “Danke” — I thought he said “đắng” (bitter)!'),
          L('Tắc đường giờ cao điểm thì anh len vào ngõ, ngõ nào anh cũng thuộc.', 'At rush hour I take the alleys — I know them all.'),
          L('Em sang Đức nhớ gửi anh cái ảnh tuyết nhé, anh chưa thấy tuyết bao giờ.', 'Send me a photo of snow from Germany — I’ve never seen it.'),
        ],
        next: 'hello',
      },
    },
  },

  bacPho: {
    start: 'hello',
    nodes: {
      hello: {
        text: [
          { vi: 'Phở đây! Nước dùng bác ninh từ 3 giờ sáng, xương bò với quế, hồi, gừng nướng. Ăn một bát nhé?', en: 'Phở here! I’ve simmered the broth since 3 a.m. — beef bones, cinnamon, star anise, charred ginger. A bowl?', de: 'Phở! Die Brühe köchelt seit 3 Uhr früh. Eine Schüssel?' },
          { vi: 'Sáng ăn bát phở là cả ngày có sức học tiếng Đức!', en: 'A bowl of phở in the morning and you can study German all day!', de: 'Eine Schüssel Phở am Morgen, und du lernst den ganzen Tag Deutsch!' },
        ],
        choices: [
          { text: { vi: 'Một bát phở bò, ăn tại chỗ', en: 'One beef phở, to eat here', de: 'Eine Rinder-Phở, hier essen' }, cost: 55_000, effect: { type: 'buy', itemId: 'pho', use: true } },
          { text: { vi: 'Gói mang đi', en: 'To take away', de: 'Zum Mitnehmen' }, cost: 55_000, effect: { type: 'buy', itemId: 'pho', use: false } },
          { text: { vi: 'Dạ thôi bác.', en: 'No thanks.', de: 'Nein, danke.' } },
        ],
      },
    },
  },

  coThuoc: {
    start: 'hello',
    nodes: {
      hello: {
        text: { vi: 'Học khuya mỏi cổ hả cháu? Lọ dầu gió này xoa vào là tỉnh ngay. Sang Đức nhớ mang theo vài lọ!', en: 'Stiff neck from studying late? Rub on some medicated oil and you’re wide awake. Take a few bottles to Germany!', de: 'Nacken steif vom Lernen? Ein bisschen Heilöl, und du bist wach!' },
        choices: [
          { text: { vi: 'Mua một lọ dầu gió', en: 'Buy a bottle of medicated oil', de: 'Ein Fläschchen Heilöl' }, cost: 30_000, effect: { type: 'buy', itemId: 'dauGio', use: false } },
          { text: { vi: 'Dạ cháu cảm ơn cô.', en: 'Thank you.', de: 'Danke.' } },
        ],
      },
    },
  },

  coMay: {
    start: 'hello',
    nodes: {
      hello: {
        text: { vi: 'Cháu ơi, may một bộ áo dài mặc ngày tốt nghiệp hay ngày bay sang Đức đi! Cô đo cho vừa in.', en: 'Have an áo dài made for your graduation or your flight to Germany! I’ll measure you perfectly.', de: 'Lass dir ein Áo dài für den Abschluss oder den Flug nach Deutschland nähen!' },
        choices: [
          { text: { vi: 'Xem áo dài', en: 'Show me the áo dài', de: 'Áo dài ansehen' }, effect: { type: 'action', id: 'clothes.open', arg: 'tailor' } },
          { text: { vi: 'Dạ để lúc khác ạ.', en: 'Maybe later.', de: 'Vielleicht später.' } },
        ],
      },
    },
  },

  chiHang: {
    start: 'hello',
    nodes: {
      hello: {
        text: L('Quần áo mới về đây em! Mặc vào là xinh ngay, sang Đức cũng không lo!', 'New clothes just in! Look great — even in Germany.'),
        choices: [
          { text: L('Cho em xem đồ', 'Show me'), effect: { type: 'action', id: 'clothes.open', arg: 'vnClothes' } },
          { text: L('Dạ thôi chị.', 'No thanks.') },
        ],
      },
    },
  },

  chuSau: {
    start: 'hello',
    nodes: {
      hello: {
        text: L('Cắt tóc không cháu? Chú cắt ở vỉa hè này ba mươi năm rồi, đẹp như ca sĩ!', 'Haircut? I’ve cut hair on this corner for thirty years — you’ll look like a pop star!'),
        choices: [
          { text: L('Cho cháu xem kiểu tóc', 'Show me the styles'), effect: { type: 'action', id: 'clothes.open', arg: 'barber' } },
          { text: L('Dạ để hôm khác chú ạ.', 'Another day.') },
        ],
      },
    },
  },
}
