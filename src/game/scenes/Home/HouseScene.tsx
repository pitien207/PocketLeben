import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useFlags } from '../../../store/flagsStore'
import { useUI } from '../../../store/uiStore'
import { cameraState } from '../../systems/cameraState'
import { getFlag, setFlag } from '../../systems/conditions'
import { openDialogue } from '../../systems/dialogue'
import { houseChanged, houseKey, houseLevel, mortgaged } from '../../systems/family'
import { playerState } from '../../systems/playerState'

/**
 * Story 2.1 §1.8: the first time you walk in after the house changed (debt level up or down,
 * or the sổ đỏ mortgaged), the camera pans slowly across the living room, then stops on the
 * parents and a line tells what changed.
 */

const PAN = { seconds: 4.2, from: [-3.6, 2.3, 2.6] as const, to: [3.2, 2.0, 2.4] as const, at0: [-2.6, 1.2, -2.8] as const, at1: [-1.5, 0.9, 0.6] as const }
const lerp = (a: readonly number[], b: readonly number[], t: number) => a.map((v, i) => v + (b[i] - v) * t) as [number, number, number]

export function HouseScene() {
  const running = useRef<{ t: number } | null>(null)

  useEffect(() => {
    // Wait until the room has faded in and nothing else is happening.
    const id = window.setTimeout(() => {
      if (!houseChanged() || getFlag('trip.away') || useUI.getState().panel) return
      const shown = getFlag('house.shown')
      const prev = typeof shown === 'string' ? shown : '0'
      const prevLevel = Number(prev[0]) || 0
      const level = houseLevel()
      const scene = mortgaged() && !prev.includes('m') ? 'mortgage' : level > prevLevel ? `up${level}` : level === 0 ? 'down0' : 'down'
      setFlag('house.scene', scene)
      useFlags.getState().setFlag('house.shown', houseKey())
      playerState.locked = true
      useUI.getState().setMovementLocked(true)
      running.current = { t: 0 }
    }, 1400)
    return () => window.clearTimeout(id)
  }, [])

  useFrame((_, dt) => {
    const r = running.current
    if (!r) return
    r.t += Math.min(dt, 0.1)
    const k = Math.min(1, r.t / PAN.seconds)
    const e = k * k * (3 - 2 * k)
    cameraState.free = { from: lerp(PAN.from, PAN.to, e), at: lerp(PAN.at0, PAN.at1, e), fov: 48 }
    if (k >= 1) {
      running.current = null
      cameraState.free = null
      cameraState.snap = true
      playerState.locked = false
      useUI.getState().setMovementLocked(false)
      openDialogue('giaDinh')
    }
  })

  return null
}
