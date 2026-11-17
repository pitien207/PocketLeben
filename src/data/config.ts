/**
 * All tunable numbers live here (plan §9: "all balancing numbers in data/config.ts").
 * Engine code reads from CONFIG; never hardcode gameplay/feel values in components.
 */

export type Vec3 = [number, number, number]

export const CONFIG = {
  version: __APP_VERSION__,

  player: {
    /** Metres per second at full joystick / key press. */
    walkSpeed: 4.2,
    /** Running (Shift / run button): walk speed × this. */
    runMultiplier: 1.75,
    /** How quickly velocity reaches the target (higher = snappier). */
    accelSharpness: 12,
    /** How quickly the character turns to face the move direction. */
    turnSharpness: 14,
    /** Spawn point: on the sidewalk in front of the family house. */
    spawn: [-5.5, 0.2, -2.6] as Vec3,
    /** Respawn if the player somehow falls below this height. */
    fallResetY: -5,
    /** Speed multiplier when the game walks the player somewhere (e.g. behind a counter). */
    autoWalkSpeedScale: 0.8,
    /** If an auto-walk gets stuck this long, the player is placed at the destination. */
    autoWalkTimeoutSec: 6,
  },

  camera: {
    fov: 45,
    /** Wider vertical FOV on tall portrait screens so you still see the street. */
    portraitFov: 62,
    /** Distance from the look target in landscape. */
    distance: 9,
    /** Downward angle of the camera (plan §2: ~35–45°); the player can drag it within min/max. */
    pitchDeg: 40,
    minPitchDeg: 15,
    maxPitchDeg: 75,
    /** Player zoom (distance multiplier): pinch, mouse wheel or the +− buttons. */
    userZoom: { default: 1.15, min: 0.55, max: 2.1 },
    /** Degrees of tilt per pixel dragged up/down. */
    tiltSensitivity: 0.18,
    /** Extra distance multiplier for tall portrait screens. */
    portraitDistanceScale: 1.3,
    followSharpness: 7,
    /** Height above the player's feet that the camera looks at. */
    lookHeight: 0.9,
    /** Radians of yaw per pixel dragged. */
    dragSensitivity: 0.006,
    initialYaw: 0,
    /** Closest the camera may be pulled in when a building blocks the view. */
    minDistance: 2.5,
    /** Distance multiplier while working at a station (plan §2: slight zoom on interaction). */
    workZoom: 0.72,
  },

  /** Money/energy change through jobs (M2); time, energy restore and saving arrive in M3. */
  startingStats: {
    money: 3_000_000, // VND (story 2.1)
    energy: 80,
    maxEnergy: 100,
    mood: 60,
  },

  /** In-game clock (plan §5.2). The day starts at 07:00 on Monday, day 1. */
  time: {
    /** Game minutes that pass per real second while walking around. */
    minutesPerSecond: 1,
    startMinutes: 7 * 60,
    wakeHour: 7,
    /** Still awake at this hour → you fall asleep on the street. */
    passOutHour: 2,
    /** Sleeping is allowed from this hour, or any time when energy is low. */
    sleepFromHour: 18,
    sleepIfEnergyBelow: 35,
    /** Minutes a chat with an NPC takes. */
    talkMinutes: 5,
    /** Day 1 of the story (a Monday): the start of the school year in Hà Nội. */
    startDate: { year: 2025, month: 9, day: 1 },
    /** Settings → time speed: multiplier on minutesPerSecond. */
    speeds: { slow: 0.5, normal: 1, fast: 2 },
    /** Waiting ("Chờ") fast-forwards this many game minutes per real second. */
    fastForwardPerSecond: 150,
    /** You can't wait past this hour — go to bed instead. */
    waitUntilHourMax: 23.5,
    /** A nap on your bed. */
    napMinutes: 60,
    napEnergy: 15,
  },

  /** Trung tâm Đức ngữ (Thầy Minh's class) in the lane. */
  school: {
    hours: [7, 21] as [number, number],
  },

  /** Energy and mood over time. */
  needs: {
    energyDrainPerHour: 2,
    /** Mood slowly returns toward this value (points per game hour). */
    moodBaseline: 55,
    moodDriftPerHour: 1,
    sleepMood: 10,
    passOutEnergy: 40,
    passOutMood: -15,
    /** Mood change per shift = (satisfaction − 50) × this × share of shift worked. */
    workMoodFactor: 0.12,
  },

  npc: {
    walkSpeed: 1.25,
    vendorSpeed: 0.75,
    /** NPCs stop when the player is this close in front of them. */
    yieldDistance: 1.1,
    /** Seconds between trà đá chats [min, max]. */
    chatIntervalSec: [8, 15] as [number, number],
    /** Seconds between one-liners from a single NPC [min, max]. */
    soloIntervalSec: [12, 26] as [number, number],
    bubbleSec: 3,
    /** Speech bubbles further than this from the player stay hidden. */
    bubbleRange: 20,
  },

  traffic: {
    speedMin: 5,
    speedMax: 7.5,
    /** Bikes drive off into the fog and come back from the other side. */
    wrapX: 48,
    /** Bikes slow down for a player within slowDistance and stop at stopDistance. */
    slowDistance: 5.5,
    stopDistance: 2.3,
  },

  /** Learning German (plan §6 chapter 1). Level index 0 = A1 course/exam. */
  german: {
    levels: [
      // Story 2.1: a small centre in the lane (≈ 1/3 of Goethe Hà Nội); Goethe exam fees.
      { name: 'A1', courseFee: 4_500_000, examFee: 3_000_000, xpToExam: 60 },
      { name: 'A2', courseFee: 5_000_000, examFee: 3_500_000, xpToExam: 80 },
      { name: 'B1', courseFee: 6_500_000, examFee: 4_800_000, xpToExam: 120 },
    ],
    lessonMinutes: 60,
    lessonEnergy: 8,
    xpPerCorrect: 3,
    perfectBonus: 6,
    selfStudyMinutes: 45,
    selfStudyEnergy: 5,
    selfStudyXpFactor: 0.5,
    /** Nicos Weg on the phone (Deutsche Welle, free): anywhere, short, slow. */
    nicosMinutes: 20,
    nicosEnergy: 2,
    nicosXpFactor: 0.25,
    /** B1 is four modules (Lesen, Hören, Schreiben, Sprechen); a failed module is retaken alone. */
    b1ModuleRetakeFee: 1_200_000,
    examMinutes: 120,
    examPassScore: 0.7,
    examPassMood: 15,
    examFailMood: -8,
  },

  /** The visa chapter (plan §6 chapter 2). Amounts are game-balanced, not real-world prices. */
  visa: {
    /** Bank exchange (story 2.1, like Vietcombank 2026): you buy € at 31.500đ, sell € at 30.000đ. */
    eurBuy: 31_500,
    eurSell: 30_000,
    /** Studium: blocked account (Sperrkonto) 2026, € — solved by the family (sổ đỏ) or Cô Lan's guarantee. */
    sperrkonto: 11_904,
    sperrMonthly: 992,
    /** One-way flight booked by chị Mai's office (fixed, with someone to take you to the airport). */
    flightCost: 17_000_000,
    /** Booking it yourself on the laptop: the price changes every day within this range. */
    flightLaptop: [15_000_000, 20_000_000] as [number, number],
    /** First days' insurance (Ausbildung: the employer insures you from day one; Studium: 3 months). */
    insurance: { ausbildung: 700_000, studium: 3_000_000 },
    /** Văn phòng Mai Anh: everything with an office price + the Termin hunt, minus the flight. */
    officePackage: 5_500_000,
    officeTermin: 500_000,
    /** Tuấn finds a VFS slot this many days ahead (random in the range). */
    officeTerminDays: [2, 4] as [number, number],
    /** VFS: national visa fee 75 € paid in đồng + the VFS service fee. */
    vfsVisaFee: 2_400_000,
    vfsServiceFee: 700_000,
    /** APS interviews only on round days: every 14 days, the first on day 3 (a Wednesday). */
    apsRoundEvery: 14,
    apsFirstRound: 3,
    /** BA approval arrives this many days after the contract. */
    baWaitDays: 2,
    /** Days after a rejection in which a Remonstration letter can still be sent. */
    remonstrationDays: 7,
    /** Euros the step "dep.exchange" asks for; the first week in Germany needs ~600 € in total. */
    exchangeGoal: 200,
    firstWeekEur: 600,
    /** Envelopes at Nội Bài: Mẹ and Bố. */
    envelopes: { me: 300, bo: 100 },
    /** VFS slot sellers (scam): what clicking the message costs. */
    scamSlotPrice: 3_000_000,
    xeOmFare: 30_000,
    xeOmMinutes: 30,
    /** Termin slots: working hours only, every 30 min, at least `terminLeadMinutes` from now (today, else the next weekday). */
    terminHours: [8, 16.5] as [number, number],
    terminLeadMinutes: 60,
    terminAttempts: 4,
    /** Photo studio, notary, bank and APS office (west end of Phố Hàng Gai). */
    officeHours: [8, 17] as [number, number],
    /** Waiting for your turn at the APS office before the interview. */
    apsWaitMinutes: 60,
    apsPassScore: 0.6,
    interviewPassScore: 0.6,
    /** Days between an approved interview and the visa being ready. */
    approvalWaitDays: 3,
    rejectCooldownDays: 1,
    embassyHours: [8, 17] as [number, number],
  },

  /** Living in Germany (plan §6 chapter 3). Prices in EUR. */
  germany: {
    rentPerWeek: 95,
    hostelPerNight: 25,
    ticketPerWeek: 15,
    fareDodgeFine: 60,
    fareCheckChance: 0.35,
    tramMinutes: 20,
    officeHours: [8, 16] as [number, number],
    /** Waiting for your number to be called at the Bürgeramt. */
    waitMinutes: 90,
    wgCastingPassScore: 0.6,
    supermarketHours: [8, 22] as [number, number],
  },

  /** Ausbildung in the care home (plan §6 chapter 4B). */
  care: {
    durationSec: 120,
    /** EUR for a full workday at 100% multiplier 1.0. */
    pay: 60,
    energyCost: 25,
    xp: 25,
    hours: 8,
    startHours: [6, 14] as [number, number],
    /** At most this many residents need help at once. */
    maxNeeds: 2,
    needGapSec: [2.5, 6] as [number, number],
    patienceSec: 16,
    meter: { start: 50, helped: 10, wrong: 6, missed: 12 },
  },

  /** Chapter 4–5: training milestones, career, own flat, Tết trip, residence (EUR). */
  career: {
    zwischen: { school: 3, shifts: 6, questions: 5, pass: 0.6 },
    final: { school: 6, shifts: 12, questions: 6, pass: 0.65 },
    interview: { questions: 5, pass: 0.6 },
    /** A qualified nurse (Pflegefachkraft) earns this much more per shift. */
    proPayMultiplier: 1.8,
    proShifts: 5,
    tripCost: 650,
    tripDays: 4,
    flatDeposit: 900,
    flatRentPerWeek: 160,
    residence: { rentWeeks: 6, questions: 6, pass: 0.6 },
    citizenship: { questions: 5, pass: 0.7, fee: 255 },
    goalSavings: 10_000,
  },

  /** Chapter 4A — Studium (dual nursing degree, B.Sc. Pflege): university in Germany. EUR. */
  uni: {
    semesterFee: 320,
    /** Lectures and the library: weekdays, these hours. */
    hours: [8, 18] as [number, number],
    lectureEnergy: 15,
    lectureMinutes: 120,
    lectureQuestions: 3,
    klausur: { lectures: 6, groupWork: 2, questions: 6, pass: 0.6 },
    thesis: { lectures: 12, shifts: 6, questions: 5, pass: 0.6 },
  },

  /** The backpack: everything you carry has a weight (items.ts, keyItems.ts). */
  bag: { capacityKg: 6, bottleKg: 0.35 },

  /** Collecting deposit bottles (plan §6 side hustles). */
  pfand: {
    perBottle: 0.25,
    onStreet: 8,
    respawnSec: [35, 80] as [number, number],
    pickupRadius: 0.9,
  },

  save: {
    /** Wait this long after a change before writing the save. */
    debounceMs: 1500,
    /** Also save the player's position this often. */
    positionIntervalMs: 10_000,
  },

  world: {
    gravity: -20,
  },

  weather: {
    /** 1.20: the weather changes every block of this many game minutes. */
    blockMinutes: 150,
    /** How often each kind comes up (relative weights). */
    kinds: {
      vn: { clear: 34, cloudy: 18, breeze: 16, drizzle: 14, rain: 9, fog: 9 },
      de: { clear: 24, cloudy: 26, breeze: 12, drizzle: 16, rain: 14, fog: 8 },
    },
    /** Mist only before this hour; later the same roll is an overcast sky. */
    fogUntilHour: 9,
    /** Rain on screen and in the (soft) sound, 0–1. */
    drizzleStrength: 0.4,
    rainStrength: 0.85,
    /** Particle counts per quality level. */
    particles: { high: { rain: 1800, petals: 110 }, low: { rain: 800, petals: 45 } },
    /** Phượng/bằng lăng petals drift down in Vietnam during these hours when it's dry. */
    petalHours: [6, 18.5] as [number, number],
  },

  graphics: {
    high: { maxDpr: 2, shadowMapSize: 2048 },
    low: { maxDpr: 1.25, shadowMapSize: 1024 },
  },

  joystick: {
    /** How far (px) the knob can travel from the centre. */
    radiusPx: 40,
    /** Fraction of the radius ignored around the centre. */
    deadZone: 0.12,
  },

  ui: {
    /** How long the controls hint stays on screen (ms). */
    hintDurationMs: 8000,
    /** How long a toast message stays on screen (ms). */
    toastMs: 2600,
  },

  /** Rules shared by every WorkStation task. */
  work: {
    /** "Độ hài lòng" (satisfaction) meter, 0–100. */
    meter: { start: 50, served: 12, fastBonus: 6, wrong: 8, timeout: 15 },
    /** An order counts as "fast" (bonus + tip) if at least this share of patience is left. */
    fastThreshold: 0.5,
    /** Pause after an order is resolved before the next customer is scheduled. */
    leaveDelaySec: 0.9,
    /** Wage multiplier at 0% and 100% satisfaction. */
    payMultiplier: { min: 0.7, max: 1.1 },
  },

  /** Balancing per job. Content (actions, recipes) lives in data/tasks.ts. */
  /**
   * Family & debt (story 2.1 §1.7–1.8). Borrowing from Bố/Mẹ is always possible, but the yellow house
   * gets poorer at these debt levels (VND); repaying restores it in reverse.
   */
  family: {
    loanSizes: [1_000_000, 3_000_000, 5_000_000],
    loanMood: -5,
    /** Total debt ≥ these → house level 1, 2, 3. Level 1 = any loan at all (1.21, user's wish: one loan and the house is visibly poor). */
    debtLevels: [1, 15_000_000, 30_000_000],
    /** Mortgage of the sổ đỏ (Studium, family meeting option A). */
    mortgage: 380_000_000,
    morningGuiltMood: -3,
    repaidMood: 20,
    /** Mẹ's xôi on the table: free breakfast before this hour. */
    xoiBefore: 8,
    xoiEnergy: 10,
    /** Weekly contribution to the household (góp tiền nhà). */
    contributions: [500_000, 1_000_000],
    /** "Kèm em học": sessions with Na before Bin's mother asks for a tutor. */
    tutorNaSessions: 3,
    tutorNaMood: 5,
  },

  /**
   * Side jobs in Vietnam (story 2.1 §11.1): each at most once a day; ranks after 8 and 20 times
   * (+10 % / +20 % pay). Pay = regional minimum wage 2026 (25.500đ/h) × ~16 h per game shift.
   */
  vnJobs: {
    /**
     * TEMPORARY (1.27, user is testing the job games): every job may be done any number of times a day.
     * Set back to true to restore "once a day".
     */
    oncePerDay: false,
    rankAt: [8, 20],
    rankBonus: [0, 0.1, 0.2],
    circleK: { day: 400_000, night: 520_000, energy: 15, nightEnergy: 30, dayHours: [6, 22] as [number, number], seconds: 90, minutes: 240 },
    /**
     * Grab (1.21): a real-time ride on a top-down map of the Old Quarter, `seconds` long. Each order pays
     * fareBase + farePerEdge × the shortest way (+rainBonus when it rains), +tip for 5 stars; speed in
     * map blocks per second. min/max = what a shift usually earns (job board).
     */
    grab: { min: 300_000, max: 700_000, fuel: 40_000, energy: 20, hours: [6, 23] as [number, number], uniform: 300_000, rainBonus: 0.3, fine: 200_000, minutes: 240, seconds: 90, speed: 1.6, fareBase: 24_000, farePerEdge: 6_000, tip: 15_000 },
    /**
     * Tiệm trà sữa (1.17): a 90-second shift of the bubble-tea mini-game. Walking out early pays only
     * the share worked and counts as a strike; `maxQuits` strikes = fired for `banDays` days.
     * A full shift with satisfied customers takes one strike off again.
     */
    tea: { pay: 450_000, tip: 6_000, seconds: 90, patienceSec: 15, energy: 15, xp: 20, minutes: 180, hours: [7, 22] as [number, number], maxQuits: 3, banDays: 3 },
    tutor: { pay: 450_000, payUp: 600_000, energy: 8, hours: [18, 21] as [number, number], minutes: 120, midterm: 8, midtermBonus: 500_000 },
  },

  jobs: {
    cafeBarista: {
      durationSec: 60,
      /** Wage (VND) for a full shift at 100% multiplier 1.0 (story 2.1: 450.000đ + tips 0–60k). */
      pay: 450_000,
      tipPerFastOrder: 6_000,
      energyCost: 15,
      xp: 20,
      patienceBaseSec: 7,
      patiencePerStepSec: 2.5,
      customerGapSec: 0.8,
      /** Time a customer takes to walk from the door to the counter. */
      arriveSec: 1.0,
      /** In-game hours a full shift takes (prorated if you stop early). */
      hours: 3,
      openHour: 7,
      closeHour: 22,
    },
  },
}

export type QualityLevel = keyof typeof CONFIG.graphics
