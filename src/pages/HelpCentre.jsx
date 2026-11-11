// /learn/help — Help & Getting Started.
//
// A router, not a document. The page asks "What are you here to do?" and lists
// the jobs a visitor arrives with; each job opens one answer with a small
// working picture of the thing itself. From 960px the answer sits in a sticky
// stage beside the list, so the list never moves while you read; below that
// each answer opens under its own row, one at a time.
//
// Every figure and route comes from src/data/helpStart.js, which counts what it
// advertises and is held to the registries by
// tests/unit/help-and-principles-claims.test.js. The pictures are drawn by the
// tools' own functions (src/components/HelpJobDemos.jsx).
//
// ── The anchors are load-bearing ───────────────────────────────────────────
//
// src/data/legacyRoutes.js sends /about → /learn/help#about and
// /faq → /learn/help#faq, and the report form's empty states link to
// /learn/help#contact.
//   #faq      the router section
//   #about    the jobs list
//   #contact  the "Report something broken" answer, which the hash also opens
//
// The "What is not built yet?" job is admin-only: unfinished tools are hidden
// from everyone else, and the answer would promise a list they cannot see.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useIsAdmin } from '../hooks/useIsAdmin'
import {
  ColourDemo, CostDemo, FilesDemo, IconsDemo, SaveDemo, SoonDemo, TypeDemo,
} from '../components/HelpJobDemos'
import { HELP_ANSWERS, HELP_JOBS, HELP_JOB_HASHES, LIVE_TOOLS, SOON_TOOLS } from '../data/helpStart'
// The opening line is read by id from the one module every sales surface
// derives its value claim from. positioning-truth.test.js fails if this page
// types the sentence instead.
import { SURFACE_LINE, line } from '../data/positioning'
import SpectrumIcon from '../components/spectrum/SpectrumIcon'
import ReadingNext from '../components/ReadingNext'
import ReadingEnd from '../components/ReadingEnd'
import { LEARN_ARTICLES } from '../data/learnIndex'
import '../styles/pages/content.css'
import '../styles/pages/help.css'
import '../styles/pages/help-router.css'

const DEMOS = {
  colour: ColourDemo,
  type: TypeDemo,
  icons: IconsDemo,
  files: FilesDemo,
  save: SaveDemo,
  cost: CostDemo,
  soon: SoonDemo,
}

const panelId = (job) => (job.id === 'report' ? 'contact' : `help-${job.id}`)
const buttonId = (job) => `help-job-${job.id}`

/** The job a URL hash points at: a known legacy hash, or a job's own id. */
function jobFromHash(hash, jobs) {
  const key = hash.replace(/^#/, '')
  const id = HELP_JOB_HASHES[key] || key.replace(/^help-/, '')
  return jobs.find((j) => j.id === id)?.id || null
}

/** Every string a job answers with, for the search to look through. */
function jobTexts(job) {
  const more = (job.more || []).flatMap((id) => {
    const item = HELP_ANSWERS.find((a) => a.id === id)
    return item ? [item.q, item.a] : []
  })
  return [job.label, job.heading, job.lede, ...more]
}

/** The stretch of text around a match, split so the match can be set bold. */
function around(text, query) {
  const at = text.toLowerCase().indexOf(query)
  const from = Math.max(0, at - 36)
  const to = Math.min(text.length, at + query.length + 56)
  return {
    before: (from > 0 ? '\u2026' : '') + text.slice(from, at),
    hit: text.slice(at, at + query.length),
    after: text.slice(at + query.length, to) + (to < text.length ? '\u2026' : ''),
  }
}

function Panel({ job, open }) {
  const Demo = DEMOS[job.id]
  return (
    <div className="hlr-ans" id={panelId(job)} hidden={!open}>
      {job.start && <p className="hlp-start-opens">Opens with {job.start.opensWith}</p>}
      <h2 className="hlr-h2" id={`${panelId(job)}-h`} tabIndex={-1}>{job.heading}</h2>
      <p className="hlr-lede">{job.lede}</p>
      {Demo && <Demo />}
      {(job.more || []).map((id) => {
        const item = HELP_ANSWERS.find((a) => a.id === id)
        return (
          <div className="hlr-more" key={id}>
            <h3>{item.q}</h3>
            <p>{item.a}</p>
          </div>
        )
      })}
      {job.id === 'report' && (
        <p className="hlr-lede">
          To report community content that is illegal or harmful, use the
          Report button on the item, or email{' '}
          <a className="hlp-answer-link" href="mailto:support@uil4b.com?subject=Content%20report">support@uil4b.com</a>{' '}
          with a link to it and why. You do not need an account.
        </p>
      )}
      <Link className={`hlr-btn${job.id === 'colour' ? ' hlr-btn--ink' : ''}`} to={job.to}>{job.cta}</Link>
    </div>
  )
}

export default function HelpCentre() {
  // Unfinished tools are hidden from everyone but admins, so the page's
  // "still being built" figure and its job about them are admin-only too.
  const { isAdmin } = useIsAdmin()
  const { hash } = useLocation()
  const jobs = useMemo(() => HELP_JOBS.filter((j) => !j.adminOnly || isAdmin), [isAdmin])

  // The first job starts open. null means the visitor closed it on a narrow
  // screen; a wide screen always shows one answer, so it falls back to the first.
  const [openId, setOpenId] = useState(jobs[0].id)
  // A hash opens its job during render rather than in an effect, so the panel
  // is already visible when the browser scrolls to it.
  const [seenHash, setSeenHash] = useState(null)
  if (hash !== seenHash) {
    setSeenHash(hash)
    const target = jobFromHash(hash, jobs)
    if (target) setOpenId(target)
  }

  const active = jobs.some((j) => j.id === openId) ? openId : null
  const [q, setQ] = useState('')
  const focusJob = useRef(null)
  const query = q.trim().toLowerCase()
  const hits = useMemo(() => {
    if (!query) return null
    const jobHits = jobs.flatMap((j) => {
      const found = jobTexts(j).find((t) => t.toLowerCase().includes(query))
      if (!found) return []
      const named = j.label.toLowerCase().includes(query)
      return [{ job: j, snip: named ? null : around(found, query) }]
    })
    const guideHits = LEARN_ARTICLES.filter((a) => `${a.title} ${a.dek}`.toLowerCase().includes(query))
    return { jobHits, guideHits }
  }, [query, jobs])

  useEffect(() => {
    const target = jobFromHash(hash, jobs)
    if (target) document.getElementById(panelId(jobs.find((j) => j.id === target)))?.scrollIntoView()
  }, [hash, jobs])

  const press = (id) => {
    setOpenId(active === id ? null : id)
  }

  // Choosing a search result opens its answer and puts focus on the answer's
  // heading, since the result row it came from is gone.
  const choose = (job) => {
    focusJob.current = job
    setQ('')
    setOpenId(job.id)
  }
  useEffect(() => {
    const job = focusJob.current
    if (!job || query) return
    focusJob.current = null
    const h = document.getElementById(`${panelId(job)}-h`)
    h?.focus({ preventScroll: true })
    h?.scrollIntoView({ block: 'start' })
  }, [query, openId])

  return (
    <div className="sec cpg hlp">
      <header className="hlp-hero">
        <h1 className="hlp-h1">
          Open any tool. It starts with something in it.
        </h1>
        {/* Opens on SURFACE_LINE.helpOpening — read by id, never typed. */}
        <p className="hlp-lede">{line(SURFACE_LINE.helpOpening)}</p>
        {/* Counted, not typed. */}
        <p className="hlp-hint">
          {LIVE_TOOLS.length} tools open now
          {isAdmin && <> &middot; {SOON_TOOLS.length} still being built</>}
        </p>
        {/* The way to a person. It opens the feedback form already set to a
            help request, and sits up here so it does not depend on opening a
            row below. */}
        <p className="hlp-contact">
          <span>Can&rsquo;t find what you need?</span>
          <Link className="hlp-contact-link" to="/feedback?type=help">Contact support</Link>
        </p>
      </header>

      <div className="hlf">
        <label className="hlf-label" htmlFor="hlf-q">Search help and guides</label>
        <input
          id="hlf-q"
          className="hlf-input"
          type="search"
          autoComplete="off"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {hits ? (
        <section className="hlr" id="faq" aria-labelledby="hlr-q">
          <p className="hlr-q" id="hlr-q" role="status">
            {hits.jobHits.length + hits.guideHits.length > 0
              ? `${hits.jobHits.length + hits.guideHits.length} results for \u201c${q.trim()}\u201d`
              : `Nothing matches \u201c${q.trim()}\u201d. Try a tool name, or ask us.`}
          </p>
          {hits.jobHits.length + hits.guideHits.length === 0 && (
            <Link className="hlp-contact-link" to="/feedback?type=help">Contact support</Link>
          )}
          <ul className="hlr-jobs" id="about">
            {hits.jobHits.map(({ job, snip }) => (
              <li key={job.id}>
                <button type="button" className="hlr-job hlr-hit" onClick={() => choose(job)}>
                  <span className="hlr-hit-text">
                    <span>{job.label}</span>
                    {snip
                      ? <span className="hlr-hit-d">Help &middot; {snip.before}<b>{snip.hit}</b>{snip.after}</span>
                      : <span className="hlr-hit-d">Help &middot; {job.heading}</span>}
                  </span>
                  <span className="hlr-tick" aria-hidden="true"><SpectrumIcon name="arrow-right" size={18} /></span>
                </button>
              </li>
            ))}
            {hits.guideHits.map((a) => (
              <li key={a.slug}>
                <Link className="hlr-job hlr-hit" to={`/learn/${a.slug}`}>
                  <span className="hlr-hit-text">
                    <span>{a.title}</span>
                    <span className="hlr-hit-d">Guide &middot; {a.dek}</span>
                  </span>
                  <span className="hlr-tick" aria-hidden="true"><SpectrumIcon name="arrow-right" size={18} /></span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section className="hlr" id="faq" aria-labelledby="hlr-q">
          <p className="hlr-q" id="hlr-q">What are you here to do?</p>
          <ul className="hlr-jobs" id="about" aria-labelledby="hlr-q">
            {jobs.map((job) => (
              <li key={job.id}>
                <button
                  type="button"
                  className="hlr-job"
                  id={buttonId(job)}
                  aria-expanded={active === job.id}
                  aria-controls={panelId(job)}
                  onClick={() => press(job.id)}
                >
                  <span>{job.label}</span>
                  <span className="hlr-tick" aria-hidden="true"><SpectrumIcon name="arrow-right" size={18} /></span>
                </button>
                <Panel job={job} open={active === job.id} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <ReadingNext label="Learn why the tools work the way they do" slugs={['colour-contrast', 'type-scales', 'typeface-metrics']} />
      <ReadingEnd />
    </div>
  )
}
