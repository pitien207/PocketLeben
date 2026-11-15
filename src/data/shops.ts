import type { Localized } from '../i18n/localized'
import type { ItemId } from './items'

export interface ShopDef {
  id: string
  name: Localized
  items: ItemId[]
  /** Opening hours [from, to). Omit = always open. */
  hours?: [number, number]
  /** Germany: shops are closed on Sunday. */
  closedSunday?: boolean
}

export const SHOPS = {
  taphoa: {
    id: 'taphoa',
    name: { vi: 'Tạp hóa Cô Liên', en: "Auntie Liên's grocery", de: 'Tante Liêns Laden' },
    items: ['miGoi', 'banhBao', 'xoi', 'nuocMia', 'tangLuc'],
  },
  supermarkt: {
    id: 'supermarkt',
    name: { vi: 'Siêu thị', en: 'Supermarket', de: 'Supermarkt' },
    items: ['broetchen', 'schorle', 'pizza', 'asiaNudeln'],
    hours: [8, 22],
    closedSunday: true,
  },
  baeckerei: {
    id: 'baeckerei',
    name: { vi: 'Tiệm bánh Bäckerei', en: 'Bakery', de: 'Bäckerei' },
    items: ['broetchen', 'brezel', 'kuchen', 'kaffee'],
    // Bakeries open early — even on Sunday morning.
    hours: [6, 18],
  },
  asiaMarkt: {
    id: 'asiaMarkt',
    name: { vi: 'Siêu thị châu Á', en: 'Asia market', de: 'Asia-Markt' },
    items: ['asiaNudeln', 'reis', 'nuocMam'],
    hours: [9, 20],
    closedSunday: true,
  },
  imbiss: {
    id: 'imbiss',
    name: { vi: 'Quầy Döner', en: 'Döner stand', de: 'Imbiss' },
    items: ['doener', 'schorle'],
    hours: [10, 24],
  },
  giaKhat: {
    id: 'giaKhat',
    name: { vi: 'Nước mía Cô Tư', en: 'Auntie Tư’s juice stall', de: 'Tante Tưs Saftstand' },
    items: ['nuocMia', 'che', 'kemTrangTien'],
    hours: [8, 22],
  },
  choDem: {
    id: 'choDem',
    name: { vi: 'Chợ đêm phố cổ', en: 'Old Quarter night market', de: 'Nachtmarkt' },
    items: ['che', 'banhTrang', 'kemTrangTien', 'nuocMia', 'hoaCuc'],
    hours: [17, 24],
  },
  kiosk: {
    id: 'kiosk',
    name: { vi: 'Kiosk bên hồ', en: 'Lakeside kiosk', de: 'Kiosk am See' },
    items: ['apfelschorle', 'brezel', 'kaffee', 'spaghettiEis'],
    hours: [10, 22],
  },
  eiswagen: {
    id: 'eiswagen',
    name: { vi: 'Xe kem Luca', en: 'Luca’s ice-cream cart', de: 'Lucas Eiswagen' },
    items: ['spaghettiEis'],
    hours: [11, 20],
  },
} satisfies Record<string, ShopDef>

export type ShopId = keyof typeof SHOPS
