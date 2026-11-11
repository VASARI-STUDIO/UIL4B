import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { LIBRARY_PALETTE_ROWS } from '../../data/paletteLibrary'
import { toolRoute } from '../../data/toolTree'
import useRecentExports from '../../hooks/useRecentExports'
import { useProLibrary } from '../../hooks/useProLibrary'
import { isStub } from '../../utils/libraryRules'
import { buildTokensCss } from '../../utils/designTokens'
import { formatBytes, formatWhen } from '../../utils/recentExports'
import { CONVERTER_SOURCE, CONVERTER_SRCSET } from '../spectrum/spectrumKit'
import { liveToolCount, newestPalettes, numberWord } from '../userhome/workspace'
import { GoArrow } from './KitSheet'
import openCreateMenu from './openCreateMenu'

// "Tools and library": four columns that sit on the page ground, each a plate, a link and one line.
//
//   New in Discover   the four newest palettes (a palette the account has not opened is drawn blurred, with a
//                     "Pro palette" label); signed out, only palettes anyone can open
//   Recent exports    a code plate for the latest export, then up to three more files; with none, a note
//   Icons and emoji   the icon library
//   Image tools       the file converter
//
// then one line of the other Create tools and the button that opens the Create menu.

const ICONS = [
  'M2 17.5a3.5 3.5 0 1 0 7 0 3.5 3.5 0 1 0-7 0M15 17.5a3.5 3.5 0 1 0 7 0 3.5 3.5 0 1 0-7 0M16 5a1 1 0 1 0-2 0 1 1 0 1 0 2 0M12 17.5V14l-3-3 4-3 2 3h2',
  'M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0M15 10a3 3 0 1 0-6 0 3 3 0 1 0 6 0',
  'M22 12a10 10 0 1 0-20 0 10 10 0 1 0 20 0M12 6v6l4 2',
  'M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73zM12 22V12M3.29 7 12 12 20.71 7M7.5 4.27l9 5.15',
  'M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384',
]
const SMILE = 'M8.5 14.5a4.2 4.2 0 0 0 7 0M9 9.5h.01M15 9.5h.01'

const ALSO = [['gradient', 'Gradient'], ['semantic', 'Semantic Colour'], ['contrast', 'Contrast Checker'], ['font-gallery', 'Font Gallery']]
const LOCK_PATH = <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>

const lowerWord = (s) => (/^(Just now|Yesterday)$/.test(s) ? s.toLowerCase() : s)

/** A locked palette's picture: the server's soft wash under a "Pro palette" label; the label alone if the picture fails. */
function Locked({ id }) {
  const [failed, setFailed] = useState(false)
  return (
    <>
      {!failed && <img className="db-lockimg" src={`/api/ai?palettePreview=${encodeURIComponent(id)}`} alt="" width="160" height="160" loading="lazy" decoding="async" onError={() => setFailed(true)} />}
      <span className="db-lock" aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{LOCK_PATH}</svg>
        Pro palette
      </span>
    </>
  )
}

function DiscoverColumn({ signedOut }) {
  const pro = useProLibrary('palettes')
  const picks = useMemo(() => {
    const rows = pro.items ?? LIBRARY_PALETTE_ROWS
    if (!signedOut) return newestPalettes(rows, 4)
    // Signed out: four open palettes. The dated rows are all Pro, so after any dated open ones the library's
    // own order fills in, latest appended first.
    const open = rows.filter((r) => !isStub(r))
    const dated = newestPalettes(open, 4)
    const rest = open.filter((r) => !dated.includes(r)).reverse()
    return [...dated, ...rest].slice(0, 4)
  }, [pro.items, signedOut])
  return (
    <div className="db-col">
      <ul className="db-dis">
        {picks.map((p) => {
          const locked = isStub(p)
          return (
            <li key={p.id}>
              <Link className="db-dw" to="/discover/palettes" aria-label={locked ? `${p.name}, Pro palette, opens with Pro` : `${p.name}, palette`}>
                <span className="db-dp">
                  {locked
                    ? <Locked id={p.id} />
                    : <span className="db-dstops" aria-hidden="true">{p.colors.map((c, i) => <span key={`${c}-${i}`} style={{ background: c }} />)}</span>}
                </span>
                <span className="db-dnm" aria-hidden="true">{p.name}</span>
              </Link>
            </li>
          )
        })}
      </ul>
      <Link className="t" to="/discover/palettes">New in Discover</Link>
      <span className="d">From the Palette Library</span>
    </div>
  )
}

/** Where an export's row goes: its project's page when the page knew one, else the tool that made it. */
function exportHref(entry, projects) {
  if (entry.projectId && projects.some((p) => p.id === entry.projectId)) return `/projects/${encodeURIComponent(entry.projectId)}`
  try { return toolRoute(entry.tool) } catch { return null }
}

/** The first six lines of the :root block a CSS export of this project holds, in the export's own format. */
function tokenLines(project) {
  try {
    const lines = buildTokensCss(project.design, { projectName: project.name, watermark: false }).split('\n')
    const at = lines.indexOf(':root {')
    return at < 0 ? [] : lines.slice(at, at + 6)
  } catch {
    return []
  }
}

function ExportsColumn({ projects }) {
  const list = useRecentExports()
  const [now] = useState(() => Date.now())
  const latest = list[0]
  if (!latest) {
    return (
      <div className="db-col o">
        <div className="db-plate raised db-code msg">
          <span>Nothing exported yet.</span>
          <Link className="db-tl" to="/learn/help">How exporting works</Link>
        </div>
        <span className="t plain">Recent exports</span>
        <span className="d">Your exports will be listed here.</span>
      </div>
    )
  }
  const project = latest.format === 'CSS' && latest.projectId ? projects.find((p) => p.id === latest.projectId) : null
  const code = project ? tokenLines(project) : []
  const size = formatBytes(latest.bytes)
  const lines = code.length ? code : [latest.filename, [latest.format, size].filter(Boolean).join(' · '), `Exported ${lowerWord(formatWhen(latest.at, now))}`]
  const href = exportHref(latest, projects)
  return (
    <div className="db-col o">
      <div className="db-plate raised db-code" aria-hidden="true">
        {lines.map((l, i) => <span key={i} className="ln">{l}</span>)}
      </div>
      {href ? <Link className="t db-sl-a" to={href}>Recent exports</Link> : <span className="t plain">Recent exports</span>}
      <span className="d"><span className="db-mono">{latest.filename}</span>, {lowerWord(formatWhen(latest.at, now))}</span>
      {list.length > 1 && (
        <ul className="db-files">
          {list.slice(1, 4).map((e) => {
            const to = exportHref(e, projects)
            const name = <span className="fn">{e.filename}</span>
            return (
              <li key={e.id}>
                {to
                  ? <Link className="f" to={to}>{name}<GoArrow size={12} variant="t" /></Link>
                  : <span className="f">{name}</span>}
                <span className="w">{formatWhen(e.at, now)}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function ShelfSkeleton() {
  const sk = (w, h, mt) => <span className="db-sk" style={{ display: 'block', width: w, height: h, borderRadius: mt ? 4 : 12, marginTop: mt }} />
  return (
    <div className="db-shelf" aria-hidden="true">
      <div className="db-col"><div className="db-dis">{[0, 1, 2, 3].map((i) => <span key={i} className="db-sk" style={{ flex: 1, height: 160, borderRadius: 12 }} />)}</div>{sk(140, 14, 17)}{sk(180, 14, 11)}</div>
      <div className="db-col">{sk('100%', 160)}{sk(140, 14, 17)}{sk(180, 14, 11)}</div>
      <div className="db-col">{sk('100%', 160)}{sk(110, 14, 17)}{sk(130, 14, 11)}</div>
      <div className="db-col">{sk('100%', 160)}{sk(110, 14, 17)}{sk(140, 14, 11)}</div>
    </div>
  )
}

export default function Shelf({ projects, signedOut, loading }) {
  const count = liveToolCount()
  return (
    <section className="db-group" aria-labelledby="db-sh">
      <div className="db-gh"><h2 id="db-sh">Tools and library</h2></div>
      {loading ? <ShelfSkeleton /> : (
        <div className="db-shelf">
          <DiscoverColumn signedOut={signedOut} />
          <ExportsColumn projects={projects} />
          <div className="db-col o">
            <div className="db-plate raised db-icons" aria-hidden="true">
              {ICONS.map((d) => <svg key={d.slice(0, 12)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>)}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d={SMILE} /></svg>
            </div>
            <Link className="t db-sl-a" to={toolRoute('icons')}>Icons and emoji</Link>
            <span className="d">Search icons from the open-source packs, then copy SVG or JSX.</span>
          </div>
          <div className="db-col o">
            <span className="db-plate db-img" aria-hidden="true">
              {/* A 168 x 160 slot cropped (object-fit: cover) from a 16:9 photo needs it about 284 px wide; below
                  1200px the column is full width (dashboard.css), so the whole viewport is the bound. */}
              <img src={CONVERTER_SOURCE} srcSet={CONVERTER_SRCSET} sizes="(max-width: 1199px) 100vw, 284px" alt="" width="168" height="160" loading="lazy" decoding="async" />
              <span className="db-crop" />
              <span className="db-ratio">4:5</span>
            </span>
            <Link className="t db-sl-a" to={toolRoute('file-converter')}>Image tools</Link>
            <span className="d">Convert and compress images and video</span>
          </div>
        </div>
      )}
      <p className="db-also">
        Also in Create: {ALSO.map(([id, label], i) => <span key={id}><Link to={toolRoute(id)}>{label}</Link>{i < ALSO.length - 1 ? ', ' : '. '}</span>)}
        <button type="button" className="db-textbtn" aria-haspopup="true" onClick={openCreateMenu}>{`All ${numberWord(count)} tools`}</button>
      </p>
    </section>
  )
}
