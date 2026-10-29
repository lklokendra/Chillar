import { api } from './client'

export const getKhatas = () => api.get('/transactions/khatas').then((res) => res.data)

export const getTransactions = (category) => 
  api.get('/transactions', { params: { category } }).then((res) => res.data)

export const addEntry = (input) => 
  api.post('/transactions/add', { input }).then((res) => res.data)
