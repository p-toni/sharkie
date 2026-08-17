export const TAU = Math.PI * 2

export const clamp = (v: number, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v)
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const smooth = (t: number) => 1 - (1 - clamp(t)) ** 3
export const easeInOutCubic = (t: number) => {
  const p = clamp(t)
  return p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2
}
export const easeOutBack = (t: number, overshoot = 1.18) => {
  const p = clamp(t) - 1
  const c1 = overshoot
  const c3 = c1 + 1
  return 1 + c3 * p ** 3 + c1 * p ** 2
}

export function loopNoise(t: number, period: number, seed = 0): number {
  const p = (t / period) * TAU
  return (
    0.55 * Math.sin(p + seed) +
    0.3 * Math.sin(2 * p + seed * 1.7 + 1.1) +
    0.15 * Math.sin(3 * p + seed * 2.3 + 2.4)
  )
}

export const r2 = (v: number) => Math.round(v * 100) / 100
export const r3 = (v: number) => Math.round(v * 1000) / 1000
