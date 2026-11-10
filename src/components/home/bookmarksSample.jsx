// The Kerbside sample the window's cards print, shared by the desktop pane
// (BookmarkPanes.jsx) and the phone pane (BookmarkPhonePane.jsx). Not computed:
// they show what each tool prints.

/** Semantic colour ramps, 50 to 950; the 500 step is index 5. */
export const SEMANTIC = [
  ['Success', ['#E7F2EC', '#BDD7C4', '#96BCA0', '#70A17E', '#49865D', '#1E6B45', '#145C33', '#0C4D29', '#053E1F', '#013015']],
  ['Warning', ['#FBF0D9', '#E4CEA8', '#C9AE7F', '#AE8F56', '#93712B', '#7A5200', '#654701', '#543B00', '#442F00', '#342300']],
  ['Error', ['#FCEBEA', '#F2C6BE', '#E6A195', '#D77C6D', '#C75445', '#B42318', '#9B190D', '#820E05', '#6A0400', '#530000']],
  ['Information', ['#E9F0F8', '#C3D0E0', '#9CB2CB', '#7694B6', '#5176A0', '#2B5A8A', '#234C78', '#1B3F66', '#143354', '#0C2743']],
]

/** Tints of Signal, 50 to 950; the 500 step is index 5. */
export const TINT = ['#FFDABA', '#FFBC96', '#FF9D72', '#FF7D4D', '#EE5C1F', '#DA3500', '#B72300', '#950E00', '#750000', '#560000', '#380000']

/** Five icons (bike, pin, clock, box, check) as the shapes inside a 24px viewBox. */
export const ICON_SET = [
  <><circle cx="18.5" cy="17.5" r="3.5" /><circle cx="5.5" cy="17.5" r="3.5" /><circle cx="15" cy="5" r="1" /><path d="M12 17.5V14l-3-3 4-3 2 3h2" /></>,
  <><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></>,
  <><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>,
  <><path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z" /><path d="M12 22V12" /><path d="M3.29 7 12 12l8.71-5" /><path d="m7.5 4.27 9 5.15" /></>,
  <path d="M20 6 9 17l-5-5" />,
]
