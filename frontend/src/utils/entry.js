/** Shared helpers for the one-line entry format and the khata suggestions. */

import { evaluateExpression, roundMoney } from './arithmetic'

export const TAG_PATTERN = /#([\p{L}\p{N}_-]+)/u

const TAG_PATTERN_GLOBAL = /#[\p{L}\p{N}_-]+/gu
const NUMBERISH = /^[0-9+\-*/().,]+$/
const OPERATORISH = /^[+\-*/()]+$/

export const MISSING_AMOUNT = 'Please enter a spending amount before adding this expense.'

/** Gullak says "amount" rather than "spending amount" — same rule, different words. */
export const MISSING_GULLAK_AMOUNT = 'Please enter an amount before adding this to your gullak.'

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

function isNumberish(token) {
  return NUMBERISH.test(token) && /\d/.test(token)
}

/**
 * Mirrors TransactionService.parse on the backend: works out the amount (with
 * arithmetic), the note and the khata straight from the entry box, so the UI can
 * preview the total and warn before anything is sent to the server.
 *
 * <p>Pass `{ tags: false }` for destinations with no khatas of their own (the
 * gullak): any "#word" then stays in the note instead of picking a category.
 *
 * Never throws — failures come back as `error` so the caller can render them.
 */
export function parseEntry(value, { tags = true, missingAmount = MISSING_AMOUNT } = {}) {
  const raw = (value ?? '').trim()
  const category = tags ? tagInInput(raw) : null
  const result = { amount: 0, note: '', category, hasAmount: false, error: '' }

  if (!raw) {
    return { ...result, error: missingAmount }
  }

  const body = tags ? raw.replace(TAG_PATTERN_GLOBAL, ' ') : raw
  const notes = []
  const values = []
  let expression = ''

  const flush = () => {
    if (!expression) return
    const candidate = expression
    expression = ''
    const cleaned = candidate.replace(/,/g, '').replace(/[+\-*/.,]+$/, '').replace(/^[*/]+/, '')
    if (!cleaned || !/\d/.test(cleaned)) return
    values.push(evaluateExpression(cleaned))
  }

  try {
    for (const token of body.split(/\s+/).filter(Boolean)) {
      if (isNumberish(token)) {
        expression += token
        continue
      }
      if (expression && OPERATORISH.test(token)) {
        expression += token
        continue
      }
      flush()
      notes.push(token)
    }
    flush()
  } catch (err) {
    return { ...result, note: notes.join(' '), error: err.message }
  }

  const amount = roundMoney(values.reduce((total, part) => total + part, 0))

  return {
    amount,
    note: notes.join(' '),
    category,
    hasAmount: values.length > 0 && amount > 0,
    error: values.length > 0 && amount > 0 ? '' : missingAmount,
  }
}

/** "1,250.5" — shown next to the entry box while the user types. */
export function formatAmount(value) {
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}
