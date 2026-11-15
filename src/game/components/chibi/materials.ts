import { AlwaysStencilFunc, BackSide, Color, DataTexture, GreaterDepth, KeepStencilOp, MeshBasicMaterial, MeshToonMaterial, NearestFilter, NotEqualStencilFunc, RedFormat, ReplaceStencilOp, type Material, type Texture } from 'three'

/**
 * Toon look for characters (cel shading in three bands + a dark ink outline), after the
 * design in the user's chibi.js: MeshToonMaterial with a 3-step gradient, and an inverted
 * hull drawn in back faces, pushed out along the (skinned) normals.
 */

const GRADIENT = (() => {
  const t = new DataTexture(new Uint8Array([150, 205, 255]), 3, 1, RedFormat)
  t.minFilter = t.magFilter = NearestFilter
  t.generateMipmaps = false
  t.needsUpdate = true
  return t
})()

/**
 * Every character marks its pixels in the stencil buffer (1). The player's silhouette is then
 * drawn only where something else covers them — never over a character's own body.
 */
function marksStencil<T extends Material>(m: T): T {
  m.stencilWrite = true
  m.stencilRef = 1
  m.stencilFunc = AlwaysStencilFunc
  m.stencilZPass = ReplaceStencilOp
  return m
}

/** Body, hair, clothes: one shared material (vertex colours), so a character stays cheap. */
export const toonBodyMaterial = marksStencil(new MeshToonMaterial({ vertexColors: true, gradientMap: GRADIENT }))

/** The face is a painted texture on the head sphere; one material per character (for blinking). */
export function makeFaceMaterial(map: Texture) {
  return marksStencil(new MeshToonMaterial({ map, gradientMap: GRADIENT }))
}

const OUTLINE = '#3a2b2e'
/** Outline thickness in model units (the character is ~1.5 m tall). */
export const OUTLINE_THICKNESS = 0.013

/** Ink outline: back faces, pushed out along the skinned normal, flat colour. */
export const outlineMaterial = (() => {
  const m = new MeshBasicMaterial({ color: new Color(OUTLINE), side: BackSide })
  m.onBeforeCompile = (shader) => {
    shader.uniforms.outlineThickness = { value: OUTLINE_THICKNESS }
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float outlineThickness;')
      // objectNormal is skinned by now (MeshBasicMaterial computes it when skinning is on).
      .replace('#include <skinning_vertex>', '#include <skinning_vertex>\n#ifdef USE_SKINNING\ntransformed += normalize(objectNormal) * outlineThickness;\n#endif')
  }
  m.customProgramCacheKey = () => 'vh-outline'
  return marksStencil(m)
})()

/**
 * The player seen through things in front of them (trees, parasols, roofs): a soft flat
 * colour drawn where the body is behind something (GreaterDepth) and the pixel is not a
 * character's own (stencil ≠ 1) — so hidden inner parts of the model never show.
 */
export const silhouetteMaterial = new MeshBasicMaterial({
  color: new Color('#7fb2ff'),
  transparent: true,
  opacity: 0.38,
  depthWrite: false,
  depthFunc: GreaterDepth,
  stencilWrite: true,
  stencilRef: 1,
  stencilFunc: NotEqualStencilFunc,
  stencilFail: KeepStencilOp,
  stencilZFail: KeepStencilOp,
  stencilZPass: KeepStencilOp,
})
