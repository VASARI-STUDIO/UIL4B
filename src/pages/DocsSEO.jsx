import { useI18n } from '../contexts/I18nContext'
import DocsTOC from '../components/DocsTOC'

const LAST_UPDATED = '2026-06-15'

const TOC_ITEMS = [
  { id: 'art-seo-01', number: '01', title: 'Google Business Profile' },
  { id: 'art-seo-02', number: '02', title: 'Local SEO Foundations' },
  { id: 'art-seo-03', number: '03', title: 'Technical SEO Checklist' },
  { id: 'art-seo-04', number: '04', title: 'On-Page SEO' },
  { id: 'art-seo-05', number: '05', title: 'Content Strategy 2026' },
  { id: 'art-seo-06', number: '06', title: 'Link Building' },
  { id: 'art-seo-07', number: '07', title: 'Schema & Structured Data' },
  { id: 'art-seo-08', number: '08', title: 'Measuring SEO Success' },
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
      <div style={{ maxWidth: 720 }}>{children}</div>
    </section>
  )
}

export default function DocsSEO() {
  const { t } = useI18n()
  return (
    <div className="sec">
      <div className="sec-h">
        <div className="sec-h-eyebrow">Documentation</div>
        <h1>SEO for Small Business</h1>
        <p>Practical SEO strategies for small businesses in 2026 — Google Business Profile, local SEO, technical foundations, and content that ranks.</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--t2)' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          Last updated: {LAST_UPDATED}
        </div>
      </div>

      <DocsTOC items={TOC_ITEMS} />

      <Article id="art-seo-01" number="01" title="Google Business Profile">
        <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 12 }}>
          Your Google Business Profile (GBP) is the single most important local SEO asset you own. It controls what appears in Google Maps, the local pack, and knowledge panels. If you do nothing else, do this right.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <Stat value="56%" label="Local pack clicks" sub="go to GBP listings" />
          <Stat value="84%" label="Discovery searches" sub="find businesses via GBP" />
          <Stat value="2.7x" label="Revenue increase" sub="with complete GBP profile" />
        </div>
        <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 12 }}>
          <strong>Key fields to optimise:</strong>
        </p>
        <ul style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 16 }}>
          <li><strong>Business name</strong> — Use your exact legal name. Do not stuff keywords. Google penalises names like &quot;Best Plumber Sydney | 24/7 Emergency.&quot;</li>
          <li><strong>Primary category</strong> — Choose the most specific category available. &quot;Italian Restaurant&quot; beats &quot;Restaurant.&quot; Add secondary categories for other services.</li>
          <li><strong>Description</strong> — 750 characters max. Lead with what you do and where. Include natural keywords but write for humans first.</li>
          <li><strong>Photos</strong> — Businesses with 100+ photos get 520% more calls. Upload exterior, interior, team, and product photos weekly.</li>
        </ul>
        <Callout type="pro">
          Post to your GBP weekly. Google treats active profiles as more relevant. Use the &quot;Update&quot; post type for announcements, &quot;Offer&quot; for promotions, and &quot;Event&quot; for time-bound activities. Each post stays visible for 7 days.
        </Callout>
        <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 12 }}>
          <strong>Reviews matter enormously.</strong> Respond to every review within 24 hours — positive and negative. Businesses with 40+ reviews and a 4.0+ rating dominate the local pack. Ask happy customers directly; never buy or incentivise fake reviews.
        </p>
        <Callout type="insight">
          Enable the Q&amp;A section and pre-seed it with common questions your customers ask. Google indexes these, and they appear prominently on your profile. Think of it as a free FAQ that ranks.
        </Callout>
      </Article>

      <Article id="art-seo-02" number="02" title="Local SEO Foundations">
        <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 12 }}>
          Local SEO boils down to one principle: consistency. Your Name, Address, and Phone number (NAP) must be identical everywhere. One wrong digit, one abbreviated street name, and Google loses confidence in your listing.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <Stat value="NAP" label="Name, Address, Phone" sub="must match everywhere" />
          <Stat value="68%" label="Consumers" sub="stop using a business with wrong info" />
        </div>
        <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 12 }}>
          <strong>Priority directory listings:</strong>
        </p>
        <div style={{ borderRadius: 'var(--radius-s)', border: '1px solid var(--border)', overflow: 'hidden', marginBottom: 16 }}>
          {[
            { directory: 'Google Business Profile', priority: 'Critical', notes: 'Foundation of local SEO' },
            { directory: 'Apple Maps Connect', priority: 'Critical', notes: 'Powers Siri and Apple devices' },
            { directory: 'Bing Places', priority: 'High', notes: 'Feeds Cortana and Edge searches' },
            { directory: 'Yelp', priority: 'High', notes: 'Strong domain authority, review signals' },
            { directory: 'Facebook Business', priority: 'High', notes: 'Social signals, local discovery' },
            { directory: 'Yellow Pages / True Local', priority: 'Medium', notes: 'Legacy authority, citation value' },
            { directory: 'Industry directories', priority: 'Medium', notes: 'Niche relevance signals' },
          ].map((row, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 1fr', gap: 8, padding: '8px 14px', fontSize: 12, borderBottom: i < 6 ? '1px solid var(--border)' : 'none', background: i % 2 === 0 ? 'var(--bg-1)' : 'transparent' }}>
              <span style={{ fontWeight: 600, color: 'var(--t0)' }}>{row.directory}</span>
              <span style={{ fontFamily: 'var(--mono)', color: row.priority === 'Critical' ? 'var(--err)' : row.priority === 'High' ? 'var(--warn)' : 'var(--t2)', fontWeight: 600, fontSize: 10 }}>{row.priority}</span>
              <span style={{ color: 'var(--t2)' }}>{row.notes}</span>
            </div>
          ))}
        </div>
        <Callout type="insight">
          Add LocalBusiness schema markup to your website. This structured data tells Google exactly what your business is, where it is, and when it is open. It directly supports your GBP listing and can trigger rich results in search.
        </Callout>
      </Article>

      <Article id="art-seo-03" number="03" title="Technical SEO Checklist">
        <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 12 }}>
          Technical SEO is the foundation everything else sits on. If Google cannot crawl, render, or understand your site, no amount of content will help. These are the non-negotiable baselines for 2026.
        </p>
        <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 12 }}>
          <strong>Core Web Vitals thresholds:</strong>
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <Stat value="<2.5s" label="LCP" sub="Largest Contentful Paint" />
          <Stat value="<100ms" label="FID" sub="First Input Delay" />
          <Stat value="<0.1" label="CLS" sub="Cumulative Layout Shift" />
          <Stat value="<200ms" label="INP" sub="Interaction to Next Paint" />
        </div>
        <Callout type="pro">
          Run PageSpeed Insights on your top 5 landing pages, not just your homepage. Many sites pass on the homepage but fail on product or blog pages where heavy images and third-party scripts load.
        </Callout>
        <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 12 }}>
          <strong>Technical checklist:</strong>
        </p>
        <ul style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 16 }}>
          <li><strong>HTTPS</strong> — Non-negotiable since 2018. Free via Let&apos;s Encrypt. Google flags HTTP sites as &quot;Not Secure.&quot;</li>
          <li><strong>Mobile-first indexing</strong> — Google crawls mobile version first. Test with Mobile-Friendly Test tool. Ensure no content is hidden on mobile.</li>
          <li><strong>sitemap.xml</strong> — Submit to Google Search Console. Include only indexable, canonical URLs. Update automatically on content changes.</li>
          <li><strong>robots.txt</strong> — Allow all important pages. Block admin, staging, and duplicate content paths. Check for accidental disallow rules.</li>
          <li><strong>Canonical tags</strong> — Every page needs a self-referencing canonical. Prevents duplicate content from URL parameters and trailing slashes.</li>
          <li><strong>404 handling</strong> — Custom 404 page with search and navigation. Monitor crawl errors in Search Console weekly.</li>
        </ul>
        <Callout type="warning">
          Do not block CSS or JavaScript in robots.txt. Google needs to render your pages fully to evaluate them. Blocking render-critical resources tanks your rankings.
        </Callout>
      </Article>

      <Article id="art-seo-04" number="04" title="On-Page SEO">
        <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 12 }}>
          On-page SEO is where you control the narrative. Every page on your site should be optimised for one primary keyword and 2-3 related terms. Here are the elements that matter most.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <Stat value="50-60" label="Title tag chars" sub="optimal length for SERPs" />
          <Stat value="150-160" label="Meta description" sub="characters before truncation" />
          <Stat value="1" label="H1 per page" sub="one clear topic signal" />
        </div>
        <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 12 }}>
          <strong>Title tags — before and after:</strong>
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div style={{ padding: 14, borderRadius: 'var(--radius-s)', border: '1px solid var(--err)', background: 'rgba(239,68,68,.05)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--err)', marginBottom: 6 }}>Avoid</div>
            <div style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--t1)', fontFamily: 'var(--mono)' }}>Home | My Business Name</div>
          </div>
          <div style={{ padding: 14, borderRadius: 'var(--radius-s)', border: '1px solid var(--ok)', background: 'rgba(16,185,129,.05)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ok)', marginBottom: 6 }}>Better</div>
            <div style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--t1)', fontFamily: 'var(--mono)' }}>Emergency Plumber Sydney | 24/7 Same-Day Service</div>
          </div>
        </div>
        <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 12 }}>
          <strong>Heading hierarchy:</strong> Use H1 for the page title, H2 for major sections, H3 for subsections. Never skip levels (H1 to H3). Screen readers and Google both use heading structure to understand content relationships.
        </p>
        <ul style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 16 }}>
          <li><strong>Image alt text</strong> — Describe what is in the image, not keywords. &quot;Team photo of 5 people in the office&quot; beats &quot;best plumber sydney team photo plumber.&quot;</li>
          <li><strong>Internal linking</strong> — Every page should link to 3-5 related pages on your site. Use descriptive anchor text, not &quot;click here.&quot;</li>
          <li><strong>URL structure</strong> — Keep URLs short and readable. /services/emergency-plumbing beats /services?id=42&amp;cat=plumb.</li>
        </ul>
        <Callout type="insight">
          Write your meta description like ad copy. It does not directly affect rankings, but a compelling description increases click-through rate, which does. Include a call to action and your primary keyword naturally.
        </Callout>
      </Article>

      <Article id="art-seo-05" number="05" title="Content Strategy 2026">
        <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 12 }}>
          Google&apos;s ranking system in 2026 revolves around E-E-A-T: Experience, Expertise, Authoritativeness, and Trustworthiness. Content must demonstrate real-world knowledge, not just repackage information from other sites.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <Stat value="E-E-A-T" label="Ranking framework" sub="Experience, Expertise, Authority, Trust" />
          <Stat value="7-10" label="Topical articles" sub="needed for cluster authority" />
          <Stat value="1,500+" label="Words per pillar" sub="for comprehensive coverage" />
        </div>
        <Callout type="warning">
          Google&apos;s helpful content system penalises sites that publish content primarily for search engines rather than people. AI-generated content is not banned, but content that lacks original insight, first-hand experience, or genuine value will be demoted regardless of how it was created.
        </Callout>
        <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 12 }}>
          <strong>Topical authority clusters:</strong> Instead of writing random blog posts, build clusters. Pick a core topic (pillar page) and write 7-10 supporting articles that link back to it. This signals deep expertise on a subject.
        </p>
        <ul style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 16 }}>
          <li><strong>Pillar page</strong> — Broad overview of the topic (e.g., &quot;Complete Guide to Kitchen Renovations&quot;). 2,000-3,000 words.</li>
          <li><strong>Cluster articles</strong> — Specific subtopics (e.g., &quot;Kitchen Benchtop Materials Compared&quot;). 1,000-1,500 words each.</li>
          <li><strong>Internal links</strong> — Every cluster article links to the pillar. The pillar links to every cluster article. This creates a web of topical relevance.</li>
        </ul>
        <Callout type="pro">
          Add author bios with credentials, link to author social profiles, and include first-person experience in your content. &quot;In our 15 years of renovating kitchens, we have found...&quot; signals experience that Google values highly under E-E-A-T.
        </Callout>
      </Article>

      <Article id="art-seo-06" number="06" title="Link Building">
        <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 12 }}>
          Backlinks remain a top-3 ranking factor. But the game has changed: one link from a relevant, authoritative site is worth more than 100 links from random directories. Focus on quality and relevance.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <Stat value="1" label="Quality link" sub="beats 100 low-quality links" />
          <Stat value="58%" label="SEO professionals" sub="say link building is hardest" />
        </div>
        <Callout type="warning">
          Buying links, participating in link exchanges, and using private blog networks (PBNs) violate Google&apos;s guidelines. Penalties range from ranking drops to full de-indexing. The risk is never worth it for a small business.
        </Callout>
        <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 12 }}>
          <strong>Strategies that work:</strong>
        </p>
        <ul style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 16 }}>
          <li><strong>Guest posting</strong> — Write genuine, useful articles for industry blogs. One well-placed guest post with a contextual link builds authority and referral traffic.</li>
          <li><strong>HARO / Connectively</strong> — Respond to journalist queries as a subject matter expert. Getting quoted in news articles earns high-authority links naturally.</li>
          <li><strong>Broken link building</strong> — Find broken links on relevant sites using tools like Ahrefs. Offer your content as a replacement. Win-win for both parties.</li>
          <li><strong>Local partnerships</strong> — Sponsor local events, join chambers of commerce, partner with complementary businesses. These earn .org and .edu links that carry strong trust signals.</li>
          <li><strong>Create linkable assets</strong> — Original research, calculators, templates, and data visualisations naturally attract links. If it is useful, people will reference it.</li>
        </ul>
        <Callout type="pro">
          Set up Google Alerts for your brand name without a link. When someone mentions your business but does not link to you, send a friendly email asking them to add the link. Conversion rate on these is over 40%.
        </Callout>
      </Article>

      <Article id="art-seo-07" number="07" title="Schema & Structured Data">
        <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 12 }}>
          Schema markup is code that helps search engines understand your content. It does not directly boost rankings, but it enables rich results — star ratings, FAQs, pricing, breadcrumbs — that dramatically increase click-through rates.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <Stat value="30%" label="CTR increase" sub="with rich results in SERPs" />
          <Stat value="4" label="Key schema types" sub="for small businesses" />
        </div>
        <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 12 }}>
          <strong>Essential schema types:</strong>
        </p>
        <ul style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 16 }}>
          <li><strong>LocalBusiness</strong> — Name, address, phone, hours, geo coordinates. The foundation for local search presence.</li>
          <li><strong>FAQPage</strong> — Frequently asked questions. Can trigger expandable FAQ snippets directly in search results.</li>
          <li><strong>Product</strong> — Price, availability, reviews. Essential for e-commerce and service pricing pages.</li>
          <li><strong>BreadcrumbList</strong> — Site navigation path. Replaces ugly URLs in search results with readable breadcrumbs.</li>
        </ul>
        <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 12 }}>
          <strong>Example LocalBusiness JSON-LD:</strong>
        </p>
        <div style={{ padding: 16, borderRadius: 'var(--radius-s)', background: 'var(--bg-2)', border: '1px solid var(--border)', fontFamily: 'var(--mono)', fontSize: 11, lineHeight: 1.7, color: 'var(--t1)', overflowX: 'auto', marginBottom: 16, whiteSpace: 'pre' }}>
{`<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Your Business Name",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "123 Main St",
    "addressLocality": "Sydney",
    "addressRegion": "NSW",
    "postalCode": "2000"
  },
  "telephone": "+61-2-1234-5678",
  "openingHours": "Mo-Fr 09:00-17:00",
  "url": "https://yourbusiness.com.au"
}
</script>`}
        </div>
        <Callout type="insight">
          Validate your schema using Google&apos;s Rich Results Test before deploying. Invalid markup is worse than no markup — it can confuse search engines and trigger manual actions in Search Console.
        </Callout>
      </Article>

      <Article id="art-seo-08" number="08" title="Measuring SEO Success">
        <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 12 }}>
          SEO is a long game. Expect 3-6 months before seeing meaningful results from new efforts. Track the right metrics, and avoid vanity numbers that feel good but do not indicate real progress.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <Stat value="3-6" label="Months to results" sub="for new SEO campaigns" />
          <Stat value="2-3%" label="Average CTR" sub="for position 1 in 2026" />
          <Stat value="53%" label="Website traffic" sub="comes from organic search" />
        </div>
        <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 12 }}>
          <strong>Key metrics to track:</strong>
        </p>
        <ul style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 16 }}>
          <li><strong>Organic traffic</strong> — Total visits from search engines. Track in GA4 under Acquisition &gt; Traffic Acquisition. Filter by organic search.</li>
          <li><strong>Click-through rate</strong> — Impressions vs clicks in Google Search Console. Low CTR with high impressions means your titles and descriptions need work.</li>
          <li><strong>Keyword rankings</strong> — Track your target keywords weekly. Focus on page 1 (positions 1-10) movement, not vanity rankings for easy terms.</li>
          <li><strong>Indexed pages</strong> — Check Coverage report in Search Console. Ensure important pages are indexed and flagged pages are fixed promptly.</li>
          <li><strong>Conversions from organic</strong> — The metric that actually matters. Set up conversion tracking in GA4 for calls, form submissions, and purchases.</li>
        </ul>
        <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--t1)', marginBottom: 12 }}>
          <strong>Essential tools:</strong>
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 16 }}>
          {[
            { tool: 'Google Search Console', cost: 'Free', use: 'Rankings, indexing, crawl errors' },
            { tool: 'Google Analytics 4', cost: 'Free', use: 'Traffic, conversions, user behavior' },
            { tool: 'Ahrefs / Semrush', cost: 'Paid', use: 'Backlinks, keyword research, audits' },
            { tool: 'PageSpeed Insights', cost: 'Free', use: 'Core Web Vitals, performance' },
          ].map((item, i) => (
            <div key={i} style={{ padding: 14, borderRadius: 'var(--radius-s)', background: 'var(--bg-1)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t0)', marginBottom: 4 }}>{item.tool}</div>
              <div style={{ fontSize: 10, fontFamily: 'var(--mono)', fontWeight: 600, color: item.cost === 'Free' ? 'var(--ok)' : 'var(--warn)', marginBottom: 6 }}>{item.cost}</div>
              <div style={{ fontSize: 11, color: 'var(--t2)', lineHeight: 1.5 }}>{item.use}</div>
            </div>
          ))}
        </div>
        <Callout type="pro">
          Set up a monthly SEO report with these five numbers: organic sessions, top 10 keyword count, new backlinks, indexed pages, and conversion rate from organic. One page, five numbers, reviewed monthly. That is all you need to track progress.
        </Callout>
      </Article>
    </div>
  )
}
