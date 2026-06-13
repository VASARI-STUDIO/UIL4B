import { useNavigate, useLocation } from 'react-router-dom'

// Persistent, low-profile way to reach the feedback form from anywhere in the app.
// Hidden on the feedback page itself to avoid redundancy.
export default function FeedbackButton() {
  const navigate = useNavigate()
  const location = useLocation()
  if (location.pathname === '/feedback') return null
  return (
    <button
      type="button"
      className="global-feedback-btn"
      onClick={() => navigate('/feedback')}
      title="Share feedback"
      aria-label="Share feedback"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
      <span>Feedback</span>
    </button>
  )
}
