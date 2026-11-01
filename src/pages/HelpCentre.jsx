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
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useIsAdmin } from '../hooks/useIsAdmin'
import useMediaQuery from '../hooks/useMediaQuery'
import {
  ColourDemo, CostDemo, FilesDemo, IconsDemo, SaveDemo, SoonDemo, TypeDemo,
} from '../components/HelpJobDemos'
import { HELP_ANSWERS, HELP_JOBS, HELP_JOB_HASHES, LIVE_TOOLS, SOON_TOOLS } from '../data/helpStart'
// The opening line is read by id from the one module every sales surface
// derives its value claim from. positioning-truth.test.js fails if this page
// types the sentence instead.
import { SURFACE_LINE, line } from '../data/positioning'
import SpectrumIcon from '../components/spectrum/SpectrumIcon'
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

function Panel({ job, open }) {
  const Demo = DEMOS[job.id]
  return (
    <div className="hlr-ans" id={panelId(job)} hidden={!open}>
      {job.start && <p className="hlp-start-opens">Opens with {job.start.opensWith}</p>}
      <h2 className="hlr-h2">{job.heading}</h2>
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
  const wide = useMediaQuery('(min-width: 960px)')
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

  const known = jobs.some((j) => j.id === openId)
  const active = known ? openId : (wide ? jobs[0].id : null)

  useEffect(() => {
    const target = jobFromHash(hash, jobs)
    if (target) document.getElementById(panelId(jobs.find((j) => j.id === target)))?.scrollIntoView()
  }, [hash, jobs])

  const press = (id) => {
    // On a narrow screen a second press closes the row; the stage always has one.
    setOpenId(!wide && active === id ? null : id)
  }

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
      </header>

      <section className="hlr" id="faq" aria-labelledby="hlr-q">
        <p className="hlr-q" id="hlr-q">What are you here to do?</p>
        <div className="hlr-grid">
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
                {!wide && <Panel job={job} open={active === job.id} />}
              </li>
            ))}
          </ul>
          {wide && (
            <div className="hlr-stage">
              {jobs.map((job) => <Panel key={job.id} job={job} open={active === job.id} />)}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
