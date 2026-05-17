import { useI18n } from '../contexts/I18nContext'
import DocsTOC from '../components/DocsTOC'

const TOC_ITEMS = [
  { id: 'art-design-01', number: '01', title: 'The 50ms Verdict' },
  { id: 'art-design-02', number: '02', title: 'Cognitive Load' },
  { id: 'art-design-03', number: '03', title: 'Eye Tracking Patterns' },
  { id: 'art-design-04', number: '04', title: 'Colour Psychology' },
  { id: 'art-design-05', number: '05', title: 'Micro-Interactions' },
  { id: 'art-design-06', number: '06', title: 'Behavioral Economics' },
  { id: 'art-design-07', number: '07', title: 'Performance as Design' },
  { id: 'art-design-08', number: '08', title: 'The Framework' },
]

function Stat({ value, label, sub }) {
  return (
    <div style={{ padding: '16px 20px', borderRadius: 'var(--radius)', background: 'var(--bg-1)', border: '1px solid var(--border)', flex: '1 1 140px', minWidth: 120 }}>
      <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent)', letterSpacing: '-.02em', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t0)', marginTop: 6 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: 'var(--t2)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function Callout({ children, type = 'insight' }) {
  const colors = {
    insight: { bg: 'var(--accent-bg)', border: 'var(--accent)', icon: '💡', label: 'Key Insight' },
    warning: { bg: 'rgba(245,158,11,.08)', border: 'var(--warn)', icon: '⚠', label: 'Common Mistake' },
    pro: { bg: 'rgba(16,185,129,.08)', border: 'var(--ok)', icon: '→', label: 'Pro Technique' },
  }
  const c = colors[type]
  return (
    <div style={{ padding: '14px 18px', borderRadius: 'var(--radius-s)', background: c.bg, borderLeft: `3px solid ${c.border}`, marginTop: 16, marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: c.border, marginBottom: 6 }}>{c.icon} {c.label}</div>
      <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--t0)' }}>{children}</div>
    </div>
  )
}

function BeforeAfter({ bad, good, badLabel = 'Avoid', goodLabel = 'Better' }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12, marginBottom: 16 }}>
      <div style={{ padding: 16, borderRadius: 'var(--radius-s)', border: '1px solid var(--err)', background: 'rgba(239,68,68,.05)' }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--err)', marginBottom: 8 }}>{badLabel}</div>
        <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--t1)' }}>{bad}</div>
      </div>
      <div style={{ padding: 16, borderRadius: 'var(--radius-s)', border: '1px solid var(--ok)', background: 'rgba(16,185,129,.05)' }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ok)', marginBottom: 8 }}>{goodLabel}</div>
        <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--t1)' }}>{good}</div>
      </div>
    </div>
  )
}

function Article({ id, number, title, children }) {
  return (
    <section id={id} style={{ marginBottom: 48, paddingBottom: 48, borderBottom: '1px solid var(--border)', scrollMarginTop: 120 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <span style={{ fontSize: 48, fontWeight: 800, color: 'var(--accent)', opacity: 0.15, lineHeight: 1, fontFamily: 'var(--mono)' }}>{number}</span>
        <h2 style={{ fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 700, letterSpacing: '-.03em', lineHeight: 1.2 }}>{title}</h2>
      </div>
      <div style={{ maxWidth: 720 }}>{children}</div>
    </section>
  )
}

export default function DocsDesign() {
  const { t } = useI18n()
  return (
    <div className="sec">
      <div className="sec-h">
        <div className="sec-h-eyebrow">Design Principles</div>
        <h1>{t('docsDesign.title')}</h1>
        <p>Research-backed design principles that separate amateur sites from professional ones. Each section links psychology to actionable technique.</p>
      </div>

      <DocsTOC items={TOC_ITEMS} />

      <Article id="art-design-01" number="01" title="The 50ms Verdict — Why Surface Quality Determines Trust">
        <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 16 }}>
          Google&apos;s 2012 study at the University of Basel found that users form aesthetic judgments in <strong>17 milliseconds</strong> — not the commonly cited 50ms. The follow-up research showed these snap judgments are remarkably stable: people who initially find a site unappealing rarely change their mind after exploring it.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          <Stat value="17ms" label="Aesthetic judgment formed" sub="Tuch et al., 2012" />
          <Stat value="75%" label="Judge credibility by design" sub="Stanford Web Credibility Project" />
          <Stat value="94%" label="First impressions are visual" sub="Not content-driven" />
        </div>
        <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 12 }}>
          The mechanism behind this is <strong>cognitive fluency</strong> — the brain&apos;s preference for things that are easy to process. Symmetrical layouts, adequate whitespace, and limited colour variation all increase fluency, which the brain interprets as trustworthiness.
        </p>
        <Callout type="insight">
          The &quot;prototypicality effect&quot; means users trust sites that look like what they expect for that category. A law firm site with playful fonts and bright colors triggers distrust — not because it&apos;s ugly, but because it violates the mental prototype.
        </Callout>
        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>What actually moves the needle</h4>
        <ul style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--t1)' }}>
          <li><strong>Visual complexity sweet spot</strong> — Medium complexity scores highest for appeal. Too simple feels empty; too complex feels chaotic. Aim for 3-4 distinct visual elements above the fold.</li>
          <li><strong>Colour count</strong> — Sites with 3 or fewer colours are rated 28% more professional than those with 5+. This isn&apos;t about palettes — it&apos;s about what&apos;s visible simultaneously.</li>
          <li><strong>Image quality threshold</strong> — A single low-resolution image drops perceived quality by 40%, even if everything else is polished. Stock photos with visible watermarks or generic subjects are worse than no images.</li>
        </ul>
        <BeforeAfter
          bad="Multiple fonts, rainbow colours, stock photos of handshakes, busy patterns, auto-playing video"
          good="Two fonts max, restrained palette, custom or curated imagery, generous whitespace, intentional motion"
        />
      </Article>

      <Article id="art-design-02" number="02" title="Cognitive Load — The Invisible Bottleneck">
        <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 16 }}>
          Working memory holds 4±1 chunks (not 7±2 — Cowan&apos;s 2001 revision of Miller&apos;s Law is more accurate). Every design element that isn&apos;t serving the user&apos;s current goal is stealing one of those chunks. This is why minimal design converts better — it&apos;s not aesthetic preference, it&apos;s cognitive architecture.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          <Stat value="4±1" label="True working memory limit" sub="Cowan, 2001 (revised)" />
          <Stat value="23 min" label="To refocus after distraction" sub="UC Irvine research" />
          <Stat value="~40%" label="Time wasted searching" sub="When navigation is unclear" />
        </div>
        <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 12 }}>
          There are three types of cognitive load. Most designers only address one:
        </p>
        <ul style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 16 }}>
          <li><strong>Intrinsic load</strong> — the complexity of the task itself (you can&apos;t remove this)</li>
          <li><strong>Extraneous load</strong> — caused by poor design: confusing labels, unclear hierarchy, unexpected behavior. <em>This is what you can fix.</em></li>
          <li><strong>Germane load</strong> — the effort of building understanding. Good design redirects freed-up capacity here.</li>
        </ul>
        <Callout type="pro">
          <strong>The &quot;squint test&quot;</strong>: Squint at your page until you can&apos;t read the text. If you can still tell where to look first, second, and third, your visual hierarchy works. If everything blurs into equal importance, you have a cognitive load problem.
        </Callout>
        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Hick&apos;s Law in practice</h4>
        <p style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 12 }}>
          Decision time increases logarithmically with the number of choices. But the critical nuance most designers miss: <strong>Hick&apos;s Law only applies to equally attractive options.</strong> If one option is clearly better (through visual weight, positioning, or labeling), adding more options barely affects decision time.
        </p>
        <BeforeAfter
          bad="Navigation with 12 equal-weight items, 3 CTAs competing for attention, form with all fields visible at once"
          good="5-7 nav items with one highlighted, single primary CTA, progressive disclosure for long forms"
        />
      </Article>

      <Article id="art-design-03" number="03" title="Eye Tracking Patterns — Where People Actually Look">
        <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 16 }}>
          The F-pattern is real but overly simplified. Nielsen Norman Group&apos;s 2020 updated research identified <strong>multiple scanning patterns</strong> that users switch between depending on content density and layout.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          <Stat value="F-pattern" label="Text-heavy pages" sub="Blog posts, articles" />
          <Stat value="Z-pattern" label="Minimal pages" sub="Landing pages, hero sections" />
          <Stat value="Layer cake" label="Heading scanners" sub="Skip body, scan headings" />
          <Stat value="Spotted" label="Search-oriented" sub="Scanning for specific info" />
        </div>
        <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 12 }}>
          The lesser-known <strong>&quot;layer cake&quot; pattern</strong> is the most important for modern web design: users scan headings horizontally, skip body text entirely, then jump to the next heading. Your headings ARE your content for 79% of users.
        </p>
        <Callout type="warning">
          The biggest hierarchy mistake isn&apos;t weak contrast — it&apos;s equal contrast. When your heading, subheading, and body text are all similar sizes (24px, 20px, 16px), they compete. Use a <strong>minimum 1.5x ratio</strong> between levels. Better: heading 42px, subheading 20px, body 16px.
        </Callout>
        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Where banner blindness actually happens</h4>
        <p style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--t1)' }}>
          Users have learned to ignore anything that looks like an ad — including your own promotional banners. Elements with high saturation colours, top-right positioning, or standard ad dimensions (728×90, 300×250) get unconsciously filtered. If your CTA looks like an ad, it will be invisible to experienced users.
        </p>
      </Article>

      <Article id="art-design-04" number="04" title="Colour Psychology — What the Research Actually Says">
        <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 16 }}>
          Most &quot;colour psychology&quot; articles recycle the same unsupported claims. Here&apos;s what peer-reviewed research actually shows:
        </p>
        <Callout type="warning">
          The claim &quot;blue = trust&quot; and &quot;red = urgency&quot; is a gross oversimplification. Labrecque & Milne (2012) found that <strong>saturation and brightness</strong> matter more than hue for brand perception. High saturation = exciting/modern. Low saturation = sophisticated/calm. The hue itself accounts for only ~15% of the emotional response.
        </Callout>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          <Stat value="85%" label="Response is about saturation/brightness" sub="Not hue" />
          <Stat value="21%" label="CTA click increase from contrast" sub="Not specific colour" />
          <Stat value="90s" label="To form a colour opinion" sub="Institute for Colour Research" />
        </div>
        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>What actually works</h4>
        <ul style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 16 }}>
          <li><strong>Isolation effect (Von Restorff)</strong> — The CTA button colour doesn&apos;t matter; what matters is that it contrasts with everything else on the page. A green button on a green-themed page will underperform a red button — not because red is better, but because red is different.</li>
          <li><strong>Perceived appropriateness</strong> — Consumers judge whether a colour &quot;fits&quot; the brand, not whether they personally like it. A neon pink law firm feels wrong; a neon pink music app feels right. Context determines colour effectiveness.</li>
          <li><strong>Cultural variance</strong> — White means purity in Western cultures but mourning in many Asian cultures. Red means danger in the West but luck in China. If your audience is international, test with real users from each market.</li>
        </ul>
        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>The 60-30-10 distribution</h4>
        <p style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--t1)' }}>
          Derived from interior design but validated by web analytics: 60% dominant colour (backgrounds, large surfaces), 30% secondary (cards, sections, navigation), 10% accent (CTAs, highlights, notifications). Sites following this ratio have 23% longer session times on average.
        </p>
      </Article>

      <Article id="art-design-05" number="05" title="Micro-Interactions — Perceived Performance vs Actual Speed">
        <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 16 }}>
          Facebook&apos;s internal research found that perceived speed matters more than actual speed. A 500ms animation that masks a 300ms load feels faster than an instant-but-janky transition. This is the principle behind skeleton screens, which outperform spinners by <strong>15-20% in perceived speed</strong>.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          <Stat value="100ms" label="Feels instant" sub="No feedback needed" />
          <Stat value="1s" label="Flow maintained" sub="Subtle transition OK" />
          <Stat value="10s" label="Attention limit" sub="Must show progress" />
          <Stat value="40%" label="Engagement lift" sub="From well-crafted interactions" />
        </div>
        <Callout type="pro">
          <strong>The peak-end rule</strong> (Kahneman): Users judge an experience by its most intense moment and the final moment, not the average. Design one &quot;peak&quot; moment per page (a satisfying animation, a surprising interaction) and ensure the last thing they see feels polished (footer, confirmation screen, transition out).
        </Callout>
        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Animation timing that feels natural</h4>
        <ul style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--t1)' }}>
          <li><strong>Ease-out for entrances</strong> — Elements decelerate into position (fast start, slow end). Feels like something arriving naturally.</li>
          <li><strong>Ease-in for exits</strong> — Elements accelerate away (slow start, fast end). Feels like something leaving.</li>
          <li><strong>Spring physics for interactions</strong> — Button presses, toggles, pulls. Slight overshoot + settle creates a tactile feel.</li>
          <li><strong>Duration: 200-300ms</strong> for UI transitions, 300-500ms for page-level animations. Anything over 500ms feels sluggish.</li>
          <li><strong>Stagger children by 30-50ms</strong> for list animations. More than 80ms stagger feels slow.</li>
        </ul>
      </Article>

      <Article id="art-design-06" number="06" title="Behavioral Economics in Interface Design">
        <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 16 }}>
          Behavioral economics research reveals consistent decision-making biases. Used ethically, these patterns help users make decisions that serve their goals.
        </p>
        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Loss aversion is asymmetric</h4>
        <p style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 12 }}>
          Kahneman & Tversky proved that losing $100 feels 2-2.5x worse than gaining $100 feels good. But what most designers miss: <strong>loss aversion is strongest for things already &quot;possessed&quot;</strong>. This is why free trials convert better than discounts — users feel they&apos;re losing something they already have.
        </p>
        <BeforeAfter
          bad={<>&quot;Sign up for our premium plan for just $9.99/month!&quot;</>}
          good={<>&quot;Your free trial expires in 3 days. You&apos;ll lose access to your saved projects.&quot;</>}
        />
        <h4 style={{ fontSize: 14, fontWeight: 700, marginTop: 20, marginBottom: 8 }}>The default effect is the most powerful</h4>
        <p style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 12 }}>
          Johnson & Goldstein (2003) found organ donation rates ranged from 4% to 99.98% between countries — the only difference was whether donation was opt-in or opt-out. <strong>Pre-selected options are chosen 70-90% more often.</strong> Default to your recommended plan, pre-check the newsletter signup, pre-fill form fields from available data.
        </p>
        <Callout type="insight">
          <strong>Anchoring</strong> works even when arbitrary. In a famous experiment, spinning a roulette wheel before asking people to guess the number of African UN member states significantly influenced their answers. Show your highest-tier price first. The subsequent options feel like bargains by comparison.
        </Callout>
        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Social proof specificity</h4>
        <p style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--t1)' }}>
          &quot;Join thousands of happy customers&quot; is weak. &quot;1,247 designers signed up this week&quot; is strong. Specificity implies counting — which implies truth. Adding faces (not logos) increases trust by 35%. Adding a role (&quot;Sarah M., Product Designer at Stripe&quot;) increases it further.
        </p>
      </Article>

      <Article id="art-design-07" number="07" title="Performance as Design — Core Web Vitals">
        <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 16 }}>
          Google now uses Core Web Vitals as a ranking factor. But beyond SEO, performance directly affects conversion: Walmart found that every 1-second improvement in page load increased conversions by 2%.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          <Stat value="&lt;2.5s" label="LCP (Largest Contentful Paint)" sub="Above-fold main content" />
          <Stat value="&lt;200ms" label="INP (Interaction to Next Paint)" sub="Response to user input" />
          <Stat value="&lt;0.1" label="CLS (Cumulative Layout Shift)" sub="Visual stability score" />
        </div>
        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Designer-controlled optimizations</h4>
        <ul style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--t1)' }}>
          <li><strong>Set explicit dimensions on images/videos</strong> — prevents CLS. This is the #1 cause of layout shift and is entirely a design decision.</li>
          <li><strong>System font stack for body text</strong> — eliminates FOIT/FOUT for body copy. Load custom fonts only for headings: <code style={{ background: 'var(--bg-1)', padding: '1px 5px', borderRadius: 3, fontSize: 12 }}>font-display: swap</code>.</li>
          <li><strong>AVIF/WebP over PNG/JPEG</strong> — 50-80% smaller at equivalent quality. Use our Image Converter tool.</li>
          <li><strong>Above-fold critical CSS</strong> — inline the CSS needed for the first viewport. Everything else can load async.</li>
          <li><strong>Touch targets: 48×48px minimum</strong> — Google&apos;s threshold, higher than Apple&apos;s 44×44. Smaller targets cause INP problems from mis-taps.</li>
        </ul>
        <Callout type="insight">
          The mobile performance gap is growing. The median Android device is a Samsung Galaxy A-series with 3-4GB RAM and a mid-tier processor. A page that runs smoothly on your MacBook Pro may be unusable on the device most of your users have.
        </Callout>
      </Article>

      <Article id="art-design-08" number="08" title="The Framework — How Elite Studios Actually Work">
        <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 16 }}>
          After analyzing the design systems of Apple, Stripe, Linear, Vercel, and Airbnb, common patterns emerge:
        </p>
        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>1. Content-first design</h4>
        <p style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 16 }}>
          None of these companies design with lorem ipsum. Every layout is built around real content. The copy drives the visual hierarchy, not the other way around. Start with the words. Then design containers for those specific words.
        </p>
        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>2. Systematic constraint</h4>
        <p style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 16 }}>
          Stripe uses exactly 3 border radii, 4 shadow levels, and 8 spacing increments across their entire site. Linear uses one typeface at 4 weights. The constraint isn&apos;t limiting — it&apos;s what creates coherence. Build a design token system before designing any pages.
        </p>
        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>3. Progressive disclosure</h4>
        <p style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 16 }}>
          Apple shows one product per viewport. Stripe hides technical complexity behind interactive code blocks. The most sophisticated products show the least on initial view. Complexity lives behind interactions, not on the surface.
        </p>
        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>4. Speed as brand signal</h4>
        <p style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 16 }}>
          Linear&apos;s entire brand identity is built around instant transitions and keyboard-first navigation. Vercel&apos;s homepage loads in under 1 second. Performance isn&apos;t a technical concern — it&apos;s a design decision that communicates competence.
        </p>
        <div className="card" style={{ marginTop: 20, background: 'var(--accent-bg)', borderColor: 'var(--accent)' }}>
          <p style={{ fontSize: 14, color: 'var(--accent)', fontWeight: 600, margin: 0, lineHeight: 1.7 }}>
            The gap between amateur and professional design isn&apos;t talent — it&apos;s constraint. Professionals make fewer decisions better. They use tighter palettes, fewer typefaces, more consistent spacing, and more whitespace. Restraint is the skill.
          </p>
        </div>
      </Article>
    </div>
  )
}
