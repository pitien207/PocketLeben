import { useEffect, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { VEHICLE_LIST, VEHICLES, type VehicleDef, type VehicleId } from '../data/vehicles'
import { VehicleMesh } from '../game/components/PlayerVehicle'
import { vehicleHalf } from '../game/scenes/shared/ownVehicles'
import { buyVehicle, chooseVehicle, currentVehicle, fuelOf, mount, ownedVehicles, ownsVehicle, plateOf, resaleOf, rideAllowed, sellVehicle, toggleRide, useRide } from '../game/systems/vehicles'
import { playSfx } from '../game/systems/audio'
import { formatMoney } from '../i18n/format'
import { useT } from '../i18n'
import { useLocalize } from '../i18n/localized'
import { useDialogue } from '../store/dialogueStore'
import { useFlags } from '../store/flagsStore'
import { useMinigame } from '../store/minigameStore'
import { usePlayer } from '../store/playerStore'
import { useUI } from '../store/uiStore'
import { useWorld } from '../store/worldStore'
import { CoinIcon } from './icons'
import { Icon3d } from './Icon3d'
import { Sheet } from './Sheet'
import { useIsTouch } from './useIsTouch'

/**
 * 1.35 Showroom Xe Phố Cổ (panel `vehicles`): a turntable preview of the chosen vehicle, the list by tab
 * (two-wheelers / cars / mine), buy (tap twice), choose, sell back (tap twice). Plus the ride button.
 */

type Tab = 'bikes' | 'cars' | 'mine'

/** The vehicle turning slowly on its stand. */
function Turntable({ def }: { def: VehicleDef }) {
  const g = useRef<Group>(null)
  useFrame((_, dt) => {
    if (g.current) g.current.rotation.y += Math.min(dt, 0.1) * 0.6
  })
  return (
    <group ref={g} rotation={[0, -0.7, 0]}>
      <VehicleMesh def={def} shadows={false} />
      <mesh position={[0, -0.03, 0]}>
        <cylinderGeometry args={[def.kind === 'car' ? 2.2 : 1.05, def.kind === 'car' ? 2.3 : 1.1, 0.06, 40]} />
        <meshLambertMaterial color="#e9e2d4" />
      </mesh>
    </group>
  )
}

function Preview({ def }: { def: VehicleDef }) {
  const half = vehicleHalf(def)
  const d = Math.max(half[2], half[0]) * 2.6 + 1.1
  return (
    <div className="relative h-36 overflow-hidden rounded-2xl bg-linear-to-b from-[#fdf6e6] to-[#f1dcb6] shadow-[inset_0_0_0_2px_#e6c99a] short:h-28 land:h-44" data-testid="veh-preview">
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, d * 0.42, d], fov: 32 }} gl={{ antialias: true, alpha: true }} onCreated={({ camera }) => camera.lookAt(0, half[1] * 0.7, 0)}>
        <hemisphereLight args={['#fff6e0', '#a08870', 1.6]} />
        <directionalLight position={[3, 5, 4]} intensity={1.6} />
        <Turntable def={def} />
      </Canvas>
    </div>
  )
}

function SpeedBar({ value }: { value: number }) {
  // 1.95 (bicycle) … 3.6 (sports car) → 2…5 of 5 pips
  const pips = Math.max(1, Math.min(5, Math.round((value - 1.5) / 0.45) + 1))
  return (
    <span className="inline-flex gap-0.5 align-middle">
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} className={`h-2 w-3 rounded-sm ${i < pips ? 'bg-lacquer' : 'bg-ink/15'}`} />
      ))}
    </span>
  )
}

export function VehicleShop() {
  const t = useT()
  const localize = useLocalize()
  const panel = useUI((s) => s.panel)
  const closePanel = useUI((s) => s.closePanel)
  const money = usePlayer((s) => s.money)
  const currency = usePlayer((s) => s.currency)
  useFlags((s) => s.flags)
  useRide((s) => s.riding)
  const [tab, setTab] = useState<Tab>('bikes')
  const [pick, setPick] = useState<VehicleId>('ongVang')
  const [confirm, setConfirm] = useState<string | null>(null)
  const open = panel?.type === 'vehicles'

  useEffect(() => {
    if (!open) return
    const mine = ownedVehicles()
    setTab(mine.length ? 'mine' : 'bikes')
    setPick(mine.length ? (currentVehicle()?.id ?? mine[0].id) : 'ongVang')
    setConfirm(null)
  }, [open])
  useEffect(() => {
    if (!confirm) return
    const id = window.setTimeout(() => setConfirm(null), 3500)
    return () => window.clearTimeout(id)
  }, [confirm])

  if (!open) return null
  const owned = ownedVehicles()
  const list = tab === 'mine' ? owned : VEHICLE_LIST.filter((v) => (tab === 'cars' ? v.kind === 'car' : v.kind !== 'car'))
  const def = VEHICLES[pick]
  const mine = ownsVehicle(def.id)
  const isCurrent = currentVehicle()?.id === def.id
  const short = currency !== 'VND' || def.price > money
  const fuel = Math.round(fuelOf(def.id) * 100)

  const choose = (id: VehicleId) => {
    setPick(id)
    setConfirm(null)
    playSfx('click')
  }
  const buy = () => {
    if (short) {
      buyVehicle(def.id) // says why
      return
    }
    if (confirm !== `buy-${def.id}`) {
      setConfirm(`buy-${def.id}`)
      playSfx('click')
      return
    }
    setConfirm(null)
    if (buyVehicle(def.id)) setTab('mine')
  }
  const sell = () => {
    if (confirm !== `sell-${def.id}`) {
      setConfirm(`sell-${def.id}`)
      playSfx('click')
      return
    }
    setConfirm(null)
    if (sellVehicle(def.id)) {
      const rest = ownedVehicles()
      if (rest.length) setPick(rest[0].id)
      else setTab('bikes')
    }
  }

  const tabs: [Tab, string][] = [
    ['bikes', t('vehicles.tabBikes')],
    ['cars', t('vehicles.tabCars')],
    ['mine', `${t('vehicles.tabMine')} (${owned.length})`],
  ]

  return (
    <Sheet title={t('vehicles.title')} onClose={closePanel}>
      <div className="mb-2 flex items-center justify-center gap-1.5 text-sm font-bold">
        {t('shop.yourMoney')}:
        <CoinIcon className="text-lg" />
        <span className="font-display text-base font-extrabold tabular-nums" data-testid="veh-money">
          {formatMoney(money, currency)}
        </span>
      </div>
      <div className="mb-2 grid grid-cols-3 gap-1 rounded-full bg-ink/10 p-1 text-[12px] font-black">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            data-testid={`veh-tab-${id}`}
            onClick={() => {
              setTab(id)
              setConfirm(null)
              const first = id === 'mine' ? owned[0] : VEHICLE_LIST.find((v) => (id === 'cars' ? v.kind === 'car' : v.kind !== 'car'))
              if (first) setPick(first.id)
            }}
            className={`truncate rounded-full px-2 py-1 ${tab === id ? 'bg-cream shadow-[0_2px_0_var(--color-outline)]' : 'text-ink/70'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="land:grid land:grid-cols-[1fr_1fr] land:gap-3">
        <div>
          <Preview def={def} />
          <div className="mt-1.5 px-1">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-base leading-tight font-extrabold" data-testid="veh-name">
                {localize(def.name)}
              </h3>
              <span className="shrink-0 font-display text-sm font-extrabold tabular-nums">{formatMoney(def.price, 'VND')}</span>
            </div>
            <p className="text-[12.5px] leading-snug text-ink/80">{localize(def.blurb)}</p>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] font-bold">
              <span>
                {t('vehicles.speed')} <SpeedBar value={def.speed} />
              </span>
              <span>{def.tank ? `${t('vehicles.tank')} ${def.tank} lít` : t('vehicles.noFuel')}</span>
              {mine && def.tank > 0 && (
                <span data-testid="veh-fuel">
                  {t('vehicles.fuel')} {fuel}%
                </span>
              )}
              {mine && plateOf(def.id) && (
                <span className="rounded border border-ink/40 bg-white px-1 font-mono text-[11px]" data-testid="veh-plate">
                  {plateOf(def.id)}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="mt-2 land:mt-0">
          {list.length === 0 ? (
            <p className="rounded-2xl bg-white/70 p-3 text-center text-sm font-bold text-ink/70">{t('vehicles.none')}</p>
          ) : (
            <ul className="grid grid-cols-2 gap-1.5 short:grid-cols-3 land:grid-cols-2">
              {list.map((v) => (
                <li key={v.id}>
                  <button
                    type="button"
                    data-testid={`veh-item-${v.id}`}
                    onClick={() => choose(v.id)}
                    className={`relative flex w-full items-center gap-1.5 rounded-xl p-1.5 text-left ${
                      v.id === pick ? 'bg-cream shadow-[inset_0_0_0_2.5px_var(--color-outline)]' : 'bg-white/75 shadow-[inset_0_0_0_2px_#f1dcb6]'
                    }`}
                  >
                    <Icon3d name={v.icon} className="h-7 w-7 shrink-0" />
                    <span className="min-w-0">
                      <span className="block truncate text-[12px] leading-tight font-extrabold">{localize(v.name)}</span>
                      <span className="block text-[11px] font-bold text-ink/65 tabular-nums">{ownsVehicle(v.id) ? t('vehicles.owned') : formatMoney(v.price, 'VND')}</span>
                    </span>
                    <span className="absolute top-0.5 right-1 h-2.5 w-2.5 rounded-full border border-outline" style={{ background: v.color }} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-2 flex flex-col gap-1.5">
            {!mine && (
              <button
                type="button"
                data-testid="veh-buy"
                onClick={buy}
                className={`flex w-full items-center justify-center gap-1 rounded-xl py-2 text-sm font-black active:translate-y-1 active:shadow-none ${short ? 'bg-ink/15 text-ink/50' : 'btn-lacquer'}`}
              >
                {confirm === `buy-${def.id}` ? t('vehicles.confirmBuy') : short ? t('vehicles.short', { amount: formatMoney(Math.max(0, def.price - (currency === 'VND' ? money : 0)), 'VND') }) : `${t('vehicles.buy')} · ${formatMoney(def.price, 'VND')}`}
              </button>
            )}
            {mine && (
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  data-testid="veh-use"
                  disabled={isCurrent}
                  onClick={() => {
                    chooseVehicle(def.id)
                    if (rideAllowed() && !useRide.getState().riding) {
                      closePanel()
                      mount(def.id)
                    }
                  }}
                  className={`rounded-xl py-2 text-sm font-black active:translate-y-1 active:shadow-none ${isCurrent ? 'bg-jade/20 text-jade-dark' : 'btn-jade'}`}
                >
                  {isCurrent ? t('vehicles.inUse') : t('vehicles.use')}
                </button>
                <button type="button" data-testid="veh-sell" onClick={sell} className="rounded-xl bg-cream py-2 text-sm font-black shadow-[inset_0_0_0_2px_var(--color-outline)] active:translate-y-0.5">
                  {confirm === `sell-${def.id}` ? t('vehicles.confirmSell') : `${t('vehicles.sell')} · ${formatMoney(resaleOf(def), 'VND')}`}
                </button>
              </div>
            )}
            <p className="text-center text-[11px] leading-snug font-bold text-ink/60">{t('vehicles.hint')}</p>
          </div>
        </div>
      </div>
    </Sheet>
  )
}

/** Get on / off (F). Shown when you own a vehicle and the street allows riding; H honks while riding. */
export function RideButton() {
  const t = useT()
  const isTouch = useIsTouch()
  useFlags((s) => s.flags)
  const scene = useWorld((s) => s.scene)
  const riding = useRide((s) => s.riding)
  const fuelPct = useRide((s) => s.fuelPct)
  const busy = useUI((s) => s.panel !== null || s.sleeping || s.transition !== null || s.fastForward !== null || s.newDayOpen || s.movementLocked)
  const talking = useDialogue((s) => s.npcId !== null)
  const playing = useMinigame((s) => s.active !== null)
  const cur = currentVehicle()
  const show = !!cur && rideAllowed(scene) && !busy && !talking && !playing

  useEffect(() => {
    if (!show) return
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (e.repeat || el?.closest('input, textarea, [contenteditable="true"]')) return
      if (e.code === 'KeyF') toggleRide()
      else if (e.code === 'KeyH') {
        const r = useRide.getState().riding
        if (r) playSfx(VEHICLES[r].kind === 'bicycle' ? 'bell' : 'honk')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [show])

  if (!show || !cur) return null
  const def = riding ? VEHICLES[riding] : cur
  const label = riding ? t('ride.off') : t('ride.on')
  const fuel = riding && def.tank > 0 ? fuelPct : null
  const low = fuel !== null && fuel <= 10
  const honk = () => playSfx(def.kind === 'bicycle' ? 'bell' : 'honk')

  if (isTouch) {
    return (
      <div className="absolute z-21 flex items-end gap-1.5" style={{ left: 'calc(max(0.25rem, env(safe-area-inset-left)) + 6.6rem)', bottom: 'calc(max(0.5rem, env(safe-area-inset-bottom)) + 9.3rem)' }}>
        <button
          type="button"
          aria-label={label}
          aria-pressed={!!riding}
          data-testid="ride-btn"
          onClick={toggleRide}
          className={`pointer-events-auto relative grid h-12 w-12 place-items-center rounded-full border-[2.5px] border-outline shadow-[0_3px_0_var(--color-outline)] select-none active:translate-y-0.5 ${riding ? 'bg-gold' : 'bg-cream'}`}
        >
          <Icon3d name={def.icon} className="h-8 w-8" />
          {fuel !== null && (
            <span className={`absolute -right-1 -bottom-1 rounded-full border-2 border-outline px-1 text-[10px] leading-tight font-black tabular-nums ${low ? 'bg-lacquer text-white' : 'bg-cream'}`}>{fuel}%</span>
          )}
        </button>
        {riding && (
          <button
            type="button"
            aria-label={t('ride.honk')}
            onClick={honk}
            className="pointer-events-auto grid h-9 w-9 place-items-center rounded-full border-[2.5px] border-outline bg-cream text-[11px] font-black shadow-[0_3px_0_var(--color-outline)] select-none active:translate-y-0.5"
          >
            {def.kind === 'bicycle' ? 'Kíng' : 'Bíp'}
          </button>
        )}
      </div>
    )
  }
  return (
    <button
      type="button"
      data-testid="ride-btn"
      aria-pressed={!!riding}
      onClick={toggleRide}
      className={`pointer-events-auto absolute z-20 flex items-center gap-2 rounded-full border-[2.5px] border-outline py-1 pr-3 pl-1.5 text-sm font-black shadow-[0_3px_0_var(--color-outline)] active:translate-y-0.5 ${riding ? 'bg-gold' : 'bg-cream'}`}
      style={{ left: 'max(0.75rem, env(safe-area-inset-left))', bottom: 'max(1rem, calc(env(safe-area-inset-bottom) + 0.5rem))' }}
    >
      <Icon3d name={def.icon} className="h-7 w-7" />
      <kbd className="rounded-md border-2 border-outline bg-white px-1.5 text-xs">F</kbd>
      {label}
      {fuel !== null && (
        <span className={`flex items-center gap-1 rounded-full px-1.5 text-[11px] tabular-nums ${low ? 'bg-lacquer text-white' : 'bg-ink/10'}`}>
          <Icon3d name="fuel-pump" className="h-4 w-4" />
          {fuel}%
        </span>
      )}
      {riding && <span className="text-[11px] font-bold text-ink/60">H = {t('ride.honk').toLowerCase()}</span>}
    </button>
  )
}
