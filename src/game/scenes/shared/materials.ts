import { Color, MeshBasicMaterial, MeshLambertMaterial, Vector3, type Material } from 'three'
import { fxUniforms } from '../../fx/fxState'

/**
 * Shared materials. Soft Lambert shading gives the clay/toy look (plan §2)
 * and is cheap on mobile GPUs. Colors come from vertex colors (see Shapes).
 */

/**
 * Occlusion (1.36, user: the camera must not zoom in at corners — fade what is in the way instead; 1.38: the screen-door
 * dither looked odd and sparkled on phones, so it is real translucency now):
 * - things close to the lens fade out smoothly (no hard cut that popped on and off);
 * - everything between the camera and the player inside a soft tube round the line of sight becomes see-through
 *   (alpha ~0.25): the lowest half metre above the player's feet stays solid, so a tree keeps its foot and its trunk /
 *   crown turn "mờ mờ", a wall keeps its base.
 * The scene materials are therefore `transparent` (alpha 1 everywhere else, depth still written) — they draw after
 * the opaque characters and the ground, which then show through the faded parts.
 * The CameraRig writes the target (the point the camera looks at) and the player's feet height every frame.
 */
export const occlusion = {
  target: { value: new Vector3(0, -1000, 0) },
  feet: { value: -1000 },
}

const OCCLUSION_FRAGMENT = /* glsl */ `
{
  float occAlpha = smoothstep(2.0, 3.2, length(vOccWorld - cameraPosition));
  vec3 occD = uOccTarget - cameraPosition;
  float occL2 = dot(occD, occD);
  if (occL2 > 4.0) {
    vec3 occCP = vOccWorld - cameraPosition;
    float occT = dot(occCP, occD) / occL2;
    if (occT > 0.0 && occT < 0.94) {
      float occR = length(occCP - occD * occT);
      float occRad = mix(0.8, 2.2, occT);
      float occFade = (1.0 - smoothstep(occRad * 0.55, occRad, occR)) * smoothstep(uOccFeet + 0.45, uOccFeet + 1.3, vOccWorld.y);
      occFade *= smoothstep(0.94, 0.84, occT);
      occAlpha *= 1.0 - occFade * 0.76;
    }
  }
  if (occAlpha < 0.02) discard;
  diffuseColor.a *= occAlpha;
}
`

function occlusionFade(shader: { uniforms: Record<string, { value: unknown }>; vertexShader: string; fragmentShader: string }) {
  shader.uniforms.uOccTarget = occlusion.target
  shader.uniforms.uOccFeet = occlusion.feet
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vOccWorld;')
    .replace(
      '#include <project_vertex>',
      '#include <project_vertex>\nvOccWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;',
    )
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', '#include <common>\nuniform vec3 uOccTarget;\nuniform float uOccFeet;\nvarying vec3 vOccWorld;')
    .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>\n${OCCLUSION_FRAGMENT}`)
}

/** Opt a material into the see-through-occluder fade. */
export function withOcclusionFade<T extends Material>(material: T): T {
  material.onBeforeCompile = occlusionFade
  material.transparent = true
  return material
}

/**
 * Window glass colours used by the house builders (TubeHouse, decorHouses, shop fronts). At night in the
 * fancy look (1.32) the fragments painted exactly one of these light up warm — per window cell some stay
 * dark — so no geometry changes. Keep panes painted with these exact colours.
 */
export const WINDOW_GLASS = ['#bfe6f2', '#5f7f8a', '#8fc4d8']

const WINDOW_FRAGMENT = /* glsl */ `
if (uNight > 0.001) {
  float win = 0.0;
  for (int i = 0; i < ${WINDOW_GLASS.length}; i++) win = max(win, 1.0 - step(0.012, distance(vColor.rgb, uWin[i])));
  if (win > 0.0) {
    vec3 cell = floor(vec3(vOccWorld.x / 2.1, vOccWorld.y / 2.6, vOccWorld.z / 2.1));
    float h = fract(sin(dot(cell, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
    float lit = step(0.3, h);
    vec3 warm = mix(vec3(1.0, 0.62, 0.3), vec3(1.0, 0.86, 0.58), fract(h * 9.7));
    outgoingLight = mix(outgoingLight, warm * (0.82 + 0.22 * fract(h * 3.1)), uNight * win * lit * 0.95);
  }
}
`

/** Default for merged scene props and buildings. */
export const vertexColorMaterial = new MeshLambertMaterial({ vertexColors: true, transparent: true })
const winColors = WINDOW_GLASS.map((c) => new Color(c))
vertexColorMaterial.onBeforeCompile = (shader) => {
  occlusionFade(shader)
  shader.uniforms.uNight = fxUniforms.uNight
  shader.uniforms.uWin = { value: winColors }
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', `#include <common>\nuniform float uNight;\nuniform vec3 uWin[${WINDOW_GLASS.length}];`)
    .replace('#include <opaque_fragment>', `${WINDOW_FRAGMENT}\n#include <opaque_fragment>`)
}
vertexColorMaterial.customProgramCacheKey = () => 'vh-scene-windows'

/** For ground-level geometry (roads, markings) that must never fade. */
export const groundMaterial = new MeshLambertMaterial({ vertexColors: true })

/** Never faded: characters and gameplay-critical props (e.g. the drink being made). */
export const solidMaterial = new MeshLambertMaterial({ vertexColors: true })

/**
 * Characters: never faded, with a soft rim light so they stand out from the scenery
 * (one shared material; works for skinned meshes).
 */
export const characterMaterial = new MeshLambertMaterial({ vertexColors: true })
characterMaterial.onBeforeCompile = (shader) => {
  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <opaque_fragment>',
    `float rim = pow(1.0 - clamp(dot(normalize(vViewPosition), normalize(normal)), 0.0, 1.0), 2.6);
    outgoingLight += diffuseColor.rgb * rim * 0.38;
    #include <opaque_fragment>`,
  )
}
characterMaterial.customProgramCacheKey = () => 'vh-character'

/** See-through glass (drawn after opaque objects, so what's inside stays visible). */
export const glassMaterial = new MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.38, depthWrite: false })

/** Writes nothing to the screen but still casts shadows — for cut-away roofs. */
export const shadowOnlyMaterial = new MeshBasicMaterial({ colorWrite: false, depthWrite: false })

/** Always drawn on top (markers floating over NPCs must never hide behind a parasol). */
export const overlayMaterial = new MeshBasicMaterial({ vertexColors: true, depthTest: false, depthWrite: false, transparent: true })

/** Unlit vertex colors — for things that "glow", like string-light bulbs. */
export const glowMaterial = withOcclusionFade(new MeshBasicMaterial({ vertexColors: true }))

const lambertCache = new Map<string, MeshLambertMaterial>()

/** Cached plain-color Lambert material (not faded; used for large ground planes). */
export function lambert(color: string): MeshLambertMaterial {
  let material = lambertCache.get(color)
  if (!material) {
    material = new MeshLambertMaterial({ color })
    lambertCache.set(color, material)
  }
  return material
}
