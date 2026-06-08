import { useNavigate } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import { CATEGORIES } from '../data/tools'

const VISITED_KEY = 'vs-visited'

const HIGHLIGHTS = [
  {
    title: 'Everything in one place',
    body: 'Colour systems, typography, image tools, AI generators and design references — no more juggling a dozen browser tabs.',
    icon: (<><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>),
  },
  {
    title: 'Free, no strings',
    body: 'Open the toolkit and start building right away. No paywall, no trial timer. Create a free account only when you want the AI tools or to save projects.',
    icon: (<><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></>),
  },
  {
    title: 'Built for real workflows',
    body: 'Export production-ready design systems, generate palettes from colour theory, and reference the tokens you actually use day to day.',
    icon: (<><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></>),
  },
]

export default function Landing() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()

  const enter = () => {
    try { localStorage.setItem(VISITED_KEY, '1') } catch { /* ignore */ }
    navigate('/')
  }

  const signIn = () => {
    try { localStorage.setItem(VISITED_KEY, '1') } catch { /* ignore */ }
    navigate('/login')
  }

  return (
    <div className="landing">
      <header className="landing-nav">
        <div className="landing-brand">
          <span className="landing-brand-mark">UIL4B</span>
          <span className="landing-brand-sub">Design Toolkit</span>
        </div>
        <div className="landing-nav-actions">
          <button type="button" className="landing-theme" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === 'dark' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
            )}
          </button>
          <button type="button" className="btn landing-signin" onClick={signIn}>Sign in</button>
        </div>
      </header>

      <main className="landing-main">
        {/* Hero */}
        <section className="landing-hero">
          <span className="landing-eyebrow">A free toolkit for designers and developers</span>
          <h1 className="landing-title">
            Every design tool<br /><em>you reach for</em>, together.
          </h1>
          <p className="landing-lede">
            UIL4B brings your most-used graphic design tools into one fast, unified workspace.
            Build colour systems, pair fonts, convert images, write AI prompts and export a
            complete design system without leaving the page.
          </p>
          <div className="landing-cta-row">
            <button type="button" className="btn btn-accent landing-cta-primary" onClick={enter}>
              Open the toolkit
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
            </button>
            <button type="button" className="btn landing-cta-secondary" onClick={signIn}>Create free account</button>
          </div>
          <span className="landing-cta-note">No signup required to explore. Free forever.</span>
        </section>

        {/* Category showcase */}
        <section className="landing-cats">
          {CATEGORIES.map(cat => (
            <div key={cat.id} className="landing-cat-card">
              <span className="landing-cat-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{cat.icon}</svg>
              </span>
              <span className="landing-cat-label">{cat.label}</span>
              <span className="landing-cat-desc">{cat.description}</span>
            </div>
          ))}
        </section>

        {/* Highlights */}
        <section className="landing-highlights">
          {HIGHLIGHTS.map(h => (
            <div key={h.title} className="landing-highlight">
              <span className="landing-highlight-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{h.icon}</svg>
              </span>
              <h3>{h.title}</h3>
              <p>{h.body}</p>
            </div>
          ))}
        </section>

        {/* Closing CTA */}
        <section className="landing-closing">
          <h2>Start designing in seconds.</h2>
          <p>Jump straight into the toolkit. Your work is saved locally, and an account unlocks AI tools and synced projects whenever you are ready.</p>
          <button type="button" className="btn btn-accent landing-cta-primary" onClick={enter}>
            Open the toolkit
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
          </button>
        </section>
      </main>

      <footer className="landing-footer">
        <span>Made by <a href="https://dylan-coleman.com/" target="_blank" rel="noopener noreferrer">Dylan Coleman</a></span>
        <span className="landing-footer-sep">·</span>
        <a href="https://buymeacoffee.com/dylan.coleman" target="_blank" rel="noopener noreferrer">Buy me a coffee</a>
      </footer>
    </div>
  )
}
