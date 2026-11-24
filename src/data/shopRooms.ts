import type { Localized } from '../i18n/localized'
import { CONFIG } from './config'
import { EATERY_DEFS } from './eateries'
import { SHOP_ROOM_IDS, shopScene, type ShopRoomId, type ShopSceneId } from './shopRoomIds'
import { BUILDINGS } from '../game/scenes/HangKhay/layout'
import { BUILDING_FRONT_Z, EATERIES, EAST, HANG_BONG, houseFront, NEIGHBOR, OFFICES, WEST } from '../game/scenes/VietnamStreet/layout'

/**
 * 1.41 Shops with a room inside (user: "mỗi cửa tiệm đều có không gian bên trong… mở ra cảnh như căn nhà của nhân
 * vật chính"). The street keeps the facade and a door spot; "Vào" fades into the scene `shop.<id>`
 * (scenes/ShopRoom: furniture, the owner behind the counter, customers) and "Ra phố" fades back to the door.
 * Players in the same shop see each other (a public multiplayer room per shop).
 *
 * Only data here (registry, guide links, the door spots and the actions read it). The rooms: scenes/ShopRoom/plans.ts.
 */

export type { ShopRoomId, ShopSceneId }

export interface ShopRoomDef {
  id: ShopRoomId
  /** Plaque title inside + the fade caption. */
  name: Localized
  /** Plaque subtitle. */
  subtitle: Localized
  /** The door on the street (scene vietnam): centre of the spot, the way the door faces (0 = +z), zone half sizes. */
  door: { x: number; z: number; yaw: number; halfW: number; halfD: number }
  /** An existing street spot that already opens this door (Hàng Khay's city places); else `shopdoor-<id>`. */
  spot?: string
  /** Opening hours [from, to) in game hours; none = always open. */
  hours?: [number, number]
  /** Floor size of the room (x, z): the back wall is at −d/2, the open side (camera) at +d/2. */
  w: number
  d: number
  /** Button on the street door. */
  enter: 'eat' | 'shop' | 'office'
}

const L = (vi: string, en: string): Localized => ({ vi, en })

/** A door facing +z (most fronts) or −z, `out` metres in front of the facade at (x, z). */
const south = (x: number, z: number, halfW = 1.3, out = 0.9) => ({ x, z: z + out, yaw: 0, halfW, halfD: 0.8 })
const north = (x: number, z: number, halfW = 1.3, out = 0.9) => ({ x, z: z - out, yaw: Math.PI, halfW, halfD: 0.8 })
/** Eateries: the open front (layout.ts `face` 1 = +z). */
const eatery = (id: keyof typeof EATERIES) => {
  const e = EATERIES[id]
  const halfW = Math.min(1.6, e.w / 2 - 0.4)
  return e.face === 1 ? south(e.x, e.z, halfW, id === 'pho' ? 0.9 : 0.6) : north(e.x, e.z, halfW, 0.6)
}
const eateryHours = (id: keyof typeof EATERY_DEFS) => EATERY_DEFS[id].hours
const city = (id: string) => BUILDINGS.find((b) => b.id === id)!

const OFFICE_HOURS = CONFIG.visa.officeHours

export const SHOP_ROOMS: Record<ShopRoomId, ShopRoomDef> = {
  pho: {
    id: 'pho',
    name: L('Phở Gia Truyền', 'Family phở shop'),
    subtitle: L('Phố Hàng Gai · Nồi nước dùng từ 3 giờ sáng', 'Hàng Gai street'),
    door: eatery('pho'),
    hours: eateryHours('pho'),
    w: 9,
    d: 7,
    enter: 'eat',
  },
  bunCha: {
    id: 'bunCha',
    name: L('Bún Chả Than Hoa Cô Lụa', 'Cô Lụa’s charcoal bún chả'),
    subtitle: L('Phố Hàng Gai · Chả nướng than hoa', 'Hàng Gai street'),
    door: eatery('bunCha'),
    hours: eateryHours('bunCha'),
    w: 9,
    d: 7,
    enter: 'eat',
  },
  banhCuon: {
    id: 'banhCuon',
    name: L('Bánh Cuốn Nóng Bà Tám', 'Bà Tám’s hot rice rolls'),
    subtitle: L('Phố đi bộ Hàng Đào · Tráng tại chỗ', 'Hàng Đào walking street'),
    door: eatery('banhCuon'),
    hours: eateryHours('banhCuon'),
    w: 8.5,
    d: 6.5,
    enter: 'eat',
  },
  lau: {
    id: 'lau',
    name: L('Lẩu Nướng Tràng Tiền', 'Tràng Tiền hotpot & grill'),
    subtitle: L('Đại lộ Tràng Tiền · Lẩu thái · Nướng than', 'Tràng Tiền avenue'),
    door: eatery('lau'),
    hours: eateryHours('lau'),
    w: 11,
    d: 8,
    enter: 'eat',
  },
  banhMi: {
    id: 'banhMi',
    name: L('Bánh Mì Phố Cổ 25', 'Old Quarter bánh mì no. 25'),
    subtitle: L('Đại lộ Tràng Tiền · Bánh mì nóng giòn', 'Tràng Tiền avenue'),
    door: eatery('banhMi'),
    hours: eateryHours('banhMi'),
    w: 8,
    d: 6,
    enter: 'eat',
  },
  com: {
    id: 'com',
    name: L('Cơm Bình Dân Bà Sáu', 'Bà Sáu’s everyday rice'),
    subtitle: L('Đại lộ Tràng Tiền · Cơm văn phòng', 'Tràng Tiền avenue'),
    door: eatery('com'),
    hours: eateryHours('com'),
    w: 9,
    d: 7,
    enter: 'eat',
  },
  che: {
    id: 'che',
    name: L('Chè Bốn Mùa', 'Four Seasons sweet soups'),
    subtitle: L('Đại lộ Tràng Tiền · Chè · Sữa chua · Kem', 'Tràng Tiền avenue'),
    door: eatery('che'),
    hours: eateryHours('che'),
    w: 8,
    d: 6.5,
    enter: 'eat',
  },
  taphoa: {
    id: 'taphoa',
    name: L('Tạp hóa Cô Liên', 'Auntie Liên’s grocery'),
    subtitle: L('Phố Hàng Gai · Có gì bán nấy', 'Hàng Gai street'),
    door: south(NEIGHBOR.x, BUILDING_FRONT_Z, 1.6),
    hours: [6, 23],
    w: 8,
    d: 6.5,
    enter: 'shop',
  },
  circleK: {
    id: 'circleK',
    name: L('Circle K Hàng Bông', 'Circle K Hàng Bông'),
    subtitle: L('Cửa hàng tiện lợi · Mở 24/7', 'Convenience store · 24/7'),
    door: south((HANG_BONG.circleK.x0 + HANG_BONG.circleK.x1) / 2, HANG_BONG.circleK.z1, 1.0, 0.8),
    w: 10,
    d: 7,
    enter: 'shop',
  },
  hoangKim: {
    id: 'hoangKim',
    name: L('Công ty Hoàng Kim', 'Hoàng Kim agency'),
    subtitle: L('Phố Hàng Bông · „Bao visa 100%"', 'Hàng Bông street'),
    door: { x: HANG_BONG.hoangKim.x0 - 0.8, z: (HANG_BONG.hoangKim.z0 + HANG_BONG.hoangKim.z1) / 2, yaw: -Math.PI / 2, halfW: 1.4, halfD: 0.8 },
    hours: [8, 20],
    w: 9,
    d: 6.5,
    enter: 'office',
  },
  pharmacy: {
    id: 'pharmacy',
    name: L('Nhà thuốc Cô Thảo', 'Ms Thảo’s pharmacy'),
    subtitle: L('Phố đi bộ Hàng Đào · Dầu gió · Cao dán', 'Hàng Đào walking street'),
    door: south(WEST.houses[1].x, houseFront(WEST.houses[1])),
    hours: [7, 22],
    w: 8,
    d: 6,
    enter: 'shop',
  },
  tailor: {
    id: 'tailor',
    name: L('May đo áo dài Cô Hoa', 'Hoa’s áo dài tailor'),
    subtitle: L('Phố Hàng Gai · Nhận may lấy ngay', 'Hàng Gai street'),
    door: south(WEST.houses[2].x, houseFront(WEST.houses[2])),
    hours: [8, 20],
    w: 8.5,
    d: 6.5,
    enter: 'shop',
  },
  oldBooks: {
    id: 'oldBooks',
    name: L('Hiệu sách cũ Chú Hưng', 'Uncle Hưng’s old bookshop'),
    subtitle: L('Phố Hàng Gai · Sách cũ · Sách ngoại văn', 'Hàng Gai street'),
    door: south(EAST.houses[1].x, BUILDING_FRONT_Z, 1.1),
    hours: [8, 21],
    w: 8,
    d: 6.5,
    enter: 'shop',
  },
  photo: {
    id: 'photo',
    name: L('Tiệm ảnh Hùng', 'Hùng photo studio'),
    subtitle: L('Ảnh thẻ · Ảnh visa 3,5×4,5 · Lấy ngay', 'ID & visa photos'),
    door: south(OFFICES.houses[0].x, houseFront(OFFICES.houses[0])),
    hours: OFFICE_HOURS,
    w: 8,
    d: 6.5,
    enter: 'office',
  },
  notary: {
    id: 'notary',
    name: L('Văn phòng Công chứng', 'Notary office'),
    subtitle: L('Phố đi bộ Hàng Đào · Dịch thuật · Sao y', 'Hàng Đào walking street'),
    door: south(OFFICES.houses[1].x, houseFront(OFFICES.houses[1])),
    hours: OFFICE_HOURS,
    w: 9,
    d: 6.5,
    enter: 'office',
  },
  bank: {
    id: 'bank',
    name: L('Ngân hàng Phố Cổ', 'Old Quarter bank'),
    subtitle: L('Tiết kiệm · Ngoại tệ · Chứng minh tài chính', 'Savings · Exchange'),
    door: south(OFFICES.houses[2].x, houseFront(OFFICES.houses[2])),
    hours: OFFICE_HOURS,
    w: 10,
    d: 7,
    enter: 'office',
  },
  aps: {
    id: 'aps',
    name: L('Văn phòng APS', 'APS office'),
    subtitle: L('Akademische Prüfstelle · Đại lộ Tràng Tiền', 'Akademische Prüfstelle'),
    door: south(OFFICES.houses[3].x, houseFront(OFFICES.houses[3])),
    hours: OFFICE_HOURS,
    w: 9,
    d: 7,
    enter: 'office',
  },
  goldShop: {
    id: 'goldShop',
    name: L('Tiệm Vàng Kim Thành', 'Kim Thành gold shop'),
    subtitle: L('Phố Hàng Khay · Vàng miếng · Nhẫn tròn', 'Hàng Khay street'),
    door: north(city('goldShop').x, city('goldShop').z, 1.8, 1.0),
    spot: 'city-goldShop',
    hours: [8, 20],
    w: 9,
    d: 6.5,
    enter: 'shop',
  },
  restaurant: {
    id: 'restaurant',
    name: L('Nhà hàng Bờ Hồ', 'Lakeside restaurant'),
    subtitle: L('Phố Hàng Khay · Cơm gia đình · Nem cua bể', 'Hàng Khay street'),
    door: north(city('restaurant').x, city('restaurant').z, 1.8, 1.0),
    spot: 'city-restaurant',
    hours: [10, 22],
    w: 12,
    d: 8,
    enter: 'eat',
  },
}

export const SHOP_ROOM_LIST = SHOP_ROOM_IDS.map((id) => SHOP_ROOMS[id])

/** The street spot that opens a shop. */
export const shopDoorSpot = (id: ShopRoomId) => SHOP_ROOMS[id].spot ?? `shopdoor-${id}`

/** Where you stand inside after coming in (and where the "Ra phố" mat is): the front right corner. */
export const shopExit = (r: Pick<ShopRoomDef, 'w' | 'd'>) => ({ x: r.w / 2 - 1.2, z: r.d / 2 - 0.55 })

/** Spawn key in scene `vietnam` in front of a shop's door. */
export const shopSpawnKey = (id: ShopRoomId) => `shop-${id}`

/** Spawn points on the street, 1.1 m in front of each door, the camera behind you facing the street. */
export const shopStreetSpawns = () =>
  Object.fromEntries(
    SHOP_ROOM_LIST.map((r) => {
      const out = 0.5
      return [shopSpawnKey(r.id), { x: r.door.x + Math.sin(r.door.yaw) * out, z: r.door.z + Math.cos(r.door.yaw) * out, yaw: r.door.yaw }]
    }),
  )

export { shopScene }
