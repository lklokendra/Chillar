/**
 * Presentation helpers shared by the gullak dashboard, the goal dashboard and
 * the gullak history. Nothing here decides money: the saved amount, remaining
 * figure and progress percentage all come from the server, which derives them
 * from the ledger.
 */

/** The four accents the goal cards can wear. */
export const GOAL_TONES = ['mint', 'amber', 'indigo', 'rose']

/** Emoji offered in the goal editor, and the fallback for a goal with none. */
export const GOAL_ICONS = ['🎯', '💻', '🏝️', '🛟', '🏍️', '🎓', '📱', '🏠', '🚗', '💍', '🎁', '📚']

const GOAL_FALLBACK_ICON = '🎯'

/**
 * A stable tone per goal: the colour the user picked, else one derived from the
 * name so a goal keeps the same accent on every page and every visit.
 */
export function goalTone(goal) {
  if (goal?.color) return goal.color
  const name = goal?.name ?? ''
  let hash = 0
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) % 971
  }
  return GOAL_TONES[hash % GOAL_TONES.length]
}

/** The goal's emoji, or a target when it has not been given one yet. */
export function goalEmoji(goal) {
  return goal?.icon || GOAL_FALLBACK_ICON
}

/** "1,250.5" — the same money format used everywhere else in the app. */
export function money(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

/** "72.5%" with no trailing ".0". */
export function percent(value) {
  if (value === null || value === undefined) return '—'
  const number = Number(value)
  return `${number.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`
}

/** Progress is only meaningful once a target exists. */
export function hasTarget(goal) {
  return goal?.targetAmount !== null && goal?.targetAmount !== undefined && Number(goal.targetAmount) > 0
}

/**
 * How far the saved amount overshoots the target. Goals are allowed to exceed
 * their target, so the extra is shown on its own instead of inflating 100%.
 */
export function overshoot(goal) {
  if (!hasTarget(goal)) return 0
  const extra = Number(goal.savedAmount) - Number(goal.targetAmount)
  return extra > 0 ? extra : 0
}

/**
 * The countdown to a goal's deadline, never negative: a missed date reads as
 * "N days overdue" rather than a minus sign.
 */
export function deadline(goal) {
  if (goal?.status === 'COMPLETED') {
    return { tone: 'done', label: 'goal completed' }
  }
  if (!goal?.targetDate) {
    return { tone: 'none', label: 'no deadline set' }
  }

  const [year, month, day] = goal.targetDate.split('-').map(Number)
  const target = new Date(year, month - 1, day)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const days = Math.round((target - today) / 86400000)

  if (days > 0) return { tone: 'ok', label: `${days} day${days === 1 ? '' : 's'} remaining` }
  if (days === 0) return { tone: 'today', label: 'due today' }
  return { tone: 'over', label: `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue` }
}
