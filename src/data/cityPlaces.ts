import type { Localized } from '../i18n/localized'
import type { SignOptions } from '../game/scenes/shared/textures'

/**
 * Functional buildings of the new district south of Hồ Gươm (1.33, scene `hangKhay`). Each has a sign and a door
 * (ActionSpot `city-<id>` → action `city.visit` with the id). Nothing happens inside yet: the door tells you the
 * place opens soon. To give a building a real feature later, set `action` (a registered game action, it then runs
 * instead of the "opening soon" note) and, if wanted, `hours`.
 * Where each one stands: scenes/HangKhay/layout.ts (BUILDINGS).
 */

export type CityPlaceId = 'bank' | 'supermarket' | 'bookstore' | 'cinema' | 'restaurant' | 'hotel' | 'phoneShop' | 'karaoke' | 'gym' | 'hospital' | 'school' | 'police' | 'library' | 'flowerMarket' | 'goldShop'

export interface CityPlace {
  id: CityPlaceId
  name: Localized
  sign: SignOptions
  /** What you see / hear at the door (shown with the "opening soon" note). */
  blurb: Localized
  /** Opening hours [from, to) in game hours; outside them the door is closed. */
  hours?: [number, number]
  /** A game action that runs instead of the note, once the place has a feature (arg = the place id). */
  action?: string
}

const sign = (title: string, subtitle: string, background: string, color = '#ffffff', border = '#ffffff', aspect = 5.5): SignOptions => ({ title, subtitle, background, color, border, accent: color, aspect })

export const CITY_PLACES: Record<CityPlaceId, CityPlace> = {
  bank: {
    id: 'bank',
    name: { vi: 'Ngân hàng Hồ Gươm', en: 'Hồ Gươm Bank' },
    sign: sign('NGÂN HÀNG HỒ GƯƠM', 'Tiết kiệm · Chuyển tiền · ATM 24/7', '#1f6f5c', '#fff6d8', '#f4c04e'),
    blurb: { vi: 'Máy lấy số kêu „tít". Chị giao dịch viên cười: „Quầy mới đang lắp đặt, em quay lại sau nhé!"', en: 'The ticket machine beeps. The new counter is still being set up.' },
    hours: [8, 17],
  },
  supermarket: {
    id: 'supermarket',
    name: { vi: 'Siêu thị Bờ Hồ', en: 'Lakeside supermarket' },
    sign: sign('SIÊU THỊ BỜ HỒ', 'Rau sạch · Đồ khô · Hàng Việt', '#d4473b', '#ffe08a', '#ffe08a'),
    blurb: { vi: 'Nhân viên đang xếp hàng lên kệ, mùi bánh mì mới ra lò thơm phức.', en: 'Staff are stocking the shelves; fresh bread smells good.' },
    hours: [7, 22],
  },
  bookstore: {
    id: 'bookstore',
    name: { vi: 'Nhà sách Tràng Tiền', en: 'Tràng Tiền bookshop' },
    sign: sign('NHÀ SÁCH TRÀNG TIỀN', 'Sách · Văn phòng phẩm · Sách ngoại văn', '#3f5f8f', '#ffffff', '#cfe0ff'),
    blurb: { vi: 'Kệ sách tiếng Đức ở tầng hai đang được dọn dẹp. „Tuần sau có sách luyện thi B1 nhé em!"', en: 'The German shelf upstairs is being sorted.' },
    hours: [8, 21],
  },
  cinema: {
    id: 'cinema',
    name: { vi: 'Rạp chiếu phim Bờ Hồ', en: 'Lakeside cinema' },
    sign: sign('RẠP CHIẾU PHIM BỜ HỒ', 'Phim mới mỗi thứ Sáu · Bắp rang bơ', '#2a2440', '#ffd76a', '#ff6f91', 6),
    blurb: { vi: 'Áp phích phim mới dán kín cửa kính. Quầy vé ghi: „Sắp mở lại sau sửa chữa".', en: 'New posters on the glass. "Reopening soon".' },
    hours: [9, 24],
  },
  restaurant: {
    id: 'restaurant',
    name: { vi: 'Nhà hàng Bờ Hồ', en: 'Lakeside restaurant' },
    sign: sign('NHÀ HÀNG BỜ HỒ', 'Cơm gia đình · Nem cua bể · Lẩu', '#8a3b1f', '#ffe7b0', '#ffd76a'),
    blurb: { vi: 'Mùi cá kho, canh cua bay ra tận cửa. Chú Thành đứng đón khách.', en: 'Smells of braised fish and crab soup.' },
    hours: [10, 22],
    // 1.40: a real restaurant (systems/eateries.ts) and a Grab pick-up point; 1.41: you walk in (data/shopRooms.ts)
    action: 'shop.enter',
  },
  hotel: {
    id: 'hotel',
    name: { vi: 'Khách sạn Hoàn Kiếm', en: 'Hoàn Kiếm Hotel' },
    sign: sign('KHÁCH SẠN HOÀN KIẾM', 'Hotel · Phòng view hồ', '#6b4a8a', '#fff3c4', '#f4c04e'),
    blurb: { vi: 'Sảnh lát đá bóng loáng, lễ tân chào bằng ba thứ tiếng. Phòng chưa nhận khách lẻ.', en: 'A shiny lobby; no rooms for walk-ins yet.' },
  },
  phoneShop: {
    id: 'phoneShop',
    name: { vi: 'Điện thoại Minh Phát', en: 'Minh Phát phones' },
    sign: sign('ĐIỆN THOẠI MINH PHÁT', 'Mua bán · Sửa chữa · Thay màn hình', '#ffcf3f', '#2a2a2a', '#2a2a2a'),
    blurb: { vi: 'Anh thợ đang thay màn hình cho ai đó. „Sửa điện thoại vỡ à? Sắp nhận rồi, đợi anh ít hôm!"', en: 'Phone repairs coming soon.' },
    hours: [8, 21],
  },
  karaoke: {
    id: 'karaoke',
    name: { vi: 'Karaoke Hát Cho Nhau Nghe', en: 'Karaoke "Sing for each other"' },
    sign: sign('KARAOKE', 'Hát Cho Nhau Nghe · Phòng VIP', '#c2185b', '#fff0f6', '#ffd1e8', 4.2),
    blurb: { vi: 'Tiếng hát „Hà Nội mùa vắng những cơn mưa" vọng ra hành lang. Phòng đã kín chỗ hôm nay.', en: 'Someone is belting out a ballad. All rooms are taken today.' },
    hours: [14, 24],
  },
  gym: {
    id: 'gym',
    name: { vi: 'Phòng tập Khỏe Đẹp', en: 'Khỏe Đẹp gym' },
    sign: sign('PHÒNG TẬP KHỎE ĐẸP', 'Gym · Yoga · Aerobic', '#2f8f6f', '#ffffff', '#c9f0dc'),
    blurb: { vi: 'Nhạc sôi động, mấy cô chú đang tập aerobic. Thẻ hội viên sắp mở bán.', en: 'Aerobics in full swing; memberships soon.' },
    hours: [5, 22],
  },
  hospital: {
    id: 'hospital',
    name: { vi: 'Bệnh viện Đa khoa Hoàn Kiếm', en: 'Hoàn Kiếm General Hospital' },
    sign: sign('BỆNH VIỆN ĐA KHOA HOÀN KIẾM', 'Khám bệnh · Cấp cứu 24/24', '#ffffff', '#c8322b', '#c8322b', 7),
    blurb: { vi: 'Hành lang thơm mùi thuốc sát trùng. Cô y tá: „Khám sức khỏe đi Đức à? Phòng khám mới sắp mở đấy."', en: 'A nurse mentions a new clinic opening soon.' },
  },
  school: {
    id: 'school',
    name: { vi: 'Trường THCS Hàng Khay', en: 'Hàng Khay secondary school' },
    sign: sign('TRƯỜNG THCS HÀNG KHAY', 'Dạy tốt · Học tốt', '#f4c04e', '#8a1f1f', '#8a1f1f', 6.5),
    blurb: { vi: 'Tiếng trống trường vang lên, học sinh ùa ra sân. Bác bảo vệ: „Người ngoài chưa vào được đâu cháu!"', en: 'The school drum sounds; no visitors for now.' },
    hours: [7, 17],
  },
  police: {
    id: 'police',
    name: { vi: 'Công an phường Tràng Tiền', en: 'Tràng Tiền ward police' },
    sign: sign('CÔNG AN PHƯỜNG TRÀNG TIỀN', 'Vì nhân dân phục vụ', '#c8322b', '#ffe08a', '#ffe08a', 6.5),
    blurb: { vi: 'Anh công an trực ban gật đầu chào. „Làm giấy tờ thì chờ thông báo mới nhé!"', en: 'The duty officer nods: paperwork services coming later.' },
  },
  library: {
    id: 'library',
    name: { vi: 'Thư viện Hoàn Kiếm', en: 'Hoàn Kiếm library' },
    sign: sign('THƯ VIỆN HOÀN KIẾM', 'Đọc sách miễn phí · Phòng tự học', '#5b6f3a', '#fff6d8', '#e7d9a8'),
    blurb: { vi: 'Phòng đọc yên tĩnh, chỉ có tiếng lật trang. Thẻ thư viện sắp phát hành.', en: 'Quiet reading room; library cards soon.' },
    hours: [8, 20],
  },
  flowerMarket: {
    id: 'flowerMarket',
    name: { vi: 'Chợ hoa Bờ Hồ', en: 'Lakeside flower market' },
    sign: sign('CHỢ HOA BỜ HỒ', 'Hoa tươi mỗi sáng', '#e86a92', '#ffffff', '#ffe0ec', 4.5),
    blurb: { vi: 'Các cô bán hoa đang bó hoa sen, hoa cúc họa mi. „Mua hoa tặng mẹ không cháu? Ít hôm nữa nhé!"', en: 'Flower sellers are tying bunches; buying comes later.' },
    hours: [5, 19],
  },
  // 1.34: a real shop — chú Năng buys and sells gold (systems/gold.ts); hours = CONFIG.gold.hours
  goldShop: {
    id: 'goldShop',
    name: { vi: 'Tiệm Vàng Kim Thành', en: 'Kim Thành gold shop' },
    sign: sign('TIỆM VÀNG KIM THÀNH', 'Vàng miếng · Nhẫn tròn 9999 · Mua bán theo chỉ, cây', '#b3261e', '#ffd76a', '#ffd76a', 5),
    blurb: { vi: 'Tủ kính sáng loáng những miếng vàng.', en: 'Glass cases full of gold.' },
    hours: [8, 20],
    // 1.41: a room inside (data/shopRooms.ts) with chú Năng behind the counter
    action: 'shop.enter',
  },
}
