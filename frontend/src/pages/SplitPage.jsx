import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import TopBar from '../components/TopBar'
import Button from '../components/Button'
import * as splitApi from '../api/split'
import { errorMessage } from '../api/client'
import '../styles/split.css'

const EMPTY_FORM = { name: '', description: '' }

function money(value) {
  return `₹${Number(value ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`
}

/** Deterministic pastel tone (0-3) so each group keeps a stable colour wash. */
function toneFor(id) {
  const numeric = Number(id)
  return Number.isFinite(numeric) ? Math.abs(numeric) % 4 : 0
}

/** First letter of a name, for the monogram tile. */
function initialOf(name) {
  const trimmed = String(name ?? '').trim()
  return trimmed ? trimmed.charAt(0).toUpperCase() : '?'
}

/** Group list at /split: create, rename and delete sharing groups. */
export default function SplitPage() {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [form, setForm] = useState(EMPTY_FORM)
  const [creating, setCreating] = useState(false)

  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState(EMPTY_FORM)
  const [savingEdit, setSavingEdit] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setGroups(await splitApi.getGroups())
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleCreate(event) {
    event.preventDefault()
    const name = form.name.trim()
    if (!name || creating) return

    setCreating(true)
    setError('')
    setNotice('')
    try {
      const created = await splitApi.createGroup({ name, description: form.description.trim() })
      setForm(EMPTY_FORM)
      setNotice(`Created "${created.name}"`)
      await load()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setCreating(false)
    }
  }

  function startEdit(group) {
    setEditingId(group.id)
    setEditForm({ name: group.name, description: group.description ?? '' })
  }

  async function handleSaveEdit(event) {
    event.preventDefault()
    const name = editForm.name.trim()
    if (!name || savingEdit) return

    setSavingEdit(true)
    setError('')
    setNotice('')
    try {
      await splitApi.updateGroup(editingId, { name, description: editForm.description.trim() })
      setEditingId(null)
      setNotice('Group updated')
      await load()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSavingEdit(false)
    }
  }

  async function handleDelete(group) {
    if (!window.confirm(`Delete "${group.name}" and all its expenses? This cannot be undone.`)) {
      return
    }

    setDeletingId(group.id)
    setError('')
    setNotice('')
    try {
      await splitApi.deleteGroup(group.id)
      setNotice(`Deleted "${group.name}"`)
      await load()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="coin-page">
      <TopBar />

      <h1 className="coin-page__title">Split</h1>
      <p className="coin-page__subtitle" style={{ marginBottom: '24px' }}>
        Share trip and outing expenses with friends — Paise works out who owes whom.
      </p>

      {/* Create a group */}
      <form className="coin-split-card coin-split-form coin-split-create" onSubmit={handleCreate}>
        <div className="coin-split-create__head">
          <span className="coin-split-create__title">new group</span>
          <span className="coin-split-create__hint">name it after the trip or outing</span>
        </div>
        <div className="coin-split-form__row">
          <input
            className="coin-split-input"
            placeholder="group name, e.g. Goa trip"
            value={form.name}
            maxLength={120}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            disabled={creating}
            required
          />
          <input
            className="coin-split-input"
            placeholder="description (optional)"
            value={form.description}
            maxLength={255}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            disabled={creating}
          />
          <Button type="submit" variant="primary" size="sm" disabled={creating}>
            {creating ? 'creating…' : 'create group'}
          </Button>
        </div>
      </form>

      {notice && (
        <div className="coin-alert coin-alert--ok" role="status" style={{ marginTop: '14px' }}>
          {notice}
        </div>
      )}
      {error && (
        <div className="coin-alert" role="alert" style={{ marginTop: '14px' }}>
          {error}
        </div>
      )}

      {loading ? (
        <p className="coin-muted" style={{ marginTop: '20px' }}>
          loading groups…
        </p>
      ) : groups.length === 0 ? (
        <div className="coin-empty" style={{ marginTop: '20px' }}>
          No groups yet. Create one for your next trip.
        </div>
      ) : (
        <div className="coin-split-groups">
          {groups.map((group) => (
            <div className={`coin-split-group coin-split-group--tone-${toneFor(group.id)}`} key={group.id}>
              {editingId === group.id ? (
                <form className="coin-split-form" style={{ flex: 1 }} onSubmit={handleSaveEdit}>
                  <div className="coin-split-form__row">
                    <input
                      className="coin-split-input"
                      value={editForm.name}
                      maxLength={120}
                      onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                      disabled={savingEdit}
                      required
                    />
                    <input
                      className="coin-split-input"
                      placeholder="description (optional)"
                      value={editForm.description}
                      maxLength={255}
                      onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                      disabled={savingEdit}
                    />
                    <Button type="submit" variant="primary" size="sm" disabled={savingEdit}>
                      {savingEdit ? 'saving…' : 'save'}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingId(null)}
                      disabled={savingEdit}
                    >
                      cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="coin-split-group__main">
                    <span className="coin-split-group__monogram" aria-hidden="true">
                      {initialOf(group.name)}
                    </span>
                    <div className="coin-split-group__body">
                      <span className="coin-split-group__name">{group.name}</span>
                      {group.description && (
                        <span className="coin-split-group__desc">{group.description}</span>
                      )}
                      <div className="coin-split-group__stats">
                        <span className="coin-split-stat">
                          {group.participantCount} {group.participantCount === 1 ? 'person' : 'people'}
                        </span>
                        <span className="coin-split-stat">
                          {group.expenseCount} {group.expenseCount === 1 ? 'expense' : 'expenses'}
                        </span>
                        <span className="coin-split-stat coin-split-stat--total">
                          {money(group.totalExpense)} total
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="coin-split-group__actions">
                    <Link className="coin-split-open" to={`/split/${group.id}`}>
                      open
                    </Link>
                    <Button type="button" variant="ghost" size="sm" onClick={() => startEdit(group)}>
                      edit
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(group)}
                      disabled={deletingId === group.id}
                    >
                      {deletingId === group.id ? 'deleting…' : 'delete'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
