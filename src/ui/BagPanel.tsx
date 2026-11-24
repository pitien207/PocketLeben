import { useState } from 'react'
import { swatchStyle } from '../game/components/chibi/patterns'
import { ACHIEVEMENTS } from '../data/achievements'
import { getClothing, type ClothingSlot } from '../data/clothes'
import { getItem, type ItemDef } from '../data/items'
import type { KeyItemDef } from '../data/keyItems'
import { SKILLS, type SkillId } from '../data/skills'
import { CONFIG } from '../data/config'
import { eatFromBag } from '../game/systems/effects'
import { bagCapacity, bagWeight, dropBottle, dropItem, formatKg, keyItemsHeld } from '../game/systems/bag'
import { flagNumber } from '../game/systems/conditions'
import { isWearing, takeOff, wear } from '../game/systems/wardrobe'
import { useT, type I18nKey } from '../i18n'
import { useLocalize } from '../i18n/localized'
import { useFlags } from '../store/flagsStore'
import { useInventory } from '../store/inventoryStore'
import { usePlayer } from '../store/playerStore'
import { useUI } from '../store/uiStore'
import { ItemIcon } from './ItemIcon'
import { ActionIcon } from './ActionIcon'
import { BagIcon, LockIcon, TrashIcon } from './icons'
import { PaperIcon } from './PaperIcon'
import { Portrait } from './Portrait'
import { Sheet } from './Sheet'
import { EffectChips } from './ShopPanel'

type Tab = 'items' | 'wardrobe' | 'achievements'
const SLOTS: ClothingSlot[] = ['hat', 'hair', 'face', 'shirt', 'neck', 'shorts', 'shoe', 'bag']

/** Weight bar: how full the backpack is. */
function WeightBar() {
  const t = useT()
  useInventory((s) => s.items)
  useFlags((s) => s.flags)
  const kg = bagWeight()
  const max = bagCapacity()
  const ratio = Math.min(1, kg / max)
  const color = ratio > 0.9 ? 'bg-lacquer' : ratio > 0.7 ? 'bg-gold' : 'bg-jade'
  return (
    <div className="mb-3 flex items-center gap-2.5" data-testid="bag-weight">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border-2 border-outline bg-gold-light text-[28px]">
        <BagIcon />
      </span>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center justify-between text-[12px] font-black">
          <span>{t('bag.weight')}</span>
          <span className={`tabular-nums ${ratio > 0.9 ? 'text-lacquer' : 'text-ink'}`}>
            {formatKg(kg).replace(' kg', '')} / {formatKg(max)}
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full border-2 border-outline bg-ink/10">
          <div className={`h-full transition-[width] duration-300 ${color}`} style={{ width: `${ratio * 100}%` }} />
        </div>
      </div>
    </div>
  )
}

type Slot =
  | { kind: 'item'; id: string; count: number; item: ItemDef }
  | { kind: 'bottles'; count: number }
  | { kind: 'paper'; paper: KeyItemDef }

const slotKey = (s: Slot) => (s.kind === 'item' ? `item:${s.id}` : s.kind === 'paper' ? `paper:${s.paper.id}` : 'bottles')
const MIN_SLOTS = 12

/** One square in the grid: icon, count, a lock on important papers. */
function SlotTile({ slot, selected, onSelect }: { slot: Slot | null; selected: boolean; onSelect?: () => void }) {
  if (!slot) return <li className="aspect-square rounded-xl border-2 border-dashed border-ink/20 bg-ink/5" />
  const paper = slot.kind === 'paper'
  return (
    <li className="aspect-square">
      <button
        type="button"
        onClick={onSelect}
        data-testid={`slot-${slotKey(slot)}`}
        className={`relative grid h-full w-full place-items-center rounded-xl border-2 text-[34px] transition active:translate-y-0.5 ${
          selected ? 'border-lacquer bg-white shadow-[0_0_0_3px_var(--color-gold)]' : paper ? 'border-outline bg-gold-light' : 'border-outline bg-white/90'
        } shadow-[inset_0_-3px_0_rgba(74,50,38,0.15)]`}
      >
        {slot.kind === 'item' && <ItemIcon name={slot.item.icon} />}
        {slot.kind === 'bottles' && <ActionIcon name="bottle" />}
        {slot.kind === 'paper' && <PaperIcon kind={slot.paper.icon} />}
        {slot.kind !== 'paper' && slot.count > 1 && (
          <span className="absolute right-0.5 bottom-0.5 rounded-md border border-outline bg-ink px-1 text-[11px] leading-tight font-black text-cream tabular-nums">
            {slot.count}
          </span>
        )}
        {paper && <LockIcon className="absolute -top-1.5 -right-1.5 text-[16px]" />}
      </button>
    </li>
  )
}

/** Tap once to arm, tap again to confirm (avoids throwing food away by accident). */
function DropButton({ onDrop, label }: { onDrop: () => void; label: string }) {
  const t = useT()
  const [armed, setArmed] = useState(false)
  return (
    <button
      type="button"
      aria-label={label}
      data-testid="bag-drop"
      onClick={() => {
        if (!armed) {
          setArmed(true)
          window.setTimeout(() => setArmed(false), 2500)
          return
        }
        setArmed(false)
        onDrop()
      }}
      className={`flex items-center gap-1 rounded-xl border-2 border-outline px-3 py-2 text-sm font-black transition active:translate-y-0.5 ${
        armed ? 'bg-lacquer text-gold-light' : 'bg-cream text-ink'
      }`}
    >
      <TrashIcon className="text-lg" /> {armed ? t('bag.dropConfirm') : t('bag.dropShort')}
    </button>
  )
}

/** What the selected slot is, and what you can do with it. */
function SlotDetail({ slot }: { slot: Slot }) {
  const t = useT()
  const localize = useLocalize()
  if (slot.kind === 'paper') {
    return (
      <div className="flex items-center gap-3">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border-2 border-outline bg-gold-light text-[40px]">
          <PaperIcon kind={slot.paper.icon} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-base leading-tight font-extrabold">{localize(slot.paper.name)}</span>
          <span className="block text-[12px] leading-snug font-bold text-ink/70">{localize(slot.paper.desc)}</span>
          <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-black text-lacquer">
            <LockIcon /> {t('bag.papersHint')}
          </span>
        </span>
      </div>
    )
  }
  if (slot.kind === 'bottles') {
    return (
      <div className="flex items-center gap-3">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border-2 border-outline bg-white text-[38px]">
          <ActionIcon name="bottle" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-base leading-tight font-extrabold">
            {t('bag.bottles')} ×{slot.count}
          </span>
          <span className="block text-[12px] leading-snug font-bold text-ink/70">
            {t('bag.bottlesHint')} · {formatKg(CONFIG.bag.bottleKg)}
          </span>
        </span>
        <DropButton label={t('bag.drop')} onDrop={dropBottle} />
      </div>
    )
  }
  const { item, id, count } = slot
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border-2 border-outline bg-white text-[40px]">
        <ItemIcon name={item.icon} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-base leading-tight font-extrabold">
          {localize(item.name)} <span className="text-ink/50">×{count}</span>
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-1">
          <EffectChips item={item} />
          <span className="rounded-full bg-ink/10 px-1.5 py-0.5 text-[11px] font-black tabular-nums">{formatKg(item.weight)}</span>
        </span>
      </span>
      <span className="flex gap-1.5">
        <button type="button" onClick={() => eatFromBag(id)} className="rounded-xl btn-jade px-4 py-2 text-sm font-black active:translate-y-1 active:shadow-none">
          {t('bag.use')}
        </button>
        <DropButton label={t('bag.drop')} onDrop={() => dropItem(id)} />
      </span>
    </div>
  )
}

function Items() {
  const t = useT()
  const items = useInventory((s) => s.items)
  useFlags((s) => s.flags)
  const skills = usePlayer((s) => s.skills)
  const german = usePlayer((s) => s.german)
  const [selected, setSelected] = useState<string | null>(null)

  const slots: Slot[] = []
  for (const [id, count] of Object.entries(items)) {
    const item = getItem(id)
    if (item && count > 0) slots.push({ kind: 'item', id, count, item })
  }
  const bottles = flagNumber('pfand.carried')
  if (bottles > 0) slots.push({ kind: 'bottles', count: bottles })
  for (const paper of keyItemsHeld()) slots.push({ kind: 'paper', paper })
  const grid: (Slot | null)[] = [...slots]
  while (grid.length < MIN_SLOTS || grid.length % 4) grid.push(null)
  const current = slots.find((x) => slotKey(x) === selected) ?? slots[0] ?? null

  const skillEntries = Object.entries(skills) as [SkillId, number][]
  const levelName = german.level === 0 ? '—' : CONFIG.german.levels[german.level - 1]?.name
  return (
    <>
      <WeightBar />
      <div className="mb-3 min-h-[4.5rem] rounded-2xl border-2 border-outline bg-cream p-2.5" data-testid="bag-detail">
        {current ? <SlotDetail slot={current} /> : <p className="py-2 text-center text-sm font-bold text-ink/60">{t('bag.empty')}</p>}
      </div>
      <ul className="grid grid-cols-4 gap-2" data-testid="bag-grid">
        {grid.map((slot, i) => (
          <SlotTile
            key={slot ? slotKey(slot) : `empty${i}`}
            slot={slot}
            selected={!!slot && !!current && slotKey(slot) === slotKey(current)}
            onSelect={slot ? () => setSelected(slotKey(slot)) : undefined}
          />
        ))}
      </ul>
      <h3 className="mt-4 mb-1.5 font-display text-base font-extrabold text-lacquer">{t('bag.skills')}</h3>
      <ul className="flex flex-col gap-1">
        <li className="flex justify-between rounded-xl bg-white/70 px-3 py-1.5 text-sm font-extrabold">
          <span>{t('bag.german')}</span>
          <span>{levelName}</span>
        </li>
        {skillEntries.length === 0 ? (
          <li className="text-sm font-bold text-ink/60">{t('bag.noSkills')}</li>
        ) : (
          skillEntries.map(([id, xp]) => (
            <li key={id} className="flex justify-between rounded-xl bg-white/70 px-3 py-1.5 text-sm font-extrabold">
              <span>{t(SKILLS[id].nameKey)}</span>
              <span className="tabular-nums">{t('bag.xp', { xp })}</span>
            </li>
          ))
        )}
      </ul>
    </>
  )
}

function Wardrobe() {
  const t = useT()
  const localize = useLocalize()
  const outfit = usePlayer((s) => s.outfit)
  const wardrobe = usePlayer((s) => s.wardrobe)
  return (
    <>
      <div className="mb-3 flex justify-center">
        <span className="rounded-full bg-paper p-1 shadow-[0_0_0_3px_var(--color-gold)]">
          <Portrait outfit={outfit} size={72} />
        </span>
      </div>
      {wardrobe.length === 0 && <p className="py-2 text-center text-sm font-bold text-ink/60">{t('wardrobe.empty')}</p>}
      {SLOTS.map((slot) => {
        const owned = wardrobe.map(getClothing).filter((c) => c && c.slot === slot)
        if (!owned.length) return null
        return (
          <div key={slot} className="mb-2">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-black text-lacquer uppercase">{t(`slot.${slot}` as I18nKey)}</span>
              <button type="button" onClick={() => takeOff(slot)} className="rounded-full bg-ink/10 px-2 py-0.5 text-[11px] font-extrabold">
                {t('wardrobe.default')}
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {owned.map((c) =>
                c ? (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => wear(c.id)}
                    className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-extrabold ${isWearing(c.id) ? 'btn-jade' : 'bg-white/80 shadow-[inset_0_0_0_2px_#f1dcb6]'}`}
                  >
                    <span className="h-3.5 w-3.5 rounded-full" style={swatchStyle(c.swatch, c.apply)} />
                    {localize(c.name)}
                  </button>
                ) : null,
              )}
            </div>
          </div>
        )
      })}
    </>
  )
}

function Achievements() {
  const localize = useLocalize()
  const flags = useFlags((s) => s.flags)
  return (
    <ul className="grid grid-cols-2 gap-2">
      {ACHIEVEMENTS.map((a) => {
        const got = !!flags[`achv.got.${a.id}`]
        return (
          <li key={a.id} className={`rounded-2xl p-2.5 text-center shadow-[inset_0_0_0_2px_#f1dcb6] ${got ? 'bg-gold-light' : 'bg-white/60 opacity-60 grayscale'}`}>
            <div className="text-3xl">{got ? a.icon : '🔒'}</div>
            <div className="text-[13px] leading-tight font-black">{localize(a.name)}</div>
            <div className="mt-0.5 text-[11px] leading-tight font-bold text-ink/70">{localize(a.desc)}</div>
          </li>
        )
      })}
    </ul>
  )
}

/** The bag (plan §5.6): food, wardrobe, achievements. */
export function BagPanel() {
  const t = useT()
  const panel = useUI((s) => s.panel)
  const closePanel = useUI((s) => s.closePanel)
  const [tab, setTab] = useState<Tab>('items')
  if (panel?.type !== 'bag') return null

  const tabs: { id: Tab; label: string }[] = [
    { id: 'items', label: t('bag.title') },
    { id: 'wardrobe', label: t('wardrobe.title') },
    { id: 'achievements', label: t('achievements.title') },
  ]
  return (
    <Sheet title={t('bag.title')} onClose={closePanel}>
      <div className="mb-3 flex rounded-full border-2 border-outline bg-cream p-1">
        {tabs.map((x) => (
          <button
            key={x.id}
            type="button"
            onClick={() => setTab(x.id)}
            className={`flex-1 rounded-full px-2 py-1.5 text-[13px] font-extrabold transition ${tab === x.id ? 'bg-lacquer text-gold-light shadow' : 'text-ink/60'}`}
          >
            {x.label}
          </button>
        ))}
      </div>
      {tab === 'items' && <Items />}
      {tab === 'wardrobe' && <Wardrobe />}
      {tab === 'achievements' && <Achievements />}
    </Sheet>
  )
}
