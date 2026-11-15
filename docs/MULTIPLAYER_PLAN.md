# Visa Hunter — Kế hoạch Multiplayer

> Trạng thái (1.7.0): **giai đoạn 1 đã làm** — tài khoản, save trên mây, thấy nhau theo phòng, biểu cảm + câu nói nhanh
> (`server/index.mjs`, `src/net/`). Server chạy local (`npm run server`), **chưa deploy**. Giai đoạn 2 (đồng hồ chung) chưa làm.
>
> Trước đó: Đã có nền móng: mỗi người chơi được mô tả hoàn toàn bằng dữ liệu
> `PlayerSnapshot` (`src/game/systems/netState.ts`: cảnh, x, z, hướng, `MotionState`, `Outfit`), nên một người chơi
> khác chỉ là một `ChibiModel` được "bơm" snapshot từ mạng.

## 1. Vấn đề cốt lõi: thời gian

Chơi đơn hiện tại, **mỗi người tự điều khiển thời gian**:

| Hành động | Ảnh hưởng thời gian hiện tại |
|---|---|
| Ngủ | nhảy tới 6–7h sáng hôm sau |
| Bấm đồng hồ → chờ | tua nhanh vài giờ |
| Học 1 buổi / làm 1 ca | +90 phút / +8 giờ |
| Chờ Termin, chờ visa | chờ qua nhiều ngày |
| Bay sang Đức / về quê ăn Tết | +1 đến 4 ngày |

Khi nhiều người chung một thế giới, **không ai được tua thời gian của người khác**. Vì vậy multiplayer phải
tách hai thứ:

- **Đồng hồ thế giới (chung):** ngày/đêm, thời tiết, giờ mở cửa hàng, lịch NPC. Do server giữ, chạy liên tục.
- **Tiến độ cá nhân (riêng):** năng lượng, tiền, tiếng Đức, nhiệm vụ, visa… Mỗi người một bản.

## 2. Đề xuất: đồng hồ chung chạy nhanh + "thời gian cá nhân" đổi thành năng lượng và hẹn giờ

### 2.1 Đồng hồ thế giới
- Server giữ `worldTime`, **1 ngày trong game = 60 phút ngoài đời** (cấu hình được; 1 giờ game = 2,5 phút).
- Đêm được rút ngắn: 22h–6h chỉ chiếm ~15% vòng ngày (~9 phút), để ít ai phải "chơi trong bóng tối".
- Mỗi thành phố (Hà Nội, Lindenstraße) là một **shard** có cùng đồng hồ; client chỉ hiển thị.

### 2.2 Không còn tua thời gian — thay bằng gì?

| Chơi đơn (giữ nguyên) | Multiplayer |
|---|---|
| **Ngủ** → sang sáng hôm sau | Ngủ = nằm lên giường (người khác thấy), **hồi năng lượng nhanh** (đầy trong ~3 phút thật). Thoát game → **nghỉ offline**: năng lượng hồi theo thời gian vắng mặt. Không nhảy ngày. |
| **Chờ** (tua đồng hồ) | Bỏ. Thay bằng nút **"Báo tôi khi…"** (ví dụ "khi Bürgeramt mở cửa") → thông báo đẩy. |
| Học 90 phút, ca làm 8 giờ | Thời lượng = **chính mini-game** (1–2 phút thật). "Giờ" không trừ vào đồng hồ chung; giới hạn bằng **năng lượng** và **1 lần mỗi ngày game** (đã có sẵn: `care.lastShiftDay`, `uni.lectureDay`…). |
| Chờ Termin / visa nhiều ngày | Đổi thành **hẹn giờ thật** gắn vào ngày thế giới: visa có sau 3 ngày game = 3 giờ thật. Trong lúc chờ vẫn chơi bình thường (làm thêm, học, đi chơi). |
| Bay sang Đức (+1 ngày) | Màn chuyển cảnh ngắn; người chơi **chuyển shard** sang Lindenstraße. Đồng hồ không đổi. |
| Về quê ăn Tết (4 ngày) | Đi vào **phòng riêng "Nhà mình – Tết"** (instance); đồng hồ chung vẫn chạy; khi quay lại không bị nhảy ngày. |
| Tiền nhà thứ Hai | Trừ theo **ngày thế giới**; nếu offline thì trừ khi đăng nhập lại (tối đa 2 tuần để không "nợ" quá nặng). |

### 2.3 Hệ quả cho thiết kế
- Mọi điều kiện dạng "đợi tới ngày X" (`dayReached`) đã dựa trên **số ngày** → chỉ cần đổi nguồn ngày từ `timeStore`
  sang `worldTime` của server. Hệ điều kiện (`data/conditions.ts`) giữ nguyên.
- Các hành động `spendTime(...)` trong chế độ MP **không đẩy đồng hồ**; thay vào đó trừ năng lượng tương ứng.
  Viết một lớp `timeCost(minutes)` duy nhất: SP → `spendTime`, MP → `spendEnergy`.
- Giữ **chế độ chơi đơn** y như cũ (lưu local). Multiplayer là một **save riêng trên server**.

## 3. Thế giới chung và phòng riêng

| Loại | Ví dụ | Ai thấy ai |
|---|---|---|
| **Công cộng** (shared) | Phố Hàng Gai, Lindenstraße, quán cà phê, Bürgeramt (phòng chờ), giảng đường, thư viện, Asia-Markt | Mọi người trong shard (tối đa ~25/phòng, đầy thì mở phòng mới) |
| **Riêng** (instance) | Nhà mình, phòng WG / căn hộ, phòng thi, phỏng vấn Đại sứ quán, WG-Casting, đám cưới… | Chỉ mình (hoặc bạn bè được mời) |
| **Nhóm** (party) | Ca chăm sóc co-op, học nhóm, ca cà phê 2 người | Thành viên nhóm |

Người chơi ở **tiến độ khác nhau** vẫn gặp nhau: người mới học A1 ở Hà Nội thấy người khác đang săn Termin;
ai đã sang Đức thì ở shard Lindenstraße. Người đã sang Đức có thể **về Hà Nội thăm** (chuyến Tết) và gặp người mới.

## 4. Hoạt động chung (lý do để chơi cùng)

1. **Học cùng:** cùng ngồi lớp Thầy Minh / giảng đường; ai trả lời đúng nhiều nhất được thêm XP ("bảng điểm lớp").
2. **Học nhóm thật:** thay Kenji bằng người chơi khác — mỗi người ghép một nửa câu.
3. **Ca cà phê đôi:** một người pha, một người nhận order; tip chia đôi.
4. **Ca chăm sóc co-op:** 2–3 điều dưỡng chia các cụ; thanh hài lòng chung.
5. **Đua nhặt Pfand** 5 phút trên Lindenstraße; bảng xếp hạng tuần.
6. **Giúp đỡ:** người đi trước có thể "kèm" người mới (chỉ đường, tặng đồ ăn) → thành tựu "Đàn anh/đàn chị".
7. **Thăm nhà:** mời bạn vào căn hộ riêng; trang trí nhà (endless mode).
8. **Giao tiếp an toàn:** câu nói nhanh + emote (vẫy tay, cười, "Viel Glück!"); chat tự do chỉ giữa bạn bè, có lọc từ.

Kinh tế: **không cho mua bán tiền** giữa người chơi (tránh lạm phát / gian lận); chỉ **tặng quà** món ăn, quần áo có
giới hạn mỗi ngày.

## 5. Kiến trúc kỹ thuật

```
Client (React + R3F)                         Server (authoritative cho dữ liệu, không cho vật lý)
├─ Player.tsx  ──snapshot 10 Hz──►  Room "vietnam#3"  (Colyseus / Durable Object)
├─ RemotePlayers  ◄─ snapshot 10 Hz ── phát lại cho mọi người trong phòng
├─ worldTime  ◄──── tick mỗi 5 s ─── WorldClock (1 / shard)
└─ actions (buy, shift, exam…) ──RPC──► Gameplay service → kiểm tra điều kiện, ghi Save DB
```

- **Mạng:** WebSocket. Gợi ý **Colyseus** (Node, phòng + đồng bộ trạng thái có sẵn) chạy trên Azure Container Apps,
  hoặc **Azure Web PubSub** nếu muốn serverless. Mỗi cảnh công cộng = một room.
- **Di chuyển:** client tự tính (Rapier), gửi `PlayerSnapshot` 10 lần/giây; server kiểm tra tốc độ tối đa
  (`walkSpeed × runMultiplier`) để chặn hack. Client khác **nội suy** với độ trễ ~100 ms.
  `MotionState` (ngồi, cưỡi xe, uống…) đã là dữ liệu thuần → gửi thẳng.
- **Dữ liệu quan trọng do server quyết định:** tiền, túi đồ, cờ nhiệm vụ, kết quả thi. Client gửi *ý định*
  ("tôi mua bánh mì"), server dùng chung `data/` + `conditions` (chạy được trên Node vì không phụ thuộc React)
  để kiểm tra rồi trả kết quả.
- **Mini-game:** chạy trên client, gửi kết quả + nhật ký ngắn; server chấm lại câu hỏi Q&A (đáp án nằm ở server
  trong chế độ MP để chống gian lận).
- **Lưu trữ:** tài khoản ẩn danh (device id) → sau này đăng nhập Google/Apple. Save JSON như `systems/save.ts`
  (đã có version) lưu ở Azure Cosmos DB / Table Storage. Có nút **chuyển save chơi đơn lên server**.
- **Hiệu năng:** người chơi khác dùng chung hình học theo outfit (đã cache), mỗi người 1 draw call;
  giới hạn hiển thị ~20 người gần nhất, xa hơn thì ẩn.

## 6. Lộ trình

| Giai đoạn | Nội dung | Ước lượng |
|---|---|---|
| **0 — Nền móng** ✅ | `PlayerSnapshot`, `MotionState`, `Outfit` thuần dữ liệu | đã xong |
| **1 — Thấy nhau** ✅ (1.7.0) | Server phòng theo cảnh; thấy người khác đi lại, ngồi, cưỡi xe; emote + câu nói nhanh. **Mỗi người vẫn giữ đồng hồ riêng** (giống "bóng ma"), chưa đụng tới thời gian. | 1–2 tuần |
| **2 — Đồng hồ chung** | `worldTime` trên server; chế độ MP bỏ tua thời gian; ngủ = hồi năng lượng; nghỉ offline; hẹn giờ thật cho Termin/visa; `timeCost()` thay `spendTime()`. Save lên server. | 2–3 tuần |
| **3 — Chơi cùng** | Học cùng lớp, học nhóm, ca cà phê đôi, ca chăm sóc co-op, đua Pfand + bảng xếp hạng. | 3–4 tuần |
| **4 — Xã hội** | Bạn bè, nhóm, thăm nhà, tặng quà, sự kiện theo mùa (Tết, Oktoberfest, Weihnachtsmarkt). | 3+ tuần |

## 7. Câu hỏi cần bạn quyết định

1. **Tốc độ đồng hồ thế giới:** 1 ngày game = 60 phút thật (đề xuất), 30 phút (nhanh hơn, hợp phiên chơi ngắn trên điện
   thoại) hay theo giờ thật như Animal Crossing (chậm, hợp chơi lâu dài)?
2. **Server:** Colyseus trên Azure Container Apps (linh hoạt, tốn ~10–20 USD/tháng lúc đầu) hay Azure Web PubSub
   (serverless, tính tiền theo tin nhắn)?
3. **Chat:** chỉ câu nói nhanh + emote (an toàn, hợp mọi lứa tuổi) hay cho chat tự do giữa bạn bè?
4. **Giai đoạn 1** có nên ra trước (thấy nhau nhưng thời gian vẫn riêng) để thử phản ứng người chơi không?
