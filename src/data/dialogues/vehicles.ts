import type { DialogueDef } from '../dialogueTypes'
import type { Localized } from '../../i18n/localized'

const L = (vi: string, en: string): Localized => ({ vi, en })

/** 1.35 Showroom Xe Phố Cổ: chị Thủy sells bicycles, motorbikes and cars (systems/vehicles.ts). */
export const VEHICLE_DIALOGUES: Record<string, DialogueDef> = {
  chiThuyXe: {
    start: [
      { if: { test: 'veh.owned' }, node: 'back' },
      { node: 'hello' },
    ],
    nodes: {
      hello: {
        text: [
          L('Chào em! Showroom Xe Phố Cổ đây — xe đạp, xe số, xe ga, ô tô, có đủ hết. Em xem chiếc nào?', 'Hi! Bicycles, motorbikes, cars — we have it all. Which one?'),
          L('Vào xem đi em, xe mới về tuần này, đổ đầy bình, có biển số luôn!', 'Come and look — new arrivals, full tank, plates included!'),
        ],
        choices: [
          { text: L('Cho em xem xe', 'Show me the vehicles'), effect: { type: 'action', id: 'veh.shop' } },
          { text: L('Có bán trả góp không chị?', 'Can I pay in instalments?'), next: 'credit' },
          { text: L('Xe nào đi đỡ tốn xăng nhất ạ?', 'Which one is cheapest to run?'), next: 'fuel' },
          { text: L('Thôi ạ, em xem qua thôi', 'Just looking') },
        ],
      },
      back: {
        text: [
          L('Xe chạy ngon không em? Hết xăng thì sang cây xăng bên cạnh, anh ấy bơm cho.', 'Running well? The petrol station is right next door.'),
          L('Muốn đổi xe thì mang xe cũ qua đây, chị mua lại giá tốt!', 'Want a change? I’ll buy your old one back.'),
        ],
        choices: [
          { text: L('Cho em xem xe', 'Show me the vehicles'), effect: { type: 'action', id: 'veh.shop' } },
          { text: L('Xe nào đi đỡ tốn xăng nhất ạ?', 'Which one is cheapest to run?'), next: 'fuel' },
          { text: L('Em chào chị', 'Bye') },
        ],
      },
      credit: {
        text: L('Trả góp thì chưa có em ạ — tiền tươi thóc thật thôi. Đi làm để dành đủ rồi quay lại, chị giữ màu đẹp cho!', 'No instalments yet — save up and come back, I’ll keep a nice colour for you!'),
        next: 'hello',
      },
      fuel: {
        text: L('Xe đạp thì khỏi xăng luôn! Xe số Ong Vàng một bình đi cả tuần. Ô tô thì… bình to, đổ một lần cũng xót ví đấy.', 'A bicycle needs none! The Ong Vàng sips fuel. Cars have big tanks…'),
        next: 'hello',
      },
    },
  },
}
