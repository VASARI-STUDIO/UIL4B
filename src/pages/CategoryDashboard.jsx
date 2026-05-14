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

  return (
    <div className="sec">
      <div className="hero-section" style={{ marginBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, position: 'relative', zIndex: 1 }}>
          <div style={{ width: 32, height: 2, background: 'var(--accent)', borderRadius: 1, boxShadow: '0 0 12px var(--accent-glow)' }} />
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--accent)', fontFamily: 'var(--mono)' }}>
            {t('dash.toolCount', { count: tools.length })}
          </span>
        </div>
        <h1 className="hero-title" style={{ textTransform: 'uppercase' }}>{cat.label}</h1>
        <p className="hero-sub">{cat.description}</p>
      </div>

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
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t2)', padding: '4px 10px', background: 'rgba(255,255,255,.03)', border: '1px solid var(--border)', borderRadius: 'var(--radius-s)' }}>{cat.label}</span>
                </div>
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, letterSpacing: '-.01em' }}>{tool.label}</h3>
              <p style={{ fontSize: 13, color: 'var(--t1)', lineHeight: 1.6, flex: 1 }}>{tool.description}</p>
              <div style={{ marginTop: 16, fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--accent)', fontFamily: 'var(--mono)' }}>{t('common.openTool')} &rarr;</div>
            </NavLink>
          )
        })}
      </div>

      <div className="dash-footer">
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
