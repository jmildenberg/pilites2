export interface PixelRange {
  start: number
  end: number
}

export interface Channel {
  id: string
  name: string
  gpioPin: 12 | 13 | 18 | 19
  ledCount: number
  ledType: string
  colorOrder: 'RGB' | 'GRB' | 'RGBW' | 'GRBW'
}

export interface Region {
  id: string
  name: string
  channelId: string
  ranges: PixelRange[]
}

export interface Effect {
  id: string
  type: string
  params: Record<string, unknown>
}

export interface Cue {
  id: string
  name: string
  effectsByRegion: Record<string, Effect>
}

export interface Play {
  id: string
  name: string
  regions: Region[]
  cues: Cue[]
}

export interface PlaySummary {
  id: string
  name: string
}

export interface PreviewStatus {
  isRunning: boolean
  playId: string | null
}

export interface LiveStatus {
  isRunning: boolean
  playId: string | null
  cueId: string | null
  cueName: string | null
  cueIndex: number | null
  isBlackout: boolean
}

export type WsMessage =
  | { type: 'frame'; timestamp: number; channels: Record<string, string[]> }
  | {
      type: 'status'
      playId: string | null
      cueId: string | null
      cueName: string | null
      cueIndex: number | null
      isRunning: boolean
      isBlackout: boolean
    }
  | { type: 'done' }
  | { type: 'error'; message: string }

export interface BackupEntry {
  name: string
  path: string
}
