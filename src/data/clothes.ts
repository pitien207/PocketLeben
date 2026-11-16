import type { Currency } from '../i18n/format'
import type { Localized } from '../i18n/localized'
import type { Outfit } from './npcs'

/** Clothes and hairstyles (plan §5.5–5.6). Buying adds to the wardrobe; wear them from the bag. */

export type ClothingSlot = 'shirt' | 'shorts' | 'shoe' | 'hat' | 'hair' | 'bag' | 'neck'
/** `gift` = not sold anywhere: found as a secret (data/secrets.ts). */
export type ClothesShopId = 'vnClothes' | 'barber' | 'flohmarkt' | 'tailor' | 'gift'

export interface ClothingDef {
  id: string
  name: Localized
  slot: ClothingSlot
  price: number
  currency: Currency
  shop: ClothesShopId
  /** Outfit fields this item changes. */
  apply: Partial<Outfit>
  /** Colour shown in the shop. */
  swatch: string
}

const c = (
  id: string,
  vi: string,
  en: string,
  slot: ClothingSlot,
  shop: ClothesShopId,
  price: number,
  apply: Partial<Outfit>,
  swatch: string,
): ClothingDef => ({ id, name: { vi, en }, slot, shop, price, currency: shop === 'flohmarkt' ? 'EUR' : 'VND', apply, swatch })

export const CLOTHES: ClothingDef[] = [
  // Chị Hằng's clothes stall (Vietnam)
  c('aoHong', 'Áo thun hồng', 'Pink T-shirt', 'shirt', 'vnClothes', 80_000, { shirt: '#ffb3c7', top: 'tee' }, '#ffb3c7'),
  c('aoDoi', 'Áo đội tuyển đỏ', 'Red football jersey', 'shirt', 'vnClothes', 120_000, { shirt: '#d4473b', top: 'tee' }, '#d4473b'),
  c('aoBaBa', 'Áo bà ba xanh ngọc', 'Jade áo bà ba shirt', 'shirt', 'vnClothes', 150_000, { shirt: '#8fd3c1', top: 'long' }, '#8fd3c1'),
  c('aoSoMi', 'Sơ mi trắng dài tay', 'White long-sleeve shirt', 'shirt', 'vnClothes', 160_000, { shirt: '#f8f8f2', top: 'long' }, '#f8f8f2'),
  c('aoBaLo', 'Áo ba lỗ', 'Tank top', 'shirt', 'vnClothes', 50_000, { shirt: '#ffe08a', top: 'sleeveless' }, '#ffe08a'),
  c('quanJean', 'Quần short jean', 'Denim shorts', 'shorts', 'vnClothes', 100_000, { shorts: '#4f6fa8', bottom: 'shorts' }, '#4f6fa8'),
  c('quanKaki', 'Quần kaki dài', 'Khaki trousers', 'shorts', 'vnClothes', 180_000, { shorts: '#c9ad85', bottom: 'pants' }, '#c9ad85'),
  c('vayXoe', 'Chân váy xòe', 'Flared skirt', 'shorts', 'vnClothes', 140_000, { shorts: '#ff9fb2', bottom: 'skirt' }, '#ff9fb2'),
  c('depToOng', 'Dép tổ ong', 'Honeycomb sandals', 'shoe', 'vnClothes', 30_000, { shoe: '#4fa3d9', shoeType: 'sandal' }, '#4fa3d9'),
  c('nonLa', 'Nón lá', 'Conical hat', 'hat', 'vnClothes', 50_000, { accessory: 'nonLa' }, '#f2d79c'),
  c('hoodieMint', 'Áo hoodie xanh mint', 'Mint hoodie', 'shirt', 'vnClothes', 220_000, { shirt: '#8fd3c1', top: 'hoodie' }, '#8fd3c1'),
  c('vayHoa', 'Váy liền hoa nhí', 'Floral dress', 'shirt', 'vnClothes', 250_000, { shirt: '#ffc8dd', top: 'dress' }, '#ffc8dd'),
  c('muLuoiTrai', 'Mũ lưỡi trai đỏ', 'Red cap', 'hat', 'vnClothes', 60_000, { accessory: 'cap', accent: '#d4473b' }, '#d4473b'),
  c('kepNo', 'Kẹp nơ hồng', 'Pink hair bow', 'hat', 'vnClothes', 30_000, { accessory: 'bow', accent: '#ff6f91' }, '#ff6f91'),
  c('taiNghe', 'Tai nghe chụp tai', 'Headphones', 'hat', 'vnClothes', 180_000, { accessory: 'headphones', accent: '#a9d6ff' }, '#a9d6ff'),
  c('kinhRam', 'Kính râm', 'Sunglasses', 'hat', 'vnClothes', 90_000, { accessory: 'sunglasses' }, '#2a2330'),
  c('kinhCan', 'Kính cận gọng tròn', 'Round glasses', 'hat', 'vnClothes', 120_000, { accessory: 'glasses' }, '#4a3b4a'),
  c('khanRan', 'Khăn rằn', 'Checked scarf', 'neck', 'vnClothes', 40_000, { neck: 'scarf', neckColor: '#4a4a5a' }, '#4a4a5a'),
  c('aoBaBaHoa', 'Áo bà ba hoa tím', 'Floral bà ba shirt', 'shirt', 'vnClothes', 170_000, { shirt: '#8c6a9e', top: 'baba', pattern: 'flowers', patternColor: '#f4d6e6' }, '#8c6a9e'),
  c('aoKe', 'Áo phông kẻ sọc', 'Striped T-shirt', 'shirt', 'vnClothes', 90_000, { shirt: '#8ec5e8', top: 'tee', pattern: 'stripes', patternColor: '#ffffff' }, '#8ec5e8'),
  c('dongPhuc', 'Sơ mi đồng phục trắng', 'White school shirt', 'shirt', 'vnClothes', 110_000, { shirt: '#ffffff', top: 'long', pattern: undefined }, '#ffffff'),
  c('khanQuangDo', 'Khăn quàng đỏ', 'Red neckerchief', 'neck', 'vnClothes', 15_000, { neck: 'redScarf' }, '#d8262f'),
  c('giayBupBe', 'Giày búp bê', 'Ballet flats', 'shoe', 'vnClothes', 120_000, { shoe: '#2a2224', shoeType: 'loafer' }, '#2a2224'),
  c('baloMoi', 'Balo du học (+4 kg)', 'Study-abroad backpack (+4 kg)', 'bag', 'vnClothes', 200_000, { bag: '#7fb8e8' }, '#7fb8e8'),
  // Sidewalk barber (Vietnam)
  c('tocNgan', 'Tóc ngắn', 'Short hair', 'hair', 'barber', 70_000, { hairStyle: 'short' }, '#3d2c2c'),
  c('tocBui', 'Tóc búi', 'Hair bun', 'hair', 'barber', 70_000, { hairStyle: 'bun' }, '#3d2c2c'),
  c('tocBob', 'Tóc bob', 'Bob cut', 'hair', 'barber', 70_000, { hairStyle: 'bob' }, '#3d2c2c'),
  c('tocDai', 'Tóc dài', 'Long hair', 'hair', 'barber', 60_000, { hairStyle: 'long' }, '#3d2c2c'),
  c('tocDuoiNgua', 'Buộc đuôi ngựa', 'Ponytail', 'hair', 'barber', 70_000, { hairStyle: 'ponytail' }, '#3d2c2c'),
  c('tocHaiBim', 'Tóc hai bím', 'Twin tails', 'hair', 'barber', 70_000, { hairStyle: 'twin' }, '#3d2c2c'),
  c('tocXoan', 'Uốn xoăn', 'Curly perm', 'hair', 'barber', 150_000, { hairStyle: 'curly' }, '#3d2c2c'),
  c('tocDung', 'Vuốt dựng', 'Spiky hair', 'hair', 'barber', 50_000, { hairStyle: 'spiky' }, '#3d2c2c'),
  c('tocCua', 'Đầu cua', 'Buzz cut', 'hair', 'barber', 30_000, { hairStyle: 'buzz' }, '#3d2c2c'),
  c('tocDen', 'Nhuộm lại đen', 'Back to black', 'hair', 'barber', 60_000, { hair: '#3d2c2c' }, '#3d2c2c'),
  c('tocHong', 'Nhuộm hồng pastel', 'Pastel pink dye', 'hair', 'barber', 180_000, { hair: '#f2a7bd' }, '#f2a7bd'),
  c('tocVang', 'Nhuộm vàng mật ong', 'Honey blonde dye', 'hair', 'barber', 180_000, { hair: '#d9a95b' }, '#d9a95b'),
  c('tocNau', 'Nhuộm nâu hạt dẻ', 'Chestnut dye', 'hair', 'barber', 120_000, { hair: '#7a4a32' }, '#7a4a32'),
  // Cô Hoa's áo dài tailor (Vietnam)
  c('aoDaiDo', 'Áo dài đỏ', 'Red áo dài', 'shirt', 'tailor', 1_200_000, { shirt: '#c8322b', top: 'aoDai' }, '#c8322b'),
  c('aoDaiVang', 'Áo dài vàng', 'Yellow áo dài', 'shirt', 'tailor', 1_200_000, { shirt: '#f4c04e', top: 'aoDai' }, '#f4c04e'),
  c('aoDaiTrang', 'Áo dài trắng nữ sinh', 'White school áo dài', 'shirt', 'tailor', 1_100_000, { shirt: '#fbfaf5', top: 'aoDai' }, '#fbfaf5'),
  c('quanLua', 'Quần lụa trắng', 'White silk trousers', 'shorts', 'tailor', 200_000, { shorts: '#f6f1e7', bottom: 'pants' }, '#f6f1e7'),
  c('aoDaiXanh', 'Áo dài xanh ngọc', 'Jade áo dài', 'shirt', 'tailor', 1_200_000, { shirt: '#3fae9a', top: 'aoDai' }, '#3fae9a'),
  c('aoDaiTim', 'Áo dài tím Huế', 'Huế purple áo dài', 'shirt', 'tailor', 480_000, { shirt: '#8e6bb8', top: 'aoDai' }, '#8e6bb8'),
  c('khanVoan', 'Nón lá quai lụa', 'Silk-strap conical hat', 'hat', 'tailor', 90_000, { accessory: 'nonLa' }, '#f2d79c'),
  // Flohmarkt (Germany, EUR)
  c('pulli', 'Áo len Pullover', 'Pullover', 'shirt', 'flohmarkt', 8, { shirt: '#5b7cc4', top: 'long' }, '#5b7cc4'),
  c('regenjacke', 'Áo mưa vàng', 'Yellow rain jacket', 'shirt', 'flohmarkt', 18, { shirt: '#f4c04e', top: 'long' }, '#f4c04e'),
  c('jeans', 'Quần jean', 'Jeans', 'shorts', 'flohmarkt', 12, { shorts: '#3f4a6b', bottom: 'pants' }, '#3f4a6b'),
  c('sneaker', 'Giày sneaker', 'Sneakers', 'shoe', 'flohmarkt', 15, { shoe: '#ffffff', shoeType: 'sneaker' }, '#ffffff'),
  c('winterstiefel', 'Bốt mùa đông', 'Winter boots', 'shoe', 'flohmarkt', 22, { shoe: '#7a4f33', shoeType: 'boot' }, '#7a4f33'),
  c('winterjacke', 'Áo phao mùa đông', 'Puffer jacket', 'shirt', 'flohmarkt', 25, { shirt: '#e86f5c', top: 'puffer' }, '#e86f5c'),
  c('dirndl', 'Váy Dirndl (Oktoberfest)', 'Dirndl (Oktoberfest)', 'shirt', 'flohmarkt', 35, { shirt: '#2f6b4f', top: 'dirndl', shorts: '#c9465a', apron: '#f4c6cf' }, '#2f6b4f'),
  c('lederhosen', 'Quần da Lederhosen', 'Lederhosen', 'shorts', 'flohmarkt', 30, { shorts: '#7a5233', bottom: 'lederhosen', socks: '#efe6d8' }, '#7a5233'),
  c('tirolerhut', 'Mũ Tyrol có lông vũ', 'Tyrolean hat', 'hat', 'flohmarkt', 12, { accessory: 'tyrolean', accent: '#4c5a46' }, '#4c5a46'),
  c('muetze', 'Mũ len Mütze', 'Beanie', 'hat', 'flohmarkt', 5, { accessory: 'beanie', accent: '#d4473b' }, '#d4473b'),
  c('lederjacke', 'Áo khoác da Lederjacke', 'Leather jacket', 'shirt', 'flohmarkt', 20, { shirt: '#5b4636', top: 'jacket' }, '#5b4636'),
  c('blazer', 'Áo vest Blazer (đi phỏng vấn)', 'Blazer (for interviews)', 'shirt', 'flohmarkt', 16, { shirt: '#2f3a4d', top: 'jacket' }, '#2f3a4d'),
  c('uniHoodie', 'Hoodie Uni Lindenberg', 'Uni Lindenberg hoodie', 'shirt', 'flohmarkt', 14, { shirt: '#2c5aa0', top: 'hoodie' }, '#2c5aa0'),
  c('sommerkleid', 'Váy hè Sommerkleid', 'Summer dress', 'shirt', 'flohmarkt', 15, { shirt: '#a9d6ff', top: 'dress' }, '#a9d6ff'),
  c('schal', 'Khăn len Schal', 'Wool scarf', 'neck', 'flohmarkt', 6, { neck: 'scarf', neckColor: '#d4473b' }, '#d4473b'),
  c('krawatte', 'Cà vạt Krawatte', 'Tie', 'neck', 'flohmarkt', 5, { neck: 'tie', neckColor: '#2c5aa0' }, '#2c5aa0'),
  c('baskenmuetze', 'Mũ nồi Baskenmütze', 'Beret', 'hat', 'flohmarkt', 7, { accessory: 'beret', accent: '#3a3a44' }, '#3a3a44'),
  c('cap', 'Mũ lưỡi trai xanh', 'Green cap', 'hat', 'flohmarkt', 6, { accessory: 'cap', accent: '#3f7d5c' }, '#3f7d5c'),
  c('jutebeutel', 'Túi vải Jutebeutel (+2 kg)', 'Tote bag (+2 kg)', 'bag', 'flohmarkt', 3, { bag: '#e8dcc0' }, '#e8dcc0'),
  c('wanderrucksack', 'Ba lô leo núi (+6 kg)', 'Hiking backpack (+6 kg)', 'bag', 'flohmarkt', 25, { bag: '#3f7d5c' }, '#3f7d5c'),
  // Found, not bought (secrets)
  c('giftCatEars', 'Băng đô tai mèo', 'Cat-ear headband', 'hat', 'gift', 0, { accessory: 'catEars', accent: '#3d3540' }, '#3d3540'),
  c('giftFlowerCrown', 'Vòng hoa cúc dại', 'Wildflower crown', 'hat', 'gift', 0, { accessory: 'flowerCrown' }, '#ff9fb2'),
  c('giftTurtleTee', 'Áo thun Rùa Hồ Gươm', 'Hồ Gươm turtle tee', 'shirt', 'gift', 0, { shirt: '#8cc2bb', top: 'tee' }, '#8cc2bb'),
  c('giftScarf', 'Khăn len bà đan', 'Scarf Grandma knitted', 'neck', 'gift', 0, { neck: 'scarf', neckColor: '#f4c04e' }, '#f4c04e'),
  c('giftHoodie', 'Hoodie Visa Hunter vàng', 'Golden Visa Hunter hoodie', 'shirt', 'gift', 0, { shirt: '#f4c04e', top: 'hoodie' }, '#f4c04e'),
]

export const CLOTHES_SHOP_NAMES: Record<ClothesShopId, Localized> = {
  vnClothes: { vi: 'Sạp quần áo Chị Hằng', en: "Hằng's clothes stall", de: 'Hằngs Kleiderstand' },
  barber: { vi: 'Cắt tóc vỉa hè', en: 'Sidewalk barber', de: 'Straßenfriseur' },
  flohmarkt: { vi: 'Chợ đồ cũ Flohmarkt', en: 'Flea market', de: 'Flohmarkt' },
  tailor: { vi: 'Tiệm may áo dài Cô Hoa', en: 'Hoa’s áo dài tailor', de: 'Hoas Áo-dài-Schneiderei' },
  gift: { vi: 'Quà khám phá', en: 'Found on your travels', de: 'Fundstücke' },
}

export const getClothing = (id: string) => CLOTHES.find((x) => x.id === id)
