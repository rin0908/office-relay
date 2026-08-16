import { describe, expect, it } from 'vitest'
import { getTargetDimensions } from './photo-compression'

describe('getTargetDimensions', () => {
  it('downscales a landscape image by its long edge', () => {
    expect(getTargetDimensions(4000, 3000)).toEqual({ width: 1600, height: 1200 })
  })

  it('downscales a portrait image by its long edge', () => {
    expect(getTargetDimensions(3000, 4000)).toEqual({ width: 1200, height: 1600 })
  })

  it('leaves an already-small image unchanged', () => {
    expect(getTargetDimensions(1200, 800)).toEqual({ width: 1200, height: 800 })
  })

  it('handles a square image', () => {
    expect(getTargetDimensions(3000, 3000)).toEqual({ width: 1600, height: 1600 })
  })
})
