// Rule packs for the AI Landing Page Prompt Generator. Produces structured
// JSON prompts for generating AAA-tier websites with AI builders (v0, Lovable,
// Bolt, Claude artifacts, etc.). Mirrors the image prompt builder pattern.

export const LP_CATEGORIES = [
  {
    id: 'type',
    label: 'Site Type',
    single: true, // radio-style: pick one
    rules: [
      { id: 'type-saas', label: 'SaaS product', json: { siteType: 'SaaS product landing page' }, text: 'a modern SaaS product landing page' },
      { id: 'type-agency', label: 'Agency / studio', json: { siteType: 'creative agency' }, text: 'a creative agency / studio website' },
      { id: 'type-portfolio', label: 'Portfolio', json: { siteType: 'portfolio' }, text: 'a personal portfolio site' },
      { id: 'type-ecom', label: 'E-commerce', json: { siteType: 'e-commerce storefront' }, text: 'an e-commerce storefront' },
      { id: 'type-startup', label: 'Startup', json: { siteType: 'startup launch page' }, text: 'a startup launch / waitlist page' },
      { id: 'type-local', label: 'Local business', json: { siteType: 'local business' }, text: 'a local business website' },
      { id: 'type-app', label: 'Mobile app', json: { siteType: 'mobile app marketing' }, text: 'a mobile app marketing site' },
    ],
  },
  {
    id: 'aesthetic',
    label: 'Aesthetic',
    single: true,
    rules: [
      { id: 'aes-minimal', label: 'Clinical minimal', json: { aesthetic: 'clinical minimal' }, text: 'clinical, minimal aesthetic with generous whitespace' },
      { id: 'aes-bold', label: 'Bold & modern', json: { aesthetic: 'bold modern' }, text: 'bold, modern design with strong typography' },
      { id: 'aes-glass', label: 'Glassmorphism', json: { aesthetic: 'glassmorphism' }, text: 'glassmorphism with frosted blur layers' },
      { id: 'aes-luxury', label: 'Luxury / editorial', json: { aesthetic: 'luxury editorial' }, text: 'luxury editorial style, refined and elegant' },
      { id: 'aes-brutalist', label: 'Neo-brutalist', json: { aesthetic: 'neo-brutalist' }, text: 'neo-brutalist with raw blocks and hard edges' },
      { id: 'aes-playful', label: 'Playful', json: { aesthetic: 'playful' }, text: 'playful, friendly design with rounded shapes' },
      { id: 'aes-corporate', label: 'Corporate', json: { aesthetic: 'corporate' }, text: 'clean corporate, trustworthy and professional' },
    ],
  },
  {
    id: 'sections',
    label: 'Sections',
    rules: [
      { id: 'sec-hero', label: 'Hero', json: { sections: 'hero' }, text: 'a striking hero with headline and CTA' },
      { id: 'sec-features', label: 'Features', json: { sections: 'features' }, text: 'a features grid' },
      { id: 'sec-pricing', label: 'Pricing', json: { sections: 'pricing' }, text: 'a pricing table' },
      { id: 'sec-testimonials', label: 'Testimonials', json: { sections: 'testimonials' }, text: 'social-proof testimonials' },
      { id: 'sec-logos', label: 'Logo cloud', json: { sections: 'logo cloud' }, text: 'a trusted-by logo cloud' },
      { id: 'sec-faq', label: 'FAQ', json: { sections: 'FAQ' }, text: 'an FAQ accordion' },
      { id: 'sec-cta', label: 'CTA banner', json: { sections: 'CTA banner' }, text: 'a final call-to-action banner' },
      { id: 'sec-footer', label: 'Footer', json: { sections: 'footer' }, text: 'a comprehensive footer' },
      { id: 'sec-stats', label: 'Stats', json: { sections: 'stats' }, text: 'an animated stats / metrics row' },
    ],
  },
  {
    id: 'color',
    label: 'Colour Mood',
    single: true,
    rules: [
      { id: 'col-dark', label: 'Dark premium', json: { colorMood: 'dark premium' }, text: 'a dark premium palette with a vivid accent' },
      { id: 'col-light', label: 'Light & airy', json: { colorMood: 'light airy' }, text: 'a light, airy palette' },
      { id: 'col-mono', label: 'Monochrome', json: { colorMood: 'monochrome' }, text: 'a monochrome palette with one accent' },
      { id: 'col-vibrant', label: 'Vibrant gradient', json: { colorMood: 'vibrant gradient' }, text: 'vibrant gradients and saturated colour' },
      { id: 'col-earthy', label: 'Earthy / warm', json: { colorMood: 'earthy warm' }, text: 'an earthy, warm natural palette' },
      { id: 'col-pastel', label: 'Soft pastel', json: { colorMood: 'soft pastel' }, text: 'soft pastel tones' },
    ],
  },
  {
    id: 'type-style',
    label: 'Typography',
    single: true,
    rules: [
      { id: 'font-sans', label: 'Modern sans', json: { typography: 'modern sans-serif' }, text: 'a modern sans-serif typeface' },
      { id: 'font-serif', label: 'Elegant serif', json: { typography: 'elegant serif headings' }, text: 'elegant serif headings with sans body' },
      { id: 'font-mono', label: 'Mono accents', json: { typography: 'monospace accents' }, text: 'monospace accents for a technical feel' },
      { id: 'font-display', label: 'Display / expressive', json: { typography: 'expressive display' }, text: 'an expressive display typeface for impact' },
    ],
  },
  {
    id: 'interaction',
    label: 'Interactions & Quality',
    rules: [
      { id: 'int-scroll', label: 'Scroll animations', json: { interactions: 'scroll reveal' }, text: 'subtle scroll-reveal animations' },
      { id: 'int-parallax', label: 'Parallax', json: { interactions: 'parallax' }, text: 'parallax depth effects' },
      { id: 'int-hover', label: 'Micro-interactions', json: { interactions: 'micro-interactions' }, text: 'polished hover micro-interactions' },
      { id: 'int-responsive', label: 'Fully responsive', json: { responsive: true }, text: 'fully responsive across mobile, tablet and desktop' },
      { id: 'int-a11y', label: 'WCAG accessible', json: { accessibility: 'WCAG AA' }, text: 'WCAG AA accessible with semantic HTML' },
      { id: 'int-perf', label: 'Performance-first', json: { performance: 'optimised' }, text: 'performance-optimised, lightweight assets' },
      { id: 'int-darkmode', label: 'Dark mode toggle', json: { darkMode: true }, text: 'a dark / light mode toggle' },
    ],
  },
]

export const LP_PRESETS = [
  {
    id: 'aaa-saas',
    label: 'AAA SaaS Launch',
    desc: 'Dark premium, full sections, animated',
    rules: ['type-saas', 'aes-bold', 'col-dark', 'font-sans', 'sec-hero', 'sec-features', 'sec-pricing', 'sec-testimonials', 'sec-cta', 'sec-footer', 'int-scroll', 'int-hover', 'int-responsive', 'int-a11y'],
  },
  {
    id: 'luxury-brand',
    label: 'Luxury Brand',
    desc: 'Editorial, serif, refined',
    rules: ['type-agency', 'aes-luxury', 'col-mono', 'font-serif', 'sec-hero', 'sec-features', 'sec-testimonials', 'sec-footer', 'int-parallax', 'int-responsive'],
  },
  {
    id: 'startup-waitlist',
    label: 'Startup Waitlist',
    desc: 'Vibrant, focused, single CTA',
    rules: ['type-startup', 'aes-playful', 'col-vibrant', 'font-display', 'sec-hero', 'sec-stats', 'sec-cta', 'sec-footer', 'int-scroll', 'int-responsive'],
  },
  {
    id: 'clinical-corporate',
    label: 'Clinical Corporate',
    desc: 'Minimal, light, trustworthy',
    rules: ['type-saas', 'aes-minimal', 'col-light', 'font-sans', 'sec-hero', 'sec-logos', 'sec-features', 'sec-faq', 'sec-footer', 'int-responsive', 'int-a11y', 'int-perf'],
  },
  {
    id: 'portfolio-showcase',
    label: 'Portfolio Showcase',
    desc: 'Minimal, expressive, dark',
    rules: ['type-portfolio', 'aes-minimal', 'col-dark', 'font-display', 'sec-hero', 'sec-stats', 'sec-footer', 'int-scroll', 'int-hover', 'int-responsive', 'int-darkmode'],
  },
]

const LP_INDEX = (() => {
  const idx = {}
  for (const cat of LP_CATEGORIES) for (const rule of cat.rules) idx[rule.id] = { ...rule, category: cat.id }
  return idx
})()

// Merge rule json fragments. `sections` accumulates into an array since many
// can be selected; single-value keys overwrite.
export function buildLandingJson({ brief, selectedRules, audience }) {
  const json = { goal: brief || '', sections: [] }
  if (audience) json.targetAudience = audience
  for (const id of selectedRules) {
    const rule = LP_INDEX[id]
    if (!rule) continue
    for (const [k, v] of Object.entries(rule.json)) {
      if (k === 'sections') json.sections.push(v)
      else json[k] = v
    }
  }
  if (!json.sections.length) delete json.sections
  return json
}

export function buildLandingText({ brief, selectedRules, audience }) {
  let out = 'Build a AAA-tier, production-ready website'
  const typeRule = selectedRules.map(id => LP_INDEX[id]).find(r => r?.category === 'type')
  if (typeRule) out = `Build a AAA-tier, production-ready ${typeRule.text.replace(/^a |^an /, '')}`
  if (brief) out += ` for ${brief.trim()}`
  if (audience) out += `, targeting ${audience.trim()}`
  const descriptors = selectedRules
    .map(id => LP_INDEX[id])
    .filter(r => r && r.category !== 'type' && r.category !== 'sections')
    .map(r => r.text)
  if (descriptors.length) out += `. Use ${descriptors.join(', ')}`
  const sections = selectedRules.map(id => LP_INDEX[id]).filter(r => r?.category === 'sections').map(r => r.text)
  if (sections.length) out += `. Include ${sections.join(', ')}`
  return out + '.'
}
