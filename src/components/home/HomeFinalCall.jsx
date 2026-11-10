import { Link } from 'react-router-dom'
import '../../styles/pages/home-footer.css'

// The page's last section: the closing headline and the way into the app. It
// paints no colour of its own. The light behind the footer's link columns and
// wordmark is drawn on the footer's box (SpectrumFooter, `home`), so this
// section and the footer read as one closing screen.
//
// "Open the toolkit" enters the app directly, with no sign-up gate.
//
// Another page can hand in its own `heading`, `lead` and `actions` (the buttons
// row); without them the homepage's words and single button stand.
const HOME_LEAD = 'Free to use, no account needed. Sign up when you want to export files or save projects and come back to them.'

export default function HomeFinalCall({ toolkitTo = '/projects', heading = 'Start your first project today.', lead = HOME_LEAD, actions = null }) {
  return (
    <section id="start" className="hm-close" aria-labelledby="start-h">
      <div className="hm-close-in">
        <h2 id="start-h" tabIndex={-1}>{heading}</h2>
        <p>{lead}</p>
        {actions ? (
          <div className="hm-close-btns">{actions}</div>
        ) : (
          <Link className="hm-close-cta" to={toolkitTo}>
            <span>Open the toolkit</span>
            <span className="mi-go hm-close-icon" aria-hidden="true">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M7 17L17 7M8 7h9v9" />
              </svg>
            </span>
          </Link>
        )}
      </div>
    </section>
  )
}
