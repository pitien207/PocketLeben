import type { Currency } from '../i18n/format'
import type { Localized } from '../i18n/localized'
import type { Outfit } from './npcs'

/** Clothes and hairstyles (plan §5.5–5.6). Buying adds to the wardrobe; wear them from the bag. */

export type ClothingSlot = 'shirt' | 'shorts' | 'shoe' | 'hat' | 'hair' | 'bag' | 'neck' | 'face'
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
  c('vayHoa', 'Váy liền hoa nhí', 'Floral dress', 'shirt', 'vnClothes', 250_000, { shirt: '#ffe3ea', top: 'dress', pattern: 'hoa-nhi', patternColor: '#ef6f8c' }, '#ffe3ea'),
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
  // 1.23: fabric prints (src/assets/patterns)
  c('aoThoCam', 'Áo thổ cẩm', 'Brocade top', 'shirt', 'vnClothes', 260_000, { shirt: '#2a2a34', top: 'long', pattern: 'tho-cam', patternColor: '#2a6fb0' }, '#2a2a34'),
  c('vayThoCam', 'Váy thổ cẩm', 'Brocade skirt', 'shorts', 'vnClothes', 240_000, { shorts: '#2a2a34', bottom: 'skirt', patternBottom: 'tho-cam', patternBottomColor: '#c2185b' }, '#2a2a34'),
  c('aoCaro', 'Sơ mi kẻ caro', 'Plaid shirt', 'shirt', 'vnClothes', 170_000, { shirt: '#eef2f8', top: 'long', pattern: 'caro', patternColor: '#c8322b' }, '#eef2f8'),
  c('aoSaoVang', 'Áo thun sao vàng', 'Gold-star T-shirt', 'shirt', 'vnClothes', 120_000, { shirt: '#d4202a', top: 'tee', pattern: 'sao', patternColor: '#ffd23f' }, '#d4202a'),
  c('aoBaBaDao', 'Áo bà ba hoa đào', 'Peach-blossom bà ba', 'shirt', 'vnClothes', 190_000, { shirt: '#fff0f3', top: 'baba', pattern: 'dao', patternColor: '#f06292' }, '#fff0f3'),
  c('quanHoaNhi', 'Quần lụa ống rộng hoa nhí', 'Wide floral silk trousers', 'shorts', 'vnClothes', 190_000, { shorts: '#f6efe2', bottom: 'widePants', patternBottom: 'hoa-nhi', patternBottomColor: '#7fa8d9' }, '#f6efe2'),
  // 1.42 (user: "làm thêm nhiều kiểu … quần áo, phụ kiện"): new cuts and accessories
  c('aoPolo', 'Áo polo xanh navy', 'Navy polo shirt', 'shirt', 'vnClothes', 150_000, { shirt: '#2f3a5a', top: 'polo', patternColor: '#ffffff' }, '#2f3a5a'),
  c('aoPoloDao', 'Áo polo hồng đào', 'Peach polo shirt', 'shirt', 'vnClothes', 150_000, { shirt: '#ffb59e', top: 'polo' }, '#ffb59e'),
  c('aoLen', 'Áo len cổ tròn kem', 'Cream crew-neck sweater', 'shirt', 'vnClothes', 230_000, { shirt: '#ecd9b8', top: 'sweater', patternColor: '#c8322b' }, '#ecd9b8'),
  c('aoLenReu', 'Áo len xanh rêu', 'Moss-green sweater', 'shirt', 'vnClothes', 230_000, { shirt: '#5b8f6a', top: 'sweater', patternColor: '#f6efe0' }, '#5b8f6a'),
  c('cardiganKem', 'Cardigan len kem + áo hồng', 'Cream cardigan over a pink tee', 'shirt', 'vnClothes', 260_000, { shirt: '#f2e6cf', top: 'cardigan', patternColor: '#ff9fb2' }, '#f2e6cf'),
  c('cardiganNau', 'Cardigan nâu hạt dẻ', 'Chestnut cardigan', 'shirt', 'vnClothes', 260_000, { shirt: '#8a5a3a', top: 'cardigan', patternColor: '#f6f1e6' }, '#8a5a3a'),
  c('quanYem', 'Quần yếm jean', 'Denim dungarees', 'shorts', 'vnClothes', 240_000, { shorts: '#4f6fa8', bottom: 'overalls' }, '#4f6fa8'),
  c('quanYemKaki', 'Quần yếm kaki be', 'Beige dungarees', 'shorts', 'vnClothes', 220_000, { shorts: '#c9ad85', bottom: 'overalls' }, '#c9ad85'),
  c('vayDai', 'Chân váy dài xanh xô thơm', 'Sage maxi skirt', 'shorts', 'vnClothes', 200_000, { shorts: '#8fae9a', bottom: 'longSkirt' }, '#8fae9a'),
  c('vayDaiHoa', 'Chân váy dài hoa nhí', 'Floral maxi skirt', 'shorts', 'vnClothes', 230_000, { shorts: '#f6efe2', bottom: 'longSkirt', patternBottom: 'hoa-nhi', patternBottomColor: '#e86a8a' }, '#f6efe2'),
  c('khauTrang', 'Khẩu trang vải xanh', 'Blue cloth face mask', 'hat', 'vnClothes', 15_000, { accessory: 'mask', accent: '#bfe3f2' }, '#bfe3f2'),
  c('khauTrangDen', 'Khẩu trang đen', 'Black face mask', 'hat', 'vnClothes', 15_000, { accessory: 'mask', accent: '#2a2a30' }, '#2a2a30'),
  c('khuyenTai', 'Khuyên tai vàng', 'Gold earrings', 'hat', 'vnClothes', 120_000, { accessory: 'earrings', accent: '#f4c04e' }, '#f4c04e'),
  c('kepToc', 'Kẹp tóc vàng chanh', 'Lemon hair clips', 'hat', 'vnClothes', 25_000, { accessory: 'hairClip', accent: '#ffd166' }, '#ffd166'),
  c('muTaiBeo', 'Mũ tai bèo', 'Bucket hat', 'hat', 'vnClothes', 70_000, { accessory: 'bucketHat', accent: '#f2e2b8' }, '#f2e2b8'),
  c('muTaiBeoXanh', 'Mũ tai bèo xanh lính', 'Army-green bucket hat', 'hat', 'vnClothes', 70_000, { accessory: 'bucketHat', accent: '#5f7a4a' }, '#5f7a4a'),
  c('muCoi', 'Mũ cói rộng vành', 'Wide straw hat', 'hat', 'vnClothes', 110_000, { accessory: 'strawHat', accent: '#e8574d' }, '#ecd28e'),
  c('bangDo', 'Băng đô nơ hồng', 'Pink bow headband', 'hat', 'vnClothes', 35_000, { accessory: 'headband', accent: '#ff8fab' }, '#ff8fab'),
  c('hoaSu', 'Hoa sứ cài tai', 'Frangipani over the ear', 'hat', 'vnClothes', 20_000, { accessory: 'flowerPin', accent: '#ffffff' }, '#fff6df'),
  c('hoaDamBut', 'Hoa dâm bụt cài tai', 'Hibiscus over the ear', 'hat', 'vnClothes', 20_000, { accessory: 'flowerPin', accent: '#e8374a' }, '#e8374a'),
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
  // 1.42 new cuts
  c('tocBuocCao', 'Đuôi ngựa buộc cao', 'High ponytail', 'hair', 'barber', 80_000, { hairStyle: 'highPony' }, '#3d2c2c'),
  c('tocMaiLech', 'Mái lệch Hàn Quốc', 'Side-swept fringe', 'hair', 'barber', 90_000, { hairStyle: 'sideSwept' }, '#3d2c2c'),
  c('tocTem', 'Tóc tém', 'Pixie cut', 'hair', 'barber', 80_000, { hairStyle: 'pixie' }, '#3d2c2c'),
  c('tocSong', 'Uốn sóng dài', 'Long waves', 'hair', 'barber', 200_000, { hairStyle: 'wavy' }, '#3d2c2c'),
  c('tocNuaBui', 'Búi nửa đầu', 'Half-up bun', 'hair', 'barber', 70_000, { hairStyle: 'halfUp' }, '#3d2c2c'),
  c('tocMohawk', 'Mohawk dựng', 'Mohawk', 'hair', 'barber', 90_000, { hairStyle: 'mohawk' }, '#3d2c2c'),
  c('tocAfro', 'Xù Afro', 'Afro', 'hair', 'barber', 220_000, { hairStyle: 'afro' }, '#3d2c2c'),
  c('tocNgangVai', 'Ngang vai cúp ngoài', 'Shoulder-length flip', 'hair', 'barber', 90_000, { hairStyle: 'shoulder' }, '#3d2c2c'),
  c('tocDoRuou', 'Nhuộm đỏ rượu vang', 'Wine-red dye', 'hair', 'barber', 180_000, { hair: '#7a2a3a' }, '#7a2a3a'),
  c('tocBachKim', 'Nhuộm bạch kim', 'Platinum dye', 'hair', 'barber', 250_000, { hair: '#e8e2d4' }, '#e8e2d4'),
  c('tocXanhKhoi', 'Nhuộm xanh khói', 'Smoky blue dye', 'hair', 'barber', 200_000, { hair: '#5a6e86' }, '#5a6e86'),
  // 1.42 the face: eyes (lens + make-up) and marks — the barber's make-up corner
  c('matTron', 'Mắt tròn (như cũ)', 'Round eyes (default)', 'face', 'barber', 0, { eyeShape: 'round' }, '#6b4a3a'),
  c('matLongLanh', 'Mắt long lanh', 'Sparkly eyes', 'face', 'barber', 60_000, { eyeShape: 'sparkle' }, '#8fc4ff'),
  c('matMoMang', 'Mắt mơ màng', 'Sleepy eyes', 'face', 'barber', 40_000, { eyeShape: 'sleepy' }, '#a08a7a'),
  c('matMeo', 'Kẻ mắt mèo', 'Cat-eye liner', 'face', 'barber', 60_000, { eyeShape: 'cat', lashes: true }, '#2a2330'),
  c('matHatDau', 'Mắt hạt đậu', 'Bead eyes', 'face', 'barber', 30_000, { eyeShape: 'dot' }, '#1d1418'),
  c('matCuoi', 'Mắt cười híp', 'Smiling eyes', 'face', 'barber', 40_000, { eyeShape: 'smile' }, '#ffb3c7'),
  c('matMoc', 'Mặt mộc', 'Bare face', 'face', 'barber', 0, { faceMark: null }, '#ffe0c9'),
  c('tanNhang', 'Tàn nhang', 'Freckles', 'face', 'barber', 30_000, { faceMark: 'freckles' }, '#c08a6a'),
  c('notRuoi', 'Nốt ruồi duyên', 'Beauty mark', 'face', 'barber', 30_000, { faceMark: 'mole' }, '#4a2e26'),
  c('bangCaNhan', 'Băng cá nhân trên má', 'Plaster on the cheek', 'face', 'barber', 10_000, { faceMark: 'bandaid' }, '#f2c79a'),
  c('maHong', 'Má hồng ửng', 'Rosy blush', 'face', 'barber', 50_000, { faceMark: 'rosy' }, '#ff8fa3'),
  c('stickerSao', 'Sticker ngôi sao', 'Star sticker', 'face', 'barber', 20_000, { faceMark: 'star' }, '#ffd23f'),
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
  c('aoDaiSen', 'Áo dài hoa sen', 'Lotus áo dài', 'shirt', 'tailor', 1_400_000, { shirt: '#f7eef2', top: 'aoDai', pattern: 'sen', patternColor: '#f28bb0' }, '#f7eef2'),
  c('aoDaiMai', 'Áo dài hoa mai (Tết)', 'Apricot-blossom áo dài (Tết)', 'shirt', 'tailor', 1_500_000, { shirt: '#c8322b', top: 'aoDai', pattern: 'mai', patternColor: '#ffd23f' }, '#c8322b'),
  c('aoDaiTrongDong', 'Áo dài họa tiết trống đồng', 'Bronze-drum áo dài', 'shirt', 'tailor', 1_600_000, { shirt: '#24508a', top: 'aoDai', pattern: 'trong-dong', patternColor: '#e8c46a' }, '#24508a'),
  c('aoDaiSong', 'Áo dài sóng nước', 'Water-wave áo dài', 'shirt', 'tailor', 1_300_000, { shirt: '#2f8f9d', top: 'aoDai', pattern: 'song', patternColor: '#e8f6f8' }, '#2f8f9d'),
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
  // 1.42
  c('strickjacke', 'Strickjacke (cardigan)', 'Cardigan', 'shirt', 'flohmarkt', 9, { shirt: '#6f7fa8', top: 'cardigan', patternColor: '#f6f1e6' }, '#6f7fa8'),
  c('norwegerpulli', 'Áo len Norweger', 'Nordic sweater', 'shirt', 'flohmarkt', 14, { shirt: '#2f4a6b', top: 'sweater', patternColor: '#f6efe0' }, '#2f4a6b'),
  c('poloshirt', 'Poloshirt trắng', 'White polo shirt', 'shirt', 'flohmarkt', 6, { shirt: '#f8f8f2', top: 'polo', patternColor: '#2c5aa0' }, '#f8f8f2'),
  c('latzhose', 'Quần yếm Latzhose', 'Dungarees', 'shorts', 'flohmarkt', 13, { shorts: '#3f4a6b', bottom: 'overalls' }, '#3f4a6b'),
  c('maxirock', 'Váy dài Maxirock', 'Maxi skirt', 'shorts', 'flohmarkt', 10, { shorts: '#a8546a', bottom: 'longSkirt' }, '#a8546a'),
  c('fischerhut', 'Mũ Fischerhut', 'Bucket hat', 'hat', 'flohmarkt', 6, { accessory: 'bucketHat', accent: '#d9c49a' }, '#d9c49a'),
  c('strohhut', 'Mũ rơm Strohhut', 'Straw hat', 'hat', 'flohmarkt', 9, { accessory: 'strawHat', accent: '#2c5aa0' }, '#ecd28e'),
  c('ohrringe', 'Khuyên tai bạc', 'Silver earrings', 'hat', 'flohmarkt', 7, { accessory: 'earrings', accent: '#d9dde3' }, '#d9dde3'),
  c('jutebeutel', 'Túi vải Jutebeutel (+2 kg)', 'Tote bag (+2 kg)', 'bag', 'flohmarkt', 3, { bag: '#e8dcc0' }, '#e8dcc0'),
  c('wanderrucksack', 'Ba lô leo núi (+6 kg)', 'Hiking backpack (+6 kg)', 'bag', 'flohmarkt', 25, { bag: '#3f7d5c' }, '#3f7d5c'),
  // Found, not bought (secrets)
  c('giftCatEars', 'Băng đô tai mèo', 'Cat-ear headband', 'hat', 'gift', 0, { accessory: 'catEars', accent: '#3d3540' }, '#3d3540'),
  c('giftFlowerCrown', 'Vòng hoa cúc dại', 'Wildflower crown', 'hat', 'gift', 0, { accessory: 'flowerCrown' }, '#ff9fb2'),
  c('giftTurtleTee', 'Áo thun Rùa Hồ Gươm', 'Hồ Gươm turtle tee', 'shirt', 'gift', 0, { shirt: '#8cc2bb', top: 'tee' }, '#8cc2bb'),
  c('giftScarf', 'Khăn len bà đan', 'Scarf Grandma knitted', 'neck', 'gift', 0, { neck: 'scarf', neckColor: '#f4c04e' }, '#f4c04e'),
  c('giftHoodie', 'Hoodie Pocket Leben vàng', 'Golden Pocket Leben hoodie', 'shirt', 'gift', 0, { shirt: '#f4c04e', top: 'hoodie' }, '#f4c04e'),
]

export const CLOTHES_SHOP_NAMES: Record<ClothesShopId, Localized> = {
  vnClothes: { vi: 'Sạp quần áo Chị Hằng', en: "Hằng's clothes stall", de: 'Hằngs Kleiderstand' },
  barber: { vi: 'Cắt tóc & trang điểm vỉa hè', en: 'Sidewalk barber & make-up', de: 'Straßenfriseur' },
  flohmarkt: { vi: 'Chợ đồ cũ Flohmarkt', en: 'Flea market', de: 'Flohmarkt' },
  tailor: { vi: 'Tiệm may áo dài Cô Hoa', en: 'Hoa’s áo dài tailor', de: 'Hoas Áo-dài-Schneiderei' },
  gift: { vi: 'Quà khám phá', en: 'Found on your travels', de: 'Fundstücke' },
}

export const getClothing = (id: string) => CLOTHES.find((x) => x.id === id)
