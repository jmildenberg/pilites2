import type { Channel, Region } from '../types'

export const REGION_SWATCHES = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#06b6d4',
  '#6366f1',
  '#a855f7',
  '#ec4899',
]

export function getRegionColor(region: Region, index: number): string {
  return region.uiColor ?? REGION_SWATCHES[index % REGION_SWATCHES.length]
}

interface Segment {
  start: number
  end: number
  region: Region | null
  regionIndex: number
}

function buildSegments(ledCount: number, regions: Region[]): Segment[] {
  const spans: { start: number; end: number; region: Region; regionIndex: number }[] = []
  regions.forEach((region, regionIndex) => {
    for (const range of region.ranges) {
      const end = Math.min(range.end, ledCount - 1)
      if (range.start <= end) {
        spans.push({ start: range.start, end, region, regionIndex })
      }
    }
  })
  spans.sort((a, b) => a.start - b.start)

  const segments: Segment[] = []
  let cursor = 0
  for (const span of spans) {
    if (span.start > cursor) {
      segments.push({ start: cursor, end: span.start - 1, region: null, regionIndex: -1 })
    }
    segments.push({ start: span.start, end: span.end, region: span.region, regionIndex: span.regionIndex })
    cursor = span.end + 1
  }
  if (cursor < ledCount) {
    segments.push({ start: cursor, end: ledCount - 1, region: null, regionIndex: -1 })
  }
  return segments
}

interface ChannelStripProps {
  channel: Channel
  regions: Region[]
  selectedRegionId: string | null
  onSelect: (regionId: string) => void
}

export function ChannelStrip({ channel, regions, selectedRegionId, onSelect }: ChannelStripProps) {
  const total = channel.ledCount
  const segments = buildSegments(total, regions)

  const tickPositions = [0, 0.25, 0.5, 0.75, 1.0].map((pct) =>
    Math.round(pct * (total - 1))
  )

  return (
    <div className="channel-strip-wrap">
      <div className="channel-strip-label">{channel.name}</div>
      <div className="channel-strip-bar">
        {segments.map((seg, i) => {
          const width = ((seg.end - seg.start + 1) / total) * 100
          const isSelected = seg.region !== null && seg.region.id === selectedRegionId
          const color = seg.region ? getRegionColor(seg.region, seg.regionIndex) : undefined
          return (
            <div
              key={i}
              className={[
                'strip-segment',
                seg.region ? 'strip-segment-region' : '',
                isSelected ? 'strip-segment-selected' : '',
              ].filter(Boolean).join(' ')}
              style={{ width: `${width}%`, backgroundColor: color }}
              onClick={() => { if (seg.region) onSelect(seg.region.id) }}
              title={
                seg.region
                  ? `${seg.region.name} (${seg.start}–${seg.end})`
                  : `LEDs ${seg.start}–${seg.end} (unassigned)`
              }
            />
          )
        })}
      </div>
      <div className="channel-strip-ruler">
        {tickPositions.map((tick) => (
          <span
            key={tick}
            className="ruler-tick"
            style={{ left: `${total > 1 ? (tick / (total - 1)) * 100 : 0}%` }}
          >
            {tick}
          </span>
        ))}
      </div>
    </div>
  )
}
