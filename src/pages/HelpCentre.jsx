import { useState } from 'react'
import { useLocation, NavLink } from 'react-router-dom'

const TABS = ['about', 'faq', 'support']

const faqs = [
  { q: 'What is UIL4B?', a: 'UIL4B (pronounced "UI LAB") is a free, community-driven design toolkit that combines frequently-used graphic design tools into one place. It includes colour systems, typography tools, image converters, AI generators, prompt libraries, and more, all designed to streamline your web design workflow.' },
  { q: 'Is UIL4B free to use?', a: 'Yes, UIL4B is completely free for everyone. It started as a personal project and grew into a community resource. There are no paid tiers or paywalls. If you find it helpful and want to support development, you can buy the creator a coffee at buymeacoffee.com/dylan.coleman.' },
  { q: 'Do I need an account to use UIL4B?', a: 'No. You can use all the tools without creating an account. Signing in with Google is optional and unlocks additional features like saving projects and syncing your preferences across devices.' },
  { q: 'What tools are included?', a: 'UIL4B includes a wide range of tools: a full Colour Studio (palette builder, tint/shade generator, gradient creator, contrast checker, and export), Type Scale calculator, Font Matcher, Font Gallery, Icon Library, Image Converter, Video to Frames extractor, AI Alt Text Generator, Prompt Library, Emoji Library, Design Reference guides, and more.' },
  { q: 'How does the colour system work?', a: 'The Colour Studio lets you build complete colour palettes from scratch or from a base colour. You can generate tints and shades, create gradients, check contrast ratios for accessibility compliance (WCAG), and export your palette in multiple formats including CSS variables, Tailwind config, and JSON.' },
  { q: 'Can I export my designs?', a: 'Yes. Most tools support exporting your work. Colour palettes can be exported as CSS, Tailwind, JSON, or image files. Typography scales can be copied as CSS. Projects can be saved and exported as JSON backups from the Settings page.' },
  { q: 'Is my data private and secure?', a: 'Absolutely. UIL4B stores your preferences and projects locally in your browser using localStorage. There are no third-party analytics trackers, no ad networks, and no data sold to anyone. When you sign in, data syncs securely through Firebase. You can export or delete your data at any time from the Settings page.' },
  { q: 'How can I support the project?', a: 'The best way to support UIL4B is to use it and share it with others. If you want to contribute financially, you can buy the creator a coffee at buymeacoffee.com/dylan.coleman. You can also contribute by submitting feedback, reporting bugs, or suggesting new features through the Support tab.' },
  { q: 'What browsers are supported?', a: 'UIL4B works in all modern browsers including Chrome, Firefox, Safari, and Edge. It is built as a responsive web application, so it also works on tablets and mobile devices, though the full desktop experience provides the most complete workflow.' },
  { q: 'What AI features are available, and are there usage limits?', a: 'UIL4B includes AI-powered tools like the Alt Text Generator (which creates descriptive alt text for images) and the Prompt Library (a curated collection of AI prompts for design tasks). AI features that run locally in your browser have no usage limits. Features that rely on external AI services may have reasonable rate limits to keep the service free and available for everyone.' },
]

function AboutTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="card" style={{ maxWidth: 820 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, color: 'var(--accent)' }}>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, color: 'var(--accent)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
          <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--t0)' }}>The Story Behind It</span>
        </div>
        <p style={{ fontSize: 13.5, color: 'var(--t1)', lineHeight: 1.75, marginBottom: 14 }}>
          UIL4B was created by <a href="https://dylan-coleman.com/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>Dylan Coleman</a>, a graphic designer who found himself constantly switching between the same set of design tools and resources. Rather than continuing to juggle bookmarks, Dylan decided to combine them all into one toolkit and find ways to make them work together, building new possibilities along the way.
        </p>
        <p style={{ fontSize: 13.5, color: 'var(--t1)', lineHeight: 1.75 }}>
          What started as a personal solution quickly became something bigger. That is why UIL4B is completely free for everyone.
        </p>
      </div>

      <div className="card" style={{ maxWidth: 820 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, color: 'var(--accent)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
          <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--t0)' }}>Support the Project</span>
        </div>
        <p style={{ fontSize: 13.5, color: 'var(--t1)', lineHeight: 1.75, marginBottom: 18 }}>
          UIL4B is free and always will be. If you find it useful and want to support continued development, you can buy Dylan a coffee. Every contribution helps keep the toolkit maintained, improved, and accessible to everyone.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <a href="https://buymeacoffee.com/dylan.coleman" target="_blank" rel="noopener noreferrer" className="btn btn-accent" style={{ display: 'inline-flex', gap: 8, padding: '10px 24px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
            Buy Me a Coffee
          </a>
          <a href="https://dylan-coleman.com/" target="_blank" rel="noopener noreferrer" className="btn" style={{ display: 'inline-flex', gap: 8, padding: '10px 24px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" /></svg>
            View Portfolio
          </a>
        </div>
      </div>
    </div>
  )
}

function FAQTab() {
  const [openIndex, setOpenIndex] = useState(null)
  return (
    <div style={{ maxWidth: 820, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {faqs.map((faq, i) => {
        const isOpen = openIndex === i
        return (
          <div key={i} className="card" style={{ padding: 0, overflow: 'hidden', transition: 'border-color .2s', borderColor: isOpen ? 'var(--accent)' : undefined }}>
            <button type="button" onClick={() => setOpenIndex(prev => prev === i ? null : i)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, width: '100%', padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', color: 'var(--t0)', fontSize: 13.5, fontWeight: 600, lineHeight: 1.5, fontFamily: 'inherit' }}>
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
  )
}

function SupportTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 820 }}>
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, color: 'var(--accent)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
          <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--t0)' }}>Get in touch</span>
        </div>
        <p style={{ fontSize: 13.5, color: 'var(--t1)', lineHeight: 1.75, marginBottom: 18 }}>
          Found a bug, have a feature request, or just want to say hello? We would love to hear from you.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <NavLink to="/feedback" className="btn btn-accent" style={{ display: 'inline-flex', gap: 8, padding: '10px 24px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
            Send Feedback
          </NavLink>
          <NavLink to="/community" className="btn" style={{ display: 'inline-flex', gap: 8, padding: '10px 24px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
            Community
          </NavLink>
        </div>
      </div>
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, color: 'var(--accent)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
          <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--t0)' }}>Legal</span>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <NavLink to="/privacy" className="btn" style={{ display: 'inline-flex', gap: 8, padding: '10px 20px' }}>Privacy Policy</NavLink>
          <NavLink to="/terms" className="btn" style={{ display: 'inline-flex', gap: 8, padding: '10px 20px' }}>Terms of Service</NavLink>
        </div>
      </div>
    </div>
  )
}

export default function HelpCentre() {
  const location = useLocation()
  const hashTab = location.hash?.slice(1)
  const initialTab = TABS.includes(hashTab) ? hashTab : 'about'
  const [tab, setTab] = useState(initialTab)

  const tabLabels = { about: 'About', faq: 'FAQ', support: 'Support' }

  return (
    <div className="sec">
      <div className="sec-h">
        <div className="sec-h-eyebrow">Help Centre</div>
        <h1>How can we <em>help</em>?</h1>
        <p>Learn about UIL4B, find answers to common questions, or get in touch.</p>
      </div>

      <div className="help-tabs" style={{ display: 'flex', gap: 4, marginBottom: 28, background: 'var(--bg-2)', borderRadius: 'var(--radius)', padding: 4, width: 'fit-content', border: '1px solid var(--border)' }}>
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
      {tab === 'support' && <SupportTab />}
    </div>
  )
}
