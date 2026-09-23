// Article: Dark and light themes. Metadata and sources in src/data/learnIndex.js.
//
// Every hex in this file is one of this product's own tokens, and every one of
// them is read back out of src/styles/global.css by
// tests/unit/learn-figures.test.js — so a token change fails the build rather
// than leaving a confidently wrong number on a page whose claim is that its
// figures are checkable. Every ratio quoted in the prose is recomputed in the
// same test from the sRGB and WCAG formulae, and the table in the middle of the
// article measures the reader's own theme at render time.
//
// The three media features and the color-scheme property in the last section
// are quoted verbatim from the specifications, with links to the clauses.

import { Aside, Formula, Spec } from '../../components/LearnParts'
import ThemeInversionTable from '../../components/ThemeInversionTable'

const MQ5 = 'https://www.w3.org/TR/mediaqueries-5'
const ADJUST = 'https://www.w3.org/TR/css-color-adjust-1'

export default function ThemeSystems() {
  return (
    <>
      <section id="value-sets">
        <h2>One set of names, two sets of values</h2>
        <p>
          A theme is a second set of values bound to the same set of names.{' '}
          <code>--bg-0</code> is a name; in this product it holds{' '}
          <code>#EFEEE9</code> in the light theme and <code>#060607</code> in the
          dark one. Nothing that consumes the name is told which is mounted, and
          that is the whole mechanism — there is no second stylesheet, no
          duplicated component and no branch in the markup.
        </p>
        <p>
          Which is why a token layer has to be two layers rather than one. A
          palette produces values: a blue at eleven lightnesses, a neutral ramp,
          a set of state hues. An interface consumes roles: the page ground, the
          text on it, the border of an input that is not focused. A component
          that reaches for <code>--blue-600</code> has bound itself to a value,
          and no theme can give it a different one without editing the component.
          A component that reaches for <code>--accent-strong</code> has bound
          itself to a job, and the theme answers.
        </p>
        <p>
          The test for whether a name belongs in the second layer is whether its
          value can change without the name becoming a lie.{' '}
          <code>--accent-strong</code> passes: it is strong relative to whatever
          ground it sits on. <code>--blue-600</code> fails, because a{' '}
          <code>--blue-600</code> that is not blue is a broken name rather than a
          themed one. Primitives stay fixed across themes; roles are what get
          redefined.
        </p>
        <Aside>
          The count matters as much as the split. A role layer with a token per
          component is a value layer with longer names — the theme still has to
          be edited in fifty places, it just takes longer to find them.
        </Aside>
      </section>

      <section id="inversion">
        <h2>Inversion is not a theme</h2>
        <p>
          The operation that suggests itself is inversion: replace every channel
          with 255 minus itself, and the light theme becomes the dark one. It
          does about half of what it needs to.
        </p>

        <ThemeInversionTable />

        <p>
          The ground very nearly does invert. Inverting this product&rsquo;s light
          ground <code>#EFEEE9</code> gives <code>#101116</code>, and its real
          dark ground is <code>#060607</code>; those two measure 1.07:1 against
          each other. Neutrals
          are near-grey, and the inverse of a near-grey is another near-grey.
        </p>
        <p>
          Nothing chromatic survives the trip. Inversion in RGB is a 180&deg;
          rotation of hue, so every colour returns as its opposite: this
          product&rsquo;s light link colour <code>#0B5ED7</code> is a blue at hue
          216 and inverts to <code>#F4A128</code>, an orange at hue 36. Its real
          dark link colour is <code>#4A90FF</code> — hue 217, the same blue,
          lifted until it clears the new ground. That is what the second value
          is: the same hue re-picked against a different background, rather than
          the arithmetic negative of the first.
        </p>

        <h3>Why the ratio does not carry either</h3>
        <p>
          A contrast ratio is a function of relative luminance, and luminance is
          not linear in the channel value — the sRGB transfer curve raises it to
          the power of 2.4 first. So inverting a channel does not invert its
          contribution.
        </p>
        <Formula caption="The linearisation step from the WCAG definition of relative luminance, evaluated at one channel value and at its inverse.">{`lin(c)  =  c <= 0.04045  ?  c / 12.92
                        :  ((c + 0.055) / 1.055) ^ 2.4

lin(64/255)   = 0.0513
lin(191/255)  = 0.5210      <- the inverted channel
1 - lin(64/255) = 0.9487    <- what inversion would have to give`}</Formula>
        <p>
          0.5210 against 0.9487 is not a rounding difference, and it compounds
          across three channels and two colours. In the table above the two
          ratio columns disagree in every row, and they do not even disagree in a
          consistent direction, which is what rules out correcting for it with a
          constant.
        </p>

        <Aside>
          The CSS <code>filter: invert(1)</code> applied to a whole document is
          this operation with one more problem attached: it inverts replaced
          content too, so every photograph and every video on the page comes back
          as a negative.
        </Aside>
      </section>

      <section id="surfaces">
        <h2>Which way elevation runs</h2>
        <p>
          In a light theme a raised surface is usually lighter than the page
          under it and a shadow supplies the edge. In a dark theme there is
          almost nothing left to darken, so the shadow stops carrying the
          information and lightness takes over: each level up is a slightly
          lighter surface than the one below it.
        </p>
        <p>
          The steps are small by necessity. This product&rsquo;s dark theme runs
          five surface levels from <code>#060607</code> to <code>#202125</code>,
          and the whole span measures 1.26:1 — adjacent levels are between
          1.04:1 and 1.10:1 apart. Those are differences a reader perceives as
          depth and a contrast checker reports as nothing, which is correct: SC
          1.4.11 governs the boundary that identifies a component, not the fill
          behind it.
        </p>
        <p>
          Two things follow for the token layer. The shadow tokens are roles, not
          constants — a shadow tuned for a light theme is invisible on a dark one
          and has to be redefined with the rest. And a border token earns its
          place in the dark theme even where the light theme was managing without
          one, because the surface step that separated two panels in the light
          theme is an order of magnitude smaller here.
        </p>
      </section>

      <section id="state-colour">
        <h2>State colour is re-picked, not re-used</h2>
        <p>
          Error, success and warning are the tokens where inversion goes from
          inaccurate to actively wrong, because they are the ones carrying
          meaning rather than hierarchy. A red of <code>#DC2626</code> inverts to{' '}
          <code>#23D9D9</code>, a cyan. A green of <code>#16A34A</code> inverts
          to <code>#E95CB5</code>, a pink. The result is not a dark theme with a
          bad palette; it is a dark theme in which the error state is the colour
          the light theme used for information.
        </p>
        <p>
          Re-picking them has a floor that the neutral ramp does not. A saturated
          mid-tone chosen to sit on white is dark, and the same colour on a dark
          ground has to travel back up the ramp to clear the same threshold —
          which is the subject of the next guide, and the reason a state colour
          gets a lighter value in a dark theme rather than the same one.
        </p>

        <Spec
          source="WCAG 2.2 — SC 1.4.1 Use of Color"
          href="https://www.w3.org/TR/WCAG22/#use-of-color"
          level="Level A"
        >
          Color is not used as the only visual means of conveying information,
          indicating an action, prompting a response, or distinguishing a visual
          element.
        </Spec>
        <p>
          This is the criterion a theme is most likely to break without changing
          a single component. A field that marks itself invalid with a red border
          and nothing else satisfies nobody in either theme; it merely fails less
          visibly in the one it was designed in.
        </p>
      </section>

      <section id="preferences">
        <h2>What the reader&rsquo;s settings decide</h2>
        <p>
          Three media features and one property carry the negotiation, and they
          answer four different questions.
        </p>

        <Spec source="Media Queries Level 5 — prefers-color-scheme" href={`${MQ5}/#prefers-color-scheme`}>
          The prefers-color-scheme media feature indicates which color scheme the
          user prefers.
        </Spec>
        <p>
          Two values, <code>light</code> and <code>dark</code>. It reports a
          preference the reader has already expressed to their operating system,
          which is why the honest default for a page with its own toggle is to
          follow it on the first visit and only remember an explicit choice
          afterwards.
        </p>

        <Spec source="Media Queries Level 5 — prefers-contrast" href={`${MQ5}/#prefers-contrast`}>
          The prefers-contrast media feature detects if the user has requested a
          preference for contrasting colors.
        </Spec>
        <p>
          Four values — <code>no-preference</code>, <code>more</code>,{' '}
          <code>less</code> and <code>custom</code> — and it is a separate axis
          from the light/dark one. A reader can ask for more contrast in either
          theme, and <code>custom</code> says a specific palette is in force
          rather than a direction.
        </p>

        <Spec source="Media Queries Level 5 — forced-colors" href={`${MQ5}/#forced-colors`}>
          The forced-colors media feature detects whether the browser has been
          put into forced colors mode.
        </Spec>
        <p>
          Values <code>none</code> and <code>active</code>. In the active case
          the author&rsquo;s colours are replaced wholesale by a user palette, and
          the design question stops being which colours to use and becomes which
          distinctions survive when colour is taken away — a state carried only
          by a background fill collapses into the system background, a state
          carried by a border does not.
        </p>

        <Spec source="CSS Color Adjustment Level 1 — the color-scheme property" href={`${ADJUST}/#color-scheme-prop`}>
          The color-scheme property allows an element to indicate which color
          schemes it is designed to be rendered with. These values are negotiated
          with the user&rsquo;s preferences, resulting in a used color scheme that
          affects things such as the default colors of form controls and
          scrollbars.
        </Spec>
        <p>
          This is the one most often missed, because everything it governs is
          drawn by the browser rather than by the stylesheet. A page that paints
          itself dark entirely in CSS and never declares{' '}
          <code>color-scheme: dark</code> keeps the light scrollbar and the light
          form controls the clause above names, while every authored surface
          around them is dark. Declaring both —{' '}
          <code>color-scheme: light dark</code> — is what lets a document with
          its own toggle hand the browser the right answer in either state.
        </p>
      </section>
    </>
  )
}
