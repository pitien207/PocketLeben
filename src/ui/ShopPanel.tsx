import { getItem, type ItemDef } from '../data/items'
import { bagCapacity, bagWeight, formatKg } from '../game/systems/bag'
import { useFlags } from '../store/flagsStore'
import { SHOPS, type ShopId } from '../data/shops'
import { buyItem } from '../game/systems/effects'
import { formatMoney } from '../i18n/format'
import { useT } from '../i18n'
import { useLocalize } from '../i18n/localized'
import { useInventory } from '../store/inventoryStore'
import { usePlayer } from '../store/playerStore'
import { useUI } from '../store/uiStore'
import { CoinIcon } from './icons'
import { ItemIcon } from './ItemIcon'
import { Money } from './kit/Amount'
import { Sheet } from './Sheet'


/** 1.18: energy and mood are gone, so an item has no effect chips to show. */
export function EffectChips(_props: { item: ItemDef }) {
  return null
}

/** Simple shop (plan §5.5): buy food & drinks into the bag. */
export function ShopPanel() {
  const t = useT()
  const localize = useLocalize()
  const panel = useUI((s) => s.panel)
  const closePanel = useUI((s) => s.closePanel)
  const money = usePlayer((s) => s.money)
  const currency = usePlayer((s) => s.currency)
  const owned = useInventory((s) => s.items)
  useFlags((s) => s.flags)

  if (panel?.type !== 'shop') return null
  const shop = SHOPS[panel.shopId as ShopId]
  if (!shop) return null

  return (
    <Sheet title={localize(shop.name)} icon="shopping-cart" onClose={closePanel}>
      <div className="mb-3 flex items-center justify-center gap-1.5 text-sm font-bold">
        {t('shop.yourMoney')}:
        <CoinIcon className="text-lg" />
        <Money amount={money} currency={currency} className="font-display text-base font-extrabold tabular-nums" />
        <span className="ml-2 rounded-full bg-ink/10 px-2 py-0.5 text-[12px] font-black tabular-nums">🎒 {t('shop.bagRoom', { kg: formatKg(bagWeight()).replace(' kg', ''), max: bagCapacity() })}</span>
      </div>
      <ul className="grid grid-cols-2 gap-2">
        {shop.items.map((id) => {
          const item = getItem(id)
          if (!item) return null
          const short = item.price > money
          return (
            <li key={id} className="relative flex flex-col items-center gap-1 rounded-2xl bg-white/80 p-2.5 text-center shadow-[inset_0_0_0_2px_#f1dcb6]">
              {(owned[id] ?? 0) > 0 && (
                <span className="absolute top-1.5 right-1.5 rounded-full bg-jade px-1.5 text-[11px] font-black text-white">×{owned[id]}</span>
              )}
              <ItemIcon name={item.icon} className="text-[40px]" />
              <span className="text-sm leading-tight font-extrabold">{localize(item.name)}</span>
              <span className="flex flex-wrap justify-center gap-1">
                <EffectChips item={item} />
                <span className="rounded-full bg-ink/10 px-1.5 py-0.5 text-[11px] font-black tabular-nums">{formatKg(item.weight)}</span>
              </span>
              <button
                type="button"
                onClick={() => buyItem(id, false)}
                className={`mt-1 flex w-full items-center justify-center gap-1 rounded-xl py-1.5 text-sm font-black active:translate-y-1 active:shadow-none ${
                  short ? 'bg-ink/15 text-ink/50' : 'btn-lacquer'
                }`}
              >
                {t('shop.buy')} · {formatMoney(item.price, item.currency)}
              </button>
            </li>
          )
        })}
      </ul>
    </Sheet>
  )
}
