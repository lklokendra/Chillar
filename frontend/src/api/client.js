import axios from 'axios'

/**
 * Where the bearer token lives.
 *
 * A plain visit keeps it in `sessionStorage`, which the browser drops when the
 * tab closes. Ticking "Remember me" moves it to `localStorage` so the session
 * survives a restart — that tick is the only thing that ever makes a token
 * persist, and nothing else (no password, no profile) is written alongside it.
 */
const PERSISTENT_KEY = 'paise.token'
const SESSION_KEY = 'paise.token.session'

export const tokenStore = {
  get: () => localStorage.getItem(PERSISTENT_KEY) ?? sessionStorage.getItem(SESSION_KEY),

  set: (token, { persist = false } = {}) => {
    tokenStore.clear()
    if (persist) localStorage.setItem(PERSISTENT_KEY, token)
    else sessionStorage.setItem(SESSION_KEY, token)
  },

  clear: () => {
    localStorage.removeItem(PERSISTENT_KEY)
    sessionStorage.removeItem(SESSION_KEY)
  },
}

export const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = tokenStore.get()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// A rejected token means the session is gone: drop it and let AuthContext react.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && tokenStore.get()) {
      tokenStore.clear()
      window.dispatchEvent(new Event('coin:unauthorized'))
    }
    return Promise.reject(error)
  },
)

export function errorMessage(error, fallback = 'Something went wrong. Please try again.') {
  return error?.response?.data?.message || error?.message || fallback
}

/** Per-field messages from a 400 response, keyed by the DTO property name. */
export function fieldErrors(error) {
  return error?.response?.data?.fieldErrors ?? {}
}
