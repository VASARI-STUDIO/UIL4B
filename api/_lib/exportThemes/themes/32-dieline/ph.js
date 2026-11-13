// Slot edition (copy placeholders): pages whose copy sits in rows laid out from the measured brand text. A descriptor block is taller than the
// sentinel it replaces, so these pages take the engine's compact form (`ph-tight` on an ancestor). Showcase pages are unchanged.
export const PH_TIGHT = new Set(['personality', 'write-this', 'palette', 'hierarchy', 'type-in-use', 'business-card', 'social', 'summary', 'contact-scope', 'photo-direction', 'shot-list', 'imagery-rules', 'layouts', 'logo', 'logo-versions', 'read-me']);
export const phTight = (ctx, id) => (ctx.placeholders && PH_TIGHT.has(String(id).replace(/-\d+$/, '')) ? ' ph-tight' : '');
