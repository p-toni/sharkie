import { blend, closedPath, toPoints, type Silhouette } from './geometry'
import { clamp, loopNoise, smooth } from './math'
import { sharkSilhouette } from './profiles'

export type SharkieState = 'idle' | 'happy' | 'curious' | 'chomp' | 'bounce' | 'peek' | 'dive'

export interface LookTarget { x: number; y: number; mix?: number }
export interface SharkieSampleOptions {
  state?: SharkieState
  stateTime?: number
  look?: LookTarget | null
  reducedMotion?: boolean
}

export interface SharkieFrame {
  bodyPath: string
  body: Silhouette
  eyeLeft: { x: number; y: number; rx: number; ry: number }
  eyeRight: { x: number; y: number; rx: number; ry: number }
  mouth: { kind: 'smile' | 'open' | 'tiny'; path?: string; cx?: number; cy?: number; rx?: number; ry?: number }
  teeth: boolean
  gillShift: number
  opacity: number
  translateY: number
  rotation: number
}

const SCALE = 100

function bodyFor(state: SharkieState, t: number, reducedMotion: boolean): Silhouette {
  const idleBob = reducedMotion ? 0 : Math.sin(t * 1.55) * 0.018
  const breathe = reducedMotion ? 0 : Math.sin(t * 1.15) * 0.018
  const base = sharkSilhouette({ cy: idleBob, sx: 1 + breathe * 0.45, sy: 1 - breathe * 0.32 })

  if (state === 'bounce') {
    const phase = (t % 0.9) / 0.9
    const jump = Math.sin(Math.PI * phase)
    const squash = Math.sin(Math.PI * Math.min(1, phase * 2))
    return sharkSilhouette({ cy: -jump * 0.28, sx: 1 + squash * 0.08, sy: 1 - squash * 0.1 })
  }
  if (state === 'peek') {
    const p = smooth(clamp(t / 0.55))
    return sharkSilhouette({ cy: 0.92 - p * 0.72, sx: 0.96, sy: 0.96 })
  }
  if (state === 'dive') {
    const p = smooth(clamp(t / 0.65))
    return sharkSilhouette({ cy: p * 1.15, sx: 1 + p * 0.05, sy: 1 - p * 0.08 })
  }
  if (state === 'chomp') {
    const pulse = Math.sin(Math.min(1, t / 0.55) * Math.PI)
    return blend(base, sharkSilhouette({ sx: 1.035, sy: 0.965 }), pulse * 0.65)
  }
  if (state === 'curious') return sharkSilhouette({ rot: -0.055, cy: idleBob - 0.01 })
  if (state === 'happy') return sharkSilhouette({ cy: idleBob - 0.015, sx: 1.01, sy: 0.99 })
  return base
}

export function sampleSharkie(t: number, options: SharkieSampleOptions = {}): SharkieFrame {
  const state = options.state ?? 'idle'
  const stateTime = Math.max(0, options.stateTime ?? t)
  const body = bodyFor(state, stateTime, options.reducedMotion ?? false)
  const bodyPath = closedPath(toPoints(body, SCALE))

  const wanderX = options.reducedMotion ? 0 : loopNoise(t, 7.2, 0.4) * 0.09
  const wanderY = options.reducedMotion ? 0 : loopNoise(t, 8.7, 1.9) * 0.055
  const lookMix = clamp(options.look?.mix ?? (options.look ? 1 : 0))
  const lookX = wanderX * (1 - lookMix) + clamp(options.look?.x ?? 0, -1, 1) * 0.12 * lookMix
  const lookY = wanderY * (1 - lookMix) + clamp(options.look?.y ?? 0, -1, 1) * 0.08 * lookMix

  const blinkCycle = t % 4.7
  const blink = blinkCycle > 4.5 ? Math.max(0.08, Math.abs(blinkCycle - 4.6) / 0.1) : 1
  const eyeRy = 18 * blink
  const curiousLift = state === 'curious' ? -4 : 0

  const chompPhase = state === 'chomp' ? Math.sin(Math.min(1, stateTime / 0.55) * Math.PI) : 0
  const isOpen = chompPhase > 0.3
  const happy = state === 'happy'

  return {
    bodyPath,
    body,
    eyeLeft: { x: -29 + lookX * 48, y: -18 + lookY * 42 + curiousLift, rx: 12.5, ry: eyeRy },
    eyeRight: { x: 4 + lookX * 48, y: -17 + lookY * 42 + curiousLift, rx: 12.5, ry: eyeRy },
    mouth: isOpen
      ? { kind: 'open', cx: -5, cy: 23, rx: 25, ry: 16 + chompPhase * 5 }
      : { kind: happy ? 'smile' : 'tiny', path: happy ? 'M-34 18 Q-7 42 24 18' : 'M-22 23 Q-7 33 9 23' },
    teeth: isOpen,
    gillShift: lookX * 9,
    opacity: state === 'dive' ? 1 - smooth(clamp((stateTime - 0.35) / 0.3)) : 1,
    translateY: 0,
    rotation: state === 'curious' ? -3 : 0
  }
}
