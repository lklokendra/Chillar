import { useTheme } from '../context/ThemeContext'

/**
 * Three-way theme switch: light, dark, or follow the operating system.
 *
 * It only ever changes a preference — the palette itself lives in theme.css, so
 * there is no second copy of any component for dark mode.
 */

const OPTIONS = [
  { key: 'light', label: 'light' },
  { key: 'dark', label: 'dark' },
  { key: 'system', label: 'system' },
]

const GLYPHS = {
  light: (
    <>
      <circle cx="12" cy="12" r="4.1" />
      <path d="M12 2.8v2.1M12 19.1v2.1M2.8 12h2.1M19.1 12h2.1M5.6 5.6l1.5 1.5M16.9 16.9l1.5 1.5M18.4 5.6l-1.5 1.5M7.1 16.9l-1.5 1.5" />
    </>
  ),
  dark: <path d="M20.3 14.3A8.3 8.3 0 0 1 9.7 3.7a8.5 8.5 0 1 0 10.6 10.6Z" />,
  system: (
    <>
      <rect x="3.2" y="4.6" width="17.6" height="11.8" rx="2" />
      <path d="M8.7 20h6.6M12 16.4V20" />
    </>
  ),
}

export default function ThemeToggle() {
  const { mode, setTheme } = useTheme()

  return (
    <div className="coin-theme" role="group" aria-label="Colour theme">
      {OPTIONS.map((option) => (
        <button
          key={option.key}
          type="button"
          className={`coin-theme__btn ${mode === option.key ? 'is-active' : ''}`}
          aria-pressed={mode === option.key}
          title={`${option.label} theme`}
          onClick={() => setTheme(option.key)}
        >
          <svg className="coin-theme__icon" viewBox="0 0 24 24" aria-hidden="true">
            {GLYPHS[option.key]}
          </svg>
          <span className="coin-theme__label">{option.label}</span>
        </button>
      ))}
    </div>
  )
}
