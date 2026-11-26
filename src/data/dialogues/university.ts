import type { Localized } from '../../i18n/localized'
import { useFlags } from '../../store/flagsStore'
import { CONFIG } from '../config'
import type { DialogueDef } from '../dialogueTypes'

/** Chapter 4A: LMU München — professor, student office, classmates. */

const L = (vi: string, en: string, de?: string): Localized => ({ vi, en, de })
const num = (key: string) => {
  const v = useFlags.getState().flags[key]
  return typeof v === 'number' ? v : 0
}
const u = CONFIG.uni

export const UNIVERSITY_DIALOGUES: Record<string, DialogueDef> = {
  profSchulz: {
    vars: () => ({
      lectures: num('stats.lectures'),
      group: num('stats.groupWork'),
      shifts: num('stats.careShifts'),
      kLectures: u.klausur.lectures,
      kGroup: u.klausur.groupWork,
      tLectures: u.thesis.lectures,
      tShifts: u.thesis.shifts,
      from: u.hours[0],
      to: u.hours[1],
    }),
    start: [
      { if: { noFlag: 'uni.enrolled' }, node: 'notEnrolled' },
      { if: { flag: 'uni.degree' }, node: 'alumni' },
      { node: 'hello' },
    ],
    nodes: {
      notEnrolled: {
        text: L(
          'Guten Tag! Bạn là sinh viên mới à? Hãy nhập học ở phòng đào tạo (bên phải) trước nhé — Immatrikulation.',
          'Hello! New student? Please enrol at the student office (on the right) first — Immatrikulation.',
        ),
      },
      hello: {
        text: [
          L('Willkommen zur Vorlesung! Bài giảng hôm nay: quy trình điều dưỡng. Ngồi xuống đi em.', 'Welcome to the lecture! Today: the nursing process. Take a seat.'),
          L('Lý thuyết và thực hành đi cùng nhau — Werkstudent ở viện dưỡng lão là phòng thí nghiệm tốt nhất đó.', 'Theory and practice go together — your Werkstudent job at the care home is the best lab.'),
        ],
        choices: [
          { text: L('Nghe bài giảng (Vorlesung)', 'Attend the lecture'), effect: { type: 'action', id: 'uni.lecture' } },
          { text: L('Thi học kỳ (Klausur)', 'Take the semester exam (Klausur)'), if: { noFlag: 'uni.klausur' }, effect: { type: 'action', id: 'uni.klausur' } },
          { text: L('Bảo vệ luận văn cử nhân', 'Defend the Bachelor thesis'), if: { all: [{ flag: 'uni.klausur' }, { noFlag: 'uni.degree' }] }, effect: { type: 'action', id: 'uni.thesis' } },
          { text: L('Em còn thiếu gì ạ?', 'What am I still missing?'), next: 'progress' },
          { text: L('Danke, bis später!', 'Thanks, see you!') },
        ],
      },
      progress: {
        text: L(
          'Thi học kỳ: {kLectures} buổi giảng + {kGroup} lần học nhóm ở thư viện. Luận văn: {tLectures} buổi giảng + {tShifts} ca Werkstudent. Em đang có {lectures} buổi, {group} lần nhóm, {shifts} ca. Giảng đường mở thứ Hai–Sáu, {from}–{to}h.',
          'Klausur: {kLectures} lectures + {kGroup} library group sessions. Thesis: {tLectures} lectures + {tShifts} Werkstudent shifts. You have {lectures} lectures, {group} group sessions, {shifts} shifts. Open Mon–Fri, {from}:00–{to}:00.',
        ),
        next: 'hello',
      },
      alumni: {
        text: L(
          'Frau/Herr Bachelor! 🎓 Tôi tự hào về em. Nhớ ghé kể chuyện cho sinh viên năm nhất nghe nhé.',
          'Our Bachelor graduate! 🎓 I’m proud of you. Come back and tell the first-years about it.',
        ),
      },
    },
  },

  frauKlein: {
    vars: () => ({ fee: `${u.semesterFee} €` }),
    start: [{ if: { flag: 'uni.enrolled' }, node: 'student' }, { node: 'hello' }],
    nodes: {
      hello: {
        text: L(
          'Guten Tag! Immatrikulation? Phí học kỳ {fee} — đã gồm vé tàu cả học kỳ (Semesterticket). Cần thư mời nhập học, hộ chiếu và bảo hiểm y tế.',
          'Hello! Enrolment? The semester fee is {fee} — it includes a transit pass for the whole semester. You need your admission letter, passport and health insurance.',
        ),
        choices: [
          { text: L('Nhập học (Immatrikulation)', 'Enrol'), effect: { type: 'action', id: 'uni.enroll' } },
          { text: L('Để em chuẩn bị đủ giấy tờ.', 'I’ll get my papers ready.') },
        ],
      },
      student: {
        text: [
          L('Thẻ sinh viên của em đây! Có cả vé tàu học kỳ trong đó nhé.', 'Here’s your student ID! The semester ticket is on it.'),
          L('Hạn nộp luận văn đừng để sát nút nha. Wirklich!', 'Don’t leave the thesis deadline to the last minute. Really!'),
        ],
      },
    },
  },

  herrLi: {
    start: 'hello',
    nodes: {
      hello: {
        text: [
          L('Chào cháu! Người Việt à? Chú sang Đức từ năm 1987, mở tiệm này 20 năm rồi. Gạo, mì, nước mắm — thiếu gì cứ hỏi chú!', 'Hello! Vietnamese? I came to Germany in 1987 and have run this shop for 20 years. Rice, noodles, fish sauce — just ask!'),
          L('Nhớ nhà thì mua chai nước mắm, về nấu nồi thịt kho. Cả WG thơm lừng!', 'Homesick? Buy fish sauce and cook braised pork. The whole WG will smell wonderful!'),
        ],
        choices: [
          { text: L('Xem hàng', 'Browse'), effect: { type: 'action', id: 'de.openShop', arg: 'asiaMarkt' } },
          { text: L('Cháu cảm ơn chú!', 'Thank you!') },
        ],
      },
    },
  },
  frauBeck: {
    start: 'hello',
    nodes: {
      hello: {
        text: [
          L('Guten Tag! Bên đài phun nước này yên tĩnh lắm. Ngồi nghỉ chút đi cháu.', 'Good day! It’s so peaceful by the fountain. Sit for a while.'),
          L('Hồi trẻ bà cũng là điều dưỡng đấy. Nghề vất vả mà đáng lắm!', 'I was a nurse when I was young. Hard work, but so worth it!'),
          L('Chủ nhật siêu thị đóng cửa — mua đồ từ thứ Bảy nhé!', 'Shops are closed on Sunday — do your shopping on Saturday!'),
        ],
        choices: [{ text: L('Danke, Frau Beck!', 'Thanks, Mrs Beck!'), effect: { type: 'mood', amount: 3 } }],
      },
    },
  },
  studentMia: {
    start: 'hello',
    nodes: {
      hello: {
        text: [
          L('Hi! Bạn cũng học Pflege à? Mình ngồi đây ghi chép cho bạn nếu bạn đến muộn nhé 😄', 'Hi! You study nursing too? I’ll take notes for you if you’re late 😄'),
          L('Kaffee trong Mensa rẻ lắm, chỉ 1 euro. Sinh viên sống nhờ nó đó!', 'Coffee at the Mensa is only one euro. Students live on it!'),
        ],
      },
    },
  },

  studentKenji: {
    start: 'hello',
    nodes: {
      hello: {
        text: L(
          'Mình là Kenji, đến từ Osaka. Cùng làm bài nhóm ở thư viện không? Mình viết, bạn sửa tiếng Đức nhé!',
          'I’m Kenji from Osaka. Group project in the library? I write, you fix the German!',
        ),
        choices: [
          { text: L('Học nhóm thôi!', 'Let’s do the group work!'), if: { flag: 'uni.enrolled' }, effect: { type: 'action', id: 'uni.groupWork' } },
          { text: L('Để lúc khác nhé.', 'Maybe later.') },
        ],
      },
    },
  },
}
