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
 * One khata with its spending folded away behind a caret. Pass `onAdd` to get
 * the inline "add an entry to this khata" row inside the dropdown.
 */
export default function KhataAccordion({
  khata,
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
    const ok = await onAdd(khata.name, value)
    if (ok) setDraft('')
  }

  return (
    <div className={`coin-khata coin-khata--${khata.color} ${isOpen ? 'is-open' : ''}`}>
      <button
        type="button"
        className="coin-khata__head"
        onClick={() => onToggle(khata.name)}
        aria-expanded={isOpen}
      >
        <span className={`coin-pill coin-pill--${khata.color}`}>#{khata.name}</span>
        <span className="coin-khata__side">
          <span className="coin-khata__total">₹ {Number(khata.total).toLocaleString()}</span>
          <span className="coin-khata__count">
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
          </span>
          <span className="coin-khata__caret" aria-hidden="true">
            {isOpen ? '−' : '+'}
          </span>
        </span>
      </button>

      {isOpen && (
        <div className="coin-khata__body">
          {onAdd && (
            <form className="coin-khata__add" onSubmit={handleAdd}>
              <input
                className="coin-khata__add-input"
                placeholder={`add to #${khata.name} — e.g. 200 groceries`}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                disabled={adding}
              />
              <button
                type="submit"
                className="coin-khata__add-btn"
                disabled={adding || !draft.trim()}
              >
                {adding ? '…' : 'add'}
              </button>
            </form>
          )}

          {entries.length === 0 ? (
            <p className="coin-muted">Nothing logged in #{khata.name} yet.</p>
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
