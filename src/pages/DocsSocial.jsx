import { useI18n } from '../contexts/I18nContext'

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

function DimensionTable({ platform, items }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>{platform}</h4>
      <div style={{ borderRadius: 'var(--radius-s)', border: '1px solid var(--border)', overflow: 'hidden' }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px', fontSize: 12, borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none', background: i % 2 === 0 ? 'var(--bg-1)' : 'transparent' }}>
            <span style={{ color: 'var(--t1)' }}>{item.type}</span>
            <span style={{ fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--t0)' }}>{item.size}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Article({ number, title, children }) {
  return (
    <section style={{ marginBottom: 48, paddingBottom: 48, borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <span style={{ fontSize: 48, fontWeight: 800, color: 'var(--accent)', opacity: 0.15, lineHeight: 1, fontFamily: 'var(--mono)' }}>{number}</span>
        <h2 style={{ fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 700, letterSpacing: '-.03em', lineHeight: 1.2 }}>{title}</h2>
      </div>
      <div style={{ maxWidth: 720 }}>{children}</div>
    </section>
  )
}

function LayoutBox({ label, span = 1, height = 48, accent }) {
  return (
    <div style={{
      background: accent ? 'var(--accent)' : 'var(--accent-bg)',
      border: accent ? 'none' : '1px solid var(--accent)',
      borderRadius: 'var(--radius-s)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 10, fontWeight: 700, fontFamily: 'var(--mono)',
      color: accent ? '#fff' : 'var(--accent)',
      gridColumn: span > 1 ? `span ${span}` : undefined,
      minHeight: height,
    }}>
      {label}
    </div>
  )
}

export default function DocsSocial() {
  const { t } = useI18n()
  return (
    <div className="sec">
      <div style={{ marginBottom: 48 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 32, height: 2, background: 'var(--accent)', borderRadius: 1 }} />
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--accent)', fontFamily: 'var(--mono)' }}>Marketing Playbook</span>
        </div>
        <h1 style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 800, letterSpacing: '-.04em', lineHeight: 1.05, marginBottom: 12 }}>{t('docsSocial.title')}</h1>
        <p style={{ fontSize: 15, color: 'var(--t1)', maxWidth: 600, lineHeight: 1.75 }}>
          Data-driven social media strategies for design professionals. Algorithm insights, conversion psychology, and creative frameworks that actually move metrics.
        </p>
      </div>

      <Article number="01" title="How Social Algorithms Actually Rank Content in 2025">
        <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 16 }}>
          Every platform uses a different ranking model, but they all optimise for the same thing: <strong>time spent on platform</strong>. Understanding the signals each algorithm weights helps you create content that reaches more people organically.
        </p>
        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Instagram&apos;s ranking signals (by weight)</h4>
        <ul style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 16 }}>
          <li><strong>Saves</strong> — highest-weighted engagement signal since 2023. A save tells Instagram the content has long-term value. Design carousels worth saving (checklists, reference guides, templates).</li>
          <li><strong>Shares to DMs</strong> — second highest. Content people share privately signals genuine value over performative engagement. Create content people want to send to a specific friend.</li>
          <li><strong>Time spent on post</strong> — Instagram tracks dwell time. Carousels with 8-10 slides get 3-5x more dwell time than single images. Long captions add 15-30 seconds.</li>
          <li><strong>Comments with substance</strong> — multi-word comments weight more than emoji-only. Ask open questions that require real answers.</li>
          <li><strong>Likes</strong> — lowest weighted engagement signal. Optimising for likes alone is a losing strategy.</li>
        </ul>
        <Callout type="insight">
          Instagram Reels in 2025 are distributed 70% to non-followers via the Explore and Reels tabs. Feed posts reach primarily followers. If your goal is growth, Reels are mathematically required. If your goal is conversion, feed posts to existing followers are more effective.
        </Callout>
        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>LinkedIn&apos;s unique algorithm behavior</h4>
        <p style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 12 }}>
          LinkedIn penalises outbound links (posts with links get ~40% less reach). The workaround: post your content natively and add the link as the first comment. Document posts (multi-image carousels uploaded as PDFs) get 3x the reach of text-only posts. LinkedIn&apos;s &quot;dwell time&quot; signal means longer posts that people actually read outperform short ones.
        </p>
        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>TikTok&apos;s watch-time model</h4>
        <p style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--t1)' }}>
          TikTok&apos;s algorithm cares about <strong>completion rate above all else</strong>. A 15-second video watched 3 times outranks a 60-second video watched once. Hook in the first 1-2 seconds (text overlay or unexpected visual), deliver value fast, and end with a reason to rewatch (loop or reveal). Average watch time drops 50% after the 7-second mark.
        </p>
      </Article>

      <Article number="02" title="Content Architecture — The Pillar System">
        <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 16 }}>
          Random posting is the #1 reason small brands stall at under 1,000 followers. A pillar system ensures every post serves a strategic purpose while keeping your content diverse enough to avoid audience fatigue.
        </p>
        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>The 5-pillar framework</h4>
        <ul style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 16 }}>
          <li><strong>Authority content (30%)</strong> — Tutorials, breakdowns, hot takes on industry trends. Positions you as an expert. Optimise for saves and shares. Example: &quot;5 typography rules that separate junior from senior designers&quot;</li>
          <li><strong>Process content (25%)</strong> — Behind-the-scenes, design process, before/after reveals. Builds trust and relatability. Optimise for comments and followers. Example: time-lapse of a logo design from sketch to final.</li>
          <li><strong>Social proof (20%)</strong> — Client results, testimonials, case studies with metrics. Converts followers to leads. Optimise for profile visits and link clicks. Example: &quot;How we increased [Client]&apos;s conversion rate by 34% with a homepage redesign.&quot;</li>
          <li><strong>Community content (15%)</strong> — Polls, Q&As, opinion posts, memes. Drives engagement and algorithmic reach. Optimise for comments and shares. Example: &quot;Which logo version would you ship? A or B?&quot;</li>
          <li><strong>Promotional (10%)</strong> — Direct offers, service announcements, launches. Keeps to 10% maximum to avoid unfollows. Optimise for link clicks and DMs. Example: &quot;3 spots open for Q2 brand identity projects — link in bio.&quot;</li>
        </ul>
        <Callout type="warning">
          The most common mistake: 60%+ promotional content. Audiences unfollow accounts that feel like ads. The 10% rule is counterintuitive but accounts following it convert better because they&apos;ve built trust through the other 90%.
        </Callout>
      </Article>

      <Article number="03" title="Platform Dimensions — The Complete Reference">
        <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 16 }}>
          Incorrect dimensions cause cropping, pixelation, and wasted effort. These are current as of 2025. Bookmark this section.
        </p>
        <DimensionTable platform="Instagram" items={[
          { type: 'Square post', size: '1080 × 1080px (1:1)' },
          { type: 'Portrait post (recommended)', size: '1080 × 1350px (4:5)' },
          { type: 'Stories & Reels', size: '1080 × 1920px (9:16)' },
          { type: 'Carousel slide', size: '1080 × 1080 or 1080 × 1350' },
          { type: 'Profile photo', size: '320 × 320px min' },
        ]} />
        <DimensionTable platform="Facebook" items={[
          { type: 'Feed image', size: '1200 × 630px' },
          { type: 'Cover photo (desktop)', size: '820 × 312px' },
          { type: 'Cover photo (mobile crop)', size: '640 × 360px' },
          { type: 'Stories', size: '1080 × 1920px' },
          { type: 'Event cover', size: '1920 × 1005px' },
        ]} />
        <DimensionTable platform="LinkedIn" items={[
          { type: 'Feed image', size: '1200 × 627px or 1080 × 1080' },
          { type: 'Banner / cover', size: '1584 × 396px' },
          { type: 'Article cover', size: '1200 × 644px' },
          { type: 'Document post', size: '1080 × 1350px (PDF)' },
        ]} />
        <DimensionTable platform="Twitter/X" items={[
          { type: 'In-stream image', size: '1200 × 675px (16:9)' },
          { type: 'Header image', size: '1500 × 500px' },
          { type: 'Profile photo', size: '400 × 400px' },
        ]} />
        <DimensionTable platform="TikTok" items={[
          { type: 'Video (standard)', size: '1080 × 1920px (9:16)' },
          { type: 'Profile photo', size: '200 × 200px min' },
        ]} />
        <DimensionTable platform="YouTube" items={[
          { type: 'Thumbnail', size: '1280 × 720px (16:9)' },
          { type: 'Channel banner', size: '2560 × 1440px' },
          { type: 'Shorts', size: '1080 × 1920px (9:16)' },
        ]} />
        <Callout type="pro">
          4:5 portrait posts on Instagram get 35% more feed real estate than square 1:1. Always default to 1080 × 1350 for feed posts unless you have a specific reason for square. For carousels, keep all slides the same aspect ratio or Instagram crops inconsistently.
        </Callout>
      </Article>

      <Article number="04" title="The Posting Schedule That Actually Matters">
        <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 16 }}>
          &quot;Best time to post&quot; articles are mostly useless because they aggregate data across millions of accounts with different audiences. What actually matters is <strong>consistency and your specific audience&apos;s active hours</strong>.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          <Stat value="3-5x" label="Per week (feed)" sub="Diminishing returns above 7" />
          <Stat value="Daily" label="Stories" sub="Keeps you in the tray" />
          <Stat value="4-7" label="Reels per week" sub="For growth phase" />
          <Stat value="30 min" label="Engage after posting" sub="Reply to every comment" />
        </div>
        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Finding YOUR best time</h4>
        <ol style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 16 }}>
          <li>Go to Instagram Insights → Audience → Most Active Times</li>
          <li>Post 30 minutes before the peak (early presence catches the wave)</li>
          <li>Track for 4 weeks, then compare post-by-post: same content type, different times</li>
          <li>Your audience&apos;s pattern will emerge — it may not match generic advice</li>
        </ol>
        <Callout type="insight">
          The <strong>first 30 minutes</strong> after posting determine your reach for that post. Instagram shows your content to a small test group first. If engagement is high relative to that group, it expands distribution. This is why replying to every comment immediately matters — it doubles the comment count and signals active conversation.
        </Callout>
        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Weekly content calendar template</h4>
        <ul style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--t1)' }}>
          <li><strong>Monday</strong> — Authority carousel (educational, save-worthy)</li>
          <li><strong>Tuesday</strong> — Reel (process / tutorial / trend format)</li>
          <li><strong>Wednesday</strong> — Community post (poll, question, opinion)</li>
          <li><strong>Thursday</strong> — Reel (behind-the-scenes / results)</li>
          <li><strong>Friday</strong> — Social proof (case study, testimonial, before/after)</li>
          <li><strong>Weekend</strong> — Stories only (personal, casual, polls)</li>
        </ul>
      </Article>

      <Article number="05" title="Caption Psychology — Writing That Converts">
        <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 16 }}>
          Caption length has a direct relationship with engagement, but not the one most people assume. Instagram captions between 1,000-2,000 characters (roughly 150-300 words) get <strong>60% more engagement</strong> than short captions under 300 characters. The algorithm reads dwell time as a positive signal.
        </p>
        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>The hook-story-CTA framework</h4>
        <ul style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 16 }}>
          <li><strong>Hook (line 1)</strong> — Must be visible before &quot;...more&quot;. Use a bold claim, question, or number. Example: &quot;This one typography rule tripled our client&apos;s conversion rate.&quot;</li>
          <li><strong>Story (lines 2-8)</strong> — Deliver the value. Be specific: names, numbers, before/after. Vague advice gets scrolled past.</li>
          <li><strong>CTA (final line)</strong> — One clear action. &quot;Save this for your next project&quot; or &quot;Drop a [emoji] if you&apos;ve seen this.&quot; Don&apos;t ask for two things.</li>
        </ul>
        <Callout type="pro">
          <strong>The &quot;pattern interrupt&quot;</strong>: Start your caption with a line that contradicts expectations. &quot;Stop using Canva templates.&quot; &quot;Your logo doesn&apos;t matter.&quot; Controversial openers get 2-3x the &quot;...more&quot; tap rate because curiosity is a stronger driver than agreement.
        </Callout>
        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Hashtag strategy (2025)</h4>
        <p style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--t1)' }}>
          Instagram confirmed hashtags are now primarily a categorisation signal, not a discovery mechanism. Use 3-5 highly relevant hashtags, not 30 generic ones. Place them in the caption (not comments — Instagram changed this in 2024). Niche hashtags with 10K-500K posts outperform mega-hashtags with 10M+, because competition is lower and relevance is higher.
        </p>
      </Article>

      <Article number="06" title="Visual Design for Social — The 3-Second Rule">
        <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 16 }}>
          Social media design follows different rules than web design. Content must communicate in under 3 seconds while being thumb-scrolled at speed. Everything below is specific to social — don&apos;t apply web design thinking here.
        </p>
        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Typography hierarchy for carousels</h4>
        <ul style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 16 }}>
          <li><strong>Minimum headline size: 48px</strong> at 1080px width (must be legible at thumbnail size in the feed grid)</li>
          <li><strong>Body text: 24-32px</strong> with maximum 40 characters per line. On mobile, people hold the phone at arm&apos;s length.</li>
          <li><strong>One typeface per carousel</strong> — two weights max (bold for headings, regular for body). More than one typeface at small sizes creates visual noise.</li>
          <li><strong>Left-align text</strong> — centred text is harder to scan and reads 10% slower (eye has to re-find the start of each line).</li>
        </ul>
        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Colour for feed cohesion</h4>
        <ul style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 16 }}>
          <li><strong>Dark backgrounds outperform light</strong> — they stop the scroll because most feed content is bright. Contrast wins attention.</li>
          <li><strong>2-3 brand colours maximum</strong> across your grid. Cohesive grids get 40% more profile visits from non-followers.</li>
          <li><strong>Avoid pure white (#FFFFFF)</strong> — it blends with the app UI. Use off-white (#F5F5F0) or light grey.</li>
          <li><strong>High saturation on accent colours</strong> — desaturated palettes look sophisticated on websites but get lost in social feeds where you&apos;re competing with every other post.</li>
        </ul>
        <Callout type="warning">
          The safe zone problem: every platform overlays UI elements on content. Instagram puts the username over the bottom-left of feed posts and heart/comment/share icons on the right of Reels. Leave a <strong>15% margin from all edges</strong> — especially bottom and right — for your important elements.
        </Callout>

        <h4 style={{ fontSize: 14, fontWeight: 700, marginTop: 20, marginBottom: 12 }}>Post layout patterns</h4>
        <p style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 16 }}>
          These grid patterns serve as starting points for social templates. Consistent templates build recognition faster than novelty.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))', gap: 14, marginBottom: 16 }}>
          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 10, color: 'var(--t0)' }}>Single Feature</div>
            <div style={{ display: 'grid', gridTemplateRows: '1fr auto', gap: 6, minHeight: 120 }}>
              <LayoutBox label="Hero Visual" height={80} />
              <LayoutBox label="CTA" height={32} accent />
            </div>
            <div style={{ fontSize: 10, color: 'var(--t2)', marginTop: 8 }}>Product shots, announcements, bold typography</div>
          </div>
          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 10, color: 'var(--t0)' }}>Split Comparison</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, minHeight: 120 }}>
              <LayoutBox label="Before" height={120} />
              <LayoutBox label="After" height={120} />
            </div>
            <div style={{ fontSize: 10, color: 'var(--t2)', marginTop: 8 }}>Before/after, A vs B, visual comparisons</div>
          </div>
          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 10, color: 'var(--t0)' }}>Feature Grid</div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gridTemplateRows: '1fr 1fr', gap: 6, minHeight: 120 }}>
              <div style={{ gridRow: 'span 2' }}><LayoutBox label="Main" height={120} /></div>
              <LayoutBox label="02" height={56} />
              <LayoutBox label="03" height={56} />
            </div>
            <div style={{ fontSize: 10, color: 'var(--t2)', marginTop: 8 }}>Portfolio highlights, product collections</div>
          </div>
          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 10, color: 'var(--t0)' }}>Carousel CTA Slide</div>
            <div style={{ display: 'grid', gridTemplateRows: '1fr auto auto', gap: 6, minHeight: 120, textAlign: 'center' }}>
              <LayoutBox label="Value Proposition" height={60} />
              <LayoutBox label="Get Started" height={32} accent />
              <LayoutBox label="@handle" height={20} />
            </div>
            <div style={{ fontSize: 10, color: 'var(--t2)', marginTop: 8 }}>Final carousel slide, clear single CTA</div>
          </div>
        </div>
      </Article>

      <Article number="07" title="Analytics That Actually Predict Growth">
        <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 16 }}>
          Most creators track vanity metrics (follower count, likes). The metrics that predict future growth are different — and not always obvious.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          <Stat value="1-3%" label="Average engagement rate" sub="Design/creative niche" />
          <Stat value=">5%" label="Excellent engagement" sub="Indicates loyal audience" />
          <Stat value="3-7%" label="Save rate on carousels" sub="Healthy content value" />
        </div>
        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Leading indicators (predict future growth)</h4>
        <ul style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 16 }}>
          <li><strong>Save rate</strong> = saves ÷ reach × 100. Above 2% means your content has lasting value. Below 0.5% means it&apos;s consumed and forgotten.</li>
          <li><strong>Share rate</strong> = shares ÷ reach × 100. Above 1% means your content is worth passing on — this is the viral mechanism.</li>
          <li><strong>Profile visits from non-followers</strong> — this predicts follow growth before it happens. Track weekly.</li>
          <li><strong>Story completion rate</strong> — percentage of people who watch your entire story sequence. Below 60% means stories are too long or unengaging.</li>
        </ul>
        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Lagging indicators (measure past success)</h4>
        <ul style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 16 }}>
          <li><strong>Follower growth rate</strong> — net new followers ÷ total followers × 100 per week. Healthy: 1-3% weekly growth.</li>
          <li><strong>Link click rate</strong> = clicks ÷ impressions × 100. Average: 0.5-1.5%. Above 2% is excellent.</li>
          <li><strong>Conversion rate</strong> = conversions ÷ link clicks × 100. If above 5%, your landing page is working. Below 2%, fix the landing page before scaling traffic.</li>
        </ul>
        <Callout type="insight">
          <strong>The engagement rate trap</strong>: As your account grows, engagement rate naturally drops (denominator grows faster than engagement). Don&apos;t compare your rate to smaller accounts. A 2% rate at 50K followers generates more business than 8% at 500 followers. Focus on absolute numbers for business metrics and rates for content quality assessment.
        </Callout>
      </Article>

      <Article number="08" title="Growth Budget Tiers — What Each Level Unlocks">
        <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 16 }}>
          Paid promotion accelerates organic reach but has diminishing returns. Here&apos;s what each budget tier realistically unlocks, based on aggregated results from design-industry accounts.
        </p>
        <div style={{ borderRadius: 'var(--radius)', border: '1px solid var(--border)', overflow: 'hidden', marginBottom: 16 }}>
          {[
            { tier: '$0 — Organic', reach: '100-500 per post', growth: '5-15%/month', strategy: 'Quality content, strategic hashtags, Stories stickers, reply to every comment within 30 min' },
            { tier: '$200/month', reach: '1K-5K per boosted post', growth: '100-300 new followers', strategy: 'Boost 2-3 best-performing posts, retargeting pixel setup, lookalike audiences from existing followers' },
            { tier: '$500/month', reach: '5K-15K per campaign', growth: '300-600 new followers', strategy: 'Feed + Reels ads with A/B testing, one collaboration with a complementary creator, custom audience targeting' },
            { tier: '$1,000+/month', reach: '15K-50K per campaign', growth: '500-1,000+ new followers', strategy: 'Full funnel: awareness → retargeting → conversion, carousel ads, sponsored content, multiple A/B tests' },
          ].map((row, i) => (
            <div key={i} style={{ padding: '14px 18px', borderBottom: i < 3 ? '1px solid var(--border)' : 'none', background: i % 2 === 0 ? 'var(--bg-1)' : 'transparent' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t0)', marginBottom: 4 }}>{row.tier}</div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: 'var(--t2)' }}>Reach: <strong style={{ color: 'var(--t1)' }}>{row.reach}</strong></span>
                <span style={{ fontSize: 11, color: 'var(--t2)' }}>Growth: <strong style={{ color: 'var(--t1)' }}>{row.growth}</strong></span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--t1)', lineHeight: 1.6 }}>{row.strategy}</div>
            </div>
          ))}
        </div>
        <Callout type="pro">
          <strong>The $200 sweet spot</strong>: Before spending more, make sure your organic content converts. Boosting a post that doesn&apos;t work organically won&apos;t make it work paid. Only boost posts that already have above-average engagement — paid reach amplifies what&apos;s already working.
        </Callout>
      </Article>

      <Article number="09" title="The Lead Funnel — From Follower to Client">
        <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 16 }}>
          Followers are not leads. The conversion from follower to paying client requires a deliberate funnel. Most design accounts lose potential clients because they skip steps.
        </p>
        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>The 5-step funnel</h4>
        <ol style={{ fontSize: 13, lineHeight: 2, color: 'var(--t1)', marginBottom: 16 }}>
          <li><strong>Content → Profile visit</strong> — Your content makes someone click your profile. Conversion driver: strong hooks and clear expertise signals.</li>
          <li><strong>Profile → Follow</strong> — Your bio and grid convince them to follow. Conversion driver: clear value proposition in bio, cohesive grid, pinned posts showing results.</li>
          <li><strong>Follow → Link click</strong> — Stories, CTAs, and link-in-bio drive them to your site. Conversion driver: regular CTAs (not every post, but weekly), clear link-in-bio landing page.</li>
          <li><strong>Link click → Lead capture</strong> — Email signup, contact form, or booking link. Conversion driver: free resource (design checklist, template) in exchange for email.</li>
          <li><strong>Lead → Client</strong> — Email sequence, DM conversation, discovery call. Conversion driver: 3-email welcome sequence over 7 days, then monthly newsletter.</li>
        </ol>
        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>DM response templates</h4>
        <p style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 8 }}>
          Speed matters: responding within 5 minutes increases conversion by 400% compared to responding within 24 hours (InsideSales.com research). Use templates for speed, then personalise.
        </p>
        <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 'var(--radius-s)', padding: 16, marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--t2)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 6 }}>New Inquiry Template</div>
          <p style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--t1)', margin: 0, fontStyle: 'italic' }}>
            &quot;Thanks for reaching out! I&apos;d love to help with [their specific request]. To give you an accurate scope: 1) What&apos;s your timeline? 2) Do you have examples of styles you like? 3) What&apos;s your budget range? Happy to jump on a quick 15-min call this week if that&apos;s easier — here&apos;s my calendar: [link]&quot;
          </p>
        </div>
        <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 'var(--radius-s)', padding: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--t2)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 6 }}>New Follower Welcome</div>
          <p style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--t1)', margin: 0, fontStyle: 'italic' }}>
            &quot;Hey [Name]! Thanks for the follow. I share [type of content] here — if you ever need [your service], just DM. What are you working on right now?&quot;
          </p>
        </div>
      </Article>

      <div className="card" style={{ marginTop: 20, background: 'var(--accent-bg)', borderColor: 'var(--accent)' }}>
        <p style={{ fontSize: 14, color: 'var(--accent)', fontWeight: 600, margin: 0, lineHeight: 1.7 }}>
          Social media marketing is a compounding investment. The first 90 days feel like shouting into a void. Months 3-6 build momentum. After month 6, organic reach compounds — old posts continue generating profile visits and followers indefinitely. Consistency beats virality.
        </p>
      </div>
    </div>
  )
}
