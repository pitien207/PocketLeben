import type { Localized } from '../i18n/localized'

/**
 * 1.35 Showroom Xe Phố Cổ (Phố Tràng Tiền, next to the petrol station): bicycles, motorbikes and cars you can buy,
 * ride in the outdoor Việt Nam scenes, refuel at the petrol station and sell back. Logic: game/systems/vehicles.ts,
 * shapes: game/scenes/shared/ownVehicles.ts, shop: ui/VehicleShop.tsx. Names are made up (no real brands).
 * Shared numbers (resale rate, fuel price, which scenes allow riding) live in CONFIG.vehicles.
 */

export type VehicleId = 'boWave' | 'xeDap' | 'ongVang' | 'mayTrang' | 'enBac' | 'phongLuu' | 'hatDau' | 'phoCo' | 'giaDinh' | 'chopDo' | 'hopDem' | 'vanCho' | 'banTai' | 'suvSang'
export type VehicleKind = 'bicycle' | 'motorbike' | 'car'
/** How a two-wheeler is drawn (shared/ownVehicles.ts). */
export type BikeStyle = 'bicycle' | 'cub' | 'scooter' | 'vespa' | 'big'

export interface VehicleDef {
  id: VehicleId
  kind: VehicleKind
  name: Localized
  /** One line in the shop. */
  blurb: Localized
  /** Price in đồng. */
  price: number
  color: string
  /** Second colour (seat, trim, stripe). */
  color2: string
  /** Top speed = walk speed × this. */
  speed: number
  /** Turning rate, radians per second. */
  turn: number
  /** How quickly it reaches the wanted speed (higher = snappier). */
  accel: number
  /** Litres in a full tank (0 = no engine). */
  tank: number
  /** Metres on a full tank. */
  range: number
  style?: BikeStyle
  /** Car model in the Quaternius pack (shared/carModels.ts) or, 1.48, the Kenney Car Kit (kv…, shared/libraryCars.ts). */
  model?: string
  /** Icon3d name for the list. */
  icon: string
  /** 1.40: lent, not bought (Bố's Wave for Grab): not in the showroom, cannot be sold. */
  borrowed?: boolean
}

export const VEHICLES: Record<VehicleId, VehicleDef> = {
  // 1.40 Bố lends it for Grab (systems/grab.ts): yours while job.grab is set and the house is not at level 3
  boWave: {
    id: 'boWave',
    kind: 'motorbike',
    name: { vi: 'Xe Wave của bố', en: 'Dad’s Wave' },
    blurb: { vi: 'Xe số cũ của bố, chạy mười mấy năm vẫn nổ máy phát một. Bố cho mượn để chạy Grab.', en: 'Dad’s old step-through, lent for Grab.' },
    price: 0,
    color: '#b3242a',
    color2: '#2a2a30',
    speed: 2.6,
    turn: 3.2,
    accel: 2.5,
    tank: 4,
    range: 3000,
    style: 'cub',
    icon: 'motor-scooter',
    borrowed: true,
  },
  xeDap: {
    id: 'xeDap',
    kind: 'bicycle',
    name: { vi: 'Xe đạp Hoa Sữa', en: 'Hoa Sữa bicycle' },
    blurb: { vi: 'Có giỏ đằng trước, không cần xăng. Đạp quanh Hồ Gươm là chuẩn bài.', en: 'A front basket and no fuel needed.' },
    price: 1_800_000,
    color: '#7fb8a8',
    color2: '#6a4a40',
    speed: 1.95,
    turn: 3.8,
    accel: 3.2,
    tank: 0,
    range: 0,
    style: 'bicycle',
    icon: 'bicycle',
  },
  ongVang: {
    id: 'ongVang',
    kind: 'motorbike',
    name: { vi: 'Xe số Ong Vàng 110', en: 'Ong Vàng 110 step-through' },
    blurb: { vi: 'Bền, rẻ, đổ một lần xăng đi cả tuần. Cả phố ai cũng có một chiếc.', en: 'Cheap, tough, sips fuel.' },
    price: 19_500_000,
    color: '#f2c14e',
    color2: '#5b4038',
    speed: 2.7,
    turn: 3.2,
    accel: 2.6,
    tank: 4,
    range: 3200,
    style: 'cub',
    icon: 'motor-scooter',
  },
  mayTrang: {
    id: 'mayTrang',
    kind: 'motorbike',
    name: { vi: 'Xe ga Mây Trắng 125', en: 'Mây Trắng 125 scooter' },
    blurb: { vi: 'Cốp rộng để vừa mũ bảo hiểm và túi đồ chợ. Êm như ngồi trên mây.', en: 'Big under-seat box, smooth ride.' },
    price: 34_000_000,
    color: '#f4f1ea',
    color2: '#3f4a5c',
    speed: 2.9,
    turn: 3.1,
    accel: 2.8,
    tank: 5,
    range: 3000,
    style: 'scooter',
    icon: 'motor-scooter',
  },
  enBac: {
    id: 'enBac',
    kind: 'motorbike',
    name: { vi: 'Xe ga cổ Én Bạc', en: 'Én Bạc classic scooter' },
    blurb: { vi: 'Thân tròn, đèn pha tròn, chụp ảnh ở phố cổ là lên hình đẹp nhất.', en: 'Round, retro and very photogenic.' },
    price: 68_000_000,
    color: '#9fd3c7',
    color2: '#8a5a3c',
    speed: 2.95,
    turn: 3.0,
    accel: 2.6,
    tank: 7,
    range: 2800,
    style: 'vespa',
    icon: 'motor-scooter',
  },
  phongLuu: {
    id: 'phongLuu',
    kind: 'motorbike',
    name: { vi: 'Xe ga Phong Lưu 150', en: 'Phong Lưu 150 scooter' },
    blurb: { vi: 'Chiếc xe „đi đâu cũng được nhìn". Máy khỏe, phanh ABS, cả xóm phải ngoái lại.', en: 'The scooter everyone turns to look at.' },
    price: 92_000_000,
    color: '#c8322b',
    color2: '#2a2a30',
    speed: 3.15,
    turn: 3.0,
    accel: 3.0,
    tank: 7,
    range: 2600,
    style: 'big',
    icon: 'motor-scooter',
  },
  hatDau: {
    id: 'hatDau',
    kind: 'car',
    name: { vi: 'Ô tô mini Hạt Đậu', en: 'Hạt Đậu mini car' },
    blurb: { vi: 'Bé xíu, chui ngõ nào cũng lọt, đỗ đâu cũng vừa.', en: 'Tiny: fits down any lane.' },
    price: 260_000_000,
    color: '#ffd76a',
    color2: '#2a2a30',
    speed: 3.0,
    turn: 2.5,
    accel: 1.9,
    tank: 30,
    range: 2400,
    model: 'NormalCar2',
    icon: 'automobile',
  },
  phoCo: {
    id: 'phoCo',
    kind: 'car',
    name: { vi: 'Ô tô Phố Cổ 5 chỗ', en: 'Phố Cổ family hatchback' },
    blurb: { vi: 'Năm chỗ ngồi, Tết chở cả nhà về quê.', en: 'Five seats: the whole family goes home for Tết.' },
    price: 480_000_000,
    color: '#5d8fd9',
    color2: '#2a2a30',
    speed: 3.2,
    turn: 2.3,
    accel: 1.8,
    tank: 40,
    range: 2200,
    model: 'NormalCar1',
    icon: 'automobile',
  },
  giaDinh: {
    id: 'giaDinh',
    kind: 'car',
    name: { vi: 'SUV Gia Đình 7 chỗ', en: 'Gia Đình 7-seat SUV' },
    blurb: { vi: 'Gầm cao, lội nước ngập phố mùa mưa không ngán.', en: 'High clearance for flooded streets.' },
    price: 890_000_000,
    color: '#3f6b5a',
    color2: '#2a2a30',
    speed: 3.2,
    turn: 2.1,
    accel: 1.6,
    tank: 55,
    range: 2000,
    model: 'SUV',
    icon: 'sport-utility-vehicle',
  },
  chopDo: {
    id: 'chopDo',
    kind: 'car',
    name: { vi: 'Xe thể thao Chớp Đỏ', en: 'Chớp Đỏ sports car' },
    blurb: { vi: 'Hai cửa, tiếng máy gầm gừ. Ở phố cổ thì… chạy được 20 km/h thôi.', en: 'Two doors, a growling engine — and old-quarter traffic.' },
    price: 1_650_000_000,
    color: '#e84a3c',
    color2: '#2a2a30',
    speed: 3.6,
    turn: 2.4,
    accel: 2.4,
    tank: 50,
    range: 1600,
    model: 'SportsCar',
    icon: 'automobile',
  },
  // 1.48 more cars (Kenney Car Kit, CC0)
  hopDem: {
    id: 'hopDem',
    kind: 'car',
    name: { vi: 'Hatchback Hộp Diêm', en: 'Hộp Diêm hatchback' },
    blurb: { vi: 'Nhỏ, gọn, lách ngõ phố cổ ngon lành. Đỗ xe dễ như đỗ xe máy.', en: 'Small enough for the old-quarter lanes.' },
    price: 420_000_000,
    color: '#7cc6a4',
    color2: '#2a2a30',
    speed: 3.1,
    turn: 2.6,
    accel: 2.0,
    tank: 35,
    range: 2500,
    model: 'kvHatchback',
    icon: 'automobile',
  },
  vanCho: {
    id: 'vanCho',
    kind: 'car',
    name: { vi: 'Xe van Chở Hàng', en: 'Chở Hàng van' },
    blurb: { vi: 'Thùng rộng: chở hàng cho mẹ, chở cả xóm đi ăn cưới.', en: 'A big boot for deliveries and weddings.' },
    price: 650_000_000,
    color: '#f2f2ee',
    color2: '#2a2a30',
    speed: 2.9,
    turn: 2.0,
    accel: 1.5,
    tank: 60,
    range: 2100,
    model: 'kvVan',
    icon: 'automobile',
  },
  banTai: {
    id: 'banTai',
    kind: 'car',
    name: { vi: 'Bán tải Trâu Vàng', en: 'Trâu Vàng pickup' },
    blurb: { vi: 'Thùng sau chở được cả cây quất ngày Tết.', en: 'Carries a whole kumquat tree at Tết.' },
    price: 780_000_000,
    color: '#e0a43a',
    color2: '#2a2a30',
    speed: 3.1,
    turn: 2.1,
    accel: 1.7,
    tank: 75,
    range: 2300,
    model: 'kvTruck',
    icon: 'sport-utility-vehicle',
  },
  suvSang: {
    id: 'suvSang',
    kind: 'car',
    name: { vi: 'SUV Sang Trọng Đêm Đen', en: 'Đêm Đen luxury SUV' },
    blurb: { vi: 'Đen bóng, ghế da, đi đâu cũng được mở cửa đón.', en: 'Black, leather seats, doors opened for you.' },
    price: 2_100_000_000,
    color: '#2b2f36',
    color2: '#c9a24a',
    speed: 3.4,
    turn: 2.2,
    accel: 2.0,
    tank: 70,
    range: 1900,
    model: 'kvSuvLuxury',
    icon: 'sport-utility-vehicle',
  },
}

export const VEHICLE_LIST: VehicleDef[] = Object.values(VEHICLES)
/** What the showroom sells (no borrowed vehicles). */
export const SHOP_VEHICLES: VehicleDef[] = VEHICLE_LIST.filter((v) => !v.borrowed)

export const isVehicleId = (id: unknown): id is VehicleId => typeof id === 'string' && id in VEHICLES
