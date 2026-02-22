import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPlay, deletePlay, listPlays } from '../api'
import { Modal } from '../components/Modal'
import { useToast } from '../context/ToastContext'
import type { PlaySummary } from '../types'

function NewPlayModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const { toastError } = useToast()
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleCreate() {
    if (!name.trim()) {
      toastError('Name is required.')
      return
    }
    setSaving(true)
    try {
      const id = `play-${crypto.randomUUID()}`
      await createPlay({ id, name: name.trim(), regions: [], cues: [] })
      onCreated(id)
      onClose()
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Create failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title="New Play"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>
            {saving ? 'Creating…' : 'Create'}
          </button>
        </>
      }
    >
      <div className="form-group">
        <label className="form-label">Play Name</label>
        <input
          className="form-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Main Stage"
          autoFocus
          onKeyDown={(e) => { if (e.key === 'Enter') void handleCreate() }}
        />
      </div>
    </Modal>
  )
}

export function Plays() {
  const { toastError, toastSuccess } = useToast()
  const navigate = useNavigate()
  const [plays, setPlays] = useState<PlaySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)

  async function load() {
    try {
      setPlays(await listPlays())
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Failed to load plays.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  async function handleDelete(play: PlaySummary) {
    if (!confirm(`Delete play "${play.name}"? This cannot be undone.`)) return
    try {
      await deletePlay(play.id)
      toastSuccess(`"${play.name}" deleted.`)
      void load()
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Delete failed.')
    }
  }

  function handleCreated(id: string) {
    navigate(`/plays/${id}`)
  }

  return (
    <>
      <div className="screen-header">
        <h1 className="screen-title">Plays</h1>
        <button className="btn btn-primary" onClick={() => setShowNew(true)}>
          + New Play
        </button>
      </div>

      <div className="card">
        {loading ? (
          <div className="empty-state">Loading…</div>
        ) : plays.length === 0 ? (
          <div className="empty-state">
            <strong>No plays yet.</strong>
            <p>Create a play to define lighting cues and effects.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {plays.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>
                      <div className="td-actions">
                        <button className="btn btn-sm" onClick={() => navigate(`/plays/${p.id}`)}>
                          Edit
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(p)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showNew && (
        <NewPlayModal onClose={() => setShowNew(false)} onCreated={handleCreated} />
      )}
    </>
  )
}
