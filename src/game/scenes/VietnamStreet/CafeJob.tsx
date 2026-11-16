import { useMemo } from 'react'
import { NPCS } from '../../../data/npcs'
import type { ContextAction } from '../../../store/interactionStore'
import { useFlags } from '../../../store/flagsStore'
import { useTime } from '../../../store/timeStore'
import { InteractMarker } from '../../components/Interactable'
import { NPC } from '../../components/npc/NPC'
import { runAction } from '../../systems/actions'
import type { ZoneXZ } from '../../systems/playerState'
import { CAFE, CAFE_INTERIOR, cafeToWorld } from './layout'

const { workSpot } = CAFE_INTERIOR

/** In front of the counter and around its left end. */
const ZONE: ZoneXZ = (() => {
  const minX = -1.8
  const maxX = 2.9
  const minZ = -0.2
  const maxZ = 2.2
  const c = cafeToWorld({ x: (minX + maxX) / 2, z: (minZ + maxZ) / 2 })
  return { x: c.x, z: c.z, halfX: (maxX - minX) / 2, halfZ: (maxZ - minZ) / 2 }
})()

const SHIFT: ContextAction[] = [{ id: 'shift', labelKey: 'action.startShift', icon: 'start', onPress: () => runAction('job.tea') }]

/**
 * The side job at Tiệm Trà Sữa Phố Cổ (1.17): chị Vy, the owner, stands behind the counter; "Làm ca"
 * starts the bubble-tea mini-game (game/minigames/BubbleTea.tsx, rules in systems/jobs.ts).
 */
export function CafeJob() {
  const day = useTime((s) => s.day)
  const free = useFlags((s) => s.flags['job.cafe.day'] !== day && !(typeof s.flags['job.cafe.banUntil'] === 'number' && (s.flags['job.cafe.banUntil'] as number) > day))
  const at = useMemo(() => cafeToWorld(workSpot), [])
  return (
    <>
      <NPC def={NPCS.chiVy} at={at} yaw={0} zone={ZONE} extraActions={SHIFT} />
      {/* A pin above the sign so the job is visible from the street. */}
      <group position={[CAFE.x, 0, CAFE.z]}>
        <InteractMarker id="npc:chiVy" position={[0, 5.6, 2.9]} visible={free} />
      </group>
    </>
  )
}
