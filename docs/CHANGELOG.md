# Changelog

## 1.8.1 — Less lag, nicer Google login

### Performance
- Characters were the heaviest thing on screen: ~9,100 triangles each, ~30 per street, all casting shadows
  (256k of 368k triangles on the Hà Nội street). Mesh detail is now scaled down when the model is built
  (`ChibiModel` `detail`: NPCs "low" ≈ 3,300, your own character "high"). Hà Nội street 368k → ~215k triangles,
  Lindenstraße 147k → ~75k; the same test machine draws 2.3× more frames.
- The guide arrow no longer looks up a DOM element every frame.
- Dev helpers: `__vh.sceneStats()` (triangles per kind of object), `__vh.heavyMeshes()` (heaviest static meshes).

### Login panel
- Google is the main way in: three benefit tiles (cloud save, meet players, any device), the official Google button in
  a framed card ("one tap, no password"); the name + password form folds away behind "Dùng tên người chơi + mật khẩu".
- First Google sign-in: your Google photo (or initial), "Xin chào …!", the Gmail address, then the character name.

### Manual test checklist (phone)
- [ ] Walking on the Hà Nội street feels smoother than before (especially near the café / trà đá).
- [ ] Login: Google card on top; "Dùng tên người chơi + mật khẩu" opens the classic form.
- [ ] First Google login shows your photo and greeting.

## 1.8.0 — Sign in with Google, stay signed in, much less bandwidth

### Added — accounts
- **Sign in with Google** (Google Identity Services button on the login panel). First time: Google account verified →
  choose a player name → done. Next times: one tap. The server verifies Google's ID token itself (signature against
  Google's public keys, issuer, audience = our client ID, expiry) — `server/google.mjs`, no extra library.
- **Link Google** to an existing name+password account (Settings → Tài khoản): afterwards both ways work.
  Google-only accounts have no password ("use the Google button" if someone tries one).
- **Stay signed in automatically**: the login token renews itself whenever it is used and stays valid 1 year after
  the last visit — no password again (no checkbox; signing out is in Settings).
- The browser's password manager can save and fill name + password (Chrome/Edge/Android: Credential Management API).
- Hidden until the server has `GOOGLE_CLIENT_ID` (see docs/DEPLOY.md → Google sign-in).

### Changed — bandwidth / stored on the device
- Build writes **brotli + gzip** copies of every text file; the server sends the smallest one the browser accepts
  (physics engine 2.26 MB → 0.62 MB). First visit: ~1.15 MB over the network instead of ~4.2 MB.
- **ETag / 304** for index.html, sw.js, icons: an unchanged file costs no body. Hashed files stay cached for a year.
- **Service worker updates only download what changed**: files already on the device (same hash) are copied from the
  old cache — a new version no longer re-downloads three.js, the physics engine or React.
- The game asks the browser to keep its storage (`navigator.storage.persist`) so the downloaded game isn't evicted.
- Settings → "Dữ liệu game trên máy": how much is stored and whether it plays offline.

### Tests
- `memdb/google-test.mjs` (fake Google with its own RSA key; MongoDB in memory or files): 27 checks incl. forged,
  expired, wrong-audience and tampered tokens, linking rules, compression and 304. `ui-google.mjs`: the login UI.
  `sw-update.mjs`: production PWA first visit / second visit / update / offline through a byte-counting proxy.

### Manual test checklist (phone)
- [ ] (after GOOGLE_CLIENT_ID is set) Title → Đăng nhập → "Tiếp tục với Google" → pick a name → you're in.
- [ ] Close the browser, open the game again: still signed in, no password.
- [ ] Settings → Tài khoản: a password account shows the Google button; after linking it shows the Gmail address.
- [ ] Settings → "Dữ liệu game trên máy" says "Đã tải … MB · chơi offline được" on the installed/production site.
- [ ] Airplane mode → open the game from the home screen: it starts.

## 1.7.0 — Accounts + multiplayer, new districts with secrets, prettier characters, a fuller story

### Added — accounts, cloud save, multiplayer (phase 1 of docs/MULTIPLAYER_PLAN.md)
- **Server** `server/index.mjs` (Node + `ws`, no build step): accounts (name + password, scrypt hashes, 10 tries/min),
  cloud saves, and multiplayer rooms. `npm run server` (port 8787, data in `server/data/`, git-ignored).
  `npm start` also serves `dist/`, so one process can run the whole game. The dev server proxies `/api` and `/ws`.
- **Sign in** on the title screen ("Đăng nhập để chơi online") or in Settings → Tài khoản. Playing offline without an
  account still works exactly as before.
- **Cloud save**: uploaded every 30 s and when the page is hidden; on "Chơi" (and right after signing in) the newer
  save wins — continue on another device.
- **See each other**: one room per public place (street, Lindenstraße, classroom, Bürgeramt, university, airport,
  care home; max 25, then #2…). Homes, exams and interviews stay private. Other players are chibis with a name plate
  and their own outfit, smoothly following their position (10 updates/s), sitting/riding like you.
- **Emotes & quick phrases** (no free chat): 👋 💖 😆 😮 🥲 💃 + "Xin chào!", "Cảm ơn nha!", "Viel Glück!", "Tschüss!",
  "Đi theo mình!", "Ok luôn!" — a bubble above your head for everyone in the room.
- HUD: "N online" chip (tap → who is here), emote button. One connection per account (a new tab takes over;
  the old one offers "reconnect"). Each player still keeps their own clock (phase 2 = shared world clock).

### Added — bigger, more varied map with secrets
- **Hà Nội east block** (past the side road): **Đình Hàng Gai** (gate, courtyard with an incense urn, hall) where
  Ông Từ tells its history and you can **draw a fortune stick** (8 quẻ, once a day); a **hidden alley** with a cat
  and an old well; **Nước mía Cô Tư** (sugarcane juice, chè, kem Tràng Tiền); the **old bookshop** of Chú Hưng
  (read daily for German XP; he was a contract worker in Leipzig in 1987); the **night market** along the lake
  (17–24h, chè, bánh tráng nướng, lanterns that glow at night).
- **Lindenstraße east: the Stadtpark** — duck pond (feed the ducks a Brötchen), playground with **swings**, slide and
  sandbox, a statue at the gate, the **Kiosk am See** with beer-garden tables, Luca's **ice-cream cart**, and
  **Oma Gerda** on the bench (German words every day).
- **18 secrets** to discover by walking around (alley cat, old well, Hồ Gươm turtle, banyan shrine, mural, the
  keeper's Peugeot, night-market lights after 19h, a 1989 letter, grandma's scarf + the wedding photo at home,
  hedgehog Herbert, a geocache, a glove on the statue, a daisy meadow by day, a shooting star at night, a message in
  a bottle, Mieze the cat, an old note in the university library). A golden sparkle shows within a few metres.
  Each opens a little story card with a reward (money, mood, energy, German XP or **exclusive clothes**);
  all 18 → the golden Visa Hunter hoodie. Quest log → **Khám phá** tab lists them with hints.
- University library is open to Ausbildung players too (tram, after meeting Anna) — for the secret and side quest.
- New food: chè ba màu, bánh tráng nướng, kem Tràng Tiền, Spaghettieis, Apfelschorle (+ icons).
- Achievements: Nhà thám hiểm, Thổ địa chính hiệu, Xin quẻ đầu năm, Bạn của lũ vịt, Mọt sách.

### Changed — characters & clothes
- Faces: bigger eyes with two highlights, an upper lid line, a small nose; eye colours per character.
- New hairstyles: long, ponytail, twin tails, curly, spiky, buzz cut (+ bangs on bob/long/bun).
- New accessories: cap, beret, hair bow, flower crown, cat ears, headphones, sunglasses.
- New cuts: **hoodie** (hood, pocket, drawstrings), **jacket** (lapels over a white shirt), **dress**, real **áo dài**
  (mandarin collar, front/back panels over silk trousers); **scarf** and **tie** (new "neck" slot).
- 33 new clothing items across the four shops + 5 found as secrets (59 total). Dialogue portraits draw the new styles.
- Some NPCs restyled (Sophie, Tom) and 9 new people.

### Added — story
- **Chapter cards**: each chapter opens with a storybook page (who you are, what's at stake, a proverb).
- Story side quests: **Phố cổ của tôi** (fortune, Chú Hưng's Leipzig story, the night market),
  **Hành trang kỷ niệm** (grandma's scarf, the wedding photo, the 1989 letter), **Bà ngoại ở nước Đức**
  (befriend Oma Gerda → she becomes your "Leih-Oma"), **Không ai cô đơn** (the bottle message, Schulz's note, a call home).
- The ending card tells *your* journey (path, Leih-Oma, Tết, Chú Hưng, secrets, citizenship).

### Changed — UI
- Title screen: a little plane flies Hà Nội → Germany along a dashed route, drifting clouds, version badge,
  account chip. Login panel, discovery card, chapter card, emote picker and online list in the same outlined style.

### Manual test checklist (phone)
- [ ] `npm run server` running → title: "Đăng nhập để chơi online" → create an account → the green chip shows your name.
- [ ] Two phones/tabs with different accounts on the street: each sees the other with a name plate; walking, sitting
      at the trà đá stall and riding look right; emote bubble appears for both.
- [ ] Go home (private): the other player no longer sees you; come back: you reappear.
- [ ] Play a bit on one device, then "Chơi" on another with the same account: progress continues.
- [ ] Without the server: the game starts normally, no online chip, nothing breaks.
- [ ] Walk east past the side road: đình, alley (cat → card + cat ears), juice shop, bookshop, night market (glows after 19h).
- [ ] Draw a fortune at the đình; read at the bookshop (+XP); chè at the night market (17–24h).
- [ ] Germany east: Stadtpark — swing, feed ducks (buy a Brötchen first), Oma Gerda, kiosk, ice cream.
- [ ] Quest log → Khám phá: hints for missing secrets, stories for found ones.
- [ ] Barber/Chị Hằng/tailor/Flohmarkt: try long hair, ponytail, hoodie, dress, áo dài, cap, scarf, tie.
- [ ] A new chapter shows its story card once.

## 1.6.0 — Game-like UI, visual backpack, map teleport, fixed signs, multiplayer plan

### Changed — UI
- New visual language: every panel, chip and button has a dark brown outline, a top highlight and a solid
  "3D" bottom edge (cartoon-game look instead of soft generic pills). Buttons get a gradient + text shadow.
- HUD: energy/mood icons sit in round badges that overlap the chip; the coin overlaps the money chip; clock chip outlined.
- Emoji in the interface replaced by drawn SVG icons (objective target, check, scroll, star, skip, run, map, lock, trash),
  so they look the same on every phone.
- Action buttons, sheet close buttons and tabs restyled to match.

### Added — visual backpack
- The bag is now an **inventory grid** (4 columns, empty slots dashed): each item is a tile with its icon and count;
  important papers are gold tiles with a lock and their own drawn icons (passport, certificates, visa, ticket, cards,
  keys, student ID, diplomas, contract, residence permit). Tap a tile → the detail card at the top shows name,
  effects, weight and **Dùng / Vứt** (tap twice).
- New item icons: phở bowl, rice bag, fish sauce, medicated oil.

### Added — map teleport (test mode)
- In test mode the big map lets you **tap anywhere to teleport**, lists every place in the scene (tap → go there) and
  every other scene (tap → travel there).

### Fixed — signs
- Black corners on every shop sign (transparent canvas corners) — gone.
- Text that was too long is shrunk to fit the board (no more cut-off names).
- Signs on the German street sat behind the floor cornices (a bar crossed the text) — now mounted in front.
- Shop signs have a backing plate (thickness) like real signs; posters stay flat.
- Classroom exit sign no longer sticks up above the low side wall.

### Docs
- `docs/MULTIPLAYER_PLAN.md`: how multiplayer would work (shared world clock vs personal progress, what replaces
  sleeping / waiting / long trips, shared vs private rooms, co-op activities, architecture, roadmap, open questions).

### Manual test checklist (phone)
- [ ] HUD looks outlined and "chunky"; icons are drawings, not emoji.
- [ ] Shop signs on both streets: no black corners, no bar through the text, long names fit.
- [ ] Bag: grid of tiles, papers with a lock; tap a tile → details on top; Dùng / Vứt work.
- [ ] Test mode → 🗺️: tap the map → you jump there; tap a place name → you go there; tap another scene → you travel.

## 1.5.0 — University path, backpack weight, running, bigger map

### Added — Studium (chapter 4A)
- Choosing **Du học (Studium)** now leads to **Universität Lindenberg**: a dual nursing degree (B.Sc. Pflegewissenschaft).
  New scene: lecture hall with raised desk rows, blackboard + projector, Prof. Schulz at the lectern, the
  student office (Frau Klein) and a library corner (Kenji); reached by tram ("Đi tram tới đại học").
- Quests **Sinh viên năm nhất** (enrol 320 € incl. a semester transit pass → first lecture → one Werkstudent shift),
  **Học kỳ đầu tiên** (6 lectures, 2 library group sessions, Klausur), **Tốt nghiệp cử nhân** (12 lectures,
  6 Werkstudent shifts, thesis defence). The degree also makes you a qualified nurse, so chapter 5 is shared.
- Lectures/exams are Q&A with the professor (Pflegeprozess, prevention, evidence-based care, fall prevention,
  palliative care, citing sources…); group work is the sentence builder. Uni: Mon–Fri 8–18, one lecture a day.
- Quests can now branch: `when` (path condition) and `after` with several ids. Anna's Ausbildung choices only show
  on the Ausbildung path. Test mode: switch the path (🎓 Du học / 🩺 Học nghề).

### Added — backpack
- The bag has a **weight limit** (6 kg; +2/+4/+6 kg with the tote bag / study backpack / new hiking backpack).
  Every food item has a weight (rice 2 kg, phở 0.8 kg…); Pfand bottles weigh 0.35 kg each.
- Bag tab: weight bar, items with their weight, **🗑 throw away** (tap twice to confirm), Pfand bottles, and
  **🔒 important papers** (passport, certificates, visa, ticket, Anmeldung, bank/insurance cards, keys, student ID,
  diplomas, contract, residence permit) that can't be thrown away.
- Buying take-away or picking up bottles with a full bag is refused with a hint; red dot on the bag button when
  it's ≥ 90 % full; shops show item weights and your bag load.

### Added — running
- **Hold Shift** to run (×1.75). On phones: the **🏃** toggle above the joystick. Longer, faster strides.

### Added — bigger map + map view
- Hà Nội street is 18 m longer to the west: **Phở Gia Truyền** (Bác Phở — eat in or take away), **Nhà thuốc**
  (Cô Thảo — dầu gió), **May đo áo dài** (Cô Hoa — áo dài shop: red/yellow/white áo dài, silk trousers, nón lá),
  a banyan tree with a small shrine, more trees, poles, bikes, willows along Hồ Gươm.
- Lindenstraße is longer too: **Apotheke**, **Asia-Markt** (Chú Lý: rice, fish sauce, noodles), a fountain square
  with Frau Beck, more lindens and Pfand spots.
- **Map**: 🗺️ button (phones) / live minimap in the corner (wide screens) → big map with streets, buildings,
  labelled places, people, your arrow and the ⭐ goal; tells you which scene the goal is in and the next door.

### Changed — UI
- Quest log: a progress bar and "x/y bước" per quest. Clock panel: university and Asia-Markt hours.
- Controls hint mentions Shift / 🏃.

### Manual test checklist (phone)
- [ ] Tap 🏃 above the joystick → you run; tap again → walk. (Desktop: hold Shift.)
- [ ] 🗺️ (under the energy/mood chips) → map of the street with your arrow, ⭐ goal and place names.
- [ ] Walk west past Cô Liên's grocery: phở shop, pharmacy, áo dài tailor, banyan tree. Eat a phở at Bác Phở.
- [ ] Bag: weight bar, papers with 🔒, 🗑 asks for a second tap; buy many take-away items until "Ba lô đầy" appears; the bag button gets a red dot.
- [ ] Buy the hiking backpack at the Flohmarkt (or the study backpack at Chị Hằng), wear it → capacity rises.
- [ ] Test mode → Đường đi: 🎓 Du học → Nhảy tới Chương 4 → tram stop → "Đi tram tới đại học" → enrol, lecture, library group work.
- [ ] Prof. Schulz → "Em còn thiếu gì ạ?" shows lectures/group/shift counts; Klausur and thesis appear when ready; after the thesis the objective is the contract with Mr Vogel.
- [ ] Germany: walk west → Apotheke, Asia-Markt (Chú Lý), fountain with Frau Beck.

## 1.4.0 — The full story: chapters 4–5, ending, test mode

### Added — chapter 4 (nursing training)
- **Học nghề điều dưỡng**: 3 Berufsschule lessons + 6 care shifts → **Zwischenprüfung** (mid-term, Q&A with the
  examiner Dr Brandt: hygiene, drinking, pressure sores, records, confidentiality, falls).
- **Kỳ thi tốt nghiệp**: 6 lessons + 12 shifts → **Abschlussprüfung** (dementia, blood pressure, handover, fever…).
  Pass = Pflegefachkraft. Exams once per day; Anna shows your progress ("Em cần học bao nhiêu nữa?").

### Added — chapter 5 (a new life in Germany)
- **Hợp đồng chính thức**: Anna congratulates you, interview with the director Mr Vogel → permanent contract,
  shift pay ×1.8.
- **Tết đoàn viên**: book a flight home on the WG laptop (650 €) → home in Hà Nội decorated for Tết (peach blossom,
  bánh chưng, red couplets, lantern), Mum is home, Dad's Tết conversation, lucky money for your sister → fly back
  from the door (4 days pass).
- **Tổ ấm riêng**: save the 900 € deposit, rent your own flat at the Lindenstraße 12 door → no more flatmates, sofa,
  red lanterns, family photo; rent 160 €/week; the plaque says "Căn hộ của mình".
- **Định cư**: 6 weeks of rent + the **"Leben in Deutschland"** test (16 states, flag, Article 1, 1989…) at the
  Bürgeramt → Niederlassungserlaubnis → **ending card** (your journey in numbers) → free play.
- Post-game "Ước mơ tiếp theo": citizenship interview, save 10,000 €, 50 shifts, 1,000 Pfand bottles.
- 7 new achievements; step-by-step guide entries (targets, hints, blockers) for every new step; the guide routes
  WG → home (Tết flight) and home → Germany.
- The ending can be replayed from the laptop.

### Added — test mode (developer)
- Turn on: **Settings → tap the version line 5 times**, or open the game with **`?test=1`** (`?test=0` turns it off).
- ⏭ button on the objective chip and on every unfinished step in the quest log: skips the step **for real** (sets the
  flags, German level, visa, flight, currency…), so later steps work normally.
- Settings → 🧪 Test mode: skip the current step, **jump to chapter 2/3/4/5 or to the ending**, +money, refill
  energy/mood, next day.

### Fixed
- Random morning events with money (e.g. the 20,000 ₫ bike repair) no longer fire in Vietnam while you hold euros.
- "Cuộc sống ở Đức" side quest: Berufsschule / 5 shifts moved into the main story; new step "video-call home".

### Manual test checklist (phone)
- [ ] Open the game with `?test=1` (or tap the version 5× in Settings): a 🧪 section appears at the top of Settings and ⏭ next to the objective.
- [ ] ⏭ on the objective chip skips one step; "Nhảy tới: Chương 4" flies you to Germany with paperwork done and euros.
- [ ] Chapter 4: Anna → Học lý thuyết / Bắt đầu ca; after 3 lessons + 6 shifts → "Thi giữa khóa"; after 6 + 12 → "Thi tốt nghiệp". The exam card shows 📝 then the questions.
- [ ] Anna → "Phỏng vấn với ông Vogel" → contract; the next shift pays about ×1.8.
- [ ] WG laptop → "Đặt vé về Hà Nội ăn Tết" → long flight card → home with Tết decor and Mum; the door says "Ra sân bay, bay về Đức" but refuses until you talk to Dad.
- [ ] Back in Germany → Lindenstraße 12 door → "Thuê căn hộ riêng" → the room has a sofa and lanterns, no Lena/Jonas, plaque "Căn hộ của mình".
- [ ] Bürgeramt (Mon–Fri 8–16) → Mr Becker → "Leben in Deutschland" test → "Nộp hồ sơ định cư" → ending card → "Chơi tiếp".
- [ ] "Nhảy tới: Đoạn kết" from a fresh game reaches the ending card.
- [ ] Turn test mode off (Settings → 🧪 → Tắt): no ⏭ buttons anywhere.

## 1.3.0 — Better-looking characters and vehicles

### Changed — characters
- Every character is now **one skinned mesh** (one draw call) with real joints: arms and legs have elbows and knees.
  Draw calls dropped from ~190 to ~65 on the Hà Nội street and to 10–25 indoors.
- **Riders hold the handlebars and rest their feet on the footboard**: hands and feet are placed by inverse
  kinematics on anchor points of each vehicle (`RIDES` in `scenes/shared/vehicles.ts`). Cyclists' feet turn the
  pedals as fast as they ride. Anh Tú sits properly on his xe ôm.
- Drinking: the hand brings the glass to the mouth (IK), then lowers it; held glasses / fans stay upright.
- Walking: knees bend, elbows swing softly; riders lean forward.
- More detail: ears, soft eyebrows, side locks on bob hair, collar and hem lines, sleeve cuffs, button row on long
  shirts, mitten hands with thumbs, two-tone shoes with soles, helmet chin straps removed (cleaner look).
- Characters get a soft **rim light** so they stand out from the scenery.

### Added — clothing cuts
- Outfits now have a **top** (`tee`, `long` sleeves, `sleeveless`) and a **bottom** (`shorts`, `pants`, `skirt`).
- New clothes at Chị Hằng's stall: white long-sleeve shirt, tank top, khaki trousers, flared skirt; the áo bà ba,
  pullover and rain jacket now have long sleeves, jeans are full-length.
- 22 NPCs dressed by role: teachers and office staff in long sleeves and trousers/skirts, Bác Hùng in a tank top…

### Changed — vehicles & look
- New scooter and city bicycle sized for the chibis (front fender, grips, mirrors, saddle, pedals, basket); the flower
  bicycle rebuilt on the new frame.
- A soft vignette frames the scene (CSS, no GPU cost).

### For developers
- `CLAUDE.md`: a short map of the project for coding sessions — kept up to date.
- `systems/netState.ts`: a player is fully described by serialisable data (scene, position, yaw, `MotionState`,
  `Outfit`) — groundwork for multiplayer. Dev: `__vh.snapshot()`, and `__vh.look(from, at)` for a fixed inspection camera.

### Manual test checklist (phone)
- [ ] Street: motorbike riders hold the handlebars with both hands and have their feet on the scooter; stand in the road to make one stop next to you.
- [ ] Anh Tú (xe ôm) sits on his bike with hands on the grips.
- [ ] Germany: cyclists' legs pedal while they ride.
- [ ] Chị Mai at the café terrace lifts her glass to her mouth every few seconds, then lowers it.
- [ ] Walk around: knees and elbows bend; nothing looks broken when sitting on a stool for trà đá.
- [ ] Chị Hằng's stall: buy the khaki trousers / flared skirt / long-sleeve shirt → your character changes cut, not just colour; bag → wardrobe → "Mặc đồ cũ" goes back.
- [ ] Frame rate feels at least as smooth as before (fewer draw calls).

## 1.2.0 — Step-by-step guide

New players always know what to do next and where to go.

### Added
- **Guide data** for every story step (`data/guides.ts`, attached to the steps in `data/quests.ts`): the target
  (scene + NPC / interaction spot / point, or a HUD button), a "how to" hint (vi/en/de), and **blockers** with a way
  out — not enough money (→ work at the café), centre / embassy / Bürgeramt closed (→ wait with the clock), Termin
  not yet due, not enough XP for the exam, too tired (→ eat or sleep), already worked / viewed today, shift hours…
- **Gold arrow + pulsing ring** over the current target in 3D, drawn through walls (2 draw calls); hidden when you
  stand next to it.
- **Edge arrow** with the distance ("12 m") when the target is off-screen, kept clear of the HUD and the joystick.
- **Routing between scenes**: `route(from, to)` searches the map of doors (`SCENE_LINKS`) — at home it points to
  the front door, on the street to the language centre or to Tú the xe ôm driver (embassy, airport), in Germany to
  the WG door, the Bürgeramt or the tram stop.
- **HUD buttons glow** when the step is "press this" (passport → visa file, clock → wait).
- **Objective chip**: chapter progress ("2/8 bước"), a ⚠️ line when the step is blocked, a **"?"** button that opens
  the **"Làm thế nào?"** card (how-to, why it's blocked, where it is, buttons to open the clock / visa file / quests),
  a green ✓ flash when a step is done and a "👉 Tiếp theo: …" toast.
- **First-time tour** (once, with "Bỏ qua"): walk (joystick lit up / WASD) → turn the camera → follow the arrow to
  Bà Thu and talk → open the bag → open the clock → done. Each step advances when you do it. Existing saves with
  lessons already taken don't see it.
- **Settings**: "Chỉ đường" (arrows) and "Gợi ý" (hints, ⚠️ line, "?" button, next-step toasts) can be turned off.
- New condition `{ energy: n }` and guide checks (`visa.terminLater`, `visa.embassyOpen`, `de.castedToday`,
  `de.amtTerminToday/Later`, `care.shiftDoneToday`, `care.shiftHours`).

### Manual test checklist (phone)
- [ ] New game (Cài đặt → Chơi lại từ đầu): the tour card appears above the joystick, the joystick has a gold ring; walking moves to the next card.
- [ ] Swipe to turn the camera → next card; a gold arrow bounces over Bà Thu → talk to her → the bag button glows → open/close the bag → the clock glows → open/close → "Bắt đầu chơi!".
- [ ] After the tour: the 🎯 chip shows "0/8 bước" and a "?"; a gold arrow/ring sits at the language-centre door in the lane.
- [ ] Turn the camera away: a round arrow at the screen edge points to the target with the distance in metres.
- [ ] Go into your home: the arrow moves to the front door; "?" says you're at home and the way is "Ra phố".
- [ ] Wait until after 21:00 (clock → Chờ): the chip shows ⚠️ "Trung tâm Đức ngữ mở 7–21h…", the "?" blinks, the arrow points to your study desk.
- [ ] Spend money below 300.000 ₫ before enrolling: ⚠️ suggests the café and the arrow points at the café counter.
- [ ] Finish a step: the chip flashes ✅ and a "👉 Tiếp theo" toast appears.
- [ ] Visa chapter: the passport button glows; with a Termin on a later day the hint says to wait / sleep until that date.
- [ ] Germany: the arrow leads to Lindenstraße 12, then the Bürgeramt, Ms Wagner, the WG laptop, the tram stop, Anna.
- [ ] Cài đặt → Chỉ đường: Tắt hides arrows and glows; Gợi ý: Tắt hides the "?", ⚠️ line and next-step toasts.

## 1.1.0 — Hà Nội, class & exam scenes, time and days

The Vietnamese chapter now takes place in Hà Nội's Old Quarter, lessons and exams have their own rooms,
and the calendar is a real feature.

### Changed — Saigon → Hà Nội
- **Phố Hàng Gai, Hoàn Kiếm**: "vàng Hà Nội" ochre tube houses with terracotta tiled roofs, panelled wooden
  folding doors, green shutters, drainpipes and electricity meters, Vietnamese flags (the story starts on
  Mon 01/09/2025, the eve of National Day), a blue enamel street-name plaque, a parked cyclo (xích lô).
- **Hồ Gươm** across the far sidewalk: stone embankment with an iron railing, weeping willows, jade water,
  Tháp Rùa on its islet and the red Thê Húc bridge to Đền Ngọc Sơn. Distant blocks are ochre with tiled roofs.
- **Chị Lụa's flower bicycle** (xe đạp bán hoa): buy a bunch of cúc họa mi (+mood), ask about the flower seasons.
- Northern speech everywhere ("cháu", "nhé", "đấy", "cốc", "ngõ", "tắc đường", "mì tôm"…) and northern
  names: Bà Thu (trà đá), Cô Liên (tạp hóa), Chú Bình (bánh mì), Bác Hùng, Anh Đức, Anh Tú (xe ôm),
  Chú Thắng (sidewalk barber). The airport is Nội Bài.
- Café **Cà phê Phố Cổ** now serves **cà phê trứng** (coffee + egg + milk) instead of salt coffee.
- Weather: Hà Nội gets a light morning drizzle (mưa phùn); petals now include white hoa sữa.

### Added — Scenes for lessons and exams
- **Trung tâm Đức ngữ** at the end of the lane (open 7–21 h) → **classroom**: raised teacher's platform,
  chalkboard, "Học, học nữa, học mãi" banner, wooden two-seat desks with classmates, wall fan, a clock that
  shows the game time. "Học một buổi": class-bell card 🔔 → you sit at your desk → the mini-game on a
  **chalkboard**.
- **Exam room**: thi chứng chỉ takes you there (📝 card), you sit at desk SBD 0427 among other candidates,
  the exam is an **exam sheet** (ruled paper, red margin); afterwards you're taken back to class with the result.
- **Home interior** (door → "Vào nhà"): bed with a straw mat and mosquito net (sleep, 1-hour nap, save),
  study desk by the window (self-study in a **vở ô li** squared notebook), family altar, wooden tea set with
  Bố and your sister, a tear-off calendar showing today's date, the motorbike parked indoors.
  Passing out now wakes you in your bed (or your WG room in Germany).
- Every arrival shows a **place plaque** (Hà Nội blue enamel, German street sign, or a wooden room nameplate).

### Added — Time and days
- HUD clock shows **weekday + date** (01/09 · 1 Sep · 01.09.); tap it for the **clock & calendar panel**:
  date, "Ngày N of the journey", weather today/tomorrow, **wait** buttons (30′, 1 h, 3 h, until 18:00 — the
  clock spins forward, capped at 23:30), **time speed** (slow ×0.5 / normal / fast ×2, also in Settings),
  and **opening hours** of the places in this country with open/closed badges.
- **New-day card** after sleeping: the date, the day's weather, yesterday's money change, German XP earned and
  quest steps done, and today's objective. At midnight while awake: a "🌙 new day" note.

### Changed — UI
- Hà Nội palette: Thê Húc red, Old Quarter shutter green, ochre lines; panels use a faint **gạch bông**
  (encaustic tile) pattern. Title/loading screens show Hồ Gươm at sunrise instead of Hội An lanterns.

### Manual test checklist (phone)
- [ ] Title shows Hồ Gươm art and "HÀ NỘI → DEUTSCHLAND"; the street plaque "PHỐ HÀNG GAI" appears on arrival.
- [ ] Street: ochre houses with wooden doors and flags, Chị Lụa's flower bike on the far sidewalk; turn the camera south to see the lake, willows, Tháp Rùa and the red bridge.
- [ ] Walk up the lane to the Trung tâm Đức ngữ → **Vào lớp** → classroom; talk to Thầy Minh → enrol → **Học một buổi**: bell card, you sit down, chalkboard quiz.
- [ ] With enough XP → exam: 📝 card → exam room, you're seated, exam sheet → result → back to class.
- [ ] Leave class (doormat) → home door → **Vào nhà**: desk → **Tự học** (squared notebook); bed → **Chợp mắt** (clock spins 1 h, +energy); after 18:00 **Đi ngủ** → new-day card.
- [ ] Tap the clock: date, weather, wait buttons, time speed, opening hours; waiting after 23:30 is refused.
- [ ] Café: the new **cà phê trứng** order (coffee + egg + milk).
- [ ] Stay up past midnight: "🌙 Sang ngày mới" note; past 02:00 you wake in your bed.

## M4–M10 — German, visa, Germany, care work, Pfand & clothes, polish, PWA, deploy setup (1.0.0)

The whole story is now playable: Saigon street → German course A1–B1 → visa → flight → WG and
Bürgeramt in Germany → nursing shifts at a care home.

### Added — M4: Learning German (plan §6 chapter 1)
- **Thầy Minh's class** in the alley (whiteboard, desks, classmate Vy): enrol per level
  (A1 300.000 ₫, A2 400.000 ₫, B1 500.000 ₫), take 1-hour lessons, then the certificate exam
  (100k / 150k / 200k ₫). Self-study at home ("Tự học" at the door): free, half the XP.
- **Mini-games** (`src/game/minigames/`): vocabulary quiz (timed, 4 choices), der/die/das (article
  colours), sentence builder (tap words in order), 3-part exam (pass ≥ 70 %). Lessons rotate between
  them. Words and sentences are data (`data/vocab.ts`, incl. care vocabulary for Germany).
- XP bar toward the next exam; passing raises the level shown in the bag ("Tiếng Đức").

### Added — M5: The visa chapter (plan §6 chapter 2)
- **Chị Mai** (advisor at the café terrace) explains **Studium vs Ausbildung**; choose a path once you have B1.
- **Visa file** (passport button in the HUD): a checklist of 10 documents per path — passport, biometric photos,
  translated diploma and birth certificate, B1 certificate (automatic), CV, motivation letter, insurance,
  proof of funds (blocked account: 3M ₫ Studium / 1.5M ₫ Ausbildung, paid out in Germany), plus APS + admission
  (Studium) or a training contract (Ausbildung). Some take days to process.
- **Termin hunt** mini-game: refresh a booking calendar and grab a free slot before someone else does.
- **Embassy** scene (ride with Anh Tư the xe ôm driver, 30.000 ₫, open 8–17 h): visa officer interview
  as a question-and-answer game. Pass → visa ready 2 days later; fail or missing documents → try again tomorrow.
- **Airport**: buy the ticket (1.5M ₫), say goodbye to Mẹ, Bố and your little sister, board the plane.
  Your money is exchanged to euros (3.000 ₫ = 1 €) and you wake up in Germany the next morning.

### Added — M6: Arriving in Germany (plan §6 chapter 3)
- **Lindenstraße**: Altbau houses, Bürgeramt, supermarket, bakery, Döner stand, Sparbank, tram stop with a
  ticket machine, recycling bins, linden trees, cars and cyclists, a flea market; German chatter.
- **WG-Casting** with Lena and Jonas (Q&A game) → your own room (95 €/week, charged every Monday; hostel 25 €/night until then).
  Laptop in your room: health insurance sign-up, video call home (big mood boost, once a day).
- **Bürgeramt**: "Ohne Termin geht nichts" — book a Termin (hunt again), come back that day, take a number,
  wait, fill in the Anmeldung (Q&A). Then open a bank account with Herr Wagner. Office hours Mon–Fri 8–16.
- **Tram** (weekly ticket 15 €; ride without one and an inspector may fine you 60 €).
- German shops (EUR): Brötchen, Brezel, Döner, Schorle, Kaffee, Pizza, Kuchen, Asia-Nudeln. Supermarket closed on Sundays.

### Added — M7: Care home workday (plan §6 chapter 4)
- **Pflegeheim Sonnenhof** (by tram): 4 residents with need bubbles and a patience ring — feed, clean, chat,
  comfort, push the wheelchair. 2-minute shift (= 8 h), pay 30–90 € depending on satisfaction,
  + care XP ("Chăm sóc"). Shifts start 6–14 h, once per day, after the paperwork is done.
- Anna (Praxisanleiterin) also offers **Berufsschule** theory: a care-vocabulary quiz for XP.

### Added — M8: Pfand, shops, customisation
- **Pfand bottles** lie around the German street (and respawn): walk over them to collect, return at the
  supermarket for 0,25 € each.
- **Clothes**: Chị Hằng's stall (áo bà ba, nón lá, áo dài…), Chú Sáu the barber (hairstyles), the German
  flea market (yellow rain jacket, beanie…). Wear them from the bag → wardrobe tab; your portrait uses your outfit.

### Added — Quests, achievements, events
- **Quest log** (tap the objective under the clock): chapters 1–4, sticky steps, a current-objective tracker.
  Side quests: life in Saigon (café shift, trà đá, clothes), life in Germany (rent, 20 bottles, Berufsschule, 5 shifts).
- **15 achievements** (bag → achievements tab) and **random morning events** (Mẹ sends money, rain floods the street,
  the tram is late, a neighbour brings cake…).

### Added — M9: Polish
- **Weather**: rainy days in Germany (45 %), afternoon showers in Saigon; grey sky, softer shadows, rain sound
  (muffled indoors), rain icon on the clock. Red phượng and purple bằng lăng petals drift through Saigon by day.
  Particles animate on the GPU (one draw call each).
- **Procedural audio**: music themes for Vietnam, Germany and indoors + sound effects, all generated with
  WebAudio (no audio files). Settings has separate switches for music and sound effects.
- **Title screen** ("▶ Chơi" / "▶ Chơi tiếp · Ngày N", language picker). It appears instantly; the 3D game
  loads after the tap (which also unlocks sound on phones).
- **PWA**: web manifest, app icons, a service worker generated at build time that caches the whole game →
  installable, plays offline after the first visit.
- **Performance**: vendor code split into react / three / physics chunks (cached across updates), scenes lazy-loaded,
  static splash in `index.html`, non-blocking web fonts.
  Lighthouse (production build, which measures the title screen): **mobile performance 93**, desktop 100; accessibility 93
  (the only remaining item is `user-scalable=no`, kept on purpose so pinch/double-tap doesn't zoom the game);
  best practices 100; SEO 100. Tap → playable: ~2 s on a fast-4G-class connection, ~2 s offline from cache.

### Added — M10: Deploy setup (not deployed yet)
- `.github/workflows/azure-static-web-apps.yml` (build with Node 24, upload `dist/`, PR preview URLs) and
  `public/staticwebapp.config.json` (SPA fallback, immutable caching for hashed assets, no-cache for
  `index.html` / `sw.js`, MIME types, security headers). Step-by-step guide incl. the
  `visahunter.nghiapham.org` CNAME: [docs/DEPLOY.md](DEPLOY.md).

### Changed / fixed
- Scenes: one scene at a time, loaded on demand with a fade (`game/scenes/registry.ts`, `systems/travel.ts`);
  the save remembers which scene you're in. Interiors use a dollhouse camera and warm indoor light.
- The character no longer walks while a menu, dialogue or mini-game is open.
- The camera no longer gets pulled in by invisible walls and small props (new `PROP_GROUPS` collision group).
- The café shift is now an optional side quest, and a skipped step can never block the story (a quest also
  opens once a later quest is complete).
- The controls hint moved above the joystick so it doesn't cover the objective.

### Manual test checklist (phone)
- [ ] Title screen appears instantly with lanterns; VI/EN/DE switch works; **▶ Chơi** → loading → the street. Sound plays after that first tap.
- [ ] The objective under the clock says what to do next; tapping it opens the quest log.
- [ ] Alley: talk to **Thầy Minh** → enrol A1 → **Học một buổi** → play the mini-game (answer feedback, result screen, XP toast).
- [ ] Home door → **Tự học** works (half XP). Der/die/das and the sentence builder come up in later lessons.
- [ ] With enough XP, Thầy Minh offers the exam; pass → toast + level in the bag. Repeat for A2 and B1.
- [ ] Café terrace: **Chị Mai** → choose Ausbildung → **Hồ sơ visa** opens; do each document step (money and time go down; some wait a day).
- [ ] The passport button in the HUD reopens the visa file. **Săn lịch hẹn**: tap a free slot fast → Termin day shown.
- [ ] On that day: **Anh Tư** (xe ôm) → Đại sứ quán → talk to the officer → interview → approved (or rejected → retry next day).
- [ ] Two days later: buy the flight (Chị Mai or the visa file) → Anh Tư → airport → talk to Mẹ → board → long fade → Germany, money in €.
- [ ] Germany: rain on some days (rain icon on the clock, grey sky, rain sound); bottles on the street can be picked up.
- [ ] Lindenstraße 12 → WG → Lena → **WG-Casting** → accepted; laptop: insurance + call home; bed works.
- [ ] Bürgeramt (Mon–Fri 8–16): book a Termin → on that day take a number → Anmeldung form → done. Sparbank → open an account.
- [ ] Tram stop: buy a weekly ticket → ride to the care home → Anna → start a shift (6–14 h): tap residents' needs, watch the meter, Feierabend screen, € paid.
- [ ] Supermarket: return bottles for €; shops closed on Sunday show a toast.
- [ ] Clothes: Chị Hằng / Chú Sáu / Flohmarkt → buy → bag → wardrobe tab → wear; the achievements tab lists unlocked ones.
- [ ] Saigon on a dry day: petals drift down; some afternoons bring a short shower.
- [ ] Reload anywhere (even in Germany or inside a building): you continue where you were.
- [ ] Production build only (`npm run build && npm run preview`): add to home screen, airplane mode, reopen → still playable.

## M3 — Stats, time/day, energy, save/load, simple shop + street life & Vietnamese UI (0.3.0)

### Added — M3 (plan §5.1, 5.2, 5.5, 5.6, 5.8)
- **Mood** stat next to energy (face icon changes with mood). Energy now drains slowly over time.
- **Clock & calendar:** 1 real second = 1 game minute while you roam (paused in menus, chats and shifts).
  Day 1 is a Monday at 07:00. HUD shows time, weekday and day number with a sun/moon icon.
  Eating, chatting and working cost game time (a full café shift = 3 h).
- **Day & night:** sky, fog, sunlight and shadows follow the clock (dawn → day → golden hour → dusk →
  moonlit night). Café string lights and street lamps glow at night.
- **Sleep:** at the home door, "Đi ngủ" (from 18:00, or any time when energy < 35) → next morning 07:00,
  full energy, better mood, autosave. Still awake at 02:00 → you fall asleep on the street and wake at
  home tired and grumpy.
- **Simple shop + bag:** Tạp hóa Cô Ba sells mì gói, bánh bao, xôi, nước mía, nước tăng lực into your
  bag; the bag (HUD button) lets you eat/drink them and shows skill XP. Items live in `data/items.ts`,
  shops in `data/shops.ts`.
- **Save/load:** everything (money, energy, mood, skills, day/time, bag, flags, position, camera) is
  saved to localStorage shortly after any change, every 10 s, and when the tab is hidden; loaded on
  start. Settings → Dữ liệu: export/import a save code, or start over.
- The café now has opening hours (07:00–22:00); a shift costs time and changes mood by how well it went.

### Added — Street life
- **Trà đá stall** at the alley mouth: parasol, big tea jug, glasses, sunflower seeds, "TRÀ ĐÁ 5K"
  cardboard sign. Bà Sáu sells (fanning herself); Chú Năm and Anh Hai sip and gossip.
- **Interactive NPCs with a "!" badge** until you've talked to them today:
  - **Bà Sáu** — buy a trà đá: your character walks to the free stool, sits and sips (energy + mood);
    or ask for neighbourhood gossip (random lines, tips about Germany and the café job).
  - **Cô Ba** — the grocery owner; "Mua đồ" opens her shop, or ask her whether going to Germany is hard.
  - **Chú Bảy** — strolls the sidewalk with a đòn gánh (shoulder pole) of bánh mì; eat one now or take one away.
- **Dialogue box:** portrait, red name ribbon, typewriter text, choice buttons with prices
  (keyboard: Space/E to continue, 1–4 to choose, Esc to leave). Dialogues are data (`data/dialogues.ts`).
- **Ambient life:** pedestrians on both sidewalks (they stop and say "Cho qua chút nha!" if you block
  them), two kids playing **đá cầu** on the far sidewalk, **motorbike traffic** in both lanes (helmeted
  riders slow down, stop and honk "Bíp bíp!" if you stand in the road).
- **Speech bubbles** pop up now and then: trà đá gossip as multi-line conversations, vendor calls,
  kids' banter (`data/chatter.ts`, vi/en/de).
- The neighbour's ground floor is now **Tạp hóa Cô Ba** (shelves of goods, hanging snack strips, drink
  crates, cooler, red-and-gold sign). The main road is open to traffic (side road still closed).

### Changed — UI made prettier and more Vietnamese
- New look: "giấy dó" paper panels with a faint four-petal pattern and gold inner line, lacquer-red +
  gold primary buttons and ribbon titles (Tết colours), jade-green secondary buttons, rounded
  **Baloo 2** display font (full Vietnamese support).
- Redesigned HUD (two compact rows), old-coin money icon (round with a square hole), jade clock chip.
- New loading screen with swaying Hội An lanterns; starry "Zzz…" sleep screen; red joystick knob.
- Action buttons show NPC names + roles; the main action is a red pill, others are gold-ringed circles.

### Notes
- Content text (dialogue, chatter, items) is vi + en with German where written; missing German falls back to English.
- ~120–160 draw calls on screen with all NPCs (measured in dev with `__vh.renderInfo()`).

### Manual test checklist
- [ ] Loading screen shows lanterns; the street has people: Bà Sáu's trà đá stall, Cô Ba at her grocery, Chú Bảy walking with baskets, pedestrians, kids kicking a shuttlecock, motorbikes on the road.
- [ ] Speech bubbles appear every few seconds near you (gossip at the trà đá stall, "Bánh mì nóng giòn đây!").
- [ ] Red "!" badges float over Bà Sáu, Cô Ba and Chú Bảy; after talking, the badge is gone for the rest of the day.
- [ ] Walk up to Bà Sáu → **Nói chuyện** → buy a trà đá: you sit on the free stool, sip, then get +energy/+mood; money −5.000 ₫.
- [ ] Ask Bà Sáu for gossip; "Kể nữa đi bà" gives a different line.
- [ ] Cô Ba → **Mua đồ** → buy items (badge ×n), close, open the **bag** (HUD) → **Dùng** restores energy.
- [ ] Catch Chú Bảy (he stops and turns to you) → buy a bánh mì.
- [ ] Stand in the road: a motorbike stops before you and honks; you can't walk through bikes or pedestrians.
- [ ] Clock runs (~1 game minute per second) and pauses in menus/conversations; the sky turns golden ~17:30, purple ~19:00, blue at night; lamps and café lights glow.
- [ ] Home door: before 18:00 "Chưa buồn ngủ"; after 18:00 **Đi ngủ** → Zzz → next day 07:00, full energy.
- [ ] Stay up until 02:00 → you pass out and wake at home.
- [ ] **Reload the page:** money, energy, mood, day/time, bag and position are all kept.
- [ ] Settings → Dữ liệu: export the code, start over (fresh game), import the code (progress back).
- [ ] Café closed before 07:00 / after 22:00; a shift advances the clock.
- [ ] Phone portrait (incl. 360 px wide) and landscape: HUD fits, dialogue choices are easy to tap.

## M2 — Interaction system, context buttons, first WorkStation: café barista (0.2.0)

### Added
- **Interaction system** (`store/interactionStore.ts`, `components/Interactable.tsx`): anything can register
  a zone + 0–4 actions. Standing in a zone focuses it; its actions appear as round buttons bottom-right
  (plan §4). Desktop: **E** = main action, **1–4** = buttons. Tapping/clicking the object itself also
  triggers the main action (or says "Lại gần hơn nhé!" if you're too far). Floating pins mark spots
  with something to do.
- **Generic WorkStation** (`components/WorkStation.tsx`, `game/systems/work.ts`, `store/workStore.ts`):
  location + actions + "Độ hài lòng" (satisfaction) meter + reward, driven entirely by data in
  `data/tasks.ts` (`{ id, scene, actions[], requests[], durationSec, pay, energyCost, skill, xp }`).
  Customers bring requests; pressing the needed actions (any order) fulfils them; a wrong action spills
  the drink; waiting too long makes the customer leave. Pay = wage × time worked × satisfaction
  multiplier (0.5–1.5) + tips for fast orders. Energy cost and skill XP are prorated too.
- **Café barista job** (`scenes/VietnamStreet/CafeJob.tsx`): press **Làm ca** at the counter → the
  character walks behind the counter, the camera turns to a 3/4 view and zooms in, and a 60 s shift
  starts. Five Vietnamese drinks (đen đá, nâu nóng, sữa đá, bạc xỉu, cà phê muối) from four
  ingredients (cà phê, sữa, đá, muối). The cup on the counter fills with coloured layers as you add
  ingredients. Customers (6 looks, incl. nón lá and glasses) walk in, fidget when impatient, hop
  with 💖 when served or slump with 💢 when they give up.
- **Shift UI:** timer, satisfaction bar, order card with ingredient slots + patience bar, "Nghỉ ca"
  (end early), results screen (served/missed, wage, tips, total, XP, energy) and **Nhận lương** to
  collect. The HUD money shows a floating "+xx.000 ₫" when paid. Feedback toasts for every outcome.
- **Player stats now change:** money, energy and skill XP (not saved yet — that's M3).
- **Café rework:** counter moved forward to make room behind it; the roof, sign and awning cut away
  (but keep casting shadows) while you're inside.
- **Dev helpers** (dev builds only): `__vh.teleport(x, z)`, `__vh.work.getState()`, `__vh.project(x, y, z)`.

### Changed
- See-through occluders now taper toward the player and clear fully at the core, so props right in
  front of the character (counter, espresso machine) stay solid and nothing speckles over them.
- The chibi model is data-driven (`data/npcs.ts` outfits: hair styles, conical hat, glasses, backpack).

### Notes
- Energy can't be restored yet (sleep/food arrive in M3): after ~5 shifts the button turns into
  "Mệt quá". Reloading the page resets stats until saving exists.
- Balancing lives in `data/config.ts` → `jobs.cafeBarista` and `work`.

### Manual test checklist
- [ ] A yellow pin bobs above the café sign; walk in through the front. Roof, sign and awning disappear while inside and come back when you leave.
- [ ] Walk up to the counter (front or behind): **Quầy cà phê** + **Làm ca** appear bottom-right. Walk away: they disappear.
- [ ] Press **Làm ca** (or tap the counter, or press E): the character walks around the counter's left end to the barista spot; joystick hides; camera turns and zooms in.
- [ ] Customers walk in from the street; the order card shows the drink and its ingredient slots. Tapping the right ingredients ticks the slots and fills the cup; the customer hops with 💖 and money "Nhanh ghê! Tip…" appears for fast service.
- [ ] Tap a wrong ingredient: "Sai công thức…", the cup empties, satisfaction drops.
- [ ] Ignore a customer: they fidget when the patience bar gets low, then leave with 💢; satisfaction drops.
- [ ] Tapping the counter mid-shift does nothing (no accidental ingredients).
- [ ] Open settings mid-shift: the timer pauses.
- [ ] Shift ends at 0 s (or via **Nghỉ ca**): results screen; **Nhận lương** adds the total (HUD shows "+…₫"), energy goes down, control returns.
- [ ] Desktop: E starts, 1–4 pick ingredients, Enter/E collects pay.
- [ ] Phone portrait + landscape: order card, buttons and joystick don't overlap; all buttons easy to hit.
- [ ] With low energy the button says **Mệt quá** and won't start.

## M1 — Project setup, street corner, chibi player, controls, HUD (0.1.0)

### Added
- **Stack:** Vite 8, React 19, TypeScript (strict), React Three Fiber 9, drei 10, Rapier 2, Zustand 5, Tailwind 4.
- **Scene `VietnamStreet`:** Vietnamese street corner with the family tube house (nhà ống: shop-front
  shutter, balconies, bougainvillea, rooftop water tank), a neighbour house, an open-front café
  ("CÀ PHÊ" sign, striped awning, string lights, counter, sidewalk tables with plastic stools),
  parked scooters, trees, power poles with tangled wires, zebra crossings, hedges, and a pastel
  skyline fading into fog. All geometry is procedural and merged per object for few draw calls.
- **Player:** chibi built from primitives (big head ≈ 45% of height, bob haircut, blush, backpack),
  idle breathing + blinking, walk cycle with bounce, arm/leg swing and forward lean.
  Capsule rigid body with Rapier; collides with buildings and props.
- **Controls:** virtual joystick bottom-left on touch devices (with dead zone, safe-area aware);
  WASD / arrow keys on desktop; drag (mouse or finger) on the 3D view to rotate the camera.
- **Camera:** third-person follow at 40°, smooth damping, wider view on portrait screens,
  pulls in when a building would block the view; poles/trees/roofs between the camera and
  the player dither out ("see-through occluders").
- **HUD:** settings, music toggle, money (VND, 2.500.000 ₫), energy bar (80/100) — static values
  from `data/config.ts`. Settings dialog: music, graphics (Đẹp/Mượt), language (VI/EN/DE),
  fullscreen (where supported). Esc toggles settings on desktop. Preferences persist in localStorage.
- **i18n:** all UI text via `src/i18n/{vi,en,de}.json` (Vietnamese default; missing keys fail type-check).
- **Performance:** DPR capped (2 on "Đẹp", 1.25 on "Mượt") and auto-lowered by drei
  `PerformanceMonitor` when the frame rate drops; soft PCF shadows; ~35 draw calls for the scene.

### Notes
- Music toggle stores the preference only; audio (Howler) arrives with the polish milestone.
- Money/energy are display-only until M3 (stats, time, save/load).

### Manual test checklist
**Phone (portrait and landscape)**
- [ ] Page loads to the "Visa Hunter" splash, then fades into the street with the player in front of the yellow house.
- [ ] Joystick appears bottom-left; dragging it walks the player smoothly in that direction (relative to the camera); releasing stops and the knob springs back.
- [ ] Small pushes walk slowly, full pushes walk at full speed.
- [ ] Swiping with a second finger (or anywhere off the joystick) rotates the camera; walking still feels "up = away from camera".
- [ ] Player can't walk through houses, the café walls/counter, scooters, trees, tables, or past the hedges/road barriers.
- [ ] Walk into the café and behind the counter; the roof fades around the player so they stay visible.
- [ ] Walk down the alley between the house and the café to the back wall; the camera never ends up inside a building.
- [ ] Poles/trees passing in front of the camera turn see-through instead of hiding the player.
- [ ] HUD sits below the notch / status bar; nothing is cut off on a narrow phone; no page scroll, zoom, or text selection when tapping/dragging.
- [ ] Rotate the phone: layout and camera adapt without reloading.
- [ ] Settings: music, graphics, language and fullscreen (Android) work; choices survive a reload.
- [ ] Switching graphics to "Mượt" keeps the game smooth on a weaker phone.

**Desktop**
- [ ] WASD and arrow keys move; diagonal movement isn't faster; keys don't get stuck after alt-tabbing.
- [ ] Mouse drag rotates the camera; Esc opens/closes settings.
- [ ] Hint at the top explains the controls and fades after ~8 s.
