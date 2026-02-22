import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { EffectForm } from './EffectForm'
import { EFFECT_DEFS, getDefaultParams } from '../effects'

describe('EffectForm', () => {
  it('renders the effect type dropdown', () => {
    render(
      <EffectForm
        effectType="static_color"
        params={getDefaultParams('static_color')}
        onTypeChange={vi.fn()}
        onParamChange={vi.fn()}
      />,
    )
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('shows all effect types in the dropdown', () => {
    render(
      <EffectForm
        effectType="static_color"
        params={getDefaultParams('static_color')}
        onTypeChange={vi.fn()}
        onParamChange={vi.fn()}
      />,
    )
    for (const def of EFFECT_DEFS) {
      expect(screen.getByRole('option', { name: def.label })).toBeInTheDocument()
    }
  })

  it('calls onTypeChange with new type when dropdown changes', () => {
    const onTypeChange = vi.fn()
    render(
      <EffectForm
        effectType="static_color"
        params={getDefaultParams('static_color')}
        onTypeChange={onTypeChange}
        onParamChange={vi.fn()}
      />,
    )
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'fade_in' } })
    expect(onTypeChange).toHaveBeenCalledWith('fade_in')
  })

  it('calls onParamChange with defaults when type changes', () => {
    const onParamChange = vi.fn()
    render(
      <EffectForm
        effectType="static_color"
        params={getDefaultParams('static_color')}
        onTypeChange={vi.fn()}
        onParamChange={onParamChange}
      />,
    )
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'fade_in' } })
    expect(onParamChange).toHaveBeenCalledWith('color', '#ffffff')
    expect(onParamChange).toHaveBeenCalledWith('durationSec', 1.0)
    expect(onParamChange).toHaveBeenCalledWith('offsetSec', 0)
  })

  it('renders param fields for static_color', () => {
    render(
      <EffectForm
        effectType="static_color"
        params={getDefaultParams('static_color')}
        onTypeChange={vi.fn()}
        onParamChange={vi.fn()}
      />,
    )
    expect(screen.getByLabelText('Color')).toBeInTheDocument()
    expect(screen.getByText(/Intensity/)).toBeInTheDocument()
  })

  it('renders color input with current value', () => {
    render(
      <EffectForm
        effectType="static_color"
        params={{ color: '#ff0000', intensity: 1.0 }}
        onTypeChange={vi.fn()}
        onParamChange={vi.fn()}
      />,
    )
    const colorInput = screen.getByLabelText('Color') as HTMLInputElement
    expect(colorInput.value).toBe('#ff0000')
  })

  it('calls onParamChange when a color input changes', () => {
    const onParamChange = vi.fn()
    render(
      <EffectForm
        effectType="static_color"
        params={getDefaultParams('static_color')}
        onTypeChange={vi.fn()}
        onParamChange={onParamChange}
      />,
    )
    fireEvent.change(screen.getByLabelText('Color'), { target: { value: '#123456' } })
    expect(onParamChange).toHaveBeenCalledWith('color', '#123456')
  })

  it('renders a direction select for gradient', () => {
    render(
      <EffectForm
        effectType="gradient"
        params={getDefaultParams('gradient')}
        onTypeChange={vi.fn()}
        onParamChange={vi.fn()}
      />,
    )
    expect(screen.getByRole('option', { name: 'Forward' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Reverse' })).toBeInTheDocument()
  })

  it('shows a None option when allowNone is true', () => {
    render(
      <EffectForm
        effectType=""
        params={{}}
        onTypeChange={vi.fn()}
        onParamChange={vi.fn()}
        allowNone
      />,
    )
    expect(screen.getByRole('option', { name: /None/ })).toBeInTheDocument()
  })

  it('does not show a None option by default', () => {
    render(
      <EffectForm
        effectType="static_color"
        params={getDefaultParams('static_color')}
        onTypeChange={vi.fn()}
        onParamChange={vi.fn()}
      />,
    )
    expect(screen.queryByRole('option', { name: /None/ })).not.toBeInTheDocument()
  })

  it('renders no param fields when type is empty string', () => {
    const { container } = render(
      <EffectForm
        effectType=""
        params={{}}
        onTypeChange={vi.fn()}
        onParamChange={vi.fn()}
        allowNone
      />,
    )
    // Only the type <select> should exist — no additional inputs
    expect(container.querySelectorAll('input')).toHaveLength(0)
  })
})
