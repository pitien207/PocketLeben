import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { Vector3, type BufferGeometry } from 'three'
import { useDialogue } from '../../store/dialogueStore'
import { useFlags } from '../../store/flagsStore'
import { useInteraction } from '../../store/interactionStore'
import { useInventory } from '../../store/inventoryStore'
import { useTime } from '../../store/timeStore'
import { useUI } from '../../store/uiStore'
import { usePlayer } from '../../store/playerStore'
import { useWork } from '../../store/workStore'
import { musicDebug } from './audio'
import { cameraState } from './cameraState'
import { advanceDialogue, chooseOption, closeDialogue, openDialogue } from './dialogue'
import { playerState, teleportPlayer } from './playerState'
import { npcPositions } from './registry'
import { exportSave, saveGame } from './save'
import { useWorld } from '../../store/worldStore'
import { useCare } from '../../store/careStore'
import { useMinigame } from '../../store/minigameStore'
import { usePfand } from '../../store/pfandStore'
import { useToasts } from '../../store/toastStore'
import { useGuide } from '../../store/guideStore'
import { route } from './guide'
import { localSnapshot } from './netState'
import { travelTo } from './travel'
import { runAction } from './actions'
import { setFlag } from './conditions'
import { jumpToChapter, skipStep } from './testMode'
import { currentObjective } from './watchers'
import { remotes } from '../../net/client'
import { pullCloudSave, pushCloudSave } from '../../net/auth'
import { useNet } from '../../store/netStore'

/**
 * Dev-only console helpers (stripped from production builds):
 *   __vh.teleport(4.5, -6)        move the player
 *   __vh.work.getState()          inspect the current shift
 *   __vh.project(x, y, z)         world point → CSS pixel position on screen
 *   __vh.time.getState().setTime(1, 20 * 60)   jump to 20:00
 *   __vh.travel('germany', 'default')            change scene
 *   __vh.action('german.lesson')                 run a named game action
 */
export function installDebugHooks() {
  if (!import.meta.env.DEV) return
  Object.assign(window, {
    __vh: {
      teleport: teleportPlayer,
      player: playerState,
      camera: cameraState,
      music: musicDebug,
      stats: usePlayer,
      work: useWork,
      interaction: useInteraction,
      time: useTime,
      inventory: useInventory,
      flags: useFlags,
      dialogue: useDialogue,
      ui: useUI,
      npcs: npcPositions,
      talk: openDialogue,
      choose: chooseOption,
      advance: advanceDialogue,
      closeTalk: closeDialogue,
      save: saveGame,
      exportSave,
      world: useWorld,
      care: useCare,
      minigame: useMinigame,
      pfand: usePfand,
      toasts: useToasts,
      guide: useGuide,
      /** Multiplayer: other players as last received, and the account / cloud-save helpers. */
      remotes: () => [...remotes.values()],
      net: useNet,
      cloud: { push: pushCloudSave, pull: pullCloudSave },
      /** What a multiplayer client would send for this player (see systems/netState.ts). */
      snapshot: () => ({
        scene: useWorld.getState().scene,
        x: playerState.position.x,
        z: playerState.position.z,
        yaw: localSnapshot.yaw,
        motion: { ...localSnapshot.motion },
        outfit: usePlayer.getState().outfit,
      }),
      /** Fixed inspection camera: __vh.look([x,y,z], [x,y,z]); __vh.look() returns to the player. */
      look: (from?: [number, number, number], at?: [number, number, number]) => {
        cameraState.free = from && at ? { from, at } : null
        cameraState.snap = true
      },
      route,
      travel: travelTo,
      action: runAction,
      setFlag,
      skip: skipStep,
      jump: jumpToChapter,
      objective: () => currentObjective()?.step.id ?? null,
      project: () => null,
    },
  })
}

/** Mount inside <Canvas> (dev only) to give `__vh.project` access to the camera. */
export function DebugBridge() {
  const get = useThree((s) => s.get)
  useEffect(() => {
    const vh = (window as unknown as { __vh?: Record<string, unknown> }).__vh
    if (!vh) return
    vh.cameraPos = () => get().camera.position.toArray()
    vh.renderInfo = () => {
      const { calls, triangles } = get().gl.info.render
      return { calls, triangles }
    }
    /** The 15 heaviest static meshes: triangles and where they are (bounding-box centre). */
    vh.heavyMeshes = () => {
      const rows: { tris: number; at: string; shadow: boolean }[] = []
      get().scene.traverseVisible((o) => {
        const m = o as unknown as { isMesh?: boolean; isSkinnedMesh?: boolean; geometry?: BufferGeometry; castShadow: boolean }
        if (!m.isMesh || m.isSkinnedMesh || !m.geometry) return
        const g = m.geometry
        const tris = (g.index ? g.index.count : g.attributes.position.count) / 3
        g.computeBoundingBox()
        const c = g.boundingBox!.getCenter(new Vector3()).applyMatrix4(o.matrixWorld)
        rows.push({ tris: Math.round(tris), at: `${c.x.toFixed(0)},${c.y.toFixed(0)},${c.z.toFixed(0)}`, shadow: m.castShadow })
      })
      return rows.sort((a, b) => b.tris - a.tris).slice(0, 15)
    }
    /** Triangles per kind of object (visible meshes only), to find what is heavy. */
    vh.sceneStats = () => {
      const out: Record<string, { meshes: number; tris: number; shadow: number }> = {}
      get().scene.traverseVisible((o) => {
        const m = o as unknown as { isMesh?: boolean; isSkinnedMesh?: boolean; isInstancedMesh?: boolean; geometry?: { index: { count: number } | null; attributes: { position: { count: number } } }; castShadow: boolean; count?: number }
        if (!m.isMesh || !m.geometry?.attributes?.position) return
        const g = m.geometry
        const tris = ((g.index ? g.index.count : g.attributes.position.count) / 3) * (m.isInstancedMesh ? (m.count ?? 1) : 1)
        const kind = m.isSkinnedMesh ? 'character' : m.isInstancedMesh ? 'instanced' : tris > 20000 ? `big:${o.parent?.type ?? ''}` : 'mesh'
        const row = (out[kind] ??= { meshes: 0, tris: 0, shadow: 0 })
        row.meshes++
        row.tris += Math.round(tris)
        if (m.castShadow) row.shadow += Math.round(tris)
      })
      return out
    }
    vh.project = (x: number, y: number, z: number) => {
      const { camera, size } = get()
      const v = new Vector3(x, y, z).project(camera)
      return { x: ((v.x + 1) / 2) * size.width, y: ((1 - v.y) / 2) * size.height }
    }
  }, [get])
  return null
}
