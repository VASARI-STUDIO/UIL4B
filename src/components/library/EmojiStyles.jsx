import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useSubscription } from '../../contexts/SubscriptionContext'
import { canSeePack, viewerTier } from '../../data/iconPackTiers'
import { creditRows } from '../../data/iconPackCredits'
import { EMOJI_STYLE_SETS, styleIconName } from '../../utils/emojiStyleNames'
import { loadStyleImage } from '../../utils/emojiStyleImage'

// The detail dialog's "Styles" row: the same emoji drawn by other emoji art
// sets, next to how this device draws it.
//
// "Your device" is the system font and is free for everyone. The four art sets
// are Iconify packs, which iconPackTiers.js puts on Pro. A viewer who may not
// see them gets one locked tile that names them and links to /plans, and
// nothing is requested for them (a pack the viewer cannot see is never asked
// for). A Pro viewer gets a tile per set, and a set that has no artwork for
// this emoji gets no tile at all: only an answered image is ever drawn.
//
// The row is one line that scrolls sideways when it is wider than the dialog,
// and every tile keeps its size while loading, so nothing around it moves.

const LOADING = 'loading'

/**
 * @param {string} glyph   the emoji as the dialog shows it, tone included
 * @param {string|undefined} name   its CLDR name; undefined until the index arrives
 * @param {boolean} nameSettled   the index has answered (or failed), so an absent name is final
 * @param {string} toneId   one of SKIN_TONES[n].id, or '' for none
 */
export default function EmojiStyles({ glyph, name, nameSettled, toneId }) {
  const { user, loading: authLoading } = useAuth()
  const { isPro, planKnown } = useSubscription()
  const tier = viewerTier({ user, isPro, resolving: authLoading })
  const planPending = authLoading || planKnown === false

  const visible = useMemo(() => EMOJI_STYLE_SETS.filter(s => canSeePack(s.prefix, tier)), [tier])
  const locked = useMemo(() => EMOJI_STYLE_SETS.filter(s => !canSeePack(s.prefix, tier)), [tier])

  // One request per visible set, for this emoji in this tone. `answers` holds
  // the key it was fetched for, so an answer for the previous tone is never
  // read as the current one.
  const key = name ? `${name}|${toneId}` : ''
  const [answers, setAnswers] = useState({ key: '', byPrefix: {} })
  useEffect(() => {
    if (!key || planPending) return undefined
    let live = true
    const want = visible.map(set => ({ set, icon: styleIconName(set, name, toneId) })).filter(w => w.icon)
    Promise.all(want.map(w => loadStyleImage(w.set.prefix, w.icon))).then((results) => {
      if (!live) return
      const byPrefix = {}
      want.forEach((w, i) => { byPrefix[w.set.prefix] = results[i] })
      setAnswers({ key, byPrefix })
    })
    return () => { live = false }
  }, [key, name, toneId, planPending, visible])

  // What each visible set is doing: still asking, drawn, or nothing to show.
  const stateOf = (set) => {
    if (!name) return nameSettled ? { status: 'missing' } : { status: LOADING }
    if (answers.key !== key) return { status: LOADING }
    return answers.byPrefix[set.prefix] || { status: 'missing' }
  }

  const tiles = visible.map(set => ({ set, ...stateOf(set) }))
  const drawn = tiles.filter(t => t.status === 'ok')
  const failed = tiles.some(t => t.status === 'error')
  const credits = creditRows(drawn.map(t => t.set.prefix))

  return (
    <section className="emd-styles" aria-labelledby="emd-styles-h">
      <h3 className="emd-styles-h" id="emd-styles-h">Styles</h3>
      <ul className="emd-styles-row" tabIndex={0} aria-labelledby="emd-styles-h" aria-busy={planPending || tiles.some(t => t.status === LOADING)}>
        <li className="emd-style">
          <span className="emd-style-art"><span className="emd-style-glyph" aria-hidden="true">{glyph}</span></span>
          <span className="emd-style-label">Your device</span>
        </li>

        {planPending && (
          <li className="emd-style" aria-hidden="true">
            <span className="emd-style-art is-loading" />
            <span className="emd-style-label">&nbsp;</span>
          </li>
        )}

        {!planPending && tiles.map(t => {
          if (t.status === LOADING) {
            return (
              <li className="emd-style" key={t.set.prefix} aria-hidden="true">
                <span className="emd-style-art is-loading" />
                <span className="emd-style-label">{t.set.label}</span>
              </li>
            )
          }
          if (t.status !== 'ok') return null
          return (
            <li className="emd-style" key={t.set.prefix}>
              <span className="emd-style-art"><img className="emd-style-img" src={t.src} alt="" width="48" height="48" /></span>
              <span className="emd-style-label">{t.set.label}</span>
            </li>
          )
        })}

        {!planPending && locked.length > 0 && (
          <li className="emd-style emd-style--lock">
            <Link className="emd-lock" to="/plans" target="_blank" rel="noopener">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
                <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.8" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <span className="emd-lock-text">
                <span className="emd-lock-head">More styles on Pro</span>
                <span className="emd-lock-sub">{locked.map(s => s.label).join(', ')}</span>
              </span>
            </Link>
          </li>
        )}
      </ul>

      {failed && (
        <p className="emd-styles-note" role="status">Some styles could not be loaded. Close and reopen this to try again.</p>
      )}

      {credits.length > 0 && (
        <p className="emd-styles-credit">
          Artwork:{' '}
          {credits.map((c, i) => (
            <span key={c.prefix}>
              <a href={c.url} target="_blank" rel="noopener noreferrer">{c.name}</a>
              {` (${c.licenceName})`}
              {i < credits.length - 1 ? ', ' : '. '}
            </span>
          ))}
          <Link to="/credits" target="_blank" rel="noopener">Every licence in full</Link>
        </p>
      )}
    </section>
  )
}
