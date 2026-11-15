import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { MeshBasicMaterial, OctahedronGeometry, type Mesh } from 'three'
import type { SecretDef } from '../../data/secrets'
import { useFlags } from '../../store/flagsStore'
import { useWorld } from '../../store/worldStore'
import { activeSecrets } from '../systems/secrets'
import { playerState } from '../systems/playerState'

/** Visible only this close: secrets should be found by wandering, not spotted from afar. */
const SHOW_WITHIN = 6
const geometry = new OctahedronGeometry(0.09, 0)
const material = new MeshBasicMaterial({ color: '#fff3b0', transparent: true, depthWrite: false, fog: false })

function Glint({ s, seed }: { s: SecretDef; seed: number }) {
  const ref = useRef<Mesh>(null)
  useFrame(({ clock }) => {
    const m = ref.current
    if (!m) return
    const d = Math.hypot(playerState.position.x - s.at.x, playerState.position.z - s.at.z)
    const k = Math.max(0, Math.min(1, (SHOW_WITHIN - d) / 2.5))
    const t = clock.elapsedTime + seed
    const pulse = 0.75 + Math.sin(t * 4) * 0.25
    m.visible = k > 0.01
    m.scale.set(k * pulse, k * pulse * 1.6, k * pulse)
    m.position.set(s.at.x + Math.sin(t * 1.3) * 0.15, 0.9 + Math.sin(t * 2) * 0.12, s.at.z + Math.cos(t * 1.1) * 0.15)
    m.rotation.y = t * 2
  })
  return <mesh ref={ref} geometry={geometry} material={material} renderOrder={5} />
}

/** Little golden sparkles over undiscovered secrets near the player. */
export function SecretGlints() {
  const scene = useWorld((s) => s.scene)
  const flags = useFlags((s) => s.flags)
  const [list, setList] = useState<SecretDef[]>([])
  useEffect(() => {
    const update = () => setList(activeSecrets(scene))
    update()
    // Time-of-day secrets (night market, shooting star) appear and vanish with the clock.
    const id = window.setInterval(update, 2000)
    return () => window.clearInterval(id)
  }, [scene, flags])
  return (
    <>
      {list.map((s, i) => (
        <Glint key={s.id} s={s} seed={i * 1.7} />
      ))}
    </>
  )
}
