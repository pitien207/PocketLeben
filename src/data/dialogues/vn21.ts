import { germanVars } from '../../game/systems/german'
import { laptopFlightPrice } from '../../game/systems/visa'
import { teaBanLeft, teaStrikes } from '../../game/systems/jobs'
import { formatMoney } from '../../i18n/format'
import type { Localized } from '../../i18n/localized'
import type { Condition } from '../conditions'
import { CONFIG } from '../config'
import type { DialogueChoice, DialogueDef } from '../dialogueTypes'

/**
 * Story 2.1 (Vietnam part): the family (borrowing, the house, Na), Thầy Minh, chị Mai's office
 * (Mai, Tuấn, cô Thoa), the Sonnenhof bridge programme, Linh and Hoàng Kim, Circle K, VFS, the
 * airport goodbye and scam text messages. These override the older lines in story.ts.
 */

const L = (vi: string, en: string, de?: string): Localized => ({ vi, en, de })
const vnd = (n: number) => formatMoney(n, 'VND')
const F = CONFIG.family
const V = CONFIG.visa

/** Borrow choices with a reaction that depends on how often you already asked. */
function borrowChoices(who: 'bo' | 'me', first: string, often: string, normal: string, oftenWhen: Condition): DialogueChoice[] {
  const out: DialogueChoice[] = []
  for (const amount of F.loanSizes) {
    const label = L(`${who === 'bo' ? 'Bố' : 'Mẹ'} cho con vay ${amount / 1_000_000} triệu`, `Borrow ${amount / 1_000_000} million`, `${amount / 1_000_000} Mio. leihen`)
    const effect = { type: 'action' as const, id: 'family.borrow', arg: `${who}:${amount}` }
    const can: Condition = { test: 'family.canBorrow' }
    out.push({ text: label, if: { all: [can, { noFlag: `debt.count.${who}` }] }, effect, next: first })
    out.push({ text: label, if: { all: [can, { flag: `debt.count.${who}` }, oftenWhen] }, effect, next: often })
    out.push({ text: label, if: { all: [can, { flag: `debt.count.${who}` }, { not: oftenWhen }] }, effect, next: normal })
  }
  return out
}

const AIRPORT: Condition = { scene: 'airport' }
const HOME_EVENING: Condition = { all: [{ scene: 'home' }, { test: 'family.evening' }] }

export const VN21_DIALOGUES: Record<string, DialogueDef> = {
  // ------------------------------------------------------------------------------------- Family
  bo: {
    vars: () => ({ uniform: vnd(CONFIG.vnJobs.grab.uniform) }),
    start: [
      { if: { all: [{ flag: 'trip.away' }, { noFlag: 'trip.reunion' }] }, node: 'tet' },
      { if: { flag: 'trip.away' }, node: 'stay' },
      { if: AIRPORT, node: 'airport' },
      { if: { all: [{ test: 'family.meetingDue' }, HOME_EVENING, { not: { flag: 'sperr.lan' } }] }, node: 'meeting' },
      { if: { all: [{ germanLevel: 1 }, { noFlag: 'bo.approved' }] }, node: 'approve' },
      { if: { all: [{ not: { germanLevel: 1 } }, { noFlag: 'bo.doubt' }] }, node: 'doubt' },
      { if: { test: 'family.mortgaged' }, node: 'altar' },
      { if: { test: 'family.level2' }, node: 'helloSad' },
      { node: 'hello' },
    ],
    nodes: {
      doubt: {
        text: L('Con đi xa thế, ốm đau ai lo? … Thôi, học đi. Đậu A1 rồi bố tính.', 'So far away — who looks after you if you fall ill? … Fine, study. Pass A1, then we’ll see.'),
        choices: [{ text: L('Dạ, con sẽ cố ạ.', 'I’ll do my best.'), effect: { type: 'setFlag', key: 'bo.doubt', value: true } }],
      },
      approve: {
        text: L('Bố xem bảng điểm rồi. Được. Bố không nói nữa.', 'I saw your certificate. Good. I won’t say any more.'),
        choices: [{ text: L('Con cảm ơn bố!', 'Thank you, Dad!'), effect: { type: 'setFlag', key: 'bo.approved', value: true }, next: 'hello' }],
      },
      hello: {
        text: [
          L('Học hành chăm chỉ vào con. Bố tin con làm được!', 'Study hard. I believe in you!'),
          L('Tiếng Đức khó lắm hả con? Hồi xưa bố học tiếng Nga cũng vất vả lắm.', 'Is German hard? Back in my day Russian was tough too.'),
          L('Cần bao nhiêu, nói bố.', 'If you need money, tell me.'),
        ],
        choices: [
          ...borrowChoices('bo', 'lentFirst', 'lentTired', 'lent', { flag: 'debt.count.bo', atLeast: 2 }),
          { text: L('Bố cho con mượn xe Wave chạy Grab nhé?', 'Can I borrow your Wave to drive for Grab?'), if: { all: [{ noFlag: 'job.grab' }, { not: { test: 'family.waveSold' } }] }, next: 'grab' },
          { text: L('Dạ, con đi đây.', 'Okay, I’m off.') },
        ],
      },
      helloSad: {
        text: [
          L('… (Bố ngồi ngoài hiên đến khuya, không nói gì.)', '… (Dad sits on the porch late into the night, saying nothing.)'),
          L('Bố không sao. Con lo học đi.', 'I’m fine. You focus on studying.'),
        ],
        choices: [...borrowChoices('bo', 'lentFirst', 'lentTired', 'lent', { flag: 'debt.count.bo', atLeast: 2 }), { text: L('Dạ…', 'Okay…') }],
      },
      altar: {
        text: L('(Bố ngồi một mình trước bàn thờ. Khung sổ đỏ trong tủ kính trống trơn.) … Con cứ yên tâm mà đi.', '(Dad sits alone before the altar. The frame for the land certificate is empty.) … Go with peace of mind.'),
        choices: [{ text: L('Con sẽ trả hết cho bố mẹ.', 'I’ll pay it all back.'), effect: { type: 'mood', amount: 2 } }],
      },
      lentFirst: { text: L('Bao nhiêu? … Ừ. Học cho tử tế vào. (Bố không nhìn bạn.)', 'How much? … Fine. Study properly. (He doesn’t look at you.)') },
      lent: { text: L('Ừ, cầm lấy. Tiêu cho cẩn thận.', 'Here. Spend it carefully.') },
      lentTired: { text: L('Tháng này bố chưa trả được tiền điện… Thôi, cầm đi.', 'I haven’t paid the electricity bill this month… Never mind, take it.') },
      grab: {
        text: L('Xe của bố đấy, đi cẩn thận. Mang theo bằng lái, giấy tờ xe, mua cái áo với mũ đồng phục cho đàng hoàng ({uniform}).', 'It’s my bike, ride carefully. Take your licence and the papers, and buy a proper uniform and helmet ({uniform}).'),
        choices: [
          { text: L('Đăng ký tài xế Grab', 'Register as a Grab driver'), cost: CONFIG.vnJobs.grab.uniform, effect: { type: 'action', id: 'job.grabRegister' } },
          { text: L('Để sau ạ', 'Later') },
        ],
      },
      // Studium: the family meeting about the blocked account (story 2.1 §2.2)
      meeting: {
        text: L('(Cả nhà ngồi quanh mâm cơm. Bố bật đèn bàn thờ, lấy ra một phong bì.) Ba trăm bảy mươi triệu. Nhà mình không có ngần ấy tiền mặt. Có hai cách.', '(The family sits around dinner. Dad switches on the altar light and takes out an envelope.) Three hundred and seventy million. We don’t have that in cash. There are two ways.'),
        choices: [
          { text: L('A. Thế chấp sổ đỏ căn nhà', 'A. Mortgage the house (sổ đỏ)'), next: 'mortgage' },
          { text: L('B. Nhờ cô Lan ở Leipzig bảo lãnh', 'B. Ask cô Lan in Leipzig to vouch for me'), if: { flag: 'lan.letter' }, effect: { type: 'action', id: 'family.askLan' }, next: 'lanOk' },
          { text: L('B. Nhờ người quen ở Đức?', 'B. Ask someone we know in Germany?'), if: { noFlag: 'lan.letter' }, next: 'noContact' },
          { text: L('C. Con đổi sang học nghề (Ausbildung)', 'C. I’ll switch to vocational training'), effect: { type: 'action', id: 'family.toAusbildung' }, next: 'switched' },
          { text: L('Để con nghĩ thêm', 'Let me think') },
        ],
      },
      mortgage: {
        text: L('Cái nhà này là của ông bà để lại… (Mẹ lặng im.) Thôi. Vì tương lai của con.', 'This house came from your grandparents… (Mum stays silent.) Well. For your future.'),
        choices: [
          { text: L('Vâng. Con cảm ơn bố mẹ. Con sẽ trả hết.', 'Yes. Thank you. I’ll pay it all back.'), effect: { type: 'action', id: 'family.mortgage' } },
          { text: L('Khoan đã, để con nghĩ thêm', 'Wait, let me think'), next: 'meeting' },
        ],
      },
      lanOk: { text: L('Ông Toàn… bố có nghe chú Hưng kể. Con viết thư cho cô ấy đi, bằng tiếng Đức cho tử tế. (Bàn học ở nhà.)', 'Mr Toàn… I’ve heard chú Hưng talk about him. Write to her — in proper German. (Your desk at home.)') },
      noContact: {
        text: L('Nhà mình có quen ai bên Đức đâu con… (Hình như chú Hưng hiệu sách cũ có bạn ở Leipzig?)', 'We don’t know anyone in Germany… (Doesn’t chú Hưng at the old bookshop have a friend in Leipzig?)'),
        next: 'meeting',
      },
      switched: { text: L('Học nghề có lương, không cần Sperrkonto. Bố thấy cũng tốt.', 'Paid training, no blocked account. That sounds good to me.') },
      airport: {
        text: L('(Bố đứng sau mẹ, dúi vào tay bạn một phong bì nữa.) Đừng nói với mẹ.', '(Dad stands behind Mum and slips you another envelope.) Don’t tell your mother.'),
        choices: [{ text: L('Con thương bố.', 'I love you, Dad.'), effect: { type: 'mood', amount: 5 } }],
      },
      tet: {
        text: L('Con về rồi! Cả nhà chờ con mãi. Bánh chưng mẹ gói từ hôm qua, hoa đào bố mua sáng nay đấy!', 'You’re home! We’ve been waiting. Mum wrapped bánh chưng yesterday and I bought peach blossoms this morning!'),
        choices: [{ text: L('Chúc bố mẹ năm mới an khang thịnh vượng!', 'Happy New Year — health and prosperity!'), effect: { type: 'setFlag', key: 'trip.reunion', value: true }, next: 'proud' }],
      },
      proud: {
        text: L('Con bây giờ là điều dưỡng ở Đức rồi. Hàng xóm ai cũng hỏi thăm, bố mẹ tự hào lắm. Nhớ lì xì em Na nhé!', 'You’re a nurse in Germany now. All the neighbours ask about you — we’re so proud. Don’t forget lucky money for Na!'),
        choices: [
          { text: L('Lì xì cho Na', 'Lucky money for Na'), cost: 20, effect: { type: 'action', id: 'trip.lixi' } },
          { text: L('Con thương bố mẹ!', 'I love you both!'), effect: { type: 'mood', amount: 10 } },
        ],
      },
      stay: {
        text: [
          L('Ở chơi thêm đi con. Khi nào bay thì ra cửa, bố chở ra sân bay.', 'Stay a little longer. When it’s time to fly, head for the door and I’ll drive you to the airport.'),
          L('Ăn thêm miếng bánh chưng nữa đi. Sang đó làm gì có!', 'Have another piece of bánh chưng. You won’t find that over there!'),
        ],
        choices: [
          { text: L('Lì xì cho Na', 'Lucky money for Na'), cost: 20, effect: { type: 'action', id: 'trip.lixi' } },
          { text: L('Dạ.', 'Okay.') },
        ],
      },
    },
  },

  me: {
    vars: () => ({ c1: vnd(F.contributions[0]), c2: vnd(F.contributions[1]) }),
    start: [
      { if: { flag: 'trip.away' }, node: 'tet' },
      { if: AIRPORT, node: 'hello' },
      { if: { test: 'family.level2' }, node: 'homeSad' },
      { node: 'home' },
    ],
    nodes: {
      home: {
        text: [
          L('(Mẹ vừa nấu cơm vừa hát.) Con ăn gì chưa? Mẹ để phần xôi trên bàn đấy.', '(Mum sings while cooking.) Have you eaten? There’s sticky rice for you on the table.'),
          L('Học hành thế nào rồi con? Đừng thức khuya quá.', 'How’s studying going? Don’t stay up too late.'),
        ],
        next: 'menu',
      },
      homeSad: {
        text: L('(Mẹ cười gượng, quầng mắt thâm.) Mẹ không sao đâu. Tối mẹ đi rửa bát thuê thêm cho quán đầu ngõ.', '(Mum smiles faintly, dark circles under her eyes.) I’m fine. In the evenings I wash dishes for the place at the end of the lane.'),
        next: 'menu',
      },
      menu: {
        text: L('Con cần gì?', 'What do you need?'),
        choices: [
          { text: L('Ăn xôi mẹ để phần (+10 năng lượng)', 'Eat Mum’s sticky rice (+10 energy)'), if: { test: 'family.xoiReady' }, effect: { type: 'action', id: 'family.xoi' } },
          ...borrowChoices('me', 'lentFirst', 'lentGold', 'lent', { test: 'family.level2' }),
          { text: L('Con trả mẹ 1 triệu', 'Pay Mum back 1 million'), if: { all: [{ test: 'family.inDebt' }, { money: 1_000_000 }] }, effect: { type: 'action', id: 'family.repay', arg: '1000000' } },
          { text: L('Con trả mẹ 5 triệu', 'Pay Mum back 5 million'), if: { all: [{ test: 'family.inDebt' }, { money: 5_000_000 }] }, effect: { type: 'action', id: 'family.repay', arg: '5000000' } },
          { text: L('Con trả mẹ hết', 'Pay Mum back everything I can'), if: { test: 'family.inDebt' }, effect: { type: 'action', id: 'family.repay', arg: 'all' } },
          { text: L('Góp tiền nhà tuần này ({c1})', 'Chip in for the household this week ({c1})'), if: { test: 'family.canContribute' }, cost: F.contributions[0], effect: { type: 'action', id: 'family.contribute', arg: String(F.contributions[0]) }, next: 'thanks' },
          { text: L('Góp tiền nhà tuần này ({c2})', 'Chip in for the household this week ({c2})'), if: { test: 'family.canContribute' }, cost: F.contributions[1], effect: { type: 'action', id: 'family.contribute', arg: String(F.contributions[1]) }, next: 'thanks' },
          { text: L('Không có gì ạ', 'Nothing') },
        ],
      },
      thanks: { text: L('Con đi làm vất vả thế còn góp tiền cho mẹ… (Mẹ quay đi lau nước mắt.)', 'You work so hard and still give me money… (Mum turns away to wipe her eyes.)') },
      lentFirst: { text: L('Mẹ có ít tiền tiết kiệm trong hũ gạo đây. Con cầm lấy, đừng nói với bố.', 'I have some savings in the rice jar. Take it — don’t tell Dad.') },
      lent: { text: L('Đây con. Tiêu dè thôi nhé.', 'Here. Go easy with it.') },
      lentGold: { text: L('Mẹ bán bớt mấy chỉ vàng hồi cưới rồi. Không sao đâu con.', 'I sold a few rings of gold from my wedding. It’s all right.') },
      // Nội Bài (story 2.1 §2.4)
      hello: {
        text: L('Con đi đường bình an nhé. Nhớ ăn uống đầy đủ, mặc ấm, rảnh thì gọi video về cho mẹ.', 'Take care, my child. Eat well, dress warmly, and video-call me when you can.'),
        next: 'bag',
      },
      bag: {
        text: L('Mẹ có nhét mấy gói mì với chai nước mắm trong vali rồi đó. Bên đó chắc không có đâu!', 'I packed some instant noodles and a bottle of fish sauce in your suitcase. They surely don’t have that there!'),
        choices: [
          { text: L('Con thương mẹ!', 'I love you, Mum!'), effect: { type: 'mood', amount: 10 }, next: 'envelope' },
          { text: L('Mẹ ơi, nước mắm bị cấm mang lên máy bay đó…', 'Mum, fish sauce isn’t allowed on the plane…'), next: 'fishSauce' },
        ],
      },
      fishSauce: {
        text: L('Kệ, mẹ gói kỹ lắm rồi! Đi đi con, đi bình an.', 'Never mind, I wrapped it very well! Go now, travel safely.'),
        next: 'envelope',
      },
      envelope: {
        text: L('(Mẹ dúi vào tay bạn một phong bì: 300 €.) Tiền đi đường, đừng nói với bố.', '(Mum presses an envelope into your hand: €300.) For the journey — don’t tell Dad.'),
        choices: [
          { text: L('Mẹ ơi…', 'Mum…'), if: { noFlag: 'dep.envelopes' }, effect: { type: 'action', id: 'family.envelopes' }, next: 'dad' },
          { text: L('Dạ, con đi đây!', 'Okay, I’m off!'), if: { flag: 'dep.envelopes' } },
        ],
      },
      dad: {
        text: L('(Bố đứng sau, cũng dúi một phong bì nữa: 100 €.) Đừng nói với mẹ.', '(Dad, behind her, slips you another envelope: €100.) Don’t tell your mother.'),
        next: 'na',
      },
      na: {
        text: L('Na: „Anh/chị nhớ gửi ảnh tuyết cho em với anh Tú xe ôm nhé!"', 'Na: “Send me and Tú the xe ôm driver a photo of snow!”'),
        choices: [{ text: L('Nhất định rồi! Cả nhà ở nhà mạnh khỏe nhé.', 'Promise! Stay healthy, everyone.'), effect: { type: 'mood', amount: 10 } }],
      },
      tet: {
        text: [
          L('Con gầy đi rồi! Ăn đi con, mẹ nấu toàn món con thích: nem rán, canh măng, thịt đông.', 'You’ve got thinner! Eat — I cooked all your favourites: spring rolls, bamboo soup, jellied pork.'),
          L('Bên đó lạnh không con? Mẹ đan cho con cái khăn len rồi đấy, mang theo nhé.', 'Is it cold over there? I knitted you a scarf — take it with you.'),
        ],
        choices: [{ text: L('Con nhớ cơm mẹ nấu lắm!', 'I missed your cooking so much!'), effect: { type: 'mood', amount: 10 } }],
      },
    },
  },

  na: {
    start: [
      { if: AIRPORT, node: 'airport' },
      { if: { test: 'family.level3' }, node: 'poor' },
      { if: { test: 'family.naTutorToday' }, node: 'done' },
      { node: 'hello' },
    ],
    nodes: {
      hello: {
        text: [
          L('Anh/chị ơi, kèm em Toán đi! Sắp thi học kỳ rồi mà em chẳng hiểu gì cả.', 'Help me with maths, please! The exams are coming and I understand nothing.'),
          L('Anh/chị học tiếng Đức nghe buồn cười lắm: „Ich bin… ich bin…" 😂', 'Your German sounds so funny: “Ich bin… ich bin…” 😂'),
        ],
        choices: [
          { text: L('Kèm em học Toán (1 tiếng)', 'Help her with maths (1 hour)'), effect: { type: 'action', id: 'family.tutorNa' } },
          { text: L('Để mai nhé', 'Tomorrow') },
        ],
      },
      done: { text: L('Hôm nay em hiểu bài rồi! Mai anh/chị kèm tiếp nha.', 'I got it today! Help me again tomorrow.') },
      poor: {
        text: L('Nhà mình nghèo đi hả anh/chị? … Em nghỉ học thêm rồi, tự học cũng được mà.', 'Are we getting poor? … I stopped my extra classes, I can study on my own.'),
        choices: [
          { text: L('Kèm em học Toán (1 tiếng)', 'Help her with maths (1 hour)'), if: { not: { test: 'family.naTutorToday' } }, effect: { type: 'action', id: 'family.tutorNa' } },
          { text: L('Anh/chị sẽ trả hết nợ cho bố mẹ.', 'I’ll pay Mum and Dad back.'), effect: { type: 'mood', amount: -2 } },
        ],
      },
      airport: { text: L('Anh/chị nhớ gửi ảnh tuyết cho em với anh Tú xe ôm nhé!', 'Send me and Tú a photo of snow!') },
    },
  },

  /** The short scene when you walk into the changed house (story 2.1 §1.8). */
  house: {
    start: [
      { if: { flag: 'house.scene', is: 'mortgage' }, node: 'mortgage' },
      { if: { flag: 'house.scene', is: 'up3' }, node: 'up3' },
      { if: { flag: 'house.scene', is: 'up2' }, node: 'up2' },
      { if: { flag: 'house.scene', is: 'up1' }, node: 'up1' },
      { if: { flag: 'house.scene', is: 'down0' }, node: 'down0' },
      { node: 'down' },
    ],
    nodes: {
      up1: { text: L('(Căn nhà như cũ đi chục tuổi: tường bong sơn, chân tường ẩm mốc, mấy lỗ thủng dán tạm giấy báo. Hóa đơn tiền điện đóng dấu đỏ ghim cạnh tờ lịch, góc nhà xếp mấy thùng mì tôm, cái nồi hứng nước dột. Đĩa ngũ quả trên bàn thờ chỉ còn một quả cam héo. Áo bố mẹ đã phải vá. Mẹ cười gượng, bố ít nói.)', '(The house looks ten years older: peeling paint, damp walls, holes covered with newspaper. Red-stamped electricity bills beside the calendar, boxes of instant noodles in the corner, a pot catching a leak. One wrinkled orange left on the altar. Mum and Dad wear patched clothes. Mum’s smile is forced, Dad says little.)') },
      up2: { text: L('(Chiếc tivi không còn nữa, chỗ cũ chỉ còn vết bụi hình chữ nhật. Tường nứt một vệt dài. Đồng hồ treo tường cũng đã bán. Quần áo vá phơi giăng ngang phòng.)', '(The TV is gone — just a dusty rectangle where it stood. A long crack runs down the wall. The wall clock was sold too.)') },
      up3: { text: L('(Một mảng tường vỡ lộ gạch. Mái dột, giữa nhà có cái xô hứng nước. Xe Wave của bố đã bán. Na hỏi nhỏ: „Nhà mình nghèo đi hả anh/chị?")', '(A chunk of wall has broken off, showing bricks. The roof leaks into a bucket in the middle of the room. Dad’s Wave is sold. Na whispers: “Are we getting poor?”)') },
      mortgage: { text: L('(Cuốn sổ đỏ trong tủ kính biến mất, chỉ còn khung trống. Bố ngồi một mình trước bàn thờ.)', '(The land certificate is gone from the glass case — an empty frame remains. Dad sits alone before the altar.)') },
      down: { text: L('(Nhà đã sửa lại một phần. Bố mẹ nhìn bạn, nhẹ nhõm hơn.)', '(Part of the house has been fixed. Mum and Dad look at you, relieved.)') },
      down0: { text: L('(Bố treo lại đồng hồ lên tường, mẹ cắm hoa tươi lên bàn thờ. Căn nhà vàng lại rộn tiếng cười.)', '(Dad hangs the clock back on the wall, Mum puts fresh flowers on the altar. The yellow house is full of laughter again.)') },
    },
  },

  // ------------------------------------------------------------------------------- Thầy Minh
  thayMinh: {
    vars: germanVars,
    start: [{ if: { germanLevel: 3 }, node: 'graduated' }, { node: 'hello' }],
    nodes: {
      hello: {
        text: [
          L('Chào em! Lớp tiếng Đức của thầy đây. Mục tiêu tiếp theo: {target} ({xp}/{need} XP).', 'Hello! This is my German class. Next goal: {target} ({xp}/{need} XP).'),
          L('Guten Tag! Hôm nay học gì nào? Mục tiêu: {target}, em có {xp}/{need} XP rồi.', 'Guten Tag! What shall we learn today? Goal: {target}, you have {xp}/{need} XP.'),
        ],
        choices: [
          { text: L('Đăng ký khóa {target} ({courseFee})', 'Enrol in the {target} course ({courseFee})'), if: { all: [{ test: 'german.notEnrolled' }, { not: { test: 'german.b1Free' } }] }, effect: { type: 'action', id: 'german.enroll' }, next: 'enrolled' },
          { text: L('Đăng ký khóa B1 (Sonnenhof trả)', 'Enrol in B1 (Sonnenhof pays)'), if: { all: [{ test: 'german.notEnrolled' }, { test: 'german.b1Free' }] }, effect: { type: 'action', id: 'german.enroll' }, next: 'enrolled' },
          { text: L('Thầy ơi, em chưa đủ tiền…', 'Teacher, I don’t have enough money…'), if: { test: 'german.canDefer' }, next: 'defer' },
          { text: L('Trả thầy nốt học phí ({owe})', 'Pay the rest of the fee ({owe})'), if: { test: 'german.owesTeacher' }, effect: { type: 'action', id: 'german.payTeacher' } },
          { text: L('Học một buổi (1 tiếng)', 'Take a lesson (1 hour)'), if: { test: 'german.enrolled' }, effect: { type: 'action', id: 'german.lesson' } },
          { text: L('Thi chứng chỉ {target} ({examFee})', 'Take the {target} exam ({examFee})'), if: { all: [{ test: 'german.examReady' }, { not: { test: 'german.b1Retake' } }] }, effect: { type: 'action', id: 'german.exam' } },
          { text: L('Thi lại {retakeModules} ({retakeFee})', 'Retake {retakeModules} ({retakeFee})'), if: { test: 'german.b1Retake' }, effect: { type: 'action', id: 'german.exam' } },
          { text: L('Thầy ơi, học tiếng Đức có khó không?', 'Is German hard, teacher?'), next: 'tips' },
          { text: L('Dạ em chào thầy ạ.', 'Goodbye, teacher.', 'Auf Wiedersehen!') },
        ],
      },
      defer: {
        text: L('Thiếu bao nhiêu? … Thôi, em đóng trước một nửa ({halfFee}), nửa còn lại cuối tháng. Nhưng chỉ lần này thôi đấy!', 'How much are you short? … All right, pay half now ({halfFee}) and the rest at the end of the month. But only this once!'),
        choices: [
          { text: L('Dạ em đóng trước một nửa', 'I’ll pay half now'), effect: { type: 'action', id: 'german.enrollHalf' }, next: 'enrolled' },
          { text: L('Để em đi làm thêm đã', 'Let me earn some more first') },
        ],
      },
      enrolled: {
        text: L('Tốt lắm! Mỗi buổi học là một trò chơi nhỏ: từ vựng, der/die/das, ghép câu. Đủ XP thì thi nhé.', 'Great! Each lesson is a little game: vocabulary, der/die/das, sentences. Get enough XP, then take the exam.'),
        next: 'hello',
      },
      tips: {
        text: [
          L('Mẹo đây: danh từ giống cái hay có đuôi -ung, -heit, -keit: die Wohnung, die Freiheit.', 'Tip: feminine nouns often end in -ung, -heit, -keit: die Wohnung, die Freiheit.'),
          L('Ở Đức đúng giờ là số một. Trễ 5 phút là… thôi khỏi nói!', 'In Germany punctuality is everything. Five minutes late is… let’s not talk about it!'),
          L('Từ quan trọng nhất ở Đức là „Termin". Không có Termin thì không làm gì được hết!', 'The most important German word is “Termin”. Without one, nothing happens!'),
          L('Tự học cũng được, nhưng đi học với thầy thì nhanh gấp đôi. Trên xe buýt thì mở Nicos Weg trên điện thoại mà học.', 'Self-study works, but class is twice as fast. On the bus, open Nicos Weg on your phone.'),
          L('Das Mädchen là „das" đó em. Đừng hỏi thầy tại sao!', 'It’s “das Mädchen” (the girl). Don’t ask me why!'),
          L('Học phí đóng một lần, nhưng tiếng Đức phải đóng mỗi ngày. Ngày nào không học là ngày đó nợ.', 'You pay the course fee once, but German you pay every day. Every day you skip is a debt.'),
          L('B1 thi bốn kỹ năng: Lesen, Hören, Schreiben, Sprechen. Trượt phần nào thi lại phần đó thôi.', 'B1 has four parts: reading, listening, writing, speaking. Fail one, retake only that one.'),
        ],
        next: 'hello',
      },
      graduated: {
        text: L('Em có B1 rồi! Thầy tự hào lắm. Giờ sang văn phòng tư vấn của chị Mai ở đầu phố Hàng Bông mà hỏi chuyện hồ sơ nhé.', 'You have B1! I’m so proud. Now go to Mai’s advice office at the start of Hàng Bông street and ask about your papers.'),
        choices: [{ text: L('Dạ em cảm ơn thầy ạ!', 'Thank you, teacher!'), effect: { type: 'mood', amount: 5 } }],
      },
    },
  },

  // ---------------------------------------------------------------------- Văn phòng Mai Anh
  chiMai: {
    vars: () => ({ flight: vnd(V.flightCost), laptop: vnd(laptopFlightPrice()) }),
    start: [
      { if: { not: { germanLevel: 2 } }, node: 'early' },
      { if: { all: [{ not: { germanLevel: 3 } }, { noFlag: 'cauNoi.heard' }, { noFlag: 'cauNoi.decided' }] }, node: 'cnIntro' },
      { if: { all: [{ not: { germanLevel: 3 } }, { noFlag: 'cauNoi.decided' }] }, node: 'cnMenu' },
      { if: { not: { germanLevel: 3 } }, node: 'waitB1' },
      { if: { noFlag: 'visa.path' }, node: 'b1' },
      { node: 'helping' },
    ],
    nodes: {
      early: {
        text: L('Chào em! Chị là tư vấn du học Đức đây. Muốn đi Đức thì trước hết phải có tiếng Đức B1 nhé. Em đang học tới đâu rồi?', 'Hi! I advise on studying and training in Germany. First you need German at B1. How far along are you?'),
        choices: [
          { text: L('Studium khác Ausbildung thế nào ạ?', 'How is Studium different from Ausbildung?'), next: 'explain' },
          { text: L('Dạ em đi học tiếp đây ạ.', 'I’ll keep studying.') },
        ],
      },
      waitB1: {
        text: L('Cố lên em, có B1 là chị làm hồ sơ cho em ngay. Nhớ: ai hứa „không cần B1" là nói dối đấy.', 'Keep going — once you have B1 I’ll start your file. Remember: anyone promising “no B1 needed” is lying.'),
        choices: [{ text: L('Dạ.', 'Okay.') }],
      },
      // Cầu nối Sonnenhof (story 2.1 §1.5)
      cnIntro: {
        text: L(
          'Em có A2 rồi à? Có một chương trình chị muốn giới thiệu: viện dưỡng lão Sonnenhof bên Đức tuyển học viên điều dưỡng, trả học phí B1, lệ phí thi B1 và vé máy bay. Đổi lại em ký làm việc cho họ 2 năm sau khi tốt nghiệp; nghỉ sớm thì hoàn lại một phần.',
          'You have A2? There’s a programme I want to tell you about: the Sonnenhof care home in Germany pays the B1 course, the B1 exam and the flight for nursing trainees. In return you work for them for 2 years after graduating; leave early and you repay part of it.',
        ),
        next: 'cnHonest',
      },
      cnHonest: {
        text: L('Chị nói thật: đây là chương trình tử tế, có hợp đồng tiếng Đức rõ ràng, lương ghi rõ trước thuế và sau thuế. Còn ai hứa „lương trăm triệu, đóng 250 triệu là bay" thì em chạy ngay nhé.', 'Honestly: this is a decent programme with a clear German contract, salary stated gross and net. Anyone promising “a hundred million a month, pay 250 million and fly” — run.'),
        choices: [
          { text: L('Em muốn thử phỏng vấn', 'I’d like to try the interview'), effect: { type: 'action', id: 'cauNoi.hear' }, next: 'cnMenu' },
          { text: L('Em muốn tự đi', 'I’ll go on my own'), effect: { type: 'action', id: 'cauNoi.decline' } },
        ],
      },
      cnMenu: {
        text: L('Chương trình Cầu nối Sonnenhof: phỏng vấn online, đọc kỹ hợp đồng, rồi quyết định.', 'The Sonnenhof bridge programme: an online interview, read the contract carefully, then decide.'),
        choices: [
          { text: L('Phỏng vấn online với chị Anna (Sonnenhof)', 'Online interview with Anna (Sonnenhof)'), if: { noFlag: 'cauNoi.interviewed' }, effect: { type: 'action', id: 'cauNoi.interview' } },
          { text: L('Đọc hợp đồng', 'Read the contract'), if: { all: [{ flag: 'cauNoi.interviewed' }, { noFlag: 'cauNoi.read' }] }, effect: { type: 'action', id: 'cauNoi.read' } },
          { text: L('Ký Chương trình Cầu nối', 'Sign the bridge programme'), if: { flag: 'cauNoi.read' }, effect: { type: 'action', id: 'cauNoi.sign' }, next: 'cnSigned' },
          { text: L('Em tự đi', 'I’ll go on my own'), effect: { type: 'action', id: 'cauNoi.decline' } },
          { text: L('Để em nghĩ thêm', 'Let me think') },
        ],
      },
      cnSigned: { text: L('Chúc mừng em! Giờ học B1 cho tốt, Sonnenhof trả học phí và lệ phí thi rồi đấy.', 'Congratulations! Now study hard for B1 — Sonnenhof pays the course and the exam.') },
      // After B1: choose the path (story 2.1 §2.1)
      b1: {
        text: L('Em có B1 rồi, giỏi quá! Em muốn sang Đức để làm gì?', 'You have B1, well done! What do you want to do in Germany?'),
        choices: [
          { text: L('Em muốn sang Đức đi làm, kiếm tiền gửi về nhà… và đi du lịch nữa.', 'I want to work in Germany, send money home… and travel too.'), effect: { type: 'setFlag', key: 'mai.explained', value: true }, next: 'why' },
          { text: L('Studium khác Ausbildung thế nào ạ?', 'How is Studium different from Ausbildung?'), effect: { type: 'setFlag', key: 'mai.explained', value: true }, next: 'explain' },
        ],
      },
      why: {
        text: L(
          'Ai cũng muốn thế. Nhưng visa không cấp cho người „muốn đi chơi". Em cần một lý do mà Đức cần em. Mà nước Đức đang thiếu nhất là gì? Điều dưỡng. Học nghề điều dưỡng thì vừa có lương ngay từ năm đầu, vừa có đường ở lại lâu dài. Có lương, có giấy tờ, thì cuối tuần muốn đi đâu chẳng được.',
          'Everyone wants that. But nobody gets a visa for “wanting to travel”. You need a reason Germany needs you. And what does Germany lack most? Nurses. Nursing training pays from the first year and leads to staying long-term. With a salary and papers, you can travel every weekend.',
        ),
        next: 'explain',
      },
      explain: {
        text: L(
          'Ausbildung là học nghề có lương: điều dưỡng năm đầu khoảng 1.490 € trước thuế mỗi tháng. Lương học nghề trên 1.048 € là Đại sứ quán coi như em tự nuôi được mình, không phải mở tài khoản phong tỏa.',
          'Ausbildung is paid training: nursing pays about €1,490 gross a month in year one. Above €1,048 the embassy considers you self-sufficient — no blocked account needed.',
        ),
        next: 'explain2',
      },
      explain2: {
        text: L(
          'Studium là học đại học. Bằng cấp 3 Việt Nam chưa đủ vào thẳng, em phải học Studienkolleg một năm trước. Cần APS, thư mời nhập học, và Sperrkonto 11.904 €, khoảng ba trăm bảy mươi triệu. Sang đó mỗi tháng rút được 992 €.',
          'Studium is university. A Vietnamese school diploma isn’t enough to go straight in — first a year of Studienkolleg. You need APS, an admission letter and a blocked account of €11,904, about 375 million đồng. Over there you can withdraw €992 a month.',
        ),
        next: 'explain3',
      },
      explain3: {
        text: L('Cả hai đều cần hộ chiếu, giấy tờ dịch thuật công chứng, CV, thư động lực, bảo hiểm… và một cái Termin!', 'Both need a passport, certified translations, a CV, a motivation letter, insurance… and a Termin!'),
        choices: [
          { text: L('Em chọn đường luôn!', 'Let me choose now!'), if: { all: [{ germanLevel: 3 }, { noFlag: 'visa.path' }] }, next: 'choose' },
          { text: L('Dạ em hiểu rồi.', 'Got it.') },
        ],
      },
      choose: {
        text: L('Giờ chọn con đường nào đây?', 'Which path will you take?'),
        choices: [
          { text: L('Du học (Studium)', 'University (Studium)'), if: { noFlag: 'cauNoi.signed' }, effect: { type: 'action', id: 'visa.choosePath', arg: 'studium' }, next: 'chosen' },
          { text: L('Học nghề điều dưỡng (Ausbildung)', 'Nursing training (Ausbildung)'), effect: { type: 'action', id: 'visa.choosePath', arg: 'ausbildung' }, next: 'chosen' },
          { text: L('Chị giải thích lại giúp em', 'Explain again, please'), next: 'explain' },
        ],
      },
      chosen: {
        text: L('Quyết định đúng đắn! Chị mở „Hồ sơ visa" cho em rồi, bấm vào cuốn hộ chiếu trên màn hình nhé. Bước nào có 💼 thì em Tuấn làm hộ được.', 'Good choice! I opened your “Visa file” — tap the passport on screen. Steps marked 💼 Tuấn can do for you.'),
        choices: [{ text: L('Mở hồ sơ visa', 'Open the visa file'), effect: { type: 'action', id: 'visa.openPanel' } }],
      },
      helping: {
        text: [
          L('Hồ sơ tới đâu rồi em? Thiếu gì chị chỉ cho. Giấy tờ thì em Tuấn làm hộ, tiền nong thì cô Thoa.', 'How are your papers going? Tuấn can do paperwork for you, Ms Thoa handles payments.'),
          L('Nhớ nhé: lịch hẹn VFS miễn phí, ai rao bán lịch là lừa đảo!', 'Remember: VFS slots are free — anyone selling them is a scammer!'),
          L('Hồ sơ đẹp thì visa mới đẹp.', 'A neat file makes a neat visa.'),
        ],
        choices: [
          { text: L('Mở hồ sơ visa', 'Open the visa file'), effect: { type: 'action', id: 'visa.openPanel' } },
          { text: L('Đặt vé máy bay qua văn phòng ({flight})', 'Book the flight through the office ({flight})'), if: { all: [{ test: 'visa.ready' }, { noFlag: 'visa.flight' }] }, cost: V.flightCost, effect: { type: 'action', id: 'visa.buyFlight' } },
          { text: L('Mẹo phỏng vấn visa?', 'Interview tips?'), next: 'interviewTips' },
          { text: L('Em đổi ý: học nghề điều dưỡng', 'Change of plan: nursing training'), if: { all: [{ flag: 'visa.path', is: 'studium' }, { noFlag: 'visa.readyDay' }] }, effect: { type: 'action', id: 'visa.choosePath', arg: 'ausbildung' } },
          { text: L('Dạ em cảm ơn chị.', 'Thanks!') },
        ],
      },
      interviewTips: {
        text: [
          L('Trả lời thật, ngắn gọn, bằng tiếng Đức càng tốt. Nói rõ em sẽ học gì, ở đâu, sống bằng tiền gì.', 'Answer honestly and briefly, in German if you can. Say what you’ll do, where, and how you’ll live.'),
          L('Đừng nói đi Đức để du lịch hay chưa biết làm gì! (…thế mà mình định nói đúng câu đó.)', 'Don’t say you’re going to sightsee or don’t know what you’ll do! (…which is exactly what you were going to say.)'),
          L('Nếu văn phòng viết thư giúp em thì em phải đọc kỹ, hiểu từng câu. Lãnh sự hay hỏi „Haben Sie diesen Brief selbst geschrieben?" lắm.', 'If the office writes your letter, read and understand every sentence. The consul likes to ask whether you wrote it yourself.'),
        ],
        next: 'helping',
      },
    },
  },

  tuan: {
    vars: () => ({
      diploma: vnd(2_000_000),
      criminal: vnd(500_000),
      health: vnd(800_000),
      cv: vnd(800_000),
      portal: vnd(500_000),
      termin: vnd(V.officeTermin),
      pack: vnd(V.officePackage),
    }),
    start: [{ if: { noFlag: 'visa.path' }, node: 'early' }, { node: 'hello' }],
    nodes: {
      early: { text: L('(Tuấn đang nghe ba điện thoại cùng lúc.) Anh/chị chưa chọn đường thì em chưa làm hồ sơ được, hỏi chị Mai trước nhé!', '(Tuấn is on three phones at once.) Choose your path with Mai first, then I can do your papers!') },
      hello: {
        text: L('Anh/chị đưa giấy tờ đây, mai em trả. Muốn em làm phần nào?', 'Give me your papers, ready tomorrow. Which part should I do?'),
        choices: [
          { text: L('💼 Trọn gói ({pack}) — mọi giấy tờ trừ vé máy bay', '💼 Full package ({pack}) — everything but the flight'), if: { test: 'office.packageAvailable' }, effect: { type: 'action', id: 'office.package' } },
          { text: L('💼 Dịch thuật công chứng ({diploma})', '💼 Certified translations ({diploma})'), if: { test: 'office.can.diploma' }, effect: { type: 'action', id: 'office.buy', arg: 'diploma' } },
          { text: L('💼 Lý lịch tư pháp ({criminal})', '💼 Criminal record ({criminal})'), if: { test: 'office.can.criminal' }, effect: { type: 'action', id: 'office.buy', arg: 'criminal' } },
          { text: L('💼 Khám sức khỏe ({health})', '💼 Health certificate ({health})'), if: { test: 'office.can.health' }, effect: { type: 'action', id: 'office.buy', arg: 'health' } },
          { text: L('💼 CV + thư động lực ({cv})', '💼 CV + motivation letter ({cv})'), if: { test: 'office.can.cv' }, effect: { type: 'action', id: 'office.buy', arg: 'cv' } },
          { text: L('💼 Điền Auslandsportal ({portal})', '💼 Fill in the Auslandsportal ({portal})'), if: { test: 'office.can.portal' }, effect: { type: 'action', id: 'office.buy', arg: 'portal' } },
          { text: L('💼 Săn lịch VFS hộ ({termin})', '💼 Hunt the VFS slot for me ({termin})'), if: { test: 'office.terminAvailable' }, effect: { type: 'action', id: 'office.termin' } },
          { text: L('Văn phòng có mua được lịch sớm hơn không?', 'Can the office buy an earlier slot?'), next: 'noBuy' },
          { text: L('Thôi em tự làm', 'I’ll do it myself') },
        ],
      },
      noBuy: { text: L('Không đâu anh/chị, lịch VFS không ai bán được, em chỉ săn hộ thôi. Ai bảo bán lịch là lừa đấy!', 'No — nobody can sell VFS slots, I only hunt for you. Anyone selling them is a scammer!'), next: 'hello' },
    },
  },

  coThoa: {
    start: 'hello',
    nodes: {
      hello: {
        text: [
          L('Văn phòng chị Mai có hóa đơn đàng hoàng nhé, không như bên kia đường.', 'Mai’s office gives proper receipts — not like across the road.'),
          L('Thu tiền xong cô ghi hóa đơn đỏ, em giữ lại phòng khi cần.', 'I write a red invoice for every payment — keep it in case you need it.'),
        ],
        choices: [{ text: L('Dạ cháu cảm ơn cô.', 'Thank you.') }],
      },
    },
  },

  // ----------------------------------------------------------------------------- Hoàng Kim
  anhKhai: {
    start: 'hello',
    nodes: {
      hello: {
        text: L('Em ơi vào đây uống nước đã! Bên anh BAO VISA 100%, không cần B1, lương bên đó 100 triệu một tháng!', 'Come in, have a drink! We GUARANTEE the visa, no B1 needed, salary 100 million a month!'),
        choices: [
          { text: L('Cho em xem hợp đồng', 'Show me the contract'), if: { noFlag: 'scam.spotted' }, effect: { type: 'action', id: 'hk.contract' } },
          { text: L('Phí bao nhiêu ạ?', 'How much is the fee?'), next: 'fee' },
          { text: L('Lương 100 triệu là trước thuế hay sau thuế ạ?', 'Is 100 million gross or net?'), next: 'tax' },
          { text: L('Em hỏi chị Mai bên kia đã', 'I’ll ask Mai across the road first'), next: 'mai' },
          { text: L('Thôi em đi đây', 'I’ll be going') },
        ],
      },
      fee: { text: L('250 triệu thôi em, trả trước 70%. Bố mẹ vay ngân hàng là xong! Bạn Linh lớp em ký rồi đấy.', 'Just 250 million, 70% up front. Your parents take a bank loan, done! Your classmate Linh already signed.'), next: 'hello' },
      tax: { text: L('Ơ… thì… lương cao lắm em ạ, đừng lo chuyện đấy!', 'Er… well… it’s a very high salary, don’t worry about that!'), next: 'hello' },
      mai: { text: L('Chị Mai bên kia á? Toàn bắt học B1, mất thời gian lắm! Bên anh nhanh gọn.', 'Mai over there? She makes everyone do B1 — such a waste of time! We’re quick.'), next: 'hello' },
    },
  },

  linh: {
    start: [
      { if: { all: [{ scene: 'vietnam' }, { noFlag: 'linh.warned' }, { any: [{ flag: 'scam.spotted' }, { flag: 'khai.overheard' }] }] }, node: 'warn' },
      { if: { scene: 'vietnam' }, node: 'atHk' },
      { if: { all: [{ germanLevel: 2 }, { noFlag: 'linh.told' }] }, node: 'news' },
      { if: { all: [{ flag: 'linh.told' }, { noFlag: 'linh.warned' }, { any: [{ flag: 'scam.spotted' }, { flag: 'khai.overheard' }] }] }, node: 'warn' },
      { node: 'hello' },
    ],
    nodes: {
      hello: {
        text: [
          L('Ê, học nhóm không? Hai đứa học thì nhanh hơn!', 'Hey, study together? Two of us learn faster!'),
          L('Tớ quê Nghệ An, thuê trọ ở Ô Chợ Dừa. Ngày nào cũng đạp xe sang đây học đó.', 'I’m from Nghệ An, I rent a room in Ô Chợ Dừa. I cycle here every day.'),
        ],
        choices: [
          { text: L('Học nhóm với Linh', 'Study with Linh'), if: { test: 'linh.canStudy' }, effect: { type: 'action', id: 'linh.study' } },
          { text: L('Mai nhé!', 'Tomorrow!') },
        ],
      },
      news: {
        text: L('Tớ ký với Công ty Hoàng Kim rồi! Họ lo hết, B1 không cần đậu cũng được, đóng 250 triệu thôi, bố tớ vay rồi. Lương bên đó trăm triệu một tháng!', 'I signed with the Hoàng Kim agency! They handle everything, no B1 needed, just 250 million — my dad took a loan. The salary over there is a hundred million a month!'),
        choices: [
          { text: L('Linh ơi, trăm triệu là lương trước thuế đấy, mà chị Mai bảo không có B1 thì không ai cấp visa học nghề đâu…', 'Linh, a hundred million is before tax, and Mai says nobody gets a training visa without B1…'), effect: { type: 'setFlag', key: 'linh.warned', value: true }, next: 'quiet' },
          { text: L('Ừ, thế thì tốt quá.', 'Oh, that’s great.'), effect: { type: 'setFlag', key: 'linh.told', value: true }, next: 'happy' },
        ],
      },
      quiet: {
        text: L('(Linh im lặng một lúc.) Nhưng… bố tớ vay tiền rồi. Tớ không quay lại được nữa đâu.', '(Linh is quiet for a while.) But… my dad already borrowed the money. I can’t go back now.'),
        choices: [{ text: L('Có gì cứ gọi tớ nhé.', 'Call me if anything happens.'), effect: { type: 'setFlag', key: 'linh.told', value: true } }],
      },
      happy: { text: L('Ừ! Sang đó tớ gửi ảnh cho cậu nhé!', 'Yes! I’ll send you photos from over there!') },
      atHk: {
        text: L('(Linh ngồi ký giấy ở bàn trong.) Ơ, cậu cũng đến à? Tớ đóng 70% rồi, tháng sau là bay!', '(Linh is signing papers at the desk inside.) Oh, you’re here too? I paid 70% already — I fly next month!'),
        choices: [{ text: L('…Cẩn thận nhé Linh.', '…Be careful, Linh.') }],
      },
      warn: {
        text: L('Sao thế, mặt cậu nghiêm thế?', 'What’s wrong? You look serious.'),
        choices: [
          {
            text: L('Hợp đồng Hoàng Kim không ghi chủ ở Đức là ai, lương không nói trước hay sau thuế, phí không hoàn lại… Tớ còn nghe anh Khải bảo „không cần B1".', 'The Hoàng Kim contract names no German employer, doesn’t say gross or net, the fee is non-refundable… and I heard Khải say “no B1 needed”.'),
            effect: { type: 'setFlag', key: 'linh.warned', value: true },
            next: 'sad',
          },
          { text: L('À không có gì.', 'Oh, nothing.') },
        ],
      },
      sad: {
        text: L('(Linh nhìn tờ hợp đồng rất lâu.) Tớ… tớ sẽ hỏi lại họ. Nhưng tiền đóng rồi… Cảm ơn cậu.', '(Linh stares at the contract for a long time.) I… I’ll ask them. But I already paid… Thank you.'),
        choices: [{ text: L('Có gì cứ gọi tớ.', 'Call me if anything happens.'), effect: { type: 'setFlag', key: 'linh.told', value: true } }],
      },
    },
  },

  // ------------------------------------------------------------------------------- Circle K
  circleK: {
    vars: () => ({ day: vnd(CONFIG.vnJobs.circleK.day), night: vnd(CONFIG.vnJobs.circleK.night) }),
    start: [{ if: { noFlag: 'job.circleK.hired' }, node: 'hire' }, { node: 'hello' }],
    nodes: {
      hire: {
        text: L('Em muốn làm thêm à? Đúng lúc chị đang thiếu người — chị nhận em luôn! Ca ngày {day}, ca đêm {night}. Vào ca luôn không em?', 'Looking for a job? I’m short of staff — you’re hired! Day shift {day}, night shift {night}. Start right now?'),
        choices: [
          { text: L('Vào ca luôn (90 giây)', 'Start a shift now (90 seconds)'), if: { not: { test: 'job.circleKToday' } }, effect: { type: 'action', id: 'job.circleK' } },
          { text: L('Dạ, lúc khác em vào ca', 'I’ll come for a shift later'), effect: { type: 'action', id: 'job.circleKHire' } },
        ],
      },
      hello: {
        text: [L('Vào ca không em? Ca ngày 6–22h, ca đêm 22–6h.', 'Starting a shift? Day 6–22, night 22–6.'), L('Hàng sắp hết hạn thì xếp lên trước nhé!', 'Items close to expiry go to the front!')],
        choices: [
          { text: L('Vào ca (90 giây)', 'Start a shift (90 seconds)'), if: { not: { test: 'job.circleKToday' } }, effect: { type: 'action', id: 'job.circleK' } },
          { text: L('Chào chị', 'Bye') },
        ],
      },
    },
  },

  // ---------------------------------------------------------------------- Tiệm trà sữa (1.17)
  chiVy: {
    vars: () => ({ pay: vnd(CONFIG.vnJobs.tea.pay), ban: teaBanLeft(), n: teaStrikes(), max: CONFIG.vnJobs.tea.maxQuits }),
    start: [{ if: { test: 'job.teaBanned' }, node: 'banned' }, { if: { test: 'job.teaWarned' }, node: 'warned' }, { node: 'hello' }],
    nodes: {
      banned: {
        text: L('Chị nói rồi: bỏ ca giữa chừng là chị không nhận. {ban} ngày nữa em quay lại, chị xem thái độ thế nào đã.', 'I told you: no walking out mid-shift. Come back in {ban} days.'),
        choices: [{ text: L('Em xin lỗi chị…', 'I’m sorry…') }],
      },
      warned: {
        text: L('Em bỏ ca giữa chừng {n}/{max} lần rồi đấy. Khách xếp hàng mà nhân viên đi về thì chị biết làm sao? Làm trọn một ca cho tử tế thì chị bỏ qua.', 'You have walked out {n}/{max} times. Work one full, decent shift and I will let it go.'),
        choices: [
          { text: L('Vào ca (90 giây)', 'Start a shift (90 seconds)'), if: { not: { test: 'job.cafeToday' } }, effect: { type: 'action', id: 'job.tea' } },
          { text: L('Vâng, em nhớ rồi ạ', 'Understood') },
        ],
      },
      hello: {
        text: [
          L('Vào ca không em? {pay} một ca, khách khen thì có thêm tip.', 'Starting a shift? {pay} a shift, plus tips.'),
          L('Nhớ nhé: lấy đúng size ly, đúng trà, đúng topping, rót tới vạch xanh rồi mới dập nắp.', 'Remember: right cup, right tea, right toppings, pour to the green mark, then seal.'),
          L('Đang ca mà bỏ về là chị không thích đâu đấy.', 'I really don’t like people leaving mid-shift.'),
        ],
        choices: [
          { text: L('Vào ca (90 giây)', 'Start a shift (90 seconds)'), if: { not: { test: 'job.cafeToday' } }, effect: { type: 'action', id: 'job.tea' } },
          { text: L('Chào chị', 'Bye') },
        ],
      },
    },
  },

  // ---------------------------------------------------------------------- VFS and embassy
  vfs: {
    vars: () => ({ fees: vnd(V.vfsVisaFee + V.vfsServiceFee) }),
    start: [
      { if: { test: 'visa.submittedToday' }, node: 'done' },
      { if: { test: 'visa.terminToday' }, node: 'submit' },
      { node: 'noTermin' },
    ],
    nodes: {
      submit: {
        text: L('Chào em, VFS Global đây. Em đưa hộ chiếu, mã đơn Auslandsportal và hồ sơ nhé. Lấy vân tay, chụp ảnh, phí visa 75 € và phí dịch vụ: tổng {fees}.', 'Hello, VFS Global. Passport, Auslandsportal reference and your file, please. Fingerprints, photo, the €75 visa fee and the service fee: {fees} in total.'),
        choices: [
          { text: L('Nộp hồ sơ', 'Hand in my file'), cost: V.vfsVisaFee + V.vfsServiceFee, effect: { type: 'action', id: 'visa.submit' } },
          { text: L('Chờ em chút', 'One moment') },
        ],
      },
      done: { text: L('Xong rồi em. Mời em sang quầy phỏng vấn của bà Lehmann.', 'All done. Please go to Ms Lehmann’s interview window.') },
      noTermin: { text: L('VFS chỉ nhận hồ sơ khi có lịch hẹn em ạ. Lịch hẹn đặt miễn phí trên mạng.', 'VFS only accepts files with an appointment. Booking is free online.') },
    },
  },

  officer: {
    start: [
      { if: { all: [{ test: 'visa.terminToday' }, { test: 'visa.submittedToday' }] }, node: 'ready' },
      { if: { test: 'visa.terminToday' }, node: 'vfsFirst' },
      { node: 'noTermin' },
    ],
    nodes: {
      ready: {
        text: L('Guten Tag. Bitte setzen Sie sich. (Chào bạn. Mời ngồi.)', 'Guten Tag. Please take a seat.'),
        choices: [
          { text: L('Bắt đầu phỏng vấn', 'Start the interview'), effect: { type: 'action', id: 'visa.interview' } },
          { text: L('Chờ em chút ạ', 'One moment, please') },
        ],
      },
      vfsFirst: { text: L('Bitte zuerst zum VFS-Schalter. (Nộp hồ sơ ở quầy VFS bên trái trước đã.)', 'Bitte zuerst zum VFS-Schalter. (Hand in your file at the VFS window on the left first.)') },
      noTermin: {
        text: [
          L('Ohne Termin geht hier gar nichts. (Không có lịch hẹn thì không làm gì được.)', 'Ohne Termin geht hier gar nichts. (Nothing happens without an appointment.)'),
          L('Ihr Visum wird bearbeitet. Bitte warten Sie. (Visa đang được xử lý, vui lòng chờ.)', 'Your visa is being processed. Please wait.'),
        ],
      },
    },
  },

  // ---------------------------------------------------------------------- Text messages
  sms: {
    vars: () => ({ slot: vnd(V.scamSlotPrice) }),
    start: [
      { if: { test: 'sms.goethe' }, node: 'goethe' },
      { if: { test: 'sms.vfs' }, node: 'vfs' },
      { if: { test: 'sms.wedding' }, node: 'wedding' },
      { if: { test: 'sms.screen' }, node: 'screen' },
      { node: 'none' },
    ],
    nodes: {
      goethe: {
        text: L('📱 „GOETHE-INSTITUT: Le phi thi B1 cua ban chua duoc xac nhan. Chuyen khoan 3.000.000d trong hom nay de giu cho: STK 0123…"', '📱 “GOETHE-INSTITUT: your exam fee is not confirmed. Transfer 3,000,000đ today to keep your place: acct 0123…”'),
        choices: [
          { text: L('Chuyển khoản ngay', 'Transfer now'), effect: { type: 'action', id: 'sms.resolve', arg: 'pay' } },
          { text: L('Gọi lên Goethe hỏi cho chắc', 'Call the Goethe-Institut to check'), effect: { type: 'action', id: 'sms.resolve', arg: 'no' } },
        ],
      },
      vfs: {
        text: L('📱 „Co slot VFS tuan sau, {slot}, chuyen khoan truoc. Nhanh tay keo het!"', '📱 “VFS slot next week, {slot}, pay first. Hurry before it’s gone!”'),
        choices: [
          { text: L('Chuyển khoản mua lịch', 'Pay for the slot'), effect: { type: 'action', id: 'sms.resolve', arg: 'pay' } },
          { text: L('Xóa tin nhắn (lịch VFS miễn phí)', 'Delete it (VFS slots are free)'), effect: { type: 'action', id: 'sms.resolve', arg: 'no' } },
        ],
      },
      wedding: {
        text: L('📱 „Tối nay đám cưới tao nhé, cả lớp 12A đều đến!" (Phong bì khoảng 500.000đ.)', '📱 “My wedding is tonight, the whole class is coming!” (An envelope of about 500,000đ.)'),
        choices: [
          { text: L('Đi đám cưới (500.000đ)', 'Go to the wedding (500,000đ)'), cost: 500_000, effect: { type: 'action', id: 'sms.resolve', arg: 'pay' } },
          { text: L('Nhắn xin lỗi không đi được', 'Apologise, can’t come'), effect: { type: 'action', id: 'sms.resolve', arg: 'no' } },
        ],
      },
      screen: {
        text: L('Màn hình điện thoại vỡ nát. Tiệm sửa đầu ngõ báo giá thay màn hình 1.200.000đ.', 'The phone screen is shattered. The repair shop quotes 1,200,000đ for a new one.'),
        choices: [
          { text: L('Thay màn hình (1.200.000đ)', 'Replace it (1,200,000đ)'), cost: 1_200_000, effect: { type: 'action', id: 'sms.resolve', arg: 'pay' } },
          { text: L('Dùng tạm', 'Live with it'), effect: { type: 'action', id: 'sms.resolve', arg: 'no' } },
        ],
      },
      none: { text: L('(Không có tin nhắn mới.)', '(No new messages.)') },
    },
  },
}
