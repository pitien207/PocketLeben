import type { Localized } from '../i18n/localized'
import type { Condition } from './conditions'

/**
 * Narration between the quests: a card at the start of every chapter (systems/story.ts
 * shows it once), and the epilogue lines on the ending card (only those whose condition
 * holds, so the ending tells *your* story).
 */

const L = (vi: string, en: string, de?: string): Localized => ({ vi, en, de })

export interface ChapterIntro {
  /** Big emoji / scene at the top of the card. */
  icon: string
  text: Localized
  quote?: Localized
}

export const CHAPTER_INTROS: Record<number, ChapterIntro> = {
  1: {
    icon: '🏮',
    text: L(
      'Bạn 20 tuổi, sống cùng bố mẹ và em gái Na trong căn nhà ống vàng ở phố Hàng Gai. Trên tường phòng bạn dán một tấm bản đồ nước Đức cắt từ tạp chí cũ, chi chít những chấm bút đỏ: Berlin, München, Hamburg, Leipzig… Bạn muốn sang đó đi làm, gửi tiền về sửa lại mái nhà dột, và một ngày được tự mình đứng ở những chấm đỏ ấy. Bố mẹ không giàu, nhưng tin bạn. Trong ví có ba triệu, trong đầu có một chữ "Guten Tag". Bước đầu tiên: học tiếng Đức ở trung tâm của Thầy Minh trong ngõ, và kiếm đủ tiền để học tiếp.',
      'You are 20, living with your parents and your little sister Na in the yellow tube house on Hàng Gai street. On your wall hangs a map of Germany cut from an old magazine, covered in red dots: Berlin, Munich, Hamburg, Leipzig… You want to work there, send money home to fix the leaking roof, and one day stand on those red dots yourself. Your parents aren’t rich, but they believe in you. Three million đồng in your wallet, one “Guten Tag” in your head. Step one: learn German at Teacher Minh’s centre in the lane — and earn enough to keep going.',
    ),
    quote: L('"Đi một ngày đàng, học một sàng khôn."', '"Travel a day, gain a basket of wisdom."'),
  },
  2: {
    icon: '🛂',
    text: L(
      'Tờ chứng chỉ B1 vẫn còn thơm mùi mực. Giờ là chặng khó nhất: chọn con đường, gom từng tờ giấy, điền từng ô trên Auslandsportal, săn từng cái Termin. Chị Mai bảo: "Hồ sơ đẹp thì visa mới đẹp." Bố thì bảo: "Cần bao nhiêu, nói bố."',
      'Your B1 certificate still smells of fresh ink. Now comes the hardest part: choose your path, gather every paper, fill in every box on the Auslandsportal, hunt every Termin. Mai says: "A neat file makes a happy visa." Dad says: "If you need money, tell me."',
    ),
    quote: L('"Kiến tha lâu cũng đầy tổ."', '"Little by little, the ant fills its nest."'),
  },
  3: {
    icon: '✈️',
    text: L(
      'Mười hai tiếng bay. Cửa máy bay mở ra, không khí lạnh và lạ. Không còn tiếng còi xe máy, không còn trà đá vỉa hè. Lindenstraße đón bạn bằng hàng cây đoạn, chiếc tram màu vàng và một núi giấy tờ mới: phòng ở, Anmeldung, ngân hàng, bảo hiểm.',
      'Twelve hours in the air. The plane door opens onto cold, unfamiliar air. No more scooter horns, no more sidewalk iced tea. Lindenstraße greets you with linden trees, a yellow tram and a new mountain of paperwork: a room, Anmeldung, a bank, insurance.',
    ),
    quote: L('"Aller Anfang ist schwer." — Mọi khởi đầu đều khó.', '"Aller Anfang ist schwer." — Every beginning is hard.'),
  },
  4: {
    icon: '🩺',
    text: L(
      'Giấy tờ xong rồi, giờ mới là học thật. Ở viện dưỡng lão Sonnenhof, các cụ gọi bạn bằng cái tên phát âm sai đáng yêu. Có hôm mệt rã rời, có hôm muốn bỏ cuộc. Nhưng mỗi tối gọi về nhà, mẹ lại hỏi: "Hôm nay con giúp được ai chưa?"',
      'The paperwork is done — now the real learning begins. At the Sonnenhof care home the residents mispronounce your name in the sweetest way. Some days you’re exhausted, some days you want to quit. But every evening on the phone Mum asks: "Did you help someone today?"',
    ),
    quote: L('"Schritt für Schritt." — Từng bước một.', '"Schritt für Schritt." — Step by step.'),
  },
  5: {
    icon: '🏡',
    text: L(
      'Bạn đã là điều dưỡng chính thức. Lương đủ để gửi về nhà, để dành, để nghĩ tới những điều lớn hơn: một chuyến về ăn Tết, một căn hộ của riêng mình, và một ngày được gọi nơi này là nhà.',
      'You are a qualified nurse now. Your pay is enough to send money home, to save, to think bigger: a trip home for Tết, a flat of your own, and one day calling this place home.',
    ),
    quote: L('"Lá rụng về cội" — nhưng cây cũng có thể mọc rễ ở nơi mới.', '"Leaves fall back to the roots" — but a tree can also grow roots somewhere new.'),
  },
}

/** Ending card: the story of *your* journey (each line only if its condition holds). */
export const EPILOGUE: { if: Condition; text: Localized }[] = [
  {
    if: { flag: 'visa.path', is: 'studium' },
    text: L('🎓 Bạn đã đi con đường đại học: cử nhân điều dưỡng ở München, vừa học vừa làm Werkstudent.', '🎓 You took the university path: a nursing Bachelor’s in München, studying and working as a Werkstudent.'),
  },
  {
    if: { not: { flag: 'visa.path', is: 'studium' } },
    text: L('🩺 Bạn đã đi con đường học nghề: ba năm Ausbildung ở Sonnenhof, từ học viên thành Pflegefachkraft.', '🩺 You took the training path: three years of Ausbildung at Sonnenhof, from trainee to qualified nurse.'),
  },
  // Story 2.1: the yellow house and the people from Hà Nội
  {
    if: { all: [{ flag: 'debt.everLevel3' }, { not: { test: 'family.inDebt' } }] },
    text: L('🏠 Có lúc căn nhà vàng ở Hàng Gai mất cả tivi lẫn chiếc xe Wave của bố. Bạn đã trả hết từng đồng — giờ đồng hồ lại tích tắc trên tường.', '🏠 There was a time the yellow house lost its TV and Dad’s Wave. You paid back every đồng — the clock ticks on the wall again.'),
  },
  {
    if: { flag: 'cauNoi.signed' },
    text: L('🤝 Chương trình Cầu nối Sonnenhof đã đưa bạn sang Đức; hai năm làm việc ở Sonnenhof hóa ra là hai năm đẹp nhất.', '🤝 The Sonnenhof bridge programme brought you to Germany; your two years at Sonnenhof turned out to be the best ones.'),
  },
  {
    if: { flag: 'lan.sponsor' },
    text: L('📮 Cô Lan ở Leipzig đã bảo lãnh cho bạn. Bạn gửi chú Hưng tấm bưu thiếp từ đúng thành phố năm 1989 ấy.', '📮 Cô Lan in Leipzig vouched for you. You sent chú Hưng a postcard from that very city of 1989.'),
  },
  {
    if: { flag: 'gerda.friend' },
    text: L('👵 Chủ nhật nào bạn cũng uống Kaffee với Bà Gerda bên hồ vịt. Ở Đức, bạn có thêm một người bà.', '👵 Every Sunday you have Kaffee with Oma Gerda by the duck pond. In Germany, you gained a grandmother.'),
  },
  {
    if: { flag: 'trip.reunion' },
    text: L('🧧 Cái Tết đoàn viên năm ấy, cả nhà ngồi quanh nồi bánh chưng nghe bạn kể chuyện nước Đức đến tận khuya.', '🧧 That Tết reunion, the family sat around the bánh chưng pot listening to your Germany stories until late.'),
  },
  {
    if: { flag: 'story.leipzig' },
    text: L('📖 Chú Hưng hiệu sách cũ đã đi trước bạn 35 năm. Bạn hứa sẽ gửi chú một tấm bưu thiếp từ Leipzig.', '📖 Uncle Hưng of the old bookshop walked this road 35 years before you. You promised to send him a postcard from Leipzig.'),
  },
  {
    if: { flag: 'secret.all' },
    text: L('🗝️ Không góc phố nào giấu được bạn — từ con mèo trong ngõ Hàng Gai đến chú nhím Herbert ở Stadtpark.', '🗝️ No corner could hide from you — from the alley cat of Hàng Gai to Herbert the hedgehog in the Stadtpark.'),
  },
  {
    if: { flag: 'cz.granted' },
    text: L('🇩🇪 Và rồi bạn cầm trên tay tấm hộ chiếu Đức — nhưng câu đầu tiên bạn nói khi về nhà vẫn là "Con chào bố mẹ ạ!"', '🇩🇪 And then you held a German passport — but the first thing you said back home was still "Con chào bố mẹ ạ!"'),
  },
]
