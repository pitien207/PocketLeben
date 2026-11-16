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
    bounds: { minX: -53, maxX: 35, minZ: -13.5, maxZ: 38 },
    ground: '#efe2c8',
    rects: [
      // Lake (Hồ Gươm) along the bottom, grass strip, main road, side road
      { x0: -40, z0: 14.4, x1: 20, z1: 20, color: '#8cc2bb', soft: true },
      { x0: -40, z0: 3.2, x1: 20, z1: 8.6, color: ROAD },
      { x0: -40, z0: 5.85, x1: 20, z1: 5.95, color: ROAD_LINE },
      { x0: 10, z0: -14, x1: 13.6, z1: 3.2, color: ROAD },
      // Building rows (tube houses, café)
      { x0: -29.1, z0: -13, x1: -14.7, z1: -4.5, color: '#f2c46d' },
      { x0: -12.2, z0: -13, x1: -3.25, z1: -4.5, color: '#f2c46d' },
      { x0: 1.0, z0: -13, x1: 8.0, z1: -4.5, color: '#e8a38f' },
      { x0: -3.25, z0: -13, x1: 1.0, z1: -8.5, color: '#e3d3b0' },
      // Visa offices (1.13): photo studio, notary, bank, APS
      { x0: -37.2, z0: -13, x1: -32.6, z1: -4.5, color: '#f6d6a8' },
      { x0: -42.0, z0: -13, x1: -37.4, z1: -4.5, color: '#e9e2d4' },
      { x0: -46.8, z0: -13, x1: -42.2, z1: -4.5, color: '#cfe4dc' },
      { x0: -51.6, z0: -13, x1: -47.0, z1: -4.5, color: '#dfe6f2' },
      // Phố Hàng Bông (story 2.1): Mai Anh office, Hoàng Kim, Circle K
      { x0: 8.05, z0: -12.9, x1: 9.75, z1: -8.3, color: '#f3d9c4' },
      { x0: 13.85, z0: -12.9, x1: 15.95, z1: -8.6, color: '#d9dde6' },
      { x0: 13.85, z0: -8.3, x1: 15.95, z1: -4.6, color: '#f39a8f' },
      // East block: đình courtyard + hall, the alley, juice shop, bookshop, night market
      { x0: 16, z0: -9.6, x1: 24, z1: -4.5, color: '#e8dcc0' },
      { x0: 16, z0: -13, x1: 24, z1: -9.6, color: '#c8322b' },
      { x0: 24.1, z0: -13, x1: 25.9, z1: -4.5, color: '#d9cdb5' },
      { x0: 26, z0: -13, x1: 30.4, z1: -4.5, color: '#ffc8b4' },
      { x0: 30.6, z0: -13, x1: 34, z1: -4.5, color: '#dfe8f2' },
      { x0: 16.4, z0: 10.8, x1: 30.8, z1: 11.8, color: '#ff9b8f' },
      // Thê Húc bridge and the temple hall on Jade Island
      { x0: 9.05, z0: 14.2, x1: 10.95, z1: 25.3, color: '#d6362c' },
      { x0: 6.5, z0: 31.8, x1: 13.5, z1: 36.2, color: '#c8322b' },
    ],
    circles: [
      { x: -30.2, z: -6.5, r: 1.6, color: '#7cb35d' },
      { x: 20, z: -7.1, r: 0.5, color: '#b8863a' },
      { x: 10, z: 31.2, r: 6.6, color: '#9ccc78' },
      { x: 10, z: 28.9, r: 0.6, color: '#b8863a' },
    ],
    labels: [
      { x: -16, z: 5.9, kind: 'street', text: { vi: 'Phố Hàng Gai', en: 'Hàng Gai Street', de: 'Hàng-Gai-Straße' } },
      { x: -14, z: 17.4, kind: 'water', text: { vi: 'Hồ Hoàn Kiếm (Hồ Gươm)', en: 'Hoàn Kiếm Lake', de: 'Hoàn-Kiếm-See' } },
      { x: 13.2, z: 19.8, kind: 'area', text: { vi: 'Cầu Thê Húc', en: 'Thê Húc Bridge', de: 'Thê-Húc-Brücke' } },
      { x: 20, z: -11.3, kind: 'area', text: { vi: 'Đình làng', en: 'Communal house', de: 'Gemeindehaus' } },
      { x: 25, z: -12.4, kind: 'area', text: { vi: 'Ngõ', en: 'Alley', de: 'Gasse' } },
      { x: 23.6, z: 12.6, kind: 'area', text: { vi: 'Chợ đêm', en: 'Night market', de: 'Nachtmarkt' } },
      { x: 11.8, z: -1.5, kind: 'street', text: { vi: 'Phố Hàng Bông', en: 'Hàng Bông street', de: 'Hàng-Bông-Straße' } },
      { x: 8.9, z: -10.6, kind: 'area', text: { vi: 'VP Mai Anh', en: 'Mai Anh office', de: 'Büro Mai Anh' } },
      { x: 14.9, z: -10.7, kind: 'area', text: { vi: 'Hoàng Kim', en: 'Hoàng Kim', de: 'Hoàng Kim' } },
      { x: 14.9, z: -6.4, kind: 'area', text: { vi: 'Circle K', en: 'Circle K', de: 'Circle K' } },
      { x: -22, z: -12.4, kind: 'area', text: { vi: 'Phố cổ', en: 'Old Quarter', de: 'Altstadt' } },
      { x: -34.9, z: -8.5, kind: 'area', text: { vi: 'Tiệm ảnh', en: 'Photo studio', de: 'Fotostudio' } },
      { x: -39.7, z: -8.5, kind: 'area', text: { vi: 'Công chứng', en: 'Notary', de: 'Notariat' } },
      { x: -44.5, z: -8.5, kind: 'area', text: { vi: 'Ngân hàng', en: 'Bank', de: 'Bank' } },
      { x: -49.3, z: -8.5, kind: 'area', text: { vi: 'Văn phòng APS', en: 'APS office', de: 'APS-Büro' } },
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
