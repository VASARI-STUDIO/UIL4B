import { useEffect, useRef, useState } from 'react'
import { clampFps, loopSeconds, previewSourceTime } from '../../utils/mediaEncode'

// The After view of the Video tab: the picture the file will hold, drawn in the
// browser from the source player. Each saved edit has a drawing step here, in
// the encoder's own order: crop, bars, turn, flips, cut-out. Reverse and
// boomerang need no second copy of the clip: the player is asked for the second
// previewSourceTime() names, one frame step at a time, and the frame it lands on
// is drawn.
//
// This is a preview, not the encode: the canvas is held to PREVIEW_MAX on its
// longer side, and a GIF or WebP source (an <img> that hides its frames) plays
// as it is, since its frames cannot be asked for one by one.

const PREVIEW_MAX = 720

const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Draws one frame of `el` onto `cv` the way the saved file will have it. */
function paint(cv, el, v) {
  const ctx = cv.getContext('2d')
  if (!ctx || !el) return
  const { srcSize, plan, turn, flipH, flipV, cut, radius, outside } = v
  const cw = cv.width
  const ch = cv.height
  const fw = plan.frame ? plan.frame.w : srcSize.w
  const fh = plan.frame ? plan.frame.h : srcSize.h
  const swap = turn === 90 || turn === 270
  const s = cw / (swap ? fh : fw)
  ctx.clearRect(0, 0, cw, ch)
  ctx.save()
  // The colour outside the picture (bars, or the corners a cut-out leaves) is
  // laid down first; transparent leaves the canvas clear for the checkerboard.
  if (!outside.transparent && (plan.pad || cut !== 'none')) {
    ctx.fillStyle = outside.colour
    ctx.fillRect(0, 0, cw, ch)
  }
  if (cut !== 'none') {
    const m = Math.min(cw, ch)
    ctx.beginPath()
    if (cut === 'circle') ctx.arc(cw / 2, ch / 2, m / 2, 0, Math.PI * 2)
    else if (cut === 'oval') ctx.ellipse(cw / 2, ch / 2, cw / 2, ch / 2, 0, 0, Math.PI * 2)
    else ctx.roundRect(0, 0, cw, ch, (radius / 100) * m)
    ctx.clip()
  }
  ctx.translate(cw / 2, ch / 2)
  ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1)
  ctx.rotate((turn * Math.PI) / 180)
  ctx.scale(s, s)
  ctx.translate(-fw / 2, -fh / 2)
  const c = plan.crop || { x: 0, y: 0, w: srcSize.w, h: srcSize.h }
  const dx = plan.pad ? plan.pad.x : 0
  const dy = plan.pad ? plan.pad.y : 0
  try { ctx.drawImage(el, c.x, c.y, c.w, c.h, dx, dy, c.w, c.h) } catch { /* no frame decoded yet */ }
  ctx.restore()
}

export default function ResultPreview({
  mediaRef, isImage, srcSize, plan, turn, flipH, flipV, cut, radius, outside,
  outSize, dir, speed, fps, start, len, facts,
}) {
  const canvasRef = useRef(null)
  const live = useRef(null)
  const seek = useRef({ busy: false, want: null })
  const progressRef = useRef(0)
  const [playing, setPlaying] = useState(() => !reducedMotion())
  const [progress, setProgress] = useState(0)

  const k = Math.min(1, PREVIEW_MAX / Math.max(outSize.w, outSize.h))
  const cw = Math.max(2, Math.round(outSize.w * k))
  const ch = Math.max(2, Math.round(outSize.h * k))
  const canPlay = !isImage && len > 0
  const passMs = canPlay ? loopSeconds(len, speed, dir) * 1000 : 0

  // What the drawing steps read, kept current without restarting the loops.
  useEffect(() => {
    live.current = { srcSize, plan, turn, flipH, flipV, cut, radius, outside }
  })

  // The clock: steps through one pass at the output frame rate.
  useEffect(() => {
    if (!playing || !canPlay) return undefined
    const steps = Math.max(1, Math.round((passMs / 1000) * clampFps(fps)))
    const t0 = performance.now() - progressRef.current * passMs
    let raf
    const tick = (now) => {
      const q = Math.floor((((now - t0) / passMs) % 1) * steps) / steps
      if (q !== progressRef.current) {
        progressRef.current = q
        setProgress(q)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, canPlay, passMs, fps])

  // A GIF or WebP draws whatever frame it is showing, as often as the screen does.
  useEffect(() => {
    if (!isImage) return undefined
    let raf
    const loop = () => {
      if (canvasRef.current && live.current) paint(canvasRef.current, mediaRef.current, live.current)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [isImage, mediaRef])

  // A video: ask the player for the second this step of the pass shows, then
  // draw it. A seek in flight is never stacked on; the newest wish is kept.
  useEffect(() => {
    const el = mediaRef.current
    const cv = canvasRef.current
    if (isImage || !el || !cv || !live.current) return undefined
    const s = seek.current
    s.want = start + (len > 0 ? previewSourceTime(progress, len, dir) : 0)
    const go = () => {
      const target = s.want
      s.want = null
      if (target == null) { s.busy = false; return }
      if (Math.abs(el.currentTime - target) < 0.001) {
        s.busy = false
        paint(cv, el, live.current)
        return
      }
      const finish = () => {
        el.removeEventListener('seeked', finish)
        paint(cv, el, live.current)
        go()
      }
      s.busy = true
      el.addEventListener('seeked', finish)
      el.currentTime = target
    }
    if (!s.busy) go()
    return undefined
  }, [progress, isImage, mediaRef, start, len, dir, srcSize, plan, turn, flipH, flipV, cut, radius, outside, cw, ch])

  const scrub = (e) => {
    const q = Number(e.target.value) / 1000
    setPlaying(false)
    progressRef.current = q
    setProgress(q)
  }

  return (
    <div className="fc-preview">
      <div className="fc-stage-view">
        <canvas ref={canvasRef} className="fc-stage-canvas" width={cw} height={ch} role="img" aria-label="Preview of the saved file" />
      </div>
      <div className="fc-scrub-row">
        <button type="button" className="fc-btn" onClick={() => setPlaying((p) => !p)} disabled={!canPlay}>
          {playing && canPlay ? 'Pause' : 'Play'}
        </button>
        <input
          type="range" className="fc-scrub" min="0" max="1000" step="1"
          aria-label="Preview position" disabled={!canPlay}
          value={Math.round(progress * 1000)} onChange={scrub}
        />
      </div>
      <p className="fc-note">{facts}</p>
      {isImage ? (
        <p className="fc-note">This GIF or WebP plays as it is. Speed and direction show in the saved file.</p>
      ) : !canPlay ? (
        <p className="fc-note">This file doesn’t say how long it is, so the preview shows its first frame.</p>
      ) : null}
    </div>
  )
}
