// Sample brand data for the export themes.
export default {
 "name": "Shallow End",
 "slug": "shallow-end",
 "theme": "10-inuse",
 "version": {
  "number": "1.0",
  "date": "2026-11-01"
 },
 "description": "Shallow End is a swim school in Hobart. Children learn in small groups after school, week by week, with a named teacher and a lane held for them.",
 "product": "Book a lesson, see today's lane and teacher, and read what your child did when the lesson is done.",
 "audience": "Hobart parents who want their children swimming after school, in a pool close to home, at a lesson time that holds.",
 "city": "Hobart",
 "lines": {
  "primary": "Lessons that fit after school.",
  "others": [
   "Week by week, length by length.",
   "Tuesdays at 4:15 have room."
  ]
 },
 "personality": [
  {
   "trait": "Warm",
   "means": "We write to a parent at the pool door. Children are Mia and Leo, never participants, and a teacher is Ana, never staff."
  },
  {
   "trait": "Specific",
   "means": "A time, a pool and a lane in every message. Lane 3 at 4:15 helps. See you soon does not."
  },
  {
   "trait": "Steady",
   "means": "Progress is small and we say so. One thing she did today, one thing she does next, and nothing bigger than that."
  }
 ],
 "voice": {
  "principles": [
   {
    "title": "Time first, then where, then who",
    "example": "Mia's lesson is at 4:15 today. Lane 3, with Ana."
   },
   {
    "title": "Name one thing she did",
    "example": "Lesson done. Mia floated on her back for 10 seconds."
   },
   {
    "title": "Offer the nearest yes",
    "example": "Thursdays are full. Tuesdays at 4:15 have room."
   },
   {
    "title": "Write for the pool door",
    "example": "Ana meets Mia at the shallow end. Allow ten minutes to change."
   }
  ],
  "writeThis": [
   {
    "write": "Mia's lesson is at 4:15 today. Lane 3, with Ana.",
    "not": "Your child's session has been scheduled for this afternoon.",
    "because": "A time and a lane are what a parent at the door needs."
   },
   {
    "write": "Thursdays are full. Tuesdays at 4:15 have room.",
    "not": "Unfortunately that session is unavailable.",
    "because": "Say no once, then offer the nearest yes with its time."
   },
   {
    "write": "Mia floated on her back for 10 seconds.",
    "not": "Mia made excellent progress today.",
    "because": "One thing she did, in words a parent can repeat at dinner."
   },
   {
    "write": "Book lessons",
    "not": "Submit",
    "because": "A button names what happens when you press it."
   },
   {
    "write": "Pool 2 is shut for a heater repair. You won't pay for today.",
    "not": "Facilities are temporarily unavailable.",
    "because": "Say why, what it costs, and offer one fix."
   }
  ],
  "boilerplate25": "Shallow End is a swim school in Hobart. Children learn after school, week by week, with a named teacher and their own lane held for them.",
  "boilerplate50": "Shallow End is a swim school in Hobart. Children learn after school, week by week, with a named teacher and a lane held for them. Parents book a lesson, see today's lane, and read what their child did. We say a time, a place and a name, and keep to them.",
  "nameRules": "Write Shallow End with a capital S and a capital E in running text, so the name never reads as the end of the pool. Set it in the display face only as the wordmark. Never SHALLOW END, ShallowEnd, Shallow End Swim or Shallow End Swim School."
 },
 "colours": [
  {
   "id": "chalk",
   "name": "Chalk",
   "hex": "#FBF7F0",
   "role": "ground",
   "lands": "The ground of every screen and page. Most of every page is Chalk.",
   "share": 0.5
  },
  {
   "id": "white",
   "name": "White",
   "hex": "#FFFFFF",
   "role": "card",
   "lands": "Cards that hold one thing, fields, and the paper behind a business card.",
   "share": 0.2
  },
  {
   "id": "deep-end",
   "name": "Deep end",
   "hex": "#1B2B27",
   "role": "text",
   "lands": "All text, the focus ring and the wordmark.",
   "share": 0.15
  },
  {
   "id": "lane",
   "name": "Lane",
   "hex": "#0E5C4A",
   "role": "action",
   "lands": "One pill button a screen, links on White and Chalk, and the rope under the name.",
   "share": 0.1
  },
  {
   "id": "float",
   "name": "Float",
   "hex": "#FFB38A",
   "role": "highlight",
   "lands": "Your lane in the pool, the teacher's avatar, and the stripe on a cover. A fill behind Deep end type, never text and never an edge.",
   "share": 0.05
  }
 ],
 "tones": [
  {
   "id": "soft",
   "name": "Soft Deep end",
   "hex": "#2F403B",
   "role": "reading text",
   "lands": "Paragraphs on Chalk and White."
  },
  {
   "id": "quiet",
   "name": "Quiet",
   "hex": "#5B6A66",
   "role": "quiet text",
   "lands": "Captions, folios and help text on Chalk and White."
  },
  {
   "id": "hover",
   "name": "Lane hover",
   "hex": "#157A62",
   "role": "hover",
   "lands": "A Lane control under the pointer. The next step up the Lane ramp."
  }
 ],
 "pairs": [
  {
   "fg": "deep-end",
   "bg": "chalk",
   "use": "Body text, headlines"
  },
  {
   "fg": "deep-end",
   "bg": "white",
   "use": "Text on cards"
  },
  {
   "fg": "soft",
   "bg": "chalk",
   "use": "Paragraphs"
  },
  {
   "fg": "quiet",
   "bg": "chalk",
   "use": "Captions, folios"
  },
  {
   "fg": "quiet",
   "bg": "white",
   "use": "Captions on cards"
  },
  {
   "fg": "white",
   "bg": "lane",
   "use": "Book lessons label"
  },
  {
   "fg": "white",
   "bg": "hover",
   "use": "Button label on hover"
  },
  {
   "fg": "deep-end",
   "bg": "float",
   "use": "Lane chip, teacher avatar"
  },
  {
   "fg": "lane",
   "bg": "white",
   "use": "Links on White"
  },
  {
   "fg": "lane",
   "bg": "chalk",
   "use": "Links on Chalk"
  },
  {
   "fg": "chalk",
   "bg": "deep-end",
   "use": "Reversed text, toast"
  },
  {
   "fg": "float",
   "bg": "deep-end",
   "use": "Toast action, rope on Deep end"
  }
 ],
 "fonts": {
  "display": {
   "family": "Bricolage Grotesque",
   "weights": [
    700
   ],
   "axes": "opsz 36, wdth 100",
   "file": "BricolageGrotesque-36-700",
   "css": "Bricolage+Grotesque:opsz,wdth,wght@36,100,700",
   "stretch": 100
  },
  "body": {
   "family": "Nunito Sans",
   "weights": [
    400,
    500,
    600,
    700
   ],
   "file": "NunitoSans",
   "css": "Nunito+Sans:wght@400;500;600;700"
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
    "line": 0.95,
    "weight": 700,
    "face": "display",
    "use": "A cover, one word"
   },
   {
    "token": "headline",
    "size": 58,
    "line": 1.05,
    "weight": 700,
    "face": "display",
    "use": "A page's one big line"
   },
   {
    "token": "title",
    "size": 30,
    "line": 1.05,
    "weight": 700,
    "face": "display",
    "use": "A screen's title and its status line"
   },
   {
    "token": "body",
    "size": 16,
    "line": 1.5,
    "weight": 400,
    "face": "body",
    "use": "Everything a parent reads"
   },
   {
    "token": "label",
    "size": 14,
    "line": 1.45,
    "weight": 600,
    "face": "body",
    "use": "Field labels, status words, row titles"
   },
   {
    "token": "caption",
    "size": 12,
    "line": 1.6,
    "weight": 400,
    "face": "body",
    "use": "Notes beside a screen, folios"
   }
  ],
  "sample": {
   "headline": "Lessons that fit after school.",
   "paragraph": "Mia swims on Tuesdays at 4:15, in lane 3 with Ana. Allow ten minutes to change, and meet her at the shallow end when the lesson is done. We tell you one thing she did today.",
   "caption": "Pool 2, Sandy Bay. Tuesdays at 4:15."
  },
  "rules": [
   {
    "do": "Set the wordmark and headlines in Bricolage Grotesque 700, in sentence case.",
    "dont": "Set headlines in capitals."
   },
   {
    "do": "Keep display tracking at minus 0.01 em and headlines to one, two or three lines.",
    "dont": "Letter-space the display face."
   },
   {
    "do": "Use 16 px for reading text and 12 px for captions. Nothing smaller.",
    "dont": "Set body copy under 12 px."
   },
   {
    "do": "Use weight and the quiet colour for secondary text.",
    "dont": "Fade text with opacity."
   },
   {
    "do": "Use the mono face for a hex, a token or a code string only.",
    "dont": "Set labels or headings in mono."
   }
  ]
 },
 "logo": {
  "idea": "The name swims in a lane: a lane rope of round dashes runs under it, exactly as wide as the name. The rope is always drawn with the name, and its dashes are never cut, recoloured one by one or counted differently.",
  "showcase": {
   "wordmark": "Shallow End",
   "symbolNote": "The symbol is the S on three dashes of the same rope.",
   "minScreenPx": 88,
   "minPrintMm": 22
  },
  "colourways": {
   "colour": {
    "name": "#1B2B27",
    "lane": "#0E5C4A",
    "ground": "#FBF7F0"
   },
   "mono-dark": {
    "name": "#1B2B27",
    "lane": "#1B2B27",
    "ground": "#FFFFFF"
   },
   "mono-light": {
    "name": "#FFFFFF",
    "lane": "#FFFFFF",
    "ground": "#1B2B27"
   },
   "reversed": {
    "name": "#FBF7F0",
    "lane": "#FFB38A",
    "ground": "#1B2B27"
   },
   "on-float": {
    "name": "#1B2B27",
    "lane": "#0E5C4A",
    "ground": "#FFB38A"
   },
   "on-lane": {
    "name": "#FFFFFF",
    "lane": "#FFB38A",
    "ground": "#0E5C4A"
   }
  },
  "when": {
   "colour": "The default. On Chalk, on White and on light photos.",
   "mono-dark": "One colour printing, stamps and swim-cap transfers. On light grounds that cannot carry Lane.",
   "mono-light": "On photos and dark grounds that cannot carry Float.",
   "reversed": "On Deep end. Chalk name, Float rope.",
   "horizontal": "App headers, email signatures and wide, short spaces.",
   "stacked": "Squarer spaces: profile images, signs at the pool door, kit bags.",
   "symbol": "Where the name is already nearby: app icon, favicon, swim-cap tag."
  }
 },
 "imagery": {
  "direction": {
   "subject": "Children learning and the people who teach them: a first float, a kick along the wall, a parent at the shallow end with a towel. The child is the subject, never the pool.",
   "light": "Real daylight through the pool windows, or soft late-afternoon sun. No flash, no studio.",
   "crop": "Taken at the child's height from the poolside, with the lane ropes in frame. Leave space on one side for a line of type.",
   "colour": "Natural colour. Float appears because someone is wearing a cap or holding a towel, never added in editing.",
   "people": "Our swimmers and teachers, photographed with a parent's written yes. No stock smiles, no posed thumbs up."
  },
  "shots": [
   {
    "id": "first-float",
    "slot": "The first float: a child on their back, the teacher's hand an inch under the water, shot from the poolside at water level. Crop tight to the child's face and shoulders. Bright, even daylight through the pool windows."
   },
   {
    "id": "lane-ropes",
    "slot": "The lanes: lane ropes seen end-on across calm water, a Float swim cap at the far end. Wide crop with the ropes filling the frame. Soft light off the water, no flash."
   },
   {
    "id": "pool-door",
    "slot": "The pool door: a parent holding a towel and a child in goggles at the top of the shallow-end steps, shot from behind at the child's height. Wide crop with room on the right for a line of type. Warm mid-afternoon light."
   },
   {
    "id": "kit-bench",
    "slot": "The kit: goggles, a folded towel and a swim cap laid out on a changing-room bench. Top-down, close crop, daylight from a window on the left."
   },
   {
    "id": "teacher",
    "slot": "The teacher: Ana walking along the pool edge beside a child, shot side-on at waist height. Medium crop, space above for a headline. Late-afternoon sun low through the windows."
   },
   {
    "id": "after-school",
    "slot": "After school: a school bag and shoes beside the pool door, the day's lane list on the wall behind. Wide crop, natural daylight."
   }
  ],
  "rules": [
   {
    "do": "Show the lesson as it happens, with the water and the lane ropes in frame.",
    "dont": "Pose children against a plain studio wall."
   },
   {
    "do": "Let Float come from a cap, a towel or a lane float.",
    "dont": "Tint a photo peach or add a colour wash."
   },
   {
    "do": "Photograph only children whose parents have said yes in writing.",
    "dont": "Use a stock photo of a child who does not swim here."
   },
   {
    "do": "Use a photo or a flat colour behind the logo.",
    "dont": "Set the logo over lane ropes or splashing water."
   }
  ]
 },
 "layout": {
  "page": {
   "w": 794,
   "h": 1123
  },
  "margin": 56,
  "columns": 6,
  "gutter": 16,
  "base": 4
 },
 "ui": {
  "radius": {
   "control": 12,
   "card": 20,
   "button": 9999,
   "input": 12,
   "chip": 9999
  },
  "border": 1.5,
  "spacingBase": 4,
  "shadows": "0 8px 24px rgba(27, 43, 39, 0.14)",
  "icons": [
   "waves",
   "map-pin",
   "clock",
   "calendar",
   "user",
   "phone",
   "message-circle",
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
  "rowIcon": "waves",
  "type": [
   {
    "token": "caption",
    "size": 12,
    "line": 16,
    "weight": 400,
    "face": "body",
    "use": "Captions, help text, folios"
   },
   {
    "token": "label",
    "size": 14,
    "line": 20,
    "weight": 600,
    "face": "body",
    "use": "Field labels, status words, table headers"
   },
   {
    "token": "body",
    "size": 16,
    "line": 24,
    "weight": 400,
    "face": "body",
    "use": "Reading text and row detail"
   },
   {
    "token": "control",
    "size": 16,
    "line": 24,
    "weight": 700,
    "face": "body",
    "use": "Button labels and input text"
   },
   {
    "token": "title-s",
    "size": 20,
    "line": 24,
    "weight": 700,
    "face": "display",
    "use": "Card and dialog titles"
   },
   {
    "token": "title",
    "size": 26,
    "line": 28,
    "weight": 700,
    "face": "display",
    "use": "Screen titles, the status line"
   },
   {
    "token": "headline",
    "size": 36,
    "line": 40,
    "weight": 700,
    "face": "display",
    "use": "Empty states and first-run"
   }
  ],
  "light": {
   "surface": "#FBF7F0",
   "raised": "#FFFFFF",
   "sunken": "#EFEAE1",
   "text": "#1B2B27",
   "textSoft": "#2F403B",
   "quiet": "#5B6A66",
   "quietOnSunken": "#5B6A66",
   "border": "#8F8A82",
   "divider": "#E6DFD3",
   "action": "#0E5C4A",
   "actionHover": "#157A62",
   "actionPressed": "#0B4A3C",
   "actionLabel": "#FFFFFF",
   "focus": "#1B2B27",
   "disabledBg": "#EFEAE1",
   "disabledText": "#5B6A66",
   "scrim": "#1B2B27",
   "success": {
    "fg": "#0E5C4A",
    "bg": "#E3F0EC"
   },
   "warning": {
    "fg": "#8A3B12",
    "bg": "#FFE7D9"
   },
   "danger": {
    "fg": "#9B2C2C",
    "bg": "#F7E3E3"
   },
   "info": {
    "fg": "#4B3F8F",
    "bg": "#EDEBF7"
   }
  },
  "dark": {
   "surface": "#0F1C19",
   "raised": "#172723",
   "sunken": "#0B1513",
   "text": "#F3EFE7",
   "textSoft": "#D2D8D3",
   "quiet": "#A9B8B3",
   "quietOnSunken": "#A9B8B3",
   "border": "#7F918B",
   "divider": "#2A3B36",
   "action": "#FFB38A",
   "actionHover": "#FFC4A3",
   "actionPressed": "#F29B6B",
   "actionLabel": "#1B2B27",
   "focus": "#F3EFE7",
   "disabledBg": "#22332E",
   "disabledText": "#A9B8B3",
   "scrim": "#000000",
   "success": {
    "fg": "#8FD6BE",
    "bg": "#12302A"
   },
   "warning": {
    "fg": "#F0C27B",
    "bg": "#33260F"
   },
   "danger": {
    "fg": "#FF9C94",
    "bg": "#3B1819"
   },
   "info": {
    "fg": "#B9AEF0",
    "bg": "#24203F"
   }
  },
  "status": [
   {
    "id": "booked",
    "label": "Booked",
    "tone": "success"
   },
   {
    "id": "today",
    "label": "Today at 4:15",
    "tone": "action"
   },
   {
    "id": "waitlist",
    "label": "Waitlist",
    "tone": "warning"
   },
   {
    "id": "closed",
    "label": "Pool closed",
    "tone": "danger"
   },
   {
    "id": "done",
    "label": "Lesson done",
    "tone": "info"
   }
  ],
  "elevationNote": "Shallow End draws cards and phones with a hairline ring, not a shadow. Only a dialog floats, with one soft shadow.",
  "screen": {
   "title": "Today's lesson",
   "content": {
    "time": "3:58",
    "status": "Booked",
    "eta": "Pool 2, lane 3 at 4:15",
    "pickup": "Ana meets Mia at the shallow end. Allow ten minutes to change.",
    "from": "Pool 2",
    "to": "Lane 3",
    "progress": 0.5,
    "rider": "Ana, swim teacher",
    "initials": "AN",
    "riderNote": "Meets Mia at the shallow end",
    "call": "Message",
    "deliverToLabel": "Pool",
    "deliverTo": "Pool 2, Sandy Bay",
    "paidLabel": "A lesson",
    "paid": "$24",
    "share": "Add to my calendar",
    "deliveries": [
     {
      "to": "Mia, Seal",
      "when": "Today 4:15, Pool 2, lane 3",
      "price": "$24",
      "status": "today"
     },
     {
      "to": "Leo, Tadpole",
      "when": "Thu 5:00, Pool 1, lane 1",
      "price": "$24",
      "status": "booked"
     },
     {
      "to": "Leo, Tadpole",
      "when": "Thu 4:15, second in line",
      "price": "$24",
      "status": "waitlist"
     },
     {
      "to": "Mia, Seal",
      "when": "Last Tue 4:15, Pool 2",
      "price": "$24",
      "status": "done"
     },
     {
      "to": "Mia, Seal",
      "when": "Last Fri 4:15, Pool 2",
      "price": "$0",
      "status": "closed"
     }
    ],
    "form": {
     "title": "Book a lesson",
     "pickup": "Swimmer",
     "pickupValue": "Mia, age 7",
     "dropoff": "Pool",
     "dropoffValue": "Pool 2, Sandy Bay",
     "ready": "Day",
     "readyValue": "Thursday",
     "readyError": "Thursdays at 4:15 are full. Tuesdays have room.",
     "size": "Level",
     "sizes": [
      "Tadpole",
      "Seal",
      "Dolphin"
     ],
     "notes": "Notes for Ana",
     "notesHelp": "Goggles, allergies, anything that helps in the water.",
     "book": "Book lessons",
     "bookWhy": "Pick a day to book."
    },
    "empty": {
     "title": "No lessons booked",
     "body": "Lessons run after school, week by week. Pick a day and we hold a lane for you.",
     "cta": "Book a lesson"
    },
    "dialog": {
     "title": "Cancel this lesson?",
     "body": "Mia's lesson is Tuesday at 4:15 in lane 3. Cancel and her lane goes to the next family on the waitlist.",
     "confirm": "Cancel lesson",
     "keep": "Keep lesson"
    },
    "toast": "Mia is booked for Tuesdays.",
    "alert": "Pool 2 is shut for a heater repair. You won't pay for today.",
    "inline": "Tell Ana about goggles, allergies or nerves.",
    "example": {
     "secondary": "See progress",
     "quiet": "Skip",
     "danger": "Cancel lesson",
     "small": "Book",
     "account": "Account",
     "checks": [
      "Goggles packed",
      "Towel packed",
      "Photo permission"
     ],
     "switches": [
      "Text me when the lesson starts",
      "Email receipts"
     ],
     "radios": [
      "Tuesdays",
      "Thursdays"
     ],
     "statLabel": "A lesson",
     "crumbs": [
      "Lessons",
      "Today"
     ],
     "tabs": [
      "Today",
      "Week",
      "Past"
     ],
     "links": [
      [
       "Today",
       "clock"
      ],
      [
       "Book",
       "plus"
      ],
      [
       "Week",
       "calendar"
      ]
     ]
    }
   }
  }
 },
 "applications": {
  "card": {
   "person": "Ana Lindqvist",
   "role": "Head swim teacher",
   "contact": "ana@shallowend.example"
  },
  "social": [
   "Lessons that fit after school.",
   "Week by week, length by length.",
   "Tuesdays at 4:15 have room."
  ],
  "signage": "Pool door sign, 600 x 900 mm: Lessons that fit after school.",
  "email": {
   "person": "Ana Lindqvist",
   "role": "Head swim teacher"
  },
  "site": {
   "url": "shallowend.example"
  }
 },
 "contact": {
  "owner": "Brand team",
  "email": "brand@shallowend.example"
 },
 "guideB": {
  "email": {
   "to": "Priya Nair",
   "subject": "Mia's lesson is at 4:15 today",
   "time": "Tue 3:42 pm",
   "body": [
    "Hi Priya,",
    "Mia's lesson is at 4:15 today. Lane 3, with Ana.",
    "Ana meets Mia at the shallow end. Allow ten minutes to change."
   ]
  },
  "rules": [
   {
    "title": "Time first, then where, then who",
    "text": "Mia's lesson is at 4:15 today. Lane 3, with Ana."
   },
   {
    "title": "Lane lands once",
    "text": "One Lane pill button a screen, and the rope under the name."
   },
   {
    "title": "Float is a fill, never text",
    "text": "Behind Deep end type: your lane, the teacher's avatar, the stripe on a cover."
   }
  ]
 }
};
