import { esc } from './specimens.mjs';
import { real } from './placeholders.mjs';

// The note under each drawing is read from the same tracks and column lines the drawing uses, so it never says more than the drawing shows.
const columns = span => { const [from,to] = span.split(' / ').map(Number); return to - from === 1 ? `column ${from}` : `columns ${from} to ${to - 1}`; };
const grids = {
  flyleaf: [6,'2 / 6','2 / 5','3 / 6'],
  'set-square': [8,'1 / 3','4 / 9','4 / 8'],
  dispatch: [4,'1 / 2','1 / 5','3 / 5'],
  doorlist: [6,'5 / 7','1 / 6','1 / 4'],
  'market-day': [5,'2 / 5','1 / 4','4 / 6'],
  'contact-sheet': [6,'1 / 3','3 / 7','3 / 5'],
  workbench: [6,'1 / 3','1 / 5','5 / 7'],
  soundings: [8,'1 / 4','2 / 8','5 / 9'],
  hearth: [4,'2 / 4','1 / 5','2 / 4'],
  offprint: [5,'4 / 6','1 / 5','2 / 5'],
};

export function gridProof(id,project,mark) {
  const [count,logo,headline,caption] = grids[id];
  const note = `${count} column grid. The mark sits in ${columns(logo)}, the headline in ${columns(headline)} and the supporting line in ${columns(caption)}.`;
  return `<div class="grid-drawing" style="--tracks:${count}"><div class="grid-lines" aria-hidden="true">${'<i></i>'.repeat(count)}</div><div class="grid-mark" style="grid-column:${logo}">${mark}</div><strong style="grid-column:${headline}">${esc(real(project.headline) || project.name)}</strong><p style="grid-column:${caption}">${esc(project.applicationLine || project.application || project.screenTitle)}</p></div><p class="grid-note">${note}</p>`;
}

export function interfaceProof(id,project) {
  const items=project.items || [];
  const entry=items[0] || {};
  const name=esc(project.name), title=esc(project.screenTitle || project.name);
  const action=`<a class="app-action" href="#try-feedback">${esc(project.action)}</a>`;
  const top=`<div class="app-nav"><b>${name}</b><span>${title}</span></div>`;
  const itemName=esc(entry.title || project.headline || project.name);
  const info=esc(entry.detail || project.screenDetail), price=esc(entry.price);
  const rows=items.slice(0,3).map(row=>`<li><b>${esc(row.title)}</b><span>${esc(row.detail)}</span><strong>${esc(row.price)}</strong></li>`).join('');
  const list=rows?`<ul class="app-register">${rows}</ul>`:'';
  let body;
  switch(id){
    case 'flyleaf':
      body=`<div class="app-body reading-room"><div><small>${title}</small><h3>${itemName}</h3><p>${info}</p></div><div class="app-buy"><b>${price}</b>${action}</div></div>`;break;
    case 'set-square':
      body=`<div class="app-body"><h3>${title}</h3>${list}<div class="app-tail">${action}</div></div>`;break;
    case 'dispatch':
      body=`<div class="app-body waybill"><div><small>${itemName}</small><h3>${info || title}</h3></div><div class="app-tail"><b>${price}</b>${action}</div></div>`;break;
    case 'doorlist':
      body=`<div class="app-body admission"><div><small>${title}</small><h3>${itemName}</h3><p>${info}</p></div><div class="ticket-entry"><b>${price}</b>${action}</div></div>`;break;
    case 'market-day':
      body=`<div class="app-body produce-list"><h3>${title}</h3>${list}${action}</div>`;break;
    case 'contact-sheet':
      body=`<div class="app-body wall-label"><small>${title}</small><h3>${itemName}</h3><div class="app-tail"><p>${info}</p><span>${price}</span></div>${action}</div>`;break;
    case 'workbench':
      body=`<div class="app-body estimate"><small>${title}</small><h3>${price || itemName}</h3><div class="app-tail"><div><b>${itemName}</b><p>${info}</p></div>${action}</div></div>`;break;
    case 'soundings':
      body=`<div class="app-body crossings"><h3>${title}</h3>${list}${action}</div>`;break;
    case 'hearth':
      body=`<div class="app-body household"><div><small>${title}</small><h3>${itemName}</h3><p>${info}</p></div><div class="app-reading"><b>${price}</b>${action}</div></div>`;break;
    case 'offprint':
      body=`<div class="app-body lesson-list"><h3>${title}</h3>${list}<div class="app-tail">${action}</div></div>`;break;
  }
  return `<div class="app-proof">${top}${body}</div>`;
}

