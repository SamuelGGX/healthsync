import { useEffect, useRef } from 'react'

// ECG (PQRST) waveform template — one full cardiac cycle, normalized 0-1
const ECG = [
  [0.00, 0.00], [0.08, 0.00],
  [0.11, 0.07], [0.14, 0.13], [0.17, 0.07],   // P wave
  [0.20, 0.00],
  [0.22, -0.08], [0.25, 1.00], [0.28, -0.22], [0.31, 0.00],  // QRS
  [0.34, 0.00], [0.38, 0.11], [0.43, 0.18], [0.48, 0.10], [0.53, 0.00], // T wave
  [1.00, 0.00],
]

function sampleECG(t) {
  t = ((t % 1) + 1) % 1
  for (let i = 1; i < ECG.length; i++) {
    if (t <= ECG[i][0]) {
      const [t0, y0] = ECG[i - 1]
      const [t1, y1] = ECG[i]
      return y0 + (y1 - y0) * ((t - t0) / (t1 - t0))
    }
  }
  return 0
}

// Photoplethysmography (SpO2 / pulse oximetry) waveform
function sampleSPO2(t) {
  t = ((t % 1) + 1) % 1
  if (t < 0.22) return Math.pow(Math.sin(Math.PI * t / 0.44), 1.4) * 0.92
  if (t < 0.38) return 0.92 - ((t - 0.22) / 0.16) * 0.28
  if (t < 0.50) {
    const d = (t - 0.38) / 0.12
    return 0.64 + Math.sin(Math.PI * d) * 0.14  // dicrotic notch
  }
  return 0.64 * Math.pow(1 - (t - 0.50) / 0.50, 1.6)
}

export default function WaveformCanvas({ type = 'ecg', value, width = 260, height = 68, color, glowColor, flat = false }) {
  const canvasRef = useRef(null)
  const valueRef  = useRef(value)
  const flatRef   = useRef(flat)
  const stateRef  = useRef(null)

  useEffect(() => { valueRef.current = value }, [value])

  // When switching to flat, zero the buffer immediately so the line appears at once
  useEffect(() => {
    flatRef.current = flat
    if (flat && stateRef.current) stateRef.current.buf.fill(0)
  }, [flat])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width  = width  * dpr
    canvas.height = height * dpr
    canvas.style.width  = `${width}px`
    canvas.style.height = `${height}px`
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)

    // Init state (keep between rerenders so waveform doesn't jump)
    if (!stateRef.current) {
      stateRef.current = {
        buf:    new Float32Array(width),
        phase:  Math.random(),
        lastTs: 0,
      }
    }
    const s = stateRef.current

    let rafId

    const tick = (ts) => {
      if (!s.lastTs) s.lastTs = ts
      const dt = Math.min((ts - s.lastTs) / 1000, 0.05)
      s.lastTs = ts

      const isFlat  = flatRef.current
      const v       = valueRef.current ?? (type === 'ecg' ? 72 : 98)
      const rate    = type === 'ecg' ? v / 60 : (v / 100) * 0.9
      const pxCycle = width * 0.38
      const speed   = pxCycle * rate
      const steps   = Math.max(1, Math.round(dt * speed))

      for (let i = 0; i < steps; i++) {
        s.phase += 1 / pxCycle
        const y = isFlat ? 0 : (type === 'ecg' ? sampleECG(s.phase) : sampleSPO2(s.phase))
        s.buf.copyWithin(0, 1)
        s.buf[width - 1] = y
      }

      // Background
      ctx.fillStyle = '#020817'
      ctx.fillRect(0, 0, width, height)

      // Subtle grid
      ctx.strokeStyle = '#0f172a'
      ctx.lineWidth = 0.5
      for (let gx = 30; gx < width; gx += 30) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, height); ctx.stroke()
      }
      ctx.beginPath(); ctx.moveTo(0, height * 0.5); ctx.lineTo(width, height * 0.5); ctx.stroke()

      // Waveform line — dim and no glow when flat (no patient signal)
      ctx.beginPath()
      for (let x = 0; x < width; x++) {
        const py = height * 0.58 - s.buf[x] * (height * 0.44)
        if (x === 0) ctx.moveTo(x, py)
        else ctx.lineTo(x, py)
      }
      ctx.strokeStyle  = isFlat ? '#334155' : color
      ctx.lineWidth    = 1.8
      ctx.shadowBlur   = isFlat ? 0 : 12
      ctx.shadowColor  = isFlat ? 'transparent' : glowColor
      ctx.stroke()
      ctx.shadowBlur = 0

      // Bright "head" — only when there is a real signal
      if (!isFlat) {
        ctx.beginPath()
        for (let x = Math.max(0, width - 8); x < width; x++) {
          const py = height * 0.58 - s.buf[x] * (height * 0.44)
          if (x === Math.max(0, width - 8)) ctx.moveTo(x, py)
          else ctx.lineTo(x, py)
        }
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth   = 1.8
        ctx.shadowBlur  = 6
        ctx.shadowColor = '#ffffff'
        ctx.stroke()
        ctx.shadowBlur  = 0
      }

      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(rafId)
      s.lastTs = 0  // reset timer so next mount resumes cleanly
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, width, height, color, glowColor])

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', imageRendering: 'pixelated' }}
    />
  )
}
