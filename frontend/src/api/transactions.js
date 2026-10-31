import { api } from './client'

export const getKhatas = () => api.get('/transactions/khatas').then((res) => res.data)

export const getTransactions = (category) => 
  api.get('/transactions', { params: { category } }).then((res) => res.data)

export const addEntry = (input, date) => 
  api.post('/transactions/add', { input, date }).then((res) => res.data)

export const deleteTransaction = (id) => api.delete(`/transactions/${id}`).then((res) => res.data)
