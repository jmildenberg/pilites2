import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LedStrip } from './LedStrip'

describe('LedStrip', () => {
  it('renders a canvas element', () => {
    const { container } = render(<LedStrip pixels={['#ff0000', '#00ff00', '#0000ff']} />)
    expect(container.querySelector('canvas')).toBeInTheDocument()
  })

  it('renders without crashing for an empty pixel array', () => {
    const { container } = render(<LedStrip pixels={[]} />)
    expect(container.querySelector('canvas')).toBeInTheDocument()
  })

  it('wraps the canvas in a full-width container div', () => {
    const { container } = render(<LedStrip pixels={['#ffffff']} />)
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.style.width).toBe('100%')
  })

  it('applies the led-strip-canvas class to the canvas', () => {
    const { container } = render(<LedStrip pixels={['#ffffff']} />)
    expect(container.querySelector('canvas.led-strip-canvas')).toBeInTheDocument()
  })

  it('accepts a custom height prop', () => {
    const { container } = render(<LedStrip pixels={['#ffffff']} height={48} />)
    const canvas = container.querySelector('canvas')!
    expect(canvas.style.height).toBe('48px')
  })
})
