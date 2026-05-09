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

const megaphoneIcon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l18-5v12L3 13v-2z"/><path d="M11.6 16.8a3 3 0 11-5.8-1.6"/></svg>
const calendarIcon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
const editIcon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
const chartIcon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
const imageIcon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
const pathIcon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="5" cy="6" r="3"/><circle cx="19" cy="18" r="3"/><path d="M8 6h4a4 4 0 014 4v0a4 4 0 01-4 4H8"/></svg>
const layoutIcon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
const dollarIcon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
const msgIcon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
const gridIcon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>

const boxStyle = (span = 1, h = 48) => ({
  background: 'var(--accent-bg)',
  border: '1px solid var(--accent)',
  borderRadius: 'var(--radius-s)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 11,
  fontWeight: 700,
  fontFamily: 'var(--mono)',
  color: 'var(--accent)',
  gridColumn: span > 1 ? `span ${span}` : undefined,
  gridRow: span < 0 ? `span ${-span}` : undefined,
  minHeight: h,
})

const previewWrap = {
  background: 'var(--bg-2)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  padding: 16,
  marginBottom: 16,
}

const codeBlock = {
  background: 'var(--bg-1)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-s)',
  padding: '12px 16px',
  fontSize: 12,
  fontFamily: 'var(--mono)',
  color: 'var(--t1)',
  overflowX: 'auto',
  lineHeight: 1.7,
  marginBottom: 12,
  whiteSpace: 'pre',
}

function LayoutExample({ title, description, code, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h4>{title}</h4>
      {description && <p style={{ marginBottom: 12 }}>{description}</p>}
      <div style={previewWrap}>{children}</div>
      <div style={codeBlock}>{code}</div>
    </div>
  )
}

export default function DocsSocial() {
  const { t } = useI18n()
  return (
    <div className="sec">
      <div className="sec-h">
        <h1>{t('docsSocial.title')}</h1>
        <p>{t('docsSocial.subtitle')}</p>
      </div>

      <DocSection title="Content Pillars" icon={megaphoneIcon}>
        <p>Every brand needs 5–7 content pillars to maintain consistency while keeping things fresh. Each pillar serves a different purpose in the funnel.</p>
        <ul>
          <li><strong>Promotional</strong> — Templates, launches, offers. KPIs: link clicks, conversions</li>
          <li><strong>Free-Value</strong> — Guides, checklists, tools. KPIs: downloads, email sign-ups</li>
          <li><strong>Case Studies</strong> — Before/after, process breakdowns. KPIs: engagement, inquiries</li>
          <li><strong>Testimonials</strong> — Client quotes, video reviews, UGC. KPIs: trust signals, profile visits</li>
          <li><strong>Behind-the-Scenes</strong> — Process, team, workspace. KPIs: comments, follower growth</li>
          <li><strong>Tips & Tutorials</strong> — UX tips, how-tos, carousels. KPIs: saves, shares</li>
          <li><strong>Reels & Short Video</strong> — 15–60s videos. Algorithm favours these heavily. KPIs: views, reach</li>
        </ul>
      </DocSection>

      <DocSection title="Posting Cadence" icon={calendarIcon}>
        <div style={{ marginBottom: 12 }}>
          <Stat value="2-3" label="feed posts per week" />
          <Stat value="Daily" label="Stories" />
        </div>
        <h4>Weekly schedule</h4>
        <ul>
          <li><strong>Monday</strong> — Promotional or case study (high intent, start of work week)</li>
          <li><strong>Wednesday</strong> — Tips/tutorial carousel or educational Reel</li>
          <li><strong>Friday</strong> — Behind-the-scenes, testimonial, or community engagement</li>
          <li><strong>Daily</strong> — Stories (polls, Q&As, process clips, quick tips)</li>
        </ul>
        <h4>Best posting times (general)</h4>
        <ul>
          <li><strong>Instagram</strong> — Tues–Fri, 10am–2pm local time</li>
          <li><strong>LinkedIn</strong> — Tues–Thurs, 8–10am</li>
          <li><strong>Twitter/X</strong> — Mon–Fri, 8am–12pm</li>
          <li><strong>TikTok</strong> — Tues–Thurs, 7–9pm</li>
        </ul>
        <p style={{ fontSize: 12, color: 'var(--t2)', marginTop: 8 }}>Always verify with your own analytics — these are starting points, not rules.</p>
      </DocSection>

      <DocSection title="Platform-Specific Image Dimensions" icon={imageIcon}>
        <p>Using the correct dimensions prevents cropping and ensures your content looks polished on every platform.</p>
        <h4>Instagram</h4>
        <ul>
          <li><strong>Square post</strong> — 1080 × 1080px (1:1)</li>
          <li><strong>Portrait post</strong> — 1080 × 1350px (4:5) — gets most feed real estate</li>
          <li><strong>Stories & Reels</strong> — 1080 × 1920px (9:16)</li>
          <li><strong>Carousel</strong> — 1080 × 1080 or 1080 × 1350 (consistent within set)</li>
          <li><strong>Profile photo</strong> — 320 × 320px minimum</li>
        </ul>
        <h4>Facebook</h4>
        <ul>
          <li><strong>Feed image</strong> — 1200 × 630px</li>
          <li><strong>Cover photo</strong> — 820 × 312px (desktop) / 640 × 360px (mobile crop)</li>
          <li><strong>Stories</strong> — 1080 × 1920px</li>
        </ul>
        <h4>LinkedIn</h4>
        <ul>
          <li><strong>Feed image</strong> — 1200 × 627px or 1080 × 1080px</li>
          <li><strong>Banner</strong> — 1584 × 396px</li>
          <li><strong>Article cover</strong> — 1200 × 644px</li>
        </ul>
        <h4>Twitter/X</h4>
        <ul>
          <li><strong>In-stream image</strong> — 1200 × 675px (16:9)</li>
          <li><strong>Header</strong> — 1500 × 500px</li>
        </ul>
      </DocSection>

      <DocSection title="Caption Templates" icon={editIcon}>
        <h4>Short — Invite</h4>
        <p><em>&quot;Need a website refresh? DM us your ideas or check the link in bio!&quot;</em></p>
        <h4>Long — Free Offer</h4>
        <p><em>&quot;Is your site mobile-friendly? 60% of web traffic is mobile now. Download our FREE responsive design checklist via link in bio! 📱&quot;</em></p>
        <h4>Short — Tip</h4>
        <p><em>&quot;Pro Tip: Buttons with contrast colours get 21% more clicks. Test it on your site today.&quot;</em></p>
        <h4>Story — Engagement</h4>
        <p><em>&quot;What&apos;s your biggest design challenge right now? Drop a 🔥 for typography, 💡 for colour, ⚡ for layout.&quot;</em></p>
        <h4>Carousel — Educational</h4>
        <p><em>Slide 1: &quot;5 design mistakes killing your conversions&quot; → Slides 2-5: one mistake each with visual → Slide 6: CTA to your service</em></p>
      </DocSection>

      <DocSection title="Content Calendar Strategy" icon={calendarIcon}>
        <p>Plan content monthly, execute weekly. A content calendar prevents last-minute scrambles and ensures balanced pillar coverage.</p>
        <h4>Monthly planning template</h4>
        <ul>
          <li><strong>Week 1</strong> — Theme: Launch/Promotion. Lead with case study + testimonial</li>
          <li><strong>Week 2</strong> — Theme: Education. Tutorial carousel + tips Reel</li>
          <li><strong>Week 3</strong> — Theme: Community. UGC spotlight + behind-the-scenes</li>
          <li><strong>Week 4</strong> — Theme: Value. Free resource + thought leadership</li>
        </ul>
        <h4>Seasonal triggers</h4>
        <ul>
          <li><strong>January</strong> — &quot;New year, new website&quot; promotions</li>
          <li><strong>March</strong> — Spring refresh campaigns</li>
          <li><strong>September</strong> — Back to business, Q4 planning</li>
          <li><strong>November</strong> — End-of-year brand refresh campaigns, portfolio showcases</li>
          <li><strong>Year-round</strong> — Industry events, platform updates, trending topics</li>
        </ul>
      </DocSection>

      <DocSection title="Consumer Decision Journey" icon={pathIcon}>
        <p>The modern consumer journey isn&apos;t linear. Design your content strategy to support each stage.</p>
        <h4>Stages</h4>
        <ul>
          <li><strong>Awareness</strong> — They discover you. Content: Reels, educational carousels, SEO blog posts. Design: bold visuals, clear branding.</li>
          <li><strong>Consideration</strong> — They evaluate you. Content: case studies, process videos, testimonials. Design: trust signals, social proof, detailed portfolio.</li>
          <li><strong>Decision</strong> — They choose you. Content: pricing pages, comparison posts, DM conversations. Design: clear CTAs, urgency, easy contact.</li>
          <li><strong>Retention</strong> — They stay. Content: exclusive tips, client community, check-ins. Design: client portal, resource hub.</li>
          <li><strong>Advocacy</strong> — They refer others. Content: referral programs, client spotlights, shared wins. Design: shareable templates, co-branded content.</li>
        </ul>
      </DocSection>

      <DocSection title="Analytics & ROI Tracking" icon={chartIcon}>
        <div style={{ marginBottom: 12 }}>
          <Stat value="1-3%" label="average engagement rate" />
          <Stat value="$5-15" label="avg cost per 1000 impressions" />
        </div>
        <h4>Key metrics formulas</h4>
        <ul>
          <li><strong>Engagement Rate</strong> = (likes + comments + saves + shares) ÷ reach × 100. Average: 1–3%. Above 5% = excellent.</li>
          <li><strong>Click-Through Rate</strong> = link clicks ÷ impressions × 100. Average: 0.5–1.5%.</li>
          <li><strong>Conversion Rate</strong> = conversions ÷ link clicks × 100. Landing page average: 2–5%.</li>
          <li><strong>Cost Per Lead</strong> = total ad spend ÷ leads generated. Design services: $15–50 typical.</li>
          <li><strong>Customer Lifetime Value</strong> = avg project value × avg projects per client × avg retention years.</li>
        </ul>
        <h4>Benchmark by industry (engagement rate)</h4>
        <ul>
          <li>Design/Creative agencies: 2.5–4%</li>
          <li>Branding & Identity studios: 2–3.5%</li>
          <li>Web development: 1.5–3%</li>
          <li>Digital marketing: 1–2.5%</li>
        </ul>
      </DocSection>

      <DocSection title="Growth Tactics & Budgets" icon={dollarIcon}>
        <h4>Organic ($0)</h4>
        <p>Quality visuals, strategic hashtags, Stories stickers, reply to everything. Expected: +5–15% followers/month, 100–500 reach per post.</p>
        <h4>$200/month</h4>
        <p>1–2 boosted posts, lookalike audiences, retargeting pixels. Expected: 100–500 clicks, 100–300 new followers.</p>
        <h4>$500/month</h4>
        <p>Feed + Reels ads, A/B testing creative, 1 design community collaboration. Expected: 500–1,500 clicks, 300–600 new followers.</p>
        <h4>$1,000+/month</h4>
        <p>Full funnel (awareness + retargeting + conversion), A/B testing, sponsored content with design creators, carousel ads. Expected: 1,000+ clicks, 500–1,000+ new followers, measurable leads.</p>
      </DocSection>

      <DocSection title="Design Tips for Social Media" icon={layoutIcon}>
        <p>Design principles for social media are different from web design. Content must communicate in under 3 seconds while scrolling.</p>
        <h4>Typography for carousels</h4>
        <ul>
          <li>Headline: 24–32pt minimum (must be readable at thumbnail size)</li>
          <li>Body text: 16–20pt with high contrast</li>
          <li>1 font family maximum per carousel (2 weights: bold + regular)</li>
          <li>Left-aligned text reads faster than centered</li>
        </ul>
        <h4>Colour for feeds</h4>
        <ul>
          <li>Stick to 2–3 brand colours for a cohesive grid</li>
          <li>High saturation performs better on Instagram (the algorithm favors engagement)</li>
          <li>Dark backgrounds with light text stop the scroll more effectively</li>
          <li>Avoid pure white backgrounds — they blend with the app&apos;s UI</li>
        </ul>
        <h4>Composition rules</h4>
        <ul>
          <li>Leave 10% padding from edges (platform UIs overlap corners)</li>
          <li>Face in photo? Place text on the opposite side</li>
          <li>Carousel: first slide must hook, last slide must have CTA</li>
          <li>Use consistent templates — recognition builds trust faster than novelty</li>
        </ul>
      </DocSection>

      <DocSection title="Post Layout Grids" icon={gridIcon}>
        <p>Common grid patterns for arranging content within social media posts and carousels. Use these as starting points for your templates.</p>

        <LayoutExample
          title="Single Feature — Centred hero"
          description="Full-width layout for product shots, announcements, or bold typographic statements."
          code={`display: grid;\ngrid-template-rows: 1fr auto;\n\n/* 1080×1080 or 1080×1350 */\n┌──────────────────────┐\n│                      │\n│    Hero Image /      │\n│    Key Visual        │\n│                      │\n├──────────────────────┤\n│  Headline + CTA bar  │\n└──────────────────────┘`}
        >
          <div style={{ display: 'grid', gridTemplateRows: '1fr auto', gap: 8, minHeight: 160 }}>
            <div style={boxStyle(1, 120)}>Hero</div>
            <div style={{ ...boxStyle(1, 36), background: 'var(--accent)', color: '#fff', border: 'none' }}>CTA</div>
          </div>
        </LayoutExample>

        <LayoutExample
          title="Two-Column Split"
          description="Side-by-side layout for comparisons, before/after reveals, or image + text pairings."
          code={`display: grid;\ngrid-template-columns: 1fr 1fr;\ngap: 12px;\n\n┌──────────┬──────────┐\n│          │          │\n│  Visual  │   Text   │\n│          │  / Info  │\n│          │          │\n└──────────┴──────────┘`}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, minHeight: 120 }}>
            <div style={boxStyle()}>Visual</div>
            <div style={boxStyle()}>Text</div>
          </div>
        </LayoutExample>

        <LayoutExample
          title="Three-Column Grid"
          description="Equal columns for feature lists, service breakdowns, or icon + label groups."
          code={`display: grid;\ngrid-template-columns: repeat(3, 1fr);\ngap: 12px;\n\n┌──────┬──────┬──────┐\n│  01  │  02  │  03  │\n│      │      │      │\n└──────┴──────┴──────┘`}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, minHeight: 80 }}>
            <div style={boxStyle()}>01</div>
            <div style={boxStyle()}>02</div>
            <div style={boxStyle()}>03</div>
          </div>
        </LayoutExample>

        <LayoutExample
          title="Feature + Supporting Grid"
          description="One large hero with smaller supporting items. Great for portfolio highlights or product collections."
          code={`display: grid;\ngrid-template-columns: 2fr 1fr;\ngrid-template-rows: 1fr 1fr;\ngap: 12px;\n\n┌──────────────┬──────┐\n│              │  02  │\n│     01       ├──────┤\n│              │  03  │\n└──────────────┴──────┘`}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gridTemplateRows: '1fr 1fr', gap: 8, minHeight: 140 }}>
            <div style={{ ...boxStyle(), gridRow: 'span 2' }}>01</div>
            <div style={boxStyle()}>02</div>
            <div style={boxStyle()}>03</div>
          </div>
        </LayoutExample>

        <LayoutExample
          title="Four-Quadrant Grid"
          description="Balanced 2×2 grid for multi-point content, tip collections, or visual mood boards."
          code={`display: grid;\ngrid-template-columns: 1fr 1fr;\ngrid-template-rows: 1fr 1fr;\ngap: 12px;\n\n┌──────┬──────┐\n│  01  │  02  │\n├──────┼──────┤\n│  03  │  04  │\n└──────┴──────┘`}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 8, minHeight: 120 }}>
            <div style={boxStyle()}>01</div>
            <div style={boxStyle()}>02</div>
            <div style={boxStyle()}>03</div>
            <div style={boxStyle()}>04</div>
          </div>
        </LayoutExample>
      </DocSection>

      <DocSection title="Carousel Slide Layouts" icon={gridIcon}>
        <p>Consistent slide structures across a carousel build rhythm and make content scannable. These patterns work for educational, promotional, and portfolio carousels.</p>

        <LayoutExample
          title="Title Slide (Slide 1)"
          description="Hook the viewer. Bold headline, minimal text, strong brand presence."
          code={`display: grid;\ngrid-template-rows: 1fr auto auto;\npadding: 10% safe zone;\n\n┌──────────────────────┐\n│                      │\n│   Bold Headline      │\n│   (24–32pt min)      │\n│                      │\n├──────────────────────┤\n│   Subtext / hook     │\n├──────────────────────┤\n│   Brand mark / @     │\n└──────────────────────┘`}
        >
          <div style={{ display: 'grid', gridTemplateRows: '1fr auto auto', gap: 6, minHeight: 160, padding: 8 }}>
            <div style={{ ...boxStyle(1, 80), fontSize: 14, fontWeight: 800 }}>Headline</div>
            <div style={{ ...boxStyle(1, 28), opacity: 0.7 }}>Subtext</div>
            <div style={{ ...boxStyle(1, 24), opacity: 0.5, fontSize: 10 }}>@brand</div>
          </div>
        </LayoutExample>

        <LayoutExample
          title="Content Slide — Text + Visual"
          description="Split layout for educational carousels. Visual on one side, key point on the other."
          code={`display: grid;\ngrid-template-columns: 1fr 1fr;\nalign-items: center;\ngap: 16px;\n\n┌──────────┬──────────┐\n│          │          │\n│  Icon /  │  Point   │\n│  Visual  │  + Body  │\n│          │          │\n└──────────┴──────────┘`}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, minHeight: 120, alignItems: 'center' }}>
            <div style={boxStyle(1, 80)}>Visual</div>
            <div style={boxStyle(1, 80)}>Point</div>
          </div>
        </LayoutExample>

        <LayoutExample
          title="Content Slide — Numbered Steps"
          description="Vertical stack for process flows, step-by-step guides, or numbered lists."
          code={`display: grid;\ngrid-template-rows: auto 1fr 1fr 1fr;\ngap: 8px;\n\n┌──────────────────────┐\n│   Section Title      │\n├──┬───────────────────┤\n│01│  Step description  │\n├──┼───────────────────┤\n│02│  Step description  │\n├──┼───────────────────┤\n│03│  Step description  │\n└──┴───────────────────┘`}
        >
          <div style={{ display: 'grid', gap: 6, minHeight: 160 }}>
            <div style={{ ...boxStyle(1, 32), fontWeight: 800, fontSize: 12 }}>Title</div>
            {[1, 2, 3].map(n => (
              <div key={n} style={{ display: 'grid', gridTemplateColumns: '36px 1fr', gap: 6 }}>
                <div style={{ ...boxStyle(1, 32), background: 'var(--accent)', color: '#fff', border: 'none' }}>{`0${n}`}</div>
                <div style={boxStyle(1, 32)}>Step</div>
              </div>
            ))}
          </div>
        </LayoutExample>

        <LayoutExample
          title="CTA Slide (Final Slide)"
          description="Clear call-to-action. Minimal distraction, strong contrast, direct instruction."
          code={`display: grid;\ngrid-template-rows: 1fr auto auto;\nplace-items: center;\n\n┌──────────────────────┐\n│                      │\n│   Value proposition  │\n│                      │\n├──────────────────────┤\n│   ▶ CTA Button       │\n├──────────────────────┤\n│   @handle / link     │\n└──────────────────────┘`}
        >
          <div style={{ display: 'grid', gridTemplateRows: '1fr auto auto', gap: 6, minHeight: 140, textAlign: 'center' }}>
            <div style={{ ...boxStyle(1, 60), fontSize: 13 }}>Value Prop</div>
            <div style={{ ...boxStyle(1, 36), background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 20, fontSize: 12 }}>Get Started</div>
            <div style={{ ...boxStyle(1, 24), opacity: 0.5, fontSize: 10 }}>@handle</div>
          </div>
        </LayoutExample>
      </DocSection>

      <DocSection title="DM Templates & Lead Capture" icon={msgIcon}>
        <h4>New Follower</h4>
        <p><em>&quot;Hi [Name]! Thanks for following. We help businesses with [your service]. If you ever need design help, just DM — we love chatting!&quot;</em></p>
        <h4>Lead Funnel</h4>
        <ol>
          <li>Post with CTA → link in bio</li>
          <li>Landing page → email capture (offer free resource)</li>
          <li>Welcome email sequence (3 emails over 7 days)</li>
          <li>DM conversations → discovery call</li>
          <li>Follow-up → proposal → close</li>
        </ol>
        <h4>Inquiry Response Template</h4>
        <p><em>&quot;Thanks for reaching out! I&apos;d love to help. To give you an accurate quote, could you share: 1) Your business/brand name, 2) What you need (website, branding, etc.), 3) Your timeline? I&apos;ll get back to you within 24 hours!&quot;</em></p>
      </DocSection>
    </div>
  )
}
