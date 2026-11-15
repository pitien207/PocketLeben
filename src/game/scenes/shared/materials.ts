import { MeshBasicMaterial, MeshLambertMaterial, Vector3, type Material } from 'three'

/**
 * Shared materials. Soft Lambert shading gives the clay/toy look (plan §2)
 * and is cheap on mobile GPUs. Colors come from vertex colors (see Shapes).
 */

/**
 * Near-lens fade: scene materials dither away fragments right in front of the camera.
 * (A player hidden behind poles, trees or roofs is drawn as a silhouette instead — see
 * ChibiModel.) The CameraRig still updates the target each frame.
 */
export const occlusion = {
  target: { value: new Vector3(0, -1000, 0) },
}

const OCCLUSION_FRAGMENT = /* glsl */ `
{
  // Only things almost touching the lens dissolve, so the camera never looks out of a wall.
  // A player hidden behind something shows as a silhouette instead (no see-through tube).
  // A clean cut (no dither): half-dissolved surfaces would make the player's silhouette flicker.
  if (length(vOccWorld - cameraPosition) < 2.6) discard;
}
`

function occlusionFade(shader: { uniforms: Record<string, { value: unknown }>; vertexShader: string; fragmentShader: string }) {
  shader.uniforms.uOccTarget = occlusion.target
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vOccWorld;')
    .replace(
      '#include <project_vertex>',
      '#include <project_vertex>\nvOccWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;',
    )
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', '#include <common>\nuniform vec3 uOccTarget;\nvarying vec3 vOccWorld;')
    .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>\n${OCCLUSION_FRAGMENT}`)
}

/** Opt a material into the see-through-occluder fade. */
export function withOcclusionFade<T extends Material>(material: T): T {
  material.onBeforeCompile = occlusionFade
  return material
}

/** Default for merged scene props and buildings. */
export const vertexColorMaterial = withOcclusionFade(new MeshLambertMaterial({ vertexColors: true }))

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
