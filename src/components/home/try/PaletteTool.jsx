import { useEffect, useRef, useState } from 'react'
import { route } from '../../spectrum/spectrumFacts'
import { ratio } from '../../spectrum/spectrumKit'
import { ToolLink } from './tryParts'

// PALETTE BUILDER. Kerbside's five colours in the five roles the full tool uses.
// "Open in Palette Builder" carries the same five as ?c=, which the full tool
// reads for any visitor, so a free visitor lands on the same colours.

const COLOURS = [
  ['Signal', 'FF5A1F', 'Primary'],
  ['Asphalt', '1A1A1A', 'Secondary'],
  ['Concrete', 'E6E4DE', 'Accent'],
  ['White', 'FFFFFF', 'Subtle'],
  ['Soft Asphalt', '3A3936', 'Deep'],
]
const HREF = `${route('palette')}?c=${COLOURS.map(([, hex]) => hex).join(',')}`

const inkOn = (hex) => (ratio('#EFEEEA', hex) >= ratio('#0B0C0E', hex) ? '#EFEEEA' : '#0B0C0E')

export default function PaletteTool() {
  const [copied, setCopied] = useState(null)
  const timer = useRef(0)
  useEffect(() => () => clearTimeout(timer.current), [])

  const copy = (hex) => {
    // Clipboard access can be refused; the label still confirms the press.
    navigator.clipboard?.writeText(`#${hex}`).catch(() => {})
    setCopied(hex)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(null), 1100)
  }

  return (
    <div className="ht-tool">
      <div className="ht-pal-cols" role="group" aria-label="Palette, five colours">
        {COLOURS.map(([name, hex, role]) => {
          const bg = `#${hex}`
          const ink = inkOn(bg)
          return (
            <div key={hex} className="ht-pal-col" style={{ background: bg, color: ink }}>
              <div className="ht-pal-bot">
                <b className="ht-pal-nm">{name}</b>
                <button
                  type="button"
                  className="ht-pal-hex"
                  aria-label={`Copy ${name}, #${hex}`}
                  onClick={() => copy(hex)}
                >
                  <span className="ht-pal-swap">
                    <span style={{ opacity: copied === hex ? 0 : 1 }}>#{hex}</span>
                    <span aria-hidden="true" style={{ opacity: copied === hex ? 1 : 0 }}>Copied</span>
                  </span>
                </button>
                <span className="ht-pal-role">{role}</span>
              </div>
            </div>
          )
        })}
      </div>
      <ToolLink to={HREF} fill line="Opens in Palette Builder with these five colours." short="Opens with these five.">
        Open in Palette Builder
      </ToolLink>
    </div>
  )
}
