import { api } from './client'

export const login = (credentials) => api.post('/auth/login', credentials).then((res) => res.data)

export const guestLogin = () => api.post('/auth/guest').then((res) => res.data)

export const register = (details) => api.post('/auth/register', details).then((res) => res.data)

export const currentUser = () => api.get('/auth/me').then((res) => res.data)

export const forgotPassword = (email) =>
  api.post('/auth/forgot-password', { email }).then((res) => res.data)

export const resetPassword = (details) =>
  api.post('/auth/reset-password', details).then((res) => res.data)
