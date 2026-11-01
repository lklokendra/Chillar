import Brand from './Brand'
import ThemeToggle from './ThemeToggle'

export default function AuthShell({ title, subtitle, children }) {
  return (
    <div className="coin-auth">
      <div className="coin-auth__theme">
        <ThemeToggle />
      </div>

      <Brand size="lg" />

      <div className="coin-auth__card">
        <h1 className="coin-auth__title">{title}</h1>
        {subtitle && <p className="coin-auth__subtitle">{subtitle}</p>}
        {children}
      </div>
    </div>
  )
}
