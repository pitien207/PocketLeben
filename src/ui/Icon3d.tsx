/**
 * Cute 3D icons (1.25) from Microsoft's Fluent Emoji (MIT licence, github.com/microsoft/fluentui-emoji),
 * shrunk to 128 px WebP in src/assets/icons3d (file name = icon name, e.g. "bubble-tea").
 * Used by the job mini-games for food, vehicles, reactions and HUD details.
 */

const URLS = import.meta.glob('../assets/icons3d/*.webp', { query: '?url', import: 'default', eager: true }) as Record<string, string>

export const ICON3D: Record<string, string> = {}
for (const [path, url] of Object.entries(URLS)) ICON3D[path.split('/').pop()!.replace(/\.webp$/, '')] = url

/** An icon as an HTML image (null if the name is unknown). */
export function Icon3d({ name, className = 'h-6 w-6', alt = '' }: { name: string; className?: string; alt?: string }) {
  const src = ICON3D[name]
  if (!src) return null
  return <img src={src} alt={alt} draggable={false} decoding="async" className={`pointer-events-none select-none ${className}`} />
}

/** The same icon inside an <svg> (x, y = top-left corner). */
export function SvgIcon3d({ name, x, y, size, flip = false }: { name: string; x: number; y: number; size: number; flip?: boolean }) {
  const src = ICON3D[name]
  if (!src) return null
  return <image href={src} x={x} y={y} width={size} height={size} transform={flip ? `translate(${2 * x + size} 0) scale(-1 1)` : undefined} />
}
