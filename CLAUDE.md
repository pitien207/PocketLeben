# Visa Hunter — notes for Claude

Mobile-first cute 3D web game: Hà Nội Old Quarter → learn German A1–B1 → visa → Germany (WG, Bürgeramt, care-home
job). Plan: `docs/VISA_HUNTER_PLAN.md` (the user calls it "docs/PLAN.md"). Progress + phone test lists: `docs/CHANGELOG.md`.
**Keep this file up to date** when architecture, conventions or workflow change (it saves re-reading the code).

## User & workflow
- Reply in the user's language (usually Vietnamese, often typed without accents).
- The user runs their own `npm run dev` on **port 5173 — never kill it**. Run test servers on **5199** (`npx vite --port 5199 --strictPort`), preview on 5197; stop them when done.
- **Commit / push only when asked.** Repo: github.com/pitien207/visa-hunter (public, branch `main`). CI builds on push; the Azure upload is skipped until the `AZURE_STATIC_WEB_APPS_API_TOKEN` secret exists. Never deploy / touch Azure / DNS without explicit OK (`docs/DEPLOY.md`).
- Every feature: update `docs/CHANGELOG.md` (with a manual phone test checklist), README if structure changes, and this file.
- Shell heredocs break on apostrophes (`'` in vi/en text) → write such files with Write/Edit or a `.cjs` script in the scratchpad.

## Stack
Vite 8 + React 19 + TS 7 + React Three Fiber 9 + drei 10 + @react-three/rapier 2 + three r187 + Zustand 5 + Tailwind 4.
`npm run build` = typecheck (app + `tsconfig.node.json` for vite.config) + build. No ESLint. No unit-test runner.

## Architecture (where to look)
- Entry: `src/main.tsx` (title screen only, tiny) → lazy `src/boot.tsx` (loads save, watchers, guide, audio) → `App.tsx`.
- Scenes: `game/scenes/registry.ts` (id, country, indoor, spawns, plaque, lazy `load`). One scene at a time; `systems/travel.ts` `travelTo(scene, spawn, opts)` fades. Scene ids: vietnam, home, classroom, examHall, embassy, airport, germany, buergeramt, wg, careHome. Interior positions used by logic: `scenes/interiors.ts`.
- Geometry: `scenes/shared/Shapes.tsx` merges primitive lists (`{box|cyl|sphere|ico|torus, at, rot, scale, color}`) into ONE vertex-coloured mesh. Props: `shared/props.ts`; vehicles + rider anchors: `shared/vehicles.ts`; interiors: `shared/Room.tsx`; clocks/fans/calendar: `shared/Decor.tsx`.
- Characters: `components/ChibiModel.tsx` = ONE skinned mesh per character (bones: root, torso, head, eyes, thigh/shin ×2, arm/forearm ×2, glass, fan), two-bone IK for riding (hands on grips, feet on footrests/pedals) and sipping. Driven by plain-data `MotionState` (speed, sit, seatY, ride, pedal, sip, fan, arms, kick, held). Outfit (`data/npcs.ts` `Outfit`) has colours + cuts `top: tee|long|sleeveless`, `bottom: shorts|pants|skirt`; geometry cached by outfit value. Material: `characterMaterial` (rim light, never faded).
- Riders: `npc/Traffic.tsx` uses `RIDES[kind]` (riderZ, seatY, grip, foot, lean, pedalRadius) — change a vehicle's shape ⇒ update its anchors in `vehicles.ts`.
- Materials (`shared/materials.ts`): scene meshes use `vertexColorMaterial` (occlusion dither fade toward the player); ground never fades; `overlayMaterial` for markers.
- Collision groups (`systems/collisionGroups.ts`): `BUILDING_GROUPS` block the camera ray; invisible walls / props must use `PROP_GROUPS` (else the camera gets pulled in).
- Data-driven game logic:
  - Conditions DSL `data/conditions.ts` (flag, noFlag, money, energy, germanLevel, scene, country, hourBetween, test, not/all/any) evaluated by `systems/conditions.ts`; named checks via `registerTests`.
  - Actions: `registerActions({ 'id': fn })` + `runAction(id, arg)`; feature modules imported by `systems/gameplay.ts` (german, visa, germany, pfand, wardrobe, places).
  - Dialogue `data/dialogues/*` (effects incl. `{type:'action'}`), quests `data/quests.ts` (sticky steps `quest.<id>`), achievements, events, vocab, interviews, visa docs, care, clothes, items, shops, schedule.
  - Step-by-step guide: `data/guides.ts` (per step: targets, hint, blockers; `SCENE_LINKS` door graph) → `systems/guide.ts` (`computeGuide`, `route`, first-time tour) → `components/GuideSystem.tsx` (3D arrow/ring + edge arrow) + `ui/Guide.tsx`.
- All balancing numbers in `data/config.ts`. UI strings in `src/i18n/{vi,en,de}.json` (typed keys: tsc lists missing ones); content text is `Localized {vi,en,de?}` in data files.
- Stores (Zustand): player, time, world, flags, inventory, dialogue, minigame, care, pfand, ui (panel/transition/fastForward/newDay), guide, settings (persisted), toasts.
- Save: `systems/save.ts` versioned JSON in localStorage `visa-hunter-save`.
- Multiplayer groundwork (not built): a player = `PlayerSnapshot` (`systems/netState.ts`: scene, x, z, yaw, MotionState, Outfit) — all serialisable; a remote player would be a `ChibiModel` fed with snapshots.
- PWA: `pwa/sw-template.js` filled by a plugin in `vite.config.ts` (precache list); vendor chunks react/three/physics.

## Conventions
- Mobile-first; 360 px wide must work; HUD top, joystick bottom-left, action buttons bottom-right.
- Original/CC0 assets only (all geometry, textures, audio are procedural) — log in `src/assets/CREDITS.md`.
- Keep draw calls low: merge static shapes with `Shapes`; characters are 1 draw call each. Street ≈ 65 calls, interiors 10–25.
- Hooks: never call hooks conditionally (`a || useX()` is a bug).
- GLSL: `half` is reserved — don't use it as a variable name.

## Testing (headless, scratchpad scripts)
Scratchpad: `C:\Users\nghia\AppData\Local\Temp\claude\627b47bef90453e3\bf9c0947-1757-4f86-8200-2916becb1661\scratchpad\` (puppeteer-core + system Chrome, swiftshader).
- `m5story.mjs <out> [phone]` full story E2E · `guide.mjs` guide/tour · `guide-de.mjs` Germany guide targets · `m4scenes.mjs <out> desk <scenes>` scene tour + draw calls · `look.mjs <out> <xeom,player,trada,traffic,class,germany,mai>` model close-ups · `chars.mjs` · `pwa.mjs` (production/offline) · `weather.mjs`.
- Dev hooks `window.__vh`: teleport, travel, action, talk, choose, setFlag, flags/stats/time/world/ui/guide/minigame/care stores, route, renderInfo, snapshot, `look([x,y,z],[x,y,z])` fixed inspection camera (`look()` to reset). In dev under webdriver the title screen is skipped; skip the first-time tour with `setFlag('tut.done', true)`.
- Lighthouse (production title screen): mobile perf 93.

## Ideas queued by the user
- Buying clothes is already in (Chị Hằng, Chú Thắng barber, Flohmarkt); more cuts/accessories can be added as data.
- Future: multiplayer (see groundwork above), chapter 4–5 content, deploy (M10).
