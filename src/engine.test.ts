import { describe, expect, it } from 'vitest'
import { sampleSharkie } from './engine'

describe('sampleSharkie', () => {
  it('is deterministic for equal inputs', () => {
    const a = sampleSharkie(1.25, { state: 'idle', look: { x: 0.3, y: -0.2 } })
    const b = sampleSharkie(1.25, { state: 'idle', look: { x: 0.3, y: -0.2 } })
    expect(a).toEqual(b)
  })

  it('keeps a stable 64-sample body profile', () => {
    const frame = sampleSharkie(0, { state: 'idle' })
    expect(frame.body.radii).toHaveLength(64)
    expect(frame.bodyPath.startsWith('M')).toBe(true)
    expect(frame.bodyPath.endsWith('Z')).toBe(true)
  })

  it('moves gaze toward an external target', () => {
    const left = sampleSharkie(0, { look: { x: -1, y: 0, mix: 1 } })
    const right = sampleSharkie(0, { look: { x: 1, y: 0, mix: 1 } })
    expect(left.eyeLeft.x).toBeLessThan(right.eyeLeft.x)
  })
})
