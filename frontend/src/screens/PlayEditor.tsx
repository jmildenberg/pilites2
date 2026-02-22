import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getChannels, getPlay, testRegion, updatePlay } from '../api'
import { EffectForm } from '../components/EffectForm'
import { Modal } from '../components/Modal'
import { useToast } from '../context/ToastContext'
import { EFFECT_DEFS, getDefaultParams } from '../effects'
import type { Channel, Cue, Effect, Play, PixelRange, Region } from '../types'

// ── Region Modal ─────────────────────────────────────────────────────────────

interface RegionModalProps {
  initial: Region | null
  channels: Channel[]
  onClose: () => void
  onSave: (region: Region) => void
}

function RegionModal({ initial, channels, onClose, onSave }: RegionModalProps) {
  const { toastError } = useToast()
  const [name, setName] = useState(initial?.name ?? '')
  const [channelId, setChannelId] = useState(initial?.channelId ?? channels[0]?.id ?? '')
  const [ranges, setRanges] = useState<PixelRange[]>(
    initial?.ranges ?? [{ start: 0, end: 49 }],
  )

  function addRange() {
    setRanges((r) => [...r, { start: 0, end: 49 }])
  }

  function removeRange(i: number) {
    setRanges((r) => r.filter((_, idx) => idx !== i))
  }

  function updateRange(i: number, key: 'start' | 'end', value: number) {
    setRanges((r) => r.map((pr, idx) => (idx === i ? { ...pr, [key]: value } : pr)))
  }

  function handleSave() {
    if (!name.trim()) { toastError('Name is required.'); return }
    if (!channelId) { toastError('Channel is required.'); return }
    if (ranges.length === 0) { toastError('At least one range is required.'); return }
    for (const pr of ranges) {
      if (pr.start > pr.end) { toastError('Start must be ≤ end for all ranges.'); return }
    }
    onSave({
      id: initial?.id ?? `region-${crypto.randomUUID()}`,
      name: name.trim(),
      channelId,
      ranges,
    })
    onClose()
  }

  return (
    <Modal
      title={initial ? 'Edit Region' : 'Add Region'}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>Save</button>
        </>
      }
    >
      <div className="form-group">
        <label className="form-label">Name</label>
        <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </div>
      <div className="form-group">
        <label className="form-label">Channel</label>
        <select className="form-select" value={channelId} onChange={(e) => setChannelId(e.target.value)}>
          {channels.map((ch) => (
            <option key={ch.id} value={ch.id}>{ch.name}</option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Pixel Ranges (0-indexed)</label>
        {ranges.map((pr, i) => (
          <div key={i} className="pixel-range-row">
            <div className="form-group">
              <label className="form-label">Start</label>
              <input
                type="number"
                className="form-input"
                min={0}
                value={pr.start}
                onChange={(e) => updateRange(i, 'start', parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">End</label>
              <input
                type="number"
                className="form-input"
                min={0}
                value={pr.end}
                onChange={(e) => updateRange(i, 'end', parseInt(e.target.value) || 0)}
              />
            </div>
            <button
              className="btn btn-sm btn-danger"
              onClick={() => removeRange(i)}
              disabled={ranges.length === 1}
              style={{ alignSelf: 'flex-end', marginBottom: 0 }}
            >
              ×
            </button>
          </div>
        ))}
        <button className="btn btn-sm" onClick={addRange}>+ Add Range</button>
      </div>
    </Modal>
  )
}

// ── Cue Modal ─────────────────────────────────────────────────────────────────

interface CueModalProps {
  initial: Cue | null
  regions: Region[]
  onClose: () => void
  onSave: (cue: Cue) => void
}

function CueModal({ initial, regions, onClose, onSave }: CueModalProps) {
  const { toastError } = useToast()
  const [name, setName] = useState(initial?.name ?? '')
  // Map: regionId → { type, params }
  const [effectsByRegion, setEffectsByRegion] = useState<Record<string, { type: string; params: Record<string, unknown> }>>(() => {
    const init: Record<string, { type: string; params: Record<string, unknown> }> = {}
    for (const region of regions) {
      const existing = initial?.effectsByRegion[region.id]
      if (existing) {
        init[region.id] = { type: existing.type, params: { ...existing.params } }
      } else {
        init[region.id] = { type: '', params: {} }
      }
    }
    return init
  })

  function handleTypeChange(regionId: string, type: string) {
    setEffectsByRegion((prev) => ({
      ...prev,
      [regionId]: { type, params: type ? getDefaultParams(type) : {} },
    }))
  }

  function handleParamChange(regionId: string, key: string, value: unknown) {
    setEffectsByRegion((prev) => ({
      ...prev,
      [regionId]: { ...prev[regionId], params: { ...prev[regionId].params, [key]: value } },
    }))
  }

  function handleSave() {
    if (!name.trim()) { toastError('Name is required.'); return }
    const built: Record<string, Effect> = {}
    for (const [regionId, ef] of Object.entries(effectsByRegion)) {
      if (!ef.type) continue // no effect = black
      const existing = initial?.effectsByRegion[regionId]
      built[regionId] = {
        id: existing?.id ?? `effect-${crypto.randomUUID()}`,
        type: ef.type,
        params: ef.params,
      }
    }
    onSave({
      id: initial?.id ?? `cue-${crypto.randomUUID()}`,
      name: name.trim(),
      effectsByRegion: built,
    })
    onClose()
  }

  return (
    <Modal
      title={initial ? 'Edit Cue' : 'Add Cue'}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>Save</button>
        </>
      }
    >
      <div className="form-group">
        <label className="form-label">Cue Name</label>
        <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </div>
      <div className="divider" />
      {regions.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>Add regions to the play first.</p>
      ) : (
        regions.map((region) => {
          const ef = effectsByRegion[region.id] ?? { type: '', params: {} }
          return (
            <div key={region.id} className="effect-section">
              <div className="effect-section-header">
                <span className="effect-section-label">{region.name}</span>
              </div>
              <EffectForm
                effectType={ef.type}
                params={ef.params}
                onTypeChange={(t) => handleTypeChange(region.id, t)}
                onParamChange={(k, v) => handleParamChange(region.id, k, v)}
                allowNone
              />
            </div>
          )
        })
      )}
    </Modal>
  )
}

// ── Regions Tab ───────────────────────────────────────────────────────────────

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
  const [modal, setModal] = useState<'add' | Region | null>(null)

  const channelMap = Object.fromEntries(channels.map((ch) => [ch.id, ch]))

  async function handleTest(region: Region) {
    try {
      await testRegion(play.id, region.id)
      toastSuccess(`Test signal sent to region "${region.name}".`)
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Test failed.')
    }
  }

  function handleDelete(region: Region) {
    if (!confirm(`Delete region "${region.name}"?`)) return
    onPlayChange({
      ...play,
      regions: play.regions.filter((r) => r.id !== region.id),
      // Remove from all cues too
      cues: play.cues.map((cue) => {
        const efr = { ...cue.effectsByRegion }
        delete efr[region.id]
        return { ...cue, effectsByRegion: efr }
      }),
    })
  }

  function handleSaveRegion(region: Region) {
    const exists = play.regions.find((r) => r.id === region.id)
    if (exists) {
      onPlayChange({ ...play, regions: play.regions.map((r) => (r.id === region.id ? region : r)) })
    } else {
      onPlayChange({ ...play, regions: [...play.regions, region] })
    }
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button className="btn btn-primary btn-sm" onClick={() => setModal('add')}>
          + Add Region
        </button>
      </div>

      {play.regions.length === 0 ? (
        <div className="empty-state">
          <strong>No regions yet.</strong>
          <p>Regions map pixel ranges on a channel to areas you can light separately.</p>
        </div>
      ) : (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Channel</th>
                <th>Ranges</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {play.regions.map((r) => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td>{channelMap[r.channelId]?.name ?? r.channelId}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>
                    {r.ranges.map((pr) => `${pr.start}–${pr.end}`).join(', ')}
                  </td>
                  <td>
                    <div className="td-actions">
                      <button className="btn btn-sm" title="Test region on hardware" onClick={() => handleTest(r)}>
                        [T]
                      </button>
                      <button className="btn btn-sm" onClick={() => setModal(r)}>Edit</button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(r)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal !== null && (
        <RegionModal
          initial={modal === 'add' ? null : modal}
          channels={channels}
          onClose={() => setModal(null)}
          onSave={handleSaveRegion}
        />
      )}
    </>
  )
}

// ── Cues Tab ──────────────────────────────────────────────────────────────────

function CuesTab({
  play,
  onPlayChange,
}: {
  play: Play
  onPlayChange: (p: Play) => void
}) {
  const [modal, setModal] = useState<'add' | Cue | null>(null)

  function handleSaveCue(cue: Cue) {
    const exists = play.cues.find((c) => c.id === cue.id)
    if (exists) {
      onPlayChange({ ...play, cues: play.cues.map((c) => (c.id === cue.id ? cue : c)) })
    } else {
      onPlayChange({ ...play, cues: [...play.cues, cue] })
    }
  }

  function handleDelete(cue: Cue) {
    if (!confirm(`Delete cue "${cue.name}"?`)) return
    onPlayChange({ ...play, cues: play.cues.filter((c) => c.id !== cue.id) })
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

  const regionMap = Object.fromEntries(play.regions.map((r) => [r.id, r]))

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button className="btn btn-primary btn-sm" onClick={() => setModal('add')}>
          + Add Cue
        </button>
      </div>

      {play.cues.length === 0 ? (
        <div className="empty-state">
          <strong>No cues yet.</strong>
          <p>Cues define the lighting effects for each region at a point in the show.</p>
        </div>
      ) : (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Effects</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {play.cues.map((cue, i) => {
                const effectList = Object.entries(cue.effectsByRegion)
                  .map(([rid, ef]) => {
                    const region = regionMap[rid]
                    const label = EFFECT_DEFS.find((d) => d.type === ef.type)?.label ?? ef.type
                    return `${region?.name ?? rid}: ${label}`
                  })
                  .join(' · ')

                return (
                  <tr key={cue.id}>
                    <td style={{ color: 'var(--text-muted)', width: 40 }}>{i + 1}</td>
                    <td>{cue.name}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {effectList || '—'}
                    </td>
                    <td>
                      <div className="td-actions">
                        <button className="btn btn-sm" onClick={() => moveUp(i)} disabled={i === 0}>↑</button>
                        <button className="btn btn-sm" onClick={() => moveDown(i)} disabled={i >= play.cues.length - 1}>↓</button>
                        <button className="btn btn-sm" onClick={() => setModal(cue)}>Edit</button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(cue)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {modal !== null && (
        <CueModal
          initial={modal === 'add' ? null : modal}
          regions={play.regions}
          onClose={() => setModal(null)}
          onSave={handleSaveCue}
        />
      )}
    </>
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
