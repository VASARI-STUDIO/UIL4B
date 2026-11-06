import { Link } from 'react-router-dom'
import { TOOL_COUNT, numberWord } from '../spectrum/spectrumFacts.js'
import { BOOKMARK_COUNT } from './bookmarkFolders.js'
import { DOT, FAV, FOLDERS, GROUPS, TOOLS, bookmarksOf } from './bookmarksData.js'
import { FolderIcon, Glyph, PauseIcon } from './BookmarkGlyphs.jsx'
import BookmarkPhonePane from './BookmarkPhonePane.jsx'

// THE BOOKMARKS SECTION FOR A NARROW SCREEN (below 1024px; the same state and
// tour as the desktop stage, which is hidden at these widths).
//
// A 2x2 grid of folders; below it the open folder's bookmarks in pairs, each
// pair followed by the tool that replaces it (tap a pair to light its tool and
// its card); then the toolkit window: the open folder's tools at work, and all
// of the tools as links, two up, with the open folder's group sitting on a
// ground. Nothing moves until a tap or the tour's first change.
//
// The tour watches the menu block (`data-r7ap-stage`) and the window's pane
// (`data-r7ap-pane`); the section's autoplay rule counts either.

const PAIR_H = 64 // a pair's height
const FOOT_H = 36 // the count line pinned under the pairs
const STAGGER = 40 // between pairs
const DRAW = 300 // an arrow drawing in

// Each folder's bookmarks in pairs that share a tool. Folders hold an even number.
const PAIRS = FOLDERS.map((folder, i) => {
  const pairs = []
  for (let k = 0; k < folder.items.length; k += 2) {
    const j = folder.items[k][1]
    const delay = (k / 2) * STAGGER
    pairs.push({
      j,
      delay,
      arrow: delay + 120,
      name: delay + DRAW,
      marks: [folder.items[k], folder.items[k + 1]].map(([title], n) => ({ title, fav: FAV[(i * 3 + k + n) % FAV.length] })),
    })
  }
  return pairs
})
const MOST = Math.max(...PAIRS.map((p) => p.length))
const LIST_H = MOST * PAIR_H + FOOT_H + 2

const toolsIn = (i) => new Set(FOLDERS[i].items.map((b) => b[1])).size

export default function BookmarkPhone({ tour, stageRef, paneRef }) {
  const { open, hot, mode } = tour
  const run = mode === 'run'
  return (
    <div className="bmp" {...tour.surface}>
      <div className="bmp-stage" data-r7ap-stage ref={stageRef}>
        <div className="bmp-bar">
          <FolderIcon size={15} stroke={1.8} style={{ flex: 'none', opacity: 0.8 }} />
          <span className="bmp-bar-n">Graphic design</span>
          <span className="bmp-bar-c">{BOOKMARK_COUNT} bookmarks</span>
          {mode !== 'off' ? (
            <button type="button" className="bmp-pb" aria-label={run ? 'Pause the folder tour' : 'Play the folder tour'} onClick={tour.toggle}>
              <PauseIcon stopped={!run} />
            </button>
          ) : null}
        </div>
        <div className="bm-run bmp-run" aria-hidden="true" style={{ gridTemplateColumns: FOLDERS.map((f) => `${f.count}fr`).join(' ') }}>
          {FOLDERS.map((f, i) => (
            <i key={f.name} className={i === open && !run ? 'on' : undefined} style={{ '--c': DOT[i] }}>
              {i === open && run ? <b className="bm-fill" onAnimationEnd={tour.folder(i).onFillEnd} /> : null}
            </i>
          ))}
        </div>
        <div className="bmp-folds" role="group" aria-label="Folders inside Graphic design">
          {FOLDERS.map((f, i) => (
            <button key={f.name} type="button" className={i === open ? 'bmp-fold on' : 'bmp-fold'} aria-pressed={i === open} onClick={tour.folder(i).onClick}>
              <span className="bmp-fold-n">{f.name}</span>
              <span className="bmp-cnt"><span className="bmp-dot" aria-hidden="true" style={{ background: DOT[i] }} /><span>{f.count}</span><span className="bm-sr"> bookmarks</span></span>
            </button>
          ))}
        </div>

        {/* Sized to the longest folder, so nothing below moves when the folder changes */}
        <div className="bmp-sub" role="group" aria-label={`Bookmarks in ${FOLDERS[open].name}`} style={{ height: LIST_H }}>
          {PAIRS.map((pairs, i) => (
            <div key={FOLDERS[i].name} className={i === open ? 'bmp-list on' : 'bmp-list'}>
              {pairs.map((p) => (
                <button key={p.marks[0].title} type="button" className={hot && hot.j === p.j ? 'bmp-pair hot' : 'bmp-pair'} aria-pressed={!!hot && hot.j === p.j} onClick={() => tour.togglePair(p.j)} style={{ animationDelay: `${p.delay}ms` }}>
                  {p.marks.map((m) => (
                    <span key={m.title} className="bmp-mk">
                      <span className="bmp-fav" aria-hidden="true" style={{ background: m.fav }}>{m.title[0].toUpperCase()}</span>
                      <span className="bmp-mk-t">{m.title}</span>
                    </span>
                  ))}
                  <span className="bmp-tl">
                    <svg className="bmp-ar" aria-hidden="true" width="18" height="12" viewBox="0 0 24 16" fill="none" stroke={DOT[TOOLS[p.j].group]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path pathLength="1" d="M2 8h19M15 2l6 6-6 6" style={{ animationDelay: `${p.arrow}ms` }} />
                    </svg>
                    <span className="bm-sr">Replaced by </span>
                    <span className="bmp-gl bmp-pg" aria-hidden="true" style={{ animationDelay: `${p.name}ms` }}><Glyph name={TOOLS[p.j].key} /></span>
                    <span className="bmp-pn" style={{ animationDelay: `${p.name}ms` }}>{TOOLS[p.j].name}</span>
                  </span>
                </button>
              ))}
            </div>
          ))}
          <div className="bmp-foot">{FOLDERS[open].count} bookmarks, {toolsIn(open)} tools.</div>
        </div>
      </div>

      {/* The toolkit: the open folder's tools at work, then all of them as links */}
      <div className="bmp-win" role="group" aria-label={`The ${numberWord(TOOL_COUNT)} UI L4B tools`}>
        <div className="bmp-win-h">
          <svg aria-hidden="true" width="26" height="16" viewBox="0 0 323.61 200" fill="currentColor"><path d="M0 0H100V123.61A123.61 123.61 0 0 0 126.43 200H76.39A76.39 76.39 0 0 1 0 123.61Z" /><path d="M125 0H177.79A47.21 47.21 0 0 1 225 47.21V125H276.39A47.21 47.21 0 0 1 323.61 172.21V200H201.39A76.39 76.39 0 0 1 125 123.61Z" /></svg>
          UI L4B toolkit<span className="bmp-win-n">{TOOL_COUNT} tools</span>
        </div>
        <BookmarkPhonePane open={open} hot={hot} paneRef={paneRef} />
        {GROUPS.map((group, g) => (
          <div key={group} className={g === open ? 'bmp-grp on' : 'bmp-grp'} style={{ '--ring': DOT[g] }}>
            <h3 className="bmp-gh"><span className="bmp-dot" aria-hidden="true" style={{ background: DOT[g] }} />{group}</h3>
            <ul className="bmp-tools" role="list">
              {TOOLS.map((tool, j) => (tool.group === g ? (
                <li key={tool.id}>
                  <Link className={hot && hot.j === j ? 'bmp-tool hot' : 'bmp-tool'} to={tool.href} aria-describedby={`bmp-d-${tool.key}`}>
                    <span className="bmp-gl" aria-hidden="true"><Glyph name={tool.key} size={20} /></span>
                    <span>{tool.name}</span>
                  </Link>
                  {/* Outside the link, so it describes the tool without becoming part of its name */}
                  <span id={`bmp-d-${tool.key}`} className="bm-sr">Replaces {bookmarksOf(j).join(' and ')}.</span>
                </li>
              ) : null))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
