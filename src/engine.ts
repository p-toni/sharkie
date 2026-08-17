import { blend, bodyPath, type Silhouette } from './geometry'
import { clamp, easeInOutCubic, easeOutBack, lerp, loopNoise, smooth } from './math'
import { sharkSilhouette } from './profiles'

export type SharkieState = 'idle' | 'happy' | 'curious' | 'surprised' | 'chomp' | 'bounce' | 'peek' | 'dive'
export type SharkieAction = 'chomp' | 'bounce' | 'peek' | 'dive'

export interface LookTarget { x: number; y: number; mix?: number }
export interface SharkieSampleOptions {
  state?: SharkieState
  stateTime?: number
  look?: LookTarget | null
  reducedMotion?: boolean
}

export interface EyeFrame {
  x: number
  y: number
  rx: number
  ry: number
  rotation: number
}

export interface MouthFrame {
  x: number
  y: number
  width: number
  depth: number
  stroke: number
  skew: number
  open: number
  openWidth: number
  openHeight: number
  fang: number
  teeth: number
}

export interface SharkieFrame {
  bodyPath: string
  body: Silhouette
  eyeLeft: EyeFrame
  eyeRight: EyeFrame
  mouth: MouthFrame
  gillFlare: number
  gillOpacity: number
  opacity: number
}

export const ACTION_DURATIONS: Readonly<Record<SharkieAction, number>> = {
  chomp: 0.76,
  bounce: 1.02,
  peek: 1.12,
  dive: 0.92
}

const SCALE = 100

const BASE_FACE = {
  leftEye: { x: -60.7, y: -15.9, rx: 17.0, ry: 22.6, rotation: 8 },
  rightEye: { x: -15.8, y: -8.4, rx: 17.0, ry: 22.6, rotation: 8 },
  mouth: { x: -25.0, y: 19.7, width: 88.0, depth: 28.0, stroke: 9.5, skew: -1.5, open: 0, openWidth: 48, openHeight: 34, fang: 1, teeth: 0 }
} as const

function idleBody(t: number, reducedMotion: boolean): Silhouette {
  if (reducedMotion) return sharkSilhouette()
  const breath = Math.sin(t * 1.27 + 0.3) * 0.006 + Math.sin(t * 0.73 + 2.1) * 0.0035
  const bob = Math.sin(t * 0.91 + 0.45) * 0.008 + Math.sin(t * 0.47 + 1.7) * 0.003
  const lean = Math.sin(t * 0.39 + 0.8) * 0.004
  return sharkSilhouette({
    cy: bob,
    rot: lean,
    sx: 1 + breath * 0.7,
    sy: 1 - breath * 0.52
  })
}

function bodyFor(state: SharkieState, t: number, reducedMotion: boolean): { body: Silhouette; opacity: number } {
  const base = idleBody(t, reducedMotion)
  if (reducedMotion) {
    if (state === 'dive') return { body: sharkSilhouette({ cy: 0.18 }), opacity: 0.25 }
    if (state === 'peek') return { body: sharkSilhouette({ cy: 0.08 }), opacity: 1 }
    return { body: sharkSilhouette({ rot: state === 'curious' ? -0.028 : 0 }), opacity: 1 }
  }

  if (state === 'happy') {
    return { body: sharkSilhouette({ cy: base.cy - 0.008, rot: base.rot, sx: base.sx * 1.008, sy: base.sy * 0.994 }), opacity: 1 }
  }

  if (state === 'curious') {
    return { body: sharkSilhouette({ cy: base.cy - 0.014, rot: -0.042 + base.rot * 0.3, sx: 1.008, sy: 0.998 }), opacity: 1 }
  }

  if (state === 'surprised') {
    return { body: sharkSilhouette({ cy: base.cy - 0.01, sx: 0.992, sy: 1.02 }), opacity: 1 }
  }

  if (state === 'chomp') {
    const u = clamp(t / ACTION_DURATIONS.chomp)
    const pulse = Math.sin(Math.PI * u) ** 1.08
    const anticipation = u < 0.16 ? Math.sin((u / 0.16) * Math.PI) : 0
    return {
      body: sharkSilhouette({
        cy: base.cy + anticipation * 0.012 - pulse * 0.012,
        sx: 1 - anticipation * 0.018 + pulse * 0.032,
        sy: 1 + anticipation * 0.018 - pulse * 0.024
      }),
      opacity: 1
    }
  }

  if (state === 'bounce') {
    const u = clamp(t / ACTION_DURATIONS.bounce)
    let cy = 0
    let sx = 1
    let sy = 1
    if (u < 0.14) {
      const p = smooth(u / 0.14)
      cy = 0.025 * p
      sx = 1 + 0.07 * p
      sy = 1 - 0.075 * p
    } else if (u < 0.48) {
      const p = smooth((u - 0.14) / 0.34)
      cy = lerp(0.025, -0.34, p)
      sx = lerp(1.07, 0.974, p)
      sy = lerp(0.925, 1.045, p)
    } else if (u < 0.77) {
      const p = easeInOutCubic((u - 0.48) / 0.29)
      cy = lerp(-0.34, 0, p)
      sx = lerp(0.974, 1.01, p)
      sy = lerp(1.045, 0.99, p)
    } else if (u < 0.9) {
      const p = Math.sin(((u - 0.77) / 0.13) * Math.PI)
      cy = 0.018 * p
      sx = 1 + 0.055 * p
      sy = 1 - 0.058 * p
    }
    return { body: sharkSilhouette({ cy, sx, sy }), opacity: 1 }
  }

  if (state === 'peek') {
    const u = clamp(t / 0.72)
    const p = easeOutBack(u, 0.72)
    const cy = lerp(1.02, 0.1, p)
    const squash = Math.sin(Math.PI * clamp((u - 0.08) / 0.72)) * 0.035
    return {
      body: sharkSilhouette({ cy, sx: 1 + squash, sy: 1 - squash * 0.8 }),
      opacity: smooth(clamp(t / 0.22))
    }
  }

  if (state === 'dive') {
    const u = clamp(t / 0.78)
    const anticipation = u < 0.2 ? Math.sin((u / 0.2) * Math.PI) : 0
    const fall = smooth(clamp((u - 0.12) / 0.88))
    return {
      body: sharkSilhouette({
        cy: -anticipation * 0.045 + fall * 1.18,
        sx: 1 - anticipation * 0.025 + fall * 0.035,
        sy: 1 + anticipation * 0.035 - fall * 0.08
      }),
      opacity: 1 - smooth(clamp((u - 0.52) / 0.42))
    }
  }

  return { body: base, opacity: 1 }
}

function blinkOpen(t: number, reducedMotion: boolean): number {
  if (reducedMotion) return 1
  const period = 29.4
  const local = ((t % period) + period) % period
  const events = [3.2, 8.15, 12.0, 15.4, 20.75, 21.02, 24.85, 28.35]
  let open = 1
  for (const at of events) {
    const d = Math.abs(local - at)
    if (d < 0.105) {
      const p = d / 0.105
      open = Math.min(open, 0.085 + 0.915 * p ** 1.7)
    }
  }
  return open
}

function eyeMood(state: SharkieState, pulse: number) {
  switch (state) {
    case 'happy': return { leftOpen: 0.82, rightOpen: 0.82, leftRx: 1, rightRx: 1, dy: 1.2 }
    case 'curious': return { leftOpen: 1.05, rightOpen: 0.96, leftRx: 0.98, rightRx: 1.02, dy: -1.4 }
    case 'surprised': return { leftOpen: 1.12, rightOpen: 1.12, leftRx: 1.06, rightRx: 1.06, dy: -1.2 }
    case 'chomp': return { leftOpen: 1 - pulse * 0.08, rightOpen: 1 - pulse * 0.08, leftRx: 1, rightRx: 1, dy: pulse * 1.1 }
    default: return { leftOpen: 1, rightOpen: 1, leftRx: 1, rightRx: 1, dy: 0 }
  }
}

function mouthFor(state: SharkieState, pulse: number): MouthFrame {
  const base = { ...BASE_FACE.mouth }
  if (state === 'happy') return { ...base, y: 17.5, width: 94, depth: 34.5, skew: -2.8, fang: 0.82 }
  if (state === 'curious') return { ...base, x: -28, y: 21.5, width: 72, depth: 18.5, skew: -4.5, fang: 0.75 }

  // Open-mouth poses should preserve the neutral face's optical center. The
  // renderer positions the open ellipse at `y + 11`, so these baselines are
  // intentionally higher than the closed-smile baseline rather than dropping
  // the mouth toward the lower edge of the blob.
  if (state === 'surprised') return { ...base, x: -25, y: 18, open: 1, openWidth: 24, openHeight: 31, fang: 0, teeth: 0 }
  if (state === 'chomp') {
    const open = clamp((pulse - 0.08) / 0.92)
    return { ...base, y: 16.5, open, openWidth: 48 + 9 * open, openHeight: 32 + 11 * open, depth: 24, fang: 1 - open, teeth: open }
  }
  return base
}

export function sampleSharkie(t: number, options: SharkieSampleOptions = {}): SharkieFrame {
  const state = options.state ?? 'idle'
  const stateTime = Math.max(0, options.stateTime ?? t)
  const reducedMotion = options.reducedMotion ?? false
  const { body, opacity } = bodyFor(state, stateTime, reducedMotion)

  const actionPulse = state === 'chomp'
    ? Math.sin(Math.PI * clamp(stateTime / ACTION_DURATIONS.chomp)) ** 1.08
    : 0

  const wanderX = reducedMotion ? 0 : loopNoise(t, 7.6, 0.4) * 2.7 + loopNoise(t, 13.2, 2.2) * 1.0
  const wanderY = reducedMotion ? 0 : loopNoise(t, 9.4, 1.9) * 1.75
  const stateBiasX = state === 'curious' ? -1.6 : state === 'happy' ? 0.5 : 0
  const stateBiasY = state === 'curious' ? -1.5 : state === 'surprised' ? -0.4 : 0
  const lookMix = clamp(options.look?.mix ?? (options.look ? 1 : 0))
  const externalX = clamp(options.look?.x ?? 0, -1, 1) * 7.2
  const externalY = clamp(options.look?.y ?? 0, -1, 1) * 5.2
  const lookX = lerp(wanderX + stateBiasX, externalX, lookMix)
  const lookY = lerp(wanderY + stateBiasY, externalY, lookMix)

  const blink = blinkOpen(t, reducedMotion)
  const mood = eyeMood(state, actionPulse)
  const left = BASE_FACE.leftEye
  const right = BASE_FACE.rightEye

  return {
    bodyPath: bodyPath(body, SCALE),
    body,
    eyeLeft: {
      x: left.x + lookX,
      y: left.y + lookY + mood.dy,
      rx: left.rx * mood.leftRx,
      ry: Math.max(1.8, left.ry * mood.leftOpen * blink),
      rotation: left.rotation + (state === 'curious' ? -2.5 : 0)
    },
    eyeRight: {
      x: right.x + lookX,
      y: right.y + lookY + mood.dy,
      rx: right.rx * mood.rightRx,
      ry: Math.max(1.8, right.ry * mood.rightOpen * blink),
      rotation: right.rotation + (state === 'curious' ? 1.5 : 0)
    },
    mouth: mouthFor(state, actionPulse),
    gillFlare: state === 'chomp' ? actionPulse * 2.4 : state === 'surprised' ? 1.2 : 0,
    gillOpacity: state === 'dive' ? opacity : 1,
    opacity
  }
}

function blendEye(a: EyeFrame, b: EyeFrame, t: number): EyeFrame {
  return {
    x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), rx: lerp(a.rx, b.rx, t), ry: lerp(a.ry, b.ry, t), rotation: lerp(a.rotation, b.rotation, t)
  }
}

function blendMouth(a: MouthFrame, b: MouthFrame, t: number): MouthFrame {
  return {
    x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), width: lerp(a.width, b.width, t), depth: lerp(a.depth, b.depth, t),
    stroke: lerp(a.stroke, b.stroke, t), skew: lerp(a.skew, b.skew, t), open: lerp(a.open, b.open, t),
    openWidth: lerp(a.openWidth, b.openWidth, t), openHeight: lerp(a.openHeight, b.openHeight, t), fang: lerp(a.fang, b.fang, t), teeth: lerp(a.teeth, b.teeth, t)
  }
}

export function blendSharkieFrames(a: SharkieFrame, b: SharkieFrame, t: number): SharkieFrame {
  const p = clamp(t)
  const body = blend(a.body, b.body, p)
  return {
    body,
    bodyPath: bodyPath(body, SCALE),
    eyeLeft: blendEye(a.eyeLeft, b.eyeLeft, p),
    eyeRight: blendEye(a.eyeRight, b.eyeRight, p),
    mouth: blendMouth(a.mouth, b.mouth, p),
    gillFlare: lerp(a.gillFlare, b.gillFlare, p),
    gillOpacity: lerp(a.gillOpacity, b.gillOpacity, p),
    opacity: lerp(a.opacity, b.opacity, p)
  }
}