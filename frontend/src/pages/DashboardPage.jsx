import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Brand from '../components/Brand'
import KhataAccordion from '../components/KhataAccordion'
import { useAuth } from '../context/AuthContext'
import * as transactionApi from '../api/transactions'
import { errorMessage } from '../api/client'
import {
  buildSuggestions,
  formatDate,
  tagInInput,
  todayIso,
  withTag,
  withoutTag,
} from '../utils/entry'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user, isGuest, signOut } = useAuth()
  const [khatas, setKhatas] = useState([])
  const [transactions, setTransactions] = useState([])
  const [entryInput, setEntryInput] = useState('')
  const [entryDate, setEntryDate] = useState(todayIso())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [deletingId, setDeletingId] = useState(null)
  const [expandedKhata, setExpandedKhata] = useState(null)
  const inputRef = useRef(null)

  const firstName = isGuest ? 'Guest' : (user?.name?.split(' ')[0] ?? 'there')
  const totalAll = Number(khatas.find((k) => k.name === 'all')?.total ?? 0)
  const spendKhatas = khatas.filter((k) => k.name !== 'all')
  const topKhata = [...spendKhatas].sort((a, b) => Number(b.total) - Number(a.total))[0]
  const entryCount = transactions.length
  const activeTag = tagInInput(entryInput)
  const suggestions = buildSuggestions(spendKhatas)

  const entriesByKhata = {}
  for (const transaction of transactions) {
    if (!entriesByKhata[transaction.categoryName]) {
      entriesByKhata[transaction.categoryName] = []
    }
    entriesByKhata[transaction.categoryName].push(transaction)
  }

  useEffect(() => {
    refresh()
  }, [])

  async function refresh() {
    try {
      const [khataData, transactionData] = await Promise.all([
        transactionApi.getKhatas(),
        transactionApi.getTransactions(),
      ])
      setKhatas(khataData)
      setTransactions(transactionData)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function submitEntry() {
    const value = entryInput.trim()
    if (!value || saving) return

    setSaving(true)
    setError('')
    setNotice('')
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

  /** Clicking a suggested khata tags the entry without typing the "#". */
  function applyCategory(name) {
    setEntryInput(activeTag === name.toLowerCase() ? withoutTag(entryInput) : withTag(entryInput, name))
    inputRef.current?.focus()
  }

  function toggleKhata(name) {
    setExpandedKhata((current) => (current === name ? null : name))
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
      <header className="coin-topbar" style={{ padding: '14px 0', border: 'none', justifyContent: 'space-between' }}>
        <Brand showTag={false} />
        <Button variant="ghost" size="sm" onClick={signOut}>
          Sign out
        </Button>
      </header>

      <div style={{ marginTop: '20px' }}>
        <h1 className="coin-page__title">hi {firstName}</h1>
        <p className="coin-page__subtitle" style={{ marginBottom: '32px' }}>
          {isGuest ? 'You are exploring Chillar as a guest.' : 'Welcome back to your khata.'}
        </p>

        {/* Suggested khatas — tap one instead of typing "#name". */}
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

        {/* Prominent one-line entry — no add button, just type and hit enter. */}
        <div className="coin-entry-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '32px', fontWeight: '900' }}>₹</span>
            <input
              ref={inputRef}
              className="coin-entry-input"
              placeholder="100 chai #office"
              value={entryInput}
              onChange={(e) => setEntryInput(e.target.value)}
              onKeyDown={handleEntrySubmit}
              disabled={saving}
            />
          </div>

          <div className="coin-entry-meta">
            <label className="coin-entry-date">
              <span>date</span>
              <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
            </label>
            <p className="coin-entry-hint">
              numbers → money · words → note · #tag → category · press enter to log
            </p>
          </div>
        </div>

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
            <div className="coin-tile__note">Combined across all khatas</div>
          </div>
          <div className="coin-tile coin-tile--mint">
            <div className="coin-tile__label">Top Category</div>
            <div className="coin-tile__value" style={{ fontSize: '18px', textTransform: 'capitalize' }}>
              {topKhata?.name || 'None'}
            </div>
            <div className="coin-tile__note">
              {topKhata ? `₹ ${Number(topKhata.total).toLocaleString()} spent` : 'No spending yet'}
            </div>
          </div>
          <div className="coin-tile coin-tile--blue">
            <div className="coin-tile__label">Entries</div>
            <div className="coin-tile__value">{entryCount}</div>
            <div className="coin-tile__note">
              across {spendKhatas.length} {spendKhatas.length === 1 ? 'khata' : 'khatas'}
            </div>
          </div>
        </div>

        <div className="coin-pill coin-pill--mint">#all</div>
        <h1 style={{ fontSize: '48px', marginTop: '12px', marginBottom: '16px' }}>khatas</h1>
        <p className="coin-muted" style={{ marginBottom: '32px' }}>
          tap a khata to see everything spent in it
        </p>

        <div style={{ display: 'grid', gap: '12px' }}>
          {spendKhatas.length === 0 && (
            <div className="coin-muted">No khatas yet. Log something like “100 chai #food”.</div>
          )}

          {spendKhatas.map((khata) => (
            <KhataAccordion
              key={khata.name}
              khata={khata}
              entries={entriesByKhata[khata.name] ?? []}
              isOpen={expandedKhata === khata.name}
              onToggle={toggleKhata}
              deletingId={deletingId}
              onDelete={handleDelete}
            />
          ))}
        </div>

        {/* The full log lives on its own page now. */}
        <button type="button" className="coin-history-btn" onClick={() => navigate('/history')}>
          <span className="coin-history-btn__text">
            <span className="coin-history-btn__title">history</span>
            <span className="coin-history-btn__sub">
              all khatas · {transactions.length} {transactions.length === 1 ? 'entry' : 'entries'}
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
