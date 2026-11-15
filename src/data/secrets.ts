import type { Localized } from '../i18n/localized'
import type { SceneId } from '../store/worldStore'
import type { Condition } from './conditions'

/**
 * Hidden things to discover (exploration): walk close to one and it is found — a card tells
 * its little story and gives a reward. A faint sparkle shows within a few metres; the
 * Quest log's "Khám phá" tab lists hints for the ones still missing.
 * Flags: `secret.<id>` = found.
 */

export interface SecretReward {
  money?: number
  mood?: number
  energy?: number
  /** Free clothing (shop `gift` in data/clothes.ts). */
  clothing?: string
  /** German XP (vocabulary practice). */
  german?: number
}

export interface SecretDef {
  id: string
  scene: SceneId
  at: { x: number; z: number }
  /** How close you must get (m). */
  radius: number
  /** Extra condition (time of day…). */
  when?: Condition
  icon: string
  name: Localized
  /** Shown in the list while not found yet. */
  hint: Localized
  /** The little story on the discovery card. */
  story: Localized
  reward: SecretReward
}

const L = (vi: string, en: string, de?: string): Localized => ({ vi, en, de })

export const SECRETS: SecretDef[] = [
  // --- Hà Nội -------------------------------------------------------------------------
  {
    id: 'meoNgo',
    scene: 'vietnam',
    at: { x: 24.9, z: -10.2 },
    radius: 1.3,
    icon: '🐈',
    name: L('Con mèo trong ngõ', 'The alley cat', 'Die Gassenkatze'),
    hint: L('Có tiếng "meo" từ một con ngõ hẹp cạnh đình làng…', 'A "meow" from a narrow alley next to the communal house…'),
    story: L(
      'Một con mèo mướp nằm phơi nắng trên thùng gỗ. Nó dụi đầu vào tay bạn rồi… để lại một chiếc băng đô tai mèo ai đánh rơi. Coi như quà làm quen!',
      'A tabby cat naps on a crate. It nuzzles your hand and… there’s a cat-ear headband someone dropped. A welcome gift!',
    ),
    reward: { mood: 12, clothing: 'giftCatEars' },
  },
  {
    id: 'gieng',
    scene: 'vietnam',
    at: { x: 25.0, z: -12.2 },
    radius: 1.0,
    icon: '🪙',
    name: L('Giếng cổ cuối ngõ', 'The old well', 'Der alte Brunnen'),
    hint: L('Cuối con ngõ ấy còn sâu hơn bạn tưởng.', 'That alley goes deeper than you think.'),
    story: L(
      'Một cái giếng đá rêu phong từ thời phố cổ còn là làng. Dưới đáy lấp lánh một đồng xu cổ — bà cụ đầu ngõ bảo cứ giữ lấy, lấy may đi xa.',
      'A mossy stone well from when the Old Quarter was a village. An old coin glints at the bottom — the granny at the corner says keep it, for luck abroad.',
    ),
    reward: { money: 50_000, mood: 6 },
  },
  {
    id: 'rua',
    scene: 'vietnam',
    at: { x: 30.6, z: 13.6 },
    radius: 1.5,
    icon: '🐢',
    name: L('Bóng rùa Hồ Gươm', 'The turtle of Hồ Gươm', 'Die Schildkröte vom Hồ Gươm'),
    hint: L('Đằng sau chợ đêm, sát lan can hồ, mặt nước đôi khi gợn sóng lạ…', 'Behind the night market, by the lake railing, the water sometimes ripples strangely…'),
    story: L(
      'Một cái mai rùa to như cái nia nổi lên rồi lặn mất. Người ta bảo ai thấy rùa Hồ Gươm sẽ gặp may — chuyến đi Đức chắc chắn suôn sẻ!',
      'A shell as big as a winnowing basket surfaces, then sinks away. They say whoever sees the lake’s turtle has good luck — Germany will go well!',
    ),
    reward: { mood: 15, clothing: 'giftTurtleTee' },
  },
  {
    id: 'caDa',
    scene: 'vietnam',
    at: { x: -29.4, z: -5.9 },
    radius: 1.2,
    icon: '🌳',
    name: L('Miếu thổ địa dưới gốc đa', 'The shrine under the banyan', 'Der Schrein unter dem Banyanbaum'),
    hint: L('Cây đa cuối phố phía tây có giữ một bí mật nhỏ.', 'The banyan at the west end keeps a small secret.'),
    story: L(
      'Bạn thắp một nén hương ở cái miếu nhỏ xíu dưới gốc đa. Gió thổi mát rượi, tự nhiên thấy khỏe hẳn ra.',
      'You light a stick of incense at the tiny shrine under the banyan. A cool breeze — suddenly you feel stronger.',
    ),
    reward: { energy: 15, mood: 5 },
  },
  {
    id: 'tranhTuong',
    scene: 'vietnam',
    at: { x: 11.8, z: -12.0 },
    radius: 1.4,
    icon: '🎨',
    name: L('Bức tranh tường cuối phố', 'The mural at the end of the road', 'Das Wandbild'),
    hint: L('Đi hết con đường bên cạnh quán cà phê xem sao.', 'Walk all the way up the side road by the café.'),
    story: L(
      'Ai đó vẽ một chiếc xe đạp chở đầy hoa và dòng chữ "Hà Nội luôn chờ bạn về". Bạn chụp một tấm ảnh để mang theo.',
      'Someone painted a bicycle full of flowers and the words "Hà Nội is always waiting for you". You take a photo to bring along.',
    ),
    reward: { mood: 10 },
  },
  {
    id: 'xeDapCo',
    scene: 'vietnam',
    at: { x: 23.0, z: -8.7 },
    radius: 1.0,
    icon: '🚲',
    name: L('Chiếc Peugeot của ông từ', 'The temple keeper’s Peugeot', 'Das alte Peugeot-Rad'),
    hint: L('Góc sân đình có thứ gì đó đã dựng ở đó rất lâu.', 'Something has stood in the corner of the temple yard for a long time.'),
    story: L(
      'Chiếc xe đạp Peugeot đời 1960 của ông từ. Ông kể ngày xưa đạp nó đi khắp Hà Nội chở bà đi chơi. "Đồ cũ mà bền, như tình cảm vậy cháu ạ."',
      'The keeper’s 1960 Peugeot bike. He used to ride Grandma all over Hà Nội on it. "Old but sturdy — like love, child."',
    ),
    reward: { mood: 8 },
  },
  {
    id: 'denLong',
    scene: 'vietnam',
    at: { x: 24.0, z: 12.4 },
    radius: 3.0,
    when: { any: [{ hourBetween: [19, 24] }, { hourBetween: [0, 1] }] },
    icon: '🏮',
    name: L('Chợ đêm lên đèn', 'The night market lights up', 'Der Nachtmarkt leuchtet'),
    hint: L('Có một nơi chỉ đẹp nhất sau 7 giờ tối.', 'One place is at its prettiest after 7 pm.'),
    story: L(
      'Hàng trăm chiếc đèn lồng đỏ vàng bật sáng cùng lúc. Mùi bánh tráng nướng, tiếng rao chè… Đây là Hà Nội bạn sẽ nhớ nhất.',
      'Hundreds of red and gold lanterns light up at once. Grilled rice paper, the sweet-soup seller calling… This is the Hà Nội you’ll miss most.',
    ),
    reward: { mood: 15 },
  },
  {
    id: 'thuCu',
    scene: 'vietnam',
    at: { x: 33.3, z: -3.0 },
    radius: 0.9,
    icon: '✉️',
    name: L('Lá thư năm 1989', 'A letter from 1989', 'Ein Brief von 1989'),
    hint: L('Hiệu sách cũ có một góc chẳng ai để ý.', 'The old bookshop has a corner nobody notices.'),
    story: L(
      'Kẹp trong cuốn từ điển Việt–Đức cũ là lá thư một chàng trai viết từ Leipzig năm 1989: "Mẹ ơi, tiếng Đức khó lắm, nhưng con sẽ cố." Bạn mỉm cười — 35 năm sau, vẫn là câu chuyện ấy.',
      'Tucked in an old Vietnamese–German dictionary: a letter a young man wrote from Leipzig in 1989: "Mum, German is hard, but I’ll keep trying." You smile — 35 years later, the same story.',
    ),
    reward: { mood: 10, german: 25 },
  },
  {
    id: 'anhCu',
    scene: 'home',
    at: { x: -0.4, z: -2.7 },
    radius: 0.8,
    icon: '📷',
    name: L('Ảnh cưới của bố mẹ', 'Mum and Dad’s wedding photo', 'Das Hochzeitsfoto'),
    hint: L('Trên bàn thờ, sau khung ảnh ông bà…', 'On the altar, behind the grandparents’ photo…'),
    story: L(
      'Một tấm ảnh đen trắng: bố mẹ ngày cưới, bố gầy nhom, mẹ cười tít mắt. Phía sau mẹ ghi: "Mong con sau này đi thật xa, rồi nhớ đường về."',
      'A black-and-white photo: Mum and Dad on their wedding day. On the back, in Mum’s hand: "May our child go far one day — and remember the way home."',
    ),
    reward: { mood: 12 },
  },
  {
    id: 'khanBa',
    scene: 'home',
    at: { x: -3.9, z: 0.2 },
    radius: 0.9,
    icon: '🧣',
    name: L('Chiếc khăn bà đan', 'Grandma’s knitted scarf', 'Omas Schal'),
    hint: L('Cuối giường có một túi đồ cũ chưa ai mở.', 'At the foot of the bed, an old bag nobody has opened.'),
    story: L(
      'Một chiếc khăn len vàng bà nội đan từ mùa đông năm nào, kèm mẩu giấy: "Cho cháu sang Tây khỏi lạnh." Bên Đức chắc chắn sẽ cần!',
      'A yellow wool scarf Grandma knitted long ago, with a note: "So you won’t be cold over there." You’ll need it in Germany!',
    ),
    reward: { mood: 10, clothing: 'giftScarf' },
  },
  // --- Lindenstraße ---------------------------------------------------------------------
  {
    id: 'igel',
    scene: 'germany',
    at: { x: 32.5, z: -11.2 },
    radius: 1.4,
    icon: '🦔',
    name: L('Chú nhím trong bụi cây', 'The hedgehog in the bush', 'Der Igel im Gebüsch'),
    hint: L('Góc xa nhất của Stadtpark có tiếng sột soạt.', 'Rustling in the far corner of the Stadtpark.'),
    story: L(
      'Một chú nhím (der Igel) thò mũi ra khỏi đống lá. Ở Đức người ta còn để sẵn nhà nhỏ cho nhím ngủ đông đấy!',
      'A hedgehog (der Igel) pokes its nose out of the leaves. In Germany people even build little houses for hedgehogs to hibernate in!',
    ),
    reward: { mood: 12, german: 10 },
  },
  {
    id: 'geocache',
    scene: 'germany',
    at: { x: 20.6, z: -11.5 },
    radius: 1.0,
    icon: '📦',
    name: L('Hộp geocache', 'The geocache', 'Der Geocache'),
    hint: L('Một cái cây trong công viên có hốc rỗng…', 'A tree in the park has a hollow…'),
    story: L(
      'Trong hốc cây là một hộp nhựa nhỏ: sổ ký tên của dân "geocaching" và 5 € kèm lời nhắn "Für den nächsten Finder — viel Spaß!" Bạn ký tên mình bằng tiếng Việt.',
      'In the hollow: a little box with a geocachers’ logbook and €5 with the note "For the next finder — have fun!" You sign your name in Vietnamese.',
    ),
    reward: { money: 5, mood: 8, german: 10 },
  },
  {
    id: 'handschuh',
    scene: 'germany',
    at: { x: 22.0, z: -5.6 },
    radius: 1.2,
    icon: '🧤',
    name: L('Chiếc găng tay trên tượng', 'The glove on the statue', 'Der Handschuh am Denkmal'),
    hint: L('Bức tượng ở cổng công viên đang giữ hộ ai đó một món đồ.', 'The statue at the park gate is keeping something safe for someone.'),
    story: L(
      'Ai đánh rơi một chiếc găng tay, người qua đường nhặt lên đặt lên tay tượng cho dễ thấy. Ở Đức, đồ rơi thường được "trả" kiểu này!',
      'Someone lost a glove and a passer-by put it on the statue’s hand so it’s easy to spot. In Germany, lost things are often "returned" like this!',
    ),
    reward: { mood: 8 },
  },
  {
    id: 'blumenwiese',
    scene: 'germany',
    at: { x: 31.2, z: -6.2 },
    radius: 1.4,
    when: { hourBetween: [7, 20] },
    icon: '🌼',
    name: L('Bãi cúc dại', 'The daisy meadow', 'Die Gänseblümchenwiese'),
    hint: L('Ban ngày, một góc cỏ trong công viên nở đầy hoa.', 'By day, one patch of the park is full of flowers.'),
    story: L(
      'Một bãi cúc dại (Gänseblümchen) trắng muốt. Bạn ngồi kết một vòng hoa đội đầu, như hồi bé ở quê.',
      'A meadow of white daisies (Gänseblümchen). You sit and weave a flower crown, just like as a kid back home.',
    ),
    reward: { mood: 12, clothing: 'giftFlowerCrown' },
  },
  {
    id: 'sternschnuppe',
    scene: 'germany',
    at: { x: 25.0, z: -9.0 },
    radius: 5.0,
    when: { any: [{ hourBetween: [21, 24] }, { hourBetween: [0, 4] }] },
    icon: '🌠',
    name: L('Sao băng trên hồ', 'A shooting star over the pond', 'Sternschnuppe über dem Teich'),
    hint: L('Đêm muộn, ra hồ trong công viên mà ngắm trời.', 'Late at night, go and look at the sky over the park pond.'),
    story: L(
      'Một vệt sao băng vụt qua mặt hồ. Bạn kịp ước: "Mong cả nhà ở Hà Nội luôn khỏe." Ở Đức người ta nói: "Wünsch dir was!"',
      'A shooting star streaks over the pond. You make a wish: "May my family in Hà Nội stay well." Germans say: "Wünsch dir was!"',
    ),
    reward: { mood: 20 },
  },
  {
    id: 'flaschenpost',
    scene: 'germany',
    at: { x: -29.6, z: 0.2 },
    radius: 1.2,
    icon: '🍾',
    name: L('Thư trong chai', 'A message in a bottle', 'Flaschenpost'),
    hint: L('Đài phun nước phía tây có thứ gì đó trôi dập dềnh.', 'Something bobs in the fountain at the west end.'),
    story: L(
      'Một cái chai Pfand có lá thư bên trong: "Wer das liest, ist nicht allein. — Ai đọc được dòng này, bạn không cô đơn đâu." Hình như của một người nhập cư khác.',
      'A deposit bottle with a note inside: "Whoever reads this is not alone." It seems to be from another newcomer.',
    ),
    reward: { mood: 14, german: 10 },
  },
  {
    id: 'mieze',
    scene: 'germany',
    at: { x: -12.6, z: -3.9 },
    radius: 1.0,
    icon: '🐱',
    name: L('Mieze ở thùng rác', 'Mieze by the bins', 'Mieze bei den Tonnen'),
    hint: L('Cạnh mấy thùng rác phân loại có một "người" canh gác.', 'Someone guards the recycling bins.'),
    story: L(
      'Một cô mèo trắng tên Mieze (theo cái vòng cổ) canh thùng rác như thanh tra phân loại rác. Bạn bỏ chai nhựa vào đúng thùng vàng, Mieze gật gù hài lòng.',
      'A white cat called Mieze (says the collar) guards the bins like a recycling inspector. You put a plastic bottle in the yellow bin — Mieze approves.',
    ),
    reward: { mood: 8 },
  },
  {
    id: 'notizUni',
    scene: 'university',
    at: { x: -5.9, z: -3.4 },
    radius: 0.9,
    icon: '📝',
    name: L('Ghi chú của sinh viên Schulz', 'Student Schulz’s note', 'Schulz’ alter Zettel'),
    hint: L('Kệ sách cuối thư viện, ngăn trên cùng…', 'The last bookshelf in the library, top shelf…'),
    story: L(
      'Một tờ giấy ố vàng ghi năm 1992: "Ich schaffe das nicht… — Mình không làm nổi…" và bên dưới, nét chữ khác: "Doch. Schritt für Schritt." Ký tên: K. Schulz. Giáo sư cũng từng như bạn!',
      'A yellowed note from 1992: "I can’t do this…" and below, in another hand: "Yes you can. Step by step." Signed: K. Schulz. The professor was once like you!',
    ),
    reward: { mood: 12, german: 20 },
  },
]

export const getSecret = (id: string) => SECRETS.find((s) => s.id === id)
