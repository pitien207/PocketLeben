import type { JSX, SVGProps } from 'react'
import { ICON3D } from './Icon3d'
import type { ItemIconName } from '../data/items'

/** Original food & drink icons (referenced by name from data/items.ts). */

type Props = SVGProps<SVGSVGElement>
const INK = '#5b4636'

function Base({ children, ...props }: Props) {
  return (
    <svg viewBox="0 0 32 32" width="1em" height="1em" aria-hidden="true" strokeLinejoin="round" strokeLinecap="round" {...props}>
      {children}
    </svg>
  )
}

function BanhMi(props: Props) {
  return (
    <Base {...props}>
      <path d="M4 19c0-5 6-10 14-11 6-1 10 2 10 5 0 5-7 11-15 12-6 .7-9-2-9-6z" fill="#f2b45c" stroke={INK} strokeWidth="2" />
      <path d="M10 14l3 2M15 11.5l3 2M20 10l3 2" stroke="#c97b2b" strokeWidth="2" />
      <path d="M7 21c4 1 11-1 16-6" fill="none" stroke="#7fc27a" strokeWidth="2.4" />
      <path d="M8 22.5c4 .5 9-1 13-4" fill="none" stroke="#e05a4a" strokeWidth="2" />
    </Base>
  )
}

function TraDa(props: Props) {
  return (
    <Base {...props}>
      <path d="M8 7h16l-2 19a2 2 0 0 1-2 1.8h-8A2 2 0 0 1 10 26z" fill="#e8f4f8" stroke={INK} strokeWidth="2" />
      <path d="M9.2 13h13.6l-1.5 13a1.5 1.5 0 0 1-1.5 1.3h-7.6A1.5 1.5 0 0 1 10.7 26z" fill="#d8a24e" />
      <rect x="12" y="14.5" width="4" height="4" rx="1" fill="#ffffff" opacity="0.8" />
      <rect x="16.5" y="17" width="4" height="4" rx="1" fill="#ffffff" opacity="0.8" />
    </Base>
  )
}

function MiGoi(props: Props) {
  return (
    <Base {...props}>
      <path d="M5 8l2-3h18l2 3-1 16 1 3H5l1-3z" fill="#f7c948" stroke={INK} strokeWidth="2" />
      <circle cx="16" cy="16" r="6" fill="#fff6e3" stroke={INK} strokeWidth="1.6" />
      <path d="M12.5 15c1-1 2 1 3.5 0s2.5 1 3.5 0M12.5 18c1-1 2 1 3.5 0s2.5 1 3.5 0" fill="none" stroke="#d4473b" strokeWidth="1.4" />
    </Base>
  )
}

function BanhBao(props: Props) {
  return (
    <Base {...props}>
      <path d="M5 21c0-7 5-13 11-13s11 6 11 13c0 3-5 5-11 5S5 24 5 21z" fill="#fffaf0" stroke={INK} strokeWidth="2" />
      <path d="M16 8c-1 3-1 5 0 7M12 10c0 3 1 5 3 6M20 10c0 3-1 5-3 6" fill="none" stroke="#e6d6b8" strokeWidth="1.6" />
      <circle cx="16" cy="9" r="1.6" fill="#d4473b" />
    </Base>
  )
}

function Xoi(props: Props) {
  return (
    <Base {...props}>
      <path d="M3 19l13-12 13 12-13 9z" fill="#7fc27a" stroke={INK} strokeWidth="2" />
      <ellipse cx="16" cy="18" rx="8" ry="5" fill="#fff3c4" stroke={INK} strokeWidth="1.6" />
      <circle cx="13" cy="17" r="1.2" fill="#e8b84a" />
      <circle cx="17" cy="16" r="1.2" fill="#e8b84a" />
      <circle cx="19" cy="19" r="1.2" fill="#e8b84a" />
    </Base>
  )
}

function NuocMia(props: Props) {
  return (
    <Base {...props}>
      <path d="M9 9h14l-1.8 18a2 2 0 0 1-2 1.8h-6.4a2 2 0 0 1-2-1.8z" fill="#e9f5d0" stroke={INK} strokeWidth="2" />
      <path d="M10 14h12l-1.3 13a1.5 1.5 0 0 1-1.5 1.3h-6.4a1.5 1.5 0 0 1-1.5-1.3z" fill="#b8d96a" />
      <path d="M18 3l-2 11" stroke="#d4473b" strokeWidth="2.2" />
      <path d="M22 5l3-2" stroke="#7fc27a" strokeWidth="2.4" />
    </Base>
  )
}

function TangLuc(props: Props) {
  return (
    <Base {...props}>
      <rect x="9" y="4" width="14" height="24" rx="3" fill="#d4473b" stroke={INK} strokeWidth="2" />
      <path d="M9 9h14M9 23h14" stroke="#9e2f27" strokeWidth="2" />
      <path d="M17 11l-4 6h3l-1 5 4-6h-3z" fill="#ffe08a" />
    </Base>
  )
}

function Broetchen(props: Props) {
  return (
    <Base {...props}>
      <ellipse cx="16" cy="18" rx="12" ry="8" fill="#e8a25a" stroke={INK} strokeWidth="2" />
      <path d="M10 15c4 3 8 3 12 0" fill="none" stroke="#b9732f" strokeWidth="2" />
      <circle cx="12" cy="20" r="0.8" fill="#fff6e3" />
      <circle cx="17" cy="21" r="0.8" fill="#fff6e3" />
      <circle cx="21" cy="19" r="0.8" fill="#fff6e3" />
    </Base>
  )
}

function Brezel(props: Props) {
  return (
    <Base {...props}>
      <path d="M8 22c-5-4-3-14 4-12 3 1 4 5 4 8 0-3 1-7 4-8 7-2 9 8 4 12-3 3-8 2-8-2 0 4-5 5-8 2z" fill="none" stroke="#a8622a" strokeWidth="4" strokeLinejoin="round" />
      <circle cx="11" cy="14" r="0.9" fill="#ffffff" />
      <circle cx="21" cy="14" r="0.9" fill="#ffffff" />
      <circle cx="16" cy="21" r="0.9" fill="#ffffff" />
    </Base>
  )
}

function Doener(props: Props) {
  return (
    <Base {...props}>
      <path d="M6 10c0-4 20-4 20 0l-4 18H10z" fill="#f2c27a" stroke={INK} strokeWidth="2" />
      <path d="M8 11c4 2 12 2 16 0" fill="none" stroke="#a8622a" strokeWidth="3" />
      <path d="M9 15h14" stroke="#7fc27a" strokeWidth="2.4" />
      <path d="M10 18h12" stroke="#e05a4a" strokeWidth="2" />
    </Base>
  )
}

function Schorle(props: Props) {
  return (
    <Base {...props}>
      <path d="M12 3h8v5l3 4v15a2 2 0 0 1-2 2H11a2 2 0 0 1-2-2V12l3-4z" fill="#f6d27a" stroke={INK} strokeWidth="2" />
      <rect x="10" y="15" width="12" height="7" rx="1" fill="#7fc27a" />
      <circle cx="16" cy="18.5" r="2" fill="#e05a4a" />
    </Base>
  )
}

function Kaffee(props: Props) {
  return (
    <Base {...props}>
      <path d="M9 9h14l-2 19H11z" fill="#fff6e3" stroke={INK} strokeWidth="2" />
      <rect x="8" y="6" width="16" height="4" rx="1.5" fill="#c97b4a" stroke={INK} strokeWidth="1.6" />
      <path d="M10 16h12" stroke="#c97b4a" strokeWidth="4" />
    </Base>
  )
}

function Pizza(props: Props) {
  return (
    <Base {...props}>
      <path d="M16 4l12 22H4z" fill="#f6d27a" stroke={INK} strokeWidth="2" />
      <path d="M5 24h22" stroke="#c97b4a" strokeWidth="3" />
      <circle cx="16" cy="13" r="2" fill="#e05a4a" />
      <circle cx="12" cy="19" r="2" fill="#e05a4a" />
      <circle cx="20" cy="20" r="1.6" fill="#7fc27a" />
    </Base>
  )
}

function Kuchen(props: Props) {
  return (
    <Base {...props}>
      <path d="M5 14l22-6v14H5z" fill="#f6e4c0" stroke={INK} strokeWidth="2" />
      <path d="M5 14l22-6v4L5 18z" fill="#e8a25a" />
      <path d="M8 20h4M15 20h4M22 19h3" stroke="#c97b4a" strokeWidth="1.6" />
    </Base>
  )
}

/** A paper-wrapped bunch of white daisies (cúc họa mi, Hà Nội's early-winter flower). */
function Hoa(props: Props) {
  return (
    <Base {...props}>
      <path d="M9 16l7 13 7-13z" fill="#f6e4c0" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      {[[11, 10], [16, 7], [21, 10], [13.5, 14], [18.5, 14]].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="3.4" fill="#ffffff" stroke={INK} strokeWidth="1.2" />
          <circle cx={x} cy={y} r="1.3" fill="#f7c948" />
        </g>
      ))}
    </Base>
  )
}

const ICONS: Record<ItemIconName, (props: Props) => JSX.Element> = {
  trung: Trung,
  rau: Rau,
  hoa: Hoa,
  broetchen: Broetchen,
  brezel: Brezel,
  doener: Doener,
  schorle: Schorle,
  kaffee: Kaffee,
  pizza: Pizza,
  kuchen: Kuchen,
  banhMi: BanhMi,
  traDa: TraDa,
  miGoi: MiGoi,
  banhBao: BanhBao,
  xoi: Xoi,
  nuocMia: NuocMia,
  tangLuc: TangLuc,
  pho: Pho,
  rice: Rice,
  fishSauce: FishSauce,
  oil: Oil,
  che: Che,
  banhTrang: BanhTrang,
  kem: Kem,
  bunCha: BunCha,
  nemRan: NemRan,
  banhCuon: BanhCuon,
  lau: Lau,
  com: Com,
}

function Pho(props: Props) {
  return (
    <Base {...props}>
      <path d="M3.5 14h25a12.5 12.5 0 0 1-25 0z" fill="#ffffff" stroke={INK} strokeWidth="2" />
      <path d="M5.5 16.5h21" stroke="#2c5aa0" strokeWidth="1.6" />
      <ellipse cx="16" cy="14" rx="12.5" ry="2.6" fill="#e8b04a" stroke={INK} strokeWidth="1.6" />
      <path d="M9 13.5c2-1 3 1 5 0s3 1 5 0 3 1 4 0" fill="none" stroke="#fff6e3" strokeWidth="1.4" />
      <circle cx="11" cy="13.5" r="1.2" fill="#7fc27a" />
      <circle cx="20" cy="13" r="1.1" fill="#7fc27a" />
      <path d="M14 13l3-.6" stroke="#a85a3a" strokeWidth="2" />
      <path d="M21 4l-5 9M25 5l-6 8.5" stroke="#8e6844" strokeWidth="1.8" />
    </Base>
  )
}

function Rice(props: Props) {
  return (
    <Base {...props}>
      <path d="M8 8c0-2 3-3 8-3s8 1 8 3l1.5 17a3 3 0 0 1-3 3.2h-13A3 3 0 0 1 6.5 25z" fill="#f6f1e7" stroke={INK} strokeWidth="2" />
      <path d="M8 8.5c3 1.5 13 1.5 16 0" fill="none" stroke={INK} strokeWidth="1.6" />
      <rect x="10" y="14" width="12" height="8" rx="1.5" fill="#c8322b" />
      <path d="M13 18c1.5-2 4.5-2 6 0" fill="none" stroke="#ffe08a" strokeWidth="1.6" />
    </Base>
  )
}

function FishSauce(props: Props) {
  return (
    <Base {...props}>
      <path d="M13 3h6v5l3 4v15a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2V12l3-4z" fill="#d98a3a" stroke={INK} strokeWidth="2" />
      <rect x="12.5" y="2" width="7" height="3" rx="1" fill="#c8322b" stroke={INK} strokeWidth="1.4" />
      <rect x="11" y="15" width="10" height="8" rx="1" fill="#fff6e3" />
      <path d="M13 19.5c1.5-1.5 4-1.5 5.5 0l1.5-1v2l-1.5-1" fill="#2c5aa0" />
    </Base>
  )
}

function Oil(props: Props) {
  return (
    <Base {...props}>
      <rect x="10" y="10" width="12" height="18" rx="3" fill="#7fc27a" stroke={INK} strokeWidth="2" />
      <rect x="13" y="5" width="6" height="5" rx="1" fill="#3f7d5c" stroke={INK} strokeWidth="1.6" />
      <rect x="12" y="15" width="8" height="8" rx="1" fill="#ffffff" />
      <path d="M16 16.5v5M13.5 19h5" stroke="#c8322b" strokeWidth="2" />
    </Base>
  )
}

/** Glass of three-colour chè: red beans, green jelly, coconut milk, crushed ice. */
function Che(props: Props) {
  return (
    <Base {...props}>
      <path d="M9 6h14l-2 22H11z" fill="#f6fbff" stroke={INK} strokeWidth="2" />
      <path d="M10.6 22h10.8l-.5 5.5H11.1z" fill="#c8322b" />
      <path d="M10.2 16h11.6l-.5 6H10.7z" fill="#7cc27a" />
      <path d="M9.8 11h12.4l-.4 5H10.2z" fill="#fff3d6" />
      <path d="M17 3l3 9" stroke="#ff9fb2" strokeWidth="2" />
    </Base>
  )
}

/** Grilled rice paper folded in half, with egg and spring onion. */
function BanhTrang(props: Props) {
  return (
    <Base {...props}>
      <path d="M4 22a12 12 0 0 1 24 0z" fill="#f2c46d" stroke={INK} strokeWidth="2" />
      <path d="M8 21a8 8 0 0 1 16 0" fill="none" stroke="#e8a25a" strokeWidth="2.5" />
      <circle cx="12" cy="17" r="1.3" fill="#7cc27a" />
      <circle cx="18" cy="15" r="1.3" fill="#7cc27a" />
      <circle cx="21" cy="19" r="1.3" fill="#c8322b" />
      <path d="M3 22h26" stroke={INK} strokeWidth="2" />
    </Base>
  )
}

/** Ice cream on a stick / scoop in a cone. */
function Kem(props: Props) {
  return (
    <Base {...props}>
      <path d="M10 15l6 14 6-14z" fill="#e8b46b" stroke={INK} strokeWidth="2" />
      <path d="M12 18l6 3M11.5 21l7-3" stroke="#b98a64" strokeWidth="1.2" />
      <circle cx="16" cy="11" r="6" fill="#ffd1dc" stroke={INK} strokeWidth="2" />
      <circle cx="13" cy="9" r="1.4" fill="#ffffff" opacity="0.8" />
      <circle cx="18" cy="5" r="2" fill="#c8322b" stroke={INK} strokeWidth="1.4" />
    </Base>
  )
}

/**
 * 1.42 (user: "những UI tạo bằng khối thủ công thì tìm thư viện thay cho đẹp"): food and drink show Fluent Emoji 3D
 * pictures (MIT, ui/Icon3d.tsx); the hand-drawn SVGs below remain for Vietnamese dishes without a good match.
 */
const THREE_D: Partial<Record<ItemIconName, string>> = {
  trung: 'egg', rau: 'leafy-green', banhMi: 'baguette-bread', traDa: 'tumbler-glass', miGoi: 'bowl-with-spoon',
  banhBao: 'dumpling', nuocMia: 'tropical-drink', tangLuc: 'beverage-box', xoi: 'cooked-rice', broetchen: 'bread',
  brezel: 'pretzel', doener: 'stuffed-flatbread', schorle: 'cup-with-straw', kaffee: 'hot-beverage', pizza: 'pizza',
  kuchen: 'shortcake', hoa: 'bouquet', pho: 'steaming-bowl', rice: 'sheaf-of-rice', fishSauce: 'amphora',
  che: 'shaved-ice', banhTrang: 'rice-cracker', kem: 'soft-ice-cream', bunCha: 'meat-on-bone', nemRan: 'tamale',
  lau: 'pot-of-food', com: 'bento-box',
}

export function ItemIcon({ name, ...props }: Props & { name: ItemIconName }) {
  const file = THREE_D[name]
  const src = file ? ICON3D[file] : undefined
  if (src)
    return <img src={src} alt="" draggable={false} decoding="async" className={`pointer-events-none h-[1.15em] w-[1.15em] select-none drop-shadow-[0_1.5px_0_rgba(74,50,38,0.25)] ${props.className ?? ''}`} />
  const Icon = ICONS[name]
  return <Icon {...props} />
}

/** 1.40 Bún chả: a bowl of broth with grilled patties, a plate of white noodles beside it. */
function BunCha(props: Props) {
  return (
    <Base {...props}>
      <ellipse cx="11" cy="22" rx="8.5" ry="4.5" fill="#ffffff" stroke={INK} strokeWidth="1.8" />
      <path d="M5.5 21c2-2 4 0 5.5-1.5s3.5 1 5.5-.5" fill="none" stroke="#e9e2d4" strokeWidth="2.2" />
      <path d="M14 13h15a7.5 7.5 0 0 1-15 0z" fill="#ffffff" stroke={INK} strokeWidth="1.8" />
      <ellipse cx="21.5" cy="13" rx="7.5" ry="1.8" fill="#e8a25a" stroke={INK} strokeWidth="1.2" />
      <circle cx="19" cy="12.6" r="1.8" fill="#8a4a2a" />
      <circle cx="23.5" cy="12.4" r="1.6" fill="#9a5432" />
      <circle cx="26" cy="13.2" r=".9" fill="#7fc27a" />
    </Base>
  )
}

/** Nem rán: three golden spring rolls with a lettuce leaf. */
function NemRan(props: Props) {
  return (
    <Base {...props}>
      <path d="M4 20c4-6 12-9 20-8 3 .4 4 3 1 4.5L8 25c-3 1-6-1.5-4-5z" fill="#7fc27a" stroke={INK} strokeWidth="1.6" />
      {[0, 1, 2].map((i) => (
        <rect key={i} x={7 + i * 2} y={10 + i * 4} width="16" height="4.6" rx="2.3" transform={`rotate(-18 ${15 + i * 2} ${12 + i * 4})`} fill="#e8a243" stroke={INK} strokeWidth="1.5" />
      ))}
    </Base>
  )
}

/** Bánh cuốn: thin white rolls on a plate, slices of chả and fried shallots. */
function BanhCuon(props: Props) {
  return (
    <Base {...props}>
      <ellipse cx="16" cy="19" rx="13" ry="7" fill="#dfe8f2" stroke={INK} strokeWidth="1.8" />
      <rect x="6" y="13" width="15" height="5" rx="2.5" fill="#fbf8f2" stroke={INK} strokeWidth="1.4" />
      <rect x="8" y="17.5" width="15" height="5" rx="2.5" fill="#fbf8f2" stroke={INK} strokeWidth="1.4" />
      <circle cx="24.5" cy="15" r="2.6" fill="#f0d9a8" stroke={INK} strokeWidth="1.2" />
      <circle cx="10" cy="15.2" r=".8" fill="#c97b2b" />
      <circle cx="14" cy="19.6" r=".8" fill="#c97b2b" />
      <circle cx="18" cy="15" r=".7" fill="#7fc27a" />
    </Base>
  )
}

/** Lẩu: a hotpot on a little gas burner, red broth, a prawn and greens. */
function Lau(props: Props) {
  return (
    <Base {...props}>
      <rect x="7" y="24" width="18" height="4" rx="1.5" fill="#5d6170" stroke={INK} strokeWidth="1.6" />
      <path d="M4.5 12h23l-2 10a3 3 0 0 1-3 2.5H9.5a3 3 0 0 1-3-2.5z" fill="#b8bcc8" stroke={INK} strokeWidth="1.8" />
      <ellipse cx="16" cy="12" rx="11.5" ry="3" fill="#d4473b" stroke={INK} strokeWidth="1.4" />
      <path d="M10 11.5c1.5-2 4-2 5 0" fill="none" stroke="#f4a46b" strokeWidth="2" />
      <circle cx="20" cy="11.8" r="1.6" fill="#7fc27a" />
      <path d="M13 7c-1-1.5 1-2.5 0-4M18 7c-1-1.5 1-2.5 0-4" fill="none" stroke="#c9ced8" strokeWidth="1.4" />
    </Base>
  )
}

/** Cơm suất: a tray plate — rice, braised pork with egg, greens. */
function Com(props: Props) {
  return (
    <Base {...props}>
      <rect x="3" y="9" width="26" height="16" rx="3" fill="#dfe2e8" stroke={INK} strokeWidth="1.8" />
      <ellipse cx="11" cy="17" rx="6" ry="5" fill="#ffffff" stroke={INK} strokeWidth="1.2" />
      <rect x="18.5" y="11.5" width="8" height="5.5" rx="1.5" fill="#a85a3a" />
      <circle cx="22.5" cy="14.2" r="1.8" fill="#fff3d6" stroke="#e8a25a" strokeWidth="1" />
      <rect x="18.5" y="18" width="8" height="4.5" rx="1.5" fill="#7fc27a" />
    </Base>
  )
}

/** 1.42 Three brown eggs in a little straw nest. */
function Trung(props: Props) {
  return (
    <Base {...props}>
      <path d="M4 21c2 6 22 6 24 0" fill="#d9b25a" stroke={INK} strokeWidth="1.8" />
      <path d="M6 22.5l3 2M10 24l2.5 1.5M15 24.5v2M20 24l-2.5 1.5M25 22.5l-3 2" stroke="#a8802f" strokeWidth="1.2" />
      <ellipse cx="11" cy="17" rx="4.2" ry="5.4" fill="#f2d3a8" stroke={INK} strokeWidth="1.8" />
      <ellipse cx="21" cy="17" rx="4.2" ry="5.4" fill="#e8bf8a" stroke={INK} strokeWidth="1.8" />
      <ellipse cx="16" cy="12.5" rx="4.4" ry="5.6" fill="#fbe7cc" stroke={INK} strokeWidth="1.8" />
      <ellipse cx="14.6" cy="10.4" rx="1.2" ry="1.8" fill="#ffffff" opacity="0.8" />
    </Base>
  )
}

/** 1.42 A bunch of water spinach (rau muống) tied with a straw band. */
function Rau(props: Props) {
  return (
    <Base {...props}>
      <path d="M13 29l1-13M16 29V14M19 29l-1-13" stroke="#5f9c4a" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M14 16c-6-1-9-6-8-11 5 1 8 5 8 11z" fill="#7cc263" stroke={INK} strokeWidth="1.6" />
      <path d="M18 16c6-1 9-6 8-11-5 1-8 5-8 11z" fill="#6db85c" stroke={INK} strokeWidth="1.6" />
      <path d="M16 15c-3-4-3-9 0-12 3 3 3 8 0 12z" fill="#8fd06f" stroke={INK} strokeWidth="1.6" />
      <rect x="12" y="21" width="8" height="3" rx="1.2" fill="#e3c27a" stroke={INK} strokeWidth="1.4" />
    </Base>
  )
}
