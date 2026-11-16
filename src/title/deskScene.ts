import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CapsuleGeometry,
  CatmullRomCurve3,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DataTexture,
  DirectionalLight,
  DoubleSide,
  ExtrudeGeometry,
  Fog,
  Group,
  HemisphereLight,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  MeshPhysicalMaterial,
  MeshToonMaterial,
  NearestFilter,
  Object3D,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Points,
  PointsMaterial,
  QuadraticBezierCurve3,
  RedFormat,
  RepeatWrapping,
  Scene,
  Shape,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  TorusGeometry,
  TubeGeometry,
  Vector3,
  WebGLRenderer,
  type BufferGeometry as Geo,
  type Material,
  type MeshToonMaterialParameters,
} from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/**
 * Title-screen 3D scene: a student's desk by the window in a Hà Nội room, on a sunny morning.
 * Based on the user's "Đi Đức · Start Menu" design (night + rain), turned into daytime: sunlight
 * through the window grille, a yellow house with green shutters across the street, birds,
 * dust in the sunbeam, the fan turning and the curtain moving in its wind.
 * Loaded lazily by ui/TitleScreen.tsx (shares the three.js chunk with the game).
 */

const HAND = '"Patrick Hand", "Comic Sans MS", cursive'
const SANS = '"Be Vietnam Pro", "Nunito", system-ui, sans-serif'

// Three-band toon shading, like the characters.
const TOON_STEPS = (() => {
  const t = new DataTexture(new Uint8Array([70, 130, 195, 255]), 4, 1, RedFormat)
  t.minFilter = t.magFilter = NearestFilter
  t.generateMipmaps = false
  t.needsUpdate = true
  return t
})()
const toon = (color: string, extra: MeshToonMaterialParameters = {}) => new MeshToonMaterial({ color, gradientMap: TOON_STEPS, ...extra })

/** Seeded random: the room looks the same every time. */
let seed = 7
const rnd = () => {
  seed = (seed * 16807) % 2147483647
  return seed / 2147483647
}

function paint(w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, repeat?: [number, number]) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  draw(c.getContext('2d')!, w, h)
  const tex = new CanvasTexture(c)
  tex.colorSpace = SRGBColorSpace
  tex.anisotropy = 8
  if (repeat) {
    tex.wrapS = tex.wrapT = RepeatWrapping
    tex.repeat.set(...repeat)
  }
  return tex
}

type V3 = [number, number, number]
function add(parent: Object3D, geo: Geo, mat: Material, pos: V3 = [0, 0, 0], rot: V3 = [0, 0, 0], scale: number | V3 = 1, { cast = true, receive = true } = {}) {
  const m = new Mesh(geo, mat)
  m.position.set(...pos)
  m.rotation.set(...rot)
  if (typeof scale === 'number') m.scale.setScalar(scale)
  else m.scale.set(...scale)
  m.castShadow = cast
  m.receiveShadow = receive
  parent.add(m)
  return m
}
const box = (w: number, h: number, d: number) => new BoxGeometry(w, h, d)
const rbox = (w: number, h: number, d: number, r = 0.01) => new RoundedBoxGeometry(w, h, d, 2, r)
const cyl = (rt: number, rb: number, h: number, seg = 20) => new CylinderGeometry(rt, rb, h, seg)
const FLAT = { cast: false }

function wrapText(g: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lineH: number) {
  let line = ''
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word
    if (g.measureText(next).width > maxW && line) {
      g.fillText(line, x, y)
      line = word
      y += lineH
    } else line = next
  }
  g.fillText(line, x, y)
}

const WEEKDAYS = ['CHỦ NHẬT', 'THỨ HAI', 'THỨ BA', 'THỨ TƯ', 'THỨ NĂM', 'THỨ SÁU', 'THỨ BẢY']
const MONTHS = ['MỘT', 'HAI', 'BA', 'TƯ', 'NĂM', 'SÁU', 'BẢY', 'TÁM', 'CHÍN', 'MƯỜI', 'MƯỜI MỘT', 'MƯỜI HAI']
const weekdayLower = (d: Date) => {
  const w = WEEKDAYS[d.getDay()].toLowerCase()
  return w.charAt(0).toUpperCase() + w.slice(1).replace(/ (\S)/, (_, c: string) => ` ${c.toUpperCase()}`)
}

// --- Painted textures -----------------------------------------------------------------------

/** The open German textbook (two pages in one texture). */
const bookPages = () =>
  paint(1400, 900, (g, w, h) => {
    g.fillStyle = '#f7f1e3'
    g.fillRect(0, 0, w, h)
    const fold = g.createLinearGradient(w / 2 - 60, 0, w / 2 + 60, 0)
    fold.addColorStop(0, 'rgba(0,0,0,0)')
    fold.addColorStop(0.5, 'rgba(90,60,30,0.28)')
    fold.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = fold
    g.fillRect(w / 2 - 60, 0, 120, h)
    g.fillStyle = '#2f6fb0'
    g.fillRect(60, 60, 110, 46)
    g.fillStyle = '#fff'
    g.font = `700 26px ${SANS}`
    g.fillText('Lektion 3', 72, 92)
    g.fillStyle = '#23324a'
    g.font = `800 48px ${SANS}`
    g.fillText('Kennenlernen', 60, 170)
    g.fillStyle = '#dfe9f2'
    g.fillRect(60, 200, 560, 230)
    g.fillStyle = '#9fb7cf'
    g.beginPath()
    g.arc(230, 300, 46, 0, 7)
    g.fill()
    g.fillRect(184, 350, 92, 80)
    g.fillStyle = '#e3a98b'
    g.beginPath()
    g.arc(450, 300, 46, 0, 7)
    g.fill()
    g.fillRect(404, 350, 92, 80)
    g.fillStyle = '#fff'
    g.beginPath()
    g.roundRect(260, 220, 150, 52, 14)
    g.fill()
    g.fillStyle = '#23324a'
    g.font = `700 24px ${SANS}`
    g.fillText('Hallo!', 300, 254)
    g.fillStyle = '#3d4658'
    ;[
      ['A', 'Hallo! Wie heißt du?'],
      ['B', 'Ich heiße Linh. Und du?'],
      ['A', 'Ich bin Jonas. Woher kommst du?'],
      ['B', 'Ich komme aus Vietnam, aus Hà Nội.'],
    ].forEach(([who, line], i) => {
      g.font = `800 27px ${SANS}`
      g.fillText(who, 60, 490 + i * 52)
      g.font = `500 27px ${SANS}`
      g.fillText(line, 100, 490 + i * 52)
    })
    const r = w / 2 + 60
    g.fillStyle = '#c8323c'
    g.beginPath()
    g.arc(r + 22, 80, 22, 0, 7)
    g.fill()
    g.fillStyle = '#fff'
    g.font = `800 26px ${SANS}`
    g.fillText('4', r + 14, 90)
    g.fillStyle = '#23324a'
    g.font = `700 30px ${SANS}`
    g.fillText('Ergänzen Sie.', r + 60, 92)
    g.font = `500 27px ${SANS}`
    g.fillStyle = '#3d4658'
    ;['a  Ich ________ Linh. (heißen)', 'b  Woher ________ du? (kommen)', 'c  Er ________ in Berlin. (wohnen)', 'd  Wir ________ Deutsch. (lernen)', 'e  ________ ihr Studenten? (sein)'].forEach((l, i) =>
      g.fillText(l, r, 160 + i * 56),
    )
    g.fillStyle = '#2b54b8'
    g.font = `32px ${HAND}`
    g.fillText('heiße', r + 72, 154)
    g.fillText('kommst', r + 132, 210)
    g.fillText('wohnt', r + 78, 266)
    g.fillStyle = '#fbe6b8'
    g.fillRect(r, 470, 560, 230)
    g.fillStyle = '#7a5418'
    g.font = `800 26px ${SANS}`
    g.fillText('Grammatik', r + 24, 512)
    g.font = `500 25px ${SANS}`
    g.fillStyle = '#3d4658'
    ;['ich  heiße       wir  heißen', 'du   heißt        ihr  heißt', 'er/sie  heißt    sie/Sie  heißen'].forEach((l, i) => g.fillText(l, r + 24, 560 + i * 42))
    g.fillStyle = 'rgba(255,230,60,0.45)'
    g.fillRect(r + 90, 540, 90, 30)
    g.fillRect(r + 90, 582, 90, 30)
    g.fillStyle = '#9a9a9a'
    g.font = `500 20px ${SANS}`
    g.fillText('34', 60, h - 40)
    g.fillText('35', w - 90, h - 40)
  })

/** Squared notebook with today's vocabulary. */
const notebookPage = (today: Date) =>
  paint(700, 900, (g, w, h) => {
    g.fillStyle = '#fbfaf5'
    g.fillRect(0, 0, w, h)
    g.strokeStyle = 'rgba(140,120,200,0.35)'
    g.lineWidth = 1
    for (let y = 0; y < h; y += 12) {
      g.beginPath()
      g.moveTo(0, y)
      g.lineTo(w, y)
      g.stroke()
    }
    g.strokeStyle = 'rgba(140,120,200,0.55)'
    g.lineWidth = 1.5
    for (let y = 0; y < h; y += 48) {
      g.beginPath()
      g.moveTo(0, y)
      g.lineTo(w, y)
      g.stroke()
    }
    for (let x = 0; x < w; x += 48) {
      g.beginPath()
      g.moveTo(x, 0)
      g.lineTo(x, h)
      g.stroke()
    }
    g.strokeStyle = '#e06a6a'
    g.lineWidth = 2.5
    g.beginPath()
    g.moveTo(96, 0)
    g.lineTo(96, h)
    g.stroke()
    g.fillStyle = '#1f3f8f'
    g.font = `40px ${HAND}`
    g.fillText(`${weekdayLower(today)}, ${today.getDate()}/${today.getMonth() + 1}`, 120, 80)
    g.font = `44px ${HAND}`
    g.fillText('Wortschatz  –  Lektion 3', 120, 150)
    g.strokeStyle = '#1f3f8f'
    g.lineWidth = 2
    g.beginPath()
    g.moveTo(120, 160)
    g.lineTo(560, 162)
    g.stroke()
    g.font = `38px ${HAND}`
    ;[
      ['der Bahnhof', 'nhà ga'],
      ['die Miete', 'tiền thuê nhà'],
      ['das Visum', 'thị thực'],
      ['die Ausbildung', 'học nghề'],
      ['der Termin', 'lịch hẹn'],
      ['pünktlich', 'đúng giờ'],
    ].forEach(([de, vi], i) => {
      const y = 236 + i * 72
      g.fillStyle = de.startsWith('die') ? '#b3263a' : de.startsWith('das') ? '#227a46' : '#1f3f8f'
      g.fillText(de, 120, y)
      g.fillStyle = '#1f3f8f'
      g.fillText(`–  ${vi}`, 400, y)
    })
    g.fillStyle = '#b3263a'
    g.font = `46px ${HAND}`
    g.save()
    g.translate(150, 760)
    g.rotate(-0.05)
    g.fillText('Ich schaffe das!', 0, 0)
    g.restore()
    g.strokeStyle = '#b3263a'
    g.lineWidth = 3
    g.beginPath()
    g.ellipse(310, 748, 200, 46, -0.05, 0, 7)
    g.stroke()
  })

/** Tear-off calendar showing today. */
const calendarSheet = (today: Date) =>
  paint(360, 520, (g, w, h) => {
    g.fillStyle = '#fbf7ef'
    g.fillRect(0, 0, w, h)
    g.fillStyle = '#c8323c'
    g.fillRect(0, 0, w, 70)
    g.fillStyle = '#fff'
    g.textAlign = 'center'
    g.font = `700 30px ${SANS}`
    g.fillText(`THÁNG ${MONTHS[today.getMonth()]}`, w / 2, 46)
    g.fillStyle = today.getDay() === 0 ? '#c8323c' : '#23324a'
    g.font = `800 210px ${SANS}`
    g.fillText(String(today.getDate()), w / 2, 270)
    g.fillStyle = '#23324a'
    g.font = `800 40px ${SANS}`
    g.fillText(WEEKDAYS[today.getDay()], w / 2, 330)
    g.strokeStyle = '#d8cfc0'
    g.lineWidth = 2
    g.beginPath()
    g.moveTo(30, 360)
    g.lineTo(w - 30, 360)
    g.stroke()
    g.fillStyle = '#5a5a5a'
    g.font = `italic 500 25px ${SANS}`
    wrapText(g, '“Có công mài sắt, có ngày nên kim.”', w / 2, 405, w - 50, 34)
    g.fillStyle = '#9a8f80'
    g.font = `600 20px ${SANS}`
    g.fillText(String(today.getFullYear()), w / 2, h - 22)
  })

/** Postcard from Germany pinned to the wall. */
const postcard = () =>
  paint(520, 340, (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h)
    sky.addColorStop(0, '#9cc6e6')
    sky.addColorStop(1, '#f4dcc0')
    g.fillStyle = sky
    g.fillRect(0, 0, w, h)
    g.fillStyle = '#b8694e'
    for (const x of [190, 290]) {
      g.fillRect(x, 120, 50, 190)
      g.fillStyle = '#4e8f6f'
      g.beginPath()
      g.ellipse(x + 25, 112, 30, 38, 0, 0, 7)
      g.fill()
      g.fillStyle = '#b8694e'
    }
    g.fillRect(150, 210, 230, 100)
    g.fillStyle = '#e9e2d4'
    g.fillRect(0, 280, w, 60)
    g.fillStyle = '#d98b5f'
    for (let x = 0; x < w; x += 70) g.fillRect(x + 10, 240, 50, 50)
    g.fillStyle = '#ffffff'
    g.font = `700 40px ${SANS}`
    g.shadowColor = 'rgba(0,0,0,0.35)'
    g.shadowBlur = 6
    g.fillText('Grüße aus', 26, 56)
    g.font = `800 54px ${SANS}`
    g.fillText('MÜNCHEN', 26, 108)
    g.shadowBlur = 0
    g.strokeStyle = '#fff'
    g.lineWidth = 10
    g.strokeRect(5, 5, w - 10, h - 10)
  })

/** Sticky note / small label. */
const note = (text: string, bg: string, size = 54) =>
  paint(256, 256, (g, w, h) => {
    g.fillStyle = bg
    g.fillRect(0, 0, w, h)
    g.fillStyle = 'rgba(0,0,0,0.06)'
    g.fillRect(0, 0, w, 40)
    g.fillStyle = '#2b2b3a'
    g.font = `${size}px ${HAND}`
    g.textAlign = 'center'
    const lines = text.split('\n')
    lines.forEach((l, i) => g.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * size * 1.05 + size * 0.3))
  })

/** Phone lock screen: morning, reminder of the visa appointment. */
const phoneScreen = (today: Date) =>
  paint(360, 740, (g, w, h) => {
    const bg = g.createLinearGradient(0, 0, w, h)
    bg.addColorStop(0, '#7fc0ff')
    bg.addColorStop(1, '#ffd2a1')
    g.fillStyle = bg
    g.fillRect(0, 0, w, h)
    g.fillStyle = '#ffffff'
    g.textAlign = 'center'
    g.font = `300 110px ${SANS}`
    g.fillText('07:45', w / 2, 200)
    g.font = `500 24px ${SANS}`
    g.fillText(`${weekdayLower(today)}, ${today.getDate()} tháng ${today.getMonth() + 1}`, w / 2, 245)
    g.fillStyle = 'rgba(255,255,255,0.92)'
    g.beginPath()
    g.roundRect(20, 300, w - 40, 150, 26)
    g.fill()
    g.textAlign = 'left'
    g.fillStyle = '#c8323c'
    g.beginPath()
    g.roundRect(40, 322, 42, 42, 10)
    g.fill()
    g.fillStyle = '#fff'
    g.font = `800 22px ${SANS}`
    g.fillText('D', 53, 351)
    g.fillStyle = '#6b6b6b'
    g.font = `600 18px ${SANS}`
    g.fillText('LỊCH HẸN  ·  bây giờ', 96, 340)
    g.fillStyle = '#1d1d1f'
    g.font = `700 23px ${SANS}`
    g.fillText('Nộp hồ sơ visa', 96, 370)
    g.font = `500 21px ${SANS}`
    g.fillStyle = '#3a3a3c'
    g.fillText('Thứ Hai · 08:30', 40, 412)
    g.fillText('Nhớ mang hộ chiếu + ảnh 3,5×4,5', 40, 436)
    g.fillStyle = 'rgba(255,255,255,0.75)'
    g.beginPath()
    g.roundRect(w / 2 - 60, h - 30, 120, 6, 3)
    g.fill()
  })

/** Painted shop sign across the street (Hà Nội style: coloured board, bold letters). */
const shopSign = (text: string, bg: string, fg: string) =>
  paint(1024, 160, (g, w, h) => {
    g.fillStyle = bg
    g.fillRect(0, 0, w, h)
    g.strokeStyle = fg
    g.lineWidth = 8
    g.strokeRect(12, 12, w - 24, h - 24)
    g.fillStyle = fg
    g.font = `800 92px ${SANS}`
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText(text, w / 2, h / 2 + 6)
  })

/** Curtain fabric: little blue flowers. */
const curtainFabric = () =>
  paint(
    256,
    512,
    (g, w, h) => {
      g.fillStyle = '#f1ead9'
      g.fillRect(0, 0, w, h)
      for (let i = 0; i < 60; i++) {
        const x = rnd() * w
        const y = rnd() * h
        g.fillStyle = '#7f9fc4'
        for (let p = 0; p < 5; p++) {
          const a = p * 1.256
          g.beginPath()
          g.arc(x + Math.cos(a) * 6, y + Math.sin(a) * 6, 4.5, 0, 7)
          g.fill()
        }
        g.fillStyle = '#e8c35a'
        g.beginPath()
        g.arc(x, y, 3, 0, 7)
        g.fill()
      }
      g.fillStyle = 'rgba(0,0,0,0.05)'
      for (let x = 0; x < w; x += 32) g.fillRect(x, 0, 12, h)
    },
    [2.5, 2.5],
  )

const floorTiles = () =>
  paint(
    512,
    512,
    (g, s) => {
      for (let r = 0; r < 4; r++)
        for (let c = 0; c < 4; c++) {
          g.fillStyle = ['#e6d8c2', '#e1d2ba', '#e9dcc7'][(c * 3 + r * 5) % 3]
          g.fillRect(c * 128, r * 128, 128, 128)
          g.fillStyle = 'rgba(160,130,90,0.12)'
          g.beginPath()
          g.ellipse(c * 128 + 64, r * 128 + 64, 40, 28, 0.5, 0, 7)
          g.fill()
        }
      g.strokeStyle = '#c8b89c'
      g.lineWidth = 4
      for (let x = 0; x <= s; x += 128) {
        g.beginPath()
        g.moveTo(x, 0)
        g.lineTo(x, s)
        g.stroke()
        g.beginPath()
        g.moveTo(0, x)
        g.lineTo(s, x)
        g.stroke()
      }
    },
    [3, 3],
  )

/** Mint lime-wash wall, a bit stained at the bottom. */
const wallPaint = () =>
  paint(512, 512, (g, w, h) => {
    g.fillStyle = '#bfdccd'
    g.fillRect(0, 0, w, h)
    for (let i = 0; i < 900; i++) {
      g.fillStyle = `rgba(${rnd() > 0.5 ? '255,255,255' : '60,80,70'},${rnd() * 0.04})`
      g.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 6, 2 + rnd() * 6)
    }
    const stain = g.createLinearGradient(0, h * 0.78, 0, h)
    stain.addColorStop(0, 'rgba(110,100,70,0)')
    stain.addColorStop(1, 'rgba(110,100,70,0.3)')
    g.fillStyle = stain
    g.fillRect(0, 0, w, h)
  })

const softDot = (size: number, alpha: number) =>
  paint(size, size, (g) => {
    const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    grad.addColorStop(0, `rgba(255,255,255,${alpha})`)
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = grad
    g.fillRect(0, 0, size, size)
  })

// --- The scene --------------------------------------------------------------------------------

export interface DeskScene {
  update: (dt: number) => void
  render: () => void
  resize: (w: number, h: number) => void
  setShiftX: (px: number) => void
  setPointer: (x: number, y: number) => void
  dispose: () => void
  /** A motorbike passes outside (for the street sound). */
  onBikePass: ((o: { duration: number; horn: boolean }) => void) | null
  /** 0…1, how hard the fan blows toward the window right now (for the fan sound). */
  readonly fanWind: number
}

export function createDeskScene(renderer: WebGLRenderer): DeskScene {
  seed = 7
  const today = new Date()
  let shiftX = 0
  const scene = new Scene()
  scene.background = new Color('#bfe2ff')
  scene.fog = new Fog('#dcecf7', 4, 14)

  const camera = new PerspectiveCamera(38, 16 / 9, 0.05, 50)
  const camPos = new Vector3(-0.85, 1.38, 2.05)
  const camLook = new Vector3(0.18, 1.02, -0.45)

  // Daylight: bright sky fill, the sun through the window (casts the grille onto the desk),
  // and a soft bounce from the room side so the house across the street isn't in the dark.
  scene.add(new HemisphereLight('#fffaf0', '#cdb894', 0.95))
  const sun = new DirectionalLight('#ffeccc', 5.2)
  sun.position.set(1.26, 6, -2.7)
  sun.target.position.set(0, 0.77, -0.25)
  sun.castShadow = true
  sun.shadow.mapSize.set(1024, 1024)
  sun.shadow.bias = -0.0006
  sun.shadow.normalBias = 0.01
  sun.shadow.radius = 3
  Object.assign(sun.shadow.camera, { left: -1.4, right: 1.4, top: 1.4, bottom: -1.4, near: 1, far: 12 })
  scene.add(sun, sun.target)
  const bounce = new DirectionalLight('#ffe9cf', 0.7)
  bounce.position.set(-1, 2.5, 3)
  scene.add(bounce)
  const warm = new PointLight('#ffd9a8', 0.5, 2, 1.4)
  warm.position.set(0, 1, -0.3)
  scene.add(warm)

  const room = new Group()
  scene.add(room)

  // Wall with the window opening, side wall, floor, skirting.
  const wall = new MeshLambertMaterial({ color: '#ffffff', map: wallPaint() })
  const winX = 0.18
  const winY = 1.52
  const winW = 0.98
  const winH = 0.92
  const wallZ = -0.6
  add(room, box(4, 3, 0.12), wall, [winX - winW / 2 - 2, 1.5, wallZ])
  add(room, box(4, 3, 0.12), wall, [winX + winW / 2 + 2, 1.5, wallZ])
  add(room, box(winW, winY - winH / 2, 0.12), wall, [winX, (winY - winH / 2) / 2, wallZ])
  add(room, box(winW, 3 - (winY + winH / 2), 0.12), wall, [winX, (3 + winY + winH / 2) / 2, wallZ])
  add(room, box(0.12, 3, 4), wall, [-1.45, 1.5, 1.4])
  add(room, new PlaneGeometry(6, 6), new MeshLambertMaterial({ color: '#ffffff', map: floorTiles() }), [0, 0, 1.4], [-Math.PI / 2, 0, 0], 1, FLAT)
  add(room, box(4.2, 0.1, 0.02), toon('#8fb0a1'), [0.6, 0.05, wallZ + 0.07])
  add(room, box(winW + 0.12, 0.04, 0.2), toon('#e9e2d2'), [winX, winY - winH / 2, wallZ + 0.06])

  // Window grille (curly bars, classic Hà Nội ironwork).
  const grille = new Group()
  grille.position.set(winX, winY, wallZ - 0.02)
  room.add(grille)
  const iron = toon('#2f4c4a')
  const bar = 0.022
  add(grille, box(winW, bar, bar), iron, [0, winH / 2 - bar / 2, 0])
  add(grille, box(winW, bar, bar), iron, [0, -winH / 2 + bar / 2, 0])
  add(grille, box(bar, winH, bar), iron, [-winW / 2 + bar / 2, 0, 0])
  add(grille, box(bar, winH, bar), iron, [winW / 2 - bar / 2, 0, 0])
  for (let i = 1; i < 8; i++) add(grille, box(0.012, winH, 0.012), iron, [-winW / 2 + (i * winW) / 8, 0, 0])
  add(grille, box(winW, 0.014, 0.014), iron, [0, 0.12, 0])
  add(grille, box(winW, 0.014, 0.014), iron, [0, -0.12, 0])
  for (let i = 0; i < 8; i++) {
    const x = -winW / 2 + (i + 0.5) * (winW / 8)
    add(grille, new TorusGeometry(0.03, 0.006, 6, 16, Math.PI * 1.5), iron, [x, 0.045, 0], [0, 0, i % 2 ? 0 : Math.PI])
    add(grille, new TorusGeometry(0.03, 0.006, 6, 16, Math.PI * 1.5), iron, [x, -0.045, 0], [0, 0, i % 2 ? Math.PI : 0])
  }

  // The glass pane, swung open.
  const glass = new MeshPhysicalMaterial({ color: '#a9cbe8', transparent: true, opacity: 0.16, roughness: 0.1 })
  const pane = new Group()
  pane.position.set(winX + winW / 2, winY, wallZ + 0.08)
  pane.rotation.y = 0.9
  room.add(pane)
  const frame = toon('#e9e2d2')
  add(pane, box(winW / 2, winH - 0.04, 0.008), glass, [-winW / 4, 0, 0], [0, 0, 0], 1, FLAT)
  add(pane, box(winW / 2, 0.03, 0.03), frame, [-winW / 4, winH / 2 - 0.03, 0])
  add(pane, box(winW / 2, 0.03, 0.03), frame, [-winW / 4, -winH / 2 + 0.03, 0])
  add(pane, box(0.03, winH - 0.04, 0.03), frame, [-winW / 2 + 0.015, 0, 0])
  add(pane, box(0.03, winH - 0.04, 0.03), frame, [-0.015, 0, 0])

  // Curtain (a plane whose vertices move in the fan's wind).
  const curtainW = 0.38
  const curtainH = 0.98
  const curtainGeo = new PlaneGeometry(curtainW, curtainH, 10, 18)
  const curtain = add(room, curtainGeo, toon('#ffffff', { map: curtainFabric(), side: DoubleSide }), [winX - winW / 2 - 0.1, winY + winH / 2 + 0.1 - curtainH / 2, wallZ + 0.1])
  const curtainRest = (curtainGeo.attributes.position.array as Float32Array).slice()
  add(room, cyl(0.008, 0.008, 1.6, 8), toon('#a07a50'), [winX - 0.1, winY + winH / 2 + 0.1, wallZ + 0.1], [0, 0, Math.PI / 2])

  // Desk.
  const desk = new Group()
  desk.position.set(0.05, 0, -0.27)
  room.add(desk)
  const wood = toon('#b98a5c')
  const woodDark = toon('#8a6040')
  add(desk, rbox(1.3, 0.035, 0.6, 0.008), wood, [0, 0.755, 0])
  for (const [x, z] of [
    [-0.62, -0.26],
    [0.62, -0.26],
    [-0.62, 0.26],
    [0.62, 0.26],
  ])
    add(desk, box(0.04, 0.74, 0.04), woodDark, [x, 0.37, z])
  add(desk, box(0.4, 0.12, 0.5), wood, [0.42, 0.67, 0])
  add(desk, box(0.08, 0.015, 0.01), toon('#d9c9a0'), [0.42, 0.67, 0.252])
  const top = 0.773

  // Desk lamp (off: it's daytime).
  const lamp = new Group()
  lamp.position.set(-0.47, top, -0.02)
  desk.add(lamp)
  const lampGreen = toon('#2f5e57')
  add(lamp, cyl(0.07, 0.08, 0.025), lampGreen, [0, 0.012, 0])
  add(lamp, cyl(0.01, 0.01, 0.34, 8), lampGreen, [0.05, 0.17, -0.04], [0.25, 0, -0.32])
  add(lamp, new SphereGeometry(0.018, 10, 8), lampGreen, [0.1, 0.33, -0.08])
  add(lamp, cyl(0.01, 0.01, 0.28, 8), lampGreen, [0.2, 0.37, -0.02], [-0.3, 0, -1.35])
  const head = new Group()
  head.position.set(0.31, 0.37, 0)
  head.rotation.set(0.1, 0, 0.32)
  lamp.add(head)
  add(head, new ConeGeometry(0.085, 0.13, 24, 1, true), toon('#2f5e57', { side: DoubleSide }), [0, -0.03, 0])
  add(head, new SphereGeometry(0.03, 12, 10), toon('#fff6e2'), [0, -0.06, 0], [0, 0, 0], 1, FLAT)

  // Open textbook.
  const book = new Group()
  book.position.set(-0.05, top, -0.24)
  book.rotation.y = 0.06
  desk.add(book)
  add(book, box(0.6, 0.012, 0.4), toon('#2f6fb0'), [0, 0.006, 0])
  const pages = bookPages()
  for (const side of [-1, 1]) {
    const half = new Group()
    half.rotation.z = side * 0.07
    half.position.y = 0.012
    book.add(half)
    const geo = new PlaneGeometry(0.29, 0.38)
    const uv = geo.attributes.uv
    for (let i = 0; i < uv.count; i++) uv.setX(i, side < 0 ? uv.getX(i) * 0.5 : 0.5 + uv.getX(i) * 0.5)
    add(half, box(0.285, 0.014, 0.37), toon('#d8cdb6'), [side * 0.147, 0.002, 0])
    add(half, geo, new MeshLambertMaterial({ color: '#e6dccb', map: pages }), [side * 0.147, 0.0095, 0], [-Math.PI / 2, 0, 0], 1, FLAT)
  }

  // Notebook + pen + highlighter.
  const notebook = new Group()
  notebook.position.set(0.33, top, -0.02)
  notebook.rotation.y = -0.32
  desk.add(notebook)
  add(notebook, box(0.2, 0.008, 0.27), toon('#e8a5a5'), [0, 0.004, 0])
  add(notebook, new PlaneGeometry(0.19, 0.26), new MeshLambertMaterial({ color: '#ece4d4', map: notebookPage(today) }), [0, 0.0095, 0], [-Math.PI / 2, 0, 0], 1, FLAT)
  add(notebook, cyl(0.004, 0.004, 0.14, 8), toon('#2b54b8'), [0.08, 0.014, 0.02], [Math.PI / 2, 0, 0.5])
  add(desk, cyl(0.009, 0.009, 0.12, 8), toon('#ffe33d'), [0.12, top + 0.01, 0.06], [0, 0, Math.PI / 2 + 0.2]).rotation.y = 0.9

  // Flash cards held by a rubber band.
  const cards = new Group()
  cards.position.set(-0.3, top, 0.12)
  cards.rotation.y = 0.35
  desk.add(cards)
  for (let i = 0; i < 6; i++) add(cards, box(0.11, 0.004, 0.07), toon(i === 5 ? '#ffffff' : '#f3efe4'), [rnd() * 0.004, 0.002 + i * 0.004, rnd() * 0.004], [0, (rnd() - 0.5) * 0.08, 0])
  add(cards, new PlaneGeometry(0.1, 0.06), toon('#ffffff', { map: note('die Zukunft', '#ffffff', 40) }), [0, 0.0262, 0], [-Math.PI / 2, 0, 0], 1, FLAT)
  add(cards, new TorusGeometry(0.045, 0.0025, 4, 24), toon('#e2574c'), [0, 0.013, 0], [Math.PI / 2, 0, 0], [1.25, 0.8, 1])

  // Phone.
  const phone = new Group()
  phone.position.set(-0.08, top, 0.13)
  phone.rotation.y = -0.25
  desk.add(phone)
  add(phone, rbox(0.075, 0.008, 0.155, 0.004), toon('#1b1b1f'), [0, 0.004, 0])
  add(phone, new PlaneGeometry(0.069, 0.146), new MeshBasicMaterial({ map: phoneScreen(today), toneMapped: false }), [0, 0.0085, 0], [-Math.PI / 2, 0, 0], 1, FLAT)

  // Cà phê phin on a cup.
  const coffee = new Group()
  coffee.position.set(0.5, top, -0.38)
  desk.add(coffee)
  add(coffee, cyl(0.032, 0.028, 0.08, 20), new MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.25, roughness: 0.05 }), [0, 0.04, 0], [0, 0, 0], 1, FLAT)
  add(coffee, cyl(0.027, 0.025, 0.018, 20), toon('#f0e2c4'), [0, 0.01, 0])
  add(coffee, cyl(0.029, 0.027, 0.04, 20), toon('#3b2216'), [0, 0.038, 0])
  add(coffee, cyl(0.04, 0.04, 0.004, 24), toon('#b9bcc2'), [0, 0.082, 0])
  add(coffee, cyl(0.03, 0.026, 0.045, 20), toon('#c3c6cc'), [0, 0.106, 0])
  add(coffee, cyl(0.032, 0.032, 0.008, 20), toon('#c3c6cc'), [0, 0.132, 0])
  add(coffee, new SphereGeometry(0.008, 8, 6), toon('#c3c6cc'), [0, 0.14, 0])
  add(coffee, cyl(0.055, 0.05, 0.006, 24), toon('#e9e4da'), [0, 0.003, 0])
  scene.updateMatrixWorld(true)
  const coffeeAt = new Vector3()
  coffee.getWorldPosition(coffeeAt)

  // Tear-off calendar.
  const cal = new Group()
  cal.position.set(-0.72, 1.48, wallZ + 0.075)
  room.add(cal)
  add(cal, box(0.24, 0.36, 0.01), toon('#b5382f'), [0, 0, -0.008])
  add(cal, box(0.19, 0.27, 0.025), toon('#efe9dc'), [0, -0.03, 0.005])
  add(cal, new PlaneGeometry(0.18, 0.26), toon('#ffffff', { map: calendarSheet(today) }), [0, -0.03, 0.019], [0, 0, 0], 1, FLAT)
  add(cal, new PlaneGeometry(0.2, 0.06), toon('#ffffff', { map: note('CHÚC MỪNG\nNĂM MỚI', '#b5382f', 50) }), [0, 0.15, -0.002], [0, 0, 0], 1, FLAT)
  add(cal, new SphereGeometry(0.008, 6, 4), toon('#d9c9a0'), [0, 0.185, 0.005])

  // Postcard + sticky notes.
  const card = add(room, new PlaneGeometry(0.21, 0.138), toon('#ffffff', { map: postcard() }), [1, 1.62, wallZ + 0.065], [0, 0, 0.07], 1, FLAT)
  const tape = toon('#e9dcb0', { transparent: true, opacity: 0.85 })
  add(card, new PlaneGeometry(0.06, 0.02), tape, [-0.09, 0.065, 0.001], [0, 0, 0.6], 1, FLAT)
  add(card, new PlaneGeometry(0.06, 0.02), tape, [0.09, 0.065, 0.001], [0, 0, -0.6], 1, FLAT)
  add(room, new PlaneGeometry(0.09, 0.09), toon('#ffffff', { map: note('der\ndie\ndas ?!', '#fbe36a', 50) }), [0.86, 1.36, wallZ + 0.066], [0, 0, -0.08], 1, FLAT)
  add(room, new PlaneGeometry(0.09, 0.09), toon('#ffffff', { map: note('B1\ntrước\ntháng 6', '#9fd6c0', 48) }), [0.98, 1.3, wallZ + 0.067], [0, 0, 0.1], 1, FLAT)
  add(room, new PlaneGeometry(0.09, 0.09), toon('#ffffff', { map: note('Miete:\n4 tr/th', '#f6b3c4', 46) }), [1.12, 1.4, wallZ + 0.066], [0, 0, -0.05], 1, FLAT)

  // Chair with a jacket and a backpack.
  const chair = new Group()
  chair.position.set(0.2, 0, 0.42)
  chair.rotation.y = 0.75
  room.add(chair)
  add(chair, box(0.42, 0.03, 0.4), wood, [0, 0.45, 0])
  for (const [x, z] of [
    [-0.18, -0.17],
    [0.18, -0.17],
    [-0.18, 0.17],
    [0.18, 0.17],
  ])
    add(chair, box(0.035, 0.45, 0.035), woodDark, [x, 0.225, z])
  for (const x of [-0.18, 0.18]) add(chair, box(0.035, 0.45, 0.035), woodDark, [x, 0.68, 0.17])
  add(chair, box(0.4, 0.09, 0.025), wood, [0, 0.82, 0.17])
  add(chair, box(0.4, 0.05, 0.025), wood, [0, 0.66, 0.17])
  add(chair, rbox(0.3, 0.2, 0.05, 0.02), toon('#3b4a66'), [0.05, 0.76, 0.2], [0.1, 0, 0.05])
  add(chair, rbox(0.09, 0.26, 0.04, 0.018), toon('#3b4a66'), [-0.12, 0.62, 0.22], [0.15, 0, 0.1])
  add(chair, rbox(0.05, 0.05, 0.02, 0.01), toon('#c8323c'), [0.12, 0.8, 0.23])

  // Standing fan, oscillating.
  const fan = new Group()
  fan.position.set(0.9, 0, -0.06)
  fan.rotation.y = -0.65
  room.add(fan)
  const cream = toon('#efe6d2')
  const beige = toon('#d9cdb3')
  const steel = toon('#c9ccd2')
  const teal = toon('#7fc2c9')
  add(fan, new SphereGeometry(0.19, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), cream, [0, 0, 0], [0, 0, 0], [1, 0.32, 1])
  add(fan, cyl(0.19, 0.195, 0.02, 32), beige, [0, 0.01, 0])
  const keys = ['#e9e4d8', '#7fc2c9', '#7fc2c9', '#7fc2c9']
  for (let i = 0; i < 4; i++) add(fan, rbox(0.03, 0.02, 0.05, 0.006), toon(i === 0 ? '#d9534f' : keys[i]), [-0.051 + i * 0.034, i === 2 ? 0.058 : 0.064, 0.1], [-0.35, 0, 0])
  add(fan, cyl(0.026, 0.03, 0.5, 16), cream, [0, 0.3, 0])
  add(fan, cyl(0.034, 0.034, 0.04, 16), beige, [0, 0.56, 0])
  add(fan, new SphereGeometry(0.012, 8, 6), beige, [0.036, 0.56, 0])
  add(fan, cyl(0.014, 0.014, 0.42, 12), steel, [0, 0.78, 0])
  const swivel = new Group()
  swivel.position.set(0, 1.02, 0)
  fan.add(swivel)
  const fanHead = new Group()
  fanHead.rotation.x = 0.12
  swivel.add(fanHead)
  add(fanHead, cyl(0.03, 0.03, 0.05, 12), cream, [0, -0.01, -0.02])
  add(fanHead, new CapsuleGeometry(0.065, 0.06, 6, 20), cream, [0, 0.02, -0.07], [Math.PI / 2, 0, 0])
  add(fanHead, cyl(0.05, 0.058, 0.02, 24), beige, [0, 0.02, -0.135], [Math.PI / 2, 0, 0])
  for (let i = 0; i < 3; i++) add(fanHead, new TorusGeometry(0.03 - i * 0.009, 0.003, 4, 20), toon('#9a9284'), [0, 0.02, -0.147], [0, 0, 0], 1, FLAT)
  add(fanHead, cyl(0.008, 0.008, 0.035, 8), beige, [0, 0.095, -0.08])
  const bladeShape = new Shape()
  bladeShape.moveTo(0, 0.012)
  bladeShape.bezierCurveTo(0.05, 0.05, 0.15, 0.075, 0.175, 0.03)
  bladeShape.bezierCurveTo(0.19, -0.01, 0.15, -0.045, 0.09, -0.04)
  bladeShape.bezierCurveTo(0.05, -0.035, 0.02, -0.02, 0, -0.012)
  const bladeGeo = new ExtrudeGeometry(bladeShape, { depth: 0.003, bevelEnabled: true, bevelThickness: 0.0015, bevelSize: 0.0015, bevelSegments: 1, curveSegments: 14 })
  {
    const p = bladeGeo.attributes.position
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i)
      const y = p.getY(i)
      p.setZ(i, p.getZ(i) + y * 0.35 + x * x * 0.6)
    }
    bladeGeo.computeVertexNormals()
  }
  const bladeMat = new MeshToonMaterial({ color: '#86c8e8', gradientMap: TOON_STEPS, transparent: true, opacity: 0.72, side: DoubleSide })
  const rotor = new Group()
  rotor.position.set(0, 0.02, 0)
  fanHead.add(rotor)
  for (let i = 0; i < 3; i++) {
    const arm = new Group()
    arm.rotation.z = (i / 3) * Math.PI * 2
    rotor.add(arm)
    add(arm, bladeGeo, bladeMat, [0.018, 0, 0], [0, 0, 0], 1, FLAT)
  }
  add(rotor, cyl(0.032, 0.036, 0.03, 20), teal, [0, 0, 0.005], [Math.PI / 2, 0, 0])
  add(rotor, new SphereGeometry(0.03, 16, 10), teal, [0, 0, 0.02], [0, 0, 0], [1, 1, 0.5])
  // Fan guard: rings + spokes merged into one mesh.
  const guardR = 0.205
  const guard: Geo[] = [new TorusGeometry(guardR, 0.004, 6, 48)]
  for (const [r, z] of [
    [0.16, 0.04],
    [0.11, 0.06],
    [0.06, 0.072],
    [0.16, -0.035],
    [0.1, -0.05],
  ])
    guard.push(new TorusGeometry(r, 0.0022, 4, 40).translate(0, 0, z))
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2
    const c = Math.cos(a)
    const s = Math.sin(a)
    guard.push(new TubeGeometry(new QuadraticBezierCurve3(new Vector3(c * 0.04, s * 0.04, 0.076), new Vector3(c * 0.16, s * 0.16, 0.068), new Vector3(c * guardR, s * guardR, 0)), 8, 0.0016, 3))
    if (i % 2 === 0) guard.push(new TubeGeometry(new QuadraticBezierCurve3(new Vector3(c * 0.06, s * 0.06, -0.055), new Vector3(c * 0.16, s * 0.16, -0.05), new Vector3(c * guardR, s * guardR, 0)), 8, 0.0016, 3))
  }
  const guardGeo = mergeGeometries(guard.map((g) => (g.index ? g.toNonIndexed() : g)))
  if (guardGeo) add(fanHead, guardGeo, toon('#dcdfe4'), [0, 0.02, 0], [0, 0, 0], 1, FLAT)
  add(fanHead, cyl(0.04, 0.04, 0.006, 24), cream, [0, 0.02, 0.079], [Math.PI / 2, 0, 0])
  add(fanHead, cyl(0.03, 0.03, 0.007, 24), toon('#d9534f'), [0, 0.02, 0.0795], [Math.PI / 2, 0, 0])
  add(room, new TubeGeometry(new CatmullRomCurve3([new Vector3(0.95, 0.03, -0.18), new Vector3(0.9, 0.01, -0.3), new Vector3(1.3, 0.01, -0.5)]), 20, 0.005, 5), toon('#2b2b2f'), [0, 0, 0], [0, 0, 0], 1, FLAT)

  // Dust floating in the sunbeam.
  const beamDir = new Vector3().subVectors(sun.target.position, sun.position).normalize()
  const DUST = 90
  const dustPos = new Float32Array(DUST * 3)
  const dustPhase = new Float32Array(DUST)
  for (let i = 0; i < DUST; i++) {
    const t = rnd()
    const p = new Vector3(winX + (rnd() - 0.5) * winW * 0.9, winY + (rnd() - 0.5) * winH * 0.8, wallZ).addScaledVector(beamDir, t * 1.0)
    dustPos.set([p.x, p.y, p.z], i * 3)
    dustPhase[i] = rnd() * 100
  }
  const dustRest = dustPos.slice()
  const dustGeo = new BufferGeometry()
  dustGeo.setAttribute('position', new BufferAttribute(dustPos, 3))
  scene.add(new Points(dustGeo, new PointsMaterial({ color: '#fff3cf', size: 0.009, map: softDot(32, 1), transparent: true, opacity: 0.85, depthWrite: false, blending: AdditiveBlending })))

  // Across the street: a yellow house with green shutters, balconies, plants, shop signs.
  const outside = new Group()
  scene.add(outside)
  const house = new Group()
  house.position.set(0.3, 0, -3)
  outside.add(house)
  add(house, box(7, 6, 0.3), toon('#f2cf7c'), [0, 3, 0], [0, 0, 0], 1, FLAT)
  add(house, box(7, 0.18, 0.4), toon('#e6b85e'), [0, 6, 0.05], [0, 0, 0], 1, FLAT)
  const shutter = toon('#3f8f63')
  const shutterDark = toon('#2f7350')
  const windowGlass = toon('#6f93ad')
  const ledge = toon('#e9dcc0')
  const plant = toon('#4f9e57')
  const flowers = ['#e8506a', '#ff9f43', '#f6d04d', '#ffffff']
  for (let row = 0; row < 5; row++)
    for (let col = -4; col <= 4; col++) {
      const x = col * 0.75 + (row % 2) * 0.15
      const y = 0.6 + row * 1.05
      const open = rnd() < 0.55
      add(house, box(0.42, 0.55, 0.02), windowGlass, [x, y, 0.16], [0, 0, 0], 1, FLAT)
      if (open) {
        // Shutters folded out to the sides.
        add(house, box(0.21, 0.57, 0.02), shutter, [x - 0.33, y, 0.2], [0, 0.25, 0], 1, FLAT)
        add(house, box(0.21, 0.57, 0.02), shutter, [x + 0.33, y, 0.2], [0, -0.25, 0], 1, FLAT)
      } else {
        add(house, box(0.21, 0.57, 0.02), shutter, [x - 0.105, y, 0.18], [0, 0, 0], 1, FLAT)
        add(house, box(0.21, 0.57, 0.02), shutterDark, [x + 0.105, y, 0.18], [0, 0, 0], 1, FLAT)
      }
      add(house, box(0.5, 0.03, 0.12), ledge, [x, y - 0.3, 0.2], [0, 0, 0], 1, FLAT)
      if (rnd() < 0.3) add(house, box(0.26, 0.18, 0.14), toon('#e3e5ea'), [x + 0.33, y - 0.18, 0.24], [0, 0, 0], 1, FLAT)
      if (rnd() < 0.4) {
        add(house, new IcosahedronGeometry(0.08, 0), plant, [x - 0.15, y - 0.22, 0.25], [0, 0, 0], 1, FLAT)
        add(house, new SphereGeometry(0.022, 6, 4), toon(flowers[Math.floor(rnd() * flowers.length)]), [x - 0.12, y - 0.16, 0.31], [0, 0, 0], 1, FLAT)
      }
    }
  add(house, new PlaneGeometry(1.5, 0.234), toon('#ffffff', { map: shopSign('CHO THUÊ PHÒNG', '#c8323c', '#ffe08a') }), [0.7, 2.02, 0.19], [0, 0, 0], 1, FLAT)
  add(house, new PlaneGeometry(0.9, 0.16), toon('#ffffff', { map: shopSign('PHÔ TÔ · IN ẢNH THẺ', '#2f6fb0', '#ffffff') }), [1.25, 1.15, 0.19], [0, 0, 0], 1, FLAT)
  // Tangled power lines + pole.
  const wireMat = new MeshBasicMaterial({ color: '#2a2c36' })
  for (let i = 0; i < 16; i++) {
    const y0 = 2.2 + rnd() * 1.6
    const y1 = 2 + rnd() * 1.8
    const pts = [new Vector3(-3, y0, -1.2 - rnd() * 1.4), new Vector3(0.2 + rnd() * 0.6, Math.min(y0, y1) - 0.3 - rnd() * 0.4, -1.4 - rnd() * 1.2), new Vector3(3.5, y1, -1 - rnd() * 1.6)]
    outside.add(new Mesh(new TubeGeometry(new CatmullRomCurve3(pts), 30, 0.006 + rnd() * 0.006, 4), wireMat))
  }
  add(outside, cyl(0.07, 0.09, 6, 10), toon('#8a8d99'), [-1.1, 3, -1.9], [0, 0, 0], 1, FLAT)
  add(outside, box(0.6, 0.06, 0.06), toon('#6a6d79'), [-1.1, 3.4, -1.9], [0, 0, 0], 1, FLAT)

  // Birds crossing the sky now and then (two-plank wings that flap).
  const birdMat = toon('#3a3340')
  const birds = Array.from({ length: 3 }, () => {
    const b = new Group()
    const body = add(b, new SphereGeometry(0.025, 8, 6), birdMat, [0, 0, 0], [0, 0, 0], [1.6, 0.8, 0.8], FLAT)
    body.castShadow = false
    const wings = [-1, 1].map((s) => {
      const pivot = new Group()
      b.add(pivot)
      add(pivot, box(0.016, 0.004, 0.09), birdMat, [0, 0, s * 0.045], [0, 0, 0], 1, FLAT)
      return { pivot, s }
    })
    b.visible = false
    outside.add(b)
    return { b, wings, t: 0, speed: 0, y: 0, z: 0, phase: rnd() * 6 }
  })
  let nextFlock = 2.5

  // Steam from the coffee.
  const steamTex = softDot(64, 0.6)
  const steam = Array.from({ length: 7 }, (_, i) => {
    const s = new Sprite(new SpriteMaterial({ map: steamTex, transparent: true, depthWrite: false, opacity: 0 }))
    s.userData.t = i / 7
    scene.add(s)
    return s
  })

  renderer.toneMapping = ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.0
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = PCFSoftShadowMap

  const pointer = { x: 0, y: 0 }
  const eased = { x: 0, y: 0 }

  function resize(w: number, h: number) {
    camera.aspect = w / h
    if (camera.aspect < 1) {
      // Portrait phones: step back and look a bit higher so the form + menu fit around the desk.
      camPos.set(-0.2, 1.45, 2.5 + (0.75 - Math.min(camera.aspect, 0.75)) * 1.4)
      camLook.set(0.2, 1.08, -0.4)
      camera.fov = 48
      camera.clearViewOffset()
    } else {
      const k = camera.aspect < 1.5 ? 1.5 / camera.aspect : 1
      camPos.set(-0.85 * k, 1.38, 2.05 * k)
      camLook.set(0.18, 1.02, -0.45)
      camera.fov = 38
      if (shiftX) camera.setViewOffset(w, h, shiftX, 0, w, h)
      else camera.clearViewOffset()
    }
    camera.updateProjectionMatrix()
  }

  let time = 0
  let bikeIn = 4
  let wind = 0.5
  const tmp = new Vector3()
  const curtainPos = curtainGeo.attributes.position

  function update(dt: number) {
    time += dt
    eased.x += (pointer.x - eased.x) * Math.min(1, dt * 2)
    eased.y += (pointer.y - eased.y) * Math.min(1, dt * 2)
    camera.position.set(camPos.x + eased.x * 0.08 + Math.sin(time * 0.21) * 0.02, camPos.y - eased.y * 0.05 + Math.sin(time * 0.17) * 0.012, camPos.z)
    camera.lookAt(camLook)

    // Fan: blades spin, head oscillates; the curtain billows when it points at the window.
    rotor.rotation.z -= dt * 26
    swivel.rotation.y = Math.sin(time * 0.45) * 0.5
    wind = 0.5 + 0.5 * Math.sin(time * 0.45 + 0.6)
    const gust = 0.5 + 0.5 * Math.max(0, Math.sin(time * 0.45 + 0.6))
    for (let i = 0; i < curtainPos.count; i++) {
      const x = curtainRest[i * 3]
      const y = curtainRest[i * 3 + 1]
      const down = (curtainH / 2 - y) / curtainH
      curtainPos.setZ(i, Math.sin(x * 14 + time * 2.2) * 0.01 + down * down * (0.02 + gust * 0.035) * (0.7 + 0.3 * Math.sin(time * 3 + y * 4)))
      curtainPos.setX(i, x - down * down * gust * 0.02 * (0.6 + 0.4 * Math.sin(time * 1.7)))
    }
    curtainPos.needsUpdate = true
    curtain.geometry.computeVertexNormals()

    // Motorbikes (heard, not seen).
    const before = bikeIn
    bikeIn -= dt
    if (before >= 0 && bikeIn < 0) api.onBikePass?.({ duration: 2.6, horn: Math.random() < 0.4 })
    if (bikeIn < -2.6) bikeIn = 6 + Math.random() * 6

    // Birds.
    nextFlock -= dt
    if (nextFlock < 0) {
      nextFlock = 7 + Math.random() * 9
      const n = 1 + Math.floor(Math.random() * 3)
      const y = 2.6 + Math.random() * 1.2
      const z = -1.6 - Math.random() * 0.9
      const dir = Math.random() < 0.5 ? 1 : -1
      birds.forEach((bird, i) => {
        if (i >= n) return
        bird.b.visible = true
        bird.t = -i * 0.12
        bird.speed = dir * (0.9 + Math.random() * 0.3)
        bird.y = y + (Math.random() - 0.5) * 0.3
        bird.z = z - i * 0.15
      })
    }
    for (const bird of birds) {
      if (!bird.b.visible) continue
      bird.t += dt
      const x = (bird.speed > 0 ? -3.2 : 3.6) + bird.speed * bird.t
      bird.b.position.set(x, bird.y + Math.sin(bird.t * 2 + bird.phase) * 0.12, bird.z)
      bird.b.rotation.y = bird.speed > 0 ? 0 : Math.PI
      const flap = Math.sin(bird.t * 16 + bird.phase) * 0.7
      for (const w of bird.wings) w.pivot.rotation.x = w.s * flap
      if (Math.abs(x) > 4) bird.b.visible = false
    }

    // Dust drifting in the sunbeam.
    const dp = dustGeo.attributes.position
    for (let i = 0; i < DUST; i++) {
      const ph = dustPhase[i]
      dp.setXYZ(i, dustRest[i * 3] + Math.sin(time * 0.13 + ph) * 0.05, dustRest[i * 3 + 1] + Math.sin(time * 0.09 + ph * 1.7) * 0.04, dustRest[i * 3 + 2] + Math.cos(time * 0.11 + ph) * 0.04)
    }
    dp.needsUpdate = true

    steam.forEach((s, i) => {
      s.userData.t = ((s.userData.t as number) + dt * 0.22) % 1
      const t = s.userData.t as number
      tmp.copy(coffeeAt).add(new Vector3(Math.sin(t * 6 + i) * 0.015, 0.15 + t * 0.22, 0))
      s.position.copy(tmp)
      s.scale.setScalar(0.03 + t * 0.08)
      s.material.opacity = Math.sin(t * Math.PI) * 0.4
    })
  }

  const render = () => renderer.render(scene, camera)

  function dispose() {
    scene.traverse((o) => {
      const m = o as Mesh
      m.geometry?.dispose()
      const mats = m.material ? ([] as Material[]).concat(m.material) : []
      for (const mat of mats) {
        ;(mat as MeshBasicMaterial).map?.dispose()
        mat.dispose()
      }
    })
  }

  const api: DeskScene = {
    update,
    render,
    resize,
    setShiftX: (px) => {
      shiftX = px
    },
    setPointer: (x, y) => {
      pointer.x = x
      pointer.y = y
    },
    dispose,
    onBikePass: null,
    get fanWind() {
      return wind
    },
  }
  return api
}

/** One renderer for the title screen, kept alive across quick remounts (title → loading title). */
let live: { canvas: HTMLCanvasElement; renderer: WebGLRenderer; scene: DeskScene; disposeTimer?: number } | null = null

/**
 * Put the 3D desk into `host` (fills it). Returns an unmount function; the scene is only torn
 * down when nothing mounts it again within a second.
 */
export function mountDeskScene(host: HTMLElement, onBikePass?: DeskScene['onBikePass'], onWind?: (w: number) => void) {
  if (!live) {
    const canvas = document.createElement('canvas')
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block'
    const renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75))
    live = { canvas, renderer, scene: createDeskScene(renderer) }
  }
  const l = live
  window.clearTimeout(l.disposeTimer)
  host.appendChild(l.canvas)
  l.scene.onBikePass = onBikePass ?? null

  const fit = () => {
    const w = host.clientWidth
    const h = host.clientHeight
    if (!w || !h) return
    l.renderer.setSize(w, h, false)
    l.scene.setShiftX(w > 900 ? -Math.min(260, w * 0.17) : 0)
    l.scene.resize(w, h)
  }
  const ro = new ResizeObserver(fit)
  ro.observe(host)
  fit()
  const onMove = (e: PointerEvent) => l.scene.setPointer((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1)
  window.addEventListener('pointermove', onMove)
  let last = performance.now()
  l.renderer.setAnimationLoop(() => {
    const now = performance.now()
    l.scene.update(Math.min((now - last) / 1000, 0.05))
    last = now
    onWind?.(l.scene.fanWind)
    l.scene.render()
  })

  return () => {
    ro.disconnect()
    window.removeEventListener('pointermove', onMove)
    l.renderer.setAnimationLoop(null)
    l.scene.onBikePass = null
    l.disposeTimer = window.setTimeout(() => {
      if (live !== l) return
      l.scene.dispose()
      l.renderer.dispose()
      l.canvas.remove()
      live = null
    }, 1000)
  }
}
