import type { DialogueDef } from '../dialogueTypes'
import { eateryOfOwner } from '../../game/systems/eateries'

/**
 * 1.40 One conversation for every eatery owner (data/eateries.ts): a greeting of their own, then the menu
 * (action `food.menu` opens the eatery's shop). Closed hours: a polite "come back at …".
 */
export const EATERY_DIALOGUES: Record<string, DialogueDef> = {
  quanAn: {
    vars: () => {
      const e = eateryOfOwner()
      if (!e) return { hello: '', from: '', to: '' }
      return { hello: e.hello[Math.floor(Math.random() * e.hello.length)].vi, from: e.hours[0], to: e.hours[1] }
    },
    start: [{ if: { test: 'food.open' }, node: 'hello' }, { node: 'closed' }],
    nodes: {
      hello: {
        text: { vi: '{hello}', en: '{hello}' },
        choices: [
          { text: { vi: 'Cho cháu xem thực đơn', en: 'The menu, please' }, effect: { type: 'action', id: 'food.menu' } },
          { text: { vi: 'Quán có giao Grab không ạ?', en: 'Do you deliver via Grab?' }, next: 'grab' },
          { text: { vi: 'Để lúc khác ạ', en: 'Another time' } },
        ],
      },
      grab: {
        text: {
          vi: 'Có chứ! Bật app Grab là thấy đơn của quán. Tài xế đến cửa, quán đưa túi đồ ăn, giao nóng hổi cho khách là được.',
          en: 'Sure! Turn on the Grab app and you’ll see our orders. Pick up at the door, deliver it hot.',
        },
        next: 'hello',
      },
      closed: {
        text: { vi: 'Quán nghỉ rồi cháu ơi, mai quay lại nhé — quán mở từ {from} giờ đến {to} giờ.', en: 'We’re closed — open {from}:00 to {to}:00.' },
      },
    },
  },
}
