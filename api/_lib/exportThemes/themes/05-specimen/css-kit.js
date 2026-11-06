// What is left of the old UI kit styles. Kit tokens and the engine's components are scoped under .pg .ui; the new UI kit pages and the page chrome read them.
import { colourMap, tokenGroups } from '../../engine/tokens.js';
import { componentsCss } from '../../engine/components.js';

export function cssKit(ctx) {
  const g = tokenGroups(ctx);
  const decl = (o) => Object.entries(o).map(([k, v]) => `--${k}:${v};`).join('');
  // the base chrome variables (--ink, --hair...) alias the kit tokens, so a dark .ui region turns them with it
  const alias = '--ink:var(--text);--soft:var(--text-soft);--hair:var(--divider);--accent:var(--action);--ground:var(--surface);--panel:var(--sunken);--quiet-panel:var(--quiet-sunken);';
  return `
/* kit: tokens and components under .pg */
.pg .ui{${decl(colourMap(ctx, 'light'))}${decl(g.space)}${decl(g.radius)}${decl(g.width)}${decl(g.font)}${decl(g.text)}${decl(g.shadow)}${alias}}
.pg .ui[data-theme="dark"]{${decl(colourMap(ctx, 'dark'))}}
${componentsCss(ctx).replace(/^\/\*[^\n]*\n/, '')}
.ui :where(h1,h2,h3,p,ul,ol,dl,dd){margin:0;padding:0}
.ui .ui-row__lead{border-radius:var(--r-card,0)}
.ui .ui-btn.is-hover:not(.ui-btn--quiet){text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:3px}

/* cards, navigation, lists */
.pg[data-page="lists"] .ui-row{min-height:80px}

/* feedback, table, empty */
.pg[data-page="empty"] .ui-empty{zoom:1.25}
.pg[data-page="table"] .ui-table{zoom:1.4}
.pg[data-page="table"] .ui-table td{height:76px}
.pg[data-page="table"] .ui-table th{height:52px}
.pg[data-page="table"] .ui-table td:first-child{white-space:nowrap}

`;
}
