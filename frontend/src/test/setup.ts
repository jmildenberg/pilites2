import '@testing-library/jest-dom'
import { vi } from 'vitest'

// jsdom does not implement the Canvas API
const mockCtx = {
  scale: vi.fn(),
  fillRect: vi.fn(),
  fillStyle: '',
}

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: vi.fn().mockReturnValue(mockCtx),
  configurable: true,
})
