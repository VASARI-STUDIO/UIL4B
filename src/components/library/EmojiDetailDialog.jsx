import { useState, useEffect, useRef, useCallback } from 'react'
import useModalDialog from '../../hooks/useModalDialog'
import { TONE_EMOJI } from '../../data/emojiTones'
import { SKIN_TONES, composeSkinTone } from '../../utils/emojiSkinTone'
import { formatCodePoints, htmlEntity, formatShortcode, displayName, lookupEmoji } from '../../utils/emojiCodes'
import { getLoadedEmojiIndex, loadEmojiIndex } from '../../data/emojiIndexLoader'
import { getLoadedEmojiShortcodes, loadEmojiShortcodes } from '../../data/emojiShortcodesLoader'
import EmojiStyles from './EmojiStyles'

// The Emoji Library's detail dialog: one emoji, large, with every way of
// writing it down and a copy button beside each, and a Styles row showing it
// in other emoji art sets. It is copy-only on purpose: the glyph is whatever
// the visitor's system font draws, and the other styles are shown, not offered
// as downloads.
//
// The frame is the customiser's (`icust-*`: a centred dialog on desktop, a
// bottom sheet on a phone). The body is not: `.icust-body` becomes a two-column
// grid above 800px, and this content is one column.

const COPIED_MS = 1400
const MISSING = 'Not available'

/**
 * @param {string} emoji  the catalogue character, untoned
 * @param {string} tone   the page's skin tone (a modifier character, or '')
 * @param {() => void} onClose
 * @param {(text: string) => (Promise<boolean> | void)} onCopy  the page's clipboard hook
 */
export default function EmojiDetailDialog({ emoji, tone: pageTone, onClose, onCopy }) {
  const dialogRef = useModalDialog(onClose)
  const hasTone = TONE_EMOJI.has(emoji)
  // The dialog opens on the page's tone and then keeps its own: choosing one
  // here describes this emoji and leaves the grid behind it alone.
  const [tone, setTone] = useState(hasTone ? pageTone : '')
  const [index, setIndex] = useState(getLoadedEmojiIndex)
  const [codes, setCodes] = useState(getLoadedEmojiShortcodes)
  const [failed, setFailed] = useState(false)
  const [copied, setCopied] = useState(null)
  const timer = useRef(0)

  // Both tables are separate fetched files. A cold open shows the code points
  // and the entity at once (they are computed) and fills the rest in.
  useEffect(() => {
    let live = true
    loadEmojiIndex().then((v) => { if (live) setIndex(v) }, () => { if (live) setFailed(true) })
    loadEmojiShortcodes().then((v) => { if (live) setCodes(v) }, () => { if (live) setFailed(true) })
    return () => { live = false }
  }, [])
  useEffect(() => () => clearTimeout(timer.current), [])

  const shown = hasTone ? composeSkinTone(emoji, tone) : emoji
  const name = lookupEmoji(index, emoji)?.name
  const short = lookupEmoji(codes, emoji)
  const tonePick = SKIN_TONES.find(t => t.mark === tone)

  const copy = useCallback((key, text) => {
    Promise.resolve(onCopy(text)).then((ok) => {
      if (ok === false) return
      setCopied(key)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(null), COPIED_MS)
    })
  }, [onCopy])

  // Until a table arrives its row says so; if the fetch failed, or the table
  // has no entry for this emoji, the row says that instead and cannot be copied.
  const pending = (value, loaded) => value || (loaded || failed ? MISSING : 'Loading…')
  const rows = [
    { key: 'codepoints', label: 'Code points', what: 'code points', value: formatCodePoints(shown) },
    {
      key: 'shortcode',
      label: 'Shortcode',
      what: 'shortcode',
      value: short ? formatShortcode(short.aliases[0]) : '',
      shown: pending(short ? formatShortcode(short.aliases[0]) : '', Boolean(codes)),
    },
    { key: 'entity', label: 'HTML entity', what: 'HTML entity', value: htmlEntity(shown) },
    {
      key: 'version',
      label: 'Unicode version',
      what: 'Unicode version',
      plain: true,
      value: short?.version || '',
      shown: pending(short?.version ? `Unicode ${short.version}` : '', Boolean(codes)),
    },
  ]

  return (
    <div className="icust-overlay emd-overlay" onMouseDown={onClose}>
      <div
        className="icust-panel emd-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="emd-title"
        ref={dialogRef}
        tabIndex={-1}
        data-lenis-prevent
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="icust-head">
          <div className="icust-head-text">
            <h2 className="icust-title" id="emd-title">
              {name ? displayName(name) : index || failed ? 'Emoji' : 'Loading…'}
            </h2>
            {hasTone && (
              <p className="icust-sub" aria-live="polite">
                {tonePick ? `${tonePick.label} skin tone` : 'Default skin tone'}
              </p>
            )}
          </div>
          <button type="button" className="icust-close" onClick={onClose} aria-label="Close emoji details">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="emd-body">
          <div className="emd-hero">
            <span className="emd-glyph" aria-hidden="true">{shown}</span>
            <button
              type="button"
              className="lib-btn lib-btn--primary emd-copy emd-copy--main"
              onClick={() => copy('emoji', shown)}
              aria-label={copied === 'emoji' ? 'Copied emoji' : 'Copy emoji'}
            >
              {copied === 'emoji' ? 'Copied' : 'Copy emoji'}
            </button>
          </div>

          {hasTone && (
            <div className="emd-tones" role="group" aria-label="Skin tone">
              {[{ id: 'default', label: 'Default', mark: '' }, ...SKIN_TONES].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="emd-tone"
                  aria-pressed={tone === t.mark}
                  aria-label={t.mark ? `${t.label} skin tone` : 'Default skin tone'}
                  title={t.mark ? `${t.label} skin tone` : 'Default skin tone'}
                  onClick={() => setTone(t.mark)}
                >
                  <span aria-hidden="true">{composeSkinTone(emoji, t.mark)}</span>
                </button>
              ))}
            </div>
          )}

          <EmojiStyles glyph={shown} name={name} nameSettled={Boolean(index) || failed} toneId={tonePick?.id || ''} />

          <ul className="emd-rows">
            {rows.map((r) => (
              <li key={r.key} className="emd-row">
                <div className="emd-text">
                  <span className="emd-label">{r.label}</span>
                  <code className={`emd-value${r.plain ? ' is-plain' : ''}${r.value ? '' : ' is-empty'}`}>{r.shown ?? r.value}</code>
                </div>
                <button
                  type="button"
                  className="lib-btn emd-copy"
                  disabled={!r.value}
                  onClick={() => copy(r.key, r.value)}
                  aria-label={`${copied === r.key ? 'Copied' : 'Copy'} ${r.what}`}
                >
                  {copied === r.key ? 'Copied' : 'Copy'}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
