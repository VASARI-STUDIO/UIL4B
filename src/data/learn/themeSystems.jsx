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
          <code>--bg-0</code> is a name. In this product it holds{' '}
          <code>#F5F5F2</code> in the light theme and <code>#060607</code> in the
          dark one. Nothing that uses the name is told which theme is active.
          That is the whole mechanism. There is no second stylesheet, no
          duplicated component and no branch in the markup.
        </p>
        <p>
          So a token layer has to be two layers, not one. A palette produces
          values: a blue at eleven lightnesses, a neutral ramp, a set of state
          hues. An interface uses roles: the page ground, the text on it, the
          border of an input that is not focused. A component that reaches for{' '}
          <code>--blue-600</code> is tied to a value. No theme can give it a
          different one without editing the component. A component that reaches
          for <code>--accent-strong</code> is tied to a job, and the theme
          answers.
        </p>
        <p>
          Here is a test for whether a name belongs in the second layer. Can its
          value change without the name becoming a lie?{' '}
          <code>--accent-strong</code> passes. It is strong against whatever
          ground it sits on. <code>--blue-600</code> fails, because a{' '}
          <code>--blue-600</code> that is not blue is a broken name, not a themed
          one. Primitives stay fixed across themes. Roles are what get
          redefined.
        </p>
        <Aside>
          The count matters as much as the split. A role layer with one token per
          component is just a value layer with longer names. The theme still has
          to be edited in fifty places, and the places are harder to find.
        </Aside>
      </section>

      <section id="inversion">
        <h2>Inversion is not a theme</h2>
        <p>
          The obvious shortcut is inversion. Replace every channel with 255 minus
          itself, and the light theme becomes the dark one. It does about half of
          what it needs to.
        </p>

        <ThemeInversionTable />

        <p>
          The ground very nearly does invert. Inverting this product&rsquo;s light
          ground <code>#F5F5F2</code> gives <code>#0A0A0D</code>, and its real
          dark ground is <code>#060607</code>; those two measure 1.02:1 against
          each other. Neutrals are near-grey, and the inverse of a near-grey is
          another near-grey.
        </p>
        <p>
          Nothing chromatic survives. Inversion in RGB is a 180&deg; rotation of
          hue, so every colour comes back as its opposite. This product&rsquo;s
          light link colour <code>#1F4FD8</code> is a blue at hue 224. It inverts
          to <code>#E0B027</code>, an orange at hue 44. Its real dark link colour
          is <code>#8FAEFF</code>. That is hue 223, the same blue, lifted until it
          clears the new ground. This is what the second value is: the same hue,
          picked again against a different background. It is not the arithmetic
          negative of the first.
        </p>

        <h3>Why the ratio does not carry either</h3>
        <p>
          A contrast ratio comes from relative luminance. Luminance is not linear
          in the channel value, because the sRGB transfer curve raises it to the
          power of 2.4 first. So inverting a channel does not invert its
          contribution.
        </p>
        <Formula caption="The linearisation step from the WCAG definition of relative luminance, evaluated at one channel value and at its inverse.">{`lin(c)  =  c <= 0.04045  ?  c / 12.92
                        :  ((c + 0.055) / 1.055) ^ 2.4

lin(64/255)   = 0.0513
lin(191/255)  = 0.5210      <- the inverted channel
1 - lin(64/255) = 0.9487    <- what inversion would have to give`}</Formula>
        <p>
          0.5210 against 0.9487 is not a rounding difference. It compounds across
          three channels and two colours. In the table above the two ratio columns
          disagree in every row. They do not even disagree in a consistent
          direction, so a constant cannot correct for it.
        </p>

        <Aside>
          The CSS <code>filter: invert(1)</code> on a whole document is this same
          operation with one more problem. It inverts replaced content too, so
          every photograph and video on the page comes back as a negative.
        </Aside>
      </section>

      <section id="surfaces">
        <h2>Which way elevation runs</h2>
        <p>
          In a light theme a raised surface is usually lighter than the page
          under it, and a shadow gives it an edge. In a dark theme there is almost
          nothing left to darken. The shadow stops carrying the information, and
          lightness takes over. Each level up is a slightly lighter surface than
          the one below it. This is a common design convention for dark themes,
          and it is how this product does it.
        </p>
        <p>
          The steps have to be small. This product&rsquo;s dark theme runs five
          surface levels from <code>#060607</code> to <code>#202125</code>. The
          whole span measures 1.26:1, and adjacent levels are between 1.04:1 and
          1.10:1 apart. A reader sees those differences as depth, and a contrast
          checker reports almost nothing. That is correct, because SC 1.4.11
          covers the boundary that identifies a component, not the fill behind
          it.
        </p>
        <p>
          Two things follow for the token layer. First, shadow tokens are roles,
          not constants. A shadow tuned for a light theme is invisible on a dark
          one and has to be redefined with the rest. Second, a border token earns
          its place in the dark theme even where the light theme managed without
          one. The surface step that separated two panels in the light theme is
          an order of magnitude smaller here.
        </p>
      </section>

      <section id="state-colour">
        <h2>State colour is re-picked, not re-used</h2>
        <p>
          For error, success and warning tokens, inversion goes from inaccurate to
          plain wrong, because they carry meaning and not hierarchy. A red of{' '}
          <code>#DC2626</code> inverts to <code>#23D9D9</code>, a cyan. A green of{' '}
          <code>#16A34A</code> inverts to <code>#E95CB5</code>, a pink. The result
          is not just a dark theme with a bad palette. It is a dark theme where
          the error state is the colour the light theme used for information.
        </p>
        <p>
          Picking them again has a limit that the neutral ramp does not. A
          saturated mid-tone chosen to sit on white is dark. On a dark ground, the
          same colour has to move back up the ramp to clear the same threshold.
          The next guide covers this. It is why a state colour gets a lighter
          value in a dark theme and not the same one.
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
          A theme can break this criterion without a single component changing. A
          field that marks itself invalid with a red border and nothing else works
          for nobody in either theme. It just fails less visibly in the theme it
          was designed in.
        </p>
      </section>

      <section id="preferences">
        <h2>What the reader&rsquo;s settings decide</h2>
        <p>
          Three media features and one property carry the negotiation. They
          answer four different questions.
        </p>

        <Spec source="Media Queries Level 5 — prefers-color-scheme" href={`${MQ5}/#prefers-color-scheme`}>
          The prefers-color-scheme media feature indicates which color scheme the
          user prefers.
        </Spec>
        <p>
          It has two values, <code>light</code> and <code>dark</code>. It reports a
          preference the reader has already given their operating system. So a
          page with its own toggle should follow that setting on the first visit.
          It should only remember an explicit choice after that.
        </p>

        <Spec source="Media Queries Level 5 — prefers-contrast" href={`${MQ5}/#prefers-contrast`}>
          The prefers-contrast media feature detects if the user has requested a
          preference for contrasting colors.
        </Spec>
        <p>
          It has four values: <code>no-preference</code>, <code>more</code>,{' '}
          <code>less</code> and <code>custom</code>. It is a separate axis from
          light and dark. A reader can ask for more contrast in either theme.{' '}
          <code>custom</code> says a specific palette is in force, not a
          direction.
        </p>

        <Spec source="Media Queries Level 5 — forced-colors" href={`${MQ5}/#forced-colors`}>
          The forced-colors media feature detects whether the browser has been
          put into forced colors mode.
        </Spec>
        <p>
          The values are <code>none</code> and <code>active</code>. When it is
          active, a user palette replaces the author&rsquo;s colours completely.
          The design question changes from which colours to use to which
          distinctions survive without colour. A state shown only by a background
          fill collapses into the system background. A state shown by a border
          does not.
        </p>

        <Spec source="CSS Color Adjustment Level 1 — the color-scheme property" href={`${ADJUST}/#color-scheme-prop`}>
          The color-scheme property allows an element to indicate which color
          schemes it is designed to be rendered with. These values are negotiated
          with the user&rsquo;s preferences, resulting in a used color scheme that
          affects things such as the default colors of form controls and
          scrollbars.
        </Spec>
        <p>
          This is the one people miss most, because the browser draws everything
          it governs, not the stylesheet. A page can paint itself dark entirely in
          CSS and never declare <code>color-scheme: dark</code>. It then keeps the
          light scrollbar and light form controls that the clause above names,
          while every surface around them is dark. Declaring both, with{' '}
          <code>color-scheme: light dark</code>, lets a document with its own
          toggle give the browser the right answer in either state.
        </p>
      </section>
    </>
  )
}
