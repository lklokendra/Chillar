import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Button from '../components/Button'
import EntryBox from '../components/EntryBox'
import GoalFormModal from '../components/GoalFormModal'
import TopBar from '../components/TopBar'
import WithdrawalSplitModal from '../components/WithdrawalSplitModal'
import SavingsRow, { SavingsEditRow, draftFrom, editPayload } from '../components/SavingsRow'
import * as gullakApi from '../api/gullak'
import { errorMessage } from '../api/client'
import { formatDate, MISSING_GULLAK_AMOUNT, parseEntry, todayIso } from '../utils/entry'
import {
  deadline,
  goalEmoji,
  goalTone,
  hasTarget,
  money,
  overshoot,
  percent,
} from '../utils/goals'
import '../styles/gullak.css'

const TYPE_FILTERS = [
  { key: 'all', label: 'all' },
  { key: 'DEPOSIT', label: 'deposits' },
  { key: 'WITHDRAWAL', label: 'withdrawals' },
]

const DATE_SORTS = [
  { key: 'newest', label: 'newest' },
  { key: 'oldest', label: 'oldest' },
]

/**
 * One goal's own dashboard: what it is saving for, how far along it is and every
 * entry that has gone into it.
 *
 * The numbers on this page are all derived from the gullak ledger — editing a
 * goal never rewrites the transactions behind it, and editing a transaction
 * never rewrites the goal.
 */
export default function GullakGoalPage() {
  const { goalId } = useParams()
  const navigate = useNavigate()

  const [goal, setGoal] = useState(null)
  const [goals, setGoals] = useState([])
  const [summary, setSummary] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [entry, setEntry] = useState('')
  const [entryDate, setEntryDate] = useState(todayIso())
  const [warning, setWarning] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef(null)

  const [typeFilter, setTypeFilter] = useState('all')
  const [dateSort, setDateSort] = useState('newest')

  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const [editingGoal, setEditingGoal] = useState(false)
  /** Set when a withdrawal is short in this goal and has to be split. */
  const [splitRequest, setSplitRequest] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [goalData, history, allGoals, overall] = await Promise.all([
        gullakApi.getGoalSummary(goalId),
        gullakApi.getGoalTransactions(goalId),
        gullakApi.getGoals(),
        gullakApi.getSummary(),
      ])
      setGoal(goalData)
      setTransactions(history)
      setGoals(allGoals)
      setSummary(overall)
      setError('')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [goalId])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    setEditingId(null)
    setDraft(null)
    setEditingGoal(false)
  }, [goalId])

  // The entry box belongs to this goal already, so a hashtag here is just text.
  const preview = parseEntry(entry, {
    tags: false,
    missingAmount: MISSING_GULLAK_AMOUNT,
  })

  async function submit(direction) {
    if (submitting || !goal) return

    if (!preview.hasAmount) {
      setWarning(preview.error || MISSING_GULLAK_AMOUNT)
      inputRef.current?.focus()
      return
    }

    if (direction === 'WITHDRAWAL' && !planWithdrawal()) return

    setSubmitting(true)
    setError('')
    setNotice('')
    setWarning('')
    try {
      await gullakApi.addTransaction({
        amount: preview.amount,
        type: direction,
        note: preview.note,
        goal: goal.name,
        date: entryDate || todayIso(),
      })
      setEntry('')
      setNotice(
        direction === 'DEPOSIT'
          ? `Added ₹ ${money(preview.amount)} to ${goal.name}.`
          : `Took ₹ ${money(preview.amount)} out of ${goal.name}.`,
      )
      await load()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  /**
   * A withdrawal from this goal may exceed what the goal holds while the jar as
   * a whole can still cover it — that is exactly what the split dialog is for.
   * Returns false when the withdrawal has been handled elsewhere.
   */
  function planWithdrawal() {
    const amount = Number(preview.amount)
    const overall = Number(summary?.balance ?? 0)

    if (amount > overall) {
      setError(
        `Insufficient Gullak balance. Available: ₹ ${money(overall)}. Requested: ₹ ${money(amount)}.`,
      )
      return false
    }

    if (amount > Number(goal.savedAmount ?? 0)) {
      setError('')
      setWarning('')
      setSplitRequest({
        amount,
        goalId: goal.id,
        note: preview.note || '',
        date: entryDate || todayIso(),
      })
      return false
    }

    return true
  }

  async function handleSplitSuccess(created) {
    const total = created.reduce((sum, row) => sum + Number(row.amount), 0)
    setSplitRequest(null)
    setEntry('')
    setNotice(
      `Withdrew ₹ ${money(total)} across ${created.length} ${
        created.length === 1 ? 'category' : 'categories'
      }.`,
    )
    await load()
  }

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
    if (!window.confirm(`Delete "${label}" (₹ ${money(transaction.amount)})? Balances will be recalculated.`)) {
      return
    }

    setDeletingId(transaction.id)
    setError('')
    setNotice('')
    try {
      await gullakApi.deleteTransaction(transaction.id)
      setNotice('Entry deleted and balances recalculated.')
      if (editingId === transaction.id) cancelEdit()
      await load()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setDeletingId(null)
    }
  }

  async function handleDeleteGoal() {
    if (!goal) return
    const message = transactions.length
      ? `Delete the goal "${goal.name}"?\n\nIts ${transactions.length} ${
          transactions.length === 1 ? 'entry stays' : 'entries stay'
        } in your gullak as general savings — nothing is deleted and your total balance does not change.`
      : `Delete the empty goal "${goal.name}"?`
    if (!window.confirm(message)) return

    setError('')
    setNotice('')
    try {
      await gullakApi.deleteGoal(goal.id)
      navigate('/gullak', { replace: true })
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const visible = transactions
    .filter((transaction) => typeFilter === 'all' || transaction.type === typeFilter)
    .sort((a, b) => {
      const compare =
        a.date < b.date ? -1 : a.date > b.date ? 1 : String(a.createdAt).localeCompare(String(b.createdAt))
      return dateSort === 'oldest' ? compare : -compare
    })

  if (loading && !goal) {
    return (
      <div className="coin-page">
        <TopBar />
        <p className="coin-muted" style={{ marginTop: '24px' }}>
          loading your goal…
        </p>
      </div>
    )
  }

  if (!goal) {
    return (
      <div className="coin-page">
        <TopBar />
        <Link className="coin-gullak-back" to="/gullak">
          ← back to gullak
        </Link>
        <div className="coin-alert" role="alert" style={{ marginTop: '16px' }}>
          {error || 'That goal no longer exists.'}
        </div>
      </div>
    )
  }

  const tone = goalTone(goal)
  const target = hasTarget(goal)
  const extra = overshoot(goal)
  const countdown = deadline(goal)

  return (
    <div className="coin-page">
      <TopBar />

      <Link className="coin-gullak-back" to="/gullak">
        ← back to gullak
      </Link>

      {/* Goal header ------------------------------------------------- */}
      <header className={`coin-goalpage-head coin-goalpage-head--${tone}`}>
        <span className="coin-goalpage-head__icon" aria-hidden="true">
          {goalEmoji(goal)}
        </span>

        <div className="coin-goalpage-head__body">
          <div className="coin-goalpage-head__row">
            <h1 className="coin-goalpage-head__name">{goal.name}</h1>
            <span className={`coin-gullak-goal__badge is-${goal.status.toLowerCase()}`}>
              {goal.status.toLowerCase()}
            </span>
          </div>

          <p className="coin-goalpage-head__desc">
            {goal.description || 'no description yet — add one so you remember what this is for.'}
          </p>

          <p className="coin-goalpage-head__meta">
            target date: {goal.targetDate ? formatDate(goal.targetDate) : 'not set'} ·{' '}
            {goal.transactionCount} {goal.transactionCount === 1 ? 'entry' : 'entries'} · created{' '}
            {formatDate(String(goal.createdAt).slice(0, 10))}
          </p>
        </div>

        <div className="coin-goalpage-head__actions">
          <Button variant="ghost" size="sm" onClick={() => setEditingGoal(true)}>
            edit goal
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDeleteGoal}>
            delete goal
          </Button>
        </div>
      </header>

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

      {/* Edit goal — the same dialog the dashboard uses to create one. */}
      {editingGoal && (
        <GoalFormModal
          goal={goal}
          onClose={() => setEditingGoal(false)}
          onSaved={async (saved, message) => {
            setEditingGoal(false)
            setNotice(message)
            await load()
          }}
          onError={setError}
        />
      )}

      {/* Exactly three summary cards --------------------------------- */}
      <div className="coin-goal-stats">
        <div className="coin-goal-stat coin-goal-stat--target">
          <div className="coin-goal-stat__label">total target</div>
          <div className="coin-goal-stat__value">
            {target ? `₹ ${money(goal.targetAmount)}` : '—'}
          </div>
          <div className="coin-goal-stat__note">
            {target ? 'what you are aiming for' : 'no target set yet'}
          </div>
        </div>

        <div className="coin-goal-stat coin-goal-stat--saved">
          <div className="coin-goal-stat__label">total saved</div>
          <div className="coin-goal-stat__value">₹ {money(goal.savedAmount)}</div>
          <div className="coin-goal-stat__note">
            {goal.transactionCount === 0
              ? 'nothing saved into this goal yet'
              : `across ${goal.transactionCount} ${goal.transactionCount === 1 ? 'entry' : 'entries'}`}
          </div>
        </div>

        <div className="coin-goal-stat coin-goal-stat--free">
          <div className="coin-goal-stat__label">percentage saved</div>
          <div className="coin-goal-stat__value">{target ? percent(goal.progressPercent) : '—'}</div>
          <div className="coin-goal-stat__note">
            {!target
              ? 'add a target to see progress'
              : extra > 0
                ? `₹ ${money(extra)} past the target`
                : `₹ ${money(goal.remaining)} to go`}
          </div>
        </div>
      </div>

      {/* Days remaining ---------------------------------------------- */}
      <div className={`coin-goalpage-days is-${countdown.tone}`}>
        <span className="coin-goalpage-days__label">days remaining</span>
        <span className="coin-goalpage-days__value">{countdown.label}</span>
        <span className="coin-goalpage-days__note">
          {goal.targetDate ? `target date ${formatDate(goal.targetDate)}` : 'set a target date from "edit goal"'}
        </span>
      </div>

      {/* Progress ---------------------------------------------------- */}
      <section className="coin-section">
        <div className="coin-section__head">
          <h2 className="coin-section__title">progress</h2>
          <span className="coin-section__note">
            {target
              ? `saved ÷ target × 100 = ${percent(goal.progressPercent)}`
              : 'progress needs a target'}
          </span>
        </div>

        <div className="coin-goalpage-bar" role="img" aria-label={`${percent(goal.progressPercent)} saved`}>
          <span
            className="coin-goalpage-bar__fill"
            style={{ width: `${target ? Number(goal.progressPercent) : 0}%` }}
          />
        </div>

        <div className="coin-goalpage-bar__legend">
          <span>₹ {money(goal.savedAmount)} saved</span>
          <span>
            {target
              ? extra > 0
                ? `₹ ${money(extra)} over target`
                : `₹ ${money(goal.remaining)} remaining`
              : 'set a target to track this'}
          </span>
        </div>
      </section>

      {/* Add to this goal -------------------------------------------- */}
      <section className="coin-section">
        <div className="coin-section__head">
          <h2 className="coin-section__title">
            add to <span className="coin-goalpage-inline">#{goal.name}</span>
          </h2>
          <span className="coin-section__note">
            deposits raise this goal · withdrawals lower it
          </span>
        </div>

        <EntryBox
          value={entry}
          onChange={(event) => {
            setEntry(event.target.value)
            if (warning) setWarning('')
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              submit('DEPOSIT')
            }
          }}
          inputRef={inputRef}
          placeholder="500 saved from lunch"
          hint="numbers → amount · words → note · this entry is already tagged with your goal"
          date={entryDate}
          onDateChange={(event) => setEntryDate(event.target.value)}
          preview={preview}
          warning={warning}
          disabled={submitting}
          ariaLabel={`Add to ${goal.name}`}
          actions={
            <>
              <button
                type="button"
                className="coin-gullak-action coin-gullak-action--in"
                onClick={() => submit('DEPOSIT')}
                disabled={submitting}
              >
                <span aria-hidden="true">+</span> Deposit
              </button>
              <button
                type="button"
                className="coin-gullak-action coin-gullak-action--out"
                onClick={() => submit('WITHDRAWAL')}
                disabled={submitting}
              >
                <span aria-hidden="true">−</span> Withdrawal
              </button>
            </>
          }
        />
      </section>

      {/* Goal history ------------------------------------------------ */}
      <section className="coin-section">
        <div className="coin-section__head">
          <h2 className="coin-section__title">goal history</h2>
          <span className="coin-section__note">
            {transactions.length} {transactions.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>

        <div className="coin-gullak-controls">
          <div className="coin-gullak-filters" role="group" aria-label="Filter by type">
            {TYPE_FILTERS.map((option) => (
              <button
                key={option.key}
                type="button"
                className={`coin-gullak-filters__btn ${typeFilter === option.key ? 'is-active' : ''}`}
                aria-pressed={typeFilter === option.key}
                onClick={() => setTypeFilter(option.key)}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="coin-gullak-filters" role="group" aria-label="Sort by date">
            {DATE_SORTS.map((option) => (
              <button
                key={option.key}
                type="button"
                className={`coin-gullak-filters__btn ${dateSort === option.key ? 'is-active' : ''}`}
                aria-pressed={dateSort === option.key}
                onClick={() => setDateSort(option.key)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {transactions.length === 0 && (
          <div className="coin-empty" style={{ marginTop: '18px' }}>
            Nothing in this goal yet. Add a deposit above to get started.
          </div>
        )}

        {transactions.length > 0 && visible.length === 0 && (
          <div className="coin-empty" style={{ marginTop: '18px' }}>
            No {typeFilter === 'DEPOSIT' ? 'deposits' : 'withdrawals'} in this goal.
          </div>
        )}

        {visible.length > 0 && (
          <div className="coin-gullak-list">
            {visible.map((transaction) =>
              editingId === transaction.id ? (
                <SavingsEditRow
                  key={transaction.id}
                  draft={draft}
                  goals={goals}
                  saving={savingEdit}
                  onChange={setDraft}
                  onSubmit={handleEditSubmit}
                  onCancel={cancelEdit}
                />
              ) : (
                <SavingsRow
                  key={transaction.id}
                  transaction={transaction}
                  showGoal={false}
                  busy={deletingId === transaction.id}
                  onEdit={startEdit}
                  onDelete={handleDelete}
                />
              ),
            )}
          </div>
        )}
      </section>

      <Link className="coin-history-btn coin-history-btn--link" to="/gullak/history">
        <span className="coin-history-btn__text">
          <span className="coin-history-btn__title">view all gullak entries</span>
          <span className="coin-history-btn__sub">filter by goal, edit, delete and sort</span>
        </span>
        <span className="coin-history-btn__arrow" aria-hidden="true">
          →
        </span>
      </Link>

      {splitRequest && (
        <WithdrawalSplitModal
          requestedAmount={splitRequest.amount}
          overallBalance={summary?.balance ?? 0}
          generalSavings={summary?.generalSavings ?? 0}
          goals={goals}
          initialGoalId={splitRequest.goalId}
          note={splitRequest.note}
          date={splitRequest.date}
          onClose={() => setSplitRequest(null)}
          onSuccess={handleSplitSuccess}
          onError={setError}
        />
      )}
    </div>
  )
}

