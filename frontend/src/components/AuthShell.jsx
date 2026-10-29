export default function AuthShell({ title, subtitle, children }) {
  return (
    <div className="coin-auth">
      <div className="coin-brand">
        <span className="coin-brand__mark">C</span>
        <div>
          <div className="coin-brand__name">chillar</div>
          <div className="coin-brand__tag">Track every coin</div>
        </div>
      </div>

      <div className="coin-auth__card">
        <h1 className="coin-auth__title">{title}</h1>
        {subtitle && <p className="coin-auth__subtitle">{subtitle}</p>}
        {children}
      </div>
    </div>
  )
}
