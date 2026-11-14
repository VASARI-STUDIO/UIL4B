// Slot edition: guideline pages whose brand words sit in rows laid out from measured lines. A placeholder box is taller than the line it replaces,
// so on these pages every placeholder takes the engine's compact form (the `ph-tight` class on the page). Only where ctx.placeholders is on
// (the engine turned the brand's words into sentinels); the showcase edition and a slot built without placeholders print exactly as before.
export const PH_TIGHT = new Set(['cover', 'intro', 'personality', 'voice', 'write-this', 'palette', 'hierarchy', 'type-in-use', 'layouts', 'summary', 'messaging', 'contact-scope']);

export function tightenPages(guidelines, ids = PH_TIGHT) {
  for (const id of ids) {
    const f = guidelines[id];
    if (typeof f !== 'function') continue;
    guidelines[id] = function (ctx, ...rest) {
      const html = f.call(this, ctx, ...rest);
      return ctx && ctx.placeholders && typeof html === 'string' ? html.replace('<section class="', '<section class="ph-tight ') : html;
    };
  }
}
