// /help — Help & Getting Started.
//
// FOUNDER DIRECTION, verbatim (2026-08-20, group D of the surface batch):
// "these are less documents are more designed like a sales page style of large
// visual, main point, simple not overly verbose points underneath." And
// 2026-09-06: "make sure to make user centric design choices."
//
// ── What this replaced, and why none of it survived ────────────────────────
//
// The previous page was a three-tab document — About / FAQ / Contact — with a
// ten-question accordion, a three-card quick-action strip and a second copy of
// the feedback form. It was the opposite of the direction above in every
// dimension the direction names, and it was also carrying live false claims:
//
//   · The tool inventory advertised "Image Converter", "Video to Frames
//     extractor" and "Design Reference guides" as three separate things. There
//     is one tool, /create/file-converter, frames is a MODE inside it, and the
//     reference guides were retired in #335. Prose inventories of a generated
//     list is the defect [handkept-tool-lists-remaining] exists to stop; this
//     was the seventh copy and the only one nobody had found.
//   · "There are no third-party analytics trackers" — src/main.jsx mounts
//     <Analytics /> from @vercel/analytics on every route.
//   · The Contact tab was a SECOND feedback form posting to the same
//     /api/support endpoint as /feedback, with none of the accessibility work
//     the 2026-08-11 audit put into that one: /feedback has real <label>s, a
//     radiogroup with arrow-key movement and aria-invalid on an empty submit;
//     this form had none of them, and its type buttons carried no role and no
//     pressed state at all. Four surfaces already point at /feedback. Keeping a
//     worse duplicate of the product's own reporting path is not a user-centric
//     choice, so this page hands over to it instead.
//
// Every claim that survived is now derived — see src/data/helpStart.js, which
// counts what it advertises and is held to the registries by
// tests/unit/help-and-principles-claims.test.js.
//
// ── The shape, and where it comes from ─────────────────────────────────────
//
// One large visual, one main point, a few plain points. The visual is
// <SystemRunStrip />: the value a new project starts from, the eleven stops the
// product generates out of it, and the files those stops leave as — computed on
// the page by the tools' own functions. A getting-started page's real question
// is "what do I have to bring", and the honest answer here is nothing, so the
// page shows what arrives rather than describing it.
//
// The "Where to start" band is Buffer's "Here's what you can do with Buffer"
// arrangement — heading held on the left, and beside it the short list of moves
// with what each one opens with, rather than a grid of equal cards:
// https://mobbin.com/screens/42990c6e-5536-41b6-b2bb-5332fbe87768
// The same screen is already cited on the homepage (Home.jsx, .hsteps-head),
// which is the point: this is the product's established way of introducing a
// set, not a new visual universe for one page.
//
// The answers below it are the plain-link register every well-built help index
// in the Mobbin corpus uses — Figma's FigJam index, Loom's Getting Started,
// OpenPhone's — a heading, one line, then text you can read at a glance. The
// icon-tile grids (Jasper, Dub) were the alternative and are the construction
// `anti-slop-quality-bar.md` names as "every idea enclosed in an equally
// weighted rounded card".
//   https://mobbin.com/sites/sections/3f77d37e-d2ba-47c2-b4b6-3dc10bb6d9f2  Figma
//   https://mobbin.com/sites/sections/e4b58d1c-dbaf-484a-bdf3-c7427222c143  Loom
//   https://mobbin.com/sites/sections/339529e6-b0f9-4e05-9b8d-d8c80ec813bf  OpenPhone
//
// NOT USED, deliberately: TryItMark, the drawn "give it a try" annotation the
// founder picked out on the homepage. Its own contract is that it points at the
// one thing in the hero a visitor can OPERATE — "not on the sign-up button,
// which is a link out rather than something you can try". This hero's call to
// action is a link out. A drawn phrase with nothing to point at is the
// decoration that component was written to avoid becoming.
//
// ── The three anchors are load-bearing ─────────────────────────────────────
//
// src/data/legacyRoutes.js sends /about → /help#about and /faq → /help#faq, and
// the old page answered those with tab ids. The sections below carry the same
// three ids, so both retired URLs still land on the part of the page they name
// rather than at the top of a page that no longer has that tab.
import { Link } from 'react-router-dom'
import { useReveal } from '../hooks/useReveal'
import { SystemRunStrip } from '../components/SystemProofs'
import { HELP_ANSWERS, HELP_STARTS, LIVE_TOOLS, SOON_TOOLS, STARTS_WITH_CONTENT } from '../data/helpStart'
// The opening line is the founder's, read by id from the one module every
// sales surface derives its value claim from. positioning-truth.test.js fails
// if this page types the sentence instead.
import { SURFACE_LINE, line } from '../data/positioning'
// The stylesheet families this surface needs, split out of the one
// render-blocking global sheet (see src/styles/deferred/). They ride this
// route's own lazy chunk, so they arrive with it and never with the homepage.
import '../styles/deferred/reading.css'

export default function HelpCentre() {
  useReveal()

  return (
    <div className="sec hlp">
      <header className="hlp-hero">
        <h1 className="hlp-h1">
          Open any tool. It starts with <mark className="home-mark">something</mark> in it.
        </h1>
        {/* Opens on SURFACE_LINE.helpOpening — the founder's forget-the-app-name
            sentence, chosen there because a /help visitor arrived looking for a
            specific tool. Read by id, never typed.

            IT IS THE WHOLE LEDE NOW. Two agent sentences used to follow it:
            "No account, no setup, no blank canvas." — a three-part reassurance
            of the kind the founder retired ("No credit card required", "Free
            to use. No card.") — and "Sign in later if you want the same work
            on another device.", which the "Do I need an account?" answer below
            already says, at the place a reader would look for it. Anti-slop
            audit, 2026-09-09. */}
        <p className="hlp-lede">{line(SURFACE_LINE.helpOpening)}</p>
        <div className="hlp-hero-cta">
          <Link className="ui-pill ui-pill-ink ui-pill-lg" to="/create/palette">
            Open the palette builder
            <span className="ui-pill-arrow" aria-hidden="true">&rarr;</span>
          </Link>
        </div>
        {/* Counted, not typed. The sentence this replaced named a tool that had
            been retired and one that had become a mode inside another. */}
        <p className="hlp-hint">
          {LIVE_TOOLS.length} tools open now &middot; {SOON_TOOLS.length} still being built
        </p>
      </header>

      <SystemRunStrip />

      {/* ── Where to start ──
          `id="about"` because /about redirects here. The old tab under that
          fragment was two paragraphs about the product; this is the same
          question answered with destinations. */}
      <section className="hlp-band" id="about" aria-labelledby="hlp-start-h">
        <div className="hlp-band-head" data-reveal>
          <h2 className="hlp-h2" id="hlp-start-h">Where to start.</h2>
          {/* Both figures are counted off the list directly below, so the
              sentence cannot survive a row being added, removed or reclassified.
              The old page's equivalent sentence was a prose inventory and had
              been wrong for two releases. */}
          <p className="hlp-band-lede">
            {STARTS_WITH_CONTENT} of these {HELP_STARTS.length} already have
            something on screen the moment they open. The other one says so.
          </p>
        </div>
        <ol className="hlp-starts" data-reveal>
          {HELP_STARTS.map((step) => (
            <li className="hlp-start" key={step.id}>
              <Link className="hlp-start-link" to={step.to}>
                <span className="hlp-start-label">{step.label}</span>
                <span className="hlp-start-opens">opens with {step.opensWith}</span>
                <span className="hlp-start-go" aria-hidden="true">&rarr;</span>
              </Link>
              <p className="hlp-start-body">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Answers ──
          `id="faq"` because /faq redirects here. Five questions, one sentence
          each, every figure read from the module that owns it. The version this
          replaced had ten questions averaging four sentences, three of which
          were wrong. */}
      <section className="hlp-band" id="faq" aria-labelledby="hlp-faq-h">
        <div className="hlp-band-head" data-reveal>
          <h2 className="hlp-h2" id="hlp-faq-h">Answers.</h2>
        </div>
        <dl className="hlp-answers" data-reveal>
          {HELP_ANSWERS.map((item) => (
            <div className="hlp-answer" key={item.id}>
              <dt className="hlp-answer-q">{item.q}</dt>
              <dd className="hlp-answer-a">
                {item.a}
                {item.to && (
                  <>
                    {' '}
                    <Link className="hlp-answer-link" to={item.to}>{item.linkLabel}</Link>
                  </>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ── Something wrong ──
          `id="contact"` because the old FAQ's empty state linked to
          /help#contact. One destination, not a second form. */}
      <section className="hlp-band hlp-band--close" id="contact" aria-labelledby="hlp-contact-h">
        <div className="hlp-close" data-reveal>
          <h2 className="hlp-h2" id="hlp-contact-h">Something wrong, or missing?</h2>
          <p className="hlp-band-lede">
            The report form is the same one the app uses everywhere else, so it
            reaches the same place whether you send it from here or from the tool
            that broke.
          </p>
          <Link className="ui-pill ui-pill-out ui-pill-md" to="/feedback">
            Report it
            <span className="ui-pill-arrow" aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </section>
    </div>
  )
}
