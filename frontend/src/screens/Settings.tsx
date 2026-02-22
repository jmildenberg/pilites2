import { useEffect, useRef, useState } from 'react'
import {
  applyImport,
  createBackup,
  exportPlay,
  getExportUrl,
  listBackups,
  listPlays,
  restoreBackup,
  uploadImport,
} from '../api'
import { Modal } from '../components/Modal'
import { useToast } from '../context/ToastContext'
import type { BackupEntry, PlaySummary } from '../types'

function BackupModal({
  play,
  onClose,
}: {
  play: PlaySummary
  onClose: () => void
}) {
  const { toastError, toastSuccess } = useToast()
  const [backups, setBackups] = useState<BackupEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [restoring, setRestoring] = useState<string | null>(null)

  useEffect(() => {
    listBackups(play.id)
      .then(setBackups)
      .catch((e) => toastError(e instanceof Error ? e.message : 'Failed to load backups.'))
      .finally(() => setLoading(false))
  }, [play.id])

  async function handleRestore(name: string) {
    if (!confirm(`Restore backup "${name}"? This will overwrite the current play data.`)) return
    setRestoring(name)
    try {
      await restoreBackup(play.id, name)
      toastSuccess('Backup restored.')
      onClose()
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Restore failed.')
    } finally {
      setRestoring(null)
    }
  }

  return (
    <Modal title={`Backups — ${play.name}`} onClose={onClose} footer={<button className="btn" onClick={onClose}>Close</button>}>
      {loading ? (
        <p>Loading…</p>
      ) : backups.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>No backups found.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Backup</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {backups.map((b) => (
              <tr key={b.name}>
                <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{b.name}</td>
                <td>
                  <button
                    className="btn btn-sm"
                    onClick={() => handleRestore(b.name)}
                    disabled={restoring === b.name}
                  >
                    {restoring === b.name ? 'Restoring…' : 'Restore'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Modal>
  )
}

interface PlayRowProps {
  play: PlaySummary
}

function PlayRow({ play }: PlayRowProps) {
  const { toastError, toastSuccess } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showBackups, setShowBackups] = useState(false)
  const [busy, setBusy] = useState(false)

  async function handleExport() {
    setBusy(true)
    try {
      const { name } = await exportPlay(play.id)
      // Trigger download via hidden anchor
      const a = document.createElement('a')
      a.href = getExportUrl(play.id, name)
      a.download = name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      toastSuccess(`Exported "${name}".`)
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Export failed.')
    } finally {
      setBusy(false)
    }
  }

  async function handleImport(file: File) {
    setBusy(true)
    try {
      const { name } = await uploadImport(file)
      await applyImport(play.id, name)
      toastSuccess(`Imported "${file.name}" into "${play.name}".`)
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Import failed.')
    } finally {
      setBusy(false)
    }
  }

  async function handleBackup() {
    setBusy(true)
    try {
      await createBackup(play.id)
      toastSuccess(`Backup created for "${play.name}".`)
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Backup failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <tr>
        <td>{play.name}</td>
        <td>
          <div className="td-actions">
            <button className="btn btn-sm" onClick={handleExport} disabled={busy}>
              Export
            </button>
            <button
              className="btn btn-sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
            >
              Import
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void handleImport(file)
                e.target.value = ''
              }}
            />
            <button className="btn btn-sm" onClick={handleBackup} disabled={busy}>
              Backup
            </button>
            <button className="btn btn-sm" onClick={() => setShowBackups(true)} disabled={busy}>
              Restore…
            </button>
          </div>
        </td>
      </tr>

      {showBackups && (
        <BackupModal play={play} onClose={() => setShowBackups(false)} />
      )}
    </>
  )
}

export function Settings() {
  const { toastError } = useToast()
  const [plays, setPlays] = useState<PlaySummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listPlays()
      .then(setPlays)
      .catch((e) => toastError(e instanceof Error ? e.message : 'Failed to load plays.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <>
      <div className="screen-header">
        <h1 className="screen-title">Settings</h1>
      </div>

      <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: 'var(--text-muted)' }}>
        Data Management
      </h2>

      <div className="card">
        {loading ? (
          <div className="empty-state">Loading…</div>
        ) : plays.length === 0 ? (
          <div className="empty-state">
            <strong>No plays.</strong>
            <p>Create plays to manage their data.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Play</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {plays.map((p) => <PlayRow key={p.id} play={p} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
