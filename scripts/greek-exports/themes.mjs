export const themes = {
  aphrodite: {
    name: 'Aphrodite', discipline: 'Editorial folio',
    brand: ['cover','application','logo','colour','type','strategy'],
    ui: ['cover','components','colour','tints','type','icons','handoff'],
  },
  athena: {
    name: 'Athena', discipline: 'Standards manual',
    brand: ['cover','logo','type','colour','application','strategy'],
    ui: ['cover','colour','type','tints','components','icons','handoff'],
  },
  hermes: {
    name: 'Hermes', discipline: 'Field guide',
    brand: ['cover','application','colour','logo','type','strategy'],
    ui: ['cover','components','icons','type','colour','tints','handoff'],
  },
};
export const roadmap = [
  ...Object.values(themes).map(t => [t.name, t.discipline]),
  ['Apollo','Arts programme'], ['Artemis','Naturalist field journal'],
  ['Hephaestus','Workshop specification'], ['Demeter','Seasonal almanac'],
  ['Poseidon','Navigation atlas'], ['Hestia','Hospitality handbook'],
  ['Dionysus','Performance poster series'],
];
