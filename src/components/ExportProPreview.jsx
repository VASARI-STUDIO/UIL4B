import { useEffect, useState } from 'react'
import ExportProTag from './ExportProTag'

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
const PAGE_COUNT = 3

// Finished previews, kept so choosing another row and coming back is instant.
// Holds the encoded blobs (a few kilobytes each), never object URLs.
const cache = new Map()
const CACHE_LIMIT = 8

// What the previews depend on, as a short string. A change to the palette, the
// type, the name or the logo draws them again.
function designKey(design, projectName) {
  return JSON.stringify([
    projectName,
    design?.palette?.colors, design?.palette?.base,
    design?.fonts?.heading, design?.fonts?.body,
    design?.typeScale?.headingWeight,
    typeof design?.logo?.src === 'string' ? design.logo.src.length : 0,
  ])
}

export default function ExportProPreview({ kind, design, projectName, blurred }) {
  const key = `${kind}|${blurred ? 'blur' : 'sharp'}|${designKey(design, projectName)}`
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
    const hit = cache.get(key)
    if (hit) {
      finish(hit)
    } else {
      import('../utils/proPreviews')
        .then(({ renderProPreviews }) => renderProPreviews(design, kind, { projectName, blurred }))
        .then((pages) => {
          cache.set(key, pages)
          if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value)
          finish(pages)
        })
        .catch(() => { if (live) setResult({ key, pages: [], failed: true }) })
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

  return (
    <div className={`exp-preview is-${kind}`}>
      <div className="exp-preview-strip" data-state={ready.failed ? 'failed' : ready.pages.length ? 'ready' : 'loading'}>
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
          : Array.from({ length: PAGE_COUNT }, (_, i) => <span key={i} className="exp-thumb exp-thumb-wait" aria-hidden="true" />)}
      </div>
      {blurred && <span className="exp-preview-lock"><ExportProTag className="exp-preview-tag" /></span>}
      {ready.failed && <p className="exp-preview-note">The preview could not be drawn. The document is unaffected.</p>}
    </div>
  )
}
