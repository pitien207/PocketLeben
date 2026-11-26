import type { InteractableDef } from '../store/interactionStore'
import { ICON3D } from './Icon3d'

/**
 * 1.46 map pins (user: "nâng cấp các icon trên bản đồ"): every place on the 🗺️ map shows a Fluent Emoji 3D picture
 * (MIT, src/assets/icons3d) for what it is — a bowl for an eatery, a pump for the petrol station, a temple, a bank…
 * Picked from the place's id / name, then from its first action's icon; a pushpin otherwise.
 */
const BY_ID: [RegExp, string][] = [
  [/gas|xang|tankstelle/i, 'fuel-pump'],
  [/showroom/i, 'motor-scooter'],
  [/pfand/i, 'recycling-symbol'],
  [/sbahn|tram|bahn|hbf/i, 'light-rail'],
  [/home|nha-|house/i, 'house'],
]

const BY_NAME: [RegExp, string][] = [
  [/trà sữa|bubble/i, 'bubble-tea'],
  [/cà phê|cafe|café|kaffee/i, 'hot-beverage'],
  [/bánh mì/i, 'sandwich'],
  [/phở|bún|cơm|bánh cuốn|lẩu|quán|nhà hàng|restaurant|mì|xôi/i, 'steaming-bowl'],
  [/chè|kem|eis/i, 'shaved-ice'],
  [/circle k|tạp hóa|siêu thị|supermarkt|rewe|edeka|kiosk/i, 'convenience-store'],
  [/xăng|tankstelle/i, 'fuel-pump'],
  [/ngân hàng|bank|sparkasse/i, 'bank'],
  [/vàng|gold/i, 'gem-stone'],
  [/bưu điện|post/i, 'post-office'],
  [/nhà thuốc|apotheke|pharmacy/i, 'pill'],
  [/ảnh|photo|foto/i, 'camera'],
  [/công chứng|notar|dịch thuật/i, 'memo'],
  [/aps|vfs|đại sứ|embassy|botschaft|bürgeramt|ausländer|visa/i, 'passport-control'],
  [/văn phòng|büro|office|hoàng kim/i, 'briefcase'],
  [/trung tâm|lớp|trường|school|schule|uni|lmu|hochschule|học/i, 'school'],
  [/thư viện|bibliothek|library|sách|book/i, 'books'],
  [/bệnh viện|krankenhaus|hospital|pflege|care/i, 'hospital'],
  [/công an|polizei|police/i, 'police-car-light'],
  [/rạp|kino|cinema/i, 'film-projector'],
  [/karaoke/i, 'microphone'],
  [/gym|thể hình|fitness/i, 'flexed-biceps'],
  [/khách sạn|hotel|nhà nghỉ/i, 'hotel'],
  [/điện thoại|phone|handy/i, 'mobile-phone'],
  [/đền|đình|chùa|miếu|tempel/i, 'hindu-temple'],
  [/nhà thờ|kirche|dom|frauenkirche/i, 'church'],
  [/chợ|markt|market/i, 'basket'],
  [/quần áo|thời trang|kleid|mode|cắt tóc|friseur/i, 't-shirt'],
  [/bia|bier|hofbräu|biergarten/i, 'beer-mug'],
  [/pickleball|sân/i, 'sports-medal'],
  [/công viên|vườn|park|garten/i, 'deciduous-tree'],
  [/hồ|see|cầu|brücke|bridge/i, 'fountain'],
  [/sân bay|flughafen|airport/i, 'airplane-departure'],
  [/xe|vehicle/i, 'motor-scooter'],
  [/nhà|wg|wohnung|home/i, 'house'],
]

/** Fluent icons of the context-action names that say what a place is (doors and talking say nothing). */
const BY_ACTION: Record<string, string> = {
  coffee: 'hot-beverage',
  shop: 'shopping-cart',
  sleep: 'bed',
  book: 'open-book',
  passport: 'identification-card',
  ticket: 'ticket',
  tram: 'light-rail',
  bottle: 'recycling-symbol',
  hanger: 't-shirt',
  laptop: 'laptop',
  incense: 'diya-lamp',
  swing: 'playground-slide',
  duck: 'duck',
  chicken: 'chicken',
  garden: 'seedling',
  water: 'droplet',
  seat: 'seat',
  board: 'airplane-departure',
  sight: 'round-pushpin',
  wheel: 'motor-scooter',
}

/** 1.46 shop signs: the picture that goes with a sign's title (null = no picture: a plain name). */
export function iconForText(text: string): string | null {
  for (const [re, icon] of BY_NAME) if (re.test(text)) return icon
  return null
}

export function placeIconName(def: InteractableDef, name: string): string {
  for (const [re, icon] of BY_ID) if (re.test(def.id)) return icon
  for (const [re, icon] of BY_NAME) if (re.test(name)) return icon
  const a = def.actions[0]?.icon
  if (a && BY_ACTION[a]) return BY_ACTION[a]
  return 'round-pushpin'
}

const images = new Map<string, HTMLImageElement>()
/** The decoded picture for a canvas (null until it has loaded; the map redraws every frame). */
export function iconImage(name: string): HTMLImageElement | null {
  let img = images.get(name)
  if (!img) {
    const src = ICON3D[name] ?? ICON3D['round-pushpin']
    if (!src || typeof Image === 'undefined') return null
    img = new Image()
    img.decoding = 'async'
    img.src = src
    images.set(name, img)
  }
  return img.complete && img.naturalWidth > 0 ? img : null
}
