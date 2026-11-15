import type { Currency } from '../i18n/format'
import type { Localized } from '../i18n/localized'

/** Food & drink (plan §5.5). Add an item here and list it in a shop (data/shops.ts). Every item has a weight (kg). */

export type ItemIconName =
  | 'banhMi'
  | 'traDa'
  | 'miGoi'
  | 'banhBao'
  | 'nuocMia'
  | 'tangLuc'
  | 'xoi'
  | 'broetchen'
  | 'brezel'
  | 'doener'
  | 'schorle'
  | 'kaffee'
  | 'pizza'
  | 'kuchen'
  | 'hoa'
  | 'pho'
  | 'rice'
  | 'fishSauce'
  | 'oil'
  | 'che'
  | 'banhTrang'
  | 'kem'

export interface ItemDef {
  id: string
  name: Localized
  icon: ItemIconName
  price: number
  currency: Currency
  energy: number
  mood: number
  /** In-game minutes it takes to eat/drink. */
  minutes: number
  /** Kilograms in the bag (CONFIG.bag.capacityKg). */
  weight: number
}

export const ITEMS = {
  che: {
    id: 'che',
    weight: 0.35,
    name: { vi: 'Chè ba màu', en: 'Three-colour sweet soup', de: 'Dreifarbige süße Suppe' },
    icon: 'che',
    price: 20_000,
    currency: 'VND',
    energy: 10,
    mood: 10,
    minutes: 8,
  },
  banhTrang: {
    id: 'banhTrang',
    weight: 0.15,
    name: { vi: 'Bánh tráng nướng', en: 'Grilled rice paper "pizza"', de: 'Gegrilltes Reispapier' },
    icon: 'banhTrang',
    price: 15_000,
    currency: 'VND',
    energy: 15,
    mood: 6,
    minutes: 6,
  },
  kemTrangTien: {
    id: 'kemTrangTien',
    weight: 0.1,
    name: { vi: 'Kem Tràng Tiền', en: 'Tràng Tiền ice cream', de: 'Tràng-Tiền-Eis' },
    icon: 'kem',
    price: 15_000,
    currency: 'VND',
    energy: 4,
    mood: 12,
    minutes: 4,
  },
  spaghettiEis: {
    id: 'spaghettiEis',
    weight: 0.2,
    name: { vi: 'Kem Spaghettieis', en: 'Spaghetti ice cream', de: 'Spaghettieis' },
    icon: 'kem',
    price: 4.5,
    currency: 'EUR',
    energy: 5,
    mood: 14,
    minutes: 6,
  },
  apfelschorle: {
    id: 'apfelschorle',
    weight: 0.5,
    name: { vi: 'Nước táo pha soda', en: 'Apple spritzer', de: 'Apfelschorle' },
    icon: 'schorle',
    price: 2.8,
    currency: 'EUR',
    energy: 6,
    mood: 6,
    minutes: 5,
  },
  hoaCuc: {
    id: 'hoaCuc',
    weight: 0.3,
    name: { vi: 'Bó cúc họa mi', en: 'Bunch of daisies', de: 'Gänseblümchenstrauß' },
    icon: 'hoa',
    price: 30_000,
    currency: 'VND',
    energy: 0,
    mood: 12,
    minutes: 5,
  },
  banhMi: {
    id: 'banhMi',
    weight: 0.25,
    name: { vi: 'Bánh mì thịt', en: 'Bánh mì sandwich', de: 'Bánh-mì-Sandwich' },
    icon: 'banhMi',
    price: 15_000,
    currency: 'VND',
    energy: 25,
    mood: 3,
    minutes: 10,
  },
  traDa: {
    id: 'traDa',
    weight: 0.4,
    name: { vi: 'Trà đá', en: 'Iced tea', de: 'Eistee' },
    icon: 'traDa',
    price: 5_000,
    currency: 'VND',
    energy: 6,
    mood: 8,
    minutes: 15,
  },
  miGoi: {
    id: 'miGoi',
    weight: 0.1,
    name: { vi: 'Mì tôm', en: 'Instant noodles', de: 'Instantnudeln' },
    icon: 'miGoi',
    price: 6_000,
    currency: 'VND',
    energy: 12,
    mood: 0,
    minutes: 10,
  },
  banhBao: {
    id: 'banhBao',
    weight: 0.15,
    name: { vi: 'Bánh bao', en: 'Steamed bun', de: 'Gedämpftes Brötchen' },
    icon: 'banhBao',
    price: 12_000,
    currency: 'VND',
    energy: 18,
    mood: 2,
    minutes: 8,
  },
  xoi: {
    id: 'xoi',
    weight: 0.3,
    name: { vi: 'Xôi đậu xanh', en: 'Mung bean sticky rice', de: 'Klebreis mit Mungbohnen' },
    icon: 'xoi',
    price: 10_000,
    currency: 'VND',
    energy: 20,
    mood: 2,
    minutes: 8,
  },
  nuocMia: {
    id: 'nuocMia',
    weight: 0.5,
    name: { vi: 'Nước mía', en: 'Sugarcane juice', de: 'Zuckerrohrsaft' },
    icon: 'nuocMia',
    price: 10_000,
    currency: 'VND',
    energy: 8,
    mood: 6,
    minutes: 5,
  },
  tangLuc: {
    id: 'tangLuc',
    weight: 0.3,
    name: { vi: 'Nước tăng lực', en: 'Energy drink', de: 'Energydrink' },
    icon: 'tangLuc',
    price: 12_000,
    currency: 'VND',
    energy: 15,
    mood: -3,
    minutes: 2,
  },
  // --- Germany (EUR) ---
  broetchen: {
    id: 'broetchen',
    weight: 0.1,
    name: { vi: 'Bánh mì tròn Brötchen', en: 'Bread roll', de: 'Brötchen' },
    icon: 'broetchen',
    price: 0.6,
    currency: 'EUR',
    energy: 8,
    mood: 1,
    minutes: 5,
  },
  brezel: {
    id: 'brezel',
    weight: 0.12,
    name: { vi: 'Bánh Brezel', en: 'Pretzel', de: 'Brezel' },
    icon: 'brezel',
    price: 1.2,
    currency: 'EUR',
    energy: 10,
    mood: 3,
    minutes: 5,
  },
  doener: {
    id: 'doener',
    weight: 0.45,
    name: { vi: 'Bánh Döner', en: 'Döner kebab', de: 'Döner' },
    icon: 'doener',
    price: 7,
    currency: 'EUR',
    energy: 35,
    mood: 6,
    minutes: 15,
  },
  schorle: {
    id: 'schorle',
    weight: 0.55,
    name: { vi: 'Nước táo Apfelschorle', en: 'Apple spritzer', de: 'Apfelschorle' },
    icon: 'schorle',
    price: 1.5,
    currency: 'EUR',
    energy: 6,
    mood: 4,
    minutes: 3,
  },
  kaffee: {
    id: 'kaffee',
    weight: 0.35,
    name: { vi: 'Cà phê mang đi', en: 'Coffee to go', de: 'Kaffee to go' },
    icon: 'kaffee',
    price: 2.8,
    currency: 'EUR',
    energy: 12,
    mood: 2,
    minutes: 3,
  },
  pizza: {
    id: 'pizza',
    weight: 0.4,
    name: { vi: 'Pizza đông lạnh', en: 'Frozen pizza', de: 'Tiefkühlpizza' },
    icon: 'pizza',
    price: 3,
    currency: 'EUR',
    energy: 25,
    mood: 2,
    minutes: 20,
  },
  kuchen: {
    id: 'kuchen',
    weight: 0.3,
    name: { vi: 'Bánh táo Apfelkuchen', en: 'Apple cake', de: 'Apfelkuchen' },
    icon: 'kuchen',
    price: 2.5,
    currency: 'EUR',
    energy: 12,
    mood: 6,
    minutes: 8,
  },
  pho: {
    id: 'pho',
    weight: 0.8,
    name: { vi: 'Phở bò', en: 'Beef phở', de: 'Rindfleisch-Phở' },
    icon: 'pho',
    price: 45_000,
    currency: 'VND',
    energy: 40,
    mood: 10,
    minutes: 20,
  },
  dauGio: {
    id: 'dauGio',
    weight: 0.05,
    name: { vi: 'Dầu gió', en: 'Medicated oil', de: 'Heilöl' },
    icon: 'oil',
    price: 25_000,
    currency: 'VND',
    energy: 8,
    mood: 6,
    minutes: 5,
  },
  reis: {
    id: 'reis',
    weight: 2,
    name: { vi: 'Túi gạo thơm 2 kg', en: 'Jasmine rice, 2 kg', de: 'Jasminreis, 2 kg' },
    icon: 'rice',
    price: 4.5,
    currency: 'EUR',
    energy: 60,
    mood: 6,
    minutes: 40,
  },
  nuocMam: {
    id: 'nuocMam',
    weight: 0.7,
    name: { vi: 'Chai nước mắm (nấu bữa cơm Việt)', en: 'Fish sauce (cook a Vietnamese meal)', de: 'Fischsauce (vietnamesisch kochen)' },
    icon: 'fishSauce',
    price: 3.2,
    currency: 'EUR',
    energy: 15,
    mood: 14,
    minutes: 30,
  },
  asiaNudeln: {
    id: 'asiaNudeln',
    weight: 0.1,
    name: { vi: 'Mì tôm (siêu thị châu Á)', en: 'Instant noodles (Asia shop)', de: 'Instantnudeln (Asia-Markt)' },
    icon: 'miGoi',
    price: 1.2,
    currency: 'EUR',
    energy: 12,
    mood: 5,
    minutes: 10,
  },
} satisfies Record<string, ItemDef>

export type ItemId = keyof typeof ITEMS

export function getItem(id: string): ItemDef | undefined {
  return (ITEMS as Record<string, ItemDef>)[id]
}
