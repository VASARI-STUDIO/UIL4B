import { useState } from 'react'

const faqs = [
  {
    q: 'What is UIL4B?',
    a: 'UIL4B (pronounced "UI LAB") is a free, community-driven design toolkit that combines frequently-used graphic design tools into one place. It includes colour systems, typography tools, image converters, AI generators, prompt libraries, and more, all designed to streamline your web design workflow.',
  },
  {
    q: 'Is UIL4B free to use?',
    a: 'Yes, UIL4B is completely free for everyone. It started as a personal project and grew into a community resource. There are no paid tiers or paywalls. If you find it helpful and want to support development, you can buy the creator a coffee at buymeacoffee.com/dylan.coleman.',
  },
  {
    q: 'Do I need an account to use UIL4B?',
    a: 'No. You can use all the tools without creating an account. Signing in with Google is optional and unlocks additional features like saving projects and syncing your preferences across devices.',
  },
  {
    q: 'What tools are included?',
    a: 'UIL4B includes a wide range of tools: a full Colour Studio (palette builder, tint/shade generator, gradient creator, contrast checker, and export), Type Scale calculator, Font Matcher, Font Gallery, Icon Library, Image Converter, Video to Frames extractor, AI Alt Text Generator, Prompt Library, Emoji Library, Design Reference guides, and more. New tools are added regularly based on community feedback.',
  },
  {
    q: 'How does the colour system work?',
    a: 'The Colour Studio lets you build complete colour palettes from scratch or from a base colour. You can generate tints and shades, create gradients, check contrast ratios for accessibility compliance (WCAG), and export your palette in multiple formats including CSS variables, Tailwind config, and JSON.',
  },
  {
    q: 'Can I export my designs?',
    a: 'Yes. Most tools support exporting your work. Colour palettes can be exported as CSS, Tailwind, JSON, or image files. Typography scales can be copied as CSS. Projects can be saved and exported as JSON backups from the Settings page.',
  },
  {
    q: 'Is my data private and secure?',
    a: 'Absolutely. UIL4B stores your preferences and projects locally in your browser using localStorage. There are no third-party analytics trackers, no ad networks, and no data sold to anyone. When you sign in, data syncs securely through Firebase. You can export or delete your data at any time from the Settings page.',
  },
  {
    q: 'How can I support the project?',
    a: 'The best way to support UIL4B is to use it and share it with others. If you want to contribute financially, you can buy the creator a coffee at buymeacoffee.com/dylan.coleman. You can also contribute by submitting feedback, reporting bugs, or suggesting new features through the Feedback page.',
  },
  {
    q: 'Can I contribute to the community?',
    a: 'Yes! UIL4B is community-driven. You can contribute by sharing design resources, suggesting new tools or features, reporting issues on GitHub, or participating in discussions. Visit the Community page for links to the GitHub repository and discussion forums.',
  },
  {
    q: 'What browsers are supported?',
    a: 'UIL4B works in all modern browsers including Chrome, Firefox, Safari, and Edge. It is built as a responsive web application, so it also works on tablets and mobile devices, though the full desktop experience provides the most complete workflow.',
  },
  {
    q: 'Is there a mobile app?',
    a: 'There is no dedicated mobile app at this time. UIL4B is a web application that works in your mobile browser. The interface is responsive and adapts to smaller screens, so you can access tools on the go.',
  },
  {
    q: 'How do I report bugs or request features?',
    a: 'You can use the Support page (accessible from the sidebar) to submit bug reports, feature requests, or general feedback. You can also open an issue on the GitHub repository for technical bugs or feature discussions.',
  },
  {
    q: 'What AI features are available, and are there usage limits?',
    a: 'UIL4B includes AI-powered tools like the Alt Text Generator (which creates descriptive alt text for images) and the Prompt Library (a curated collection of AI prompts for design tasks). AI features that run locally in your browser have no usage limits. Features that rely on external AI services may have reasonable rate limits to keep the service free and available for everyone.',
  },
]

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(null)

  const toggle = (i) => {
    setOpenIndex(prev => (prev === i ? null : i))
  }

  return (
    <div className="sec">
      <div className="sec-h">
        <div className="sec-h-eyebrow">FAQ</div>
        <h1>Frequently <em>asked</em>.</h1>
        <p>Answers to the most common questions about UIL4B and how it works.</p>
      </div>

      <div style={{ maxWidth: 820, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {faqs.map((faq, i) => {
          const isOpen = openIndex === i
          return (
            <div
              key={i}
              className="card"
              style={{
                padding: 0,
                overflow: 'hidden',
                transition: 'border-color .2s',
                borderColor: isOpen ? 'var(--accent)' : undefined,
              }}
            >
              <button
                type="button"
                onClick={() => toggle(i)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                  width: '100%',
                  padding: '18px 22px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  color: 'var(--t0)',
                  fontSize: 14,
                  fontWeight: 600,
                  lineHeight: 1.5,
                  fontFamily: 'inherit',
                }}
              >
                <span>{faq.q}</span>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    flexShrink: 0,
                    color: 'var(--t3)',
                    transition: 'transform .2s',
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              <div
                style={{
                  maxHeight: isOpen ? 400 : 0,
                  opacity: isOpen ? 1 : 0,
                  overflow: 'hidden',
                  transition: 'max-height .3s cubic-bezier(.16,1,.3,1), opacity .25s',
                }}
              >
                <div style={{ padding: '0 22px 20px', fontSize: 13.5, color: 'var(--t1)', lineHeight: 1.75 }}>
                  {faq.a}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ marginTop: 40, maxWidth: 820 }}>
        <div className="card" style={{ textAlign: 'center', padding: '32px 24px' }}>
          <p style={{ fontSize: 14, color: 'var(--t1)', marginBottom: 16, lineHeight: 1.7 }}>
            Still have questions? We would love to hear from you.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/feedback" className="btn btn-accent" style={{ display: 'inline-flex', gap: 8, padding: '10px 24px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              Send Feedback
            </a>
            <a href="/community" className="btn" style={{ display: 'inline-flex', gap: 8, padding: '10px 24px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              Community
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
