import { useState, useEffect, useMemo, useRef } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { localiseTools, localiseCategories } from '../data/tools'
import { useWorkspace, TOOL_DRAG_TYPE } from '../contexts/WorkspaceContext'
import { useAuth } from '../contexts/AuthContext'
import { ADMIN_EMAILS } from '../utils/constants'
import { useI18n } from '../contexts/I18nContext'
import { useProject } from '../contexts/ProjectContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import { setPendingImages } from '../utils/imageHandoff'
import { loadFont } from '../utils/googleFonts'
import { getRecentIcons, iconToSvg } from '../utils/recentIcons'
import { UIKIT_GUIDE_KEY } from '../components/UIKitGuide'

// Curated, characterful Google Fonts rotated through one-per-day for the
// "Font of the Day" panel. The pick is deterministic per calendar day (see
// fontOfDay below) so everyone sees the same font on a given date.
const FONTS_OF_DAY = [
  { family: 'Playfair Display', cat: 'Serif', weight: 700, fallback: 'serif' },
  { family: 'Poppins', cat: 'Geometric sans', weight: 600, fallback: 'sans-serif' },
  { family: 'Space Grotesk', cat: 'Sans-serif', weight: 500, fallback: 'sans-serif' },
  { family: 'Fraunces', cat: 'Serif', weight: 600, fallback: 'serif' },
  { family: 'Montserrat', cat: 'Sans-serif', weight: 700, fallback: 'sans-serif' },
  { family: 'DM Serif Display', cat: 'Display serif', weight: 400, fallback: 'serif' },
  { family: 'Sora', cat: 'Sans-serif', weight: 600, fallback: 'sans-serif' },
  { family: 'Lora', cat: 'Serif', weight: 600, fallback: 'serif' },
  { family: 'Syne', cat: 'Display', weight: 700, fallback: 'sans-serif' },
  { family: 'Manrope', cat: 'Sans-serif', weight: 700, fallback: 'sans-serif' },
  { family: 'Cormorant Garamond', cat: 'Serif', weight: 600, fallback: 'serif' },
  { family: 'Outfit', cat: 'Sans-serif', weight: 600, fallback: 'sans-serif' },
  { family: 'Bricolage Grotesque', cat: 'Display', weight: 600, fallback: 'sans-serif' },
  { family: 'Spectral', cat: 'Serif', weight: 600, fallback: 'serif' },
  { family: 'Epilogue', cat: 'Sans-serif', weight: 600, fallback: 'sans-serif' },
  { family: 'Libre Baskerville', cat: 'Serif', weight: 700, fallback: 'serif' },
  { family: 'Archivo', cat: 'Grotesque', weight: 700, fallback: 'sans-serif' },
  { family: 'Crimson Pro', cat: 'Serif', weight: 600, fallback: 'serif' },
  { family: 'Figtree', cat: 'Sans-serif', weight: 600, fallback: 'sans-serif' },
  { family: 'Unbounded', cat: 'Display', weight: 600, fallback: 'sans-serif' },
  { family: 'Newsreader', cat: 'Serif', weight: 500, fallback: 'serif' },
  { family: 'Hanken Grotesk', cat: 'Sans-serif', weight: 600, fallback: 'sans-serif' },
  { family: 'Instrument Serif', cat: 'Display serif', weight: 400, fallback: 'serif' },
  { family: 'Schibsted Grotesk', cat: 'Sans-serif', weight: 600, fallback: 'sans-serif' },
  { family: 'Gloock', cat: 'Display serif', weight: 400, fallback: 'serif' },
]

const BRAND_PALETTES = [
  { n: 'Google', colors: ['#4285F4', '#DB4437', '#F4B400', '#0F9D58', '#1A1A1A'] },
  { n: 'Spotify', colors: ['#1DB954', '#191414', '#535353', '#B3B3B3', '#FFFFFF'] },
  { n: 'Stripe', colors: ['#635BFF', '#0A2540', '#00D4AA', '#7A73FF', '#FBFCFE'] },
  { n: 'Netflix', colors: ['#E50914', '#221F1F', '#B20710', '#F5F5F1', '#564D4D'] },
  { n: 'Discord', colors: ['#5865F2', '#57F287', '#FEE75C', '#EB459E', '#2C2F33'] },
  { n: 'Airbnb', colors: ['#FF5A5F', '#00A699', '#FC642D', '#767676', '#484848'] },
  { n: 'Slack', colors: ['#4A154B', '#36C5F0', '#2EB67D', '#ECB22E', '#E01E5A'] },
  { n: 'GitHub', colors: ['#24292F', '#0969DA', '#1F883D', '#8250DF', '#CF222E'] },
  { n: 'Linear', colors: ['#5E6AD2', '#1B1B25', '#F2F2F2', '#26B5CE', '#EB5757'] },
  { n: 'Figma', colors: ['#F24E1E', '#FF7262', '#A259FF', '#1ABCFE', '#0ACF83'] },
]

const ICON_GLYPHS = [
  <path key="1" d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  <><circle key="1" cx="12" cy="12" r="10" /><path key="2" d="M8 14s1.5 2 4 2 4-2 4-2" /><line key="3" x1="9" y1="9" x2="9.01" y2="9" /><line key="4" x1="15" y1="9" x2="15.01" y2="9" /></>,
  <><rect key="1" x="3" y="3" width="18" height="18" rx="2" /><circle key="2" cx="8.5" cy="8.5" r="1.5" /><polyline key="3" points="21 15 16 10 5 21" /></>,
  <><path key="1" d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></>,
  <><circle key="1" cx="12" cy="12" r="10" /><polygon key="2" points="10 8 16 12 10 16 10 8" /></>,
  <><path key="1" d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline key="2" points="9 22 9 12 15 12 15 22" /></>,
]

function ArrowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
    </svg>
  )
}

// Bento spans on a 6-column grid. All spans are even (2 or 4) so every row
// tiles cleanly, and feature cards take two rows so the grid (with
// grid-auto-flow:dense) interlocks tall and short cells without leaving gaps.
//   • Colour Studio  → 4×2 hero feature (palette strip needs the room)
//   • Font Gallery   → 2×2 tall tile (font-of-the-day is vertical)
//   • Icon Library   → 4×1 wide strip (recent icons read left-to-right)
//   • everything else → 2×1 standard tile (three per row)
function getGridStyle(tool) {
  if (tool.id === 'icons') return { gridColumn: 'span 4' }
  if (tool.id === 'fontgallery') return { gridColumn: 'span 2', gridRow: 'span 2' }
  if (tool.category === 'color') return { gridColumn: 'span 4', gridRow: 'span 2' }
  return { gridColumn: 'span 2' }
}

const CATEGORY_CLASS = {
  color: 'bento-feature bento-color',
  typography: 'bento-cat bento-typo',
  imagery: 'bento-cat bento-img',
  ai: 'bento-cat bento-img',
  documentation: 'bento-cat',
}

export default function Dashboard() {
  const { user, userProfile } = useAuth()
  const { pinned, recent, addPinned, reorderPinned } = useWorkspace()
  const { t } = useI18n()
  const { design } = useProject()
  const { plan, isPro } = useSubscription()
  const navigate = useNavigate()
  const [now, setNow] = useState(() => new Date())
  const freePerDay = plan?.limits?.['ai-default'] ?? 40

  // Launch the guided UI-kit builder starting at the colour palette.
  const buildUIKit = () => {
    try { sessionStorage.setItem(UIKIT_GUIDE_KEY, '1') } catch { /* ignore */ }
    navigate('/color')
  }

  // Quick-upload from the File Converter tile — stash the files and jump in.
  const quickUpload = (files) => {
    if (!files?.length) return
    setPendingImages(files)
    navigate('/file-converter')
  }

  // Drag-and-drop: pin tools from the sidebar by dropping them here, and
  // reorder existing bento cells by dragging one over another.
  const [dropActive, setDropActive] = useState(false)
  const [dragIdx, setDragIdx] = useState(null)
  const [dragOverIdx, setDragOverIdx] = useState(null)
  const dragDepth = useRef(0)
  const uploadRef = useRef(null)

  // Recently-copied icons power the Icon Library "quick access" strip. Read once
  // on mount (re-read on every dashboard visit since the route remounts).
  const [recentIcons] = useState(getRecentIcons)
  const [copiedIcon, setCopiedIcon] = useState(null)

  // Re-copy a quick-access icon without leaving the dashboard. CDN icons are
  // fetched on demand; embedded icons are rebuilt locally.
  const copyIcon = async (e, icon) => {
    e.preventDefault()
    e.stopPropagation()
    let svg = iconToSvg(icon)
    if (!svg && icon.cdn) {
      try {
        svg = await fetch(`https://api.iconify.design/${icon.pack}/${icon.name}.svg?width=24&height=24`).then(r => r.text())
      } catch { svg = null }
    }
    if (!svg) return
    try {
      await navigator.clipboard.writeText(svg)
      setCopiedIcon(icon.key)
      setTimeout(() => setCopiedIcon(prev => (prev === icon.key ? null : prev)), 1100)
    } catch { /* clipboard blocked */ }
  }

  const hasToolPayload = (e) => Array.from(e.dataTransfer.types || []).includes(TOOL_DRAG_TYPE)

  const onZoneDragEnter = (e) => {
    if (!hasToolPayload(e)) return
    e.preventDefault()
    dragDepth.current += 1
    setDropActive(true)
  }
  const onZoneDragOver = (e) => {
    if (!hasToolPayload(e)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }
  const onZoneDragLeave = (e) => {
    if (!hasToolPayload(e)) return
    dragDepth.current -= 1
    if (dragDepth.current <= 0) { dragDepth.current = 0; setDropActive(false) }
  }
  const onZoneDrop = (e) => {
    if (!hasToolPayload(e)) return
    e.preventDefault()
    const id = e.dataTransfer.getData(TOOL_DRAG_TYPE)
    if (id) addPinned(id)
    dragDepth.current = 0
    setDropActive(false)
    setDragOverIdx(null)
  }

  const onCellDragStart = (e, idx) => {
    setDragIdx(idx)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('application/x-vs-pin-reorder', String(idx))
  }
  const onCellDragOver = (e, idx) => {
    if (dragIdx === null && !hasToolPayload(e)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = dragIdx !== null ? 'move' : 'copy'
    setDragOverIdx(idx)
  }
  const onCellDrop = (e, idx) => {
    e.preventDefault()
    e.stopPropagation()
    if (dragIdx !== null && dragIdx !== idx) {
      reorderPinned(dragIdx, idx)
    } else if (hasToolPayload(e)) {
      const id = e.dataTransfer.getData(TOOL_DRAG_TYPE)
      if (id) addPinned(id, idx)
    }
    setDragIdx(null)
    setDragOverIdx(null)
    dragDepth.current = 0
    setDropActive(false)
  }
  const onCellDragEnd = () => {
    setDragIdx(null)
    setDragOverIdx(null)
  }

  const headingFont = design?.fonts?.heading?.family || 'Inter'
  const bodyFont = design?.fonts?.body?.family || 'Inter'
  const headingWeight = design?.fonts?.heading?.weight || 700
  const bodyWeight = design?.fonts?.body?.weight || 400

  const fallbackPalette = useMemo(() => {
    const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000)
    return BRAND_PALETTES[dayOfYear % BRAND_PALETTES.length]
  }, [now])

  const palette = (design?.palette?.colors?.length > 1)
    ? design.palette.colors
    : fallbackPalette.colors

  const paletteName = (design?.palette?.colors?.length > 1)
    ? null
    : fallbackPalette.n

  // Font of the Day: index a curated list by the absolute day number so it
  // advances one font per calendar day and cycles through the whole list.
  const dayNumber = Math.floor(now.getTime() / 86_400_000)
  const fontOfDay = useMemo(() => FONTS_OF_DAY[dayNumber % FONTS_OF_DAY.length], [dayNumber])

  useEffect(() => {
    loadFont(fontOfDay.family, [400, fontOfDay.weight])
  }, [fontOfDay])

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  // Hide alpha / not-yet-public tools from the dashboard (pins, recents, count)
  // for everyone but admins — keeps it consistent with the nav and route gates.
  const isAdmin = !!user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase())
  const lTools = localiseTools(t).filter(tl => isAdmin || !tl.alpha)
  const lCats = localiseCategories(t)

  const greeting = (() => {
    const h = now.getHours()
    if (h < 5) return t('dash.greeting.lateNight')
    if (h < 12) return t('dash.greeting.morning')
    if (h < 18) return t('dash.greeting.afternoon')
    return t('dash.greeting.evening')
  })()

  const firstName = userProfile?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'Creator'
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
  const dateStr = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })

  const recentTools = recent.map(id => lTools.find(tl => tl.id === id)).filter(Boolean).slice(0, 4)
  const lastTool = recentTools[0]

  const pinnedTools = useMemo(() => {
    return pinned.map(id => {
      const tool = lTools.find(tl => tl.id === id)
      if (!tool) return null
      const cat = lCats.find(c => c.id === tool.category)
      return { ...tool, catIcon: cat?.icon, catLabel: cat?.label }
    }).filter(Boolean)
  }, [pinned, lTools, lCats])

  const renderPreview = (tool) => {
    // File Converter gets a working quick-upload dropzone instead of a static graphic.
    if (tool.id === 'file-converter') {
      const stop = (e) => { e.preventDefault(); e.stopPropagation() }
      return (
        <>
          <div
            className="bento-img-quick"
            onClick={(e) => { stop(e); uploadRef.current?.click() }}
            onDragOver={stop}
            onDrop={(e) => { stop(e); quickUpload(e.dataTransfer.files) }}
          >
            <input
              ref={uploadRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => quickUpload(e.target.files)}
            />
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span>Drop or click to convert</span>
          </div>
          <div className="bento-cat-body">
            <div className="bento-label">{tool.catLabel}</div>
            <h3>{tool.label}</h3>
            <p>{tool.description}</p>
          </div>
        </>
      )
    }
    // Icon Library panel doubles as a "quick access" strip for the icons you've
    // most recently copied — click one to copy it again without leaving home.
    if (tool.id === 'icons') {
      const stop = (e) => { e.preventDefault(); e.stopPropagation() }
      return (
        <>
          <div className="bento-icons-quick" onClick={stop}>
            {recentIcons.length > 0 ? (
              recentIcons.slice(0, 10).map(ic => (
                <button
                  key={ic.key}
                  type="button"
                  className={`bento-icons-cell${copiedIcon === ic.key ? ' is-copied' : ''}`}
                  title={`Copy ${ic.name}`}
                  onClick={(e) => copyIcon(e, ic)}
                >
                  {ic.cdn ? (
                    <img src={`https://api.iconify.design/${ic.pack}/${ic.name}.svg?width=24&height=24`} width="22" height="22" loading="lazy" alt={ic.name} style={{ filter: 'var(--icon-inv)' }} />
                  ) : (
                    <svg viewBox="0 0 24 24" fill={ic.filled ? 'currentColor' : 'none'} stroke={ic.filled ? 'none' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={ic.d} /></svg>
                  )}
                  {copiedIcon === ic.key && <span className="bento-icons-copied">Copied</span>}
                </button>
              ))
            ) : (
              <span className="bento-icons-empty">Icons you copy will show here for quick access.</span>
            )}
          </div>
          <div className="bento-cat-body">
            <div className="bento-label">{recentIcons.length > 0 ? 'Quick access' : tool.catLabel}</div>
            <h3>{tool.label}</h3>
            <p>{recentIcons.length > 0 ? 'Recently copied — click to copy again, or open the full library.' : tool.description}</p>
          </div>
        </>
      )
    }
    // Font Gallery panel shows a daily-rotating "Font of the Day", rendered in
    // the actual typeface, instead of the generic typography preview.
    if (tool.id === 'fontgallery') {
      const fontStack = `'${fontOfDay.family}', ${fontOfDay.fallback}`
      return (
        <>
          <div className="bento-fotd">
            <span className="bento-fotd-tag">Font of the day</span>
            <span className="bento-fotd-sample" style={{ fontFamily: fontStack, fontWeight: fontOfDay.weight }}>Ag</span>
            <span className="bento-fotd-name" style={{ fontFamily: fontStack, fontWeight: fontOfDay.weight }}>{fontOfDay.family}</span>
            <span className="bento-fotd-cat">{fontOfDay.cat}</span>
            <span className="bento-fotd-weights">{fontOfDay.weight} weight</span>
          </div>
          <div className="bento-cat-body">
            <div className="bento-label">{tool.catLabel}</div>
            <h3>{tool.label}</h3>
            <p>Today's pick — browse the full gallery.</p>
          </div>
        </>
      )
    }
    switch (tool.category) {
      case 'color':
        return (
          <>
            <div className="bento-feature-head">
              <span className="bento-label">{paletteName || 'Palette'}</span>
              <span className="bento-feature-num">{palette.length} colours</span>
            </div>
            <div className="bento-color-strip">
              {palette.slice(0, 5).map((c, i) => (
                <div key={i} className="bento-color-swatch" style={{ background: c }}>
                  <span>{c.toUpperCase()}</span>
                </div>
              ))}
            </div>
            <div className="bento-feature-body">
              <h2>{tool.label}</h2>
              <p>{tool.description}</p>
              <span className="bento-feature-link">{t('common.open')} <ArrowIcon /></span>
            </div>
          </>
        )
      case 'typography':
        return (
          <>
            <div className="bento-typo-preview">
              <span className="bento-typo-h" style={{ fontFamily: `'${headingFont}', sans-serif`, fontWeight: headingWeight }}>Aa</span>
              <span className="bento-typo-b" style={{ fontFamily: `'${bodyFont}', sans-serif`, fontWeight: bodyWeight }}>Aa</span>
              <span className="bento-typo-meta">{headingFont}{headingFont !== bodyFont ? ` / ${bodyFont}` : ''}</span>
            </div>
            <div className="bento-cat-body">
              <div className="bento-label">{tool.catLabel}</div>
              <h3>{tool.label}</h3>
              <p>{tool.description}</p>
            </div>
          </>
        )
      case 'imagery':
        return (
          <>
            <div className="bento-img-preview">
              {ICON_GLYPHS.map((g, i) => (
                <span key={i} className="bento-img-cell">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">{g}</svg>
                </span>
              ))}
            </div>
            <div className="bento-cat-body">
              <div className="bento-label">{tool.catLabel}</div>
              <h3>{tool.label}</h3>
              <p>{tool.description}</p>
            </div>
          </>
        )
      case 'documentation':
        return (
          <>
            <div className="bento-docs-grid" style={{ padding: 16 }}>
              <div className="bento-docs-page">
                <div className="bento-docs-line" style={{ width: '45%', height: 6, borderRadius: 3 }} />
                <div className="bento-docs-line" style={{ width: '100%', height: 3, opacity: .5 }} />
                <div className="bento-docs-line" style={{ width: '90%', height: 3, opacity: .5 }} />
                <div className="bento-docs-line" style={{ width: '60%', height: 5, borderRadius: 3, marginTop: 6 }} />
                <div className="bento-docs-line" style={{ width: '100%', height: 3, opacity: .4 }} />
                <div className="bento-docs-line" style={{ width: '80%', height: 3, opacity: .4 }} />
                <div className="bento-docs-line" style={{ width: '95%', height: 3, opacity: .4 }} />
                <div className="bento-docs-swatch-row">
                  {palette.slice(0, 3).map((c, ci) => (
                    <span key={ci} style={{ width: 16, height: 16, borderRadius: 4, background: c }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="bento-cat-body">
              <div className="bento-label">{tool.catLabel}</div>
              <h3>{tool.label}</h3>
              <p>{tool.description}</p>
            </div>
          </>
        )
      default:
        return (
          <>
            <div className="bento-pin-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">{tool.catIcon}</svg>
            </div>
            <div className="bento-cat-body">
              <div className="bento-label">{tool.catLabel}</div>
              <h3>{tool.label}</h3>
              <p>{tool.description}</p>
            </div>
          </>
        )
    }
  }

  return (
    <div className="dash">
      <div
        className={`bento${dropActive ? ' bento-drop-active' : ''}`}
        onDragEnter={onZoneDragEnter}
        onDragOver={onZoneDragOver}
        onDragLeave={onZoneDragLeave}
        onDrop={onZoneDrop}
      >
        {/* HERO — greeting + quick resume */}
        <div className="bento-card bento-hero" style={{ gridColumn: 'span 4' }}>
          <div className="bento-hero-top">
            <div>
              <div className="bento-hero-meta"><span className="bento-pulse" />{dateStr}</div>
              <h1 className="bento-hero-title">{greeting}, <em>{firstName}</em></h1>
            </div>
            <button type="button" className="bento-hero-cta" onClick={buildUIKit}>
              <span>Build a UI Kit</span>
              <ArrowIcon />
            </button>
          </div>
          <div className="bento-hero-foot">
            {lastTool && (
              <NavLink to={lastTool.path} className="bento-hero-resume">
                <span className="bento-pulse" />
                {t('dash.continueWith', { name: lastTool.label })}
                <ArrowIcon />
              </NavLink>
            )}
            <span className="bento-hero-tokens">
              {isPro ? (
                <>Unlimited AI · Pro plan</>
              ) : (
                <><strong>{freePerDay}</strong> AI generations today</>
              )}
            </span>
          </div>
        </div>

        {/* WORKSPACE STATS */}
        <div className="bento-card bento-time" style={{ gridColumn: 'span 2' }}>
          <div className="bento-label">{t('dash.localTime')}</div>
          <div className="bento-time-big">{timeStr}</div>
          <div className="bento-time-sub">{dateStr}</div>
          <div className="bento-time-stats">
            <div><span className="bento-time-num">{pinned.length}</span><span className="bento-time-lbl">{t('dash.pinned')}</span></div>
            <div><span className="bento-time-num">{lTools.length}</span><span className="bento-time-lbl">{t('dash.tools')}</span></div>
            <div><span className="bento-time-num">{lCats.length}</span><span className="bento-time-lbl">{t('dash.areas')}</span></div>
          </div>
        </div>

        {/* PINNED TOOLS — dynamic bento cells */}
        {pinnedTools.map((tool, i) => {
          const gridStyle = getGridStyle(tool)
          const catClass = CATEGORY_CLASS[tool.category] || 'bento-cat'
          const dndClass = `${dragIdx === i ? ' dragging' : ''}${dragOverIdx === i ? ' drag-over' : ''}`
          return (
            <NavLink
              key={tool.id}
              to={tool.path}
              className={`bento-card ${catClass} bento-pin-cell${dndClass}`}
              style={gridStyle}
              draggable
              onDragStart={(e) => onCellDragStart(e, i)}
              onDragOver={(e) => onCellDragOver(e, i)}
              onDrop={(e) => onCellDrop(e, i)}
              onDragEnd={onCellDragEnd}
            >
              {renderPreview(tool)}
            </NavLink>
          )
        })}

        {/* EMPTY STATE */}
        {pinnedTools.length === 0 && (
          <div className="bento-card bento-empty" style={{ gridColumn: 'span 6' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--t3)', marginBottom: 10 }}>
              <path d="M12 17v5" />
              <path d="M9 10.76V6h6v4.76a2 2 0 0 0 1.11 1.79l1.78.9A2 2 0 0 1 19 15.24V17H5v-1.76a2 2 0 0 1 1.11-1.79l1.78-.9A2 2 0 0 0 9 10.76Z" />
            </svg>
            <p style={{ color: 'var(--t2)', fontSize: 13, maxWidth: 320 }}>
              Drag a tool from the sidebar onto this grid — or right-click it — to build your personalised dashboard.
            </p>
          </div>
        )}

        {/* COMMUNITY */}
        <div className="bento-card bento-community" style={{ gridColumn: 'span 6' }}>
          <div className="bento-community-inner">
            <NavLink to="/community" className="bento-community-link">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              Community
            </NavLink>
            <NavLink to="/feedback" className="bento-community-link">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              Send Feedback
            </NavLink>
            <NavLink to="/help" className="bento-community-link">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              Help Centre
            </NavLink>
          </div>
        </div>

        {/* DROP HINT — shown while dragging a tool from the sidebar */}
        {dropActive && (
          <div className="bento-drop-hint" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14" /><path d="M5 12h14" />
            </svg>
            <span>Drop to pin to your dashboard</span>
          </div>
        )}
      </div>
    </div>
  )
}
