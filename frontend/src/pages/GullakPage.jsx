import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import EntryBox from '../components/EntryBox'
import GoalFormModal from '../components/GoalFormModal'
import TopBar from '../components/TopBar'
import WithdrawalSplitModal from '../components/WithdrawalSplitModal'
import SavingsRow from '../components/SavingsRow'
import * as gullakApi from '../api/gullak'
import { errorMessage } from '../api/client'
import { MISSING_GULLAK_AMOUNT, parseEntry, todayIso } from '../utils/entry'
import { goalEmoji, goalTone, hasTarget, money, overshoot, percent } from '../utils/goals'
import { groupTransactions } from '../utils/savings'
import '../styles/gullak.css'

/**
 * The gullak dashboard: category-wise savings.
 *
 * Entries are typed straight into the box exactly like a khata entry — numbers
 * are the amount, words are the note and a hashtag names the savings goal. The
 * hashtag creates the goal the first time it is used and files the money under
 * it every time after that, so a goal's balance is always just the sum of the
 * deposits pointing at it.
 */
export default function GullakPage() {
  const navigate = useNavigate()

  const [summary, setSummary] = useState(null)
  const [goals, setGoals] = useState([])
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [creatingGoal, setCreatingGoal] = useState(false)
  /** Set when a withdrawal has to be split across categories. */
  const [splitRequest, setSplitRequest] = useState(null)

  const [entry, setEntry] = useState('')
  const [entryDate, setEntryDate] = useState(todayIso())
  const [warning, setWarning] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [summaryData, goalData, recentData] = await Promise.all([
        gullakApi.getSummary(),
        gullakApi.getGoals(),
        gullakApi.getRecentTransactions(),
      ])
      setSummary(summaryData)
      setGoals(goalData)
      setRecent(recentData)
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

  // The same parser the khata box uses; here the hashtag means "savings goal".
  const preview = parseEntry(entry, { missingAmount: MISSING_GULLAK_AMOUNT, singleTag: true })

  async function submit(direction) {
    if (submitting) return

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
      const saved = await gullakApi.addTransaction({
        amount: preview.amount,
        type: direction,
        note: preview.note,
        goal: preview.goal,
        date: entryDate || todayIso(),
      })
      setEntry('')
      setNotice(
        direction === 'DEPOSIT'
          ? `Deposited ₹ ${money(preview.amount)} into ${saved.goalName ? `#${saved.goalName}` : 'general savings'}.`
          : `Withdrew ₹ ${money(preview.amount)} from ${saved.goalName ? `#${saved.goalName}` : 'general savings'}.`,
      )
      await load()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  /**
   * Decides whether a withdrawal can go through as typed. Returns false when it
   * has been handled some other way: either it is impossible (the jar itself is
   * short) or it needs the split dialog because only the named category is
   * short while the jar as a whole can still cover it.
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

    // A named goal with nothing saved in it is genuinely empty — the money is
    // never quietly taken from another goal.
    const named = Boolean(preview.goal)
    const target = named
      ? goals.find((goal) => goal.name.toLowerCase() === String(preview.goal).toLowerCase()) ?? null
      : null
    const available = named ? Number(target?.savedAmount ?? 0) : Number(summary?.generalSavings ?? 0)

    if (amount > available) {
      setError('')
      setWarning('')
      setSplitRequest({
        amount,
        goalId: target ? target.id : null,
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

  function handleKeyDown(event) {
    if (event.key === 'Enter') {
      event.preventDefault()
      submit('DEPOSIT')
    }
  }

  // The section "add" shortcuts all point at the single entry box — there is
  // only one way to move money into the gullak, so nothing is duplicated.
  function startEntry() {
    setWarning('')
    inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    inputRef.current?.focus()
  }

  async function handleGoalSaved(savedGoal, message) {
    setCreatingGoal(false)
    setNotice(message || `Goal #${savedGoal.name} saved.`)
    await load()
  }

  const balance = summary?.balance ?? 0
  const deposits = summary?.totalDeposits ?? 0
  const withdrawals = summary?.totalWithdrawals ?? 0
  const count = summary?.transactionCount ?? 0
  const general = summary?.generalSavings ?? 0
  const goalsTotal = summary?.goalsTotal ?? 0

  // A split withdrawal arrives as one row per category; show it as one entry.
  const recentEntries = groupTransactions(recent)

  return (
    <div className="coin-page">
      <TopBar />

      <h1 className="coin-page__title">gullak</h1>
      <p className="coin-page__subtitle">
        category-wise savings — every hashtag you write becomes its own goal.
      </p>

      {/* 1. Entry first: it is the primary action on this page. */}
      <EntryBox
        value={entry}
        onChange={(event) => {
          setEntry(event.target.value)
          if (warning) setWarning('')
        }}
        onKeyDown={handleKeyDown}
        inputRef={inputRef}
        placeholder="500 #laptop"
        hint="numbers → amount · words → note · #hashtag → savings goal · nothing tagged → general savings"
        date={entryDate}
        onDateChange={(event) => setEntryDate(event.target.value)}
        preview={preview}
        warning={warning}
        disabled={submitting}
        ariaLabel="Add to your gullak"
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

      {preview.goal && preview.hasAmount && (
        <p className="coin-gullak-filed" role="status">
          goes into <strong>#{preview.goal}</strong>
          {goals.some((goal) => goal.name.toLowerCase() === preview.goal.toLowerCase())
            ? ' — an existing goal'
            : ' — a new goal will be created'}
        </p>
      )}

      {notice && (
        <div className="coin-alert coin-alert--ok" role="status">
          {notice}
        </div>
      )}
      {error && (
        <div className="coin-alert" role="alert">
          {error}
        </div>
      )}

      {/* 2. Overall savings. */}
      <section className="coin-section">
        <h2 className="coin-section__title">overall savings</h2>

        <div className="coin-gullak-hero">
          <div className="coin-gullak-hero__label">total balance</div>
          <div className="coin-gullak-hero__value">₹ {money(balance)}</div>
          <div className="coin-gullak-hero__note">
            {count === 0
              ? 'nothing saved yet — start with a deposit'
              : `saved across ${count} ${count === 1 ? 'entry' : 'entries'}`}
          </div>
          <span className={`coin-gullak-hero__flag ${balance > 0 ? 'is-up' : 'is-flat'}`}>
            {balance > 0 ? '↑ growing' : '— empty'}
          </span>
        </div>

        <div className="coin-grid">
          <div className="coin-tile coin-tile--mint">
            <div className="coin-tile__label">Total Deposits</div>
            <div className="coin-tile__value">₹ {money(deposits)}</div>
            <div className="coin-tile__note">money you put away</div>
          </div>
          <div className="coin-tile coin-tile--rose">
            <div className="coin-tile__label">Total Withdrawals</div>
            <div className="coin-tile__value">₹ {money(withdrawals)}</div>
            <div className="coin-tile__note">money you took back out</div>
          </div>
          <div className="coin-tile coin-tile--blue">
            <div className="coin-tile__label">Total Transactions</div>
            <div className="coin-tile__value">{count}</div>
            <div className="coin-tile__note">deposits and withdrawals</div>
          </div>
        </div>
      </section>

      {/* 3. Your savings goals. */}
      <section className="coin-section">
        <div className="coin-section__head">
          <h2 className="coin-section__title">your savings goals</h2>
          <div className="coin-section__tools">
            <span className="coin-section__note">
              {goals.length === 0
                ? 'none yet'
                : `${goals.length} ${goals.length === 1 ? 'goal' : 'goals'} · ₹ ${money(goalsTotal)}`}
            </span>
            <button type="button" className="coin-add-chip" onClick={() => setCreatingGoal(true)}>
              <span aria-hidden="true">+</span> add goal
            </button>
          </div>
        </div>

        {loading && goals.length === 0 && (
          <p className="coin-muted">loading your goals…</p>
        )}

        {!loading && goals.length === 0 && (
          <div className="coin-empty">
            No goals yet. Type something like <code>500 #laptop</code> above, or hit{' '}
            <strong>+ add goal</strong> to set one up by hand.
          </div>
        )}

        {goals.length > 0 && (
          <div className="coin-gullak-goals">
            {goals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onOpen={() => navigate(`/gullak/goals/${goal.id}`)}
              />
            ))}
          </div>
        )}
      </section>

      {/* 4. General savings — the untagged part of the jar. */}
      <section className="coin-section">
        <div className="coin-section__head">
          <h2 className="coin-section__title">general savings</h2>
          <div className="coin-section__tools">
            <button type="button" className="coin-add-chip coin-add-chip--soft" onClick={startEntry}>
              <span aria-hidden="true">+</span> add savings
            </button>
          </div>
        </div>

        <div className="coin-gullak-general">
          <span className="coin-gullak-general__icon" aria-hidden="true">
            🫙
          </span>
          <div className="coin-gullak-general__body">
            <span className="coin-gullak-general__title">not assigned to a goal</span>
            <span className="coin-gullak-general__hint">
              entries with no hashtag land here — the money still counts towards your total balance.
            </span>
          </div>
          <span className="coin-gullak-general__amount">₹ {money(general)}</span>
        </div>
      </section>

      {/* 5. Latest four entries. */}
      <section className="coin-section">
        <div className="coin-section__head">
          <h2 className="coin-section__title">recent activity</h2>
          <div className="coin-section__tools">
            <button type="button" className="coin-add-chip coin-add-chip--soft" onClick={startEntry}>
              <span aria-hidden="true">+</span> add transaction
            </button>
          </div>
        </div>

        {loading && recent.length === 0 && (
          <p className="coin-muted">loading your gullak…</p>
        )}

        {!loading && recent.length === 0 && (
          <div className="coin-empty">
            Nothing saved yet. Type an amount above and hit Deposit.
          </div>
        )}

        {recentEntries.length > 0 && (
          <div className="coin-gullak-recent">
            {recentEntries.map((transaction) => (
              <div key={transaction.groupId || transaction.id}>
                <SavingsRow transaction={transaction} />
              </div>
            ))}
          </div>
        )}

        {count > recentEntries.length && (
          <p className="coin-gullak-more">
            showing the latest {recentEntries.length} of {count} entries
          </p>
        )}
      </section>

      <button type="button" className="coin-history-btn" onClick={() => navigate('/gullak/history')}>
        <span className="coin-history-btn__text">
          <span className="coin-history-btn__title">view full history</span>
          <span className="coin-history-btn__sub">
            every deposit and withdrawal · edit, delete, filter by goal and sort
          </span>
        </span>
        <span className="coin-history-btn__arrow" aria-hidden="true">
          →
        </span>
      </button>

      <p className="coin-gullak-footnote">
        <Link to="/gullak/history">manage every entry</Link> · goals can be created with{' '}
        <strong>+ add goal</strong> or straight from a hashtag like <code>#laptop</code>.
      </p>

      {creatingGoal && (
        <GoalFormModal
          onClose={() => setCreatingGoal(false)}
          onSaved={handleGoalSaved}
          onError={setError}
        />
      )}

      {splitRequest && (
        <WithdrawalSplitModal
          requestedAmount={splitRequest.amount}
          overallBalance={balance}
          generalSavings={general}
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

/** One "Your Savings Goals" card: name, icon, saved/target, progress, status. */
function GoalCard({ goal, onOpen }) {
  const tone = goalTone(goal)
  const target = hasTarget(goal)
  const extra = overshoot(goal)

  return (
    <button
      type="button"
      className={`coin-gullak-goal coin-gullak-goal--${tone} is-${goal.status.toLowerCase()}`}
      onClick={onOpen}
      aria-label={`Open the ${goal.name} goal`}
    >
      <span className="coin-gullak-goal__head">
        <span className="coin-gullak-goal__icon" aria-hidden="true">
          {goalEmoji(goal)}
        </span>
        <span className="coin-gullak-goal__name">{goal.name}</span>
        <span className={`coin-gullak-goal__badge is-${goal.status.toLowerCase()}`}>
          {goal.status.toLowerCase()}
        </span>
      </span>

      <span className="coin-gullak-goal__figures">
        <span className="coin-gullak-goal__saved">₹ {money(goal.savedAmount)}</span>
        <span className="coin-gullak-goal__target">
          {target ? `of ₹ ${money(goal.targetAmount)}` : 'no target set'}
        </span>
      </span>

      <span className="coin-gullak-goal__bar" aria-hidden="true">
        <span
          className="coin-gullak-goal__fill"
          style={{ width: `${target ? Number(goal.progressPercent) : 0}%` }}
        />
      </span>

      <span className="coin-gullak-goal__meta">
        <span>{target ? `${percent(goal.progressPercent)} saved` : `${goal.transactionCount} entries`}</span>
        <span>
          {extra > 0
            ? `₹ ${money(extra)} over target`
            : target
              ? `₹ ${money(goal.remaining)} to go`
              : 'set a target'}
        </span>
      </span>
    </button>
  )
}
