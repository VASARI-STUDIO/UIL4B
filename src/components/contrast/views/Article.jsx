// Bread & Salt, the Article view of a Contrast Checker pair: a baking newsletter
// issue with a masthead, a headline, a standfirst, two paragraphs with one link,
// a pull quote and a small line chart. Painted in exactly two colours
// (--pv-text and --pv-canvas), so the picture is what the pair does to a page
// people read.
//
// Pure: no state, no effects, no props. PairExample sorts the pieces into the
// three tests at runtime (data-size); this file only names the parts that are not
// text, as classes UI_PARTS lists. Two rules keep that sorting honest:
//   - a border sits on a wrapper and the words in a span or paragraph inside it,
//     so the part is measured as a UI part and the words as text;
//   - the link underline and the chart axes are drawn boxes, not text decoration
//     or SVG text, for the same reason.
import { BODY, BRAND, CHART, MAST, QUOTE, STORY } from './Article.data.js'
import './Article.css'

export default function Article() {
  return (
    <div className="bs">
      <div className="bs-mast">
        <p className="bs-brand">{BRAND}</p>
        <p className="bs-issue">{MAST.issue}</p>
        <span className="bs-sub"><span>{MAST.subscribe}</span></span>
      </div>

      <div className="bs-top">
        <p className="bs-head">{STORY.headline}</p>
        <p className="bs-stand">{STORY.standfirst}</p>
        <p className="bs-by">{STORY.byline}</p>
      </div>
      <div className="bs-quotebox">
        <div className="bs-quote-rule"><p className="bs-quote">{QUOTE}</p></div>
      </div>

      <div className="bs-body">
        <p className="bs-p">
          {BODY.first.before}
          <span className="bs-link">{BODY.first.link}<i className="bs-link-u" /></span>
          {BODY.first.after}
        </p>
        <p className="bs-p bs-p2">{BODY.second}</p>
      </div>

      <div className="bs-fig">
        <p className="bs-figt">{CHART.title}</p>
        <div className="bs-chart-axis">
          <svg className="bs-plot" viewBox="0 0 100 100" preserveAspectRatio="none" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path className="bs-chart-line" d={CHART.cool.path} vectorEffect="non-scaling-stroke" />
            <path className="bs-chart-line bs-chart-line--dash" d={CHART.warm.path} vectorEffect="non-scaling-stroke" strokeDasharray="6 5" />
          </svg>
          <span className="bs-lab bs-lab--warm">{CHART.warm.label}</span>
          <span className="bs-lab bs-lab--cool">{CHART.cool.label}</span>
        </div>
        <div className="bs-xl"><span>{CHART.from}</span><span>{CHART.to}</span></div>
        <p className="bs-cap">{CHART.caption}</p>
      </div>
    </div>
  )
}
