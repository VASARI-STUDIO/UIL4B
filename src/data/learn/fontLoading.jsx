// Article: What the reader sees before the font arrives. Metadata and sources
// in src/data/learnIndex.js.
//
// Two live tables carry this article's figures and neither of them is typed.
// FontFaceTable reads the @font-face rules out of the running stylesheet and
// computes each one's code-point count from its own unicode-range;
// FallbackShiftTable paints the same sentence in the declared stack and in the
// stack without its webfont and measures both. Every duration in the prose is
// inside a <Spec> and quoted from the clause it links to.
//
// The claims made about this product's own faces — the inventory, which
// families are subset, how many code points the two subsets of a split family
// share, and the numbers on the fallback faces — are recomputed from
// src/styles/global.css by tests/unit/learn-type-figures.test.js rather than
// trusted, which is the same arrangement the colour guides use for their hexes.

import { Aside, Spec } from '../../components/LearnParts'
import FallbackShiftTable from '../../components/FallbackShiftTable'
import FontFaceTable from '../../components/FontFaceTable'

const FONTS4 = 'https://www.w3.org/TR/css-fonts-4'
const FONTS5 = 'https://www.w3.org/TR/css-fonts-5'

export default function FontLoading() {
  return (
    <>
      <section id="three-periods">
        <h2>The three periods a webfont has</h2>
        <p>
          A font file is a network request. The text it is meant to draw exists
          before the request finishes. CSS divides the wait into three named
          periods and says what has to be painted in each.
        </p>

        <Spec source="CSS Fonts Module Level 4 — the font display timeline" href={`${FONTS4}/#font-display-timeline`}>
          &hellip; font block period. During this period, if the font face is
          not loaded, any element attempting to use it must instead render with
          an invisible fallback font face. &hellip; The second period, occurring
          immediately after the block period, is the font swap period. During
          this period, if the font face is not loaded, any element attempting to
          use it must instead render with a fallback font face. &hellip; The
          third period, occurring immediately after the swap period, is the font
          failure period. If the font face is not yet loaded when this period
          starts, it&rsquo;s marked as a failed load, causing normal font
          fallback.
        </Spec>

        <p>
          The word <i>invisible</i> in the first period is precise. It does not
          mean the text is absent:
        </p>

        <Spec source="CSS Fonts Module Level 4 — rendering with an invisible fallback font face" href={`${FONTS4}/#font-display-timeline`}>
          To render with an invisible fallback font face for a given element,
          find a font face as per &ldquo;render with a fallback font
          face&rdquo;. Create an anonymous font face with the same metrics as
          the selected font face but with all glyphs &ldquo;invisible&rdquo;
          (containing no &ldquo;ink&rdquo;), and use that for rendering text.
        </Spec>

        <p>
          So the layout during a block period is the fallback&rsquo;s layout, with
          the ink removed. The space is already the wrong size for the face that
          is coming. The reader just cannot see that yet. Know this before you
          choose which period to spend. The blank stretch does not buy a stable
          layout. It only hides an unstable one.
        </p>
      </section>

      <section id="choosing-display">
        <h2>Which period the page should spend</h2>
        <p>
          One descriptor sets the lengths. Choosing between its values is a
          choice about what the reader loses.
        </p>

        <Spec source="CSS Fonts Module Level 4 — the font-display descriptor, swap" href={`${FONTS4}/#font-display-desc`}>
          swap — Gives the font face an extremely small block period (100ms or
          less is recommended in most cases) and an infinite swap period.
        </Spec>

        <Spec source="CSS Fonts Module Level 4 — the font-display descriptor, block" href={`${FONTS4}/#font-display-desc`}>
          block — Gives the font face a short block period (3s is recommended in
          most cases) and an infinite swap period. &hellip; This value must only
          be used when rendering text in a particular font is required for the
          page to be usable. It must only be used for small pieces of text.
        </Spec>

        <p>
          People often drop those two sentences of scope when they summarise the
          values. <code>block</code> is meant for icon fonts and short strings,
          where a fallback glyph would mislead. The specification&rsquo;s own
          example is a printer icon mapped to the letter P. It is not meant for
          body copy, where three seconds of blank space costs the reader the
          start of their reading.
        </p>
        <p>
          <code>fallback</code> shortens the swap period as well as the block
          period. A font that arrives late is dropped for the rest of the page
          and is not swapped in under a reader who has started reading. The
          specification says plainly which text that is for: body text, and large
          pieces of it. <code>optional</code> goes further and lets the browser
          abandon the download entirely.
        </p>
        <p>
          Every face declared on this page uses <code>swap</code>. The table in a
          later section reads this back from the stylesheet. That includes the
          local stand-in faces, which could do without it, since an installed font
          never waits. The cost of the choice is the subject of the next
          section.
        </p>
        <Aside>
          The recommended durations are only recommendations. The specification
          notes that user agents may use different ones. They may also let a
          reader override the author&rsquo;s choice, for example by forcing every
          font to a zero-length block period.
        </Aside>
      </section>

      <section id="the-shift">
        <h2>The line changes width when the file lands</h2>
        <p>
          A swap is not a repaint. The fallback and the webfont have different
          advance widths. So every line of text is broken again at the moment of
          the swap, and everything below it moves. Browsers report this movement
          as layout shift, and Core Web Vitals count it in Cumulative Layout
          Shift.
        </p>

        <FallbackShiftTable />

        <p>
          Every row is a real declaration measured in this browser. The first is
          the page with its webfont. The second is what it paints while the file
          is still on its way. That is a local face this page adjusts to the
          webfont&rsquo;s widths, described in the last section, so the second row
          sits close to the first. The third removes that adjusted stand-in and
          leaves the system fonts the stack ends with. This is the shift an
          unadjusted page makes on a cold load. The third figure is different on
          a machine whose system sans is a different face. That is why it is
          measured here and not quoted.
        </p>
        <p>
          The effect builds down the page. A paragraph that breaks again from nine
          lines to ten moves everything under it by a line height. A reader half
          way through it loses their place. A heading that breaks again changes
          the height of a card and the position of every card after it in the
          grid. None of this shows in a screenshot taken after the font has
          loaded, and that is nearly every screenshot.
        </p>
      </section>

      <section id="subsetting">
        <h2>A family arrives as several files</h2>
        <p>
          A typeface with full Latin coverage is large, and most pages use a small
          part of it. One descriptor solves this. It states a character range per
          file and lets the browser decide which files it needs. It is a choice,
          not a requirement. A rule with no range covers every code point. The
          browser fetches that one file as soon as any text uses the face.
        </p>

        <Spec source="CSS Fonts Module Level 4 — the unicode-range descriptor" href={`${FONTS4}/#unicode-range-desc`}>
          This descriptor defines the set of Unicode codepoints that may be
          supported by the font face for which it is declared. &hellip; The
          union of these ranges defines the set of codepoints that serves as a
          hint for user agents when deciding whether or not to download a font
          resource for a given text run.
        </Spec>

        <FontFaceTable />

        <p>
          Six families, ten rules, and only two of the families are subset. The interface face ships whole. It has one variable file for the
          upright and one for the italic, each declared with no range. Each reads
          as covering every code point, and each is fetched the first time text in
          that style is drawn. Its stand-in is a pair of local faces, which have no
          file to fetch. Two display faces, a serif and a condensed sans, are
          declared the same way, with no range, though their files are already
          trimmed to the Latin set. The menu fetches them by script. It does so
          the first time the Create or Discover menu opens on a device with a
          mouse and without Save-Data, so a phone never downloads either for the
          menu. The homepage specimens also set text in both. The monospace face
          and the handwritten annotation face are each split at U+0100. The
          second file of each pair is only fetched when a character in its range
          is actually rendered. That is what the last column measures. It asks
          whether the file that would draw the first printable character of each
          range has been downloaded. So the answer changes with what is on the
          page.
        </p>
        <p>
          The two ranges of a split pair do not quite stand apart. Seven code
          points appear in both. They are the ones a page cannot do without even
          in the narrow subset: the dotless i, the Œ and œ ligatures, three
          combining marks, and the dagger. A combining mark has to live wherever
          the letter it sits on lives. Duplicating a handful of them costs less
          than making an accented word pull down a second file.
        </p>
        <Aside>
          The specification calls <code>unicode-range</code> a hint, not a rule.
          A browser decides for itself which files a text run needs. A page whose
          content changes after load can cause a fetch long after the first
          paint.
        </Aside>
      </section>

      <section id="matching-the-fallback">
        <h2>Making the stand-in fit</h2>
        <p>
          The shift measured above is not inevitable. It happens when the fallback
          was never adjusted to take up the same space. CSS has descriptors that
          do exactly that.
        </p>

        <Spec source="CSS Fonts Module Level 5 — the size-adjust descriptor" href={`${FONTS5}/#size-adjust-desc`}>
          The size-adjust descriptor defines a multiplier for glyph outlines and
          metrics associated with this font, to allow the author to harmonize
          the designs of various fonts when rendered at the same font-size.
          &hellip; However, the computed font-size (and thus any values that
          derive from it, such as em units, percentages in text-underline-offset,
          etc.) remains unaffected.
        </Spec>

        <p>
          The technique is to declare a second <code>@font-face</code> for the
          local fallback face. It points at the installed font, not at a download.
          You give it a <code>size-adjust</code> that brings its metrics closer to
          the webfont&rsquo;s. Level 5 adds <code> ascent-override</code>,{' '}
          <code>descent-override</code> and <code> line-gap-override</code> for
          the same purpose on the line box. The fallback can then take up the same
          vertical space as well as the same horizontal space.
        </p>
        <p>
          This page does exactly that. Its stand-in is two rules that point at
          the installed Arial, with Liberation Sans and Helvetica behind it for
          other systems. The regular rule covers weights 100 to 599 at a
          size-adjust of 101%. The bold rule covers 600 to 900 at 96%, because the
          installed bold is wider than the webfont&rsquo;s. Both carry ascent,
          descent and line-gap overrides taken from the webfont&rsquo;s own
          vertical metrics. That is why the second row of the first table sits so
          close to the first.
        </p>
        <p>
          Two points are worth keeping. First, <code> size-adjust</code> scales the
          metrics and not the computed font-size. Anything in <code>em</code>
          stays where it was. Anything in <code>ex</code> or <code>ch</code> moves
          with the adjustment. Second, the calculation is per fallback. The
          multiplier that makes one system face match a webfont is wrong for a
          different system face. A stack with three fallbacks needs three
          multipliers, or a clear decision to correct only the one most readers
          will see.
        </p>
        <p>
          The option that costs nothing is to need the file less. Fewer weights, a
          tighter subset, and a face whose metrics are already close to the
          fallback all shorten the moment this article is about. None of them
          makes a reader wait for anything.
        </p>
      </section>
    </>
  )
}
