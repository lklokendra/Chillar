import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import TopBar from '../components/TopBar'
import SavingsRow, { SavingsEditRow, draftFrom, editPayload } from '../components/SavingsRow'
import * as gullakApi from '../api/gullak'
import { errorMessage } from '../api/client'
import { todayIso } from '../utils/entry'
import { goalEmoji, money } from '../utils/goals'
import { groupTransactions } from '../utils/savings'
import '../styles/gullak.css'

const TYPE_FILTERS = [
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

/**
 * The complete gullak ledger, kept off the dashboard so that page stays compact.
 * The balance shown here is always derived from the rows the server returns, so
 * editing or deleting anything immediately moves every balance and goal.
 */
export default function GullakHistoryPage() {
  const [summary, setSummary] = useState(null)
  const [goals, setGoals] = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const [filter, setFilter] = useState('all')
  const [goalFilter, setGoalFilter] = useState('all')
  const [sort, setSort] = useState('date-desc')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [summaryData, transactionData, goalData] = await Promise.all([
        gullakApi.getSummary(),
        gullakApi.getTransactions(),
        gullakApi.getGoals(),
      ])
      setSummary(summaryData)
      setTransactions(transactionData)
      setGoals(goalData)
      setError('')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // A split withdrawal is several rows sharing a groupId; the ledger shows the
  // one entry the user actually made, with its categories listed underneath.
  const entries = groupTransactions(transactions)

  // A grouped row matches a goal filter when any of its allocations is that goal.
  const matchesGoal = (entry) => {
    if (goalFilter === 'all') return true
    const ids = entry.allocations
      ? entry.allocations.map((allocation) => (allocation.goalId === null ? null : String(allocation.goalId)))
      : [entry.goalId === null ? null : String(entry.goalId)]
    return ids.includes(goalFilter === 'general' ? null : goalFilter)
  }

  const visible = entries
    .filter((entry) => filter === 'all' || entry.type === filter)
    .filter(matchesGoal)
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
    setDraft(draftFrom(transaction))
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
      await gullakApi.updateTransaction(editingId, editPayload(draft, goals))
      setNotice('Entry updated and balances recalculated.')
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
    // A split withdrawal is one logical entry: deleting any part removes all of it.
    const detail = transaction.groupId
      ? `Delete this split withdrawal (₹ ${money(transaction.amount)} across ${
          transaction.allocations?.length ?? 1
        } categories)?`
      : `Delete "${label}" (₹ ${money(transaction.amount)})?`
    if (!window.confirm(`${detail} Balances will be recalculated.`)) {
      return
    }

    setDeletingId(transaction.id)
    setError('')
    setNotice('')
    try {
      await gullakApi.deleteTransaction(transaction.id)
      setNotice('Entry deleted and balances recalculated.')
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
          <div className="coin-tile__label">total balance</div>
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
          {TYPE_FILTERS.map((option) => (
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

      <label className="coin-gullak-goalfilter">
        <span>goal</span>
        <select
          className="coin-gullak-input"
          value={goalFilter}
          onChange={(event) => setGoalFilter(event.target.value)}
        >
          <option value="all">all goals</option>
          <option value="general">general savings</option>
          {goals.map((goal) => (
            <option key={goal.id} value={String(goal.id)}>
              {goalEmoji(goal)} {goal.name}
            </option>
          ))}
        </select>
      </label>

      {loading && entries.length === 0 && (
        <p className="coin-muted" style={{ marginTop: '18px' }}>
          Loading your gullak…
        </p>
      )}

      {!loading && entries.length === 0 && (
        <div className="coin-empty" style={{ marginTop: '18px' }}>
          Your gullak is empty. Add your first deposit on the gullak page.
        </div>
      )}

      {!loading && entries.length > 0 && visible.length === 0 && (
        <div className="coin-empty" style={{ marginTop: '18px' }}>
          No entries match these filters.
        </div>
      )}

      {!loading && visible.length > 0 && (
        <div className="coin-gullak-list">
          {visible.map((transaction) =>
            editingId === transaction.id ? (
              <SavingsEditRow
                key={transaction.groupId || transaction.id}
                draft={draft}
                goals={goals}
                saving={savingEdit}
                onChange={setDraft}
                onSubmit={handleEditSubmit}
                onCancel={cancelEdit}
              />
            ) : (
              <SavingsRow
                key={transaction.groupId || transaction.id}
                transaction={transaction}
                busy={deletingId === transaction.id}
                onEdit={startEdit}
                onDelete={handleDelete}
              />
            ),
          )}
        </div>
      )}

      <p className="coin-gullak-footnote">
        goal names come from the hashtags you typed · {todayIso()}
      </p>
    </div>
  )
}
