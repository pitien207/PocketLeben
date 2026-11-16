import type { Localized } from '../i18n/localized'

/** Character looks and the people of the street. Models are built at runtime (no files). */

export type HairStyle = 'bob' | 'short' | 'bun' | 'long' | 'ponytail' | 'spiky' | 'curly' | 'twin' | 'buzz' | 'twinBuns' | 'braid' | 'elderBun'
export type Accessory = 'nonLa' | 'glasses' | 'helmet' | 'beanie' | 'cap' | 'bow' | 'flowerCrown' | 'catEars' | 'headphones' | 'sunglasses' | 'beret' | 'tyrolean' | null
/** Cut of the top: short sleeves, long sleeves, or none. */
export type TopStyle = 'tee' | 'long' | 'sleeveless' | 'hoodie' | 'jacket' | 'dress' | 'aoDai' | 'puffer' | 'scrubs' | 'baba' | 'dirndl'
/** Cut of the bottom. */
export type BottomStyle = 'shorts' | 'pants' | 'skirt' | 'widePants' | 'lederhosen'
/** Something around the neck. */
export type NeckStyle = 'scarf' | 'tie' | 'redScarf' | null
export type ShoeType = 'sneaker' | 'sandal' | 'boot' | 'loafer'
/** Face expression painted on the head (game/components/chibi/face.ts). */
export type Expression = 'neutral' | 'happy' | 'happy-closed' | 'surprised' | 'sad'

export interface Outfit {
  skin: string
  hair: string
  hairStyle: HairStyle
  shirt: string
  shorts: string
  shoe: string
  /** Backpack colour, or null for none. */
  bag: string | null
  accessory: Accessory
  /** Helmet colour etc. */
  accent?: string
  /** Clothing cuts (default: T-shirt and shorts). `shirt` / `shorts` are their colours. */
  top?: TopStyle
  bottom?: BottomStyle
  /** Scarf or tie, and its colour. */
  neck?: NeckStyle
  neckColor?: string
  /** Eye colour (default warm brown). */
  eye?: string
  /** Face (default neutral) and long lashes. */
  expression?: Expression
  lashes?: boolean
  /** Shoe shape (default sneaker); `shoe` is its colour. */
  shoeType?: ShoeType
  /** Print on the top, in `patternColor`. */
  pattern?: 'stripes' | 'flowers'
  patternColor?: string
  /** Apron over the clothes (waiter, dirndl), its colour. */
  apron?: string
  /** Knee socks (lederhosen), hair tie colour. */
  socks?: string
  hairTie?: string
}

export const PLAYER_OUTFIT: Outfit = {
  skin: '#ffe0c9',
  hair: '#3d2c2c',
  hairStyle: 'bob',
  shirt: '#a9d6ff',
  shorts: '#6b7cb8',
  shoe: '#ff9eb3',
  bag: '#ffc27a',
  accessory: null,
}

export type Gender = 'female' | 'male'

/** Starting looks picked on the "Chọn nhân vật" screen (new game). Clothes can change later. */
export const PLAYER_OUTFITS: Record<Gender, Outfit> = {
  female: { ...PLAYER_OUTFIT, hairStyle: 'long', accessory: 'bow', accent: '#ff8fab', lashes: true, expression: 'happy' },
  male: {
    skin: '#f6d6bc',
    hair: '#2a2020',
    hairStyle: 'short',
    shirt: '#9fd3b4',
    shorts: '#4f5d75',
    shoe: '#ffffff',
    bag: '#ffc27a',
    accessory: null,
    shoeType: 'sneaker',
    expression: 'happy',
  },
}

/** Café customers, picked in turn. */
export const CUSTOMER_OUTFITS: Outfit[] = [
  { skin: '#f9d4b8', hair: '#2b2222', hairStyle: 'bun', shirt: '#ffb3c7', shorts: '#8e7cc3', shoe: '#ffffff', bag: null, accessory: null },
  { skin: '#eec39f', hair: '#1f1a1a', hairStyle: 'short', shirt: '#b8e6c9', shorts: '#5d6b8a', shoe: '#7a8bb5', bag: null, accessory: 'glasses' },
  { skin: '#f5cfb0', hair: '#4a3328', hairStyle: 'bob', shirt: '#ffe08a', shorts: '#c97b63', shoe: '#ff9b8f', bag: null, accessory: 'nonLa' },
  { skin: '#e8b994', hair: '#2a2020', hairStyle: 'short', shirt: '#cdb8f0', shorts: '#4f5d75', shoe: '#ffd166', bag: '#8fd3c1', accessory: null },
  { skin: '#fbdcc4', hair: '#5b3a2c', hairStyle: 'bun', shirt: '#9fe0f0', shorts: '#e98aa0', shoe: '#ffffff', bag: null, accessory: 'glasses' },
  { skin: '#f0c8a8', hair: '#1c1818', hairStyle: 'short', shirt: '#ffc3a0', shorts: '#6b8f71', shoe: '#5d6170', bag: null, accessory: 'nonLa' },
]

/** Motorbike riders (helmets are the law!). */
export const RIDER_OUTFITS: Outfit[] = [
  { skin: '#f0c8a8', hair: '#1c1818', hairStyle: 'short', shirt: '#7fb8e8', shorts: '#4f5d75', shoe: '#5d6170', bag: null, accessory: 'helmet', accent: '#ff9b8f' },
  { skin: '#f9d4b8', hair: '#2b2222', hairStyle: 'bob', shirt: '#ffe08a', shorts: '#6b7cb8', shoe: '#ffffff', bag: null, accessory: 'helmet', accent: '#a8e6cf' },
  { skin: '#e8b994', hair: '#2a2020', hairStyle: 'short', shirt: '#cdb8f0', shorts: '#5d6b8a', shoe: '#ffd166', bag: null, accessory: 'helmet', accent: '#fff6e3' },
  { skin: '#fbdcc4', hair: '#5b3a2c', hairStyle: 'bun', shirt: '#ff9fb2', shorts: '#8e7cc3', shoe: '#ffffff', bag: null, accessory: 'helmet', accent: '#7fb8e8' },
]

export interface NpcDef {
  id: string
  name: Localized
  /** Shown under the name when you can talk to them. */
  title?: Localized
  outfit: Outfit
  /** Dialogue in data/dialogues.ts. NPCs with one are interactive and get a "!" marker. */
  dialogueId?: string
}

export const NPCS = {
  baSau: {
    id: 'baSau',
    name: { vi: 'Bà Thu', en: 'Granny Thu', de: 'Oma Thu' },
    title: { vi: 'Bán trà đá', en: 'Iced-tea seller', de: 'Eistee-Verkäuferin' },
    outfit: { skin: '#f0c8a8', hair: '#d9d6dc',  bag: null, accessory: null,  bottom: 'pants', hairStyle: 'elderBun', top: 'baba', shirt: '#8c6a9e', pattern: 'flowers', patternColor: '#f4d6e6', shorts: '#2a2628', shoeType: 'sandal', shoe: '#7aa6c9', expression: 'happy-closed', lashes: true },
    dialogueId: 'baSau',
  },
  coBa: {
    id: 'coBa',
    name: { vi: 'Cô Liên', en: 'Auntie Liên', de: 'Tante Liên' },
    title: { vi: 'Chủ tạp hóa', en: 'Grocery owner', de: 'Ladenbesitzerin' },
    outfit: { skin: '#f5cfb0', hair: '#2b2222', hairStyle: 'bun',  shorts: '#2f3a4d', shoe: '#ff9b8f', bag: null, accessory: null,  bottom: 'pants', top: 'baba', shirt: '#f7a8c0', shoeType: 'sandal', expression: 'happy', lashes: true },
    dialogueId: 'coBa',
  },
  chuBay: {
    id: 'chuBay',
    name: { vi: 'Chú Bình', en: 'Uncle Bình', de: 'Onkel Bình' },
    title: { vi: 'Bánh mì dạo', en: 'Bánh mì vendor', de: 'Bánh-mì-Verkäufer' },
    outfit: { skin: '#e8b994', hair: '#2a2020', hairStyle: 'short', shirt: '#efe0bd', shorts: '#5d6b8a', shoe: '#5d6170', bag: null, accessory: 'nonLa' },
    dialogueId: 'chuBay',
  },
  chuNam: {
    id: 'chuNam',
    name: { vi: 'Bác Tư', en: 'Uncle Tư', de: 'Onkel Tư' },
    // The classic white tank top (áo ba lỗ).
    outfit: { skin: '#e8b994', hair: '#4a4448', hairStyle: 'short', shirt: '#ffffff', shorts: '#6b7a8f', shoe: '#5d6170', bag: null, accessory: null, top: 'sleeveless', pattern: 'stripes', patternColor: '#ffffff', shoeType: 'sandal' },
  },
  anhHai: {
    id: 'anhHai',
    name: { vi: 'Anh Đức', en: 'Đức', de: 'Bruder Đức' },
    outfit: { skin: '#f0c8a8', hair: '#1c1818', hairStyle: 'short', shirt: '#7fb8e8', shorts: '#3f4a5c', shoe: '#ffffff', bag: null, accessory: null, shoeType: 'sandal', expression: 'happy' },
  },
  beTi: {
    id: 'beTi',
    name: { vi: 'Bé Tí', en: 'Little Ti', de: 'Klein Ti' },
    outfit: { skin: '#f9d4b8', hair: '#2b2222', hairStyle: 'short', shirt: '#ffe08a', shorts: '#4f7cc4', shoe: '#ff9b8f', bag: null, accessory: null },
  },
  beNa: {
    id: 'beNa',
    name: { vi: 'Bé Ngân', en: 'Little Ngân', de: 'Klein Ngân' },
    outfit: { skin: '#fbdcc4', hair: '#3d2c2c', hairStyle: 'bun', shirt: '#ffb3c7', shorts: '#9fd8c8', shoe: '#ffffff', bag: null, accessory: null },
  },
  coHoa: {
    id: 'coHoa',
    name: { vi: 'Cô Hoa', en: 'Auntie Hoa', de: 'Tante Hoa' },
    outfit: { skin: '#f5cfb0', hair: '#2b2222', hairStyle: 'bob', shirt: '#c9b8f0', shorts: '#5d6b8a', shoe: '#ffffff', bag: '#ffb38a', accessory: 'nonLa' },
  },
  anhKhoa: {
    id: 'anhKhoa',
    name: { vi: 'Anh Khoa', en: 'Khoa', de: 'Khoa' },
    outfit: { skin: '#eec39f', hair: '#1f1a1a', hairStyle: 'short', shirt: '#9fe0c9', shorts: '#4f5d75', shoe: '#7a8bb5', bag: '#5b7cc4', accessory: 'glasses' },
  },
  chiLan: {
    id: 'chiLan',
    name: { vi: 'Chị Loan', en: 'Loan', de: 'Loan' },
    outfit: { skin: '#fbdcc4', hair: '#3d2c2c', hairStyle: 'bun', shirt: '#ffd3a0', shorts: '#c97b63', shoe: '#ff9b8f', bag: null, accessory: null },
  },

  // --- Story: Vietnam ---
  thayMinh: {
    id: 'thayMinh',
    name: { vi: 'Thầy Minh', en: 'Teacher Minh', de: 'Lehrer Minh' },
    title: { vi: 'Lớp tiếng Đức', en: 'German class', de: 'Deutschkurs' },
    outfit: { skin: '#eec39f', hair: '#2a2020', hairStyle: 'short', shirt: '#ffffff', shorts: '#3f4a5c', shoe: '#5d6170', bag: null,   bottom: 'pants', top: 'long', neck: 'tie', neckColor: '#2c5aa0', shoeType: 'loafer', accessory: 'glasses', expression: 'happy' },
    dialogueId: 'thayMinh',
  },
  vy: {
    id: 'vy',
    name: { vi: 'Bạn Vy', en: 'Vy', de: 'Vy' },
    outfit: { skin: '#fbdcc4', hair: '#2b2222',  shirt: '#ffe08a', shorts: '#8e7cc3', shoe: '#ffffff', bag: '#ff9fb2', accessory: null, hairStyle: 'ponytail', hairTie: '#e2574c', top: 'long', neck: 'redScarf', bottom: 'skirt', shoeType: 'loafer', lashes: true, expression: 'happy' },
  },
  // Classmates at the German centre (decor, seated)
  hvLinh: {
    id: 'hvLinh',
    name: { vi: 'Linh', en: 'Linh', de: 'Linh' },
    outfit: { skin: '#f9d4b8', hair: '#2b2222', hairStyle: 'bun', shirt: '#ffffff', shorts: '#2f3a4d', shoe: '#ffffff', bag: '#a8e6cf', accessory: null, top: 'long', bottom: 'skirt' },
    dialogueId: 'linh',
  },
  hvQuang: {
    id: 'hvQuang',
    name: { vi: 'Quang', en: 'Quang', de: 'Quang' },
    outfit: { skin: '#eec39f', hair: '#1f1a1a', hairStyle: 'short', shirt: '#7fb8e8', shorts: '#4f5d75', shoe: '#5d6170', bag: '#ffc27a', accessory: 'glasses' },
  },
  hvThao: {
    id: 'hvThao',
    name: { vi: 'Thảo', en: 'Thảo', de: 'Thảo' },
    outfit: { skin: '#fbdcc4', hair: '#4a3328', hairStyle: 'bob', shirt: '#ffb3c7', shorts: '#6b7cb8', shoe: '#ff9b8f', bag: null, accessory: null },
  },
  hvNam: {
    id: 'hvNam',
    name: { vi: 'Nam', en: 'Nam', de: 'Nam' },
    outfit: { skin: '#e8b994', hair: '#2a2020', hairStyle: 'short', shirt: '#b8e6c9', shorts: '#3f4a5c', shoe: '#ffffff', bag: null, accessory: null },
  },
  giamThi: {
    id: 'giamThi',
    name: { vi: 'Cô giám thị', en: 'Exam supervisor', de: 'Prüfungsaufsicht' },
    outfit: { skin: '#f5cfb0', hair: '#3d2c2c', hairStyle: 'bun', shirt: '#2f3a4d', shorts: '#2f3a4d', shoe: '#5d6170', bag: null, accessory: 'glasses', top: 'long', bottom: 'skirt' },
  },
  chiLua: {
    id: 'chiLua',
    name: { vi: 'Chị Lụa', en: 'Lụa', de: 'Lụa' },
    title: { vi: 'Xe đạp bán hoa', en: 'Flower bicycle', de: 'Blumenfahrrad' },
    outfit: { skin: '#f0c8a8', hair: '#2b2222', hairStyle: 'bun', shirt: '#fff3dc', shorts: '#8e7cc3', shoe: '#ffffff', bag: null, accessory: 'nonLa', top: 'long', bottom: 'pants' },
    dialogueId: 'chiLua',
  },
  chiMai: {
    id: 'chiMai',
    name: { vi: 'Chị Mai', en: 'Mai', de: 'Mai' },
    title: { vi: 'Tư vấn du học', en: 'Study-abroad advisor', de: 'Auslandsberaterin' },
    outfit: { skin: '#f5cfb0', hair: '#3d2c2c', hairStyle: 'bun', shirt: '#cdb8f0', shorts: '#2f3a4d', shoe: '#d4473b', bag: null, accessory: 'glasses',  bottom: 'skirt', top: 'jacket', shoeType: 'loafer', lashes: true, expression: 'happy' },
    dialogueId: 'chiMai',
  },
  // --- Story 2.1: Văn phòng Mai Anh, Hoàng Kim, Circle K, video calls ---
  tuan: {
    id: 'tuan',
    name: { vi: 'Em Tuấn', en: 'Tuấn', de: 'Tuấn' },
    title: { vi: 'Làm giấy tờ · VP Mai Anh', en: 'Paperwork · Mai Anh office', de: 'Unterlagen · Büro Mai Anh' },
    outfit: { skin: '#eec39f', hair: '#1f1a1a', hairStyle: 'spiky', shirt: '#ffffff', shorts: '#2f3a4d', shoe: '#2f2f38', bag: null, accessory: null, top: 'long', bottom: 'pants', neck: 'tie', neckColor: '#2f6fb0' },
    dialogueId: 'tuan',
  },
  coThoa: {
    id: 'coThoa',
    name: { vi: 'Cô Thoa', en: 'Ms Thoa', de: 'Frau Thoa' },
    title: { vi: 'Kế toán · VP Mai Anh', en: 'Accountant · Mai Anh office', de: 'Buchhaltung · Büro Mai Anh' },
    outfit: { skin: '#f0c8a8', hair: '#3d2c2c', hairStyle: 'bob', shirt: '#f4c04e', shorts: '#5d4a3a', shoe: '#5b4038', bag: null, accessory: 'glasses', top: 'long', bottom: 'skirt', lashes: true },
    dialogueId: 'coThoa',
  },
  anhKhai: {
    id: 'anhKhai',
    name: { vi: 'Anh Khải', en: 'Khải', de: 'Khải' },
    title: { vi: 'Công ty Hoàng Kim', en: 'Hoàng Kim agency', de: 'Agentur Hoàng Kim' },
    outfit: { skin: '#e8b994', hair: '#141010', hairStyle: 'short', shirt: '#1f2433', shorts: '#1f2433', shoe: '#c9a64a', bag: null, accessory: 'sunglasses', top: 'jacket', bottom: 'pants', shoeType: 'loafer', expression: 'happy' },
    dialogueId: 'anhKhai',
  },
  chiQuanLy: {
    id: 'chiQuanLy',
    name: { vi: 'Chị Hạnh', en: 'Hạnh', de: 'Hạnh' },
    title: { vi: 'Quản lý Circle K', en: 'Circle K manager', de: 'Filialleiterin Circle K' },
    outfit: { skin: '#f5cfb0', hair: '#2b2222', hairStyle: 'ponytail', shirt: '#d4202a', shorts: '#2f3a4d', shoe: '#ffffff', bag: null, accessory: 'cap', accent: '#d4202a', bottom: 'pants' },
    dialogueId: 'circleK',
  },
  coLan: {
    id: 'coLan',
    name: { vi: 'Cô Lan', en: 'Cô Lan', de: 'Frau Lan' },
    title: { vi: 'Dược sĩ ở Leipzig', en: 'Pharmacist in Leipzig', de: 'Apothekerin in Leipzig' },
    outfit: { skin: '#f6d6bc', hair: '#3d2c2c', hairStyle: 'bob', shirt: '#9fd8c8', shorts: '#2f3a4d', shoe: '#ffffff', bag: null, accessory: 'glasses', top: 'long', bottom: 'pants', lashes: true, expression: 'happy' },
  },
  vfsClerk: {
    id: 'vfsClerk',
    name: { vi: 'Chị Hà', en: 'Hà', de: 'Hà' },
    title: { vi: 'Quầy VFS Global', en: 'VFS Global desk', de: 'VFS-Global-Schalter' },
    outfit: { skin: '#fbdcc4', hair: '#2b2222', hairStyle: 'bun', shirt: '#2f6fb0', shorts: '#2f3a4d', shoe: '#2f2f38', bag: null, accessory: null, top: 'long', bottom: 'skirt', neck: 'scarf', neckColor: '#ffffff', lashes: true },
    dialogueId: 'vfs',
  },
  /** Text messages on your phone (scams, invitations). */
  tinNhan: {
    id: 'tinNhan',
    name: { vi: 'Tin nhắn', en: 'Message', de: 'Nachricht' },
    outfit: { skin: '#f6d6bc', hair: '#2b2222', hairStyle: 'short', shirt: '#a9d6ff', shorts: '#4f5d75', shoe: '#ffffff', bag: null, accessory: null },
    dialogueId: 'sms',
  },
  /** "Bố mẹ" in the little scene when the house changed (debt levels, story 2.1 §1.8). */
  giaDinh: {
    id: 'giaDinh',
    name: { vi: 'Bố mẹ', en: 'Mum and Dad', de: 'Mama und Papa' },
    outfit: { skin: '#e8b994', hair: '#4a4448', hairStyle: 'short', shirt: '#7fb8e8', shorts: '#3f4a5c', shoe: '#5d6170', bag: null, accessory: null, bottom: 'pants', top: 'long', shoeType: 'sandal' },
    dialogueId: 'house',
  },
  anhTu: {
    id: 'anhTu',
    name: { vi: 'Anh Tú', en: 'Tú', de: 'Bruder Tú' },
    title: { vi: 'Xe ôm', en: 'Motorbike taxi', de: 'Motorradtaxi' },
    outfit: { skin: '#e8b994', hair: '#1c1818', hairStyle: 'short', shirt: '#8fbf6a', shorts: '#4f5d75', shoe: '#5d6170', bag: null, accessory: 'helmet', accent: '#2f8c7f' },
    dialogueId: 'xeOm',
  },
  chiHang: {
    id: 'chiHang',
    name: { vi: 'Chị Hằng', en: 'Hằng', de: 'Hằng' },
    title: { vi: 'Bán quần áo', en: 'Clothes seller', de: 'Kleiderhändlerin' },
    outfit: { skin: '#f9d4b8', hair: '#2b2222', hairStyle: 'bun', shirt: '#ff9b8f', shorts: '#5d6b8a', shoe: '#ffffff', bag: null, accessory: 'nonLa', pattern: 'flowers', patternColor: '#ffffff', lashes: true, expression: 'happy' },
    dialogueId: 'chiHang',
  },
  bacPho: {
    id: 'bacPho',
    name: { vi: 'Bác Phở', en: 'Uncle Phở', de: 'Onkel Phở' },
    title: { vi: 'Quán phở gia truyền', en: 'Family phở shop', de: 'Phở-Küche' },
    outfit: { skin: '#e8b994', hair: '#9a9298', hairStyle: 'short', shirt: '#ffffff', shorts: '#3f4a5c', shoe: '#5d6170', bag: null, accessory: null, top: 'sleeveless', bottom: 'pants' },
    dialogueId: 'bacPho',
  },
  coThuoc: {
    id: 'coThuoc',
    name: { vi: 'Cô Thảo', en: 'Ms Thảo', de: 'Frau Thảo' },
    title: { vi: 'Dược sĩ', en: 'Pharmacist', de: 'Apothekerin' },
    outfit: { skin: '#f6d6c0', hair: '#2b2222', hairStyle: 'bun', shirt: '#ffffff', shorts: '#2f8c7f', shoe: '#ffffff', bag: null, accessory: 'glasses', top: 'long', bottom: 'pants' },
    dialogueId: 'coThuoc',
  },
  // --- Visa offices at the west end of the street (1.13) ---
  chuAnh: {
    id: 'chuAnh',
    name: { vi: 'Chú Hùng', en: 'Mr Hùng', de: 'Herr Hùng' },
    title: { vi: 'Tiệm ảnh · Ảnh thẻ visa', en: 'Photo studio · Visa photos', de: 'Fotostudio · Passbilder' },
    outfit: { skin: '#eec39f', hair: '#2a2020', hairStyle: 'short', shirt: '#5d6b8a', shorts: '#3a3f4e', shoe: '#2a2626', bag: null, accessory: 'glasses', top: 'jacket', bottom: 'pants', shoeType: 'loafer', expression: 'happy' },
    dialogueId: 'chuAnh',
  },
  coCongChung: {
    id: 'coCongChung',
    name: { vi: 'Cô Phương', en: 'Ms Phương', de: 'Frau Phương' },
    title: { vi: 'Văn phòng công chứng', en: 'Notary office', de: 'Notariat' },
    outfit: { skin: '#f6d6c0', hair: '#1c1818', hairStyle: 'bun', shirt: '#ffffff', shorts: '#2f3a4d', shoe: '#2a2626', bag: null, accessory: 'glasses', top: 'long', bottom: 'skirt', neck: 'scarf', neckColor: '#c8322b', shoeType: 'loafer', lashes: true },
    dialogueId: 'coCongChung',
  },
  anhNganHang: {
    id: 'anhNganHang',
    name: { vi: 'Anh Quân', en: 'Quân', de: 'Herr Quân' },
    title: { vi: 'Nhân viên ngân hàng', en: 'Bank clerk', de: 'Bankangestellter' },
    outfit: { skin: '#f5cfb0', hair: '#1f1a1a', hairStyle: 'short', shirt: '#ffffff', shorts: '#26324a', shoe: '#1e1e22', bag: null, accessory: null, top: 'long', bottom: 'pants', neck: 'tie', neckColor: '#2f8c7f', shoeType: 'loafer', expression: 'happy' },
    dialogueId: 'anhNganHang',
  },
  coAps: {
    id: 'coAps',
    name: { vi: 'Frau Schneider', en: 'Ms Schneider', de: 'Frau Schneider' },
    title: { vi: 'Cán bộ APS', en: 'APS examiner', de: 'APS-Prüferin' },
    outfit: { skin: '#f7dccb', hair: '#c9a46a', hairStyle: 'bob', shirt: '#3f5f8f', shorts: '#2f3440', shoe: '#2a2626', bag: null, accessory: 'glasses', top: 'jacket', bottom: 'pants', shoeType: 'loafer', eye: '#4f7fa8', lashes: true },
    dialogueId: 'coAps',
  },
  coMay: {
    id: 'coMay',
    name: { vi: 'Cô Hoa thợ may', en: 'Hoa the tailor', de: 'Schneiderin Hoa' },
    title: { vi: 'May đo áo dài', en: 'Áo dài tailor', de: 'Áo-dài-Schneiderei' },
    outfit: { skin: '#f6d6c0', hair: '#2b2222', hairStyle: 'bob', shirt: '#7a4a8a', shorts: '#f6e7c4', shoe: '#c8322b', bag: null, accessory: null,  bottom: 'pants', top: 'aoDai', lashes: true },
    dialogueId: 'coMay',
  },
  chuSau: {
    id: 'chuSau',
    name: { vi: 'Chú Thắng', en: 'Uncle Thắng', de: 'Onkel Thắng' },
    title: { vi: 'Thợ cắt tóc vỉa hè', en: 'Barber', de: 'Friseur' },
    outfit: { skin: '#e8b994', hair: '#9a9298', hairStyle: 'short', shirt: '#b8d8f0', shorts: '#3f4a5c', shoe: '#5d6170', bag: null, accessory: null },
    dialogueId: 'chuSau',
  },
  officer: {
    id: 'officer',
    name: { vi: 'Bà Lehmann', en: 'Ms Lehmann', de: 'Frau Lehmann' },
    title: { vi: 'Viên chức lãnh sự', en: 'Consular officer', de: 'Konsularbeamtin' },
    outfit: { skin: '#fbe2d0', hair: '#c9a46a', hairStyle: 'bun', shirt: '#3f4a6b', shorts: '#2f3a4d', shoe: '#2f2f38', bag: null, accessory: 'glasses', top: 'long', bottom: 'pants' },
    dialogueId: 'officer',
  },
  me: {
    id: 'me',
    name: { vi: 'Mẹ', en: 'Mum', de: 'Mama' },
    outfit: { skin: '#f0c8a8', hair: '#2b2222', hairStyle: 'bun', shirt: '#e98aa0', shorts: '#3f4a5c', shoe: '#ffffff', bag: null, accessory: null,  bottom: 'pants', top: 'baba', lashes: true, expression: 'happy', shoeType: 'sandal' },
    dialogueId: 'me',
  },
  bo: {
    id: 'bo',
    name: { vi: 'Bố', en: 'Dad', de: 'Papa' },
    outfit: { skin: '#e8b994', hair: '#4a4448', hairStyle: 'short', shirt: '#7fb8e8', shorts: '#3f4a5c', shoe: '#5d6170', bag: null, accessory: null, bottom: 'pants', top: 'long', shoeType: 'sandal' },
    dialogueId: 'bo',
  },
  emGai: {
    id: 'emGai',
    name: { vi: 'Na', en: 'Na', de: 'Na' },
    title: { vi: 'Em gái · lớp 11', en: 'Little sister · year 11', de: 'Kleine Schwester · 11. Klasse' },
    dialogueId: 'na',
    outfit: { skin: '#fbdcc4', hair: '#2b2222',  shirt: '#ffe08a', shorts: '#ff9fb2', shoe: '#ffffff', bag: null, accessory: null, hairStyle: 'twinBuns', hairTie: '#f4c542', expression: 'happy', lashes: true },
  },

  // --- Story: Germany ---
  lena: {
    id: 'lena',
    name: { vi: 'Lena', en: 'Lena', de: 'Lena' },
    title: { vi: 'Bạn cùng WG', en: 'Flatmate', de: 'Mitbewohnerin' },
    outfit: { skin: '#fbe2d0', hair: '#d9a24e', hairStyle: 'bun', shirt: '#9fe0c9', shorts: '#3f4a6b', shoe: '#ffffff', bag: null, accessory: null, top: 'long', lashes: true, expression: 'happy', eye: '#4f7d4a' },
    dialogueId: 'lena',
  },
  jonas: {
    id: 'jonas',
    name: { vi: 'Jonas', en: 'Jonas', de: 'Jonas' },
    title: { vi: 'Bạn cùng WG', en: 'Flatmate', de: 'Mitbewohner' },
    outfit: { skin: '#f6d6c0', hair: '#6b4a32', hairStyle: 'short', shirt: '#7a8bb5', shorts: '#2f3a4d', shoe: '#d4473b', bag: null, accessory: 'beanie', accent: '#f4c04e', bottom: 'pants', top: 'hoodie', eye: '#3d6ea8' },
    dialogueId: 'jonas',
  },
  clerk: {
    id: 'clerk',
    name: { vi: 'Ông Becker', en: 'Mr Becker', de: 'Herr Becker' },
    title: { vi: 'Nhân viên Bürgeramt', en: 'Bürgeramt clerk', de: 'Sachbearbeiter' },
    outfit: { skin: '#f6d6c0', hair: '#b8b2ac', hairStyle: 'short', shirt: '#c9b48a', shorts: '#4f4a40', shoe: '#2f2f38', bag: null, accessory: 'glasses', top: 'long', bottom: 'pants' },
    dialogueId: 'clerk',
  },
  wagner: {
    id: 'wagner',
    name: { vi: 'Bà Wagner', en: 'Ms Wagner', de: 'Frau Wagner' },
    title: { vi: 'Ngân hàng Sparbank', en: 'Sparbank', de: 'Sparbank' },
    outfit: { skin: '#fbe2d0', hair: '#5b3a2c', hairStyle: 'bob', shirt: '#d4473b', shorts: '#2f3a4d', shoe: '#2f2f38', bag: null, accessory: null,  bottom: 'skirt', apron: '#2d2d30', top: 'long', shoeType: 'loafer', eye: '#3d6ea8' },
    dialogueId: 'wagner',
  },
  anna: {
    id: 'anna',
    name: { vi: 'Chị Anna', en: 'Nurse Anna', de: 'Schwester Anna' },
    title: { vi: 'Hướng dẫn thực tập', en: 'Mentor', de: 'Praxisanleiterin' },
    outfit: { skin: '#fbe2d0', hair: '#c97b4a',   shoe: '#ffffff', bag: null, accessory: null, bottom: 'pants', top: 'scrubs', shirt: '#5bb3b0', shorts: '#5bb3b0', hairStyle: 'ponytail', hairTie: '#ffffff', lashes: true, expression: 'happy', eye: '#3d6ea8' },
    dialogueId: 'anna',
  },
  // --- Chapter 4A: university ---
  profSchulz: {
    id: 'profSchulz',
    name: { vi: 'GS. Schulz', en: 'Prof. Schulz', de: 'Prof. Dr. Schulz' },
    title: { vi: 'Giáo sư Khoa học điều dưỡng', en: 'Professor of Nursing Science', de: 'Professorin für Pflegewissenschaft' },
    outfit: { skin: '#f6d6c0', hair: '#b8b2ac', hairStyle: 'bob', shirt: '#7a4a8a', shorts: '#2f3a4d', shoe: '#2f2f38', bag: null, accessory: 'glasses', top: 'long', bottom: 'pants' },
    dialogueId: 'profSchulz',
  },
  frauKlein: {
    id: 'frauKlein',
    name: { vi: 'Cô Klein', en: 'Ms Klein', de: 'Frau Klein' },
    title: { vi: 'Phòng đào tạo', en: 'Student office', de: 'Studierendensekretariat' },
    outfit: { skin: '#fbe2d0', hair: '#6a4a3a', hairStyle: 'bun', shirt: '#9fe0c9', shorts: '#3f4a5c', shoe: '#ffffff', bag: null, accessory: null, top: 'long', bottom: 'skirt' },
    dialogueId: 'frauKlein',
  },
  studentMia: {
    id: 'studentMia',
    name: { vi: 'Mia', en: 'Mia', de: 'Mia' },
    title: { vi: 'Sinh viên', en: 'Student', de: 'Studentin' },
    outfit: { skin: '#fbe2d0', hair: '#d9a24e', hairStyle: 'bob', shirt: '#ffb3c7', shorts: '#3f4a6b', shoe: '#ffffff', bag: null, accessory: null, top: 'long', bottom: 'pants' },
    dialogueId: 'studentMia',
  },
  studentAli: {
    id: 'studentAli',
    name: { vi: 'Ali', en: 'Ali', de: 'Ali' },
    title: { vi: 'Sinh viên', en: 'Student', de: 'Student' },
    outfit: { skin: '#d9a07a', hair: '#2b2222', hairStyle: 'short', shirt: '#7fb8e8', shorts: '#2f3a4d', shoe: '#2f2f38', bag: null, accessory: null, bottom: 'pants' },
  },
  studentJule: {
    id: 'studentJule',
    name: { vi: 'Jule', en: 'Jule', de: 'Jule' },
    title: { vi: 'Sinh viên', en: 'Student', de: 'Studentin' },
    outfit: { skin: '#fbe2d0', hair: '#c97b4a', hairStyle: 'bob', shirt: '#ffe08a', shorts: '#5b7cc4', shoe: '#ffffff', bag: null, accessory: 'glasses', bottom: 'skirt' },
  },
  studentKenji: {
    id: 'studentKenji',
    name: { vi: 'Kenji', en: 'Kenji', de: 'Kenji' },
    title: { vi: 'Bạn học nhóm', en: 'Study buddy', de: 'Lernpartner' },
    outfit: { skin: '#f3d2b4', hair: '#2b2222', hairStyle: 'short', shirt: '#3f7d5c', shorts: '#3f4a5c', shoe: '#5d6170', bag: null, accessory: 'glasses', top: 'long', bottom: 'pants' },
    dialogueId: 'studentKenji',
  },
  herrLi: {
    id: 'herrLi',
    name: { vi: 'Chú Lý', en: 'Mr Lý', de: 'Herr Lý' },
    title: { vi: 'Chủ Asia-Markt', en: 'Asia market owner', de: 'Inhaber Asia-Markt' },
    outfit: { skin: '#e8b994', hair: '#4a4448', hairStyle: 'short', shirt: '#c8322b', shorts: '#3f4a5c', shoe: '#5d6170', bag: null, accessory: 'glasses', bottom: 'pants' },
    dialogueId: 'herrLi',
  },
  frauBeck: {
    id: 'frauBeck',
    name: { vi: 'Bà Beck', en: 'Mrs Beck', de: 'Frau Beck' },
    title: { vi: 'Hàng xóm', en: 'Neighbour', de: 'Nachbarin' },
    outfit: { skin: '#fbe2d0', hair: '#e8e4dc', hairStyle: 'bun', shirt: '#cdb8f0', shorts: '#5b6070', shoe: '#5b4038', bag: null, accessory: 'glasses', top: 'long', bottom: 'skirt', lashes: true, expression: 'happy' },
    dialogueId: 'frauBeck',
  },
  pruefer: {
    id: 'pruefer',
    name: { vi: 'Bà Dr. Brandt', en: 'Dr Brandt', de: 'Frau Dr. Brandt' },
    title: { vi: 'Giám khảo', en: 'Examiner', de: 'Prüferin' },
    outfit: { skin: '#f6d6c0', hair: '#8a8a94', hairStyle: 'bun', shirt: '#4a5a8a', shorts: '#2f3a4d', shoe: '#2f2f38', bag: null, accessory: 'glasses', top: 'long', bottom: 'skirt' },
  },
  heimleitung: {
    id: 'heimleitung',
    name: { vi: 'Ông Vogel', en: 'Mr Vogel', de: 'Herr Vogel' },
    title: { vi: 'Giám đốc viện', en: 'Care home director', de: 'Heimleiter' },
    outfit: { skin: '#f3cfb4', hair: '#5a4a40', hairStyle: 'short', shirt: '#e8eef6', shorts: '#3f4a5c', shoe: '#5b4038', bag: null, accessory: 'glasses', top: 'long', bottom: 'pants' },
  },
  frauSchmidt: {
    id: 'frauSchmidt',
    name: { vi: 'Bà Schmidt', en: 'Mrs Schmidt', de: 'Frau Schmidt' },
    outfit: { skin: '#f6dccb', hair: '#e8e4ec', hairStyle: 'bun', shirt: '#cdb8f0', shorts: '#6b5a7a', shoe: '#c97b63', bag: null, accessory: 'glasses', top: 'long', bottom: 'skirt' },
  },
  herrWeber: {
    id: 'herrWeber',
    name: { vi: 'Ông Weber', en: 'Mr Weber', de: 'Herr Weber' },
    outfit: { skin: '#f0d0bc', hair: '#dcd8de', hairStyle: 'short', shirt: '#8fa8c8', shorts: '#4f4a40', shoe: '#5d6170', bag: null, accessory: null, top: 'long', bottom: 'pants' },
  },
  frauHoffmann: {
    id: 'frauHoffmann',
    name: { vi: 'Bà Hoffmann', en: 'Mrs Hoffmann', de: 'Frau Hoffmann' },
    outfit: { skin: '#f6dccb', hair: '#f0eef2', hairStyle: 'bob', shirt: '#f7a8c0', shorts: '#5d6b8a', shoe: '#ffffff', bag: null, accessory: null, top: 'long' },
  },
  herrKrause: {
    id: 'herrKrause',
    name: { vi: 'Ông Krause', en: 'Mr Krause', de: 'Herr Krause' },
    outfit: { skin: '#f0d0bc', hair: '#cfcfd6', hairStyle: 'short', shirt: '#a8c89a', shorts: '#4f5d75', shoe: '#5d6170', bag: null, accessory: 'glasses', top: 'long', bottom: 'pants' },
  },
  herrMueller: {
    id: 'herrMueller',
    name: { vi: 'Ông Müller', en: 'Mr Müller', de: 'Herr Müller' },
    outfit: { skin: '#f0d0bc', hair: '#a8a2a0', hairStyle: 'short',  shorts: '#4f4a40',  bag: null, accessory: 'beanie', accent: '#5b7cc4',  bottom: 'pants', top: 'puffer', shirt: '#e86f5c', shoeType: 'boot', shoe: '#7a4f33', neck: 'scarf', neckColor: '#3f7f8c', eye: '#4f7d4a' },
  },
  sophie: {
    id: 'sophie',
    name: { vi: 'Sophie', en: 'Sophie', de: 'Sophie' },
    outfit: { skin: '#fbe2d0', hair: '#e0b45e', hairStyle: 'ponytail', shirt: '#ff9fb2', shorts: '#3f4a6b', shoe: '#ffffff', bag: '#e8dcc0', accessory: 'headphones', accent: '#ffffff', top: 'hoodie', bottom: 'pants', eye: '#4f86d9', lashes: true, expression: 'happy' },
  },
  tom: {
    id: 'tom',
    name: { vi: 'Tom', en: 'Tom', de: 'Tom' },
    outfit: { skin: '#e8b994', hair: '#2a2020', hairStyle: 'spiky', shirt: '#f4c04e', shorts: '#3f4a6b', shoe: '#5d6170', bag: '#4f5d75', accessory: 'cap', accent: '#2c5aa0', pattern: 'stripes', patternColor: '#ffffff' },
  },
  // --- East block (1.7) ---
  ongTu: {
    id: 'ongTu',
    name: { vi: 'Ông Từ Bảy', en: 'Grandpa Bảy', de: 'Opa Bảy' },
    title: { vi: 'Thủ từ đình làng', en: 'Temple keeper', de: 'Tempelwächter' },
    outfit: { skin: '#e8b994', hair: '#e8e4dc', hairStyle: 'buzz', shirt: '#7a3b30', shorts: '#3f3a36', shoe: '#5d4a3e', bag: null, accessory: null, top: 'aoDai', bottom: 'pants', shoeType: 'sandal', expression: 'happy-closed' },
    dialogueId: 'ongTu',
  },
  coTu: {
    id: 'coTu',
    name: { vi: 'Cô Tư', en: 'Auntie Tư', de: 'Tante Tư' },
    title: { vi: 'Nước mía', en: 'Sugarcane juice', de: 'Zuckerrohrsaft' },
    outfit: { skin: '#f0c8a8', hair: '#2b2222', hairStyle: 'ponytail', shirt: '#a8e6cf', shorts: '#4f5d75', shoe: '#ffffff', bag: null, accessory: null, accent: '#ff9fb2', top: 'tee', bottom: 'pants' },
  },
  chuSach: {
    id: 'chuSach',
    name: { vi: 'Chú Hưng', en: 'Uncle Hưng', de: 'Onkel Hưng' },
    title: { vi: 'Hiệu sách cũ', en: 'Old bookshop', de: 'Antiquariat' },
    outfit: { skin: '#eec39f', hair: '#6a6266', hairStyle: 'short', shirt: '#c9ad85', shorts: '#4f4a40', shoe: '#5d4a3e', bag: null, accessory: 'glasses', top: 'jacket', bottom: 'pants', neck: 'scarf', neckColor: '#7a4a32' },
    dialogueId: 'chuSach',
  },
  baChe: {
    id: 'baChe',
    name: { vi: 'Bà Năm', en: 'Granny Năm', de: 'Oma Năm' },
    title: { vi: 'Chè chợ đêm', en: 'Sweet soups', de: 'Süße Suppen' },
    outfit: { skin: '#f0c8a8', hair: '#d9d6dc', hairStyle: 'bun', shirt: '#ffc3a0', shorts: '#3f4a5c', shoe: '#5d6170', bag: null, accessory: null, top: 'long', bottom: 'pants', expression: 'happy', shoeType: 'sandal', lashes: true },
    dialogueId: 'baChe',
  },
  anhLongDen: {
    id: 'anhLongDen',
    name: { vi: 'Anh Tuấn', en: 'Tuấn', de: 'Tuấn' },
    title: { vi: 'Đèn lồng', en: 'Lanterns', de: 'Laternen' },
    outfit: { skin: '#e8b994', hair: '#1c1818', hairStyle: 'spiky', shirt: '#2c5aa0', shorts: '#3f4a6b', shoe: '#5d6170', bag: null, accessory: 'cap', accent: '#d4473b', top: 'tee', bottom: 'shorts' },
  },
  // --- Đền Ngọc Sơn (1.10) ---
  cuTu: {
    id: 'cuTu',
    name: { vi: 'Cụ Thủ Từ', en: 'The temple keeper', de: 'Der Tempelwächter' },
    title: { vi: 'Đền Ngọc Sơn', en: 'Ngọc Sơn Temple', de: 'Ngọc-Sơn-Tempel' },
    outfit: { skin: '#e8b994', hair: '#efeae4', hairStyle: 'buzz', shirt: '#5b3a6e', shorts: '#2f2a36', shoe: '#2f2a36', bag: null, accessory: 'glasses', top: 'aoDai', shoeType: 'loafer', expression: 'happy-closed' },
    dialogueId: 'cuTu',
  },
  duKhach: {
    id: 'duKhach',
    name: { vi: 'Du khách', en: 'Tourist', de: 'Tourist' },
    outfit: { skin: '#f6d6c0', hair: '#e0b45e', hairStyle: 'short', shirt: '#ffe08a', shorts: '#4f6fa8', shoe: '#ffffff', bag: '#7fb8e8', accessory: 'cap', accent: '#2c5aa0', top: 'tee', bottom: 'shorts', eye: '#3d6ea8', expression: 'happy' },
  },
  duKhach2: {
    id: 'duKhach2',
    name: { vi: 'Cô sinh viên', en: 'Student', de: 'Studentin' },
    outfit: { skin: '#f9d4b8', hair: '#2b2222', hairStyle: 'long', shirt: '#fbfaf5', shorts: '#f6f1e7', shoe: '#d9b38c', bag: null, accessory: 'nonLa', top: 'aoDai', shoeType: 'loafer', lashes: true, expression: 'happy' },
  },
  // --- Stadtpark (1.7) ---
  omaGerda: {
    id: 'omaGerda',
    name: { vi: 'Bà Gerda', en: 'Grandma Gerda', de: 'Oma Gerda' },
    title: { vi: 'Hay cho vịt ăn', en: 'Feeds the ducks', de: 'Entenfreundin' },
    outfit: { skin: '#fbe2d0', hair: '#e8e4dc', hairStyle: 'curly', shirt: '#7fb8e8', shorts: '#5b6070', shoe: '#5b4038', bag: null, accessory: 'beret', accent: '#c8322b', top: 'jacket', bottom: 'skirt', eye: '#4f86d9', neck: 'scarf', neckColor: '#f4c04e', expression: 'happy-closed', lashes: true },
    dialogueId: 'omaGerda',
  },
  luca: {
    id: 'luca',
    name: { vi: 'Luca', en: 'Luca', de: 'Luca' },
    title: { vi: 'Xe kem', en: 'Ice-cream cart', de: 'Eiswagen' },
    outfit: { skin: '#f0c8a8', hair: '#2a2020', hairStyle: 'curly', shirt: '#ffffff', shorts: '#3f4a6b', shoe: '#5d6170', bag: null, accessory: 'cap', accent: '#ff9fb2', top: 'tee', bottom: 'pants', eye: '#6b4a32', expression: 'happy' },
  },
  kioskWirt: {
    id: 'kioskWirt',
    name: { vi: 'Ông Brandl', en: 'Mr Brandl', de: 'Herr Brandl' },
    title: { vi: 'Kiosk am See', en: 'Lakeside kiosk', de: 'Kiosk am See' },
    outfit: { skin: '#f6d6c0', hair: '#b8a690', hairStyle: 'buzz', shirt: '#3f7d5c',  bag: null,   eye: '#5b8a6a', top: 'long', pattern: 'stripes', patternColor: '#d65a5a', bottom: 'lederhosen', shorts: '#7a5233', socks: '#efe6d8', shoeType: 'boot', shoe: '#4a3326', accessory: 'tyrolean', expression: 'happy' },
  },
  parkKid: {
    id: 'parkKid',
    name: { vi: 'Emma', en: 'Emma', de: 'Emma' },
    outfit: { skin: '#fbe2d0', hair: '#e0b45e',   shoe: '#ffffff', bag: null, accessory: null, accent: '#ffe08a',  eye: '#4f86d9', top: 'dirndl', shirt: '#2f6b4f', shorts: '#c9465a', apron: '#f4c6cf', hairStyle: 'braid', hairTie: '#c9465a', lashes: true, expression: 'happy' },
  },
} satisfies Record<string, NpcDef>

export type NpcId = keyof typeof NPCS

export function getNpc(id: string): NpcDef | undefined {
  return (NPCS as Record<string, NpcDef>)[id]
}
