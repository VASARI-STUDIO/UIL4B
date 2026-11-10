// Sample brand data for the export themes.
export default {
 "name": "Kerbside",
 "slug": "kerbside",
 "theme": "01-presentation",
 "version": {
  "number": "1.0",
  "date": "2026-11-01"
 },
 "description": "Kerbside is a bike courier in Melbourne. A rider collects from one address in the city and delivers to another, to a time promised when you book.",
 "product": "Book a pickup, track the rider, and see the time it was delivered.",
 "audience": "Melbourne businesses and households that need something across town by a set time: print shops, florists, studios and offices.",
 "city": "Melbourne",
 "lines": {
  "primary": "Booked by ten. There by twelve.",
  "others": [
   "Across town before lunch.",
   "Bikes, not vans."
  ]
 },
 "personality": [
  {
   "trait": "Punctual",
   "means": "We name a time and keep it. Every message says when something arrives, in clock times, never 'soon'."
  },
  {
   "trait": "Plain",
   "means": "Short sentences and everyday words. If a rider is six minutes late, the status says Running 6 min late."
  },
  {
   "trait": "Local",
   "means": "We know the lanes. Copy names the street and the suburb, not 'your destination'."
  }
 ],
 "voice": {
  "principles": [
   {
    "title": "Say when it arrives",
    "example": "There at 11:40."
   },
   {
    "title": "Use real times and real places",
    "example": "Picked up at 10:52 from 88 Brunswick Street."
   },
   {
    "title": "Keep sentences short",
    "example": "Booked by ten. There by twelve."
   },
   {
    "title": "Stay level when it goes wrong",
    "example": "Running 6 min late. Mai is on Swanston Street."
   }
  ],
  "writeThis": [
   {
    "write": "There at 11:40.",
    "not": "Your delivery is expected to arrive shortly.",
    "because": "A time is a promise. Shortly is not."
   },
   {
    "write": "Running 6 min late.",
    "not": "We apologise for any inconvenience caused by a delay.",
    "because": "Give the number of minutes, then stop."
   },
   {
    "write": "Book rider",
    "not": "Submit",
    "because": "A button names what happens when you press it."
   },
   {
    "write": "Couldn't deliver. Nobody answered at 240 Adelaide Street. Call Mai to try again.",
    "not": "Delivery unsuccessful.",
    "because": "Say what happened and what to do next."
   },
   {
    "write": "Bikes, not vans.",
    "not": "We are passionate about last-mile logistics.",
    "because": "Say it the way a rider would say it."
   }
  ],
  "boilerplate25": "Kerbside is a bike courier in Melbourne. Book a pickup by ten and your parcel is there by twelve. Riders, not vans, across the city.",
  "boilerplate50": "Kerbside is a bike courier in Melbourne. You book a pickup, a rider collects it from one address and delivers it to another, and you see where they are the whole way. Book by ten and it is there by twelve. We say a time, and we keep to it.",
  "nameRules": "Write Kerbside with a capital K in running text. Set KERBSIDE in capitals only as the wordmark, never as a typed word. Never Kerb-side, Kerbside Couriers or KS."
 },
 "colours": [
  {
   "id": "signal",
   "name": "Signal",
   "hex": "#FF5A1F",
   "role": "action",
   "lands": "The jacket, the bag, the first line of a poster. The Book rider button and the live status.",
   "share": 0.15
  },
  {
   "id": "asphalt",
   "name": "Asphalt",
   "hex": "#1A1A1A",
   "role": "text",
   "lands": "Body text, labels on Signal, the focus ring, the kerb on Signal.",
   "share": 0.15
  },
  {
   "id": "concrete",
   "name": "Concrete",
   "hex": "#E6E4DE",
   "role": "panel",
   "lands": "Panels, page bands, disabled fills and the hairlines between rows.",
   "share": 0.2
  },
  {
   "id": "white",
   "name": "White",
   "hex": "#FFFFFF",
   "role": "ground",
   "lands": "The page ground. Most of every page is White.",
   "share": 0.5
  }
 ],
 "tones": [
  {
   "id": "soft",
   "name": "Soft Asphalt",
   "hex": "#3A3936",
   "role": "reading text",
   "lands": "Paragraphs on White and Concrete."
  },
  {
   "id": "quiet",
   "name": "Quiet on White",
   "hex": "#6B6A66",
   "role": "quiet text",
   "lands": "Captions, folios and help text on White."
  },
  {
   "id": "quiet-concrete",
   "name": "Quiet on Concrete",
   "hex": "#5E5D59",
   "role": "quiet text",
   "lands": "Captions and disabled labels on Concrete."
  },
  {
   "id": "hover",
   "name": "Signal hover",
   "hex": "#FF7B53",
   "role": "hover",
   "lands": "A Signal control under the pointer. The next step on the Signal ramp."
  }
 ],
 "pairs": [
  {
   "fg": "asphalt",
   "bg": "white",
   "use": "Body text, headlines"
  },
  {
   "fg": "soft",
   "bg": "white",
   "use": "Paragraphs"
  },
  {
   "fg": "quiet",
   "bg": "white",
   "use": "Captions, folios"
  },
  {
   "fg": "asphalt",
   "bg": "signal",
   "use": "Button labels, posters"
  },
  {
   "fg": "asphalt",
   "bg": "hover",
   "use": "Button label on hover"
  },
  {
   "fg": "asphalt",
   "bg": "concrete",
   "use": "Text on panels"
  },
  {
   "fg": "quiet-concrete",
   "bg": "concrete",
   "use": "Captions on panels"
  },
  {
   "fg": "white",
   "bg": "asphalt",
   "use": "Reversed text"
  },
  {
   "fg": "signal",
   "bg": "asphalt",
   "use": "Kerb line, large type on Asphalt"
  },
  {
   "fg": "white",
   "bg": "signal",
   "use": "Display type, 24 px and above only",
   "minSize": 24
  }
 ],
 "fonts": {
  "display": {
   "family": "Archivo",
   "weights": [
    800
   ],
   "axes": "wdth 125",
   "file": "Archivo-125-800",
   "css": "Archivo:wdth,wght@125,800",
   "stretch": 125
  },
  "body": {
   "family": "IBM Plex Sans",
   "weights": [
    400,
    500,
    600
   ],
   "file": "IBMPlexSans",
   "css": "IBM+Plex+Sans:wght@400;500;600"
  },
  "mono": {
   "family": "IBM Plex Mono",
   "weights": [
    400
   ],
   "file": "IBMPlexMono",
   "css": "IBM+Plex+Mono:wght@400"
  }
 },
 "type": {
  "scale": [
   {
    "token": "display",
    "size": 96,
    "line": 0.9,
    "weight": 800,
    "face": "display",
    "use": "Covers and posters, one line"
   },
   {
    "token": "headline",
    "size": 54,
    "line": 1.02,
    "weight": 800,
    "face": "display",
    "use": "A page's one big line"
   },
   {
    "token": "title",
    "size": 26,
    "line": 1.15,
    "weight": 800,
    "face": "display",
    "use": "Titles inside a piece"
   },
   {
    "token": "body",
    "size": 15,
    "line": 1.6,
    "weight": 400,
    "face": "body",
    "use": "Reading text"
   },
   {
    "token": "label",
    "size": 13,
    "line": 1.4,
    "weight": 500,
    "face": "body",
    "use": "Buttons, row titles, short labels"
   },
   {
    "token": "caption",
    "size": 12,
    "line": 1.4,
    "weight": 400,
    "face": "body",
    "use": "Captions and folios"
   }
  ],
  "sample": {
   "headline": "Across town before lunch.",
   "paragraph": "Book a pickup by ten and your parcel is there by twelve. Mai collects from 88 Brunswick Street, rides the lanes you would not drive, and signs it in at 240 Adelaide Street. You see her the whole way.",
   "caption": "Mai, cargo bike. Picked up at 10:52."
  },
  "rules": [
   {
    "do": "Set the display face in capitals only for the wordmark. Everything else is sentence case.",
    "dont": "Set headlines in capitals."
   },
   {
    "do": "Keep display tracking at minus 0.01 em, one or two lines.",
    "dont": "Letter-space the display face."
   },
   {
    "do": "Use 15 px for reading text, 12 px for captions. Nothing smaller.",
    "dont": "Set body copy under 12 px."
   },
   {
    "do": "Use weight and a quiet colour for secondary text.",
    "dont": "Fade text with opacity."
   },
   {
    "do": "Use the mono face for a hex, a token or a code string only.",
    "dont": "Set labels or headings in mono."
   }
  ]
 },
 "logo": {
  "idea": "The wordmark sits on the kerb: a line that runs the length of the name, then steps down to the road. The step always falls after the E, and the line is never drawn without the name.",
  "showcase": {
   "wordmark": "KERBSIDE",
   "symbolNote": "The symbol is the K standing on its own piece of kerb, with the same step down to the road.",
   "minScreenPx": 80,
   "minPrintMm": 20
  },
  "colourways": {
   "colour": {
    "name": "#1A1A1A",
    "kerb": "#FF5A1F",
    "ground": "#FFFFFF"
   },
   "mono-dark": {
    "name": "#1A1A1A",
    "kerb": "#1A1A1A",
    "ground": "#FFFFFF"
   },
   "mono-light": {
    "name": "#FFFFFF",
    "kerb": "#FFFFFF",
    "ground": "#1A1A1A"
   },
   "reversed": {
    "name": "#FFFFFF",
    "kerb": "#FF5A1F",
    "ground": "#1A1A1A"
   },
   "on-signal": {
    "name": "#1A1A1A",
    "kerb": "#1A1A1A",
    "ground": "#FF5A1F"
   },
   "on-concrete": {
    "name": "#1A1A1A",
    "kerb": "#FF5A1F",
    "ground": "#E6E4DE"
   }
  },
  "when": {
   "colour": "The default. On White and on light photos.",
   "mono-dark": "One colour printing and stamps. On light grounds that cannot carry Signal.",
   "mono-light": "On photos and dark grounds that cannot carry Signal.",
   "reversed": "On Asphalt. White name, Signal kerb.",
   "horizontal": "Headers, email signatures and wide, short spaces.",
   "stacked": "Squarer spaces: profile images, sign posts, bag tags.",
   "symbol": "Where the name is already nearby: app icon, favicon, stamp."
  }
 },
 "imagery": {
  "direction": {
   "subject": "Riders at work in the city: waiting at an intersection, wheeling a bike, handing over a parcel. The rider is the subject, not the bike.",
   "light": "Real daylight, morning or low evening. No flash, no studio.",
   "crop": "Wide and honest, with the street around the rider. Leave space on one side for a line of type.",
   "colour": "Natural colour. Signal appears because the rider is wearing it, never added in editing.",
   "people": "Our riders and the people they meet, shot as they are working. No stock smiles, no posed handshakes."
  },
  "shots": [
   {
    "id": "riders",
    "caption": "Waiting at the lights",
    "slot": "Riders at the lights: two riders waiting at a city intersection, one in an orange jacket. Wide crop with the street around them. Real daylight, no flash."
   },
   {
    "id": "evening",
    "caption": "End of the shift",
    "slot": "End of the shift: a courier in a yellow jacket wheeling a bike in low evening light. Leave space on one side for a line of type."
   },
   {
    "id": "busstop",
    "caption": "The street the poster lives on",
    "slot": "The street the poster lives on: a bus shelter poster panel on a tree-lined street. Straight on, the poster square to the frame."
   },
   {
    "id": "handover",
    "slot": "The handover: hands passing a parcel at a door, shot side-on at waist height. Crop tight to the hands and the parcel. Morning light from the left."
   },
   {
    "id": "bag",
    "slot": "The bag: a Signal courier bag on the rack of a cargo bike. Close crop, flat overcast light, the street soft behind."
   },
   {
    "id": "route",
    "slot": "The route: a rider crossing a tram line, seen from behind. Wide crop with the road filling the lower half. Late afternoon light."
   }
  ],
  "rules": [
   {
    "do": "Show the rider working, with the street around them.",
    "dont": "Pose people against a plain studio wall."
   },
   {
    "do": "Let Signal come from the jacket or the bag.",
    "dont": "Tint the photo orange or add a colour wash."
   },
   {
    "do": "Crop wide and leave room for one line of type.",
    "dont": "Crop to a face with a headline across it."
   },
   {
    "do": "Use a photo or a flat colour behind the logo.",
    "dont": "Set the logo on a busy part of the image."
   }
  ]
 },
 "layout": {
  "page": {
   "w": 1280,
   "h": 720
  },
  "margin": 56,
  "columns": 12,
  "gutter": 16,
  "base": 4
 },
 "ui": {
  "radius": {
   "control": 4,
   "card": 8
  },
  "border": 1.5,
  "spacingBase": 4,
  "shadows": "none",
  "icons": [
   "bike",
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
   "info"
  ],
  "light": {
   "surface": "#FFFFFF",
   "raised": "#F5F4F1",
   "sunken": "#E6E4DE",
   "text": "#1A1A1A",
   "textSoft": "#3A3936",
   "quiet": "#6B6A66",
   "quietOnSunken": "#5E5D59",
   "border": "#6B6A66",
   "divider": "#E6E4DE",
   "action": "#FF5A1F",
   "actionHover": "#FF7B53",
   "actionPressed": "#EB5118",
   "actionLabel": "#1A1A1A",
   "focus": "#1A1A1A",
   "disabledBg": "#E6E4DE",
   "disabledText": "#5E5D59",
   "scrim": "#1A1A1A",
   "success": {
    "fg": "#1E6B45",
    "bg": "#E7F2EC"
   },
   "warning": {
    "fg": "#7A5200",
    "bg": "#FBF0D9"
   },
   "danger": {
    "fg": "#B42318",
    "bg": "#FCEBEA"
   },
   "info": {
    "fg": "#2B5A8A",
    "bg": "#E9F0F8"
   }
  },
  "dark": {
   "surface": "#141414",
   "raised": "#1F1F1E",
   "sunken": "#0E0E0E",
   "text": "#F5F4F1",
   "textSoft": "#D4D2CC",
   "quiet": "#A8A6A0",
   "quietOnSunken": "#A8A6A0",
   "border": "#8C8A84",
   "divider": "#333330",
   "action": "#FF5A1F",
   "actionHover": "#FF7B53",
   "actionPressed": "#EB5118",
   "actionLabel": "#1A1A1A",
   "focus": "#FFFFFF",
   "disabledBg": "#2A2A28",
   "disabledText": "#A8A6A0",
   "scrim": "#000000",
   "success": {
    "fg": "#7FD1A5",
    "bg": "#12301F"
   },
   "warning": {
    "fg": "#E8B65A",
    "bg": "#33260A"
   },
   "danger": {
    "fg": "#FF8A80",
    "bg": "#3A1517"
   },
   "info": {
    "fg": "#8DB7E8",
    "bg": "#13263B"
   }
  },
  "status": [
   {
    "id": "booked",
    "label": "Booked",
    "tone": "info"
   },
   {
    "id": "on-the-way",
    "label": "On the way",
    "tone": "action"
   },
   {
    "id": "late",
    "label": "Running 6 min late",
    "tone": "warning"
   },
   {
    "id": "delivered",
    "label": "Delivered 11:40",
    "tone": "success"
   },
   {
    "id": "failed",
    "label": "Couldn't deliver",
    "tone": "danger"
   }
  ],
  "elevationNote": "Kerbside draws edges, not shadows. Grounds step from White to Concrete, and anything that floats gets a 1.5 px Asphalt edge.",
  "screen": {
   "title": "Track a rider",
   "content": {
    "time": "10:44",
    "status": "On the way",
    "eta": "There at 11:40",
    "pickup": "Picked up at 10:52 from 88 Brunswick Street.",
    "from": "Brunswick St",
    "to": "Adelaide St",
    "progress": 0.6,
    "rider": "Mai, cargo bike",
    "initials": "MT",
    "riderNote": "4 minutes from you",
    "call": "Call",
    "deliverToLabel": "Deliver to",
    "deliverTo": "240 Adelaide Street",
    "paidLabel": "Paid",
    "paid": "$18.50",
    "share": "Share tracking link",
    "deliveries": [
     {
      "to": "240 Adelaide Street",
      "when": "There at 11:40",
      "price": "$18.50",
      "status": "on-the-way"
     },
     {
      "to": "31 Smith Street",
      "when": "Booked for 13:30",
      "price": "$14.00",
      "status": "booked"
     },
     {
      "to": "7 Lygon Street",
      "when": "Now 12:06",
      "price": "$22.00",
      "status": "late"
     },
     {
      "to": "112 Flinders Lane",
      "when": "Yesterday 15:20",
      "price": "$18.50",
      "status": "delivered"
     },
     {
      "to": "50 Chapel Street",
      "when": "Yesterday 09:05",
      "price": "$16.00",
      "status": "failed"
     }
    ],
    "form": {
     "title": "Book a pickup",
     "pickup": "Pick up from",
     "pickupValue": "88 Brunswick Street",
     "dropoff": "Deliver to",
     "dropoffValue": "240 Adelaide Street",
     "ready": "Ready by",
     "readyValue": "10:45",
     "readyError": "Enter a time before 10:00 for delivery by 12:00.",
     "size": "Parcel size",
     "sizes": [
      "Envelope",
      "Small box",
      "Large box"
     ],
     "notes": "Notes for the rider",
     "notesHelp": "Door code, level, who to ask for.",
     "book": "Book rider",
     "bookWhy": "Add a pickup time to book."
    },
    "empty": {
     "title": "No pickups booked",
     "body": "Book a pickup by ten and it is there by twelve.",
     "cta": "Book rider"
    },
    "dialog": {
     "title": "Cancel this pickup?",
     "body": "Mai has not collected yet. Cancelling is free until she arrives at 88 Brunswick Street.",
     "confirm": "Cancel pickup",
     "keep": "Keep pickup"
    },
    "toast": "Rider booked for 10:45.",
    "alert": "Running 6 min late. Mai is on Swanston Street.",
    "inline": "Add a door code if the building has one.",
    "example": {
     "secondary": "Track",
     "quiet": "Skip",
     "danger": "Cancel pickup",
     "small": "Book",
     "account": "Account",
     "checks": [
      "Leave at the door",
      "Signature needed",
      "Fragile"
     ],
     "switches": [
      "Text me when Mai is close",
      "Email receipts"
     ],
     "radios": [
      "Cargo bike",
      "Road bike"
     ],
     "statLabel": "Paid",
     "crumbs": [
      "Deliveries",
      "Today"
     ],
     "tabs": [
      "Today",
      "Booked",
      "Past"
     ],
     "links": [
      [
       "Track",
       "map-pin"
      ],
      [
       "Book",
       "plus"
      ],
      [
       "History",
       "clock"
      ]
     ]
    }
   }
  }
 },
 "applications": {
  "card": {
   "person": "Priya Nair",
   "role": "Dispatch lead",
   "contact": "priya@kerbside.example"
  },
  "social": [
   "Across town before lunch.",
   "Booked by ten. There by twelve.",
   "Bikes, not vans."
  ],
  "signage": "Bus shelter poster, 1185 x 1750 mm: Bikes, not vans.",
  "email": {
   "person": "Priya Nair",
   "role": "Dispatch lead"
  },
  "site": {
   "url": "kerbside.example"
  }
 },
 "guideB": {
  "studioSlot": "A rider posed against a plain studio wall. Flat light, no street.",
  "rules": [
   {
    "title": "Name the time",
    "text": "Every message says when something arrives, in clock times. There at 11:40."
   },
   {
    "title": "Keep Signal for the action",
    "text": "Most of every page is White. Signal is the jacket, the bag and the first line of a poster."
   },
   {
    "title": "Show the rider working",
    "text": "Wide and honest, with the street around the rider. Signal comes from the jacket, never from editing."
   }
  ],
  "email": {
   "to": "Tom Reilly",
   "subject": "Pickup booked for 10:45",
   "time": "10:44",
   "body": [
    "Hi Tom,",
    "Your pickup is booked. Mai collects from 88 Brunswick Street at 10:52 and it is at 240 Adelaide Street by 11:40."
   ]
  }
 },
 "contact": {
  "owner": "Brand team",
  "email": "brand@kerbside.example"
 }
};
