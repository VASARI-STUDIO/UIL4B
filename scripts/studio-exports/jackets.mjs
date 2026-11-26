import { esc } from './specimens.mjs';
import { studyNames } from './print-studies.mjs';

// Portrait jackets give wide photographs and wordmarks their own line.
export const portraitJacketStyles = {
  hearth: '@media print,(min-width:851px){.a4.hearth .jacket>.j-frame{align-self:center;aspect-ratio:1.48;width:100%}}',
  doorlist: '@media print,(min-width:851px){.a4.doorlist .gig-type{display:grid;gap:16px}.a4.doorlist .gig-type p{margin:0;max-width:none}}',
};

export function jacket(id,project,title,art,photo,caption) {
  const name=esc(project.name || 'Your brand'), line=esc(project.headline), screen=title==='UI style guide';
  const label=`<span class="j-label">${title}</span>`;
  const mast=`<h1>${name}</h1>`;
  const copy=`<p class="j-line">${screen?esc(project.screenTitle || project.name):line}</p>`;
  const source=photo?`<img src="${photo}" alt="${esc(caption)}">`:art;
  const frame=(content,cls='')=>`<figure class="j-frame ${cls}">${content}</figure>`;
  const glyph=frame(art,'j-glyph'), scene=frame(source,'j-photo');
  const piece=screen?scene:glyph;
  const first=project.items?.[0];
  const detail=esc(screen?project.action:(first?.detail || project.applicationLine));
  let inside;
  switch(id) {
    case 'flyleaf':
      inside=`<div class="book-spine">${label}</div><div class="book-title">${mast}${copy}</div>${piece}<div class="book-imprint">${esc(screen?project.formLabel:studyNames[id])}</div>`;break;
    case 'set-square':
      inside=`<div class="plan-title">${mast}${copy}</div>${piece}<div class="plan-key">${label}<span>${detail}</span></div>`;break;
    case 'dispatch':
      inside=`${scene}<div class="rider-type">${label}${mast}</div><div class="rider-strip">${glyph}${copy}</div>`;break;
    case 'doorlist':
      inside=`<div class="gig-head">${label}<span>${detail}</span></div>${piece}<div class="gig-type">${mast}${copy}</div>`;break;
    case 'market-day':
      inside=`<div class="press-title">${mast}${label}</div>${scene}<div class="press-column">${glyph}${copy}<small>${detail}</small></div>`;break;
    case 'contact-sheet':
      inside=`<div class="catalogue-strip">${label}${mast}</div>${scene}<div class="catalogue-caption">${copy}<small>${esc(screen?project.screenTitle:first?.title)}</small></div>`;break;
    case 'workbench':
      inside=`<div class="shop-label">${label}${copy}</div>${piece}<div class="shop-stamp">${mast}<span>${esc(screen?project.action:first?.price)}</span></div>`;break;
    case 'soundings':
      inside=`<div class="harbour-name">${label}${mast}</div>${piece}<div class="harbour-legend">${copy}<span>${detail}</span></div>`;break;
    case 'hearth':
      inside=`<div class="home-head">${label}</div>${scene}<div class="home-type">${mast}${copy}</div>`;break;
    case 'offprint':
      inside=`<div class="pool-name">${mast}</div>${piece}<div class="pool-end">${label}${copy}</div>`;break;
  }
  return `<div class="jacket">${inside}</div>`;
}

