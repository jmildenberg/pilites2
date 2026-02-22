import { useEffect, useRef } from 'react'

interface LedStripProps {
  pixels: string[]
  height?: number
}

export function LedStrip({ pixels, height = 28 }: LedStripProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const dpr = window.devicePixelRatio || 1
    const w = container.clientWidth
    canvas.width = w * dpr
    canvas.height = height * dpr
    canvas.style.height = `${height}px`

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)

    if (pixels.length === 0) {
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, w, height)
      return
    }

    const pw = w / pixels.length
    for (let i = 0; i < pixels.length; i++) {
      ctx.fillStyle = pixels[i] ?? '#000000'
      ctx.fillRect(i * pw, 0, pw + 0.5, height)
    }
  }, [pixels, height])

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <canvas ref={canvasRef} className="led-strip-canvas" style={{ height }} />
    </div>
  )
}
