import fs from 'node:fs';
import { readLogo } from '../../src/utils/brandLogo.js';
import { readDesign, typeLadder } from '../../src/utils/styleGuideExport.js';
import { buildTokensCss, buildTokensJson, designTokens, paletteRole } from '../../src/utils/designTokens.js';
import { buildTailwindCss } from '../../src/utils/tailwindTheme.js';
import { BRANDS } from '../../api/_lib/exportThemes/brands/index.js';
import { pair, ratio, fmt } from '../../api/_lib/exportThemes/engine/color.js';
import { oflText } from '../../api/_lib/exportThemes/engine/files.js';
import { ICONS, ICONS_LICENCE } from '../../api/_lib/exportThemes/icons.js';
import { themes } from './themes.mjs';

export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const stylesheet = fs.readFileSync(new URL('./layout.css', import.meta.url), 'utf8');
const fontDir = new URL('../../api/_lib/exportThemes/fonts/', import.meta.url);
const faces = Object.values(BRANDS).flatMap(b => Object.values(b.data.fonts));
const b64 = text => Buffer.from(text).toString('base64');
const fileLink = (name, content) => `<a download="${name}" href="data:application/octet-stream;base64,${b64(content)}">${name}</a>`;
const titles = {brand:'Brand guidelines', ui:'UI style guide'};
const headings = {logo:'The mark',colour:'Colour in use',type:'The type scale',application:'Brand in practice',strategy:'Purpose and voice',components:'Component states',tints:'Tints and signals',icons:'Iconography',handoff:'Code and tokens'};
const introductions = {
  logo:'Use the supplied artwork at its original proportions. The ruled frame shows its placement on a neutral ground.',
  colour:'Read each saved colour with the ink shown on it. The ratio is measured for that pair.',
  type:'Use the two selected faces at their assigned weights. The scale gives the sizes to carry into the interface.',
  strategy:'Complete these fields with the people who own the brand. The examples illustrate the length and level of detail.',
  components:'Use a single action label through every state. The field and selection controls below can be tried in the HTML guide.',
  tints:'The primary scale and the semantic colours below come from the same token file as the components.',
  icons:'These marks belong to the selected icon set. Pair an unfamiliar symbol with a visible label.',
  handoff:'Start with the CSS in a plain website, the JSON in a token tool, or the theme file in Tailwind v4.',
};
function fontFace(family, weight) {
  const spec = faces.find(f => f.family === family && f.weights.includes(weight));
  const stem = spec && (spec.file.endsWith('-' + weight) ? spec.file : spec.file + '-' + weight);
  if (!stem || !fs.existsSync(new URL(stem + '.woff2', fontDir))) throw new Error(`Missing bundled font: ${family} ${weight}`);
  return `@font-face{font-family:"${family}";src:url(data:font/woff2;base64,${fs.readFileSync(new URL(stem+'.woff2',fontDir)).toString('base64')}) format("woff2");font-weight:${weight};font-display:block}`;
}
function ink(hex, colours) {
  const ordered = [...colours].sort((a,b) => ratio(b,hex)-ratio(a,hex));
  return ordered.find(c => ratio(c,hex)>=4.5) || (ratio('#000000',hex)>ratio('#FFFFFF',hex)?'#000000':'#FFFFFF');
}
function prompt(title, what, length, example) {
  return `<div class="prompt"><h3>${title}</h3><p>${what}</p><small>${length}</small><blockquote>Example · ${example}</blockquote></div>`;
}
function application(theme, name, headline, mark, photo) {
  const words = `<strong>${headline}</strong>`;
  if(theme==='aphrodite') return `<div class="art jacket"><div class="bookback"></div><div class="bookfront"><small>${name}</small>${words}<i aria-hidden="true"></i></div></div>`;
  if(theme==='athena') return `<div class="art drawing"><div class="drawing-mark">${mark}</div><div class="drawing-title">${words}</div></div>`;
  return `<div class="art dispatch">${photo}<div class="dispatch-slip"><small>${name}</small>${words}</div></div>`;
}
export function renderTemplate(project, themeId, product, layout) {
  const theme = themes[themeId], title = titles[product];
  if (!theme || !title || !['a4','deck'].includes(layout)) throw new Error('Unknown template selection');
  const design=project.design, d=readDesign(design), name=esc(project.name || 'Your brand');
  if(!d.palette.length) throw new Error('Select at least one project colour before exporting.');
  if(!design.fonts?.heading?.family || !design.fonts?.body?.family) throw new Error('Select the heading and body fonts before exporting.');
  const form = layout==='deck'?'16:9':'A4';
  const fontCss = [...new Set([fontFace(d.heading,d.headingWeight),fontFace(d.body,d.bodyWeight)])].join('\n');
  const license = oflText({faces:[{family:d.heading},{family:d.body}]});
  const logo = readLogo(design);
  const mark = logo ? `<img class="mark" src="${logo.src}" alt="${name} logo">` : '<div class="mark-slot"><b>UI L4B</b><span>Your logo goes here</span></div>';
  const photo = /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(project.photo || '') ? `<img class="photo" src="${project.photo}" alt="${esc(project.photoAlt || '')}">` : '';
  const headline=esc(project.headline || project.name || 'Your brand');
  const art=application(themeId,name,headline,mark,photo);
  const accent=d.base || d.palette[0], onAccent=ink(accent,d.palette);
  const opts={projectName:project.name || 'Your brand', watermark:true, date:new Date(project.date || 0), modes:true};
  const files={'tokens.css':buildTokensCss(design,opts),'tokens.json':buildTokensJson(design,opts),'tailwind.css':buildTailwindCss(design,opts)};
  if (!project.date) for (const key of ['tokens.css','tailwind.css']) files[key]=files[key].replace(/^.*Generated 1970-01-01.*\n/gm,'');
  const tokens = designTokens(design);
  function colourValue(path) {
    const token=tokens.find(t=>t.path.join('.')===path && t.type==='color');
    if(!token) throw new Error('Missing colour token '+path);
    return token.value;
  }
  const colourRows=d.palette.map((hex,i)=>{
    const fg=ink(hex,d.palette);
    return `<div class="swatch" style="--sw:${hex};--sw-ink:${fg}"><span>${esc(project.paletteNames?.[i] || paletteRole(i))}</span><code>${hex}</code><small>${fmt(pair(fg,hex))}:1 · ${fg}</small>${project.colourUses?.[i]?`<p>${esc(project.colourUses[i])}</p>`:''}</div>`;
  });
  const ladder=typeLadder(d);
  const typeContent=`<div class="typepair"><div><small>Heading · ${d.headingWeight}</small><strong>${esc(d.heading)}</strong></div><div><small>Body · ${d.bodyWeight}</small><b>${esc(d.body)}</b></div></div><div class="ladder">${ladder.map(s=>`<div><span>${esc(s.name)}</span><b style="font-family:var(${s.exp>0?'--head':'--body'});font-size:${Math.min(s.px,45)}px">${s.exp>0?'Ag':'Aa'}</b><code>${s.px} px</code></div>`).join('')}</div>`;
  const contrastTiles=(role,step)=>{
    const hex=colourValue('color.'+role+'.'+step), fg=ink(hex,d.palette);
    return `<div style="background:${hex};color:${fg}"><b>${role}</b><code>${hex}</code></div>`;
  };
  const componentCss=`.ui-demo{font-family:var(--font-body);color:var(--color-on-surface);background:var(--color-surface);padding:clamp(18px,3vw,36px);border:1px solid var(--color-border)}.ui-demo button,.ui-demo input:not([type=checkbox]){font:inherit;min-height:44px;padding:8px 14px;border-radius:4px}.ui-demo button{background:var(--color-primary);color:var(--color-on-primary);border:1px solid currentColor}.ui-demo button:hover,.ui-demo .hover{background:var(--color-primary-hover)}.ui-demo :focus-visible,.ui-demo .focus{outline:3px solid var(--color-focus);outline-offset:3px}.ui-demo button:disabled{background:var(--color-disabled);color:var(--color-on-disabled)}.ui-demo label{display:grid;gap:5px}.ui-demo input:not([type=checkbox]){color:var(--color-on-surface);background:var(--color-background);border:1px solid var(--color-border);width:100%}.ui-demo input[type=checkbox]{accent-color:var(--color-primary)}`;
  files['components.css']=componentCss;
  files['fonts.css']=fontCss;
  const action=esc(project.action || 'Save changes');
  const controls=`<div class="ui-demo"><div class="states">${['Default','Hover','Focus','Disabled'].map(k=>`<div><small>${k}</small><button type="button" class="${k.toLowerCase()}" ${k==='Disabled'?'disabled':''}>${action}</button></div>`).join('')}</div><label>${esc(project.formLabel || 'Project name')}<input value="${esc(project.formValue || project.name)}"></label><label class="check"><span><input type="checkbox" checked> Include colour values</span></label><details><summary>Implementation note</summary><p>Use a visible label and keep the focus ring clear of nearby controls.</p></details></div>`;
  const iconIds=(project.icons || []).filter(n=>typeof n==='string' && Object.hasOwn(ICONS,n));
  const section={
    cover:()=>product==='brand'?art:`<div class="mock">${mark}<strong>${esc(project.screenTitle || project.name)}</strong><p>${esc(project.screenDetail || project.headline)}</p><span class="action">${action}</span></div>`,
    logo:()=>`<figure class="logo-board">${mark}</figure><div class="caption-line"><span>Original artwork</span><span>${name}</span></div>${project.logoNote?`<p class="note">${esc(project.logoNote)}</p>`:''}`,
    type:()=>typeContent,
    application:()=>`<div class="stationery">${mark}<strong>${headline}</strong><p>${esc(project.application || 'Apply the mark and selected type to one customer touchpoint.')}</p></div>${project.imageryNote?`<div class="note"><small>Image direction</small><p>${esc(project.imageryNote)}</p></div>`:''}`,
    strategy:()=> (project.mission ? '<div class="prompt"><h3>Mission</h3><p>'+esc(project.mission)+'</p></div>' : prompt('Mission','Write who you serve and the change you make for them.','One sentence, 12 to 20 words.','We make everyday services easier to use for people opening their first business.'))+(project.voice ? '<div class="prompt"><h3>Tone of voice</h3><p>'+esc(project.voice)+'</p></div>' : prompt('Tone of voice','Choose two qualities. Show how one changes a customer message.','Two qualities and one short example.','Clear and considerate. “We’ll email you when your order is ready.”')),
    components:()=>controls,
    tints:()=>`<h3>Primary scale</h3><div class="ramp">${tokens.filter(t=>t.type==='color' && /^color\.primary\.\d+$/.test(t.path.join('.'))).map(t=>`<div style="background:${t.value};color:${ink(t.value,d.palette)}">${t.path.at(-1)}</div>`).join('')}</div><h3>Semantic colour</h3><div class="signals">${['success','warning','error','info'].map(r=>contrastTiles(r,500)).join('')}</div>`,
    icons:(ids=iconIds)=>ids.length?`<div class="icons">${ids.map(n=>`<div><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICONS[n]}</svg><span>${esc(n.replaceAll('-',' '))}</span></div>`).join('')}</div>`:prompt('Icon selection','Add icons from the project library.','One set with a short label for each icon.','Search, calendar, settings.'),
    handoff:()=>`<div class="downloads">${Object.entries(files).map(([n,s])=>fileLink(n,s)).join('')}</div><h3>Use the components</h3><pre>&lt;link rel="stylesheet" href="fonts.css"&gt;\n&lt;link rel="stylesheet" href="tokens.css"&gt;\n&lt;link rel="stylesheet" href="components.css"&gt;\n\n&lt;div class="ui-demo"&gt;\n  &lt;button&gt;${action}&lt;/button&gt;\n&lt;/div&gt;</pre>`,
  };
  const pages=[];
  for(const id of theme[product]) {
    if(id==='colour') {
      for(let i=0;i<colourRows.length;i+=6)pages.push({id:'colour',heading:headings.colour,content:'<div class="swatches">'+colourRows.slice(i,i+6).join('')+'</div>'});
    } else if(id==='icons' && iconIds.length>20) {
      for(let i=0;i<iconIds.length;i+=20) pages.push({id,heading:headings.icons,content:section.icons(iconIds.slice(i,i+20))});
    } else pages.push({id,heading:headings[id] || title,content:section[id]()});
  }
  const sheet=(pg,i)=>`<section class="sheet ${pg.id}" id="page-${i+1}"><header><span>${name}</span><span>${theme.name} / ${form}</span></header><div class="inside"><div class="heading">${pg.id==='cover'?`<small>${theme.discipline}</small><h1>${title}</h1>`:`<small>${title}</small><h2>${pg.heading}</h2>`}${introductions[pg.id]?`<p>${introductions[pg.id]}</p>`:''}</div><div class="content">${pg.content}</div></div><footer><span>Made with UI L4B</span><span>${i+1} / ${pages.length}</span></footer></section>`;
  const variables=`:root{--head:"${d.heading}";--body:"${d.body}";--hw:${d.headingWeight};--bw:${d.bodyWeight};--accent:${accent};--on-accent:${onAccent};--w:${layout==='deck'?'1280':'794'}px;--h:${layout==='deck'?'720':'1122'}px}@page{size:${layout==='deck'?'1280px 720px':'A4 portrait'};margin:0}`;
  const nav='<nav class="contents" aria-label="Guide sections">'+pages.map((p,i)=>i && pages[i-1].id!==p.id?'<a href="#page-'+(i+1)+'">'+p.heading+'</a>':'').join('')+'</nav>';
  const html=`<!doctype html><html lang="en-AU"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${name} · ${title} · ${theme.name}</title><style>${fontCss}\n${files['tokens.css'].replaceAll('<','\\\\3c ')}\n${variables}\n${stylesheet}\n${componentCss}</style><body class="${themeId} ${layout}">${nav}<main>${pages.map(sheet).join('')}</main></body></html>`;
  return {html,pages:pages.length,files:product==='ui'?files:{},license:license+(product==='ui' && iconIds.length?'\n'+ICONS_LICENCE:'')};
}
