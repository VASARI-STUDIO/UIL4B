import { useRef, useState } from 'react'
import { useProject } from '../contexts/ProjectContext'
import {
  ACCEPT_ATTR, ACCEPT_LABEL, ACCEPT_TYPES, MAX_LOGO_BYTES, MAX_LOGO_LABEL,
  RASTER_STEPS, describeLogo, logoBytes, readLogo, sanitiseSvg, svgIntrinsicSize,
} from '../utils/brandLogo'

// THE LOGO CONTROL — the one place UIL4B accepts something it did not generate.
//
// It lives INSIDE the export panel, next to the format that needs it, rather
// than in Settings or as a fifth step in the brand-kit walkthrough. Three
// reasons, in order of weight:
//
//  1. The logo is not part of the design system the tools build — it is an input
//     the guidelines DOCUMENT needs. Asking for it at the moment that document
//     is being made is the only place the request explains itself.
//  2. The walkthrough's four steps each map to a live Create tool that writes
//     `design` (see utils/brandKitGuide.js and its route test). A logo upload is
//     not a tool and inventing a route for it would have added a fifth step that
//     produces nothing anyone can then edit.
//  3. It keeps the honest-scope line in front of the person paying: the field
//     states, before they click Export, which pages exist only if they upload
//     one.
//
// WHY THE VALIDATION IS NOT IN THIS FILE. Everything that can be decided without
// a browser lives in utils/brandLogo.js and is unit-tested there — the size cap
// and why it is 32 KB, the SVG hazard list, the intrinsic-size read, the shape
// of a stored logo. What is left here is the part that genuinely needs a canvas:
// stepping a raster down until it fits. That split is the same one
// utils/brandKitGuide.js makes, and for the same reason.
//
// MOBBIN, and which screen drove which decision:
//   • Deel, “Custom branding” — the accepted formats and the size ceiling are
//     printed under the control BEFORE anything is chosen, and an accepted file
//     becomes a named row with a delete control rather than a bare thumbnail.
//     That is the hint line and the `logo-row` below.
//     https://mobbin.com/screens/a60bceec-975d-4a91-bffd-70cda485c249
//   • Uvodo, “Brand” — one compact row: thumbnail, then a label with a single
//     line saying what the file is USED FOR, then the action on the right, with
//     Remove replacing Upload once it is set. That is the row's whole anatomy,
//     and it is what lets this fit in a modal instead of needing a page.
//     https://mobbin.com/screens/6f36a615-a60f-4a47-954b-337698f6c86a
//   • Flodesk, “Logo” — the recommendation is stated in terms of what the
//     product will DO with the file (“…to ensure it looks great on all
//     backgrounds”). This document puts the mark on paper, on ink and on every
//     brand colour, so the hint says exactly that.
//     https://mobbin.com/screens/0476c289-8250-4418-88b3-c07e4bc462e0
//   • Pitch, “Export as” — the watermark notice sits in its own bordered block
//     BELOW the format list rather than inside a format row. That is why this is
//     a block under the radiogroup and not a line inside the guidelines option.
//     https://mobbin.com/screens/fe97c269-f702-4dfe-8185-55a1f6cbbf6c

/** Read a File as a base64 data: URI. */
function asDataUrl(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(String(fr.result || ''))
    fr.onerror = () => reject(new Error('That file could not be read.'))
    fr.readAsDataURL(file)
  })
}

/** Read a File as text — used only to inspect an SVG before it is stored. */
function asText(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(String(fr.result || ''))
    fr.onerror = () => reject(new Error('That file could not be read.'))
    fr.readAsText(file)
  })
}

/** Decode a data: URI into an <img>, for its intrinsic size and for redrawing. */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('That image could not be decoded.'))
    img.src = src
  })
}

/**
 * Step a raster down the RASTER_STEPS ladder until it fits under the cap.
 *
 * PNG at every step, never JPEG. A logo is flat artwork with a transparent
 * ground far more often than not, and re-encoding it as JPEG would both fill
 * that ground with white and put ringing artefacts along every edge — on a page
 * whose entire job is to show the mark reproduced faithfully. If PNG cannot get
 * under the cap at 128px the answer is a vector file, and the caller says so
 * rather than silently shipping a damaged mark.
 */
async function shrinkRaster(dataUrl) {
  const img = await loadImage(dataUrl)
  const w = img.naturalWidth || img.width
  const h = img.naturalHeight || img.height
  if (!w || !h) throw new Error('That image has no readable size.')

  // Already small enough and not absurdly large: keep the original bytes. A
  // re-encode can only lose information, so it has to earn its place.
  if (logoBytes(dataUrl) <= MAX_LOGO_BYTES && Math.max(w, h) <= 1024) {
    return { src: dataUrl, width: w, height: h }
  }

  for (const edge of RASTER_STEPS) {
    const scale = Math.min(1, edge / Math.max(w, h))
    const tw = Math.max(1, Math.round(w * scale))
    const th = Math.max(1, Math.round(h * scale))
    const canvas = document.createElement('canvas')
    canvas.width = tw
    canvas.height = th
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('This browser cannot resize images.')
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, 0, 0, tw, th)
    const out = canvas.toDataURL('image/png')
    if (logoBytes(out) <= MAX_LOGO_BYTES) return { src: out, width: tw, height: th }
  }
  throw new Error(
    `That image is too detailed to store under ${MAX_LOGO_LABEL}. Upload an SVG — vector artwork always fits, and it stays sharp at any size.`,
  )
}

export default function BrandLogoField() {
  const { design, updateDesign } = useProject()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef(null)
  const logo = readLogo(design)

  const accept = async (file) => {
    setError('')
    if (!file) return
    if (!ACCEPT_TYPES.includes(file.type)) {
      setError(`That is a ${file.type || 'file of unknown type'}. Upload ${ACCEPT_LABEL}.`)
      return
    }
    setBusy(true)
    try {
      let stored
      if (file.type === 'image/svg+xml') {
        // Inspected as text BEFORE it is stored: an SVG is a document, and a
        // document that carries script is not a logo. The mark is rendered in
        // an <img> either way — see the security note in utils/brandLogo.js —
        // but the user should hear about it while they still have the original
        // open, not never.
        const source = await asText(file)
        const problem = sanitiseSvg(source)
        if (problem) { setError(problem); setBusy(false); return }
        const src = await asDataUrl(file)
        if (logoBytes(src) > MAX_LOGO_BYTES) {
          setError(`That SVG is over ${MAX_LOGO_LABEL}. Flatten or simplify the artwork and export it again.`)
          setBusy(false)
          return
        }
        const size = svgIntrinsicSize(source)
        stored = { src, width: size?.width || null, height: size?.height || null }
      } else {
        stored = await shrinkRaster(await asDataUrl(file))
      }
      // Written whole rather than patched. updateDesign() shallow-merges an
      // object value into the previous one, so a partial write would leave the
      // PREVIOUS logo's width and height sitting under a new mark — and the
      // clear-space box would then be drawn to the old proportion.
      updateDesign({
        logo: {
          src: stored.src,
          width: stored.width,
          height: stored.height,
          type: file.type,
          name: file.name || '',
          bytes: logoBytes(stored.src),
        },
      })
    } catch (err) {
      setError(err?.message || 'That logo could not be read. Try another file.')
    } finally {
      setBusy(false)
    }
  }

  const remove = () => {
    setError('')
    updateDesign({ logo: null })
  }

  return (
    <div className="exp-logo">
      <div className="exp-logo-row">
        <span className={logo ? 'exp-logo-chip has-mark' : 'exp-logo-chip'} aria-hidden="true">
          {logo
            ? <img src={logo.src} alt="" />
            : (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 16V4M8 8l4-4 4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
              </svg>
            )}
        </span>
        <span className="exp-logo-text">
          <span className="exp-logo-name">{logo ? describeLogo(logo) : 'Your logo'}</span>
          <span className="exp-logo-hint">
            {logo
              ? 'Used on the cover, the mark page, every brand ground and the clear-space rule.'
              : 'Optional. It adds the mark, the mark on every brand ground, and the clear-space rule. Without one those pages are left out, and the last page says so.'}
          </span>
        </span>
        <span className="exp-logo-acts">
          <button
            type="button"
            className="ui-pill ui-pill-out ui-pill-sm"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
          >
            {busy ? 'Reading…' : logo ? 'Replace' : 'Add logo'}
          </button>
          {logo && (
            <button type="button" className="exp-logo-drop" onClick={remove} disabled={busy}>
              Remove
            </button>
          )}
        </span>
      </div>
      <p className="exp-logo-note">
        {ACCEPT_LABEL}, up to {MAX_LOGO_LABEL}. SVG is best: vector, sharp at any size, always fits.
        Your mark is set on white, on black and on every palette colour, so give it a transparent
        background.
      </p>
      {error && <p className="exp-logo-error" role="alert">{error}</p>}
      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT_ATTR}
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
        onChange={(e) => { accept(e.target.files?.[0]); e.target.value = '' }}
      />
    </div>
  )
}
