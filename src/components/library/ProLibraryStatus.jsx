// The quiet line a Pro viewer sees where a free viewer sees the upsell: the rest
// of the library is on its way from the server, or could not be fetched.
// Returns nothing once the library is ready (and for anyone who is not Pro).
export default function ProLibraryStatus({ library, noun = 'library' }) {
  if (!library || library.status === 'idle' || library.status === 'ready') return null
  if (library.status === 'error') {
    return (
      <div className="lockt-cta lockt-status" role="status">
        <div className="lockt-cta-copy">
          <p className="lockt-cta-body">{`The rest of the ${noun} didn’t load.`}</p>
        </div>
        <button type="button" className="btn btn-s lockt-cta-btn" onClick={library.retry}>Retry</button>
      </div>
    )
  }
  return (
    <div className="lockt-cta lockt-status" role="status">
      <div className="lockt-cta-copy">
        <p className="lockt-cta-body">{`Loading the full ${noun}…`}</p>
      </div>
    </div>
  )
}
