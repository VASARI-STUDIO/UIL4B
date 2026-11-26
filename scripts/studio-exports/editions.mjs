export const editions = {
  'contact-sheet': {
    name:'Contact Sheet', discipline:'Gallery contact sheet', scenes:['room-gallery-panel','laptop-plinth'],
    contexts:['The exhibition panel','The visitor screen'], detail:'Panel detail', screen:'Exhibition listings',
    brand:['cover','application','logo','digital','specimen','colour','composition','type','strategy','reference'],
    ui:['cover','interface','icons','colour','contrast','tints','type','components','feedback','handoff'],
    controls:'.ui-demo{border:0;border-block:1px solid currentColor}.ui-demo button,.ui-demo input:not([type=checkbox]){border-radius:0}.ui-demo button{padding-inline:22px}',
  },
  workbench: {
    name:'Workbench',discipline:'Workshop job card', scenes:['bench-clipboard-toolbox','laptop-desk-light'],
    contexts:['The job sheet','The quote desk'],detail:'Job sheet detail',screen:'Quotes and invoices',
    brand:['cover','reference','application','composition','digital','type','specimen','logo','colour','strategy'],
    ui:['cover','interface','feedback','components','type','icons','colour','contrast','tints','handoff'],
    controls:'.ui-demo{border:2px solid currentColor;border-left-width:9px}.ui-demo button,.ui-demo input:not([type=checkbox]){border-radius:0;border-width:2px}',
  },
  soundings: {
    name:'Soundings',discipline:'Wharf departure board',scenes:['wharf-sign','phone-hand'],
    contexts:['The wharf sign','The departure screen'],detail:'Sign detail',screen:'Departures',
    brand:['cover','colour','composition','application','digital','logo','type','specimen','reference','strategy'],
    ui:['cover','interface','colour','contrast','icons','components','feedback','tints','type','handoff'],
    controls:'.ui-demo{border:0;border-top:7px solid var(--color-on-surface)}.ui-demo button{border-radius:2px;padding-inline:24px}.ui-demo label{border-bottom:1px solid var(--color-border);padding-bottom:6px}',
  },
  hearth: {
    name:'Hearth',discipline:'Residential energy handbook',scenes:['letterhead-linen','room-kitchen-phone'],
    contexts:['The household letter','The home energy screen'],detail:'Letterhead detail',screen:'Installation overview',
    brand:['cover','strategy','application','digital','logo','specimen','type','colour','composition','reference'],
    ui:['cover','interface','type','components','feedback','colour','tints','contrast','icons','handoff'],
    controls:'.ui-demo{border-radius:22px;padding:28px}.ui-demo button{border-radius:24px;padding-inline:24px}.ui-demo input:not([type=checkbox]){border-radius:10px}',
  },
  offprint: {
    name:'Offprint',discipline:'Poolside print bulletin',scenes:['pool-tile-sign','phone-pool-edge'],
    contexts:['The poolside sign','The lesson screen'],detail:'Sign lettering',screen:'Lesson schedule',
    brand:['cover','specimen','composition','colour','application','digital','type','logo','reference','strategy'],
    ui:['cover','interface','type','icons','components','feedback','tints','colour','contrast','handoff'],
    controls:'.ui-demo{border:0;border-block:4px double currentColor}.ui-demo button{border-radius:0 16px 0 0}.ui-demo input:not([type=checkbox]){border-radius:0;border-bottom-width:3px}',
  },
};
