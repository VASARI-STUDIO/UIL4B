// Sample brand data for the export themes.
export default {
 "name": "Saltbush",
 "slug": "saltbush",
 "theme": "03-broadsheet",
 "version": {
  "number": "1.0",
  "date": "2026-11-01"
 },
 "description": "Saltbush is a native-food grocer in Adelaide. It sells what is in season from South Australian growers, by the handful or the bunch, at the counter from seven and online as a weekly box.",
 "product": "Order a box, choose a pick-up time, and see what is in this week.",
 "audience": "Adelaide cooks, cafes and households who want native ingredients and want to know where they were grown.",
 "city": "Adelaide",
 "lines": {
  "primary": "Grown here. Sold by the handful.",
  "others": [
   "Open at seven, closed when it's gone.",
   "In this week: finger limes from the Riverland."
  ]
 },
 "personality": [
  {
   "trait": "Seasonal",
   "means": "We sell what came in. Every list says what is in this week and where it grew, and says so plainly when it is gone."
  },
  {
   "trait": "Plain",
   "means": "A number and a measure. $6 a handful, never 'from' and never an asterisk."
  },
  {
   "trait": "Local",
   "means": "We name the grower's region: the Riverland, the Coorong, the Adelaide Hills. The produce is the news."
  }
 ],
 "voice": {
  "principles": [
   {
    "title": "Say what's in",
    "example": "Finger limes in from the Riverland."
   },
   {
    "title": "Plain prices",
    "example": "$6 a handful."
   },
   {
    "title": "Say when it's gone",
    "example": "Muntries are gone for today. More on Saturday."
   },
   {
    "title": "Say where it grew",
    "example": "Quandongs, Port Augusta, picked Thursday."
   }
  ],
  "writeThis": [
   {
    "write": "Finger limes in from the Riverland.",
    "not": "Discover our range of native superfoods!",
    "because": "The produce is the news. Lead with what came in and where it grew."
   },
   {
    "write": "$6 a handful.",
    "not": "Starting from just $5.99*",
    "because": "A number and a measure. No 'from', no asterisks."
   },
   {
    "write": "Muntries are gone for today. More on Saturday.",
    "not": "Oops! This item is currently unavailable.",
    "because": "Selling out is the shop working. Say so, and say when more comes in."
   },
   {
    "write": "Order a box, $38",
    "not": "Submit",
    "because": "A button names what happens when you press it."
   },
   {
    "write": "Open at seven, closed when it's gone.",
    "not": "Our opening hours may vary.",
    "because": "Say it the way the counter says it."
   }
  ],
  "boilerplate25": "Saltbush is a native-food grocer in Adelaide, selling what is in season from local growers by the handful. Open at seven, closed when it's gone.",
  "boilerplate50": "Saltbush is a native-food grocer in Adelaide. We sell what is in season from South Australian growers, by the handful or the bunch, and we tell you where each thing was grown. Order a box online and pick it up at the counter. Open at seven, closed when it's gone.",
  "nameRules": "Write Saltbush with a capital S in running text. Set the name in the display face, in sentence case, as the wordmark. Never SALTBUSH in capitals, never Salt Bush, never Saltbush Grocer."
 },
 "colours": [
  {
   "id": "newsprint",
   "name": "Newsprint",
   "hex": "#F3EFE6",
   "role": "ground",
   "lands": "Every page and every screen ground.",
   "share": 0.7
  },
  {
   "id": "bluestone",
   "name": "Bluestone",
   "hex": "#20231F",
   "role": "text",
   "lands": "Text, the wordmark, every rule, a button on hover.",
   "share": 0.15
  },
  {
   "id": "quandong",
   "name": "Quandong",
   "hex": "#B8361F",
   "role": "action",
   "lands": "The Order a box button, every price, the rule under each page head.",
   "share": 0.1
  },
  {
   "id": "wattle",
   "name": "Wattle",
   "hex": "#E8B83A",
   "role": "mark",
   "lands": "The In this week mark. Fill only: never type, never a rule.",
   "share": 0.05
  }
 ],
 "tones": [
  {
   "id": "soft",
   "name": "Soft Bluestone",
   "hex": "#3A3D37",
   "role": "reading text",
   "lands": "Paragraphs on Newsprint and Stone."
  },
  {
   "id": "quiet",
   "name": "Quiet on Newsprint",
   "hex": "#5E5B52",
   "role": "quiet text",
   "lands": "Captions, folios and help text on Newsprint."
  },
  {
   "id": "white",
   "name": "White",
   "hex": "#FFFFFF",
   "role": "label",
   "lands": "The label on Quandong and on a Bluestone hover."
  },
  {
   "id": "stone",
   "name": "Stone",
   "hex": "#E4DDCF",
   "role": "panel",
   "lands": "Photo slots and quiet panels."
  },
  {
   "id": "quiet-stone",
   "name": "Quiet on Stone",
   "hex": "#57544B",
   "role": "quiet text",
   "lands": "Captions inside a photo slot or panel."
  }
 ],
 "pairs": [
  {
   "fg": "bluestone",
   "bg": "newsprint",
   "use": "Body text, headlines"
  },
  {
   "fg": "soft",
   "bg": "newsprint",
   "use": "Paragraphs"
  },
  {
   "fg": "quiet",
   "bg": "newsprint",
   "use": "Captions, running heads, folios"
  },
  {
   "fg": "quandong",
   "bg": "newsprint",
   "use": "Prices, error help"
  },
  {
   "fg": "white",
   "bg": "quandong",
   "use": "Order a box label"
  },
  {
   "fg": "bluestone",
   "bg": "wattle",
   "use": "The In this week mark"
  },
  {
   "fg": "newsprint",
   "bg": "bluestone",
   "use": "Reversed text"
  },
  {
   "fg": "white",
   "bg": "bluestone",
   "use": "Button label on hover"
  },
  {
   "fg": "bluestone",
   "bg": "stone",
   "use": "Text on panels"
  },
  {
   "fg": "quiet-stone",
   "bg": "stone",
   "use": "Captions on panels"
  }
 ],
 "fonts": {
  "display": {
   "family": "Young Serif",
   "weights": [
    400
   ],
   "file": "YoungSerif",
   "css": "Young+Serif"
  },
  "body": {
   "family": "Karla",
   "weights": [
    400,
    500,
    700
   ],
   "file": "Karla",
   "css": "Karla:wght@400;500;700"
  },
  "mono": {
   "family": "Courier Prime",
   "weights": [
    400
   ],
   "file": "CourierPrime",
   "css": "Courier+Prime:wght@400"
  }
 },
 "type": {
  "scale": [
   {
    "token": "nameplate",
    "size": 112,
    "line": 0.9,
    "weight": 400,
    "face": "display",
    "use": "The front page nameplate, once"
   },
   {
    "token": "headline",
    "size": 56,
    "line": 1.02,
    "weight": 400,
    "face": "display",
    "use": "A page's one big line"
   },
   {
    "token": "title",
    "size": 26,
    "line": 1.1,
    "weight": 400,
    "face": "display",
    "use": "Titles inside a piece"
   },
   {
    "token": "lead",
    "size": 19,
    "line": 1.35,
    "weight": 500,
    "face": "body",
    "use": "The deck under a headline"
   },
   {
    "token": "body",
    "size": 14,
    "line": 1.55,
    "weight": 400,
    "face": "body",
    "use": "Reading text"
   },
   {
    "token": "caption",
    "size": 12,
    "line": 1.4,
    "weight": 400,
    "face": "chrome",
    "use": "Running heads, folios, captions"
   }
  ],
  "sample": {
   "headline": "Finger limes in from the Riverland.",
   "paragraph": "Open at seven, closed when it's gone. This week the counter has finger limes from the Riverland, warrigal greens from the Adelaide Hills and quandongs from Port Augusta, by the handful or the bunch.",
   "caption": "Quandongs, Port Augusta, picked Thursday."
  },
  "rules": [
   {
    "do": "Set the display face in sentence case, always.",
    "dont": "Set headlines or the name in capitals."
   },
   {
    "do": "Keep display tracking at minus 0.01 em, one or two lines.",
    "dont": "Letter-space the display face."
   },
   {
    "do": "Use 14 px for reading text, 12 px for captions. Nothing smaller.",
    "dont": "Set body copy under 12 px."
   },
   {
    "do": "Use weight and the quiet colour for secondary text.",
    "dont": "Fade text with opacity."
   },
   {
    "do": "Use the mono face for a hex, a token or a code string only.",
    "dont": "Set labels or prices in mono."
   }
  ]
 },
 "logo": {
  "idea": "The name stands in Young Serif with a sprig of saltbush beside it, a stem and pairs of small leaves. The sprig is always on the right of the name in the main lockup, and the name is never set in capitals.",
  "showcase": {
   "wordmark": "Saltbush",
   "symbolNote": "The symbol is the S with the sprig beside it.",
   "minScreenPx": 96,
   "minPrintMm": 24
  },
  "colourways": {
   "colour": {
    "name": "#20231F",
    "mark": "#B8361F",
    "ground": "#F3EFE6"
   },
   "mono-dark": {
    "name": "#20231F",
    "mark": "#20231F",
    "ground": "#F3EFE6"
   },
   "mono-light": {
    "name": "#F3EFE6",
    "mark": "#F3EFE6",
    "ground": "#20231F"
   },
   "reversed": {
    "name": "#F3EFE6",
    "mark": "#E8B83A",
    "ground": "#20231F"
   },
   "on-wattle": {
    "name": "#20231F",
    "mark": "#20231F",
    "ground": "#E8B83A"
   },
   "on-quandong": {
    "name": "#FFFFFF",
    "mark": "#FFFFFF",
    "ground": "#B8361F"
   }
  },
  "when": {
   "colour": "The default. On Newsprint and on light photos.",
   "mono-dark": "One colour printing, stamps and paper bags. On light grounds that cannot carry Quandong.",
   "mono-light": "On photos and dark grounds that cannot carry Wattle.",
   "reversed": "On Bluestone. Newsprint name, Wattle sprig.",
   "horizontal": "Headers, email signatures and wide, short spaces.",
   "stacked": "Squarer spaces: profile images, bag labels, the shop window.",
   "symbol": "Where the name is already nearby: favicon, stamp, app icon."
  }
 },
 "imagery": {
  "direction": {
   "subject": "The produce and the counter: a handful of quandongs, a paper bag passed across, hands weighing leaves. The food is the subject, not the shop.",
   "light": "Morning light from a window at opening, flat and honest. No studio, no flash.",
   "crop": "Close and square on the produce, with the counter edge in frame. Leave a clear side for one line of type.",
   "colour": "Photographs print in black and white. Quandong and Wattle come only from the page.",
   "people": "Our staff and our growers at work, never posed. Hands before faces."
  },
  "shots": [
   {
    "id": "quandongs",
    "slot": "A handful of quandongs on the shop counter at opening. Close, square crop, the counter edge across the lower third. Morning light from the left, black and white."
   },
   {
    "id": "bag",
    "slot": "A paper bag of saltbush passed across the counter mid-sale. Side-on at waist height, crop tight to the hands and the bag. Flat window light, black and white."
   },
   {
    "id": "grower",
    "slot": "A grower in the Riverland holding a tray of finger limes. Wide enough to show the rows behind. Late afternoon light, black and white."
   },
   {
    "id": "scale",
    "slot": "Warrigal greens on the scale. Top-down, the dial and the leaves filling the frame. Even daylight, black and white."
   },
   {
    "id": "chalkboard",
    "slot": "The in-this-week board by the door. Straight on, the list and the prices legible. Overcast light, black and white."
   },
   {
    "id": "box",
    "slot": "A packed box on the counter at ten to seven, lid open. Three-quarter view from above, the pick-up name on the lid. Window light, black and white."
   }
  ],
  "rules": [
   {
    "do": "Print photographs in black and white.",
    "dont": "Add colour or a tint to a photograph."
   },
   {
    "do": "Show the produce close, with the counter in frame.",
    "dont": "Shoot on a plain studio backdrop."
   },
   {
    "do": "Crop to hands and food, and leave room for one line of type.",
    "dont": "Put a headline across a face."
   },
   {
    "do": "Use a photograph or a flat Newsprint behind the logo.",
    "dont": "Set the logo on a busy part of the image."
   }
  ]
 },
 "layout": {
  "page": {
   "w": 1280,
   "h": 720
  },
  "margin": 52,
  "columns": 12,
  "gutter": 24,
  "base": 4
 },
 "ui": {
  "rowIcon": "shopping-basket",
  "radius": {
   "control": 0,
   "card": 0
  },
  "border": 1,
  "spacingBase": 4,
  "shadows": "none",
  "icons": [
   "map-pin",
   "clock",
   "package",
   "phone",
   "user",
   "calendar",
   "search",
   "check",
   "x",
   "plus",
   "menu",
   "chevron-right",
   "arrow-right",
   "triangle-alert",
   "info",
   "shopping-basket"
  ],
  "light": {
   "surface": "#F3EFE6",
   "raised": "#FAF7F0",
   "sunken": "#E4DDCF",
   "text": "#20231F",
   "textSoft": "#3A3D37",
   "quiet": "#5E5B52",
   "quietOnSunken": "#57544B",
   "border": "#20231F",
   "divider": "#CFC8B8",
   "action": "#B8361F",
   "actionHover": "#20231F",
   "actionPressed": "#8E2A17",
   "actionLabel": "#FFFFFF",
   "focus": "#20231F",
   "disabledBg": "#E4DDCF",
   "disabledText": "#57544B",
   "scrim": "#20231F",
   "success": {
    "fg": "#20231F",
    "bg": "#E4DDCF"
   },
   "warning": {
    "fg": "#B8361F",
    "bg": "#FBF3EA"
   },
   "danger": {
    "fg": "#9A2D18",
    "bg": "#F6E1DA"
   },
   "info": {
    "fg": "#20231F",
    "bg": "#E8B83A"
   }
  },
  "dark": {
   "surface": "#181A17",
   "raised": "#20231F",
   "sunken": "#121411",
   "text": "#F3EFE6",
   "textSoft": "#D6D1C4",
   "quiet": "#A9A497",
   "quietOnSunken": "#A9A497",
   "border": "#8F8A7C",
   "divider": "#3A3D37",
   "action": "#E8694F",
   "actionHover": "#F08A72",
   "actionPressed": "#DE5F45",
   "actionLabel": "#181A17",
   "focus": "#F3EFE6",
   "disabledBg": "#2A2D27",
   "disabledText": "#A9A497",
   "scrim": "#0B0C0A",
   "success": {
    "fg": "#E4DDCF",
    "bg": "#2E332B"
   },
   "warning": {
    "fg": "#F0906E",
    "bg": "#3D2019"
   },
   "danger": {
    "fg": "#FF9C8A",
    "bg": "#431C16"
   },
   "info": {
    "fg": "#E8B83A",
    "bg": "#3A2E10"
   }
  },
  "status": [
   {
    "id": "in-this-week",
    "label": "In this week",
    "tone": "info"
   },
   {
    "id": "few-left",
    "label": "Few left",
    "tone": "warning"
   },
   {
    "id": "packed",
    "label": "Packed, ready at 7:00",
    "tone": "success"
   },
   {
    "id": "short",
    "label": "Short today",
    "tone": "danger"
   }
  ],
  "elevationNote": "Saltbush draws rules, not shadows. Grounds step from Newsprint to Stone, and anything that floats gets a 1 px Bluestone edge.",
  "screen": {
   "title": "In this week",
   "content": {
    "time": "6:52",
    "status": "Packed, ready at 7:00",
    "eta": "Ready at 7:00",
    "pickup": "Packed at 6:50 for pick-up at the counter.",
    "from": "Riverland",
    "to": "Counter",
    "progress": 0.6,
    "rider": "Ruth Tan, order 214",
    "initials": "RT",
    "riderNote": "Saturday 7 Nov, 7:00",
    "call": "Call",
    "deliverToLabel": "Pick up",
    "deliverTo": "Saturday 7 Nov, 7:00",
    "paidLabel": "Total",
    "paid": "$38",
    "share": "See last week",
    "deliveries": [
     {
      "to": "Finger limes, Riverland",
      "when": "At the counter from 7 am Saturday",
      "price": "$6 a handful",
      "status": "in-this-week"
     },
     {
      "to": "Warrigal greens, Adelaide Hills",
      "when": "At the counter from 7 am Saturday",
      "price": "$4 a bunch",
      "status": "in-this-week"
     },
     {
      "to": "Saltbush leaves, Coorong",
      "when": "Few left this morning",
      "price": "$3 a handful",
      "status": "few-left"
     },
     {
      "to": "Quandongs, Port Augusta",
      "when": "Picked Thursday",
      "price": "$9 a handful",
      "status": "packed"
     },
     {
      "to": "Muntries, Kangaroo Island",
      "when": "More on Saturday",
      "price": "$12 a punnet",
      "status": "short"
     }
    ],
    "form": {
     "title": "Order a box",
     "pickup": "Name for the order",
     "pickupValue": "Ruth Tan",
     "dropoff": "Mobile",
     "dropoffValue": "0412 558 314",
     "ready": "Mobile",
     "readyValue": "0412 558 31",
     "readyError": "Add the last digit so we can text you when the box is packed.",
     "size": "Pick-up time",
     "sizes": [
      "7:00",
      "8:00",
      "9:00"
     ],
     "notes": "Notes for the packer",
     "notesHelp": "Allergies, or anything you would rather skip.",
     "book": "Order a box",
     "bookWhy": "Choose a pick-up time to order."
    },
    "empty": {
     "title": "No box ordered",
     "body": "Order by Friday night and it is packed for Saturday at seven.",
     "cta": "Order a box"
    },
    "dialog": {
     "title": "Cancel this box?",
     "body": "Your box is not packed yet. Cancelling is free until 6 am on Saturday.",
     "confirm": "Cancel box",
     "keep": "Keep box"
    },
    "toast": "Box ordered for Saturday at 7:00.",
    "alert": "Muntries are gone for today. More on Saturday.",
    "inline": "Add a note if there is anything you would rather skip.",
    "example": {
     "secondary": "See last week",
     "quiet": "Skip",
     "danger": "Cancel box",
     "small": "Add",
     "account": "Account",
     "checks": [
      "Text me when it's packed",
      "Leave out the muntries",
      "Paper bags only"
     ],
     "switches": [
      "Text me when it's packed",
      "Email the weekly list"
     ],
     "radios": [
      "Saturday",
      "Sunday"
     ],
     "statLabel": "Total",
     "crumbs": [
      "Shop",
      "In this week"
     ],
     "tabs": [
      "In this week",
      "Last week",
      "My boxes"
     ],
     "links": [
      [
       "This week",
       "shopping-basket"
      ],
      [
       "Pick-up",
       "clock"
      ],
      [
       "Orders",
       "package"
      ]
     ]
    }
   }
  }
 },
 "applications": {
  "card": {
   "person": "Ruth Tan",
   "role": "Counter manager",
   "contact": "ruth@saltbush.example"
  },
  "social": [
   "Grown here. Sold by the handful.",
   "Open at seven, closed when it's gone.",
   "Finger limes in from the Riverland."
  ],
  "signage": "Shop window, 900 x 1200 mm: Open at seven, closed when it's gone.",
  "email": {
   "person": "Ruth Tan",
   "role": "Counter manager"
  },
  "site": {
   "url": "saltbush.example"
  }
 },
 "guideB": {
  "studioSlot": "Finger limes on a plain grey studio backdrop. Flat flash, no counter, no growers.",
  "rules": [
   {
    "title": "Say what's in",
    "text": "Lead with what came in and where it grew. Finger limes in from the Riverland."
   },
   {
    "title": "Quandong is for the price",
    "text": "Quandong is the price, the button and the rule under each page head. Wattle is a fill, never type."
   },
   {
    "title": "Hands before faces",
    "text": "Photograph the produce close, in black and white, with the counter in frame."
   }
  ],
  "email": {
   "to": "Mei Lin",
   "subject": "Your box is packed for Saturday at 7:00",
   "time": "6:52",
   "body": [
    "Hi Mei,",
    "Your box is packed and waiting at the counter from 7:00 on Saturday. This week it holds finger limes from the Riverland and warrigal greens from the Adelaide Hills."
   ]
  }
 },
 "contact": {
  "owner": "Brand team",
  "email": "brand@saltbush.example"
 }
};
