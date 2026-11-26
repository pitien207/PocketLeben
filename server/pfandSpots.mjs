// 1.44 Where Pfand bottles may turn up in München (scene `germany`, layout: src/game/scenes/GermanyStreet/munich.ts).
// Shared by the server (server/pfand.mjs spawns by index) and the game (systems/pfandWorld.ts draws them) — the
// order matters: only ever APPEND new spots, never reorder or delete (online clients of the previous release use
// the same indices). Every spot must be open ground: pavements, squares, beaches, lawns — next to benches, bins,
// beer gardens, where people really leave bottles. Checked by the scratchpad test (walk to each one).

export const PFAND_SCENE = 'germany'

/** [x, z] */
export const PFAND_SPOTS = [
  // Lindenstraße (the old street) — pavements, benches, the green across the road
  [-12, -2.2], [-8, -1.5], [-6, -2.6], [-4.5, 0.2], [-1, -1.8], [0.6, 0.9], [3.2, -2.2], [5.2, 0.5],
  [7.2, -1.6], [8.6, -0.2], [11, -1.4], [13, 0.4], [-11, 9.8], [-7, 10.4], [-1, 10.2], [1.6, 10.0],
  [6, 10.6], [9.5, 10.0], [11.8, 10.6], [-13, 11],
  [-16, -1.8], [-19.5, 0.4], [-22, -2.4], [-26.8, 0.6], [-27.6, -2.8], [-31, 1.2], [-17, 10.4], [-23, 9.8], [-28.5, 10.6],
  // Hauptbahnhof, Bayerstraße, Sendlinger Straße
  [-60, -2.5], [-46, -2.0], [-40, 1.2], [-55, 11.5], [-36, 12.5], [-30.0, -16],
  // Fußgängerzone, Stachus, Frauenplatz
  [-65, -24.2], [-53, -30.8], [-43, -23.4], [-37, -29.5], [-62, -35], [-47, -35.4],
  // Marienplatz
  [-27, -28], [-14, -38.5], [-9, -26], [-22, -42],
  // Viktualienmarkt, Platzl (Hofbräuhaus)
  [11.6, -33], [17, -38], [24, -32], [30.5, -18], [12, -47.6], [27, -47.8],
  // Maximilianstraße, Odeonsplatz, Hofgarten
  [-20, -60], [10, -72.5], [-44, -88], [-35, -95], [-52, -84], [-8, -79.5], [18, -94.5], [28, -80],
  // Ludwigstraße, Englischer Garten, Chinesischer Turm
  [-38, -117], [-48, -139], [-6, -114], [14, -116], [26, -113], [-24, -130], [-12, -132], [5, -146],
  [14, -132], [28, -146], [30, -128], [-18.5, -145], [26, -129.5],
  // the Isar: beaches, promenade, east bank
  [44, -10], [44.5, -40], [44, -80], [43.5, -130], [44, 12], [38, -30], [38, -88],
  [63, -20], [62.5, -52], [64, -80], [63, 11],
]
