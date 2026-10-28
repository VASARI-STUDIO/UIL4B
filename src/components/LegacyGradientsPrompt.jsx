// The question asked of a signed-in person whose browser holds gradients an
// earlier visit left behind. A shared machine can hold someone else's work, so
// nothing moves until they press Keep; "Not mine" moves nothing and stops the
// question for this account until the tab session ends.
//
//   count     how many are waiting
//   busy      Keep is running
//   onKeep    () => void
//   onDismiss () => void
export default function LegacyGradientsPrompt({ count, busy = false, onKeep, onDismiss }) {
  const noun = count === 1 ? 'gradient' : 'gradients'
  return (
    <div className="lgp" role="group" aria-label="Gradients from this browser">
      <p className="lgp-text">
        {count} {noun} from this browser {count === 1 ? 'is' : 'are'} waiting. Keep {count === 1 ? 'it' : 'them'} with this account?
      </p>
      <div className="lgp-actions">
        <button type="button" className="btn btn-s btn-accent" onClick={onKeep} disabled={busy} aria-busy={busy || undefined}>
          {busy ? 'Keeping…' : 'Keep'}
        </button>
        <button type="button" className="btn btn-s btn-ghost" onClick={onDismiss} disabled={busy}>Not mine</button>
      </div>
    </div>
  )
}
