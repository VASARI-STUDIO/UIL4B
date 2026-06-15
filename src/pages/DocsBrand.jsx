import DocsTOC from '../components/DocsTOC'

const LAST_UPDATED = '2026-06-15'

const TOC_ITEMS = [
  { id: 'brand-01', number: '01', title: 'Start With Strategy' },
  { id: 'brand-02', number: '02', title: 'The 60-30-10 Rule' },
  { id: 'brand-03', number: '03', title: 'Colour Psychology Cheat Sheet' },
  { id: 'brand-04', number: '04', title: 'Building a Palette From Scratch' },
  { id: 'brand-05', number: '05', title: 'Accessible Colour Systems' },
  { id: 'brand-06', number: '06', title: 'Common Mistakes' },
]

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

function Stat({ value, label, sub }) {
  return (
    <div style={{ padding: '16px 20px', borderRadius: 'var(--radius)', background: 'var(--bg-1)', border: '1px solid var(--border)', flex: '1 1 140px', minWidth: 120 }}>
      <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--brand)', letterSpacing: '-.02em', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t0)', marginTop: 6 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: 'var(--t2)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function Callout({ children, type = 'insight' }) {
  const colors = {
    insight: { bg: 'var(--accent-bg)', border: 'var(--accent)', label: 'Key Insight' },
    pro: { bg: 'rgba(16,185,129,.08)', border: 'var(--ok)', label: 'Pro Tip' },
    warning: { bg: 'rgba(245,158,11,.08)', border: 'var(--warn)', label: 'Watch Out' },
  }
  const c = colors[type]
  return (
    <div style={{ padding: '14px 18px', borderRadius: 'var(--radius-s)', background: c.bg, borderLeft: `3px solid ${c.border}`, marginTop: 16, marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: c.border, marginBottom: 6 }}>{c.label}</div>
      <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--t0)' }}>{children}</div>
    </div>
  )
}

function SwatchRow({ colors, labels }) {
  return (
    <div style={{ display: 'flex', gap: 4, marginTop: 12, marginBottom: 16 }}>
      {colors.map((c, i) => (
        <div key={i} style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ height: 48, borderRadius: 6, background: c, border: '1px solid var(--border)' }} />
          {labels?.[i] && <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--t2)', marginTop: 4, letterSpacing: '.04em' }}>{labels[i]}</div>}
          <div style={{ fontSize: 9, fontFamily: 'var(--mono)', color: 'var(--t3)', marginTop: 2 }}>{c}</div>
        </div>
      ))}
    </div>
  )
}

const P = ({ children }) => <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 12 }}>{children}</p>

export default function DocsBrand() {
  return (
    <div className="sec">
      <div className="sec-h">
        <div className="sec-h-eyebrow">Documentation</div>
        <h1>Brand Colour Guide</h1>
        <p>How to choose, build, and maintain a brand colour system that works at every scale. Practical steps, not theory.</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
          <span style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 600 }}>Last updated: {LAST_UPDATED}</span>
        </div>
      </div>

      <DocsTOC items={TOC_ITEMS} />

      <Article id="brand-01" number="01" title="Start With Strategy, Not Swatches">
        <P>
          Most people open a colour picker and start experimenting. This is backwards. Colour is a communication tool — it should express your brand&apos;s personality, values, and positioning before it looks pretty.
        </P>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          <Stat value="80%" label="Brand recognition increase" sub="from consistent colour use" />
          <Stat value="90%" label="Snap judgments" sub="are influenced by colour alone" />
        </div>
        <P>
          <strong>Before touching UIL4B&apos;s Colour Studio, answer three questions:</strong>
        </P>
        <ul style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 16 }}>
          <li><strong>Who is your audience?</strong> A children&apos;s brand needs different energy than a law firm. Age, culture, and industry all influence colour perception.</li>
          <li><strong>What feeling should your brand evoke?</strong> Trust? Energy? Luxury? Innovation? Pick 2-3 emotional targets and use them as a filter for every colour decision.</li>
          <li><strong>What do competitors use?</strong> If every competitor in your space uses blue, you have two options: match the convention (safer) or deliberately break it (riskier but more memorable).</li>
        </ul>
        <Callout type="pro">
          Look at your brand from the outside. Put your logo on a competitor&apos;s website. Does the colour still make sense, or does it only work in context? Good brand colour works everywhere.
        </Callout>
      </Article>

      <Article id="brand-02" number="02" title="The 60-30-10 Rule">
        <P>
          Interior designers have used this ratio for decades, and it works perfectly for UI design. It creates visual hierarchy without effort:
        </P>
        <ul style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 16 }}>
          <li><strong>60% — Dominant colour.</strong> Usually your background or neutral. Sets the overall tone. In dark mode this is near-black; in light mode it&apos;s white or off-white.</li>
          <li><strong>30% — Secondary colour.</strong> Your brand colour applied to cards, headers, navigation, and large surface areas. Creates identity.</li>
          <li><strong>10% — Accent colour.</strong> CTAs, links, badges, icons. This is what draws the eye. Use it sparingly — if everything is highlighted, nothing is.</li>
        </ul>
        <SwatchRow
          colors={['#0A0A0A', '#1E40AF', '#F59E0B']}
          labels={['60% Dominant', '30% Secondary', '10% Accent']}
        />
        <Callout type="insight">
          The 10% accent is where most brands go wrong. They use their primary brand colour for everything instead of reserving it for key actions. Apple uses very little blue — just enough to make links and buttons unmistakable.
        </Callout>
      </Article>

      <Article id="brand-03" number="03" title="Colour Psychology Cheat Sheet">
        <P>
          These associations are cultural (Western-centric) and contextual, not universal. Use them as starting points, not rules.
        </P>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 16 }}>
          {[
            { color: '#3B82F6', name: 'Blue', traits: 'Trust, stability, calm', brands: 'Facebook, IBM, PayPal' },
            { color: '#EF4444', name: 'Red', traits: 'Energy, urgency, passion', brands: 'YouTube, Netflix, Coca-Cola' },
            { color: '#10B981', name: 'Green', traits: 'Growth, health, money', brands: 'Spotify, Shopify, Robinhood' },
            { color: '#F59E0B', name: 'Yellow', traits: 'Optimism, warmth, caution', brands: 'Snapchat, IKEA, McDonald\'s' },
            { color: '#8B5CF6', name: 'Purple', traits: 'Luxury, creativity, wisdom', brands: 'Twitch, Cadbury, Figma' },
            { color: '#1A1A1A', name: 'Black', traits: 'Sophistication, power, luxury', brands: 'Apple, Nike, Chanel' },
          ].map(c => (
            <div key={c.name} style={{ padding: 14, borderRadius: 'var(--radius-s)', background: 'var(--bg-1)', border: '1px solid var(--border)' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: c.color, marginBottom: 10, border: '1px solid var(--border)' }} />
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t0)', marginBottom: 4 }}>{c.name}</div>
              <div style={{ fontSize: 11, color: 'var(--t1)', lineHeight: 1.5, marginBottom: 6 }}>{c.traits}</div>
              <div style={{ fontSize: 10, color: 'var(--t3)' }}>{c.brands}</div>
            </div>
          ))}
        </div>
        <Callout type="warning">
          Don&apos;t pick a colour just because of psychology charts. Red doesn&apos;t mean &quot;danger&quot; on a food delivery app — it means &quot;hungry.&quot; Context changes everything.
        </Callout>
      </Article>

      <Article id="brand-04" number="04" title="Building a Palette From Scratch">
        <P>
          Here&apos;s a step-by-step process using UIL4B&apos;s Colour Studio:
        </P>
        <ol style={{ fontSize: 13, lineHeight: 1.9, color: 'var(--t1)', marginBottom: 16 }}>
          <li><strong>Pick one primary colour.</strong> Open the Colour Studio, use the base picker. This is your brand&apos;s identity colour — the one people will associate with you.</li>
          <li><strong>Choose a harmony mode.</strong> Complementary gives high contrast (energetic). Analogous gives harmony (calm). Triadic gives variety (playful). Split Comp gives balance.</li>
          <li><strong>Generate tints and shades.</strong> Every colour needs a full scale (50–950) for UI use. The Tint section generates this automatically.</li>
          <li><strong>Add state colours.</strong> Success (green), warning (amber), error (red), info (blue). The States section has curated presets.</li>
          <li><strong>Test on real UI.</strong> Export your CSS variables and apply them to your actual interface. Colours that look great on a swatch can fail in context.</li>
        </ol>
        <Callout type="pro">
          Use &quot;Extract from Image&quot; in the Add Colour menu to pull colours from an inspiration image, photo, or competitor&apos;s site. Then refine the extracted palette with harmony modes.
        </Callout>
        <P>
          <strong>How many colours do you actually need?</strong> For most brands: 1 primary, 1-2 neutrals, 1 accent, and the 4 semantic state colours. That&apos;s 7-8 colours total. Each gets a tint scale for flexibility.
        </P>
      </Article>

      <Article id="brand-05" number="05" title="Accessible Colour Systems">
        <P>
          WCAG 2.2 requires a minimum contrast ratio of <strong>4.5:1</strong> for normal text and <strong>3:1</strong> for large text (18px+ or 14px+ bold). This isn&apos;t optional — it&apos;s legal in many jurisdictions.
        </P>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          <Stat value="4.5:1" label="Minimum contrast" sub="Normal text (WCAG AA)" />
          <Stat value="3:1" label="Large text minimum" sub="18px+ or 14px+ bold" />
          <Stat value="7:1" label="Enhanced contrast" sub="WCAG AAA compliance" />
        </div>
        <P>
          <strong>Practical rules for accessible palettes:</strong>
        </P>
        <ul style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 16 }}>
          <li>Never put coloured text on a coloured background without checking contrast. UIL4B&apos;s colour info popup shows contrast ratios automatically.</li>
          <li>Don&apos;t rely on colour alone to convey information. Use icons, text labels, or patterns alongside colour indicators.</li>
          <li>Test with colour blindness simulators. The colour info popup includes CVD (colour vision deficiency) simulation for protanopia, deuteranopia, and tritanopia.</li>
          <li>Your lightest tint (50) should work as a subtle background. Your darkest shade (950) should work as readable text.</li>
        </ul>
        <Callout type="insight">
          A common trap: your brand colour passes contrast against white but fails against your actual light-grey card background. Always test against your real surfaces, not just pure white.
        </Callout>
      </Article>

      <Article id="brand-06" number="06" title="Common Mistakes">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
          {[
            { bad: 'Using your brand colour for everything', fix: 'Reserve it for 10% — CTAs and key UI elements. Use neutrals for 60% of the interface.' },
            { bad: 'Picking colours that look good in isolation', fix: 'Test every colour against your actual backgrounds, card surfaces, and text. Context changes everything.' },
            { bad: 'Too many colours in the palette', fix: '3 colours + state colours is enough for 95% of brands. More colours = more inconsistency.' },
            { bad: 'Ignoring dark mode from the start', fix: 'Build your tint scale with both themes in mind. The same blue that works on white may need adjustment on dark grey.' },
            { bad: 'Choosing trendy colours', fix: 'Trends rotate every 2-3 years. Pick colours with staying power. Classic blues, greens, and neutrals age well.' },
            { bad: 'Not documenting colour usage', fix: 'Export your design system from UIL4B. Include when and where each colour should be used, not just the hex values.' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ padding: 14, borderRadius: 'var(--radius-s)', border: '1px solid var(--err)', background: 'rgba(239,68,68,.05)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--err)', marginBottom: 6 }}>Avoid</div>
                <div style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--t1)' }}>{item.bad}</div>
              </div>
              <div style={{ padding: 14, borderRadius: 'var(--radius-s)', border: '1px solid var(--ok)', background: 'rgba(16,185,129,.05)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ok)', marginBottom: 6 }}>Better</div>
                <div style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--t1)' }}>{item.fix}</div>
              </div>
            </div>
          ))}
        </div>
      </Article>
    </div>
  )
}
