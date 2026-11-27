import { esc } from './specimens.mjs';

export const stationery = {
  flyleaf:['card-black-paper','Publisher’s cards'], 'set-square':['bench-cards-offcuts','Site contact cards'],
  dispatch:['card-concrete','Rider cards'], doorlist:['late-box-office','Box office cards'],
  'market-day':['counter-till-cards','Counter cards'], 'contact-sheet':['card-black-paper','Gallery cards'],
  workbench:['card-steel','Workshop cards'], soundings:['card-timber-pier','Wharf cards'],
  hearth:['bench-cards-offcuts','Installer cards'], offprint:['card-concrete','Lesson cards'],
};

export function brandProfile(project,id,image){
  const caption=stationery[id][1], lead=esc(project.headline || project.name);
  return `<div class="identity-essay">${image?`<figure><img src="${image}" alt="${esc(caption)}"></figure>`:''}<div class="essay-text"><h2>${lead}</h2><p>${esc(project.profile)}</p>${image?`<small>${esc(caption)}</small>`:''}</div></div>`;
}
