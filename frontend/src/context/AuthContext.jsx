import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import * as authApi from '../api/auth'
import { tokenStore } from '../api/client'

const AuthContext = createContext(null)

/** Flags a browser that chose guest mode, so the choice survives a refresh. */
const GUEST_KEY = 'paise.guest'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isGuest, setIsGuest] = useState(false)
  const [restoring, setRestoring] = useState(true)

  // On first paint, try to rebuild the session from a stored token.
  useEffect(() => {
    const guestFlag = localStorage.getItem(GUEST_KEY) === 'true'
    if (guestFlag) setIsGuest(true)
    
    let cancelled = false

    async function restore() {
      if (!tokenStore.get()) {
        setRestoring(false)
        return
      }
      try {
        const profile = await authApi.currentUser()
        if (!cancelled) setUser(profile)
      } catch {
        tokenStore.clear()
      } finally {
        if (!cancelled) setRestoring(false)
      }
    }

    restore()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const handleUnauthorized = () => setUser(null)
    window.addEventListener('coin:unauthorized', handleUnauthorized)
    return () => window.removeEventListener('coin:unauthorized', handleUnauthorized)
  }, [])

  const signIn = useCallback(async (credentials, { rememberMe = false } = {}) => {
    const data = await authApi.login({ ...credentials, rememberMe })
    tokenStore.set(data.token, { persist: rememberMe })
    setUser(data.user)
    setIsGuest(false)
    localStorage.removeItem(GUEST_KEY)
    return data.user
  }, [])

  const signUp = useCallback(async (details) => {
    const data = await authApi.register(details)
    tokenStore.set(data.token)
    setUser(data.user)
    setIsGuest(false)
    localStorage.removeItem(GUEST_KEY)
    return data.user
  }, [])

  const continueAsGuest = useCallback(async () => {
    // Guests still get a real (throwaway) account so their kharch lives in the DB.
    const data = await authApi.guestLogin()
    tokenStore.set(data.token)
    setUser(data.user)
    setIsGuest(true)
    localStorage.setItem(GUEST_KEY, 'true')
    return data.user
  }, [])

  const signOut = useCallback(() => {
    tokenStore.clear()
    setUser(null)
    setIsGuest(false)
    localStorage.removeItem(GUEST_KEY)
  }, [])

  const value = useMemo(
    () => ({ user, isGuest, restoring, signIn, signUp, continueAsGuest, signOut }),
    [user, isGuest, restoring, signIn, signUp, continueAsGuest, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside <AuthProvider>')
  }
  return context
}
