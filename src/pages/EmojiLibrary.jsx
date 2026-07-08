import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useI18n } from '../contexts/I18nContext'

const PAGE_SIZE = 400

const CATEGORY_KEYWORDS = {
  Smileys: ['smile', 'happy', 'sad', 'angry', 'face', 'laugh', 'cry', 'love', 'think', 'sick', 'cool', 'wink', 'tongue', 'skull', 'ghost', 'robot', 'devil', 'poop', 'scared', 'nervous', 'silly', 'party', 'nerd', 'sleepy', 'disguise', 'vomit', 'hot', 'cold', 'dizzy', 'explode', 'cowboy', 'clown', 'alien', 'demon', 'kiss', 'cat'],
  Hands: ['hand', 'wave', 'point', 'thumb', 'fist', 'clap', 'finger', 'muscle', 'pray', 'shake', 'peace', 'ok', 'punch', 'pinch', 'rock', 'call', 'nail', 'selfie', 'write', 'ear', 'nose', 'brain', 'eye', 'tooth', 'bone', 'leg', 'foot', 'lip', 'tongue'],
  People: ['person', 'man', 'woman', 'boy', 'girl', 'baby', 'old', 'walk', 'run', 'dance', 'swim', 'climb', 'ninja', 'prince', 'princess', 'santa', 'hero', 'fairy', 'zombie', 'mage', 'elf', 'genie', 'vampire', 'mermaid', 'troll', 'angel', 'guard', 'detective', 'construction', 'bride', 'groom', 'doctor', 'nurse', 'health', 'teacher', 'student', 'graduate', 'judge', 'farmer', 'cook', 'chef', 'mechanic', 'worker', 'factory', 'office', 'business', 'scientist', 'technologist', 'coder', 'developer', 'programmer', 'singer', 'artist', 'painter', 'pilot', 'astronaut', 'firefighter', 'police', 'officer', 'soldier', 'wizard', 'witch', 'superhero', 'villain', 'family', 'couple', 'parent', 'mother', 'father', 'wedding', 'pregnant', 'feeding', 'kneel', 'stand', 'shrug', 'facepalm', 'blind', 'wheelchair', 'deaf', 'bald', 'beard', 'massage', 'haircut'],
  Animals: ['animal', 'dog', 'cat', 'bird', 'fish', 'bear', 'monkey', 'horse', 'cow', 'pig', 'chicken', 'snake', 'rabbit', 'bug', 'spider', 'whale', 'shark', 'elephant', 'lion', 'tiger', 'frog', 'fox', 'panda', 'unicorn', 'butterfly', 'bee', 'turtle', 'octopus', 'penguin', 'koala', 'wolf', 'bat', 'owl', 'crab', 'snail', 'ant', 'dragon', 'dinosaur', 'mouse', 'hamster', 'deer', 'giraffe', 'gorilla', 'parrot', 'duck'],
  Food: ['food', 'fruit', 'vegetable', 'meat', 'drink', 'beer', 'wine', 'coffee', 'tea', 'pizza', 'burger', 'cake', 'ice cream', 'bread', 'cheese', 'rice', 'sushi', 'candy', 'apple', 'banana', 'grape', 'strawberry', 'taco', 'donut', 'cookie', 'egg', 'bacon', 'fries', 'chocolate', 'pie', 'lemon', 'watermelon', 'avocado', 'corn', 'carrot', 'tomato', 'salad', 'noodle', 'soup'],
  Activities: ['activity', 'activities', 'sport', 'ball', 'game', 'play', 'music', 'art', 'medal', 'trophy', 'award', 'win', 'soccer', 'football', 'basketball', 'baseball', 'tennis', 'golf', 'ski', 'skate', 'guitar', 'piano', 'drum', 'trumpet', 'violin', 'paint', 'theatre', 'theater', 'dice', 'chess', 'dart', 'bowling', 'party', 'celebrate', 'birthday', 'christmas', 'gift', 'balloon', 'firework', 'circus', 'juggle', 'controller', 'joystick', 'arcade', 'puzzle', 'card'],
  Travel: ['travel', 'car', 'bus', 'train', 'plane', 'boat', 'ship', 'house', 'building', 'city', 'mountain', 'beach', 'rocket', 'helicopter', 'taxi', 'truck', 'bike', 'motorcycle', 'tent', 'church', 'castle', 'bridge', 'tower', 'statue', 'sunset', 'sunrise', 'firework', 'camping', 'island', 'volcano'],
  Objects: ['object', 'phone', 'computer', 'camera', 'clock', 'watch', 'money', 'key', 'tool', 'hammer', 'wrench', 'bulb', 'battery', 'pill', 'knife', 'book', 'pencil', 'guitar', 'piano', 'game', 'joystick', 'tv', 'radio', 'candle', 'lock', 'magnet', 'gem', 'diamond', 'toilet', 'shower', 'bed', 'chair', 'door', 'lamp', 'microscope', 'telescope', 'syringe', 'dna', 'shirt', 'dress', 'shoe', 'hat', 'clothes', 'clothing', 'glasses', 'crown', 'ring', 'bag', 'jacket', 'sock', 'glove', 'boot', 'wear'],
  Symbols: ['symbol', 'heart', 'star', 'arrow', 'warning', 'check', 'cross', 'circle', 'square', 'diamond', 'sign', 'number', 'letter', 'music', 'zodiac', 'love', 'peace', 'recycle', 'infinity', 'question', 'exclamation', 'triangle', 'color', 'colour', 'red', 'blue', 'green', 'purple', 'orange', 'yellow', 'black', 'white', 'pink', 'brown'],
  Flags: ['flag', 'country', 'nation', 'australia', 'usa', 'america', 'uk', 'britain', 'england', 'japan', 'france', 'germany', 'canada', 'brazil', 'india', 'china', 'korea', 'mexico', 'rainbow', 'pirate', 'pride', 'trans', 'ireland', 'italy', 'spain', 'sweden', 'norway', 'finland', 'denmark', 'portugal', 'russia', 'vietnam', 'thailand', 'turkey', 'ukraine', 'argentina', 'austria', 'belgium', 'switzerland', 'netherlands', 'greece', 'poland', 'egypt', 'israel', 'saudi', 'emirates', 'qatar', 'kuwait', 'iran', 'iraq', 'pakistan', 'bangladesh', 'indonesia', 'malaysia', 'philippines', 'singapore', 'taiwan', 'hong kong', 'chile', 'colombia', 'peru', 'venezuela', 'uruguay', 'nigeria', 'kenya', 'ghana', 'morocco', 'south africa', 'ethiopia', 'czech', 'hungary', 'romania', 'slovakia', 'croatia', 'serbia', 'iceland', 'jamaica', 'cuba', 'panama', 'costa rica', 'ecuador', 'bolivia', 'paraguay', 'nepal', 'sri lanka', 'cambodia', 'laos', 'mongolia', 'kazakhstan', 'lebanon', 'jordan', 'oman', 'yemen', 'syria', 'afghanistan', 'palestine', 'monaco', 'luxembourg', 'malta', 'cyprus', 'estonia', 'latvia', 'lithuania', 'slovenia'],
  Nature: ['nature', 'flower', 'tree', 'plant', 'leaf', 'sun', 'moon', 'star', 'cloud', 'rain', 'snow', 'wind', 'fire', 'water', 'rainbow', 'mushroom', 'earth', 'globe', 'rose', 'tulip', 'cherry', 'blossom', 'cactus', 'clover', 'lightning', 'thunder', 'umbrella', 'wave', 'ocean', 'weather', 'storm', 'tornado'],
}

const EMOJI_DATA = [
  { cat: 'Smileys', emojis: '😀 😃 😄 😁 😆 😅 🤣 😂 🙂 🙃 🫠 😉 😊 😇 🥰 😍 🤩 😘 😗 😚 😙 🥲 😋 😛 😜 🤪 😝 🤑 🤗 🤭 🫢 🫣 🤫 🤔 🫡 🤐 🤨 😐 😑 😶 🫥 😶‍🌫️ 😏 😒 🙄 😬 😮‍💨 🤥 🫨 😌 😔 😪 🤤 😴 😷 🤒 🤕 🤢 🤮 🤧 🥵 🥶 🥴 😵 😵‍💫 🤯 🤠 🥳 🥸 😎 🤓 🧐 😕 🫤 😟 🙁 ☹️ 😮 😯 😲 😳 🥺 🥹 😦 😧 😨 😰 😥 😢 😭 😱 😖 😣 😞 😓 😩 😫 🥱 😤 😡 😠 🤬 😈 👿 💀 ☠️ 💩 🤡 👹 👺 👻 👽 👾 🤖 😺 😸 😹 😻 😼 😽 🙀 😿 😾 🙈 🙉 🙊 💋' },
  { cat: 'Hands', emojis: '👋 🤚 🖐️ ✋ 🖖 🫱 🫲 🫳 🫴 🫷 🫸 👌 🤌 🤏 ✌️ 🤞 🫰 🤟 🤘 🤙 👈 👉 👆 🖕 👇 ☝️ 🫵 👍 👎 ✊ 👊 🤛 🤜 👏 🙌 🫶 👐 🤲 🤝 🙏 ✍️ 💅 🤳 💪 🦾 🦿 🦵 🦶 👂 🦻 👃 🧠 🫀 🫁 🦷 🦴 👀 👁️ 👅 👄 🫦' },
  { cat: 'People', emojis: '👶 🧒 👦 👧 🧑 👱 👨 🧔 🧔‍♂️ 🧔‍♀️ 👩 🧓 👴 👵 🧑‍🦰 👨‍🦰 👩‍🦰 🧑‍🦱 👨‍🦱 👩‍🦱 🧑‍🦳 👨‍🦳 👩‍🦳 🧑‍🦲 👨‍🦲 👩‍🦲 🙍 🙍‍♂️ 🙍‍♀️ 🙎 🙎‍♂️ 🙎‍♀️ 🙅 🙅‍♂️ 🙅‍♀️ 🙆 🙆‍♂️ 🙆‍♀️ 💁 💁‍♂️ 💁‍♀️ 🙋 🙋‍♂️ 🙋‍♀️ 🧏 🧏‍♂️ 🧏‍♀️ 🙇 🙇‍♂️ 🙇‍♀️ 🤦 🤦‍♂️ 🤦‍♀️ 🤷 🤷‍♂️ 🤷‍♀️ 🧑‍⚕️ 👨‍⚕️ 👩‍⚕️ 🧑‍🎓 👨‍🎓 👩‍🎓 🧑‍🏫 👨‍🏫 👩‍🏫 🧑‍⚖️ 👨‍⚖️ 👩‍⚖️ 🧑‍🌾 👨‍🌾 👩‍🌾 🧑‍🍳 👨‍🍳 👩‍🍳 🧑‍🔧 👨‍🔧 👩‍🔧 🧑‍🏭 👨‍🏭 👩‍🏭 🧑‍💼 👨‍💼 👩‍💼 🧑‍🔬 👨‍🔬 👩‍🔬 🧑‍💻 👨‍💻 👩‍💻 🧑‍🎤 👨‍🎤 👩‍🎤 🧑‍🎨 👨‍🎨 👩‍🎨 🧑‍✈️ 👨‍✈️ 👩‍✈️ 🧑‍🚀 👨‍🚀 👩‍🚀 🧑‍🚒 👨‍🚒 👩‍🚒 👮 👮‍♂️ 👮‍♀️ 🕵️ 🕵️‍♂️ 🕵️‍♀️ 💂 💂‍♂️ 💂‍♀️ 🥷 👷 👷‍♂️ 👷‍♀️ 🫅 🤴 👸 👳 👳‍♂️ 👳‍♀️ 👲 🧕 🤵 🤵‍♂️ 🤵‍♀️ 👰 👰‍♂️ 👰‍♀️ 🤰 🫃 🫄 🤱 🧑‍🍼 👨‍🍼 👩‍🍼 👼 🎅 🤶 🧑‍🎄 🦸 🦸‍♂️ 🦸‍♀️ 🦹 🦹‍♂️ 🦹‍♀️ 🧙 🧙‍♂️ 🧙‍♀️ 🧚 🧚‍♂️ 🧚‍♀️ 🧛 🧛‍♂️ 🧛‍♀️ 🧜 🧜‍♂️ 🧜‍♀️ 🧝 🧝‍♂️ 🧝‍♀️ 🧞 🧞‍♂️ 🧞‍♀️ 🧟 🧟‍♂️ 🧟‍♀️ 🧌 🧑‍🦯 👨‍🦯 👩‍🦯 🧑‍🦼 👨‍🦼 👩‍🦼 🧑‍🦽 👨‍🦽 👩‍🦽 💆 💆‍♂️ 💆‍♀️ 💇 💇‍♂️ 💇‍♀️ 🚶 🚶‍♂️ 🚶‍♀️ 🧍 🧍‍♂️ 🧍‍♀️ 🧎 🧎‍♂️ 🧎‍♀️ 🏃 🏃‍♂️ 🏃‍♀️ 💃 🕺 🕴️ 👯 👯‍♂️ 👯‍♀️ 🧖 🧗 🤸 ⛹️ 🏋️ 🚴 🚵 🤼 🤽 🤾 🤺 ⛷️ 🏂 🏌️ 🏄 🚣 🏊 🤿 🧘 🧑‍🤝‍🧑 👭 👫 👬 💏 💑 👪 👨‍👩‍👦 👨‍👩‍👧 👨‍👩‍👧‍👦 👨‍👩‍👦‍👦 👨‍👩‍👧‍👧 👩‍👩‍👦 👩‍👩‍👧 👨‍👨‍👦 👨‍👨‍👧 👩‍👦 👩‍👧 👨‍👦 👨‍👧' },
  { cat: 'Animals', emojis: '🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐻‍❄️ 🐨 🐯 🦁 🐮 🐷 🐽 🐸 🐵 🙈 🙉 🙊 🐒 🐔 🐧 🐦 🐦‍⬛ 🐤 🐣 🐥 🦆 🦢 🦅 🦉 🦇 🐺 🐗 🐴 🦄 🐝 🪱 🐛 🦋 🐌 🐞 🐜 🪰 🪲 🪳 🦟 🦗 🕷️ 🦂 🐢 🐍 🦎 🦖 🦕 🐙 🦑 🦐 🦞 🦀 🪼 🐡 🐠 🐟 🐬 🐳 🐋 🦈 🐊 🐅 🐆 🦓 🦍 🦧 🦣 🐘 🦛 🦏 🐪 🐫 🦒 🦘 🦬 🐃 🐂 🐄 🐎 🐖 🐏 🐑 🦙 🐐 🦌 🐕 🐩 🦮 🐕‍🦺 🐈 🐈‍⬛ 🪶 🪽 🐓 🦃 🦤 🦚 🦜 🦩 🕊️ 🐇 🦝 🦨 🦡 🦫 🦦 🦥 🐁 🐀 🐿️ 🦔 🪿 🫎 🫏' },
  { cat: 'Food', emojis: '🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍈 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🍆 🥑 🥦 🥬 🥒 🌶️ 🫑 🌽 🥕 🫒 🧄 🧅 🥔 🍠 🫘 🫛 🫚 🥐 🥯 🍞 🥖 🥨 🧀 🥚 🍳 🧈 🥞 🧇 🥓 🥩 🍗 🍖 🦴 🌭 🍔 🍟 🍕 🫓 🥪 🥙 🧆 🌮 🌯 🫔 🥗 🥘 🫕 🥫 🍝 🍜 🍲 🍛 🍣 🍱 🥟 🦪 🍤 🍙 🍚 🍘 🍥 🥠 🥮 🍢 🍡 🍧 🍨 🍦 🥧 🧁 🍰 🎂 🍮 🍭 🍬 🍫 🍿 🍩 🍪 🌰 🥜 🍯 🥛 🫗 🍼 🫖 ☕ 🍵 🧃 🥤 🧋 🍶 🍺 🍻 🥂 🍷 🥃 🍸 🍹 🧉 🍾 🧊 🥄 🍴 🍽️ 🥢 🧂' },
  { cat: 'Activities', emojis: '⚽ 🏀 🏈 ⚾ 🥎 🎾 🏐 🏉 🥏 🎱 🪀 🏓 🏸 🏒 🏑 🥍 🏏 🪃 🥅 ⛳ 🪁 🏹 🎣 🤿 🥊 🥋 🎽 🛹 🛼 🛷 ⛸️ 🥌 🎿 🏆 🥇 🥈 🥉 🏅 🎖️ 🏵️ 🎗️ 🎫 🎟️ 🎪 🤹 🎭 🩰 🎨 🎬 🎤 🎧 🎼 🎵 🎶 📯 🥁 🪘 🪇 🎷 🎺 🪗 🎸 🪕 🎻 🪈 🎲 ♟️ 🎯 🎳 🎮 🕹️ 🎰 🧩 🃏 🀄 🎴 🎠 🎡 🎢 🎉 🎊 🎈 🎂 🎁 🎏 🎐 🎀' },
  { cat: 'Travel', emojis: '🚗 🚕 🚙 🚌 🚎 🏎️ 🚓 🚑 🚒 🚐 🛻 🚚 🚛 🚜 🏍️ 🛵 🦽 🦼 🛺 🚲 🛴 🛹 🛼 🚏 🛣️ 🛤️ ⛽ 🛞 🚨 🚥 🚦 🛑 🚧 ⚓ 🛟 ⛵ 🛶 🚤 🛳️ ⛴️ 🛥️ 🚢 ✈️ 🛩️ 🛫 🛬 🪂 💺 🚁 🚟 🚠 🚡 🛰️ 🚀 🛸 🏠 🏡 🏢 🏣 🏤 🏥 🏦 🏨 🏩 🏪 🏫 🏬 🏭 🏯 🏰 💒 🗼 🗽 ⛪ 🕌 🛕 🕍 ⛩️ 🕋 ⛲ ⛺ 🌁 🏔️ ⛰️ 🌋 🗻 🏕️ 🏖️ 🏜️ 🏝️ 🏞️ 🗾 🌅 🌄 🌠 🎇 🎆 🌇 🌆 🏙️ 🌃 🌌 🌉' },
  { cat: 'Objects', emojis: '⌚ 📱 📲 💻 ⌨️ 🖥️ 🖨️ 🖱️ 🖲️ 🕹️ 🗜️ 💽 💾 💿 📀 📼 📷 📸 📹 🎥 📽️ 🎞️ 📞 ☎️ 📟 📠 📺 📻 🎙️ 🎚️ 🎛️ 🧭 ⏱️ ⏲️ ⏰ 🕰️ ⌛ ⏳ 🕐 🕑 🕒 🕓 🕔 🕕 🕖 🕗 🕘 🕙 🕚 🕛 📡 🔋 🪫 🔌 💡 🔦 🕯️ 🪔 🧯 🛢️ 💸 💵 💴 💶 💷 🪙 💰 💳 🧾 💎 ⚖️ 🪜 🧰 🪛 🔧 🔨 ⚒️ 🛠️ ⛏️ 🪚 🔩 ⚙️ 🪤 🧱 ⛓️ 🧲 🔫 💣 🧨 🪓 🔪 🗡️ ⚔️ 🛡️ 🚬 ⚰️ 🪦 ⚱️ 🏺 🔮 📿 🧿 🪬 💈 ⚗️ 🔭 🔬 🕳️ 🩹 🩺 🩻 🩼 💊 💉 🩸 🧬 🦠 🧫 🧪 🌡️ 🧹 🪠 🧺 🧻 🚽 🚰 🚿 🛁 🛀 🧼 🪥 🪒 🧽 🪣 🧴 🛎️ 🔑 🗝️ 🚪 🪑 🛋️ 🛏️ 🛌 🪞 🪟 🖼️ 🪆 🕰️ 🧸 🪅 🪩 🎎 🎐 🎏 🧧 ✉️ 📩 📨 📧 💌 📮 📪 📫 📬 📭 📦 🏷️ 🪧 📄 📃 📑 🧾 📊 📈 📉 🗒️ 🗓️ 📆 📅 🗑️ 📇 🗃️ 🗳️ 🗄️ 📋 📁 📂 🗂️ 🗞️ 📰 📓 📔 📒 📕 📗 📘 📙 📚 📖 🔖 🧷 🔗 📎 🖇️ 📐 📏 🧮 📌 📍 ✂️ 🖊️ 🖋️ ✒️ 🖌️ 🖍️ 📝 ✏️ 🔍 🔎 🔏 🔐 🔒 🔓 👓 🕶️ 🥽 🥼 🦺 👔 👕 👖 🧣 🧤 🧥 🧦 👗 👘 🥻 🩱 🩲 🩳 👙 👚 👛 👜 👝 🛍️ 🎒 🩴 👞 👟 🥾 🥿 👠 👡 👢 👑 👒 🎩 🎓 🧢 🪖 ⛑️ 📿 💄 💍 💼' },
  { cat: 'Symbols', emojis: '❤️ 🧡 💛 💚 💙 🩵 💜 🖤 🩶 🤍 🤎 💔 ❤️‍🔥 ❤️‍🩹 💕 💞 💓 💗 💖 💘 💝 💟 🩷 ❣️ ☮️ ✝️ ☪️ 🕉️ ☸️ ✡️ 🔯 🕎 ☯️ ☦️ 🛐 ⛎ ♈ ♉ ♊ ♋ ♌ ♍ ♎ ♏ ♐ ♑ ♒ ♓ 🆔 ⚛️ 🉑 ☢️ ☣️ 📴 📳 🈶 🈚 🈸 🈺 🈷️ ✴️ 🆚 💮 🉐 ㊙️ ㊗️ 🈴 🈵 🈹 🈲 🅰️ 🅱️ 🆎 🆑 🅾️ 🆘 ❌ ⭕ 🛑 ⛔ 📛 🚫 💯 💢 ♨️ 🚷 🚯 🚳 🚱 🔞 📵 🚭 ❗ ❕ ❓ ❔ ‼️ ⁉️ 🔅 🔆 〽️ ⚠️ 🚸 🔱 ⚜️ 🔰 ♻️ ✅ 🈯 💹 ❇️ ✳️ ❎ 🌐 💠 Ⓜ️ 🌀 💤 🏧 🚾 ♿ 🅿️ 🛗 🈳 🈂️ 🛂 🛃 🛄 🛅 🛜 ⬆️ ↗️ ➡️ ↘️ ⬇️ ↙️ ⬅️ ↖️ ↕️ ↔️ ↩️ ↪️ ⤴️ ⤵️ 🔃 🔄 🔙 🔚 🔛 🔜 🔝 ▶️ ⏸️ ⏯️ ⏹️ ⏺️ ⏭️ ⏮️ ⏩ ⏪ ⏫ ⏬ ◀️ 🔼 🔽 🔀 🔁 🔂 🔊 🔉 🔈 🔇 📢 📣 🔔 🔕 ➕ ➖ ➗ ✖️ 🟰 ♾️ 💲 💱 ™️ ©️ ®️ 〰️ ➰ ➿ 🔚 🔙 ✔️ ☑️ 🔘 🔳 🔲 ▪️ ▫️ ◾ ◽ ◼️ ◻️ 🟥 🟧 🟨 🟩 🟦 🟪 🟫 ⬛ ⬜ 🔺 🔻 🔸 🔹 🔶 🔷 🔴 🟠 🟡 🟢 🔵 🟣 🟤 ⚪ ⚫ #️⃣ *️⃣ 0️⃣ 1️⃣ 2️⃣ 3️⃣ 4️⃣ 5️⃣ 6️⃣ 7️⃣ 8️⃣ 9️⃣ 🔟' },
  { cat: 'Flags', emojis: '🏁 🚩 🎌 🏴 🏳️ 🏳️‍🌈 🏳️‍⚧️ 🏴‍☠️ 🇦🇫 🇦🇱 🇩🇿 🇦🇩 🇦🇴 🇦🇬 🇦🇷 🇦🇲 🇦🇼 🇦🇺 🇦🇹 🇦🇿 🇧🇸 🇧🇭 🇧🇩 🇧🇧 🇧🇾 🇧🇪 🇧🇿 🇧🇯 🇧🇹 🇧🇴 🇧🇦 🇧🇼 🇧🇷 🇧🇳 🇧🇬 🇧🇫 🇧🇮 🇰🇭 🇨🇲 🇨🇦 🇨🇻 🇨🇫 🇹🇩 🇨🇱 🇨🇳 🇨🇴 🇰🇲 🇨🇬 🇨🇩 🇨🇷 🇨🇮 🇭🇷 🇨🇺 🇨🇾 🇨🇿 🇩🇰 🇩🇯 🇩🇲 🇩🇴 🇪🇨 🇪🇬 🇸🇻 🇬🇶 🇪🇷 🇪🇪 🇸🇿 🇪🇹 🇫🇯 🇫🇮 🇫🇷 🇬🇦 🇬🇲 🇬🇪 🇩🇪 🇬🇭 🇬🇷 🇬🇩 🇬🇹 🇬🇳 🇬🇼 🇬🇾 🇭🇹 🇭🇳 🇭🇰 🇭🇺 🇮🇸 🇮🇳 🇮🇩 🇮🇷 🇮🇶 🇮🇪 🇮🇱 🇮🇹 🇯🇲 🇯🇵 🇯🇴 🇰🇿 🇰🇪 🇰🇮 🇰🇼 🇰🇬 🇱🇦 🇱🇻 🇱🇧 🇱🇸 🇱🇷 🇱🇾 🇱🇮 🇱🇹 🇱🇺 🇲🇴 🇲🇬 🇲🇼 🇲🇾 🇲🇻 🇲🇱 🇲🇹 🇲🇭 🇲🇷 🇲🇺 🇲🇽 🇫🇲 🇲🇩 🇲🇨 🇲🇳 🇲🇪 🇲🇦 🇲🇿 🇲🇲 🇳🇦 🇳🇵 🇳🇱 🇳🇿 🇳🇮 🇳🇪 🇳🇬 🇰🇵 🇲🇰 🇳🇴 🇴🇲 🇵🇰 🇵🇼 🇵🇸 🇵🇦 🇵🇬 🇵🇾 🇵🇪 🇵🇭 🇵🇱 🇵🇹 🇵🇷 🇶🇦 🇷🇴 🇷🇺 🇷🇼 🇼🇸 🇸🇲 🇸🇦 🇸🇳 🇷🇸 🇸🇨 🇸🇱 🇸🇬 🇸🇰 🇸🇮 🇸🇧 🇸🇴 🇿🇦 🇰🇷 🇸🇸 🇪🇸 🇱🇰 🇸🇩 🇸🇷 🇸🇪 🇨🇭 🇸🇾 🇹🇼 🇹🇯 🇹🇿 🇹🇭 🇹🇱 🇹🇬 🇹🇴 🇹🇹 🇹🇳 🇹🇷 🇹🇲 🇺🇬 🇺🇦 🇦🇪 🇬🇧 🇺🇸 🇺🇾 🇺🇿 🇻🇺 🇻🇦 🇻🇪 🇻🇳 🇾🇪 🇿🇲 🇿🇼' },
  { cat: 'Nature', emojis: '🌸 💐 🌷 🌹 🥀 🌺 🌻 🌼 🪷 🪻 🏵️ 🌱 🪴 🌲 🌳 🌴 🌵 🌾 🌿 ☘️ 🍀 🍁 🍂 🍃 🍄 🐚 🪸 🪹 🪺 🌰 🌍 🌎 🌏 🌕 🌖 🌗 🌘 🌑 🌒 🌓 🌔 🌚 🌝 🌛 🌜 🌞 ⭐ 🌟 💫 ✨ ☄️ ☀️ 🌤️ ⛅ 🌥️ 🌦️ 🌧️ ⛈️ 🌩️ 🌨️ ❄️ ☃️ ⛄ 🌬️ 💨 🌪️ 🌫️ 🌈 🌂 ☂️ ☔ ⚡ 🔥 💧 🌊 🎄 🎋 🎍' },
]

function parseEmojis(str) {
  return str.split(/\s+/).filter(Boolean)
}

// Emoji_Modifier_Base — the code points that accept a Fitzpatrick skin-tone
// modifier (Unicode 15). Anything outside this set (or any ZWJ sequence) is
// shown and copied unchanged, so we never emit a broken base-plus-swatch pair
// (e.g. a car followed by a floating skin square).
const MODIFIER_BASE = new Set()
const MODIFIER_RANGES = [
  [0x261D, 0x261D], [0x26F9, 0x26F9], [0x270A, 0x270D],
  [0x1F385, 0x1F385], [0x1F3C2, 0x1F3C4], [0x1F3C7, 0x1F3C7], [0x1F3CA, 0x1F3CC],
  [0x1F442, 0x1F443], [0x1F446, 0x1F450], [0x1F466, 0x1F478], [0x1F47C, 0x1F47C],
  [0x1F481, 0x1F483], [0x1F485, 0x1F487], [0x1F48F, 0x1F48F], [0x1F491, 0x1F491],
  [0x1F4AA, 0x1F4AA], [0x1F574, 0x1F575], [0x1F57A, 0x1F57A], [0x1F590, 0x1F590],
  [0x1F595, 0x1F596], [0x1F645, 0x1F647], [0x1F64B, 0x1F64F], [0x1F6A3, 0x1F6A3],
  [0x1F6B4, 0x1F6B6], [0x1F6C0, 0x1F6C0], [0x1F6CC, 0x1F6CC], [0x1F90C, 0x1F90C],
  [0x1F90F, 0x1F90F], [0x1F918, 0x1F91F], [0x1F926, 0x1F926], [0x1F930, 0x1F939],
  [0x1F93D, 0x1F93E], [0x1F977, 0x1F977], [0x1F9B5, 0x1F9B6], [0x1F9BB, 0x1F9BB],
  [0x1F9CD, 0x1F9CF], [0x1F9D1, 0x1F9DD], [0x1FAC3, 0x1FAC5], [0x1FAF0, 0x1FAF8],
]
MODIFIER_RANGES.forEach(([a, b]) => { for (let c = a; c <= b; c++) MODIFIER_BASE.add(c) })

function supportsSkinTone(emoji) {
  if (!emoji) return false
  const cps = [...emoji]
  if (cps.some(c => c.codePointAt(0) === 0x200D)) return false   // ZWJ sequence → skip (v1)
  return MODIFIER_BASE.has(cps[0].codePointAt(0))
}

// Insert the tone right after the base code point, dropping an emoji-presentation
// selector (U+FE0F) that must not sit between the base and its modifier.
function toneOf(emoji, tone) {
  if (!tone) return emoji
  const cps = [...emoji]
  const rest = cps.slice(1).filter((c, i) => !(i === 0 && c.codePointAt(0) === 0xFE0F))
  return cps[0] + tone + rest.join('')
}

export default function EmojiLibrary({ onCopy, embedded }) {
  const { t } = useI18n()
  const [search, setSearch] = useState('')
  const [activeCat, setActiveCat] = useState(null)
  const [copied, setCopied] = useState(null)
  const [skinTone, setSkinTone] = useState('')
  const [visible, setVisible] = useState(PAGE_SIZE)
  const sentinelRef = useRef(null)

  const allCategories = EMOJI_DATA.map(d => d.cat)

  const filteredData = useMemo(() => {
    const q = search.toLowerCase().trim()
    let data = activeCat ? EMOJI_DATA.filter(d => d.cat === activeCat) : EMOJI_DATA
    if (!q) return data
    return data.map(group => {
      const keywords = CATEGORY_KEYWORDS[group.cat] || []
      const catMatch = group.cat.toLowerCase().includes(q) || keywords.some(k => k.includes(q) || q.includes(k))
      return { ...group, emojis: catMatch ? group.emojis : '' }
    }).filter(g => parseEmojis(g.emojis).length > 0)
  }, [search, activeCat])

  // Pre-parse each group's emoji array and compute the total emoji count so we
  // can window the render and drive the infinite-scroll sentinel.
  const parsedGroups = useMemo(
    () => filteredData.map(g => ({ cat: g.cat, emojis: parseEmojis(g.emojis) })),
    [filteredData]
  )
  const filteredCount = useMemo(
    () => parsedGroups.reduce((sum, g) => sum + g.emojis.length, 0),
    [parsedGroups]
  )

  // Build the windowed list of sections: only render up to `visible` emoji,
  // truncating the section that straddles the boundary.
  const shownGroups = useMemo(() => {
    const out = []
    let budget = visible
    for (const g of parsedGroups) {
      if (budget <= 0) break
      const slice = g.emojis.slice(0, budget)
      out.push({ cat: g.cat, total: g.emojis.length, emojis: slice })
      budget -= slice.length
    }
    return out
  }, [parsedGroups, visible])

  const hasMore = visible < filteredCount

  // Reset the window whenever the filter (search or category) changes. Handled
  // in the change handlers below so it stays out of an effect.
  const setSearchReset = useCallback((val) => { setSearch(val); setVisible(PAGE_SIZE) }, [])
  const setCatReset = useCallback((cat) => { setActiveCat(cat); setVisible(PAGE_SIZE) }, [])

  // Infinite scroll — reveal another page as the sentinel comes into view.
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) setVisible(v => Math.min(v + PAGE_SIZE, filteredCount))
    }, { rootMargin: '600px' })
    obs.observe(el)
    return () => obs.disconnect()
  }, [filteredCount, visible])

  const handleCopy = useCallback((emoji) => {
    const text = supportsSkinTone(emoji) ? toneOf(emoji, skinTone) : emoji
    navigator.clipboard.writeText(text)
    onCopy(text)
    setCopied(emoji)
    setTimeout(() => setCopied(null), 1200)
  }, [onCopy, skinTone])

  // EMOJI_DATA is static — parse the full set once, not on every render
  // (this ran on every scroll/keystroke and was the source of the scroll lag).
  const totalCount = useMemo(() => EMOJI_DATA.reduce((sum, g) => sum + parseEmojis(g.emojis).length, 0), [])

  return (
    <div className="sec">
      {!embedded && (
        <div className="sec-h">
          <div className="sec-h-eyebrow">{t('emojiLibrary.eyebrow')}</div>
          <h1>{t('emojiLibrary.heading')}</h1>
          <p>{t('emojiLibrary.subtitle')}</p>
        </div>
      )}

      <div className="pl-toolbar">
        <div className="pl-search-wrap">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="pl-search"
            placeholder="Search emojis..."
            value={search}
            onChange={e => setSearchReset(e.target.value)}
          />
          {search && (
            <button className="pl-search-clear" onClick={() => setSearchReset('')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          )}
        </div>

        <div className="emoji-skin-tones">
          {['', '\u{1F3FB}', '\u{1F3FC}', '\u{1F3FD}', '\u{1F3FE}', '\u{1F3FF}'].map((tone, i) => (
            <button
              key={i}
              className={`emoji-skin-btn${skinTone === tone ? ' active' : ''}`}
              onClick={() => setSkinTone(tone)}
              title={i === 0 ? 'Default' : `Skin tone ${i}`}
              aria-label={i === 0 ? 'Default skin tone' : `Skin tone ${i}`}
            >
              {i === 0 ? '👋' : `👋${tone}`}
            </button>
          ))}
        </div>

        <div className="pl-chips">
          <button className={`pl-chip${!activeCat ? ' active' : ''}`} onClick={() => setCatReset(null)}>
            All ({totalCount})
          </button>
          {allCategories.map(cat => (
            <button
              key={cat}
              className={`pl-chip${activeCat === cat ? ' active' : ''}`}
              onClick={() => setCatReset(activeCat === cat ? null : cat)}
            >{cat}</button>
          ))}
        </div>
      </div>

      <div className="emoji-sections">
        {shownGroups.map(group => {
          if (!group.emojis.length) return null
          return (
            <section key={group.cat} className="emoji-section">
              <div className="emoji-section-head">
                <h3>{group.cat}</h3>
                <span className="emoji-section-count">{group.total}</span>
              </div>
              <div className="emoji-grid">
                {group.emojis.map((emoji, i) => {
                  const shown = supportsSkinTone(emoji) ? toneOf(emoji, skinTone) : emoji
                  return (
                    <button
                      key={i}
                      className={`emoji-cell${copied === emoji ? ' copied' : ''}`}
                      onClick={() => handleCopy(emoji)}
                      title={`Copy ${shown}`}
                    >
                      <span className="emoji-char">{shown}</span>
                    </button>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>

      {search.trim() && filteredCount === 0 && (
        <div className="pl-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <p>No emoji found for &ldquo;{search.trim()}&rdquo;</p>
        </div>
      )}

      {hasMore && <div ref={sentinelRef} style={{ height: 1 }} />}
    </div>
  )
}
