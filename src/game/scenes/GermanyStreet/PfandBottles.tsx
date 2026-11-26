import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { usePfand } from '../../../store/pfandStore'
import { tickPfand } from '../../systems/pfandWorld'
import { glowMaterial } from '../shared/materials'
import { Shapes, type ShapeItem } from '../shared/Shapes'

/**
 * Deposit bottles lying around München (M8; 1.44 spawned at random spots, shared online — systems/pfandWorld.ts).
 * Walk over one to pick it up. The golden one sparkles and turns slowly so you can spot it from afar.
 */

const COLORS = ['#5fa06a', '#a8754f', '#cfe8f6']
const bottleShapes = (color: string, cap = '#f4c04e'): ShapeItem[] => [
  { cyl: [0.06, 0.07, 0.24, 8], at: [0, 0.12, 0], color },
  { cyl: [0.025, 0.05, 0.1, 8], at: [0, 0.29, 0], color },
  { cyl: [0.028, 0.028, 0.03, 8], at: [0, 0.35, 0], color: cap },
]
const SHAPES = COLORS.map((c) => bottleShapes(c))
const GOLD = bottleShapes('#f2c94c', '#fff3b0')
/** A little star of glints round the golden bottle (glowMaterial → it shines at night and with bloom). */
const SPARKLE: ShapeItem[] = [
  { box: [0.03, 0.34, 0.03], at: [0, 0, 0], color: '#fff6c8' },
  { box: [0.34, 0.03, 0.03], at: [0, 0, 0], color: '#fff6c8' },
  { box: [0.03, 0.03, 0.34], at: [0, 0, 0], color: '#fff6c8' },
]

function GoldBottle({ x, z }: { x: number; z: number }) {
  const g = useRef<Group>(null)
  const s1 = useRef<Group>(null)
  const s2 = useRef<Group>(null)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (g.current) {
      g.current.rotation.y = t * 1.4
      g.current.position.y = 0.06 + Math.sin(t * 2.2) * 0.04
    }
    if (s1.current) {
      s1.current.position.set(Math.cos(t * 2) * 0.28, 0.45 + Math.sin(t * 3) * 0.08, Math.sin(t * 2) * 0.28)
      s1.current.scale.setScalar(0.6 + 0.4 * Math.abs(Math.sin(t * 4)))
    }
    if (s2.current) {
      s2.current.position.set(Math.cos(t * 2 + Math.PI) * 0.24, 0.3 + Math.cos(t * 2.6) * 0.08, Math.sin(t * 2 + Math.PI) * 0.24)
      s2.current.scale.setScalar(0.6 + 0.4 * Math.abs(Math.cos(t * 3.4)))
    }
  })
  return (
    <group position={[x, 0, z]}>
      <group ref={g}>
        <Shapes shapes={GOLD} castShadow={false} />
      </group>
      <group ref={s1}>
        <Shapes shapes={SPARKLE} material={glowMaterial} castShadow={false} receiveShadow={false} />
      </group>
      <group ref={s2}>
        <Shapes shapes={SPARKLE} material={glowMaterial} castShadow={false} receiveShadow={false} />
      </group>
    </group>
  )
}

export function PfandBottles() {
  const bottles = usePfand((s) => s.bottles)
  const pending = usePfand((s) => s.pending)
  const shapes = useMemo(() => SHAPES, [])
  useFrame(tickPfand)
  return (
    <>
      {bottles.map((b) =>
        pending.includes(b.id) ? null : b.gold ? (
          <GoldBottle key={b.id} x={b.x} z={b.z} />
        ) : (
          <group key={b.id} position={[b.x, 0, b.z]} rotation={[0, b.id, b.kind === 2 ? Math.PI / 2 : 0]}>
            <Shapes shapes={shapes[b.kind]} castShadow={false} />
          </group>
        ),
      )}
    </>
  )
}
