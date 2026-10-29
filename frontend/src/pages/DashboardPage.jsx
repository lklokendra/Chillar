import { useEffect, useState } from 'react'
import Button from '../components/Button'
import { useAuth } from '../context/AuthContext'
import * as transactionApi from '../api/transactions'
import { errorMessage } from '../api/client'

export default function DashboardPage() {
  const { user, isGuest, signOut } = useAuth()
  const [selectedKhata, setSelectedKhata] = useState('all')
  const [khatas, setKhatas] = useState([])
  const [transactions, setTransactions] = useState([])
  const [entryInput, setEntryInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const firstName = isGuest ? 'Guest' : (user?.name?.split(' ')[0] ?? 'there')

  useEffect(() => {
    loadKhatas()
  }, [])

  useEffect(() => {
    loadTransactions(selectedKhata)
  }, [selectedKhata])

  async function loadKhatas() {
    try {
      const data = await transactionApi.getKhatas()
      setKhatas(data)
    } catch (err) {
      console.error(err)
    }
  }

  async function loadTransactions(category) {
    setLoading(true)
    try {
      const data = await transactionApi.getTransactions(category)
      setTransactions(data)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleEntrySubmit(e) {
    if (e.key === 'Enter' && entryInput.trim()) {
      try {
        await transactionApi.addEntry(entryInput)
        setEntryInput('')
        loadKhatas()
        loadTransactions(selectedKhata)
      } catch (err) {
        setError(errorMessage(err))
      }
    }
  }

  return (
    <div className="coin-page">
      <header className="coin-topbar" style={{ padding: '14px 0', border: 'none', justifyContent: 'flex-end' }}>
        <Button variant="ghost" size="sm" onClick={signOut}>
          Sign out
        </Button>
      </header>

      <div style={{ marginTop: '20px' }}>
        <h1 className="coin-page__title">hi {firstName}</h1>
        <p className="coin-page__subtitle" style={{ marginBottom: '32px' }}>
          {isGuest ? 'You are exploring Chillar as a guest.' : 'Welcome back to your khata.'}
        </p>

        {/* Prominent One-line Entry Input */}
        <div style={{ marginBottom: '48px', textAlign: 'left' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '32px', fontWeight: '900' }}>₹</span>
            <input
              className="coin-entry-input"
              placeholder="100 chai #office"
              value={entryInput}
              onChange={(e) => setEntryInput(e.target.value)}
              onKeyDown={handleEntrySubmit}
            />
          </div>
          <p style={{ marginTop: '8px', opacity: 0.4, fontSize: '12px', fontFamily: 'var(--coin-font-mono)' }}>
            Press enter to log directly
          </p>
        </div>

        {/* Total Spend Summary Tiles */}
        <div className="coin-grid" style={{ marginBottom: '48px' }}>
          <div className="coin-tile" style={{ borderTop: '4px solid #000' }}>
            <div className="coin-tile__label">Total Spends</div>
            <div className="coin-tile__value">₹ {khatas.find(k => k.name === 'all')?.total?.toLocaleString() || '0'}</div>
            <div className="coin-tile__note">Combined across all khatas</div>
          </div>
          <div className="coin-tile" style={{ borderTop: '4px solid var(--coin-mint)' }}>
            <div className="coin-tile__label">Top Category</div>
            <div className="coin-tile__value" style={{ fontSize: '18px', textTransform: 'capitalize' }}>
              {khatas.filter(k => k.name !== 'all').sort((a, b) => b.total - a.total)[0]?.name || 'None'}
            </div>
            <div className="coin-tile__note">Highest spending this month</div>
          </div>
        </div>

        <div className="coin-pill coin-pill--mint">#all</div>
        <h1 style={{ fontSize: '48px', marginTop: '12px', marginBottom: '40px' }}>khatas</h1>
        
        <div style={{ display: 'grid', gap: '32px' }}>
          {khatas.filter(k => k.name !== 'all').map(khata => (
            <div 
              key={khata.name} 
              className="coin-khata-item"
              onClick={() => {
                setSelectedKhata(khata.name)
              }}
              style={{ borderLeft: selectedKhata === khata.name ? '3px solid #000' : 'none', paddingLeft: selectedKhata === khata.name ? '12px' : '0' }}
            >
              <div className={`coin-pill coin-pill--${khata.color}`}>#{khata.name}</div>
              <div style={{ fontSize: '20px', fontWeight: '600', fontFamily: 'var(--coin-font-mono)' }}>
                ₹ {khata.total.toLocaleString()}
              </div>
            </div>
          ))}
          
          <div style={{ opacity: 0.2, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <span style={{ fontSize: '20px' }}>#</span>
            <span style={{ fontFamily: 'var(--coin-font-mono)' }}>new space...</span>
          </div>
        </div>

        {/* Transaction History for selected Khata */}
        <div style={{ marginTop: '64px' }}>
          <div className="coin-pill coin-pill--ghost" style={{ background: '#f5f5f5', border: 'none', marginBottom: '24px' }}>
            #{selectedKhata} history
          </div>
          
          <input 
            className="coin-search-bar" 
            placeholder="Search entries..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <div style={{ marginTop: '20px' }}>
            {transactions.length > 0 ? (
              <div style={{ display: 'grid', gap: '20px' }}>
                {transactions
                  .filter(t => !searchQuery || (t.note && t.note.toLowerCase().includes(searchQuery.toLowerCase())))
                  .map(t => (
                  <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--coin-font-mono)' }}>
                    <span>{t.note || 'cash'}</span>
                    <span>₹ {t.amount}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ opacity: 0.3, fontFamily: 'var(--coin-font-mono)' }}>
                No entries found in this khata.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

