import type { Localized } from '../i18n/localized'

/** Fortune sticks (quẻ): text + mood. Index stored in `fortune.result` (game/systems/explore.ts draws one). */
export const FORTUNES: { text: Localized; mood: number }[] = [
  { mood: 12, text: { vi: '🎋 Quẻ Thượng Thượng: "Đường xa vạn dặm bắt đầu từ một bước chân." Mọi việc lớn đều thuận — cứ mạnh dạn mà đi!', en: '🎋 Excellent: "A journey of ten thousand miles begins with one step." Big plans go well — be bold!' } },
  { mood: 10, text: { vi: '🎋 Quẻ Thượng: "Học một biết mười." Hôm nay học gì cũng vào — tiếng Đức sẽ tiến bộ.', en: '🎋 Very good: "Learn one, know ten." Whatever you study today sticks — your German will improve.' } },
  { mood: 8, text: { vi: '🎋 Quẻ Thượng: "Có quý nhân phù trợ." Đừng ngại hỏi người xung quanh, họ sẽ giúp bạn.', en: '🎋 Very good: "A kind helper is near." Don’t be shy to ask people — they’ll help.' } },
  { mood: 6, text: { vi: '🎋 Quẻ Trung: "Nước chảy đá mòn." Chậm mà chắc, đừng nản.', en: '🎋 Fair: "Dripping water wears away stone." Slow and steady — don’t give up.' } },
  { mood: 6, text: { vi: '🎋 Quẻ Trung: "Có thực mới vực được đạo." Ăn no rồi hãy học!', en: '🎋 Fair: "First a full belly, then wisdom." Eat well, then study!' } },
  { mood: 8, text: { vi: '🎋 Quẻ Trung: "Lá rụng về cội." Hôm nay nhớ gọi điện cho bố mẹ nhé.', en: '🎋 Fair: "Leaves fall back to their roots." Call your parents today.' } },
  { mood: 5, text: { vi: '🎋 Quẻ Trung Bình: "Tiền vào như nước sông Đà, tiền ra nhỏ giọt như cà phê phin." Tiết kiệm đi nhé!', en: '🎋 Average: "Money comes like a river, leaves drop by drop like phin coffee." Save up!' } },
  { mood: 3, text: { vi: '🎋 Quẻ Hạ: "Cẩn tắc vô áy náy." Giữ kỹ giấy tờ và ví tiền ở chỗ đông người.', en: '🎋 Caution: "Better safe than sorry." Keep your papers and wallet close in crowds.' } },
]

