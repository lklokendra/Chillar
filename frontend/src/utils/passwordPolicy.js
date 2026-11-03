/**
 * Mirrors the server-side rule in `PasswordPolicy.java`.
 *
 * If these two ever disagree the strength meter starts lying — the API is still
 * the one that decides, this file only tells the user early.
 */

export const PASSWORD_RULES = [
  { key: 'length', label: '8 characters or more', test: (value) => value.length >= 8 },
  { key: 'upper', label: 'An uppercase letter', test: (value) => /[A-Z]/.test(value) },
  { key: 'lower', label: 'A lowercase letter', test: (value) => /[a-z]/.test(value) },
  { key: 'number', label: 'A number', test: (value) => /\d/.test(value) },
]

/** The API rejects anything longer than this. */
export const PASSWORD_MAX_LENGTH = 72

const LABELS = {
  weak: 'Weak',
  fair: 'Fair',
  good: 'Good',
  strong: 'Strong',
}

/**
 * Scores a password as it is typed.
 *
 * @returns {{ met: Record<string, boolean>, metCount: number, total: number,
 *             strength: 'weak'|'fair'|'good'|'strong'|null, label: string, valid: boolean }}
 */
export function evaluatePassword(value = '') {
  const met = {}
  let metCount = 0
  for (const rule of PASSWORD_RULES) {
    const ok = value.length > 0 && rule.test(value)
    met[rule.key] = ok
    if (ok) metCount += 1
  }

  let strength = null
  if (value.length > 0) {
    if (metCount <= 1) strength = 'weak'
    else if (metCount === 2) strength = 'fair'
    else if (metCount === 3) strength = 'good'
    else strength = 'strong'
  }

  return {
    met,
    metCount,
    total: PASSWORD_RULES.length,
    strength,
    label: strength ? LABELS[strength] : '',
    valid: value.length > 0 && metCount === PASSWORD_RULES.length && value.length <= PASSWORD_MAX_LENGTH,
  }
}
