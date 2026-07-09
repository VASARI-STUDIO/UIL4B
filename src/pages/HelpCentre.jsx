import { useState, useCallback } from 'react'
import { useLocation, NavLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { saveFeedback } from '../utils/analytics'

const TABS = ['about', 'faq', 'contact']

const faqs = [
  { q: 'What is UIL4B?', a: 'UIL4B (pronounced "UI LAB") is a free, community-driven design toolkit that combines frequently-used graphic design tools into one place. It includes colour systems, typography tools, image converters, AI generators, prompt libraries, and more, all designed to streamline your web design workflow.', tags: ['general'] },
  { q: 'Is UIL4B free to use?', a: 'UIL4B offers a generous free tier with all core tools and limited daily AI generations. For higher limits, quality AI models, and Pro-only features, you can upgrade to UIL4B Pro — see the Subscription section in Settings for current pricing.', tags: ['pricing'] },
  { q: 'Do I need an account to use UIL4B?', a: 'No. You can use all the tools without creating an account. Signing in with Google is optional and unlocks additional features like saving projects and syncing your preferences across devices.', tags: ['account'] },
  { q: 'What tools are included?', a: 'UIL4B includes a wide range of tools: a full Colour Studio (palette builder, tint/shade generator, gradient creator, contrast checker, and export), Type Scale calculator, Font Matcher, Font Gallery, Icon Library, Image Converter, Video to Frames extractor, AI Alt Text Generator, Prompt Library, Emoji Library, Design Reference guides, and more.', tags: ['tools'] },
  { q: 'How does the colour system work?', a: 'The Colour Studio lets you build complete colour palettes from scratch or from a base colour. You can generate tints and shades, create gradients, check contrast ratios for accessibility compliance (WCAG), and export your palette in multiple formats including CSS variables, Tailwind config, and JSON.', tags: ['tools', 'colour'] },
  { q: 'Can I export my designs?', a: 'Yes. Most tools support exporting your work. Colour palettes can be exported as CSS, Tailwind, JSON, PNG, or SVG. Typography scales can be copied as CSS. Projects can be saved and exported as JSON backups from the Settings page.', tags: ['tools', 'export'] },
  { q: 'Is my data private and secure?', a: 'Absolutely. UIL4B stores your preferences and projects locally in your browser using localStorage. There are no third-party analytics trackers, no ad networks, and no data sold to anyone. When you sign in, data syncs securely through Firebase. You can export or delete your data at any time from the Settings page.', tags: ['privacy'] },
  { q: 'How can I support the project?', a: 'The best way to support UIL4B is to upgrade to Pro or share it with others. You can also contribute by submitting feedback, reporting bugs, or suggesting new features through the Contact tab.', tags: ['general'] },
  { q: 'What browsers are supported?', a: 'UIL4B works in all modern browsers including Chrome, Firefox, Safari, and Edge. It is built as a responsive web application, so it also works on tablets and mobile devices, though the full desktop experience provides the most complete workflow.', tags: ['general'] },
  { q: 'What AI features are available?', a: 'UIL4B includes AI-powered tools like the Alt Text Generator (which creates WCAG-compliant alt text for images) and the AI Image Prompt Generator (structured JSON prompts for Midjourney, DALL-E, etc). Free users get 40 AI generations per day; Pro users get 1,000.', tags: ['tools', 'ai'] },
]

const CONTACT_TYPES = [
  { id: 'feature', label: 'Feature request', icon: (<><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></>), description: 'Suggest a new feature or improvement' },
  { id: 'bug', label: 'Bug report', icon: (<><path d="M8 2l1.88 1.88" /><path d="M14.12 3.88L16 2" /><path d="M9 7.13v-1a3.003 3.003 0 116 0v1" /><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 014-4h4a4 4 0 014 4v3c0 3.3-2.7 6-6 6" /><path d="M12 20v-9" /><path d="M6.53 9C4.6 8.8 3 7.1 3 5" /><path d="M6 13H2" /><path d="M3 21c0-2.1 1.7-3.9 3.8-4" /><path d="M20.97 5c0 2.1-1.6 3.8-3.5 4" /><path d="M22 13h-4" /><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4" /></>), description: 'Report something broken or wrong' },
  { id: 'feedback', label: 'General feedback', icon: (<><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></>), description: 'Share thoughts, impressions, or ideas' },
  { id: 'help', label: 'Need help', icon: (<><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></>), description: 'Ask a question or get assistance' },
]

function QuickActions() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 32 }}>
      <NavLink to="/feedback" style={{ textDecoration: 'none' }}>
        <div className="card-i" style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', transition: 'border-color .2s, transform .2s', padding: '16px 18px' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--brand-bg)', color: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t0)' }}>Send feedback</div>
            <div style={{ fontSize: 11, color: 'var(--t2)' }}>Bug, feature, or idea</div>
          </div>
        </div>
      </NavLink>
      <NavLink to="/community" style={{ textDecoration: 'none' }}>
        <div className="card-i" style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', transition: 'border-color .2s, transform .2s', padding: '16px 18px' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(16,185,129,.1)', color: 'var(--ok)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t0)' }}>Community</div>
            <div style={{ fontSize: 11, color: 'var(--t2)' }}>Browse shared prompts</div>
          </div>
        </div>
      </NavLink>
      <NavLink to="/settings" style={{ textDecoration: 'none' }}>
        <div className="card-i" style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', transition: 'border-color .2s, transform .2s', padding: '16px 18px' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent-bg)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 010 4h-.09" /></svg>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t0)' }}>Settings</div>
            <div style={{ fontSize: 11, color: 'var(--t2)' }}>Account & preferences</div>
          </div>
        </div>
      </NavLink>
    </div>
  )
}

function AboutTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="card" style={{ maxWidth: 820 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, color: 'var(--brand)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
          <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--t0)' }}>What is UIL4B?</span>
        </div>
        <p style={{ fontSize: 13.5, color: 'var(--t1)', lineHeight: 1.75, marginBottom: 14 }}>
          UIL4B (pronounced "UI LAB") is a free design toolkit that combines the graphic design tools you use most into a single, unified workspace. Instead of bouncing between dozens of bookmarks and browser tabs, everything lives in one place: colour systems, typography tools, image converters, AI generators, prompt libraries, and more.
        </p>
        <p style={{ fontSize: 13.5, color: 'var(--t1)', lineHeight: 1.75 }}>
          The goal is simple: help designers and developers build websites (AI-generated or handcrafted) at a quality above the rest, while saving real time in the process.
        </p>
      </div>

      <div className="card" style={{ maxWidth: 820 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, color: 'var(--brand)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
          <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--t0)' }}>The Story Behind It</span>
        </div>
        <p style={{ fontSize: 13.5, color: 'var(--t1)', lineHeight: 1.75, marginBottom: 14 }}>
          UIL4B was created by <a href="https://dylan-coleman.com/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brand)', textDecoration: 'none', fontWeight: 500 }}>Dylan Coleman</a>, a graphic designer who found himself constantly switching between the same set of design tools and resources. Rather than continuing to juggle bookmarks, Dylan decided to combine them all into one toolkit.
        </p>
        <p style={{ fontSize: 13.5, color: 'var(--t1)', lineHeight: 1.75 }}>
          What started as a personal solution quickly became something bigger. That is why UIL4B is completely free for everyone.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', maxWidth: 820 }}>
        <NavLink to="/settings" className="btn btn-accent" style={{ display: 'inline-flex', gap: 8, padding: '10px 24px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
          Upgrade to Pro
        </NavLink>
        <NavLink to="/privacy" className="btn" style={{ display: 'inline-flex', gap: 8, padding: '10px 20px' }}>Privacy Policy</NavLink>
        <NavLink to="/terms" className="btn" style={{ display: 'inline-flex', gap: 8, padding: '10px 20px' }}>Terms of Service</NavLink>
      </div>
    </div>
  )
}

function FAQTab() {
  const [openIndex, setOpenIndex] = useState(null)
  const [search, setSearch] = useState('')

  const filtered = search.trim()
    ? faqs.filter(f => f.q.toLowerCase().includes(search.toLowerCase()) || f.a.toLowerCase().includes(search.toLowerCase()))
    : faqs

  return (
    <div style={{ maxWidth: 820 }}>
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search FAQs..."
          style={{ width: '100%', padding: '10px 12px 10px 34px', fontSize: 13, border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--card)', color: 'var(--t0)', fontFamily: 'inherit' }}
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--t2)', fontSize: 13 }}>
            No matching questions found. Try a different search term or <NavLink to="/help#contact" style={{ color: 'var(--brand)' }}>contact us</NavLink>.
          </div>
        )}
        {filtered.map((faq) => {
          const realIdx = faqs.indexOf(faq)
          const isOpen = openIndex === realIdx
          return (
            <div key={realIdx} className="card" style={{ padding: 0, overflow: 'hidden', transition: 'border-color .2s', borderColor: isOpen ? 'var(--brand)' : undefined }}>
              <button
                type="button"
                onClick={() => setOpenIndex(prev => prev === realIdx ? null : realIdx)}
                aria-expanded={isOpen}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, width: '100%', padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', color: 'var(--t0)', fontSize: 13.5, fontWeight: 600, lineHeight: 1.5, fontFamily: 'inherit' }}
              >
                <span>{faq.q}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, color: 'var(--t3)', transition: 'transform .2s', transform: isOpen ? 'rotate(180deg)' : 'none' }}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              <div style={{ maxHeight: isOpen ? 400 : 0, opacity: isOpen ? 1 : 0, overflow: 'hidden', transition: 'max-height .3s cubic-bezier(.16,1,.3,1), opacity .25s' }}>
                <div style={{ padding: '0 20px 18px', fontSize: 13, color: 'var(--t1)', lineHeight: 1.75 }}>{faq.a}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ContactTab() {
  const { user, userProfile } = useAuth()
  const [type, setType] = useState(null)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(false)

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    if (!message.trim() || !type) return
    setSending(true)
    setError(false)
    const email = user?.email || ''
    // saveFeedback takes a single entry object — the previous positional call
    // wrote a corrupt localStorage record and dropped message/email/subject.
    saveFeedback({ type, subject: subject || `[${type}]`, message: message.trim(), email, source: 'help-centre' })
    let ok = false
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, subject: subject || `[${type}]`, message, email, name: userProfile?.displayName || '' }),
      })
      ok = res.ok
    } catch {
      ok = false
    }
    setSending(false)
    if (ok) setSent(true)
    else setError(true)
  }, [type, subject, message, user, userProfile])

  const reset = () => {
    setType(null)
    setSubject('')
    setMessage('')
    setSent(false)
    setError(false)
  }

  if (sent) {
    return (
      <div style={{ maxWidth: 560, textAlign: 'center', padding: '48px 24px' }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16 }}>
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
        </svg>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Thanks for reaching out!</h3>
        <p style={{ fontSize: 13, color: 'var(--t1)', lineHeight: 1.7, marginBottom: 20 }}>
          We&apos;ve received your {type === 'bug' ? 'bug report' : type === 'feature' ? 'feature request' : 'message'} and will get back to you if needed.
        </p>
        <button className="btn btn-accent" onClick={reset}>Submit another</button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 640 }}>
      {!type ? (
        <>
          <p style={{ fontSize: 13, color: 'var(--t1)', marginBottom: 16 }}>What would you like to do?</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {CONTACT_TYPES.map(ct => (
              <button
                key={ct.id}
                type="button"
                onClick={() => setType(ct.id)}
                className="card-i"
                style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '16px 18px', cursor: 'pointer', border: '1px solid var(--border)', background: 'var(--card)', textAlign: 'left', fontFamily: 'inherit', transition: 'border-color .2s, transform .15s' }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--brand-bg)', color: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{ct.icon}</svg>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t0)', marginBottom: 2 }}>{ct.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--t2)', lineHeight: 1.5 }}>{ct.description}</div>
                </div>
              </button>
            ))}
          </div>
        </>
      ) : (
        <form onSubmit={handleSubmit}>
          <button type="button" onClick={() => setType(null)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: 'var(--t2)', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginBottom: 16, fontFamily: 'inherit', padding: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            Back to categories
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--brand-bg)', color: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {CONTACT_TYPES.find(ct => ct.id === type)?.icon}
              </svg>
            </div>
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--t0)' }}>{CONTACT_TYPES.find(ct => ct.id === type)?.label}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
                {type === 'bug' ? 'What went wrong?' : type === 'feature' ? 'Feature name' : 'Subject'} <span style={{ color: 'var(--t3)', fontWeight: 400 }}>(optional)</span>
              </label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder={type === 'bug' ? 'e.g. Export button not working' : type === 'feature' ? 'e.g. Dark mode scheduling' : 'Brief summary'}
                style={{ width: '100%', padding: '10px 12px', fontSize: 13, border: '1px solid var(--border)', borderRadius: 'var(--radius-s)', background: 'var(--card)', color: 'var(--t0)', fontFamily: 'inherit' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
                {type === 'bug' ? 'Steps to reproduce & details' : 'Message'} <span style={{ color: 'var(--err)' }}>*</span>
              </label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                required
                rows={5}
                placeholder={type === 'bug' ? '1. Go to...\n2. Click on...\n3. Expected: ...\n4. Actual: ...' : type === 'feature' ? 'Describe what you\'d like and why it would be useful...' : 'Your message...'}
                style={{ width: '100%', padding: '10px 12px', fontSize: 13, border: '1px solid var(--border)', borderRadius: 'var(--radius-s)', background: 'var(--card)', color: 'var(--t0)', fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.6 }}
              />
            </div>
            {user && (
              <div style={{ fontSize: 11, color: 'var(--t3)' }}>
                Sending as {user.email}
              </div>
            )}
            {error && (
              <div role="alert" style={{ fontSize: 12, color: 'var(--err)', background: 'color-mix(in srgb, var(--err) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--err) 30%, transparent)', borderRadius: 'var(--radius-s)', padding: '10px 12px' }}>
                Something went wrong sending that. Please check your connection and try again.
              </div>
            )}
            <button type="submit" className="btn btn-accent" disabled={sending || !message.trim()} style={{ alignSelf: 'flex-start', padding: '10px 28px' }}>
              {sending ? 'Sending...' : 'Submit'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

export default function HelpCentre() {
  const location = useLocation()
  const hashTab = location.hash?.slice(1)
  const initialTab = TABS.includes(hashTab) ? hashTab : 'about'
  const [tab, setTab] = useState(initialTab)

  const tabLabels = { about: 'About', faq: 'FAQ', contact: 'Contact' }

  return (
    <div className="sec">
      <div className="sec-h">
        <div className="sec-h-eyebrow">Help Centre</div>
        <h1>How can we help?</h1>
        <p>Learn about UIL4B, find answers, or get in touch.</p>
      </div>

      <QuickActions />

      <div style={{ display: 'flex', gap: 4, marginBottom: 28, background: 'var(--bg-2)', borderRadius: 'var(--radius)', padding: 4, width: 'fit-content', border: '1px solid var(--border)' }}>
        {TABS.map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            style={{
              padding: '8px 20px',
              fontSize: 12,
              fontWeight: tab === t ? 600 : 400,
              border: 'none',
              cursor: 'pointer',
              borderRadius: 'var(--radius-s)',
              background: tab === t ? 'var(--card)' : 'transparent',
              color: tab === t ? 'var(--t0)' : 'var(--t2)',
              boxShadow: tab === t ? 'var(--warm-shadow)' : 'none',
              transition: 'all .2s',
              fontFamily: 'inherit',
            }}
          >
            {tabLabels[t]}
          </button>
        ))}
      </div>

      {tab === 'about' && <AboutTab />}
      {tab === 'faq' && <FAQTab />}
      {tab === 'contact' && <ContactTab />}
    </div>
  )
}
