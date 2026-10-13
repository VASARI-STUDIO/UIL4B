export function flattenOptions(options) {
  return options.flatMap(option => option.options ? flattenOptions(option.options).map(item => ({ ...item, disabled: option.disabled || item.disabled })) : [typeof option === 'string' ? { value: option, label: option } : option])
}

export function selectedOptionIndex(value, options) {
  const selected = options.findIndex(option => String(option.value) === String(value) && !option.disabled)
  return selected < 0 ? listboxTarget('Home', -1, options) : selected
}

export function listboxSelection(index, options, value) {
  const option = options[index]
  if (!option || option.disabled || String(option.value) === String(value)) return null
  return String(option.value)
}

export function listboxKeyAction(key, open, disabled = false) {
  if (disabled) return null
  if (!open) return ['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(key) ? 'open' : null
  if (key === 'Enter' || key === ' ') return 'select'
  if (key === 'Escape' || key === 'Tab') return 'close'
  if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(key)) return 'move'
  return key.length === 1 ? 'typeahead' : null
}

export function listboxTarget(key, index, options) {
  const enabled = options.map((option, i) => option.disabled ? -1 : i).filter(i => i >= 0)
  if (!enabled.length) return -1
  const position = enabled.indexOf(index)
  switch (key) {
    case 'Home': return enabled[0]
    case 'End': return enabled.at(-1)
    case 'ArrowDown': return enabled[(position + 1) % enabled.length]
    case 'ArrowUp': return enabled[position < 0 ? enabled.length - 1 : (position - 1 + enabled.length) % enabled.length]
    default: return -1
  }
}

export function typeaheadTarget(key, index, options, previous = { text: '', time: 0 }, time = Date.now()) {
  const text = (time - previous.time < 500 ? previous.text : '') + key.toLocaleLowerCase()
  const query = [...text].every(char => char === text[0]) ? text[0] : text
  // A longer prefix refines the current match; repeated letters cycle forward.
  const start = query.length > 1 ? Math.max(index, 0) : index + 1
  for (let offset = 0; offset < options.length; offset++) {
    const next = (start + offset) % options.length
    if (!options[next].disabled && String(options[next].label).trim().toLocaleLowerCase().startsWith(query)) {
      return { index: next, text, time }
    }
  }
  return { index, text, time }
}
