/**
 * Safe arithmetic for the entry box. A hand-written recursive-descent parser —
 * no eval(), no new Function(), no dynamic code. Mirrors the backend evaluator
 * in ArithmeticEvaluator.java so a preview here always matches what is saved.
 */

function createReader(source) {
  let position = 0

  const atEnd = () => position >= source.length

  function skipSpaces() {
    while (!atEnd() && /\s/.test(source[position])) position++
  }

  function consume(expected) {
    if (!atEnd() && source[position] === expected) {
      position++
      return true
    }
    return false
  }

  function readNumber() {
    skipSpaces()
    const start = position
    while (!atEnd() && /[0-9.]/.test(source[position])) position++
    if (start === position) throw new Error('That calculation is not valid')
    const text = source.slice(start, position)
    const value = Number(text)
    if (!Number.isFinite(value)) throw new Error('That calculation is not valid')
    return value
  }

  function readPrimary() {
    skipSpaces()
    if (consume('(')) {
      const value = readExpression()
      skipSpaces()
      if (!consume(')')) throw new Error('That calculation is missing a closing bracket')
      return value
    }
    return readNumber()
  }

  function readFactor() {
    skipSpaces()
    if (consume('-')) return -readFactor()
    if (consume('+')) return readFactor()
    return readPrimary()
  }

  function readTerm() {
    let value = readFactor()
    for (;;) {
      skipSpaces()
      if (consume('*')) {
        value *= readFactor()
      } else if (consume('/')) {
        const divisor = readFactor()
        if (divisor === 0) throw new Error('That calculation divides by zero')
        value /= divisor
      } else {
        return value
      }
    }
  }

  function readExpression() {
    let value = readTerm()
    for (;;) {
      skipSpaces()
      if (consume('+')) {
        value += readTerm()
      } else if (consume('-')) {
        value -= readTerm()
      } else {
        return value
      }
    }
  }

  return { readExpression, skipSpaces, atEnd }
}

/** Works out "100+50*2" et al. Throws a friendly Error when it cannot. */
export function evaluateExpression(expression) {
  if (!expression || !expression.trim()) {
    throw new Error('There is no calculation to work out')
  }

  const reader = createReader(expression)
  const value = reader.readExpression()
  reader.skipSpaces()

  if (!reader.atEnd()) {
    throw new Error(`There is an unexpected character in that calculation: '${expression[reader.position ?? 0]}'`)
  }
  return value
}

/** Rounds to paise so the preview never shows 0.30000000000000004. */
export function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}
