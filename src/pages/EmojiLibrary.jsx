import { useState, useMemo, useCallback, useEffect, useRef } from 'react'

const PAGE_SIZE = 200

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
  }, [filteredCount])

  const handleCopy = useCallback((emoji) => {
    const text = skinTone ? emoji + skinTone : emoji
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
                {group.emojis.map((emoji, i) => (
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
