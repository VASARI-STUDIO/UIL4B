// The community prompt categories: the gallery overview's sections and the
// list's category chips. How many prompts a free account opens is
// GALLERY_TIER_LIMITS.free (src/utils/lockedPreview.js).
//
// `slug` is the section's address (the list state's URL hash, `#website`) and
// the value a prompt's `category` field names, so the overview can place each
// prompt once, under its main category. Primary category and `tags` decide
// membership: a list, a chip's count and a section's count include both, so a
// prompt can be listed under several categories. `desc` is the section's one
// line on the overview.
export const TAG_CATEGORIES = [
  {
    label: 'Website',
    slug: 'website',
    desc: 'One-page sites for a named business, written down to the prices, hours and footer.',
    tags: ['business', 'local', 'one-page', 'restaurant', 'portfolio', 'freelancer', 'construction', 'ecommerce', 'real-estate', 'coffee', 'fitness', 'saas', 'listing', 'property', 'landing', 'blog', 'editorial'],
  },
  {
    label: '3D & Motion',
    slug: '3d-motion',
    desc: 'Heroes that move when people scroll, point or wait, each with a still version for reduced motion.',
    tags: ['3d', 'threejs', 'animation', 'motion', 'hero', 'scroll', 'gsap', 'transitions', 'lottie', 'particles', 'wave', 'blob', 'shader', 'glsl', 'text'],
  },
  {
    label: 'UI Components',
    slug: 'ui-components',
    desc: 'Single pieces of interface, such as a dashboard or a pricing table, with every state written in.',
    tags: ['dashboard', 'cards', 'pricing', 'component', 'carousel', 'glass', 'menu', 'onboarding', 'loading', 'micro'],
  },
  {
    label: 'CSS & Visual',
    slug: 'css-visual',
    desc: 'Looks you see at a glance: hover effects, dark themes and surfaces that answer the pointer.',
    tags: ['css', 'no-js', 'gallery', 'hover', 'dark', 'interactive'],
  },
  {
    label: 'Branding',
    slug: 'branding',
    desc: 'Pages where type, colour and tone carry the brand.',
    tags: ['branding', 'identity', 'creative', 'premium', 'elegant', 'warm', 'typography'],
  },
]

