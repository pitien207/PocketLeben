import { memo, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import type { NpcDef, Outfit } from '../../../data/npcs'
import { MUC_SIGHTS } from '../../../data/munich'
import { ActionSpot, type SpotAction } from '../../components/ActionSpot'
import { ActiveArea } from '../../components/ActiveArea'
import { ChibiModel, type MotionState } from '../../components/ChibiModel'
import { NPC, type NpcPath } from '../../components/npc/NPC'
import { CARS_DE, Traffic } from '../../components/npc/Traffic'
import { Tram } from './Tram'
import { playSfx } from '../../systems/audio'
import { playerState } from '../../systems/playerState'
import { useTime } from '../../../store/timeStore'
import { Shapes, type ShapeItem } from '../shared/Shapes'
import { GLOCKENSPIEL } from './landmarks'
import { BIERGARTEN_VM, CHIN_TURM, EISBACH, MAX_LANES, PRINZ_LANES, ROAD_WRAP } from './mucLayout'

/**
 * 1.44 Life in München: people walking and sitting (each district only while you are near it), the surfers on
 * the Eisbach, the Glockenspiel dancing at 11, 12 and 17 o'clock, traffic on Maximilian- and Prinzregentenstraße,
 * and the places you can use (sights, the S-Bahn at the station, the LMU door, shops, a Pfand machine).
 */

// --- people --------------------------------------------------------------------------------------
const LOOKS: Outfit[] = [
  { skin: '#fbe2d0', hair: '#e0b45e', hairStyle: 'ponytail', shirt: '#7fb8e8', shorts: '#3f4a6b', shoe: '#ffffff', bag: '#c4a074', accessory: null, top: 'jacket', bottom: 'pants', eye: '#4f86d9', lashes: true },
  { skin: '#f6d6c0', hair: '#6b4a32', hairStyle: 'short', shirt: '#3f7d5c', shorts: '#2f3440', shoe: '#5d4a3e', bag: null, accessory: null, top: 'long', bottom: 'pants', shoeType: 'loafer' },
  { skin: '#fbe2d0', hair: '#c97b4a', hairStyle: 'braid', shirt: '#ffffff', shorts: '#2f4f8f', shoe: '#5d4a3e', bag: null, accessory: null, top: 'dirndl', bottom: 'skirt', pattern: 'stripes', patternColor: '#d4473b', lashes: true, eye: '#5b8a6a' },
  { skin: '#f0c8a8', hair: '#3a2a26', hairStyle: 'buzz', shirt: '#efe0bd', shorts: '#7a5233', socks: '#efe6d8', shoeType: 'boot', shoe: '#4a3326', bag: null, accessory: 'tyrolean', top: 'long', pattern: 'stripes', patternColor: '#3f7fc8', bottom: 'lederhosen' },
  { skin: '#fbe2d0', hair: '#d9d6dc', hairStyle: 'bun', shirt: '#cdb8f0', shorts: '#5b6070', shoe: '#5b4038', bag: '#8a6a4a', accessory: 'glasses', top: 'cardigan', patternColor: '#ffffff', bottom: 'longSkirt', lashes: true },
  { skin: '#e8b994', hair: '#2a2020', hairStyle: 'curly', shirt: '#f4c04e', shorts: '#3f4a5c', shoe: '#ffffff', bag: '#2f4f8f', accessory: 'headphones', accent: '#2a2a30', top: 'hoodie', bottom: 'pants' },
  { skin: '#fbdcc4', hair: '#e8d08a', hairStyle: 'wavy', shirt: '#ff9fb2', shorts: '#f6efe0', shoe: '#d4473b', bag: null, accessory: 'sunglasses', top: 'tee', bottom: 'skirt', lashes: true },
  { skin: '#f6d6c0', hair: '#8a8a94', hairStyle: 'short', shirt: '#4a5a8a', shorts: '#2f3a4d', shoe: '#2f2f38', bag: '#3a2a26', accessory: null, top: 'jacket', bottom: 'pants', neck: 'tie', neckColor: '#c8322b', shoeType: 'loafer' },
  { skin: '#d9a07a', hair: '#1f1a1a', hairStyle: 'afro', shirt: '#5b8f6a', shorts: '#c9ad85', shoe: '#ffffff', bag: null, accessory: 'cap', accent: '#f4c04e', top: 'tee', bottom: 'shorts' },
  { skin: '#fbe2d0', hair: '#5a3a2c', hairStyle: 'halfUp', shirt: '#2f3a5a', shorts: '#c9ad85', shoe: '#ffffff', bag: null, accessory: 'beret', accent: '#c8322b', top: 'sweater', patternColor: '#ffffff', bottom: 'pants', lashes: true },
  { skin: '#f2cfb3', hair: '#2b2222', hairStyle: 'long', shirt: '#ffe08a', shorts: '#4f6fa8', shoe: '#ffffff', bag: '#e8dcc0', accessory: null, top: 'tee', bottom: 'overalls', lashes: true },
  { skin: '#f0c8a8', hair: '#b8a690', hairStyle: 'sideSwept', shirt: '#d4473b', shorts: '#2f3440', shoe: '#2a2626', bag: null, accessory: 'beanie', accent: '#2f4f8f', top: 'puffer', bottom: 'pants' },
]
const NAMES = ['Người đi đường', 'Du khách', 'Dân München', 'Sinh viên']
let looks = 0
const person = (id: string): NpcDef => {
  const i = looks++
  return { id: `muc-${id}`, name: { vi: NAMES[i % NAMES.length], en: 'Passer-by', de: 'Passant' }, outfit: LOOKS[i % LOOKS.length] }
}
const line = (a: [number, number], b: [number, number], pause: [number, number] = [0.5, 4]): NpcPath => ({ points: [{ x: a[0], z: a[1] }, { x: b[0], z: b[1] }], pauseSec: pause })
const loop = (pts: [number, number][]): NpcPath => ({ points: pts.map(([x, z]) => ({ x, z })), loop: true, pauseSec: [0.3, 2.5] })

interface Walker {
  def: NpcDef
  at: [number, number]
  path?: NpcPath
  yaw?: number
  seatY?: number
  sip?: boolean
}
const W = (id: string, path: NpcPath): Walker => ({ def: person(id), at: [path.points[0].x, path.points[0].z], path })
const S = (id: string, x: number, z: number, yaw: number, seatY = 0.45, sip = false): Walker => ({ def: person(id), at: [x, z], yaw, seatY, sip })

/** People per district; `when` decides when they exist (checked twice a second by ActiveArea). */
const CROWDS: { id: string; when: (x: number, z: number) => boolean; people: Walker[] }[] = [
  {
    id: 'station',
    when: (x, z) => x < -20 && z > -24,
    people: [W('hbf1', line([-70, -2.2], [-37, -2.2])), W('hbf2', line([-40, 0.6], [-68, 0.6])), W('sendl', line([-30.75, -3], [-30.75, -20]))],
  },
  {
    id: 'altstadt',
    when: (x, z) => x < 4 && z < -10 && z > -64,
    people: [
      W('fuzo1', line([-63, -29.6], [-36, -29.6])),
      W('fuzo2', line([-36, -27], [-63, -27])),
      W('fuzo3', line([-58, -24.6], [-40, -26])),
      W('mp1', loop([[-23.5, -26], [-14.5, -26], [-14.5, -40.5], [-23.5, -40.5]])),
      W('mp2', line([-28, -43.5], [-6, -43.5])),
      W('fk', line([-62, -34.5], [-38, -34.5])),
      S('mpCafe', -23.35, -23.6, -Math.PI / 2, 0.45, true),
      S('mpCafe2', -9.15, -23.6, Math.PI / 2, 0.45, true),
    ],
  },
  {
    id: 'markt',
    when: (x, z) => x > -6 && x < 46 && z < -8 && z > -64,
    people: [
      W('vm1', line([11.6, -20], [11.6, -46])),
      W('vm2', line([6, -47.5], [33, -47.5])),
      W('vm3', line([20, -20], [20, -30])),
      S('bg1', 26.0, -45.12, 0, 0.45, true),
      S('bg2', 27.0, -43.88, Math.PI, 0.45, true),
      S('bg3', 30.5, -42.12, 0, 0.45, true),
      S('bg4', 30.0, -40.88, Math.PI, 0.45),
    ],
  },
  {
    id: 'odeon',
    when: (_x, z) => z < -54 && z > -112,
    people: [
      W('od1', line([-54, -84], [-33, -95])),
      W('od2', line([-33, -78], [-54, -78])),
      W('hg1', loop([[-12, -79], [24, -79], [24, -95], [-12, -95]])),
      W('max1', line([-70, -59.5], [30, -59.5])),
      W('max2', line([30, -72.5], [-70, -72.5])),
      S('hgBench', -6, -82, 0),
    ],
  },
  {
    id: 'garten',
    when: (_x, z) => z < -100,
    people: [
      W('lu1', line([-40, -112], [-40, -140])),
      W('eg1', line([-30, -120.3], [30, -120.3])),
      W('eg2', line([10, -112], [10, -148])),
      W('eg3', line([-18.5, -132], [20, -132])),
      // on the benches of the first and fifth beer table round the tower (Munich.tsx garten(): radius 6.5, angle k/8·2π + 0.2)
      S('turm1', CHIN_TURM.x + 6.25, CHIN_TURM.z + 1.9, Math.PI - 0.2, 0.45, true),
      S('turm2', CHIN_TURM.x - 6.49, CHIN_TURM.z - 0.68, -Math.PI - 0.2, 0.45, true),
      S('picnic1', 26, -144, 0.4, 0.05),
      S('picnic2', 27.2, -143.2, -2.4, 0.05),
      S('wiese', -4, -146, 2.2, 0.05),
    ],
  },
  {
    id: 'isar',
    when: (x) => x > 30,
    people: [
      W('ip1', line([38, -12], [38, -55])),
      W('ip2', line([38, -78], [38, -96])),
      W('ip3', line([63.5, -15], [63.5, -55])),
      S('beach1', 44.2, -28, Math.PI / 2, 0.08),
      S('beach2', 44.6, -30, Math.PI / 2 + 0.3, 0.08),
      S('beach3', 44.0, -64, Math.PI / 2, 0.08),
      S('beach4', 60.3, -45, -Math.PI / 2, 0.08),
    ],
  },
]

const Crowd = memo(function Crowd({ people }: { people: Walker[] }) {
  return (
    <>
      {people.map((p) => (
        <NPC key={p.def.id} def={p.def} at={{ x: p.at[0], z: p.at[1] }} yaw={p.yaw ?? 0} path={p.path} seatY={p.seatY} activity={p.sip ? 'sip' : null} yieldLines="yieldDe" />
      ))}
    </>
  )
})

// --- surfers on the Eisbach wave ------------------------------------------------------------------
const BOARD: ShapeItem[] = [
  { box: [0.5, 0.06, 1.9], at: [0, 0.03, 0], color: '#f4c04e' },
  { box: [0.12, 0.065, 1.7], at: [0, 0.035, 0], color: '#d4473b' },
]
const SURFERS: Outfit[] = [
  { skin: '#f0c8a8', hair: '#e0b45e', hairStyle: 'spiky', shirt: '#1f1f24', shorts: '#1f1f24', shoe: '#1f1f24', bag: null, accessory: null, top: 'long', bottom: 'pants' },
  { skin: '#fbe2d0', hair: '#5a3a2c', hairStyle: 'ponytail', shirt: '#2f3a5a', shorts: '#2f3a5a', shoe: '#2f3a5a', bag: null, accessory: null, top: 'long', bottom: 'pants', lashes: true },
]

function Surfer({ i }: { i: number }) {
  const group = useRef<Group>(null)
  const motion = useRef<MotionState>({ speed: 0, arms: 0.7 })
  useFrame(({ clock }) => {
    const g = group.current
    if (!g) return
    const t = clock.elapsedTime * 0.8 + i * 2.7
    // ride left and right on the wave, carve, bob a little
    g.position.set(EISBACH.wave + 0.4 + Math.sin(t) * 1.3, 0.12 + Math.abs(Math.sin(t * 3.1)) * 0.06, (EISBACH.z0 + EISBACH.z1) / 2 + (i ? 0.7 : -0.6))
    g.rotation.set(0, Math.PI / 2 + Math.cos(t) * 0.5, Math.sin(t * 2) * 0.12)
  })
  return (
    <group ref={group}>
      <Shapes shapes={BOARD} castShadow={false} />
      <group position={[0, 0.06, 0]} rotation={[0, Math.PI / 2, 0]}>
        <ChibiModel motion={motion} outfit={SURFERS[i]} />
      </group>
    </group>
  )
}

// --- Glockenspiel ----------------------------------------------------------------------------------
/** 11:00, 12:00 and 17:00, for a quarter of an hour (1 game minute = 1 s). */
const SHOWS = [11 * 60, 12 * 60, 17 * 60]
const SHOW_LEN = 15
const FIGURE_COLORS = ['#d4473b', '#3f7fc8', '#f4c04e', '#3f7d5c', '#ffffff', '#8a5a32']
const figure = (c: string): ShapeItem[] => [
  { cyl: [0.16, 0.26, 0.75, 8], at: [0, 0.38, 0], color: c },
  { sphere: [0.16, 8, 6], at: [0, 0.9, 0], color: '#f0d8c0' },
  { cyl: [0.12, 0.17, 0.14, 8], at: [0, 1.08, 0], color: c === '#ffffff' ? '#3a3a40' : '#ffffff' },
]
const FIGURES = FIGURE_COLORS.map(figure)

function Glockenspiel() {
  const refs = useRef<(Group | null)[]>([])
  const st = useRef({ playing: false, phase: 0 })
  useFrame((_, dt) => {
    const m = useTime.getState().minutes
    const on = SHOWS.some((s) => m >= s && m < s + SHOW_LEN)
    const p = playerState.position
    if (on && !st.current.playing && Math.hypot(p.x - GLOCKENSPIEL.x, p.z - GLOCKENSPIEL.z) < 45) playSfx('bell')
    st.current.playing = on
    if (on) st.current.phase += dt * 0.9
    const ph = st.current.phase
    refs.current.forEach((g, k) => {
      if (!g) return
      const level = k < 6 ? 0 : 1
      const a = ph * (level ? -1 : 1) + (k % 6) * ((Math.PI * 2) / 6)
      g.position.set(GLOCKENSPIEL.x + Math.cos(a) * 2.3, GLOCKENSPIEL.y[level] - 1.1 + (on && level ? Math.abs(Math.sin(ph * 4 + k)) * 0.15 : 0), GLOCKENSPIEL.z + Math.sin(a) * 0.45)
      g.rotation.y = on ? ph * 3 + k : 0
    })
  })
  return (
    <>
      {[...FIGURES, ...FIGURES].map((f, k) => (
        <group key={k} ref={(g) => (refs.current[k] = g)}>
          <Shapes shapes={f} castShadow={false} />
        </group>
      ))}
    </>
  )
}

// --- places you can use ------------------------------------------------------------------------------
const LOOK = (id: string): SpotAction[] => [{ id: 'look', labelKey: 'action.lookAround', icon: 'sight', action: 'muc.sight', arg: id, primary: true }]
const SPOT_EXTRA: Record<string, SpotAction[]> = {
  hauptbahnhof: [
    { id: 'sbahn', labelKey: 'action.sbahnCare', icon: 'tram', action: 'de.tram', arg: 'careHome', primary: true },
    { id: 'uni', labelKey: 'action.tramUni', icon: 'tram', action: 'de.tram', arg: 'university', if: { any: [{ flag: 'visa.path', is: 'studium' }, { flag: 'talked.anna' }] } },
    { id: 'ticket', labelKey: 'action.buyTicket', icon: 'ticket', action: 'de.buyTicket', if: { not: { test: 'de.ticketValid' } } },
    { id: 'pfand', labelKey: 'action.pfandReturn', icon: 'bottle', action: 'de.pfandReturn', if: { test: 'pfand.carrying' } },
  ],
  hofbraeuhaus: [{ id: 'shop', labelKey: 'action.shop', icon: 'shop', action: 'de.openShop', arg: 'hofbraeuhaus', primary: true }],
  chinTurm: [{ id: 'shop', labelKey: 'action.shop', icon: 'shop', action: 'de.openShop', arg: 'biergarten', primary: true }],
  viktualienmarkt: [{ id: 'shop', labelKey: 'action.shop', icon: 'shop', action: 'de.openShop', arg: 'viktualienmarkt', primary: true }],
  lmu: [{ id: 'enter', labelKey: 'action.enterUni', icon: 'door', action: 'muc.walkUni', primary: true, if: { any: [{ flag: 'visa.path', is: 'studium' }, { flag: 'talked.anna' }] } }],
}
/** With a shop or a door the "look" button is the second one. */
const spotActions = (id: string): SpotAction[] => {
  const extra = SPOT_EXTRA[id]
  if (!extra) return LOOK(id)
  return [...extra, { ...LOOK(id)[0], primary: false }]
}

const Spots = memo(function Spots() {
  const spots = useMemo(() => MUC_SIGHTS.map((s) => ({ s, actions: spotActions(s.id) })), [])
  return (
    <>
      {spots.map(({ s, actions }) => (
        <ActionSpot key={s.id} id={`muc-${s.id}`} name={s.name} zone={s.zone} actions={actions} />
      ))}
      {/* a second Viktualienmarkt counter by the beer garden */}
      <ActionSpot id="muc-vm-bar" name={{ vi: 'Quầy vườn bia', en: 'Beer-garden bar', de: 'Biergarten-Ausschank' }} zone={{ x: 33, z: BIERGARTEN_VM.z1 + 0.2, halfX: 1.4, halfZ: 0.7 }} actions={[{ id: 'shop', labelKey: 'action.shop', icon: 'shop', action: 'de.openShop', arg: 'biergarten', primary: true }]} />
    </>
  )
})

// --- traffic --------------------------------------------------------------------------------------------
const nearMax = (_x: number, z: number) => z < -40 && z > -92
const nearPrinz = (_x: number, z: number) => z < -80 && z > -130
const nearSurf = (x: number, z: number) => z < -100 && x < 10
const nearRathaus = (x: number, z: number) => z < -10 && z > -70 && x < 20 && x > -60
const CROWD_WHEN = CROWDS.map((c) => c.when)

export const MunichLife = memo(function MunichLife() {
  return (
    <>
      <Spots />
      <ActiveArea when={nearMax}>
        <Traffic lanes={MAX_LANES} perLane={2} kinds={['car', 'bicycle', 'car', 'car']} wrapX={ROAD_WRAP} cars={CARS_DE} />
        {/* 1.48 Tram 19 */}
        <Tram />
      </ActiveArea>
      <ActiveArea when={nearPrinz}>
        <Traffic lanes={PRINZ_LANES} perLane={2} kinds={['car', 'car', 'bicycle']} wrapX={ROAD_WRAP} cars={CARS_DE} />
      </ActiveArea>
      <ActiveArea when={nearSurf}>
        <Surfer i={0} />
        <Surfer i={1} />
      </ActiveArea>
      <ActiveArea when={nearRathaus}>
        <Glockenspiel />
      </ActiveArea>
      {CROWDS.map((c, i) => (
        <ActiveArea key={c.id} when={CROWD_WHEN[i]}>
          <Crowd people={c.people} />
        </ActiveArea>
      ))}
    </>
  )
})

