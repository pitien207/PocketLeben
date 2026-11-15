# Visa Hunter — notes for Claude

Mobile-first cute 3D web game: Hà Nội Old Quarter → learn German A1–B1 → visa → Germany (WG, Bürgeramt, care-home
Ausbildung **or** Studium at the university → contract → Tết trip home → own flat → permanent residence = ending;
citizenship post-game). Plan: `docs/VISA_HUNTER_PLAN.md` (the user calls it "docs/PLAN.md"). Progress + phone test lists: `docs/CHANGELOG.md`.
**Keep this file up to date** when architecture, conventions or workflow change (it saves re-reading the code).

## User & workflow
- Reply in the user's language (usually Vietnamese, often typed without accents).
- The user runs their own `npm run dev` on **port 5173 — never kill it**. Run test servers on **5199** (`npx vite --port 5199 --strictPort`), preview on 5197; stop them when done.
- Game server for tests: `PORT=8798 DATA_DIR=<scratchpad>/mpdata node server/index.mjs` + vite with `VH_SERVER=http://localhost:8798` (the user's own server would be 8787).
- **Commit / push only when asked.** Repo: github.com/pitien207/visa-hunter (public, branch `main`). **A push to main deploys** (`.github/workflows/deploy.yml`: Docker → ghcr.io/pitien207/visa-hunter → Azure Container App `visa-hunter` in `visahunter-rg`, OIDC app `github-visahunter-deploy`). Data: own Cosmos DB for MongoDB account `visahunter-cosmos` (free tier, API 7.0) in `visahunter-rg`, database `visahunter` (shared 1000 RU/s = the free amount), via secret `mongo-uri` → env `MONGO_URI`. Visa Hunter is a separate project from the user's lofitalk (`lofitalk-rg`): never touch or read lofitalk resources/secrets. Other Azure / DNS changes only with explicit OK (`docs/DEPLOY.md`).
- Every feature: update `docs/CHANGELOG.md` (with a manual phone test checklist), README if structure changes, and this file.
- Shell heredocs break on apostrophes (`'` in vi/en text) → write such files with Write/Edit or a `.cjs` script in the scratchpad.

## Stack
Vite 8 + React 19 + TS 7 + React Three Fiber 9 + drei 10 + @react-three/rapier 2 + three r187 + Zustand 5 + Tailwind 4.
Server: plain Node ESM `server/index.mjs` + `server/store.mjs` (MongoDB API — Cosmos DB in prod — when `MONGO_URI` is set, else JSON files in `DATA_DIR`) + `ws`; own `server/package.json` (ws, mongodb) installed alone in the Docker image (`Dockerfile`). Rooms are in memory → exactly one replica. `/api/health`.
`npm run build` = typecheck (app + `tsconfig.node.json` for vite.config) + build. No ESLint. No unit-test runner.

## Architecture (where to look)
- Entry: `src/main.tsx` (title screen only, tiny; on Play pulls a newer cloud save first) → lazy `src/boot.tsx` (loads save, watchers, guide, audio, `startNet`, `startSecrets`, `startStory`) → `App.tsx`.
- Online: `src/net/auth.ts` (account in localStorage `visa-hunter-auth`, `api()`, `pullCloudSave`/`pushCloudSave`; title-screen safe) and `src/net/client.ts` (WebSocket `/ws`, sends `PlayerSnapshot` 10 Hz, `remotes` map read per frame by `components/RemotePlayers.tsx`; `useNet` store; emotes `sendEmote`). Server rooms = public scenes only (`PUBLIC_SCENES` in server). UI: `ui/LoginPanel.tsx`, `ui/OnlineUI.tsx` (online chip, emote picker), Settings → AccountSection. Setting `online` (persisted). Phase 2 (shared clock) not built — see `docs/MULTIPLAYER_PLAN.md`.
- Scenes: `game/scenes/registry.ts` (id, country, indoor, spawns, plaque (+ `alt` by condition), lazy `load`). One scene at a time; `systems/travel.ts` `travelTo(scene, spawn, opts)` fades. Scene ids: vietnam, home, classroom, examHall, embassy, airport, germany, buergeramt, wg, careHome, university. Interior positions used by logic: `scenes/interiors.ts`.
- Geometry: `scenes/shared/Shapes.tsx` merges primitive lists (`{box|cyl|sphere|ico|torus, at, rot, scale, color}`) into ONE vertex-coloured mesh. Props: `shared/props.ts`; vehicles + rider anchors: `shared/vehicles.ts`; interiors: `shared/Room.tsx`; clocks/fans/calendar: `shared/Decor.tsx`.
- Characters: `components/ChibiModel.tsx` = ONE skinned mesh per character (bones: root, torso, head, eyes, thigh/shin ×2, arm/forearm ×2, glass, fan), two-bone IK for riding (hands on grips, feet on footrests/pedals) and sipping. Driven by plain-data `MotionState` (speed, sit, seatY, ride, pedal, sip, fan, arms, kick, held). Outfit (`data/npcs.ts` `Outfit`) has colours + `hairStyle` (bob, short, bun, long, ponytail, twin, curly, spiky, buzz), `accessory` (nonLa, glasses, sunglasses, helmet, beanie, cap, beret, bow, flowerCrown, catEars, headphones), cuts `top: tee|long|sleeveless|hoodie|jacket|dress|aoDai` (dress forces a skirt, aoDai pants), `bottom: shorts|pants|skirt`, `neck: scarf|tie` + `neckColor`, `eye` colour; geometry cached by outfit value. `ui/Portrait.tsx` draws the same styles in 2D — update both. Clothes slot `neck`; shop `gift` = secret rewards (`giftClothing`). Server `cleanSnap` whitelists outfit keys — add new Outfit fields there too. Material: `characterMaterial` (rim light, never faded).
- Streets: Hà Nội `VietnamStreet/layout.ts` (`PLAY` x −32…34; west block = `WestBlock.tsx`, east block `EAST` = `EastBlock.tsx`: đình, alley, juice shop, bookshop, night market), Lindenstraße `GermanyStreet/index.tsx` (`PLAY` x −32…34; Altbau row ends at `ROW_END` 14.5, east = `Stadtpark.tsx`). `Backdrop` takes `clear={PLAY}` so distant blocks never stand in the play area. Map data for the 🗺️ view: `scenes/maps.ts` (update rects when buildings move).
- Riders: `npc/Traffic.tsx` uses `RIDES[kind]` (riderZ, seatY, grip, foot, lean, pedalRadius) — change a vehicle's shape ⇒ update its anchors in `vehicles.ts`.
- Materials (`shared/materials.ts`): scene meshes use `vertexColorMaterial` (occlusion dither fade toward the player); ground never fades; `overlayMaterial` for markers.
- Collision groups (`systems/collisionGroups.ts`): `BUILDING_GROUPS` block the camera ray; invisible walls / props must use `PROP_GROUPS` (else the camera gets pulled in).
- Data-driven game logic:
  - Conditions DSL `data/conditions.ts` (flag, noFlag, money, energy, germanLevel, scene, country, hourBetween, test, not/all/any) evaluated by `systems/conditions.ts`; named checks via `registerTests`.
  - Actions: `registerActions({ 'id': fn })` + `runAction(id, arg)`; feature modules imported by `systems/gameplay.ts` (german, visa, germany, pfand, wardrobe, places, career, testMode).
  - Story: chapters 1–5 in `data/quests.ts` (main quests chained by `after` (string or list = any); `when` = path branch, e.g. Studium vs Ausbildung; `side: true` = optional). Studium logic: `systems/uni.ts` (enroll, lecture, groupWork, klausur, thesis; `CONFIG.uni`); the degree also sets `care.examen`. Chapters 4–5 logic in `systems/career.ts` (care exams, contract, trip.*, de.rentFlat, pr.*, cz.apply, `showEnding()` → `ui/EndingPanel.tsx`); numbers in `CONFIG.career`; Q&A exams in `data/interviews.ts` (asker = NPC id for the portrait).
  - Key flags: care.zwischen, care.examen, job.fulltime, trip.away/reunion/done, de.ownFlat, pr.lid, pr.granted, story.done, cz.granted, gerda.friend, story.leipzig, story.chapterSeen, secret.<id>, secret.all.
  - Secrets: `data/secrets.ts` (scene, at, radius, `when`, story, reward incl. gift clothes) → `systems/secrets.ts` (proximity check 350 ms, `discoverSecret`) → `ui/SecretCard.tsx` (card + `SecretList` tab in the Quest log) + `components/SecretGlints.tsx` (sparkle within 6 m). Add a secret = one data entry (make sure the spot is walkable; `east.mjs` teleports onto every one).
  - Activities of the new districts: `systems/explore.ts` (place.fortune/drawFortune, place.readBook, park.swing/ducks/words/eis), fortunes in `data/fortunes.ts`, dialogues `data/dialogues/explore.ts` (ongTu, chuSach, baChe, omaGerda).
  - Story narration: `data/story.ts` (`CHAPTER_INTROS`, `EPILOGUE` lines with conditions) → `systems/story.ts` (shows `ui/ChapterCard.tsx` once per chapter, non-blocking) and `ui/EndingPanel.tsx`.
  - Dialogue `data/dialogues/*` (effects incl. `{type:'action'}`), quests `data/quests.ts` (sticky steps `quest.<id>`), achievements, events, vocab, interviews, visa docs, care, clothes, items, shops, schedule.
  - Backpack UI = inventory grid in `ui/BagPanel.tsx` (slots: items, Pfand bottles, papers; detail card on top).
  - Map: `ui/MapView.tsx` (canvas; in test mode tap = teleport, place list, scene travel).
  - Backpack: `systems/bag.ts` (`bagWeight`, `canCarry`, `dropItem`, capacity `CONFIG.bag` + worn bag bonus); every `ItemDef` has `weight`; important papers = `data/keyItems.ts` (derived from flags, never droppable).
  - Running: `input.ts` `isSprinting()` (Shift / 🏃 toggle) → `CONFIG.player.runMultiplier`.
  - Test mode (`systems/testMode.ts`, `ui/TestTools.tsx`, setting `testMode`): `?test=1` or tap the Settings version 5×; `skipStep` makes a step’s condition really true (generic `satisfy(cond)` + hand-written `SKIPS` for tests/travel) — **add a SKIPS entry when a new step’s condition is a `test` or needs travel**.
  - Step-by-step guide: `data/guides.ts` (per step: targets, hint, blockers; `SCENE_LINKS` door graph) → `systems/guide.ts` (`computeGuide`, `route`, first-time tour) → `components/GuideSystem.tsx` (3D arrow/ring + edge arrow) + `ui/Guide.tsx`.
- All balancing numbers in `data/config.ts`. UI strings in `src/i18n/{vi,en,de}.json` (typed keys: tsc lists missing ones); content text is `Localized {vi,en,de?}` in data files.
- Stores (Zustand): player, time, world, flags, inventory, dialogue, minigame, care, pfand, ui (panel/transition/fastForward/newDay), guide, settings (persisted), toasts.
- Save: `systems/save.ts` versioned JSON in localStorage `visa-hunter-save`.
- Multiplayer: plan in `docs/MULTIPLAYER_PLAN.md` (shared world clock, no time-skips in MP, instances). Groundwork (not built): a player = `PlayerSnapshot` (`systems/netState.ts`: scene, x, z, yaw, MotionState, Outfit) — all serialisable; a remote player would be a `ChibiModel` fed with snapshots.
- PWA: `pwa/sw-template.js` filled by a plugin in `vite.config.ts` (precache list); vendor chunks react/three/physics.

## UI style
- Cartoon-game look: `--color-outline` (#4a3226) border on panels/chips/buttons + top highlight + solid bottom shadow (`index.css` utilities `panel`, `hud-chip`, `btn-lacquer`, `btn-jade`, `ribbon`). Use `border-outline`.
- No emoji in UI chrome: use SVG icons from `ui/icons.tsx` (Map, Run, Skip, Target, Check, Scroll, Star, Lock, Trash, Pin…), food `ui/ItemIcon.tsx`, papers `ui/PaperIcon.tsx`. Emoji are fine inside content text.
- Signs: `SignBoard` (alphaTest corners, auto-fit text, backing plate; `flat` for posters). Mount signs in front of trims/cornices (German street: `FRONT + 0.24`).

## Conventions
- Mobile-first; 360 px wide must work; HUD top, joystick bottom-left, action buttons bottom-right.
- Original/CC0 assets only (all geometry, textures, audio are procedural) — log in `src/assets/CREDITS.md`.
- Keep draw calls low: merge static shapes with `Shapes`; characters are 1 draw call each. Street ≈ 65 calls, interiors 10–25.
- Hooks: never call hooks conditionally (`a || useX()` is a bug).
- GLSL: `half` is reserved — don't use it as a variable name.

## Testing (headless, scratchpad scripts)
Scratchpad: `C:\Users\nghia\AppData\Local\Temp\claude\627b47bef90453e3\bf9c0947-1757-4f86-8200-2916becb1661\scratchpad\` (puppeteer-core + system Chrome, swiftshader).
- `m5story.mjs <out> [phone]` full story E2E · `guide.mjs` guide/tour · `guide-de.mjs` Germany guide targets · `m4scenes.mjs <out> desk <scenes>` scene tour + draw calls · `look.mjs <out> <xeom,player,trada,traffic,class,germany,mai>` model close-ups · `chars.mjs` · `pwa.mjs` (production/offline) · `weather.mjs`.
- `audit.mjs <out> [phone] [streets|rooms|ui]` screenshots of facades (signs), rooms, panels.
- `ch45.mjs <out> [phone]` chapters 4–5 + test mode + ending (`?test=1`). `v15.mjs <out> [phone]` sprint, bag weight, Studium path, map, wider streets.
- `mp.mjs <out>` accounts + multiplayer with two browsers (needs the 8798 server). `east.mjs <out> [phone]` new districts, activities, every secret reachable. `fashion.mjs <out>` outfit close-ups. `title.mjs <out>` title + login (fakes `navigator.webdriver=false`).
- Dev hooks `window.__vh`: teleport, travel, action, talk, choose, setFlag, skip, jump, objective, flags/stats/time/world/ui/guide/minigame/care stores, route, renderInfo, snapshot, `look([x,y,z],[x,y,z])` fixed inspection camera (`look()` to reset). In dev under webdriver the title screen is skipped; skip the first-time tour with `setFlag('tut.done', true)`.
- Lighthouse (production title screen): mobile perf 93.

## Ideas queued by the user
- Buying clothes is already in (Chị Hằng, Chú Thắng barber, Flohmarkt); more cuts/accessories can be added as data.
- Future: multiplayer phase 2–4 (shared clock, co-op, friends — `docs/MULTIPLAYER_PLAN.md`; the 4 open questions there are still the user's call), more professions / degrees, deploy (M10; the server needs a Node host, e.g. Azure App Service / Container Apps — ask first).
