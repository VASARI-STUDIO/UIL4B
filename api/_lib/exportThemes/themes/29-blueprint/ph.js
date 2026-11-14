// Slot edition (copy placeholders): pages whose copy sits in rows laid out from the measured brand text. A descriptor block is taller than the
// sentinel it replaces, so these pages take the engine's compact form (`ph-tight` on an ancestor). Showcase pages are unchanged.
export const PH_TIGHT = new Set(['read-me', 'photography', 'write-this', 'messaging', 'palette', 'typefaces', 'hierarchy', 'type-in-use', 'type-rules', 'photo-direction', 'shot-list', 'layouts', 'email-signature', 'summary']);
export const phTight = (ctx, id) => (ctx.placeholders && PH_TIGHT.has(String(id).replace(/-\d+$/, '')) ? ' ph-tight' : '');
