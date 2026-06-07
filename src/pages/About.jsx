export default function About() {
  return (
    <div className="sec">
      <div className="sec-h">
        <div className="sec-h-eyebrow">About</div>
        <h1>Meet <em>UIL4B</em>.</h1>
        <p>A free, community-driven design toolkit that brings your most-used graphic design tools together in one place.</p>
      </div>

      {/* What is UIL4B */}
      <div className="card" style={{ maxWidth: 820, marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, color: 'var(--accent)' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--t0)' }}>What is UIL4B?</span>
        </div>
        <p style={{ fontSize: 14, color: 'var(--t1)', lineHeight: 1.8, marginBottom: 16 }}>
          UIL4B (pronounced "UI LAB") is a free design toolkit that combines the graphic design tools you use most into a single, unified workspace. Instead of bouncing between dozens of bookmarks and browser tabs, everything lives in one place: colour systems, typography tools, image converters, AI generators, prompt libraries, and more.
        </p>
        <p style={{ fontSize: 14, color: 'var(--t1)', lineHeight: 1.8 }}>
          The goal is simple: help designers and developers build websites (AI-generated or handcrafted) at a quality above the rest, while saving real time in the process.
        </p>
      </div>

      {/* The Story */}
      <div className="card" style={{ maxWidth: 820, marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, color: 'var(--accent)' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
          <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--t0)' }}>The Story Behind It</span>
        </div>
        <p style={{ fontSize: 14, color: 'var(--t1)', lineHeight: 1.8, marginBottom: 16 }}>
          UIL4B was created by <a href="https://dylan-coleman.com/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>Dylan Coleman</a>, a graphic designer who found himself constantly switching between the same set of design tools and resources. Rather than continuing to juggle bookmarks, Dylan decided to combine them all into one toolkit and find ways to make them work together, building new possibilities along the way.
        </p>
        <p style={{ fontSize: 14, color: 'var(--t1)', lineHeight: 1.8, marginBottom: 16 }}>
          The idea was never to reinvent the wheel. It was to make the wheel better. By bringing familiar tools together under one roof and creating smart connections between them, UIL4B helps you work faster and design with more confidence.
        </p>
        <p style={{ fontSize: 14, color: 'var(--t1)', lineHeight: 1.8 }}>
          What started as a personal solution quickly became something bigger. Once it was clear how much time it could save, sharing it with the design community felt like the right thing to do. That is why UIL4B is completely free for everyone.
        </p>
      </div>

      {/* Better Design, Less Time */}
      <div className="card" style={{ maxWidth: 820, marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, color: 'var(--accent)' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--t0)' }}>Better Design, Less Time</span>
        </div>
        <p style={{ fontSize: 14, color: 'var(--t1)', lineHeight: 1.8, marginBottom: 16 }}>
          Every tool in UIL4B is chosen to improve your web design workflow. Whether you are building a colour palette, pairing fonts, converting images, writing AI prompts, or referencing design systems, the toolkit keeps everything at your fingertips.
        </p>
        <p style={{ fontSize: 14, color: 'var(--t1)', lineHeight: 1.8 }}>
          The result: better design decisions made faster, with less friction and fewer context switches.
        </p>
      </div>

      {/* Community Driven */}
      <div className="card" style={{ maxWidth: 820, marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, color: 'var(--accent)' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--t0)' }}>Community Driven</span>
        </div>
        <p style={{ fontSize: 14, color: 'var(--t1)', lineHeight: 1.8, marginBottom: 16 }}>
          UIL4B thrives on its community. New tools, resources, and ideas come from designers and developers who want to help each other grow. Whether you contribute feedback, suggest a feature, or share a resource, you are helping shape a toolkit that benefits everyone.
        </p>
        <p style={{ fontSize: 14, color: 'var(--t1)', lineHeight: 1.8 }}>
          Together, we are building something bigger than any one person could: a shared workspace where designers and developers grow together.
        </p>
      </div>

      {/* Support */}
      <div className="card" style={{ maxWidth: 820, marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, color: 'var(--accent)' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--t0)' }}>Support the Project</span>
        </div>
        <p style={{ fontSize: 14, color: 'var(--t1)', lineHeight: 1.8, marginBottom: 20 }}>
          UIL4B is free and always will be. If you find it useful and want to support continued development, you can buy Dylan a coffee. Every contribution helps keep the toolkit maintained, improved, and accessible to everyone.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <a
            href="https://buymeacoffee.com/dylan.coleman"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-accent"
            style={{ display: 'inline-flex', gap: 8, padding: '10px 24px' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            Buy Me a Coffee
          </a>
          <a
            href="https://dylan-coleman.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="btn"
            style={{ display: 'inline-flex', gap: 8, padding: '10px 24px' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" />
            </svg>
            View Portfolio
          </a>
        </div>
      </div>
    </div>
  )
}
