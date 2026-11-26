import type { Localized } from '../i18n/localized'

/**
 * 1.44 The sights of München (scenes/GermanyStreet/munich.ts places them). Standing at one shows a button
 * "Ngắm cảnh" → action `muc.sight` with the id: a short story about the place, flag `muc.seen.<id>`, and the
 * count of the "Khám phá München" side quest (test `muc.allSeen`).
 */

export interface MucSight {
  id: string
  name: Localized
  /** Where you stand to look (world x/z, half sizes). */
  zone: { x: number; z: number; halfX: number; halfZ: number }
  blurb: Localized
}

const L = (vi: string, en: string): Localized => ({ vi, en })

export const MUC_SIGHTS: MucSight[] = [
  {
    id: 'rathaus',
    name: L('Neues Rathaus · Glockenspiel', 'New Town Hall · Glockenspiel'),
    zone: { x: -19, z: -44.4, halfX: 3, halfZ: 1.2 },
    blurb: L(
      'Tòa thị chính mới trông như lâu đài Gothic nhưng mới xây năm 1909. Trên tháp có Glockenspiel: 11h, 12h và 17h hằng ngày, 32 hình nhân nhảy múa và đấu thương — cả quảng trường ngẩng cổ lên xem!',
      'Looks Gothic but was finished in 1909. The Glockenspiel plays at 11, 12 and 17 o’clock.',
    ),
  },
  {
    id: 'mariensaeule',
    name: L('Mariensäule', 'Mary’s Column'),
    zone: { x: -19, z: -29.6, halfX: 2.6, halfZ: 0.9 },
    blurb: L('Cột Đức Mẹ giữa Marienplatz (1638). Bốn thiên thần dưới chân đang đánh nhau với bốn con quái vật: chiến tranh, dịch bệnh, đói kém và dị giáo.', 'The column of 1638; four putti fight war, plague, hunger and heresy.'),
  },
  {
    id: 'frauenkirche',
    name: L('Frauenkirche', 'Frauenkirche'),
    zone: { x: -65.6, z: -43, halfX: 1.0, halfZ: 2.2 },
    blurb: L('Nhà thờ Đức Bà với hai tháp mũ tròn xanh — biểu tượng của München. Trong thành phố, không tòa nhà nào ở trung tâm được cao hơn 99 m của hai tháp này. Trên nền nhà có "dấu chân quỷ" nổi tiếng.', 'The twin towers with green caps; nothing in the centre may be taller than their 99 m.'),
  },
  {
    id: 'karlstor',
    name: L('Karlstor · Stachus', 'Karlstor · Stachus'),
    zone: { x: -63, z: -27, halfX: 1.6, halfZ: 3.4 },
    blurb: L('Cổng thành cũ từ thế kỷ 14, cửa vào phố đi bộ Neuhauser – Kaufinger Straße. Mùa hè đài phun nước Stachus là chỗ mát nhất thành phố, mùa đông thành sân trượt băng.', 'A 14th-century gate onto the pedestrian zone; the Stachus fountain becomes an ice rink in winter.'),
  },
  {
    id: 'sendlingerTor',
    name: L('Sendlinger Tor', 'Sendlinger Tor'),
    zone: { x: -30.75, z: -6.6, halfX: 3.2, halfZ: 1.0 },
    blurb: L('Một trong ba cổng thành cổ còn sót lại (1318). Đi qua cổng, theo Sendlinger Straße là tới Marienplatz.', 'One of the three old town gates left (1318).'),
  },
  {
    id: 'hauptbahnhof',
    name: L('München Hauptbahnhof', 'Munich Central Station'),
    zone: { x: -50, z: -2.4, halfX: 4, halfZ: 1.1 },
    blurb: L('Ga trung tâm: tàu ICE đi khắp nước Đức, S-Bahn ra sân bay, U-Bahn đi mọi ngóc ngách. Hơn 450.000 người qua đây mỗi ngày.', 'ICE trains, the S-Bahn to the airport, the U-Bahn — 450,000 people a day.'),
  },
  {
    id: 'viktualienmarkt',
    name: L('Viktualienmarkt · Maibaum', 'Viktualienmarkt · Maypole'),
    zone: { x: 20, z: -31.2, halfX: 2.0, halfZ: 0.9 },
    blurb: L('Chợ nông sản giữa phố cổ từ năm 1807: rau quả, phô mai, mật ong, vườn bia dưới tán dẻ ngựa. Cây Maibaum sọc xanh-trắng treo biển của các phường nghề.', 'The food market since 1807 with its blue-and-white maypole.'),
  },
  {
    id: 'hofbraeuhaus',
    name: L('Hofbräuhaus', 'Hofbräuhaus'),
    zone: { x: 15, z: -48.6, halfX: 2.2, halfZ: 0.9 },
    blurb: L('Quán bia nổi tiếng nhất thế giới (1589). Bên trong có ban nhạc kèn đồng, ly bia một lít ("Maß") và những vị khách quen giữ ly riêng trong tủ khóa.', 'The most famous beer hall (1589): brass band, one-litre Maß, regulars with their own locked mugs.'),
  },
  {
    id: 'feldherrnhalle',
    name: L('Odeonsplatz · Feldherrnhalle', 'Odeonsplatz · Feldherrnhalle'),
    zone: { x: -43, z: -82.6, halfX: 4, halfZ: 1.0 },
    blurb: L('Hành lang ba vòm theo kiểu Loggia dei Lanzi ở Florence, hai con sư tử canh trước bậc thềm. Người München hay xoa mõm sư tử ở Residenz gần đó để lấy may.', 'A copy of Florence’s Loggia dei Lanzi; rub a Residenz lion’s nose for luck.'),
  },
  {
    id: 'theatiner',
    name: L('Theatinerkirche', 'Theatine Church'),
    zone: { x: -55.4, z: -87.5, halfX: 0.9, halfZ: 3 },
    blurb: L('Nhà thờ Baroque màu vàng nghệ với mái vòm và hai tháp xoắn ốc, xây để tạ ơn khi hoàng tử Max Emanuel chào đời (1663).', 'The yellow baroque church built for the birth of an heir (1663).'),
  },
  {
    id: 'hofgarten',
    name: L('Hofgarten · Dianatempel', 'Hofgarten · Temple of Diana'),
    zone: { x: 6.5, z: -87, halfX: 2.2, halfZ: 2.2 },
    blurb: L('Vườn thượng uyển của Residenz. Trong đền Diana thường có người chơi đàn, và tối mùa hè có người nhảy tango.', 'The court garden; in summer people dance tango in the temple.'),
  },
  {
    id: 'hausDerKunst',
    name: L('Haus der Kunst', 'Haus der Kunst'),
    zone: { x: -20, z: -109.3, halfX: 4, halfZ: 0.7 },
    blurb: L('Bảo tàng nghệ thuật đương đại với hàng cột dài. Ngay sau lưng là sóng Eisbach.', 'Contemporary art behind a long colonnade; the Eisbach wave is right behind it.'),
  },
  {
    id: 'eisbach',
    name: L('Sóng Eisbach', 'Eisbach wave'),
    zone: { x: -25.5, z: -120.8, halfX: 2.4, halfZ: 0.8 },
    blurb: L('Lướt sóng giữa thành phố, cách biển 300 km! Dòng Eisbach chảy xiết tạo thành con sóng đứng cả năm — kể cả mùa đông có tuyết.', 'River surfing 300 km from the sea, all year round.'),
  },
  {
    id: 'monopteros',
    name: L('Monopteros', 'Monopteros'),
    zone: { x: -3, z: -132.4, halfX: 1.4, halfZ: 0.8 },
    blurb: L('Ngôi đền tròn kiểu Hy Lạp trên đồi trong Englischer Garten — chỗ ngắm hoàng hôn và đường chân trời có hai tháp Frauenkirche đẹp nhất.', 'A Greek temple on a hill — the best sunset view of the skyline.'),
  },
  {
    id: 'chinTurm',
    name: L('Chinesischer Turm', 'Chinese Tower'),
    zone: { x: 20, z: -128.2, halfX: 2.0, halfZ: 0.9 },
    blurb: L('Ngọn tháp gỗ 5 tầng kiểu Trung Hoa (1790) giữa vườn bia 7.000 chỗ ngồi. Cuối tuần có ban nhạc chơi trên tầng hai của tháp.', 'A wooden pagoda (1790) in a 7,000-seat beer garden.'),
  },
  {
    id: 'siegestor',
    name: L('Siegestor', 'Victory Gate'),
    zone: { x: -43, z: -140.6, halfX: 3, halfZ: 0.9 },
    blurb: L('Khải hoàn môn ở cuối Ludwigstraße, trên đỉnh là nữ thần Bavaria đánh xe sư tử. Mặt sau ghi: "Dành cho chiến thắng, bị chiến tranh phá hủy, nhắc nhở hòa bình".', '“Dedicated to victory, destroyed by war, urging peace.”'),
  },
  {
    id: 'lmu',
    name: L('Đại học LMU', 'LMU University'),
    zone: { x: -51.6, z: -129.5, halfX: 0.9, halfZ: 2.4 },
    blurb: L('Ludwig-Maximilians-Universität, một trong những đại học lâu đời nhất nước Đức (1472). Trước cổng là quảng trường Geschwister-Scholl với hai đài phun nước.', 'One of Germany’s oldest universities (1472).'),
  },
  {
    id: 'isar',
    name: L('Bờ sông Isar', 'Isar riverbank'),
    zone: { x: 44, z: -50, halfX: 1.6, halfZ: 4 },
    blurb: L('Mùa hè cả thành phố ra bãi sỏi sông Isar nướng thịt, tắm nắng, thả bè. Nước Isar chảy thẳng từ dãy Alps xuống nên lạnh buốt!', 'In summer all Munich grills and suns on the gravel banks. The water comes straight from the Alps.'),
  },
  {
    id: 'friedensengel',
    name: L('Friedensengel', 'Angel of Peace'),
    zone: { x: 59.8, z: -93, halfX: 1.0, halfZ: 2.4 },
    blurb: L('Thiên thần Hòa bình mạ vàng trên cột cao, đứng nhìn về thành phố từ bờ đông sông Isar (1899).', 'The golden angel on the east bank (1899).'),
  },
]

export const MUC_SIGHT_IDS = MUC_SIGHTS.map((s) => s.id)
