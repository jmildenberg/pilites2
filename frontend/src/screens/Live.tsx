import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getChannels,
  getLiveStatus,
  listPlays,
  liveBlackout,
  liveNext,
  startLive,
  stopLive,
} from '../api'
import { LedStrip } from '../components/LedStrip'
import { Modal } from '../components/Modal'
import { useToast } from '../context/ToastContext'
import type { Channel, LiveStatus, PlaySummary, WsMessage } from '../types'

const WS_URL = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api/live/stream`
const RECONNECT_DELAY_MS = 2000

function StartModal({
  plays,
  onClose,
  onStarted,
}: {
  plays: PlaySummary[]
  onClose: () => void
  onStarted: () => void
}) {
  const { toastError } = useToast()
  const [playId, setPlayId] = useState(plays[0]?.id ?? '')
  const [starting, setStarting] = useState(false)

  async function handleStart() {
    if (!playId) { toastError('Select a play.'); return }
    setStarting(true)
    try {
      await startLive(playId)
      onStarted()
      onClose()
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Start failed.')
    } finally {
      setStarting(false)
    }
  }

  return (
    <Modal
      title="Start Live Session"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleStart} disabled={starting}>
            {starting ? 'Starting…' : 'Start'}
          </button>
        </>
      }
    >
      <div className="form-group">
        <label className="form-label">Play</label>
        <select className="form-select" value={playId} onChange={(e) => setPlayId(e.target.value)}>
          {plays.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
    </Modal>
  )
}

export function Live() {
  const { toastError } = useToast()

  const [plays, setPlays] = useState<PlaySummary[]>([])
  const [channels, setChannels] = useState<Channel[]>([])
  const [status, setStatus] = useState<LiveStatus>({
    isRunning: false,
    playId: null,
    cueId: null,
    cueName: null,
    cueIndex: null,
    isBlackout: false,
  })
  const [frame, setFrame] = useState<Record<string, string[]>>({})
  const [showStart, setShowStart] = useState(false)

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)
  const isRunningRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const connectWs = useCallback(() => {
    if (!mountedRef.current) return
    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data as string) as WsMessage
        if (msg.type === 'frame') {
          setFrame(msg.channels)
        } else if (msg.type === 'status') {
          const s: LiveStatus = {
            isRunning: msg.isRunning,
            playId: msg.playId,
            cueId: msg.cueId,
            cueName: msg.cueName,
            cueIndex: msg.cueIndex,
            isBlackout: msg.isBlackout,
          }
          setStatus(s)
          isRunningRef.current = s.isRunning
          if (!s.isRunning) setFrame({})
        }
      } catch { /* ignore */ }
    }

    ws.onclose = () => {
      if (!mountedRef.current) return
      reconnectTimer.current = setTimeout(() => {
        if (mountedRef.current) connectWs()
      }, RECONNECT_DELAY_MS)
    }

    ws.onerror = () => ws.close()
  }, [])

  // Initial data load + WS connect
  useEffect(() => {
    Promise.all([listPlays(), getChannels(), getLiveStatus()])
      .then(([p, ch, s]) => {
        setPlays(p)
        setChannels(ch)
        setStatus(s)
        isRunningRef.current = s.isRunning
      })
      .catch((e) => toastError(e instanceof Error ? e.message : 'Load failed.'))

    connectWs()
    return () => {
      wsRef.current?.close()
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
    }
  }, [])

  async function handleNext() {
    try {
      await liveNext()
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Advance failed.')
    }
  }

  async function handleBlackout() {
    try {
      await liveBlackout()
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Blackout failed.')
    }
  }

  async function handleStop() {
    if (!confirm('Stop the live session? All lights will turn off.')) return
    try {
      await stopLive()
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Stop failed.')
    }
  }

  const isRunning = status.isRunning
  const isBlackout = status.isBlackout

  return (
    <>
      <div className="screen-header">
        <h1 className="screen-title">Live</h1>
        {!isRunning && (
          <button
            className="btn btn-primary"
            onClick={() => setShowStart(true)}
            disabled={plays.length === 0}
          >
            Start Session
          </button>
        )}
      </div>

      <div className="status-bar">
        <div className="status-bar-item">
          <span className="status-bar-label">Status</span>
          <span className="status-bar-value">
            {isRunning ? (
              isBlackout ? (
                <span className="badge badge-blackout">BLACKOUT</span>
              ) : (
                <span className="badge badge-running">LIVE</span>
              )
            ) : (
              <span style={{ color: 'var(--text-muted)' }}>Stopped</span>
            )}
          </span>
        </div>

        {isRunning && status.cueIndex !== null && (
          <div className="status-bar-item">
            <span className="status-bar-label">Cue</span>
            <span className="status-bar-value">
              {status.cueIndex + 1}{status.cueName ? `: ${status.cueName}` : ''}
            </span>
          </div>
        )}
      </div>

      <div className="led-strip-wrap" style={{ marginBottom: 20 }}>
        {channels.map((ch) => {
          const pixels = frame[ch.id] ?? Array(ch.ledCount).fill('#000000')
          return (
            <div key={ch.id} className="led-strip-row">
              <div className="led-strip-label">{ch.name} ({ch.ledCount} LEDs)</div>
              <LedStrip pixels={pixels} />
            </div>
          )
        })}
      </div>

      <div className="live-controls">
        <button
          className="btn btn-primary btn-lg"
          onClick={handleNext}
          disabled={!isRunning}
          style={{ width: '100%', justifyContent: 'center' }}
        >
          NEXT CUE
        </button>
        <div className="live-controls-row">
          <button
            className={`btn btn-lg${isBlackout ? ' btn-primary' : ''}`}
            onClick={handleBlackout}
            disabled={!isRunning}
          >
            {isBlackout ? '◼ BLACKOUT ACTIVE' : 'BLACKOUT'}
          </button>
          <button
            className="btn btn-danger btn-lg"
            onClick={handleStop}
            disabled={!isRunning}
          >
            STOP
          </button>
        </div>
      </div>

      {showStart && (
        <StartModal
          plays={plays}
          onClose={() => setShowStart(false)}
          onStarted={() => {
            setStatus((s) => ({ ...s, isRunning: true }))
            setShowStart(false)
          }}
        />
      )}
    </>
  )
}
