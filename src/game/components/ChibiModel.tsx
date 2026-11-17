import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Bone, Float32BufferAttribute, Group, Quaternion, Skeleton, SkinnedMesh, Sphere, SphereGeometry, Uint16BufferAttribute, Vector3, type BufferGeometry, type Material, type Object3D, type Texture } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { PLAYER_OUTFIT, type Outfit } from '../../data/npcs'
import { buildShapes, type ShapeItem } from '../scenes/shared/Shapes'
import { RIDES, type RideAnchors, type RideKind } from '../scenes/shared/vehicles'
import { damp } from '../systems/math'
import { faceTexture, lightness } from './chibi/face'
import { makeFaceMaterial, makePrintMaterial, outlineMaterial, silhouetteMaterial, toonBodyMaterial } from './chibi/materials'
import { outfitPrints } from './chibi/patterns'
import { limbGeometries } from './chibi/cloth'
import { bodyParts, DEFAULT_EYES, type Carry } from './chibi/parts'
import { B, BIND, FORE, HEAD_R, HEAD_Y, HIP_Y, PARENT, SHIN, STOOL_Y, THIGH, UPPER } from './chibi/rig'

/**
 * Written by the owner each frame; read here to drive the animation.
 * Optional fields are pose targets (0–1); the model eases toward them.
 * Everything is plain data, so the same state can describe a remote player.
 */
export interface MotionState {
  /** 0 = standing still, 1 = full walking cadence. */
  speed: number
  /** Sitting (on a stool, a chair…). */
  sit?: number
  /** Height of the seat surface when sitting (default: a tiny plastic stool). */
  seatY?: number
  /** Riding a vehicle: hands go to the grips and feet to the footrests / pedals. */
  ride?: RideKind | null
  /** Pedal angle in radians while cycling (advance it with the distance travelled). */
  pedal?: number
  /** Right hand to the mouth (drinking). */
  sip?: number
  /** Fanning with the right hand. */
  fan?: number
  /** Both arms forward (reading a newspaper, carrying). */
  arms?: number
  /** Left-leg kick (đá cầu). */
  kick?: number
  held?: 'glass' | 'fan' | null
}

/**
 * The chibi character (plan §2), in the toon style of the user's chibi.js: cel-shaded body,
 * a painted anime face, a dark ink outline. The head is ~half the ~1.5 m height.
 *
 * Three skinned meshes share one skeleton: the body (all clothes/hair merged, vertex colours),
 * the face (head sphere with the painted texture) and the outline (inverted hull, lower detail).
 * = 3 draw calls per character. Arms and legs have two segments, so hands and feet can be
 * placed exactly with two-bone inverse kinematics — on handlebars, pedals, a glass at the mouth.
 */

/**
 * Mesh detail. Shapes are authored generously; a street has ~30 characters, so segment counts
 * are scaled down: "high" for your own character (always close to the camera), "low" for
 * everyone else, and coarser still for the outline (only its silhouette matters).
 */
export type ChibiDetail = 'high' | 'low'
const DETAIL: Record<ChibiDetail, number> = { high: 0.8, low: 0.45 }
const OUTLINE_DETAIL = 0.32
const OUTLINE_RANGE_SQ = 26 * 26
/** Beyond this the pose is a few pixels tall: animate on every 3rd frame only (1.21). */
const FAR_SQ = 35 * 35
/** Hidden by an ancestor (e.g. a far-away online player): nothing to animate. */
function shown(o: Object3D | null) {
  for (let n = o; n; n = n.parent) if (!n.visible) return false
  return true
}
const _world = new Vector3()

const seg = (n: number | undefined, fallback: number, k: number, min: number) => Math.max(min, Math.round((n ?? fallback) * k))

function simplify(items: ShapeItem[], k: number): ShapeItem[] {
  return items.map((it): ShapeItem => {
    if ('group' in it) return { ...it, group: simplify(it.group, k) }
    if ('sphere' in it) {
      const [r, w, h, theta] = it.sphere
      return { ...it, sphere: [r, seg(w, 32, k, r < 0.05 ? 6 : 8), seg(h, 16, k, r < 0.05 ? 4 : 6), theta] }
    }
    if ('cyl' in it) {
      const [rt, rb, h, radial] = it.cyl
      return { ...it, cyl: [rt, rb, h, seg(radial, 32, k * 1.2, 4)] }
    }
    if ('torus' in it) {
      const [r, tube, radial, tubular, arc] = it.torus
      return { ...it, torus: [r, tube, Math.max(3, Math.round((radial ?? 12) * 0.7)), seg(tubular, 48, k * 1.1, 8), arc] }
    }
    if ('ico' in it) return { ...it, ico: [it.ico[0], k < 0.6 ? 0 : Math.min(1, it.ico[1] ?? 0)] }
    return it
  })
}

/** Bind every vertex of a part rigidly to one bone. */
function skinTo(g: BufferGeometry, bone: number) {
  const n = g.attributes.position.count
  const index = new Uint16Array(n * 4)
  const weight = new Float32Array(n * 4)
  for (let i = 0; i < n; i++) {
    index[i * 4] = bone
    weight[i * 4] = 1
  }
  g.setAttribute('skinIndex', new Uint16BufferAttribute(index, 4))
  g.setAttribute('skinWeight', new Float32BufferAttribute(weight, 4))
  return g
}

/** The head sphere (slightly squashed like the original), in model space. */
function headSphere(w: number, h: number, withUv: boolean) {
  const g = new SphereGeometry(HEAD_R, w, h)
  g.scale(1.04, 0.95, 0.98)
  g.translate(0, HEAD_Y, 0)
  if (!withUv) g.deleteAttribute('uv')
  return g
}

/** All parts merged into one geometry; `withHead` adds the head sphere (outline only). */
function buildGeometry(o: Outfit, carry: Carry, k: number, withHead: boolean, headSeg: [number, number] = [14, 10]): BufferGeometry {
  const parts = bodyParts(o, carry, k).map(([bone, shapes]) => skinTo(buildShapes([{ group: simplify(shapes, k), at: BIND[bone] }]), bone))
  // Arms and legs: one tube each, skinned to both bones (soft elbows and knees).
  for (const limb of limbGeometries(o, k)) parts.push(limb.clone())
  if (withHead) {
    const head = headSphere(headSeg[0], headSeg[1], false).toNonIndexed()
    head.deleteAttribute('uv')
    // Shapes geometries carry colours; the outline ignores them but merging needs the same attributes.
    head.setAttribute('color', new Float32BufferAttribute(new Float32Array(head.attributes.position.count * 3), 3))
    parts.push(skinTo(head, B.head))
  }
  const merged = mergeGeometries(parts, false)
  for (const p of parts) p.dispose()
  if (!merged) throw new Error('ChibiModel: failed to merge body parts')
  return merged
}

// Same outfit (by value) = same geometries, shared by every character wearing it.
type ChibiGeometries = { body: BufferGeometry; face: BufferGeometry; outline: BufferGeometry; silhouette: BufferGeometry | null }
const geometryCache = new Map<string, ChibiGeometries>()
function chibiGeometry(key: string, o: Outfit, carry: Carry, detail: ChibiDetail, silhouette: boolean) {
  let g = geometryCache.get(key)
  if (!g) {
    const k = DETAIL[detail]
    const headSeg: [number, number] = detail === 'high' ? [40, 28] : [26, 18]
    g = {
      body: buildGeometry(o, carry, k, false),
      face: skinTo(headSphere(headSeg[0], headSeg[1], true), B.head),
      outline: buildGeometry(o, carry, OUTLINE_DETAIL, true),
      // Exactly the visible surface (same detail, same head) so it never shows on itself.
      silhouette: silhouette ? buildGeometry(o, carry, k, true, headSeg) : null,
    }
    geometryCache.set(key, g)
  }
  return g
}

/** Painted face for an outfit (open / closed eyes). */
function faces(o: Outfit): { open: Texture; closed: Texture } {
  const spec = {
    skin: o.skin,
    eyes: o.eye ?? DEFAULT_EYES,
    expression: o.expression ?? 'neutral',
    lashes: o.lashes ?? false,
    blush: true,
    browColor: lightness(o.hair, -0.05),
  }
  return { open: faceTexture(spec, false), closed: faceTexture(spec, true) }
}

function createRig(geo: ChibiGeometries, o: Outfit) {
  const bones = BIND.map((_, i) => {
    const bone = new Bone()
    const p = PARENT[i]
    const from = p < 0 ? [0, 0, 0] : BIND[p]
    bone.position.set(BIND[i][0] - from[0], BIND[i][1] - from[1], BIND[i][2] - from[2])
    return bone
  })
  bones.forEach((bone, i) => {
    if (PARENT[i] >= 0) bones[PARENT[i]].add(bone)
  })
  const skeleton = new Skeleton(bones)
  const tex = faces(o)
  const faceMaterial = makeFaceMaterial(tex.open)
  const group = new Group()
  group.add(bones[0])
  // The bones must have their world matrices before binding (bind() reads them for the inverses).
  group.updateMatrixWorld(true)
  // Poses move the body around (sitting, riding): cull with a generous fixed sphere.
  const bounds = new Sphere(new Vector3(0, 0.85, 0), 1.6)
  const make = (g: BufferGeometry, material: Material, shadow: boolean) => {
    const mesh = new SkinnedMesh(g, material)
    mesh.bind(skeleton)
    mesh.castShadow = shadow
    mesh.receiveShadow = false
    mesh.boundingSphere = bounds
    group.add(mesh)
    return mesh
  }
  // Fabric prints (1.23): an own material only when the outfit wears one.
  const prints = outfitPrints(o)
  const printMaterial = prints.top || prints.bottom ? makePrintMaterial(prints.top, prints.bottom) : null
  const body = make(geo.body, printMaterial ?? toonBodyMaterial, true)
  make(geo.face, faceMaterial, false)
  const outline = make(geo.outline, outlineMaterial, false)
  // Seen through walls/trees: drawn last, only where something is in front of the character.
  if (geo.silhouette) make(geo.silhouette, silhouetteMaterial, false).renderOrder = 20
  return { group, body, outline, bones, skeleton, faceMaterial, printMaterial, faces: tex }
}

// --- Two-bone inverse kinematics (allocation-free) -------------------------------------
const DOWN = new Vector3(0, -1, 0)
const _dir = new Vector3()
const _perp = new Vector3()
const _elbow = new Vector3()
const _v = new Vector3()
const _target = new Vector3()
const _q1 = new Quaternion()
const _q2 = new Quaternion()
const _qi = new Quaternion()
const POLE_ARM_L = new Vector3(0.45, -0.8, -0.4).normalize()
const POLE_ARM_R = new Vector3(-0.45, -0.8, -0.4).normalize()
const POLE_LEG_L = new Vector3(0.25, 0.3, 1).normalize()
const POLE_LEG_R = new Vector3(-0.25, 0.3, 1).normalize()

/**
 * Bend a two-segment limb so its end reaches `target` (in the space of the upper bone's
 * parent), blended over the current pose by `weight`. `pole` is where the joint points.
 */
function solveLimb(upper: Bone, lower: Bone, target: Vector3, a: number, b: number, pole: Vector3, weight: number) {
  if (weight < 0.002) return
  _dir.subVectors(target, upper.position)
  const len = _dir.length() || 1e-4
  const d = Math.min(Math.max(len, Math.abs(a - b) + 0.01), a + b - 0.002)
  _dir.divideScalar(len)
  const angle = Math.acos(Math.min(1, Math.max(-1, (a * a + d * d - b * b) / (2 * a * d))))
  _perp.copy(pole).addScaledVector(_dir, -pole.dot(_dir))
  if (_perp.lengthSq() < 1e-6) _perp.set(0, 0, 1)
  _perp.normalize()
  _elbow.copy(_dir).multiplyScalar(Math.cos(angle)).addScaledVector(_perp, Math.sin(angle))
  _q1.setFromUnitVectors(DOWN, _elbow)
  _v.copy(_dir).multiplyScalar(d).addScaledVector(_elbow, -a).normalize()
  _v.applyQuaternion(_qi.copy(_q1).invert())
  _q2.setFromUnitVectors(DOWN, _v)
  upper.quaternion.slerp(_q1, weight)
  lower.quaternion.slerp(_q2, weight)
}

/** A point given in model space → the root bone's local space (root moves up and leans). */
function toRoot(out: Vector3, x: number, y: number, z: number, rootY: number, lean: number) {
  const c = Math.cos(-lean)
  const s = Math.sin(-lean)
  const py = y - rootY
  return out.set(x, py * c - z * s, py * s + z * c)
}

export interface ChibiModelProps {
  motion: RefObject<MotionState>
  outfit?: Outfit
  /** Carried object attached to the body. */
  carry?: Carry
  /** Mesh detail: "high" only for the local player (see DETAIL). */
  detail?: ChibiDetail
  /** Show a silhouette when hidden behind something (the local player). */
  silhouette?: boolean
}

export function ChibiModel({ motion, outfit = PLAYER_OUTFIT, carry = null, detail = 'low', silhouette = false }: ChibiModelProps) {
  const key = `${JSON.stringify(outfit)}|${carry ?? ''}|${detail}|${silhouette}`
  const rig = useMemo(
    () => createRig(chibiGeometry(key, outfit, carry, detail, silhouette), outfit),
    // The key describes the outfit by value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  )
  useEffect(
    () => () => {
      rig.skeleton.dispose()
      rig.faceMaterial.dispose()
      rig.printMaterial?.dispose()
    },
    [rig],
  )

  const anim = useRef({
    walkPhase: 0,
    time: Math.random() * 10,
    nextBlink: 2.5,
    blinkT: -1,
    sit: 0,
    ride: 0,
    sip: 0,
    fan: 0,
    arms: 0,
    kick: 0,
    anchors: RIDES.motorbike as RideAnchors,
    frame: Math.floor(Math.random() * 3),
    owed: 0,
  })

  useFrame(({ camera }, rawDt) => {
    const a = anim.current
    if (!shown(rig.group)) return
    // The ink outline only matters up close (far away it is thinner than a pixel).
    rig.group.getWorldPosition(_world)
    const d2 = _world.distanceToSquared(camera.position)
    rig.outline.visible = d2 < OUTLINE_RANGE_SQ
    a.owed += rawDt
    if (d2 > FAR_SQ && ++a.frame % 3 !== 0) return
    const dt = Math.min(a.owed, 0.1)
    a.owed = 0
    const m = motion.current
    const bone = rig.bones
    const s = m?.speed ?? 0
    const riding = m?.ride ? RIDES[m.ride] : null
    if (riding) a.anchors = riding
    a.time += dt
    a.walkPhase += dt * (4 + 9 * s)
    a.ride = damp(a.ride, riding ? 1 : 0, 10, dt)
    a.sit = damp(a.sit, riding ? 1 : (m?.sit ?? 0), 10, dt)
    a.sip = damp(a.sip, m?.sip ?? 0, 7, dt)
    a.fan = damp(a.fan, m?.fan ?? 0, 6, dt)
    a.arms = damp(a.arms, m?.arms ?? 0, 8, dt)
    a.kick = damp(a.kick, m?.kick ?? 0, 18, dt)
    const seatY = riding ? riding.seatY : (m?.seatY ?? STOOL_Y)

    const stand = 1 - a.sit
    const sin = Math.sin(a.walkPhase)
    // Running (s > 1): longer, faster strides, capped so legs stay plausible.
    const swing = sin * 0.75 * Math.min(s, 1.4) * stand
    const bounce = Math.abs(sin) * 0.07 * s * stand
    const breathe = Math.sin(a.time * 2.4) * Math.max(0, 1 - s)

    // Body: bounce while walking, drop onto the seat, lean
    const rootY = bounce + (seatY - HIP_Y) * a.sit
    const lean = 0.1 * s * stand - 0.06 * a.sit * (1 - a.ride) + a.anchors.lean * a.ride
    bone[B.root].position.y = rootY
    bone[B.root].rotation.x = lean

    // Legs: swing from the hip, knees bend on the lifting leg and when seated
    const kneeSit = 1.3 * a.sit
    bone[B.thighL].rotation.set(swing - 1.4 * a.sit - 1.5 * a.kick, 0, 0)
    bone[B.thighR].rotation.set(-swing - 1.4 * a.sit, 0, 0)
    bone[B.shinL].rotation.set((Math.max(0, Math.sin(a.walkPhase + 1.1)) * 0.9 * s * stand + kneeSit) * (1 - a.kick), 0, 0)
    bone[B.shinR].rotation.set(Math.max(0, Math.sin(a.walkPhase + 1.1 + Math.PI)) * 0.9 * s * stand + kneeSit, 0, 0)

    // Arms: swing opposite to the legs with a soft elbow
    const forward = 1 - a.arms
    let rxR = swing * 0.9 * forward - 1.0 * a.arms
    let rzR = -0.22
    let elbowR = -(0.2 + 0.3 * s) - 0.55 * a.arms
    rxR += (-1.0 - rxR) * a.fan
    elbowR += (-1.0 - elbowR) * a.fan
    rzR += a.fan * (0.1 + Math.sin(a.time * 11) * 0.3)
    bone[B.armL].rotation.set(-swing * 0.9 * forward - 1.0 * a.arms, 0, 0.22)
    bone[B.foreL].rotation.set(-(0.2 + 0.3 * s) - 0.55 * a.arms, 0, 0)
    bone[B.armR].rotation.set(rxR, 0, rzR)
    bone[B.foreR].rotation.set(elbowR, 0, 0)

    // Riding: hands on the grips, feet on the footrests / turning the pedals
    if (a.ride > 0.002) {
      const r = a.anchors
      const [gx, gy, gz] = r.grip
      solveLimb(bone[B.armL], bone[B.foreL], toRoot(_target, gx, gy, gz, rootY, lean), UPPER, FORE, POLE_ARM_L, a.ride)
      solveLimb(bone[B.armR], bone[B.foreR], toRoot(_target, -gx, gy, gz, rootY, lean), UPPER, FORE, POLE_ARM_R, a.ride)
      const pr = r.pedalRadius ?? 0
      const phase = m?.pedal ?? 0
      const [fx, fy, fz] = r.foot
      solveLimb(bone[B.thighL], bone[B.shinL], toRoot(_target, fx, fy + Math.sin(phase) * pr, fz + Math.cos(phase) * pr, rootY, lean), THIGH, SHIN, POLE_LEG_L, a.ride)
      solveLimb(bone[B.thighR], bone[B.shinR], toRoot(_target, -fx, fy - Math.sin(phase) * pr, fz - Math.cos(phase) * pr, rootY, lean), THIGH, SHIN, POLE_LEG_R, a.ride)
    }
    // Drinking: the right hand comes up under the chin
    if (a.sip > 0.002) solveLimb(bone[B.armR], bone[B.foreR], _target.set(-0.1, 0.74, 0.3), UPPER, FORE, POLE_ARM_R, a.sip)

    // Held things stay upright whatever the arm does; the glass tips toward the mouth.
    _qi.copy(bone[B.armR].quaternion).multiply(bone[B.foreR].quaternion).invert()
    const glass = bone[B.glass]
    glass.quaternion.copy(_qi).multiply(_q2.setFromAxisAngle(_v.set(1, 0, 0), -0.75 * a.sip))
    glass.scale.setScalar(m?.held === 'glass' ? 1 : 0.0001)
    const fan = bone[B.fan]
    fan.quaternion.copy(_qi)
    fan.scale.setScalar(m?.held === 'fan' ? 1 : 0.0001)

    bone[B.torso].scale.set(1 - breathe * 0.01, 1 + breathe * 0.025, 1)
    const head = bone[B.head]
    head.position.y = HEAD_Y + breathe * 0.012
    head.rotation.z = sin * 0.06 * s * stand + Math.sin(a.time * 1.1) * 0.035 * (1 - s)
    head.rotation.x = -0.15 * a.sip - a.anchors.lean * 0.7 * a.ride

    // Blink every few seconds (swap the painted face for the closed-eyes one)
    if (a.blinkT < 0 && a.time > a.nextBlink) {
      a.blinkT = 0
      rig.faceMaterial.map = rig.faces.closed
    }
    if (a.blinkT >= 0) {
      a.blinkT += dt
      if (a.blinkT > 0.13) {
        a.blinkT = -1
        a.nextBlink = a.time + 2 + Math.random() * 3.5
        rig.faceMaterial.map = rig.faces.open
      }
    }
  })

  return <primitive object={rig.group} />
}
