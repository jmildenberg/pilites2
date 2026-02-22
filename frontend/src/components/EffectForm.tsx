import { EFFECT_DEFS, getDefaultParams } from '../effects'
import type { SelectParam } from '../effects'

interface EffectFormProps {
  effectType: string
  params: Record<string, unknown>
  onTypeChange: (type: string) => void
  onParamChange: (key: string, value: unknown) => void
  allowNone?: boolean
}

export function EffectForm({
  effectType,
  params,
  onTypeChange,
  onParamChange,
  allowNone = false,
}: EffectFormProps) {
  const def = EFFECT_DEFS.find((d) => d.type === effectType)

  const handleTypeChange = (newType: string) => {
    if (newType === '') {
      onTypeChange('')
      return
    }
    onTypeChange(newType)
    // Reset params to defaults for new type
    const defaults = getDefaultParams(newType)
    for (const [k, v] of Object.entries(defaults)) {
      onParamChange(k, v)
    }
  }

  return (
    <div>
      <div className="form-group">
        <label className="form-label">Effect Type</label>
        <select
          className="form-select"
          value={effectType}
          onChange={(e) => handleTypeChange(e.target.value)}
        >
          {allowNone && <option value="">— None (black) —</option>}
          {EFFECT_DEFS.map((d) => (
            <option key={d.type} value={d.type}>
              {d.label}
            </option>
          ))}
        </select>
      </div>

      {def &&
        def.params.map((p) => {
          const id = `ef-${p.key}`
          const value = params[p.key] ?? p.default

          if (p.type === 'color') {
            return (
              <div key={p.key} className="form-group">
                <label htmlFor={id} className="form-label">{p.label}</label>
                <input
                  id={id}
                  type="color"
                  className="form-input"
                  value={String(value)}
                  onChange={(e) => onParamChange(p.key, e.target.value)}
                />
              </div>
            )
          }

          if (p.type === 'number') {
            return (
              <div key={p.key} className="form-group">
                <label htmlFor={id} className="form-label">
                  {p.label}: <strong>{Number(value).toFixed(p.step < 1 ? 2 : 0)}</strong>
                </label>
                <input
                  id={id}
                  type="range"
                  className="form-input"
                  min={p.min}
                  max={p.max}
                  step={p.step}
                  value={Number(value)}
                  onChange={(e) => onParamChange(p.key, parseFloat(e.target.value))}
                />
              </div>
            )
          }

          if (p.type === 'select') {
            const sp = p as SelectParam
            return (
              <div key={p.key} className="form-group">
                <label htmlFor={id} className="form-label">{p.label}</label>
                <select
                  id={id}
                  className="form-select"
                  value={String(value)}
                  onChange={(e) => onParamChange(p.key, e.target.value)}
                >
                  {sp.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            )
          }

          return null
        })}
    </div>
  )
}
