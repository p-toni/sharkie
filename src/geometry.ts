import { TAU, lerp, r2 } from './math'

export const PROFILE_SAMPLES = 64
const ANGLES = Array.from({ length: PROFILE_SAMPLES }, (_, i) => (i / PROFILE_SAMPLES) * TAU)
const COS = ANGLES.map(Math.cos)
const SIN = ANGLES.map(Math.sin)

export interface Point { x: number; y: number }
export interface Silhouette {
  radii: number[]
  rot: number
  cx: number
  cy: number
  sx: number
  sy: number
}

export function profileFromPolygon(poly: Point[], cx = 0, cy = 0): number[] {
  const radii = new Array<number>(PROFILE_SAMPLES).fill(0)
  for (let k = 0; k < PROFILE_SAMPLES; k++) {
    const dx = COS[k] ?? 0
    const dy = SIN[k] ?? 0
    let best = 0
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i]!
      const b = poly[(i + 1) % poly.length]!
      const ex = b.x - a.x
      const ey = b.y - a.y
      const den = dx * ey - dy * ex
      if (Math.abs(den) < 1e-9) continue
      const px = a.x - cx
      const py = a.y - cy
      const t = (px * ey - py * ex) / den
      const u = (px * dy - py * dx) / den
      if (t > best && u >= 0 && u <= 1) best = t
    }
    radii[k] = best
  }
  return radii
}

export function blend(a: Silhouette, b: Silhouette, t: number): Silhouette {
  const radii = new Array<number>(PROFILE_SAMPLES)
  for (let i = 0; i < PROFILE_SAMPLES; i++) radii[i] = lerp(a.radii[i] ?? 1, b.radii[i] ?? 1, t)
  let dRot = b.rot - a.rot
  while (dRot > Math.PI) dRot -= TAU
  while (dRot < -Math.PI) dRot += TAU
  return {
    radii,
    rot: a.rot + dRot * t,
    cx: lerp(a.cx, b.cx, t),
    cy: lerp(a.cy, b.cy, t),
    sx: lerp(a.sx, b.sx, t),
    sy: lerp(a.sy, b.sy, t)
  }
}

export function toPoints(s: Silhouette, scale: number): Point[] {
  const cr = Math.cos(s.rot)
  const sr = Math.sin(s.rot)
  return s.radii.map((r, i) => {
    const x = r * (COS[i] ?? 0)
    const y = r * (SIN[i] ?? 0)
    const rx = x * cr - y * sr
    const ry = x * sr + y * cr
    return { x: (rx * s.sx + s.cx) * scale, y: (ry * s.sy + s.cy) * scale }
  })
}

export function closedPath(pts: Point[], tension = 1 / 6): string {
  if (pts.length < 3) return ''
  const first = pts[0]!
  let d = `M${r2(first.x)} ${r2(first.y)}`
  for (let i = 0; i < pts.length; i++) {
    const n = pts.length
    const p0 = pts[(i - 1 + n) % n]!
    const p1 = pts[i]!
    const p2 = pts[(i + 1) % n]!
    const p3 = pts[(i + 2) % n]!
    const c1x = p1.x + (p2.x - p0.x) * tension
    const c1y = p1.y + (p2.y - p0.y) * tension
    const c2x = p2.x - (p3.x - p1.x) * tension
    const c2y = p2.y - (p3.y - p1.y) * tension
    d += `C${r2(c1x)} ${r2(c1y)} ${r2(c2x)} ${r2(c2y)} ${r2(p2.x)} ${r2(p2.y)}`
  }
  return `${d}Z`
}
