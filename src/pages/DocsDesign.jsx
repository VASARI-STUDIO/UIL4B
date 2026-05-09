import { useState } from 'react'
import { useI18n } from '../contexts/I18nContext'

function DocSection({ title, icon, children }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="doc-sub">
      <button className={`doc-tog${open ? ' open' : ''}`} onClick={() => setOpen(!open)}>
        <span className="arr">&#x25B8;</span>
        {icon && <span style={{ display: 'inline-flex', marginRight: 8, color: 'var(--accent)', verticalAlign: 'middle' }}>{icon}</span>}
        {title}
      </button>
      <div className={`doc-body${open ? ' open' : ''}`}>{children}</div>
    </div>
  )
}

function Stat({ value, label }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6, padding: '6px 14px', borderRadius: 'var(--radius-s)', background: 'var(--accent-bg)', marginRight: 6, marginBottom: 6 }}>
      <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent)' }}>{value}</span>
      <span style={{ fontSize: 11, color: 'var(--t1)' }}>{label}</span>
    </div>
  )
}

const eyeIcon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
const sparkIcon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l1.09 3.26L16 6l-2.91.74L12 10l-1.09-3.26L8 6l2.91-.74L12 2z"/><path d="M5 15l.55 1.64L7 17.18l-1.45.37L5 19.18l-.55-1.63L3 17.18l1.45-.37L5 15z"/><path d="M19 11l.55 1.64L21 13.01l-1.45.37L19 15.01l-.55-1.63L17 13.01l1.45-.37L19 11z"/></svg>
const brainIcon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44A2.5 2.5 0 0 1 5.5 17a2.5 2.5 0 0 1-.92-4.82A2.5 2.5 0 0 1 5 9.5 2.5 2.5 0 0 1 9.5 2z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44A2.5 2.5 0 0 0 18.5 17a2.5 2.5 0 0 0 .92-4.82A2.5 2.5 0 0 0 19 9.5 2.5 2.5 0 0 0 14.5 2z"/></svg>
const paletteIcon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="10.5" r="2.5"/><circle cx="8.5" cy="7.5" r="2.5"/><circle cx="6.5" cy="12.5" r="2.5"/><path d="M12 22a7 7 0 007-7c0-2-1-3.9-3-5.5s-3.3-3.5-4-6.5c-.7 3-2 4.5-4 6.5S5 13 5 15a7 7 0 007 7z"/></svg>
const phoneIcon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
const usersIcon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
const layersIcon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
const zoomIcon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
const trendIcon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
const gridIcon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>

export default function DocsDesign() {
  const { t } = useI18n()
  return (
    <div className="sec">
      <div className="sec-h">
        <h1>{t('docsDesign.title')}</h1>
        <p>{t('docsDesign.subtitle')}</p>
      </div>

      <DocSection title="The Halo Effect (First Impressions)" icon={eyeIcon}>
        <div style={{ marginBottom: 12 }}>
          <Stat value="50ms" label="to form a first impression" />
          <Stat value="94%" label="of first impressions are design-related" />
        </div>
        <p>Users form a lasting opinion within 50 milliseconds. A polished site makes visitors assume the product is equally high quality. Stanford research shows 75% of users judge a company&apos;s credibility based on website design alone.</p>
        <h4>Apply it</h4>
        <ul>
          <li>Lead with a strong hero — clean layout, clear value prop, quality imagery</li>
          <li>Typography and spacing should feel intentional from the first viewport</li>
          <li>Remove clutter that doesn&apos;t support the first impression</li>
          <li>Speed matters — over 3 seconds and the first impression is &quot;slow&quot;</li>
          <li>Use high-quality images and consistent brand colours above the fold</li>
        </ul>
      </DocSection>

      <DocSection title="Cognitive Load & Fluency" icon={brainIcon}>
        <div style={{ marginBottom: 12 }}>
          <Stat value="7±2" label="items working memory can hold" />
          <Stat value="2.6s" label="avg time to identify most influential area" />
        </div>
        <p>Cognitive fluency is how easily the brain processes what it sees. High fluency = more trust. Every extra element adds cognitive load. Premium sites feel effortless because they respect Miller&apos;s Law and Hick&apos;s Law.</p>
        <h4>Apply it</h4>
        <ul>
          <li>2 typefaces maximum (1 heading, 1 body)</li>
          <li>Restricted palette — 1 primary, 1 accent, 2–3 neutrals</li>
          <li>Break info into scannable chunks with generous whitespace</li>
          <li>Use visual hierarchy so users never &quot;figure out&quot; where to look</li>
          <li>Limit nav items to 5–7 options (Hick&apos;s Law: more choices = slower decisions)</li>
          <li>Progressive disclosure: show only what&apos;s needed at each step</li>
        </ul>
      </DocSection>

      <DocSection title="Visual Hierarchy & the F-Pattern" icon={layersIcon}>
        <div style={{ marginBottom: 12 }}>
          <Stat value="79%" label="of users scan rather than read" />
          <Stat value="16%" label="read word by word (NNGroup)" />
        </div>
        <p>Eye-tracking studies by the Nielsen Norman Group show that users scan web pages in an F-shaped pattern: two horizontal stripes across the top, then a vertical movement down the left side. Design with this pattern in mind.</p>
        <h4>Hierarchy techniques</h4>
        <ul>
          <li><strong>Size contrast</strong> — Headlines 2–3× larger than body text create clear entry points</li>
          <li><strong>Colour weight</strong> — Use your primary colour sparingly for CTAs; neutrals for supporting elements</li>
          <li><strong>Whitespace</strong> — Padding around elements signals importance and grouping</li>
          <li><strong>Position</strong> — Top-left gets most attention; use it for your key message</li>
          <li><strong>Z-pattern</strong> — For landing pages with minimal text, eyes trace a Z from top-left to bottom-right</li>
        </ul>
      </DocSection>

      <DocSection title="Colour Psychology for Conversion" icon={paletteIcon}>
        <div style={{ marginBottom: 12 }}>
          <Stat value="85%" label="of shoppers cite colour as primary purchase reason" />
          <Stat value="80%" label="increase in brand recognition from colour" />
        </div>
        <p>Colour influences 85% of consumer purchasing decisions. The right palette builds trust, urgency, or calm depending on your goals.</p>
        <h4>Colour-emotion associations</h4>
        <ul>
          <li><strong>Blue</strong> — Trust, stability, professionalism (used by banks, tech, healthcare)</li>
          <li><strong>Red/Orange</strong> — Urgency, excitement, appetite (CTAs, food brands, sales)</li>
          <li><strong>Green</strong> — Growth, health, money (eco brands, finance, wellness)</li>
          <li><strong>Purple</strong> — Luxury, creativity, wisdom (premium brands, beauty)</li>
          <li><strong>Black/Dark</strong> — Sophistication, power, exclusivity (luxury, fashion)</li>
          <li><strong>White/Light</strong> — Cleanliness, simplicity, space (tech, minimalist brands)</li>
        </ul>
        <h4>Conversion tips</h4>
        <ul>
          <li>CTA buttons that contrast with the page background get 21% more clicks</li>
          <li>Use warm colours (red, orange) for urgency; cool colours (blue, green) for trust</li>
          <li>Maintain a 4.5:1 contrast ratio minimum for accessibility</li>
        </ul>
      </DocSection>

      <DocSection title="Micro Interactions & Peak-End Rule" icon={sparkIcon}>
        <p>People judge experiences by their peak moment and the end, not the average. Micro interactions create those peaks. Studies show well-crafted micro-interactions increase user engagement by up to 40%.</p>
        <h4>Apply it</h4>
        <ul>
          <li>Subtle hover effects on buttons, cards, links</li>
          <li>Smooth scroll behaviour and page transitions</li>
          <li>Animate elements into view on scroll (restrained)</li>
          <li>Make the CTA feel special — spring physics on hover/press</li>
          <li>End well — clean footer, thank-you animation on submit</li>
          <li>Loading states: skeleton screens outperform spinners by 15% in perceived speed</li>
        </ul>
      </DocSection>

      <DocSection title="Consumer Behavior Principles" icon={trendIcon}>
        <div style={{ marginBottom: 12 }}>
          <Stat value="12.5%" label="conversion lift from social proof" />
          <Stat value="2×" label="loss aversion vs. gain (Kahneman)" />
        </div>
        <p>Understanding behavioral economics helps design interfaces that convert. These principles are backed by decades of research.</p>
        <h4>Key principles</h4>
        <ul>
          <li><strong>Loss aversion</strong> — People fear losing more than they desire gaining. &quot;Don&apos;t miss out&quot; outperforms &quot;Get this deal&quot; by ~30%. Use countdown timers, limited availability indicators.</li>
          <li><strong>Social proof</strong> — Testimonials, user counts, and reviews increase conversions by 12.5% on average. Display &quot;1,247 people signed up today&quot; near CTAs.</li>
          <li><strong>Scarcity principle</strong> — &quot;Only 3 left&quot; creates urgency. Amazon uses this to drive 35% of their purchases.</li>
          <li><strong>Anchoring effect</strong> — Show the original price crossed out next to the sale price. The first number anchors expectations.</li>
          <li><strong>Reciprocity</strong> — Offer free value first (guides, tools, trials). Users feel compelled to reciprocate with their attention and purchases.</li>
          <li><strong>Default effect</strong> — Pre-selected options are chosen 70% more often. Default to your recommended plan.</li>
        </ul>
      </DocSection>

      <DocSection title="Responsive & Mobile-First Statistics" icon={phoneIcon}>
        <div style={{ marginBottom: 12 }}>
          <Stat value="60%+" label="of web traffic is mobile" />
          <Stat value="53%" label="bounce if load time > 3s on mobile" />
        </div>
        <p>Google prioritizes mobile-first indexing. Sites that aren&apos;t mobile-optimized lose both rankings and conversions.</p>
        <h4>Core Web Vitals thresholds</h4>
        <ul>
          <li><strong>LCP</strong> (Largest Contentful Paint) — Under 2.5 seconds</li>
          <li><strong>INP</strong> (Interaction to Next Paint) — Under 200 milliseconds</li>
          <li><strong>CLS</strong> (Cumulative Layout Shift) — Under 0.1</li>
        </ul>
        <h4>Mobile design rules</h4>
        <ul>
          <li>Touch targets: minimum 44×44 CSS pixels (Apple HIG)</li>
          <li>Font size: minimum 16px body text to prevent zoom on iOS</li>
          <li>Thumb zone: place primary actions in the bottom 60% of the screen</li>
          <li>Reduce imagery file sizes — use WebP/AVIF, lazy-load below the fold</li>
          <li>Test on real devices, not just browser resize</li>
        </ul>
      </DocSection>

      <DocSection title="User-Centric Design Process" icon={usersIcon}>
        <p>The best designs solve real problems. Follow a user-centric process to ensure your design decisions are grounded in reality, not assumption.</p>
        <h4>Framework: Jobs to be Done</h4>
        <p>Users don&apos;t buy products — they &quot;hire&quot; them to get a job done. Frame every design decision around: <em>&quot;When [situation], I want to [motivation], so I can [expected outcome].&quot;</em></p>
        <h4>Quick validation methods</h4>
        <ul>
          <li><strong>5-second test</strong> — Show your page for 5 seconds, then ask what it&apos;s about. If users can&apos;t answer, your hierarchy needs work.</li>
          <li><strong>Card sorting</strong> — Let users organize your navigation. Reveals mental models.</li>
          <li><strong>First-click testing</strong> — If a user&apos;s first click is correct, they succeed 87% of the time (UIE research).</li>
          <li><strong>A/B testing</strong> — Test one variable at a time. Need ~1,000 visitors per variant for statistical significance.</li>
        </ul>
        <h4>Persona essentials</h4>
        <ul>
          <li>Goals and frustrations (what drives them, what blocks them)</li>
          <li>Technical proficiency (affects UI complexity decisions)</li>
          <li>Context of use (device, environment, time pressure)</li>
        </ul>
      </DocSection>

      <DocSection title="How Top Brands Apply This" icon={zoomIcon}>
        <h4>Apple — Premium Simplicity</h4>
        <p>One product per viewport, massive whitespace, minimal copy. Product imagery does the selling. They spend more on what they remove than what they add.</p>
        <h4>Stripe — Clarity for Complexity</h4>
        <p>Progressive disclosure turns a complex API into approachable content. Clean typography hierarchy, interactive code blocks, and micro-interactions make abstract concepts tangible. Gradient backgrounds signal innovation.</p>
        <h4>Airbnb — Trust Through Design</h4>
        <p>Large photography, verified badges, transparent pricing, and host profiles all build trust. Social proof is embedded at every decision point.</p>
        <h4>Linear — Speed as Brand</h4>
        <p>Dark mode, keyboard-first navigation, instant transitions. The product&apos;s speed is reflected in every design choice. Minimal colour usage makes purple CTAs impossible to miss.</p>
      </DocSection>

      <DocSection title="3-Step Framework" icon={gridIcon}>
        <h4>Step 1 — Engineer the First Impression</h4>
        <p>Design hero first. Single headline, one supporting line, one CTA. Remove everything else. Test with the 5-second test.</p>
        <h4>Step 2 — Reduce Cognitive Load</h4>
        <p>Audit every element: does it serve the user&apos;s primary goal? Simplify nav to 5–7 items. Use consistent spacing and type scales. Remove decorative elements that don&apos;t support comprehension.</p>
        <h4>Step 3 — Add Behavioral Triggers</h4>
        <p>Once structure is clean, layer in conversion psychology. Social proof near CTAs, scarcity indicators, micro-interactions for delight. Then layer in hover states, scroll reveals, and loading transitions.</p>
        <div className="card" style={{ marginTop: 14, background: 'var(--accent-bg)', borderColor: 'var(--accent)' }}>
          <p style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600, margin: 0 }}>
            Users don&apos;t remember features — they remember how a site made them feel. Design for emotion first, information second.
          </p>
        </div>
      </DocSection>
    </div>
  )
}
