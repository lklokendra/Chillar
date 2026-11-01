import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import EntryBox from '../components/EntryBox'
import TopBar from '../components/TopBar'
import * as gullakApi from '../api/gullak'
import { errorMessage } from '../api/client'
import { formatDate, MISSING_GULLAK_AMOUNT, parseEntry, todayIso } from '../utils/entry'
import '../styles/gullak.css'

/** How many ledger rows the dashboard previews before sending you to the full history. */
const RECENT_COUNT = 4

/** "1,250.5" — the same money format used elsewhere in the app. */
function money(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

/**
 * The gullak dashboard. Entries are typed straight into the box (same gesture as
 * a khata) and then committed with one of two dedicated buttons, so the type is
 * never a separate field the user has to think about.
 */
export default function GullakPage() {
  const navigate = useNavigate()

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

  // Same parser as the khata box, minus the #category behaviour.
  const preview = parseEntry(entry, { tags: false, missingAmount: MISSING_GULLAK_AMOUNT })

  async function submit(direction) {
    if (submitting) return

    if (!preview.hasAmount) {
      setWarning(preview.error || MISSING_GULLAK_AMOUNT)
      inputRef.current?.focus()
      return
    }

    setSubmitting(true)
    setError('')
    setNotice('')
    setWarning('')
    try {
      await gullakApi.addTransaction({
        amount: preview.amount,
        type: direction,
        note: preview.note,
        date: entryDate || todayIso(),
      })
      setEntry('')
      setNotice(
        direction === 'DEPOSIT'
          ? `Deposited ₹ ${money(preview.amount)} into your gullak.`
          : `Withdrew ₹ ${money(preview.amount)} from your gullak.`,
      )
      await load()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter') {
      event.preventDefault()
      submit('DEPOSIT')
    }
  }

  const balance = summary?.balance ?? 0
  const deposits = summary?.totalDeposits ?? 0
  const withdrawals = summary?.totalWithdrawals ?? 0
  const count = summary?.transactionCount ?? 0
  // The API already returns newest-first (date, then creation time).
  const recent = transactions.slice(0, RECENT_COUNT)

  return (
    <div className="coin-page">
      <TopBar />

      <h1 className="coin-page__title">gullak</h1>
      <p className="coin-page__subtitle">
        your little savings jar — drop money in, take it out when you need it.
      </p>

      {/* Balance first: it is the headline number of this page. */}
      <div className="coin-gullak-hero">
        <div className="coin-gullak-hero__label">current savings</div>
        <div className="coin-gullak-hero__value">₹ {money(balance)}</div>
        <div className="coin-gullak-hero__note">
          {count === 0
            ? 'nothing saved yet — start with a deposit'
            : `saved across ${count} ${count === 1 ? 'entry' : 'entries'}`}
        </div>
        <span
          className={`coin-gullak-hero__flag ${
            balance > 0 ? 'is-up' : 'is-flat'
          }`}
        >
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
          <div className="coin-tile__label">Entries</div>
          <div className="coin-tile__value">{count}</div>
          <div className="coin-tile__note">deposits and withdrawals</div>
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

      <EntryBox
        value={entry}
        onChange={(event) => {
          setEntry(event.target.value)
          if (warning) setWarning('')
        }}
        onKeyDown={handleKeyDown}
        inputRef={inputRef}
        placeholder="500 saved from lunch"
        hint="numbers → amount · words → note · pick deposit or withdrawal below"
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

      <section className="coin-section">
        <h2 className="coin-section__title">recent activity</h2>

        {loading && transactions.length === 0 && (
          <p className="coin-muted" style={{ marginTop: '12px' }}>
            loading your gullak…
          </p>
        )}

        {!loading && recent.length === 0 && (
          <div className="coin-empty" style={{ marginTop: '12px' }}>
            Nothing saved yet. Type an amount above and hit Deposit.
          </div>
        )}

        {recent.length > 0 && (
          <div className="coin-gullak-recent">
            {recent.map((transaction) => {
              const isIn = transaction.type === 'DEPOSIT'
              return (
                <div
                  className={`coin-gullak-recent-row ${isIn ? 'is-in' : 'is-out'}`}
                  key={transaction.id}
                >
                  <span className="coin-gullak-recent__icon" aria-hidden="true">
                    {isIn ? '+' : '−'}
                  </span>
                  <div className="coin-gullak-recent__main">
                    <span className="coin-gullak-recent__note">
                      {transaction.note || (isIn ? 'deposit' : 'withdrawal')}
                    </span>
                    <span className="coin-gullak-recent__meta">
                      {formatDate(transaction.date)} · {isIn ? 'deposit' : 'withdrawal'}
                    </span>
                  </div>
                  <span
                    className={`coin-gullak-recent__amount ${
                      isIn ? 'is-in' : 'is-out'
                    }`}
                  >
                    {isIn ? '+' : '−'}₹{money(transaction.amount)}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {transactions.length > RECENT_COUNT && (
          <p className="coin-gullak-more">
            showing the latest {RECENT_COUNT} of {transactions.length} entries
          </p>
        )}
      </section>

      <button type="button" className="coin-history-btn" onClick={() => navigate('/gullak/history')}>
        <span className="coin-history-btn__text">
          <span className="coin-history-btn__title">view full history</span>
          <span className="coin-history-btn__sub">
            every deposit and withdrawal · edit, delete, filter and sort
          </span>
        </span>
        <span className="coin-history-btn__arrow" aria-hidden="true">
          →
        </span>
      </button>
    </div>
  )
}
