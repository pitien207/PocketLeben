# Visa Hunter

A cute, mobile-first 3D life-sim: learn German in Hà Nội's Old Quarter, hunt a visa, and build a life in Germany.
Notes for coding sessions: [CLAUDE.md](CLAUDE.md) · Design and milestones: [docs/VISA_HUNTER_PLAN.md](docs/VISA_HUNTER_PLAN.md) · Progress: [docs/CHANGELOG.md](docs/CHANGELOG.md) ·
Deploy: [docs/DEPLOY.md](docs/DEPLOY.md)

## Run

```bash
npm install
npm run dev        # http://localhost:5173 (also prints a Network URL for your phone)
```

**Online (accounts, cloud save, multiplayer):** in a second terminal run `npm run server` (port 8787; data in
`server/data/`). The dev server forwards `/api` and `/ws` to it. Without it the game simply plays offline.
`npm run build && npm start` serves the built game and the API from one Node process.

Other scripts: `npm run typecheck`, `npm run build` (outputs `dist/`, incl. the service worker), `npm run preview`
(test the production build: title screen, PWA install, offline).

**Test mode** (also on a phone / production build): open the game with `?test=1`, or tap the version line in
Settings 5 times. Then ⏭ next to the objective skips a story step, and Settings → 🧪 jumps to any chapter or the
ending, switches the path (Studium / Ausbildung) and gives money / energy / next day. `?test=0` turns it off. In test mode the map (🗺️) teleports you: tap the map, a place or another scene.

Controls: WASD / arrows to walk, **hold Shift to run** (phones: 🏃 next to the joystick), E to interact, 🗺️ for the map.

In dev builds the browser console has helpers (`window.__vh`):

| Helper | What |
|---|---|
| `__vh.teleport(5.7, -6.7)` | move the player (here: in front of the café counter) |
| `__vh.travel('germany')` | change scene: `vietnam`, `home`, `classroom`, `examHall`, `embassy`, `airport`, `germany`, `buergeramt`, `wg`, `careHome` |
| `__vh.action('german.lesson')` | run any game action by id (see `registerActions` calls) |
| `__vh.talk('thayMinh')`, `__vh.choose(0)` | open a conversation, pick a choice |
| `__vh.time.getState().setTime(1, 19 * 60)` | jump to day 1, 19:00 |
| `__vh.stats.getState().setMoney(5_000_000, 'VND')` | set money |
| `__vh.setFlag('de.wg', 1)`, `__vh.flags.getState()` | story flags |
| `__vh.guide.getState()` | current guide (step, target, blocker); `__vh.route('home', 'embassy')` = first door on the way |
| `__vh.setFlag('tut.done', true)` | skip the first-time tour |
| `__vh.look([x,y,z], [x,y,z])` | fixed inspection camera (`__vh.look()` to return); `__vh.snapshot()` = multiplayer-ready player state |
| `__vh.skip('tr.zwischen')`, `__vh.jump(5)`, `__vh.objective()` | test mode: skip a step, jump to a chapter, current step id |
| `__vh.renderInfo()` | draw calls / triangles |
| `import('/src/net/client.ts')` → `remotes` | other players' latest snapshots (multiplayer) |

## Where things live

| Folder | What |
|---|---|
| `src/main.tsx`, `src/boot.tsx` | Entry (title screen only) → the game, loaded after "▶ Chơi" |
| `src/game/scenes/` | One folder per scene + `registry.ts` (spawns, plaques, lazy loading) and `interiors.ts` (seats/positions used by game logic). `shared/` has merged low-poly shapes, props, materials, `Room` (interiors), `Decor` (wall clock, fan, tear-off calendar) |
| `src/game/components/` | Player, ChibiModel, CameraRig, Lighting (day/night/rain), Weather (particles), GuideSystem (guide arrow/ring + edge arrow), ActionSpot, Interactable, WorkStation… |
| `src/game/components/npc/` | NPC (walk/sit/talk), Traffic (motorbikes, cars, bikes), ChatterDirector, SpeechBubble, NpcMarker |
| `src/game/minigames/` | Vocabulary, der/die/das, sentence builder, exam, Termin hunt, Q&A interview |
| `src/game/systems/` | Input, camera/player state, travel, guide (step-by-step guide, routing, first-time tour), time, calendar (dates, waiting), seats, places (doors of home/school), daylight, weather, dialogue, actions + conditions, quests/achievements watchers, german / visa / germany / pfand / wardrobe rules, audio, save/load, dev helpers |
| `src/ui/` | DOM overlay: HUD, TitleScreen (+ HanoiScenery art), Guide ("?" card, edge arrow, button glow, onboarding), ClockPanel, TimeOverlays (wait, new-day card, place plaque), Joystick, ActionButtons, DialogueBox, panels (shop, bag, clothes, quests, visa, care, work), Toasts, Settings |
| `src/store/` | Zustand stores (player, time, world, guide, inventory, flags, dialogue, minigame, care, pfand, settings, ui, interaction, work, toasts) |
| `src/data/config.ts` | Every tunable number (prices, fees, pay, energy, timings, weather, graphics) |
| `src/data/` | Content: `guides` (targets, hints, blockers per step + door map between scenes), `schedule` (opening hours), `npcs`, `dialogues/` (street, story, germany), `chatter`, `quests`, `achievements`, `events`, `vocab`, `interviews`, `visa`, `care`, `clothes`, `items`, `shops`, `tasks` |
| `src/net/` | Account + cloud save (`auth.ts`, tiny, used by the title screen) and the multiplayer client (`client.ts`) |
| `server/` | `index.mjs`: accounts, cloud saves, WebSocket rooms (Node + `ws`) |
| `src/i18n/` | `vi.json` (default), `en.json`, `de.json` |
| `pwa/` | App icon source and the service-worker template (filled in by `vite.config.ts` at build time) |
| `public/` | Manifest, icons, `staticwebapp.config.json` (Azure) |
