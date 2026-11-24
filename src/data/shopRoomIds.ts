/**
 * 1.41 Shops you can walk into (data/shopRooms.ts, scenes/ShopRoom). Every id is its own scene `shop.<id>`, so
 * players inside the same shop share a multiplayer room (server: scenes starting with `shop.` are public).
 * No imports here: the scene-id type (store/worldStore.ts) is built from this list.
 */
export const SHOP_ROOM_IDS = [
  // the eateries of the old quarter (data/eateries.ts)
  'pho',
  'bunCha',
  'banhCuon',
  'lau',
  'banhMi',
  'com',
  'che',
  // Hàng Gai / Hàng Bông
  'taphoa',
  'circleK',
  'hoangKim',
  'pharmacy',
  'tailor',
  'oldBooks',
  // the visa offices
  'photo',
  'notary',
  'bank',
  'aps',
  // Hàng Khay
  'goldShop',
  'restaurant',
] as const

export type ShopRoomId = (typeof SHOP_ROOM_IDS)[number]
export type ShopSceneId = `shop.${ShopRoomId}`

export const shopScene = (id: ShopRoomId): ShopSceneId => `shop.${id}`
export const isShopScene = (scene: string): scene is ShopSceneId => scene.startsWith('shop.')
export const shopOfScene = (scene: string): ShopRoomId | null => (isShopScene(scene) ? (scene.slice(5) as ShopRoomId) : null)
