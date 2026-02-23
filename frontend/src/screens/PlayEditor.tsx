import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getChannels, getPlay, testRegion, updatePlay } from '../api'
import { ChannelStrip, REGION_SWATCHES, getRegionColor } from '../components/ChannelStrip'
import { EffectForm } from '../components/EffectForm'
import { useToast } from '../context/ToastContext'
import { EFFECT_DEFS, getDefaultParams } from '../effects'
import type { Channel, Cue, Effect, Play, PixelRange, Region } from '../types'

const DEFAULT_RANGE: PixelRange = { start: 0, end: 49 }

// ── Regions Tab ───────────────────────────────────────────────────────────────

interface RegionDraft {
  region: Region
  isNew: boolean
}

function RegionsTab({
  play,
  channels,
  onPlayChange,
}: {
  play: Play
  channels: Channel[]
  onPlayChange: (p: Play) => void
}) {
  const { toastError, toastSuccess } = useToast()
  const [selected, setSelected] = useState<RegionDraft | null>(null)

  function selectRegion(id: string) {
    const region = play.regions.find((r) => r.id === id)
    if (!region) return
    setSelected({
      region: { ...region, ranges: region.ranges.map((pr) => ({ ...pr })) },
      isNew: false,
    })
  }

  function startNew() {
    const swatchIdx = play.regions.length % REGION_SWATCHES.length
    setSelected({
      region: {
        id: `region-${crypto.randomUUID()}`,
        name: '',
        channelId: channels[0]?.id ?? '',
        ranges: [{ ...DEFAULT_RANGE }],
        uiColor: REGION_SWATCHES[swatchIdx],
      },
      isNew: true,
    })
  }

  function updateDraft(update: Partial<Region>) {
    if (!selected) return
    setSelected({ ...selected, region: { ...selected.region, ...update } })
  }

  function updateDraftRange(i: number, key: 'start' | 'end', value: number) {
    if (!selected) return
    const ranges = selected.region.ranges.map((pr, idx) =>
      idx === i ? { ...pr, [key]: value } : pr
    )
    updateDraft({ ranges })
  }

  function addRange() {
    if (!selected) return
    updateDraft({ ranges: [...selected.region.ranges, { ...DEFAULT_RANGE }] })
  }

  function removeRange(i: number) {
    if (!selected) return
    updateDraft({ ranges: selected.region.ranges.filter((_, idx) => idx !== i) })
  }

  function applyDraft() {
    if (!selected) return
    const r = selected.region
    if (!r.name.trim()) { toastError('Name is required.'); return }
    if (!r.channelId) { toastError('Channel is required.'); return }
    if (r.ranges.length === 0) { toastError('At least one range is required.'); return }
    for (const pr of r.ranges) {
      if (pr.start > pr.end) { toastError('Start must be ≤ end for all ranges.'); return }
    }
    if (selected.isNew) {
      onPlayChange({ ...play, regions: [...play.regions, r] })
      setSelected({ ...selected, isNew: false })
    } else {
      onPlayChange({
        ...play,
        regions: play.regions.map((ex) => (ex.id === r.id ? r : ex)),
      })
    }
    toastSuccess(`Region "${r.name}" ${selected.isNew ? 'added' : 'updated'}.`)
  }

  async function handleTest() {
    if (!selected || selected.isNew) return
    try {
      await testRegion(play.id, selected.region.id)
      toastSuccess(`Test signal sent to region "${selected.region.name}".`)
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Test failed.')
    }
  }

  function handleDelete() {
    if (!selected || selected.isNew) return
    if (!confirm(`Delete region "${selected.region.name}"?`)) return
    onPlayChange({
      ...play,
      regions: play.regions.filter((r) => r.id !== selected.region.id),
      cues: play.cues.map((cue) => {
        const efr = { ...cue.effectsByRegion }
        delete efr[selected.region.id]
        return { ...cue, effectsByRegion: efr }
      }),
    })
    setSelected(null)
  }

  // Returns regions for a channel, substituting the draft region so the strip
  // reflects color/range changes live as the user edits in the panel.
  function getDisplayRegions(ch: Channel): Region[] {
    const base = play.regions.filter(
      (r) => r.channelId === ch.id && (!selected || r.id !== selected.region.id)
    )
    if (selected && selected.region.channelId === ch.id) {
      return [...base, selected.region]
    }
    return base
  }

  return (
    <>
      {channels.length > 0 && (
        <div className="channel-strips-section">
          {channels.map((ch) => (
            <ChannelStrip
              key={ch.id}
              channel={ch}
              regions={getDisplayRegions(ch)}
              selectedRegionId={selected?.region.id ?? null}
              onSelect={selectRegion}
            />
          ))}
        </div>
      )}

      <div className="editor-split">
        {/* Region List */}
        <div className="editor-list">
          <button className="btn btn-primary btn-sm editor-list-add" onClick={startNew}>
            + Add Region
          </button>
          {play.regions.length === 0 && !selected?.isNew && (
            <p className="editor-list-empty">No regions yet.</p>
          )}
          {play.regions.map((r, i) => (
            <div
              key={r.id}
              className={`editor-list-item${selected?.region.id === r.id && !selected.isNew ? ' active' : ''}`}
              style={{ borderLeftColor: getRegionColor(r, i) }}
              onClick={() => selectRegion(r.id)}
            >
              <span
                className="region-color-dot"
                style={{ background: getRegionColor(r, i) }}
              />
              <span className="editor-list-item-name">{r.name || '(untitled)'}</span>
            </div>
          ))}
          {selected?.isNew && (
            <div
              className="editor-list-item active"
              style={{ borderLeftColor: selected.region.uiColor }}
            >
              <span
                className="region-color-dot"
                style={{ background: selected.region.uiColor }}
              />
              <span className="editor-list-item-name" style={{ color: 'var(--text-muted)' }}>
                New region…
              </span>
            </div>
          )}
        </div>

        {/* Region Panel */}
        {selected ? (
          <div className="editor-panel">
            <div className="form-group">
              <label className="form-label">Name</label>
              <input
                className="form-input"
                value={selected.region.name}
                onChange={(e) => updateDraft({ name: e.target.value })}
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label">Channel</label>
              <select
                className="form-select"
                value={selected.region.channelId}
                onChange={(e) => updateDraft({ channelId: e.target.value })}
              >
                {channels.map((ch) => (
                  <option key={ch.id} value={ch.id}>{ch.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Color</label>
              <div className="swatch-grid">
                {REGION_SWATCHES.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`swatch-btn${selected.region.uiColor === color ? ' active' : ''}`}
                    style={{ background: color }}
                    onClick={() => updateDraft({ uiColor: color })}
                  />
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Pixel Ranges (0-indexed)</label>
              {selected.region.ranges.map((pr, i) => (
                <div key={i} className="pixel-range-row">
                  <div className="form-group">
                    <label className="form-label">Start</label>
                    <input
                      type="number"
                      className="form-input"
                      min={0}
                      value={pr.start}
                      onChange={(e) => updateDraftRange(i, 'start', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End</label>
                    <input
                      type="number"
                      className="form-input"
                      min={0}
                      value={pr.end}
                      onChange={(e) => updateDraftRange(i, 'end', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => removeRange(i)}
                    disabled={selected.region.ranges.length === 1}
                    style={{ alignSelf: 'flex-end', marginBottom: 0 }}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button className="btn btn-sm" onClick={addRange}>+ Add Range</button>
            </div>

            <div className="editor-panel-actions">
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary btn-sm" onClick={applyDraft}>
                  {selected.isNew ? 'Add Region' : 'Apply Changes'}
                </button>
                {!selected.isNew && (
                  <button
                    className="btn btn-sm"
                    onClick={handleTest}
                    title="Send test signal to hardware"
                  >
                    Test [T]
                  </button>
                )}
              </div>
              {!selected.isNew && (
                <button className="btn btn-sm btn-danger" onClick={handleDelete}>
                  Delete Region
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="editor-panel editor-panel-empty">
            Select a region or click + Add Region
          </div>
        )}
      </div>
    </>
  )
}

// ── Cues Tab ──────────────────────────────────────────────────────────────────

// Sentinel value used to represent the "Track" mode within this component only
const TRACK_MODE = '_track'

interface CueDraft {
  cue: Cue
  isNew: boolean
}

/** Returns the current mode for a region in the draft cue: '' (none), '_track', or effect type string. */
function getRegionMode(cue: Cue, regionId: string): string {
  if (cue.trackingRegions?.includes(regionId)) return TRACK_MODE
  return cue.effectsByRegion[regionId]?.type ?? ''
}

function CuesTab({
  play,
  onPlayChange,
}: {
  play: Play
  onPlayChange: (p: Play) => void
}) {
  const { toastError, toastSuccess } = useToast()
  const [selected, setSelected] = useState<CueDraft | null>(null)

  const cueIndex = selected
    ? selected.isNew
      ? play.cues.length
      : play.cues.findIndex((c) => c.id === selected.cue.id)
    : -1

  function selectCue(id: string) {
    const cue = play.cues.find((c) => c.id === id)
    if (!cue) return
    setSelected({
      cue: {
        ...cue,
        trackingRegions: [...(cue.trackingRegions ?? [])],
        effectsByRegion: Object.fromEntries(
          Object.entries(cue.effectsByRegion).map(([k, v]) => [
            k,
            { ...v, params: { ...v.params } },
          ])
        ),
      },
      isNew: false,
    })
  }

  function startNew() {
    const isFirst = play.cues.length === 0
    setSelected({
      cue: {
        id: `cue-${crypto.randomUUID()}`,
        name: '',
        effectsByRegion: {},
        // Default to tracking all regions unless this is the first cue
        trackingRegions: isFirst ? [] : play.regions.map((r) => r.id),
      },
      isNew: true,
    })
  }

  function setRegionMode(regionId: string, mode: string) {
    if (!selected) return
    const updatedEffects = { ...selected.cue.effectsByRegion }
    const updatedTracking = (selected.cue.trackingRegions ?? []).filter((id) => id !== regionId)

    if (mode === TRACK_MODE) {
      delete updatedEffects[regionId]
      updatedTracking.push(regionId)
    } else if (!mode) {
      delete updatedEffects[regionId]
    } else {
      const existing = updatedEffects[regionId]
      updatedEffects[regionId] = {
        id: existing?.id ?? `effect-${crypto.randomUUID()}`,
        type: mode,
        params: mode !== existing?.type ? getDefaultParams(mode) : { ...existing.params },
      }
    }

    setSelected({
      ...selected,
      cue: { ...selected.cue, effectsByRegion: updatedEffects, trackingRegions: updatedTracking },
    })
  }

  function handleParamChange(regionId: string, key: string, value: unknown) {
    if (!selected) return
    const existing = selected.cue.effectsByRegion[regionId]
    if (!existing) return
    const updatedEffects = {
      ...selected.cue.effectsByRegion,
      [regionId]: { ...existing, params: { ...existing.params, [key]: value } },
    }
    setSelected({ ...selected, cue: { ...selected.cue, effectsByRegion: updatedEffects } })
  }

  function applyDraft() {
    if (!selected) return
    if (!selected.cue.name.trim()) { toastError('Cue name is required.'); return }
    if (selected.isNew) {
      onPlayChange({ ...play, cues: [...play.cues, selected.cue] })
      setSelected({ ...selected, isNew: false })
    } else {
      onPlayChange({
        ...play,
        cues: play.cues.map((c) => (c.id === selected.cue.id ? selected.cue : c)),
      })
    }
    toastSuccess(`Cue "${selected.cue.name}" ${selected.isNew ? 'added' : 'updated'}.`)
  }

  function handleDelete() {
    if (!selected || selected.isNew) return
    if (!confirm(`Delete cue "${selected.cue.name}"?`)) return
    onPlayChange({ ...play, cues: play.cues.filter((c) => c.id !== selected.cue.id) })
    setSelected(null)
  }

  function moveUp(i: number) {
    if (i === 0) return
    const cues = [...play.cues]
    ;[cues[i - 1], cues[i]] = [cues[i], cues[i - 1]]
    onPlayChange({ ...play, cues })
  }

  function moveDown(i: number) {
    if (i >= play.cues.length - 1) return
    const cues = [...play.cues]
    ;[cues[i], cues[i + 1]] = [cues[i + 1], cues[i]]
    onPlayChange({ ...play, cues })
  }

  return (
    <div className="editor-split">
      {/* Cue List */}
      <div className="editor-list">
        <button className="btn btn-primary btn-sm editor-list-add" onClick={startNew}>
          + Add Cue
        </button>
        {play.cues.length === 0 && !selected?.isNew && (
          <p className="editor-list-empty">No cues yet.</p>
        )}
        {play.cues.map((cue, i) => (
          <div
            key={cue.id}
            className={`editor-list-item cue-list-item${selected?.cue.id === cue.id && !selected.isNew ? ' active' : ''}`}
          >
            <span className="cue-number">{i + 1}</span>
            <button className="cue-list-name" onClick={() => selectCue(cue.id)}>
              {cue.name || '(untitled)'}
            </button>
            <div className="cue-list-actions">
              <button className="btn btn-sm" onClick={() => moveUp(i)} disabled={i === 0}>↑</button>
              <button className="btn btn-sm" onClick={() => moveDown(i)} disabled={i >= play.cues.length - 1}>↓</button>
            </div>
          </div>
        ))}
        {selected?.isNew && (
          <div className="editor-list-item active cue-list-item">
            <span className="cue-number">{play.cues.length + 1}</span>
            <span className="cue-list-name" style={{ color: 'var(--text-muted)' }}>
              New cue…
            </span>
          </div>
        )}
      </div>

      {/* Cue Panel */}
      {selected ? (
        <div className="editor-panel">
          <div className="form-group">
            <label className="form-label">Cue Name</label>
            <input
              className="form-input"
              value={selected.cue.name}
              onChange={(e) =>
                setSelected({ ...selected, cue: { ...selected.cue, name: e.target.value } })
              }
              autoFocus
            />
          </div>

          {play.regions.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>
              Add regions to the play first.
            </p>
          ) : (
            play.regions.map((region, i) => {
              const mode = getRegionMode(selected.cue, region.id)
              const effect: Effect | undefined = selected.cue.effectsByRegion[region.id]
              return (
                <div key={region.id} className="region-effect-card">
                  <div className="region-effect-header">
                    <span
                      className="region-color-dot"
                      style={{ background: getRegionColor(region, i) }}
                    />
                    <span className="region-effect-name">{region.name}</span>
                  </div>

                  {/* Mode pills: None | Track (not first cue) | effect types */}
                  <div className="effect-pills">
                    <button
                      type="button"
                      className={`pill-btn${mode === '' ? ' active' : ''}`}
                      onClick={() => setRegionMode(region.id, '')}
                    >
                      None
                    </button>
                    {cueIndex > 0 && (
                      <button
                        type="button"
                        className={`pill-btn pill-btn-track${mode === TRACK_MODE ? ' active' : ''}`}
                        onClick={() => setRegionMode(region.id, TRACK_MODE)}
                      >
                        Track ↑
                      </button>
                    )}
                    {EFFECT_DEFS.map((d) => (
                      <button
                        type="button"
                        key={d.type}
                        className={`pill-btn${mode === d.type ? ' active' : ''}`}
                        onClick={() => setRegionMode(region.id, d.type)}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>

                  {/* Tracking hint or effect params */}
                  {mode === TRACK_MODE ? (
                    <p className="track-hint">↑ Continues effect from the previous cue</p>
                  ) : effect ? (
                    <EffectForm
                      effectType={effect.type}
                      params={effect.params}
                      onTypeChange={() => {}}
                      onParamChange={(k, v) => handleParamChange(region.id, k, v)}
                      showTypeSelector={false}
                    />
                  ) : null}
                </div>
              )
            })
          )}

          <div className="editor-panel-actions">
            <button className="btn btn-primary btn-sm" onClick={applyDraft}>
              {selected.isNew ? 'Add Cue' : 'Apply Changes'}
            </button>
            {!selected.isNew && (
              <button className="btn btn-sm btn-danger" onClick={handleDelete}>
                Delete Cue
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="editor-panel editor-panel-empty">
          Select a cue or click + Add Cue
        </div>
      )}
    </div>
  )
}

// ── Play Editor ───────────────────────────────────────────────────────────────

export function PlayEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toastError, toastSuccess } = useToast()

  const [play, setPlay] = useState<Play | null>(null)
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [tab, setTab] = useState<'regions' | 'cues'>('regions')

  useEffect(() => {
    if (!id) return
    Promise.all([getPlay(id), getChannels()])
      .then(([p, ch]) => { setPlay(p); setChannels(ch) })
      .catch((e) => toastError(e instanceof Error ? e.message : 'Load failed.'))
      .finally(() => setLoading(false))
  }, [id])

  function handlePlayChange(updated: Play) {
    setPlay(updated)
    setDirty(true)
  }

  async function handleSave() {
    if (!play) return
    setSaving(true)
    try {
      await updatePlay(play)
      setDirty(false)
      toastSuccess('Play saved.')
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="empty-state">Loading…</div>
  if (!play) return <div className="empty-state">Play not found.</div>

  return (
    <>
      <div className="screen-header">
        <button className="btn btn-sm" onClick={() => navigate('/plays')}>← Plays</button>
        <h1 className="screen-title">{play.name}</h1>
        <button
          className="btn btn-sm"
          onClick={() => navigate(`/preview?playId=${play.id}`)}
        >
          Preview ▶
        </button>
        <button
          className="btn btn-primary btn-sm"
          onClick={handleSave}
          disabled={!dirty || saving}
        >
          {saving ? 'Saving…' : dirty ? 'Save Changes' : 'Saved'}
        </button>
      </div>

      <div className="tabs">
        <button
          className={`tab-btn${tab === 'regions' ? ' active' : ''}`}
          onClick={() => setTab('regions')}
        >
          Regions
        </button>
        <button
          className={`tab-btn${tab === 'cues' ? ' active' : ''}`}
          onClick={() => setTab('cues')}
        >
          Cues
        </button>
      </div>

      {tab === 'regions' ? (
        <RegionsTab play={play} channels={channels} onPlayChange={handlePlayChange} />
      ) : (
        <CuesTab play={play} onPlayChange={handlePlayChange} />
      )}
    </>
  )
}
