import type { Localized } from '../../i18n/localized'
import type { SceneId } from '../../store/worldStore'

/**
 * Top-down map data for the outdoor scenes (ui/MapView.tsx draws it). x → right,
 * z → down, so the building fronts are at the top and the road below, like the camera.
 * Indoor scenes have no entry: the map then frames the room from its interactables.
 */

export interface MapRect {
  x0: number
  z0: number
  x1: number
  z1: number
  color: string
  /** Rounded "blob" (parks, lake) instead of a crisp block. */
  soft?: boolean
}

export interface SceneMap {
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number }
  ground: string
  rects: MapRect[]
  circles?: { x: number; z: number; r: number; color: string }[]
  /** Names of streets, water, areas (drawn on the big map). */
  labels?: MapLabel[]
}

export interface MapLabel {
  x: number
  z: number
  text: Localized
  kind: 'street' | 'water' | 'area'
}

const ROAD = '#9aa3b2'
const ROAD_LINE = '#f6f1e7'

export const SCENE_MAPS: Partial<Record<SceneId, SceneMap>> = {
  vietnam: {
    bounds: { minX: -53, maxX: 49, minZ: -85, maxZ: 136 },
    ground: '#efe2c8',
    rects: [
      // Lake (Hồ Gươm), Hàng Gai (four lanes since 1.19), Hàng Bông
      { x0: -52, z0: 19.4, x1: 30.4, z1: 70, color: '#8cc2bb', soft: true },
      // 1.34 one map: the east lake path, Vườn hoa Lý Thái Tổ, and Phố Hàng Khay on the south shore
      { x0: 30.4, z0: 19.4, x1: 34.6, z1: 70, color: '#e6d9c2' },
      { x0: 34.6, z0: 19.4, x1: 48, z1: 70, color: '#8fca72', soft: true },
      { x0: -49, z0: 77.2, x1: 49, z1: 87.2, color: ROAD },
      { x0: -49, z0: 82.1, x1: 49, z1: 82.3, color: ROAD_LINE },
      { x0: 3.5, z0: 87.2, x1: 8.5, z1: 136.2, color: ROAD },
      { x0: -44, z0: 101.2, x1: 1.5, z1: 134.2, color: '#9fd27e', soft: true },
      { x0: -16, z0: 101.2, x1: -6.2, z1: 111.2, color: '#e2d2ae' },
      // 1.39 Sân pickleball (HangKhay/layout.ts PICKLE)
      { x0: -43.3, z0: 103.6, x1: -25.9, z1: 112.8, color: '#4f9a6a' },
      { x0: -41.3, z0: 105.15, x1: -27.9, z1: 111.25, color: '#3e7fc1' },
      { x0: -43.6, z0: 91.7, x1: -36.8, z1: 98.8, color: '#d7c7a6' },
      { x0: -36.6, z0: 91.7, x1: -17.4, z1: 99.3, color: '#e8b9a6' },
      { x0: -17.2, z0: 91.7, x1: -11.2, z1: 98.7, color: '#f2c46d' },
      { x0: -10.9, z0: 91.7, x1: -4.9, z1: 98.7, color: '#c9dcc0' },
      { x0: -4.6, z0: 91.7, x1: 1.4, z1: 98.7, color: '#d9cbe8' },
      { x0: 10.6, z0: 91.7, x1: 21.2, z1: 98, color: '#f4dfae' },
      { x0: 21.5, z0: 91.7, x1: 27.5, z1: 97.7, color: '#a9d6e8' },
      { x0: 27.8, z0: 91.7, x1: 33.8, z1: 97.7, color: '#f0b9c8' },
      { x0: 34.2, z0: 91.7, x1: 41.0, z1: 98.8, color: '#bfe0cf' },
      { x0: 41.2, z0: 91.7, x1: 46.6, z1: 97.2, color: '#f6e7c4' },
      { x0: 10.5, z0: 101.6, x1: 18.1, z1: 120.8, color: '#dfe9ee' },
      { x0: 10.5, z0: 121, x1: 17.5, z1: 127.8, color: '#f2d48a' },
      { x0: 10.5, z0: 128.1, x1: 16.0, z1: 133.5, color: '#cfd8b8' },
      { x0: -5.6, z0: 101.5, x1: 1.5, z1: 111.3, color: '#f6d38a' },
      { x0: -40, z0: 2.7, x1: 20, z1: 12.7, color: ROAD },
      { x0: -40, z0: 7.6, x1: 20, z1: 7.8, color: ROAD_LINE },
      { x0: 10, z0: -21, x1: 13.6, z1: 2.7, color: ROAD },
      // Hàng Gai row: tube houses, the bubble-tea shop, the German centre in the alley
      { x0: -29.1, z0: -13, x1: -14.7, z1: -4.5, color: '#f2c46d' },
      { x0: -12.2, z0: -13, x1: -3.25, z1: -4.5, color: '#f2c46d' },
      { x0: 1.0, z0: -13, x1: 8.0, z1: -4.5, color: '#e8a38f' },
      { x0: -3.25, z0: -13, x1: 1.0, z1: -8.5, color: '#e3d3b0' },
      { x0: -51.6, z0: -13, x1: -32.6, z1: -4.5, color: '#f6d6a8' },
      { x0: 8.05, z0: -12.9, x1: 9.75, z1: -8.3, color: '#f3d9c4' },
      { x0: 13.85, z0: -12.9, x1: 15.95, z1: -8.6, color: '#d9dde6' },
      { x0: 13.85, z0: -8.3, x1: 15.95, z1: -4.6, color: '#f39a8f' },
      { x0: 16, z0: -9.6, x1: 24, z1: -4.5, color: '#e8dcc0' },
      { x0: 16, z0: -13, x1: 24, z1: -9.6, color: '#c8322b' },
      { x0: 24.1, z0: -13, x1: 25.9, z1: -4.5, color: '#d9cdb5' },
      { x0: 26, z0: -13, x1: 30.4, z1: -4.5, color: '#ffc8b4' },
      { x0: 30.6, z0: -13, x1: 34, z1: -4.5, color: '#dfe8f2' },
      { x0: 16.4, z0: 15.8, x1: 30.8, z1: 16.8, color: '#ff9b8f' },
      // Thê Húc bridge and the temple on Jade Island
      { x0: 9.05, z0: 19.2, x1: 10.95, z1: 30.3, color: '#d6362c' },
      { x0: 6.5, z0: 36.8, x1: 13.5, z1: 41.2, color: '#c8322b' },
      // Row B, the walking street, rows C + C2, the avenue, row D
      { x0: -44, z0: -21, x1: -32.6, z1: -13, color: '#e6cfa6' },
      { x0: -29.1, z0: -21, x1: -14.7, z1: -13, color: '#ecd9b4' },
      { x0: -12.2, z0: -21, x1: 7.6, z1: -13, color: '#e6cfa6' },
      { x0: 16, z0: -21, x1: 34, z1: -13, color: '#ecd9b4' },
      { x0: -42, z0: -38, x1: 35, z1: -21, color: '#e3d6bf' },
      { x0: -42, z0: -30.2, x1: 35, z1: -28.8, color: '#cfe0b0' },
      { x0: -52, z0: -34, x1: -43.1, z1: -25, color: '#a8a39a' },
      { x0: -52, z0: -54, x1: -31, z1: -38, color: '#e9d2ad' },
      { x0: -27, z0: -54, x1: 6, z1: -38, color: '#ecd9b4' },
      { x0: 18, z0: -54, x1: 30.5, z1: -38, color: '#e9d2ad' },
      { x0: 6, z0: -54, x1: 18, z1: -38, color: '#e3d6bf' },
      { x0: -53, z0: -71, x1: 35, z1: -59, color: ROAD },
      { x0: -53, z0: -65.1, x1: 35, z1: -64.9, color: ROAD_LINE },
      { x0: -52, z0: -84, x1: -38, z1: -76, color: '#e9d2ad' },
      { x0: -38, z0: -84, x1: -22, z1: -73, color: '#c9ced8' },
      { x0: -34, z0: -82, x1: -26, z1: -77, color: '#f39a2b' },
      { x0: -22, z0: -84, x1: 7, z1: -76, color: '#ecd9b4' },
      { x0: 7, z0: -84, x1: 17, z1: -76, color: '#f0c878' },
      { x0: 17, z0: -84, x1: 34, z1: -76, color: '#e9d2ad' },
      // Shops that moved north (1.19)
      { x0: -22.3, z0: -46, x1: -17.7, z1: -38, color: '#e9e2d4' },
      { x0: 25.9, z0: -46, x1: 30.5, z1: -38, color: '#cfe0c8' },
      { x0: -6.3, z0: -84, x1: -1.7, z1: -76, color: '#dfe6f2' },
      { x0: -22, z0: -84, x1: -10, z1: -76, color: '#f2c1b6' },
    ],
    circles: [{ x: -22, z: 118.2, r: 6.5, color: '#e3d6bf' }, { x: 42.1, z: 44.7, r: 4.6, color: '#e3d6bf' }, 
      { x: 12, z: -46, r: 1.8, color: '#8cc2d8' },
      { x: -30.2, z: -6.5, r: 1.6, color: '#7cb35d' },
      { x: 20, z: -7.1, r: 0.5, color: '#b8863a' },
      { x: 10, z: 36.2, r: 6.6, color: '#9ccc78' },
      { x: 10, z: 33.9, r: 0.6, color: '#b8863a' },
    ],
    labels: [
      { x: -16, z: 7.7, kind: 'street', text: { vi: 'Phố Hàng Gai', en: 'Hàng Gai Street', de: 'Hàng-Gai-Straße' } },
      { x: -14, z: 22.4, kind: 'water', text: { vi: 'Hồ Hoàn Kiếm (Hồ Gươm)', en: 'Hoàn Kiếm Lake', de: 'Hoàn-Kiếm-See' } },
      { x: 13.2, z: 24.8, kind: 'area', text: { vi: 'Cầu Thê Húc', en: 'Thê Húc Bridge', de: 'Thê-Húc-Brücke' } },
      { x: 32.5, z: 30, kind: 'street', text: { vi: 'Đường ven hồ', en: 'Lakeside path' } },
      { x: 41.3, z: 52, kind: 'area', text: { vi: 'Vườn hoa Lý Thái Tổ', en: 'Lý Thái Tổ garden' } },
      { x: -10, z: 82.2, kind: 'street', text: { vi: 'Phố Hàng Khay', en: 'Hàng Khay Street' } },
      { x: 6, z: 116.2, kind: 'street', text: { vi: 'Phố Bà Triệu', en: 'Bà Triệu Street' } },
      { x: -24, z: 127.2, kind: 'area', text: { vi: 'Vườn hoa Hàng Khay', en: 'Hàng Khay garden' } },
      { x: -34.6, z: 101.8, kind: 'area', text: { vi: 'Sân pickleball', en: 'Pickleball court' } },
      { x: 20, z: -11.3, kind: 'area', text: { vi: 'Đình làng', en: 'Communal house', de: 'Gemeindehaus' } },
      { x: 23.6, z: 17.6, kind: 'area', text: { vi: 'Chợ đêm', en: 'Night market', de: 'Nachtmarkt' } },
      { x: 11.8, z: -16.5, kind: 'street', text: { vi: 'Phố Hàng Bông', en: 'Hàng Bông street', de: 'Hàng-Bông-Straße' } },
      { x: 8.9, z: -10.6, kind: 'area', text: { vi: 'VP Mai Anh', en: 'Mai Anh office', de: 'Büro Mai Anh' } },
      { x: 14.9, z: -10.7, kind: 'area', text: { vi: 'Hoàng Kim', en: 'Hoàng Kim', de: 'Hoàng Kim' } },
      { x: 14.9, z: -6.4, kind: 'area', text: { vi: 'Circle K', en: 'Circle K', de: 'Circle K' } },
      { x: 4.5, z: -9, kind: 'area', text: { vi: 'Trà sữa', en: 'Bubble tea', de: 'Bubble Tea' } },
      { x: -34.9, z: -8.5, kind: 'area', text: { vi: 'Tiệm ảnh', en: 'Photo studio', de: 'Fotostudio' } },
      { x: -44.5, z: -8.5, kind: 'area', text: { vi: 'Ngân hàng', en: 'Bank', de: 'Bank' } },
      { x: -20, z: -42, kind: 'area', text: { vi: 'Công chứng', en: 'Notary', de: 'Notariat' } },
      { x: 28.2, z: -42, kind: 'area', text: { vi: 'Nhà thuốc', en: 'Pharmacy', de: 'Apotheke' } },
      { x: -4, z: -80, kind: 'area', text: { vi: 'Văn phòng APS', en: 'APS office', de: 'APS-Büro' } },
      { x: -30, z: -79.5, kind: 'area', text: { vi: 'Cây xăng', en: 'Petrol station', de: 'Tankstelle' } },
      { x: -16, z: -80, kind: 'area', text: { vi: 'Showroom xe', en: 'Vehicle showroom' } },
      { x: 12, z: -80, kind: 'area', text: { vi: 'Bưu điện', en: 'Post office', de: 'Post' } },
      { x: -8, z: -24.4, kind: 'street', text: { vi: 'Phố đi bộ Hàng Đào', en: 'Hàng Đào walking street', de: 'Fußgängerstraße Hàng Đào' } },
      { x: -10, z: -65, kind: 'street', text: { vi: 'Phố Tràng Tiền', en: 'Tràng Tiền avenue', de: 'Tràng-Tiền-Allee' } },
      { x: -47.5, z: -29.5, kind: 'area', text: { vi: 'Nhà thờ Lớn', en: 'Cathedral', de: 'Kathedrale' } },
      { x: 12, z: -50.5, kind: 'area', text: { vi: 'Vườn hoa', en: 'Square', de: 'Platz' } },
      { x: -30.8, z: -17, kind: 'area', text: { vi: 'Ngõ Cây Đa', en: 'Banyan lane', de: 'Banyan-Gasse' } },
      { x: -13.4, z: -17, kind: 'area', text: { vi: 'Ngõ Tạp Hóa', en: 'Grocery lane', de: 'Laden-Gasse' } },
    ],
  },
  germany: {
    bounds: { minX: -33, maxX: 35, minZ: -13.5, maxZ: 15.5 },
    ground: '#e6e1d8',
    rects: [
      { x0: -40, z0: 3.2, x1: 20, z1: 8.6, color: ROAD },
      { x0: -40, z0: 5.45, x1: 20, z1: 5.55, color: ROAD_LINE },
      { x0: -40, z0: 6.15, x1: 20, z1: 6.25, color: ROAD_LINE },
      { x0: -32, z0: 10.6, x1: 14.5, z1: 14.2, color: '#b9d9a0', soft: true },
      // Altbau row: Asia-Markt, Apotheke, WG, Bürgeramt, supermarket, bakery/bank
      { x0: -26.9, z0: -13, x1: -19.9, z1: -4.5, color: '#efe2c4' },
      { x0: -19.5, z0: -13, x1: -13.7, z1: -4.5, color: '#d8e4c8' },
      { x0: -13, z0: -13, x1: -6, z1: -4.5, color: '#a9c8e8' },
      { x0: -5.25, z0: -13, x1: 1.25, z1: -4.5, color: '#e8dcc0' },
      { x0: 1.8, z0: -13, x1: 7.8, z1: -4.5, color: '#f4f4f4' },
      { x0: 8.45, z0: -13, x1: 13.95, z1: -4.5, color: '#f2c4a8' },
      // Stadtpark: lawn, playground sand, kiosk
      { x0: 14.5, z0: -12.8, x1: 34, z1: -4.6, color: '#a8d08d', soft: true },
      { x0: 15.1, z0: -11.9, x1: 19.7, z1: -7.5, color: '#d9c39a' },
      { x0: 30.6, z0: -11.9, x1: 33.4, z1: -9.9, color: '#c4a074' },
    ],
    circles: [
      { x: -29.6, z: -1.2, r: 1.4, color: '#8cc2d8' },
      { x: 24.3, z: -9.2, r: 2.0, color: '#8cc2d8' },
      { x: 26.7, z: -9.2, r: 2.0, color: '#8cc2d8' },
    ],
    labels: [
      { x: -14, z: 5.9, kind: 'street', text: { vi: 'Lindenstraße', en: 'Lindenstraße', de: 'Lindenstraße' } },
      { x: 24, z: -5.4, kind: 'area', text: { vi: 'Công viên thành phố', en: 'City park', de: 'Stadtpark' } },
      { x: 25.5, z: -11.8, kind: 'water', text: { vi: 'Hồ vịt', en: 'Duck pond', de: 'Ententeich' } },
      { x: -9, z: 12.4, kind: 'area', text: { vi: 'Bãi cỏ', en: 'Green', de: 'Grünanlage' } },
    ],
  },
}
