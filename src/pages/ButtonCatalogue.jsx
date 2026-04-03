const BUTTONS = [
  { n: 'Primary Solid', css: 'padding:12px 28px;background:#f5f5f5;color:#0a0a0a;border:none;font-size:14px;font-weight:600' },
  { n: 'Outline', css: 'padding:12px 28px;background:transparent;color:var(--t0);border:1.5px solid var(--bh);font-size:14px;font-weight:500' },
  { n: 'Ghost', css: 'padding:12px 28px;background:transparent;color:var(--t1);border:none;font-size:14px;font-weight:500' },
  { n: 'Pill', css: 'padding:10px 24px;background:var(--bg-2);color:var(--t0);border:1px solid var(--border);border-radius:999px;font-size:13px;font-weight:500' },
  { n: 'Underline', css: 'padding:4px 0;background:transparent;color:var(--t0);border:none;border-bottom:1.5px solid var(--t0);font-size:14px;font-weight:500' },
  { n: 'Small Tag', css: 'padding:5px 14px;background:var(--bg-2);color:var(--t1);border:1px solid var(--border);font-size:11px;font-weight:500' },
  { n: 'Large CTA', css: 'padding:16px 40px;background:var(--t0);color:var(--bg-0);border:none;font-size:16px;font-weight:700;letter-spacing:-0.01em' },
  { n: 'Glass', css: 'padding:12px 28px;background:rgba(255,255,255,0.06);color:#fff;border:1px solid rgba(255,255,255,0.1);font-size:14px;font-weight:500;backdrop-filter:blur(12px)' },
]

function cssStringToObject(css) {
  const obj = {}
  css.split(';').filter(Boolean).forEach(rule => {
    const [key, ...val] = rule.split(':')
    if (key && val.length) {
      const camel = key.trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase())
      obj[camel] = val.join(':').trim()
    }
  })
  return obj
}

export default function ButtonCatalogue({ onCopy }) {
  return (
    <div className="sec">
      <div className="sec-h">
        <h1>Button Catalogue</h1>
        <p>Reusable button styles. Click code to copy CSS.</p>
      </div>
      <div className="sub">
        <div className="btn-cat">
          {BUTTONS.map(b => (
            <div key={b.n} className="btn-cell">
              <button style={{ ...cssStringToObject(b.css), cursor: 'pointer', fontFamily: 'var(--font)', outline: 'none', borderRadius: 10 }}>
                Button
              </button>
              <span className="bn">{b.n}</span>
              <div className="code" style={{ fontSize: 9, width: '100%', marginTop: 6, whiteSpace: 'pre-wrap' }} onClick={() => onCopy(b.css)}>
                {b.css}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
