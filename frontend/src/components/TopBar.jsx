import { NavLink } from 'react-router-dom'
import Brand from './Brand'
import Button from './Button'
import ThemeToggle from './ThemeToggle'
import { useAuth } from '../context/AuthContext'

const SECTIONS = [
  { to: '/', label: 'Kharch', end: true },
  { to: '/history', label: 'History' },
  { to: '/gullak', label: 'Gullak' },
  { to: '/split', label: 'Split' },
]

/** Shared header: brand, section navigation and sign out. */
export default function TopBar() {
  const { signOut } = useAuth()

  return (
    <header className="coin-appbar">
      <Brand showTag={false} />

      <nav className="coin-nav" aria-label="Sections">
        {SECTIONS.map((section) => (
          <NavLink
            key={section.to}
            to={section.to}
            end={section.end}
            className={({ isActive }) => `coin-nav__link ${isActive ? 'is-active' : ''}`}
          >
            {section.label}
          </NavLink>
        ))}
      </nav>

      <div className="coin-appbar__side">
        <ThemeToggle />
        <Button variant="ghost" size="sm" onClick={signOut} className="coin-appbar__signout">
          Sign out
        </Button>
      </div>
    </header>
  )
}
