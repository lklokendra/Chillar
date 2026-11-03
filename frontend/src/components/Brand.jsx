import { useTheme } from '../context/ThemeContext'

/**
 * The official Paise "P coin" logo, shipped as two variants of the same mark:
 * the black square, and a light square that keeps its contrast on a dark canvas.
 * The active theme picks the file, so the logo follows light/dark/system.
 */
const LOGO_BY_THEME = {
  light: '/paise-logo-light.png',
  dark: '/paise-logo-dark.png',
}

export default function Brand({ size = 'md', showTag = true }) {
  const { theme } = useTheme()
  const isLarge = size === 'lg'

  return (
    <div className="coin-brand">
      <img
        className={`coin-brand__mark${isLarge ? ' coin-brand__mark--lg' : ''}`}
        src={theme === 'dark' ? LOGO_BY_THEME.dark : LOGO_BY_THEME.light}
        alt="Paise"
        width={isLarge ? 40 : 32}
        height={isLarge ? 40 : 32}
        draggable={false}
      />
      <div>
        <div className={`coin-brand__name${isLarge ? ' coin-brand__name--lg' : ''}`}>Paise</div>
        {showTag && <div className="coin-brand__tag">Track every coin</div>}
      </div>
    </div>
  )
}
