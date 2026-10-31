import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Brand from '../components/Brand'
import KhataAccordion from '../components/KhataAccordion'
import { useAuth } from '../context/AuthContext'
import * as transactionApi from '../api/transactions'
import { errorMessage } from '../api/client'

export default function HistoryPage() {
  const navigate = useNavigate()
  const { isGuest, signOut } = useAuth()
  const [khatas, setKhatas] = useState([])
  const [transactions, setTransactions] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedKhata, setExpandedKhata] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [addingTo, setAddingTo] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

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

  const entriesFor = (name) => (entriesByKhata[name] ?? []).filter(matchesQuery)
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
      <header className="coin-topbar" style={{ padding: '14px 0', border: 'none', justifyContent: 'space-between' }}>
        <Brand showTag={false} />
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            ← back
          </Button>
          <Button variant="ghost" size="sm" onClick={signOut}>
            Sign out
          </Button>
        </div>
      </header>

      <div style={{ marginTop: '20px' }}>
        <h1 className="coin-page__title">history</h1>
        <p className="coin-page__subtitle" style={{ marginBottom: '32px' }}>
          every khata, every entry — ₹ {totalAll.toLocaleString()} logged
          {isGuest ? ' as a guest' : ''}.
        </p>

        <div className="coin-history-bar">
          <input
            className="coin-search-bar"
            placeholder="Search notes, categories or amounts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ marginBottom: 0 }}
          />
          {searchQuery && (
            <button type="button" className="coin-history-bar__clear" onClick={() => setSearchQuery('')}>
              clear
            </button>
          )}
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
          {loading && <div className="coin-muted">Loading khatas...</div>}

          {!loading && spendKhatas.length === 0 && (
            <div className="coin-muted">
              No khatas yet. Go back and log something like “100 chai #food”.
            </div>
          )}

          {!loading && spendKhatas.length > 0 && listedKhatas.length === 0 && (
            <div className="coin-muted">No entries match “{searchQuery}”.</div>
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
