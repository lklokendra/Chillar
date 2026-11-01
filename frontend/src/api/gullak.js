import { api } from './client'

export const getSummary = () => api.get('/gullak').then((res) => res.data)

export const getTransactions = (params) => api.get('/gullak/transactions', { params }).then((res) => res.data)

export const addTransaction = (payload) => api.post('/gullak/transactions', payload).then((res) => res.data)

export const updateTransaction = (id, payload) => api.put(`/gullak/transactions/${id}`, payload).then((res) => res.data)

export const deleteTransaction = (id) => api.delete(`/gullak/transactions/${id}`).then((res) => res.data)
