import type { Lane } from '../../components/npc/Traffic'

/**
 * 1.44 München — the whole German map (scene `germany`). x → east, z → south (north = −z, like the compass).
 * Lindenstraße (the home street with the WG, Bürgeramt, supermarket, Stadtpark) stays where it always was, at the
 * origin; the city grows north of it and the Isar runs along the east side:
 *
 *   z −150  Siegestor · Ludwigstraße · LMU │ Englischer Garten (Monopteros, Chinesischer Turm) │ Isar
 *   z −124      ~~~~~~~~~~~ Eisbach (surf wave by the Haus der Kunst) ~~~~~~~~~~~~~~~~~~~~~~~~~~~ │
 *   z −104  ══════ Prinzregentenstraße ═══════════════════════════════════ Luitpoldbrücke → Friedensengel
 *   z −87   Theatinerkirche · Odeonsplatz (Feldherrnhalle) · Residenz · Hofgarten (Dianatempel)
 *   z −66   ══════ Maximilianstraße ══════════════════════════════════════ Maximiliansbrücke → Maximilianeum
 *   z −45   Frauenkirche · MARIENPLATZ (Neues Rathaus, Altes Rathaus) · Hofbräuhaus · Viktualienmarkt
 *   z −27   Karlstor · Fußgängerzone (Neuhauser / Kaufinger Straße) → Marienplatz
 *   z −9    Hauptbahnhof · Sendlinger Tor · Lindenstraße row (old) · Stadtpark
 *   z  6    ══════ Lindenstraße (tram) ═════════════════════════════════════ Ludwigsbrücke → Deutsches Museum
 *
 * Everything that has to agree (houses, colliders, the map, Pfand spots, NPC paths) reads these numbers.
 */

/** Walkable area (invisible walls just outside). */
export const MUC = { minX: -72, maxX: 66, minZ: -150, maxZ: 14.5 }

export interface Rect {
  x0: number
  x1: number
  z0: number
  z1: number
}

// --- Lindenstraße (unchanged since 1.7; GermanyStreet/index.tsx) -----------------------------
export const LINDEN = { x0: -32, x1: 34, front: -4.5, back: -13, road0: 3.2, road1: 8.6, south: 14.5 }
export const LINDEN_LANES: Lane[] = [
  { z: 7.25, dir: 1 },
  { z: 4.55, dir: -1 },
]
/** The houses of the old street end at the Asia-Markt; Sendlinger Straße runs north from the fountain square. */
export const LINDEN_ROW_X0 = -27

// --- Hauptbahnhof + Sendlinger Straße ------------------------------------------------------
/** Station facade (front faces south onto Lindenstraße / Bayerstraße). */
export const HBF = { x0: -72, x1: -35, z0: -13, z1: LINDEN.front }
/** Pedestrian street from the fountain square to Marienplatz; the Sendlinger Tor stands across it. */
export const SENDLINGER: Rect = { x0: -34.5, x1: -27, z0: -22, z1: LINDEN.front }
export const SENDLINGER_TOR = { z: -9, arch: 4.6 }

// --- Row N1: shops facing north, back to back with the station and Lindenstraße ------------
export const ROW_N1 = { front: -22, back: -13, segs: [[-72, -34.5], [-27, 14.5]] as [number, number][] }

// --- Fußgängerzone, Karlstor, Stachus ------------------------------------------------------
export const FUZO: Rect = { x0: -72, x1: -34, z0: -32, z1: -22 }
/** A few houses on the north side of the Fußgängerzone, west of Frauenplatz (fronts face south). */
export const ROW_FN = { front: -32, back: -40, x0: -72, x1: -66 }
export const KARLSTOR = { x: -59, depth: 4, arch: 6 }
export const STACHUS = { x: -67.5, z: -27, r: 2.6 }

// --- Marienplatz ------------------------------------------------------------------------------
export const MARIENPLATZ: Rect = { x0: -34, x1: -4, z0: -46, z1: -22 }
export const RATHAUS = { x0: -33, x1: -5, z0: -58, z1: -46, towerX: -19 }
export const MARIENSAEULE = { x: -19, z: -33 }
export const FISCHBRUNNEN = { x: -9.5, z: -42.6 }
export const ALTES_RATHAUS = { x0: -4, x1: 5, z0: -46, z1: -36 }

// --- Frauenkirche -----------------------------------------------------------------------------
/** Nave (west front with the two towers at x0). */
export const FRAUENKIRCHE = { x0: -58, x1: -38, z0: -50, z1: -36, towerW: 6 }
export const FRAUENPLATZ: Rect = { x0: -72, x1: -34, z0: -52, z1: -32 }

// --- Viktualienmarkt, Hofbräuhaus --------------------------------------------------------------
export const VIKTUALIEN: Rect = { x0: 5, x1: 34, z0: -50, z1: -13 }
export const MAIBAUM = { x: 20, z: -33 }
export const BIERGARTEN_VM: Rect = { x0: 24, x1: 33, z0: -47, z1: -38 }
export const HOFBRAEU = { x0: 6, x1: 24, z0: -58, z1: -50 }

/** Row along the south side of Maximilianstraße (fronts face north, z = −58). */
export const ROW_MS = { front: -58, segs: [[-72, -33, -50.5], [-5, 6, -46], [24, 34, -50]] as [number, number, number][] }

// --- Maximilianstraße -------------------------------------------------------------------------
export const MAXSTR = { z0: -70, z1: -62, walk0: -74, walk1: -58 }
export const MAX_LANES: Lane[] = [
  { z: -64, dir: 1 },
  { z: -68, dir: -1 },
]

// --- Odeonsplatz, Residenz, Hofgarten ----------------------------------------------------------
export const ODEONSPLATZ: Rect = { x0: -57, x1: -30, z0: -100, z1: -74 }
export const FELDHERRNHALLE = { x0: -49, x1: -37, z0: -81, z1: -75 }
export const THEATINER = { x0: -72, x1: -57, z0: -98, z1: -77 }
export const RESIDENZ = { x0: -30, x1: -21, z0: -99, z1: -75 }
export const HOFGARTEN: Rect = { x0: -21, x1: 34, z0: -99, z1: -75 }
export const DIANATEMPEL = { x: 6.5, z: -87 }

// --- Prinzregentenstraße ------------------------------------------------------------------------
export const PRINZ = { z0: -108, z1: -100, walk0: -110, walk1: -98 }
export const PRINZ_LANES: Lane[] = [
  { z: -102, dir: 1 },
  { z: -106, dir: -1 },
]

// --- Ludwigstraße, LMU, Siegestor -----------------------------------------------------------------
export const LUDWIG: Rect = { x0: -52, x1: -34, z0: -150, z1: -110 }
export const LMU = { x0: -72, x1: -53, z0: -146, z1: -113 }
export const SIEGESTOR = { z: -144.5, depth: 4 }
export const UNI_FOUNTAINS = [
  { x: -46, z: -121.5 },
  { x: -46, z: -135 },
]

// --- Englischer Garten, Eisbach ---------------------------------------------------------------------
export const GARTEN: Rect = { x0: -34, x1: 34, z0: -150, z1: -110 }
export const HAUS_DER_KUNST = { x0: -31, x1: -9, z0: -119, z1: -111 }
/** The Eisbach: a channel from under Ludwigstraße to the Isar; bridges let you cross. */
export const EISBACH = { x0: -33, x1: 46, z0: -126.5, z1: -122.5, wave: -25.5 }
export const EISBACH_BRIDGES: [number, number][] = [
  [-20.5, -16.5],
  [8, 12],
  [35, 41],
]
export const MONOPTEROS = { x: -3, z: -140, mound: 7 }
export const CHIN_TURM = { x: 20, z: -137 }

// --- The Isar -----------------------------------------------------------------------------------------
export const ISAR = { walk0: 34, walk1: 42, beach1: 46, water0: 46, water1: 58, beach2: 61, east1: 66 }
/** Bridges over the Isar (z ranges, sidewalks included). */
export const BRIDGES: { name: string; z0: number; z1: number }[] = [
  { name: 'Ludwigsbrücke', z0: 2.2, z1: 9.6 },
  { name: 'Maximiliansbrücke', z0: -71, z1: -61 },
  { name: 'Luitpoldbrücke', z0: -109, z1: -99 },
]
export const FRIEDENSENGEL = { x: 63.5, z: -93 }

/** Roads reach beyond the map (traffic drives off into the haze); cars wrap at ±this. */
export const ROAD_WRAP = 82

export const inRect = (r: Rect, x: number, z: number, m = 0) => x > r.x0 - m && x < r.x1 + m && z > r.z0 - m && z < r.z1 + m
