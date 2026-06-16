import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { getCategory, localiseTools, localiseCategories } from '../data/tools'
import { useWorkspace } from '../contexts/WorkspaceContext'
import { useI18n } from '../contexts/I18nContext'
import { useProject } from '../contexts/ProjectContext'
import { TRENDING_FONTS, TRENDING_PAIRS, FONT_OF_THE_MONTH, COMMUNITY_STATS } from '../data/communityFonts'
import { loadFont, getFontCSSRule } from '../utils/googleFonts'

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

function TrendIcon({ trend }) {
  if (trend === 'up') return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>
  if (trend === 'down') return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--err)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6" /><polyline points="17 18 23 18 23 12" /></svg>
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /></svg>
}

function formatCount(n) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  return String(n)
}

const QUICK_ACTIONS = {
  color: [
    { label: 'Generate harmonies', desc: 'Complementary, triadic, analogous', to: '/color' },
    { label: 'Tint & shade scale', desc: '10-step tonal range from any base', to: '/color' },
    { label: 'WCAG contrast check', desc: 'AA/AAA pairing verification', to: '/color' },
    { label: 'Gradient builder', desc: 'Multi-stop, CSS-ready output', to: '/color' },
  ],
  typography: [
    { label: 'Browse font gallery', desc: 'Visual typeface showcase', to: '/fontgallery' },
    { label: 'Heading + body pair', desc: 'Curated combinations', to: '/fontpairs' },
    { label: 'Modular scale', desc: 'Minor third, perfect fourth, etc.', to: '/typescale' },
    { label: 'CSS export', desc: 'Drop-in custom properties', to: '/typescale' },
  ],
  imagery: [
    { label: 'Compress for web', desc: 'Reduce JPG/PNG file size', to: '/imgconvert' },
    { label: 'Convert to WebP', desc: 'Modern format, smaller files', to: '/imgconvert' },
    { label: 'Browse outline icons', desc: 'Iconify-powered search', to: '/icons' },
    { label: 'Extract video frames', desc: 'Pull stills from MP4/MOV', to: '/video-frames' },
    { label: 'AI image prompts', desc: 'Generate prompts with DeepSeek', to: '/ai-prompt' },
  ],
  documentation: [
    { label: 'Visual hierarchy', desc: 'Layout fundamentals', to: '/docs-design' },
    { label: 'AI prompts', desc: 'Curated prompt library', to: '/prompts' },
    { label: 'Social post sizes', desc: 'Platform-specific specs', to: '/docs-social' },
    { label: 'External resources', desc: 'Curated tools and reads', to: '/resources' },
  ],
  ai: [
    { label: 'Structured image prompts', desc: 'JSON prompt builder with quality rules', to: '/ai-prompt' },
    { label: 'Scan a reference photo', desc: 'Detect camera, lighting & composition', to: '/ai-prompt' },
    { label: 'Landing page briefs', desc: 'Generate full website prompts', to: '/landing-prompts' },
    { label: 'Auto-build a UI kit', desc: 'Describe a business → colours + fonts', to: '/auto-builder' },
  ],
}

function TypographyDashboard({ cat, tools, quickActions, pinned, togglePinned, t }) {
  const { design } = useProject()
  const [fontsLoaded, setFontsLoaded] = useState(false)

  const headingFont = design?.fonts?.heading?.family || 'Inter'
  const bodyFont = design?.fonts?.body?.family || 'Inter'
  const headingWeight = design?.fonts?.heading?.weight || 700
  const bodyWeight = design?.fonts?.body?.weight || 400

  useEffect(() => {
    const families = [
      FONT_OF_THE_MONTH.family,
      ...TRENDING_FONTS.slice(0, 6).map(f => f.family),
      ...TRENDING_PAIRS.slice(0, 4).flatMap(p => [p.heading, p.body]),
    ]
    const unique = [...new Set(families)]
    unique.forEach(fam => loadFont(fam, [400, 700]))
    const timeout = setTimeout(() => setFontsLoaded(true), 600)
    return () => clearTimeout(timeout)
  }, [])

  const [hero, ...rest] = tools

  return (
    <div className="sec">
      <div className="sec-h" style={{ marginBottom: 28 }}>
        <div className="sec-h-eyebrow">{cat.label} &mdash; {t('dash.toolCount', { count: tools.length })}</div>
        <h1>{cat.label}</h1>
        <p className="sec-h-sub">{cat.description}</p>
      </div>

      {/* Tool cards bento */}
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

      {/* Font of the month */}
      <section className="typo-community-section">
        <div className="typo-section-header">
          <div className="typo-section-badge">Community pick</div>
          <h2>Font of the month</h2>
        </div>
        <div className="typo-fotm">
          <div className="typo-fotm-preview" style={{ fontFamily: fontsLoaded ? getFontCSSRule(FONT_OF_THE_MONTH.family, 'sans-serif') : 'var(--font)' }}>
            <span className="typo-fotm-name">{FONT_OF_THE_MONTH.family}</span>
            <span className="typo-fotm-sample" style={{ fontWeight: 700 }}>Aa</span>
            <span className="typo-fotm-sample-text" style={{ fontWeight: 400 }}>The quick brown fox jumps over the lazy dog</span>
          </div>
          <div className="typo-fotm-info">
            <span className="typo-fotm-cat">{FONT_OF_THE_MONTH.category}</span>
            <p className="typo-fotm-why">{FONT_OF_THE_MONTH.why}</p>
            <div className="typo-fotm-stats">
              <div className="typo-fotm-stat">
                <span className="typo-fotm-stat-num">{formatCount(FONT_OF_THE_MONTH.copies)}</span>
                <span className="typo-fotm-stat-label">copies</span>
              </div>
              <div className="typo-fotm-stat">
                <span className="typo-fotm-stat-num">{formatCount(FONT_OF_THE_MONTH.saves)}</span>
                <span className="typo-fotm-stat-label">saves</span>
              </div>
            </div>
            <div className="typo-fotm-pairs">
              <span className="typo-fotm-pairs-label">Pairs with</span>
              {FONT_OF_THE_MONTH.pairsWith.map(f => (
                <span key={f} className="typo-fotm-pair-chip">{f}</span>
              ))}
            </div>
            <NavLink to="/fontgallery" className="typo-fotm-cta">
              Explore in gallery <ArrowIcon />
            </NavLink>
          </div>
        </div>
      </section>

      {/* Trending fonts */}
      <section className="typo-community-section">
        <div className="typo-section-header">
          <div className="typo-section-badge">Trending</div>
          <h2>Popular fonts this month</h2>
          <p>Based on community copies and saves across all UIL4B users.</p>
        </div>
        <div className="typo-trending-grid">
          {TRENDING_FONTS.slice(0, 8).map((font, i) => (
            <NavLink key={font.family} to="/fontgallery" className="typo-trending-card">
              <div className="typo-trending-rank">#{i + 1}</div>
              <div className="typo-trending-preview" style={{ fontFamily: fontsLoaded ? getFontCSSRule(font.family, font.category === 'monospace' ? 'monospace' : 'sans-serif') : 'var(--font)', fontWeight: 700 }}>
                Aa
              </div>
              <div className="typo-trending-meta">
                <span className="typo-trending-name">{font.family}</span>
                <span className="typo-trending-cat">{font.category}</span>
              </div>
              <div className="typo-trending-stats">
                <span className="typo-trending-count">{formatCount(font.copies)} copies</span>
                <TrendIcon trend={font.trend} />
              </div>
            </NavLink>
          ))}
        </div>
      </section>

      {/* Popular pairings */}
      <section className="typo-community-section">
        <div className="typo-section-header">
          <div className="typo-section-badge">Pairings</div>
          <h2>Top font pairings</h2>
          <p>Most saved heading + body combinations by the community.</p>
        </div>
        <div className="typo-pairs-grid">
          {TRENDING_PAIRS.slice(0, 4).map((pair, i) => (
            <NavLink key={i} to="/fontpairs" className="typo-pair-card">
              <div className="typo-pair-preview">
                <span className="typo-pair-heading" style={{ fontFamily: fontsLoaded ? getFontCSSRule(pair.heading, 'serif') : 'var(--serif)', fontWeight: 700 }}>
                  {pair.heading}
                </span>
                <span className="typo-pair-body" style={{ fontFamily: fontsLoaded ? getFontCSSRule(pair.body, 'sans-serif') : 'var(--font)', fontWeight: 400 }}>
                  {pair.body}
                </span>
              </div>
              <div className="typo-pair-meta">
                <span className="typo-pair-style">{pair.style}</span>
                <span className="typo-pair-saves">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
                  {formatCount(pair.saves)}
                </span>
              </div>
            </NavLink>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <NavLink to="/fontpairs" className="typo-view-all">
            View all pairings <ArrowIcon />
          </NavLink>
        </div>
      </section>

      {/* Your current setup */}
      <section className="typo-community-section">
        <div className="typo-section-header">
          <div className="typo-section-badge">Your setup</div>
          <h2>Current typography</h2>
        </div>
        <div className="typo-current">
          <div className="typo-current-font">
            <span className="typo-current-role">Heading</span>
            <span className="typo-current-preview" style={{ fontFamily: `'${headingFont}', sans-serif`, fontWeight: headingWeight, fontSize: 32 }}>Aa</span>
            <span className="typo-current-name">{headingFont}</span>
            <span className="typo-current-weight">{headingWeight}</span>
          </div>
          <div className="typo-current-divider">+</div>
          <div className="typo-current-font">
            <span className="typo-current-role">Body</span>
            <span className="typo-current-preview" style={{ fontFamily: `'${bodyFont}', sans-serif`, fontWeight: bodyWeight, fontSize: 32 }}>Aa</span>
            <span className="typo-current-name">{bodyFont}</span>
            <span className="typo-current-weight">{bodyWeight}</span>
          </div>
          <NavLink to="/fontpairs" className="typo-current-edit">
            Change pairing <ArrowIcon />
          </NavLink>
        </div>
      </section>

      {/* Community stats bar */}
      <section className="typo-stats-bar">
        <div className="typo-stat-item">
          <span className="typo-stat-num">{formatCount(COMMUNITY_STATS.totalFontCopies)}</span>
          <span className="typo-stat-label">Font copies</span>
        </div>
        <div className="typo-stat-item">
          <span className="typo-stat-num">{formatCount(COMMUNITY_STATS.totalPairSaves)}</span>
          <span className="typo-stat-label">Pair saves</span>
        </div>
        <div className="typo-stat-item">
          <span className="typo-stat-num">{formatCount(COMMUNITY_STATS.totalScaleExports)}</span>
          <span className="typo-stat-label">Scale exports</span>
        </div>
        <div className="typo-stat-item">
          <span className="typo-stat-num">{formatCount(COMMUNITY_STATS.activeDesigners)}</span>
          <span className="typo-stat-label">Designers</span>
        </div>
      </section>

      <div className="typo-cta-footer">
        <p>Typography set? Customise UI chrome &mdash; rounding, density, and motion.</p>
        <NavLink to="/settings" state={{ section: 'appearance' }} className="typo-cta-link">
          Appearance settings <ArrowIcon />
        </NavLink>
      </div>
    </div>
  )
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

  if (categoryId === 'typography') {
    return (
      <>
        <TypographyDashboard
          cat={cat}
          tools={tools}
          quickActions={quickActions}
          pinned={pinned}
          togglePinned={togglePinned}
          t={t}
        />
        <div className="dash-footer" style={{ marginTop: 20, padding: '0 var(--sec-pad, 0)' }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t2)' }}>{t('common.jumpToCategory')}</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {cats.filter(c => c.id !== categoryId).map(c => (
              <NavLink key={c.id} to={c.path} className="btn btn-s" style={{ textTransform: 'uppercase', letterSpacing: '.06em', fontSize: 10, fontWeight: 700 }}>{c.label}</NavLink>
            ))}
          </div>
        </div>
      </>
    )
  }

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
