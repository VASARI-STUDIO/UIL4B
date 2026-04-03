export default function Community() {
  return (
    <div className="sec">
      <div className="sec-h">
        <h1>Community</h1>
        <p>Connect with other designers and developers using Visari Studio.</p>
      </div>
      <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--t2)" strokeWidth="1.5" style={{ marginBottom: 16 }}>
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
        </svg>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Coming Soon</h2>
        <p style={{ fontSize: 14, color: 'var(--t2)', maxWidth: 400, margin: '0 auto' }}>
          Share palettes, get feedback on your designs, and discover templates created by the community.
        </p>
      </div>
    </div>
  )
}
