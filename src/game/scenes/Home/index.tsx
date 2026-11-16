import { memo, useMemo } from 'react'
import { NPCS } from '../../../data/npcs'
import { ActionSpot, type SpotAction } from '../../components/ActionSpot'
import { NPC } from '../../components/npc/NPC'
import { HOME_ROOM } from '../interiors'
import { TearCalendar, WallClock, WallFan } from '../shared/Decor'
import { PALETTE as P } from '../shared/palette'
import { motorbikeShapes, place, plantShapes } from '../shared/props'
import { Room, DOORMAT } from '../shared/Room'
import { Shapes, type ShapeItem } from '../shared/Shapes'
import { useFlags } from '../../../store/flagsStore'

/**
 * Home, the ground floor of the family's tube house in the lane: a wooden bed with a
 * rolled-up mosquito net, the study desk by the window, the family altar, a wooden
 * tea set where Bố reads the paper — and the motorbike parked indoors for the night.
 */

const { w: W, d: D, h: H } = HOME_ROOM
const BACK = -D / 2
const STYLE = { wall: '#f6dfa8', wallLow: '#ecc983', floor: '#e2a77f', floorAlt: '#d69a72', trim: '#fff3d6', window: '#cfe8f6' }

const WOOD = '#9a6a43'
const WOOD_DARK = '#74502f'
const LACQUER = '#b8322a'

function furniture(): ShapeItem[] {
  const s: ShapeItem[] = []
  // Bed: wooden frame, straw mat (chiếu cói), pillows, folded blanket, mosquito-net frame
  const { x: bx, z: bz } = HOME_ROOM.bed
  s.push({ box: [1.7, 0.36, 2.15], at: [bx, 0.18, bz], color: WOOD })
  s.push({ box: [1.7, 0.75, 0.08], at: [bx, 0.55, bz - 1.04], color: WOOD_DARK })
  s.push({ box: [1.6, 0.05, 2.05], at: [bx, 0.385, bz], color: '#f0d9a3' })
  for (let i = 0; i < 7; i++) s.push({ box: [1.6, 0.052, 0.02], at: [bx, 0.39, bz - 0.9 + i * 0.3], color: '#d9bd85' })
  s.push({ box: [0.6, 0.12, 0.32], at: [bx - 0.4, 0.47, bz - 0.78], color: '#ffffff' })
  s.push({ box: [0.6, 0.12, 0.32], at: [bx + 0.4, 0.47, bz - 0.78], color: '#ffd6e0' })
  s.push({ box: [1.4, 0.14, 0.45], at: [bx, 0.47, bz + 0.72], color: '#7fb8e8' })
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) s.push({ box: [0.04, 1.6, 0.04], at: [bx + sx * 0.82, 1.15, bz + sz * 1.03], color: WOOD_DARK })
  for (const sz of [-1, 1]) s.push({ box: [1.68, 0.04, 0.04], at: [bx, 1.95, bz + sz * 1.03], color: WOOD_DARK })
  s.push({ box: [1.6, 0.14, 0.14], at: [bx, 1.86, bz - 1.0], color: '#f8f8f2' })

  // Study desk under the window: lamp, books, a jar of daisies, a chair
  const { x: dx, z: dz } = HOME_ROOM.desk
  s.push({ box: [1.4, 0.05, 0.6], at: [dx, 0.76, dz], color: WOOD })
  for (const sx of [-1, 1]) s.push({ box: [0.05, 0.74, 0.56], at: [dx + sx * 0.66, 0.37, dz], color: WOOD_DARK })
  s.push({ box: [0.4, 0.4, 0.55], at: [dx + 0.43, 0.4, dz], color: WOOD_DARK })
  s.push({ cyl: [0.08, 0.1, 0.03, 10], at: [dx - 0.5, 0.79, dz - 0.1], color: '#3f7d5c' })
  s.push({ cyl: [0.015, 0.015, 0.36, 6], at: [dx - 0.5, 0.97, dz - 0.1], rot: [0.25, 0, 0], color: '#3f7d5c' })
  s.push({ cyl: [0.05, 0.13, 0.13, 10], at: [dx - 0.5, 1.15, dz - 0.04], rot: [0.4, 0, 0], color: '#3f7d5c' })
  ;['#c8322b', '#4f86d9', '#f4c04e'].forEach((c, i) => s.push({ box: [0.3, 0.05, 0.22], at: [dx + 0.05, 0.81 + i * 0.05, dz - 0.1], rot: [0, i * 0.12, 0], color: c }))
  s.push({ box: [0.34, 0.012, 0.24], at: [dx - 0.05, 0.79, dz + 0.12], color: '#ffffff' })
  s.push({ cyl: [0.05, 0.05, 0.14, 8], at: [dx + 0.5, 0.85, dz - 0.15], color: '#cfe8f6' })
  for (let i = 0; i < 5; i++) s.push({ sphere: [0.04, 6, 4], at: [dx + 0.5 + Math.cos(i * 1.26) * 0.05, 0.97 + (i % 2) * 0.03, dz - 0.15 + Math.sin(i * 1.26) * 0.05], color: '#ffffff' })
  const cz = HOME_ROOM.deskSeat.z
  s.push({ box: [0.44, 0.05, 0.42], at: [dx, 0.46, cz], color: WOOD })
  s.push({ box: [0.44, 0.5, 0.05], at: [dx, 0.72, cz + 0.2], color: WOOD_DARK })
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) s.push({ box: [0.04, 0.45, 0.04], at: [dx + sx * 0.19, 0.22, cz + sz * 0.18], color: WOOD_DARK })
  // Green shutters beside the window
  for (const side of [-1, 1]) {
    s.push({ box: [0.62, 1.2, 0.05], at: [dx + side * 1.08, 1.75, BACK + 0.05], color: '#3f7d5c' })
    for (let l = 0; l < 5; l++) s.push({ box: [0.54, 0.025, 0.06], at: [dx + side * 1.08, 1.32 + l * 0.2, BACK + 0.07], color: '#2c5c43' })
  }

  // Family altar (bàn thờ): red lacquer shelf, incense bowl, candles, a plate of five fruits
  const ax = -0.4
  s.push({ box: [1.3, 0.08, 0.42], at: [ax, 1.95, BACK + 0.22], color: LACQUER })
  s.push({ box: [1.3, 0.05, 0.05], at: [ax, 1.88, BACK + 0.42], color: '#f4c04e' })
  s.push({ box: [0.5, 0.36, 0.04], at: [ax, 2.25, BACK + 0.04], color: '#f4c04e' })
  s.push({ box: [0.42, 0.28, 0.03], at: [ax, 2.25, BACK + 0.06], color: '#e8dcc4' })
  s.push({ cyl: [0.08, 0.06, 0.1, 10], at: [ax, 2.04, BACK + 0.25], color: '#d9a43a' })
  for (let i = 0; i < 3; i++) s.push({ cyl: [0.005, 0.005, 0.22, 4], at: [ax - 0.03 + i * 0.03, 2.18, BACK + 0.25], color: '#c8322b' })
  for (const sx of [-1, 1]) s.push({ cyl: [0.025, 0.025, 0.16, 8], at: [ax + sx * 0.42, 2.07, BACK + 0.25], color: '#c8322b' })
  s.push({ cyl: [0.16, 0.12, 0.03, 12], at: [ax + 0.25, 2.0, BACK + 0.24], color: '#d9a43a' })
  ;['#ff9b3d', '#a8d86b', '#ffe066', '#ff6b5e', '#7fc06b'].forEach((c, i) =>
    s.push({ sphere: [0.05, 8, 6], at: [ax + 0.25 + Math.cos(i * 1.26) * 0.07, 2.06 + (i === 2 ? 0.05 : 0), BACK + 0.24 + Math.sin(i * 1.26) * 0.06], color: c }),
  )

  // Wooden tea set (bộ bàn ghế gỗ) with a teapot and cups
  const tx = -2.0
  const tz = 1.1
  s.push({ box: [1.1, 0.05, 0.62], at: [tx, 0.46, tz], color: WOOD })
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) s.push({ box: [0.05, 0.44, 0.05], at: [tx + sx * 0.5, 0.22, tz + sz * 0.26], color: WOOD_DARK })
  s.push({ cyl: [0.22, 0.22, 0.02, 14], at: [tx + 0.1, 0.49, tz], color: '#f4c04e' })
  s.push({ sphere: [0.09, 10, 8], at: [tx + 0.1, 0.57, tz], color: '#e8f4f8' })
  s.push({ cyl: [0.015, 0.02, 0.1, 6], at: [tx + 0.21, 0.58, tz], rot: [0, 0, -0.9], color: '#e8f4f8' })
  for (let i = 0; i < 4; i++) s.push({ cyl: [0.03, 0.024, 0.04, 8], at: [tx + 0.1 + Math.cos(i * 1.57 + 0.6) * 0.15, 0.52, tz + Math.sin(i * 1.57 + 0.6) * 0.15], color: '#ffffff' })
  for (const side of [-1, 1]) {
    const cx = tx + side * 0.95
    s.push({ box: [0.55, 0.05, 0.5], at: [cx, 0.44, tz], color: WOOD })
    s.push({ box: [0.05, 0.42, 0.5], at: [cx + side * 0.26, 0.66, tz], color: WOOD_DARK })
    for (const sz of [-1, 1]) s.push({ box: [0.5, 0.06, 0.05], at: [cx, 0.62, tz + sz * 0.24], color: WOOD_DARK })
  }

  // TV cabinet on the left wall, the motorbike parked inside by the door
  s.push({ box: [0.45, 0.55, 1.4], at: [-W / 2 + 0.25, 0.28, -0.9], color: WOOD_DARK })
  s.push({ box: [0.06, 0.6, 1.0], at: [-W / 2 + 0.16, 0.88, -0.9], color: '#2f2f38' })
  s.push({ box: [0.07, 0.52, 0.92], at: [-W / 2 + 0.18, 0.88, -0.9], color: '#4a5a70' })
  s.push(place(motorbikeShapes('#7fb8e8'), [3.0, 0, 1.3], Math.PI / 2 + 0.2))
  s.push(place(plantShapes(P.leafDark, '#c49a6c'), [-W / 2 + 0.45, 0, 2.4], 0, 1.1))
  s.push({ box: [1.0, 0.025, 0.55], at: [HOME_ROOM.exit.x, 0.055, HOME_ROOM.exit.z], color: DOORMAT })
  // Paper cabinet (tủ giấy tờ): the family keeps the originals here — diploma, birth certificate (1.13)
  s.push({ box: [0.45, 1.3, 0.7], at: [-W / 2 + 0.25, 0.65, 0.45], color: WOOD_DARK })
  for (let i = 0; i < 3; i++) {
    s.push({ box: [0.03, 0.36, 0.62], at: [-W / 2 + 0.49, 0.25 + i * 0.42, 0.45], color: WOOD })
    s.push({ box: [0.03, 0.05, 0.14], at: [-W / 2 + 0.52, 0.3 + i * 0.42, 0.45], color: '#d4a72c' })
  }
  s.push({ box: [0.3, 0.06, 0.4], at: [-W / 2 + 0.25, 1.33, 0.45], color: '#c8322b' })
  s.push({ box: [0.28, 0.05, 0.38], at: [-W / 2 + 0.25, 1.38, 0.47], color: '#2f6fb0' })
  return s
}

const PAPERS: SpotAction[] = [
  { id: 'papers', labelKey: 'action.takePapers', icon: 'passport', action: 'visa.originals', primary: true, if: { all: [{ flag: 'visa.path' }, { noFlag: 'visa.originals' }] } },
]

const BED: SpotAction[] = [
  { id: 'sleep', labelKey: 'action.sleep', icon: 'sleep', action: 'home.sleep', primary: true },
  { id: 'nap', labelKey: 'action.nap', icon: 'sleep', action: 'home.nap' },
  { id: 'save', labelKey: 'action.save', icon: 'save', action: 'home.save' },
]
const DESK: SpotAction[] = [{ id: 'study', labelKey: 'action.selfStudy', icon: 'book', action: 'german.selfStudy', primary: true }]
const EXIT: SpotAction[] = [
  { id: 'exit', labelKey: 'action.toStreet', icon: 'door', action: 'home.leave', primary: true, if: { noFlag: 'trip.away' } },
  { id: 'flyBack', labelKey: 'action.flyBack', icon: 'passport', action: 'trip.return', primary: true, if: { flag: 'trip.away' } },
]

/** Tết decorations for the visit home (chapter 5): peach blossom, bánh chưng, red couplets. */
function tetDecor(): ShapeItem[] {
  const s: ShapeItem[] = []
  // Peach blossom tree in a pot against the back wall, beside the bed
  s.push({ cyl: [0.28, 0.22, 0.4, 12], at: [-1.75, 0.2, BACK + 0.45], color: '#b8322a' })
  s.push({ cyl: [0.05, 0.07, 1.1, 6], at: [-1.75, 0.9, BACK + 0.45], color: '#6a4a3a' })
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2
    const r = 0.25 + (i % 3) * 0.08
    s.push({ ico: [0.11 + (i % 2) * 0.03, 0], at: [-1.75 + Math.cos(a) * r, 1.35 + (i % 3) * 0.15, BACK + 0.45 + Math.sin(a) * r * 0.6], color: i % 3 === 0 ? '#ffd1e0' : '#ff9fc4' })
  }
  // Bánh chưng stack on the tea table, wrapped in green leaves with bamboo ties
  for (let i = 0; i < 3; i++) {
    const y = 0.64 + i * 0.1
    s.push({ box: [0.2, 0.09, 0.2], at: [-2.0 + (i - 1) * 0.06, y, 1.1], color: '#4f8f45' })
    s.push({ box: [0.21, 0.092, 0.02], at: [-2.0 + (i - 1) * 0.06, y, 1.1], color: '#e9d8a6' })
  }
  // Red couplets either side of the family altar, a lantern
  for (const x of [-1.3, 0.45]) {
    s.push({ box: [0.22, 1.0, 0.02], at: [x, 1.8, BACK + 0.03], color: '#d4473b' })
    for (let k = 0; k < 4; k++) s.push({ box: [0.12, 0.12, 0.01], at: [x, 2.15 - k * 0.24, BACK + 0.045], color: '#f4c04e' })
  }
  s.push({ sphere: [0.2, 12, 10], at: [0, 2.5, 1.2], scale: [1, 0.85, 1], color: '#d4473b' })
  s.push({ cyl: [0.07, 0.07, 0.06, 8], at: [0, 2.3, 1.2], color: '#f4c04e' })
  return s
}

const Home = memo(function Home() {
  const shapes = useMemo(furniture, [])
  const tet = useMemo(tetDecor, [])
  const visiting = useFlags((s) => !!s.flags['trip.away'])
  const { bed, desk } = HOME_ROOM
  return (
    <>
      <Room
        w={W}
        d={D}
        h={H}
        style={STYLE}
        windows={[desk.x]}
        furniture={shapes}
        blockers={[
          [bed.x, bed.z, 0.85, 1.08],
          [desk.x, desk.z, 0.7, 0.3],
          [-2.0, 1.1, 1.25, 0.32],
          [-W / 2 + 0.25, -0.9, 0.25, 0.7],
          [-W / 2 + 0.25, 0.45, 0.25, 0.38],
          [3.0, 1.3, 0.35, 0.8],
        ]}
      />
      <WallClock position={[-0.4, 2.72, BACK + 0.04]} radius={0.22} />
      <TearCalendar position={[0.75, 1.55, BACK + 0.03]} />
      <WallFan position={[W / 2 - 0.05, 2.2, -1.6]} rotation={[0, -Math.PI / 2, 0]} />

      <NPC def={NPCS.bo} at={{ x: -2.95, z: 1.1 }} yaw={Math.PI / 2} seatY={0.44} arms={1} />
      <NPC def={NPCS.emGai} at={{ x: -2.0, z: 1.75 }} yaw={Math.PI} seatY={0.3} scale={0.85} />
      {visiting && (
        <>
          <Shapes shapes={tet} />
          <NPC def={NPCS.me} at={{ x: 0.6, z: 0.6 }} yaw={Math.PI * 0.85} zone={{ x: 0.6, z: 1.2, halfX: 1.0, halfZ: 0.9 }} />
        </>
      )}

      <ActionSpot id="home-bed" nameKey="interact.bed" zone={{ x: bed.x + 0.2, z: bed.z + 1.55, halfX: 1.1, halfZ: 0.55 }} actions={BED} />
      <ActionSpot id="home-desk" nameKey="interact.studyDesk" zone={{ x: desk.x, z: desk.z + 1.05, halfX: 0.9, halfZ: 0.6 }} actions={DESK} />
      <ActionSpot id="home-papers" nameKey="interact.papers" zone={{ x: -W / 2 + 0.95, z: 0.45, halfX: 0.5, halfZ: 0.55 }} actions={PAPERS} />
      <ActionSpot id="home-exit" nameKey="interact.exit" zone={{ x: HOME_ROOM.exit.x, z: HOME_ROOM.exit.z, halfX: 0.9, halfZ: 0.6 }} actions={EXIT} />
    </>
  )
})

export default Home
