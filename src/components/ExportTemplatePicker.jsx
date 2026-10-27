import { useId } from 'react'
import { liveTemplates } from '../config/exportTemplates'
import useRovingRadio from '../hooks/useRovingRadio'

// The template choice inside a row's options. One radiogroup with one Tab stop
// (the chosen tile); the arrow keys move and choose, Home and End jump, and the
// ends wrap. Rendered by the panel only while the row has two or more live
// templates, so a row with a single layout shows nothing.
//
// `thumbs` is optional: ({ format, id }) -> { src, srcSet, sizes } for the tile's
// picture. Without one the tile keeps its frame, at the document's own ratio, so
// nothing shifts when pictures arrive.
const RATIO = { kit: '4 / 5', book: '1 / 1.414', guidelines: '16 / 9' }

export default function ExportTemplatePicker({ format, value, onChange, thumbs }) {
  const id = useId()
  const list = liveTemplates(format)
  const { refs, onKeyDown } = useRovingRadio(list.length, (i) => onChange(list[i].id))
  if (list.length < 2) return null
  const picked = list.find((x) => x.id === value) || list[0]

  return (
    <div className="exp-tpl">
      <div className="exp-tpl-row" role="radiogroup" aria-label="Template">
        {list.map((x, i) => {
          const checked = x.id === picked.id
          const pic = thumbs?.({ format, id: x.id })
          return (
            <button
              key={x.id}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-labelledby={`${id}-${x.id}-name`}
              aria-describedby={`${id}-${x.id}`}
              tabIndex={checked ? 0 : -1}
              className={checked ? 'exp-tpl-tile is-active' : 'exp-tpl-tile'}
              ref={(el) => { refs.current[i] = el }}
              onClick={() => onChange(x.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
            >
              <span className="exp-tpl-frame" style={{ aspectRatio: RATIO[format] }}>
                {pic && <img src={pic.src} srcSet={pic.srcSet} sizes={pic.sizes} alt="" loading="lazy" decoding="async" />}
              </span>
              <span className="exp-tpl-name" id={`${id}-${x.id}-name`}>{x.name}</span>
              <span className="exp-tpl-desc" id={`${id}-${x.id}`}>{x.desc}</span>
            </button>
          )
        })}
      </div>
      {/* On a phone the tiles show names only; the chosen one is described here. */}
      <p className="exp-tpl-picked" aria-hidden="true">{picked.desc}</p>
    </div>
  )
}
