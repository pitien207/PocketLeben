/**
 * Title-screen ambience, all synthesised (no files): a Hà Nội morning outside the window —
 * street murmur, birds, motorbikes passing (in sync with the 3D scene), a far-off horn,
 * and the fan humming. Adapted from the user's start-menu design (which had night rain).
 */

import { canPlayMusicFiles, MUSIC } from '../game/systems/musicTracks'

type Ctx = AudioContext

export function createTitleAudio(volume = 0.8) {
  let ctx: Ctx | null = null
  let master: GainNode | null = null
  let started = false
  let muted = false
  let white: AudioBuffer | null = null
  let brown: AudioBuffer | null = null
  let fanGain: GainNode | null = null
  let music: HTMLAudioElement | null = null
  const timers: number[] = []

  function noise(c: Ctx, seconds: number, kind: 'white' | 'brown') {
    const len = c.sampleRate * seconds
    const buf = c.createBuffer(2, len, c.sampleRate)
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch)
      let last = 0
      for (let i = 0; i < len; i++) {
        const r = Math.random() * 2 - 1
        if (kind === 'brown') {
          last = (last + 0.02 * r) / 1.02
          data[i] = last * 3.5
        } else data[i] = r
      }
    }
    return buf
  }
  const loop = (c: Ctx, buf: AudioBuffer) => {
    const s = c.createBufferSource()
    s.buffer = buf
    s.loop = true
    s.start(0, Math.random() * buf.duration)
    return s
  }
  const chain = (...nodes: AudioNode[]) => {
    for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1])
    return nodes[nodes.length - 1]
  }
  const filter = (c: Ctx, type: BiquadFilterType, freq: number, q = 0.7) => {
    const f = c.createBiquadFilter()
    f.type = type
    f.frequency.value = freq
    f.Q.value = q
    return f
  }
  const gain = (c: Ctx, v: number) => {
    const g = c.createGain()
    g.gain.value = v
    return g
  }
  /** Run `fn` again and again, every min…max seconds. */
  const every = (min: number, max: number, fn: () => void) => {
    const next = () => {
      fn()
      timers.push(window.setTimeout(next, (min + Math.random() * (max - min)) * 1000))
    }
    timers.push(window.setTimeout(next, (min + Math.random() * (max - min)) * 1000))
  }

  /** One little bird phrase: 2–6 quick chirps that glide up or down. */
  function bird(c: Ctx, out: AudioNode) {
    const t0 = c.currentTime
    const pan = c.createStereoPanner()
    pan.pan.value = Math.random() * 1.6 - 0.8
    const far = Math.random() < 0.5
    const level = far ? 0.006 : 0.013
    pan.connect(out)
    const notes = 2 + Math.floor(Math.random() * 5)
    const base = 2600 + Math.random() * 1800
    const up = Math.random() < 0.5
    let t = t0
    for (let i = 0; i < notes; i++) {
      const o = c.createOscillator()
      o.type = 'sine'
      const f0 = base * (0.9 + Math.random() * 0.25)
      o.frequency.setValueAtTime(up ? f0 * 0.8 : f0 * 1.25, t)
      o.frequency.exponentialRampToValueAtTime(up ? f0 * 1.3 : f0 * 0.75, t + 0.07)
      const g = gain(c, 0)
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(level, t + 0.01)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09)
      chain(o, g, pan)
      o.start(t)
      o.stop(t + 0.12)
      t += 0.09 + Math.random() * 0.08
    }
  }

  function horn(c: Ctx, out: AudioNode, { distant = false, pan = 0, when = 0 } = {}) {
    const t0 = c.currentTime + when
    const p = c.createStereoPanner()
    p.pan.value = pan
    const lp = filter(c, 'lowpass', distant ? 1100 : 2400)
    const g = gain(c, 0)
    chain(g, lp, p, out)
    const beeps = distant ? (Math.random() < 0.5 ? [[0, 0.22]] : [[0, 0.12], [0.18, 0.3]]) : [[0, 0.11], [0.17, 0.36]]
    const level = distant ? 0.01 : 0.022
    for (const f of [415, 520]) {
      const o = c.createOscillator()
      o.type = 'square'
      o.frequency.value = f * (distant ? 0.97 : 1)
      o.connect(g)
      o.start(t0)
      o.stop(t0 + 0.5)
    }
    for (const [a, b] of beeps) {
      g.gain.setValueAtTime(0, t0 + a)
      g.gain.linearRampToValueAtTime(level, t0 + a + 0.01)
      g.gain.setValueAtTime(level, t0 + b - 0.02)
      g.gain.linearRampToValueAtTime(0, t0 + b)
    }
  }

  /** A motorbike passing left → right (Doppler-ish pitch drop, engine buzz, tyre noise). */
  function bikePass({ duration = 2.6, horn: honk = false } = {}) {
    if (!started || !ctx || !master || !white || !brown) return
    const c = ctx
    const t0 = c.currentTime
    const len = duration + 0.8
    const rpm = 62 + Math.random() * 18
    const pan = c.createStereoPanner()
    pan.pan.setValueAtTime(-0.95, t0)
    pan.pan.linearRampToValueAtTime(0.95, t0 + len)
    const env = gain(c, 0)
    env.gain.setValueAtTime(0.0001, t0)
    env.gain.exponentialRampToValueAtTime(0.09, t0 + len * 0.5)
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + len)
    chain(env, filter(c, 'lowpass', 800), pan, master)
    const engine = gain(c, 0.6)
    const putt = c.createOscillator()
    putt.type = 'square'
    putt.frequency.value = rpm / 2
    putt.connect(gain(c, 0.4)).connect(engine.gain)
    engine.connect(env)
    const oscs = (
      [
        ['sawtooth', 1, 0.5],
        ['square', 2.01, 0.25],
        ['sawtooth', 3.02, 0.12],
      ] as const
    ).map(([type, k, v]) => {
      const o = c.createOscillator()
      o.type = type
      o.frequency.setValueAtTime(rpm * k * 1.07, t0)
      o.frequency.setValueAtTime(rpm * k * 1.07, t0 + len * 0.4)
      o.frequency.linearRampToValueAtTime(rpm * k * 0.93, t0 + len * 0.6)
      o.connect(gain(c, v)).connect(engine)
      return o
    })
    const rumble = c.createBufferSource()
    rumble.buffer = brown
    chain(rumble, filter(c, 'lowpass', 400), gain(c, 0.5), env)
    const tyres = c.createBufferSource()
    tyres.buffer = white
    chain(tyres, filter(c, 'bandpass', 1800, 0.8), gain(c, 0.05), env)
    for (const o of [...oscs, putt]) {
      o.start(t0)
      o.stop(t0 + len + 0.1)
    }
    rumble.start(t0, Math.random() * 2)
    rumble.stop(t0 + len + 0.1)
    tyres.start(t0, Math.random() * 2)
    tyres.stop(t0 + len + 0.1)
    if (honk && Math.random() < 0.45) horn(c, master, { distant: true, pan: -0.3, when: len * 0.35 })
  }

  function start() {
    if (started) {
      void ctx?.resume()
      return
    }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    const c = new AC()
    ctx = c
    master = gain(c, 0)
    const comp = c.createDynamicsCompressor()
    comp.threshold.value = -18
    comp.ratio.value = 3
    master.connect(comp).connect(c.destination)
    white = noise(c, 4, 'white')
    brown = noise(c, 6, 'brown')
    // Street murmur (low traffic rumble) + a soft airy layer (breeze, far voices).
    chain(loop(c, brown), filter(c, 'lowpass', 180), gain(c, 0.055), master)
    chain(loop(c, white), filter(c, 'bandpass', 900, 0.4), filter(c, 'lowpass', 1600), gain(c, 0.0035), master)
    // Fan hum + whoosh (follows the fan's direction).
    const hum = c.createOscillator()
    hum.type = 'triangle'
    hum.frequency.value = 100
    chain(hum, filter(c, 'lowpass', 300), gain(c, 0.003), master)
    hum.start()
    fanGain = gain(c, 0.006)
    chain(loop(c, white), filter(c, 'bandpass', 520, 0.6), fanGain, master)
    // The day track ("Đi Đức — ngày nắng") under it all.
    if (canPlayMusicFiles()) {
      music = new Audio(MUSIC.day)
      music.loop = true
      chain(c.createMediaElementSource(music), gain(c, 0.55), master)
      void music.play().catch(() => {})
    }
    // Birds, a far-off horn now and then.
    every(1.2, 4.5, () => bird(c, master!))
    every(10, 24, () => horn(c, master!, { distant: true, pan: Math.random() * 1.6 - 0.8 }))
    started = true
    master.gain.setValueAtTime(0, c.currentTime)
    master.gain.linearRampToValueAtTime(muted ? 0 : volume, c.currentTime + 2)
  }

  function setMuted(m: boolean) {
    muted = m
    if (ctx && master) {
      master.gain.cancelScheduledValues(ctx.currentTime)
      master.gain.setTargetAtTime(m ? 0 : volume, ctx.currentTime, 0.2)
    }
  }

  function setFan(w: number) {
    if (ctx && fanGain) fanGain.gain.setTargetAtTime(0.003 + w * 0.006, ctx.currentTime, 0.4)
  }

  function stop() {
    for (const t of timers) window.clearTimeout(t)
    timers.length = 0
    if (ctx && master) {
      const c = ctx
      const m = music
      master.gain.setTargetAtTime(0, c.currentTime, 0.3)
      window.setTimeout(() => {
        m?.pause()
        void c.close()
      }, 1200)
    }
    music = null
    ctx = null
    master = null
    started = false
  }

  return {
    start,
    stop,
    setMuted,
    setFan,
    bikePass,
    get started() {
      return started
    },
    get muted() {
      return muted
    },
  }
}
