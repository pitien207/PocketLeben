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

/**
 * A soft warm rim on the edges turning away from the camera (1.23): the chibis read rounder and
 * stand out from the street, like cel-shaded anime. Added to every toon material of a character.
 */
const RIM = /* glsl */ `
  float rimFacing = 1.0 - saturate( dot( normal, normalize( vViewPosition ) ) );
  outgoingLight += diffuseColor.rgb * smoothstep( 0.55, 1.0, rimFacing ) * 0.24;
  #include <opaque_fragment>`

function withRim<T extends MeshToonMaterial>(m: T, key: string): T {
  m.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', RIM)
  }
  m.customProgramCacheKey = () => key
  return m
}

/** Body, hair, clothes: one shared material (vertex colours), so a character stays cheap. */
export const toonBodyMaterial = marksStencil(withRim(new MeshToonMaterial({ vertexColors: true, gradientMap: GRADIENT }), 'vh-toon-rim'))

/** The face is a painted texture on the head sphere; one material per character (for blinking). */
export function makeFaceMaterial(map: Texture) {
  return marksStencil(withRim(new MeshToonMaterial({ map, gradientMap: GRADIENT }), 'vh-toon-rim'))
}

const PRINT_PARS = /* glsl */ `
uniform sampler2D printTopMap;
uniform vec3 printTopColor;
uniform float printTopSize;
uniform float printTopOn;
uniform sampler2D printBottomMap;
uniform vec3 printBottomColor;
uniform float printBottomSize;
uniform float printBottomOn;
varying vec3 vPrintPos;
varying vec3 vPrintNormal;
// Triplanar: the print is projected from the front, the side and the top of the bind pose and
// blended by the surface direction, so it wraps any garment without UVs.
vec4 printSample( sampler2D map, float size ) {
  vec3 w = pow( abs( normalize( vPrintNormal ) ), vec3( 4.0 ) );
  w /= max( w.x + w.y + w.z, 1e-4 );
  vec2 k = vec2( 1.0 / size );
  return texture2D( map, vPrintPos.zy * k ) * w.x + texture2D( map, vPrintPos.xz * k ) * w.y + texture2D( map, vPrintPos.xy * k ) * w.z;
}`

const PRINT_COLOR = /* glsl */ `
#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
  vec4 printTop = printSample( printTopMap, printTopSize );
  vec4 printBottom = printSample( printBottomMap, printBottomSize );
  float onTop = printTopOn * step( distance( vColor.rgb, printTopColor ), 0.004 );
  float onBottom = ( 1.0 - onTop ) * printBottomOn * step( distance( vColor.rgb, printBottomColor ), 0.004 );
  vec3 printBase = mix( vColor.rgb, printTop.rgb, printTop.a * onTop );
  printBase = mix( printBase, printBottom.rgb, printBottom.a * onBottom );
  diffuseColor *= vec4( printBase, vColor.a );
#endif`

export interface PrintUniform {
  map: Texture
  /** Garment colour (hex) the print covers. */
  under: string
  size: number
}

/**
 * Body material with fabric prints (1.23): one per printed outfit (the others share
 * toonBodyMaterial). All of them share one shader program; only the uniforms differ.
 */
export function makePrintMaterial(top: PrintUniform | null, bottom: PrintUniform | null) {
  const m = new MeshToonMaterial({ vertexColors: true, gradientMap: GRADIENT })
  const fallback = (top ?? bottom)?.map ?? null
  m.onBeforeCompile = (shader) => {
    shader.uniforms.printTopMap = { value: top?.map ?? fallback }
    shader.uniforms.printTopColor = { value: new Color(top?.under ?? '#000000') }
    shader.uniforms.printTopSize = { value: top?.size ?? 1 }
    shader.uniforms.printTopOn = { value: top ? 1 : 0 }
    shader.uniforms.printBottomMap = { value: bottom?.map ?? fallback }
    shader.uniforms.printBottomColor = { value: new Color(bottom?.under ?? '#000000') }
    shader.uniforms.printBottomSize = { value: bottom?.size ?? 1 }
    shader.uniforms.printBottomOn = { value: bottom ? 1 : 0 }
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vPrintPos;\nvarying vec3 vPrintNormal;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPrintPos = position;\nvPrintNormal = normal;')
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + PRINT_PARS)
      .replace('#include <color_fragment>', PRINT_COLOR)
      .replace('#include <opaque_fragment>', RIM)
  }
  m.customProgramCacheKey = () => 'vh-toon-print'
  return marksStencil(m)
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
