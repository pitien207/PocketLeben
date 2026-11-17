# Visa Hunter — Toàn bộ cốt truyện (bản 1.15.0 · phần Việt Nam theo cốt truyện 2.1)

> **Cách dùng file này:** sửa thẳng vào đây. Gạch bỏ, viết thêm, đổi lời thoại, đổi thứ tự đều được.
> Cách đánh dấu gợi ý: `[SỬA: …]`, `[BỎ]`, `[THÊM: …]`. Xong thì bảo tôi; tôi đọc phần thay đổi rồi làm vào game.
> Chữ trong `ngoặc code` là mã nội bộ (id nhiệm vụ / cờ), cứ để nguyên để tôi biết chỗ nào trong code.
> Số tiền, số buổi… là con số hiện tại trong `src/data/config.ts`. Muốn đổi thì sửa luôn ở đây.

---

## 0. Tổng quan

**Nhân vật chính:** 20 tuổi, lúc bắt đầu chọn **Nam** hoặc **Nữ** (chỉ khác ngoại hình). Sống với **Bố**, **Mẹ** và em gái **Na** (16 tuổi, lớp 11) trong căn nhà ống màu vàng ở **phố Hàng Gai**, Hà Nội. Ước mơ: **sang Đức đi làm, kiếm tiền gửi về nhà, và đi du lịch khắp nước Đức.**

**Khởi đầu:** 3.000.000 ₫, năng lượng 80/100, tâm trạng 60/100. Ngày 1 là Thứ Hai, 7:00 sáng.

**Thời gian:** 1 tuần game ≈ 1 tháng ngoài đời. A1 → B1 khoảng 7–9 tuần game, chương 2 khoảng 2–3 tuần game.

**Ví:** ví đồng (₫) và ví Euro (€). Đổi tiền ở Ngân hàng Phố Cổ (anh Quân): mua € 31.500 ₫, bán € 30.000 ₫.

**Mạch chính (5 chương):**

```
Chương 1  Học tiếng Đức A1 → A2 → B1 (Hà Nội)
   │
Chương 2  Chọn con đường ──┬── Studium (du học đại học)
   │                       └── Ausbildung (học nghề điều dưỡng)
   │      Làm hồ sơ visa → săn lịch Đại sứ quán → phỏng vấn → bay sang Đức
   │
Chương 3  Chào nước Đức: phòng WG, Anmeldung, ngân hàng, bảo hiểm
   │
Chương 4  ┌── Nhánh Ausbildung: viện dưỡng lão Sonnenhof → thi giữa khóa → thi tốt nghiệp
          └── Nhánh Studium: Đại học Lindenberg → thi học kỳ → bảo vệ luận văn (vừa học vừa làm Werkstudent)
   │      (hai nhánh gặp lại nhau)
Chương 5  Hợp đồng chính thức → Tết về quê → căn hộ riêng → giấy định cư = KẾT THÚC
          (sau kết thúc: nhập quốc tịch, tiết kiệm, …)
```

**Các nhánh ở phần Việt Nam:** (1) sau A2: ký **Chương trình Cầu nối Sonnenhof** (được trả B1 + vé máy bay, chỉ còn Ausbildung) hay **tự đi**; (2) chương 2: **Ausbildung** hay **Studium** (Studium cần Sperrkonto 11.904 € → họp gia đình: thế chấp sổ đỏ / nhờ cô Lan / đổi sang Ausbildung). Ngoài ra: vay bố mẹ (căn nhà xuống cấp), tự làm giấy tờ hay nhờ văn phòng, cảnh báo Linh hay không.

**Đang tắt:** toàn bộ phần **bí mật** (18 điểm bí mật, 2 nhiệm vụ phụ dựa trên bí mật). Bạn đã bảo "tạm bỏ"; nội dung vẫn còn trong code, ghi ở mục 8.

---

## 1. Chương 1 · Học tiếng Đức ở Việt Nam

### Lời dẫn chương 🏮 ✏️
> Bạn 20 tuổi, sống cùng bố mẹ và em gái trong căn nhà ống vàng ở phố Hàng Gai. Trên tường phòng bạn dán một tấm bản đồ nước Đức cắt từ tạp chí cũ, chi chít những chấm bút đỏ: Berlin, München, Hamburg, Leipzig… Bạn muốn sang đó đi làm, gửi tiền về sửa lại mái nhà dột, và một ngày được tự mình đứng ở những chấm đỏ ấy. Bố mẹ không giàu, nhưng tin bạn. Trong ví có ba triệu, trong đầu có một chữ "Guten Tag". Bước đầu tiên: học tiếng Đức ở trung tâm của Thầy Minh trong ngõ, và kiếm đủ tiền để học tiếp.
>
> *"Đi một ngày đàng, học một sàng khôn."*

### Nhiệm vụ chính

**1.1 Bắt đầu hành trình** `start`
1. Đến Trung tâm tiếng Đức trong ngõ, gặp Thầy Minh `start.teacher`
2. 🆕 Xin việc làm thêm đầu tiên (Tiệm Trà Sữa Phố Cổ **hoặc** Circle K đầu phố) `start.job`
3. Đăng ký khóa A1 `start.enroll`

**1.2 Chứng chỉ A1** `a1`
1. Học bài cho đủ XP (lớp học hoặc tự học) `a1.xp`
2. Thi đậu A1 `a1.exam`

**1.3 Chứng chỉ A2** `a2`: Đăng ký khóa A2 → Thi đậu A2 → 🆕 Nghe chị Mai giới thiệu Chương trình Cầu nối (xem 1.5)

**1.4 Chứng chỉ B1** `b1` ✏️: Đăng ký khóa B1 (hoặc được Cầu nối trả) → Thi đậu **cả 4 kỹ năng** B1

✏️ **Bảng học phí và lệ phí thi**

| Khóa | Học phí (trung tâm Thầy Minh) | Lệ phí thi Goethe | XP cần | Ngoài đời |
|---|---|---|---|---|
| A1 | 4.500.000 ₫ | 3.000.000 ₫ | 60 | Goethe Hà Nội: khóa 15 triệu; thi A1 2,5 triệu (học viên) / 3 triệu (tự do) |
| A2 | 5.000.000 ₫ | 3.500.000 ₫ **(ư)** | 80 | Goethe: khóa 15 triệu; thi A2 3 triệu (học viên) |
| B1 | 6.500.000 ₫ | 4.800.000 ₫ **(ư)** cả 4 kỹ năng | 120 ✏️ | Goethe: khóa 19–20 triệu; thi B1 4 triệu (học viên, 4 kỹ năng) |

*Trung tâm nhỏ trong ngõ rẻ hơn Goethe khoảng 3 lần, giống ngoài đời. Học phí trung tâm tư là ước tính.*

- Mỗi buổi học ở lớp: 1 tiếng, 8 năng lượng, trò chơi nhỏ (từ vựng, der/die/das, ghép câu).
- Tự học ở bàn: 45 phút, 5 năng lượng, ½ XP.
- 🆕 **Học Nicos Weg trên điện thoại** (khóa miễn phí có thật của Deutsche Welle): 20 phút, 2 năng lượng, ¼ XP, làm được trên xe buýt, lúc nghỉ ca. Miễn phí nhưng chậm.
- Thi cần đúng ≥ 70%. Đậu +15 tâm trạng, trượt −8.
- 🆕 **B1 thi theo 4 kỹ năng** (Đọc, Nghe, Viết, Nói), giống Goethe thật: trượt kỹ năng nào chỉ thi lại kỹ năng đó (1.200.000 ₫ mỗi kỹ năng **(ư)**).

**Thầy Minh** (lời thoại):
- "Chào em! Lớp tiếng Đức của thầy đây. Mục tiêu tiếp theo: {A1/A2/B1} ({xp}/{cần} XP)."
- Mẹo của thầy: danh từ giống cái hay có đuôi -ung, -heit, -keit · "Ở Đức đúng giờ là số một" · "Từ quan trọng nhất ở Đức là Termin" · "Tự học cũng được nhưng đi học nhanh gấp đôi" · "Das Mädchen là das, đừng hỏi thầy tại sao!"
- 🆕 "Học phí đóng một lần, nhưng tiếng Đức phải đóng mỗi ngày. Ngày nào không học là ngày đó nợ."
- 🆕 Khi người chơi thiếu tiền đóng khóa: "Thiếu bao nhiêu? … Thôi, em đóng trước một nửa, nửa còn lại cuối tháng. Nhưng chỉ lần này thôi đấy!" (mỗi khóa chỉ được hoãn một lần, nợ thầy hiện trong sổ)
- Khi có B1: "Em có B1 rồi! Thầy tự hào lắm. Giờ sang văn phòng tư vấn của chị Mai ở đầu phố Hàng Bông mà hỏi chuyện hồ sơ nhé."

### 🆕 1.5 Điểm rẽ sớm: Chương trình Cầu nối Sonnenhof `cauNoi`

Mở sau khi đậu A2. Chị Mai giới thiệu: viện dưỡng lão Sonnenhof (Đức) tuyển học viên điều dưỡng từ Việt Nam, **trả học phí B1, lệ phí thi B1 và vé máy bay**. Đổi lại: ký **thỏa thuận làm việc 2 năm** sau khi tốt nghiệp; nghỉ sớm thì hoàn lại một phần chi phí.

*Ngoài đời: nhiều cơ sở điều dưỡng ở Đức thật sự hỗ trợ tiền học tiếng và vé máy bay, vì họ đang rất thiếu người.*

1. Phỏng vấn online với chị Anna (Sonnenhof) bằng tiếng Đức A2, 4 câu, cần 50% `cn.interview`
2. Đọc kỹ hợp đồng (trò chơi nhỏ: tìm 3 điều khoản quan trọng: lương, thời hạn ràng buộc, số tiền hoàn lại) `cn.read`
3. Ký hoặc từ chối `cn.choose`

| Chọn | Được | Mất |
|---|---|---|
| **Ký Cầu nối** | B1 + thi B1 + vé máy bay miễn phí (~28 triệu) | Khóa nhánh: chương 2 chỉ còn **Ausbildung**. Cờ `cauNoi.signed` |
| **Tự đi** | Giữ cả hai nhánh | Tự trả hết, phải làm thêm rất nhiều hoặc vay bố mẹ |

**Chị Mai:** "Chị nói thật: đây là chương trình tử tế, có hợp đồng tiếng Đức rõ ràng, lương ghi rõ trước thuế và sau thuế. Còn ai hứa 'lương trăm triệu, đóng 250 triệu là bay' thì em chạy ngay nhé."

### 🆕 1.6 Mạch truyện Linh (phần 1) `linh`

**Linh**, bạn cùng lớp A1 ở trung tâm Thầy Minh, quê Nghệ An, thuê trọ ở Ô Chợ Dừa. Vui tính, học giỏi hơn bạn, nhưng nhà nghèo hơn.
- Lớp A1: Linh rủ học nhóm (+XP cho cả hai). "Tớ mà sang được Đức thì mẹ tớ khỏi phải đi cấy thuê nữa."
- Lớp A2: Linh khoe đã ký với **Công ty Hoàng Kim** (môi giới, tên hư cấu): "Họ lo hết, B1 không cần đậu cũng được, đóng 250 triệu thôi, bố tớ vay rồi. Lương bên đó trăm triệu một tháng!"
- Người chơi chọn:
  - "Linh ơi, trăm triệu là lương **trước thuế** đấy, mà chị Mai bảo không có B1 thì không ai cấp visa học nghề đâu…" (cờ `linh.warned`)
  - "Ừ, thế thì tốt quá." (không có cờ)
- Dù chọn gì, Linh vẫn đi (cô ấy đã vay tiền rồi). Hậu quả nằm ở chương 4 (phần Đức, chưa có trong file này).

*Ngoài đời: báo chí Việt Nam đã đưa tin về các bạn trẻ trả hàng trăm triệu phí môi giới để sang Đức học nghề, rồi vỡ mộng vì nhầm lương trước thuế với thực nhận, bị quỵt lương, thậm chí học viên điều dưỡng phải ở container.*

### Nhiệm vụ phụ

**Sống ở Hà Nội** `saigon` *(mã cũ, nội dung là Hà Nội)*
- Làm một ca ở tiệm trà sữa
- Uống trà đá ở quán Bà Thu
- Mua đồ mới ở sạp Chị Hằng

**Phố cổ của tôi** `phoCo` (mở sau 1.1)
- Xin một quẻ ở Đình Hàng Gai `pc.fortune`
- Nghe Chú Hưng hiệu sách cũ kể chuyện nước Đức năm 1989 `pc.leipzig`

**Chú Hưng, hiệu sách cũ** (đoạn hội thoại quan trọng nhất của chương 1):
1. "Hồi ấy gọi là 'đi hợp tác lao động' sang Cộng hòa Dân chủ Đức. Chú làm ở nhà máy dệt, ở ký túc xá, mỗi tháng gửi về nhà một thùng hàng: xe đạp, máy khâu…"
2. "Năm 1989 bức tường Berlin sụp. Nhiều người ở lại, mở hàng hoa, quán ăn. Bây giờ con cháu họ là bác sĩ, kỹ sư ở Đức cả. Chú thì về, mở hiệu sách này."
3. "Cháu đi bây giờ sướng hơn nhiều: có học nghề, có đại học, có đường lên thường trú. Nhưng nhớ: chào hỏi đàng hoàng, đúng giờ, và đừng bao giờ quên tiếng Việt."
   → "Cháu cảm ơn chú. Cháu sẽ gửi chú bưu thiếp từ Đức!" (cờ `story.leipzig`)
4. 🆕 (Nếu đã nghe đoạn trên và quay lại sau khi có B1) "Bạn thân của chú hồi ấy, ông Toàn, ở lại Leipzig. Con gái ông ấy là cô **Lan**, giờ làm dược sĩ ở đó. Chú còn giữ lá thư ông ấy gửi năm 1989, kẹp trong cuốn từ điển kia kìa." (mở khóa lá thư; dùng cho nhánh Sperrkonto ở chương 2)
- "Lại đây đọc sách à? Đọc tiếng Đức mỗi ngày một ít, như uống trà ấy, ngấm dần." (đọc sách = +XP)

**Ông Từ, đình làng** (mỗi ngày một quẻ):
- "Đình này thờ Thành hoàng làng, có từ thời phố còn là làng Hàng Gai, hơn ba trăm năm rồi đấy."
- Chuyện phố: phố bán đay gai, dây thừng nên tên Hàng Gai; xe đạp Peugeot 1960 ông đạp chở bà đi khắp Hà Nội.
- "Quẻ chỉ để mình vững lòng thôi cháu. Còn lại là do mình cố gắng cả."
- 🆕 Các chuyện ông kể trở thành **câu đố của khách Tây khi chạy Grab** (mục 11.1): trả lời đúng được tip.

**Cụ Từ, Đền Ngọc Sơn** (qua cầu Thê Húc): giữ nguyên (sự tích hồ Gươm, Tháp Bút, Đài Nghiên, thắp hương +12 tâm trạng mỗi ngày).

### 🆕 1.7 Gia đình ở chương 1

- **Bố** (lúc đầu chưa ủng hộ): "Con gái/con trai đi xa thế, ốm đau ai lo? … Thôi, học đi, đậu A1 rồi bố tính." → Sau khi đậu A1: "Bố xem bảng điểm rồi. Được. Bố không nói nữa."
- **Mẹ:** mỗi sáng có thể nhận "Mẹ để phần xôi trên bàn" (+10 năng lượng, ăn sáng miễn phí nếu ra khỏi nhà trước 8h).
- **Em Na:** học lớp 11, sắp thi học kỳ. 🆕 Nhiệm vụ phụ **"Kèm em học"** `na.tutor`: 3 buổi kèm Toán cho Na (không có tiền, +5 tâm trạng mỗi buổi). Xong thì Na khoe với cô chủ nhiệm, và mẹ của **bé Bin** (em họ bạn cùng lớp Na) tìm đến nhờ dạy → mở khóa việc **gia sư** (mục 11.1).
- 🆕 **Góp tiền nhà** (tùy chọn, mỗi tuần game): 0 / 500.000 / 1.000.000 ₫. Góp đều thì Mẹ vui, có thêm cảnh ở Tết; không góp cũng không bị phạt.

### 🆕 1.8 Vay tiền bố mẹ và căn nhà vàng `debt`

**Cách vay:** nói chuyện với **Bố** (buổi tối, khi bố ngồi uống trà ngoài hiên) hoặc **Mẹ** (trong bếp). Mỗi lần vay **1 / 3 / 5 triệu ₫**, tối đa 1 lần mỗi ngày. Mỗi lần vay −5 tâm trạng.

**Lời thoại khi vay:**
- Bố (lần đầu): "Bao nhiêu? … Ừ. Học cho tử tế vào." *(không nhìn bạn)*
- Mẹ (lần đầu): "Mẹ có ít tiền tiết kiệm trong hũ gạo đây. Con cầm lấy, đừng nói với bố."
- Bố (từ lần thứ ba): "Tháng này bố chưa trả được tiền điện… Thôi, cầm đi."
- Mẹ (khi nợ đã cao): "Mẹ bán bớt mấy chỉ vàng hồi cưới rồi. Không sao đâu con."

**Căn nhà thay đổi theo tổng nợ.** Mỗi lần vay xong, lần đầu bước vào nhà sẽ có một đoạn cắt cảnh ngắn: camera lia chậm qua phòng khách, thấy chỗ đã thay đổi, rồi dừng ở mặt bố mẹ.

| Mức | Tổng nợ | Trong nhà thay đổi | Bố mẹ |
|---|---|---|---|
| 0 | 0 ₫ | Bình thường: tivi, hoa tươi trên bàn thờ, đồng hồ treo tường, xe Wave dựng ở sân | Vui vẻ, mẹ hát khi nấu cơm |
| 1 | ✏️ **vay dù chỉ 1 lần** (> 0 ₫) | **Nghèo thấy rõ ngay:** tường ố xám, sơn bong, chân tường và hai tường bên ẩm mốc, vệt ố chảy từ trần, một vết nứt nhỏ · **mạng nhện** to ở góc trần · dán báo che lỗ tường, cửa sổ nứt dán băng dính, gạch nền vỡ · mấy thùng mì tôm cạnh bếp, bóng đèn trần treo dây · **hóa đơn tiền điện đóng dấu đỏ** ghim cạnh tờ lịch · nồi hứng nước dột · **dây phơi quần áo vá giăng ngang phòng** · lọ hoa trên bàn thờ chỉ còn hoa khô, **đĩa ngũ quả chỉ còn một quả cam héo** · chăn vá | Mẹ cười gượng, bố ít nói · ✏️ **quần áo bố mẹ đã phải vá** (bạc màu, miếng vá ở ngực, khuỷu tay, đầu gối) |
| 2 | ≥ 15 triệu | **Tivi biến mất** (bán), chỗ để tivi còn vết bụi hình chữ nhật · **tường nứt** một vệt dài · đồng hồ treo tường không còn · thêm chậu đỏ hứng dột, thêm gạch vỡ, tường càng ố | Bố ngồi ngoài hiên đến khuya · Mẹ đi rửa bát thuê buổi tối · hội thoại buồn hơn · quần áo bố mẹ vá chằng vá đụp |
| 3 | ≥ 30 triệu | **Mảng tường vỡ**, lộ gạch · mái dột, có xô hứng nước giữa nhà · **xe Wave của bố bị bán** (không chạy Grab được nữa) · Na không đi học thêm nữa · thêm mảng gạch lộ có gạch vụn dưới chân, sàn ướt quanh nồi hứng dột, nến trên bàn nước (bị cắt điện), tấm bìa các-tông chỗ dựng xe | Mặt bố mẹ buồn rõ, mẹ có quầng thâm mắt · Na: "Nhà mình nghèo đi hả anh/chị?" · **quần áo bố mẹ rách rưới**: thêm miếng vá, tay áo và ống quần sờn cụt |
| Đặc biệt | Thế chấp sổ đỏ (Studium, mục 2.2) | Cuốn sổ đỏ trong tủ kính biến mất, chỉ còn khung trống | Bố ngồi một mình trước bàn thờ |

**Trả nợ thì nhà đẹp lại**, theo đúng thứ tự ngược lại:
- Ở Việt Nam: trả trực tiếp cho mẹ (nói chuyện, chọn "Con trả mẹ").
- Ở Đức (chưa test được trong phần này): gửi qua app **TapTapSend**, mẹ tự trừ vào nợ.
- Mỗi lần nợ xuống dưới một mức: tin nhắn kèm ảnh của Na gửi sang, ví dụ "Bố mua lại tivi rồi! Bố xem bóng đá to tiếng lắm 😂" hoặc "Thợ đến trát lại tường rồi đó." Về Tết (phần Đức) sẽ thấy tận mắt.
- Trả hết: cảnh bố treo lại đồng hồ lên tường, mẹ cắm hoa tươi lên bàn thờ. +20 tâm trạng.

**Ảnh hưởng lên cách chơi:**
- Mức 2 trở lên: mỗi sáng ở nhà −3 tâm trạng ("nhìn tường nứt mà thấy có lỗi").
- Mức 3: mất việc Grab (bố bán xe).
- Dòng kết riêng nếu đã từng lên mức 3 rồi trả hết (ở phần kết thúc).

### Hoạt động khác ở Hà Nội ✏️ (giá mới)

| Hoạt động | Bản 1.14 | Bản 2.0 |
|---|---|---|
| Phở Bác Phở | 45.000 ₫ | **55.000 ₫** |
| Bánh mì | — | 🆕 25.000 ₫ |
| Trà đá | — | 5.000 ₫ |
| Cà phê nâu | — | 🆕 30.000 ₫ |
| Chè, quà vặt chợ đêm Bà Năm | — | 25.000–40.000 ₫ |
| Nước mía | — | 15.000 ₫ |
| Cắt tóc Chú Thắng | — | 70.000 ₫ |
| May áo dài Cô Hoa | — | 1.200.000 ₫ |
| Dầu gió Cô Thảo | — | 30.000 ₫ |
| Đèn lồng | — | 80.000 ₫ |
| Xe buýt | — | 🆕 8.000 ₫ |

*(Giá ăn uống ở phố cổ là ước tính 2026, bạn chỉnh theo cảm nhận.)*

✏️ Đổi tên **"Bác Hùng" (người qua đường) → "Bác Tư"** để không trùng Chú Hùng tiệm ảnh.

---

## 2. Chương 2 · Hành trình visa

### Lời dẫn 🛂 ✏️
> Tờ chứng chỉ B1 vẫn còn thơm mùi mực. Giờ là chặng khó nhất: chọn con đường, gom từng tờ giấy, điền từng ô trên Auslandsportal, săn từng cái Termin. Chị Mai bảo: "Hồ sơ đẹp thì visa mới đẹp." Bố thì bảo: "Cần bao nhiêu, nói bố."
>
> *"Kiến tha lâu cũng đầy tổ."*

### 🆕 2.0 Văn phòng tư vấn Mai Anh `office`

Chị Mai không ngồi bàn ngoài quán cà phê nữa mà có **văn phòng riêng** ở đầu phố Hàng Bông (bản đồ mới): tầng 2, cầu thang hẹp, tường dán đầy ảnh học viên cười tươi ở sân bay Frankfurt, có bể cá và một máy pha trà. Mở 8–18h, Thứ Hai–Bảy.

Bên trong có 3 người:
- **Chị Mai:** tư vấn chính, nói thẳng, ghét môi giới lừa đảo.
- 🆕 **Em Tuấn:** nhân viên làm giấy tờ, lúc nào cũng có ba điện thoại. "Anh/chị đưa giấy tờ đây, mai em trả."
- 🆕 **Cô Thoa kế toán:** thu tiền, đưa hóa đơn đỏ. "Văn phòng chị Mai có hóa đơn đàng hoàng nhé, không như bên kia đường."

**Mỗi bước hồ sơ có 2 cách:**

| Bước | 🧍 Tự làm | 💼 Nhờ văn phòng | Khác biệt |
|---|---|---|---|
| Dịch thuật công chứng | 1.500.000 ₫, tự đi cô Phương, 2 lần đi lại | 2.000.000 ₫, mai có | Tiết kiệm 500k nhưng mất ~4 giờ trong ngày |
| Lý lịch tư pháp, khám sức khỏe | lệ phí 800.000 ₫, xếp hàng 2 buổi sáng | 1.300.000 ₫ | |
| CV + thư động lực | Trò chơi ghép câu tiếng Đức (+XP) | 800.000 ₫ | ⚠️ Nhờ viết thì lúc phỏng vấn visa có thêm câu khó: *"Haben Sie diesen Brief selbst geschrieben?"* |
| Điền Auslandsportal | Trò chơi 8 ô, gõ sai là mất buổi hẹn | 500.000 ₫, không bao giờ sai | |
| Đặt lịch VFS | Trò chơi săn lịch | 500.000 ₫, Tuấn săn hộ, có lịch sau **2–4 ngày** (ngẫu nhiên) | Văn phòng không thể "mua" lịch sớm hơn, chỉ săn hộ |
| Mua vé máy bay | Tự đặt trên laptop, giá dao động 15–20 triệu | Văn phòng đặt: 17 triệu cố định + có người dẫn ra sân bay | |
| **Gói trọn gói** | — | **5.500.000 ₫** (ư) cho tất cả dòng trên trừ vé máy bay, rẻ hơn mua lẻ ~600k | Không phải chơi trò giấy tờ nào; mất phần XP tiếng Đức của CV |

*Ngoài đời: có nhiều văn phòng tư vấn làm hộ giấy tờ với phí dịch vụ; người tự làm thì đỡ tiền nhưng mất nhiều thời gian. Phí trong bảng là số của game.*

**Lời thoại chị Mai khi người chơi chọn "nhờ hết":** "Chị làm được, nhưng em phải hiểu từng tờ giấy trong hồ sơ của em. Lãnh sự hỏi gì mà em không biết là trượt đấy."

🆕 **Văn phòng Hoàng Kim bên kia đường** (hư cấu): biển LED nhấp nháy "BAO VISA 100% · KHÔNG CẦN B1 · LƯƠNG 100 TRIỆU". Vào được, nhưng chỉ để xem:
- Anh Khải mời nước, đưa hợp đồng 250 triệu. Trò chơi nhỏ: **tìm 3 dấu hiệu lừa** trong tờ hợp đồng (không ghi tên chủ ở Đức · lương ghi "100 triệu" không nói trước hay sau thuế · "phí không hoàn lại"). Tìm đủ → +10 tâm trạng, +cờ `scam.spotted`, mở hội thoại để cảnh báo Linh.
- Thấy Linh đang ngồi ký giấy ở bàn trong (mạch 1.6).

### 2.1 Chọn con đường `path` ⟵ **ĐIỂM RẼ NHÁNH**
1. Gặp chị Mai ở văn phòng `path.mai`
2. Chọn Studium hoặc Ausbildung `path.choose` (đã ký Cầu nối thì tự động là Ausbildung)

**Chị Mai** ✏️ (sửa cho đúng quy định 2026):
- Chưa có B1: "Chào em! Chị là tư vấn du học Đức đây. Muốn đi Đức thì trước hết phải có tiếng Đức B1 nhé."
- 🆕 Người chơi: "Em muốn sang Đức đi làm, kiếm tiền gửi về nhà… và đi du lịch nữa." → Chị Mai cười: "Ai cũng muốn thế. Nhưng visa không cấp cho người 'muốn đi chơi'. Em cần một lý do mà Đức cần em. Mà nước Đức đang thiếu nhất là gì? **Điều dưỡng.** Học nghề điều dưỡng thì vừa có lương ngay từ năm đầu, vừa có đường ở lại lâu dài. Có lương, có giấy tờ, thì cuối tuần muốn đi đâu chẳng được."
- ✏️ Giải thích:
  - "**Ausbildung** là học nghề có lương. Học điều dưỡng năm đầu được khoảng 1.490 € trước thuế mỗi tháng. Lương học nghề trên 1.048 € trước thuế là Đại sứ quán coi như em tự nuôi được mình, **không phải mở tài khoản phong tỏa**."
  - "**Studium** là học đại học. Bằng cấp 3 Việt Nam chưa đủ vào thẳng đại học Đức, em phải học **Studienkolleg** một năm trước. Cần chứng chỉ **APS**, thư mời nhập học, và **Sperrkonto**: tài khoản phong tỏa **11.904 €**, khoảng ba trăm bảy mươi triệu. Sang đó mỗi tháng em được rút 992 €."
- "Cả hai đều cần hộ chiếu, giấy tờ dịch thuật công chứng, CV, thư động lực, bảo hiểm… và một cái Termin!"
- Chọn: **Du học (Studium)** hoặc **Học nghề điều dưỡng (Ausbildung)**
- Sau đó: "Quyết định đúng đắn! Chị mở 'Hồ sơ visa' cho em rồi, bấm vào cuốn hộ chiếu trên màn hình nhé."
- Mẹo phỏng vấn: "Trả lời thật, ngắn gọn, bằng tiếng Đức càng tốt… Đừng nói đi Đức để du lịch hay chưa biết làm gì!" 🆕 (người chơi thầm nghĩ: *"…thế mà mình định nói đúng câu đó."*)

### 🆕 2.2 Họp gia đình: lo tiền Sperrkonto `sperr` (chỉ nhánh Studium)

Cảnh buổi tối, cả nhà ngồi quanh mâm cơm. Bố bật đèn bàn thờ, lấy ra một phong bì.

**Bố:** "Ba trăm bảy mươi triệu. Nhà mình không có ngần ấy tiền mặt. Có hai cách."

| Lựa chọn | Cách làm | Hậu quả |
|---|---|---|
| **A. Thế chấp sổ đỏ** | Bố mẹ vay ngân hàng bằng sổ đỏ căn nhà vàng | Đủ tiền ngay. Cờ `debt.family` = 380.000.000 ₫. Ở Đức có nhiệm vụ trả nợ hàng tháng. Tâm trạng −10 ("Cái nhà này là của ông bà để lại…"). Nhà chuyển sang **mức Đặc biệt** (mục 1.8): khung sổ đỏ trống trong tủ kính |
| **B. Nhờ cô Lan ở Leipzig** | Viết email bằng tiếng Đức cho cô Lan (trò chơi viết thư B1), gọi video ra mắt. Cô Lan ký **Verpflichtungserklärung** (giấy bảo lãnh tài chính) ở Sở Ngoại kiều bên Đức | Không mất tiền. Cờ `lan.sponsor`. Ở phần Đức có nhiệm vụ "Về thăm Leipzig" (gửi bưu thiếp cho chú Hưng từ đúng thành phố ấy) |
| **C. Đổi sang Ausbildung** | Quay lại chị Mai | Không cần Sperrkonto |

*Ngoài đời: thay cho Sperrkonto có thể dùng giấy bảo lãnh (Verpflichtungserklärung) của người ở Đức, hoặc học bổng.*

**Cô Lan** (gọi video): "Bố cô kể nhiều về chú Hưng lắm. Cô ký giấy cho cháu được, nhưng cô muốn nghe cháu nói bằng tiếng Đức vì sao cháu muốn làm điều dưỡng." → 3 câu hỏi, cần 2 câu đúng.

### 2.3 Hồ sơ visa `visa` ✏️

| # | Bước | Ở đâu | Chi phí game | Ngoài đời | Nhánh |
|---|---|---|---|---|---|
| 1 | Làm hộ chiếu `visa.passport` | Hồ sơ visa | 200.000 ₫, chờ 1 ngày | Lệ phí cấp mới 200.000 ₫ | cả hai |
| 2 | Ảnh sinh trắc 35×45 `visa.photos` | Tiệm ảnh Hùng | 100.000 ₫ ✏️ | | cả hai |
| 3 | Lấy bằng THPT, học bạ, giấy khai sinh `visa.originals` | Tủ giấy tờ ở nhà | — | | cả hai |
| 4 | Dịch thuật công chứng (khoảng 10 trang) `visa.notary` | Cô Phương | 1.500.000 ₫ ✏️ **(ư)** | ~150.000 ₫/trang | cả hai |
| 5 | 🆕 Lý lịch tư pháp `visa.criminal` | Sở Tư pháp (cạnh văn phòng công chứng) | 200.000 ₫ **(ư)** | Trường điều dưỡng ở Đức thường đòi | **Ausbildung** |
| 6 | 🆕 Giấy khám sức khỏe `visa.health` | Phòng khám phố Hàng Bông | 600.000 ₫ **(ư)** | | **Ausbildung** |
| 7 | Viết CV, thư động lực `visa.writing` | Hồ sơ visa | — (trò chơi ghép câu tiếng Đức) | | cả hai |
| 8 | Mua bảo hiểm cho những ngày đầu `visa.insurance` ✏️ | Hồ sơ visa | 700.000 ₫ (Ausbildung) / 3.000.000 ₫ (Studium, 3 tháng) **(ư)** | Học nghề: chủ đăng ký bảo hiểm khi bắt đầu làm | cả hai |
| 9a | APS `visa.aps` | Văn phòng APS (Frau Schneider) | **3.600.000 ₫** ✏️ | ~3,6 triệu ₫ | **Studium** |
| 10a | Nộp đơn Studienkolleg qua uni-assist `visa.admission` ✏️ | Hồ sơ visa | 75 € (≈ 2.400.000 ₫), thư mời sau 2 ngày | | **Studium** |
| 11a | Mở Sperrkonto `visa.sperr` 🆕 | Hồ sơ visa (online) | 11.904 € + phí mở ~100 € **(ư)**, hoặc giấy bảo lãnh của cô Lan | | **Studium** |
| 9b | Hợp đồng học nghề Sonnenhof `visa.contract` | Hồ sơ visa (Cầu nối: có sẵn) | hợp đồng về sau 1 ngày | | **Ausbildung** |
| 10b | 🆕 Chờ Cơ quan Lao động Đức (BA) đồng ý `visa.ba` | (tự động) | chờ 2 ngày | Thủ tục nội bộ, người nộp không phải làm gì | **Ausbildung** |
| 12 | 🆕 Điền đơn trên **Auslandsportal** `visa.portal` | Laptop ở nhà | — | Đơn visa giờ nộp online, có bước kiểm tra trước | cả hai |
| 13 | Kiểm tra đủ giấy tờ `visa.docs` | (tự hoàn thành) | — | | cả hai |
| 14 | Săn lịch ở **VFS Global** `visa.termin` ✏️ | Hồ sơ visa → Săn lịch | — | Đại sứ quán dùng trung tâm VFS nhận hồ sơ | cả hai |
| 15 | 🆕 Nộp hồ sơ ở VFS, lấy sinh trắc, đóng phí visa `visa.submit` | Trung tâm VFS | **phí visa 75 € (≈ 2.400.000 ₫)** + phí dịch vụ VFS ~700.000 ₫ **(ư)** | Phí visa quốc gia 75 €, đóng bằng tiền đồng | cả hai |
| 16 | Phỏng vấn ở Đại sứ quán (29 Trần Phú), đậu `visa.interview` | Anh Tú xe ôm → Đại sứ quán | xe ôm 30.000 ₫ | | cả hai |

🆕 Các bước có biểu tượng 💼 trong hồ sơ là bước **nhờ văn phòng được** (giá ở mục 2.0). Bấm vào bước đó sẽ hiện 2 nút: "Tự làm" / "Nhờ văn phòng chị Mai".

🆕 **Trò chơi Auslandsportal** (bước 12): điền 8 ô (Họ, Tên, Ngày sinh, Số hộ chiếu, Mục đích, Địa chỉ ở Đức, Ngày dự kiến nhập cảnh, Nơi nhận hồ sơ). Gõ sai một ô thì đến lúc nộp ở VFS bị trả về, mất buổi hẹn. ("Họ" và "Tên" bị đảo là lỗi kinh điển của người Việt!)

**Các nơi làm giấy tờ (cuối phố phía tây, qua cây đa), 8–17h:**
- **Chú Hùng, tiệm ảnh:** giữ nguyên lời thoại (chuẩn 3,5×4,5 cm, nền trắng, lộ tai…).
- **Cô Phương, công chứng:** ✏️ "Cô dịch sang tiếng Đức rồi công chứng bằng THPT, học bạ ba năm và giấy khai sinh. Mười trang, tổng 1.500.000 ₫."
- **Anh Quân, ngân hàng:** đổi tiền theo tỷ giá mới (mua 31.500 / bán 30.000). 🆕 Nhánh Studium-A: anh Quân làm hồ sơ vay thế chấp cho bố, cảnh ký giấy rất im lặng.
- **Frau Schneider, APS:**
  - "Chúng tôi kiểm tra học bạ, bằng cấp của em là thật, rồi phỏng vấn ngắn bằng tiếng Đức về những môn em đã học."
  - ✏️ 🆕 APS chỉ phỏng vấn **vào các ngày có đợt** (mỗi 2 tuần game một đợt, hiện trên lịch). Lỡ đợt thì chờ đợt sau. *Ngoài đời APS Việt Nam chỉ có vài đợt phỏng vấn mỗi năm.*
  - Người đi Ausbildung hỏi: "APS chỉ dành cho người đi du học đại học thôi."

**Săn lịch hẹn VFS:** giữ trò chơi cũ (bấm "Tải lại", ô trống chớp hiện). 🆕 Thêm: thỉnh thoảng có **tin nhắn rao bán lịch hẹn** "Có slot VFS tuần sau, 3 triệu, chuyển khoản trước" → bấm vào là mất 3.000.000 ₫, không có lịch (-10 tâm trạng). Chị Mai cảnh báo trước: "Lịch hẹn miễn phí, ai bán là lừa."

**Đại sứ quán Đức:**
- "Guten Tag. Bitte setzen Sie sich." → phỏng vấn 5 câu, cần ≥ 60%.
- Thiếu giấy tờ: bị trả hồ sơ (−10 tâm trạng), săn lịch lại.
- Đậu: visa có sau **3 ngày game** ✏️ (ngoài đời vài tuần), +15 tâm trạng.
- ✏️ Trượt: −12 tâm trạng. 🆕 Được chọn: **nộp lại** (săn lịch, đóng phí lại) hoặc **viết đơn khiếu nại (Remonstration)** trong vòng 1 tuần game: trò chơi viết thư, đúng thì được xét lại miễn phí.
- "Ohne Termin geht hier gar nichts." (Không có lịch hẹn thì không làm gì được.)

**Anh Tú xe ôm:** giữ nguyên ("Danke" tưởng "đắng", ảnh tuyết…).

### Câu hỏi phỏng vấn visa ✏️
- **Ausbildung:** giữ bộ cũ. ✏️ Thêm câu: *Wie viel verdienen Sie in der Ausbildung?* (Đáp án tốt: "Im ersten Jahr etwa 1.490 Euro brutto." Đáp án sai: "Hundert Millionen Dong!")
- **Studium:** ✏️ đổi đáp án mẫu "Informatik…" → **"Pflegewissenschaft / Pflege (B.Sc.)"** cho khớp nhánh điều dưỡng. Thêm: *Warum müssen Sie zuerst ins Studienkolleg?*
- **APS:** giữ nguyên (APS thật cũng hỏi kiến thức các môn cấp 3, nên câu đạo hàm và định luật Ôm vẫn hợp lý).

### 2.4 Lên đường `departure`
1. Chờ visa `dep.visa`
2. Mua vé máy bay ✏️ (chị Mai, **17.000.000 ₫** một chiều **(ư)**; Cầu nối: miễn phí) `dep.flight`
3. 🆕 Đổi tiền Euro ở ngân hàng anh Quân `dep.exchange` (game nhắc: "Lương đầu tiên cuối tuần đầu mới về. Em cần ít nhất ~600 € cho tuần đầu.")
4. Ra sân bay, chào gia đình, lên máy bay `dep.airport`

**Mẹ ở sân bay Nội Bài:**
- "Con đi đường bình an nhé. Nhớ ăn uống đầy đủ, mặc ấm, rảnh thì gọi video về cho mẹ."
- "Mẹ có nhét mấy gói mì với chai nước mắm trong vali rồi đó. Bên đó chắc không có đâu!"
  - "Con thương mẹ!" (+10 tâm trạng)
  - hoặc "Mẹ ơi, nước mắm bị cấm mang lên máy bay đó…" → "Kệ, mẹ gói kỹ lắm rồi! Đi đi con, đi bình an."
- 🆕 Mẹ dúi phong bì: **+300 €** "Tiền đi đường, đừng nói với bố." (Bố đứng sau, cũng dúi một phong bì nữa: **+100 €**, "Đừng nói với mẹ.")
- 🆕 Em Na: "Anh/chị nhớ gửi ảnh tuyết cho em với anh Tú xe ôm nhé."

---

## 2b. Nghề làm thêm ở Việt Nam

Lương giờ ở Việt Nam bám theo **lương tối thiểu vùng I năm 2026: 25.500 ₫/giờ** (phố cổ Hoàn Kiếm thuộc vùng I).

### 4 nghề, mỗi nghề có trò chơi riêng

**Luật chung:** mỗi nghề **làm tối đa 1 lần mỗi ngày**. Muốn kiếm nhiều thì làm nhiều nghề khác nhau trong cùng một ngày, nhưng năng lượng và giờ mở cửa sẽ giới hạn bạn. Trên điện thoại có **"Bảng việc hôm nay"**: 4 ô, làm xong ô nào thì ô đó có dấu ✅.

🆕 **Lên hạng:** mỗi nghề có 3 hạng (Mới → Quen việc → Giỏi). Lên hạng sau 8 và 20 lần làm: +10% rồi +20% tiền mỗi lần, trò chơi khó hơn một chút.

| Nghề | Ở đâu | Giờ làm | Mở khi | Lương ngoài đời **(ư)** | Mỗi lần trong game | Năng lượng |
|---|---|---|---|---|---|---|
| **Pha trà sữa** 🆕 | Tiệm Trà Sữa Phố Cổ (chị Vy) | 7–22h | Từ đầu | 25–30k/giờ + tip | **450.000 ₫** + tip | −15 |
| **Trông quán Circle K** | Circle K đầu phố Hàng Gai | Ca ngày 6–22h · Ca đêm 22–6h | ✏️ Từ đầu — gặp chị Hạnh là **được nhận luôn, không phỏng vấn** | ~25k/giờ | **400.000 ₫** (ca đêm **520.000 ₫**) | −15 (đêm −30, sáng hôm sau mệt) |
| **Chạy Grab** | Khắp phố cổ | 6–23h | Đăng ký tài xế (xem dưới) | ~20–35k/cuốc sau chiết khấu | **300.000–700.000 ₫** tùy số cuốc và sao, trừ tiền xăng 40.000 ₫ | −20 |
| **Gia sư Toán lớp 8** | Nhà phụ huynh phố Hàng Bông | 18–21h, Thứ Hai–Sáu | Xong nhiệm vụ "Kèm em học" (Na giới thiệu học trò) | 150k/buổi 1,5 giờ | **450.000 ₫** | −8 |

#### 🧋 Pha trà sữa (1.17 — thay cho quán cà phê)
Quán cà phê đầu phố đổi thành **Tiệm Trà Sữa Phố Cổ**, chủ tiệm là **chị Vy** (trẻ, vui nhưng nghiêm).

**Trò chơi trong ca (90 giây, toàn màn hình):** khách xếp hàng dưới mái hiên, mỗi người gọi một ly:
"Làm cho bà 1 ly **trà sữa** size **M** với **trân châu đen** nha!" kèm thanh **kiên nhẫn**.
1. Lấy ly đúng size (M / L).
2. Bấm đúng topping.
3. **Giữ tay** vào bình trà đúng loại tới khi kim vào **vạch xanh** (thả tay là ngừng rót; rót quá là **tràn ly**, phải làm lại).
4. **Dập nắp & giao.**

- Sai size / sai trà / sai topping / ly vơi: khách phật ý ("Ơ, bà gọi size M mà…"), tụt độ hài lòng. Để khách chờ hết kiên nhẫn: "Lâu quá… thôi không mua nữa!"
- Rót đúng vạch xanh và giao nhanh: khách khen, **tip 6.000 ₫**.
- Lương = 450.000 ₫ × độ hài lòng (70–110%) × thưởng hạng.
- **Mở dần theo hạng:** Mới = trà sữa, matcha, hồng trà + trân châu đen, trân châu trắng, pudding trứng · Quen việc (8 ca) = thêm lục trà, ô long + thạch dừa, sương sáo, đậu đỏ, khách bắt đầu gọi 2 topping hoặc không topping · Giỏi (20 ca) = thêm trà Thái + nha đam, kem cheese.
- Khách: bà cụ (kiên nhẫn nhất), cô, chị, anh đeo kính, chú (ít kiên nhẫn nhất), em học sinh.

**Nghỉ ca sớm** (bấm ✕ giữa ca):
- Chỉ được trả phần đã làm, hôm đó không làm lại được, không tính vào hạng.
- Lần 1: Chị Vy cau mày: „Khách đang đông mà em về à? Lần sau làm cho hết ca nhé."
- Lần 2: „Lần thứ 2 em bỏ ca rồi đấy. Thêm lần nữa là chị cho nghỉ việc."
- **Lần 3: bị đuổi** — „Em bỏ ca 3 lần rồi. Chị cho em nghỉ việc 3 ngày, về suy nghĩ lại đi." Trong 3 ngày đó không xin làm ở tiệm được (Bảng việc hiện ổ khóa + số ngày còn lại).
- Làm trọn một ca tử tế (hài lòng ≥ 50%) thì chị Vy bỏ qua một lần: „Hôm nay làm đến nơi đến chốn đấy. Chị ghi nhận."

*(Chưa làm: khách quen anh Tú xe ôm, chị Mai, khách Tây hỏi đường.)*

#### 🏪 Trông quán Circle K
✏️ **Nhận việc:** chị Hạnh đang thiếu người — nói chuyện với chị là được nhận ngay: „Đúng lúc chị đang thiếu người — chị nhận em luôn!" (không còn 3 câu phỏng vấn).

✏️ **Trò chơi trong ca (90 giây, toàn màn hình, 1.21):** sau lưng khách là kệ hàng, tủ nước, đèn trần, poster „MUA 2 TẶNG 1"; khách đặt đồ lên quầy, có màn hình máy tính tiền và máy quét.
1. **Quét hàng:** bấm từng món (bíp, tia đỏ, món vào túi; tổng tiền tăng dần).
2. **Hâm đồ ăn:** bánh bao, xúc xích, cơm nắm — „Hâm nóng giúp chị cái bánh bao nhé — 50 giây!" Bấm hâm, dừng đúng giây (±4 / ±3 / ±2 theo hạng). Sai: „Ơ, vẫn còn lạnh ngắt…" / „Nóng bỏng tay, hơi khét rồi…"
3. **Thối tiền:** khách đưa tiền (vẽ thành tờ 10K, 20K, 50K…), bạn bấm từng tờ trong ngăn kéo để đếm tiền thối. Hạng Mới: màn hình hiện sẵn số tiền phải thối; từ Quen việc phải tự tính, có khách đưa „có lẻ" (100K + 2K) và khách **chuyển khoản** — nhìn điện thoại của khách, chuyển thiếu thì bấm „Chuyển thiếu!". Thối thừa = cửa hàng mất, trừ vào lương; thối thiếu = khách phàn nàn.
4. **Xếp kệ:** giữa các lượt khách, chị Hạnh mang thùng hàng tới: xếp từng món đúng kệ (tủ mát, tủ đông, kệ mì, kệ nước, kệ bánh kẹo), hai lốc sữa thì lốc **hạn sử dụng sớm hơn để ra trước**.
- Mỗi khách có thanh kiên nhẫn („Lâu quá… thôi chị sang cửa hàng khác!"), có thanh hài lòng chung.
- Lương ca = lương ngày/đêm × (60–100% theo tỉ lệ làm đúng) − tiền thối sai, × thưởng hạng.
- **Nghỉ ca sớm** (✕): chỉ trả phần đã làm, hôm đó không vào ca lại được, không tính hạng.

**Sự kiện ca đêm** (ngẫu nhiên): nhóm sinh viên ôn thi mua 20 gói mì lúc 2h sáng · người say nằm ngủ trước cửa (gọi bảo vệ hay mang cho chai nước?) · mất điện, tính tiền bằng giấy bút · 🆕 Linh vào mua đồ lúc 3h vì học bài cả đêm (+cảnh trò chuyện, +XP cho cả hai).

#### 🛵 Chạy Grab
**Đăng ký tài xế** `job.grab` (một lần): mượn xe Wave của bố, mang bằng lái A1 và giấy tờ xe, mua áo + mũ đồng phục 300.000 ₫.

✏️ **Trò chơi (1.21, giao hàng + chở khách, 80 giây, toàn màn hình):** bản đồ phố cổ nhìn từ trên xuống (dãy nhà ống, cây, Hồ Gươm có Tháp Rùa và cầu Thê Húc, tên phố Tràng Tiền, Hàng Bạc, Hàng Đào, Hàng Gai, Hàng Trống, Hàng Bông, Lê Thái Tổ, Đinh Tiên Hoàng…).
- App báo **2 đơn** để chọn: **giao đồ ăn** (Phở Gia Truyền, Bánh mì Phố Cổ, Tiệm Trà Sữa, Cà phê trứng, Bún chả Hàng Mành, Chè Bốn Mùa) hoặc **chở khách**, có quãng đường và tiền cuốc.
- Lái: bấm ← ↑ ↓ → (hoặc vuốt bản đồ): xe tự chạy thẳng và rẽ ở ngã tư kế tiếp; bấm hướng ngược lại để quay đầu.
- Đường chấm xanh = **GPS**, nhưng GPS không biết **tắc đường** (đoạn đỏ có ô tô, đi rất chậm, 12 giây đổi chỗ một lần). **Phố một chiều** (mũi tên ») không đi ngược được.
- Giao trước khi hết **ETA** → 5 sao + tip; trễ thì ít sao hơn.
- **Cuối tuần Hàng Đào là phố đi bộ** (màu hồng, có người đi bộ): chạy vào là CSGT thổi còi, phạt 200.000 ₫.
- Trời mưa: có mưa rơi trên bản đồ, xe chậm hơn, giá cuốc +30%. Sau 18h bản đồ tối dần, xe bật đèn pha.
- Hết giờ: bảng tổng kết (đơn, sao trung bình, tiền cuốc, tip, phạt, thưởng hạng, trừ xăng 40.000 ₫).

**Khách đặc biệt** (mỗi người xuất hiện vài lần, có hội thoại):
- **Herr Jakob** 🆕: người Đức sống ở Tây Hồ, đang học tiếng Việt, quê ở **Lindenberg**. Mỗi cuốc là một đoạn trao đổi ngôn ngữ: bạn sửa tiếng Việt cho ông, ông sửa tiếng Đức cho bạn (+XP). Lần thứ 5: "Khi nào sang Lindenberg, nhớ đến tiệm bánh của em gái tôi!"
- **Khách Tây hỏi về phố cổ**: câu đố lấy từ chuyện Ông Từ, Cụ Từ, chú Hưng. Đúng thì tip 50.000–100.000 ₫.
- **Anh Khải (Hoàng Kim)**: ngồi sau xe, gọi điện liên tục "bao đậu visa, không cần B1". Nghe lén được thông tin → mở hội thoại cảnh báo Linh.
- **Bà bán xôi** đi chợ Đồng Xuân lúc 5h sáng, trả bằng một gói xôi (+15 năng lượng, không có tiền).
- Trời mưa: giá cuốc tăng 30%, nhưng trơn trượt.

⚠️ Nếu nợ bố mẹ lên **mức 3** (mục 1.8), bố phải bán xe Wave → **không chạy Grab được nữa** cho đến khi trả bớt nợ.

#### 📚 Gia sư Toán lớp 8
Học trò: **bé Bin** (lớp 8, con nhà phụ huynh phố Hàng Bông, rất ghét phân số).
Trò chơi: Bin làm bài, bạn phải tìm lỗi sai trong lời giải trước khi Bin chán (thanh kiên nhẫn giảm dần). Giải thích đúng → thanh "Bin hiểu bài" tăng.
- Sau 8 buổi: Bin thi giữa kỳ. Đậu điểm 8 trở lên → mẹ Bin thưởng 500.000 ₫ và giới thiệu thêm học trò thứ hai (gia sư lên **600.000 ₫/lần**).
- Bin thỉnh thoảng hỏi: "Anh/chị đi Đức rồi ai dạy em?" (cảnh chia tay trước khi bay).

**Đã bỏ khỏi bản 2.1** (có thể thêm lại sau nếu muốn): phụ bếp phở, shipper, chợ đêm, chăm người già, lễ tân hostel, hướng dẫn viên, dạy tiếng Việt, dịch thuật, livestream, tờ rơi. Một vài ý trong đó đã chuyển vào Grab và Circle K (Herr Jakob, câu đố phố cổ).

---

## 2c. Nhân vật ở phần Việt Nam

| Tên | Ở đâu | Vai trò |
|---|---|---|
| **Bố, Mẹ, em Na** | Nhà ống vàng, Hàng Gai | Cho vay tiền, phản ứng theo mức nợ (mục 1.8) |
| **Chị Vy** 🆕 | Tiệm Trà Sữa Phố Cổ, đầu phố | Chủ tiệm; cho làm ca, ghét bỏ ca giữa chừng (3 lần là đuổi 3 ngày) |
| **Thầy Minh** | Trung tâm tiếng Đức trong ngõ | Dạy A1–B1, cho hoãn học phí một lần mỗi khóa |
| **Linh** | Lớp Thầy Minh | Bạn cùng lớp, ký với môi giới Hoàng Kim |
| **Chị Mai, em Tuấn, cô Thoa** | Văn phòng tư vấn Mai Anh, Hàng Bông | Tư vấn, làm giấy tờ hộ, thu tiền |
| **Anh Khải** | Văn phòng Hoàng Kim (hư cấu), bên kia đường | Môi giới lừa đảo; cũng là khách Grab |
| **Chú Hưng** | Hiệu sách cũ | Chuyện 1989, lá thư, cô Lan |
| **Cô Lan** | Leipzig (gọi video) | Bảo lãnh tài chính nếu đi Studium |
| **Herr Jakob** | Tây Hồ | Khách Grab quen, trao đổi tiếng Đức–Việt |
| **Bé Bin** | Phố Hàng Bông | Học trò gia sư |
| **Chị quản lý Circle K** | Đầu phố Hàng Gai | Xếp ca ngày/đêm |
| **Anh Quân** | Ngân hàng Phố Cổ | Đổi tiền, làm hồ sơ thế chấp |
| **Cô Phương, Chú Hùng, Frau Schneider** | Cuối phố phía tây | Công chứng, ảnh, APS |
| **Ông Từ, Cụ Từ** | Đình Hàng Gai, Đền Ngọc Sơn | Chuyện phố cổ (dùng làm câu đố khi chạy Grab) |
| **Anh Tú xe ôm** | Đầu phố | Chở ra Đại sứ quán |
| **Bác Tư** | Người qua đường | (đổi tên từ "Bác Hùng") |

---

## 2d. Cân bằng tiền (phần Việt Nam)

1. **Giá một lần** (lệ phí thi, visa, vé máy bay, APS…) = **giá thật**.
2. **Chi phí và thu nhập hàng tháng** (lương, tiền nhà, vé tàu) = **giá thật, trả theo tuần game** (vì 1 tuần game = 1 tháng).
3. **Tiền ca làm thêm ở Việt Nam** = lương giờ thật × ~16 giờ (một ca game gói gọn vài buổi làm ngoài đời).
4. Khoảng cách tiền lớn nhất (Sperrkonto 375 triệu) **không thể** cày bằng làm thêm. Phải giải bằng **câu chuyện** (sổ đỏ, cô Lan, đổi nhánh), đúng như ngoài đời.

### 10.2 Bảng cân đối mẫu: phần ở Việt Nam

| Khoản | Ausbildung + Cầu nối | Ausbildung tự đi | Studium |
|---|---|---|---|
| Học phí A1 + A2 | 9.500.000 | 9.500.000 | 9.500.000 |
| Học phí B1 | 0 (Cầu nối trả) | 6.500.000 | 6.500.000 |
| Thi A1 + A2 | 6.500.000 | 6.500.000 | 6.500.000 |
| Thi B1 | 0 | 4.800.000 | 4.800.000 |
| Giấy tờ, bảo hiểm, visa, VFS (Studium: thêm phí mở Sperrkonto) | ~6.400.000 | ~6.400.000 | ~11.000.000 |
| APS + uni-assist | — | — | 6.000.000 |
| Vé máy bay | 0 | 17.000.000 | 17.000.000 |
| Tiền tuần đầu ở Đức (~600 €, trừ 400 € bố mẹ cho) | ~6.300.000 | ~6.300.000 | ~6.300.000 |
| Ăn uống lặt vặt (~50.000 ₫/ngày × ~60 ngày) | ~3.000.000 | ~3.000.000 | ~3.500.000 |
| **Tổng phải tự lo** | **~32 triệu** | **~60 triệu** | **~71 triệu + Sperrkonto** |
| Trừ tiền khởi đầu + mẹ chuyển (~6–7 triệu) | **~25 triệu** | **~53 triệu** | **~64 triệu** |
| ≈ số lần làm (trung bình ~450.000 ₫/lần, 4 nghề) | **~56 lần ≈ 6–7 lần/tuần** (1 lần/ngày, vừa sức) | **~119 lần ≈ 14 lần/tuần** (2 nghề mỗi ngày không nghỉ → thực tế phải vay) | **~142 lần** (phải có gia đình) |

→ Cầu nối: **vừa sức nếu chăm**. Tự đi: **khó, gần như phải vay**. Studium: **phụ thuộc gia đình**. Đây chính là thực tế, và tạo áp lực cho lựa chọn ở mục 1.5.

🆕 **Vay bố mẹ** luôn có (mục 1.8), nhưng cái giá là căn nhà xuống cấp. Ví dụ "Ausbildung tự đi" thường phải vay ~20–30 triệu → nhà lên mức 2–3, mất xe Wave. Đây là lực kéo người chơi chọn Cầu nối hoặc làm thêm chăm hơn.

---

## 3. Chương 3 · Đặt chân đến Đức

### Lời dẫn ✈️
> Mười hai tiếng bay. Cửa máy bay mở ra, không khí lạnh và lạ. Không còn tiếng còi xe máy, không còn trà đá vỉa hè. Lindenstraße đón bạn bằng hàng cây đoạn, chiếc tram màu vàng và một núi giấy tờ mới: phòng ở, Anmeldung, ngân hàng, bảo hiểm.
>
> *"Aller Anfang ist schwer." — Mọi khởi đầu đều khó.*

Đến nơi: sáng hôm sau, 9:00, Lindenstraße (thành phố Lindenberg), +10 tâm trạng. Chưa có phòng thì ngủ hostel (25 €/đêm).

### 3.1 Chào nước Đức! `arrival`
1. Tìm phòng: WG-Casting ở Lindenstraße 12 `arr.wg` (tiền phòng 95 €/tuần)
2. Anmeldung ở Bürgeramt (cần Termin + lấy số) `arr.anmeldung`
3. Mở tài khoản ở Sparbank `arr.bank`
4. Đăng ký bảo hiểm y tế (laptop trong phòng WG) `arr.insurance`

**Lena (bạn cùng WG):**
- "Hi! Du bist wegen dem Zimmer hier, oder? … Mình nói chuyện chút nhé — WG-Casting!"
- WG là gì: "Wohngemeinschaft — mấy người ở chung một căn hộ, mỗi người một phòng, dùng chung bếp."
- Sau khi ở: "Nhớ lịch dọn dẹp nhé, tuần này tới lượt bạn lau nhà tắm đó!" · "Bạn nấu Phở hôm nào vậy? Jonas hỏi mỗi ngày luôn."
- Nhớ nhà: "Ach, Heimweh… Lại đây, ăn Kuchen với bọn mình này. Bạn không một mình đâu!"

**Câu hỏi WG-Casting:**
- Wie stellst du dir das WG-Leben vor? · Wir haben einen Putzplan… · Kochst du gern?
- Was machst du in Deutschland? · Welche Tonne ist für Plastik? · Wie oft hast du Besuch?

**Jonas (bạn cùng WG):** mẹo sống ở Đức:
- Chủ Nhật siêu thị đóng cửa.
- Chai Pfand đổi được 25 cent.
- Tàu trễ ("zuverlässig zu spät").
- Phải Anmeldung trước rồi mới mở tài khoản.
- Đi tàu không vé bị phạt 60 €.

**Ông Becker — Bürgeramt:**
- "Haben Sie einen Termin?" → săn lịch online → đúng ngày thì lấy số → chờ 90 phút → điền tờ khai Anmeldung (câu hỏi: Họ, Nơi sinh, Ngày dọn vào, Giấy xác nhận chủ nhà, Tôn giáo).
- Bürgeramt mở Thứ Hai–Sáu, 8–16h.

**Bà Wagner — Sparbank:**
- "Willkommen bei der Sparbank! Möchten Sie ein Girokonto eröffnen?" — cần hộ chiếu và giấy Anmeldung.
- Sau khi mở: "Thẻ gửi qua bưu điện, mã PIN gửi riêng. Typisch deutsch!"
- Đổi hết tiền Việt sang Euro.

---

## 4. Chương 4 · Học nghề / Đại học ở Đức ⟵ **HAI NHÁNH**

### Lời dẫn 🩺
> Giấy tờ xong rồi, giờ mới là học thật. Ở viện dưỡng lão Sonnenhof, các cụ gọi bạn bằng cái tên phát âm sai đáng yêu. Có hôm mệt rã rời, có hôm muốn bỏ cuộc. Nhưng mỗi tối gọi về nhà, mẹ lại hỏi: "Hôm nay con giúp được ai chưa?"
>
> *"Schritt für Schritt." — Từng bước một.*

### 4A. Nhánh AUSBILDUNG (học nghề điều dưỡng)

**Ngày làm việc đầu tiên** `firstDay`
1. Mua vé tàu ở máy bán vé (15 €/tuần) `fd.ticket`
2. Đi tàu tới viện dưỡng lão, gặp chị Anna `fd.anna`
3. Hoàn thành một ca chăm sóc `fd.shift`

**Học nghề điều dưỡng** `training`
1. Học 3 buổi lý thuyết Berufsschule `tr.school`
2. Hoàn thành 6 ca chăm sóc `tr.shifts`
3. Thi đậu giữa khóa (Zwischenprüfung, 5 câu, cần 60%) `tr.zwischen`

**Kỳ thi tốt nghiệp** `examen`
1. Học đủ 6 buổi Berufsschule (tổng) `ex.school`
2. Hoàn thành tổng cộng 12 ca chăm sóc `ex.shifts`
3. Thi đậu tốt nghiệp (Abschlussprüfung, 6 câu, cần 65%) — trở thành Pflegefachkraft! `ex.final`

**Chị Anna — hướng dẫn thực tập ở Sonnenhof:**
- Lần đầu: "Herzlich willkommen im Sonnenhof! Trước khi bắt đầu, em cần: Anmeldung, tài khoản ngân hàng (để nhận lương) và bảo hiểm y tế nhé."
- "Các cụ chờ em đó! Nhìn biểu tượng trên đầu mỗi người để biết họ cần gì nhé."
- **Ca chăm sóc:** 2 phút, lương 60 €. Các việc: đút ăn, lau miệng, trò chuyện, dỗ dành, đẩy xe lăn. Chọn đúng thì cụ vui, sai thì cụ giận.
- Tốt nghiệp: "Herzlichen Glückwunsch, Pflegefachkraft! 🎉 Ông Vogel, giám đốc viện, muốn giữ em ở lại làm chính thức."

**Các cụ ở Sonnenhof:** bà Schmidt, ông Weber, bà Hoffmann, ông Krause. Giám đốc: ông Vogel. Giám khảo: Bà Dr. Brandt.

**Câu hỏi thi giữa khóa:**
- Khi nào sát khuẩn tay? · Một cụ nên uống bao nhiêu nước mỗi ngày? · Phòng loét do nằm lâu thế nào?
- Ghi gì vào sổ chăm sóc? · Hàng xóm hỏi về bệnh của bà Hoffmann (bí mật y tế) · Một cụ bị ngã, làm gì trước?

**Câu hỏi thi tốt nghiệp:**
- Cụ sa sút trí tuệ đi tìm mẹ · Huyết áp bình thường? · Bàn giao ca chiều thế nào?
- Ông Krause không chịu ăn · Ai thuộc đội ngũ viện dưỡng lão? · Vì sao bạn trở thành điều dưỡng? · Một cụ đột nhiên bị sốt.

### 4B. Nhánh STUDIUM (Đại học Lindenberg — cử nhân điều dưỡng, vừa học vừa làm)

**Sinh viên năm nhất** `uniStart`
1. Nhập học ở Đại học Lindenberg (đi tram, phí học kỳ 320 € gồm vé tàu cả kỳ) `uni.enroll`
2. Nghe bài giảng đầu tiên của GS. Schulz `uni.first`
3. Làm Werkstudent: một ca ở viện dưỡng lão Sonnenhof `uni.job`

**Học kỳ đầu tiên** `semester`
1. Nghe 6 buổi giảng `uni.lectures`
2. Học nhóm 2 lần ở thư viện `uni.group`
3. Thi đậu học kỳ (Klausur, 6 câu, cần 60%) `uni.klausur`

**Tốt nghiệp cử nhân** `bachelor`
1. Nghe đủ 12 buổi giảng `uni.lectures2`
2. Làm 6 ca Werkstudent `uni.shifts`
3. Bảo vệ luận văn — nhận bằng cử nhân điều dưỡng! `uni.thesis`

*(Bằng cử nhân cũng tính như đậu tốt nghiệp điều dưỡng, nên đi tiếp vào chương 5 giống nhánh Ausbildung.)*

**Nhân vật ở trường:**
- **GS. Schulz:**
  - "Willkommen zur Vorlesung! Bài giảng hôm nay: quy trình điều dưỡng." · "Lý thuyết và thực hành đi cùng nhau — Werkstudent ở viện dưỡng lão là phòng thí nghiệm tốt nhất đó."
  - Tốt nghiệp: "Frau/Herr Bachelor! 🎓 Tôi tự hào về em."
- **Cô Klein (phòng đào tạo):** "Hạn nộp luận văn đừng để sát nút nha. Wirklich!"
- **Mia:** "Kaffee trong Mensa rẻ lắm, chỉ 1 euro. Sinh viên sống nhờ nó đó!"
- **Kenji (Osaka):** "Cùng làm bài nhóm ở thư viện không? Mình viết, bạn sửa tiếng Đức nhé!"
- **Ali, Jule:** sinh viên.
- Giảng đường mở Thứ Hai–Sáu, 8–18h. Mỗi buổi giảng 2 tiếng, 15 năng lượng, 3 câu hỏi.

**Câu hỏi bài giảng / thi / bảo vệ:**
- Bài giảng: 4 bước quy trình điều dưỡng · Phòng ngừa là gì · Vì sao giao tiếp quan trọng · Điều dưỡng dựa trên bằng chứng · Ở Đức bao nhiêu người cần chăm sóc · Có câu hỏi sau giờ học thì làm gì.
- Klausur: Mục tiêu chăm sóc kích hoạt · Tiêu chuẩn chuyên gia · BMI · Phòng ngừa té ngã · Chăm sóc giảm nhẹ · Trích dẫn nguồn.
- Bảo vệ luận văn: Đề tài · Phương pháp · Kết quả chính · Lần sau làm khác gì · Áp dụng thực tế.

### Nhiệm vụ phụ chương 4 (cả hai nhánh)

**Cuộc sống ở Đức** `life`
- Trả tiền thuê nhà tuần đầu tiên
- Nhặt và trả 20 chai Pfand (0,25 €/chai)
- Mua đồ ở chợ Flohmarkt
- Gọi video về cho gia đình (laptop phòng WG)

**Bà ngoại ở nước Đức** `leihOma`
1. Làm quen Bà Gerda ở hồ vịt Stadtpark (phía đông) `lo.meet`
2. Cho vịt ăn bằng một ổ Brötchen `lo.ducks`
3. Học từ mới với Bà Gerda 3 ngày `lo.words`
4. Uống Kaffee với Bà Gerda `lo.kaffee`

**Bà Gerda** (cảm động nhất chương 4):
- "Guten Tag! Bạn mới đến Lindenberg à? Ngồi đây với bà một lát, xem lũ vịt kìa."
- Dạy từ: die Ente (vịt), der Igel (nhím), die Sternschnuppe (sao băng), die Schaukel, der Teich, Gänseblümchen.
- Cảnh Kaffee: "Bà có mang theo bình Kaffee với bánh táo tự nướng. Ngồi xuống đây… Từ ngày ông Heinz mất, mấy đứa cháu thì ở tận Úc, bà ít khi có ai nói chuyện. Cảm ơn cháu đã ngồi với bà mấy hôm nay."
- "Ở Đức người ta có chữ 'Leih-Oma' — bà ngoại 'mượn'. Cháu có muốn chủ nhật nào cũng ra đây uống Kaffee với bà không?"
  - "Dạ có! Từ nay bà là bà của cháu 💛" (cờ `gerda.friend`, hiện ở phần kết)
- Sau đó:
  - "Mein Schatz! Hôm nay ăn gì chưa? Bà để dành cho cháu miếng bánh táo đây."
  - "Bà kể với hội bạn ở nhà thờ về cháu suốt — người điều dưỡng Việt Nam giỏi nhất Lindenberg!"
- Chú nhím Herbert ở góc công viên.

**Nhân vật khác ở Đức:**
- **Chú Lý** (Asia-Markt, sang Đức từ 1987): "Nhớ nhà thì mua chai nước mắm, về nấu nồi thịt kho. Cả WG thơm lừng!"
- **Bà Beck** (đài phun nước): "Hồi trẻ bà cũng là điều dưỡng đấy. Nghề vất vả mà đáng lắm!"
- **Hàng xóm, chợ trời:** ông Müller, Sophie, Tom, Luca, ông Brandl, Emma.

---

## 5. Chương 5 · Cuộc sống mới ở Đức (hai nhánh gặp lại)

### Lời dẫn 🏡
> Bạn đã là điều dưỡng chính thức. Lương đủ để gửi về nhà, để dành, để nghĩ tới những điều lớn hơn: một chuyến về ăn Tết, một căn hộ của riêng mình, và một ngày được gọi nơi này là nhà.
>
> *"Lá rụng về cội" — nhưng cây cũng có thể mọc rễ ở nơi mới.*

**5.1 Điều dưỡng chính thức** `career`
1. Phỏng vấn và ký hợp đồng chính thức ở Sonnenhof (ông Vogel, 5 câu, cần 60%) `c5.contract`
2. Làm 5 ca với lương Pflegefachkraft (×1,8) `c5.proShifts`

**Câu hỏi phỏng vấn hợp đồng:**
- Vì sao muốn ở lại · Làm theo ca cả cuối tuần được không · Điểm mạnh · Mức lương mong muốn · Có câu hỏi gì không.

**5.2 Tết đoàn viên** `tet`
1. Đặt vé về Hà Nội ăn Tết (laptop phòng WG, 650 €) `tet.ticket`
2. Về nhà đoàn tụ, chúc Tết bố mẹ `tet.family`
3. Bay về lại Đức (chuyến đi 4 ngày) `tet.back`

**Ở nhà dịp Tết** (nhà trang trí hoa đào, bánh chưng, câu đối đỏ, đèn lồng):
- **Bố:** "Con về rồi! Cả nhà chờ con mãi. Bánh chưng mẹ gói từ hôm qua, hoa đào bố mua sáng nay đấy!"
  - "Chúc bố mẹ năm mới an khang thịnh vượng!" →
  - "Con bây giờ là điều dưỡng ở Đức rồi. Hàng xóm ai cũng hỏi thăm, bố mẹ tự hào lắm. Nhớ lì xì em gái nhé!"
  - "Ở chơi thêm đi con. Khi nào bay thì ra cửa, bố chở ra sân bay." · "Ăn thêm miếng bánh chưng nữa đi. Sang đó làm gì có!"
- **Mẹ:** "Con gầy đi rồi! Ăn đi con, mẹ nấu toàn món con thích: nem rán, canh măng, thịt đông." · "Bên đó lạnh không con? Mẹ đan cho con cái khăn len rồi đấy, mang theo nhé."
- **Lì xì em gái:** 50.000 ₫ (ở Việt Nam).
- Đổi sẵn khoảng 100 € sang tiền Việt ở sân bay.

**5.3 Tổ ấm riêng** `newHome`
1. Để dành 900 € tiền đặt cọc (Kaution) `home.save`
2. Thuê căn hộ riêng ở Lindenstraße 12 (160 €/tuần) `home.flat`

**5.4 Định cư ở Đức** `residence`
1. Ở Đức và đóng tiền nhà đủ 6 tuần `pr.rent`
2. Thi đậu "Leben in Deutschland" (Bürgeramt, 6 câu, cần 60%) `pr.lid`
3. Nộp hồ sơ và nhận giấy định cư (Niederlassungserlaubnis) `pr.apply`

- **Ông Becker:** "Niederlassungserlaubnis? Bình thường phải lên Ausländerbehörde tầng 2, nhưng hôm nay tôi nhận giúp. Cần: hợp đồng chính thức, căn hộ riêng, đóng tiền nhà đủ 6 tuần và bài thi 'Leben in Deutschland'."
- **Câu hỏi "Leben in Deutschland":** Đức có bao nhiêu bang · Màu cờ · Điều 1 Hiến pháp · Bức tường Berlin sụp năm nào · Ai bầu Thủ tướng · Bao lâu bầu Quốc hội · Ngày 3/10 · Bao nhiêu tuổi được bầu cử.

**→ Nhận giấy định cư = KẾT THÚC GAME** (hiện thẻ kết thúc, sau đó chơi tự do).

---

## 6. Kết thúc (thẻ "câu chuyện của bạn")

Thẻ kết thúc ghi số liệu (tiền tiết kiệm…) và **các dòng kể chuyện dưới đây, mỗi dòng chỉ hiện nếu bạn đã làm việc đó**:

| Điều kiện | Dòng kết |
|---|---|
| Đi Studium | 🎓 Bạn đã đi con đường đại học: cử nhân điều dưỡng ở Lindenberg, vừa học vừa làm Werkstudent. |
| Đi Ausbildung | 🩺 Bạn đã đi con đường học nghề: ba năm Ausbildung ở Sonnenhof, từ học viên thành Pflegefachkraft. |
| 🆕 Từng nợ đến mức 3 rồi trả hết | 🏠 Có lúc căn nhà vàng ở Hàng Gai mất cả tivi lẫn chiếc xe Wave của bố. Bạn đã trả hết từng đồng — giờ đồng hồ lại tích tắc trên tường. |
| 🆕 Ký Cầu nối | 🤝 Chương trình Cầu nối Sonnenhof đã đưa bạn sang Đức; hai năm làm việc ở Sonnenhof hóa ra là hai năm đẹp nhất. |
| 🆕 Cô Lan bảo lãnh | 📮 Cô Lan ở Leipzig đã bảo lãnh cho bạn. Bạn gửi chú Hưng tấm bưu thiếp từ đúng thành phố năm 1989 ấy. |
| Làm bạn với Bà Gerda | 👵 Chủ nhật nào bạn cũng uống Kaffee với Bà Gerda bên hồ vịt. Ở Đức, bạn có thêm một người bà. |
| Về ăn Tết | 🧧 Cái Tết đoàn viên năm ấy, cả nhà ngồi quanh nồi bánh chưng nghe bạn kể chuyện nước Đức đến tận khuya. |
| Nghe chuyện chú Hưng | 📖 Chú Hưng hiệu sách cũ đã đi trước bạn 35 năm. Bạn hứa sẽ gửi chú một tấm bưu thiếp từ Leipzig. |
| Tìm hết bí mật *(đang tắt)* | 🗝️ Không góc phố nào giấu được bạn — từ con mèo trong ngõ Hàng Gai đến chú nhím Herbert ở Stadtpark. |
| Nhập quốc tịch | 🇩🇪 Và rồi bạn cầm trên tay tấm hộ chiếu Đức — nhưng câu đầu tiên bạn nói khi về nhà vẫn là "Con chào bố mẹ ạ!" |

### Sau kết thúc: Ước mơ tiếp theo `dreams` (phụ)
- Nhập quốc tịch Đức (Bürgeramt, phí 255 €, phỏng vấn 5 câu cần 70%)
  - Câu hỏi: Vì sao muốn nhập quốc tịch · Cam kết trật tự dân chủ tự do · Tự trang trải thế nào · Sống ở Đức bao lâu · Thích gì ở nước Đức.
- Tiết kiệm được 10.000 €
- Hoàn thành 50 ca chăm sóc
- Trả 1.000 chai Pfand

---

## 7. Sự kiện ngẫu nhiên buổi sáng (45% mỗi ngày)

**Ở Việt Nam:**
- 📩 Mẹ chuyển khoản ✏️ **+500.000 ₫**, +5 tâm trạng
- 🌧 Mưa to, đường ngập (−5). 🆕 Chạy Grab hôm đó: +30% giá cuốc nhưng −10 năng lượng, dễ trượt bánh
- 🔧 Xe đạp thủng lốp ✏️ **30.000 ₫**
- ☕ Bạn cũ rủ cà phê (+8)
- 🆕 📱 **Tin nhắn giả danh Goethe-Institut**: "Lệ phí thi B1 của bạn chưa được xác nhận, chuyển khoản 3.000.000 ₫ trong hôm nay để giữ chỗ." Chọn: Chuyển (−3.000.000 ₫, −10) / Gọi lên Goethe hỏi (an toàn, +5 "Cảnh giác"). *(Goethe Hà Nội thật sự từng cảnh báo về kẻ gian mạo danh nhân viên để lừa thí sinh.)*
- 🆕 💍 Đám cưới bạn cấp 3: phong bì 500.000 ₫ (từ chối thì −5)
- 🆕 📵 Rơi vỡ màn hình điện thoại: thay 1.200.000 ₫, hoặc dùng tạm (−2 tâm trạng mỗi ngày đến khi thay)
- 🆕 ⚡ Mất điện mùa hè, không tự học được tối nay
- 🆕 🎋 Giỗ ông nội: cả nhà về quê, mất cả ngày, +10 tâm trạng

**Ở Đức:**
- ✉️ Brief vom Amt: một lá thư 4 trang toàn chữ khó hiểu. (−6 tâm trạng, −5 năng lượng)
- 🚆 Deutsche Bahn trễ 40 phút. (−5)
- 📱 Gọi video về nhà, mẹ khoe nồi cá kho. Nhớ nhà quá… (+6)
- ☀️ Trời nắng hiếm hoi! (+8)
- 🪙 Nhặt được 2 €.
- 🍰 Bà hàng xóm tặng một miếng Kuchen. (+10 năng lượng, +5)

**Cả hai nước:** 😴 Ngủ một giấc thật ngon! (+6)

---

## 8. Phần đang TẮT (bí mật)

Bật lại bằng `SECRETS_ENABLED = true` trong `src/data/secrets.ts`. Khi bật sẽ có:
- **18 điểm bí mật** trên phố Hà Nội và ở Đức, ví dụ: con mèo mướp nhà bà Sáu cạnh giếng cổ trong ngõ, đèn lồng chợ đêm, cụ Rùa, chú nhím Herbert, thư trong chai, tờ ghi chú cũ trong thư viện. Mỗi điểm có một đoạn truyện ngắn và phần thưởng (có cả quần áo tặng).
- **Hành trang kỷ niệm** `kyNiem` (chương 2): khăn bà nội đan (cuối giường), ảnh cưới bố mẹ (bàn thờ), lá thư năm 1989 trong cuốn từ điển ở hiệu sách cũ.
- **Không ai cô đơn** `notAlone` (chương 4): thư trong chai ở đài phun nước phía tây, tờ ghi chú cũ trong thư viện đại học, gọi video về nhà.

---

## 9. Chỗ chưa khớp / cần bạn quyết định

1. **Lời dẫn chương 4** chỉ nói về viện dưỡng lão Sonnenhof. Người đi Studium cũng làm Werkstudent ở đó, nhưng có thể thêm một câu về giảng đường.
2. **Thời gian:** phần kết nói "ba năm Ausbildung", nhưng trong game chỉ khoảng vài tuần.
3. **Nhiệm vụ phụ "Sống ở Hà Nội"** có mã `saigon` (mã cũ). Chỉ là mã nội bộ, không hiện ra.
4. **Thiếu nhánh thất bại:** chưa có kết thúc khác (bỏ về Việt Nam, ở lại Đức nhưng không định cư…).
5. **Phần Đức của bản 2.1** (Linh ở chương 4, trả nợ qua TapTapSend, Sperrkonto rút 992 €/tháng, về thăm Leipzig, tiệm bánh của em gái Herr Jakob, cảnh Tết theo tiền góp) **chưa làm** — chờ file phần Đức.

### Bản đồ Hà Nội mở rộng (1.17)
- **Phố Hàng Gai** rộng hơn. Sau dãy nhà Hàng Gai có thêm một dãy nhà quay lưng vào nhau, ba lối đi xuyên qua: **phố Hàng Bông** (bỏ rào chắn), **ngõ Cây Đa** (cạnh cây đa, giữa tiệm may và tiệm ảnh), **ngõ Tạp Hóa** (giữa tạp hóa cô Liên và quán phở).
- Cả ba lối đổ ra **phố đi bộ Hàng Đào**: rộng 13 m, hàng cây và ghế đá ở giữa, đèn lồng giăng ngang. Đầu phía tây là **Nhà thờ Lớn**; đối diện Hàng Bông là **vườn hoa có đài phun nước**, chú bán bóng bay, phía sau là **Bưu điện** có tháp đồng hồ.
- Khoảng 28 căn **nhà làm cảnh, không có chức năng**, 6 kiểu: nhà Pháp cổ, nhà ống kính hiện đại, khu tập thể chuồng cọp, nhà cổ mái ngói thấp, nhà ống sơn màu, khách sạn mini. Vài căn có biển hiệu cho vui (karaoke, sửa xe, cắt tóc, photocopy, nhà nghỉ, internet).
- Người đi dạo mới: cô Đào, anh Phong. *(Các nhà chức năng vẫn ở chỗ cũ trên Hàng Gai / Hàng Bông; nếu bạn muốn dời bớt sang phố mới để xen kẽ thì nói mình.)*

### Cách bản 2.1 được làm vào game (1.15.0) — chỗ hơi khác file của bạn
- **Lý lịch tư pháp, khám sức khỏe:** không có toà nhà riêng; bấm trong Hồ sơ visa, chỉ làm được buổi sáng thứ Hai–Sáu trước 11h (xếp hàng), hoặc nhờ văn phòng.
- **VFS Global:** là một quầy riêng (chị Hà) trong cảnh Đại sứ quán; hôm có lịch: nộp ở quầy VFS rồi sang quầy phỏng vấn.
- **Văn phòng làm hộ:** đặt ở Tuấn trong văn phòng hoặc bấm 💼 ngay trong Hồ sơ visa (Tuấn nghe điện thoại). Dịch thuật qua văn phòng vẫn cần lấy bản gốc ở nhà trước.
- **Dịch thuật tự làm:** một lần đến cô Phương, mất ~4 giờ (không tách 2 lần đi lại).
- **Đổi Euro (`dep.exchange`):** bước xong khi có ít nhất 200 € trong ví (tuần đầu cần ~600 €, bố mẹ cho thêm 400 € ở sân bay).
- **Gia sư:** bấm "Sang dạy bé Bin" trên Bảng việc (chuyển cảnh ngắn), không có nhà bé Bin trên bản đồ. Grab cũng mở từ điện thoại.
- **Herr Jakob, khách Tây, anh Khải, bà bán xôi** xuất hiện trong trò chơi Grab (thẻ khách + câu hỏi), không đi lại trên phố.
- **Chưa có:** xe buýt 8.000 ₫, cà phê nâu 30.000 ₫, tiếng mẹ hát khi nấu cơm, mâm cơm ít món (chỉ có lời thoại), cảnh Tết thêm khi góp tiền đều.
- **Tên:** bé Na (trẻ con trên phố) đổi thành **Bé Ngân**, "Chị Lan" ở Đại sứ quán đổi thành **Chị Loan**, để không trùng em Na và cô Lan.
- **Thương hiệu thật:** Circle K, Grab, Goethe-Institut, VFS Global, Deutsche Welle (Nicos Weg) đang dùng đúng tên như file của bạn. Nếu sau này phát hành công khai rộng, nên cân nhắc đổi sang tên hư cấu (ví dụ "Circle Q", "Grap") để tránh rắc rối thương hiệu.
