import type { Localized } from '../i18n/localized'

/**
 * 1.48 Getting round the city: bus stops in Hà Nội and München (one line each, ride to any other stop of the line) and the
 * München U-Bahn (U3 / U6 under the old town: one underground station scene `ubahn` that becomes whichever station you are
 * at). Logic: game/systems/transit.ts; stops: game/scenes/shared/BusStops.tsx; station: game/scenes/UBahn; panel:
 * ui/TransitPanel.tsx. Plain data — the numbers are copied from the street layouts (comments say which).
 */

// --- Buses -------------------------------------------------------------------------------------------------------------

export type BusStopId = 'boHo' | 'trangTien' | 'hangKhay' | 'hbf' | 'linden' | 'maxStr' | 'prinz'
export type BusScene = 'vietnam' | 'germany'

export interface BusStop {
  id: BusStopId
  scene: BusScene
  name: Localized
  /** Shelter centre (on the pavement). */
  x: number
  z: number
  /** The shelter opens toward the road: +1 = toward +z, −1 = toward −z. */
  face: 1 | -1
  /** The traffic lane next to the kerb the bus stops in (the scene's Traffic lane: same z and direction). */
  lane: { z: number; dir: 1 | -1 }
}

export interface BusLine {
  id: string
  scene: BusScene
  /** Number on the bus and the stop sign. */
  number: string
  /** Where the line goes (shown on the sign / panel). */
  towards: Localized
  /** Paint of the bus body. */
  color: string
  stops: BusStopId[]
}

export const BUS_STOPS: Record<BusStopId, BusStop> = {
  // Hà Nội. Main road lanes: VietnamStreet/layout.ts TRAFFIC_LANES (11.4 east, far side by the lake: pavement 12.7…19)
  boHo: { id: 'boHo', scene: 'vietnam', name: { vi: 'Bờ Hồ', en: 'Bờ Hồ (Hoàn Kiếm Lake)' }, x: -21, z: 14.6, face: -1, lane: { z: 11.4, dir: 1 } },
  // Tràng Tiền avenue (AVENUE_LANES −60.6 westbound; north pavement −54…−59)
  trangTien: { id: 'trangTien', scene: 'vietnam', name: { vi: 'Tràng Tiền', en: 'Tràng Tiền' }, x: 25, z: -57.2, face: -1, lane: { z: -60.6, dir: -1 } },
  // Hàng Khay (HangKhay/layout.ts: OZ = 71.2, promenade OZ−1…OZ+6, lane OZ+7.3 westbound)
  hangKhay: { id: 'hangKhay', scene: 'vietnam', name: { vi: 'Hàng Khay', en: 'Hàng Khay' }, x: 14, z: 75.1, face: 1, lane: { z: 78.5, dir: -1 } },
  // München. Lindenstraße road 3.2…8.6, lanes 4.55 westbound (house side) — the pavement −4.5…3.2
  hbf: { id: 'hbf', scene: 'germany', name: { vi: 'Hauptbahnhof', en: 'Hauptbahnhof', de: 'Hauptbahnhof' }, x: -46, z: 1.5, face: 1, lane: { z: 4.55, dir: -1 } },
  linden: { id: 'linden', scene: 'germany', name: { vi: 'Lindenstraße', en: 'Lindenstraße', de: 'Lindenstraße' }, x: 24, z: 1.5, face: 1, lane: { z: 4.55, dir: -1 } },
  // Maximilianstraße road −70…−62 (lane −64 eastbound), north pavement −62…−58
  maxStr: { id: 'maxStr', scene: 'germany', name: { vi: 'Maximilianstraße', en: 'Maximilianstraße', de: 'Maximilianstraße' }, x: -2, z: -60.1, face: -1, lane: { z: -64, dir: 1 } },
  // Prinzregentenstraße road −108…−100 (lane −102 eastbound), north pavement −100…−98
  prinz: { id: 'prinz', scene: 'germany', name: { vi: 'Prinzregentenstraße', en: 'Prinzregentenstraße', de: 'Prinzregentenstraße' }, x: 12, z: -98.9, face: -1, lane: { z: -102, dir: 1 } },
}

export const BUS_LINES: BusLine[] = [
  {
    id: 'vn09',
    scene: 'vietnam',
    number: '09',
    towards: { vi: 'Bờ Hồ – Tràng Tiền – Hàng Khay', en: 'Bờ Hồ – Tràng Tiền – Hàng Khay' },
    color: '#d8362f',
    stops: ['boHo', 'trangTien', 'hangKhay'],
  },
  {
    id: 'de100',
    scene: 'germany',
    number: '100',
    towards: { vi: 'Hauptbahnhof ↔ Prinzregentenstraße', en: 'Hauptbahnhof ↔ Prinzregentenstraße', de: 'Hauptbahnhof ↔ Ostbahnhof' },
    color: '#1d5fb0',
    stops: ['hbf', 'linden', 'maxStr', 'prinz'],
  },
]

/** 1.49 where the buses come from / drive off to: the ends of the street in the fog (= the Traffic wrap of each city). */
export const BUS_EDGE: Record<BusScene, number> = { vietnam: 48, germany: 82 }

export const busLineOf = (stop: BusStopId) => BUS_LINES.find((l) => l.stops.includes(stop))!
export const busStopsIn = (scene: string) => Object.values(BUS_STOPS).filter((s) => s.scene === scene)
export const busSpawnKey = (stop: BusStopId) => `bus-${stop}`
/** Where you stand when you get off: on the pavement beside the shelter (the end the bus comes from). */
export const busSpawn = (s: BusStop) => ({ x: s.x - s.lane.dir * 2.9, z: s.z + s.face * 0.4, yaw: 0 })

// --- U-Bahn ------------------------------------------------------------------------------------------------------------

export type UStationId = 'universitaet' | 'odeonsplatz' | 'marienplatz' | 'sendlingerTor'

export interface UStation {
  id: UStationId
  name: string
  /** What the exit leads to (the arrow sign at the stairs). */
  exit: string
  /** Wall tiles of the platform hall (every München station has its own colour). */
  wall: string
  /** The street entrance in the germany scene: centre of the stairwell, and the side you walk in from (+1 = +z). */
  street: { x: number; z: number; open: 1 | -1 }
}

/** U3 / U6 from north to south (the stations inside our München map). */
export const U_LINE: UStationId[] = ['universitaet', 'odeonsplatz', 'marienplatz', 'sendlingerTor']
/** Stations beyond the map, shown greyed on the line plan. */
export const U_BEYOND = { north: ['Giselastraße', 'Münchner Freiheit'], south: ['Goetheplatz', 'Implerstraße'] }

export const U_STATIONS: Record<UStationId, UStation> = {
  // mucLayout.ts: LUDWIG x −52…−34 (Ludwigstraße), LMU west of it
  universitaet: { id: 'universitaet', name: 'Universität', exit: 'Ludwigstraße · LMU', wall: '#d6b23c', street: { x: -37.2, z: -134, open: 1 } },
  // ODEONSPLATZ x −57…−30, z −100…−74 (the old decorative entrance of 1.44, Munich.tsx)
  odeonsplatz: { id: 'odeonsplatz', name: 'Odeonsplatz', exit: 'Feldherrnhalle · Hofgarten', wall: '#3f8f6a', street: { x: -53, z: -79, open: 1 } },
  // MARIENPLATZ x −34…−4, z −46…−22 (the old decorative entrance of 1.44)
  marienplatz: { id: 'marienplatz', name: 'Marienplatz', exit: 'Rathaus · Marienplatz', wall: '#e2752e', street: { x: -27.5, z: -39, open: 1 } },
  // in Sendlinger Straße just north of the gate (SENDLINGER x −34.5…−27, the Tor at z −9), on its west side.
  // 1.49: it was at (−30.8, −1.2) — right on the Lindenstraße fountain (GermanyStreet/index.tsx FOUNTAIN −29.6, −1.2)
  sendlingerTor: { id: 'sendlingerTor', name: 'Sendlinger Tor', exit: 'Sendlinger Straße · Sendlinger Tor', wall: '#3a6db4', street: { x: -32.9, z: -16.8, open: 1 } },
}

/** Platform 1 runs south, platform 2 north; the trains alternate between the two lines' end stations. */
export const U_GLEIS = {
  1: { dir: 'south' as const, ends: [{ line: 'U3', to: 'Fürstenried West' }, { line: 'U6', to: 'Klinikum Großhadern' }] },
  2: { dir: 'north' as const, ends: [{ line: 'U3', to: 'Moosach' }, { line: 'U6', to: 'Garching-Forschungszentrum' }] },
}
export type Gleis = 1 | 2

/** Line colours (MVG): U3 orange, U6 blue. */
export const U_LINE_COLOR: Record<string, string> = { U3: '#ec6725', U6: '#0065ae' }

/** Stations you can ride to from `from` on platform `g` (in travel order). */
export function uStationsAhead(from: UStationId, g: Gleis): UStationId[] {
  const i = U_LINE.indexOf(from)
  return g === 1 ? U_LINE.slice(i + 1) : U_LINE.slice(0, i).reverse()
}
export const uSpawnKey = (s: UStationId) => `u-${s}`
/** Where you come up in the street: beside the stairwell, on its open side. */
export const uStreetSpawn = (s: UStation) => ({ x: s.street.x, z: s.street.z + s.street.open * 3.4, yaw: 0 })
