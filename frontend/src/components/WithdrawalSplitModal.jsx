import { useEffect, useMemo, useState } from 'react'
import Button from './Button'
import * as gullakApi from '../api/gullak'
import { errorMessage } from '../api/client'
import { todayIso } from '../utils/entry'
import { goalEmoji, money } from '../utils/goals'

/** The pseudo-category for the untagged part of the jar. */
const GENERAL = 'general'

/** Money maths stops at two decimals — the scale the server stores. */
const round2 = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100

/**
 * Opens when the category a user named cannot cover a withdrawal on its own,
 * but the jar as a whole can.
 *
 * The user decides how the money is taken: one row per category, each with its
 * own amount, and every total recomputed as they type. Nothing is sent until
 * the allocation adds up exactly, and the server re-checks every balance again
 * before it writes anything.
 */
export default function WithdrawalSplitModal({
  requestedAmount,
  overallBalance,
  generalSavings,
  goals = [],
  initialGoalId = null,
  note = '',
  date,
  onClose,
  onSuccess,
  onError,
}) {
  const requested = round2(requestedAmount)

  const categories = useMemo(
    () => [
      { key: GENERAL, id: null, name: 'general savings', emoji: '🫙', available: round2(generalSavings) },
      ...goals.map((goal) => ({
        key: String(goal.id),
        id: goal.id,
        name: goal.name,
        emoji: goalEmoji(goal),
        available: round2(goal.savedAmount),
      })),
    ],
    [goals, generalSavings],
  )
  const byKey = useMemo(() => new Map(categories.map((category) => [category.key, category])), [categories])

  const [rows, setRows] = useState(() => {
    const key = initialGoalId === null || initialGoalId === undefined ? GENERAL : String(initialGoalId)
    const category = byKey.get(key) ?? categories[0]
    // Start with the category the user named, filled to as much as it can give.
    const seed = Math.min(category.available, requested)
    return [{ id: 1, categoryKey: category.key, amount: seed > 0 ? String(round2(seed)) : '' }]
  })
  const [nextId, setNextId] = useState(2)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Escape closes the dialog and the page behind it stops scrolling.
  useEffect(() => {
    function onKey(event) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [onClose])

  const usedKeys = new Set(rows.map((row) => row.categoryKey).filter(Boolean))
  const freeCategory = categories.find((category) => !usedKeys.has(category.key))

  // Every row's own verdict, recomputed on each keystroke.
  const analysis = rows.map((row) => {
    const category = byKey.get(row.categoryKey) ?? null
    const raw = String(row.amount ?? '').trim()
    const parsed = raw === '' ? null : Number(raw)
    const worth = parsed !== null && Number.isFinite(parsed) ? parsed : 0
    const active = raw !== '' || Boolean(row.categoryKey)

    let problem = ''
    if (raw !== '') {
      if (!category) problem = 'Choose a savings category for this amount.'
      else if (!Number.isFinite(parsed)) problem = 'Enter a valid amount.'
      else if (parsed <= 0) problem = 'Amount must be greater than zero.'
      else if (parsed > category.available) {
        problem = `Insufficient balance in ${category.name}. Available: ₹ ${money(category.available)}.`
      }
    }

    return { row, category, value: worth > 0 ? round2(worth) : 0, active, problem }
  })

  const allocated = round2(analysis.reduce((total, item) => total + item.value, 0))
  const remaining = round2(requested - allocated)
  const firstProblem = analysis.find((item) => item.problem)?.problem ?? ''
  const usableRows = analysis.filter((item) => item.active && !item.problem).length

  let status = { tone: 'ok', text: 'Allocation valid' }
  if (firstProblem) {
    status = { tone: 'bad', text: firstProblem }
  } else if (usableRows === 0) {
    status = { tone: 'idle', text: 'Choose at least one savings category.' }
  } else if (remaining > 0) {
    status = { tone: 'warn', text: `₹ ${money(remaining)} remaining to allocate.` }
  } else if (remaining < 0) {
    status = { tone: 'bad', text: `Allocated amount exceeds requested withdrawal by ₹ ${money(Math.abs(remaining))}.` }
  }

  const canConfirm =
    !saving && usableRows > 0 && !firstProblem && remaining === 0 && requested <= round2(overallBalance)

  function updateRow(id, patch) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)))
    if (error) setError('')
  }

  function addRow() {
    if (!freeCategory) return
    setRows((current) => [...current, { id: nextId, categoryKey: freeCategory.key, amount: '' }])
    setNextId((value) => value + 1)
  }

  function removeRow(id) {
    setRows((current) => (current.length <= 1 ? current : current.filter((row) => row.id !== id)))
  }

  async function handleConfirm() {
    if (!canConfirm) return
    setSaving(true)
    setError('')
    onError?.('')
    try {
      const allocations = analysis
        .filter((item) => item.active && item.category && item.value > 0)
        .map((item) => ({ goalId: item.category.id, amount: item.value }))

      const created = await gullakApi.allocateWithdrawal({
        totalAmount: requested,
        note: note || null,
        transactionDate: date || todayIso(),
        allocations,
      })
      onSuccess?.(created)
    } catch (err) {
      // Keep the dialog (and the user's allocation) so they can correct it.
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="coin-modal" role="dialog" aria-modal="true" aria-label="Split your withdrawal">
      <div className="coin-modal__backdrop" onClick={saving ? undefined : onClose} aria-hidden="true" />

      <div className="coin-modal__panel">
        <header className="coin-modal__head">
          <div>
            <h2 className="coin-modal__title">split your withdrawal</h2>
            <p className="coin-modal__sub">
              Your selected savings category doesn&apos;t have enough balance. You can withdraw the amount from
              multiple savings categories.
            </p>
          </div>
          <button
            type="button"
            className="coin-modal__close"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <div className="coin-split__summary">
          <div className="coin-split__stat">
            <span className="coin-split__stat-label">requested</span>
            <span className="coin-split__stat-value">₹ {money(requested)}</span>
          </div>
          <div className="coin-split__stat">
            <span className="coin-split__stat-label">total gullak</span>
            <span className="coin-split__stat-value">₹ {money(overallBalance)}</span>
          </div>
          <div className={`coin-split__stat ${remaining > 0 ? 'is-due' : ''}`}>
            <span className="coin-split__stat-label">remaining</span>
            <span className="coin-split__stat-value">₹ {money(Math.max(remaining, 0))}</span>
          </div>
        </div>

        <div className="coin-split__rows">
          {analysis.map((item) => (
            <div className="coin-split__row" key={item.row.id}>
              <div className="coin-split__row-line">
                <select
                  className="coin-gullak-input coin-split__select"
                  value={item.row.categoryKey}
                  onChange={(event) => updateRow(item.row.id, { categoryKey: event.target.value })}
                  disabled={saving}
                  aria-label="Savings category"
                >
                  <option value="">select a category…</option>
                  {categories.map((category) => (
                    <option
                      key={category.key}
                      value={category.key}
                      disabled={category.key !== item.row.categoryKey && usedKeys.has(category.key)}
                    >
                      {category.emoji} {category.name} — available ₹ {money(category.available)}
                    </option>
                  ))}
                </select>

                <input
                  className="coin-gullak-input coin-split__amount"
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={item.row.amount}
                  onChange={(event) => updateRow(item.row.id, { amount: event.target.value })}
                  disabled={saving}
                  aria-label="Withdrawal amount"
                />

                <button
                  type="button"
                  className="coin-split__remove"
                  onClick={() => removeRow(item.row.id)}
                  disabled={saving || rows.length <= 1}
                  aria-label="Remove this category"
                  title="Remove this category"
                >
                  ×
                </button>
              </div>
              {item.problem && (
                <p className="coin-split__row-error" role="alert">
                  {item.problem}
                </p>
              )}
            </div>
          ))}
        </div>

        <button type="button" className="coin-split__add" onClick={addRow} disabled={!freeCategory || saving}>
          <span aria-hidden="true">+</span> add another category
        </button>
        {!freeCategory && (
          <p className="coin-split__hint">
            Every savings category you have is already part of this withdrawal.
          </p>
        )}

        <div className="coin-split__totals">
          <div className="coin-split__total">
            <span>total allocated</span>
            <strong>₹ {money(allocated)}</strong>
          </div>
          <div className="coin-split__total">
            <span>total available</span>
            <strong>₹ {money(overallBalance)}</strong>
          </div>
          <p className={`coin-split__status is-${status.tone}`} role="status">
            {status.text}
          </p>
        </div>

        {error && (
          <div className="coin-alert" role="alert">
            {error}
          </div>
        )}

        <div className="coin-goal-form__actions">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
            cancel
          </Button>
          <Button size="sm" onClick={handleConfirm} disabled={!canConfirm}>
            {saving ? 'withdrawing…' : 'confirm withdrawal'}
          </Button>
        </div>
      </div>
    </div>
  )
}
