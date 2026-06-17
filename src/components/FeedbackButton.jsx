import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import FeedbackModal from './FeedbackModal'

// Persistent, low-profile way to reach the feedback form from anywhere in the app.
// Clicking it opens a modal (rather than navigating) so the user keeps their place.
// Hidden on the feedback page itself to avoid redundancy.
export default function FeedbackButton() {
  const location = useLocation()
  const [open, setOpen] = useState(false)
  if (location.pathname === '/feedback') return null
  return (
    <>
      <button
        type="button"
        className="global-feedback-btn"
        onClick={() => setOpen(true)}
        title="Share feedback"
        aria-label="Share feedback"
        aria-haspopup="dialog"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <span>Feedback</span>
      </button>
      <FeedbackModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}
