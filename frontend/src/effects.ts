export interface ColorParam {
  type: 'color'
  key: string
  label: string
  default: string
}

export interface NumberParam {
  type: 'number'
  key: string
  label: string
  default: number
  min: number
  max: number
  step: number
}

export interface SelectParam {
  type: 'select'
  key: string
  label: string
  default: string
  options: { value: string; label: string }[]
}

export type ParamDef = ColorParam | NumberParam | SelectParam

export interface EffectDef {
  type: string
  label: string
  params: ParamDef[]
}

const DIRECTION: SelectParam = {
  type: 'select',
  key: 'direction',
  label: 'Direction',
  default: 'forward',
  options: [
    { value: 'forward', label: 'Forward' },
    { value: 'reverse', label: 'Reverse' },
  ],
}

const OFFSET: NumberParam = {
  type: 'number',
  key: 'offsetSec',
  label: 'Offset (sec)',
  default: 0,
  min: 0,
  max: 60,
  step: 0.1,
}

const SPEED: NumberParam = {
  type: 'number',
  key: 'speed',
  label: 'Speed',
  default: 1.0,
  min: 0.1,
  max: 5,
  step: 0.1,
}

const INTENSITY: NumberParam = {
  type: 'number',
  key: 'intensity',
  label: 'Intensity',
  default: 1.0,
  min: 0,
  max: 1,
  step: 0.01,
}

export const EFFECT_DEFS: EffectDef[] = [
  {
    type: 'static_color',
    label: 'Static Color',
    params: [
      { type: 'color', key: 'color', label: 'Color', default: '#ffffff' },
      INTENSITY,
    ],
  },
  {
    type: 'fade_in',
    label: 'Fade In',
    params: [
      { type: 'color', key: 'color', label: 'Color', default: '#ffffff' },
      { type: 'number', key: 'durationSec', label: 'Duration (sec)', default: 1.0, min: 0.1, max: 60, step: 0.1 },
      OFFSET,
    ],
  },
  {
    type: 'fade_out',
    label: 'Fade Out',
    params: [
      { type: 'color', key: 'fromColor', label: 'From Color', default: '#ffffff' },
      { type: 'number', key: 'durationSec', label: 'Duration (sec)', default: 1.0, min: 0.1, max: 60, step: 0.1 },
      OFFSET,
    ],
  },
  {
    type: 'color_wash',
    label: 'Color Wash',
    params: [
      { type: 'color', key: 'color', label: 'Color', default: '#ffffff' },
      INTENSITY,
      SPEED,
    ],
  },
  {
    type: 'gradient',
    label: 'Gradient',
    params: [
      { type: 'color', key: 'startColor', label: 'Start Color', default: '#ffffff' },
      { type: 'color', key: 'endColor', label: 'End Color', default: '#000000' },
      DIRECTION,
    ],
  },
  {
    type: 'chase',
    label: 'Chase',
    params: [
      { type: 'color', key: 'color', label: 'Color', default: '#ffffff' },
      { type: 'color', key: 'backgroundColor', label: 'Background', default: '#000000' },
      SPEED,
      DIRECTION,
      OFFSET,
    ],
  },
  {
    type: 'strobe',
    label: 'Strobe',
    params: [
      { type: 'color', key: 'color', label: 'Color', default: '#ffffff' },
      { type: 'number', key: 'rate', label: 'Rate (flashes/sec)', default: 8, min: 0.5, max: 30, step: 0.5 },
      { type: 'number', key: 'dutyCycle', label: 'Duty Cycle', default: 0.5, min: 0.01, max: 0.99, step: 0.01 },
      OFFSET,
    ],
  },
  {
    type: 'rainbow',
    label: 'Rainbow',
    params: [
      SPEED,
      DIRECTION,
      INTENSITY,
      OFFSET,
    ],
  },
  {
    type: 'lightning',
    label: 'Lightning',
    params: [
      { type: 'color', key: 'flashColor', label: 'Flash Color', default: '#ffffff' },
      { type: 'color', key: 'backgroundColor', label: 'Background', default: '#000000' },
      INTENSITY,
      { type: 'number', key: 'strikeRate', label: 'Strike Rate (per min)', default: 12, min: 1, max: 120, step: 1 },
      { type: 'number', key: 'decaySec', label: 'Decay (sec)', default: 0.2, min: 0.05, max: 2, step: 0.05 },
      OFFSET,
    ],
  },
  {
    type: 'pulse',
    label: 'Pulse',
    params: [
      { type: 'color', key: 'color', label: 'Color', default: '#ffffff' },
      { type: 'color', key: 'backgroundColor', label: 'Background', default: '#000000' },
      SPEED,
      { type: 'number', key: 'minIntensity', label: 'Min Intensity', default: 0.1, min: 0, max: 1, step: 0.01 },
      { type: 'number', key: 'maxIntensity', label: 'Max Intensity', default: 1.0, min: 0, max: 1, step: 0.01 },
      OFFSET,
    ],
  },
  {
    type: 'twinkle',
    label: 'Twinkle',
    params: [
      { type: 'color', key: 'color', label: 'Color', default: '#ffffff' },
      { type: 'color', key: 'backgroundColor', label: 'Background', default: '#000000' },
      { type: 'number', key: 'density', label: 'Density', default: 0.3, min: 0, max: 1, step: 0.01 },
      SPEED,
      OFFSET,
    ],
  },
]

export function getEffectDef(type: string): EffectDef | undefined {
  return EFFECT_DEFS.find((d) => d.type === type)
}

export function getDefaultParams(type: string): Record<string, unknown> {
  const def = getEffectDef(type)
  if (!def) return {}
  return Object.fromEntries(def.params.map((p) => [p.key, p.default]))
}
