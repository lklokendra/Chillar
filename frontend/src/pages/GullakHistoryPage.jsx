import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import TopBar from '../components/TopBar'
import Button from '../components/Button'
import * as gullakApi from '../api/gullak'
import { errorMessage } from '../api/client'
import { formatDate, todayIso } from '../utils/entry'
import '../styles/gullak.css'

const FILTERS = [
  { key: 'all', label: 'all' },
  { key: 'DEPOSIT', label: 'deposits' },
  { key: 'WITHDRAWAL', label: 'withdrawals' },
]

const SORTS = [
  { key: 'date-desc', label: 'newest' },
  { key: 'date-asc', label: 'oldest' },
  { key: 'amount-desc', label: '₹ high' },
  { key: 'amount-asc', label: '₹ low' },
]

/** "1,250.5" — the same money format used elsewhere in the app. */
function money(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

/** Two pill buttons that pick the direction of a ledger row. */
function TypeToggle({ value, onChange, disabled }) {
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

/** A saved ledger row with its edit + delete actions. */
function TransactionRow({ transaction, deleting, onEdit, onDelete }) {
  const isIn = transaction.type === 'DEPOSIT'
  return (
    <div className={`coin-gullak-row ${isIn ? 'coin-gullak-row--in' : 'coin-gullak-row--out'}`}>
      <span className="coin-gullak-row__icon" aria-hidden="true">
        {isIn ? '+' : '−'}
      </span>

      <div className="coin-gullak-row__main">
        <span className="coin-gullak-row__note">
          {transaction.note || (isIn ? 'deposit' : 'withdrawal')}
        </span>
        <span className="coin-gullak-row__meta">
          {formatDate(transaction.date)} · {isIn ? 'deposit' : 'withdrawal'}
        </span>
      </div>

      <div className="coin-gullak-row__side">
        <span className={`coin-gullak-row__amount ${isIn ? 'is-in' : 'is-out'}`}>
          {isIn ? '+' : '−'}₹ {money(transaction.amount)}
        </span>
        <div className="coin-gullak-row__actions">
          <Button variant="ghost" size="sm" onClick={() => onEdit(transaction)} disabled={deleting}>
            edit
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(transaction)} disabled={deleting}>
            {deleting ? '…' : 'delete'}
          </Button>
        </div>
      </div>
    </div>
  )
}

/** The inline form a row turns into while it is being edited. */
function EditRow({ draft, saving, onChange, onSubmit, onCancel }) {
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
            onChange={(e) => onChange({ ...draft, amount: e.target.value })}
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
            onChange={(e) => onChange({ ...draft, date: e.target.value })}
            disabled={saving}
          />
        </div>
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
          onChange={(e) => onChange({ ...draft, note: e.target.value })}
          disabled={saving}
        />
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

/**
 * The complete gullak ledger, kept off the dashboard so that page stays compact.
 * The balance shown here is always derived from the rows the server returns.
 */
export default function GullakHistoryPage() {
  const [summary, setSummary] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('date-desc')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [summaryData, transactionData] = await Promise.all([
        gullakApi.getSummary(),
        gullakApi.getTransactions(),
      ])
      setSummary(summaryData)
      setTransactions(transactionData)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const visible = transactions
    .filter((t) => filter === 'all' || t.type === filter)
    .sort((a, b) => {
      const [key, direction] = sort.split('-')
      let compare
      if (key === 'amount') {
        compare = Number(a.amount) - Number(b.amount)
      } else {
        compare =
          a.date < b.date ? -1 : a.date > b.date ? 1 : String(a.createdAt).localeCompare(String(b.createdAt))
      }
      return direction === 'asc' ? compare : -compare
    })

  function startEdit(transaction) {
    setEditingId(transaction.id)
    setDraft({
      amount: String(transaction.amount),
      type: transaction.type,
      note: transaction.note || '',
      date: transaction.date,
    })
    setError('')
    setNotice('')
  }

  function cancelEdit() {
    setEditingId(null)
    setDraft(null)
  }

  async function handleEditSubmit(event) {
    event.preventDefault()
    const parsed = Number(draft.amount)
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError('Amount must be greater than zero.')
      return
    }

    setSavingEdit(true)
    setError('')
    setNotice('')
    try {
      await gullakApi.updateTransaction(editingId, {
        amount: parsed,
        type: draft.type,
        note: draft.note.trim(),
        date: draft.date || todayIso(),
      })
      setNotice('Entry updated.')
      cancelEdit()
      await load()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSavingEdit(false)
    }
  }

  async function handleDelete(transaction) {
    const label = transaction.note || (transaction.type === 'DEPOSIT' ? 'deposit' : 'withdrawal')
    if (!window.confirm(`Delete "${label}" (₹ ${money(transaction.amount)})?`)) {
      return
    }

    setDeletingId(transaction.id)
    setError('')
    setNotice('')
    try {
      await gullakApi.deleteTransaction(transaction.id)
      setNotice('Entry deleted.')
      if (editingId === transaction.id) {
        cancelEdit()
      }
      await load()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setDeletingId(null)
    }
  }

  const balance = summary?.balance ?? 0
  const deposits = summary?.totalDeposits ?? 0
  const withdrawals = summary?.totalWithdrawals ?? 0
  const count = summary?.transactionCount ?? 0

  return (
    <div className="coin-page">
      <TopBar />

      <Link className="coin-gullak-back" to="/gullak">
        ← back to gullak
      </Link>

      <h1 className="coin-page__title">gullak history</h1>
      <p className="coin-page__subtitle">
        every deposit and withdrawal — {count} {count === 1 ? 'entry' : 'entries'} on record.
      </p>

      <div className="coin-grid">
        <div className="coin-tile coin-tile--ink">
          <div className="coin-tile__label">current savings</div>
          <div className="coin-tile__value">₹ {money(balance)}</div>
          <div className="coin-tile__note">deposits − withdrawals</div>
        </div>
        <div className="coin-tile coin-tile--mint">
          <div className="coin-tile__label">Total Deposits</div>
          <div className="coin-tile__value">₹ {money(deposits)}</div>
        </div>
        <div className="coin-tile coin-tile--rose">
          <div className="coin-tile__label">Total Withdrawals</div>
          <div className="coin-tile__value">₹ {money(withdrawals)}</div>
        </div>
      </div>

      {notice && (
        <div className="coin-alert coin-alert--ok" role="status" style={{ marginTop: '16px' }}>
          {notice}
        </div>
      )}
      {error && (
        <div className="coin-alert" role="alert" style={{ marginTop: '16px' }}>
          {error}
        </div>
      )}

      <div className="coin-gullak-controls">
        <div className="coin-gullak-filters" role="group" aria-label="Filter transactions">
          {FILTERS.map((option) => (
            <button
              key={option.key}
              type="button"
              className={`coin-gullak-filters__btn ${filter === option.key ? 'is-active' : ''}`}
              aria-pressed={filter === option.key}
              onClick={() => setFilter(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="coin-gullak-filters" role="group" aria-label="Sort transactions">
          {SORTS.map((option) => (
            <button
              key={option.key}
              type="button"
              className={`coin-gullak-filters__btn ${sort === option.key ? 'is-active' : ''}`}
              aria-pressed={sort === option.key}
              onClick={() => setSort(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {loading && transactions.length === 0 && (
        <p className="coin-muted" style={{ marginTop: '18px' }}>
          Loading your gullak…
        </p>
      )}

      {!loading && transactions.length === 0 && (
        <div className="coin-empty" style={{ marginTop: '18px' }}>
          Your gullak is empty. Add your first deposit on the gullak page.
        </div>
      )}

      {!loading && transactions.length > 0 && visible.length === 0 && (
        <div className="coin-empty" style={{ marginTop: '18px' }}>
          No {filter === 'DEPOSIT' ? 'deposits' : 'withdrawals'} yet.
        </div>
      )}

      {!loading && visible.length > 0 && (
        <div className="coin-gullak-list">
          {visible.map((transaction) =>
            editingId === transaction.id ? (
              <EditRow
                key={transaction.id}
                draft={draft}
                saving={savingEdit}
                onChange={setDraft}
                onSubmit={handleEditSubmit}
                onCancel={cancelEdit}
              />
            ) : (
              <TransactionRow
                key={transaction.id}
                transaction={transaction}
                deleting={deletingId === transaction.id}
                onEdit={startEdit}
                onDelete={handleDelete}
              />
            ),
          )}
        </div>
      )}
    </div>
  )
}
