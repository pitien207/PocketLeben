import { CONFIG } from '../../data/config'
import { getItem } from '../../data/items'
import { KEY_ITEMS, type KeyItemDef } from '../../data/keyItems'
import { currentLanguage, localize } from '../../i18n/localized'
import { useInventory } from '../../store/inventoryStore'
import { pushToast } from '../../store/toastStore'
import { check, flagNumber, setFlag } from './conditions'
import { isWearing } from './wardrobe'

/**
 * The backpack has a weight limit (CONFIG.bag.capacityKg): food, Pfand bottles and the
 * important papers all count. Food and bottles can be thrown away; papers can't.
 */

export const keyItemsHeld = (): KeyItemDef[] => KEY_ITEMS.filter((k) => check(k.when))

export function bagWeight(): number {
  let kg = 0
  for (const [id, n] of Object.entries(useInventory.getState().items)) kg += (getItem(id)?.weight ?? 0) * n
  kg += (flagNumber('pfand.carried') + flagNumber('pfand.gold')) * CONFIG.bag.bottleKg
  for (const k of keyItemsHeld()) kg += k.weight
  return Math.round(kg * 100) / 100
}

/** Extra kilograms when wearing one of these bags (wardrobe "bag" slot). */
const BAG_BONUS: Record<string, number> = { baloMoi: 4, jutebeutel: 2, wanderrucksack: 6 }

const LOCALES = { vi: 'vi-VN', en: 'en-US', de: 'de-DE' } as const

/** "0,25 kg" / "0.25 kg" in the player's language. */
export function formatKg(kg: number): string {
  return `${kg.toLocaleString(LOCALES[currentLanguage()], { maximumFractionDigits: 2 })} kg`
}

export const bagCapacity = () => {
  let bonus = 0
  for (const [id, kg] of Object.entries(BAG_BONUS)) if (isWearing(id)) bonus = Math.max(bonus, kg)
  return CONFIG.bag.capacityKg + bonus
}

let lastFullToast = 0

/** Room for `kg` more? If not, says so (at most every few seconds). */
export function canCarry(kg: number): boolean {
  if (bagWeight() + kg <= bagCapacity() + 1e-6) return true
  setFlag('achv.bagFull', true)
  const now = Date.now()
  if (now - lastFullToast > 3000) {
    lastFullToast = now
    pushToast('toast.bagFull', 'bad', { max: bagCapacity() })
  }
  return false
}

/** Throw one item away (never an important paper). */
export function dropItem(id: string): boolean {
  const item = getItem(id)
  if (!item || !useInventory.getState().remove(id)) return false
  pushToast('toast.dropped', 'info', { item: localize(item.name, currentLanguage()) })
  return true
}

export function dropBottle(): boolean {
  const n = flagNumber('pfand.carried')
  if (n <= 0) return false
  setFlag('pfand.carried', n - 1)
  return true
}

/** 1.44 throw a golden bottle away (why would you…). */
export function dropGoldBottle(): boolean {
  const n = flagNumber('pfand.gold')
  if (n <= 0) return false
  setFlag('pfand.gold', n - 1)
  return true
}
