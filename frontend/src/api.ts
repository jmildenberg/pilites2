import type {
  BackupEntry,
  Channel,
  LiveStatus,
  Play,
  PlaySummary,
  PreviewStatus,
} from './types'

const BASE = '/api'

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      const body = await res.json()
      if (typeof body.detail === 'string') {
        detail = body.detail
      } else if (Array.isArray(body.detail)) {
        // Pydantic 422 validation errors
        detail = body.detail
          .map((e: { loc: string[]; msg: string }) => `${e.loc.slice(1).join('.')}: ${e.msg}`)
          .join('; ')
      }
    } catch {
      // ignore parse error
    }
    throw new ApiError(res.status, detail)
  }
  return res.json() as Promise<T>
}

// ── Channels ────────────────────────────────────────────────────────────────

export function getChannels(): Promise<Channel[]> {
  return request<Channel[]>('/channels')
}

export function upsertChannel(channel: Channel): Promise<void> {
  return request<void>('/channels', {
    method: 'POST',
    body: JSON.stringify(channel),
  })
}

export function testChannelWhite(channelId: string): Promise<void> {
  return request<void>(`/channels/${channelId}/test/white`, { method: 'POST' })
}

export function testChannelOff(channelId: string): Promise<void> {
  return request<void>(`/channels/${channelId}/test/off`, { method: 'POST' })
}

// ── Plays ────────────────────────────────────────────────────────────────────

export function listPlays(): Promise<PlaySummary[]> {
  return request<PlaySummary[]>('/plays')
}

export function getPlay(id: string): Promise<Play> {
  return request<Play>(`/plays/${id}`)
}

export function createPlay(play: Play): Promise<void> {
  return request<void>('/plays', {
    method: 'POST',
    body: JSON.stringify(play),
  })
}

export function updatePlay(play: Play): Promise<void> {
  return request<void>(`/plays/${play.id}`, {
    method: 'PUT',
    body: JSON.stringify(play),
  })
}

export function deletePlay(id: string): Promise<void> {
  return request<void>(`/plays/${id}`, { method: 'DELETE' })
}

export function testRegion(playId: string, regionId: string): Promise<void> {
  return request<void>(`/plays/${playId}/regions/${regionId}/test`, {
    method: 'POST',
  })
}

// ── Preview ──────────────────────────────────────────────────────────────────

export function getPreviewStatus(): Promise<PreviewStatus> {
  return request<PreviewStatus>('/preview/status')
}

export function startPreview(playId: string): Promise<void> {
  return request<void>('/preview', {
    method: 'POST',
    body: JSON.stringify({ playId }),
  })
}

export function previewNext(): Promise<void> {
  return request<void>('/preview/next', { method: 'POST' })
}

export function stopPreview(): Promise<void> {
  return request<void>('/preview/stop', { method: 'POST' })
}

// ── Live ─────────────────────────────────────────────────────────────────────

export function getLiveStatus(): Promise<LiveStatus> {
  return request<LiveStatus>('/live/status')
}

export function startLive(playId: string): Promise<void> {
  return request<void>('/live/start', {
    method: 'POST',
    body: JSON.stringify({ playId }),
  })
}

export function liveNext(): Promise<void> {
  return request<void>('/live/next', { method: 'POST' })
}

export function stopLive(): Promise<void> {
  return request<void>('/live/stop', { method: 'POST' })
}

export function liveBlackout(): Promise<void> {
  return request<void>('/live/blackout', { method: 'POST' })
}

// ── Import / Export / Backup ─────────────────────────────────────────────────

export async function exportPlay(
  playId: string,
): Promise<{ name: string }> {
  return request<{ ok: boolean; name: string; path: string }>(`/plays/${playId}/export`, {
    method: 'POST',
  })
}

export function getExportUrl(playId: string, filename: string): string {
  return `${BASE}/plays/${playId}/export/${filename}`
}

export async function uploadImport(file: File): Promise<{ name: string }> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${BASE}/plays/import/upload`, {
    method: 'POST',
    body: form,
  })
  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      const body = await res.json()
      if (typeof body.detail === 'string') detail = body.detail
    } catch { /* ignore */ }
    throw new ApiError(res.status, detail)
  }
  return res.json()
}

export function applyImport(playId: string, name: string): Promise<void> {
  return request<void>(`/plays/${playId}/import`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export function listBackups(playId: string): Promise<BackupEntry[]> {
  return request<BackupEntry[]>(`/plays/${playId}/backups`)
}

export function createBackup(playId: string): Promise<void> {
  return request<void>(`/plays/${playId}/backup`, { method: 'POST' })
}

export function restoreBackup(playId: string, name: string): Promise<void> {
  return request<void>(`/plays/${playId}/restore`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}
