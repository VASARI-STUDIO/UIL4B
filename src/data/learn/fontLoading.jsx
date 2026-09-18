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
// The one arithmetic claim made about this product's own faces — how many code
// points the two subsets share — is recomputed from src/styles/global.css by
// tests/unit/learn-figures.test.js rather than trusted, which is the same
// arrangement the colour guides use for their hexes.

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
          A font file is a network request, and the text it is meant to draw
          exists before the request finishes. CSS divides the wait into three
          named stretches and specifies what has to be painted in each.
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
          The word <i>invisible</i> in the first period is doing something
          precise, and it is not the same as the text being absent:
        </p>

        <Spec source="CSS Fonts Module Level 4 — rendering with an invisible fallback font face" href={`${FONTS4}/#font-display-timeline`}>
          To render with an invisible fallback font face for a given element,
          find a font face as per &ldquo;render with a fallback font
          face&rdquo;. Create an anonymous font face with the same metrics as
          the selected font face but with all glyphs &ldquo;invisible&rdquo;
          (containing no &ldquo;ink&rdquo;), and use that for rendering text.
        </Spec>

        <p>
          So the layout during a block period is the fallback&rsquo;s layout,
          with the ink removed. The space is already the wrong size for the face
          that is coming; the reader simply cannot see that yet. That is worth
          knowing before choosing which period to spend, because it means the
          blank stretch does not buy a stable layout — it only hides an unstable
          one.
        </p>
      </section>

      <section id="choosing-display">
        <h2>Which period the page should spend</h2>
        <p>
          One descriptor sets the lengths, and the choice between its values is
          a choice about what the reader loses.
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
          Those two sentences of scope are the part usually dropped when the
          values are summarised. <code>block</code> is specified for icon fonts
          and short strings where a fallback glyph would be actively
          misleading — the specification&rsquo;s own example is a printer icon
          mapped to the letter P — and not for body copy, where three seconds of
          blank space costs the reader the entire beginning of their reading.
        </p>
        <p>
          <code>fallback</code> shortens the swap period as well as the block
          period, so a font that arrives late is discarded for the rest of the
          page rather than swapped in under a reader who has started reading.
          The specification says plainly which text that is for: body text, and
          large pieces of it. <code>optional</code> goes further and lets the
          browser abandon the download entirely.
        </p>
        <p>
          Every face declared on this page uses <code>swap</code>, which the
          table in the next section reads back out of the stylesheet rather than
          restating. The cost of that choice is the subject of the section after
          it.
        </p>
        <Aside>
          The recommended durations are recommendations. The specification notes
          that user agents may use different ones, and may let a reader override
          the author&rsquo;s choice — for example by forcing every font to a
          zero-length block period.
        </Aside>
      </section>

      <section id="the-shift">
        <h2>The line changes width when the file lands</h2>
        <p>
          A swap is not a repaint. The fallback and the webfont have different
          advance widths, so every line of text is re-broken at the moment of
          the swap, and everything below it moves.
        </p>

        <FallbackShiftTable />

        <p>
          Both rows are real declarations measured in this browser, so the
          difference between them is the shift this page performs on a cold
          load — on this machine, with these fonts installed. It is a different
          number on a machine whose system sans is a different face, which is
          why it is measured here rather than quoted.
        </p>
        <p>
          The effect compounds down the page. A paragraph that re-breaks from
          nine lines to ten moves everything under it by a line height, and a
          reader who was half way through it loses their place; a heading that
          re-breaks changes the height of a card and the position of every card
          after it in the grid. None of that is visible in a screenshot taken
          after the font has loaded, which is every screenshot anyone takes.
        </p>
      </section>

      <section id="subsetting">
        <h2>A family arrives as several files</h2>
        <p>
          A typeface with full Latin coverage is large, and most pages render a
          small part of it. The descriptor that resolves this states a character
          range per file and lets the browser decide which files it needs.
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
          Three families, six rules, each family split at U+0100 — and the second
          file of each pair is only fetched when a character in its range is
          actually rendered. That is what the last column measures: it asks
          whether the file that would draw the first printable character of each
          range has been downloaded, so the answer changes with what is on the
          page.
        </p>
        <p>
          The two ranges of a pair are not quite disjoint. Seven code points
          appear in both, and they are the ones a page cannot do without even in
          the narrow subset: the dotless i, the Œ and œ ligatures, three
          combining marks, and the dagger. A combining mark has to live wherever
          the letter it sits on lives, so duplicating a handful of them is
          cheaper than making an accented word pull down a second file.
        </p>
        <Aside>
          <code>unicode-range</code> is described as a hint rather than a rule
          for a reason: a browser decides for itself which files a text run
          needs, and a page whose content changes after load can cause a fetch
          long after the first paint.
        </Aside>
      </section>

      <section id="matching-the-fallback">
        <h2>Making the stand-in fit</h2>
        <p>
          The shift measured above is not inevitable. It exists because the
          fallback was never adjusted to occupy the same space, and CSS provides
          descriptors that do exactly that.
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
          local fallback face — one that points at the installed font rather
          than at a download — and give it a <code>size-adjust</code> that
          brings its metrics towards the webfont&rsquo;s. Level 5 supplies
          <code> ascent-override</code>, <code>descent-override</code> and
          <code> line-gap-override</code> for the same purpose on the line box,
          so the fallback can be made to occupy the same vertical space as well
          as the same horizontal one.
        </p>
        <p>
          Two consequences are worth holding onto. The first is that
          <code> size-adjust</code> scales the metrics and not the computed
          font-size, so anything expressed in <code>em</code> stays where it
          was while anything expressed in <code>ex</code> or <code>ch</code>
          moves with the adjustment. The second is that this is a per-fallback
          calculation: the multiplier that makes one system face match a webfont
          is wrong for a different system face, so a stack with three fallbacks
          in it needs three of them, or an honest decision to correct only the
          one most readers will see.
        </p>
        <p>
          The alternative that costs nothing is to need the file less. Fewer
          weights, a tighter subset and a face whose metrics are already close
          to the fallback all shorten the moment this article is about, and
          none of them requires a reader to wait for anything.
        </p>
      </section>
    </>
  )
}
