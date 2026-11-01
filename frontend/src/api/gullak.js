import { api } from './client'

/* ------------------------------------------------------------------ summary */

export const getSummary = () => api.get('/gullak/summary').then((res) => res.data)

/* ------------------------------------------------------------- transactions */

/** `params` may carry `type` (DEPOSIT/WITHDRAWAL), `goal` (all|general|<id>), `sort` and `direction`. */
export const getTransactions = (params) => api.get('/gullak/transactions', { params }).then((res) => res.data)

export const getRecentTransactions = () => api.get('/gullak/transactions/recent').then((res) => res.data)

export const addTransaction = (payload) => api.post('/gullak/transactions', payload).then((res) => res.data)

/**
 * Withdraws one amount across several categories. `payload` is
 * `{ totalAmount, note, transactionDate, allocations: [{ goalId, amount }] }`
 * where a null `goalId` means general savings.
 */
export const allocateWithdrawal = (payload) =>
  api.post('/gullak/withdrawals/allocate', payload).then((res) => res.data)

export const updateTransaction = (id, payload) => api.put(`/gullak/transactions/${id}`, payload).then((res) => res.data)

export const deleteTransaction = (id) => api.delete(`/gullak/transactions/${id}`).then((res) => res.data)

/* -------------------------------------------------------------------- goals */

export const getGoals = () => api.get('/gullak/goals').then((res) => res.data)

export const getGoal = (goalId) => api.get(`/gullak/goals/${goalId}`).then((res) => res.data)

export const getGoalSummary = (goalId) => api.get(`/gullak/goals/${goalId}/summary`).then((res) => res.data)

export const createGoal = (payload) => api.post('/gullak/goals', payload).then((res) => res.data)

export const updateGoal = (goalId, payload) => api.put(`/gullak/goals/${goalId}`, payload).then((res) => res.data)

export const deleteGoal = (goalId) => api.delete(`/gullak/goals/${goalId}`).then((res) => res.data)

export const getGoalTransactions = (goalId) =>
  api.get(`/gullak/goals/${goalId}/transactions`).then((res) => res.data)
