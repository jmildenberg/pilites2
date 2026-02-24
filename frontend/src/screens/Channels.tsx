import { useEffect, useState } from 'react'
import { getChannels, randomUUID, testChannelOff, testChannelWhite, upsertChannel } from '../api'
import { Modal } from '../components/Modal'
import { useToast } from '../context/ToastContext'
import type { Channel } from '../types'

const GPIO_PINS = [12, 13, 18, 19] as const
const COLOR_ORDERS = ['RGB', 'GRB', 'RGBW', 'GRBW'] as const

function emptyChannel(): Omit<Channel, 'id'> {
  return {
    name: '',
    gpioPin: 18,
    ledCount: 150,
    ledType: 'ws281x',
    colorOrder: 'RGB',
  }
}

interface ChannelModalProps {
  initial: Channel | null
  onClose: () => void
  onSaved: () => void
}

function ChannelModal({ initial, onClose, onSaved }: ChannelModalProps) {
  const { toastError, toastSuccess } = useToast()
  const [form, setForm] = useState<Omit<Channel, 'id'>>(
    initial ?? emptyChannel(),
  )
  const [saving, setSaving] = useState(false)

  function set<K extends keyof Omit<Channel, 'id'>>(key: K, value: Omit<Channel, 'id'>[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toastError('Name is required.')
      return
    }
    setSaving(true)
    try {
      const id = initial?.id ?? `channel-${randomUUID()}`
      await upsertChannel({ id, ...form })
      toastSuccess(initial ? 'Channel updated.' : 'Channel created.')
      onSaved()
      onClose()
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={initial ? 'Edit Channel' : 'Add Channel'}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      <div className="form-group">
        <label className="form-label">Name</label>
        <input
          className="form-input"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="e.g. Main Strand"
          autoFocus
        />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">GPIO Pin</label>
          <select
            className="form-select"
            value={form.gpioPin}
            onChange={(e) => set('gpioPin', Number(e.target.value) as 12 | 13 | 18 | 19)}
          >
            {GPIO_PINS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">LED Count</label>
          <input
            type="number"
            className="form-input"
            min={1}
            max={1500}
            value={form.ledCount}
            onChange={(e) => set('ledCount', parseInt(e.target.value) || 1)}
          />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">LED Type</label>
          <input
            className="form-input"
            value={form.ledType}
            onChange={(e) => set('ledType', e.target.value)}
            placeholder="ws281x"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Color Order</label>
          <select
            className="form-select"
            value={form.colorOrder}
            onChange={(e) => set('colorOrder', e.target.value as Channel['colorOrder'])}
          >
            {COLOR_ORDERS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>
      </div>
    </Modal>
  )
}

export function Channels() {
  const { toastError, toastSuccess } = useToast()
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'add' | Channel | null>(null)

  async function load() {
    try {
      setChannels(await getChannels())
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Failed to load channels.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  async function handleTestWhite(ch: Channel) {
    try {
      await testChannelWhite(ch.id)
      toastSuccess(`White test signal sent to "${ch.name}".`)
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Test failed.')
    }
  }

  async function handleTestOff(ch: Channel) {
    try {
      await testChannelOff(ch.id)
      toastSuccess(`Test signal cleared for "${ch.name}".`)
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Test off failed.')
    }
  }

  return (
    <>
      <div className="screen-header">
        <h1 className="screen-title">Channels</h1>
        <button className="btn btn-primary" onClick={() => setModal('add')}>
          + Add Channel
        </button>
      </div>

      <div className="card">
        {loading ? (
          <div className="empty-state">Loading…</div>
        ) : channels.length === 0 ? (
          <div className="empty-state">
            <strong>No channels configured.</strong>
            <p>Add a channel to get started.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>GPIO Pin</th>
                  <th>LED Count</th>
                  <th>Color Order</th>
                  <th>LED Type</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {channels.map((ch) => (
                  <tr key={ch.id}>
                    <td>{ch.name}</td>
                    <td>{ch.gpioPin}</td>
                    <td>{ch.ledCount}</td>
                    <td>{ch.colorOrder}</td>
                    <td>{ch.ledType}</td>
                    <td>
                      <div className="td-actions">
                        <button className="btn btn-sm" onClick={() => handleTestWhite(ch)}>
                          Test: White
                        </button>
                        <button className="btn btn-sm" onClick={() => handleTestOff(ch)}>
                          Test: Off
                        </button>
                        <button className="btn btn-sm" onClick={() => setModal(ch)}>
                          Edit
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

      {modal !== null && (
        <ChannelModal
          initial={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}
    </>
  )
}
