import { CITY_PLACES } from '../../data/cityPlaces'
import { EATERY_DEFS, EATERY_IDS } from '../../data/eateries'
import { BA_TRIEU, BUILDINGS, OZ, ROW_FRONT } from '../scenes/HangKhay/layout'
import { EATERIES, EAST, eateryKerb, LAKE, NORTH, SOUTH } from '../scenes/VietnamStreet/layout'

/**
 * 1.40 Grab in the open city (systems/grab.ts): every place a fare can start or end — on the pavement or the kerb in
 * front of it, where a scooter can stop. Coordinates come from the layouts, so the stops follow the buildings.
 * `food` = an eatery (pick-up of food orders, only while it is open), `post` = the post office (parcels).
 * Every stop must stay reachable on two wheels: the headless test (scratchpad v140.mjs) checks them all.
 */

export interface GrabStop {
  id: string
  /** Shown in the app: "Nhà thờ Lớn", "Số 18 Hàng Gai"… */
  name: string
  x: number
  z: number
  /** Area for the distance estimate: north of the lake (old quarter) or south (Hàng Khay). */
  side: 'north' | 'south'
  food?: string
  post?: boolean
}

const N = (id: string, name: string, x: number, z: number, extra: Partial<GrabStop> = {}): GrabStop => ({ id, name, x, z, side: 'north', ...extra })
const S = (id: string, name: string, x: number, z: number, extra: Partial<GrabStop> = {}): GrabStop => ({ id, name, x, z, side: 'south', ...extra })

const { rowB, rowC, rowC2, rowD, plaza, walk } = NORTH
/** Kerbside lines of each street (pavement, about a metre from the house fronts or the kerb). */
const HANG_GAI = -2.6
const DAO_B = rowB.front - 1.6
const DAO_C = rowC.front + 1.6
const AVE_C2 = rowC2.front - 2.2
const AVE_D = rowD.front + 2.2
const KHAY = ROW_FRONT - 2.2

const eateryStops: GrabStop[] = EATERY_IDS.map((id) => {
  const k = eateryKerb(EATERIES[id], id === 'pho' ? 2.8 : 2.6)
  return N(`food-${id}`, EATERY_DEFS[id].name.vi, k.x, k.z, { food: id })
})

const restaurant = BUILDINGS.find((b) => b.id === 'restaurant')!

export const GRAB_STOPS: GrabStop[] = [
  ...eateryStops,
  S('food-nhaHang', CITY_PLACES.restaurant.name.vi, restaurant.x, KHAY, { food: 'nhaHang' }),
  N('post', 'Bưu điện Bờ Hồ', 12, AVE_D, { post: true }),
  // Landmarks north of the lake
  N('church', 'Nhà thờ Lớn', walk.x0 + 2.6, (walk.z0 + walk.z1) / 2 + 3.2),
  N('fountain', 'Quảng trường đài phun nước', plaza.fountain.x, rowC.front - 2.2),
  N('ngocSon', 'Cổng đền Ngọc Sơn', 13.2, 12 + SOUTH),
  N('market', 'Chợ đêm phố cổ', 23.5, EAST.market.z - 2.2),
  N('teaShop', 'Tiệm Trà Sữa Phố Cổ', 4.5, 0.6),
  N('circleK', 'Circle K Hàng Bông', 15.2, -2.2),
  N('dinh', 'Đình Hàng Gai', 20, HANG_GAI),
  N('bookshop', 'Hiệu sách cũ', 32, HANG_GAI),
  N('maiOffice', 'Văn phòng du học Mai Anh', 11.0, -10.6),
  N('bank', 'Ngân hàng Hàng Gai', -44.5, HANG_GAI),
  N('photo', 'Tiệm ảnh Hàng Gai', -34.9, HANG_GAI),
  N('notary', 'Văn phòng công chứng', -20, DAO_C),
  N('pharmacy', 'Nhà thuốc Hàng Đào', 28.2, DAO_C),
  N('showroom', 'Showroom Xe Phố Cổ', -16, AVE_D),
  N('aps', 'Văn phòng APS', -4, AVE_D),
  N('lakePark', 'Vườn hoa Lý Thái Tổ', (LAKE.east + LAKE.path) / 2, 44),
  // Homes north of the lake
  N('home-hg18', 'Số 18 Hàng Gai', -47.6, HANG_GAI),
  N('home-hg52', 'Số 52 Hàng Gai', 27.6, HANG_GAI),
  N('home-hd7', 'Số 7 Hàng Đào', -36.5, DAO_B),
  N('home-hd23', 'Số 23 Hàng Đào', -7.5, DAO_B),
  N('home-hd40', 'Số 40 Hàng Đào', 26, DAO_B),
  N('home-hd15', 'Số 15 Hàng Đào', -2, DAO_C),
  N('home-tt9', 'Số 9 Tràng Tiền', -40, AVE_C2),
  N('home-tt24', 'Số 24 Tràng Tiền', 1, AVE_C2),
  N('home-tt31', 'Số 31 Tràng Tiền', 29, AVE_D),
  N('home-tt12', 'Số 12 Tràng Tiền', -50, AVE_D),
  // South of the lake: Hàng Khay, Bà Triệu
  S('lakeSouth', 'Bờ hồ phía Hàng Khay', -20, OZ + 2.6),
  ...BUILDINGS.filter((b) => b.id && b.id !== 'restaurant' && b.face === 'north').map((b) => S(`city-${b.id}`, CITY_PLACES[b.id!].name.vi, b.x, KHAY)),
  S('hospital', CITY_PLACES.hospital.name.vi, BA_TRIEU.px1 - 0.8, OZ + 40),
  S('police', CITY_PLACES.police.name.vi, BA_TRIEU.px1 - 0.8, OZ + 53.2),
  S('library', CITY_PLACES.library.name.vi, BA_TRIEU.px1 - 0.8, OZ + 59.6),
  S('school', CITY_PLACES.school.name.vi, BA_TRIEU.px0 + 0.8, OZ + 35.2),
  S('home-bt14', 'Số 14 Bà Triệu', BA_TRIEU.px0 + 0.8, OZ + 50),
  S('home-hk6', 'Số 6 Hàng Khay', -45.5, KHAY),
]

export const STOP_BY_ID = Object.fromEntries(GRAB_STOPS.map((s) => [s.id, s])) as Record<string, GrabStop>

/** The east lake path joins the two halves (the lake is in between). */
const GATE_N = { x: (LAKE.east + LAKE.path) / 2, z: LAKE.north + 1.5 }
const GATE_S = { x: (LAKE.east + LAKE.path) / 2, z: LAKE.south + 4 }

/**
 * Road distance estimate in metres: streets are a grid, so the straight line × 1.3; between the two sides of the
 * lake the way goes round by the east path.
 */
export function roadDist(a: { x: number; z: number; side?: 'north' | 'south' }, b: { x: number; z: number; side?: 'north' | 'south' }) {
  const sideOf = (p: { z: number; side?: 'north' | 'south' }) => p.side ?? (p.z > LAKE.south - 2 ? 'south' : 'north')
  const d = (p: { x: number; z: number }, q: { x: number; z: number }) => Math.hypot(p.x - q.x, p.z - q.z)
  const sa = sideOf(a)
  const sb = sideOf(b)
  // On the east path itself both sides are close
  const onPath = (p: { x: number; z: number }) => p.x > LAKE.east - 1 && p.z > LAKE.north && p.z < LAKE.south
  if (sa === sb || onPath(a) || onPath(b)) return d(a, b) * 1.3
  const [n, s] = sa === 'north' ? [a, b] : [b, a]
  return (d(n, GATE_N) + d(GATE_N, GATE_S) + d(GATE_S, s)) * 1.15
}
