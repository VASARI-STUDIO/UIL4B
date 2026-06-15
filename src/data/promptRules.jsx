// Rule packs for the AI Image Prompt Generator's JSON builder.
// Each category groups selectable rules; each rule carries a `json` fragment
// (merged into the structured output) and a `text` fragment (appended to the
// natural-language prompt). Presets are curated combinations of rule ids.

export const RULE_CATEGORIES = [
  {
    id: 'camera',
    label: 'Camera & Lens',
    icon: 'camera',
    rules: [
      { id: 'aperture-wide', label: 'Wide aperture f/1.4', json: { aperture: 'f/1.4' }, text: 'shot at f/1.4 with shallow depth of field, creamy bokeh' },
      { id: 'aperture-mid', label: 'Mid aperture f/5.6', json: { aperture: 'f/5.6' }, text: 'shot at f/5.6, balanced depth of field' },
      { id: 'aperture-narrow', label: 'Narrow aperture f/16', json: { aperture: 'f/16' }, text: 'shot at f/16, deep focus, everything sharp' },
      { id: 'lens-wide', label: 'Wide 24mm', json: { focalLength: '24mm' }, text: '24mm wide-angle lens, expansive field of view' },
      { id: 'lens-standard', label: 'Standard 50mm', json: { focalLength: '50mm' }, text: '50mm lens, natural perspective' },
      { id: 'lens-portrait', label: 'Portrait 85mm', json: { focalLength: '85mm' }, text: '85mm portrait lens, flattering compression' },
      { id: 'lens-tele', label: 'Telephoto 200mm', json: { focalLength: '200mm' }, text: '200mm telephoto, compressed background' },
      { id: 'exp-long', label: 'Long exposure', json: { exposure: 'long exposure' }, text: 'long exposure, smooth motion trails' },
      { id: 'exp-fast', label: 'Fast shutter', json: { exposure: 'fast shutter 1/2000s' }, text: 'fast shutter, frozen motion, crisp detail' },
      { id: 'iso-low', label: 'Low ISO (clean)', json: { iso: 'ISO 100' }, text: 'ISO 100, clean noise-free image' },
    ],
  },
  {
    id: 'composition',
    label: 'Composition',
    icon: 'crop',
    rules: [
      { id: 'comp-thirds', label: 'Rule of thirds', json: { composition: 'rule of thirds' }, text: 'composed using the rule of thirds' },
      { id: 'comp-golden', label: 'Golden ratio', json: { composition: 'golden ratio' }, text: 'golden ratio composition' },
      { id: 'comp-center', label: 'Centered', json: { composition: 'centered' }, text: 'centered symmetrical composition' },
      { id: 'comp-leading', label: 'Leading lines', json: { composition: 'leading lines' }, text: 'strong leading lines guiding the eye' },
      { id: 'comp-negative', label: 'Negative space', json: { composition: 'negative space' }, text: 'generous negative space, minimal' },
      { id: 'comp-closeup', label: 'Close-up', json: { framing: 'close-up' }, text: 'tight close-up framing' },
      { id: 'comp-wide', label: 'Wide shot', json: { framing: 'wide shot' }, text: 'wide establishing shot' },
      { id: 'comp-aerial', label: 'Aerial / top-down', json: { framing: 'aerial top-down' }, text: 'aerial top-down perspective' },
    ],
  },
  {
    id: 'lighting',
    label: 'Lighting',
    icon: 'sun',
    rules: [
      { id: 'light-golden', label: 'Golden hour', json: { lighting: 'golden hour' }, text: 'warm golden hour light' },
      { id: 'light-blue', label: 'Blue hour', json: { lighting: 'blue hour' }, text: 'cool blue hour twilight' },
      { id: 'light-studio', label: 'Studio softbox', json: { lighting: 'studio softbox' }, text: 'soft diffused studio softbox lighting' },
      { id: 'light-rim', label: 'Rim lighting', json: { lighting: 'rim lighting' }, text: 'dramatic rim lighting separating subject from background' },
      { id: 'light-chiaroscuro', label: 'Dramatic chiaroscuro', json: { lighting: 'chiaroscuro' }, text: 'high-contrast chiaroscuro, deep shadows' },
      { id: 'light-natural', label: 'Natural diffused', json: { lighting: 'natural diffused' }, text: 'soft natural diffused daylight' },
      { id: 'light-neon', label: 'Neon / cyberpunk', json: { lighting: 'neon' }, text: 'vibrant neon lighting, cyberpunk glow' },
      { id: 'light-volumetric', label: 'Volumetric / god rays', json: { lighting: 'volumetric god rays' }, text: 'volumetric lighting, atmospheric god rays' },
    ],
  },
  {
    id: 'render',
    label: 'Style & Render',
    icon: 'layers',
    rules: [
      { id: 'render-photo', label: 'Photorealistic', json: { style: 'photorealistic' }, text: 'photorealistic, lifelike detail' },
      { id: 'render-cinematic', label: 'Cinematic', json: { style: 'cinematic' }, text: 'cinematic color grading, film-like' },
      { id: 'render-octane', label: 'Octane render', json: { renderer: 'Octane' }, text: 'rendered in Octane, physically-based' },
      { id: 'render-unreal', label: 'Unreal Engine 5', json: { renderer: 'Unreal Engine 5' }, text: 'Unreal Engine 5, real-time ray tracing' },
      { id: 'render-anamorphic', label: 'Anamorphic', json: { lensEffect: 'anamorphic' }, text: 'anamorphic lens flares, widescreen' },
      { id: 'render-film', label: '35mm film grain', json: { medium: '35mm film' }, text: 'shot on 35mm film, organic grain' },
    ],
  },
  {
    id: 'quality',
    label: 'Quality Tags',
    icon: 'sparkle',
    rules: [
      { id: 'q-4k', label: '4K resolution', json: { resolution: '4K' }, text: '4K resolution' },
      { id: 'q-8k', label: '8K ultra HD', json: { resolution: '8K' }, text: '8K ultra HD' },
      { id: 'q-detail', label: 'Ultra-detailed', json: { detail: 'ultra-detailed' }, text: 'ultra-detailed, intricate textures' },
      { id: 'q-sharp', label: 'Sharp focus', json: { focus: 'sharp focus' }, text: 'tack-sharp focus' },
      { id: 'q-hdr', label: 'HDR', json: { dynamicRange: 'HDR' }, text: 'HDR, high dynamic range' },
      { id: 'q-raytracing', label: 'Ray tracing', json: { rendering: 'ray tracing' }, text: 'accurate ray-traced lighting' },
    ],
  },
]

export const PRESETS = [
  {
    id: 'ultra-portrait',
    label: 'Ultra-real 4K Portrait',
    desc: 'Shallow depth, golden light, razor sharp',
    rules: ['aperture-wide', 'lens-portrait', 'light-golden', 'light-rim', 'render-photo', 'q-8k', 'q-detail', 'q-sharp'],
  },
  {
    id: 'epic-landscape',
    label: 'Epic Landscape',
    desc: 'Deep focus, wide vista, HDR',
    rules: ['aperture-narrow', 'lens-wide', 'light-golden', 'comp-thirds', 'q-hdr', 'q-8k', 'render-photo'],
  },
  {
    id: 'product-shot',
    label: 'Studio Product Shot',
    desc: 'Clean softbox, centered, sharp',
    rules: ['aperture-mid', 'lens-standard', 'light-studio', 'comp-center', 'q-sharp', 'q-4k', 'render-photo'],
  },
  {
    id: 'cinematic-scene',
    label: 'Cinematic Scene',
    desc: 'Film look, dramatic, anamorphic',
    rules: ['aperture-wide', 'lens-standard', 'light-chiaroscuro', 'comp-leading', 'render-cinematic', 'render-anamorphic', 'q-4k'],
  },
  {
    id: 'cyberpunk',
    label: 'Cyberpunk Neon',
    desc: 'Neon glow, moody, ultra-detailed',
    rules: ['aperture-wide', 'lens-wide', 'light-neon', 'comp-leading', 'render-cinematic', 'q-detail', 'q-8k'],
  },
  {
    id: 'game-render',
    label: 'AAA Game Render',
    desc: 'Unreal Engine, ray-traced',
    rules: ['lens-standard', 'light-volumetric', 'comp-thirds', 'render-unreal', 'q-raytracing', 'q-8k', 'q-detail'],
  },
]

const RULE_INDEX = (() => {
  const idx = {}
  for (const cat of RULE_CATEGORIES) {
    for (const rule of cat.rules) idx[rule.id] = { ...rule, category: cat.id }
  }
  return idx
})()

export function getRule(id) {
  return RULE_INDEX[id]
}

// Assemble selected rules + brief into a structured JSON object.
export function buildPromptJson({ subject, selectedRules, style, platform }) {
  const json = { subject: subject || '' }
  if (style) json.artStyle = style
  for (const id of selectedRules) {
    const rule = RULE_INDEX[id]
    if (rule) Object.assign(json, rule.json)
  }
  if (platform) json.platform = platform
  return json
}

// Flatten selected rules + brief into a natural-language prompt string.
export function buildPromptText({ subject, selectedRules, style }) {
  const parts = []
  if (subject) parts.push(subject.trim())
  if (style) parts.push(style)
  const ordered = []
  for (const cat of RULE_CATEGORIES) {
    for (const rule of cat.rules) {
      if (selectedRules.includes(rule.id)) ordered.push(rule.text)
    }
  }
  return [...parts, ...ordered].filter(Boolean).join(', ')
}
