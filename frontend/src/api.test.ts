import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  applyImport,
  createBackup,
  deletePlay,
  getChannels,
  getPlay,
  getLiveStatus,
  getPreviewStatus,
  listBackups,
  listPlays,
  liveBlackout,
  liveNext,
  previewNext,
  startLive,
  startPreview,
  stopLive,
  stopPreview,
  testChannelOff,
  testChannelWhite,
  upsertChannel,
  updatePlay,
} from './api'
import type { Channel, Play } from './types'

// ── Fetch mock helpers ────────────────────────────────────────────────────────

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function respondOk(body: unknown) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve(body),
  })
}

function respondError(status: number, detail: unknown) {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status,
    json: () => Promise.resolve({ detail }),
  })
}

function respondNetworkFailure() {
  mockFetch.mockRejectedValueOnce(new Error('Network error'))
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const channel: Channel = {
  id: 'channel-1',
  name: 'Main Strand',
  gpioPin: 18,
  ledCount: 150,
  ledType: 'ws281x',
  colorOrder: 'RGB',
}

const play: Play = {
  id: 'play-1',
  name: 'Main Stage',
  regions: [],
  cues: [],
}

beforeEach(() => mockFetch.mockReset())
afterEach(() => vi.restoreAllMocks())

// ── Request URL and method ────────────────────────────────────────────────────

describe('request URLs', () => {
  it('getChannels calls GET /api/channels', async () => {
    respondOk([channel])
    await getChannels()
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/channels',
      expect.objectContaining({ headers: expect.objectContaining({ 'Content-Type': 'application/json' }) }),
    )
  })

  it('upsertChannel calls POST /api/channels with body', async () => {
    respondOk({ ok: true })
    await upsertChannel(channel)
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/channels')
    expect(opts.method).toBe('POST')
    expect(JSON.parse(opts.body as string)).toEqual(channel)
  })

  it('getPlay calls GET /api/plays/{id}', async () => {
    respondOk(play)
    await getPlay('play-1')
    const [url] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/plays/play-1')
  })

  it('deletePlay calls DELETE /api/plays/{id}', async () => {
    respondOk({ ok: true })
    await deletePlay('play-1')
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/plays/play-1')
    expect(opts.method).toBe('DELETE')
  })

  it('startPreview sends playId in body', async () => {
    respondOk({ ok: true })
    await startPreview('play-1')
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/preview')
    expect(opts.method).toBe('POST')
    expect(JSON.parse(opts.body as string)).toEqual({ playId: 'play-1' })
  })

  it('startLive sends playId in body', async () => {
    respondOk({ ok: true })
    await startLive('play-1')
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/live/start')
    expect(opts.method).toBe('POST')
    expect(JSON.parse(opts.body as string)).toEqual({ playId: 'play-1' })
  })

  it('applyImport sends name in body', async () => {
    respondOk({ ok: true })
    await applyImport('play-1', 'backup.json')
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/plays/play-1/import')
    expect(JSON.parse(opts.body as string)).toEqual({ name: 'backup.json' })
  })
})

// ── Return values ─────────────────────────────────────────────────────────────

describe('return values', () => {
  it('getChannels returns the channel array', async () => {
    respondOk([channel])
    expect(await getChannels()).toEqual([channel])
  })

  it('listPlays returns play summaries', async () => {
    respondOk([{ id: 'play-1', name: 'Main Stage' }])
    const result = await listPlays()
    expect(result).toEqual([{ id: 'play-1', name: 'Main Stage' }])
  })

  it('getPlay returns the full play', async () => {
    respondOk(play)
    expect(await getPlay('play-1')).toEqual(play)
  })

  it('getPreviewStatus returns status object', async () => {
    respondOk({ isRunning: true, playId: 'play-1' })
    const s = await getPreviewStatus()
    expect(s.isRunning).toBe(true)
    expect(s.playId).toBe('play-1')
  })

  it('getLiveStatus returns full status', async () => {
    respondOk({ isRunning: true, playId: 'play-1', cueId: 'cue-1', cueName: 'Intro', cueIndex: 0, isBlackout: false })
    const s = await getLiveStatus()
    expect(s.isRunning).toBe(true)
    expect(s.cueIndex).toBe(0)
    expect(s.isBlackout).toBe(false)
  })

  it('listBackups returns backup entries', async () => {
    const entries = [{ name: 'play-1-123.json', path: '/var/lib/pilites/backups/play-1/play-1-123.json' }]
    respondOk(entries)
    expect(await listBackups('play-1')).toEqual(entries)
  })
})

// ── Simple POST endpoints ─────────────────────────────────────────────────────

describe('simple POST endpoints', () => {
  it.each([
    ['previewNext', previewNext, '/api/preview/next'],
    ['stopPreview', stopPreview, '/api/preview/stop'],
    ['liveNext', liveNext, '/api/live/next'],
    ['stopLive', stopLive, '/api/live/stop'],
    ['liveBlackout', liveBlackout, '/api/live/blackout'],
  ])('%s calls POST %s', async (_name, fn, url) => {
    respondOk({ ok: true })
    await fn()
    const [calledUrl, opts] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(calledUrl).toBe(url)
    expect(opts.method).toBe('POST')
  })

  it('testChannelWhite calls POST /api/channels/{id}/test/white', async () => {
    respondOk({ ok: true })
    await testChannelWhite('channel-1')
    const [url] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/channels/channel-1/test/white')
  })

  it('testChannelOff calls POST /api/channels/{id}/test/off', async () => {
    respondOk({ ok: true })
    await testChannelOff('channel-1')
    const [url] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/channels/channel-1/test/off')
  })

  it('createBackup calls POST /api/plays/{id}/backup', async () => {
    respondOk({ ok: true })
    await createBackup('play-1')
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/plays/play-1/backup')
    expect(opts.method).toBe('POST')
  })

  it('updatePlay calls PUT /api/plays/{id}', async () => {
    respondOk({ ok: true })
    await updatePlay(play)
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/plays/play-1')
    expect(opts.method).toBe('PUT')
    expect(JSON.parse(opts.body as string)).toEqual(play)
  })
})

// ── Error handling ────────────────────────────────────────────────────────────

describe('error handling', () => {
  it('throws with detail string on 404', async () => {
    respondError(404, "Play 'play-x' not found.")
    await expect(getPlay('play-x')).rejects.toThrow("Play 'play-x' not found.")
  })

  it('throws with detail string on 409', async () => {
    respondError(409, 'A live session is already running.')
    await expect(startLive('play-1')).rejects.toThrow('A live session is already running.')
  })

  it('formats Pydantic 422 validation errors as field: message', async () => {
    respondError(422, [
      { loc: ['body', 'ledCount'], msg: 'value is not a valid integer', type: 'type_error.integer' },
      { loc: ['body', 'gpioPin'], msg: 'value is not allowed', type: 'value_error' },
    ])
    await expect(upsertChannel(channel)).rejects.toThrow(
      'ledCount: value is not a valid integer; gpioPin: value is not allowed',
    )
  })

  it('falls back to "HTTP {status}" when detail is missing', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    })
    await expect(getChannels()).rejects.toThrow('HTTP 500')
  })

  it('propagates network errors', async () => {
    respondNetworkFailure()
    await expect(getChannels()).rejects.toThrow('Network error')
  })
})
