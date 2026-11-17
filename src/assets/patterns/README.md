# Clothing patterns ("sprites" for clothes)

Every `.svg` file in this folder is a **tileable fabric print** the game can put on any top or bottom.
The file name is the pattern id (`sen.svg` → `pattern: 'sen'`). Add a file and it is picked up
automatically — no code to change.

How to draw one (Inkscape, Figma, Illustrator, or by hand):
- `viewBox="0 0 64 64"`, transparent background: the garment's own colour shows through.
- It repeats in both directions, so whatever leaves one edge should come back on the opposite edge.
- `currentColor` (in `fill` / `stroke`) becomes the item's **`patternColor`**, so one print works in many
  colours. Fixed colours (e.g. green leaves `#5f9e57`) stay as drawn.
- Optional `data-size="0.15"` on the `<svg>`: how many metres one tile covers on a character
  (a chibi torso is about 0.3 m wide). Default 0.14.
- Keep it simple: no text, no images, no filters (it is drawn into a 128 px texture).

Use it in `src/data/clothes.ts`:

```ts
c('aoDaiSen', 'Áo dài hoa sen', 'Lotus áo dài', 'shirt', 'tailor', 1_400_000,
  { shirt: '#f7e9ef', top: 'aoDai', pattern: 'sen', patternColor: '#f28bb0' }, '#f7e9ef'),
// a printed skirt / trousers:
c('vayThoCam', 'Váy thổ cẩm', 'Brocade skirt', 'shorts', 'vnClothes', 260_000,
  { shorts: '#2a2a34', bottom: 'skirt', patternBottom: 'tho-cam', patternBottomColor: '#2a6fb0' }, '#2a2a34'),
```

The print covers every part of the character painted in exactly the `shirt` colour (or `shorts` colour
for `patternBottom`), on the 3D model and in the 2D portraits. `stripes` and `flowers` are older
built-in prints made of geometry, not files.

Current prints: `sen` (lotus), `mai` (apricot blossom), `dao` (peach blossom), `trong-dong` (Đông Sơn
bronze drum), `tho-cam` (highland brocade), `caro` (plaid), `song` (water waves), `hoa-nhi` (ditsy
flowers), `sao` (gold stars). All original work.
