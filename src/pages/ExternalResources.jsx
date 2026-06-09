import { useState, useCallback } from 'react'
import { useI18n } from '../contexts/I18nContext'

const BOOKMARKS_KEY = 'vs-bookmarked-resources'

function getBookmarks() {
  try { return JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || '[]') } catch { return [] }
}
function setBookmarks(urls) {
  try { localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(urls)) } catch {}
}

const categories = [
  {
    title: 'Typography',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="4 7 4 4 20 4 20 7" />
        <line x1="9" y1="20" x2="15" y2="20" />
        <line x1="12" y1="4" x2="12" y2="20" />
      </svg>
    ),
    links: [
      { name: 'Google Fonts', desc: 'Browse and pair 1,500+ open-source font families', url: 'https://fonts.google.com', color: '#4285F4', initials: 'GF' },
      { name: 'Fontjoy', desc: 'AI-powered font pairing generator', url: 'https://fontjoy.com', color: '#FF6B6B', initials: 'Fj' },
      { name: 'Typewolf', desc: 'Trending fonts and typography inspiration', url: 'https://www.typewolf.com', color: '#2D2D2D', initials: 'Tw' },
      { name: 'Font Squirrel', desc: 'Free fonts with webfont generator tools', url: 'https://www.fontsquirrel.com', color: '#C94040', initials: 'FS' },
      { name: 'Fontshare', desc: 'Free, professionally-designed fonts for your projects', url: 'https://www.fontshare.com', color: '#111111', initials: 'Fs' },
      { name: 'Free Faces', desc: 'Curated gallery of free typefaces with specimen previews', url: 'https://www.freefaces.gallery', color: '#FF4F00', initials: 'FF' },
    ],
  },
  {
    title: 'AI Image & Video',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l1.09 3.26L16 6l-2.91.74L12 10l-1.09-3.26L8 6l2.91-.74L12 2z" />
        <path d="M5 15l.55 1.64L7 17.18l-1.45.37L5 19.18l-.55-1.63L3 17.18l1.45-.37L5 15z" />
        <path d="M19 11l.55 1.64L21 13.01l-1.45.37L19 15.01l-.55-1.63L17 13.01l1.45-.37L19 11z" />
      </svg>
    ),
    links: [
      { name: 'Midjourney', desc: 'High-quality AI image generation from text prompts', url: 'https://www.midjourney.com', color: '#1A1A2E', initials: 'Mj' },
      { name: 'Runway', desc: 'AI creative suite for video editing and generation', url: 'https://runwayml.com', color: '#00D4AA', initials: 'Rw' },
      { name: 'Google Veo', desc: 'AI video generation and visual effects', url: 'https://labs.google/fx/tools/flow', color: '#4285F4', initials: 'GV' },
      { name: 'Kling AI', desc: 'AI image and video generation with creative controls', url: 'https://kling.ai/app', color: '#8B5CF6', initials: 'KA' },
      { name: 'Leonardo AI', desc: 'AI image generation with fine-tuned style models', url: 'https://leonardo.ai', color: '#7C3AED', initials: 'Le' },
    ],
  },
  {
    title: 'Framer',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="9" y1="21" x2="9" y2="9" />
      </svg>
    ),
    links: [
      { name: 'Framer Resources', desc: 'Templates, courses and community resources', url: 'https://framer.university/resources', color: '#0055FF', initials: 'Fr' },
      { name: 'Framer Marketplace', desc: 'Premium templates and components', url: 'https://www.framer.com/marketplace/', color: '#0055FF', initials: 'Fm' },
      { name: 'Framer Academy', desc: 'Tutorials and guides for building in Framer', url: 'https://www.framer.com/academy/', color: '#0055FF', initials: 'FA' },
    ],
  },
  {
    title: 'Design Inspiration',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
    links: [
      { name: 'Awwwards', desc: 'Award-winning website designs and trends', url: 'https://www.awwwards.com/', color: '#2D2D2D', initials: 'Aw' },
      { name: 'Land-book', desc: 'Curated landing page design gallery', url: 'https://land-book.com/', color: '#FF6600', initials: 'Lb' },
      { name: 'One Page Love', desc: 'One-page website design inspiration', url: 'https://onepagelove.com/', color: '#E91E63', initials: 'OP' },
      { name: 'Dribbble', desc: 'Discover creative work from designers worldwide', url: 'https://dribbble.com/', color: '#EA4C89', initials: 'Dr' },
      { name: 'Behance', desc: 'Showcase and discover creative projects', url: 'https://www.behance.net/', color: '#1769FF', initials: 'Be' },
      { name: 'SiteInspire', desc: 'Showcase of the finest web and interactive design', url: 'https://www.siteinspire.com/', color: '#111111', initials: 'Si' },
      { name: 'Mobbin', desc: 'Mobile and web design patterns from real apps', url: 'https://mobbin.com/', color: '#FFBE0B', initials: 'Mo' },
    ],
  },
  {
    title: 'AI Design Tools',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <rect x="9" y="9" width="6" height="6" />
        <line x1="9" y1="2" x2="9" y2="4" />
        <line x1="15" y1="2" x2="15" y2="4" />
        <line x1="9" y1="20" x2="9" y2="22" />
        <line x1="15" y1="20" x2="15" y2="22" />
        <line x1="20" y1="9" x2="22" y2="9" />
        <line x1="20" y1="15" x2="22" y2="15" />
        <line x1="2" y1="9" x2="4" y2="9" />
        <line x1="2" y1="15" x2="4" y2="15" />
      </svg>
    ),
    links: [
      { name: 'v0 by Vercel', desc: 'AI-powered UI component generation from prompts', url: 'https://v0.dev/', color: '#000000', initials: 'v0' },
      { name: 'Relume', desc: 'AI wireframing and sitemap builder', url: 'https://www.relume.io/', color: '#0F172A', initials: 'Re' },
      { name: 'Galileo AI', desc: 'Generate editable UI designs from text descriptions', url: 'https://www.usegalileo.ai/', color: '#6366F1', initials: 'GA' },
    ],
  },
  {
    title: 'Icons & Illustrations',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    ),
    links: [
      { name: 'Heroicons', desc: 'Hand-crafted SVG icons by the Tailwind team', url: 'https://heroicons.com/', color: '#8B5CF6', initials: 'Hi' },
      { name: 'Lucide', desc: 'Beautiful and consistent open-source icons', url: 'https://lucide.dev/', color: '#F56565', initials: 'Lu' },
      { name: 'Phosphor Icons', desc: 'Flexible icon family for UI interfaces', url: 'https://phosphoricons.com/', color: '#22D3EE', initials: 'Ph' },
      { name: 'unDraw', desc: 'Open-source illustrations for any idea', url: 'https://undraw.co/', color: '#6C63FF', initials: 'uD' },
      { name: 'Humaaans', desc: 'Mix-and-match illustration library of people', url: 'https://www.humaaans.com/', color: '#FFB800', initials: 'Hu' },
    ],
  },
  {
    title: 'CSS & Layout',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
    links: [
      { name: 'CSS-Tricks', desc: 'Tips, tricks, and techniques for CSS', url: 'https://css-tricks.com/', color: '#FF7A18', initials: 'CT' },
      { name: 'Flexbox Froggy', desc: 'Learn CSS flexbox through an interactive game', url: 'https://flexboxfroggy.com/', color: '#8BC34A', initials: 'FF' },
      { name: 'Grid Garden', desc: 'Learn CSS grid layout with a garden game', url: 'https://cssgridgarden.com/', color: '#795548', initials: 'GG' },
      { name: 'Animista', desc: 'CSS animation library with custom options', url: 'https://animista.net/', color: '#F44336', initials: 'An' },
      { name: 'Shadows Brumm', desc: 'Smooth CSS shadow generator tool', url: 'https://shadows.brumm.af/', color: '#546E7A', initials: 'Sh' },
    ],
  },
  {
    title: 'Stock & Media',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
      </svg>
    ),
    links: [
      { name: 'Unsplash', desc: 'Beautiful free photos and images', url: 'https://unsplash.com/', color: '#111111', initials: 'Un' },
      { name: 'Pexels', desc: 'Free stock photos, videos, and royalty-free images', url: 'https://www.pexels.com/', color: '#05A081', initials: 'Px' },
      { name: 'Mixkit', desc: 'Free stock video clips, music, and sound effects', url: 'https://mixkit.co/', color: '#6C5CE7', initials: 'Mk' },
      { name: 'Remove.bg', desc: 'Remove image backgrounds automatically', url: 'https://www.remove.bg/', color: '#1A8FE3', initials: 'Rb' },
    ],
  },
]

const allLinks = categories.flatMap(c => c.links.map(l => ({ ...l, category: c.title })))

const externalIcon = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4, flexShrink: 0 }}>
    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
)

const bookmarkIcon = (filled) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
  </svg>
)

function BrandPreview({ color, initials }) {
  return (
    <div
      style={{
        width: '100%',
        height: 48,
        borderRadius: 'var(--radius) var(--radius) 0 0',
        background: `linear-gradient(135deg, ${color}, ${color}cc)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.12,
          background: `radial-gradient(circle at 80% 20%, #fff 0%, transparent 50%), radial-gradient(circle at 20% 80%, #fff 0%, transparent 40%)`,
        }}
      />
      <span
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: '#fff',
          letterSpacing: '.04em',
          fontFamily: 'var(--mono)',
          position: 'relative',
          textShadow: '0 1px 2px rgba(0,0,0,.2)',
        }}
      >
        {initials}
      </span>
    </div>
  )
}

function ResourceCard({ link, isBookmarked, onToggleBookmark }) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', position: 'relative' }}>
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        style={{ textDecoration: 'none', color: 'inherit', flex: 1, display: 'flex', flexDirection: 'column' }}
      >
        <BrandPreview color={link.color} initials={link.initials} />
        <div style={{ padding: '12px 16px 14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--t0)' }}>{link.name}</span>
            {externalIcon}
          </div>
          <div style={{ fontSize: 12, color: 'var(--t2)', lineHeight: 1.45 }}>{link.desc}</div>
        </div>
      </a>
      <button
        onClick={(e) => { e.stopPropagation(); onToggleBookmark(link.url) }}
        style={{
          position: 'absolute',
          top: 6,
          right: 6,
          background: 'rgba(0,0,0,.45)',
          border: 'none',
          borderRadius: 'var(--radius-s)',
          color: isBookmarked ? '#facc15' : 'rgba(255,255,255,.7)',
          cursor: 'pointer',
          padding: '4px 6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'color .15s, transform .15s',
          zIndex: 2,
        }}
        aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
        title={isBookmarked ? 'Remove bookmark' : 'Bookmark this resource'}
      >
        {bookmarkIcon(isBookmarked)}
      </button>
    </div>
  )
}

export default function ExternalResources() {
  const { t } = useI18n()
  const [bookmarked, setBookmarked] = useState(getBookmarks)

  const toggleBookmark = useCallback((url) => {
    setBookmarked(prev => {
      const next = prev.includes(url) ? prev.filter(u => u !== url) : [...prev, url]
      setBookmarks(next)
      return next
    })
  }, [])

  const bookmarkedLinks = allLinks.filter(l => bookmarked.includes(l.url))

  return (
    <div className="sec">
      <div className="sec-h">
        <h1>{t('resources.title')}</h1>
        <p>{t('resources.subtitle')}</p>
      </div>

      {bookmarkedLinks.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: 'var(--t1)' }}>
            <span style={{ display: 'flex', color: '#facc15' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
              </svg>
            </span>
            <span style={{ fontSize: 15, fontWeight: 600 }}>Bookmarked</span>
            <span style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'var(--mono)', marginLeft: 4 }}>{bookmarkedLinks.length}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
            {bookmarkedLinks.map(link => (
              <ResourceCard key={link.url} link={link} isBookmarked onToggleBookmark={toggleBookmark} />
            ))}
          </div>
        </div>
      )}

      {categories.map((cat) => (
        <div key={cat.title} style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: 'var(--t1)' }}>
            <span style={{ display: 'flex', color: 'var(--accent)' }}>{cat.icon}</span>
            <span style={{ fontSize: 15, fontWeight: 600 }}>{cat.title}</span>
            <span style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'var(--mono)', marginLeft: 4 }}>{cat.links.length}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
            {cat.links.map((link) => (
              <ResourceCard key={link.url} link={link} isBookmarked={bookmarked.includes(link.url)} onToggleBookmark={toggleBookmark} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
