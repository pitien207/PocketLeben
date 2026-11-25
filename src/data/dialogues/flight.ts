import type { DialogueDef } from '../dialogueTypes'
import type { Localized } from '../../i18n/localized'

const L = (vi: string, en: string): Localized => ({ vi, en })

/** 1.43 The first flight (systems/flight.ts): the attendant at the door, the two desks of the Passkontrolle. */
export const FLIGHT_DIALOGUES: Record<string, DialogueDef> = {
  tiepVien: {
    start: [{ if: { flag: 'fly.seated' }, node: 'seated' }, { node: 'hello' }],
    nodes: {
      hello: {
        text: L('Xin chào quý khách! Willkommen an Bord! Cho em xem thẻ lên máy bay ạ.', 'Hello! Willkommen an Bord! May I see your boarding pass?'),
        choices: [
          { text: L('Dạ, thẻ đây ạ', 'Here it is'), next: 'seat' },
          { text: L('Ghế A, B, C ở bên nào hả chị?', 'Which side are A, B, C?'), next: 'sides' },
          { text: L('Lần đầu em đi máy bay… hơi run', 'It’s my first flight… I’m a bit nervous'), next: 'first' },
        ],
      },
      seat: {
        // 1.43 user: the player finds the seat alone — she only explains how to read the pass and the row signs
        text: L('Cảm ơn ạ! Số ghế ghi ở ô vàng bên phải thẻ. Anh/chị đi theo lối giữa về phía sau, số hàng ghi trên biển treo ngay trên lối đi — tự tìm ghế của mình nhé.', 'Thank you! Your seat number is in the yellow box on the right of the pass. Walk down the aisle; the row numbers hang right above it — find your seat.'),
        choices: [
          { text: L('Xem lại thẻ của mình', 'Look at my pass'), effect: { type: 'action', id: 'flight.passPanel' } },
          { text: L('Dạ, em cảm ơn', 'Thanks') },
        ],
      },
      sides: {
        text: L('Nhìn về phía đầu máy bay thì A B C bên tay trái, D E F bên tay phải — nên lúc mình đi vào trong thì ngược lại đó ạ! Cứ nhìn biển số hàng: „27 · A B C" chẳng hạn.', 'Facing the nose, A B C are on the left and D E F on the right — so walking in, it’s the other way round! Just read the row signs, e.g. “27 · A B C”.'),
        next: 'hello',
      },
      first: {
        text: L('Không sao đâu ạ! Tìm đúng ghế, cất hành lý xách tay lên khoang, thắt dây an toàn là xong. Có gì cứ bấm nút gọi tiếp viên nhé.', 'No worries! Find your seat, put your bag in the bin, fasten the seatbelt — that’s it. Press the call button if you need anything.'),
        next: 'hello',
      },
      seated: { text: L('Chúc quý khách một chuyến bay vui vẻ!', 'Have a pleasant flight!') },
    },
  },
  bpOfficer: {
    start: [{ if: { flag: 'fly.passport' }, node: 'done' }, { node: 'hello' }],
    nodes: {
      hello: {
        text: L('„Guten Morgen! Der Nächste, bitte. Ihren Reisepass?" (Chào buổi sáng! Người tiếp theo. Hộ chiếu của bạn?)', '“Good morning! Next, please. Your passport?”'),
        choices: [
          { text: L('„Guten Morgen! Hier, bitte." (Đưa hộ chiếu)', '“Guten Morgen! Hier, bitte.” (Hand over the passport)'), effect: { type: 'action', id: 'flight.passport' } },
          { text: L('„Entschuldigung, langsamer bitte?" (Nói chậm hơn được không?)', '“Sorry, more slowly please?”'), next: 'slow' },
        ],
      },
      slow: {
        text: L('„Na klar. Rei-se-pass, bit-te." (Tất nhiên. Hộ — chiếu — làm ơn.) Ông ấy mỉm cười chờ bạn.', '“Of course. Pass-port, please.” He smiles and waits.'),
        next: 'hello',
      },
      done: { text: L('„Alles in Ordnung. Gute Weiterreise!" (Mọi thứ ổn. Chúc đi tiếp vui vẻ!)', '“All in order. Have a good onward journey!”') },
    },
  },
  bpEu: {
    start: 'hello',
    nodes: {
      hello: {
        text: L(
          '„Dieser Schalter ist nur für EU-Bürger. Mit einem vietnamesischen Pass gehen Sie bitte zum Schalter Alle Pässe — dort drüben." (Quầy này chỉ dành cho công dân EU. Hộ chiếu Việt Nam thì sang quầy „Alle Pässe" bên kia nhé.)',
          '“This desk is for EU citizens only. With a Vietnamese passport, please go to the All passports desk — over there.”',
        ),
        choices: [{ text: L('„Danke schön!"', '“Danke schön!”') }],
      },
    },
  },
}
