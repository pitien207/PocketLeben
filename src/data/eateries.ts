import type { SignOptions } from '../game/scenes/shared/textures'
import type { EateryId } from '../game/scenes/VietnamStreet/layout'
import type { Localized } from '../i18n/localized'
import type { ShopId } from './shops'

/**
 * 1.40 Quán ăn xen kẽ trong phố cổ. Where each one stands: VietnamStreet/layout.ts `EATERIES`; the houses:
 * VietnamStreet/Eateries.tsx (props from KayKit Restaurant Bits, CC0). Talking to the owner opens the menu (a
 * normal shop, data/shops.ts); every eatery is also a pick-up point for Grab food orders (systems/grab.ts) while
 * it is open. Names are made up.
 */

export type { EateryId }

export interface EateryDef {
  id: EateryId
  name: Localized
  /** Short name on the map. */
  short: string
  sign: SignOptions
  /** NPC behind the counter (data/npcs.ts), talking = menu. */
  owner: string
  shop: ShopId
  /** Opening hours [from, to) in game hours. */
  hours: [number, number]
  /** What a Grab customer orders from here ("2 suất bún chả"). */
  orders: string[]
  /** Owner's greeting lines (one is picked). */
  hello: Localized[]
}

const sign = (title: string, subtitle: string, background: string, color: string, border: string, aspect = 5): SignOptions => ({ title, subtitle, background, color, border, accent: color, aspect })

export const EATERY_DEFS: Record<EateryId, EateryDef> = {
  pho: {
    id: 'pho',
    name: { vi: 'Phở Gia Truyền', en: 'Family phở shop' },
    short: 'Phở Gia Truyền',
    sign: sign('PHỞ GIA TRUYỀN', 'Phở bò · Phở gà · Quẩy', '#c8322b', '#ffe08a', '#f4c04e'),
    owner: 'chuPho',
    shop: 'phoGiaTruyen',
    hours: [6, 22],
    orders: ['2 bát phở bò tái', '1 phở gà + quẩy', '3 bát phở chín'],
    hello: [
      { vi: 'Nước dùng ninh từ ba giờ sáng đấy cháu! Ăn bát phở cho ấm bụng?', en: 'The broth has been simmering since 3 am! A bowl?' },
      { vi: 'Tái, chín hay tái nạm? Chú làm nhanh lắm.', en: 'Rare, well-done or both? I’m quick.' },
    ],
  },
  bunCha: {
    id: 'bunCha',
    name: { vi: 'Bún Chả Than Hoa Cô Lụa', en: 'Cô Lụa’s charcoal bún chả' },
    short: 'Bún chả Cô Lụa',
    sign: sign('BÚN CHẢ THAN HOA', 'Cô Lụa · Nem cua bể', '#2f6b4f', '#ffe7a8', '#f4c04e'),
    owner: 'coLua',
    shop: 'bunChaCoLua',
    hours: [10, 21],
    orders: ['2 suất bún chả + nem', '1 bún chả nhiều rau', '4 suất bún chả văn phòng'],
    hello: [
      { vi: 'Chả nướng than hoa thơm cả phố đây! Ngồi xuống cô làm cho suất bún chả.', en: 'Charcoal-grilled pork — the whole street smells it!' },
      { vi: 'Thêm cái nem cua bể không cháu? Giòn rụm luôn.', en: 'Add a crab spring roll? Super crispy.' },
    ],
  },
  banhCuon: {
    id: 'banhCuon',
    name: { vi: 'Bánh Cuốn Nóng Bà Tám', en: 'Bà Tám’s hot rice rolls' },
    short: 'Bánh cuốn Bà Tám',
    sign: sign('BÁNH CUỐN NÓNG', 'Bà Tám · Chả quế · Trứng', '#f6efe0', '#c8322b', '#c8322b'),
    owner: 'baTam',
    shop: 'banhCuonBaTam',
    hours: [6, 14],
    orders: ['2 đĩa bánh cuốn chả', '1 bánh cuốn trứng', '3 đĩa bánh cuốn thập cẩm'],
    hello: [
      { vi: 'Bánh tráng mỏng như tờ giấy, vừa tráng vừa ăn mới ngon cháu ạ.', en: 'Thin as paper, best eaten straight off the steamer.' },
      { vi: 'Bà mở từ sáng sớm, quá trưa là hết bột đấy nhé!', en: 'Open early — the batter runs out by noon!' },
    ],
  },
  lau: {
    id: 'lau',
    name: { vi: 'Lẩu Nướng Tràng Tiền', en: 'Tràng Tiền hotpot & grill' },
    short: 'Lẩu nướng',
    sign: sign('LẨU NƯỚNG TRÀNG TIỀN', 'Lẩu thái · Lẩu nấm · Nướng than', '#a3262a', '#ffe08a', '#ffd23f', 6.5),
    owner: 'anhDung',
    shop: 'lauTrangTien',
    hours: [11, 23],
    orders: ['1 nồi lẩu thái 2 người', '1 suất nướng thập cẩm', '1 nồi lẩu nấm + 2 nem'],
    hello: [
      { vi: 'Đi mấy người em? Lẩu thái chua cay, lẩu nấm thanh mát, có cả nướng than nữa!', en: 'How many? Spicy Thai hotpot, mushroom hotpot, grill…' },
      { vi: 'Tối nay đông lắm, may còn bàn đẹp cho em đấy!', en: 'Busy night — lucky, one good table left!' },
    ],
  },
  banhMi: {
    id: 'banhMi',
    name: { vi: 'Bánh Mì Phố Cổ 25', en: 'Old Quarter bánh mì no. 25' },
    short: 'Bánh mì 25',
    sign: sign('BÁNH MÌ PHỐ CỔ 25', 'Pate · Xíu mại · Trứng ốp', '#f4c04e', '#8a3b1f', '#8a3b1f'),
    owner: 'chiNgan',
    shop: 'banhMi25',
    hours: [6, 22],
    orders: ['3 ổ bánh mì pate', '2 bánh mì xíu mại', '5 ổ bánh mì đặc biệt'],
    hello: [
      { vi: 'Bánh mì vừa ra lò, vỏ giòn tan! Em lấy ổ nào?', en: 'Fresh out of the oven, crackling crust! Which one?' },
      { vi: 'Pate nhà chị tự làm đấy, không cay thì dặn chị nhé.', en: 'Home-made pâté. Tell me if you want it mild.' },
    ],
  },
  com: {
    id: 'com',
    name: { vi: 'Cơm Bình Dân Bà Sáu', en: 'Bà Sáu’s everyday rice' },
    short: 'Cơm Bà Sáu',
    sign: sign('CƠM BÌNH DÂN', 'Bà Sáu · Cơm văn phòng · Có ship', '#2c5aa0', '#ffffff', '#ffe08a'),
    owner: 'baSauCom',
    shop: 'comBaSau',
    hours: [10, 20],
    orders: ['3 suất cơm văn phòng', '2 cơm sườn + canh', '1 cơm thịt kho trứng'],
    hello: [
      { vi: 'Hôm nay có thịt kho trứng, cá rán, đậu sốt cà chua. Chọn món đi cháu!', en: 'Braised pork & egg, fried fish, tofu in tomato today.' },
      { vi: 'Cơm thêm thoải mái, bà không tính tiền đâu.', en: 'Extra rice is free.' },
    ],
  },
  che: {
    id: 'che',
    name: { vi: 'Chè Bốn Mùa', en: 'Four Seasons sweet soups' },
    short: 'Chè Bốn Mùa',
    sign: sign('CHÈ BỐN MÙA', 'Chè thập cẩm · Chè bưởi · Sữa chua', '#ff9fb2', '#ffffff', '#ffffff'),
    owner: 'coHien',
    shop: 'cheBonMua',
    hours: [9, 23],
    orders: ['4 cốc chè thập cẩm', '2 chè bưởi + 2 sữa chua', '3 cốc chè khúc bạch'],
    hello: [
      { vi: 'Trời nóng thế này làm cốc chè đá cho mát em ơi!', en: 'It’s hot — a cup of iced chè?' },
      { vi: 'Chè bưởi hôm nay giòn lắm, cô mới nấu xong.', en: 'Fresh pomelo chè, just made.' },
    ],
  },
}

export const EATERY_IDS = Object.keys(EATERY_DEFS) as EateryId[]
