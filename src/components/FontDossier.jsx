import { useMemo } from 'react'
import {
  CATEGORY_LABEL, CATEGORY_NOTE, facesThinCatalogue, fontFacts, titleCase,
} from '../utils/fontDossier'
import { bodyWeight, fontStack, headingWeight } from '../utils/googleFonts'

// The ABOUT and EXAMPLES panels — the founder's request, three times stated:
// "a tab that shows real world examples of the font this will help users
// understand font use cases" and "lets also include an about tab".
//
// ONE component, used by BOTH font popups (FontBrowseDialog, which FontPicker
// opens for Font Pair and Type Scale, and the Font Gallery's specimen dialog).
// The backlog asked explicitly whether they should share one rather than
// diverge again; they should. A typeface's facts do not change with which
// dialog you opened it from, and the two dialogs have already drifted once.
//
// ── WHERE THE CONTENT COMES FROM, AND WHY IT IS HONEST ──────────────────────
//
// There is a blocked backlog item, [fonts-in-use-surface], for showing real
// brand work using a typeface. It is blocked on IMAGERY RIGHTS CLEARANCE, and
// nothing here touches that: no photographs, no logos, no screenshots, and no
// claim that any named company uses any of these families. Writing "used by
// Stripe" would be a false statement about a real business, and inventing a
// designer or a release year for a typeface is the same failure aimed at a
// person. So both tabs take a route that needs no permission:
//
//   ABOUT is DERIVED. Every fact is carried straight through from Google's own
//   family metadata (see api/fonts.js) — designer, the date the family was
//   added, weights, italics, variable axes, script coverage, licence. Nothing
//   is inferred and nothing is hand-authored per family, so nothing can rot
//   into a wrong claim about someone's work. A field the catalogue does not
//   supply is OMITTED, never guessed: a thin panel is a fine outcome, an
//   invented one is not.
//
//   `dateAdded` gets the label it actually deserves — "Added to Google Fonts".
//   It is not the year the typeface was designed, and for a revival of a metal
//   face the two are decades apart. Printing it as "Released" would be the
//   quietest lie on the page.
//
//   EXAMPLES are DEMONSTRATED. "Real-world examples" is read as the family set
//   in real-world SITUATIONS THIS PAGE DRAWS ITSELF — an article opening, a
//   pricing table, interface furniture, a display line. That answers what a
//   user actually wants to know ("what is this face FOR?") with zero rights
//   exposure, and it is something this app is unusually well placed to do
//   because it already owns the type and token machinery.
//
// Mobbin drove the shape of both. Aave's brand-typography section states a ROLE
// under each face ("For headlines." / "Used in body text." / "Used for code.")
// rather than a paragraph of adjectives, which is why every example here is
// captioned with the question it answers instead of being left to speak for
// itself. Spline's and HoneyBook's pricing sections are why a pricing table is
// one of the four: big figures, a currency mark, small repeated feature text
// and a button in one block is the hardest single test of a text face in this
// product, and nothing else in the app exercises numerals at display size.

// Set a batch of custom properties on a node. Same helper the typography pages
// use; kept local so this component has no dependency on either of them.
const varsRef = (vars) => (el) => {
  if (!el) return
  for (const key of Object.keys(vars)) el.style.setProperty(key, vars[key])
}

export function FontAboutPanel({ font, id, labelledBy }) {
  const rows = useMemo(() => fontFacts(font), [font])
  if (!font) return null

  const note = CATEGORY_NOTE[font.category]
  const category = CATEGORY_LABEL[font.category] || titleCase(font.category)
  // Told, not hidden: a catalogue that came back thin (the bundled fallback, or
  // an older cached copy) genuinely has no designer or date, and the panel says
  // so rather than leaving a reader wondering which fields are missing and why.
  const thin = facesThinCatalogue(font)

  return (
    <div className="fdx-panel" id={id} role="tabpanel" aria-labelledby={labelledBy} tabIndex={0}>
      <dl className="fdx-facts">
        {rows.map(row => (
          <div className="fdx-fact" key={row.k}>
            <dt>{row.k}</dt>
            <dd>{row.v}</dd>
          </div>
        ))}
      </dl>

      {note && (
        <section className="fdx-note">
          <h4>What a {category.toLowerCase()} face is for</h4>
          <p>{note}</p>
        </section>
      )}

      <p className="fdx-source">
        {thin
          ? 'The catalogue currently loaded is the short bundled list, which carries no designer or date. Reload the full catalogue to see them.'
          : 'Every fact above comes from this family’s entry in the Google Fonts catalogue.'}
      </p>
    </div>
  )
}

// The four situations. Each one is here because it asks the family a question
// nothing else on this page asks, and each is captioned with that question —
// an example a reader cannot interpret teaches nothing.
const EXAMPLES = [
  {
    id: 'editorial',
    label: 'Article opening',
    asks: 'Does it stay comfortable over hundreds of words?',
  },
  {
    id: 'ui',
    label: 'Interface',
    asks: 'Do labels and controls stay legible at 13–14px?',
  },
  {
    id: 'pricing',
    label: 'Pricing table',
    asks: 'How do the numerals behave when they carry the message?',
  },
  {
    id: 'display',
    label: 'Display line',
    asks: 'What does the face do when it is the biggest thing on the page?',
  },
]

export function FontExamplesPanel({ font, id, labelledBy }) {
  if (!font) return null

  const ff = fontStack(font)
  const hw = String(headingWeight(font))
  const bw = String(bodyWeight(font))
  const vars = { '--fdx-ff': ff, '--fdx-hw': hw, '--fdx-bw': bw }

  return (
    <div className="fdx-panel" id={id} role="tabpanel" aria-labelledby={labelledBy} tabIndex={0}>
      {/* Said once, plainly, at the top. These are drawn by this page to show
          the family working; they are not photographs of anybody's product, and
          the tab must not be read as claiming a brand uses this face. */}
      <p className="fdx-source fdx-source--lead">
        {font.family} set in four situations this page draws itself — not screenshots of real
        brand work.
      </p>

      <div className="fdx-examples" ref={varsRef(vars)}>
        {EXAMPLES.map(ex => (
          <section className="fdx-ex" key={ex.id}>
            <header className="fdx-ex-head">
              <h4>{ex.label}</h4>
              <p>{ex.asks}</p>
            </header>

            {ex.id === 'editorial' && (
              <article className="fdx-ex-body fdx-ex-editorial">
                <span className="fdx-ex-kicker">Field notes</span>
                <h5>The measure is the thing nobody adjusts</h5>
                <p className="fdx-ex-lede">
                  A column set too wide loses the reader at the line break, and no
                  amount of leading gets them back.
                </p>
                <p>
                  Somewhere between 45 and 75 characters a line stops being a
                  ribbon and starts being a paragraph. The exact number moves with
                  the face — a narrow grotesque fits more before it tires the eye
                  than a wide humanist does — which is why this is a decision you
                  make after choosing the family, not before.
                </p>
              </article>
            )}

            {ex.id === 'ui' && (
              <div className="fdx-ex-body fdx-ex-ui">
                <div className="fdx-ex-bar">
                  <span className="fdx-ex-tab fdx-ex-tab--on">Overview</span>
                  <span className="fdx-ex-tab">Activity</span>
                  <span className="fdx-ex-tab">Settings</span>
                </div>
                <table className="fdx-ex-table">
                  <thead>
                    <tr><th>Project</th><th>Updated</th><th>Size</th></tr>
                  </thead>
                  <tbody>
                    <tr><td>Harbour rebrand</td><td>2 hours ago</td><td>4.2 MB</td></tr>
                    <tr><td>Signal design system</td><td>Yesterday</td><td>18.9 MB</td></tr>
                    <tr><td>Quarterly report</td><td>14 Aug</td><td>1.1 MB</td></tr>
                  </tbody>
                </table>
              </div>
            )}

            {ex.id === 'pricing' && (
              <div className="fdx-ex-body fdx-ex-pricing">
                {[
                  ['Solo', '19', ['1 editor', '5 projects', 'Export to CSS']],
                  ['Studio', '49', ['10 editors', 'Unlimited projects', 'Shared libraries']],
                ].map(([plan, price, feats]) => (
                  <div className="fdx-ex-plan" key={plan}>
                    <span className="fdx-ex-plan-name">{plan}</span>
                    <p className="fdx-ex-price">
                      <span className="fdx-ex-currency">$</span>{price}
                      <span className="fdx-ex-period">/mo</span>
                    </p>
                    <ul>{feats.map(f => <li key={f}>{f}</li>)}</ul>
                    <span className="fdx-ex-btn">Choose {plan}</span>
                  </div>
                ))}
              </div>
            )}

            {ex.id === 'display' && (
              <div className="fdx-ex-body fdx-ex-display">
                <p className="fdx-ex-huge">Set it big before you commit</p>
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  )
}
