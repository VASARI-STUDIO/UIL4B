import { useState } from 'react'

const FONT_DB = {
  'Playfair Display': { w: 700, cat: 'serif', pairs: ['Source Sans 3', 'DM Sans', 'Instrument Sans', 'Commissioner'] },
  'Sora': { w: 700, cat: 'sans', pairs: ['DM Sans', 'Inter Tight', 'Commissioner', 'Source Sans 3'] },
  'Fraunces': { w: 700, cat: 'serif', pairs: ['Commissioner', 'Instrument Sans', 'Inter Tight', 'Source Sans 3'] },
  'Bricolage Grotesque': { w: 700, cat: 'sans', pairs: ['Inter Tight', 'Source Sans 3', 'Commissioner', 'DM Sans'] },
  'Outfit': { w: 700, cat: 'sans', pairs: ['DM Sans', 'Source Sans 3', 'Commissioner', 'Instrument Sans'] },
  'Manrope': { w: 700, cat: 'sans', pairs: ['Inter Tight', 'Source Sans 3', 'DM Sans', 'Commissioner'] },
  'Instrument Sans': { w: 700, cat: 'sans', pairs: ['Source Sans 3', 'Commissioner', 'Inter Tight', 'DM Sans'] },
}

export default function FontMatcher({ onCopy }) {
  const [heading, setHeading] = useState('Playfair Display')
  const db = FONT_DB[heading]

  return (
    <div className="sec">
      <div className="sec-h">
        <h1>Font Matcher</h1>
        <p>Pick a heading font and get body suggestions. Click to copy the Google Fonts import URL.</p>
      </div>
      <div className="sub">
        <div className="row" style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 10, color: 'var(--t2)' }}>Heading</label>
          <select value={heading} onChange={e => setHeading(e.target.value)} style={{ width: 220 }}>
            {Object.keys(FONT_DB).map(f => <option key={f}>{f}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {db.pairs.map(body => {
            const imp = `${heading.replace(/ /g, '+')}:wght@${db.w}&family=${body.replace(/ /g, '+')}:wght@400;500`
            const url = `https://fonts.googleapis.com/css2?family=${imp}&display=swap`
            return (
              <div key={body} className="card fp" onClick={() => onCopy(url)} style={{ cursor: 'pointer' }}>
                <div style={{ fontFamily: `'${heading}', ${db.cat}`, fontWeight: db.w, fontSize: 24, marginBottom: 8 }}>
                  The quick brown fox
                </div>
                <div style={{ fontFamily: `'${body}', sans-serif`, fontSize: 14, color: 'var(--t1)', lineHeight: 1.6, marginBottom: 8 }}>
                  Pack my box with five dozen liquor jugs. How vexingly quick daft zebras jump.
                </div>
                <div style={{ fontSize: 10, color: 'var(--t2)', fontFamily: 'var(--mono)' }}>
                  {heading} + {body} &middot; Click to copy import
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
