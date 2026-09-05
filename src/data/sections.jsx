// Canonical product-surface model + a route→section resolver.
//
// UIL4B is organised as three surfaces — Workspace (create), Discover (browse),
// and Learn (understand). This file is the single source of truth for that model
// and the foundation later navigation slices build on. Keep it pure and
// dependency-free: icons are inline SVG path fragments (matching `tools.jsx`),
// rendered inside an <svg viewBox="0 0 24 24"> wrapper by the consumer.

// Order matters — this is the surface order shown in the section switcher.
export const SECTIONS = [
  {
    id: 'workspace',
    label: 'Workspace',
    home: '/dashboard',
    description: 'Create UI systems — colour, type, assets, export',
    // Grid / build icon.
    icon: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </>
    ),
  },
  {
    id: 'discover',
    label: 'Discover',
    home: '/discover',
    description: 'Browse community + curated inspiration',
    // Compass icon.
    icon: (
      <>
        <circle cx="12" cy="12" r="10" />
        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
      </>
    ),
  },
  {
    id: 'learn',
    label: 'Learn',
    home: '/learn',
    description: 'Docs, guides & design principles',
    // Open book icon.
    icon: (
      <>
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </>
    ),
  },
]

// Routes that belong to Discover. Listed exactly; prefixes handled below.
const DISCOVER_EXACT = new Set(['/discover', '/resources', '/community'])
const DISCOVER_PREFIXES = ['/discover/']

// Routes that belong to Learn (the surface landing, docs, help, info). `/docs`
// and the DocsX routes redirect to `/learn`, but they stay matched here so the
// section switcher highlights Learn during the redirect hop as well as on the
// landing itself.
const LEARN_EXACT = new Set(['/learn', '/docs', '/help', '/info'])
const LEARN_PREFIXES = ['/docs-', '/docs/', '/learn/']

/**
 * Resolve a router pathname to a product-surface id.
 *
 * Pure and defensive: tolerates trailing slashes, missing/odd input, and unknown
 * routes. Exact match is tried first, then known prefixes; everything else —
 * including product/tool/dashboard routes and marketing/auth routes (`/`,
 * `/home`, `/login`, `/settings`, `/admin`, `/checkout`, …) — resolves to the
 * default working surface, `'workspace'`.
 *
 * @param {string} pathname
 * @returns {'workspace' | 'discover' | 'learn'}
 */
export function resolveSection(pathname) {
  if (typeof pathname !== 'string' || !pathname) return 'workspace'

  // Normalise: lowercase, strip query/hash, and collapse a trailing slash
  // (but keep the root "/").
  let path = pathname.toLowerCase()
  const cut = path.search(/[?#]/)
  if (cut !== -1) path = path.slice(0, cut)
  if (path.length > 1 && path.endsWith('/')) path = path.replace(/\/+$/, '')

  if (DISCOVER_EXACT.has(path) || DISCOVER_PREFIXES.some(p => path.startsWith(p))) {
    return 'discover'
  }
  if (LEARN_EXACT.has(path) || LEARN_PREFIXES.some(p => path.startsWith(p))) {
    return 'learn'
  }

  // Default working surface for product/tool/dashboard and any unknown route.
  return 'workspace'
}
