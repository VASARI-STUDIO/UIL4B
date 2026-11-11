import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import PillNav from '../components/PillNav'
import NavIcon from '../components/NavIcon'
import { useIsAdmin } from '../hooks/useIsAdmin'
import { useFontCatalog } from '../hooks/useFontCatalog'
import { DISCOVER_GROUPS, DISCOVER_LIBRARIES, LEARN_ROADMAP } from '../data/toolTree'
import LearnGuideIndex from '../components/LearnGuideIndex'
import { LEARN_ARTICLES } from '../data/learnIndex'
import { readCommunitySubmissions } from '../utils/communitySubmissions'
import { LIBRARY_PALETTE_ROWS } from '../data/paletteLibrary'
import { LIBRARY_GRADIENT_ROWS } from '../data/gradientLibrary'
import { gradientCss } from '../data/gradientGallery'
import { LIBRARY_TOTALS } from '../data/libraryTotals'
import { BUTTON_ITEMS, buttonCss } from '../data/buttonLibrary'
import { startersForDay } from '../data/dailyStarters'
import { FALLBACK_FONTS } from '../data/fallbackFonts'
import { loadFont, fontStack } from '../utils/googleFonts'
import { contrastRatio } from '../utils/colors'
// This page is lazy, so its sheet rides its chunk and never the entry
// stylesheet (tests/unit/home-asset-budget.test.js).
import '../styles/pages/surface.css'

const DISCOVER_LIVE = DISCOVER_LIBRARIES.length
const DISCOVER_SOON = DISCOVER_GROUPS.filter((g) => g.soon).length

const SURFACES = {
  discover: {
    title: 'Discover',
    hint: `${DISCOVER_LIVE} libraries open · ${DISCOVER_SOON} still being built`,
    liveHint: `${DISCOVER_LIVE} libraries open`,
    gridTitle: 'Every library, and the community page.',
  },
  learn: {
    title: 'Learn',
    groups: LEARN_ROADMAP,
    hint: `${LEARN_ARTICLES.length} guides. Every figure is cited or measured on the page.`,
    gridTitle: 'Topics still being written.',
    gridLede: "These topics aren't written yet.",
  },
}

// Plate samples: the first free rows of each library, as the library lists them.
const PLATE_PALETTES = LIBRARY_PALETTE_ROWS.slice(0, 3)
const PLATE_GRADIENTS = LIBRARY_GRADIENT_ROWS.slice(0, 3)
const PLATE_ICONS = ['palette', 'type', 'icons', 'imagery', 'ai', 'community-prompts']
const PLATE_BUTTONS = ['solid', 'outline']
  .map((id) => BUTTON_ITEMS.find((b) => b.id === id))
  .filter(Boolean)
const PLATE_BUTTON_CSS = PLATE_BUTTONS
  .map((item) => buttonCss(item, {}, { scope: '.srf-btns' }))
  .join('\n')

const DARK_INK = '#060607'
const LIGHT_INK = '#EFEEEA'
const inkOn = (hex) => (contrastRatio(hex, LIGHT_INK) >= contrastRatio(hex, DARK_INK) ? LIGHT_INK : DARK_INK)

function Go({ small }) {
  return (
    <span className={small ? 'srf-go srf-go--s' : 'srf-go'} aria-hidden="true">
      <svg className="srf-go-a" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 17L17 7M8 7h9v9" />
      </svg>
    </span>
  )
}

function Door({ id, group, count, plate, plateClass = 'srf-plate--raised', names, className = '' }) {
  if (!group) return null
  return (
    <div className={`srf-door surface-card ${className}`.trim()}>
      <div className={`srf-plate ${plateClass}`} aria-hidden="true">{plate}</div>
      {names}
      <Link className="srf-door-t surface-card--link" to={group.route} aria-describedby={`${id}-d`}>
        <span className="surface-card-title">{group.label}</span>
        <Go />
      </Link>
      {count && <span className="srf-meta srf-door-c">{count}</span>}
      <span className="srf-door-d" id={`${id}-d`}>{group.desc}</span>
    </div>
  )
}

function PalettePlate() {
  return (
    <div className="srf-set">
      {PLATE_PALETTES.map((p) => (
        <div className="srf-pal" key={p.id}>
          {p.colors.map((c, i) => (
            <span className="srf-stop" key={`${c}-${i}`} style={{ background: c }}>
              {i === 0 && <span className="srf-hex" style={{ color: inkOn(c) }}>{c}</span>}
            </span>
          ))}
        </div>
      ))}
    </div>
  )
}

function GradientPlate() {
  return (
    <div className="srf-set">
      {PLATE_GRADIENTS.map((g) => (
        <span className="srf-tile" key={g.id} style={{ backgroundImage: gradientCss(g.type, g.angle, g.stops) }} />
      ))}
    </div>
  )
}

const Names = ({ rows }) => (
  <div className="srf-names" aria-hidden="true">
    {rows.map((r) => <span className="srf-nm" key={r.id}>{r.name}</span>)}
  </div>
)

function ButtonPlate() {
  return (
    <div className="srf-btns">
      <style>{PLATE_BUTTON_CSS}</style>
      {PLATE_BUTTONS.map((item) => (
        <span className={item.cls} key={item.id}>{item.label}</span>
      ))}
    </div>
  )
}

function FontPlate() {
  const { fonts } = useFontCatalog()
  const families = (fonts.length ? fonts : FALLBACK_FONTS).slice(0, 3)
  const key = families.map((f) => f.family).join('|')
  useEffect(() => {
    families.forEach((f) => { loadFont(f.family, [500]) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return (
    <div className="srf-fonts">
      {families.map((f) => (
        <span key={f.family} style={{ fontFamily: fontStack(f) }}>{f.family}</span>
      ))}
    </div>
  )
}

function IconPlate() {
  return (
    <div className="srf-icons">
      {PLATE_ICONS.map((id) => <span key={id}><NavIcon id={id} /></span>)}
    </div>
  )
}

function TodayDiscover() {
  const items = useMemo(() => startersForDay(new Date()), [])
  return (
    <section className="srf-today" aria-labelledby="srf-today-h">
      <h2 className="srf-tt" id="srf-today-h">Ready to open today</h2>
      <p className="srf-tl">Two gradients and two palettes, different each day. Each loads in its tool with the colours already in.</p>
      <ul className="srf-td">
        {items.map((t) => (
          <li className="srf-door srf-door--today" key={t.id}>
            <div className="srf-plate" aria-hidden="true" style={{ background: t.art }} />
            <span className="srf-td-n">{t.name}</span>
            <Link className="srf-td-l srf-door-t" to={t.to} aria-label={`Open in ${t.opens}: ${t.name}`}>
              Open in {t.opens}
              <Go small />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default function SurfaceIndex({ surface }) {
  const s = SURFACES[surface] || SURFACES.discover
  const { isAdmin } = useIsAdmin()
  const hint = isAdmin ? s.hint : (s.liveHint || s.hint)
  useEffect(() => {
    if (surface === 'discover') readCommunitySubmissions()
  }, [surface])

  const byId = (id) => DISCOVER_GROUPS.find((g) => g.id === id)
  const community = byId('inspiration')
  const collections = byId('collections')
  const roadmap = (s.groups || []).filter((g) => isAdmin || !g.soon)

  return (
    <div className={`home srf srf--${surface}`}>
      <PillNav />

      <main id="main" className="srf-wrap" tabIndex={-1}>
        <header className="home-hero home-hero--surface srf-head">
          <h1 className="home-hero-h1 srf-h1">{s.title}</h1>
          <p className="home-hero-hint srf-hint">{hint}</p>
        </header>

        {surface === 'learn' && (
          <section className="srf-sec" aria-labelledby="surface-guides-heading">
            <h2 className="srf-h2 srf-h2--q" id="surface-guides-heading">Why colour and type behave the way they do on screen.</h2>
            <div className="srf-after">
              <LearnGuideIndex />
            </div>
          </section>
        )}

        {surface === 'discover' && (
          <>
            <TodayDiscover />
            <section className="srf-sec" aria-labelledby="surface-grid-heading">
              <h2 className="srf-h2 srf-h2--q" id="surface-grid-heading">{s.gridTitle}</h2>
              <div className="srf-after">
                <div className="srf-row1">
                  <Door
                    id="srf-d1"
                    group={byId('palette-library')}
                    count={`${LIBRARY_TOTALS.palettes} palettes`}
                    plate={<PalettePlate />}
                    names={<Names rows={PLATE_PALETTES} />}
                  />
                  <Door
                    id="srf-d2"
                    group={byId('gradient-gallery')}
                    count={`${LIBRARY_TOTALS.gradients} gradients`}
                    plate={<GradientPlate />}
                    names={<Names rows={PLATE_GRADIENTS} />}
                  />
                </div>
                <div className="srf-row2">
                  <Door
                    id="srf-d3"
                    className="srf-door--btn"
                    group={byId('button-library')}
                    count={`${BUTTON_ITEMS.length} designs`}
                    plate={<ButtonPlate />}
                    plateClass="srf-plate--s srf-plate--l2"
                  />
                  <Door
                    id="srf-d4"
                    className="srf-door--font"
                    group={byId('font-gallery')}
                    plate={<FontPlate />}
                    plateClass="srf-plate--s srf-plate--raised"
                  />
                  <Door
                    id="srf-d5"
                    className="srf-door--ico"
                    group={byId('icon-library')}
                    plate={<IconPlate />}
                    plateClass="srf-plate--s srf-plate--raised"
                  />
                </div>
                {community && (
                  <p className="srf-also">
                    Also in Discover: <Link to={community.route}>{community.label}</Link>. {community.desc}
                  </p>
                )}
                {isAdmin && collections && (
                  <p className="srf-also srf-also--2">
                    <span className="srf-also-nl">{collections.label}</span>. {collections.desc}
                    <span className="srf-meta srf-soon">Soon</span>
                  </p>
                )}
              </div>
            </section>
          </>
        )}

        {surface === 'learn' && roadmap.length > 0 && (
          <section className="srf-sec" aria-labelledby="surface-grid-heading">
            <h2 className="srf-h2" id="surface-grid-heading">{s.gridTitle}</h2>
            {s.gridLede && <p className="srf-lede">{s.gridLede}</p>}
            <ul className="srf-after lidx-soon-list">
              {roadmap.map((g) => (
                <li className="lidx-soon" key={g.id}>
                  <span className="lidx-soon-t">{g.label}</span>
                  <span className="srf-meta">Soon</span>
                  <span className="lidx-soon-d">{g.desc}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  )
}
