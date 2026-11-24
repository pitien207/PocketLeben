import { useEffect, useMemo, useRef, useState, type Ref } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AnimationMixer,
  Box3,
  BufferAttribute,
  Color,
  LoopRepeat,
  MeshLambertMaterial,
  type AnimationAction,
  type AnimationClip,
  type BufferGeometry,
  type Group,
  type Material,
  type Mesh,
  type MeshStandardMaterial,
  type Object3D,
  type SkinnedMesh,
  type Texture,
  Vector3,
} from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import henUrl from '../../../assets/models/animals/hen.glb?url'
import chickUrl from '../../../assets/models/animals/chick.glb?url'
import catUrl from '../../../assets/models/animals/cat.glb?url'
import dogUrl from '../../../assets/models/animals/dog.glb?url'

/**
 * 1.42 Animals from libraries (user: "các con động vật … tìm thư viện trên mạng"), rigged and animated:
 * - hen + chick: Quaternius (CC0, via poly.pizza) — palette-atlas models; the atlas is baked into vertex colours at
 *   load so a variant can repaint the feathers (white, brown, black hen, the rooster);
 * - cat: Vuena "Free Low-Poly Animals" (CC0, github.com/Vuena/free-low-poly-animals-cc0) — painted texture, 512 px;
 * - dog: Quaternius Shiba Inu (Animals pack, CC0) — repainted as a yellow Vietnamese village dog.
 * Files: src/assets/models/animals (made by the scratchpad tool gt/animals.mjs: clips kept + renamed, LOD0 and
 * ORM maps dropped). One skinned mesh = one draw call per animal; clones share geometry per variant.
 */

export type AnimalKind = 'hen' | 'chick' | 'cat' | 'dog'
/** Short clip names (renamed by the tool): hen/chick idle, peck, run · cat idle, idle2, walk, eat, sit, sleep · dog idle, idle2, walk, eat. */
export type AnimalAction = 'idle' | 'idle2' | 'peck' | 'run' | 'walk' | 'eat' | 'sit' | 'sleep'

const URLS: Record<AnimalKind, string> = { hen: henUrl, chick: chickUrl, cat: catUrl, dog: dogUrl }
/** Height in the game (metres) and a turn so the model faces +z. */
const FIT: Record<AnimalKind, { height: number; yaw: number }> = {
  hen: { height: 0.5, yaw: 0 },
  chick: { height: 0.2, yaw: 0 },
  cat: { height: 0.36, yaw: 0 },
  dog: { height: 0.62, yaw: 0 },
}

/** Repaints: old colour → new colour, chosen by role ('body' = the most used colour of the model). */
export type AnimalVariant = 'white' | 'brown' | 'black' | 'rooster' | 'yellow' | 'default'
const VARIANT_BODY: Partial<Record<AnimalVariant, string>> = { white: '#f4efe4', brown: '#b8743c', black: '#3a3330', rooster: '#c8572e' }

interface Loaded {
  scene: Group
  clips: AnimationClip[]
  scale: number
}
const loading = new Map<AnimalKind, Promise<Loaded>>()
const loader = new GLTFLoader()

function lambertFrom(m: Material, vertexColors: boolean): MeshLambertMaterial {
  const std = m as MeshStandardMaterial
  return new MeshLambertMaterial({ map: vertexColors ? null : (std.map ?? null), color: vertexColors ? '#ffffff' : std.color, vertexColors, name: m.name })
}

/** Bake a palette atlas into vertex colours (the atlas is flat colour cells). */
function bakeAtlas(geo: BufferGeometry, tex: Texture) {
  const img = tex.image as CanvasImageSource & { width: number; height: number }
  const c = document.createElement('canvas')
  c.width = img.width
  c.height = img.height
  const g = c.getContext('2d', { willReadFrequently: true })!
  g.drawImage(img, 0, 0)
  const px = g.getImageData(0, 0, c.width, c.height).data
  const uv = geo.getAttribute('uv')
  const col = new Float32Array(uv.count * 3)
  const tmp = new Color()
  for (let i = 0; i < uv.count; i++) {
    const x = Math.min(c.width - 1, Math.max(0, Math.floor(uv.getX(i) * c.width)))
    const y = Math.min(c.height - 1, Math.max(0, Math.floor((tex.flipY ? 1 - uv.getY(i) : uv.getY(i)) * c.height)))
    const k = (y * c.width + x) * 4
    tmp.setRGB(px[k] / 255, px[k + 1] / 255, px[k + 2] / 255, 'srgb')
    col[i * 3] = tmp.r
    col[i * 3 + 1] = tmp.g
    col[i * 3 + 2] = tmp.b
  }
  geo.setAttribute('color', new BufferAttribute(col, 3))
}

export function loadAnimal(kind: AnimalKind): Promise<Loaded> {
  let p = loading.get(kind)
  if (!p) {
    p = loader.loadAsync(URLS[kind]).then((gltf) => {
      gltf.scene.traverse((o) => {
        const mesh = o as Mesh
        if (!mesh.isMesh) return
        mesh.castShadow = true
        mesh.frustumCulled = false
        const mat = mesh.material as MeshStandardMaterial
        const atlas = (kind === 'hen' || kind === 'chick') && mat.map
        if (atlas) bakeAtlas(mesh.geometry, mat.map!)
        mesh.material = lambertFrom(mat, !!atlas)
        if (kind === 'dog') {
          const m = mesh.material as MeshLambertMaterial
          if (m.name === 'Main') m.color.set('#d9a35a')
          if (m.name === 'Main_Light') m.color.set('#f4dfb4')
        }
      })
      gltf.scene.updateMatrixWorld(true)
      const size = new Box3().setFromObject(gltf.scene).getSize(new Vector3())
      return { scene: gltf.scene, clips: gltf.animations, scale: FIT[kind].height / Math.max(0.01, size.y) }
    })
    loading.set(kind, p)
  }
  return p
}
export const loadAnimals = (kinds: AnimalKind[]) => Promise.all(kinds.map(loadAnimal)).then(() => undefined)

/** Recoloured geometry per kind + variant (vertex-coloured models only). */
const variantGeo = new Map<string, BufferGeometry>()
function recolour(kind: AnimalKind, variant: AnimalVariant, geo: BufferGeometry): BufferGeometry {
  const to = VARIANT_BODY[variant]
  const col = geo.getAttribute('color') as BufferAttribute | undefined
  if (!to || !col) return geo
  const cacheKey = `${kind}|${variant}|${geo.uuid}`
  let g = variantGeo.get(cacheKey)
  if (g) return g
  // the body = the colour covering the largest surface (by triangle area, not vertex count: small parts are dense)
  const key = (i: number) => `${col.getX(i).toFixed(3)},${col.getY(i).toFixed(3)},${col.getZ(i).toFixed(3)}`
  const counts = new Map<string, number>()
  const pos = geo.getAttribute('position')
  const index = geo.getIndex()
  const tri = index ? index.count / 3 : pos.count / 3
  const va = new Vector3()
  const vb = new Vector3()
  const vc = new Vector3()
  for (let t = 0; t < tri; t++) {
    const [i0, i1, i2] = index ? [index.getX(t * 3), index.getX(t * 3 + 1), index.getX(t * 3 + 2)] : [t * 3, t * 3 + 1, t * 3 + 2]
    va.fromBufferAttribute(pos, i0)
    vb.fromBufferAttribute(pos, i1).sub(va)
    vc.fromBufferAttribute(pos, i2).sub(va)
    const area = vb.cross(vc).length()
    const k = key(i0)
    counts.set(k, (counts.get(k) ?? 0) + area)
  }
  const body = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0]
  const c = new Color(to)
  g = geo.clone()
  const out = g.getAttribute('color') as BufferAttribute
  for (let i = 0; i < out.count; i++) {
    if (key(i) === body) out.setXYZ(i, c.r, c.g, c.b)
  }
  variantGeo.set(cacheKey, g)
  return g
}

export interface AnimalProps {
  kind: AnimalKind
  variant?: AnimalVariant
  /** Clip to play (cross-fades when it changes). */
  action?: AnimalAction
  /** Playback speed of the clip. */
  speed?: number
  /** Extra size factor on top of the fitted height. */
  size?: number
  position?: [number, number, number]
  rotationY?: number
  /** The outer group (move it every frame from game logic). */
  groupRef?: Ref<Group>
}

export function Animal({ kind, variant = 'default', action = 'idle', speed = 1, size = 1, position, rotationY = 0, groupRef }: AnimalProps) {
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  useEffect(() => {
    let live = true
    loadAnimal(kind).then((l) => live && setLoaded(l))
    return () => {
      live = false
    }
  }, [kind])
  const inst = useMemo(() => {
    if (!loaded) return null
    const root = cloneSkinned(loaded.scene) as Object3D
    root.traverse((o) => {
      const m = o as SkinnedMesh
      if (m.isMesh) m.geometry = recolour(kind, variant, m.geometry)
    })
    const mixer = new AnimationMixer(root)
    const actions = new Map<string, AnimationAction>()
    for (const c of loaded.clips) actions.set(c.name, mixer.clipAction(c))
    return { root, mixer, actions }
  }, [loaded, kind, variant])

  const current = useRef<AnimationAction | null>(null)
  useEffect(() => {
    if (!inst) return
    const next = inst.actions.get(action) ?? inst.actions.get('idle') ?? [...inst.actions.values()][0]
    if (!next || next === current.current) return
    next.reset().setLoop(LoopRepeat, Infinity).play()
    // start each animal at its own point of the loop so a flock does not move in step
    if (!current.current) next.time = Math.random() * next.getClip().duration
    if (current.current) next.crossFadeFrom(current.current, 0.25, false)
    current.current = next
  }, [inst, action])
  useEffect(() => {
    if (current.current) current.current.timeScale = speed
  })
  useEffect(() => () => void inst?.mixer.stopAllAction(), [inst])
  useFrame((_, dt) => inst?.mixer.update(Math.min(dt, 0.05)))

  const k = (loaded?.scale ?? 1) * size
  return (
    <group ref={groupRef} position={position} rotation={[0, rotationY, 0]}>
      {inst && <primitive object={inst.root} scale={k} rotation={[0, FIT[kind].yaw, 0]} />}
    </group>
  )
}
