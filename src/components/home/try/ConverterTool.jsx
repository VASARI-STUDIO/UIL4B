import { useRef, useState } from 'react'
import { route } from '../../spectrum/spectrumFacts'
import { formatBytes } from '../../spectrum/spectrumKit'
import { useInView } from '../../spectrum/useImageMeasure'
import { navigatesThisTab } from '../../../utils/handoffSlot'
import { setImageHandoff } from '../../../utils/imageHandoff'
import { Radios, ToolLink, Well } from './tryParts'
import { useTryMeasure } from './useTryMeasure'

// FILE CONVERTER. The sample photo is the Kerbside riders picture, shown as a
// PNG original named kerbside-riders.png: it is drawn to a canvas and encoded as a
// lossless PNG for the BEFORE size, then re-encoded at the format, quality and size
// on screen for the AFTER size, by the same measuring the full File Converter uses.
// A photo the visitor chooses is measured the same way and never leaves the tab.

const SOURCE = '/home-try/riders-1600.webp'
const SAMPLE_NAME = 'kerbside-riders.png'
const FORMATS = [['PNG', 'image/png'], ['JPEG', 'image/jpeg'], ['WebP', 'image/webp']]
const QUALITIES = [25, 50, 75, 90]
const DEFAULT_FORMAT = 2
const DEFAULT_QUALITY = 3
// Longest-side limits offered, 0 being the photo's own size. A limit the photo is
// not larger than would change nothing, so it is disabled.
const LIMITS = [0, 1280, 640]
const LIMIT_LABELS = LIMITS.map((v) => (v ? `${v} px` : 'Original'))
// The phone's three-way choice over the settings.
const PHONE_MODES = ['Format', 'Quality', 'Size']
// The tabs the full tool has; only Image runs here.
const MODES = [
  ['Image', ''],
  ['Animation', 'Build an animation from frames and save it as GIF, WebP, APNG, MP4 or WebM.'],
  ['Video', 'Edit a video or GIF: crop, turn, change the speed or reverse it.'],
  ['Extract frames', 'Pull frames out of a video.', 'Frames'],
]

export default function ConverterTool() {
  const root = useRef(null)
  const near = useInView(root)
  const [mode, setMode] = useState(0)
  const [fmt, setFmt] = useState(DEFAULT_FORMAT)
  const [qi, setQi] = useState(DEFAULT_QUALITY)
  const [lim, setLim] = useState(0)
  const [setting, setSetting] = useState(0)
  const quality = QUALITIES[qi]
  const [fmtName, type] = FORMATS[fmt]
  const png = type === 'image/png'
  const { pick, failed, src, out, takeImage } = useTryMeasure({ near, source: SOURCE, format: type, quality, limit: LIMITS[lim] })

  const before = src?.before ?? null
  // A reading counts only for the format and size it was encoded at.
  const fresh = out && out.type === type && out.limit === LIMITS[lim] ? out : null
  const outSize = fresh ? fresh.size : null
  const pct = before && outSize != null ? Math.round(100 - (outSize / before) * 100) : null
  const loading = !failed && pct == null

  let figure = ''
  let tone = ''
  if (pct != null) {
    if (pct > 0) { figure = `${pct}% smaller`; tone = 'win' } else if (pct < 0) figure = `${-pct}% larger`
    else figure = 'Same size'
  }

  // A limit at or above the photo's longest side is not offered; the choice falls back to Original.
  const longest = src ? Math.max(src.w, src.h) : 0
  const limitOff = (i) => LIMITS[i] > 0 && longest > 0 && LIMITS[i] >= longest
  const limIndex = limitOff(lim) ? 0 : lim
  const resized = fresh && src && (fresh.w !== src.w || fresh.h !== src.h)

  const name = pick ? pick.name : SAMPLE_NAME
  // "Open in File Converter" carries a chosen photo with it, with the format and
  // quality on screen as its starting settings. The slot is staged only when this
  // tab will navigate (a modified click opens a tab that would never read it).
  const carry = (e) => {
    if (!pick?.file || !navigatesThisTab(e)) return
    setImageHandoff([pick.file], {
      resolution: 'original',
      format: type,
      compression: png ? 'lossless' : quality >= 90 ? 'high' : 'balanced',
    })
  }

  const tabKey = (e) => {
    const next = { ArrowRight: 1, ArrowLeft: -1 }[e.key]
    if (!next) return
    e.preventDefault()
    const to = (mode + next + MODES.length) % MODES.length
    setMode(to)
    e.currentTarget.querySelectorAll('[role="tab"]')[to]?.focus()
  }

  const formatSeg = (props) => <Radios items={FORMATS.map(([l]) => l)} value={fmt} onPick={setFmt} {...props} />
  const qualitySeg = (props) => <Radios items={QUALITIES.map(String)} value={qi} onPick={setQi} isDisabled={() => png} {...props} />
  const sizeSeg = (props) => <Radios items={LIMIT_LABELS} value={limIndex} onPick={setLim} isDisabled={limitOff} {...props} />

  let line = pick ? `Your photo carries over as ${fmtName}.` : 'Many photos at once need the full tool.'
  // The phone disables Quality for PNG with no row note beside it, so the line says why.
  if (png && setting === 1) line = 'PNG is lossless, so quality does not apply.'

  return (
    <>
      <div className="ht-tool ht-cvt" ref={root}>
      <div className="ht-tabs" role="tablist" aria-label="Conversion type" onKeyDown={tabKey}>
        {MODES.map(([label, , short], i) => (
          <button
            key={label}
            type="button"
            role="tab"
            id={`ht-cv-tab-${i}`}
            aria-selected={mode === i}
            aria-controls="ht-cv-panel"
            tabIndex={mode === i ? 0 : -1}
            onClick={() => setMode(i)}
          >
            {short ? <><span data-l>{label}</span><span data-s>{short}</span></> : label}
          </button>
        ))}
      </div>

      <div className="ht-cv-panel" id="ht-cv-panel" role="tabpanel" aria-labelledby={`ht-cv-tab-${mode}`}>
        {mode === 0 ? (
          <div className="ht-cv-card">
            <div className="ht-cv-thumb">
              {pick ? (
                <img className="ht-cv-photo" src={pick.url} alt="The photo you chose" />
              ) : (
                <picture>
                  <source
                    type="image/avif"
                    srcSet="/home-try/riders-640.avif 640w, /home-try/riders-1280.avif 1280w"
                    sizes="(min-width: 1200px) 260px, 45vw"
                  />
                  <img
                    className="ht-cv-photo"
                    src="/home-try/riders-640.webp"
                    srcSet="/home-try/riders-640.webp 640w, /home-try/riders-1280.webp 1280w"
                    sizes="(min-width: 1200px) 260px, 45vw"
                    width="640"
                    height="389"
                    loading="lazy"
                    decoding="async"
                    alt="Two riders waiting at a city intersection, one in an orange jacket"
                  />
                </picture>
              )}
            </div>
            <div className="ht-cv-info">
              <p className="ht-cv-name">{name}</p>
              <p className="ht-cv-meta">{src ? `${src.w} × ${src.h} px` : ' '}</p>
              <div className="ht-cv-res" aria-live="polite">
                {failed ? (
                  <p className="ht-cv-out is-alert">That file is not supported. Try a JPG, PNG or WebP.</p>
                ) : (
                  <>
                    <div className="ht-cv-fig" data-load={loading ? 'true' : 'false'} data-tone={tone}>{figure}</div>
                    <p className="ht-cv-bytes">{loading ? ' ' : `${formatBytes(before)} to ${formatBytes(outSize)}`}</p>
                    {/* Built from the encode itself: the format and quality on screen and the output's pixel size. */}
                    <p className="ht-cv-out ht-cv-line">
                      {fresh ? (
                        <>
                          {`Output ${fmtName}${png ? ', lossless' : `, quality ${quality}`}, `}
                          {resized ? `${src.w}×${src.h} → ` : ''}
                          <b>{`${fresh.w}×${fresh.h}`}</b>
                          {' px'}
                        </>
                      ) : ' '}
                    </p>
                  </>
                )}
              </div>
              <label className="ht-btn ht-cv-pick">
                Choose a photo
                <input
                  className="ht-cv-file"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif,image/bmp,image/avif"
                  aria-describedby="ht-cv-priv"
                  onChange={(e) => { takeImage(e.target.files?.[0]); e.target.value = '' }}
                />
              </label>
              <p className="ht-cv-priv" id="ht-cv-priv">Runs in your browser. Files are never uploaded.</p>
            </div>
          </div>
        ) : (
          <div className="ht-cv-about">
            <p>{MODES[mode][1]}</p>
            <p className="ht-cv-eng">Runs in your browser. The video tools download a converter engine, about 9 MB, the first time.</p>
          </div>
        )}
      </div>

      <div className="ht-cv-set">
        <div className="ht-cv-row">
          <span className="ht-cv-lbl" id="ht-cv-fmt">Format</span>
          {formatSeg({ labelledBy: 'ht-cv-fmt', className: 'ht-cv-seg' })}
        </div>
        <div className="ht-cv-row">
          <span className="ht-cv-lbl" id="ht-cv-q">Quality</span>
          {qualitySeg({ labelledBy: 'ht-cv-q', className: 'ht-cv-seg' })}
          <p className="ht-cv-qn">{png ? 'PNG is lossless.' : ''}</p>
        </div>
        <div className="ht-cv-row">
          <span className="ht-cv-lbl" id="ht-cv-s">Size</span>
          {sizeSeg({ labelledBy: 'ht-cv-s', className: 'ht-cv-seg' })}
        </div>
      </div>

      {/* Phone: the three setting rows become one control under a three-way choice. */}
      <Well label="What the File Converter can change" items={PHONE_MODES} value={setting} onPick={setSetting}>
        {setting === 0 && formatSeg({ label: 'Output format', className: 'ht-grow' })}
        {setting === 1 && qualitySeg({ label: 'Output quality', className: 'ht-grow' })}
        {setting === 2 && sizeSeg({ label: 'Size limit, px', className: 'ht-grow' })}
      </Well>
      </div>

      <ToolLink
        to={route('file-converter')}
        onClick={carry}
        fill={Boolean(pick)}
        line={line}
      >
        Open in File Converter
      </ToolLink>
    </>
  )
}
