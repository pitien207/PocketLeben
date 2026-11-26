import { useMemo, useState } from 'react'
import { CLOTHES, CLOTHES_SHOP_NAMES, type ClothesShopId, type ClothingDef, type ClothingSlot } from '../data/clothes'
import type { Outfit } from '../data/npcs'
import { swatchStyle } from '../game/components/chibi/patterns'
import { usePortraitShot, type ShotFrame } from '../game/components/chibi/portraitShot'
import { buyClothing, isWearing, wear, withItem } from '../game/systems/wardrobe'
import { formatMoney } from '../i18n/format'
import { useT, type I18nKey } from '../i18n'
import { useLocalize } from '../i18n/localized'
import { usePlayer } from '../store/playerStore'
import { useUI } from '../store/uiStore'
import { Tabs } from './kit/Tabs'
import { Sheet } from './Sheet'

/**
 * Clothes stall / barber / flea market (M8; 1.34 user: one category per tab and SHOW the clothes). Tabs by slot;
 * every item is a picture of your own chibi wearing it (3D photo, chibi/portraitShot.ts — whole body for clothes,
 * the head for hats and hair); tap one to see it big, then buy or wear it.
 */

type Tab = 'shirt' | 'shorts' | 'shoe' | 'acc' | 'hair' | 'face'
const TAB_OF: Record<ClothingSlot, Tab> = { shirt: 'shirt', shorts: 'shorts', shoe: 'shoe', hat: 'acc', bag: 'acc', neck: 'acc', hair: 'hair', face: 'face' }
const TABS: Tab[] = ['shirt', 'shorts', 'shoe', 'acc', 'hair', 'face']
const frameOf = (item: ClothingDef): ShotFrame => (item.slot === 'hat' || item.slot === 'hair' || item.slot === 'neck' || item.slot === 'face' ? 'face' : 'body')

/** Your chibi wearing the item (a swatch until the photo is ready / without WebGL). */
function TryOn({ outfit, item, big = false }: { outfit: Outfit; item: ClothingDef; big?: boolean }) {
  const look = useMemo(() => withItem(outfit, item.id), [outfit, item.id])
  const frame: ShotFrame = big ? 'body' : frameOf(item)
  const url = usePortraitShot(look, frame)
  return (
    <span className={`relative grid place-items-center overflow-hidden rounded-2xl bg-gradient-to-b from-[#fff7e6] to-[#f3e2c2] ${big ? 'h-44 w-36 short:h-36 short:w-28' : 'h-24 w-full short:h-20'}`}>
      {url ? (
        <img src={url} alt="" draggable={false} className="h-full w-full object-contain" />
      ) : (
        <span className="h-10 w-10 rounded-full shadow-[inset_0_0_0_3px_rgba(91,70,54,0.15)]" style={swatchStyle(item.swatch, item.apply)} />
      )}
      {!big && <span className="absolute right-1.5 bottom-1.5 h-4 w-4 rounded-full shadow-[0_0_0_2px_#fff]" style={swatchStyle(item.swatch, item.apply)} />}
    </span>
  )
}

export function ClothesPanel() {
  const t = useT()
  const localize = useLocalize()
  const panel = useUI((s) => s.panel)
  const closePanel = useUI((s) => s.closePanel)
  const outfit = usePlayer((s) => s.outfit)
  const wardrobe = usePlayer((s) => s.wardrobe)
  const money = usePlayer((s) => s.money)
  const shopId = (panel?.type === 'clothes' ? panel.shopId : null) as ClothesShopId | null
  const items = useMemo(() => (shopId ? CLOTHES.filter((c) => c.shop === shopId) : []), [shopId])
  const tabs = useMemo(() => TABS.filter((tab) => items.some((i) => TAB_OF[i.slot] === tab)), [items])
  const [tabPick, setTab] = useState<Tab | null>(null)
  const tab = tabPick && tabs.includes(tabPick) ? tabPick : tabs[0]
  const shown = items.filter((i) => TAB_OF[i.slot] === tab)
  const [pickId, setPick] = useState<string | null>(null)
  const picked = shown.find((i) => i.id === pickId) ?? shown[0]
  if (!shopId || !picked) return null

  const owned = wardrobe.includes(picked.id)
  const wearing = owned && isWearing(picked.id)
  return (
    <Sheet title={localize(CLOTHES_SHOP_NAMES[shopId])} icon="t-shirt" onClose={closePanel}>
      {tabs.length > 1 && (
        <Tabs value={tab} onChange={setTab} scroll size="sm" className="mb-2" items={tabs.map((id) => ({ id, label: t(`clothes.tab.${id}` as I18nKey), testId: `clothes-tab-${id}` }))} />
      )}
      <div className="flex gap-3 short:items-start">
        {/* The picked item, big, with buy / wear */}
        <div className="flex w-36 shrink-0 flex-col items-center gap-1.5 short:w-28" data-testid="clothes-preview">
          <TryOn outfit={outfit} item={picked} big />
          <span className="text-center text-[13px] leading-tight font-extrabold">{localize(picked.name)}</span>
          {owned ? (
            <button type="button" disabled={wearing} onClick={() => wear(picked.id)} className="w-full rounded-xl btn-jade py-1.5 text-sm font-black disabled:opacity-60">
              {wearing ? t('wardrobe.wearing') : t('wardrobe.wear')}
            </button>
          ) : (
            <button
              type="button"
              data-testid="clothes-buy"
              onClick={() => buyClothing(picked.id)}
              className={`w-full rounded-xl py-1.5 text-sm font-black ${picked.price > money ? 'bg-ink/15 text-ink/50' : 'btn-lacquer'}`}
            >
              {t('shop.buy')} · {formatMoney(picked.price, picked.currency)}
            </button>
          )}
        </div>
        {/* Everything in this category */}
        <ul className="grid max-h-[46vh] flex-1 grid-cols-2 content-start gap-2 ui-scroll overflow-y-auto pr-0.5 short:max-h-[58vh] short:grid-cols-3">
          {shown.map((item) => {
            const mine = wardrobe.includes(item.id)
            const on = item.id === picked.id
            return (
              <li key={item.id}>
                <button
                  type="button"
                  data-testid={`clothes-item-${item.id}`}
                  onClick={() => setPick(item.id)}
                  className={`flex w-full flex-col items-center gap-1 rounded-2xl bg-white/80 p-1.5 text-center ${on ? 'shadow-[inset_0_0_0_3px_var(--color-gold)]' : 'shadow-[inset_0_0_0_2px_#f1dcb6]'}`}
                >
                  <TryOn outfit={outfit} item={item} />
                  <span className="line-clamp-2 text-[12px] leading-tight font-extrabold">{localize(item.name)}</span>
                  <span className="text-[11px] font-black text-ink/60">{mine ? t('clothes.owned') : formatMoney(item.price, item.currency)}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </Sheet>
  )
}
