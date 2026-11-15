import type { Localized } from '../i18n/localized'
import type { Condition } from './conditions'

/** Achievements (plan §5.9). Unlocked once their condition holds; shown in the bag. */

export interface AchievementDef {
  id: string
  icon: string
  name: Localized
  desc: Localized
  when: Condition
}

const A = (id: string, icon: string, vi: string, en: string, dVi: string, dEn: string, when: Condition): AchievementDef => ({
  id,
  icon,
  name: { vi, en },
  desc: { vi: dVi, en: dEn },
  when,
})

export const ACHIEVEMENTS: AchievementDef[] = [
  A('barista', '☕', 'Barista tập sự', 'Apprentice barista', 'Phục vụ 20 cốc cà phê', 'Serve 20 drinks', { flag: 'stats.served', atLeast: 20 }),
  A('traDa', '🧊', 'Chiến hữu trà đá', 'Iced-tea comrade', 'Uống 5 cốc trà đá với Bà Thu', 'Drink 5 iced teas at Granny Thu’s', { flag: 'stats.traDa', atLeast: 5 }),
  A('derdiedas', '🎯', 'Der, die, das? Dễ!', 'Der, die, das? Easy!', 'Một bài học không sai câu nào', 'A lesson without a single mistake', { flag: 'stats.perfectLessons', atLeast: 1 }),
  A('b1', '🎓', 'B1 rồi nè!', 'B1 achieved!', 'Thi đậu chứng chỉ B1', 'Pass the B1 exam', { germanLevel: 3 }),
  A('terminHunter', '📅', 'Termin Hunter', 'Termin Hunter', 'Săn được Termin ngay lần đầu tiên', 'Get a Termin on your very first try', { flag: 'achv.terminFirstTry' }),
  A('visa', '🛂', 'Có visa rồi!', 'Visa granted!', 'Phỏng vấn visa thành công', 'Pass the visa interview', { flag: 'visa.readyDay' }),
  A('hallo', '🇩🇪', 'Hallo Deutschland', 'Hallo Deutschland', 'Đặt chân đến nước Đức', 'Arrive in Germany', { flag: 'de.arrived' }),
  A('wg', '🏠', 'Có nhà rồi', 'Got a room', 'Vượt qua WG-Casting', 'Pass a WG casting', { flag: 'de.wg' }),
  A('buerokratie', '📎', 'Bürokratie-Profi', 'Bureaucracy pro', 'Anmeldung, ngân hàng và bảo hiểm — xong hết!', 'Anmeldung, bank and insurance — all done!', { test: 'de.paperworkDone' }),
  A('careHeart', '💗', 'Trái tim điều dưỡng', 'Heart of care', 'Một ca chăm sóc với 100% hài lòng', 'A care shift at 100% satisfaction', { flag: 'achv.perfectCare' }),
  A('pfand50', '🍾', 'Thợ săn Pfand', 'Pfand hunter', 'Trả 50 chai Pfand', 'Return 50 Pfand bottles', { flag: 'stats.bottles', atLeast: 50 }),
  A('pfandKoenig', '👑', 'Pfandkönig', 'Pfand king', 'Trả 1.000 chai Pfand', 'Return 1,000 Pfand bottles', { flag: 'stats.bottles', atLeast: 1000 }),
  A('schwarzfahrer', '🎫', 'Đi tàu chui…', 'Fare dodger…', 'Đi tàu không có vé', 'Ride without a ticket', { flag: 'stats.schwarzfahren', atLeast: 1 }),
  A('nightOwl', '🦉', 'Cú đêm', 'Night owl', 'Ngủ gục ngoài đường một lần', 'Fall asleep on the street once', { flag: 'stats.passedOut', atLeast: 1 }),
  A('student', '🎒', 'Sinh viên Đức', 'Student in Germany', 'Nhập học ở Đại học Lindenberg', 'Enrol at Lindenberg University', { flag: 'uni.enrolled' }),
  A('bachelor', '🎓', 'Cử nhân!', 'Bachelor!', 'Bảo vệ thành công luận văn', 'Defend your Bachelor thesis', { flag: 'uni.degree' }),
  A('packMule', '🐪', 'Lạc đà thồ hàng', 'Pack mule', 'Nhồi ba lô đầy tới giới hạn', 'Fill your backpack to the limit', { flag: 'achv.bagFull' }),
  A('zwischen', '📝', 'Nửa chặng đường', 'Halfway there', 'Thi đậu giữa khóa', 'Pass the mid-term exam', { flag: 'care.zwischen' }),
  A('fachkraft', '🩺', 'Pflegefachkraft', 'Qualified nurse', 'Thi đậu tốt nghiệp điều dưỡng', 'Pass the final nursing exam', { flag: 'care.examen' }),
  A('contract', '✍️', 'Hợp đồng không thời hạn', 'Permanent contract', 'Ký hợp đồng chính thức', 'Sign a permanent contract', { flag: 'job.fulltime' }),
  A('tet', '🧧', 'Tết đoàn viên', 'Tết reunion', 'Về quê ăn Tết với gia đình', 'Go home for Tết with your family', { flag: 'trip.done' }),
  A('ownFlat', '🔑', 'Tổ ấm riêng', 'A home of your own', 'Thuê căn hộ của riêng mình', 'Rent a flat of your own', { flag: 'de.ownFlat' }),
  A('residence', '🏅', 'Định cư rồi!', 'Here to stay!', 'Nhận giấy định cư Niederlassungserlaubnis', 'Receive permanent residence', { flag: 'pr.granted' }),
  A('citizen', '🪪', 'Công dân mới', 'New citizen', 'Nhập quốc tịch Đức', 'Become a German citizen', { flag: 'cz.granted' }),
  A('fashion', '👕', 'Sành điệu', 'Fashionista', 'Mua 3 món đồ hoặc kiểu tóc', 'Buy 3 clothes or hairstyles', { flag: 'stats.clothes', atLeast: 3 }),
  A('explorer', '🧭', 'Nhà thám hiểm', 'Explorer', 'Khám phá 5 bí mật', 'Discover 5 secrets', { flag: 'stats.secrets', atLeast: 5 }),
  A('localLegend', '🗝️', 'Thổ địa chính hiệu', 'Local legend', 'Khám phá tất cả bí mật', 'Discover every secret', { flag: 'secret.all' }),
  A('fortune', '🎋', 'Xin quẻ đầu năm', 'Fortune seeker', 'Xin quẻ ở đình làng', 'Draw a fortune stick at the đình', { flag: 'fortune.first' }),
  A('ducks', '🦆', 'Bạn của lũ vịt', 'Friend of the ducks', 'Cho vịt ăn 5 lần', 'Feed the ducks 5 times', { flag: 'stats.ducks', atLeast: 5 }),
  A('bookworm', '📚', 'Mọt sách', 'Bookworm', 'Đọc sách ở hiệu sách cũ 5 ngày', 'Read at the old bookshop on 5 days', { flag: 'stats.booksRead', atLeast: 5 }),
]
