import { useCallback, useEffect, useId, useRef, useState } from 'react'
import useExportGate from '../hooks/useExportGate'
import { useAppearance } from '../contexts/AppearanceContext'
import {
  INPUT_FORMATS,
  LARGE_MODEL_BYTES,
  MAX_MODEL_BYTES,
  OUTPUT_FORMATS,
  acceptAttribute,
  describeSignatureProblem,
  describeSizeLimit,
  formatBytes,
  inputLabels,
  listForProse,
  outputFormat,
  outputLabels,
  pickPrimary,
  signatureProblem,
} from '../utils/meshFormats'
import '../styles/pages/three-d-viewer.css'

// ── /create/3d-viewer ────────────────────────────────────────────────────────
//
// View a 3D model and write it out in another format, entirely in this tab: a
// file is read with the File API, drawn with three.js and exported to a Blob.
// Nothing is uploaded. The one network request a model can cause is the CAD
// engine for STEP and IGES (see src/utils/cadEngine.js).
//
// THE ENGINE ARRIVES LATE, ON PURPOSE. three.js and every loader live in
// src/utils/meshEngine.js behind the ONE dynamic import below, so opening this
// route costs the page and its stylesheet and nothing else. It is fetched when
// a file is brought, or a little earlier when the pointer or focus reaches the
// drop area, which hides most of the wait behind the file picker.
// tests/unit/three-d-viewer.test.js builds the app and fails if three.js
// reaches the entry chunk or this page's chunk.
//
// LAYOUT is the app file's tool grid (UIL4B App.dc.html, `[data-toolgrid]`):
// the stage and a 336px panel beside it, the panel dropping under the stage
// below 900px. Mobbin references for the two halves:
//   Magnific's model view — canvas left, "Model information" (size, triangles,
//   vertices, meshes, materials, extent) and the download beside it:
//     https://mobbin.com/screens/e653b264-0fce-4f34-a1d9-79623c3f025b
//   Copilot's 3D result — the solid / wireframe switch as one small segmented
//   control centred under the model, and nothing else floating on the canvas:
//     https://mobbin.com/screens/81380eb5-13d0-48dc-8726-fc49e62d638f
//   Asana's and Fiverr's upload states — a glyph, one line, the accepted
//   formats and the size limit in small type, and a single button:
//     https://mobbin.com/screens/e7f3cfea-d013-4586-b7fc-6a8a992249c0
//     https://mobbin.com/screens/9feef30c-b0e1-4cde-ac17-6d149f641206

let enginePromise = null
let engineModule = null
function getEngine() {
  if (!enginePromise) {
    enginePromise = import('../utils/meshEngine')
      .then((m) => { engineModule = m; return m })
      .catch((err) => { enginePromise = null; throw err })
  }
  return enginePromise
}

// THE RAW DOWNLOAD. Only ever called after `requireExportAccount` resolves
// true — producing a file needs a free account (founder decision 2026-09-15,
// src/hooks/useExportGate.js); viewing and converting never do.
function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const baseName = (name) => String(name || 'model').replace(/\.[^.]+$/, '') || 'model'

const fmt3 = (n) => {
  if (!Number.isFinite(n)) return '—'
  const abs = Math.abs(n)
  const digits = abs >= 100 ? 0 : abs >= 10 ? 1 : abs >= 1 ? 2 : 3
  // Number() drops the trailing zeros toFixed() pads with: 2.50 -> 2.5.
  return String(Number(n.toFixed(digits)))
}

const count = (n, one, many = one + 's') => `${n.toLocaleString('en')} ${n === 1 ? one : many}`

/** The text alternative for the canvas: what a sighted visitor learns from the panel. */
function describeModel(model) {
  const { stats, name, format } = model
  const unit = format.unit || 'file units'
  const shape = stats.points > 0 && stats.triangles === 0
    ? count(stats.points, 'point')
    : `${count(stats.triangles, 'triangle')} in ${count(stats.meshes, 'mesh', 'meshes')}`
  return `${name}, ${format.label}: ${shape}, ${fmt3(stats.size[0])} by ${fmt3(stats.size[1])} by ${fmt3(stats.size[2])} ${unit}.`
}

const STAGE_LABEL = {
  engine: 'Fetching the CAD engine',
  reading: 'Reading the file',
  parsing: 'Building the model',
  viewer: 'Loading the viewer',
}

const CAD_LABELS = listForProse(INPUT_FORMATS.filter((f) => f.engine === 'cad').map((f) => f.label))

// ── Glyphs: one stroke, the nav's weight ─────────────────────────────────────
const Svg = ({ children }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{children}</svg>
)
const CubeGlyph = () => <Svg><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" /><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" /></Svg>
const WireGlyph = () => <Svg><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" /><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5M4 7.5l8 13.5M20 7.5l-8 13.5" /></Svg>
const FitGlyph = () => <Svg><path d="M4 9V5a1 1 0 011-1h4M15 4h4a1 1 0 011 1v4M20 15v4a1 1 0 01-1 1h-4M9 20H5a1 1 0 01-1-1v-4" /></Svg>
const TurnGlyph = () => <Svg><path d="M20 12a8 8 0 1 1-2.35-5.65" /><path d="M20 4v4.5h-4.5" /></Svg>

// ── The page ─────────────────────────────────────────────────────────────────
export default function ThreeDViewer({ toast }) {
  const requireExportAccount = useExportGate()
  const { reducedMotion } = useAppearance() || {}
  const uid = useId()
  const hintId = `${uid}-hint`
  const summaryId = `${uid}-summary`

  const frameRef = useRef(null)
  const canvasRef = useRef(null)
  const inputRef = useRef(null)
  const viewerRef = useRef(null)
  const abortRef = useRef(null)
  // Bumped whenever a new model starts loading. A conversion that finishes
  // after that belongs to the model that was replaced, so it is dropped rather
  // than shown as a download beside the new one.
  const modelGenRef = useRef(0)

  // busy: null | { stage, name, loaded?, total?, cad }
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState(null)
  const [model, setModel] = useState(null) // { name, bytes, format, stats, warnings }
  const [over, setOver] = useState(false)
  const [wire, setWire] = useState(false)
  const [spin, setSpin] = useState(false)
  const [outId, setOutId] = useState('glb')
  const [output, setOutput] = useState(null) // { blob, name, bytes, format }
  const [converting, setConverting] = useState(false)
  const [announce, setAnnounce] = useState('')

  // One renderer per mount; the WebGL context goes back on unmount.
  useEffect(() => () => {
    abortRef.current?.abort()
    viewerRef.current?.dispose()
    viewerRef.current = null
  }, [])

  // Reduced motion wins over the turntable, in whichever spelling the visitor
  // set it (Settings or the OS — AppearanceContext resolves both).
  useEffect(() => {
    viewerRef.current?.setAutoRotate(spin && !reducedMotion)
    viewerRef.current?.setReducedMotion(!!reducedMotion)
  }, [spin, reducedMotion])

  const prefetch = useCallback(() => { getEngine().catch(() => {}) }, [])

  const onFiles = useCallback(async (fileList) => {
    const files = Array.from(fileList || [])
    if (!files.length) return
    const drop = pickPrimary(files)
    if (!drop) {
      const shown = files.length === 1 ? files[0].name : `None of those ${files.length} files`
      setError(`${shown} ${files.length === 1 ? 'is not' : 'is'} a format this viewer reads. It opens ${listForProse(inputLabels())}.`)
      return
    }
    const { primary, format } = drop
    if (primary.size > MAX_MODEL_BYTES) {
      setError(`${primary.name} is ${formatBytes(primary.size)}. The limit is ${describeSizeLimit()}: the whole file is parsed in this tab's memory, and past that a phone or a small laptop runs out of it.`)
      return
    }

    // A file that is plainly not what its extension says is refused HERE, from
    // its first megabyte and the small meshFormats module — before the 808 kB
    // three.js engine is fetched. It used to wait on that download, so on a
    // slow connection a wrong file sat on "Loading the viewer" for seconds
    // before being told it was wrong (CI run 35849298083: over 5 s).
    // meshEngine.loadModel still runs the same check on the whole read.
    let head = null
    try {
      head = new Uint8Array(await primary.slice(0, 1 << 20).arrayBuffer())
    } catch { /* unreadable here; loadModel reports it */ }
    const problem = head && signatureProblem(format.id, head, primary.size)
    if (problem) {
      setError(describeSignatureProblem(primary.name, format, problem))
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    modelGenRef.current++
    setError(null)
    setOutput(null)
    setAnnounce('')
    setBusy({ stage: 'viewer', name: primary.name, cad: format.engine === 'cad' })
    let engine
    try {
      engine = await getEngine()
      if (controller.signal.aborted) return
      if (!viewerRef.current && canvasRef.current && frameRef.current) {
        viewerRef.current = engine.createViewer(canvasRef.current, frameRef.current)
        viewerRef.current.setAutoRotate(spin && !reducedMotion)
        viewerRef.current.setReducedMotion(!!reducedMotion)
      }
      const { object, warnings, revoke } = await engine.loadModel(drop, {
        signal: controller.signal,
        onStage: (s) => setBusy((prev) => (prev ? { ...prev, ...s } : prev)),
      })
      if (controller.signal.aborted) { engine.disposeObject(object); revoke(); return }
      const stats = viewerRef.current.setModel(object, revoke)
      viewerRef.current.setWireframe(wire)
      if (primary.size > LARGE_MODEL_BYTES) warnings.unshift(`At ${formatBytes(primary.size)} this is a large file; orbiting may be slow on a phone.`)
      if (drop.ignored.length) warnings.push(`${count(drop.ignored.length, 'other file')} in the same drop ${drop.ignored.length === 1 ? 'was' : 'were'} not opened: ${drop.ignored.map((f) => f.name).slice(0, 3).join(', ')}${drop.ignored.length > 3 ? ', …' : ''}.`)
      const next = { name: primary.name, bytes: primary.size, format, stats, warnings }
      setModel(next)
      // A point cloud cannot be written as STL or 3MF; move off a choice the
      // panel is about to disable rather than leave it selected and dead.
      if (stats.points > 0 && stats.triangles === 0 && !outputFormat(outId)?.points) setOutId('glb')
      setAnnounce(`Loaded ${describeModel(next)}`)
    } catch (err) {
      if (err?.name === 'AbortError' || controller.signal.aborted) return
      const describe = engine?.describeLoadError || engineModule?.describeLoadError
      const message = describe
        ? describe(err, format, primary.name)
        : 'The viewer could not be downloaded. Check the connection and choose the file again.'
      setError(message || `${primary.name} could not be read.`)
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null
        setBusy(null)
      }
    }
  }, [spin, reducedMotion, wire, outId])

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setBusy(null)
    setAnnounce('Loading cancelled.')
  }, [])

  const choose = useCallback(() => inputRef.current?.click(), [])

  const toggleWire = useCallback((on) => {
    setWire(on)
    viewerRef.current?.setWireframe(on)
  }, [])

  const convert = useCallback(async () => {
    const format = outputFormat(outId)
    const viewer = viewerRef.current
    if (!format || !viewer?.model || converting || !model) return
    const gen = modelGenRef.current
    setConverting(true)
    setOutput(null)
    try {
      const engine = await getEngine()
      const blob = await engine.exportModel(viewer.model, format, { sourceUnit: model.format.unit })
      if (gen !== modelGenRef.current) return
      const out = { blob, format, bytes: blob.size, name: `${baseName(model.name)}.${format.ext}` }
      setOutput(out)
      setAnnounce(`${out.name} is ready, ${formatBytes(out.bytes)}.`)
    } catch (err) {
      if (gen !== modelGenRef.current) return
      const msg = `Could not write ${format.label}: ${err?.message || err}.`
      setAnnounce(msg)
      toast?.(msg, 'error')
    } finally {
      setConverting(false)
    }
  }, [outId, converting, model, toast])

  const download = useCallback(async () => {
    if (!output) return
    if (!(await requireExportAccount('download the converted model'))) return
    triggerDownload(output.blob, output.name)
  }, [output, requireExportAccount])

  // Keyboard orbit on the focused canvas. OrbitControls pans from the keyboard
  // only when told which element to listen on, and not at all otherwise; these
  // keys rotate and zoom, which is what a visitor without a pointer needs to
  // inspect a model at all.
  const onCanvasKey = useCallback((e) => {
    const v = viewerRef.current
    if (!v?.model) return
    const step = e.shiftKey ? Math.PI / 6 : Math.PI / 24
    const actions = {
      ArrowLeft: () => v.orbit(step, 0),
      ArrowRight: () => v.orbit(-step, 0),
      ArrowUp: () => v.orbit(0, step),
      ArrowDown: () => v.orbit(0, -step),
      '+': () => v.zoom(0.85),
      '=': () => v.zoom(0.85),
      '-': () => v.zoom(1 / 0.85),
      _: () => v.zoom(1 / 0.85),
      f: () => v.fit(),
      F: () => v.fit(),
      0: () => v.fit(),
    }
    const act = actions[e.key]
    if (!act || e.altKey || e.ctrlKey || e.metaKey) return
    e.preventDefault()
    act()
  }, [])

  // Drag onto the stage in any state: a new file replaces the old one.
  const onDragOver = (e) => { e.preventDefault(); if (!over) setOver(true) }
  const onDragLeave = (e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOver(false) }
  const onDrop = (e) => {
    e.preventDefault()
    setOver(false)
    if (e.dataTransfer?.files?.length) onFiles(e.dataTransfer.files)
  }

  const stats = model?.stats
  const outFormat = outputFormat(outId)
  const pointCloud = !!stats && stats.points > 0 && stats.triangles === 0
  const ready = !!model && !busy
  const canConvert = ready && !!outFormat && (!pointCloud || outFormat.points)
  const unit = model?.format?.unit || 'file units'
  const state = busy ? 'busy' : model ? 'ready' : error ? 'error' : 'idle'
  const cancellable = busy && (busy.stage !== 'parsing' || busy.cad)
  const pct = busy?.total ? Math.min(100, Math.round((busy.loaded / busy.total) * 100)) : null

  return (
    <div className="v3d" data-state={state}>
      <header className="v3d-head">
        <h1>
          3D Viewer{' '}
          <span className="v3d-beta">Beta</span>
        </h1>
        {model && (
          <button type="button" className="v3d-btn" onClick={choose} disabled={!!busy}>
            Open another file
          </button>
        )}
      </header>

      <div className="v3d-grid">
        <section className="v3d-stage" aria-label="Model view">
          <div
            ref={frameRef}
            className={`v3d-frame${over ? ' is-over' : ''}`}
            data-lenis-prevent=""
            onPointerEnter={prefetch}
            onFocus={prefetch}
            onDragEnter={prefetch}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            <canvas
              ref={canvasRef}
              className="v3d-canvas"
              tabIndex={ready ? 0 : -1}
              role="img"
              aria-roledescription="3D view"
              aria-label={model ? `3D view of ${model.name}` : 'Empty 3D view'}
              aria-describedby={model ? `${summaryId} ${hintId}` : undefined}
              aria-hidden={model ? undefined : 'true'}
              onKeyDown={onCanvasKey}
              data-testid="v3d-canvas"
            />

            {!model && !busy && !error && (
              <div className="v3d-overlay v3d-empty" onClick={choose}>
                <span className="v3d-empty-glyph"><CubeGlyph /></span>
                <p className="v3d-empty-line">Drop a model here, or choose a file</p>
                <p className="v3d-empty-formats">
                  {inputLabels().join(' · ')}
                  <br />
                  Up to {describeSizeLimit()}. Drop a .gltf with its .bin, or an .obj with its .mtl, together.
                </p>
                <button type="button" className="v3d-btn" onClick={(e) => { e.stopPropagation(); choose() }}>
                  Choose a file
                </button>
              </div>
            )}

            {busy && (
              <div className="v3d-overlay v3d-busy" data-testid="v3d-busy">
                <p className="v3d-busy-name">{busy.name}</p>
                <p className="v3d-busy-stage">
                  {STAGE_LABEL[busy.stage] || STAGE_LABEL.viewer}
                  {busy.loaded != null && (busy.stage === 'reading' || busy.stage === 'engine') && (
                    <span className="v3d-busy-bytes">
                      {' '}{formatBytes(busy.loaded)}{busy.total ? ` of ${formatBytes(busy.total)}` : ''}
                    </span>
                  )}
                </p>
                {pct != null && (busy.stage === 'reading' || busy.stage === 'engine') && (
                  <div
                    className="v3d-meter"
                    role="progressbar"
                    aria-label={STAGE_LABEL[busy.stage]}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={pct}
                  >
                    <span className="v3d-meter-fill" style={{ '--v3d-pct': `${pct}%` }} />
                  </div>
                )}
                {cancellable && (
                  <button type="button" className="v3d-btn" onClick={cancel}>Cancel</button>
                )}
              </div>
            )}

            {error && !busy && !model && (
              <div className="v3d-overlay v3d-error" role="alert" data-testid="v3d-error">
                <p className="v3d-error-text">{error}</p>
                <button type="button" className="v3d-btn" onClick={choose}>Choose another file</button>
              </div>
            )}

            {error && !busy && model && (
              <div className="v3d-banner" role="alert" data-testid="v3d-error">
                <p className="v3d-error-text">{error} The model below is still the previous one.</p>
                <button type="button" className="v3d-btn v3d-btn--quiet" onClick={() => setError(null)}>Dismiss</button>
              </div>
            )}

            {ready && (
              <div className="v3d-tools" role="toolbar" aria-label="View">
                <div className="v3d-seg" role="group" aria-label="Shading">
                  <button type="button" aria-pressed={!wire} onClick={() => toggleWire(false)}><CubeGlyph /><span>Solid</span></button>
                  <button type="button" aria-pressed={wire} onClick={() => toggleWire(true)}><WireGlyph /><span>Wireframe</span></button>
                </div>
                <button type="button" className="v3d-tool" onClick={() => viewerRef.current?.fit()}><FitGlyph /><span>Fit</span></button>
                <button
                  type="button"
                  className="v3d-tool"
                  aria-pressed={spin && !reducedMotion}
                  disabled={!!reducedMotion}
                  title={reducedMotion ? 'Off while reduced motion is on' : undefined}
                  onClick={() => setSpin((s) => !s)}
                >
                  <TurnGlyph /><span>Turntable</span>
                </button>
              </div>
            )}

            <input
              ref={inputRef}
              className="v3d-file"
              type="file"
              accept={acceptAttribute()}
              multiple
              tabIndex={-1}
              aria-hidden="true"
              data-testid="v3d-input"
              onChange={(e) => { if (e.target.files?.length) onFiles(e.target.files); e.target.value = '' }}
            />
          </div>
          <p className="v3d-hint" id={hintId}>
            Drag to orbit, scroll or pinch to zoom, right-drag to pan. With the view focused: arrow keys orbit, + and − zoom, F fits.
          </p>
        </section>

        <aside className="v3d-panel" aria-label="Model and conversion">
          <div className="v3d-sect">
            <h2 className="v3d-label">Model</h2>
            {model && stats ? (
              <>
                <p className="sr-only" id={summaryId}>{describeModel(model)}</p>
                <dl className="v3d-facts" data-testid="v3d-facts">
                  <dt>File</dt><dd data-fact="file" title={model.name}>{model.name}</dd>
                  <dt>Format</dt><dd data-fact="format">{model.format.label}</dd>
                  <dt>Size</dt><dd data-fact="bytes">{formatBytes(model.bytes)}</dd>
                  {pointCloud ? (
                    <><dt>Points</dt><dd data-fact="points">{stats.points.toLocaleString('en')}</dd></>
                  ) : (
                    <><dt>Triangles</dt><dd data-fact="triangles">{stats.triangles.toLocaleString('en')}</dd></>
                  )}
                  <dt>Vertices</dt><dd data-fact="vertices">{stats.vertices.toLocaleString('en')}</dd>
                  <dt>Meshes</dt><dd data-fact="meshes">{stats.meshes.toLocaleString('en')}</dd>
                  <dt>Materials</dt><dd data-fact="materials">{stats.materials.toLocaleString('en')}</dd>
                  <dt>Extent</dt>
                  <dd data-fact="extent">{fmt3(stats.size[0])} × {fmt3(stats.size[1])} × {fmt3(stats.size[2])} <span className="v3d-unit">{unit}</span></dd>
                  {stats.gridStep != null && (
                    <><dt>Grid</dt><dd data-fact="grid">{fmt3(stats.gridStep)} <span className="v3d-unit">{unit} a square</span></dd></>
                  )}
                </dl>
                {model.warnings.length > 0 && (
                  <ul className="v3d-notes" data-testid="v3d-notes">
                    {model.warnings.map((w) => <li key={w}>{w}</li>)}
                  </ul>
                )}
              </>
            ) : (
              <dl className="v3d-facts v3d-facts--idle">
                <dt>Opens</dt><dd data-fact="reads">{inputLabels().join(', ')}</dd>
                <dt>Writes</dt><dd data-fact="writes">{outputLabels().join(', ')}</dd>
                <dt>Limit</dt><dd data-fact="limit">{describeSizeLimit()}</dd>
                <dt>{CAD_LABELS}</dt><dd data-fact="cad">The first one fetches a 7.6 MB engine from cdn.jsdelivr.net</dd>
              </dl>
            )}
          </div>

          <div className="v3d-sect">
            <h2 className="v3d-label" id={`${uid}-out`}>Convert to</h2>
            {/* Six formats as a 3 x 2 grid of choices, and what the chosen one
                keeps written ONCE underneath. The first cut gave every row its
                own two-line note, which pushed Convert below the fold at
                1440 x 900 — the page's one action out of sight to explain five
                options nobody had picked. */}
            <div className="v3d-outs" role="radiogroup" aria-labelledby={`${uid}-out`} aria-describedby={`${uid}-keeps`}>
              {OUTPUT_FORMATS.map((f) => {
                const blocked = pointCloud && !f.points
                return (
                  <label key={f.id} className={`v3d-out${outId === f.id ? ' is-on' : ''}${blocked ? ' is-off' : ''}`}>
                    <input
                      type="radio"
                      name={`${uid}-out`}
                      value={f.id}
                      checked={outId === f.id}
                      disabled={blocked}
                      onChange={() => { setOutId(f.id); setOutput(null) }}
                    />
                    <span className="v3d-out-l">{f.label}</span>
                  </label>
                )
              })}
            </div>
            <p className="v3d-keeps" id={`${uid}-keeps`} data-testid="v3d-keeps">
              {outFormat?.keeps}.
              {pointCloud && ` ${listForProse(OUTPUT_FORMATS.filter((f) => !f.points).map((f) => f.label))} need triangles, and this model is a point cloud.`}
            </p>
            <div className="v3d-actions">
              <button
                type="button"
                className="v3d-btn v3d-btn--primary"
                disabled={!canConvert || converting}
                aria-busy={converting || undefined}
                onClick={convert}
                data-testid="v3d-convert"
              >
                {converting ? `Writing ${outFormat?.label}…` : `Convert to ${outFormat?.label}`}
              </button>
              {output && (
                <button type="button" className="v3d-btn" onClick={download} data-testid="v3d-download">
                  Download
                </button>
              )}
            </div>
            {!model && <p className="v3d-idle-note">Open a model to convert it.</p>}
            {output && (
              <p className="v3d-result" data-testid="v3d-result">
                <span className="v3d-result-name">{output.name}</span>
                <span className="v3d-result-size">{formatBytes(output.bytes)}</span>
              </p>
            )}
          </div>
        </aside>
      </div>

      <p className="sr-only" role="status" aria-live="polite">{announce}</p>
    </div>
  )
}
