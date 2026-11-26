# Asset credits

Assets are CC0 or our own; since 1.46 CC-BY, CC-BY-SA and MIT are allowed WITH credit. List each one here with its source
and licence (developer notes) AND in `src/data/credits.ts` — that list is what players see in the game (Settings →
"Ghi công & giấy phép", and the title screen link).

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
- **Shop interiors** (1.41) — shelves, chairs, sofas, lamps, cabinets, kitchen units, carpets, curtains, stools from
  **Quaternius *Ultimate House Interior Pack*** — license **CC0 1.0** — same mirror (`public/glb/house_interior_pack`),
  converted by `node tools/glb2props.mjs <folder> interior` into `src/assets/models/interior.bin/.json` (scaled ×0.5).

## Hà Nội library look (1.46)
- `src/assets/models/street.bin` + `street.json` — **City Kit (Roads)** by **Kenney** (https://kenney.nl/assets/city-kit-roads),
  license **CC0 1.0**: street lights, construction fences and cones, poles, signs, traffic lights (names `kr…`).
- `src/assets/models/towers.bin` + `towers.json` — **City Kit (Commercial)** by **Kenney** (https://kenney.nl/assets/city-kit-commercial),
  license **CC0 1.0**: low-detail blocks for the distant skyline, awnings, parasols (names `kc…`).
- `src/assets/models/citybits.bin` + `citybits.json` — **City Builder Bits** by **Kay Lousberg (KayKit)**
  (https://github.com/KayKit-Game-Assets/KayKit-City-Builder-Bits-1.0), license **CC0 1.0**: water tower, bins, benches,
  little town houses for the backdrop (names `c…`). Converted by `tools/kaykit2props.mjs <folder> citybits`.
- Hà Nội façades reuse Kenney's *Modular Buildings* (pack facade, below); shutters, iron balconies, roller shutters and
  tập thể cages are drawn by the game (no library has Vietnamese ones).
- More Fluent Emoji 3D icons (MIT, microsoft/fluentui-emoji) for map pins and shop signs: bank, camera, pill, post office,
  hospital, school, film projector, microphone, books, police light, flexed biceps, beer mug, church, hotel, temple, …
- `src/assets/models/urban.bin` + `urban.json` — models from **Poly Haven** (https://polyhaven.com/models), license
  **CC0 1.0**: *Modular Electricity Poles* (James Ray Cock), *Exterior Aircon Unit*, *Utility Box 01/02*, *Plastic Crate 02*,
  *Plastic Monobloc Chair 01*, *Small LPG Tank*, *Street Lamp 01/02*, *Planter Pot Clay*, *Ceramic Vase 03*, *Concrete Road
  Barrier*, *Fire Hydrant*, *Trashbag*, *Water Manhole Cover*, *Metal Trash Can*, *Outdoor Table Chair Set 01*, *Wooden
  Picnic Table*, *Brass Pot 01*, *Chinese Stool*, *Chinese Armchair*, *Barrel 02*, *Rollershutter Door*, *Security Light*,
  *Wooden Lantern 01* (authors listed on each model's Poly Haven page). The photo textures are baked into a few flat
  colours and the meshes simplified by `tools/polyhaven2props.mjs` (names `u…`).
- `src/assets/textures/asphalt.webp` + `concrete.webp` — grey detail maps made from **ambientCG** *Asphalt026A* and
  *Concrete034* (https://ambientcg.com, license **CC0 1.0**), shrunk to 256 px and normalised; multiplied softly onto roads
  and pavements (`withGroundDetail` in `scenes/shared/materials.ts`).
- Curved Vietnamese temple roofs (`scenes/shared/vnRoof.ts`) are generated in code — original work.

## München (1.45)
- `src/assets/models/facade.bin` + `facade.json` — **Modular Buildings** by **Kenney** (https://kenney.nl/assets/modular-buildings),
  license **CC0 1.0**: window, balcony, shop-window, door and roof modules for the town houses.
- `src/assets/models/town.bin` + `town.json` — **Fantasy Town Kit** by **Kenney** (https://kenney.nl/assets/fantasy-town-kit),
  license **CC0 1.0**: market stalls, benches, carts, fountains, lanterns, banners, hedges, rocks.
- Converted by `tools/kenney2props.mjs` (colours taken from Kenney's palette texture, repainted per house in the game).
  Thank you, Kenney!

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
  1.42 added the action / HUD icons (backpack, mobile-phone, gear, identification-card, globe, grinning face, door, bed,
  floppy-disk, egg, ice, shopping-cart, broom, open-book, ticket, tram, recycling-symbol, coat, laptop, input-numbers,
  chicken, rooster, hatching-chick, seedling, droplet, basket, bowl-with-spoon, briefcase, manual-wheelchair, diya-lamp,
  playground-slide, duck, sponge, hugging-face, t-shirt, dress, lipstick, ribbon, crown, sparkles, ear-of-corn,
  sunflower, sun, crescent-moon, sun-behind-cloud, fog).

## Animals (1.42)
- `src/assets/models/animals/hen.glb`, `chick.glb` — **Chicken** and **Chick** by **Quaternius**, **CC0 1.0**, from
  https://poly.pizza (models ineV9pU5VL / Z3RCoCYss4 / LH96IMq0rE pages). `dog.glb` — **Shiba Inu** from Quaternius'
  animals pack (**CC0**, mirror github.com/trebeljahr/quaternius-showcase). `cat.glb` — **Free Low-Poly Animals (cat)** by
  **Vuena**, **CC0 1.0**, https://github.com/Vuena/free-low-poly-animals-cc0. Changed: unused clips and the high LOD removed,
  clips renamed, texture shrunk to 512 px (scratchpad tool gt/animals.mjs with gltf-transform).

## Crops (1.42)
- `src/assets/models/farm.bin` + `farm.json` — **Quaternius Crops Pack**, **CC0 1.0** (same mirror,
  `public/glb/crops_pack`): lettuce, rice, tomato, corn, grass, bamboo, orange tree… converted by tools/glb2props.mjs.
  The interior pack (1.41) gained beds, kitchen units, a washing machine and doors from the same House Interior pack.

## UI icons (1.42)
- `@phosphor-icons/react` — **Phosphor Icons** by Helena Zhang and Tobias Fried — https://phosphoricons.com — **MIT
  licence**. Used for the small UI glyphs in `src/ui/icons.tsx` (close, check, lock, trash, run, skip, gear…).

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
- **radix-ui** (WorkOS, Radix Primitives, MIT licence, Copyright (c) 2022 WorkOS, https://github.com/radix-ui/primitives) for
  the 1.47 UI kit: switches, tab bars, desktop tooltips (src/ui/kit). Used unchanged, styled with our CSS.
- **@number-flow/react** (Maxwell Barvian, MIT licence, Copyright (c) 2024 Maxwell Barvian,
  https://github.com/barvian/number-flow) for the rolling money digits (src/ui/kit/Amount.tsx). Used unchanged.
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
- Item icons are original inline SVGs (`ItemIcon.tsx`); since 1.42 the action / HUD icons are Fluent Emoji 3D and the
  small UI glyphs Phosphor Icons (see below); the old drawings in `ActionIcon.tsx` stay as fallback.
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

## 1.48 vehicles, U-Bahn, buses
- **Kenney Car Kit** (3.1) and **Kenney Train Kit** — https://kenney.nl/assets/car-kit, https://kenney.nl/assets/train-kit —
  **CC0 1.0**. Packs `vehicles` (kv…) and `rail` (kl…) via `tools/kenney2props.mjs vehicles|rail <kit>` (one flat colour per
  palette cell, wheels simplified to 40 % with meshoptimizer). Traffic cars, showroom cars, the U-Bahn trains (repainted MVG blue)
  and the U-Bahn tracks.
- **"Montreal Bus"** by **Nick Ladd** — https://poly.pizza/m/fFCCghvRImG — **CC BY 3.0**
  (https://creativecommons.org/licenses/by/3.0/). Pack `bus` (pBus) via `tools/glb2props.mjs <folder> bus`. Changes: turned so its
  long axis runs along z (the file is rotated 45°) and its front faces +z, scaled to 10 m, triangles reduced, repainted per city
  (the transit logo is painted over), destination displays added in the game.
- **"Bus Stop"** by **Zsky** — https://poly.pizza/m/OWczicNWhO — **CC BY 3.0**. Pack `bus` (pShelter). Changes: scaled to metres,
  frame / glass repainted per city, timetable added in the game.
- Fluent Emoji 3D **bus**, **metro** (Microsoft, MIT) in `src/assets/icons3d`.

## 1.49 vehicle sounds (`src/assets/audio/sfx`, cut with ffmpeg: scratchpad `audio/tools/make.mjs`)
- `sfx-honk.ogg`, `sfx-hornmoto.ogg` — "Car Horn" by 15HPanska_Ruttner_Jan (Freesound 461679), https://commons.wikimedia.org/wiki/File:Car_Horn.wav —
  **CC0**. Honk = one honk cut out; hornmoto = the same honk pitched ×1.6, played twice.
- `sfx-hornbus.ogg` — "WWS CityBusMANSG220horn" by **Work With Sounds / Technical Museum of Slovenia**,
  https://commons.wikimedia.org/wiki/File:WWS_CityBusMANSG220horn.ogg — **CC BY 4.0**. Changes: first 1.1 s, fade out, loudness
  normalised, mono Ogg Vorbis.
- `sfx-bikebell.ogg` — "Bicycle-bell-1" by Soundscape_Leuphana, https://commons.wikimedia.org/wiki/File:Bicycle-bell-1.wav — **CC0**.
- `sfx-trambell.ogg` — "Bell-ring" by qubodup (Freesound 168709), https://commons.wikimedia.org/wiki/File:Bell-ring.flac — **CC0**
  (pitched down, two strikes).
- `sfx-enginerev.ogg` — "Nissan Juke - engine and exhaust sound" by **AndCars (YouTube)**,
  https://commons.wikimedia.org/wiki/File:Nissan_Juke_-_engine_and_exhaust_sound_(YouTube_m9Am72CCFuc).opus — **CC BY 3.0**. Changes:
  one throttle blip cut out (20.3–22.7 s), fades, loudness normalised, mono Ogg Vorbis.
