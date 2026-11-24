export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function listing(item) {
  return `<div class="listing"><div><b>${esc(item.title)}</b><span>${esc(item.detail)}</span></div><strong>${esc(item.price)}</strong></div>`;
}

export function coverArtwork(id, project, mark, photo) {
  const name=esc(project.name), headline=esc(project.headline || project.name);
  const [lead]=project.items || [];
  switch (id) {
    case 'flyleaf':
      return `<div class="art jacket"><div class="bookback"></div><div class="bookfront"><small>${name}</small><strong>${esc(lead?.title || project.headline || project.name)}</strong><i aria-hidden="true"></i></div></div>`;
    case 'set-square':
      return `<div class="art drawing"><div class="drawing-mark">${mark}</div><div class="drawing-title"><strong>${headline}</strong></div></div>`;
    case 'dispatch':
      return `<div class="art dispatch">${photo}<div class="dispatch-slip"><small>${name}</small><strong>${headline}</strong></div></div>`;
    case 'doorlist':
      return `<div class="art gig"><div class="gig-face"><small>${name}</small><strong>${esc(lead?.title || project.name)}</strong><p>${esc(lead?.detail || project.headline)}</p></div><div class="gig-stub"><span>${esc(project.action || project.name)}</span><b>${esc(lead?.price)}</b></div></div>`;
    case 'market-day':
      return `<div class="art broadside"><div class="masthead">${esc(project.applicationLine || project.name)}</div><div class="broadside-lead"><strong>${esc(lead?.title || project.headline || project.name)}</strong><span>${esc(lead?.price)}</span></div><p>${esc(lead?.detail || project.headline)}</p></div>`;
  }
}

export function appSpecimen(project, mark, interactive=false) {
  const items=(project.items || []).slice(0,2);
  return `<div class="mock">${mark}<strong>${esc(project.screenTitle || project.name)}</strong><p>${esc(project.screenDetail || project.headline)}</p><div class="mock-list">${items.map(listing).join('')}</div>${interactive?'<a class="action" href="#try-feedback">'+esc(project.action || 'Save changes')+'</a>':'<span class="action">'+esc(project.action || 'Save changes')+'</span>'}</div>`;
}

export function applicationSpecimen(id, project, mark) {
  const items=project.items || [];
  const labels={flyleaf:'Publisher’s insert','set-square':'Site notice',dispatch:'Delivery slip',doorlist:'Box office ticket','market-day':'Counter card'};
  const instructions={flyleaf:'Set the book title first. Keep the author and publication detail together on the line below.','set-square':'Keep the job address and start date together so the site team can check the notice at a glance.',dispatch:'Place the destination above the delivery time. Set the charge on the same row for quick reconciliation.',doorlist:'Set the act in display type. Keep the venue, date and price together for the box office.','market-day':'Lead with the produce and its origin. Keep the price and unit together at the counter.'};
  const heading=esc(items[0]?.title || project.applicationLine || project.headline || project.name);
  const more=id==='market-day'?items.slice(1,2):[];
  const details=items[0]?`<div class="purchase-line"><span>${esc(items[0].detail)}</span><b>${esc(items[0].price)}</b></div>`:'';
  return `<figure class="stationery">${mark}<strong>${heading}</strong>${details}${more.map(listing).join('')}</figure><div class="note"><small>${labels[id]}</small><p>${esc(items.length ? instructions[id] : (project.application || 'Use the mark and selected type together on the same customer touchpoint.'))}</p></div>`;
}

export function identityReference(project, design, mark) {
  const colours=design.palette.map((hex,i)=>`<li><i style="background:${hex}"></i><span>${esc(project.paletteNames?.[i] || hex)}</span><code>${hex}</code></li>`);
  return `<div class="identity-reference"><div class="reference-mark">${mark}</div><div class="reference-type"><small>Heading · ${design.headingWeight}</small><strong>${esc(design.heading)}</strong><small>Body · ${design.bodyWeight}</small><span>${esc(design.body)}</span></div><ul>${colours.join('')}</ul></div>`;
}

export function formExample(project) {
  const label=esc(project.formLabel || 'Project name');
  return `<form id="try-feedback" class="ui-demo feedback-form" novalidate><label>${label}<input name="entry" required autocomplete="off" aria-describedby="field-response"></label><button type="submit">${esc(project.action || 'Save changes')}</button><output id="field-response" aria-live="polite"></output></form>`;
}
export const formScript = `for(const form of document.querySelectorAll('.feedback-form')){
  const field=form.elements.entry, response=form.querySelector('output');
  form.addEventListener('submit',event=>{
    event.preventDefault();
    const valid=field.value.trim().length>0;
    field.setAttribute('aria-invalid',String(!valid));
    response.textContent=valid?'Example submitted.':'Enter a value to continue.';
    if(!valid)field.focus();
  });
  field.addEventListener('input',()=>{field.removeAttribute('aria-invalid');response.textContent='';});
}`;
