import { Fragment, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'

// One layout for the 404, the load and crash cards, a project that is not in
// the account, a reset link that no longer works, and maintenance. The look is
// in styles/v3-edge.css.
//
//   art  'play'   the 404: a big numeral standing on the spectrum horizon
//        'calm'   a low band of the same horizon, reachable (colour)
//        'drain'  the same band in grey: offline, or down for maintenance
//   soft  a slightly stronger calm band
//
// The numeral is decoration, so it is hidden from assistive tech and never
// takes a click from the controls above it.

const ARROW = <path d="M5 12h14M13 6l6 6-6 6" />

function Arrow({ cls }) {
  return (
    <svg className={cls} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {ARROW}
    </svg>
  )
}

/** The filled pill: a link when it has `to`, a button when it has `onClick`. */
export function EdgePill({ to, onClick, go = false, reload = false, disabled = false, children, ...rest }) {
  const inner = (
    <>
      {children}
      {go && (
        <span className="ed-go" aria-hidden="true">
          <Arrow cls="ed-go-a" />
          <Arrow cls="ed-go-b" />
        </span>
      )}
    </>
  )
  if (to) return <Link className="ed-pill" to={to} reloadDocument={reload} {...rest}>{inner}</Link>
  return <button type="button" className="ed-pill" onClick={onClick} disabled={disabled} {...rest}>{inner}</button>
}

/** The outline pill beside it: the app's own `.ui-pill-out`, with its ring. */
export function EdgeOutline({ to, onClick, children, ...rest }) {
  if (to) return <Link className="ui-pill ui-pill-out ed-out" to={to} {...rest}>{children}</Link>
  return <button type="button" className="ui-pill ui-pill-out ed-out" onClick={onClick} {...rest}>{children}</button>
}

/** A path that may wrap at its slashes and hyphens on a narrow screen. Anything
 *  passed as children (the full stop) stays glued to the path's last piece. */
export function EdgePath({ path, children }) {
  // Break after each slash or hyphen (no lookbehind: older Safari throws on it).
  const parts = String(path).match(/[^/-]*[/-]?/g).filter(Boolean)
  return (
    <span className="ed-nb">
      <code className="ed-path">
        {parts.map((p, i) => (
          <Fragment key={i}>{p}{i < parts.length - 1 && <wbr />}</Fragment>
        ))}
      </code>
      {children}
    </span>
  )
}

function Swatches({ colors }) {
  if (!colors?.length) return null
  return (
    <span className="ed-sw" aria-hidden="true">
      {colors.map((c, i) => <i key={`${c}-${i}`} style={{ backgroundColor: c }} />)}
    </span>
  )
}

/** A list of places to go. `rows` are `{ to, label, desc, colors? }`. */
export function EdgeBlock({ heading, line, rows, label, current }) {
  if (!rows?.length) return null
  return (
    <div className="ed-blk">
      <h2 className="ed-h2">{heading}</h2>
      {line ? <p className="ed-line">{line}</p> : null}
      <nav aria-label={label || heading}>
        <ul className="ed-rows">
          {rows.map((r) => (
            <li key={r.to}>
              <Link className="ed-row" to={r.to} aria-current={current === r.to ? 'page' : undefined}>
                <Swatches colors={r.colors} />
                <span className="tx">
                  <span className="nm">{r.label}</span>
                  {r.desc ? <span className="ds">{r.desc}</span> : null}
                </span>
                <svg className="ch" aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}

export default function EdgeScreen({
  art = 'calm',
  soft = false,
  numeral = '',
  lead = '',
  title,
  body,
  safe,
  status,
  waiting = false,
  actions,
  trail,
  below,
  headingRef,
  focusHeading = true,
  className = '',
  ...rest
}) {
  const ownRef = useRef(null)
  const ref = headingRef || ownRef
  const play = art === 'play'
  const drain = art === 'drain'

  // The heading takes focus on arrival so a screen reader starts at the
  // problem. It has no ring: it is not a control.
  useEffect(() => {
    if (focusHeading) ref.current?.focus()
  }, [focusHeading, ref])

  const mood = play ? 'ed-play' : `ed-calm${soft ? ' ed-soft' : ''}${drain ? ' ed-drain' : ''}`
  const hasRow = !!(actions || (trail && trail.length))

  return (
    <div className={`ed ${className}`.trim()} {...rest}>
      <section className={`ed-ground ${mood}`}>
        <div className="ed-sky" aria-hidden="true">
          <div className="ed-hz" />
          <div className="ed-core" />
        </div>
        <div className="ed-wrap">
          <div className="ed-c">
            <h1 className="ed-h1" ref={ref} tabIndex={-1}>
              {lead ? <span className="ed-lead">{lead}</span> : null}
              {lead ? ' ' : null}
              {title}
            </h1>
            {body ? <p className="ed-body">{body}</p> : null}
            {safe ? <p className="ed-safe">{safe}</p> : null}
            {hasRow && (
              <div className="ed-b-row">
                {actions ? <div className="ed-acts">{actions}</div> : null}
                {trail && trail.length ? (
                  <nav className="ed-trail" aria-label="More ways back">
                    {trail.map((t) => (
                      <Link key={t.to} className="ed-tl" to={t.to} reloadDocument={!!t.reload}>{t.label}</Link>
                    ))}
                  </nav>
                ) : null}
              </div>
            )}
            <p className="ed-status" role="status" aria-live="polite" data-waiting={waiting ? '' : undefined}>{status || ''}</p>
          </div>
        </div>
        {play && (
          <div className="ed-num" aria-hidden="true">
            <span>{numeral || '404'}</span>
          </div>
        )}
      </section>
      {below ? <div className="ed-below">{below}</div> : null}
    </div>
  )
}
