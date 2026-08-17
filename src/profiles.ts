import { profileFromPolygon, type Silhouette } from './geometry'

// Original Sharkie geometry. No x.ai/Bloub measured avatar profiles are included.
const SHARK_POLY = [
  { x: 1.14, y: 0.18 },
  { x: 0.96, y: 0.58 },
  { x: 0.54, y: 0.78 },
  { x: -0.18, y: 0.82 },
  { x: -0.82, y: 0.64 },
  { x: -1.14, y: 0.28 },
  { x: -1.18, y: -0.08 },
  { x: -1.02, y: -0.42 },
  { x: -0.64, y: -0.64 },
  { x: -0.18, y: -0.72 },
  { x: 0.18, y: -0.68 },
  { x: 0.38, y: -1.06 },
  { x: 0.62, y: -0.72 },
  { x: 0.90, y: -0.52 },
  { x: 1.12, y: -0.22 }
]

const base = profileFromPolygon(SHARK_POLY)

export function sharkSilhouette(pose: Partial<Omit<Silhouette, 'radii'>> = {}): Silhouette {
  return { radii: [...base], rot: 0, cx: 0, cy: 0, sx: 1, sy: 1, ...pose }
}
