import { NavLink } from 'react-router-dom'
import { getCategory, localiseTools, localiseCategories } from '../data/tools'
import { useWorkspace } from '../contexts/WorkspaceContext'
import { useI18n } from '../contexts/I18nContext'

function PinIcon({ filled }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 17v5" />
      <path d="M9 10.76V6h6v4.76a2 2 0 0 0 1.11 1.79l1.78.9A2 2 0 0 1 19 15.24V17H5v-1.76a2 2 0 0 1 1.11-1.79l1.78-.9A2 2 0 0 0 9 10.76Z" />
    </svg>
  )
}

function ArrowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  )
}

const QUICK_ACTIONS = {
  color: [
    { label: 'Generate harmonies', desc: 'Complementary, triadic, analogous', to: '/color' },
    { label: 'Tint & shade scale', desc: '10-step tonal range from any base', to: '/color' },
    { label: 'WCAG contrast check', desc: 'AA/AAA pairing verification', to: '/color' },
    { label: 'Gradient builder', desc: 'Multi-stop, CSS-ready output', to: '/color' },
  ],
  typography: [
    { label: 'Modular scale', desc: 'Minor third, perfect fourth, etc.', to: '/typescale' },
    { label: 'Heading + body pair', desc: 'Curated combinations', to: '/fontpairs' },
    { label: 'Browse font gallery', desc: 'Visual typeface showcase', to: '/fontgallery' },
    { label: 'CSS export', desc: 'Drop-in custom properties', to: '/typescale' },
  ],
  imagery: [
    { label: 'Compress for web', desc: 'Reduce JPG/PNG file size', to: '/imgconvert' },
    { label: 'Convert to WebP', desc: 'Modern format, smaller files', to: '/imgconvert' },
    { label: 'Browse outline icons', desc: 'Iconify-powered search', to: '/icons' },
    { label: 'Extract video frames', desc: 'Pull stills from MP4/MOV', to: '/video-frames' },
  ],
  documentation: [
    { label: 'Visual hierarchy', desc: 'Layout fundamentals', to: '/docs-design' },
    { label: 'Spacing & shadows', desc: 'Token reference sheet', to: '/design-reference' },
    { label: 'Social post sizes', desc: 'Platform-specific specs', to: '/docs-social' },
    { label: 'External resources', desc: 'Curated tools and reads', to: '/resources' },
  ],
}

export default function CategoryDashboard({ categoryId }) {
  const rawCat = getCategory(categoryId)
  const { pinned, togglePinned } = useWorkspace()
  const { t } = useI18n()

  if (!rawCat) {
    return <div className="sec"><h1>Unknown category</h1></div>
  }

  const cats = localiseCategories(t)
  const cat = cats.find(c => c.id === categoryId) || rawCat
  const tools = localiseTools(t).filter(tl => tl.category === categoryId)
  const quickActions = QUICK_ACTIONS[categoryId] || []
  const useBento = tools.length <= 5

  const [hero, ...rest] = tools

  return (
    <div className="sec">
      <div className="sec-h" style={{ marginBottom: 28 }}>
        <div className="sec-h-eyebrow">{cat.label} &mdash; {t('dash.toolCount', { count: tools.length })}</div>
        <h1>{cat.label}</h1>
        <p className="sec-h-sub">{cat.description}</p>
      </div>

      {useBento ? (
        <div className="cat-bento">
          {hero && (
            <NavLink to={hero.path} className="cat-bento-hero">
              <div className="cat-bento-hero-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{cat.icon}</svg>
              </div>
              <div className="cat-bento-hero-eyebrow">Featured tool</div>
              <h2 className="cat-bento-hero-title">{hero.label}</h2>
              <p className="cat-bento-hero-desc">{hero.description}</p>
              <span className="cat-bento-hero-cta">
                {t('common.openTool')} <ArrowIcon />
              </span>
              <button
                type="button"
                className={`cat-bento-pin${pinned.includes(hero.id) ? ' pinned' : ''}`}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); togglePinned(hero.id) }}
                aria-label={pinned.includes(hero.id) ? t('common.unpin', { name: hero.label }) : t('common.pin', { name: hero.label })}
              >
                <PinIcon filled={pinned.includes(hero.id)} />
              </button>
            </NavLink>
          )}

          {rest.map(tool => {
            const isPinned = pinned.includes(tool.id)
            return (
              <NavLink key={tool.id} to={tool.path} className="cat-bento-card">
                <div className="cat-bento-card-head">
                  <div className="cat-bento-card-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{cat.icon}</svg>
                  </div>
                  <button
                    type="button"
                    className={`cat-bento-pin sm${isPinned ? ' pinned' : ''}`}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); togglePinned(tool.id) }}
                    aria-label={isPinned ? t('common.unpin', { name: tool.label }) : t('common.pin', { name: tool.label })}
                  >
                    <PinIcon filled={isPinned} />
                  </button>
                </div>
                <h3 className="cat-bento-card-title">{tool.label}</h3>
                <p className="cat-bento-card-desc">{tool.description}</p>
                <span className="cat-bento-card-cta">{t('common.openTool')} &rarr;</span>
              </NavLink>
            )
          })}

          {quickActions.length > 0 && (
            <div className="cat-bento-quick">
              <div className="cat-bento-quick-head">
                <span className="cat-bento-quick-eyebrow">Quick actions</span>
                <span className="cat-bento-quick-meta">{quickActions.length} shortcuts</span>
              </div>
              <div className="cat-bento-quick-grid">
                {quickActions.map((qa, i) => (
                  <NavLink key={i} to={qa.to} className="cat-bento-quick-item">
                    <div className="cat-bento-quick-num">{String(i + 1).padStart(2, '0')}</div>
                    <div className="cat-bento-quick-text">
                      <div className="cat-bento-quick-label">{qa.label}</div>
                      <div className="cat-bento-quick-desc">{qa.desc}</div>
                    </div>
                    <ArrowIcon />
                  </NavLink>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))', gap: 14, marginBottom: 40 }}>
          {tools.map(tool => {
            const isPinned = pinned.includes(tool.id)
            return (
              <NavLink key={tool.id} to={tool.path} className="card-i" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', minHeight: 180, position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-s)', background: 'var(--accent-bg)', border: '1px solid rgba(167,139,250,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{cat.icon}</svg>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button type="button" className={`tool-mini-pin${isPinned ? ' pinned' : ''}`} onClick={(e) => { e.preventDefault(); e.stopPropagation(); togglePinned(tool.id) }} aria-label={isPinned ? t('common.unpin', { name: tool.label }) : t('common.pin', { name: tool.label })} style={{ padding: 6 }}>
                      <PinIcon filled={isPinned} />
                    </button>
                  </div>
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, letterSpacing: '-.01em' }}>{tool.label}</h3>
                <p style={{ fontSize: 13, color: 'var(--t1)', lineHeight: 1.6, flex: 1 }}>{tool.description}</p>
                <div style={{ marginTop: 16, fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--accent)', fontFamily: 'var(--mono)' }}>{t('common.openTool')} &rarr;</div>
              </NavLink>
            )
          })}
        </div>
      )}

      <div className="dash-footer" style={{ marginTop: 40 }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t2)' }}>{t('common.jumpToCategory')}</span>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {cats.filter(c => c.id !== categoryId).map(c => (
            <NavLink key={c.id} to={c.path} className="btn btn-s" style={{ textTransform: 'uppercase', letterSpacing: '.06em', fontSize: 10, fontWeight: 700 }}>{c.label}</NavLink>
          ))}
        </div>
      </div>
    </div>
  )
}
