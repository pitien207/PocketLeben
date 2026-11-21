import { EATERY_DEFS, EATERY_IDS, type EateryId } from '../../data/eateries'
import type { ShopId } from '../../data/shops'
import type { Localized } from '../../i18n/localized'
import { useDialogue } from '../../store/dialogueStore'
import { useTime } from '../../store/timeStore'
import { useUI } from '../../store/uiStore'
import { registerActions } from './actions'
import { registerTests } from './conditions'
import { openDialogue } from './dialogue'

/**
 * 1.40 Quán ăn (data/eateries.ts): the owners' shared dialogue `quanAn` asks this file which eatery the speaker runs,
 * whether it is open, and opens its menu. The Hàng Khay restaurant (city place `restaurant`) has chú Thành at the
 * door instead of a house of its own.
 */

interface Counter {
  shop: ShopId
  hours: [number, number]
  hello: Localized[]
}

/** chú Thành of Nhà hàng Bờ Hồ (Hàng Khay) — not one of the street eateries. */
const RESTAURANT: Counter = {
  shop: 'nhaHangBoHo',
  hours: [10, 22],
  hello: [
    { vi: 'Mời cháu vào! Nhà hàng Bờ Hồ có cơm gia đình, nem cua bể, lẩu — ngồi tầng hai nhìn ra hồ đẹp lắm.', en: 'Welcome! Family meals, crab rolls, hotpot — the first floor looks over the lake.' },
    { vi: 'Hôm nay có cá kho tộ ngon lắm. Cháu xem thực đơn nhé?', en: 'The braised fish is great today. The menu?' },
  ],
}

export const eateryByOwner = (npcId: string | null): Counter | null => {
  if (npcId === 'chuNhaHang') return RESTAURANT
  return EATERY_IDS.map((id) => EATERY_DEFS[id]).find((e) => e.owner === npcId) ?? null
}

/**
 * The eatery of whoever you are talking to — or talked to last: a choice that ends the conversation closes it
 * before its effect (`food.menu`) runs.
 */
let lastOwner: string | null = null
export const eateryOfOwner = () => {
  const id = useDialogue.getState().npcId
  if (id && eateryByOwner(id)) lastOwner = id
  return eateryByOwner(id ?? lastOwner)
}

const hourNow = () => useTime.getState().minutes / 60
const within = ([from, to]: [number, number], h = hourNow()) => h >= from && h < to

export const eateryOpen = (id: EateryId, h = hourNow()) => within(EATERY_DEFS[id].hours, h)

function openMenu() {
  const e = eateryOfOwner()
  if (!e) return false
  useUI.getState().openPanel({ type: 'shop', shopId: e.shop })
  return true
}

registerActions({
  'food.menu': openMenu,
  // Hàng Khay: the door of Nhà hàng Bờ Hồ (data/cityPlaces.ts `restaurant`)
  'food.restaurant': () => {
    openDialogue('chuNhaHang')
    return true
  },
})

registerTests({
  'food.open': () => {
    const e = eateryOfOwner()
    return !!e && within(e.hours)
  },
})
