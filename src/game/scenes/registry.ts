import type { ComponentType } from 'react'
import type { Localized } from '../../i18n/localized'
import type { Condition } from '../../data/conditions'
import type { SceneId } from '../../store/worldStore'
import { loadModelPacks, type ModelPack } from './shared/models'
import { chunk } from '../../updates'
import { SHOP_ROOM_LIST, shopExit, shopScene, shopStreetSpawns, type ShopSceneId } from '../../data/shopRooms'

/** 1.33: a scene's code chunk and the model packs it draws with, fetched together. */
const withModels =
  (packs: ModelPack[], load: () => Promise<{ default: ComponentType }>) =>
  (): Promise<{ default: ComponentType }> =>
    // 1.42: a chunk of an older version gone from the server → save + reload into the new one (src/updates.ts)
    Promise.all([chunk(load()), loadModelPacks(packs)]).then(([m]) => m)

export interface SpawnPoint {
  x: number
  z: number
  /** Camera yaw on arrival. */
  yaw: number
}

export interface SceneInfo {
  id: SceneId
  country: 'vn' | 'de'
  /** Indoor scenes use fixed warm lighting instead of the day/night sky. */
  indoor: boolean
  name: Localized
  spawns: { default: SpawnPoint } & Record<string, SpawnPoint>
  /** 1.43 a journey (the first flight): the clock jumps through the night, nobody passes out here. */
  journey?: boolean
  /** Camera distance multiplier (rooms are viewed a little closer). */
  cameraZoom?: number
  /** Place-name plaque shown when you arrive (street sign style per country). */
  plaque: { style: 'hanoi' | 'german' | 'room'; title: Localized; subtitle?: Localized; alt?: { if: Condition; title: Localized; subtitle?: Localized } }
  /** Each scene is its own code chunk, loaded on first visit (plan §3: lazy-load each scene). */
  load: () => Promise<{ default: ComponentType }>
}

/** 1.41 one scene per shop room (data/shopRooms.ts); they all share the scenes/ShopRoom chunk. */
const loadShopRoom = withModels(['nature', 'food', 'interior'], () => import('./ShopRoom'))
const shopRoomScenes = Object.fromEntries(
  SHOP_ROOM_LIST.map((r): [SceneId, SceneInfo] => {
    const exit = shopExit(r)
    const id = shopScene(r.id)
    return [
      id,
      {
        id,
        country: 'vn',
        indoor: true,
        name: r.name,
        plaque: { style: 'room', title: r.name, subtitle: r.subtitle },
        // a little way in from the mat, so the camera frames the room and its back wall (signs, counter)
        spawns: { default: { x: exit.x - 0.3, z: exit.z - 1.6, yaw: 0 } },
        // wide rooms (lẩu, the restaurant) need the camera further back (stays < 1 = indoor rules)
        cameraZoom: r.w >= 11 ? 0.98 : 0.9,
        load: loadShopRoom,
      },
    ]
  }),
) as Record<ShopSceneId, SceneInfo>

export const SCENES: Record<SceneId, SceneInfo> = {
  ...shopRoomScenes,
  vietnam: {
    id: 'vietnam',
    country: 'vn',
    indoor: false,
    name: { vi: 'Phố Hàng Gai, Hà Nội', en: 'Hàng Gai Street, Hanoi', de: 'Hàng-Gai-Straße, Hanoi' },
    plaque: { style: 'hanoi', title: { vi: 'PHỐ HÀNG GAI', en: 'HÀNG GAI STREET', de: 'HÀNG-GAI-STRASSE' }, subtitle: { vi: 'Q. Hoàn Kiếm · Hà Nội', en: 'Hoàn Kiếm · Hanoi', de: 'Hoàn Kiếm · Hanoi' } },
    spawns: {
      default: { x: -5.5, z: -2.6, yaw: 0 },
      xeOm: { x: 8.4, z: 0.6, yaw: 0 },
      home: { x: -5.5, z: -3.2, yaw: 0 },
      center: { x: -1.1, z: -11.0, yaw: 0 },
      maiDoor: { x: 10.7, z: -10.6, yaw: Math.PI / 2 },
      /** 1.39 the gate of the pickleball court in Vườn hoa Hàng Khay (HangKhay/layout.ts PICKLE). */
      pickleball: { x: -30, z: 114.2, yaw: 0 },
      /** 1.41 in front of each shop door (data/shopRooms.ts). */
      ...shopStreetSpawns(),
    },
    load: withModels(['nature', 'city', 'food', 'town', 'facade', 'street', 'towers', 'citybits', 'urban'], () => import('./VietnamStreet')),
  },
  home: {
    id: 'home',
    country: 'vn',
    indoor: true,
    name: { vi: 'Nhà mình', en: 'Home', de: 'Zuhause' },
    plaque: { style: 'room', title: { vi: 'Nhà mình', en: 'Home', de: 'Zuhause' }, subtitle: { vi: 'Số 12, ngõ Hàng Gai', en: 'No. 12, Hàng Gai lane', de: 'Nr. 12, Hàng-Gai-Gasse' } },
    spawns: { default: { x: 3.4, z: 2.4, yaw: 0 }, bed: { x: -2.2, z: -0.7, yaw: 0 }, backDoor: { x: 0.95, z: -2.2, yaw: 0 } },
    cameraZoom: 0.8,
    load: withModels(['nature', 'interior', 'urban'], () => import('./Home')),
  },
  /** 1.42 the back yard with the hens (scenes/HomeYard, systems/homeYard.ts): outdoors, private. */
  homeYard: {
    id: 'homeYard',
    country: 'vn',
    indoor: false,
    name: { vi: 'Vườn sau nhà', en: 'The back yard' },
    plaque: { style: 'room', title: { vi: 'Vườn sau nhà', en: 'The back yard' }, subtitle: { vi: 'Chuồng gà · luống rau · chum nước', en: 'Hens · vegetable beds · water jars' } },
    spawns: { default: { x: 0, z: -3.3, yaw: 0 } },
    cameraZoom: 0.92,
    load: withModels(['nature', 'farm'], () => import('./HomeYard').then((m) => import('../components/animals/Animal').then((A) => A.loadAnimals(['hen', 'chick', 'cat', 'dog'])).then(() => m, () => m))),
  },
  maiOffice: {
    id: 'maiOffice',
    country: 'vn',
    indoor: true,
    name: { vi: 'Văn phòng Mai Anh', en: 'Mai Anh office', de: 'Büro Mai Anh' },
    plaque: { style: 'room', title: { vi: 'Văn phòng Mai Anh', en: 'Mai Anh office', de: 'Büro Mai Anh' }, subtitle: { vi: 'Tầng 2 · Phố Hàng Bông', en: '2nd floor · Hàng Bông street', de: '2. Stock · Hàng-Bông-Straße' } },
    spawns: { default: { x: 2.9, z: 1.7, yaw: 0 } },
    cameraZoom: 0.8,
    load: withModels(['nature'], () => import('./MaiOffice')),
  },
  classroom: {
    id: 'classroom',
    country: 'vn',
    indoor: true,
    name: { vi: 'Lớp tiếng Đức Thầy Minh', en: 'Teacher Minh’s German class', de: 'Deutschkurs bei Lehrer Minh' },
    plaque: { style: 'room', title: { vi: 'Trung tâm Đức ngữ', en: 'German language centre', de: 'Deutsches Sprachzentrum' }, subtitle: { vi: 'Phòng 2 · Lớp Thầy Minh', en: 'Room 2 · Teacher Minh', de: 'Raum 2 · Lehrer Minh' } },
    spawns: { default: { x: 4.6, z: 2.7, yaw: 0 } },
    cameraZoom: 0.82,
    load: withModels(['nature'], () => import('./Classroom')),
  },
  examHall: {
    id: 'examHall',
    country: 'vn',
    indoor: true,
    name: { vi: 'Phòng thi tiếng Đức', en: 'German exam room', de: 'Prüfungsraum' },
    plaque: { style: 'room', title: { vi: 'Phòng thi', en: 'Exam room', de: 'Prüfungsraum' }, subtitle: { vi: 'Kỳ thi tiếng Đức · Deutschprüfung', en: 'German exam · Deutschprüfung', de: 'Deutschprüfung' } },
    spawns: { default: { x: 4.6, z: 2.7, yaw: 0 } },
    cameraZoom: 0.82,
    load: withModels(['nature'], () => import('./ExamHall')),
  },
  embassy: {
    id: 'embassy',
    country: 'vn',
    indoor: true,
    name: { vi: 'Đại sứ quán Đức', en: 'German Embassy', de: 'Deutsche Botschaft' },
    plaque: { style: 'room', title: { vi: 'Đại sứ quán Đức', en: 'German Embassy', de: 'Deutsche Botschaft' }, subtitle: { vi: 'Phòng visa · Hà Nội', en: 'Visa section · Hanoi', de: 'Visastelle · Hanoi' } },
    spawns: { default: { x: 0, z: 2.6, yaw: 0 } },
    cameraZoom: 0.8,
    load: withModels(['nature'], () => import('./Embassy')),
  },
  airport: {
    id: 'airport',
    country: 'vn',
    indoor: true,
    name: { vi: 'Sân bay Nội Bài', en: 'Nội Bài Airport', de: 'Flughafen Nội Bài' },
    plaque: { style: 'room', title: { vi: 'Sân bay Nội Bài', en: 'Nội Bài Airport', de: 'Flughafen Nội Bài' }, subtitle: { vi: 'Ga quốc tế T2', en: 'International terminal T2', de: 'Internationales Terminal T2' } },
    spawns: { default: { x: 0, z: 2.8, yaw: 0 } },
    cameraZoom: 0.85,
    load: withModels(['nature'], () => import('./Airport')),
  },
  /** 1.43 the jet bridge + cabin of the first flight (systems/flight.ts): find your seat. */
  plane: {
    id: 'plane',
    country: 'vn',
    indoor: true,
    name: { vi: 'Chuyến bay SH 701', en: 'Flight SH 701' },
    plaque: { style: 'room', title: { vi: 'Chuyến bay SH 701', en: 'Flight SH 701' }, subtitle: { vi: 'Hà Nội → Frankfurt · tìm ghế trên thẻ lên máy bay', en: 'Hanoi → Frankfurt · find the seat on your boarding pass' } },
    spawns: { default: { x: -6.5, z: 13.4, yaw: 0 }, aisle: { x: 0, z: -0.4, yaw: 0 } },
    cameraZoom: 0.9,
    journey: true,
    load: withModels(['nature'], () => import('./Plane')),
  },
  /** 1.43 transit at Frankfurt: Passkontrolle, the departures board, gates G / H. */
  transit: {
    id: 'transit',
    country: 'de',
    indoor: true,
    name: { vi: 'Sân bay Frankfurt (transit)', en: 'Frankfurt Airport (transit)', de: 'Flughafen Frankfurt' },
    plaque: { style: 'german', title: { vi: 'Flughafen Frankfurt', en: 'Flughafen Frankfurt', de: 'Flughafen Frankfurt' }, subtitle: { vi: 'Transit · nối chuyến đi München', en: 'Transfer · connecting to München', de: 'Transfer · Anschlussflüge' } },
    spawns: { default: { x: 0, z: 14.4, yaw: 0 }, hall: { x: 3, z: 1.4, yaw: 0 } },
    cameraZoom: 0.95,
    journey: true,
    load: withModels(['nature'], () => import('./Transit')),
  },
  germany: {
    id: 'germany',
    country: 'de',
    indoor: false,
    // 1.44 the whole of München (scenes/GermanyStreet: Lindenstraße + the city round it)
    name: { vi: 'München, nước Đức', en: 'Munich, Germany', de: 'München' },
    plaque: { style: 'german', title: { vi: 'München', en: 'München', de: 'München' }, subtitle: { vi: 'Lindenstraße · Bayern', en: 'Lindenstraße · Bavaria', de: 'Lindenstraße · Bayern' } },
    spawns: {
      default: { x: -1.0, z: -1.2, yaw: 0 },
      wg: { x: -9.5, z: -3.2, yaw: 0 },
      buergeramt: { x: -2.0, z: -3.2, yaw: 0 },
      tram: { x: 3.4, z: 0.4, yaw: 0 },
      /** 1.44 sights of München (test tools / tests) */
      marienplatz: { x: -19, z: -27, yaw: 0 },
      hbf: { x: -50, z: -1.5, yaw: 0 },
      garten: { x: 10, z: -114, yaw: 0 },
      isar: { x: 38, z: -40, yaw: 0 },
    },
    // 1.45 the car models too (parked taxis are built once when the city mounts)
    load: withModels(['nature', 'city', 'food', 'town', 'facade', 'street', 'towers', 'citybits', 'urban'], () => import('./GermanyStreet').then((m) => import('./shared/carModels').then((c) => c.loadCarModels()).then(() => m, () => m))),
  },
  buergeramt: {
    id: 'buergeramt',
    country: 'de',
    indoor: true,
    name: { vi: 'Bürgeramt', en: 'Bürgeramt (citizens’ office)', de: 'Bürgeramt' },
    plaque: { style: 'room', title: { vi: 'Bürgeramt', en: 'Bürgeramt', de: 'Bürgeramt' }, subtitle: { vi: 'Phòng đăng ký cư trú', en: 'Citizens’ office', de: 'Bürgerservice' } },
    spawns: { default: { x: 0, z: 2.6, yaw: 0 } },
    cameraZoom: 0.8,
    load: withModels(['nature'], () => import('./Buergeramt')),
  },
  wg: {
    id: 'wg',
    country: 'de',
    indoor: true,
    name: { vi: 'Căn hộ WG', en: 'The flat-share (WG)', de: 'Die WG' },
    plaque: { style: 'room', title: { vi: 'Căn hộ WG', en: 'The WG', de: 'Die WG' }, subtitle: { vi: 'Lindenstraße 12, tầng 3', en: 'Lindenstraße 12, 3rd floor', de: 'Lindenstraße 12, 3. OG' }, alt: { if: { flag: 'de.ownFlat' }, title: { vi: 'Căn hộ của mình', en: 'My own flat', de: 'Meine Wohnung' }, subtitle: { vi: 'Lindenstraße 12, tầng 4', en: 'Lindenstraße 12, 4th floor', de: 'Lindenstraße 12, 4. OG' } } },
    spawns: { default: { x: 1.5, z: 2.4, yaw: 0 } },
    cameraZoom: 0.78,
    load: withModels(['nature'], () => import('./WgRoom')),
  },
  university: {
    id: 'university',
    country: 'de',
    indoor: true,
    name: { vi: 'Đại học LMU München', en: 'LMU Munich', de: 'LMU München' },
    plaque: { style: 'room', title: { vi: 'LMU München', en: 'LMU Munich', de: 'LMU München' }, subtitle: { vi: 'Hörsaal 2 · Khoa Điều dưỡng', en: 'Lecture hall 2 · Nursing', de: 'Hörsaal 2 · Pflege' } },
    spawns: { default: { x: 5.0, z: 3.6, yaw: 0 } },
    cameraZoom: 0.95,
    load: withModels(['nature'], () => import('./University')),
  },
  careHome: {
    id: 'careHome',
    country: 'de',
    indoor: true,
    name: { vi: 'Viện dưỡng lão Sonnenhof', en: 'Sonnenhof care home', de: 'Pflegeheim Sonnenhof' },
    plaque: { style: 'room', title: { vi: 'Pflegeheim Sonnenhof', en: 'Sonnenhof care home', de: 'Pflegeheim Sonnenhof' } },
    spawns: { default: { x: 0, z: 3.0, yaw: 0 } },
    cameraZoom: 0.85,
    load: withModels(['nature'], () => import('./CareHome')),
  },
}
