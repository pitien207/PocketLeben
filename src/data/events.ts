import type { Localized } from '../i18n/localized'
import type { Condition } from './conditions'

/**
 * Random morning events (plan §5.7): one may happen when you wake up.
 * Money is in the current country's currency.
 */

export interface GameEvent {
  id: string
  text: Localized
  /** Relative chance (default 1). */
  weight?: number
  when?: Condition
  money?: number
  energy?: number
  mood?: number
  /** A game action run after the toast (e.g. a scam text message with a choice). */
  action?: { id: string; arg?: string }
}

const E = (id: string, vi: string, en: string, fx: Omit<GameEvent, 'id' | 'text'>): GameEvent => ({ id, text: { vi, en }, ...fx })

/** Chance that any event happens on a given morning. */
export const EVENT_CHANCE = 0.45

export const EVENTS: GameEvent[] = [
  // Vietnam (story 2.1 §7)
  E('momMoney', '📩 Mẹ chuyển khoản: „Mẹ gửi con ít tiền học tiếng nè!" (+500.000 ₫)', '📩 Mum sends money: “For your German lessons!” (+500,000 ₫)', { when: { country: 'vn' }, money: 500_000, mood: 5 }),
  E('rainVn', '🌧 Mưa to cả buổi sáng, đường ngập. Ướt hết rồi… (Chạy Grab hôm nay: cuốc đắt hơn 30% nhưng mệt hơn.)', '🌧 Heavy rain all morning, streets flooded. Soaked… (Grab today: rides pay 30% more but tire you more.)', { when: { country: 'vn' }, mood: -5 }),
  E('bikeBroken', '🔧 Xe đạp bị thủng lốp, vá mất 30.000 ₫.', '🔧 Flat bicycle tyre, 30,000 ₫ to fix.', { when: { country: 'vn' }, money: -30_000 }),
  E('friendCoffee', '☕ Bạn cũ rủ cà phê sáng, kể chuyện cười cả buổi.', '☕ An old friend invites you for coffee and jokes.', { when: { country: 'vn' }, mood: 8 }),
  E('scamGoethe', '📱 Tin nhắn lạ: „Goethe-Institut: lệ phí thi của bạn chưa được xác nhận…"', '📱 A strange text: “Goethe-Institut: your exam fee has not been confirmed…”', { when: { all: [{ country: 'vn' }, { flag: 'course.0' }, { not: { germanLevel: 3 } }] }, weight: 0.7, action: { id: 'event.morning', arg: 'goethe' } }),
  E('vfsSeller', '📱 Tin nhắn: „Có slot VFS tuần sau, 3 triệu, chuyển khoản trước…"', '📱 A text: “VFS slot next week, 3 million, pay first…”', { when: { all: [{ country: 'vn' }, { flag: 'visa.path' }, { noFlag: 'visa.readyDay' }] }, weight: 1.2, action: { id: 'event.morning', arg: 'vfs' } }),
  E('wedding', '💍 Bạn cấp 3 gửi thiệp cưới: đám cưới tối nay!', '💍 A high-school friend’s wedding invitation: tonight!', { when: { country: 'vn' }, weight: 0.6, action: { id: 'event.morning', arg: 'wedding' } }),
  E('screen', '📵 Điện thoại rơi vỡ màn hình!', '📵 You dropped your phone — the screen cracked!', { when: { all: [{ country: 'vn' }, { noFlag: 'phone.cracked' }] }, weight: 0.5, action: { id: 'event.morning', arg: 'screen' } }),
  E('powerCut', '⚡ Mất điện mùa hè cả khu phố, tối nay không tự học được.', '⚡ A summer power cut in the whole street — no studying tonight.', { when: { country: 'vn' }, weight: 0.6, mood: -2, action: { id: 'event.morning', arg: 'powerCut' } }),
  E('gioOngNoi', '🎋 Giỗ ông nội: cả nhà về quê từ sáng, mất cả ngày, nhưng vui. (+10)', '🎋 Grandfather’s death anniversary: the whole family goes to the countryside for the day. (+10)', { when: { all: [{ country: 'vn' }, { scene: 'home' }, { noFlag: 'event.gio' }] }, weight: 0.4, action: { id: 'event.morning', arg: 'gio' } }),
  E('goodSleep', '😴 Ngủ một giấc thật ngon!', '😴 A wonderful night’s sleep!', { energy: 0, mood: 6 }),
  // Germany
  E('brief', '✉️ Brief vom Amt: một lá thư 4 trang toàn chữ khó hiểu. Đọc mất cả buổi…', '✉️ A letter from the authorities: 4 pages of baffling German…', { when: { country: 'de' }, mood: -6, energy: -5 }),
  E('bahn', '🚆 Deutsche Bahn trễ 40 phút. Đứng chờ ngoài sân ga lạnh cóng.', '🚆 The train is 40 minutes late. Freezing on the platform.', { when: { country: 'de' }, mood: -5 }),
  E('callHome', '📱 Gọi video về nhà, mẹ khoe nồi cá kho. Nhớ nhà quá…', '📱 Video call home — Mum shows off her braised fish. So homesick…', { when: { country: 'de' }, mood: 6, weight: 1.5 }),
  E('sunnyDe', '☀️ Trời nắng hiếm hoi! Cả thành phố ra công viên.', '☀️ A rare sunny day! The whole city is in the park.', { when: { country: 'de' }, mood: 8 }),
  E('foundCoin', '🪙 Nhặt được 2 € trên vỉa hè.', '🪙 Found €2 on the sidewalk.', { when: { country: 'de' }, money: 2, mood: 2 }),
  E('neighborCake', '🍰 Bà hàng xóm tặng một miếng Kuchen.', '🍰 The neighbour gives you a slice of cake.', { when: { country: 'de' }, energy: 10, mood: 5 }),
]
