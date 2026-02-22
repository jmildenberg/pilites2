import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  getChannels,
  getPreviewStatus,
  listPlays,
  previewNext,
  startPreview,
  stopPreview,
} from '../api'
import { LedStrip } from '../components/LedStrip'
import { useToast } from '../context/ToastContext'
import type { Channel, PlaySummary, WsMessage } from '../types'

const WS_URL = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api/preview/stream`
const RECONNECT_DELAY_MS = 2000

export function Preview() {
  const { toastError } = useToast()
  const [searchParams] = useSearchParams()
  const initialPlayId = searchParams.get('playId')

  const [plays, setPlays] = useState<PlaySummary[]>([])
  const [channels, setChannels] = useState<Channel[]>([])
  const [selectedPlayId, setSelectedPlayId] = useState(initialPlayId ?? '')
  const [isRunning, setIsRunning] = useState(false)
  const [cueIndex, setCueIndex] = useState<number>(0)
  const [cueCount, setCueCount] = useState<number>(0)
  const [cueName, setCueName] = useState<string>('')

  // frame state: channelId → pixels
  const [frame, setFrame] = useState<Record<string, string[]>>({})

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)

  // Load plays and channels once
  useEffect(() => {
    Promise.all([listPlays(), getChannels(), getPreviewStatus()])
      .then(([p, ch, status]) => {
        setPlays(p)
        setChannels(ch)
        if (status.isRunning) {
          setIsRunning(true)
          if (status.playId && !selectedPlayId) setSelectedPlayId(status.playId)
        }
      })
      .catch((e) => toastError(e instanceof Error ? e.message : 'Load failed.'))
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
        } else if (msg.type === 'done') {
          setIsRunning(false)
          setCueIndex(0)
          setCueName('')
        } else if (msg.type === 'error') {
          toastError(`Preview error: ${msg.message}`)
          setIsRunning(false)
        }
      } catch { /* ignore */ }
    }

    ws.onclose = () => {
      if (!mountedRef.current) return
      // Attempt reconnect if session is still running
      reconnectTimer.current = setTimeout(() => {
        if (mountedRef.current && isRunning) connectWs()
      }, RECONNECT_DELAY_MS)
    }

    ws.onerror = () => ws.close()
  }, [isRunning, toastError])

  // Connect WebSocket when running
  useEffect(() => {
    if (isRunning) {
      connectWs()
    }
    return () => {
      wsRef.current?.close()
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
    }
  }, [isRunning])

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  // When a play is selected, look up its cue count
  useEffect(() => {
    if (!selectedPlayId) return
    const play = plays.find((p) => p.id === selectedPlayId)
    if (!play) return
    // We don't load the full play here; cue count is unknown until session starts.
    // Track cue index via frame messages instead.
    setCueCount(0)
    setCueIndex(0)
    setCueName('')
  }, [selectedPlayId, plays])

  async function handleStart() {
    if (!selectedPlayId) { toastError('Select a play first.'); return }
    try {
      await startPreview(selectedPlayId)
      setIsRunning(true)
      setCueIndex(0)
      setCueName('')
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Start failed.')
    }
  }

  async function handleNext() {
    try {
      await previewNext()
      setCueIndex((i) => i + 1)
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Advance failed.')
    }
  }

  async function handleStop() {
    try {
      await stopPreview()
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Stop failed.')
    }
    setIsRunning(false)
    setFrame({})
    setCueIndex(0)
    setCueName('')
  }

  const selectedPlay = plays.find((p) => p.id === selectedPlayId)

  return (
    <>
      <div className="screen-header">
        <h1 className="screen-title">Preview</h1>
      </div>

      <div className="status-bar">
        <div className="status-bar-item">
          <span className="status-bar-label">Play</span>
          {isRunning ? (
            <span className="status-bar-value">{selectedPlay?.name ?? selectedPlayId}</span>
          ) : (
            <select
              className="form-select"
              style={{ width: 200 }}
              value={selectedPlayId}
              onChange={(e) => setSelectedPlayId(e.target.value)}
              disabled={isRunning}
            >
              <option value="">— Select a play —</option>
              {plays.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
        </div>

        {isRunning && (
          <div className="status-bar-item">
            <span className="status-bar-label">Cue</span>
            <span className="status-bar-value">
              {cueCount > 0 ? `${cueIndex + 1} of ${cueCount}` : cueIndex + 1}
              {cueName ? `: ${cueName}` : ''}
            </span>
          </div>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {!isRunning ? (
            <button className="btn btn-primary" onClick={handleStart} disabled={!selectedPlayId}>
              ▶ Start Preview
            </button>
          ) : (
            <>
              <button className="btn" onClick={handleNext}>
                Next ▶
              </button>
              <button className="btn btn-danger" onClick={handleStop}>
                Stop
              </button>
            </>
          )}
        </div>
      </div>

      {channels.length > 0 ? (
        <div className="led-strip-wrap">
          {channels.map((ch) => {
            const pixels = frame[ch.id] ?? Array(ch.ledCount).fill('#000000')
            return (
              <div key={ch.id} className="led-strip-row">
                <div className="led-strip-label">
                  {ch.name} ({ch.ledCount} LEDs)
                </div>
                <LedStrip pixels={pixels} />
              </div>
            )
          })}
        </div>
      ) : (
        <div className="empty-state">
          <strong>No channels configured.</strong>
          <p>Configure channels first to see the LED strip visualizer.</p>
        </div>
      )}
    </>
  )
}
