import { useEffect, useMemo, useState } from 'react'
import type { VehicleDef } from '../../data/vehicles'
import { carModelsReady, loadCarModels } from '../scenes/shared/carModels'
import { vehicleShapes } from '../scenes/shared/ownVehicles'
import { Shapes } from '../scenes/shared/Shapes'

/** True once the car models are loaded (starts loading them when `want`). */
export function useCarsReady(want = true) {
  const [ready, setReady] = useState(carModelsReady)
  useEffect(() => {
    if (!want || ready) return
    let alive = true
    void loadCarModels().then(() => alive && setReady(carModelsReady()))
    return () => {
      alive = false
    }
  }, [want, ready])
  return ready
}

/** 1.35: one owned vehicle (data/vehicles.ts) as a single merged mesh, facing +Z. Used by the player, other
 * online players, the showroom and the shop preview. */
export function VehicleMesh({ def, shadows = true }: { def: VehicleDef; shadows?: boolean }) {
  const carsReady = useCarsReady(def.kind === 'car')
  const shapes = useMemo(() => vehicleShapes(def, carsReady), [def, carsReady])
  return <Shapes shapes={shapes} castShadow={shadows} receiveShadow={shadows} />
}
