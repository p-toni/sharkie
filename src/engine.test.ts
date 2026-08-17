import { describe, expect, it } from 'vitest'
import { ACTION_DURATIONS, blendSharkieFrames, sampleSharkie, type SharkieState } from './engine'
import { PROFILE_SAMPLES } from './geometry'

describe('sampleSharkie', () => {
  it('is deterministic for equal inputs', () => {
    const options = { state: 'curious' as const, stateTime: 0.42, look: { x: 0.3, y: -0.2, mix: 0.8 } }
    expect(sampleSharkie(1.25, options)).toEqual(sampleSharkie(1.25, options))
  })

  it('keeps the higher-fidelity fixed radial profile', () => {
    const frame = sampleSharkie(0, { state: 'idle' })
    expect(PROFILE_SAMPLES).toBe(128)
    expect(frame.body.radii).toHaveLength(128)
    expect(frame.bodyPath.startsWith('M')).toBe(true)
    expect(frame.bodyPath.endsWith('Z')).toBe(true)
  })

  it('preserves the accepted neutral face proportions', () => {
    const frame = sampleSharkie(0, { state: 'idle', reducedMotion: true })
    expect(frame.eyeLeft.x).toBeCloseTo(-60.7, 1)
    expect(frame.eyeRight.x).toBeCloseTo(-15.8, 1)
    expect(frame.eyeLeft.ry).toBeCloseTo(22.6, 1)
    expect(frame.mouth.width).toBeCloseTo(88, 1)
    expect(frame.mouth.fang).toBe(1)
  })

  it('keeps open-mouth poses centered in the face instead of dropping toward the jaw', () => {
    const surprised = sampleSharkie(0, { state: 'surprised', reducedMotion: true })
    const chomp = sampleSharkie(0.38, { state: 'chomp', stateTime: 0.38, reducedMotion: true })

    // The SVG renderer places an open ellipse at mouth.y + 11.
    // These are optical centers, chosen to stay aligned with the neutral smile.
    expect(surprised.mouth.y + 11).toBeCloseTo(29, 1)
    expect(chomp.mouth.y + 11).toBeCloseTo(27.5, 1)
    expect(surprised.mouth.y + 11).toBeLessThan(35)
    expect(chomp.mouth.y + 11).toBeLessThan(35)
  })

  it('moves gaze toward an external target without changing eye size', () => {
    const left = sampleSharkie(0, { reducedMotion: true, look: { x: -1, y: 0, mix: 1 } })
    const right = sampleSharkie(0, { reducedMotion: true, look: { x: 1, y: 0, mix: 1 } })
    expect(left.eyeLeft.x).toBeLessThan(right.eyeLeft.x)
    expect(left.eyeLeft.rx).toBe(right.eyeLeft.rx)
  })

  it('removes ambient body motion when reduced motion is enabled', () => {
    const a = sampleSharkie(0, { state: 'idle', reducedMotion: true })
    const b = sampleSharkie(9.3, { state: 'idle', reducedMotion: true })
    expect(a.body).toEqual(b.body)
  })

  it('settles a bounce back to the base silhouette', () => {
    const end = sampleSharkie(20, { state: 'bounce', stateTime: ACTION_DURATIONS.bounce })
    expect(end.body.cy).toBeCloseTo(0, 4)
    expect(end.body.sx).toBeCloseTo(1, 4)
    expect(end.body.sy).toBeCloseTo(1, 4)
  })

  it('blends interrupted state transitions numerically and keeps a valid path', () => {
    const a = sampleSharkie(0, { state: 'idle', reducedMotion: true })
    const b = sampleSharkie(0, { state: 'curious', reducedMotion: true })
    const mid = blendSharkieFrames(a, b, 0.5)
    expect(mid.body.rot).toBeLessThan(0)
    expect(mid.body.rot).toBeGreaterThan(b.body.rot)
    expect(mid.bodyPath.startsWith('M')).toBe(true)
  })

  it('returns finite geometry for every state', () => {
    const states: SharkieState[] = ['idle', 'happy', 'curious', 'surprised', 'chomp', 'bounce', 'peek', 'dive']
    for (const state of states) {
      const frame = sampleSharkie(2.7, { state, stateTime: 0.37, look: { x: 0.5, y: -0.4, mix: 0.7 } })
      const values = [
        frame.body.cx, frame.body.cy, frame.body.sx, frame.body.sy, frame.body.rot,
        frame.eyeLeft.x, frame.eyeLeft.y, frame.eyeLeft.rx, frame.eyeLeft.ry,
        frame.eyeRight.x, frame.eyeRight.y, frame.mouth.x, frame.mouth.y,
        frame.mouth.width, frame.mouth.depth, frame.opacity
      ]
      expect(values.every(Number.isFinite)).toBe(true)
    }
  })
})
