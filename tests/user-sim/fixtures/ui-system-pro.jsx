import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import UiSystemBuilder from '../../../src/components/UiSystemBuilder'
import { HctPicker } from '../../../src/pages/PaletteBuilder'
import { ProModalProvider } from '../../../src/contexts/ProModalContext'
import { useClipboard } from '../../../src/hooks/useClipboard'
import '../../../src/styles/global.css'

export function ProFixture() {
  const [notice, setNotice] = useState('')
  const [applied, setApplied] = useState('')
  const copy = useClipboard(setNotice)
  return (
    <ProModalProvider>
      <p id="fixture-copy-status" role="status">{notice}</p>
      <p id="fixture-apply-status" role="status">{applied}</p>
      <section id="palette-hct-fixture" aria-label="Legacy Palette HCT acceptance fixture">
        <HctFixture />
      </section>
      <UiSystemBuilder
        initialSeed="#4338E0"
        isPro
        entitlementLoading={false}
        onBack={() => setNotice('Back requested')}
        onApplyBrand={scale => setApplied(scale.join(','))}
        onCopy={copy}
        toast={setNotice}
      />
    </ProModalProvider>
  )
}

export function HctFixture() {
  const [hex, setHex] = useState('#4338E0')
  return (
    <div style={{ position: 'relative', minHeight: 360 }}>
      <HctPicker hex={hex} label="FIXTURE" onChange={setHex} onClose={() => {}} />
      <output aria-label="Palette HCT output">{hex}</output>
    </div>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode><ProFixture /></StrictMode>,
)
