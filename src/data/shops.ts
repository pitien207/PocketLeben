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
  // 1.44 München (scenes/GermanyStreet/MunichLife.tsx)
  hofbraeuhaus: {
    id: 'hofbraeuhaus',
    name: { vi: 'Hofbräuhaus', en: 'Hofbräuhaus', de: 'Hofbräuhaus' },
    items: ['brezel', 'apfelschorle', 'schorle', 'kaffee'],
    hours: [10, 24],
  },
  biergarten: {
    id: 'biergarten',
    name: { vi: 'Vườn bia Chinesischer Turm', en: 'Chinese Tower beer garden', de: 'Biergarten am Chinesischen Turm' },
    items: ['brezel', 'apfelschorle', 'spaghettiEis'],
    hours: [10, 22],
  },
  viktualienmarkt: {
    id: 'viktualienmarkt',
    name: { vi: 'Chợ Viktualienmarkt', en: 'Viktualienmarkt', de: 'Viktualienmarkt' },
    items: ['broetchen', 'kuchen', 'apfelschorle', 'brezel'],
    hours: [8, 20],
    closedSunday: true,
  },
  eiswagen: {
    id: 'eiswagen',
    name: { vi: 'Xe kem Luca', en: 'Luca’s ice-cream cart', de: 'Lucas Eiswagen' },
    items: ['spaghettiEis'],
    hours: [11, 20],
  },
  // 1.40 the eateries (data/eateries.ts): talking to the owner opens these
  phoGiaTruyen: {
    id: 'phoGiaTruyen',
    name: { vi: 'Phở Gia Truyền', en: 'Family phở shop' },
    items: ['pho', 'phoGa', 'traDa'],
    hours: [6, 22],
  },
  bunChaCoLua: {
    id: 'bunChaCoLua',
    name: { vi: 'Bún Chả Cô Lụa', en: 'Cô Lụa’s bún chả' },
    items: ['bunCha', 'nemRan', 'traDa'],
    hours: [10, 21],
  },
  banhCuonBaTam: {
    id: 'banhCuonBaTam',
    name: { vi: 'Bánh Cuốn Bà Tám', en: 'Bà Tám’s rice rolls' },
    items: ['banhCuon', 'traDa'],
    hours: [6, 14],
  },
  lauTrangTien: {
    id: 'lauTrangTien',
    name: { vi: 'Lẩu Nướng Tràng Tiền', en: 'Tràng Tiền hotpot' },
    items: ['lauThai', 'nemRan', 'nuocMia'],
    hours: [11, 23],
  },
  banhMi25: {
    id: 'banhMi25',
    name: { vi: 'Bánh Mì Phố Cổ 25', en: 'Bánh mì no. 25' },
    items: ['banhMi', 'banhMiXiuMai', 'nuocMia'],
    hours: [6, 22],
  },
  comBaSau: {
    id: 'comBaSau',
    name: { vi: 'Cơm Bình Dân Bà Sáu', en: 'Bà Sáu’s rice' },
    items: ['comSuat', 'traDa'],
    hours: [10, 20],
  },
  cheBonMua: {
    id: 'cheBonMua',
    name: { vi: 'Chè Bốn Mùa', en: 'Four Seasons chè' },
    items: ['che', 'cheBuoi', 'kemTrangTien'],
    hours: [9, 23],
  },
  nhaHangBoHo: {
    id: 'nhaHangBoHo',
    name: { vi: 'Nhà hàng Bờ Hồ', en: 'Lakeside restaurant' },
    items: ['comSuat', 'nemRan', 'lauThai'],
    hours: [10, 22],
  },
} satisfies Record<string, ShopDef>

export type ShopId = keyof typeof SHOPS
