import type { DialogueDef } from '../dialogueTypes'
import { CONFIG } from '../config'
import { formatChi, goldChange, goldHeld, goldPaid, goldQuote, CHI_PER_CAY } from '../../game/systems/gold'
import { vnd } from '../../game/systems/say'

/** 1.34 — chú Năng, Tiệm Vàng Kim Thành (Hàng Khay). Logic: game/systems/gold.ts. */

function goldVars() {
  const q = goldQuote()
  const ch = goldChange()
  const pct = `${Math.abs(ch * 100).toFixed(1).replace('.', ',')}%`
  const trend =
    ch > 0.015
      ? `Hôm nay vàng lên mạnh, tăng ${pct} so với hôm qua đấy!`
      : ch > 0.002
        ? `Vàng nhích lên ${pct} so với hôm qua.`
        : ch < -0.015
          ? `Hôm nay vàng xuống mạnh, giảm ${pct}. Ai tích trữ thì đang vui đấy!`
          : ch < -0.002
            ? `Vàng giảm nhẹ ${pct} so với hôm qua.`
            : 'Giá vàng hôm nay đi ngang, không lên không xuống mấy.'
  const held = goldHeld()
  const value = held * q.buy
  const gain = value - goldPaid()
  return {
    sell: vnd(q.sell),
    buy: vnd(q.buy),
    sellCay: vnd(q.sell * CHI_PER_CAY),
    trend,
    held: formatChi(held),
    value: vnd(value),
    gain: gain >= 0 ? `lãi ${vnd(gain)}` : `lỗ ${vnd(-gain)}`,
    open: CONFIG.gold.hours[0],
    close: CONFIG.gold.hours[1],
  }
}

export const GOLD_DIALOGUES: Record<string, DialogueDef> = {
  chuNang: {
    start: [{ if: { not: { test: 'gold.shopOpen' } }, node: 'closed' }, { if: { test: 'gold.has' }, node: 'regular' }, { node: 'hello' }],
    vars: goldVars,
    nodes: {
      closed: {
        text: { vi: 'Chú đóng cửa rồi cháu ơi, vàng cất két hết rồi. Mai {open} giờ sáng chú mở, cháu quay lại nhé!', en: 'We are closed. Come back tomorrow morning.' },
      },
      hello: {
        text: [
          { vi: 'Vào đây cháu! Tiệm Vàng Kim Thành, ba đời bán vàng uy tín. Hôm nay chú bán ra {sell} một chỉ, mua vào {buy}. {trend}', en: 'Come in! Selling at {sell} per chỉ, buying at {buy}. {trend}' },
          { vi: 'Mua vàng để dành hả cháu? Người Việt mình có đồng nào là cất vàng. Một chỉ hôm nay {sell}, một cây {sellCay}. {trend}', en: 'Saving in gold? One chỉ is {sell} today, one cây {sellCay}. {trend}' },
        ],
        choices: [
          { text: { vi: 'Cháu muốn mua vàng', en: 'I want to buy gold' }, effect: { type: 'action', id: 'gold.trade', arg: 'buy' } },
          { text: { vi: 'Chỉ với cây khác nhau thế nào ạ?', en: 'What is a chỉ and a cây?' }, next: 'explain' },
          { text: { vi: 'Dạ cháu xem giá thôi ạ.', en: 'Just looking.' } },
        ],
      },
      regular: {
        text: [
          { vi: 'À, khách quen! Cháu đang giữ {held} vàng, bán lại cho chú hôm nay được {value} — {gain}. {trend}', en: 'Ah, a regular! You hold {held}: worth {value} today ({gain}). {trend}' },
          { vi: 'Cháu đấy à! Hôm nay chú bán ra {sell}, mua vào {buy} một chỉ. {trend} Cháu đang có {held}, tính ra {gain}.', en: 'Selling {sell}, buying {buy} per chỉ. {trend} You hold {held} ({gain}).' },
        ],
        choices: [
          { text: { vi: 'Cháu mua thêm', en: 'Buy more' }, effect: { type: 'action', id: 'gold.trade', arg: 'buy' } },
          { text: { vi: 'Cháu muốn bán vàng', en: 'I want to sell' }, effect: { type: 'action', id: 'gold.trade', arg: 'sell' } },
          { text: { vi: 'Chỉ với cây khác nhau thế nào ạ?', en: 'What is a chỉ and a cây?' }, next: 'explain' },
          { text: { vi: 'Dạ cháu chào chú.', en: 'Bye.' } },
        ],
      },
      explain: {
        text: { vi: 'Một chỉ là 3,75 gam vàng, mười chỉ là một cây — có người gọi là một lượng. Chú bán ra giá cao, mua vào giá thấp hơn một chút, chênh lệch đấy là tiền công của chú. Nên mua hôm nay bán ngay mai thì dễ lỗ lắm, vàng là để dành lâu cháu ạ!', en: 'One chỉ is 3.75 g, ten chỉ make a cây (a lượng). The shop buys back a little lower, so gold is for keeping, not for quick trades.' },
        choices: [
          { text: { vi: 'Cháu mua vàng', en: 'Buy gold' }, effect: { type: 'action', id: 'gold.trade', arg: 'buy' } },
          { text: { vi: 'Cháu bán vàng', en: 'Sell gold' }, if: { test: 'gold.has' }, effect: { type: 'action', id: 'gold.trade', arg: 'sell' } },
          { text: { vi: 'Dạ cháu hiểu rồi ạ.', en: 'I see.' } },
        ],
      },
    },
  },
}
