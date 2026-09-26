import { useCallback, useEffect, useRef, useState } from 'react'
import ColorPickerPop from '../ColorPickerPop'
import DropZone from './DropZone'
import JobStatus from './JobStatus'
import { loadImage, prefersReducedMotion, revealResult, useGatedDownload } from './shared'
import {
  ANIMATION_FORMATS, FPS_MAX, FPS_MIN, MAX_ANIMATION_SIDE, MAX_FRAMES, PLAY_OPTIONS, QUALITY_LEVELS,
  animationSize, clampFps, describeTiming, findFormat, fitContain, formatBytes, frameName,
  framesToAnimationArgs, moveItem,
} from '../../utils/mediaEncode'
import { engineLoaded, getFfmpeg, resetFfmpeg, runJob } from '../../utils/ffmpegEngine'

// ── FRAMES IN, ONE ANIMATED FILE OUT ─────────────────────────────────────────
//
// Founder request, 2026-09-16: an animation builder inside the converter —
// frames in, animated WebP / GIF / APNG / MP4 / WebM out, with reorder, frame
// rate, loop and a real preview.
//
// "A REAL PREVIEW" is taken literally. The stage canvas is painted by the SAME
// drawFrame() the encoder uses to rasterise each frame before handing it to
// ffmpeg — same output size, same contain-fit, same background — at the frame
// rate and play count the file will carry. So what plays on the stage is the
// file's pixels and timing, not an approximation of them. After a build, the
// encoded file itself is shown in the element that will actually play it
// (<img> for the image formats, <video> for MP4/WebM), so the last word is
// always the browser decoding the real bytes.
//
// Everything stays in the browser: frames are drawn to a canvas here and
// encoded by ffmpeg.wasm in a worker. Nothing is uploaded, and no serverless
// function is involved (the project is at its 12-function limit).

const ACCEPT_FRAMES = 'image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/bmp,image/avif,.png,.jpg,.jpeg,.webp,.gif,.svg,.bmp,.avif'
const IMAGE_NAME = /\.(png|jpe?g|webp|gif|svg|bmp|avif)$/i
// The first frame's own width is the default only up to this: a 2880px
// screenshot sequence as a GIF is tens of megabytes and minutes of encoding on
// one core, and the visitor can always type a bigger number.
const DEFAULT_WIDTH_CAP = 800
const byName = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

/** Paint one frame at the output size. The preview AND the encoder call this. */
function drawFrame(ctx, frame, w, h, fill) {
  ctx.clearRect(0, 0, w, h)
  if (fill) {
    ctx.fillStyle = fill
    ctx.fillRect(0, 0, w, h)
  }
  const r = fitContain(frame.w, frame.h, w, h)
  ctx.drawImage(frame.img, r.x, r.y, r.w, r.h)
}

let nextId = 0

export default function AnimationBuilder({ toast }) {
  const gatedDownload = useGatedDownload()
  const [frames, setFrames] = useState([]) // { id, name, url, img, w, h }
  const [selected, setSelected] = useState(0)
  const [cursor, setCursor] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [format, setFormat] = useState('gif')
  const [fps, setFps] = useState(8)
  const [plays, setPlays] = useState(0)
  const [quality, setQuality] = useState('medium')
  const [width, setWidth] = useState(null) // null = the first frame's width, capped
  const [fillBg, setFillBg] = useState(false)
  const [bg, setBg] = useState('#ffffff')
  const [job, setJob] = useState(null)
  const [engineFailed, setEngineFailed] = useState(false)
  const [result, setResult] = useState(null)
  const [announce, setAnnounce] = useState('')
  const [dragFrom, setDragFrom] = useState(null)
  const canvasRef = useRef(null)
  // One token per run. Cancel (and unmount) bumps it, and so does every new run,
  // so a run can only ever act while it is the latest one. A shared boolean,
  // which the next run reset to false, let a cancelled run wake up and encode.
  const runRef = useRef(0)
  const loops = useRef(0)
  // THE RESULT IS BROUGHT INTO VIEW. On a one-column bench the result sits
  // under the frame strip and Build sits in the action bar pinned to the
  // bottom of the screen, so a finished build could otherwise land out of
  // sight with only a toast to say so. Only a NEW result from a build moves
  // the page; removing or reordering frames never does.
  const resultRef = useRef(null)
  const revealNext = useRef(false)
  useEffect(() => {
    if (!result || !revealNext.current) return undefined
    revealNext.current = false
    const raf = requestAnimationFrame(() => revealResult(resultRef.current))
    return () => cancelAnimationFrame(raf)
  }, [result])

  const fmt = findFormat(format)
  const n = frames.length
  const first = frames[0]
  const effWidth = width ?? (first ? Math.min(first.w, DEFAULT_WIDTH_CAP) : 0)
  // The last width that was a real number, so emptying the field and leaving
  // it restores that rather than reading "" as the 16 px floor.
  const lastWidth = useRef(null)
  useEffect(() => { if (typeof effWidth === 'number' && effWidth >= 16) lastWidth.current = effWidth }, [effWidth])
  const size = first ? animationSize(first.w, first.h, effWidth, { evenDims: fmt.evenDims }) : { w: 0, h: 0 }
  // A format with no alpha channel (MP4) always has a ground; the others only
  // when asked for one.
  const fill = !fmt.alpha || fillBg ? bg : null
  const effPlays = fmt.loops ? plays : 0
  const fpsVal = clampFps(fps)
  const busy = !!job

  // What a build depends on. A result built from a different signature is
  // labelled out of date rather than silently presented as the current one.
  const signature = JSON.stringify([frames.map(f => f.id), format, fpsVal, effPlays, quality, size.w, size.h, fill])

  // ── Cleanup: object URLs, and an encode still running in the worker ───────
  const live = useRef({ frames, result, job })
  useEffect(() => { live.current = { frames, result, job } })
  useEffect(() => () => {
    const { frames: fs, result: r, job: j } = live.current
    const urls = new Set(fs.map(f => f.url))
    urls.forEach(u => URL.revokeObjectURL(u))
    if (r?.url) URL.revokeObjectURL(r.url)
    if (j) { runRef.current++; resetFfmpeg() }
  }, [])

  // ── Adding frames ─────────────────────────────────────────────────────────
  const addFiles = useCallback(async (list) => {
    const files = Array.from(list).filter(f => f.type.startsWith('image/') || IMAGE_NAME.test(f.name))
    if (!files.length) { toast('Please choose image files — PNG, JPEG, WebP, GIF, SVG, BMP or AVIF', 'error'); return }
    // One selection arrives in whatever order the OS hands it over; name order
    // with numbers read as numbers ("frame-2" before "frame-10") is the order
    // an exported sequence was written in.
    files.sort((a, b) => byName.compare(a.name, b.name))
    const room = MAX_FRAMES - live.current.frames.length
    if (room <= 0) { toast(`An animation here holds up to ${MAX_FRAMES} frames`, 'error'); return }
    const take = files.slice(0, room)
    const loaded = []
    let failed = 0
    for (const f of take) {
      const url = URL.createObjectURL(f)
      try {
        const img = await loadImage(url)
        // SVGs without an intrinsic size report 0×0; draw those at 512.
        const w = img.naturalWidth || img.width || 512
        const h = img.naturalHeight || img.height || 512
        loaded.push({ id: `fr${nextId++}`, name: f.name, url, img, w, h })
      } catch {
        URL.revokeObjectURL(url)
        failed++
      }
    }
    if (failed) toast(`${failed} file${failed > 1 ? 's' : ''} could not be read as an image`, 'error')
    if (files.length > take.length) toast(`Added ${take.length} — an animation here holds up to ${MAX_FRAMES} frames`, 'info')
    if (!loaded.length) return
    const wasEmpty = live.current.frames.length === 0
    setFrames(prev => [...prev, ...loaded])
    if (wasEmpty) {
      setSelected(0)
      setCursor(0)
      loops.current = 0
      // The preview starts itself — unless the visitor asked for less motion,
      // in which case it waits on the first frame for them to press Play.
      setPlaying(!prefersReducedMotion() && loaded.length > 1)
    }
  }, [toast])

  // ── Playback ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!playing || n < 2) return undefined
    const id = setTimeout(() => {
      const next = cursor + 1
      if (next < n) { setCursor(next); return }
      loops.current += 1
      // A file that plays N times stops on its LAST frame, and so does this.
      if (effPlays > 0 && loops.current >= effPlays) { setPlaying(false); return }
      setCursor(0)
    }, 1000 / fpsVal)
    return () => clearTimeout(id)
  }, [playing, cursor, n, fpsVal, effPlays])

  // Paint the stage whenever what it shows changes.
  useEffect(() => {
    const canvas = canvasRef.current
    const frame = frames[Math.min(cursor, n - 1)]
    if (!canvas || !frame || !size.w) return
    if (canvas.width !== size.w) canvas.width = size.w
    if (canvas.height !== size.h) canvas.height = size.h
    drawFrame(canvas.getContext('2d'), frame, size.w, size.h, fill)
  }, [frames, cursor, n, size.w, size.h, fill])

  const togglePlay = () => {
    if (playing) { setPlaying(false); return }
    // From the last frame, play from the top as a fresh run; from anywhere
    // else, resume where it was paused.
    if (cursor >= n - 1) { setCursor(0); loops.current = 0 }
    else if (effPlays > 0 && loops.current >= effPlays) loops.current = 0
    setPlaying(true)
  }

  const select = (i) => {
    loops.current = 0
    setSelected(i)
    setPlaying(false)
    setCursor(i)
  }

  // ── Editing the sequence ──────────────────────────────────────────────────
  const move = (from, to, how) => {
    if (to < 0 || to >= n || from === to) return
    setFrames(prev => moveItem(prev, from, to))
    setSelected(to)
    setCursor(to)
    setPlaying(false)
    setAnnounce(`Frame moved ${how}, now frame ${to + 1} of ${n}`)
  }

  const duplicate = (i) => {
    if (n >= MAX_FRAMES) { toast(`An animation here holds up to ${MAX_FRAMES} frames`, 'error'); return }
    // The copy shares the source image and its object URL; removal revokes a
    // URL only once no frame uses it.
    setFrames(prev => [...prev.slice(0, i + 1), { ...prev[i], id: `fr${nextId++}` }, ...prev.slice(i + 1)])
    setSelected(i + 1)
    setCursor(i + 1)
    setPlaying(false)
    setAnnounce(`Frame ${i + 1} duplicated as frame ${i + 2}`)
  }

  const remove = (i) => {
    const gone = frames[i]
    const rest = frames.filter((_, k) => k !== i)
    if (!rest.some(f => f.url === gone.url)) URL.revokeObjectURL(gone.url)
    setFrames(rest)
    const nextSel = Math.max(0, Math.min(i, rest.length - 1))
    setSelected(nextSel)
    setCursor(nextSel)
    setPlaying(false)
    setAnnounce(rest.length ? `Frame ${i + 1} removed, ${rest.length} left` : 'All frames removed')
  }

  const clearAll = () => {
    new Set(frames.map(f => f.url)).forEach(u => URL.revokeObjectURL(u))
    if (result?.url) URL.revokeObjectURL(result.url)
    setFrames([])
    setResult(null)
    setPlaying(false)
    setSelected(0)
    setCursor(0)
    setWidth(null)
  }

  const onStripDrop = (e, to) => {
    e.preventDefault()
    if (e.dataTransfer.files?.length) { addFiles(e.dataTransfer.files); setDragFrom(null); return }
    if (dragFrom != null) move(dragFrom, to, 'by dragging')
    setDragFrom(null)
  }

  // ── Build ─────────────────────────────────────────────────────────────────
  const build = async () => {
    if (!n || busy) return
    if (!engineLoaded() && !navigator.onLine) {
      toast('You appear to be offline — the converter engine needs a connection to load', 'error')
      return
    }
    const run = ++runRef.current
    const stale = () => runRef.current !== run
    setEngineFailed(false)
    const { w, h } = size
    const sig = signature
    const target = fmt
    const total = n

    // 1. Rasterise every frame exactly as the stage paints it.
    setJob({ stage: 'prepare', done: 0, total })
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    const inputs = []
    try {
      for (let i = 0; i < total; i++) {
        drawFrame(ctx, frames[i], w, h, fill)
        const blob = await new Promise((resolve, reject) => {
          canvas.toBlob(b => (b ? resolve(b) : reject(new Error('a frame could not be drawn'))), 'image/png')
        })
        inputs.push({ name: frameName(i), data: new Uint8Array(await blob.arrayBuffer()) })
        if (stale()) return
        setJob({ stage: 'prepare', done: i + 1, total })
      }
    } catch (err) {
      setJob(null)
      toast(`Could not build the animation: ${err.message}`, 'error')
      return
    }

    // 2. The engine — a download the first time only.
    let ffmpeg
    try {
      if (!engineLoaded()) setJob({ stage: 'engine', received: 0, bytesTotal: 0 })
      ffmpeg = await getFfmpeg(({ received, total: bytesTotal }) => {
        if (!stale()) setJob({ stage: 'engine', received, bytesTotal })
      })
    } catch (err) {
      if (stale()) return
      setJob(null)
      setEngineFailed(true)
      // A core that fails its pinned SHA-256 was never run; say that, not "offline".
      toast(err?.name === 'IntegrityError'
        ? 'The converter engine that arrived did not match its pinned fingerprint, so it was not run. Try again later, or use the Image tab.'
        : 'Could not load the converter engine. Check your connection or try the Image tab.', 'error')
      return
    }
    if (stale()) return

    // 3. Encode, with progress read from ffmpeg's own status lines.
    setJob({ stage: 'encode', done: 0, total, unit: 'frames' })
    let bytes
    try {
      bytes = await runJob(ffmpeg, {
        inputs,
        args: framesToAnimationArgs({ format: target.id, fps: fpsVal, plays: effPlays, quality }),
        output: `output.${target.ext}`,
        onFrame: (f) => { if (!stale()) setJob({ stage: 'encode', done: f, total, unit: 'frames' }) },
      })
    } catch (err) {
      if (stale()) return
      setJob(null)
      toast(`Could not build the animation: ${err?.message || 'the encoder stopped'}`, 'error')
      return
    }
    if (stale()) return
    const blob = new Blob([bytes], { type: target.mime })
    revealNext.current = true
    setResult(prev => {
      if (prev?.url) URL.revokeObjectURL(prev.url)
      return { url: URL.createObjectURL(blob), blob, bytes: blob.size, w, h, format: target.id, frames: total, fps: fpsVal, sig }
    })
    setJob(null)
    toast(`${target.label} ready`)
  }

  const cancel = () => {
    runRef.current++
    // Terminating the worker is the only way to stop a wasm encode mid-run;
    // the next build fetches a fresh engine from the browser cache.
    resetFfmpeg()
    setJob(null)
    toast('Build cancelled', 'info')
  }

  const resultFmt = result ? findFormat(result.format) : null
  const stale = result && result.sig !== signature

  if (!n) {
    return (
      <DropZone
        accept={ACCEPT_FRAMES}
        multiple
        onFiles={addFiles}
        hint="Drop image frames here or click to browse"
        sub="One image per frame, put in file-name order — PNG, JPEG, WebP, GIF, SVG, BMP, AVIF"
      />
    )
  }

  const sel = Math.min(selected, n - 1)

  return (
    <div className="fc-bench fc-anim">
      <div className="fc-bench-main">
        <section className="fc-stage" aria-label="Preview">
          <div className="fc-stage-view">
            <canvas ref={canvasRef} className="fc-stage-canvas" role="img" aria-label={`Preview at ${size.w}×${size.h}, frame ${Math.min(cursor, n - 1) + 1} of ${n}`} />
          </div>
          <div className="fc-transport">
            <button type="button" className="fc-btn" onClick={togglePlay} disabled={n < 2} aria-pressed={playing}>
              {playing ? 'Pause' : 'Play'}
            </button>
            <span className="fc-transport-pos">Frame {Math.min(cursor, n - 1) + 1} of {n}</span>
          </div>
        </section>

        <section className="fc-framebox" aria-labelledby="fc-frames-h">
          <div className="fc-framebar">
            <h2 className="fc-eyebrow" id="fc-frames-h">Frames</h2>
            <span className="fc-note">Drag to reorder, or select a frame and use the buttons below</span>
          </div>
          <ol className="fc-strip">
            {frames.map((f, i) => (
              <li
                key={f.id}
                className={`fc-strip-item${dragFrom != null && dragFrom !== i ? ' fc-strip-item--target' : ''}`}
                onDragOver={e => e.preventDefault()}
                onDrop={e => onStripDrop(e, i)}
              >
                <button
                  type="button"
                  className="fc-frame"
                  aria-pressed={i === sel}
                  aria-label={`Frame ${i + 1} of ${n}, ${f.name}`}
                  title={f.name}
                  draggable
                  onDragStart={e => { setDragFrom(i); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(i)) }}
                  onDragEnd={() => setDragFrom(null)}
                  onClick={() => select(i)}
                >
                  <img src={f.url} alt="" draggable={false} />
                  <span className="fc-frame-no" aria-hidden="true">{i + 1}</span>
                </button>
              </li>
            ))}
          </ol>
          <div className="fc-frame-actions" role="group" aria-label={`Frame ${sel + 1}`}>
            <span className="fc-frame-sel">Frame {sel + 1}</span>
            <button type="button" className="fc-btn" onClick={() => move(sel, sel - 1, 'earlier')} disabled={busy || sel === 0}>Move earlier</button>
            <button type="button" className="fc-btn" onClick={() => move(sel, sel + 1, 'later')} disabled={busy || sel >= n - 1}>Move later</button>
            <button type="button" className="fc-btn" onClick={() => duplicate(sel)} disabled={busy}>Duplicate</button>
            <button type="button" className="fc-btn" onClick={() => remove(sel)} disabled={busy}>Remove</button>
          </div>
          <p className="fc-sr" aria-live="polite">{announce}</p>
          <DropZone accept={ACCEPT_FRAMES} multiple onFiles={addFiles} compact hint="Add frames" sub="Added after the last frame" />
        </section>

        {result && (
          <section className="fc-result" aria-label="Result" ref={resultRef}>
            <h2 className="fc-eyebrow">Result</h2>
            {resultFmt.kind === 'video' ? (
              <video className="fc-result-media" src={result.url} controls loop muted playsInline aria-label={`${resultFmt.label} result`} />
            ) : (
              <img className="fc-result-media" src={result.url} alt={`${resultFmt.label} result`} />
            )}
            <p className="fc-meta">
              {resultFmt.label} · {result.w}×{result.h} · {formatBytes(result.bytes)} · {describeTiming(result.frames, result.fps)}
            </p>
            {stale && <p className="fc-note fc-note--warn">Settings or frames changed since this was built — build again to include them.</p>}
            <button type="button" className="fc-btn fc-btn--primary" onClick={() => gatedDownload(result.blob, `animation.${resultFmt.ext}`, 'download the animation')}>
              Download {resultFmt.label}
            </button>
          </section>
        )}
      </div>

      <div className="fc-side">
      <aside className="fc-inspector" aria-label="Animation settings">
        <div className="fc-insp-sec">
          <label className="fc-eyebrow" htmlFor="fc-an-format">Output format</label>
          <select id="fc-an-format" className="fc-field" value={format} onChange={e => setFormat(e.target.value)} disabled={busy}>
            {ANIMATION_FORMATS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
          {fmt.id === 'gif' && <p className="fc-note">GIF keeps transparency as on/off only — soft edges come out hard</p>}
          {!fmt.alpha && <p className="fc-note">{fmt.label} has no transparency — clear areas take the background colour</p>}
        </div>

        <div className="fc-insp-sec">
          <div className="fc-pair">
            <div>
              <label className="fc-eyebrow" htmlFor="fc-an-fps">Frame rate (fps)</label>
              <input id="fc-an-fps" className="fc-field fc-field--num" type="number" min={FPS_MIN} max={FPS_MAX} value={fps} disabled={busy}
                onChange={e => setFps(e.target.value === '' ? '' : Math.max(0, Math.min(FPS_MAX, Math.round(+e.target.value))))}
                onBlur={() => setFps(clampFps(fps))} />
            </div>
            <div>
              <label className="fc-eyebrow" htmlFor="fc-an-loop">Loop</label>
              <select id="fc-an-loop" className="fc-field" value={fmt.loops ? plays : 0} onChange={e => setPlays(+e.target.value)} disabled={busy || !fmt.loops}>
                {PLAY_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </div>
          </div>
          {!fmt.loops && <p className="fc-note">Video files store no loop count — the player decides</p>}
          <p className="fc-note">{describeTiming(n, fpsVal)}</p>
        </div>

        <div className="fc-insp-sec">
          <label className="fc-eyebrow" htmlFor="fc-an-width">Width (px)</label>
          <input id="fc-an-width" className="fc-field fc-field--num" type="number" min={16} max={MAX_ANIMATION_SIDE} value={effWidth} disabled={busy}
            onChange={e => setWidth(e.target.value === '' ? '' : Math.max(0, Math.min(MAX_ANIMATION_SIDE, Math.round(+e.target.value))))}
            onBlur={() => setWidth(width === '' || !(Number(width) > 0) ? lastWidth.current : Math.max(16, Number(width)))} />
          <div className="fc-outsize">
            <span className="fc-outsize-k">Output</span>
            <span className="fc-outsize-v"><strong>{size.w}×{size.h}</strong> px — the first frame sets the shape</span>
          </div>
          {fmt.alpha ? (
            <label className="fc-check">
              <input type="checkbox" checked={fillBg} onChange={e => setFillBg(e.target.checked)} disabled={busy} />
              <span>Fill the background</span>
            </label>
          ) : null}
          {fill && (
            <div className="fc-row">
              <ColorPickerPop value={bg} onChange={setBg} disabled={busy} ariaLabel="Animation background colour" triggerClassName="fc-bg-pick" />
              <p className="fc-note">Background</p>
            </div>
          )}
        </div>

        <div className="fc-insp-sec">
          <label className="fc-eyebrow" htmlFor="fc-an-quality">Quality</label>
          <select id="fc-an-quality" className="fc-field" value={quality} onChange={e => setQuality(e.target.value)} disabled={busy || fmt.id === 'apng'}>
            {QUALITY_LEVELS.map(q => <option key={q.id} value={q.id}>{q.label}</option>)}
          </select>
          {fmt.id === 'apng' && <p className="fc-note">APNG is lossless — quality doesn&apos;t apply</p>}
        </div>

      </aside>

      {/* The build bar: under the settings in the side card, and pinned to the
          bottom of the screen on a one-column bench, so Build is in reach from
          the frame strip without scrolling past every setting. */}
      <div className="fc-actionbar fc-actions">
        <div className="fc-actionbar-row">
          <button type="button" className="fc-btn fc-btn--primary fc-btn--wide" onClick={build} disabled={busy}>
            {busy ? 'Building…' : `Build ${fmt.label}`}
          </button>
          <button type="button" className="fc-btn" onClick={clearAll} disabled={busy}>Clear all frames</button>
        </div>
        <JobStatus job={job} engineFailed={engineFailed} onCancel={busy ? cancel : null} />
      </div>
      </div>
    </div>
  )
}
