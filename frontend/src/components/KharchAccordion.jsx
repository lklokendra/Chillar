import { useState } from 'react'
import { formatDate } from '../utils/entry'

function LogRow({ transaction, deletingId, onDelete }) {
  const label = transaction.note || transaction.categoryName || 'entry'
  return (
    <div className="coin-log">
      <div className="coin-log__main">
        <span className="coin-log__note">{label}</span>
        <span className="coin-log__meta">
          {formatDate(transaction.date)} · #{transaction.categoryName}
        </span>
      </div>
      <div className="coin-log__right">
        <span className="coin-log__amount">₹ {Number(transaction.amount).toLocaleString()}</span>
        <button
          type="button"
          className="coin-log__delete"
          onClick={() => onDelete(transaction)}
          disabled={deletingId === transaction.id}
          title="Delete this entry"
          aria-label={`Delete ${label}`}
        >
          {deletingId === transaction.id ? '…' : '×'}
        </button>
      </div>
    </div>
  )
}

/**
 * One kharch with its spending folded away behind a caret. Pass `onAdd` to get
 * the inline "add an entry to this kharch" row inside the dropdown.
 */
export default function KharchAccordion({
  kharch,
  entries,
  isOpen,
  onToggle,
  deletingId,
  onDelete,
  onAdd,
  adding,
}) {
  const [draft, setDraft] = useState('')

  async function handleAdd(event) {
    event.preventDefault()
    const value = draft.trim()
    if (!value || adding) return
    const ok = await onAdd(kharch.name, value)
    if (ok) setDraft('')
  }

  return (
    <div className={`coin-kharch coin-kharch--${kharch.color} ${isOpen ? 'is-open' : ''}`}>
      <button
        type="button"
        className="coin-kharch__head"
        onClick={() => onToggle(kharch.name)}
        aria-expanded={isOpen}
      >
        <span className={`coin-pill coin-pill--${kharch.color}`}>#{kharch.name}</span>
        <span className="coin-kharch__side">
          <span className="coin-kharch__total">₹ {Number(kharch.total).toLocaleString()}</span>
          <span className="coin-kharch__count">
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
          </span>
          <span className="coin-kharch__caret" aria-hidden="true">
            {isOpen ? '−' : '+'}
          </span>
        </span>
      </button>

      {isOpen && (
        <div className="coin-kharch__body">
          {onAdd && (
            <form className="coin-kharch__add" onSubmit={handleAdd}>
              <input
                className="coin-kharch__add-input"
                placeholder={`add to #${kharch.name} — e.g. 200 groceries`}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                disabled={adding}
              />
              <button
                type="submit"
                className="coin-kharch__add-btn"
                disabled={adding || !draft.trim()}
              >
                {adding ? '…' : 'add'}
              </button>
            </form>
          )}

          {entries.length === 0 ? (
            <p className="coin-muted">Nothing logged in #{kharch.name} yet.</p>
          ) : (
            entries.map((transaction) => (
              <LogRow
                key={transaction.id}
                transaction={transaction}
                deletingId={deletingId}
                onDelete={onDelete}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}
