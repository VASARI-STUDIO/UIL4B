export const ADMIN_EMAILS = ['dylanjacob1100@gmail.com']
export const PUBLIC_OWNER_ID = 'uil4b-founder'

// Site owner(s). Keyed by lowercase email. When a matching user's name renders
// anywhere in the app, UserName upgrades it to this canonical handle + crown and
// a "Site owner" tooltip. Distinct from ADMIN_EMAILS (access control) — this is
// purely presentational identity.
export const OWNER_HANDLES = {
  'dylanjacob1100@gmail.com': {
    name: 'Dylan Coleman',
    crown: '👑',
    publicHandle: 'Dylan Coleman 👑',
    title: 'UIL4B founder',
    publicId: PUBLIC_OWNER_ID,
  },
}

export function getOwnerHandle(email) {
  if (!email) return null
  return OWNER_HANDLES[email.toLowerCase()] || null
}

export function getPublicOwner(ownerId) {
  if (!ownerId) return null
  return Object.values(OWNER_HANDLES).find((owner) => owner.publicId === ownerId) || null
}

// Flair catalog — a small tag shown next to a user's name to signal role or
// standing in the community. `group` splits pickable identity flairs from
// `earned` badges the system awards (not selectable in Settings). `tone` maps to
// a colour treatment in global.css (.flair--<tone>).
export const FLAIRS = [
  // Roles — what you do
  { id: 'designer', label: 'Designer', group: 'role', tone: 'accent' },
  { id: 'developer', label: 'Developer', group: 'role', tone: 'blue' },
  { id: 'design-engineer', label: 'Design Engineer', group: 'role', tone: 'violet' },
  { id: 'product-designer', label: 'Product Designer', group: 'role', tone: 'accent' },
  { id: 'brand-designer', label: 'Brand Designer', group: 'role', tone: 'violet' },
  { id: 'art-director', label: 'Art Director', group: 'role', tone: 'rose' },
  { id: 'creative-director', label: 'Creative Director', group: 'role', tone: 'rose' },
  { id: 'illustrator', label: 'Illustrator', group: 'role', tone: 'amber' },
  { id: 'ux-researcher', label: 'UX Researcher', group: 'role', tone: 'blue' },
  { id: 'founder', label: 'Founder', group: 'role', tone: 'amber' },
  { id: 'freelancer', label: 'Freelancer', group: 'role', tone: 'green' },
  { id: 'student', label: 'Student', group: 'role', tone: 'green' },
  { id: 'educator', label: 'Educator', group: 'role', tone: 'blue' },
  { id: 'hobbyist', label: 'Hobbyist', group: 'role', tone: 'slate' },
  // Community — how you show up here
  { id: 'community-builder', label: 'Community Builder', group: 'community', tone: 'violet' },
  { id: 'curator', label: 'Curator', group: 'community', tone: 'accent' },
  { id: 'tastemaker', label: 'Tastemaker', group: 'community', tone: 'rose' },
  { id: 'mentor', label: 'Mentor', group: 'community', tone: 'green' },
  // Earned — awarded by the system, not selectable
  { id: 'top-sharer', label: 'Top Community Sharer', group: 'earned', tone: 'gold', earned: true },
  { id: 'early-adopter', label: 'Early Adopter', group: 'earned', tone: 'gold', earned: true },
  { id: 'founding-member', label: 'Founding Member', group: 'earned', tone: 'gold', earned: true },
]

export const FLAIR_MAP = Object.fromEntries(FLAIRS.map((f) => [f.id, f]))

export function getFlair(id) {
  return id ? FLAIR_MAP[id] || null : null
}
