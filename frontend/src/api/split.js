import { api } from './client'

export const getGroups = () => api.get('/split/groups').then((res) => res.data)
export const createGroup = (payload) => api.post('/split/groups', payload).then((res) => res.data)
export const getGroup = (groupId) => api.get(`/split/groups/${groupId}`).then((res) => res.data)
export const updateGroup = (groupId, payload) => api.put(`/split/groups/${groupId}`, payload).then((res) => res.data)
export const deleteGroup = (groupId) => api.delete(`/split/groups/${groupId}`).then((res) => res.data)
export const addParticipant = (groupId, payload) => api.post(`/split/groups/${groupId}/participants`, payload).then((res) => res.data)
export const renameParticipant = (groupId, participantId, payload) => api.put(`/split/groups/${groupId}/participants/${participantId}`, payload).then((res) => res.data)
export const removeParticipant = (groupId, participantId) => api.delete(`/split/groups/${groupId}/participants/${participantId}`).then((res) => res.data)
export const addExpense = (groupId, payload) => api.post(`/split/groups/${groupId}/expenses`, payload).then((res) => res.data)
export const updateExpense = (groupId, expenseId, payload) => api.put(`/split/groups/${groupId}/expenses/${expenseId}`, payload).then((res) => res.data)
export const deleteExpense = (groupId, expenseId) => api.delete(`/split/groups/${groupId}/expenses/${expenseId}`).then((res) => res.data)
