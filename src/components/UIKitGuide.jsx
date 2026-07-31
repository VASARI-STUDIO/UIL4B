import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const isGuideActive = () => {
  try { return sessionStorage.getItem(UIKIT_GUIDE_KEY) === '1' } catch { return false }
}

// Session flag set by the dashboard's "Build a UI Kit" action.
export const UIKIT_GUIDE_KEY = 'vs-uikit-guide'

// The ordered steps of the guided UI-kit builder. Each page in the flow renders
// <UIKitGuide step="..."> so it knows where it sits and where to send the user next.
export const UIKIT_STEPS = [
  { id: 'color', path: '/color', label: 'Colours', blurb: 'Pick your palette' },
  // /fontpairs, not the old /fonts — that path was never routed, so this step
  // used to fall through the router's wildcard and land the guide on the
  // homepage. The pairing tool is the right destination anyway: it is where
  // both roles get chosen at once.
  { id: 'fonts', path: '/fontpairs', label: 'Fonts', blurb: 'Pick your fonts' },
  { id: 'typescale', path: '/typescale', label: 'Type scale', blurb: 'Set your sizes' },
  { id: 'icons', path: '/icons', label: 'Icons', blurb: 'Choose icons' },
]

export default function UIKitGuide({ step }) {
  const navigate = useNavigate()
  const [active, setActive] = useState(isGuideActive)
  // Show the explainer popup once, on the very first step (colours).
  const [showIntro, setShowIntro] = useState(() => {
    if (step !== 'color' || !isGuideActive()) return false
    try { return sessionStorage.getItem(UIKIT_GUIDE_KEY + '-seen') !== '1' } catch { return false }
  })

  const idx = UIKIT_STEPS.findIndex(s => s.id === step)
  const next = idx >= 0 ? UIKIT_STEPS[idx + 1] : null

  const dismissIntro = () => {
    setShowIntro(false)
    try { sessionStorage.setItem(UIKIT_GUIDE_KEY + '-seen', '1') } catch { /* ignore */ }
  }

  const finish = () => {
    try { sessionStorage.removeItem(UIKIT_GUIDE_KEY) } catch { /* ignore */ }
    setActive(false)
    navigate('/dashboard')
  }

  if (!active) return null

  return (
    <>
      {showIntro && (
        <div className="uikit-intro-overlay" onClick={dismissIntro}>
          <div className="uikit-intro" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Build a UI Kit">
            <div className="uikit-intro-eyebrow">Build a UI Kit</div>
            <h2 className="uikit-intro-title">Let&rsquo;s build your kit, step by step.</h2>
            <p className="uikit-intro-body">
              Start here with your <strong>colour palette</strong>. Everything you set is saved
              automatically as you go, so you can move between steps freely. When a step is done,
              use the <strong>Next step</strong> bar at the bottom of the page to continue.
            </p>
            <ol className="uikit-intro-steps">
              {UIKIT_STEPS.map((s, i) => (
                <li key={s.id} className={s.id === step ? 'is-current' : ''}>
                  <span className="uikit-intro-num">{i + 1}</span>
                  <span><strong>{s.label}</strong> — {s.blurb}</span>
                </li>
              ))}
            </ol>
            <button type="button" className="btn btn-accent" onClick={dismissIntro}>Start with colours</button>
          </div>
        </div>
      )}

      <div className="uikit-stepbar">
        <div className="uikit-stepbar-progress">
          <span className="uikit-stepbar-label">UI Kit · Step {idx + 1} of {UIKIT_STEPS.length}</span>
          <div className="uikit-stepbar-dots">
            {UIKIT_STEPS.map((s, i) => (
              <span key={s.id} className={`uikit-dot${i === idx ? ' is-current' : ''}${i < idx ? ' is-done' : ''}`} title={s.label} />
            ))}
          </div>
        </div>
        {next ? (
          <button type="button" className="btn btn-accent uikit-stepbar-next" onClick={() => navigate(next.path)}>
            Next: {next.label}
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
          </button>
        ) : (
          <button type="button" className="btn btn-accent uikit-stepbar-next" onClick={finish}>
            Finish &amp; review
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          </button>
        )}
        <button type="button" className="uikit-stepbar-close" onClick={finish} aria-label="Close guide" title="Exit guided flow">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>
      </div>
    </>
  )
}
