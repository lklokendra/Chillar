import Button from './Button'
import { formatDate, todayIso } from '../utils/entry'
import { goalEmoji, money } from '../utils/goals'

/**
 * The two shapes a gullak ledger row can take, shared by the dashboard, the
 * goal dashboard and the full history so a deposit always reads the same way.
 */

/** Two pill buttons that pick the direction of a ledger row. */
export function TypeToggle({ value, onChange, disabled }) {
  return (
    <div className="coin-gullak-toggle" role="group" aria-label="Transaction type">
      <button
        type="button"
        className={`coin-gullak-toggle__btn coin-gullak-toggle__btn--deposit ${
          value === 'DEPOSIT' ? 'is-active' : ''
        }`}
        onClick={() => onChange('DEPOSIT')}
        disabled={disabled}
      >
        + deposit
      </button>
      <button
        type="button"
        className={`coin-gullak-toggle__btn coin-gullak-toggle__btn--withdrawal ${
          value === 'WITHDRAWAL' ? 'is-active' : ''
        }`}
        onClick={() => onChange('WITHDRAWAL')}
        disabled={disabled}
      >
        − withdrawal
      </button>
    </div>
  )
}

/** A saved ledger row: note, the goal it belongs to, direction, amount, date. */
export default function SavingsRow({ transaction, onEdit, onDelete, busy = false, showGoal = true }) {
  const isIn = transaction.type === 'DEPOSIT'
  const label = transaction.note || (isIn ? 'deposit' : 'withdrawal')
  // A split withdrawal arrives as one logical entry carrying its allocations.
  const allocations = transaction.allocations ?? []
  const split = allocations.length > 1
  // On a goal dashboard a split shows as a single line — still part of one.
  const partialSplit = !split && Boolean(transaction.groupId)
  // Editing is per-entry, so a split (which is several entries) only deletes.
  const canEdit = Boolean(onEdit) && !transaction.groupId

  return (
    <div className={`coin-gullak-row ${isIn ? 'coin-gullak-row--in' : 'coin-gullak-row--out'}`}>
      <span className="coin-gullak-row__icon" aria-hidden="true">
        {isIn ? '+' : '−'}
      </span>

      <div className="coin-gullak-row__main">
        <span className="coin-gullak-row__note">{label}</span>
        <span className="coin-gullak-row__meta">
          {formatDate(transaction.date)} · {isIn ? 'deposit' : 'withdrawal'}
          {split && <span className="coin-gullak-row__tag">split · {allocations.length} categories</span>}
          {partialSplit && <span className="coin-gullak-row__tag">part of a split withdrawal</span>}
          {!split && !partialSplit && showGoal && (
            <>
              {' · '}
              <span className="coin-gullak-row__goal">
                {transaction.goalName ? `#${transaction.goalName}` : 'general savings'}
              </span>
            </>
          )}
        </span>

        {split && (
          <ul className="coin-gullak-row__allocations">
            {allocations.map((allocation, index) => (
              <li key={`${allocation.goalId ?? 'general'}-${index}`}>
                <span>{allocation.goalName ? `#${allocation.goalName}` : 'general savings'}</span>
                <span>₹ {money(allocation.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="coin-gullak-row__side">
        <span className={`coin-gullak-row__amount ${isIn ? 'is-in' : 'is-out'}`}>
          {isIn ? '+' : '−'}₹ {money(transaction.amount)}
        </span>

        {(canEdit || onDelete) && (
          <div className="coin-gullak-row__actions">
            {canEdit && (
              <Button variant="ghost" size="sm" onClick={() => onEdit(transaction)} disabled={busy}>
                edit
              </Button>
            )}
            {onDelete && (
              <Button variant="ghost" size="sm" onClick={() => onDelete(transaction)} disabled={busy}>
                {busy ? '…' : 'delete'}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * The inline form a row turns into while it is being edited. The goal is picked
 * from the user's existing goals — renaming is done on the goal dashboard, so
 * an edit here can never accidentally spawn a new goal.
 */
export function SavingsEditRow({ draft, goals = [], saving, onChange, onSubmit, onCancel }) {
  return (
    <form className="coin-gullak-edit" onSubmit={onSubmit}>
      <TypeToggle
        value={draft.type}
        onChange={(type) => onChange({ ...draft, type })}
        disabled={saving}
      />

      <div className="coin-gullak-form__row">
        <div>
          <label className="coin-gullak-form__label" htmlFor="coin-gullak-edit-amount">
            amount
          </label>
          <input
            id="coin-gullak-edit-amount"
            className="coin-gullak-input"
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            value={draft.amount}
            onChange={(event) => onChange({ ...draft, amount: event.target.value })}
            disabled={saving}
          />
        </div>
        <div>
          <label className="coin-gullak-form__label" htmlFor="coin-gullak-edit-date">
            date
          </label>
          <input
            id="coin-gullak-edit-date"
            className="coin-gullak-input"
            type="date"
            value={draft.date}
            onChange={(event) => onChange({ ...draft, date: event.target.value })}
            disabled={saving}
          />
        </div>
      </div>

      <div className="coin-gullak-form__row">
        <div>
          <label className="coin-gullak-form__label" htmlFor="coin-gullak-edit-goal">
            savings goal
          </label>
          <select
            id="coin-gullak-edit-goal"
            className="coin-gullak-input"
            value={draft.goalId ?? ''}
            onChange={(event) => onChange({ ...draft, goalId: event.target.value || null })}
            disabled={saving}
          >
            <option value="">general savings</option>
            {goals.map((goal) => (
              <option key={goal.id} value={String(goal.id)}>
                {goalEmoji(goal)} {goal.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="coin-gullak-form__label" htmlFor="coin-gullak-edit-note">
            note (optional)
          </label>
          <input
            id="coin-gullak-edit-note"
            className="coin-gullak-input"
            type="text"
            maxLength={255}
            placeholder="what was this for?"
            value={draft.note}
            onChange={(event) => onChange({ ...draft, note: event.target.value })}
            disabled={saving}
          />
        </div>
      </div>

      <div className="coin-gullak-edit__actions">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
          cancel
        </Button>
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? 'saving…' : 'save'}
        </Button>
      </div>
    </form>
  )
}

/** Turns a ledger row into the shape the edit form works with. */
export function draftFrom(transaction) {
  return {
    amount: String(transaction.amount),
    type: transaction.type,
    note: transaction.note || '',
    date: transaction.date || todayIso(),
    goalId: transaction.goalId ? String(transaction.goalId) : null,
  }
}

/**
 * The edit form sends a goal by name (the same field the entry box fills from a
 * hashtag), so a row keeps its goal when it is re-saved from a goal dashboard.
 */
export function editPayload(draft, goals = []) {
  const goal = goals.find((candidate) => String(candidate.id) === String(draft.goalId))
  return {
    amount: Number(draft.amount),
    type: draft.type,
    note: draft.note.trim(),
    date: draft.date || todayIso(),
    goal: goal ? goal.name : null,
  }
}
