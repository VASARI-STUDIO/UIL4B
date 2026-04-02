const LAYOUTS = [
  { n: 'Hero — Centred', d: 'Full-width, centred text stack.', css: `.hero {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  text-align: center;\n  padding: 80px 24px;\n}\n.hero-content { max-width: 720px; }`, preview: (<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: 16 }}><div className="lph" style={{ width: '55%', height: 14 }} /><div className="lph" style={{ width: '75%', height: 8 }} /><div className="lph" style={{ width: '35%', height: 24, marginTop: 3 }} /></div>) },
  { n: 'Hero — Split', d: '50/50 text + image.', css: `.split {\n  display: grid;\n  grid-template-columns: 1fr 1fr;\n  gap: 40px;\n  align-items: center;\n}\n@media (max-width: 810px) {\n  .split { grid-template-columns: 1fr; }\n}`, preview: (<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: 10 }}><div style={{ display: 'flex', flexDirection: 'column', gap: 5, justifyContent: 'center' }}><div className="lph" style={{ height: 12, width: '75%' }} /><div className="lph" style={{ height: 7, width: '100%' }} /></div><div className="lph" style={{ height: 70 }} /></div>) },
  { n: 'Feature Grid (3-col)', d: 'Auto-wrapping grid.', css: `.features {\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n  gap: 24px;\n}`, preview: (<div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, padding: 8 }}><div className="lph" style={{ height: 50 }} /><div className="lph" style={{ height: 50 }} /><div className="lph" style={{ height: 50 }} /></div>) },
  { n: 'CTA Banner', d: 'Full-width centred band.', css: `.cta {\n  padding: 48px 24px;\n  text-align: center;\n}`, preview: (<div style={{ background: 'var(--bg-3)', padding: 14, textAlign: 'center' }}><div className="lph" style={{ height: 10, width: '45%', margin: '0 auto 6px' }} /><div className="lph" style={{ height: 20, width: '25%', margin: '0 auto' }} /></div>) },
  { n: 'Testimonials', d: '3-col card row.', css: `.testimonials {\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n  gap: 16px;\n}`, preview: (<div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 5, padding: 8 }}><div className="lph" style={{ height: 44 }} /><div className="lph" style={{ height: 44 }} /><div className="lph" style={{ height: 44 }} /></div>) },
  { n: 'Footer — 4 Column', d: 'Logo + 3 link columns.', css: `.footer {\n  display: grid;\n  grid-template-columns: 2fr 1fr 1fr 1fr;\n  gap: 32px;\n}`, preview: (<div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 5, padding: 8 }}><div className="lph" style={{ height: 36 }} /><div className="lph" style={{ height: 36 }} /><div className="lph" style={{ height: 36 }} /><div className="lph" style={{ height: 36 }} /></div>) },
]

export default function SectionLayouts({ onCopy }) {
  return (
    <div className="sec">
      <div className="sec-h">
        <h1>Section Layouts</h1>
        <p>Common responsive section patterns.</p>
      </div>
      <div className="sub">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {LAYOUTS.map(x => (
            <div key={x.n} className="card" style={{ padding: 12, flex: '1 1 300px', minWidth: 0 }}>
              <div className="lp">{x.preview}</div>
              <div style={{ fontSize: 12, fontWeight: 600, margin: '8px 0 2px' }}>{x.n}</div>
              <p style={{ fontSize: 11, color: 'var(--t2)', marginBottom: 5 }}>{x.d}</p>
              <div className="code" style={{ fontSize: 10 }} onClick={() => onCopy(x.css)}>{x.css}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
