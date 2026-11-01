import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

/** Where the choice lives, so it survives a refresh. */
const STORAGE_KEY = 'chillar.theme'

/** The three options offered in the nav, in the order the toggle lists them. */
export const THEME_MODES = ['light', 'dark', 'system']

const ThemeContext = createContext(null)

const prefersDark = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches === true

/** The saved preference, or "system" for a first-time visitor. */
function readStoredMode() {
  if (typeof window === 'undefined') return 'system'
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return THEME_MODES.includes(stored) ? stored : 'system'
}

/** Turns a preference into the theme actually shown right now. */
export function resolveTheme(mode) {
  if (mode === 'light' || mode === 'dark') return mode
  return prefersDark() ? 'dark' : 'light'
}

/**
 * Publishes the resolved theme on <html> so every stylesheet's custom properties
 * (see theme.css) follow. Also sets color-scheme so native controls — scrollbars,
 * date pickers — match the page instead of staying stubbornly white.
 */
function applyTheme(theme) {
  const root = document.documentElement
  root.dataset.theme = theme
  root.style.colorScheme = theme
}

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(readStoredMode)
  const [systemTheme, setSystemTheme] = useState(() => (prefersDark() ? 'dark' : 'light'))

  const theme = mode === 'system' ? systemTheme : mode

  // While "system" is chosen, keep following the OS as it changes.
  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (event) => setSystemTheme(event.matches ? 'dark' : 'light')
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const setTheme = useCallback((next) => {
    const value = THEME_MODES.includes(next) ? next : 'system'
    setMode(value)
    try {
      window.localStorage.setItem(STORAGE_KEY, value)
    } catch {
      // Storage blocked — the choice still applies to this tab.
    }
  }, [])

  const value = useMemo(() => ({ mode, theme, setTheme }), [mode, theme, setTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used inside <ThemeProvider>')
  }
  return context
}
