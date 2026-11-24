import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { Animal, type AnimalAction, type AnimalVariant } from '../../components/animals/Animal'
import { yardFx } from '../../systems/homeYard'
import { YARD } from './layout'

/**
 * 1.42 The hens of the back yard: the rigged Quaternius chicken and chick (components/animals, CC0) with their own
 * idle / peck / run clips. They wander the run, stop and peck, and come running to the trough when you scatter rice
 * (`yardFx.fedAt`); the chicks trot after the first hen. Each bird moves itself (useFrame) and only re-renders when
 * its clip changes.
 */

export interface Flock {
  hens: number
  rooster: boolean
  chicks: number
}

type Kind = 'white' | 'brown' | 'black' | 'rooster' | 'chick'

interface BirdState {
  kind: Kind
  x: number
  z: number
  yaw: number
  tx: number
  tz: number
  mode: 'idle' | 'walk' | 'peck'
  timer: number
  seed: number
}

const { roam, run } = YARD
let rnd = 1
const random = () => {
  rnd = (rnd * 16807) % 2147483647
  return rnd / 2147483647
}
const inRoam = (b: BirdState) => {
  b.tx = roam.x0 + random() * (roam.x1 - roam.x0)
  b.tz = roam.z0 + random() * (roam.z1 - roam.z0)
}

function Bird({ b, mother }: { b: BirdState; mother: BirdState | undefined }) {
  const ref = useRef<Group>(null)
  const [clip, setClip] = useState<{ action: AnimalAction; speed: number }>({ action: 'idle', speed: 1 })
  const shown = useRef(clip)
  const chick = b.kind === 'chick'
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const feeding = performance.now() / 1000 - yardFx.fedAt < 25
    b.timer -= dt
    if (feeding && b.mode !== 'walk' && Math.hypot(b.x - run.feeder.x, b.z - run.feeder.z) > 0.9) {
      // rice! everyone runs to the trough
      b.tx = run.feeder.x + (random() - 0.5) * 1.6
      b.tz = run.feeder.z + (random() < 0.5 ? -0.45 : 0.45) + (random() - 0.5) * 0.3
      b.mode = 'walk'
    }
    const speed = (feeding ? 1.4 : chick ? 0.7 : 0.5) * (b.kind === 'rooster' ? 0.9 : 1)
    if (b.mode === 'walk') {
      const dx = b.tx - b.x
      const dz = b.tz - b.z
      const d = Math.hypot(dx, dz)
      if (d < 0.05) {
        b.mode = feeding || random() < 0.5 ? 'peck' : 'idle'
        b.timer = feeding ? 1 + random() * 1.5 : 1 + random() * 2.5
      } else {
        let turn = Math.atan2(dx, dz) - b.yaw
        turn = Math.atan2(Math.sin(turn), Math.cos(turn))
        b.yaw += turn * Math.min(1, dt * 8)
        const step = Math.min(d, speed * dt)
        b.x += (dx / d) * step
        b.z += (dz / d) * step
      }
    } else if (b.timer <= 0) {
      if (b.mode === 'peck' && feeding) {
        b.timer = 0.8 + random() * 1.2
        b.yaw += (random() - 0.5) * 0.8
      } else if (chick && mother && random() < 0.7) {
        b.tx = Math.min(roam.x1, Math.max(roam.x0, mother.x + (random() - 0.5) * 0.7))
        b.tz = Math.min(roam.z1, Math.max(roam.z0, mother.z + (random() - 0.5) * 0.7))
        b.mode = 'walk'
      } else if (random() < 0.45) {
        b.mode = 'peck'
        b.timer = 1.2 + random() * 1.6
      } else {
        inRoam(b)
        b.mode = 'walk'
      }
    }
    if (ref.current) {
      ref.current.position.set(b.x, 0, b.z)
      ref.current.rotation.y = b.yaw
    }
    // walking uses the run clip slowed down; only re-render when the clip changes
    const next: { action: AnimalAction; speed: number } =
      b.mode === 'walk' ? { action: 'run', speed: feeding ? 1.2 : 0.6 } : b.mode === 'peck' ? { action: 'peck', speed: feeding ? 1.3 : 1 } : { action: 'idle', speed: 1 }
    if (next.action !== shown.current.action || next.speed !== shown.current.speed) {
      shown.current = next
      setClip(next)
    }
  })
  const variant: AnimalVariant = b.kind === 'chick' ? 'default' : b.kind
  return <Animal kind={chick ? 'chick' : 'hen'} variant={variant} action={clip.action} speed={clip.speed} size={b.kind === 'rooster' ? 1.22 : 1} groupRef={ref} position={[b.x, 0, b.z]} rotationY={b.yaw} />
}

export function Chickens({ flock }: { flock: Flock }) {
  const birds = useMemo<BirdState[]>(() => {
    rnd = 7
    const kinds: Kind[] = []
    const hens: Kind[] = ['white', 'brown', 'black', 'brown', 'white']
    for (let i = 0; i < flock.hens; i++) kinds.push(hens[i % hens.length])
    if (flock.rooster) kinds.push('rooster')
    for (let i = 0; i < flock.chicks; i++) kinds.push('chick')
    return kinds.map((kind, i) => {
      const b: BirdState = { kind, x: 0, z: 0, yaw: random() * 6, tx: 0, tz: 0, mode: 'idle', timer: random() * 2, seed: i }
      inRoam(b)
      b.x = b.tx
      b.z = b.tz
      return b
    })
  }, [flock])
  const mother = birds.find((b) => b.kind !== 'chick' && b.kind !== 'rooster')
  return (
    <>
      {birds.map((b, i) => (
        <Bird key={`${b.kind}-${i}`} b={b} mother={mother} />
      ))}
    </>
  )
}
