import { useEffect } from 'react'
import { useT } from '../i18n'
import { useLocalize } from '../i18n/localized'
import { triggerPrimary, useFocusedActions, useInteraction, type ContextAction } from '../store/interactionStore'
import { useDialogue } from '../store/dialogueStore'
import { useUI } from '../store/uiStore'
import { useWork } from '../store/workStore'
import { useMinigame } from '../store/minigameStore'
import { useCare } from '../store/careStore'
import { ActionIcon } from './ActionIcon'
import { useIsTouch } from './useIsTouch'

function isTypingTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)
}

/** Something else owns the screen (conversation, shop, sleep…). */
function isBusy() {
  const ui = useUI.getState()
  return (
    ui.settingsOpen ||
    ui.panel !== null ||
    ui.sleeping ||
    ui.transition !== null ||
    ui.fastForward !== null ||
    ui.newDayOpen ||
    useDialogue.getState().npcId !== null ||
    useMinigame.getState().active !== null ||
    useCare.getState().reward !== null
  )
}

/** Desktop: E = main action, 1–4 = the buttons (plan §4). */
function useActionKeys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || isTypingTarget(e.target) || isBusy()) return
      if (e.code === 'KeyE') {
        triggerPrimary()
        return
      }
      const match = /^(?:Digit|Numpad)([1-4])$/.exec(e.code)
      if (!match) return
      const { focusedId, items } = useInteraction.getState()
      const action = focusedId ? items[focusedId]?.actions[Number(match[1]) - 1] : undefined
      if (action) {
        e.preventDefault()
        action.onPress()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}

function useCareWorking() {
  return useCare((s) => s.session?.phase === 'working')
}

function KeyBadge({ label }: { label: string }) {
  return (
    <span className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-md bg-ink px-1 text-[11px] font-black text-cream">
      {label}
    </span>
  )
}

function RoundAction({ action, index, showKeys }: { action: ContextAction; index: number; showKeys: boolean }) {
  const t = useT()
  return (
    <button
      type="button"
      onClick={action.onPress}
      aria-label={t(action.labelKey)}
      className="pointer-events-auto flex w-[4.75rem] flex-col items-center gap-1 select-none"
    >
      <span
        className={`relative grid h-16 w-16 place-items-center rounded-full border-[3px] border-outline bg-cream text-[34px] shadow-[inset_0_-4px_0_#f1dcb6,inset_0_3px_0_#ffffff,0_4px_0_var(--color-outline)] transition active:translate-y-1 active:scale-95 active:shadow-[inset_0_-4px_0_#f1dcb6] ${
          action.muted ? 'opacity-50 grayscale' : ''
        }`}
      >
        <ActionIcon name={action.icon} />
        {showKeys && <KeyBadge label={String(index + 1)} />}
      </span>
      <span className="rounded-full border-2 border-outline bg-cream px-2 py-0.5 text-xs leading-tight font-black whitespace-nowrap text-ink">
        {t(action.labelKey)}
      </span>
    </button>
  )
}

function PrimaryAction({ action, showKeys }: { action: ContextAction; showKeys: boolean }) {
  const t = useT()
  return (
    <button
      type="button"
      onClick={action.onPress}
      className={`pointer-events-auto relative flex h-16 items-center gap-2 rounded-full pr-6 pl-2 font-display text-lg font-extrabold transition select-none active:translate-y-1 active:shadow-none ${
        action.muted ? 'border-[2.5px] border-outline bg-cream text-ink/60 shadow-[0_4px_0_var(--color-outline)]' : 'btn-lacquer'
      }`}
    >
      <span className="grid h-12 w-12 place-items-center rounded-full border-[2.5px] border-outline bg-cream text-[30px] shadow-[inset_0_-3px_0_#f1dcb6]">
        <ActionIcon name={action.icon} />
      </span>
      {t(action.labelKey)}
      {showKeys && <KeyBadge label="E" />}
    </button>
  )
}

/** Hand icon of the interact button when nothing is in reach. */
function HandIcon() {
  return (
    <svg viewBox="0 0 32 32" width="1em" height="1em" aria-hidden="true">
      <path
        d="M11 15V7.5a2 2 0 0 1 4 0V14m0-1.5V5.5a2 2 0 0 1 4 0V14m0-1V7a2 2 0 0 1 4 0v9.5c0 6-3.6 10-8.5 10-3.4 0-5.6-1.6-7.4-4.6L4 17.2a2 2 0 0 1 3.3-2.2L11 19"
        fill="#fff6e3"
        stroke="#4a3226"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * Phones: one big round interact button always sits bottom-right (like the E key). It lights up
 * with the main action's icon when something is in reach; extra actions are small round buttons
 * stacked to its left. Nothing in reach → a dimmed hand.
 */
function TouchActions({ name, primary, others, working }: { name: string; primary?: ContextAction; others: ContextAction[]; working: boolean }) {
  const t = useT()
  const main = primary ?? others[0]
  const rest = primary ? others : others.slice(1)
  const live = !!main && !main.muted
  return (
    <div
      data-tour="actions"
      className="absolute z-20 flex items-end gap-2"
      style={{ right: 'max(0.75rem, env(safe-area-inset-right))', bottom: 'max(1rem, calc(env(safe-area-inset-bottom) + 0.5rem))' }}
    >
      {rest.length > 0 && (
        <div className="mb-1 flex flex-col items-end gap-1.5">
          {rest.slice(0, 4).map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={a.onPress}
              aria-label={t(a.labelKey)}
              className={`pointer-events-auto flex items-center gap-1.5 rounded-full border-[2.5px] border-outline bg-cream py-0.5 pr-0.5 pl-2.5 text-[12px] font-black text-ink shadow-[0_3px_0_var(--color-outline)] select-none active:translate-y-0.5 active:shadow-none ${a.muted ? 'opacity-50' : ''}`}
            >
              <span className="whitespace-nowrap">{t(a.labelKey)}</span>
              <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-[22px] shadow-[inset_0_-2px_0_#f1dcb6]">
                <ActionIcon name={a.icon} />
              </span>
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-col items-center gap-1">
        {main && !working && name && (
          <span className="max-w-[9.5rem] truncate rounded-full bg-jade px-2.5 py-0.5 text-[11px] font-extrabold text-white shadow-[0_2px_0_var(--color-jade-dark)]">{name}</span>
        )}
        <button
          type="button"
          data-testid="interact-button"
          disabled={!main}
          onClick={main?.onPress}
          aria-label={main ? t(main.labelKey) : t('action.interact')}
          className={`pointer-events-auto relative grid h-[4.75rem] w-[4.75rem] place-items-center rounded-full border-[3px] border-outline text-[38px] transition select-none active:translate-y-1 active:shadow-none ${
            live
              ? 'bg-linear-to-b from-[#e8574d] to-lacquer shadow-[inset_0_3px_0_rgba(255,230,166,0.6),0_5px_0_var(--color-outline)]'
              : 'bg-cream opacity-60 shadow-[0_4px_0_var(--color-outline)]'
          }`}
        >
          <span className={`grid h-14 w-14 place-items-center rounded-full ${live ? 'bg-cream shadow-[inset_0_-3px_0_#f1dcb6]' : ''}`}>
            {main ? <ActionIcon name={main.icon} /> : <HandIcon />}
          </span>
          {live && <span className="pointer-events-none absolute -inset-1.5 animate-ping rounded-full border-[3px] border-gold opacity-40" />}
        </button>
        {main && (
          <span className="max-w-[6.5rem] truncate rounded-full border-2 border-outline bg-cream px-2 text-[11px] leading-tight font-black text-ink">{t(main.labelKey)}</span>
        )}
      </div>
    </div>
  )
}

/**
 * Context action buttons, bottom-right. They appear only while the player is
 * near an interactable and show that interactable's current actions.
 */
export function ActionButtons() {
  const t = useT()
  const localize = useLocalize()
  const isTouch = useIsTouch()
  const { def, actions } = useFocusedActions()
  const cafeWorking = useWork((s) => s.session?.phase === 'working')
  const careWorking = useCareWorking()
  const working = cafeWorking || careWorking
  const uiBusy = useUI((s) => s.panel !== null || s.sleeping || s.transition !== null || s.fastForward !== null || s.newDayOpen)
  const talking = useDialogue((s) => s.npcId !== null)
  const playing = useMinigame((s) => s.active !== null)
  const careDone = useCare((s) => s.reward !== null)
  const busy = uiBusy || talking || playing || careDone
  useActionKeys()

  if (busy) return null
  if (isTouch) {
    const list = def ? actions : []
    const primary = list.find((a) => a.primary)
    const name = def ? (def.name ? localize(def.name) : def.nameKey ? t(def.nameKey) : '') : ''
    return <TouchActions name={name} primary={primary} others={list.filter((a) => a !== primary)} working={working} />
  }
  if (!def || actions.length === 0) return null
  const showKeys = !isTouch
  const primary = actions.find((a) => a.primary)
  const others = actions.filter((a) => a !== primary)
  const name = def.name ? localize(def.name) : def.nameKey ? t(def.nameKey) : ''

  return (
    <div
      data-tour="actions"
      className="absolute z-20 flex flex-col items-end gap-2"
      style={{
        right: 'max(0.75rem, env(safe-area-inset-right))',
        bottom: 'max(1rem, calc(env(safe-area-inset-bottom) + 0.5rem))',
      }}
    >
      {!working && name && (
        <span className="rounded-full bg-jade px-3 py-1 text-sm font-extrabold text-white shadow-[0_3px_0_var(--color-jade-dark)]">
          {name}
          {def.subtitle && <span className="ml-1 text-xs font-bold opacity-85">· {localize(def.subtitle)}</span>}
        </span>
      )}
      {others.length > 0 && (
        <div className="grid grid-cols-2 gap-x-2 gap-y-2">
          {others.slice(0, primary ? 3 : 4).map((a) => (
            <RoundAction key={a.id} action={a} index={actions.indexOf(a)} showKeys={showKeys} />
          ))}
        </div>
      )}
      {primary && <PrimaryAction action={primary} showKeys={showKeys} />}
    </div>
  )
}
