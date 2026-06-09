import { useState, useMemo, useCallback } from 'react'
import { useI18n } from '../contexts/I18nContext'

const CATEGORY_KEYWORDS = {
  Smileys: ['smile', 'happy', 'sad', 'angry', 'face', 'laugh', 'cry', 'love', 'think', 'sick', 'cool', 'wink', 'tongue', 'skull', 'ghost', 'robot', 'devil', 'poop', 'scared', 'nervous', 'silly', 'party', 'nerd', 'sleepy', 'disguise', 'vomit', 'hot', 'cold', 'dizzy', 'explode', 'cowboy', 'clown', 'alien', 'demon'],
  Hands: ['hand', 'wave', 'point', 'thumb', 'fist', 'clap', 'finger', 'muscle', 'pray', 'shake', 'peace', 'ok', 'punch', 'pinch', 'rock', 'call', 'nail', 'selfie', 'write', 'ear', 'nose', 'brain', 'eye', 'tooth', 'bone', 'leg', 'foot', 'lip', 'tongue'],
  People: ['person', 'man', 'woman', 'boy', 'girl', 'baby', 'old', 'walk', 'run', 'dance', 'swim', 'climb', 'ninja', 'prince', 'princess', 'santa', 'hero', 'fairy', 'zombie', 'mage', 'elf', 'genie', 'vampire', 'mermaid', 'troll', 'angel', 'guard', 'detective', 'construction', 'bride'],
  Animals: ['animal', 'dog', 'cat', 'bird', 'fish', 'bear', 'monkey', 'horse', 'cow', 'pig', 'chicken', 'snake', 'rabbit', 'bug', 'spider', 'whale', 'shark', 'elephant', 'lion', 'tiger', 'frog', 'fox', 'panda', 'unicorn', 'butterfly', 'bee', 'turtle', 'octopus', 'penguin', 'koala', 'wolf', 'bat', 'owl', 'crab', 'snail', 'ant', 'dragon', 'dinosaur', 'mouse', 'hamster', 'deer', 'giraffe', 'gorilla', 'parrot', 'duck'],
  Food: ['food', 'fruit', 'vegetable', 'meat', 'drink', 'beer', 'wine', 'coffee', 'tea', 'pizza', 'burger', 'cake', 'ice cream', 'bread', 'cheese', 'rice', 'sushi', 'candy', 'apple', 'banana', 'grape', 'strawberry', 'taco', 'donut', 'cookie', 'egg', 'bacon', 'fries', 'chocolate', 'pie', 'lemon', 'watermelon', 'avocado', 'corn', 'carrot', 'tomato', 'salad', 'noodle', 'soup'],
  Travel: ['travel', 'car', 'bus', 'train', 'plane', 'boat', 'ship', 'house', 'building', 'city', 'mountain', 'beach', 'rocket', 'helicopter', 'taxi', 'truck', 'bike', 'motorcycle', 'tent', 'church', 'castle', 'bridge', 'tower', 'statue', 'sunset', 'sunrise', 'firework', 'camping', 'island', 'volcano'],
  Objects: ['object', 'phone', 'computer', 'camera', 'clock', 'watch', 'money', 'key', 'tool', 'hammer', 'wrench', 'bulb', 'battery', 'pill', 'knife', 'book', 'pencil', 'guitar', 'piano', 'game', 'joystick', 'tv', 'radio', 'candle', 'lock', 'magnet', 'gem', 'diamond', 'toilet', 'shower', 'bed', 'chair', 'door', 'lamp', 'microscope', 'telescope', 'syringe', 'dna'],
  Symbols: ['symbol', 'heart', 'star', 'arrow', 'warning', 'check', 'cross', 'circle', 'square', 'diamond', 'sign', 'number', 'letter', 'music', 'zodiac', 'love', 'peace', 'recycle', 'infinity', 'question', 'exclamation', 'triangle', 'color', 'colour', 'red', 'blue', 'green', 'purple', 'orange', 'yellow', 'black', 'white', 'pink', 'brown'],
  Flags: ['flag', 'country', 'nation', 'australia', 'usa', 'uk', 'japan', 'france', 'germany', 'canada', 'brazil', 'india', 'china', 'korea', 'mexico', 'rainbow', 'pirate', 'pride', 'trans', 'ireland', 'italy', 'spain', 'sweden', 'norway', 'finland', 'denmark', 'portugal', 'russia', 'vietnam', 'thailand', 'turkey', 'ukraine'],
  Nature: ['nature', 'flower', 'tree', 'plant', 'leaf', 'sun', 'moon', 'star', 'cloud', 'rain', 'snow', 'wind', 'fire', 'water', 'rainbow', 'mushroom', 'earth', 'globe', 'rose', 'tulip', 'cherry', 'blossom', 'cactus', 'clover', 'lightning', 'thunder', 'umbrella', 'wave', 'ocean', 'weather', 'storm', 'tornado'],
}

const EMOJI_DATA = [
  { cat: 'Smileys', emojis: '😀 😃 😄 😁 😆 😅 🤣 😂 🙂 🙃 😉 😊 😇 🥰 😍 🤩 😘 😗 😚 😙 🥲 😋 😛 😜 🤪 😝 🤑 🤗 🤭 🫣 🤫 🤔 🫡 🤐 🤨 😐 😑 😶 🫥 😏 😒 🙄 😬 🤥 😌 😔 😪 🤤 😴 😷 🤒 🤕 🤢 🤮 🥵 🥶 🥴 😵 🤯 🤠 🥳 🥸 😎 🤓 🧐 😕 🫤 😟 🙁 😮 😯 😲 😳 🥺 🥹 😦 😧 😨 😰 😥 😢 😭 😱 😖 😣 😞 😓 😩 😫 🥱 😤 😡 😠 🤬 😈 👿 💀 ☠️ 💩 🤡 👹 👺 👻 👽 👾 🤖' },
  { cat: 'Hands', emojis: '👋 🤚 🖐️ ✋ 🖖 🫱 🫲 🫳 🫴 👌 🤌 🤏 ✌️ 🤞 🫰 🤟 🤘 🤙 👈 👉 👆 🖕 👇 ☝️ 🫵 👍 👎 ✊ 👊 🤛 🤜 👏 🙌 🫶 👐 🤲 🤝 🙏 ✍️ 💅 🤳 💪 🦾 🦿 🦵 🦶 👂 🦻 👃 🧠 🫀 🫁 🦷 🦴 👀 👁️ 👅 👄 🫦' },
  { cat: 'People', emojis: '👶 🧒 👦 👧 🧑 👱 👨 🧔 👩 🧓 👴 👵 🙍 🙎 🙅 🙆 💁 🙋 🧏 🙇 🤦 🤷 👮 🕵️ 💂 🥷 👷 🫅 🤴 👸 👳 👲 🧕 🤵 👰 🤰 🫃 🫄 🤱 👼 🎅 🤶 🦸 🦹 🧙 🧚 🧛 🧜 🧝 🧞 🧟 🧌 💆 💇 🚶 🧍 🧎 🏃 💃 🕺 🕴️ 👯 🧖 🧗 🤸 ⛹️ 🏋️ 🚴 🚵 🤼 🤽 🤾 🤺 ⛷️ 🏂 🏌️ 🏄 🚣 🏊 🤿 🧘' },
  { cat: 'Animals', emojis: '🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐻‍❄️ 🐨 🐯 🦁 🐮 🐷 🐽 🐸 🐵 🙈 🙉 🙊 🐒 🐔 🐧 🐦 🐤 🐣 🐥 🦆 🦅 🦉 🦇 🐺 🐗 🐴 🦄 🐝 🪱 🐛 🦋 🐌 🐞 🐜 🪰 🪲 🪳 🦟 🦗 🕷️ 🦂 🐢 🐍 🦎 🦖 🦕 🐙 🦑 🦐 🦞 🦀 🐡 🐠 🐟 🐬 🐳 🐋 🦈 🐊 🐅 🐆 🦓 🦍 🦧 🦣 🐘 🦛 🦏 🐪 🐫 🦒 🦘 🦬 🐃 🐂 🐄 🐎 🐖 🐏 🐑 🦙 🐐 🦌 🐕 🐩 🦮 🐕‍🦺 🐈 🐈‍⬛ 🪶 🐓 🦃 🦤 🦚 🦜 🦢 🦩 🕊️ 🐇 🦝 🦨 🦡 🦫 🦦 🦥 🐁 🐀 🐿️ 🦔' },
  { cat: 'Food', emojis: '🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍈 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🍆 🥑 🥦 🥬 🥒 🌶️ 🫑 🌽 🥕 🫒 🧄 🧅 🥔 🍠 🫘 🥐 🥯 🍞 🥖 🥨 🧀 🥚 🍳 🧈 🥞 🧇 🥓 🥩 🍗 🍖 🦴 🌭 🍔 🍟 🍕 🫓 🥪 🥙 🧆 🌮 🌯 🫔 🥗 🥘 🫕 🥫 🍝 🍜 🍲 🍛 🍣 🍱 🥟 🦪 🍤 🍙 🍚 🍘 🍥 🥠 🥮 🍢 🍡 🍧 🍨 🍦 🥧 🧁 🍰 🎂 🍮 🍭 🍬 🍫 🍿 🍩 🍪 🌰 🥜 🍯 🥛 🫗 🍼 🫖 ☕ 🍵 🧃 🥤 🧋 🫧 🍶 🍺 🍻 🥂 🍷 🫗 🥃 🍸 🍹 🧉 🍾 🧊' },
  { cat: 'Travel', emojis: '🚗 🚕 🚙 🚌 🚎 🏎️ 🚓 🚑 🚒 🚐 🛻 🚚 🚛 🚜 🏍️ 🛵 🦽 🦼 🛺 🚲 🛴 🛹 🛼 🚏 🛣️ 🛤️ ⛽ 🛞 🚨 🚥 🚦 🛑 🚧 ⚓ 🛟 ⛵ 🛶 🚤 🛳️ ⛴️ 🛥️ 🚢 ✈️ 🛩️ 🛫 🛬 🪂 💺 🚁 🚟 🚠 🚡 🛰️ 🚀 🛸 🏠 🏡 🏢 🏣 🏤 🏥 🏦 🏨 🏩 🏪 🏫 🏬 🏭 🏯 🏰 💒 🗼 🗽 ⛪ 🕌 🛕 🕍 ⛩️ 🕋 ⛲ ⛺ 🌁 🏔️ ⛰️ 🌋 🗻 🏕️ 🏖️ 🏜️ 🏝️ 🏞️ 🗾 🌅 🌄 🌠 🎇 🎆 🌇 🌆 🏙️ 🌃 🌌 🌉 🌁' },
  { cat: 'Objects', emojis: '⌚ 📱 📲 💻 ⌨️ 🖥️ 🖨️ 🖱️ 🖲️ 🕹️ 🗜️ 💽 💾 💿 📀 📼 📷 📸 📹 🎥 📽️ 🎞️ 📞 ☎️ 📟 📠 📺 📻 🎙️ 🎚️ 🎛️ 🧭 ⏱️ ⏲️ ⏰ 🕰️ ⌛ ⏳ 📡 🔋 🪫 🔌 💡 🔦 🕯️ 🪔 🧯 🛢️ 💸 💵 💴 💶 💷 🪙 💰 💳 💎 ⚖️ 🪜 🧰 🪛 🔧 🔨 ⚒️ 🛠️ ⛏️ 🪚 🔩 ⚙️ 🪤 🧱 ⛓️ 🧲 🔫 💣 🧨 🪓 🔪 🗡️ ⚔️ 🛡️ 🚬 ⚰️ 🪦 ⚱️ 🏺 🔮 📿 🧿 🪬 💈 ⚗️ 🔭 🔬 🕳️ 🩹 🩺 🩻 💊 💉 🩸 🧬 🦠 🧫 🧪 🌡️ 🧹 🪠 🧺 🧻 🚽 🚰 🚿 🛁 🛀 🧼 🪥 🪒 🧽 🪣 🧴 🛎️ 🔑 🗝️ 🚪 🪑 🛋️ 🛏️ 🛌' },
  { cat: 'Symbols', emojis: '❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❤️‍🔥 ❤️‍🩹 💕 💞 💓 💗 💖 💘 💝 ❣️ 💟 ☮️ ✝️ ☪️ 🕉️ ☸️ ✡️ 🔯 🕎 ☯️ ☦️ 🛐 ⛎ ♈ ♉ ♊ ♋ ♌ ♍ ♎ ♏ ♐ ♑ ♒ ♓ 🆔 ⚛️ 🉑 ☢️ ☣️ 📴 📳 🈶 🈚 🈸 🈺 🈷️ ✴️ 🆚 💮 🉐 ㊙️ ㊗️ 🈴 🈵 🈹 🈲 🅰️ 🅱️ 🆎 🆑 🅾️ 🆘 ❌ ⭕ 🛑 ⛔ 📛 🚫 💯 💢 ♨️ 🚷 🚯 🚳 🚱 🔞 📵 🚭 ❗ ❕ ❓ ❔ ‼️ ⁉️ 🔅 🔆 〽️ ⚠️ 🚸 🔱 ⚜️ 🔰 ♻️ ✅ 🈯 💹 ❇️ ✳️ ❎ 🌐 💠 Ⓜ️ 🌀 💤 🏧 🚾 ♿ 🅿️ 🛗 🈳 🈂️ 🛂 🛃 🛄 🛅 ⬆️ ↗️ ➡️ ↘️ ⬇️ ↙️ ⬅️ ↖️ ↕️ ↔️ ↩️ ↪️ ⤴️ ⤵️ 🔃 🔄 🔙 🔚 🔛 🔜 🔝 🛐 ⚛️ ✡️ ☸️ ☯️ ✝️ ☦️ ☪️ ♾️ 🔘 🔳 🔲 ▪️ ▫️ ◾ ◽ ◼️ ◻️ 🟥 🟧 🟨 🟩 🟦 🟪 ⬛ ⬜ 🟫 🔺 🔻 💠 🔷 🔶 🔵 🟤 🟠 🟡 🟢 🔴 ⚪ ⚫' },
  { cat: 'Flags', emojis: '🏁 🚩 🎌 🏴 🏳️ 🏳️‍🌈 🏳️‍⚧️ 🏴‍☠️ 🇦🇺 🇦🇹 🇧🇷 🇨🇦 🇨🇳 🇩🇰 🇫🇮 🇫🇷 🇩🇪 🇬🇷 🇮🇳 🇮🇩 🇮🇪 🇮🇹 🇯🇵 🇰🇷 🇲🇽 🇳🇱 🇳🇿 🇳🇴 🇵🇱 🇵🇹 🇷🇺 🇸🇦 🇸🇬 🇿🇦 🇪🇸 🇸🇪 🇨🇭 🇹🇭 🇹🇷 🇺🇦 🇬🇧 🇺🇸 🇻🇳' },
  { cat: 'Nature', emojis: '🌸 💐 🌷 🌹 🥀 🌺 🌻 🌼 🌱 🪴 🌲 🌳 🌴 🌵 🌾 🌿 ☘️ 🍀 🍁 🍂 🍃 🪹 🪺 🍄 🌰 🦀 🦞 🦐 🦑 🌍 🌎 🌏 🌕 🌖 🌗 🌘 🌑 🌒 🌓 🌔 🌚 🌝 🌛 🌜 🌞 ⭐ 🌟 💫 ✨ ☄️ 🌤️ ⛅ 🌥️ 🌦️ 🌧️ ⛈️ 🌩️ 🌨️ ❄️ ☃️ ⛄ 🌬️ 💨 🌪️ 🌫️ 🌈 ☂️ ☔ ⚡ 🔥 💧 🌊 🎄 🎋 🎍' },
]

function parseEmojis(str) {
  return str.split(/\s+/).filter(Boolean)
}

export default function EmojiLibrary({ onCopy }) {
  const { t } = useI18n()
  const [search, setSearch] = useState('')
  const [activeCat, setActiveCat] = useState(null)
  const [copied, setCopied] = useState(null)
  const [skinTone, setSkinTone] = useState('')

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

  const handleCopy = useCallback((emoji) => {
    const text = skinTone ? emoji + skinTone : emoji
    navigator.clipboard.writeText(text)
    onCopy(text)
    setCopied(emoji)
    setTimeout(() => setCopied(null), 1200)
  }, [onCopy, skinTone])

  const totalCount = EMOJI_DATA.reduce((sum, g) => sum + parseEmojis(g.emojis).length, 0)

  return (
    <div className="sec">
      <div className="sec-h">
        <div className="sec-h-eyebrow">Emoji Library</div>
        <h1>Emoji Library</h1>
        <p>Browse and copy emojis for your designs. Click any emoji to copy it.</p>
      </div>

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
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="pl-search-clear" onClick={() => setSearch('')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          )}
        </div>

        <div className="pl-chips">
          <button className={`pl-chip${!activeCat ? ' active' : ''}`} onClick={() => setActiveCat(null)}>
            All ({totalCount})
          </button>
          {allCategories.map(cat => (
            <button
              key={cat}
              className={`pl-chip${activeCat === cat ? ' active' : ''}`}
              onClick={() => setActiveCat(activeCat === cat ? null : cat)}
            >{cat}</button>
          ))}
        </div>
      </div>

      <div className="emoji-sections">
        {filteredData.map(group => {
          const emojis = parseEmojis(group.emojis)
          if (!emojis.length) return null
          return (
            <section key={group.cat} className="emoji-section">
              <div className="emoji-section-head">
                <h3>{group.cat}</h3>
                <span className="emoji-section-count">{emojis.length}</span>
              </div>
              <div className="emoji-grid">
                {emojis.map((emoji, i) => (
                  <button
                    key={i}
                    className={`emoji-cell${copied === emoji ? ' copied' : ''}`}
                    onClick={() => handleCopy(emoji)}
                    title={`Copy ${emoji}`}
                  >
                    <span className="emoji-char">{emoji}</span>
                  </button>
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
