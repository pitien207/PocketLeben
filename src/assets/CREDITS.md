# Asset credits

Every asset must be CC0 or our own (plan §2, §9). List each one here with its source and license.

## 3D models
- All geometry (player, NPCs, Saigon street, embassy, airport, German street, Altbau houses, WG,
  Bürgeramt, care home, vehicles, props, backdrops) is built in code from primitives — original work,
  no external models.

## Textures
- Pavement tiles, awning stripes and every shop / street sign (Vietnamese and German) are drawn at runtime on `<canvas>` —
  original work, no image files.

## Music
- "Đi Đức — ngày nắng" (`src/assets/audio/music/di-duc-ngay-nang.ogg`) and "Đi Đức — đêm mưa"
  (`di-duc-dem-mua.ogg`): background music provided by the user (project owner) for this game.
- Sound effects and ambience are synthesised in code (`src/game/systems/audio.ts`, `src/title/titleAudio.ts`).

## Title screen
- The 3D desk scene (`src/title/deskScene.ts`), its painted textures and the synthesised ambience
  (`src/title/titleAudio.ts`) are built in code from the user's own start-menu design ("Đi Đức · Start Menu"),
  turned into a daytime version — no external models, images or sound files.

## Icons
- Title / loading illustration of Hồ Gươm (Tháp Rùa, Thê Húc bridge) is original inline SVG (`src/ui/HanoiScenery.tsx`).
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

- Character style (toon shading, ink outline, painted anime face, hair/outfit shapes): based on the project owner's own design file "chibi.js" (Visa Hunter / "Đi Đức"), re-implemented in src/game/components/chibi/.
