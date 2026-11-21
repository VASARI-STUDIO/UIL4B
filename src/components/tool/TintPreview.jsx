import { previewColours, ratioSpoken, ratioText } from '../../utils/tintPreview'

// The Tint Generator's Preview view: one small page (a pottery studio's class
// page) drawn in the selected scale, with a tag on each element naming the step
// it uses. Colours reach the CSS as inline custom properties; tint.css only
// reads them. Nothing in it is a control: the page is aria-hidden and the
// legend list says the same facts to a screen reader. The tags are neutral
// chrome, so the palette is spent on the page alone.
function Tag({ className, children }) {
  return <span className={`tt-pv-tag ${className}`} aria-hidden="true">{children}</span>
}

export default function TintPreview({ ramp, count, source, sourceCount, sourceHex }) {
  const { steps, hex } = previewColours(ramp, count)
  const same = steps.head === steps.dark
  // The ends a 13-step ramp has over the 11-step one; no page role takes them.
  const unused = count === 13 ? ['25', '975'] : []
  const style = {
    '--pv-page': hex.page,
    '--pv-card': hex.card,
    '--pv-line': hex.line,
    '--pv-btn': hex.button,
    '--pv-btn-ink': hex.buttonInk,
    '--pv-hover': hex.hover,
    '--pv-text': hex.text,
    '--pv-head': hex.head,
    '--pv-dark': hex.dark,
    '--pv-dark-ink': hex.darkInk,
    '--pv-dark-sub': hex.darkSub,
  }
  const scaleTag = sourceCount > 1 ? `Scale ${source} of ${sourceCount} · ` : ''
  return (
    <div
      className="tt-pv"
      role="group"
      aria-label={`Preview of the ${count}-step scale on a sample page`}
      aria-describedby="tt-pv-legend"
      style={style}
    >
      <div className="tt-pv-page" aria-hidden="true" tabIndex={-1}>
        <Tag className="tt-pv-tag--page">
          {sourceCount > 1 && <span className="tt-pv-dot" style={{ '--tt-c': sourceHex }} />}
          {scaleTag}{steps.page} page
        </Tag>
        <div className="tt-pv-body">
          <div className="tt-pv-intro">
            <h3 className="tt-pv-h">
              Wheel throwing for beginners
              <Tag className="tt-pv-tag--trail">{steps.head} <b>{ratioText(hex.head, hex.page)}</b></Tag>
            </h3>
            <p className="tt-pv-meta">
              Thursday evenings, 6 to 8 pm {'·'} Six weeks
              <Tag className="tt-pv-tag--trail">{steps.text} text <b>{ratioText(hex.text, hex.page)}</b></Tag>
            </p>
            <p className="tt-pv-p">Centring, pulling up walls and trimming, at your own wheel. Clay and two firings included.</p>
          </div>
          <div className="tt-pv-card">
            <Tag className="tt-pv-tag--corner">{steps.card} {'·'} border {steps.line}</Tag>
            <p className="tt-pv-card-h">Next intake</p>
            <p className="tt-pv-card-m">Starts in March {'·'} Six places a class</p>
            <div className="tt-pv-actions">
              <span className="tt-pv-btn">
                Book a place
                <Tag className="tt-pv-tag--corner">{steps.button} {'·'} hover {steps.hover} <b>{ratioText(hex.buttonInk, hex.button)}</b></Tag>
              </span>
              <span className="tt-pv-link">See the timetable</span>
            </div>
          </div>
          <div className="tt-pv-more">
            <p className="tt-pv-more-h">This term</p>
            <div className="tt-pv-rows">
              <p className="tt-pv-row"><span>Week 1</span><span>Wedging and centring</span></p>
              <p className="tt-pv-row"><span>Week 2</span><span>Pulling up walls</span></p>
              <p className="tt-pv-row"><span>Week 3</span><span>Bowls and cylinders</span></p>
              <p className="tt-pv-row"><span>Week 4</span><span>Trimming a foot ring</span></p>
            </div>
          </div>
        </div>
        <div className="tt-pv-foot">
          <Tag className="tt-pv-tag--corner">{steps.dark} dark{same ? ', also headings' : ''}</Tag>
          <p className="tt-pv-foot-h">Studio hours</p>
          <p className="tt-pv-foot-m">Tuesday to Saturday, 10 am to 9 pm</p>
        </div>
      </div>
      <ul id="tt-pv-legend" className="sr-only">
        <li>Page background: step {steps.page}, {hex.page}.</li>
        <li>Card: step {steps.card}, {hex.card}, with a step {steps.line} border, {hex.line}.</li>
        <li>Headings: step {steps.head}, {hex.head}, {ratioSpoken(hex.head, hex.page)} on the page.</li>
        <li>Body text and links: step {steps.text}, {hex.text}, {ratioSpoken(hex.text, hex.page)} on the page.</li>
        <li>Button: step {steps.button}, {hex.button}, going to step {steps.hover}, {hex.hover}, on hover; its text is {hex.buttonInk === '#000000' ? 'black' : 'white'}, {ratioSpoken(hex.buttonInk, hex.button)}.</li>
        <li>Footer: step {steps.dark}, {hex.dark}{same ? ', the same step as the headings' : ''}, with step {steps.darkInk} and step {steps.darkSub} text.</li>
        {unused.length > 0 && <li>Steps {unused.join(' and ')} are not used on this page.</li>}
      </ul>
    </div>
  )
}
