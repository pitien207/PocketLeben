/**
 * 1.47 Credits shown to PLAYERS (ui/CreditsPanel.tsx: Settings → "Ghi công & giấy phép", and the title screen).
 * CC-BY / CC-BY-SA need credit where players can see it, MIT needs its notice — so every asset or library that is not
 * our own goes here. Keep in sync with src/assets/CREDITS.md (the developer notes with file names and tools).
 * Title-safe: no imports (the title screen loads it).
 */

export type LicenseId = 'CC0' | 'CC-BY-4.0' | 'CC-BY-SA-4.0' | 'MIT' | 'Apache-2.0' | 'zlib' | 'ISC' | 'OFL-1.1' | 'own'

export const LICENSES: Record<LicenseId, { name: string; url?: string }> = {
  CC0: { name: 'CC0 1.0 (public domain)', url: 'https://creativecommons.org/publicdomain/zero/1.0/' },
  'CC-BY-4.0': { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
  'CC-BY-SA-4.0': { name: 'CC BY-SA 4.0', url: 'https://creativecommons.org/licenses/by-sa/4.0/' },
  MIT: { name: 'MIT', url: 'https://opensource.org/license/mit' },
  'Apache-2.0': { name: 'Apache 2.0', url: 'https://www.apache.org/licenses/LICENSE-2.0' },
  zlib: { name: 'zlib', url: 'https://opensource.org/license/zlib' },
  ISC: { name: 'ISC', url: 'https://opensource.org/license/isc-license-txt' },
  'OFL-1.1': { name: 'SIL Open Font License 1.1', url: 'https://openfontlicense.org' },
  own: { name: 'Pocket Leben' },
}

export interface CreditEntry {
  /** What it is in the game (Vietnamese). */
  what: string
  /** Author(s) and the name of the work / pack. */
  by: string
  source?: string
  license: LicenseId
  /** Copyright line (MIT / Apache / zlib / ISC notices). */
  copyright?: string
  /** What we changed (CC BY / BY-SA ask for it). */
  changes?: string
}

export interface CreditGroup {
  title: string
  entries: CreditEntry[]
}

export const CREDIT_GROUPS: CreditGroup[] = [
  {
    title: 'Mô hình 3D',
    entries: [
      {
        what: 'Nhà phố, đồ chợ, đèn, đài phun nước, đường phố, tòa nhà xa',
        by: 'Kenney — Modular Buildings, Fantasy Town Kit, City Kit (Roads), City Kit (Commercial)',
        source: 'https://kenney.nl',
        license: 'CC0',
        changes: 'Ghép thành nhà kiểu Hà Nội / München, sơn lại màu.',
      },
      {
        what: 'Cột điện, điều hòa, hộp công tơ, két bia, ghế nhựa, bình ga, đèn, lư đồng, ghế gỗ, đèn lồng, trụ cứu hỏa…',
        by: 'Poly Haven — James Ray Cock và các tác giả trên polyhaven.com',
        source: 'https://polyhaven.com/models',
        license: 'CC0',
        changes: 'Texture ảnh đổi thành màu phẳng, giảm số tam giác.',
      },
      {
        what: 'Cây, hoa, chậu cây, nhà, đồ phố, nội thất, rau màu, xe ô tô, gà, chó',
        by: 'Quaternius — Ultimate Nature, Simple Nature, Ultimate House Interior, Ultimate Buildings, Modular Streets, Cars, Crops, Animals…',
        source: 'https://quaternius.com',
        license: 'CC0',
        changes: 'Giảm số tam giác, sơn lại màu, bỏ bớt hoạt ảnh.',
      },
      {
        what: 'Đồ bếp quán ăn, bồn nước, thùng rác, nhà nhỏ phía xa',
        by: 'Kay Lousberg (KayKit) — Restaurant Bits, City Builder Bits',
        source: 'https://kaylousberg.com',
        license: 'CC0',
        changes: 'Màu atlas đổi thành màu phẳng.',
      },
      {
        what: 'Con mèo',
        by: 'Vuena — Free Low-Poly Animals',
        source: 'https://github.com/Vuena/free-low-poly-animals-cc0',
        license: 'CC0',
        changes: 'Bỏ bớt hoạt ảnh, thu nhỏ texture.',
      },
      {
        what: 'Nhân vật chibi, mái đình, cửa chớp, ban công, mọi thứ còn lại',
        by: 'Pocket Leben — dựng bằng code, theo thiết kế chibi của chủ dự án',
        license: 'own',
      },
    ],
  },
  {
    title: 'Hình ảnh & icon',
    entries: [
      {
        what: 'Icon 3D (đồ ăn, xe, ba lô, điện thoại, bản đồ…)',
        by: 'Microsoft — Fluent Emoji',
        source: 'https://github.com/microsoft/fluentui-emoji',
        license: 'MIT',
        copyright: 'Copyright (c) Microsoft Corporation',
        changes: 'Thu nhỏ còn 128 px.',
      },
      {
        what: 'Icon giao diện nhỏ',
        by: 'Helena Zhang, Tobias Fried — Phosphor Icons',
        source: 'https://phosphoricons.com',
        license: 'MIT',
        copyright: 'Copyright (c) 2020 Phosphor Icons',
      },
      {
        what: 'Vân nhựa đường và bê tông trên mặt đất',
        by: 'ambientCG — Asphalt026A, Concrete034',
        source: 'https://ambientcg.com',
        license: 'CC0',
        changes: 'Chuyển sang ảnh xám 256 px.',
      },
      {
        what: 'Họa tiết vải, biển hiệu, màn hình tải, logo',
        by: 'Pocket Leben',
        license: 'own',
      },
    ],
  },
  {
    title: 'Âm thanh & nhạc',
    entries: [
      {
        what: 'Nhạc nền "Đi Đức — ngày nắng" và "Đi Đức — đêm mưa"',
        by: 'Chủ dự án Pocket Leben',
        license: 'own',
      },
      {
        what: 'Tiếng bấm, tiền xu, đóng dấu, cửa, chuông…',
        by: 'Kenney — Interface Sounds, RPG Audio, Impact Sounds',
        source: 'https://kenney.nl',
        license: 'CC0',
      },
      {
        what: 'Mưa, chim, xe cộ và các âm thanh còn lại',
        by: 'Pocket Leben — tạo bằng code',
        license: 'own',
      },
    ],
  },
  {
    title: 'Phông chữ',
    entries: [
      { what: 'Nunito', by: 'Vernon Adams và cộng sự', source: 'https://fonts.google.com/specimen/Nunito', license: 'OFL-1.1' },
      { what: 'Baloo 2', by: 'Ek Type', source: 'https://fonts.google.com/specimen/Baloo+2', license: 'OFL-1.1' },
      { what: 'Be Vietnam Pro', by: 'Lâm Bảo, Tony Le, ViệtAnh Nguyễn', source: 'https://fonts.google.com/specimen/Be+Vietnam+Pro', license: 'OFL-1.1' },
      { what: 'Patrick Hand', by: 'Patrick Wagesreiter', source: 'https://fonts.google.com/specimen/Patrick+Hand', license: 'OFL-1.1' },
      { what: 'Barlow Condensed', by: 'Jeremy Tribby', source: 'https://fonts.google.com/specimen/Barlow+Condensed', license: 'OFL-1.1' },
      { what: 'Fraunces', by: 'Undercase Type', source: 'https://fonts.google.com/specimen/Fraunces', license: 'OFL-1.1' },
    ],
  },
  {
    title: 'Thư viện phần mềm',
    entries: [
      { what: 'React', by: 'Meta Platforms, Inc. and affiliates', source: 'https://react.dev', license: 'MIT', copyright: 'Copyright (c) Meta Platforms, Inc. and affiliates' },
      { what: 'three.js', by: 'three.js authors', source: 'https://threejs.org', license: 'MIT', copyright: 'Copyright © 2010-2026 three.js authors' },
      { what: 'React Three Fiber, drei, react-postprocessing, @react-three/rapier', by: 'Poimandres (react-spring)', source: 'https://pmnd.rs', license: 'MIT', copyright: 'Copyright (c) 2020 react-spring' },
      { what: 'zustand', by: 'Paul Henschel (Poimandres)', source: 'https://github.com/pmndrs/zustand', license: 'MIT', copyright: 'Copyright (c) 2019 Paul Henschel' },
      { what: 'Rapier (vật lý)', by: 'Dimforge', source: 'https://rapier.rs', license: 'Apache-2.0' },
      { what: 'postprocessing', by: 'Raoul van Rüschen', source: 'https://github.com/pmndrs/postprocessing', license: 'zlib', copyright: 'Copyright © 2015 Raoul van Rüschen' },
      { what: 'n8ao', by: 'N8python', source: 'https://github.com/N8python/n8ao', license: 'CC0' },
      { what: 'Motion', by: 'Motion (motion.dev)', source: 'https://motion.dev', license: 'MIT', copyright: 'Copyright (c) 2024 Motion B.V.' },
      { what: 'Sonner', by: 'Emil Kowalski', source: 'https://sonner.emilkowal.ski', license: 'MIT', copyright: 'Copyright (c) 2023 Emil Kowalski' },
      { what: 'canvas-confetti', by: 'Kiril Vatev', source: 'https://github.com/catdad/canvas-confetti', license: 'ISC', copyright: 'Copyright (c) 2020, Kiril Vatev' },
      { what: 'meshoptimizer (giản lược mô hình)', by: 'Arseny Kapoulkine', source: 'https://github.com/zeux/meshoptimizer', license: 'MIT', copyright: 'Copyright (c) 2016-2026 Arseny Kapoulkine' },
      { what: 'Tailwind CSS', by: 'Tailwind Labs, Inc.', source: 'https://tailwindcss.com', license: 'MIT', copyright: 'Copyright (c) Tailwind Labs, Inc.' },
    ],
  },
]

/** The MIT permission notice (shown once; each MIT entry carries its own copyright line). */
export const MIT_TEXT = `Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.`
