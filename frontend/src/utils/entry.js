/** Shared helpers for the one-line entry format and the kharch suggestions. */

import { evaluateExpression, roundMoney } from './arithmetic'

export const TAG_PATTERN = /#([\p{L}\p{N}_-]+)/u

const TAG_PATTERN_GLOBAL = /#[\p{L}\p{N}_-]+/gu
const NUMBERISH = /^[0-9+\-*/().,]+$/
const OPERATORISH = /^[+\-*/()]+$/

export const MISSING_AMOUNT = 'Please enter a spending amount before adding this expense.'

/** Gullak says "amount" rather than "spending amount" — same rule, different words. */
export const MISSING_GULLAK_AMOUNT = 'Please enter an amount before adding this to your gullak.'

/** A gullak entry can only belong to one goal, so two hashtags are ambiguous. */
export const TOO_MANY_GULLAK_TAGS = 'Use one hashtag only — that is the goal this entry goes into.'

/** A goal name has to fit the column the server stores it in. */
export const GOAL_NAME_TOO_LONG = 'That goal name is too long — keep it under 120 characters.'

/**
 * Starter kharch shown to a brand new account. Each one disappears from the
 * suggestion row the moment the user logs an entry into a kharch of that name.
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

/** Every "#tag" in the box, in the order they were typed. */
export function tagsInInput(value) {
  return (value.match(TAG_PATTERN_GLOBAL) ?? []).map((tag) => tag.slice(1))
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
 * User kharch first, topped up with presets they haven't logged against yet.
 * Once they've created enough kharch of their own the presets are gone.
 */
export function buildSuggestions(userKharch, limit = 8) {
  const own = userKharch.map((kharch) => ({ name: kharch.name, color: kharch.color }))
  const used = new Set(own.map((kharch) => kharch.name.toLowerCase()))

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
 * arithmetic), the note and the kharch straight from the entry box, so the UI can
 * preview the total and warn before anything is sent to the server.
 *
 * <p>The gullak reuses this exact parser, but a hashtag there names a savings
 * goal instead of a kharch: the result carries `goal` (the tag as the user typed
 * it, so the server can keep a friendly display name) as well as the lowercase
 * `category`. Pass `{ singleTag: true }` where only one tag makes sense — a
 * savings entry belongs to one goal, so "#laptop #goa" is rejected rather than
 * silently filed under one of them.
 *
 * Never throws — failures come back as `error` so the caller can render them.
 */
export function parseEntry(value, { tags = true, singleTag = false, missingAmount = MISSING_AMOUNT } = {}) {
  const raw = (value ?? '').trim()
  const typedTags = tags ? tagsInInput(raw) : []
  const category = tags ? tagInInput(raw) : null
  const goal = typedTags[0] ?? null
  const result = { amount: 0, note: '', category, goal, hasAmount: false, error: '' }

  if (!raw) {
    return { ...result, error: missingAmount }
  }

  if (singleTag && typedTags.length > 1) {
    return { ...result, error: TOO_MANY_GULLAK_TAGS }
  }

  if (goal && goal.length > 120) {
    return { ...result, error: GOAL_NAME_TOO_LONG }
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
    goal,
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
