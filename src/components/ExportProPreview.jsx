import { useEffect, useState } from 'react'
import ExportProTag from './ExportProTag'
import { PREVIEW_PAGE_COUNT, previewCaption, previewKey, previewTemplateName } from '../utils/proPreviewKey'

// The strip of three small page pictures under a Pro row: what the paid
// document looks like, drawn from the person's own system.
//
// The pictures come from utils/proPreviews.js, which draws them on a canvas and
// returns encoded images. For a free account (or while the plan is still being
// read) the blur is baked into those pixels there, so this component never holds
// anything sharper than what it shows. Pro accounts get the same small picture
// unblurred. The generator loads on demand: nobody who never opens a Pro row
// pays for it.
//
// The box is reserved before any picture lands (aspect-ratio plus a flat fill),
// so the dock does not move when the images arrive.

const KIND_NAME = { book: 'design system book', guidelines: 'brand guidelines' }

// Finished previews, kept so choosing another row and coming back is instant.
// Holds the encoded blobs (a few kilobytes each), never object URLs. The key
// carries the template, so each template has its own entry per design.
const cache = new Map()
const CACHE_LIMIT = 8

// `template` is the row's chosen template id; the pictures and the caption below
// them follow it. `blurred` decides the pixels and stays on while the plan is
// read, so a Pro document is never shown sharp on a guess. `showLock` is only the
// chip over the strip, which the panel holds back until it knows the account is
// not Pro.
export default function ExportProPreview({ kind, template, design, projectName, blurred, showLock = blurred }) {
  const key = previewKey({ kind, template, blurred, design, projectName })
  const [result, setResult] = useState({ key: '', pages: [], failed: false })

  useEffect(() => {
    let live = true
    const urls = []
    const finish = (pages) => {
      if (!live) return
      const withUrls = pages.map((p) => {
        const url = URL.createObjectURL(p.blob)
        urls.push(url)
        return { id: p.id, title: p.title, url, width: p.width, height: p.height }
      })
      setResult({ key, pages: withUrls, failed: false })
    }
    const draw = (again) => import('../utils/proPreviews')
      .then(({ renderProPreviews }) => renderProPreviews(design, kind, { projectName, blurred, template }))
      .then((pages) => {
        if (pages.stale) {
          // Drawn in a fallback face while the system's faces were still arriving: show it, keep it
          // out of the cache, and draw once more when the faces are in.
          if (!again) pages.fontsReady.then(() => { if (live) draw(true).catch(() => {}) })
        } else {
          cache.set(key, pages)
          if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value)
        }
        finish(pages)
      })
    const hit = cache.get(key)
    if (hit) {
      finish(hit)
    } else {
      draw(false).catch(() => { if (live) setResult({ key, pages: [], failed: true }) })
    }
    return () => {
      live = false
      urls.forEach((u) => URL.revokeObjectURL(u))
    }
    // `key` already folds in every input the previews are drawn from.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  // Anything drawn for a different input than the current one is stale.
  const ready = result.key === key ? result : { pages: [], failed: false }
  const name = KIND_NAME[kind]
  const templateName = previewTemplateName(kind, template)

  return (
    <div className={`exp-preview is-${kind}`}>
      {/* The strip's heading, above it, so the pictures read as the result of the choice
          above and not as a second row of tiles. The strip carries the same words as its
          accessible name, so a screen reader hears them once. */}
      {ready.failed
        ? <p className="exp-preview-note">The preview could not be drawn. The document is unaffected.</p>
        : <p className="exp-preview-caption" aria-hidden="true">{previewCaption(kind, template)}</p>}
      {/* The stage is as wide as the pictures (up to the box), so the Pro chip
          centres over them and not over the empty room beside them. */}
      <div className="exp-preview-stage">
        {/* Scrolls sideways when the pictures outgrow the box, so it is a Tab
            stop with a name: a keyboard can reach the pictures past the edge. */}
        <div
          className="exp-preview-strip"
          data-state={ready.failed ? 'failed' : ready.pages.length ? 'ready' : 'loading'}
          tabIndex={0}
          role="group"
          aria-label={`Pages of your ${name} in ${templateName}`}
        >
          {ready.pages.length
            ? ready.pages.map((p, i) => (
              <img
                key={p.id}
                className="exp-thumb"
                src={p.url}
                width={p.width}
                height={p.height}
                alt={`${blurred ? 'Blurred preview' : 'Preview'} of your ${name}, page ${i + 1}: ${p.title}`}
                data-blurred={blurred ? 'true' : 'false'}
                draggable="false"
              />
            ))
            : Array.from({ length: PREVIEW_PAGE_COUNT }, (_, i) => <span key={i} className="exp-thumb exp-thumb-wait" aria-hidden="true" />)}
        </div>
        {showLock && <span className="exp-preview-lock"><ExportProTag className="exp-preview-tag" /></span>}
      </div>
    </div>
  )
}
