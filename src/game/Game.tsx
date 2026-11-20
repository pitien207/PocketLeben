import { lazy, Suspense, useMemo, useRef, useState, type ComponentType, type LazyExoticComponent } from 'react'
import { Canvas } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import { CuboidCollider, Physics, RigidBody } from '@react-three/rapier'
import type { Group } from 'three'
import { CONFIG } from '../data/config'
import { useSettings } from '../store/settingsStore'
import { useMinigame } from '../store/minigameStore'
import { useWorld, type SceneId } from '../store/worldStore'
import { CameraRig } from './components/CameraRig'
import { InteractionSystem } from './components/Interactable'
import { Lighting } from './components/Lighting'
import { Player } from './components/Player'
import { SceneReady } from './components/SceneReady'
import { TimeSystem } from './components/TimeSystem'
import { Weather } from './components/Weather'
import { GuideSystem } from './components/GuideSystem'
import { PALETTE } from './scenes/shared/palette'
import { SCENES } from './scenes/registry'
import { DebugBridge } from './systems/debug'
import { LocalEmote, RemotePlayers } from './components/RemotePlayers'
import { SecretGlints } from './components/SecretGlints'
import { SECRETS_ENABLED } from '../data/secrets'
import { FancyLook } from './fx/FancyLook'

/** Physics steps after the player sets its velocity (-100) and before the camera (0). */
const PHYSICS_PRIORITY = -50

const SCENE_COMPONENTS = Object.fromEntries(
  Object.values(SCENES).map((s) => [s.id, lazy(s.load)]),
) as Record<SceneId, LazyExoticComponent<ComponentType>>

/** The current location, loaded on demand. */
function SceneRoot() {
  const scene = useWorld((s) => s.scene)
  const Scene = SCENE_COMPONENTS[scene]
  return (
    <Suspense fallback={null}>
      <Scene key={scene} />
    </Suspense>
  )
}

/** A floor that's always there, so the player never falls while a scene is loading. */
function GlobalGround() {
  return (
    <RigidBody type="fixed" colliders={false}>
      <CuboidCollider args={[120, 0.5, 120]} position={[0, -0.5, 0]} />
    </RigidBody>
  )
}

/** Mini-games that cover the whole screen: the 3D view is not drawn meanwhile (1.34, smoother UI on phones). */
const FULL_SCREEN_GAMES = new Set(['bubbleTea', 'circleK', 'grab'])

export function Game() {
  const quality = useSettings((s) => s.quality)
  const covered = useMinigame((s) => FULL_SCREEN_GAMES.has(s.active?.kind ?? ''))
  const playerVisual = useRef<Group>(null)
  // Lowered automatically if the device can't hold its frame rate.
  const [dprCap, setDprCap] = useState(Number.POSITIVE_INFINITY)
  const maxDpr = Math.min(dprCap, CONFIG.graphics[quality].maxDpr)
  const camera = useMemo(() => ({ fov: CONFIG.camera.fov, near: 0.5, far: 140, position: [0, 10, 12] as [number, number, number] }), [])

  return (
    <div className="absolute inset-0">
      <Canvas
        frameloop={covered ? 'never' : 'always'}
        shadows="percentage"
        flat // no tone mapping: keeps pastel colors exactly as authored
        dpr={[1, maxDpr]}
        camera={camera}
        // stencil: characters mark their pixels so the player's see-through silhouette skips them
        gl={{ antialias: true, powerPreference: 'high-performance', stencil: true }}
      >
        <color attach="background" args={[PALETTE.sky]} />
        <fog attach="fog" args={[PALETTE.fog, 30, 80]} />
        {/* 1.36: lower the resolution once and stay there. Switching back and forth resized the canvas and the post
            effects' buffers, and each switch flashed the screen bright for a frame (user: "nháy sáng"). */}
        <PerformanceMonitor flipflops={1} onDecline={() => setDprCap(1)} onFallback={() => setDprCap(1)} />
        <Lighting />
        <Suspense fallback={null}>
          <Physics gravity={[0, CONFIG.world.gravity, 0]} updatePriority={PHYSICS_PRIORITY}>
            <GlobalGround />
            <SceneRoot />
            <Player visualRef={playerVisual} />
            <CameraRig target={playerVisual} />
            <RemotePlayers />
            <LocalEmote />
            {SECRETS_ENABLED && <SecretGlints />}
            <GuideSystem />
            <InteractionSystem />
            <TimeSystem />
          </Physics>
          <Weather />
          <SceneReady />
          <FancyLook />
          {import.meta.env.DEV && <DebugBridge />}
        </Suspense>
      </Canvas>
      {/* Soft vignette: frames the diorama and pulls the eye to the centre. */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_58%,rgba(70,48,40,0.22)_100%)]" />
    </div>
  )
}
