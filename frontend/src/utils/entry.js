/** Shared helpers for the one-line entry format and the khata suggestions. */

export const TAG_PATTERN = /#([\p{L}\p{N}_-]+)/u

/**
 * Starter khatas shown to a brand new account. Each one disappears from the
 * suggestion row the moment the user logs an entry into a khata of that name.
 */
export const PRESET_CATEGORIES = [
  'food',
  'groceries',
  'travel',
  'bills',
  'shopping',
  'health',
  'rent',
  'fun',
]

const PRESET_COLORS = ['mint', 'yellow', 'blue', 'rose']

/** Picks the "#tag" already typed into the entry box, if any. */
export function tagInInput(value) {
  const match = value.match(TAG_PATTERN)
  return match ? match[1].toLowerCase() : null
}

/** Tags `value` with #name, swapping any tag already present. */
export function withTag(value, name) {
  const withoutTags = value.replace(TAG_PATTERN, '').replace(/\s+/g, ' ').trim()
  return `${withoutTags} #${name}`.trim()
}

/** Drops the "#tag" from `value`. */
export function withoutTag(value) {
  return value.replace(TAG_PATTERN, '').replace(/\s+/g, ' ').trim()
}

/**
 * User khatas first, topped up with presets they haven't logged against yet.
 * Once they've created enough khatas of their own the presets are gone.
 */
export function buildSuggestions(userKhatas, limit = 8) {
  const own = userKhatas.map((khata) => ({ name: khata.name, color: khata.color }))
  const used = new Set(own.map((khata) => khata.name.toLowerCase()))

  const presets = PRESET_CATEGORIES.filter((name) => !used.has(name))
    .slice(0, Math.max(0, limit - own.length))
    .map((name, index) => ({ name, color: PRESET_COLORS[index % PRESET_COLORS.length] }))

  return [...own, ...presets]
}

export function todayIso() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

export function formatDate(iso) {
  if (!iso) return ''
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}
