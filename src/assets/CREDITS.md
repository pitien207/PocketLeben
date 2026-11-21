# Asset credits

Every asset must be CC0 or our own (plan §2, §9). List each one here with its source and license.

## 3D models
- All geometry (player, NPCs, Saigon street, embassy, airport, German street, Altbau houses, WG,
  Bürgeramt, care home, motorbikes, bicycles, props, backdrops) is built in code from primitives — original work.
- **Traffic cars** (1.22): six cars (NormalCar1, NormalCar2, SportsCar, SportsCar2, SUV, Taxi) from the
  **Cars Pack by Quaternius** — https://quaternius.com/packs/cars.html — license **CC0 1.0** (public domain,
  https://creativecommons.org/publicdomain/zero/1.0/). Converted from OBJ/MTL by `tools/obj2cars.mjs` into
  `src/assets/models/cars.bin` + `cars.json` (scaled ×0.8, some material colours adjusted, body repainted per car).
  Thank you, Quaternius (https://www.patreon.com/quaternius).

- **Trees, plants, buildings, street furniture** (1.33) by **Quaternius** — license **CC0 1.0**:
  *Ultimate Nature*, *Simple Nature*, *Ultimate House Interior* (house plants), *Ultimate (Textured) Buildings*
  (colour versions), *Modular Streets*, *Cyberpunk Game Kit* (AC units, antennas), *Medieval Village* (stalls, benches,
  gazebo), *Survival* (bin) — https://quaternius.com. GLB files taken from the fan mirror
  https://github.com/trebeljahr/quaternius-showcase (same CC0 files). Converted by
  `tools/glb2props.mjs` into `src/assets/models/nature|city.bin/.json` (scaled, welded, simplified with
  meshoptimizer, repainted per material in the game).

## Textures
- Fabric prints in `src/assets/patterns/*.svg` (hoa sen, hoa mai, hoa đào, trống đồng, thổ cẩm, caro, sóng nước, hoa nhí,
  sao vàng, 1.23): original SVG artwork made for this game.
- Pavement tiles, awning stripes and every shop / street sign (Vietnamese and German) are drawn at runtime on `<canvas>` —
  original work, no image files.

## Sound effects (1.24)
- `src/assets/audio/sfx/sfx-*.ogg` (click, pickup, right, wrong, coin, till, stamp, success, fail, door, ding) are taken
  from **Kenney**'s *Interface Sounds*, *RPG Audio* and *Impact Sounds* packs — https://kenney.nl — license
  **CC0 1.0** (public domain). Renamed only. Thank you, Kenney!
- The other effects (scanner beep, whistle, honk, school bell, sip, rain…) are still synthesised in code.

## 3D icons (1.25)
- `src/assets/icons3d/*.webp` (food, drinks, vehicles, trees, house, faces, stopwatch, money bag, party popper…) are
  **Fluent Emoji 3D** by Microsoft — https://github.com/microsoft/fluentui-emoji — **MIT licence**
  (Copyright (c) Microsoft Corporation). Shrunk to 128 px WebP; otherwise unchanged. 1.35 added bicycle, fuel-pump, key; 1.40 package, takeout-box.

## Restaurant props (1.40)
- `src/assets/models/food.bin` + `food.json` (pots, bowls, plates, stools, tables, chairs, vegetable crates, jars,
  burners, menu boards…) are converted from **KayKit Restaurant Bits** by **Kay Lousberg** —
  https://github.com/KayKit-Game-Assets/KayKit-Restaurant-Bits-1.0 — license **CC0 1.0**. Converted by
  `tools/kaykit2props.mjs` (atlas colours → flat colours per part, dense parts simplified); otherwise unchanged.
  (The 1.26 Grab sprites from Kenney's Racing Pack were removed with the Grab mini-game in 1.40.)

## Libraries
- **postprocessing** (Raoul van Rüschen, zlib licence, https://github.com/pmndrs/postprocessing),
  **@react-three/postprocessing** (Poimandres, MIT licence, https://github.com/pmndrs/react-postprocessing) and
  **n8ao** (N8python, ISC licence, https://github.com/N8python/n8ao) for the 1.32 post effects (AO, bloom, grade).
- **motion** (motion.dev, formerly Framer Motion, MIT licence, https://github.com/motiondivision/motion) for the quest animations.
- **sonner** (Emil Kowalski, MIT licence, https://github.com/emilkowalski/sonner) for the notifications.
- **canvas-confetti** (Kirill Shestakov, ISC licence, https://github.com/catdad/canvas-confetti) for the confetti in
  the job mini-games.

## Music
- "Đi Đức — ngày nắng" (`src/assets/audio/music/di-duc-ngay-nang.ogg`) and "Đi Đức — đêm mưa"
  (`di-duc-dem-mua.ogg`): background music provided by the user (project owner) for this game.
- Sound effects and ambience are synthesised in code (`src/game/systems/audio.ts`, `src/title/titleAudio.ts`).

## Title screen
- The 3D desk scene (`src/title/deskScene.ts`), its painted textures and the synthesised ambience
  (`src/title/titleAudio.ts`) are built in code from the user's own start-menu design ("Đi Đức · Start Menu"),
  turned into a daytime version — no external models, images or sound files.

## Icons
- Loading-screen illustration (Hà Nội rooftop at dusk, `src/ui/LoaderArt.tsx`): inline SVG from the user's own design.
- App icon (passport + paper plane) is original artwork: `pwa/icon.svg`, rendered to PNG in `public/icons/`.
- HUD, action and item icons are original inline SVGs (`src/ui/icons.tsx`, `ActionIcon.tsx`, `ItemIcon.tsx`).
- Dialogue portraits are drawn from each character's outfit data (`src/ui/Portrait.tsx`).

## Fonts
- **Nunito** by Vernon Adams et al. — SIL Open Font License 1.1 — loaded from Google Fonts.
- **Baloo 2** by Ek Type — SIL Open Font License 1.1 — loaded from Google Fonts (titles, signs).
- **Be Vietnam Pro** (Lâm Bảo, Tony Le, ViệtAnh Nguyễn), **Patrick Hand** (Patrick Wagesreiter), **Barlow Condensed**
  (Jeremy Tribby) — SIL Open Font License 1.1 — loaded from Google Fonts (title screen: menu, handwriting, stamp).

## Emoji
- Customer reactions (💖 💢) use the device's system emoji font — no bundled images.

## Particles
- Rain streaks and petals are drawn by shaders in `src/game/components/Weather.tsx` — original, no textures.

## Audio
- No audio files. Music themes, sound effects and rain ambience are synthesised at runtime with the
  WebAudio API (`src/game/systems/audio.ts`) — original work.

- Character style (toon shading, ink outline, painted anime face, hair/outfit shapes): based on the project owner's own design file "chibi.js" (Pocket Leben, formerly Visa Hunter / "Đi Đức"), re-implemented in src/game/components/chibi/.
