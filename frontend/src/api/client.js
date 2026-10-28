import axios from 'axios'

const TOKEN_KEY = 'coin.token'

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
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
