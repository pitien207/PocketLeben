import { currentLanguage, localize, type Localized } from '../../i18n/localized'
import { useFlags } from '../../store/flagsStore'
import type { DialogueDef } from '../dialogueTypes'
import { FORTUNES } from '../fortunes'
import { SECRETS, SECRETS_ENABLED } from '../secrets'

/** People of the new districts (1.7): the đình keeper, the bookseller, the chè granny, Oma Gerda. */

const L = (vi: string, en: string, de?: string): Localized => ({ vi, en, de })
const flag = (k: string) => useFlags.getState().flags[k]
const found = () => SECRETS.filter((s) => flag(`secret.${s.id}`)).length


export const EXPLORE_DIALOGUES: Record<string, DialogueDef> = {
  ongTu: {
    vars: () => {
      const i = flag('fortune.result')
      return { fortune: localize(FORTUNES[typeof i === 'number' ? i : 0]?.text ?? FORTUNES[0].text, currentLanguage()), found: found(), total: SECRETS.length }
    },
    start: [{ if: { flag: 'fortune.ask' }, node: 'ask' }, { node: 'hello' }],
    nodes: {
      hello: {
        text: [
          L('Chào cháu. Đình này thờ Thành hoàng làng, có từ thời phố còn là làng Hàng Gai, hơn ba trăm năm rồi đấy.', 'Hello, child. This communal house honours the village guardian spirit — it’s from when this street was still Hàng Gai village, over three hundred years ago.'),
          L('Lại thăm ông à? Người đi xa hay ghé đình xin quẻ lấy may trước khi lên đường.', 'Visiting again? People leaving for far away often stop by for a fortune stick before the journey.'),
        ],
        choices: [
          { text: L('Cháu xin một quẻ ạ 🎋', 'May I draw a fortune stick? 🎋'), if: { not: { test: 'fortune.today' } }, effect: { type: 'action', id: 'place.drawFortune' }, next: 'result' },
          { text: L('Ông kể chuyện đình đi ạ', 'Tell me about the đình'), next: 'story' },
          { text: L('Quanh đây có gì hay không ông?', 'Anything interesting around here?'), next: 'hints' },
          { text: L('Cháu chào ông ạ', 'Goodbye, Grandpa') },
        ],
      },
      ask: {
        text: L('Muốn xin quẻ à? Thắp nén hương, thành tâm khấn, rồi lắc ống thẻ cho một que rơi ra nhé.', 'A fortune? Light some incense, make a sincere wish, then shake the cup until one stick falls out.'),
        choices: [
          { text: L('Lắc ống thẻ', 'Shake the cup'), if: { not: { test: 'fortune.today' } }, effect: { type: 'action', id: 'place.drawFortune' }, next: 'result' },
          { text: L('(Hôm nay xin rồi)', '(Already drew one today)'), if: { test: 'fortune.today' }, next: 'already' },
          { text: L('Để lúc khác ạ', 'Maybe later') },
        ],
      },
      result: {
        text: L('Que số mấy nào… À đây: {fortune}', 'Which number… here: {fortune}'),
        next: 'after',
      },
      after: {
        text: L('Quẻ chỉ để mình vững lòng thôi cháu. Còn lại là do mình cố gắng cả.', 'A fortune is just to steady your heart. The rest is up to your own effort.'),
      },
      already: {
        text: L('Mỗi ngày một quẻ thôi cháu, xin nhiều Thành hoàng mệt. Mai lại ghé nhé.', 'One stick a day, child — the guardian spirit gets tired. Come back tomorrow.'),
      },
      story: {
        text: [
          L('Ngày xưa phố này bán đay gai, dây thừng, nên mới tên Hàng Gai. Tết nào làng cũng mở hội, rước kiệu quanh phố.', 'Long ago this street sold hemp and rope — hence "Hàng Gai". Every Tết the village held a festival with a procession round the streets.'),
          L('Cái xe đạp Peugeot ở góc sân là của ông đấy, từ năm 1960. Ngày trẻ ông đạp nó chở bà đi khắp Hà Nội.', 'The Peugeot bicycle in the corner is mine, from 1960. When I was young I rode my sweetheart all over Hà Nội on it.'),
        ],
        next: 'hello',
      },
      hints: {
        text: [
          L('Con ngõ cạnh đình ấy, đi vào sâu có cái giếng cổ với con mèo mướp nhà bà Sáu. Ít ai để ý lắm.', 'The alley beside the đình — deep inside there’s an old well and Granny Sáu’s tabby cat. Few people notice.'),
          L('Tối tối ra chợ đêm mà xem đèn lồng. Đứng sát lan can hồ, may ra thấy cụ Rùa.', 'In the evening, go see the lanterns at the night market. Stand by the lake railing — with luck you’ll see the old turtle.'),
          L('Cây đa đầu phố phía tây có miếu thổ địa, thắp nén hương cho khỏe người.', 'The banyan at the west end has a little earth-god shrine. Light incense there for strength.'),
        ],
        next: SECRETS_ENABLED ? 'progress' : 'hello',
      },
      progress: {
        text: L('Cháu tìm được {found}/{total} điều bí mật của phố rồi đấy. Cứ đi chậm mà nhìn, phố cổ còn nhiều chuyện lắm.', 'You’ve found {found}/{total} hidden things so far. Walk slowly and look around — the old streets have many stories.'),
        next: 'hello',
      },
    },
  },

  cuTu: {
    start: 'hello',
    nodes: {
      hello: {
        text: [
          L('Chào cháu. Đền này thờ Văn Xương Đế Quân, vị thần văn chương, và Đức Thánh Trần. Học trò hay lên đây thắp hương trước kỳ thi đấy.', 'Hello, child. This temple honours Văn Xương, god of literature, and Saint Trần. Students come to light incense before their exams.'),
          L('Lại lên đền à? Đi qua cầu Thê Húc buổi sáng là đẹp nhất — "Thê Húc" nghĩa là nơi đậu ánh nắng ban mai.', 'Back again? The Thê Húc bridge is prettiest in the morning — "Thê Húc" means "where the morning sunlight rests".'),
        ],
        choices: [
          { text: L('Ông kể sự tích hồ Gươm đi ạ', 'Tell me the legend of the lake'), next: 'legend1' },
          { text: L('Tháp Bút ngoài cổng là gì ạ?', 'What is the tower at the gate?'), next: 'tower' },
          { text: L('Cháu sắp thi tiếng Đức…', 'I have a German exam soon…'), next: 'exam' },
          { text: L('Cháu chào ông', 'Goodbye') },
        ],
      },
      legend1: {
        text: L(
          'Ngày xưa vua Lê Lợi được Long Vương cho mượn thanh gươm thần đánh giặc Minh. Thắng trận rồi, vua đi thuyền trên hồ thì cụ Rùa Vàng nổi lên đòi gươm.',
          'Long ago King Lê Lợi borrowed a magic sword from the Dragon King to drive out the Ming. After the victory, as he boated on this lake, a golden turtle rose and asked for it back.',
        ),
        next: 'legend2',
      },
      legend2: {
        text: L(
          'Vua trả gươm, từ đó hồ mang tên Hoàn Kiếm — "trả gươm". Trong đình Trấn Ba kia còn giữ tiêu bản một cụ rùa đấy, cháu ra xem.',
          'He returned it, and the lake has been called Hoàn Kiếm — "returned sword" — ever since. The Trấn Ba pavilion over there keeps a preserved giant turtle; go and see.',
        ),
        next: 'hello',
      },
      tower: {
        text: L(
          'Đó là Tháp Bút, ngọn tháp hình cây bút lông, trên đề ba chữ "Tả Thanh Thiên" — viết lên trời xanh. Còn cổng kia là Đài Nghiên, cái nghiên mực đặt trên lưng ba con cóc.',
          'That’s Tháp Bút, a tower shaped like a brush; it says "Tả Thanh Thiên" — write on the blue sky. The gate is Đài Nghiên, an ink slab carried by three toads.',
        ),
        next: 'hello',
      },
      exam: {
        text: L(
          'Thắp nén hương ở lư hương giữa sân, khấn cho thành tâm. Nhưng nhớ: thần Văn Xương chỉ giúp người chịu học thôi nhé. Viel Glück, như người Đức nói!',
          'Light a stick of incense at the urn in the courtyard and make a sincere wish. But remember: the god of literature only helps those who study. Viel Glück, as the Germans say!',
        ),
        next: 'hello',
      },
    },
  },

  chuSach: {
    // Story 2.1 §1 (part 4): after B1, chú Hưng remembers his friend Toàn in Leipzig and the 1989 letter.
    start: [{ if: { all: [{ flag: 'story.leipzig' }, { germanLevel: 3 }, { noFlag: 'lan.letter' }] }, node: 'letter1' }, { node: 'hello' }],
    nodes: {
      letter1: {
        text: L(
          'Cháu có B1 rồi à? Giỏi quá! Chú nhớ ra một chuyện… Bạn thân của chú hồi ấy, ông Toàn, ở lại Leipzig. Con gái ông ấy là cô Lan, giờ làm dược sĩ ở đó.',
          'You have B1? Wonderful! That reminds me… My best friend back then, Mr Toàn, stayed in Leipzig. His daughter Lan is a pharmacist there now.',
        ),
        next: 'letter2',
      },
      letter2: {
        text: L(
          'Chú còn giữ lá thư ông ấy gửi năm 1989, kẹp trong cuốn từ điển kia kìa. Trong thư có địa chỉ nhà cô Lan. Cháu cầm lấy — biết đâu một ngày cần đến.',
          'I still have the letter he sent in 1989, tucked into that dictionary. It has Lan’s family address. Take it — you never know when you’ll need it.',
        ),
        choices: [{ text: L('Cháu cảm ơn chú, cháu giữ cẩn thận ạ.', 'Thank you, I’ll keep it safe.'), effect: { type: 'setFlag', key: 'lan.letter', value: true } }],
      },
      hello: {
        text: [
          L('Sách cũ đây cháu, toàn sách quý. Ngày trước chú cũng là "dân Đức" đấy — Leipzig, năm 1987.', 'Second-hand books, all treasures. I was a "German" once too — Leipzig, 1987.'),
          L('Lại đây đọc sách à? Đọc tiếng Đức mỗi ngày một ít, như uống trà ấy, ngấm dần.', 'Back to read? A little German every day, like tea — it seeps in.'),
        ],
        choices: [
          { text: L('Ngồi đọc sách tiếng Đức (+XP)', 'Read a German book (+XP)'), effect: { type: 'action', id: 'place.readBook' } },
          { text: L('Chú từng ở Đức ạ? Chú kể đi!', 'You lived in Germany? Tell me!'), next: 'leipzig1' },
          { text: L('Có sách gì đặc biệt không chú?', 'Any special books?'), next: 'special' },
          { text: L('Cháu chào chú', 'Bye!') },
        ],
      },
      leipzig1: {
        text: L(
          'Hồi ấy gọi là "đi hợp tác lao động" sang Cộng hòa Dân chủ Đức. Chú làm ở nhà máy dệt, ở ký túc xá, mỗi tháng gửi về nhà một thùng hàng: xe đạp, máy khâu…',
          'Back then we were "contract workers" in East Germany. I worked in a textile factory, lived in a dorm, and sent home a crate every month: bicycles, sewing machines…',
        ),
        next: 'leipzig2',
      },
      leipzig2: {
        text: L(
          'Năm 1989 bức tường Berlin sụp. Nhiều người ở lại, mở hàng hoa, quán ăn — bây giờ con cháu họ là bác sĩ, kỹ sư ở Đức cả. Chú thì về, mở hiệu sách này.',
          'In 1989 the Berlin Wall fell. Many stayed and opened flower shops and restaurants — today their children are doctors and engineers in Germany. I came home and opened this shop.',
        ),
        next: 'leipzig3',
      },
      leipzig3: {
        text: L(
          'Cháu đi bây giờ sướng hơn nhiều: có học nghề, có đại học, có đường lên thường trú. Nhưng nhớ: chào hỏi đàng hoàng, đúng giờ, và đừng bao giờ quên tiếng Việt.',
          'You’re going at a much better time: real training, university, a path to residence. But remember: greet people properly, be on time — and never forget your Vietnamese.',
        ),
        choices: [{ text: L('Cháu cảm ơn chú. Cháu sẽ gửi chú bưu thiếp từ Đức!', 'Thank you. I’ll send you a postcard from Germany!'), effect: { type: 'setFlag', key: 'story.leipzig', value: true } }],
      },
      special: {
        text: L(
          'Góc trong cùng có cuốn từ điển Việt–Đức cũ lắm, của ai đó gửi bán. Chú chưa giở ra bao giờ — cháu thử xem, biết đâu có gì bên trong.',
          'In the far corner there’s a very old Vietnamese–German dictionary someone sold me. I never opened it — have a look, maybe something’s inside.',
        ),
        next: 'hello',
      },
    },
  },

  baChe: {
    start: 'hello',
    nodes: {
      hello: {
        text: [
          L('Chè đây! Chè ba màu, chè đỗ đen, mát lắm cháu ơi!', 'Sweet soup! Three-colour chè, black-bean chè — so refreshing!'),
          L('Bánh tráng nướng giòn rụm, kem Tràng Tiền mát lạnh — chợ đêm có đủ cả!', 'Crispy grilled rice paper, icy Tràng Tiền ice cream — the night market has it all!'),
        ],
        choices: [
          { text: L('Cho cháu một cốc chè ba màu', 'A three-colour chè, please'), cost: 30_000, effect: { type: 'buy', itemId: 'che', use: true } },
          { text: L('Xem cả quầy', 'Show me everything'), effect: { type: 'openShop', shopId: 'choDem' } },
          { text: L('Chợ mở mấy giờ hả bà?', 'When does the market open?'), next: 'hours' },
          { text: L('Thôi ạ', 'Not now') },
        ],
      },
      hours: {
        text: L('Năm giờ chiều bà mới dọn hàng, đến nửa đêm. Bảy giờ tối lên đèn là đẹp nhất!', 'I set up at five in the afternoon and stay till midnight. When the lanterns light up at seven — that’s the prettiest!'),
        next: 'hello',
      },
    },
  },

  omaGerda: {
    start: [
      { if: { all: [{ noFlag: 'gerda.friend' }, { flag: 'stats.gerdaWords', atLeast: 3 }, { flag: 'stats.ducks', atLeast: 1 }] }, node: 'kaffee' },
      { if: { flag: 'gerda.friend' }, node: 'friend' },
      { node: 'hello' },
    ],
    nodes: {
      kaffee: {
        text: L(
          'Bà có mang theo bình Kaffee với bánh táo tự nướng. Ngồi xuống đây… Từ ngày ông Heinz mất, mấy đứa cháu thì ở tận Úc, bà ít khi có ai nói chuyện. Cảm ơn cháu đã ngồi với bà mấy hôm nay.',
          'I brought a flask of Kaffee and home-made apple cake. Sit down… Since Heinz passed away and the grandchildren moved to Australia, I rarely have anyone to talk to. Thank you for sitting with me these days.',
        ),
        next: 'kaffee2',
      },
      kaffee2: {
        text: L(
          'Ở Đức người ta có chữ "Leih-Oma" — bà ngoại "mượn". Cháu có muốn chủ nhật nào cũng ra đây uống Kaffee với bà không?',
          'In Germany we say "Leih-Oma" — a borrowed grandmother. Would you like to come for Kaffee with me every Sunday?',
        ),
        choices: [
          { text: L('Dạ có! Từ nay bà là bà của cháu 💛', 'Yes! From now on you’re my Oma 💛'), effect: { type: 'setFlag', key: 'gerda.friend', value: true }, next: 'friend' },
          { text: L('Để cháu suy nghĩ đã ạ', 'Let me think about it') },
        ],
      },
      friend: {
        text: [
          L('Mein Schatz! Hôm nay ăn gì chưa? Bà để dành cho cháu miếng bánh táo đây.', 'Mein Schatz! Have you eaten? I saved you a slice of apple cake.'),
          L('Herbert hôm qua lại ra chào bà đấy. Chắc nó nhớ cháu.', 'Herbert came out to say hello yesterday. He must miss you.'),
          L('Bà kể với hội bạn ở nhà thờ về cháu suốt — người điều dưỡng Việt Nam giỏi nhất Lindenberg!', 'I keep telling my church friends about you — the best Vietnamese nurse in Lindenberg!'),
        ],
        choices: [
          { text: L('Bà dạy cháu thêm từ mới nhé (+XP)', 'Teach me more words (+XP)'), if: { not: { test: 'park.wordsToday' } }, effect: { type: 'action', id: 'park.words' }, next: 'words' },
          { text: L('Cháu yêu bà!', 'Love you, Oma!'), effect: { type: 'mood', amount: 8 } },
        ],
      },
      hello: {
        text: [
          L('Guten Tag! Bạn mới đến Lindenberg à? Ngồi đây với bà một lát, xem lũ vịt kìa.', 'Guten Tag! New in Lindenberg? Sit with me a moment — look at the ducks.'),
          L('Ach, du schon wieder! Hôm nay lũ vịt (die Enten) đói lắm đấy.', 'Ach, you again! The ducks (die Enten) are hungry today.'),
        ],
        choices: [
          { text: L('Bà dạy cháu vài từ tiếng Đức nhé (+XP)', 'Teach me some German words (+XP)'), if: { not: { test: 'park.wordsToday' } }, effect: { type: 'action', id: 'park.words' }, next: 'words' },
          { text: L('Vịt thích ăn gì ạ?', 'What do the ducks like?'), next: 'ducks' },
          { text: L('Công viên có gì bí mật không bà?', 'Does the park have any secrets?'), next: 'secrets' },
          { text: L('Tschüss, Oma Gerda!', 'Tschüss, Oma Gerda!') },
        ],
      },
      words: {
        text: [
          L('"die Ente" — con vịt. "der Igel" — con nhím. "die Sternschnuppe" — sao băng. Đọc theo bà nào!', '"die Ente" — duck. "der Igel" — hedgehog. "die Sternschnuppe" — shooting star. Repeat after me!'),
          L('"die Schaukel" — xích đu. "der Teich" — cái hồ nhỏ. "Gänseblümchen" — hoa cúc dại. Sehr gut!', '"die Schaukel" — swing. "der Teich" — pond. "Gänseblümchen" — daisy. Sehr gut!'),
        ],
        next: 'hello',
      },
      ducks: {
        text: L(
          'Bánh mì nhiều không tốt cho vịt đâu, nhưng một mẩu Brötchen thì chúng mê lắm. Mua ở Bäckerei đầu phố rồi ra đây cho ăn nhé.',
          'Too much bread isn’t good for ducks, but a little piece of Brötchen makes them very happy. Buy one at the bakery and come feed them.',
        ),
        next: 'hello',
      },
      secrets: {
        text: [
          L('Góc xa nhất, sau bụi cây, có một chú nhím (der Igel) sống. Bà gọi nó là Herbert.', 'In the far corner, behind the bushes, lives a hedgehog. I call him Herbert.'),
          L('Ban ngày ra bãi cỏ gần kiosk mà xem, cúc dại nở trắng cả. Còn đêm khuya thì ngắm trời trên hồ — mùa này hay có sao băng.', 'By day, look at the grass near the kiosk — full of daisies. And late at night, watch the sky over the pond — shooting stars this time of year.'),
          L('Mấy anh chị chơi geocaching hay giấu hộp trong hốc cây gần sân chơi. Suỵt, đừng nói ai nhé!', 'Geocachers like to hide boxes in a tree hollow near the playground. Psst, don’t tell anyone!'),
        ],
        next: 'hello',
      },
    },
  },
}
