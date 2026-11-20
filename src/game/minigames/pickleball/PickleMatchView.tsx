import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { CircleGeometry, MeshBasicMaterial, MeshLambertMaterial, RingGeometry, SphereGeometry, type Group, type Mesh } from 'three'
import { ChibiModel, type MotionState } from '../../components/ChibiModel'
import { PICKLE } from '../../scenes/HangKhay/layout'
import { cameraState } from '../../systems/cameraState'
import { localSnapshot } from '../../systems/netState'
import { playerState } from '../../systems/playerState'
import { COURT, side } from './engine'
import { matchHiddenRemotes, usePickleSession, type PickleSession } from './session'

/**
 * 1.39 The pickleball match in the real 3D world: on the court of Vườn hoa Hàng Khay (scenes/HangKhay/PickleCourt),
 * with the same chibi characters, light, shadows and post effects as the rest of the game. The camera stands high
 * behind your own baseline (both players see themselves in front). The engine (engine.ts) is stepped by the DOM
 * controls (Pickleball.tsx); this only shows its state. Meanwhile the real body is hidden, and other players in the
 * street see your match figure (localSnapshot.override → net/client.ts).
 *
 * Court → world: canonical y (along the court) runs along world x, canonical x across = world z (the host looks
 * toward +x, so +z is on their right).
 */

const SURFACE = 0.06
const W = (x: number, y: number, h: number): [number, number, number] => [PICKLE.x + y, h + SURFACE, PICKLE.z + x]
const BALL_R = 0.09
const WALK = 4.2

const ballGeo = new SphereGeometry(BALL_R, 16, 12)
const ballMat = new MeshLambertMaterial({ color: '#e8f34a', emissive: '#3a3d00' })
const blobGeo = new CircleGeometry(0.16, 20).rotateX(-Math.PI / 2)
const blobMat = new MeshBasicMaterial({ color: '#10241a', transparent: true, opacity: 0.35, depthWrite: false })
const ringGeo = new RingGeometry(0.24, 0.32, 28).rotateX(-Math.PI / 2)
const ringMat = new MeshBasicMaterial({ color: '#ffe86a', transparent: true, opacity: 0.85, depthWrite: false })

export function PickleMatchView() {
  const session = usePickleSession((s) => s.session)
  if (!session) return null
  return <MatchScene s={session} />
}

const angleTo = (a: number, b: number) => Math.atan2(Math.sin(b - a), Math.cos(b - a))

function MatchScene({ s }: { s: PickleSession }) {
  const size = useThree((st) => st.size)
  const meG = useRef<Group>(null)
  const themG = useRef<Group>(null)
  const ball = useRef<Mesh>(null)
  const blob = useRef<Mesh>(null)
  const ring = useRef<Mesh>(null)
  const meMotion = useRef<MotionState>({ speed: 0, held: 'paddle', swing: 0 })
  const themMotion = useRef<MotionState>({ speed: 0, held: 'paddle', swing: 0 })
  const themLast = useRef<[number, number] | null>(null)
  const override = useMemo(() => ({ x: 0, z: 0, yaw: 0, motion: meMotion.current }), [])

  // while the match runs: hide my body and the opponent's normal model; afterwards give the camera back
  useEffect(() => {
    playerState.hidden = true
    if (s.themId !== null) matchHiddenRemotes.add(s.themId)
    return () => {
      playerState.hidden = false
      if (s.themId !== null) matchHiddenRemotes.delete(s.themId)
      localSnapshot.override = null
      cameraState.free = null
      cameraState.snap = true
    }
  }, [s])

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1)
    const e = s.engine
    const sg = side(e.role)
    const hl = COURT.halfL
    // camera high behind my baseline, looking down the court (portrait screens: higher and wider)
    const land = size.width / Math.max(1, size.height) > 1.15
    // (landscape: your own figure at the baseline stays in view, the far player too)
    const back = land ? 8.5 : 9.5
    const high = land ? 9.5 : 13
    cameraState.free = { from: W(0, sg * (hl + back), high), at: W(0, -sg * (land ? 0.6 : 2.6), 0), fov: land ? 46 : 66, fade: true }

    const place = (g: Group | null, x: number, y: number, h: number, yaw: number) => {
      if (!g) return
      const p = W(x, y, h)
      g.position.set(p[0], p[1], p[2])
      g.rotation.y = yaw
    }
    // face the net, turned a little toward the ball
    const facing = (px: number, py: number, mySide: number) => {
      const net = Math.atan2(-mySide, 0) // world: forward = −side along x
      const b = W(e.ball.x, e.ball.y, 0)
      const p = W(px, py, 0)
      const toBall = Math.atan2(b[0] - p[0], b[2] - p[2])
      return net + Math.max(-0.75, Math.min(0.75, angleTo(net, toBall)))
    }
    const swingOf = (t: number) => (t < 0.34 ? t / 0.34 : 0)

    const me = e.me
    const mm = meMotion.current
    mm.speed = Math.min(1.4, Math.hypot(me.vx, me.vy) / WALK)
    mm.swing = swingOf(me.swing)
    const myYaw = facing(me.x, me.y, sg)
    place(meG.current, me.x, me.y, 0, myYaw)

    const th = e.them
    const tm = themMotion.current
    const last = themLast.current
    const v = last && dt > 0 ? Math.hypot(th.x - last[0], th.y - last[1]) / dt : 0
    themLast.current = [th.x, th.y]
    tm.speed += (Math.min(1.4, v / WALK) - tm.speed) * Math.min(1, dt * 10)
    tm.swing = swingOf(th.swing)
    place(themG.current, th.x, th.y, 0, facing(th.x, th.y, -sg))

    // the ball, its soft shadow, and where an incoming ball will land
    const b = e.ball
    const bp = W(b.x, b.y, b.h + BALL_R)
    ball.current?.position.set(bp[0], bp[1], bp[2])
    if (blob.current) {
      const g = W(b.x, b.y, 0.012)
      blob.current.position.set(g[0], g[1], g[2])
      const k = Math.max(0.45, 1 - b.h * 0.18)
      blob.current.scale.setScalar(k)
      blobMat.opacity = 0.38 * k
    }
    if (ring.current) {
      ring.current.visible = !!e.landing
      if (e.landing) {
        const l = W(e.landing.x, e.landing.y, 0.02)
        ring.current.position.set(l[0], l[1], l[2])
        ring.current.scale.setScalar(1 + Math.sin(performance.now() / 120) * 0.08)
      }
    }

    // others in the street see me play
    const wp = W(me.x, me.y, 0)
    override.x = wp[0]
    override.z = wp[2]
    override.yaw = myYaw
    localSnapshot.override = override
  })

  return (
    <group>
      <group ref={meG}>
        <ChibiModel motion={meMotion} outfit={s.me} carry="paddle" detail="high" />
      </group>
      <group ref={themG}>
        <ChibiModel motion={themMotion} outfit={s.them} carry="paddle" detail="high" />
      </group>
      <mesh ref={ball} geometry={ballGeo} material={ballMat} castShadow />
      <mesh ref={blob} geometry={blobGeo} material={blobMat} renderOrder={2} />
      <mesh ref={ring} geometry={ringGeo} material={ringMat} renderOrder={3} visible={false} />
    </group>
  )
}
