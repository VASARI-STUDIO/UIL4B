import DocsTOC from '../components/DocsTOC'

const LAST_UPDATED = '2026-06-15'

const TOC_ITEMS = [
  { id: 'art-mkt-01', number: '01', title: 'Positioning & Messaging' },
  { id: 'art-mkt-02', number: '02', title: 'Sales Funnel Basics' },
  { id: 'art-mkt-03', number: '03', title: 'Email Marketing' },
  { id: 'art-mkt-04', number: '04', title: 'Paid Advertising' },
  { id: 'art-mkt-05', number: '05', title: 'Content Marketing' },
  { id: 'art-mkt-06', number: '06', title: 'Landing Page Conversion' },
  { id: 'art-mkt-07', number: '07', title: 'Analytics & Attribution' },
  { id: 'art-mkt-08', number: '08', title: 'Brand Voice & Guidelines' },
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
    insight: { bg: 'var(--accent-bg)', border: 'var(--accent)', label: 'Key Insight' },
    warning: { bg: 'rgba(245,158,11,.08)', border: 'var(--warn)', label: 'Common Mistake' },
    pro: { bg: 'rgba(16,185,129,.08)', border: 'var(--ok)', label: 'Tested Strategy' },
  }
  const c = colors[type]
  return (
    <div style={{ padding: '14px 18px', borderRadius: 'var(--radius-s)', background: c.bg, borderLeft: `3px solid ${c.border}`, marginTop: 16, marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: c.border, marginBottom: 6 }}>{c.label}</div>
      <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--t0)' }}>{children}</div>
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
      {children}
    </section>
  )
}

export default function DocsMarketing() {
  return (
    <div className="sec">
      <div className="sec-h">
        <div className="sec-h-eyebrow">Documentation</div>
        <h1>Marketing Fundamentals</h1>
        <p>Core marketing strategies for small businesses and freelancers — from positioning to paid ads to email nurture sequences.</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--t2)' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          Last updated: {LAST_UPDATED}
        </div>
      </div>

      <DocsTOC items={TOC_ITEMS} />

      <Article id="art-mkt-01" number="01" title="Positioning & Messaging">
          <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 16 }}>
            Your positioning statement is the foundation every other marketing decision builds on. If you can&apos;t explain what you do, who it&apos;s for, and why you&apos;re different in one sentence, your prospects won&apos;t figure it out either.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            <Stat value="8 sec" label="Average attention span" sub="Time to hook a visitor" />
            <Stat value="64%" label="Share values with brand" sub="Reason consumers choose brands" />
            <Stat value="1" label="Core value prop needed" sub="One clear message wins" />
          </div>
          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>The Positioning Formula</h4>
          <div style={{ padding: 16, borderRadius: 'var(--radius-s)', background: 'var(--bg-1)', border: '1px solid var(--border)', marginBottom: 16, fontFamily: 'var(--mono)', fontSize: 13, lineHeight: 1.8, color: 'var(--t0)' }}>
            For [target audience] who [pain point/need],<br />
            [your product/service] is the [category]<br />
            that [key benefit] unlike [competitor/alternative]<br />
            because [proof/differentiator].
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 12 }}>
            Example: &quot;For freelance designers who struggle to find consistent clients, DesignFunnel is the CRM that automates lead follow-up unlike generic tools because it&apos;s built around project-based workflows.&quot;
          </p>
          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Build Your Target Persona</h4>
          <ul style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 12 }}>
            <li><strong>Demographics</strong> — Age, role, income, location. Keep it specific: &quot;35-year-old marketing manager at a 20-person agency&quot; beats &quot;marketing professionals.&quot;</li>
            <li><strong>Pain points</strong> — What keeps them up at night? What are they Googling at 11pm? These become your ad hooks.</li>
            <li><strong>Decision triggers</strong> — What event makes them start looking for a solution? A lost client, a missed deadline, a budget review?</li>
          </ul>
          <Callout type="insight">
            Your unique selling point is not a feature list. It&apos;s the intersection of what you do well, what your audience desperately needs, and what competitors fail to deliver. If competitors can copy it in a week, it&apos;s not a USP.
          </Callout>
        </Article>

        <Article id="art-mkt-02" number="02" title="Sales Funnel Basics">
          <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 16 }}>
            Every business has a funnel whether they designed one or not. The difference is intentional funnels convert 3-5x better than accidental ones. Understanding the stages lets you diagnose exactly where you&apos;re losing prospects.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            <Stat value="96%" label="Visitors not ready to buy" sub="On their first visit" />
            <Stat value="3-5x" label="Better conversion" sub="Intentional vs accidental funnels" />
            <Stat value="7-13" label="Touches to convert" sub="Average B2B decision journey" />
          </div>
          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>The Four Stages</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 16 }}>
            <div style={{ padding: 14, borderRadius: 'var(--radius-s)', background: 'var(--bg-1)', border: '1px solid var(--border)', textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent)', marginBottom: 4 }}>TOFU</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--t0)', marginBottom: 4 }}>Awareness</div>
              <div style={{ fontSize: 10, color: 'var(--t2)' }}>Blog, social, SEO, ads</div>
            </div>
            <div style={{ padding: 14, borderRadius: 'var(--radius-s)', background: 'var(--bg-1)', border: '1px solid var(--border)', textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent)', marginBottom: 4 }}>MOFU</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--t0)', marginBottom: 4 }}>Interest</div>
              <div style={{ fontSize: 10, color: 'var(--t2)' }}>Lead magnets, webinars, email</div>
            </div>
            <div style={{ padding: 14, borderRadius: 'var(--radius-s)', background: 'var(--bg-1)', border: '1px solid var(--border)', textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent)', marginBottom: 4 }}>BOFU</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--t0)', marginBottom: 4 }}>Decision</div>
              <div style={{ fontSize: 10, color: 'var(--t2)' }}>Case studies, demos, trials</div>
            </div>
            <div style={{ padding: 14, borderRadius: 'var(--radius-s)', background: 'var(--bg-1)', border: '1px solid var(--border)', textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent)', marginBottom: 4 }}>Close</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--t0)', marginBottom: 4 }}>Action</div>
              <div style={{ fontSize: 10, color: 'var(--t2)' }}>Proposals, checkout, onboarding</div>
            </div>
          </div>
          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Conversion Rate Benchmarks by Stage</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            <Stat value="2-5%" label="Visitor to lead" sub="TOFU to MOFU" />
            <Stat value="15-30%" label="Lead to qualified" sub="MOFU to BOFU" />
            <Stat value="20-40%" label="Qualified to customer" sub="BOFU to Close" />
          </div>
          <Callout type="warning">
            The biggest funnel mistake is spending all your budget on TOFU (traffic) when your BOFU (closing) is broken. Fix from the bottom up. A 10% improvement in close rate beats a 50% increase in traffic every time.
          </Callout>
        </Article>

        <Article id="art-mkt-03" number="03" title="Email Marketing">
          <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 16 }}>
            Email remains the highest-ROI marketing channel at $36 returned per $1 spent. The key is building a list of people who actually want to hear from you, then delivering value before asking for anything.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            <Stat value="$36" label="ROI per $1 spent" sub="Highest of any channel" />
            <Stat value="20-25%" label="Good open rate" sub="Industry average benchmark" />
            <Stat value="2-5%" label="Good click rate" sub="Engaged list benchmark" />
          </div>
          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Subject Line Best Practices</h4>
          <ul style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 16 }}>
            <li><strong>Length</strong> — 30-50 characters. Mobile truncates at ~35, so front-load the hook.</li>
            <li><strong>Personalization</strong> — Using the recipient&apos;s name boosts open rates by 10-14%.</li>
            <li><strong>Urgency without spam</strong> — &quot;Ends Friday&quot; works. &quot;ACT NOW!!!&quot; triggers spam filters.</li>
            <li><strong>Numbers and specifics</strong> — &quot;5 templates inside&quot; beats &quot;Great resources for you.&quot;</li>
          </ul>
          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>The 5-Email Welcome Sequence</h4>
          <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
            <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-s)', background: 'var(--bg-1)', border: '1px solid var(--border)', fontSize: 13, color: 'var(--t0)' }}>
              <strong>Email 1 (Immediately)</strong> — Deliver the promised lead magnet. Short intro, set expectations for what&apos;s coming next.
            </div>
            <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-s)', background: 'var(--bg-1)', border: '1px solid var(--border)', fontSize: 13, color: 'var(--t0)' }}>
              <strong>Email 2 (Day 2)</strong> — Share your story. Why you do what you do. Build a personal connection.
            </div>
            <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-s)', background: 'var(--bg-1)', border: '1px solid var(--border)', fontSize: 13, color: 'var(--t0)' }}>
              <strong>Email 3 (Day 4)</strong> — Provide a quick win. A tip, template, or technique they can use today.
            </div>
            <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-s)', background: 'var(--bg-1)', border: '1px solid var(--border)', fontSize: 13, color: 'var(--t0)' }}>
              <strong>Email 4 (Day 6)</strong> — Social proof. Share a case study or testimonial that mirrors their situation.
            </div>
            <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-s)', background: 'var(--bg-1)', border: '1px solid var(--border)', fontSize: 13, color: 'var(--t0)' }}>
              <strong>Email 5 (Day 8)</strong> — Soft pitch. Present your offer as the natural next step based on the value you&apos;ve already provided.
            </div>
          </div>
          <Callout type="pro">
            Segment your list from day one. Even simple segments (industry, company size, how they found you) can double your click-through rates compared to batch-and-blast sending.
          </Callout>
          <Callout type="insight">
            The best time to send email varies by audience, but Tuesday-Thursday between 10am-2pm consistently performs well across industries. Test your own data before committing to a schedule.
          </Callout>
        </Article>

        <Article id="art-mkt-04" number="04" title="Paid Advertising">
          <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 16 }}>
            Paid ads are the fastest way to validate a market and generate leads, but they&apos;re also the fastest way to burn cash if you don&apos;t know the fundamentals. Start with one channel, prove ROI, then expand.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            <Stat value="$1-3" label="Google Ads avg CPC" sub="Search, varies by industry" />
            <Stat value="$0.50-2" label="Meta Ads avg CPC" sub="Facebook + Instagram" />
            <Stat value="$3-8" label="LinkedIn avg CPC" sub="Higher but B2B-focused" />
          </div>
          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>When to Use Each Platform</h4>
          <ul style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 16 }}>
            <li><strong>Google Ads</strong> — Best for high-intent searches. People are actively looking for a solution. Ideal for services, SaaS, local businesses.</li>
            <li><strong>Meta Ads</strong> — Best for awareness and demand generation. Visual products, lifestyle brands, B2C. Strong retargeting capabilities.</li>
            <li><strong>LinkedIn Ads</strong> — Best for B2B targeting by job title, company size, and industry. Higher CPC but more precise audience.</li>
          </ul>
          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>ROAS Targets by Business Type</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            <Stat value="3:1" label="Minimum viable ROAS" sub="Break-even for most businesses" />
            <Stat value="5:1" label="Good ROAS target" sub="Healthy profit margin" />
            <Stat value="10:1+" label="Excellent ROAS" sub="Indicates strong product-market fit" />
          </div>
          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Small Business Budget Tiers</h4>
          <ul style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 12 }}>
            <li><strong>$500-1,000/mo</strong> — Testing phase. One platform, 2-3 ad variants, tight targeting. Goal: find what works.</li>
            <li><strong>$1,000-2,500/mo</strong> — Scaling what works. Expand winning ads, add retargeting. Goal: consistent lead flow.</li>
            <li><strong>$2,500-5,000/mo</strong> — Multi-channel. Primary + secondary platform, full-funnel campaigns. Goal: predictable revenue.</li>
          </ul>
          <Callout type="warning">
            Never send paid traffic to your homepage. Always use a dedicated landing page with a single CTA that matches the ad&apos;s promise. Mismatched messaging between ad and landing page tanks conversion rates.
          </Callout>
        </Article>

        <Article id="art-mkt-05" number="05" title="Content Marketing">
          <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 16 }}>
            Content marketing costs 62% less than traditional marketing and generates 3x more leads. The trick is not creating more content but creating the right content and repurposing it ruthlessly.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            <Stat value="62%" label="Less cost than traditional" sub="Content marketing advantage" />
            <Stat value="3x" label="More leads generated" sub="vs outbound marketing" />
            <Stat value="1 to 10" label="Repurposing ratio" sub="1 pillar piece = 10+ assets" />
          </div>
          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>The Content Trifecta</h4>
          <ul style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 16 }}>
            <li><strong>Blog/Written</strong> — Best for SEO, evergreen traffic, and in-depth education. Aim for 1,500-2,500 word pillar posts that rank.</li>
            <li><strong>Video</strong> — Best for engagement and trust-building. Short-form (60-90s) for social, long-form (10-20min) for YouTube SEO.</li>
            <li><strong>Social</strong> — Best for distribution and community. Not a content destination but a traffic driver to your owned platforms.</li>
          </ul>
          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>The Repurposing Workflow</h4>
          <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 12 }}>
            Start with one long-form pillar piece (blog post or video). Then extract: 3-5 social posts, 1 email newsletter, 1 infographic, 2-3 short video clips, 1 carousel, and a podcast talking point. That&apos;s 10+ pieces from a single idea.
          </p>
          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Content Calendar Basics</h4>
          <ul style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 12 }}>
            <li><strong>Cadence</strong> — Pick a realistic frequency and stick to it. Weekly beats daily-then-nothing.</li>
            <li><strong>Themes</strong> — Assign monthly or quarterly themes tied to business goals or seasons.</li>
            <li><strong>Batch creation</strong> — Dedicate one day to create a week&apos;s worth. Context-switching kills creative output.</li>
          </ul>
          <Callout type="pro">
            Consistency beats volume every time. One high-quality blog post per week outperforms five mediocre ones. Search engines and audiences both reward predictable, reliable publishing schedules.
          </Callout>
        </Article>

        <Article id="art-mkt-06" number="06" title="Landing Page Conversion">
          <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 16 }}>
            Your landing page is where marketing dollars either multiply or evaporate. A 1% improvement in conversion rate on a page getting 10,000 visits/month means 100 more leads without spending an extra dollar on traffic.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            <Stat value="2-5%" label="Good conversion rate" sub="Industry average landing page" />
            <Stat value="10%+" label="Excellent conversion" sub="Top-performing pages" />
            <Stat value="-50%" label="Drop per extra field" sub="Each form field reduces conversions" />
          </div>
          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Above the Fold Essentials</h4>
          <ul style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 16 }}>
            <li><strong>Headline</strong> — Clear benefit, not clever wordplay. &quot;Save 10 hours/week on reporting&quot; beats &quot;Reimagine your data journey.&quot;</li>
            <li><strong>Subheadline</strong> — How you deliver on the headline&apos;s promise in one sentence.</li>
            <li><strong>CTA button</strong> — Action-oriented, specific. &quot;Start free trial&quot; beats &quot;Submit.&quot; Use contrasting color.</li>
            <li><strong>Social proof</strong> — Logos, testimonial snippet, or user count. Even &quot;Trusted by 500+ teams&quot; works.</li>
          </ul>
          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Conversion Checklist</h4>
          <div style={{ display: 'grid', gap: 6, marginBottom: 16 }}>
            {[
              'Single, focused CTA (one page = one goal)',
              'Headline matches the ad or link that brought them here',
              'Form asks only for essential fields (name + email minimum)',
              'Page loads in under 3 seconds',
              'Mobile-responsive layout tested on real devices',
              'Social proof visible without scrolling',
              'No navigation menu (reduce exit paths)',
              'Clear privacy/trust signals near the form',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13, color: 'var(--t1)' }}>
                <span style={{ color: 'var(--ok)', fontWeight: 700, flexShrink: 0 }}>+</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
          <Callout type="insight">
            Removing your site&apos;s main navigation from landing pages typically increases conversion by 20-30%. Every link that isn&apos;t your CTA is a potential leak in your funnel.
          </Callout>
        </Article>

        <Article id="art-mkt-07" number="07" title="Analytics & Attribution">
          <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 16 }}>
            You can&apos;t improve what you don&apos;t measure. But measuring everything creates noise. Focus on 4-5 key metrics that directly connect marketing spend to revenue, and build attribution that tells you which channels actually drive results.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            <Stat value="CAC" label="Customer Acquisition Cost" sub="Total spend / new customers" />
            <Stat value="LTV" label="Lifetime Value" sub="Avg revenue per customer" />
            <Stat value="3:1" label="Ideal LTV:CAC ratio" sub="Below 3:1 = unsustainable" />
          </div>
          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>UTM Parameters</h4>
          <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 12 }}>
            Tag every link you share with UTM parameters so you know exactly where traffic comes from. At minimum use: <code style={{ padding: '2px 6px', borderRadius: 'var(--radius-s)', background: 'var(--bg-2)', fontSize: 12, fontFamily: 'var(--mono)' }}>utm_source</code>, <code style={{ padding: '2px 6px', borderRadius: 'var(--radius-s)', background: 'var(--bg-2)', fontSize: 12, fontFamily: 'var(--mono)' }}>utm_medium</code>, and <code style={{ padding: '2px 6px', borderRadius: 'var(--radius-s)', background: 'var(--bg-2)', fontSize: 12, fontFamily: 'var(--mono)' }}>utm_campaign</code>.
          </p>
          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Attribution Models</h4>
          <ul style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 16 }}>
            <li><strong>First-touch</strong> — Credits the first interaction. Good for understanding what drives initial awareness.</li>
            <li><strong>Last-touch</strong> — Credits the final interaction before conversion. Good for optimizing closing channels.</li>
            <li><strong>Multi-touch (linear)</strong> — Distributes credit evenly across all touchpoints. Most realistic for longer sales cycles.</li>
          </ul>
          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>GA4 Setup Priorities</h4>
          <ul style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 12 }}>
            <li><strong>Conversion events</strong> — Define what counts as a conversion (form submit, purchase, signup). Track these first.</li>
            <li><strong>Enhanced measurement</strong> — Enable scroll depth, outbound clicks, and file downloads automatically.</li>
            <li><strong>Audiences</strong> — Create segments for retargeting: visited pricing page, started checkout, read 3+ blog posts.</li>
          </ul>
          <Callout type="warning">
            Vanity metrics (page views, social followers, impressions) feel good but don&apos;t pay the bills. Always connect metrics back to revenue. If you can&apos;t draw a line from a metric to a dollar, question whether it&apos;s worth tracking.
          </Callout>
        </Article>

        <Article id="art-mkt-08" number="08" title="Brand Voice & Guidelines">
          <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 16 }}>
            Brand voice is not about what you say but how you say it. A consistent voice builds recognition and trust. An inconsistent one makes your brand feel unreliable, even if the content is good.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            <Stat value="3-5" label="Brand adjectives needed" sub="Defines your voice" />
            <Stat value="33%" label="Revenue increase" sub="From consistent branding" />
            <Stat value="5-7" label="Impressions to remember" sub="Before brand recognition kicks in" />
          </div>
          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>The Tone Spectrum</h4>
          <div style={{ padding: 16, borderRadius: 'var(--radius-s)', background: 'var(--bg-1)', border: '1px solid var(--border)', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: 'var(--t1)', marginBottom: 8 }}>
              <span>Formal</span>
              <span>Neutral</span>
              <span>Casual</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: 'linear-gradient(to right, var(--accent), var(--ok))', marginBottom: 8 }} />
            <div style={{ fontSize: 11, color: 'var(--t2)', lineHeight: 1.6 }}>
              Law firms, finance, enterprise SaaS lean formal. Lifestyle brands, DTC, creator tools lean casual. Pick your spot and stay there.
            </div>
          </div>
          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Do / Don&apos;t Word Lists</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div style={{ padding: 14, borderRadius: 'var(--radius-s)', border: '1px solid var(--ok)', background: 'rgba(16,185,129,.05)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ok)', marginBottom: 8 }}>Use</div>
              <ul style={{ fontSize: 12, lineHeight: 1.8, color: 'var(--t1)', paddingLeft: 16, margin: 0 }}>
                <li>Straightforward, honest language</li>
                <li>Active voice (&quot;We build&quot; not &quot;It is built&quot;)</li>
                <li>Specific numbers and proof</li>
                <li>Your customers&apos; own words</li>
              </ul>
            </div>
            <div style={{ padding: 14, borderRadius: 'var(--radius-s)', border: '1px solid var(--err)', background: 'rgba(239,68,68,.05)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--err)', marginBottom: 8 }}>Avoid</div>
              <ul style={{ fontSize: 12, lineHeight: 1.8, color: 'var(--t1)', paddingLeft: 16, margin: 0 }}>
                <li>Jargon your audience doesn&apos;t use</li>
                <li>Superlatives without proof (&quot;best ever&quot;)</li>
                <li>Passive voice and hedging</li>
                <li>Buzzwords (synergy, leverage, disrupt)</li>
              </ul>
            </div>
          </div>
          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Quick Exercise: Define Your Voice</h4>
          <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 12 }}>
            Pick 3 adjectives that describe how your brand should sound. For example: &quot;Confident, approachable, precise.&quot; Then write the same message three ways: too formal, too casual, and just right. The &quot;just right&quot; version becomes your template.
          </p>
          <Callout type="pro">
            Document your brand voice in a one-page guide with before/after examples for each channel (website, email, social). New team members and freelancers can match your voice in their first draft instead of requiring rounds of revision.
          </Callout>
        </Article>
    </div>
  )
}
