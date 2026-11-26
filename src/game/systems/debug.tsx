import { useEffect } from 'react'
import { devSpawnBottle, pfandClock, pfandShared, PFAND_SPOTS } from './pfandWorld'
import { MUC_SIGHTS } from '../../data/munich'
import { modelPackReady } from '../scenes/shared/models'
import { useSettings } from '../../store/settingsStore'
import { useThree } from '@react-three/fiber'
import { useRapier } from '@react-three/rapier'
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
import { busArrivals, busRuntime, trainAt, transitClock } from './transit'
import { runAction } from './actions'
import { setFlag } from './conditions'
import { jumpToChapter, skipStep } from './testMode'
import { currentObjective } from './watchers'
import { remotes } from '../../net/client'
import { pullCloudSave, pushCloudSave } from '../../net/auth'
import { useNet } from '../../store/netStore'
import { usePickle } from '../../net/pickleball'
import { useGrab, grabClock } from './grab'
import { useRide } from './vehicles'
import { useFxAuto } from '../fx/fxState'

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
      /** 1.44 drop a bottle at PFAND_SPOTS[spot] (offline mode), the shared mode flag */
      pfandSpawn: devSpawnBottle,
      pfandShared,
      pfandSpots: PFAND_SPOTS,
      /** 1.45 is a model pack loaded (nature, city, food, town, facade…)? */
      modelReady: modelPackReady,
      pfandClock,
      mucSights: () => MUC_SIGHTS,
      settings: useSettings,
      toasts: useToasts,
      guide: useGuide,
      /** Multiplayer: other players as last received, and the account / cloud-save helpers. */
      remotes: () => [...remotes.values()],
      net: useNet,
      /** 1.39 pickleball lobby state (rooms, my room, invites, match). */
      pickle: usePickle,
      /** 1.40 Grab app (offers, order) + its clock, and the vehicle you ride. */
      grab: useGrab,
      grabClock,
      /** 1.48 buses + U-Bahn: busRuntime / busArrivals (force a bus to stand), transitClock.offset, trainAt(gleis) */
      transit: { busRuntime, busArrivals, transitClock, trainAt },
      ride: useRide,
      /** 1.39 lighter post effects after a slow-device decline ({ lite }). */
      fxAuto: useFxAuto,
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
      look: (from?: [number, number, number], at?: [number, number, number], fov?: number) => {
        cameraState.free = from && at ? { from, at, fov } : null
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

/**
 * 1.49 Mount inside <Physics> (dev only): `__vh.colliders()` lists every collider of the scene as a plain box (centre, half
 * extents of its axis-aligned bounds, body type, groups) — the overlap check of the tests (things drawn into each other) reads it.
 */
export function PhysicsBridge() {
  const { world } = useRapier()
  useEffect(() => {
    const vh = (window as unknown as { __vh?: Record<string, unknown> }).__vh
    if (!vh) return
    vh.colliders = () => {
      const out: { x: number; y: number; z: number; hx: number; hy: number; hz: number; body: string; groups: number; sensor: boolean; shape: number }[] = []
      world.forEachCollider((c) => {
        const t = c.translation()
        const s = c.shape as unknown as { type: number; halfExtents?: { x: number; y: number; z: number }; radius?: number; halfHeight?: number }
        let hx = 0
        let hy = 0
        let hz = 0
        if (s.halfExtents) {
          // turn the box's corners with its rotation (y only in this game) to get axis-aligned bounds
          const q = c.rotation()
          const yaw = 2 * Math.atan2(q.y, q.w)
          const cs = Math.abs(Math.cos(yaw))
          const sn = Math.abs(Math.sin(yaw))
          hx = s.halfExtents.x * cs + s.halfExtents.z * sn
          hz = s.halfExtents.x * sn + s.halfExtents.z * cs
          hy = s.halfExtents.y
        } else if (s.radius != null) {
          hx = hz = s.radius
          hy = s.halfHeight ?? s.radius
        } else return
        const p = c.parent()
        out.push({ x: t.x, y: t.y, z: t.z, hx, hy, hz, body: p ? ['dynamic', 'fixed', 'kinematicPos', 'kinematicVel'][p.bodyType()] ?? '?' : 'none', groups: c.collisionGroups(), sensor: c.isSensor(), shape: s.type })
      })
      return out
    }
  }, [world])
  return null
}

/** Mount inside <Canvas> (dev only) to give `__vh.project` access to the camera. */
export function DebugBridge() {
  const get = useThree((s) => s.get)
  useEffect(() => {
    const vh = (window as unknown as { __vh?: Record<string, unknown> }).__vh
    if (!vh) return
    vh.cameraPos = () => get().camera.position.toArray()
    vh.threeScene = () => get().scene
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
