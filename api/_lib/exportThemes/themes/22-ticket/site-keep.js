// Theme 22, Ticket: which guide pages carry something real. Read from the cleaned context (site-clean.js), so an empty or half-written brand
// drops the pages that would have nothing on them instead of printing a ticket of blanks. The pages about the logo, colour, type and grid
// are always kept: the template draws those from the brand's own palette, faces and logo.
const ALWAYS = new Set(['logo', 'logo-versions', 'clear-space', 'min-size', 'logo-grounds', 'logo-misuse', 'palette', 'proportion', 'contrast',
  'colour-values', 'typefaces', 'hierarchy', 'type-in-use', 'grid', 'layouts', 'digital']);
const has = (v) => (Array.isArray(v) ? v.length > 0 : !!(v && String(v).trim()));

export function keep(ctx, id) {
  if (ctx.edition !== 'slot') return true;
  if (ALWAYS.has(id)) return true;
  const B = ctx.brand, V = B.voice || {}, L = B.lines || {}, I = B.imagery || {}, A = B.applications || {}, shots = (I.shots || []).length;
  switch (id) {
    case 'intro': return has(B.product);
    case 'personality': return has(B.personality);
    case 'voice': return has(V.principles);
    case 'write-this': return has(V.writeThis);
    case 'messaging': return has(L.primary);
    case 'summary': return has(L.primary) && has(B.personality) && has(V.principles);
    case 'type-rules': return has((B.type || {}).rules);
    case 'photo-direction': return shots > 0 && has(I.direction && I.direction.subject);
    case 'shot-list': return shots > 0;
    case 'imagery-rules': return shots > 0 && has(I.rules);
    case 'business-card': return has((A.card || {}).person) && has((A.card || {}).role) && has(B.contact && B.contact.email) && has(L.primary);
    case 'social': return has(B.social);
    case 'signage': return has(A.signage);
    case 'email-signature': return has((A.email || {}).person) && has((A.email || {}).role);
    case 'contact-scope': return has(B.contact && B.contact.email);
    default: return true;
  }
}
