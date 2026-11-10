import { Fragment, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { TOOL_COUNT, numberWord } from '../spectrum/spectrumFacts.js'
import { BOOKMARK_COUNT } from './bookmarkFolders.js'
import {
  DOT, FAV, FOLDERS, GROUPS, SETS, TOOLS, bookmarksOf, groupOf, rowsOf, subTopOf,
} from './bookmarksData.js'
import { FolderIcon, Glyph, PauseIcon } from './BookmarkGlyphs.jsx'
import BookmarkPanes from './BookmarkPanes.jsx'
import BookmarkPhone from './BookmarkPhone.jsx'
import { useBookmarkFonts } from './bookmarksFonts.js'
import { useBookmarkTour } from './useBookmarkTour.js'
import '../../styles/pages/home-bookmarks.css'

// THE BOOKMARKS SECTION (`#bookmarks`).
//
// A browser bookmarks menu with four folders sits beside a UI L4B app window
// holding the tools that replace them. The open folder's bookmarks are joined
// to their tools by lines. A tour opens the folders in turn (useBookmarkTour.js);
// pointing at, focusing or clicking a folder takes over from it. A mouse over
// the section does not pause the tour; the Pause button does.
//
// The stage is a fixed 640px frame holding a 1336px composition, so nothing
// shifts as it changes. Under 1440 the composition is scaled as one piece (CSS
// zoom). Below 1024 the composition would be too small to read, so narrow
// screens get a layout of their own (BookmarkPhone.jsx) that shares this
// section's tour and open folder; CSS shows one of the two.

const chevron = (
  <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="bm-chev"><path d="M9 6l6 6-6 6" /></svg>
)

export default function HomeBookmarks() {
  const [sectionEl, setSectionEl] = useState(null)
  const [stageEl, setStageEl] = useState(null)
  const [phoneStageEl, setPhoneStageEl] = useState(null)
  const [phonePaneEl, setPhonePaneEl] = useState(null)
  // The layout that is not showing has no box, so it never counts as in view.
  const watched = useMemo(() => [stageEl, phoneStageEl, phonePaneEl], [stageEl, phoneStageEl, phonePaneEl])
  const tour = useBookmarkTour(watched, groupOf, rowsOf)
  useBookmarkFonts(sectionEl)

  const { open, hot, mode } = tour
  const run = mode === 'run'
  const cardCls = (j) => `bm-card${hot ? (hot.j === j ? ' hot' : ' dim') : ''}`
  const rootCls = [
    'bm',
    tour.seen ? '' : 'bm-still',
    tour.paused ? 'bm-paused' : '',
    tour.away ? 'bm-away' : '',
    run ? '' : 'bm-once',
    mode === 'off' ? 'bm-rm' : '',
  ].filter(Boolean).join(' ')

  return (
    <section id="bookmarks" ref={setSectionEl} className={rootCls} aria-labelledby="bm-h" {...tour.section}>
      <div className="bm-wide">
        <div className="bm-head">
          <h2 id="bm-h" className="bm-h" tabIndex={-1}>Say goodbye to bookmark folders.</h2>
          <p className="bm-sub">
            {TOOL_COUNT} tools that would otherwise be {BOOKMARK_COUNT} tabs and a folder you stopped opening.
          </p>
        </div>

        {/* Below 1024px: the folders, pairs and toolkit for a thumb */}
        <BookmarkPhone tour={tour} stageRef={setPhoneStageEl} paneRef={setPhonePaneEl} />

        <div className="bm-frame">
          <div className="bm-stage" ref={setStageEl} {...tour.stage}>
            {/* The browser's bookmarks bar, with the design folder open */}
            <div className="bm-bar" aria-hidden="true">
              <span><FolderIcon size={14} stroke={1.8} />Graphic design</span>
            </div>

            {/* The folder's menu. The reader picks the folder. */}
            <div className="bm-menu">
              <div className="bm-menu-h">
                <span>{BOOKMARK_COUNT} bookmarks</span>
                {mode !== 'off' ? (
                  <button type="button" className="bm-pause" aria-label={run ? 'Pause the folder tour' : 'Play the folder tour'} title={run ? 'Pause the folder tour' : 'Play the folder tour'} onClick={tour.toggle}>
                    <PauseIcon stopped={!run} />
                  </button>
                ) : null}
              </div>
              <div className="bm-run" aria-hidden="true" style={{ gridTemplateColumns: FOLDERS.map((f) => `${f.count}fr`).join(' ') }}>
                {FOLDERS.map((f, i) => (
                  <i key={f.name} className={i === open && !run ? 'on' : undefined} style={{ '--c': DOT[i] }}>
                    {i === open && run ? <b className="bm-fill" onAnimationEnd={tour.folder(i).onFillEnd} /> : null}
                  </i>
                ))}
              </div>
              <div role="group" aria-label="Folders inside Graphic design">
                {FOLDERS.map((f, i) => {
                  const on = i === open
                  const h = tour.folder(i)
                  return (
                    <button key={f.name} type="button" className={on ? 'bm-fold on' : 'bm-fold'} aria-pressed={on} onClick={h.onClick} onFocus={h.onFocus} onPointerEnter={h.onPointerEnter} onPointerLeave={h.onPointerLeave}>
                      <FolderIcon style={{ flex: 'none', opacity: 0.8 }} />
                      <span className="bm-fold-n">{f.name}</span>
                      <span className="bm-dot" aria-hidden="true" style={{ background: DOT[i] }} />
                      <span className="bm-fold-c">{f.count}<span className="bm-sr"> bookmarks</span></span>
                      {chevron}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* The open folder's bookmarks */}
            <div className="bm-sub-menu" role="group" aria-label={`Bookmarks in ${FOLDERS[open].name}`} style={{ transform: `translateY(${subTopOf(open)}px)` }}>
              {FOLDERS.map((f, i) => (
                <div key={f.name} className={i === open ? 'bm-list on' : 'bm-list'}>
                  {f.items.map(([title, j], k) => (
                    <div key={title} className={i === open && hot && hot.j === j && hot.ks.includes(k) ? 'bm-mk hot' : 'bm-mk'} data-mark="" data-j={j} data-k={k} style={{ animationDelay: `${k * 20}ms` }}>
                      <span className="bm-fav" aria-hidden="true" style={{ background: FAV[(i * 3 + k) % FAV.length], animationDelay: `${k * 20}ms` }}>{title[0].toUpperCase()}</span>
                      <span className="bm-mk-t">{title}<span className="bm-sr">, replaced by {TOOLS[j].name}</span></span>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* One app: the UI L4B toolkit window. Sidebar: the tools. Main pane: the open folder's tools at work. */}
            <div className="bm-win" role="group" aria-label={`The ${numberWord(TOOL_COUNT)} UI L4B tools`}>
              <div className="bm-win-h">
                <svg aria-hidden="true" width="26" height="16" viewBox="0 0 323.61 200" fill="currentColor"><path d="M0 0H100V123.61A123.61 123.61 0 0 0 126.43 200H76.39A76.39 76.39 0 0 1 0 123.61Z" /><path d="M125 0H177.79A47.21 47.21 0 0 1 225 47.21V125H276.39A47.21 47.21 0 0 1 323.61 172.21V200H201.39A76.39 76.39 0 0 1 125 123.61Z" /></svg>
                UI L4B toolkit<span className="bm-win-n">{TOOL_COUNT} tools</span>
              </div>
              <div className="bm-side">
                {TOOLS.map((tool, j) => (
                  <Fragment key={tool.id}>
                    {j === 0 || TOOLS[j - 1].group !== tool.group ? (
                      <div className={tool.group === open ? 'bm-lab on' : 'bm-lab'} style={{ marginTop: j > 0 ? 8 : 0 }} aria-hidden="true">
                        <span className="bm-dot" style={{ background: DOT[tool.group] }} />{GROUPS[tool.group]}
                      </div>
                    ) : null}
                    <Link className={`bm-tool${tool.group === open ? ' on' : ''}${hot && hot.j === j ? ' hot' : ''}`} to={tool.href} data-tool={j} aria-describedby={`bm-d-${tool.key}`}>
                      <span className="bm-g"><Glyph name={tool.key} /></span>
                      <span>{tool.name}</span>
                    </Link>
                    {/* Outside the link, so it describes the tool without becoming part of its name */}
                    <span id={`bm-d-${tool.key}`} className="bm-sr">Replaces {bookmarksOf(j).join(' and ')}.</span>
                  </Fragment>
                ))}
                <div className="bm-rule" aria-hidden="true" />
                <div className="bm-brand" aria-hidden="true">
                  Kerbside
                  <span><i style={{ background: '#FF5A1F' }} /><i style={{ background: '#1A1A1A' }} /><i style={{ background: '#E6E4DE' }} /><i style={{ background: '#FFFFFF' }} /></span>
                </div>
              </div>
              <BookmarkPanes open={open} cardCls={cardCls} />
            </div>

            {/* Each bookmark joins the tool that replaces it */}
            {SETS.map((lines, i) => (
              <div key={FOLDERS[i].name} className={i === open ? 'bm-set on' : 'bm-set'} aria-hidden="true">
                {lines.map((l) => (
                  <svg key={l.k} className={`bm-ln${i === open && hot ? (hot.ks.includes(l.k) && l.j === hot.j ? ' lit' : ' dim') : ''}`} width="198" height="640" viewBox="0 0 198 640">
                    <path d={l.d} fill="none" stroke={l.stroke} strokeOpacity=".6" strokeWidth="1.25" style={{ '--l': l.len, animationDelay: `${l.delay}ms` }} />
                    <path className="bm-p2" d={l.d} fill="none" stroke={l.stroke} strokeWidth="1.25" style={{ '--l': l.len, animationDelay: `${l.delay}ms` }} />
                    <path className="bm-fl" d={l.d} fill="none" stroke={l.stroke} strokeWidth="1.25" style={{ '--l': l.len, '--nl': l.nlen, '--fd': `${l.flow}ms` }} />
                    <circle cx="0" cy={l.y0} r="2.5" fill={l.stroke} style={{ animationDelay: `${l.delay}ms` }} />
                    <circle cx="198" cy={l.y1} r="3" fill={l.stroke} style={{ animationDelay: `${l.arrive}ms` }} />
                  </svg>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
