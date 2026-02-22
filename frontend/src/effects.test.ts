import { describe, expect, it } from 'vitest'
import { EFFECT_DEFS, getDefaultParams, getEffectDef } from './effects'

const ALL_TYPES = [
  'static_color',
  'fade_in',
  'fade_out',
  'color_wash',
  'gradient',
  'chase',
  'strobe',
  'rainbow',
  'lightning',
  'pulse',
  'twinkle',
]

// ── EFFECT_DEFS ───────────────────────────────────────────────────────────────

describe('EFFECT_DEFS', () => {
  it('contains all 11 effect types', () => {
    expect(EFFECT_DEFS).toHaveLength(11)
  })

  it('covers every expected effect type', () => {
    const types = EFFECT_DEFS.map((d) => d.type)
    for (const t of ALL_TYPES) {
      expect(types).toContain(t)
    }
  })

  it('has a unique type for each entry', () => {
    const types = EFFECT_DEFS.map((d) => d.type)
    expect(new Set(types).size).toBe(types.length)
  })

  it('each entry has a non-empty label', () => {
    for (const def of EFFECT_DEFS) {
      expect(def.label.length).toBeGreaterThan(0)
    }
  })

  it('each entry has at least one param', () => {
    for (const def of EFFECT_DEFS) {
      expect(def.params.length).toBeGreaterThan(0)
    }
  })

  it('all param keys are unique within each effect', () => {
    for (const def of EFFECT_DEFS) {
      const keys = def.params.map((p) => p.key)
      expect(new Set(keys).size).toBe(keys.length)
    }
  })

  it('number params have valid min ≤ default ≤ max and positive step', () => {
    for (const def of EFFECT_DEFS) {
      for (const p of def.params) {
        if (p.type !== 'number') continue
        expect(p.min).toBeLessThanOrEqual(p.max)
        expect(p.step).toBeGreaterThan(0)
        expect(p.default).toBeGreaterThanOrEqual(p.min)
        expect(p.default).toBeLessThanOrEqual(p.max)
      }
    }
  })

  it('color params have lowercase hex string defaults', () => {
    for (const def of EFFECT_DEFS) {
      for (const p of def.params) {
        if (p.type !== 'color') continue
        expect(p.default).toMatch(/^#[0-9a-f]{6}$/)
      }
    }
  })

  it('select params have at least 2 options with non-empty values', () => {
    for (const def of EFFECT_DEFS) {
      for (const p of def.params) {
        if (p.type !== 'select') continue
        expect(p.options.length).toBeGreaterThanOrEqual(2)
        for (const opt of p.options) {
          expect(opt.value.length).toBeGreaterThan(0)
          expect(opt.label.length).toBeGreaterThan(0)
        }
      }
    }
  })

  it('select param defaults are one of their option values', () => {
    for (const def of EFFECT_DEFS) {
      for (const p of def.params) {
        if (p.type !== 'select') continue
        const values = p.options.map((o) => o.value)
        expect(values).toContain(p.default)
      }
    }
  })
})

// ── getEffectDef ──────────────────────────────────────────────────────────────

describe('getEffectDef', () => {
  it('returns the correct definition for a known type', () => {
    const def = getEffectDef('static_color')
    expect(def).toBeDefined()
    expect(def?.type).toBe('static_color')
    expect(def?.label).toBe('Static Color')
  })

  it('returns undefined for an unknown type', () => {
    expect(getEffectDef('nonexistent')).toBeUndefined()
  })

  it('returns undefined for an empty string', () => {
    expect(getEffectDef('')).toBeUndefined()
  })

  it.each(ALL_TYPES)('finds definition for %s', (type) => {
    expect(getEffectDef(type)).toBeDefined()
  })
})

// ── getDefaultParams ──────────────────────────────────────────────────────────

describe('getDefaultParams', () => {
  it('returns empty object for an unknown type', () => {
    expect(getDefaultParams('nonexistent')).toEqual({})
  })

  it('returns empty object for an empty string', () => {
    expect(getDefaultParams('')).toEqual({})
  })

  it('returns all param keys for every effect type', () => {
    for (const def of EFFECT_DEFS) {
      const params = getDefaultParams(def.type)
      for (const p of def.params) {
        expect(params).toHaveProperty(p.key)
      }
    }
  })

  it('static_color defaults: white color, full intensity', () => {
    const p = getDefaultParams('static_color')
    expect(p.color).toBe('#ffffff')
    expect(p.intensity).toBe(1.0)
  })

  it('fade_in defaults: white, 1s duration, 0s offset', () => {
    const p = getDefaultParams('fade_in')
    expect(p.color).toBe('#ffffff')
    expect(p.durationSec).toBe(1.0)
    expect(p.offsetSec).toBe(0)
  })

  it('gradient defaults: white → black, forward', () => {
    const p = getDefaultParams('gradient')
    expect(p.startColor).toBe('#ffffff')
    expect(p.endColor).toBe('#000000')
    expect(p.direction).toBe('forward')
  })

  it('lightning defaults: 12 strikes/min, 0.2s decay', () => {
    const p = getDefaultParams('lightning')
    expect(p.strikeRate).toBe(12)
    expect(p.decaySec).toBe(0.2)
  })

  it('returns a fresh object each call (not shared state)', () => {
    const a = getDefaultParams('static_color')
    const b = getDefaultParams('static_color')
    a.color = '#000000'
    expect(b.color).toBe('#ffffff')
  })
})
