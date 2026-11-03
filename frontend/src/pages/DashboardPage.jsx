import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import EntryBox from '../components/EntryBox'
import KharchAccordion from '../components/KharchAccordion'
import TopBar from '../components/TopBar'
import { useAuth } from '../context/AuthContext'
import * as transactionApi from '../api/transactions'
import { errorMessage } from '../api/client'
import {
  buildSuggestions,
  formatDate,
  MISSING_AMOUNT,
  parseEntry,
  tagInInput,
  todayIso,
  withTag,
  withoutTag,
} from '../utils/entry'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user, isGuest } = useAuth()
  const [kharch, setKharch] = useState([])
  const [transactions, setTransactions] = useState([])
  const [entryInput, setEntryInput] = useState('')
  const [entryDate, setEntryDate] = useState(todayIso())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [entryWarning, setEntryWarning] = useState('')
  const [deletingId, setDeletingId] = useState(null)
  const [expandedKharch, setExpandedKharch] = useState(null)
  const inputRef = useRef(null)

  const rawFirstName = isGuest ? 'Guest' : (user?.name?.split(' ')[0] ?? 'there')
  // Greet with a capitalised first letter without touching the rest of the name.
  const firstName = rawFirstName.charAt(0).toUpperCase() + rawFirstName.slice(1)
  const totalAll = Number(kharch.find((k) => k.name === 'all')?.total ?? 0)
  const spendKharch = kharch.filter((k) => k.name !== 'all')
  const topKharch = [...spendKharch].sort((a, b) => Number(b.total) - Number(a.total))[0]
  const entryCount = transactions.length
  const activeTag = tagInInput(entryInput)
  const suggestions = buildSuggestions(spendKharch)
  // What the entry box currently adds up to — shown before anything is saved.
  const preview = parseEntry(entryInput)

  const entriesByKharch = {}
  for (const transaction of transactions) {
    if (!entriesByKharch[transaction.categoryName]) {
      entriesByKharch[transaction.categoryName] = []
    }
    entriesByKharch[transaction.categoryName].push(transaction)
  }

  useEffect(() => {
    refresh()
  }, [])

  async function refresh() {
    try {
      const [kharchData, transactionData] = await Promise.all([
        transactionApi.getKharch(),
        transactionApi.getTransactions(),
      ])
      setKharch(kharchData)
      setTransactions(transactionData)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function submitEntry() {
    const value = entryInput.trim()
    if (!value || saving) return

    // Warn instead of sending an entry that adds up to nothing.
    if (!preview.hasAmount) {
      setEntryWarning(preview.error || MISSING_AMOUNT)
      inputRef.current?.focus()
      return
    }

    setSaving(true)
    setError('')
    setNotice('')
    setEntryWarning('')
    try {
      const saved = await transactionApi.addEntry(value, entryDate)
      setEntryInput('')
      setNotice(
        `Logged ₹${Number(saved.amount).toLocaleString()}${saved.note ? ` · ${saved.note}` : ''} on ${formatDate(saved.date)}`,
      )
      await refresh()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  function handleEntrySubmit(event) {
    if (event.key === 'Enter') {
      event.preventDefault()
      submitEntry()
    }
  }

  /** Clicking a suggested kharch tags the entry without typing the "#". */
  function applyCategory(name) {
    setEntryInput(activeTag === name.toLowerCase() ? withoutTag(entryInput) : withTag(entryInput, name))
    inputRef.current?.focus()
  }

  function toggleKharch(name) {
    setExpandedKharch((current) => (current === name ? null : name))
  }

  async function handleDelete(transaction) {
    const label = transaction.note || transaction.categoryName || 'this entry'
    if (!window.confirm(`Delete "${label}" (₹${Number(transaction.amount).toLocaleString()})?`)) {
      return
    }

    setDeletingId(transaction.id)
    setError('')
    setNotice('')
    try {
      await transactionApi.deleteTransaction(transaction.id)
      setNotice(`Deleted "${label}"`)
      await refresh()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="coin-page">
      <TopBar />

      <div style={{ marginTop: '20px' }}>
        <h1 className="coin-page__title">Hi {firstName}</h1>
        <p className="coin-page__subtitle" style={{ marginBottom: '32px' }}>
          {isGuest ? 'You are exploring Paise as a guest.' : 'Welcome back to your kharch.'}
        </p>

        {/* Suggested kharch — tap one instead of typing "#name". */}
        {suggestions.length > 0 && (
          <div className="coin-suggest">
            <span className="coin-suggest__label">tap to tag</span>
            <div className="coin-suggest__chips">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.name}
                  type="button"
                  className={`coin-suggest__chip coin-suggest__chip--${suggestion.color} ${
                    activeTag === suggestion.name.toLowerCase() ? 'is-active' : ''
                  }`}
                  onClick={() => applyCategory(suggestion.name)}
                >
                  #{suggestion.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Prominent one-line entry — type, then hit enter or the + button. */}
        <EntryBox
          value={entryInput}
          onChange={(event) => {
            setEntryInput(event.target.value)
            if (entryWarning) setEntryWarning('')
          }}
          onKeyDown={handleEntrySubmit}
          inputRef={inputRef}
          placeholder="100 chai #office"
          hint="numbers → money · words → note · #tag → category · press enter or + to log"
          date={entryDate}
          onDateChange={(event) => setEntryDate(event.target.value)}
          preview={preview}
          warning={entryWarning}
          disabled={saving}
          ariaLabel="Add an expense"
          inlineActions={
            <button
              type="button"
              className="coin-add-btn"
              onClick={submitEntry}
              disabled={saving || !preview.hasAmount}
              aria-label="Add expense"
              title="Add expense"
            >
              +
            </button>
          }
        />

        {notice && (
          <div className="coin-alert coin-alert--ok" role="status" style={{ marginTop: '12px' }}>
            {notice}
          </div>
        )}
        {error && (
          <div className="coin-alert" role="alert" style={{ marginTop: '12px' }}>
            {error}
          </div>
        )}

        {/* Totals */}
        <div className="coin-grid" style={{ marginTop: '28px', marginBottom: '44px' }}>
          <div className="coin-tile coin-tile--ink">
            <div className="coin-tile__label">Total Spends</div>
            <div className="coin-tile__value">₹ {totalAll.toLocaleString()}</div>
            <div className="coin-tile__note">Combined across all kharch</div>
          </div>
          <div className="coin-tile coin-tile--mint">
            <div className="coin-tile__label">Top Category</div>
            <div className="coin-tile__value" style={{ fontSize: '18px', textTransform: 'capitalize' }}>
              {topKharch?.name || 'None'}
            </div>
            <div className="coin-tile__note">
              {topKharch ? `₹ ${Number(topKharch.total).toLocaleString()} spent` : 'No spending yet'}
            </div>
          </div>
          <div className="coin-tile coin-tile--blue">
            <div className="coin-tile__label">Entries</div>
            <div className="coin-tile__value">{entryCount}</div>
            <div className="coin-tile__note">
              across {spendKharch.length} kharch
            </div>
          </div>
        </div>

        <div className="coin-pill coin-pill--mint">#all</div>
        <h1 style={{ fontSize: '48px', marginTop: '12px', marginBottom: '16px', textTransform: 'none' }}>Kharch</h1>
        <p className="coin-muted" style={{ marginBottom: '32px' }}>
          tap a kharch to see everything spent in it
        </p>

        <div style={{ display: 'grid', gap: '12px' }}>
          {spendKharch.length === 0 && (
            <div className="coin-muted">No kharch yet. Log something like “100 chai #food”.</div>
          )}

          {spendKharch.map((kharch) => (
            <KharchAccordion
              key={kharch.name}
              kharch={kharch}
              entries={entriesByKharch[kharch.name] ?? []}
              isOpen={expandedKharch === kharch.name}
              onToggle={toggleKharch}
              deletingId={deletingId}
              onDelete={handleDelete}
            />
          ))}
        </div>

        {/* The full log lives on its own page now. */}
        <button type="button" className="coin-history-btn" onClick={() => navigate('/history')}>
          <span className="coin-history-btn__text">
            <span className="coin-history-btn__title">History</span>
            <span className="coin-history-btn__sub">
              all kharch · {transactions.length} {transactions.length === 1 ? 'entry' : 'entries'}
            </span>
          </span>
          <span className="coin-history-btn__arrow" aria-hidden="true">
            →
          </span>
        </button>
      </div>
    </div>
  )
}
