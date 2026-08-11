// The shared network-state strip for the three typography tools.
//
// All three read the same Google Fonts catalog, so they say the same thing when
// it misbehaves rather than each inventing their own wording. Two pieces:
//
//   <FontCatalogLoading> — the first-fetch state. A tool renders this INSTEAD
//     of its workbench, so nothing half-built ever flashes on screen.
//   <FontCatalogNotice>  — the persistent banner shown ABOVE a working
//     workbench when the browser is offline or the catalog fell back to the
//     bundled list. Always names a recovery path; never blocks the tool.
//
// Both are polite live regions: the catalog resolving is information, not an
// interruption, and `role="status"` won't yank a screen-reader mid-sentence.

function WarnIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
}

export function FontCatalogLoading({ label = 'Loading the Google Fonts catalogue' }) {
  return (
    <div className="typ-loading" role="status" aria-live="polite">
      <div className="fg-loader" />
      <strong>{label}</strong>
      <span>If it can&rsquo;t be reached, a bundled list of popular families takes over so you can keep working.</span>
    </div>
  )
}

export function FontCatalogNotice({ online, degraded, onRetry, retrying, count }) {
  if (online === false) {
    return (
      <div className="typ-notice" role="status" aria-live="polite">
        <WarnIcon />
        <div>
          <strong>You&rsquo;re offline — previews will use system fonts.</strong>
          <span>
            Everything else keeps working: the {count ? `${count.toLocaleString()} ` : ''}families
            already loaded stay browsable, and your settings and exports are unaffected. The full
            catalogue reloads by itself when you reconnect.
          </span>
        </div>
      </div>
    )
  }

  if (!degraded) return null

  return (
    <div className="typ-notice" role="status" aria-live="polite">
      <WarnIcon />
      <div>
        <strong>Showing a bundled list of {count ? count.toLocaleString() : 'popular'} families.</strong>
        {/* The old copy said "Google's font catalogue couldn't be reached",
            which the audit caught being wrong: fonts.googleapis.com and
            fonts.gstatic.com were both returning 200 while this showed. It is
            the catalogue LISTING API that failed — a different request with a
            different cause — so blaming the network sent people looking in the
            wrong place. The specimens keep rendering either way, which is the
            observable clue this now points at. */}
        <span>
          The full family listing didn&rsquo;t load. Font rendering is unaffected — if specimens
          below look right, this is the catalogue request alone, not your connection.
          A privacy or ad-blocking extension is the usual cause. Every tool still works
          on this shorter list.
        </span>
        <button type="button" className="typ-notice-retry" onClick={onRetry} disabled={retrying}>
          {retrying ? 'Retrying…' : 'Try the full catalogue again'}
        </button>
      </div>
    </div>
  )
}
