import { useEffect, useState } from 'react'
import KhataAccordion from '../components/KhataAccordion'
import TopBar from '../components/TopBar'
import { useAuth } from '../context/AuthContext'
import * as transactionApi from '../api/transactions'
import { errorMessage } from '../api/client'
import '../styles/history.css'

const SORT_OPTIONS = [
  { value: 'newest', label: 'newest', aria: 'Newest first' },
  { value: 'oldest', label: 'oldest', aria: 'Oldest first' },
  { value: 'amount-desc', label: '₹ high', aria: 'Amount high to low' },
  { value: 'amount-asc', label: '₹ low', aria: 'Amount low to high' },
]

/** Client-side ordering of the already-loaded entries for one khata. */
function sortEntries(entries, sortBy) {
  const list = [...entries]
  switch (sortBy) {
    case 'oldest':
      return list.sort((a, b) => String(a.date).localeCompare(String(b.date)))
    case 'amount-desc':
      return list.sort((a, b) => Number(b.amount) - Number(a.amount))
    case 'amount-asc':
      return list.sort((a, b) => Number(a.amount) - Number(b.amount))
    case 'newest':
    default:
      return list.sort((a, b) => String(b.date).localeCompare(String(a.date)))
  }
}

export default function HistoryPage() {
  const { isGuest } = useAuth()
  const [khatas, setKhatas] = useState([])
  const [transactions, setTransactions] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedKhata, setExpandedKhata] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [addingTo, setAddingTo] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [sortBy, setSortBy] = useState('newest')

  const spendKhatas = khatas.filter((k) => k.name !== 'all')
  const totalAll = Number(khatas.find((k) => k.name === 'all')?.total ?? 0)

  const query = searchQuery.trim().toLowerCase()
  const matchesQuery = (t) =>
    !query ||
    [t.note, t.categoryName, String(t.amount)].some(
      (field) => field && field.toLowerCase().includes(query),
    )

  const entriesByKhata = {}
  for (const transaction of transactions) {
    if (!entriesByKhata[transaction.categoryName]) {
      entriesByKhata[transaction.categoryName] = []
    }
    entriesByKhata[transaction.categoryName].push(transaction)
  }

  const entriesFor = (name) => sortEntries((entriesByKhata[name] ?? []).filter(matchesQuery), sortBy)
  // While searching, only khatas with hits stay on screen.
  const listedKhatas = query ? spendKhatas.filter((k) => entriesFor(k.name).length > 0) : spendKhatas

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const [khataData, transactionData] = await Promise.all([
        transactionApi.getKhatas(),
        transactionApi.getTransactions(),
      ])
      setKhatas(khataData)
      setTransactions(transactionData)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
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
      await load()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setDeletingId(null)
    }
  }

  /** Adds an entry straight into this khata, keeping the dropdown open. */
  async function handleAdd(categoryName, text) {
    setAddingTo(categoryName)
    setError('')
    setNotice('')
    try {
      const saved = await transactionApi.addEntry(`${text} #${categoryName}`)
      setNotice(`Added ₹${Number(saved.amount).toLocaleString()} to #${categoryName}`)
      await load()
      return true
    } catch (err) {
      setError(errorMessage(err))
      return false
    } finally {
      setAddingTo(null)
    }
  }

  return (
    <div className="coin-page">
      <TopBar />

      <div className="coin-history-page" style={{ marginTop: '20px' }}>
        <h1 className="coin-page__title">history</h1>
        <p className="coin-page__subtitle" style={{ marginBottom: '32px' }}>
          every khata, every entry — ₹ {totalAll.toLocaleString()} logged
          {isGuest ? ' as a guest' : ''}.
        </p>

        {!loading && (
          <div className="coin-grid coin-history-summary">
            <div className="coin-tile coin-tile--ink">
              <div className="coin-tile__label">total logged</div>
              <div className="coin-tile__value">₹ {totalAll.toLocaleString()}</div>
              <div className="coin-tile__note">across every khata</div>
            </div>
            <div className="coin-tile coin-tile--mint">
              <div className="coin-tile__label">khatas</div>
              <div className="coin-tile__value">{spendKhatas.length}</div>
              <div className="coin-tile__note">
                {spendKhatas.length === 1 ? 'active category' : 'active categories'}
              </div>
            </div>
            <div className="coin-tile coin-tile--blue">
              <div className="coin-tile__label">entries</div>
              <div className="coin-tile__value">{transactions.length}</div>
              <div className="coin-tile__note">logged expenses</div>
            </div>
          </div>
        )}

        <div className="coin-history-controls">
          <div className="coin-history-bar">
            <input
              className="coin-search-bar"
              placeholder="Search notes, categories or amounts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ marginBottom: 0 }}
              aria-label="Search entries"
            />
            {searchQuery && (
              <button type="button" className="coin-history-bar__clear" onClick={() => setSearchQuery('')}>
                clear
              </button>
            )}
          </div>

          <div className="coin-history-sort" role="group" aria-label="Sort entries">
            <span className="coin-history-sort__label" aria-hidden="true">
              sort
            </span>
            <div className="coin-history-sort__pills">
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`coin-history-sort__btn ${sortBy === option.value ? 'is-active' : ''}`}
                  onClick={() => setSortBy(option.value)}
                  aria-pressed={sortBy === option.value}
                  aria-label={option.aria}
                >
                  {option.label}
                </button>
              ))}
            </div>
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

        <div style={{ display: 'grid', gap: '12px', marginTop: '24px' }}>
          {loading && (
            <div className="coin-history-empty coin-history-empty--loading" role="status">
              <span className="coin-history-empty__glyph" aria-hidden="true">
                ◔
              </span>
              <p className="coin-history-empty__title">Loading your khatas…</p>
              <p className="coin-history-empty__text">Gathering every entry, one moment.</p>
            </div>
          )}

          {!loading && spendKhatas.length === 0 && (
            <div className="coin-history-empty">
              <span className="coin-history-empty__glyph" aria-hidden="true">
                ✎
              </span>
              <p className="coin-history-empty__title">No khatas yet</p>
              <p className="coin-history-empty__text">
                Log something like “100 chai #food” and it will show up here.
              </p>
            </div>
          )}

          {!loading && spendKhatas.length > 0 && listedKhatas.length === 0 && (
            <div className="coin-history-empty">
              <span className="coin-history-empty__glyph" aria-hidden="true">
                ⌕
              </span>
              <p className="coin-history-empty__title">No entries match “{searchQuery}”</p>
              <p className="coin-history-empty__text">
                Try a different note, category or amount.
              </p>
              <button
                type="button"
                className="coin-history-empty__action"
                onClick={() => setSearchQuery('')}
              >
                clear
              </button>
            </div>
          )}

          {listedKhatas.map((khata) => {
            const entries = entriesFor(khata.name)
            return (
              <KhataAccordion
                key={khata.name}
                khata={khata}
                entries={entries}
                isOpen={expandedKhata === khata.name || Boolean(query && entries.length > 0)}
                onToggle={toggleKhata}
                deletingId={deletingId}
                onDelete={handleDelete}
                onAdd={handleAdd}
                adding={addingTo === khata.name}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
