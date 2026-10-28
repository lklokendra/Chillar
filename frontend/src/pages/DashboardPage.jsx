import Button from '../components/Button'
import { useAuth } from '../context/AuthContext'

const PLACEHOLDERS = [
  { label: 'Coins tracked', note: 'Arrives with the transactions module' },
  { label: 'Categories', note: 'Create your own in the next step' },
  { label: "Today's spend", note: 'Daily totals will show here' },
]

export default function DashboardPage() {
  const { user, signOut } = useAuth()
  const firstName = user?.name?.split(' ')[0] ?? 'there'

  return (
    <>
      <header className="coin-topbar">
        <div className="coin-brand">
          <span className="coin-brand__mark">C</span>
          <span className="coin-brand__name">Chillar</span>
        </div>

        <div className="coin-row">
          <div className="coin-account">
            <div className="coin-account__name">{user?.name}</div>
            <div className="coin-account__email">{user?.email}</div>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>
            Sign out
          </Button>
        </div>
      </header>

      <main className="coin-page">
        <h1 className="coin-page__title">Hi {firstName}</h1>
        <p className="coin-page__subtitle">
          You are signed in with a JWT session. Categories and daily spends land here next.
        </p>

        <div className="coin-grid">
          {PLACEHOLDERS.map((tile) => (
            <div className="coin-tile" key={tile.label}>
              <div className="coin-tile__label">{tile.label}</div>
              <div className="coin-tile__value">--</div>
              <div className="coin-tile__note">{tile.note}</div>
            </div>
          ))}
        </div>

        <section className="coin-section">
          <h2 className="coin-section__title">Categories</h2>
          <div className="coin-empty">No categories yet.</div>
        </section>

        <section className="coin-section">
          <h2 className="coin-section__title">Today's entries</h2>
          <div className="coin-empty">Nothing logged for today.</div>
        </section>
      </main>
    </>
  )
}
