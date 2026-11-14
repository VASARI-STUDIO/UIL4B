import { useRef } from 'react'

// The quiet block a viewer sees where a free viewer sees the upsell, for as long
// as the library is not ready: the account is still being checked, the rest of
// the library is on its way from the server, or it could not be fetched.
// Returns nothing once the library is ready (and for anyone who is not Pro).
//
// `noun` names the library ("palette library"). The waiting states hold a
// minimum height (.lockt-status--reserve) so the page does not jump when the
// full set lands in place of the free rows.
//
// `row` draws it as a plain line (the message, and Retry as an outline pill)
// for a page that places it under its results heading. Retry hands focus to
// the status line first, so a keyboard user is not left on a button that has
// just been replaced.
export default function ProLibraryStatus({ library, noun = 'library', row = false }) {
  const rowEl = useRef(null)
  if (!library || library.status === 'idle' || library.status === 'ready') return null
  const rowProps = row ? { ref: rowEl, tabIndex: -1 } : {}
  if (library.status === 'error' || library.status === 'refused') {
    const refused = library.status === 'refused'
    return (
      <div className={row ? 'lockt-status lockt-status--row' : 'lockt-cta lockt-status'} role="status" {...rowProps}>
        <div className="lockt-cta-copy">
          <p className="lockt-cta-body">
            {refused
              ? `We couldn’t confirm your Pro access for the ${noun}. Retry, or reload the page.`
              : `The rest of the ${noun} didn’t load.`}
          </p>
        </div>
        {row
          ? (
            <button
              type="button"
              className="ui-pill ui-pill-out"
              onClick={() => { rowEl.current?.focus(); library.retry() }}
            >
              Retry
            </button>
          )
          : <button type="button" className="btn btn-s lockt-cta-btn" onClick={library.retry}>Retry</button>}
      </div>
    )
  }
  const resolving = library.status === 'resolving'
  return (
    <div
      className={`${row ? 'lockt-status lockt-status--row' : 'lockt-cta lockt-status'} lockt-status--reserve`}
      role="status"
      {...rowProps}
    >
      <div className="lockt-cta-copy">
        <p className="lockt-cta-body">{resolving ? `Loading the ${noun}…` : `Loading the full ${noun}…`}</p>
      </div>
    </div>
  )
}
