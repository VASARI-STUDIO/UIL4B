import { useState } from 'react'

function DocSection({ title, children }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="doc-sub">
      <button className={`doc-tog${open ? ' open' : ''}`} onClick={() => setOpen(!open)}>
        <span className="arr">&#x25B8;</span> {title}
      </button>
      <div className={`doc-body${open ? ' open' : ''}`}>{children}</div>
    </div>
  )
}

export default function DocsDesign() {
  return (
    <div className="sec on">
      <div className="sec-h">
        <h1>Web Design Principles</h1>
        <p>Psychology-driven principles for premium, high-converting websites.</p>
      </div>
      <DocSection title="The Halo Effect (First Impressions)">
        <p>Users form a lasting opinion within 50 milliseconds. A polished site makes visitors assume the product is equally high quality.</p>
        <h4>Apply it</h4>
        <ul>
          <li>Lead with a strong hero — clean layout, clear value prop, quality imagery</li>
          <li>Typography and spacing should feel intentional from the first viewport</li>
          <li>Remove clutter that doesn&apos;t support the first impression</li>
          <li>Speed matters — over 3 seconds and the first impression is &quot;slow&quot;</li>
        </ul>
      </DocSection>
      <DocSection title="Cognitive Load & Fluency">
        <p>Cognitive fluency is how easily the brain processes what it sees. High fluency = more trust. Every extra element adds cognitive load. Premium sites feel effortless.</p>
        <h4>Apply it</h4>
        <ul>
          <li>2 typefaces maximum (1 heading, 1 body)</li>
          <li>Restricted palette — 1 primary, 1 accent, 2–3 neutrals</li>
          <li>Break info into scannable chunks with generous whitespace</li>
          <li>Use visual hierarchy so users never &quot;figure out&quot; where to look</li>
        </ul>
      </DocSection>
      <DocSection title="Micro Interactions & Peak-End Rule">
        <p>People judge experiences by their peak moment and the end, not the average. Micro interactions create those peaks.</p>
        <h4>Apply it</h4>
        <ul>
          <li>Subtle hover effects on buttons, cards, links</li>
          <li>Smooth scroll behaviour and page transitions</li>
          <li>Animate elements into view on scroll (restrained)</li>
          <li>Make the CTA feel special — spring physics on hover/press</li>
          <li>End well — clean footer, thank-you animation on submit</li>
        </ul>
      </DocSection>
      <DocSection title="How Top Brands Apply This">
        <h4>Apple — Premium Simplicity</h4>
        <p>One product per viewport, massive whitespace, minimal copy.</p>
        <h4>Luxury Brands & White Space</h4>
        <p>Extreme whitespace communicates exclusivity.</p>
        <h4>Stripe & Figma — Clarity for Complex Products</h4>
        <p>Progressive disclosure, clean typography hierarchies, and micro interactions that make abstract concepts tangible.</p>
      </DocSection>
      <DocSection title="3-Step Framework">
        <h4>Step 1 — Engineer the First Impression</h4>
        <p>Design hero first. Single headline, one supporting line, one CTA. Remove everything else.</p>
        <h4>Step 2 — Reduce Cognitive Load</h4>
        <p>Audit every element: does it serve the user&apos;s primary goal? Simplify nav to 5–7 items.</p>
        <h4>Step 3 — Add Micro Interactions</h4>
        <p>Once structure is clean, layer in delight. Hover states, scroll reveals, loading transitions.</p>
        <div className="card" style={{ marginTop: 14, background: 'var(--accent-bg)', borderColor: 'var(--accent)' }}>
          <p style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600, margin: 0 }}>
            Users don&apos;t remember features — they remember how a site made them feel.
          </p>
        </div>
      </DocSection>
    </div>
  )
}
