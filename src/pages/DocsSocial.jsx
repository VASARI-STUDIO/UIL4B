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

export default function DocsSocial() {
  return (
    <div className="sec on">
      <div className="sec-h">
        <h1>Social Media Marketing</h1>
        <p>Instagram strategy, posting cadence, templates, and growth tactics.</p>
      </div>
      <DocSection title="Content Pillars">
        <ul>
          <li><strong>Promotional</strong> — templates, launches, offers. KPIs: link clicks, conversions</li>
          <li><strong>Free-Value</strong> — guides, checklists. KPIs: downloads, email sign-ups</li>
          <li><strong>Case Studies</strong> — before/after. KPIs: engagement, inquiries</li>
          <li><strong>Testimonials</strong> — client quotes, UGC. KPIs: trust, profile visits</li>
          <li><strong>Behind-the-Scenes</strong> — process, team. KPIs: comments, follower growth</li>
          <li><strong>Tips & Tutorials</strong> — UX tips, how-tos. KPIs: saves, shares</li>
          <li><strong>Reels</strong> — 15–30s videos. Algorithm favours these. KPIs: views, reach</li>
        </ul>
      </DocSection>
      <DocSection title="Posting Cadence">
        <p>2–3 feed posts/week + daily Stories.</p>
        <ul>
          <li><strong>Monday</strong> — Promotional or case study</li>
          <li><strong>Thursday</strong> — Tips/tutorial carousel or Reel</li>
          <li><strong>Weekend</strong> — Behind-the-scenes or testimonial</li>
          <li><strong>Daily</strong> — Stories (polls, Q&As, process clips)</li>
        </ul>
      </DocSection>
      <DocSection title="Caption Templates">
        <h4>Short — Invite</h4>
        <p><em>&quot;Need a website refresh? DM us your ideas or check the link in bio!&quot;</em></p>
        <h4>Long — Free Offer</h4>
        <p><em>&quot;Is your site mobile-friendly? Download our FREE guide via link in bio!&quot;</em></p>
        <h4>Short — Tip</h4>
        <p><em>&quot;Pro Tip: Light-coloured CTAs get 20% more clicks. Try it!&quot;</em></p>
      </DocSection>
      <DocSection title="Growth Tactics & Budgets">
        <h4>Organic ($0)</h4>
        <p>Quality visuals, hashtags, Stories stickers, reply to everything. +5–15% followers/month.</p>
        <h4>$200/month</h4>
        <p>1–2 boosted posts, lookalike audiences. 100–500 clicks, 100–300 new followers.</p>
        <h4>$1000/month</h4>
        <p>Feed + Reels ads, A/B testing, 1–2 mid-tier influencers. 500–1000+ new followers.</p>
      </DocSection>
      <DocSection title="Metrics & A/B Testing">
        <ul>
          <li><strong>Follower Growth</strong> — new per week, track after campaigns</li>
          <li><strong>Engagement Rate</strong> — (likes+comments+saves+shares)/impressions. Average 1–3%</li>
          <li><strong>Profile CTR</strong> — link taps. High = strong CTAs</li>
          <li><strong>Leads</strong> — emails, DMs, form submissions</li>
        </ul>
      </DocSection>
      <DocSection title="DM Templates & Lead Capture">
        <h4>New Follower</h4>
        <p><em>&quot;Hi [Name]! Thanks for following. We have free templates that could help — DM any time!&quot;</em></p>
        <h4>Lead Funnel</h4>
        <ol>
          <li>Post with CTA → link in bio</li>
          <li>Landing page → email capture</li>
          <li>DM conversations → consultations</li>
          <li>Follow-up → nurture to sale</li>
        </ol>
      </DocSection>
    </div>
  )
}
