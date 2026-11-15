import { memo, useMemo } from 'react'
import { NPCS } from '../../../data/npcs'
import { ActionSpot, type SpotAction } from '../../components/ActionSpot'
import { NPC } from '../../components/npc/NPC'
import { UNIVERSITY } from '../interiors'
import { WallClock } from '../shared/Decor'
import { PALETTE as P } from '../shared/palette'
import { place, plantShapes } from '../shared/props'
import { Room } from '../shared/Room'
import type { ShapeItem } from '../shared/Shapes'
import { SignBoard } from '../shared/SignBoard'
import type { SignOptions } from '../shared/textures'

/**
 * Universität Lindenberg (chapter 4A, Studium): a bright lecture hall with long desk rows
 * facing a double blackboard and a projector screen, the professor's lectern, a library
 * corner with tall shelves and a group-work table, and the student office counter.
 */

const { w: W, d: D, h: H } = UNIVERSITY
const BACK = -D / 2
const STYLE = { wall: '#eef3f7', wallLow: '#d9e3ec', floor: '#c9b08f', floorAlt: '#bea383', trim: '#ffffff', window: '#d6eef8' }

const SCREEN: SignOptions = {
  title: 'Pflegewissenschaft I',
  subtitle: 'Prof. Dr. Schulz · Hörsaal 2',
  background: '#ffffff',
  border: '#4f86d9',
  color: '#2f3a4d',
  accent: '#c8322b',
  aspect: 2.2,
}
const BOARD: SignOptions = {
  title: 'Pflegeprozess',
  subtitle: 'Einschätzen → Planen → Handeln → Evaluieren',
  background: '#2f5243',
  border: '#2f5243',
  color: '#f4f1e6',
  accent: '#ffe08a',
  aspect: 3.2,
}
const UNI_SIGN: SignOptions = {
  title: 'Universität Lindenberg',
  subtitle: 'Fakultät Gesundheit & Pflege',
  background: '#244a7a',
  border: '#f4c04e',
  color: '#ffffff',
  accent: '#ffe08a',
  aspect: 5,
}
const OFFICE_SIGN: SignOptions = {
  title: 'Studierendensekretariat',
  subtitle: 'Immatrikulation · Phòng đào tạo',
  background: '#fff6e3',
  border: '#4f86d9',
  color: '#244a7a',
  accent: '#c8322b',
  aspect: 3.4,
}
const LIBRARY_SIGN: SignOptions = {
  title: 'Bibliothek',
  subtitle: 'Bitte leise · Giữ yên lặng',
  background: '#3f7d5c',
  border: '#ffffff',
  color: '#ffffff',
  accent: '#ffe08a',
  aspect: 2.6,
}

const BOOKS = ['#c8322b', '#4f86d9', '#3f7d5c', '#f4c04e', '#cdb8f0', '#ff9fb2']

function furniture(): ShapeItem[] {
  const s: ShapeItem[] = []
  const wood = '#d2ab7c'
  const dark = '#8e6844'
  // Lecture rows: long desk + bench, raised a little toward the back like a real Hörsaal
  UNIVERSITY.rows.forEach((z, i) => {
    const y = i * 0.12
    s.push({ box: [6.6, 0.12 + y * 2, 1.4], at: [0, y / 2 + 0.01, z + 0.35], color: i ? '#b89a78' : '#c9b08f' })
    s.push({ box: [6.4, 0.06, 0.55], at: [0, 0.76 + y, z], color: wood })
    s.push({ box: [6.4, 0.6, 0.05], at: [0, 0.46 + y, z - 0.25], color: dark })
    s.push({ box: [6.4, 0.06, 0.32], at: [0, 0.44 + y, z + 0.55], color: '#4f86d9' })
    for (const x of [-3.1, 0, 3.1]) s.push({ box: [0.06, 0.42 + y, 0.3], at: [x, (0.42 + y) / 2, z + 0.55], color: dark })
    // Laptops and notebooks on the desks
    for (let k = 0; k < 5; k++) {
      const x = -2.6 + k * 1.3
      if ((k + i) % 2) {
        s.push({ box: [0.34, 0.02, 0.24], at: [x, 0.8 + y, z], color: '#4a4a55' })
        s.push({ box: [0.34, 0.22, 0.02], at: [x, 0.91 + y, z - 0.12], rot: [-0.25, 0, 0], color: '#a9d6ff' })
      } else {
        s.push({ box: [0.26, 0.02, 0.2], at: [x, 0.8 + y, z], color: BOOKS[(k + i) % BOOKS.length] })
      }
    }
  })
  // Lectern with a laptop, projector on the ceiling
  const { x: px, z: pz } = UNIVERSITY.professor
  s.push({ box: [0.9, 1.05, 0.55], at: [px + 1.2, 0.53, pz + 0.35], color: '#e9eef5' })
  s.push({ box: [0.95, 0.05, 0.6], at: [px + 1.2, 1.07, pz + 0.35], color: '#4f86d9' })
  s.push({ box: [0.32, 0.02, 0.22], at: [px + 1.2, 1.1, pz + 0.35], color: '#2f2f38' })
  s.push({ box: [0.5, 0.18, 0.4], at: [0, H - 0.4, 0.4], color: '#e9eef5' })
  s.push({ cyl: [0.03, 0.03, 0.3, 6], at: [0, H - 0.15, 0.4], color: P.darkSteel })
  // Chalk tray under the blackboard
  s.push({ box: [4.2, 0.05, 0.12], at: [-3.0, 0.98, BACK + 0.1], color: '#a8a2a0' })

  // Library corner (left): tall shelves full of books, a round group table with chairs
  for (let shelf = 0; shelf < 2; shelf++) {
    const sz = -2.4 + shelf * 1.6
    s.push({ box: [0.4, 2.4, 1.3], at: [-W / 2 + 0.25, 1.2, sz], color: dark })
    for (let r = 0; r < 5; r++) {
      for (let b = 0; b < 6; b++) {
        s.push({ box: [0.26, 0.32, 0.17], at: [-W / 2 + 0.5, 0.3 + r * 0.45, sz - 0.5 + b * 0.2], color: BOOKS[(r * 3 + b + shelf) % BOOKS.length] })
      }
    }
  }
  const { x: lx, z: lz } = UNIVERSITY.library
  s.push({ cyl: [0.75, 0.75, 0.06, 18], at: [lx + 0.4, 0.74, lz + 0.4], color: wood })
  s.push({ cyl: [0.08, 0.1, 0.72, 8], at: [lx + 0.4, 0.37, lz + 0.4], color: dark })
  s.push({ box: [0.3, 0.04, 0.22], at: [lx + 0.3, 0.79, lz + 0.3], color: '#ffe08a' })
  s.push({ box: [0.26, 0.04, 0.2], at: [lx + 0.65, 0.79, lz + 0.55], color: '#cdb8f0' })
  s.push({ cyl: [0.05, 0.05, 0.1, 8], at: [lx + 0.1, 0.82, lz + 0.6], color: '#d4473b' })
  s.push(place(plantShapes(P.leafDark, '#c49a6c'), [-W / 2 + 0.6, 0, 4.1], 0, 1.5))

  // Student office counter (right front)
  const { x: ox, z: oz } = UNIVERSITY.office
  s.push({ box: [2.4, 1.05, 0.6], at: [ox - 0.4, 0.53, oz + 0.75], color: '#f6f6f2' })
  s.push({ box: [2.5, 0.05, 0.7], at: [ox - 0.4, 1.07, oz + 0.75], color: '#4f86d9' })
  for (let i = 0; i < 4; i++) s.push({ box: [0.24, 0.03, 0.32], at: [ox - 1.2 + i * 0.32, 1.11, oz + 0.75], color: i % 2 ? '#ffffff' : '#fff6c8' })
  s.push({ box: [0.6, 1.4, 0.45], at: [W / 2 - 0.35, 0.7, oz - 0.6], color: '#a8a2a0' })
  // Notice board with flyers
  s.push({ box: [1.6, 1.0, 0.05], at: [3.0, 1.7, BACK + 0.04], color: '#c49a6c' })
  const FLYERS = ['#ffe08a', '#ff9fb2', '#a9d6ff', '#c8f0c8', '#ffffff', '#cdb8f0']
  FLYERS.forEach((c, i) => s.push({ box: [0.34, 0.4, 0.01], at: [2.5 + (i % 3) * 0.5, 1.9 - Math.floor(i / 3) * 0.45, BACK + 0.07], rot: [0, 0, (i % 2 ? 1 : -1) * 0.06], color: c }))
  // Doormat
  s.push({ box: [1.2, 0.02, 0.7], at: [UNIVERSITY.exit.x - 0.3, 0.02, UNIVERSITY.exit.z - 0.1], color: '#244a7a' })
  return s
}

const OFFICE: SpotAction[] = [
  { id: 'enroll', labelKey: 'action.enroll', icon: 'passport', action: 'uni.enroll', primary: true, if: { noFlag: 'uni.enrolled' } },
]
const LIBRARY: SpotAction[] = [
  { id: 'group', labelKey: 'action.groupWork', icon: 'book', action: 'uni.groupWork', primary: true, if: { flag: 'uni.enrolled' } },
  { id: 'read', labelKey: 'action.selfStudy', icon: 'book', action: 'german.selfStudy' },
]
const EXIT: SpotAction[] = [{ id: 'tram', labelKey: 'action.tramHome', icon: 'tram', action: 'de.tram', arg: 'germany', primary: true }]

const University = memo(function University() {
  const shapes = useMemo(furniture, [])
  const blockers = useMemo<[number, number, number, number][]>(
    () => [
      ...UNIVERSITY.rows.map((z): [number, number, number, number] => [0, z, 3.25, 0.3]),
      [UNIVERSITY.professor.x + 1.2, UNIVERSITY.professor.z + 0.35, 0.5, 0.32],
      [-W / 2 + 0.25, -1.6, 0.25, 1.5],
      [UNIVERSITY.library.x + 0.4, UNIVERSITY.library.z + 0.4, 0.75, 0.75],
      [UNIVERSITY.office.x - 0.4, UNIVERSITY.office.z + 0.75, 1.25, 0.35],
      [W / 2 - 0.35, UNIVERSITY.office.z - 0.6, 0.3, 0.25],
    ],
    [],
  )
  const row = (r: number, x: number) => ({ x, z: UNIVERSITY.rows[r] + 0.55 })
  return (
    <>
      <Room w={W} d={D} h={H} style={STYLE} windows={[5.9]} furniture={shapes} blockers={blockers} />
      <SignBoard options={BOARD} width={4.2} position={[-3.0, 1.75, BACK + 0.06]} flat />
      <SignBoard options={SCREEN} width={3.0} position={[1.0, 2.15, BACK + 0.05]} />
      <SignBoard options={UNI_SIGN} width={4.6} position={[-1.0, 3.15, BACK + 0.03]} />
      <SignBoard options={OFFICE_SIGN} width={2.2} position={[W / 2 - 0.03, 2.3, UNIVERSITY.office.z + 0.6]} rotation={[0, -Math.PI / 2, 0]} />
      <SignBoard options={LIBRARY_SIGN} width={1.6} position={[-W / 2 + 0.03, 2.75, -1.6]} rotation={[0, Math.PI / 2, 0]} />
      <WallClock position={[4.6, 2.9, BACK + 0.04]} radius={0.3} />

      <NPC
        def={NPCS.profSchulz}
        at={UNIVERSITY.professor}
        yaw={0}
        zone={{ x: UNIVERSITY.professor.x, z: UNIVERSITY.professor.z + 1.2, halfX: 2.0, halfZ: 1.0 }}
      />
      <NPC def={NPCS.frauKlein} at={{ x: UNIVERSITY.office.x - 0.4, z: UNIVERSITY.office.z }} yaw={0} />
      <NPC def={NPCS.studentMia} at={row(0, -2.0)} yaw={Math.PI} seatY={0.46} />
      <NPC def={NPCS.studentAli} at={row(1, -1.0)} yaw={Math.PI} seatY={0.58} />
      <NPC def={NPCS.studentJule} at={row(2, 2.4)} yaw={Math.PI} seatY={0.7} />
      <NPC def={NPCS.studentKenji} at={{ x: UNIVERSITY.library.x + 1.1, z: UNIVERSITY.library.z + 1.1 }} yaw={-2.3} seatY={0.46} />

      <ActionSpot
        id="uni-office"
        nameKey="interact.uniOffice"
        zone={{ x: UNIVERSITY.office.x - 0.4, z: UNIVERSITY.office.z + 1.6, halfX: 1.4, halfZ: 0.7 }}
        actions={OFFICE}
        marker={{ at: [UNIVERSITY.office.x - 0.4, 2.6, UNIVERSITY.office.z + 0.6], when: { noFlag: 'uni.enrolled' } }}
      />
      <ActionSpot id="uni-library" nameKey="interact.library" zone={{ x: UNIVERSITY.library.x + 0.4, z: UNIVERSITY.library.z + 0.4, halfX: 1.4, halfZ: 1.4 }} actions={LIBRARY} />
      <ActionSpot id="uni-exit" nameKey="interact.tramStop" zone={{ x: UNIVERSITY.exit.x, z: UNIVERSITY.exit.z, halfX: 1.0, halfZ: 0.7 }} actions={EXIT} />
    </>
  )
})

export default University
