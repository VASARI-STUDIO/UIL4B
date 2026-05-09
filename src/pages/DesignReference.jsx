import { useState } from 'react'
import { useI18n } from '../contexts/I18nContext'

function CopyIcon({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

function RefSection({ title, description, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section style={{ marginBottom: 28 }}>
      <button onClick={() => setOpen(!open)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', width: '100%', textAlign: 'left', fontFamily: 'var(--font)' }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transition: 'transform .2s', transform: open ? 'rotate(90deg)' : 'none', color: 'var(--t2)' }}>
          <polyline points="9 6 15 12 9 18" />
        </svg>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--t0)' }}>{title}</h2>
      </button>
      {description && <p style={{ fontSize: 12, color: 'var(--t2)', marginBottom: 10, paddingLeft: 18 }}>{description}</p>}
      {open && <div style={{ paddingLeft: 18, paddingTop: 8 }}>{children}</div>}
    </section>
  )
}

const SPACING = [
  { k: '0', rem: '0', px: 0 }, { k: '0.5', rem: '0.125rem', px: 2 }, { k: '1', rem: '0.25rem', px: 4 },
  { k: '1.5', rem: '0.375rem', px: 6 }, { k: '2', rem: '0.5rem', px: 8 }, { k: '2.5', rem: '0.625rem', px: 10 },
  { k: '3', rem: '0.75rem', px: 12 }, { k: '3.5', rem: '0.875rem', px: 14 }, { k: '4', rem: '1rem', px: 16 },
  { k: '5', rem: '1.25rem', px: 20 }, { k: '6', rem: '1.5rem', px: 24 }, { k: '7', rem: '1.75rem', px: 28 },
  { k: '8', rem: '2rem', px: 32 }, { k: '9', rem: '2.25rem', px: 36 }, { k: '10', rem: '2.5rem', px: 40 },
  { k: '11', rem: '2.75rem', px: 44 }, { k: '12', rem: '3rem', px: 48 }, { k: '14', rem: '3.5rem', px: 56 },
  { k: '16', rem: '4rem', px: 64 }, { k: '20', rem: '5rem', px: 80 }, { k: '24', rem: '6rem', px: 96 },
  { k: '28', rem: '7rem', px: 112 }, { k: '32', rem: '8rem', px: 128 }, { k: '36', rem: '9rem', px: 144 },
  { k: '40', rem: '10rem', px: 160 }, { k: '44', rem: '11rem', px: 176 }, { k: '48', rem: '12rem', px: 192 },
  { k: '52', rem: '13rem', px: 208 }, { k: '56', rem: '14rem', px: 224 }, { k: '60', rem: '15rem', px: 240 },
  { k: '64', rem: '16rem', px: 256 }, { k: '72', rem: '18rem', px: 288 }, { k: '80', rem: '20rem', px: 320 },
  { k: '96', rem: '24rem', px: 384 },
]

const SHADOWS = [
  { name: 'sm', value: '0 1px 2px 0 rgb(0 0 0 / 0.05)' },
  { name: 'DEFAULT', value: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)' },
  { name: 'md', value: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' },
  { name: 'lg', value: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)' },
  { name: 'xl', value: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)' },
  { name: '2xl', value: '0 25px 50px -12px rgb(0 0 0 / 0.25)' },
  { name: 'inner', value: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)' },
]

const RADII = [
  { name: 'none', value: '0px' }, { name: 'sm', value: '0.125rem (2px)' },
  { name: 'DEFAULT', value: '0.25rem (4px)' }, { name: 'md', value: '0.375rem (6px)' },
  { name: 'lg', value: '0.5rem (8px)' }, { name: 'xl', value: '0.75rem (12px)' },
  { name: '2xl', value: '1rem (16px)' }, { name: '3xl', value: '1.5rem (24px)' },
  { name: 'full', value: '9999px' },
]
const RADII_PX = [0, 2, 4, 6, 8, 12, 16, 24, 9999]

const FONT_SIZES = [
  { name: 'xs', rem: '0.75rem', px: 12 }, { name: 'sm', rem: '0.875rem', px: 14 },
  { name: 'base', rem: '1rem', px: 16 }, { name: 'lg', rem: '1.125rem', px: 18 },
  { name: 'xl', rem: '1.25rem', px: 20 }, { name: '2xl', rem: '1.5rem', px: 24 },
  { name: '3xl', rem: '1.875rem', px: 30 }, { name: '4xl', rem: '2.25rem', px: 36 },
  { name: '5xl', rem: '3rem', px: 48 }, { name: '6xl', rem: '3.75rem', px: 60 },
  { name: '7xl', rem: '4.5rem', px: 72 }, { name: '8xl', rem: '6rem', px: 96 },
  { name: '9xl', rem: '8rem', px: 128 },
]

const FONT_WEIGHTS = [
  { name: 'thin', value: 100 }, { name: 'extralight', value: 200 },
  { name: 'light', value: 300 }, { name: 'normal', value: 400 },
  { name: 'medium', value: 500 }, { name: 'semibold', value: 600 },
  { name: 'bold', value: 700 }, { name: 'extrabold', value: 800 },
  { name: 'black', value: 900 },
]

const OPACITY = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100]

const BREAKPOINTS = [
  { name: 'sm', px: 640, desc: 'Mobile landscape' },
  { name: 'md', px: 768, desc: 'Tablet' },
  { name: 'lg', px: 1024, desc: 'Laptop' },
  { name: 'xl', px: 1280, desc: 'Desktop' },
  { name: '2xl', px: 1536, desc: 'Large desktop' },
]

export default function DesignReference({ onCopy }) {
  const { t } = useI18n()
  return (
    <div className="sec">
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 700, letterSpacing: '-.04em', lineHeight: 1.1, marginBottom: 8 }}>{t('designRef.title')}</h1>
        <p style={{ fontSize: 14, color: 'var(--t1)', maxWidth: 540, lineHeight: 1.7 }}>
          {t('designRef.subtitle')}
        </p>
      </div>

      {/* Spacing */}
      <RefSection title="Spacing Scale" description="Based on a 4px base unit. Used for padding, margin, gap, width, height." defaultOpen>
        <div style={{ display: 'grid', gridTemplateColumns: '60px 100px 1fr', gap: '1px', background: 'var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          <div style={{ padding: '6px 10px', background: 'var(--bg-1)', fontSize: 9, fontWeight: 700, color: 'var(--t2)', letterSpacing: '.06em' }}>KEY</div>
          <div style={{ padding: '6px 10px', background: 'var(--bg-1)', fontSize: 9, fontWeight: 700, color: 'var(--t2)', letterSpacing: '.06em' }}>VALUE</div>
          <div style={{ padding: '6px 10px', background: 'var(--bg-1)', fontSize: 9, fontWeight: 700, color: 'var(--t2)', letterSpacing: '.06em' }}>VISUAL</div>
          {SPACING.map(s => (
            <div key={s.k} style={{ display: 'contents', cursor: 'pointer' }} onClick={() => onCopy(`${s.rem} /* ${s.px}px */`)}>
              <div style={{ padding: '5px 10px', background: 'var(--card)', fontSize: 11, fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--accent)' }}>{s.k}</div>
              <div style={{ padding: '5px 10px', background: 'var(--card)', fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--t1)' }}>{s.rem}</div>
              <div style={{ padding: '5px 10px', background: 'var(--card)', display: 'flex', alignItems: 'center' }}>
                <div style={{ height: 8, width: Math.min(s.px, 200), background: 'var(--accent)', borderRadius: 2, opacity: 0.6, transition: 'width .2s' }} />
                <span style={{ fontSize: 9, color: 'var(--t3)', marginLeft: 6 }}>{s.px}px</span>
              </div>
            </div>
          ))}
        </div>
      </RefSection>

      {/* Shadows */}
      <RefSection title="Box Shadows" description="Standard elevation system. Click to copy the box-shadow value.">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
          {SHADOWS.map(s => (
            <div key={s.name} onClick={() => onCopy(`box-shadow: ${s.value};`)} style={{ cursor: 'pointer', padding: 20, background: 'var(--card)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', boxShadow: s.value, transition: 'transform .15s' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: 'var(--accent)', marginBottom: 6 }}>{s.name}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t2)', lineHeight: 1.5, wordBreak: 'break-all' }}>{s.value}</div>
            </div>
          ))}
        </div>
      </RefSection>

      {/* Border Radius */}
      <RefSection title="Border Radius" description="Common border-radius values for UI components.">
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {RADII.map((r, i) => (
            <div key={r.name} onClick={() => onCopy(`border-radius: ${r.value.split(' ')[0]};`)} style={{ cursor: 'pointer', textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, background: 'var(--accent)', opacity: 0.7, borderRadius: RADII_PX[i], marginBottom: 6 }} />
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, color: 'var(--accent)' }}>{r.name}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t2)' }}>{r.value}</div>
            </div>
          ))}
        </div>
      </RefSection>

      {/* Font Sizes */}
      <RefSection title="Font Size Scale" description="Typography scale rendered at actual size. Click to copy.">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {FONT_SIZES.map(f => (
            <div key={f.name} onClick={() => onCopy(`font-size: ${f.rem}; /* ${f.px}px */`)} style={{ display: 'flex', alignItems: 'baseline', gap: 14, padding: '8px 12px', cursor: 'pointer', borderRadius: 'var(--radius-s)', transition: 'background .12s' }}>
              <div style={{ minWidth: 50, fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, color: 'var(--accent)' }}>{f.name}</div>
              <div style={{ minWidth: 80, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t2)' }}>{f.px}px</div>
              <div style={{ fontSize: Math.min(f.px, 72), lineHeight: 1.2, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', color: 'var(--t0)' }}>
                Aa
              </div>
            </div>
          ))}
        </div>
      </RefSection>

      {/* Font Weights */}
      <RefSection title="Font Weights" description="Standard weight names and values.">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {FONT_WEIGHTS.map(w => (
            <div key={w.name} onClick={() => onCopy(`font-weight: ${w.value};`)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '8px 12px', cursor: 'pointer', borderRadius: 'var(--radius-s)' }}>
              <div style={{ minWidth: 80, fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, color: 'var(--accent)' }}>{w.name}</div>
              <div style={{ minWidth: 36, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t2)' }}>{w.value}</div>
              <div style={{ fontSize: 16, fontWeight: w.value, color: 'var(--t0)' }}>The quick brown fox jumps over the lazy dog</div>
            </div>
          ))}
        </div>
      </RefSection>

      {/* Opacity */}
      <RefSection title="Opacity Scale" description="Standard opacity values from 0 to 100.">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {OPACITY.map(o => (
            <div key={o} onClick={() => onCopy(`opacity: ${(o / 100).toFixed(2)};`)} style={{ cursor: 'pointer', textAlign: 'center' }}>
              <div style={{ width: 36, height: 36, background: 'var(--accent)', opacity: o / 100, borderRadius: 6, border: '1px solid var(--border)', marginBottom: 3 }} />
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t2)' }}>{o}</div>
            </div>
          ))}
        </div>
      </RefSection>

      {/* Breakpoints */}
      <RefSection title="Screen Breakpoints" description="Responsive design breakpoints for media queries.">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {BREAKPOINTS.map(bp => (
            <div key={bp.name} onClick={() => onCopy(`@media (min-width: ${bp.px}px) { }`)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ minWidth: 40, fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>{bp.name}</div>
              <div style={{ minWidth: 60, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--t1)' }}>{bp.px}px</div>
              <div style={{ flex: 1, height: 12, borderRadius: 3, background: 'var(--bg-2)', overflow: 'hidden', position: 'relative' }}>
                <div style={{ height: '100%', width: `${(bp.px / 1536) * 100}%`, background: 'var(--accent)', opacity: 0.5, borderRadius: 3 }} />
              </div>
              <div style={{ fontSize: 10, color: 'var(--t2)', minWidth: 100 }}>{bp.desc}</div>
            </div>
          ))}
        </div>
      </RefSection>
    </div>
  )
}
