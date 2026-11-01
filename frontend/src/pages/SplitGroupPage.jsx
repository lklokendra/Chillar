import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import TopBar from '../components/TopBar'
import Button from '../components/Button'
import * as splitApi from '../api/split'
import { errorMessage } from '../api/client'
import { formatDate, todayIso } from '../utils/entry'
import '../styles/split.css'

const blankExpense = () => ({ title: '', amount: '', participantId: '', date: todayIso() })

/** A settlement record starts with no payer/receiver chosen. */
const blankSettlement = () => ({ payerId: '', receiverId: '', amount: '', date: todayIso(), note: '' })

/** An empty amount means "pay the whole remaining balance" (mark as paid). */
const blankPayment = () => ({ amount: '', paidAt: todayIso(), note: '' })

/** Green when completed, amber when part-paid, rose when nothing has moved yet. */
const STATUS_LABEL = { PENDING: 'pending', PARTIALLY_PAID: 'part paid', PAID: 'paid' }

function money(value) {
  return `₹${Number(value ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`
}

/** Deterministic pastel tone (0-3) so a person keeps a stable colour wash. */
function toneFor(id) {
  const numeric = Number(id)
  return Number.isFinite(numeric) ? Math.abs(numeric) % 4 : 0
}

/** First letter of a name, for the avatar circle. */
function initialOf(name) {
  const trimmed = String(name ?? '').trim()
  return trimmed ? trimmed.charAt(0).toUpperCase() : '?'
}

/** Green when owed money, red when owing, grey when square. */
function balanceBadge(net) {
  const value = Number(net)
  if (value > 0) {
    return { className: 'coin-split-balance coin-split-balance--pos', text: `+${money(value)}` }
  }
  if (value < 0) {
    return { className: 'coin-split-balance coin-split-balance--neg', text: `−${money(Math.abs(value))}` }
  }
  return { className: 'coin-split-balance coin-split-balance--zero', text: 'settled' }
}

/** Group dashboard at /split/:groupId. All split maths comes from the server. */
export default function SplitGroupPage() {
  const { groupId } = useParams()

  const [group, setGroup] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [personName, setPersonName] = useState('')
  const [addingPerson, setAddingPerson] = useState(false)
  const [renamingId, setRenamingId] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [savingPerson, setSavingPerson] = useState(false)
  const [removingId, setRemovingId] = useState(null)

  const [expenseForm, setExpenseForm] = useState(blankExpense)
  const [addingExpense, setAddingExpense] = useState(false)
  const [editingExpenseId, setEditingExpenseId] = useState(null)
  const [expenseEdit, setExpenseEdit] = useState(blankExpense)
  const [savingExpense, setSavingExpense] = useState(false)
  const [deletingExpenseId, setDeletingExpenseId] = useState(null)

  // Settlement tracking: real records, their instalments and the audit trail.
  const [settlementForm, setSettlementForm] = useState(blankSettlement)
  const [addingSettlement, setAddingSettlement] = useState(false)
  const [payingId, setPayingId] = useState(null)
  const [paymentForm, setPaymentForm] = useState(blankPayment)
  const [recordingPayment, setRecordingPayment] = useState(false)
  const [markingId, setMarkingId] = useState(null)
  const [deletingSettlementId, setDeletingSettlementId] = useState(null)
  const [removingPaymentId, setRemovingPaymentId] = useState(null)
  const [reconciling, setReconciling] = useState(false)
  const [historyPerson, setHistoryPerson] = useState('all')
  const [historySort, setHistorySort] = useState('date_desc')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setGroup(await splitApi.getGroup(groupId))
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [groupId])

  useEffect(() => {
    load()
  }, [load])

  const participants = group?.participants ?? []
  const expenses = group?.expenses ?? []
  const summary = group?.summary ?? []
  const settlements = group?.settlements ?? []
  const settlementRecords = group?.settlementRecords ?? []
  const settlementDashboard = group?.settlementDashboard ?? null
  const settlementAudit = group?.settlementAudit ?? []

  // Settlement history: filter by participant and order by date, entirely on
  // the already-loaded records - no extra round trip.
  const historyRecords = settlementRecords
    .filter((record) => {
      if (historyPerson === 'all') return true
      const id = Number(historyPerson)
      return record.payerId === id || record.receiverId === id
    })
    .slice()
    .sort((a, b) => {
      const diff = String(a.date).localeCompare(String(b.date))
      return historySort === 'date_asc' ? diff : -diff
    })

  // Keep the "paid by" select valid whenever the participant list changes.
  useEffect(() => {
    if (!group) return
    const ids = group.participants.map((person) => String(person.id))
    setExpenseForm((form) =>
      ids.includes(form.participantId) ? form : { ...form, participantId: ids[0] ?? '' },
    )
  }, [group])

  async function handleAddPerson(event) {
    event.preventDefault()
    const name = personName.trim()
    if (!name || addingPerson) return

    setAddingPerson(true)
    setError('')
    setNotice('')
    try {
      await splitApi.addParticipant(groupId, { name })
      setPersonName('')
      setNotice(`Added ${name}`)
      await load()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setAddingPerson(false)
    }
  }

  function startRename(person) {
    setRenamingId(person.id)
    setRenameValue(person.name)
  }

  async function handleRename(event, person) {
    event.preventDefault()
    const name = renameValue.trim()
    if (!name || savingPerson) return

    setSavingPerson(true)
    setError('')
    setNotice('')
    try {
      await splitApi.renameParticipant(groupId, person.id, { name })
      setRenamingId(null)
      setNotice('Name updated')
      await load()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSavingPerson(false)
    }
  }

  async function handleRemovePerson(person) {
    if (!window.confirm(`Remove ${person.name} from this group?`)) return

    setRemovingId(person.id)
    setError('')
    setNotice('')
    try {
      await splitApi.removeParticipant(groupId, person.id)
      setNotice(`Removed ${person.name}`)
      await load()
    } catch (err) {
      // Surfaces e.g. "Remove this participant's expenses first".
      setError(errorMessage(err))
    } finally {
      setRemovingId(null)
    }
  }

  const toPayload = (form) => ({
    title: form.title.trim(),
    amount: Number(form.amount),
    participantId: Number(form.participantId),
    date: form.date || todayIso(),
  })

  async function handleAddExpense(event) {
    event.preventDefault()
    if (!expenseForm.title.trim() || !expenseForm.amount || !expenseForm.participantId || addingExpense) {
      return
    }

    setAddingExpense(true)
    setError('')
    setNotice('')
    try {
      await splitApi.addExpense(groupId, toPayload(expenseForm))
      setExpenseForm((form) => ({ ...blankExpense(), participantId: form.participantId }))
      setNotice('Expense added')
      await load()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setAddingExpense(false)
    }
  }

  function startEditExpense(expense) {
    setEditingExpenseId(expense.id)
    setExpenseEdit({
      title: expense.title,
      amount: String(expense.amount),
      participantId: String(expense.participantId),
      date: expense.date ?? todayIso(),
    })
  }

  async function handleSaveExpense(event, expense) {
    event.preventDefault()
    if (!expenseEdit.title.trim() || !expenseEdit.amount || !expenseEdit.participantId || savingExpense) {
      return
    }

    setSavingExpense(true)
    setError('')
    setNotice('')
    try {
      await splitApi.updateExpense(groupId, expense.id, toPayload(expenseEdit))
      setEditingExpenseId(null)
      setNotice('Expense updated')
      await load()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSavingExpense(false)
    }
  }

  async function handleDeleteExpense(expense) {
    if (!window.confirm(`Delete "${expense.title}"?`)) return

    setDeletingExpenseId(expense.id)
    setError('')
    setNotice('')
    try {
      await splitApi.deleteExpense(groupId, expense.id)
      setNotice('Expense deleted')
      await load()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setDeletingExpenseId(null)
    }
  }

  // -------------------------------------------------------- settlement tracker

  function startPayment(record) {
    setPayingId(record.id)
    setPaymentForm(blankPayment())
  }

  async function handleAddSettlement(event) {
    event.preventDefault()
    if (!settlementForm.payerId || !settlementForm.receiverId || !settlementForm.amount || addingSettlement) {
      return
    }

    setAddingSettlement(true)
    setError('')
    setNotice('')
    try {
      await splitApi.recordSettlement(groupId, {
        payerId: Number(settlementForm.payerId),
        receiverId: Number(settlementForm.receiverId),
        amount: Number(settlementForm.amount),
        date: settlementForm.date || todayIso(),
        note: settlementForm.note.trim() || null,
      })
      setSettlementForm(blankSettlement())
      setNotice('Settlement logged as pending')
      await load()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setAddingSettlement(false)
    }
  }

  /** No amount typed means "pay the whole remaining balance". */
  async function handleRecordPayment(event, record) {
    event.preventDefault()
    if (recordingPayment) return

    const typed = paymentForm.amount.trim()
    setRecordingPayment(true)
    setError('')
    setNotice('')
    try {
      await splitApi.recordPayment(groupId, record.id, {
        amount: typed ? Number(typed) : undefined,
        paidAt: paymentForm.paidAt || todayIso(),
        note: paymentForm.note.trim() || null,
      })
      setPayingId(null)
      setNotice(typed ? 'Payment recorded' : 'Marked as paid')
      await load()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setRecordingPayment(false)
    }
  }

  async function handleMarkPaid(record) {
    setMarkingId(record.id)
    setError('')
    setNotice('')
    try {
      await splitApi.recordPayment(groupId, record.id, { paidAt: todayIso() })
      setNotice('Marked as paid')
      await load()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setMarkingId(null)
    }
  }

  async function handleRemovePayment(record, payment) {
    if (!window.confirm(`Remove the ${money(payment.amount)} payment made by ${record.payerName}?`)) return

    setRemovingPaymentId(payment.id)
    setError('')
    setNotice('')
    try {
      await splitApi.removePayment(groupId, record.id, payment.id)
      setNotice('Payment removed')
      await load()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setRemovingPaymentId(null)
    }
  }

  async function handleDeleteSettlement(record) {
    const confirmed = window.confirm(
      `Delete the ${money(record.amount)} settlement from ${record.payerName} to ${record.receiverName}? ` +
        'The audit trail is kept.',
    )
    if (!confirmed) return

    setDeletingSettlementId(record.id)
    setError('')
    setNotice('')
    try {
      await splitApi.deleteSettlement(groupId, record.id)
      setNotice('Settlement record deleted')
      await load()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setDeletingSettlementId(null)
    }
  }

  async function handleReconcile() {
    setReconciling(true)
    setError('')
    setNotice('')
    try {
      await splitApi.markReconciled(groupId)
      setNotice('Marked as reconciled')
      await load()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setReconciling(false)
    }
  }

  /** Shared "who paid" control for the add and edit expense forms. */
  function participantOptions() {
    return participants.map((person) => (
      <option key={person.id} value={person.id}>
        {person.name}
      </option>
    ))
  }

  return (
    <div className="coin-page">
      <TopBar />

      <Link className="coin-split-back" to="/split">
        ← all groups
      </Link>

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

      {loading && !group ? (
        <p className="coin-muted" style={{ marginTop: '20px' }}>
          loading group…
        </p>
      ) : !group ? null : (
        <>
          <div className="coin-split-head">
            <div>
              <h1 className="coin-page__title">{group.name}</h1>
              {group.description && <p className="coin-page__subtitle">{group.description}</p>}
            </div>
          </div>

          {/* Balances moved after settlements were logged - never auto-rewritten. */}
          {group.needsReconciliation && (
            <div className="coin-split-reconcile" role="status" style={{ marginTop: '16px' }}>
              <div className="coin-split-reconcile__text">
                <strong className="coin-split-reconcile__title">
                  balances changed since these settlements were logged
                </strong>
                <span className="coin-split-reconcile__hint">
                  Your settlement records were left untouched. Check them against the new balances and
                  mark the group reconciled once they still line up.
                </span>
              </div>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleReconcile}
                disabled={reconciling}
              >
                {reconciling ? 'saving…' : 'mark reconciled'}
              </Button>
            </div>
          )}

          <div className="coin-split-stats">
            <div className="coin-split-stat-card coin-split-stat-card--total">
              <span className="coin-split-stat-card__label">total spent</span>
              <span className="coin-split-stat-card__value">{money(group.totalExpense)}</span>
              <span className="coin-split-stat-card__note">
                {expenses.length} {expenses.length === 1 ? 'expense' : 'expenses'}
              </span>
            </div>
            <div className="coin-split-stat-card coin-split-stat-card--people">
              <span className="coin-split-stat-card__label">people</span>
              <span className="coin-split-stat-card__value">{group.participantCount}</span>
              <span className="coin-split-stat-card__note">splitting equally</span>
            </div>
            <div className="coin-split-stat-card coin-split-stat-card--share">
              <span className="coin-split-stat-card__label">equal share</span>
              <span className="coin-split-stat-card__value">{money(group.equalShare)}</span>
              <span className="coin-split-stat-card__note">per person</span>
            </div>
          </div>

          {/* Participants */}
          <section className="coin-split-section">
            <h2 className="coin-section__title">participants</h2>

            <form className="coin-split-card coin-split-form" onSubmit={handleAddPerson}>
              <div className="coin-split-form__row">
                <input
                  className="coin-split-input"
                  placeholder="add a person, e.g. Aman"
                  value={personName}
                  maxLength={80}
                  onChange={(e) => setPersonName(e.target.value)}
                  disabled={addingPerson}
                />
                <Button type="submit" variant="primary" size="sm" disabled={addingPerson || !personName.trim()}>
                  {addingPerson ? 'adding…' : 'add'}
                </Button>
              </div>
            </form>

            {participants.length === 0 ? (
              <div className="coin-empty" style={{ marginTop: '12px' }}>
                Add everyone who shares these expenses.
              </div>
            ) : (
              <div className="coin-split-people">
                {participants.map((person) =>
                  renamingId === person.id ? (
                    <form
                      key={person.id}
                      className="coin-split-form__row"
                      style={{ alignItems: 'center' }}
                      onSubmit={(event) => handleRename(event, person)}
                    >
                      <input
                        className="coin-split-input"
                        value={renameValue}
                        maxLength={80}
                        onChange={(e) => setRenameValue(e.target.value)}
                        disabled={savingPerson}
                      />
                      <Button type="submit" variant="primary" size="sm" disabled={savingPerson || !renameValue.trim()}>
                        save
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setRenamingId(null)}
                        disabled={savingPerson}
                      >
                        cancel
                      </Button>
                    </form>
                  ) : (
                    <div
                      className={`coin-split-person coin-split-person--tone-${toneFor(person.id)}`}
                      key={person.id}
                    >
                      <span className="coin-split-person__avatar" aria-hidden="true">
                        {initialOf(person.name)}
                      </span>
                      <span className="coin-split-person__name">{person.name}</span>
                      <span className="coin-split-person__actions">
                        <button
                          type="button"
                          className="coin-split-person__btn"
                          title={`Rename ${person.name}`}
                          onClick={() => startRename(person)}
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          className="coin-split-person__btn"
                          title={`Remove ${person.name}`}
                          onClick={() => handleRemovePerson(person)}
                          disabled={removingId === person.id}
                        >
                          ×
                        </button>
                      </span>
                    </div>
                  ),
                )}
              </div>
            )}
          </section>

          {/* Expenses */}
          <section className="coin-split-section">
            <h2 className="coin-section__title">expenses</h2>

            {participants.length === 0 ? (
              <div className="coin-empty" style={{ marginTop: '12px' }}>
                Add a participant before logging an expense.
              </div>
            ) : (
              <form className="coin-split-card coin-split-form" onSubmit={handleAddExpense}>
                <div className="coin-split-form__row">
                  <input
                    className="coin-split-input"
                    placeholder="what was it, e.g. dinner"
                    value={expenseForm.title}
                    maxLength={255}
                    onChange={(e) => setExpenseForm((form) => ({ ...form, title: e.target.value }))}
                    disabled={addingExpense}
                  />
                  <input
                    className="coin-split-input coin-split-input--amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="amount"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm((form) => ({ ...form, amount: e.target.value }))}
                    disabled={addingExpense}
                  />
                  <select
                    className="coin-split-select"
                    value={expenseForm.participantId}
                    onChange={(e) => setExpenseForm((form) => ({ ...form, participantId: e.target.value }))}
                    disabled={addingExpense}
                  >
                    {participantOptions()}
                  </select>
                  <input
                    className="coin-split-input coin-split-input--date"
                    type="date"
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm((form) => ({ ...form, date: e.target.value }))}
                    disabled={addingExpense}
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={addingExpense || !expenseForm.title.trim() || !expenseForm.amount}
                  >
                    {addingExpense ? 'adding…' : 'add expense'}
                  </Button>
                </div>
              </form>
            )}

            {expenses.length === 0 ? (
              <div className="coin-empty" style={{ marginTop: '12px' }}>
                No expenses yet.
              </div>
            ) : (
              <div className="coin-split-expenses">
                {expenses.map((expense) =>
                  editingExpenseId === expense.id ? (
                    <form
                      key={expense.id}
                      className="coin-split-expense coin-split-form"
                      onSubmit={(event) => handleSaveExpense(event, expense)}
                    >
                      <div className="coin-split-form__row">
                        <input
                          className="coin-split-input"
                          value={expenseEdit.title}
                          maxLength={255}
                          onChange={(e) => setExpenseEdit((form) => ({ ...form, title: e.target.value }))}
                          disabled={savingExpense}
                        />
                        <input
                          className="coin-split-input coin-split-input--amount"
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={expenseEdit.amount}
                          onChange={(e) => setExpenseEdit((form) => ({ ...form, amount: e.target.value }))}
                          disabled={savingExpense}
                        />
                        <select
                          className="coin-split-select"
                          value={expenseEdit.participantId}
                          onChange={(e) => setExpenseEdit((form) => ({ ...form, participantId: e.target.value }))}
                          disabled={savingExpense}
                        >
                          {participantOptions()}
                        </select>
                        <input
                          className="coin-split-input coin-split-input--date"
                          type="date"
                          value={expenseEdit.date}
                          onChange={(e) => setExpenseEdit((form) => ({ ...form, date: e.target.value }))}
                          disabled={savingExpense}
                        />
                        <Button type="submit" variant="primary" size="sm" disabled={savingExpense}>
                          save
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingExpenseId(null)}
                          disabled={savingExpense}
                        >
                          cancel
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="coin-split-expense" key={expense.id}>
                      <div className="coin-split-expense__main">
                        <span className="coin-split-expense__title">{expense.title}</span>
                        <span className="coin-split-expense__meta">
                          <span className="coin-split-expense__paid">
                            {expense.participantName} paid
                          </span>
                          <span className="coin-split-expense__sep" aria-hidden="true">
                            ·
                          </span>
                          <span className="coin-split-expense__date">
                            {formatDate(expense.date)}
                          </span>
                        </span>
                      </div>
                      <div className="coin-split-expense__side">
                        <span className="coin-split-expense__amount">{money(expense.amount)}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => startEditExpense(expense)}
                        >
                          edit
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteExpense(expense)}
                          disabled={deletingExpenseId === expense.id}
                        >
                          delete
                        </Button>
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}
          </section>

          {/* Who owes what */}
          <section className="coin-split-section">
            <h2 className="coin-section__title">who owes what</h2>

            {summary.length === 0 ? (
              <div className="coin-empty" style={{ marginTop: '12px' }}>
                No one is in this group yet.
              </div>
            ) : (
              <div className="coin-split-summary">
                {summary.map((row) => {
                  const badge = balanceBadge(row.netBalance)
                  return (
                    <div className="coin-split-summary-row" key={row.id}>
                      <div className="coin-split-summary__person">
                        <span
                          className={`coin-split-summary__avatar coin-split-summary__avatar--${toneFor(row.id)}`}
                          aria-hidden="true"
                        >
                          {initialOf(row.name)}
                        </span>
                        <span className="coin-split-summary__name">{row.name}</span>
                      </div>
                      <div className="coin-split-summary__figures">
                        <div className="coin-split-figure">
                          <span className="coin-split-figure__label">paid</span>
                          <span className="coin-split-figure__value">{money(row.paid)}</span>
                        </div>
                        <div className="coin-split-figure">
                          <span className="coin-split-figure__label">fair share</span>
                          <span className="coin-split-figure__value">{money(row.fairShare)}</span>
                        </div>
                        <div className="coin-split-figure coin-split-figure--net">
                          <span className="coin-split-figure__label">net</span>
                          <span className={badge.className}>{badge.text}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* Settlement instructions */}
          <section className="coin-split-section">
            <h2 className="coin-section__title">settle up</h2>

            {participants.length === 0 ? (
              <div className="coin-empty" style={{ marginTop: '12px' }}>
                Add participants to see how to settle up.
              </div>
            ) : settlements.length === 0 ? (
              <div className="coin-split-settled" style={{ marginTop: '12px' }}>
                ✓ Everyone is settled — nothing to transfer.
              </div>
            ) : (
              <div className="coin-split-settlements">
                {settlements.map((settlement, index) => (
                  <div
                    className="coin-split-settlement"
                    key={`${settlement.fromParticipantId}-${settlement.toParticipantId}-${index}`}
                  >
                    <span className="coin-split-settlement__route coin-split-settlement__route--payer">
                      {settlement.from}
                    </span>
                    <span className="coin-split-settlement__arrow" aria-hidden="true">
                      →
                    </span>
                    <span className="coin-split-settlement__route coin-split-settlement__route--payee">
                      {settlement.to}
                    </span>
                    <span className="coin-split-settlement__amount">{money(settlement.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Settlement tracking: real records, instalments and audit trail */}
          <section className="coin-split-section">
            <h2 className="coin-section__title">settlement tracker</h2>
            <p className="coin-split-note">
              Settlements you actually logged. The suggested transfers above are recalculated from the
              expenses on every load and are never merged with these records.
            </p>

            {settlementDashboard && (
              <div className="coin-split-settle-stats">
                <div className="coin-split-settle-card coin-split-settle-card--owed">
                  <span className="coin-split-stat-card__label">total owed</span>
                  <span className="coin-split-settle-card__value">{money(settlementDashboard.totalOwed)}</span>
                  <span className="coin-split-stat-card__note">
                    {settlementDashboard.totalRecords}{' '}
                    {settlementDashboard.totalRecords === 1 ? 'record' : 'records'}
                  </span>
                </div>
                <div className="coin-split-settle-card coin-split-settle-card--received">
                  <span className="coin-split-stat-card__label">received</span>
                  <span className="coin-split-settle-card__value">
                    {money(settlementDashboard.totalReceived)}
                  </span>
                  <span className="coin-split-stat-card__note">
                    {settlementDashboard.completedCount} completed
                  </span>
                </div>
                <div className="coin-split-settle-card coin-split-settle-card--pending">
                  <span className="coin-split-stat-card__label">pending</span>
                  <span className="coin-split-settle-card__value">
                    {money(settlementDashboard.totalPending)}
                  </span>
                  <span className="coin-split-stat-card__note">
                    {settlementDashboard.pendingCount} pending · {settlementDashboard.partialCount} part paid
                  </span>
                </div>
                <div className="coin-split-settle-card coin-split-settle-card--suggested">
                  <span className="coin-split-stat-card__label">still owed overall</span>
                  <span className="coin-split-settle-card__value">
                    {money(settlementDashboard.suggestedOutstanding)}
                  </span>
                  <span className="coin-split-stat-card__note">from current balances</span>
                </div>
              </div>
            )}

            {participants.length < 2 ? (
              <div className="coin-empty" style={{ marginTop: '12px' }}>
                Add at least two participants to track a settlement.
              </div>
            ) : (
              <form className="coin-split-card coin-split-form" onSubmit={handleAddSettlement}>
                <div className="coin-split-create__head">
                  <span className="coin-split-create__title">log a settlement</span>
                  <span className="coin-split-create__hint">
                    Recorded as pending until you mark it paid or add part payments.
                  </span>
                </div>
                <div className="coin-split-form__row">
                  <select
                    className="coin-split-select"
                    value={settlementForm.payerId}
                    onChange={(e) => setSettlementForm((form) => ({ ...form, payerId: e.target.value }))}
                    disabled={addingSettlement}
                  >
                    <option value="">who pays…</option>
                    {participantOptions()}
                  </select>
                  <select
                    className="coin-split-select"
                    value={settlementForm.receiverId}
                    onChange={(e) => setSettlementForm((form) => ({ ...form, receiverId: e.target.value }))}
                    disabled={addingSettlement}
                  >
                    <option value="">who receives…</option>
                    {participantOptions()}
                  </select>
                  <input
                    className="coin-split-input coin-split-input--amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="amount"
                    value={settlementForm.amount}
                    onChange={(e) => setSettlementForm((form) => ({ ...form, amount: e.target.value }))}
                    disabled={addingSettlement}
                  />
                  <input
                    className="coin-split-input coin-split-input--date"
                    type="date"
                    value={settlementForm.date}
                    onChange={(e) => setSettlementForm((form) => ({ ...form, date: e.target.value }))}
                    disabled={addingSettlement}
                  />
                  <input
                    className="coin-split-input"
                    placeholder="note (optional)"
                    maxLength={255}
                    value={settlementForm.note}
                    onChange={(e) => setSettlementForm((form) => ({ ...form, note: e.target.value }))}
                    disabled={addingSettlement}
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={
                      addingSettlement ||
                      !settlementForm.payerId ||
                      !settlementForm.receiverId ||
                      !settlementForm.amount
                    }
                  >
                    {addingSettlement ? 'saving…' : 'log settlement'}
                  </Button>
                </div>
              </form>
            )}

            {/* Settlement history: filter + sort, with payment details inline. */}
            {settlementRecords.length === 0 ? (
              <div className="coin-empty" style={{ marginTop: '12px' }}>
                No settlements logged yet.
              </div>
            ) : (
              <>
                <div className="coin-split-history-bar">
                  <span className="coin-split-history-bar__label">history</span>
                  <select
                    className="coin-split-select coin-split-select--compact"
                    value={historyPerson}
                    onChange={(e) => setHistoryPerson(e.target.value)}
                  >
                    <option value="all">everyone</option>
                    {participants.map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.name}
                      </option>
                    ))}
                  </select>
                  <select
                    className="coin-split-select coin-split-select--compact"
                    value={historySort}
                    onChange={(e) => setHistorySort(e.target.value)}
                  >
                    <option value="date_desc">newest first</option>
                    <option value="date_asc">oldest first</option>
                  </select>
                </div>

                {historyRecords.length === 0 ? (
                  <div className="coin-empty" style={{ marginTop: '12px' }}>
                    No settlements for that person.
                  </div>
                ) : (
                  <div className="coin-split-records">
                    {historyRecords.map((record) => {
                      const statusClass = String(record.status).toLowerCase()
                      const settled = record.status === 'PAID'
                      return (
                        <div
                          className={`coin-split-record coin-split-record--${statusClass}`}
                          key={record.id}
                        >
                          <div className="coin-split-record__head">
                            <span className="coin-split-record__route">
                              <span className="coin-split-settlement__route--payer">
                                {record.payerName}
                              </span>
                              <span className="coin-split-settlement__arrow" aria-hidden="true">
                                →
                              </span>
                              <span className="coin-split-settlement__route--payee">
                                {record.receiverName}
                              </span>
                            </span>
                            <span className={`coin-split-status coin-split-status--${statusClass}`}>
                              {STATUS_LABEL[record.status] ?? record.status}
                            </span>
                          </div>

                          <div className="coin-split-record__figures">
                            <div className="coin-split-figure">
                              <span className="coin-split-figure__label">original</span>
                              <span className="coin-split-figure__value">{money(record.amount)}</span>
                            </div>
                            <div className="coin-split-figure">
                              <span className="coin-split-figure__label">paid</span>
                              <span className="coin-split-figure__value">{money(record.paidAmount)}</span>
                            </div>
                            <div className="coin-split-figure">
                              <span className="coin-split-figure__label">remaining</span>
                              <span className="coin-split-figure__value">{money(record.remaining)}</span>
                            </div>
                            <div className="coin-split-figure">
                              <span className="coin-split-figure__label">date</span>
                              <span className="coin-split-figure__value">{formatDate(record.date)}</span>
                            </div>
                          </div>

                          {record.note && <p className="coin-split-record__note">{record.note}</p>}

                          {record.payments.length > 0 && (
                            <ul className="coin-split-payments">
                              {record.payments.map((payment) => (
                                <li className="coin-split-payment" key={payment.id}>
                                  <span className="coin-split-payment__amount">
                                    {money(payment.amount)}
                                  </span>
                                  <span className="coin-split-payment__date">
                                    {formatDate(payment.paidAt)}
                                  </span>
                                  {payment.note && (
                                    <span className="coin-split-payment__note">{payment.note}</span>
                                  )}
                                  <button
                                    type="button"
                                    className="coin-split-person__btn"
                                    title="Remove this payment"
                                    onClick={() => handleRemovePayment(record, payment)}
                                    disabled={removingPaymentId === payment.id}
                                  >
                                    ×
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}

                          <div className="coin-split-record__actions">
                            {!settled &&
                              (payingId === record.id ? (
                                <form
                                  className="coin-split-form__row coin-split-pay-form"
                                  onSubmit={(event) => handleRecordPayment(event, record)}
                                >
                                  <input
                                    className="coin-split-input coin-split-input--amount"
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    placeholder={`${record.remaining} (full)`}
                                    value={paymentForm.amount}
                                    onChange={(e) =>
                                      setPaymentForm((form) => ({ ...form, amount: e.target.value }))
                                    }
                                    disabled={recordingPayment}
                                  />
                                  <input
                                    className="coin-split-input coin-split-input--date"
                                    type="date"
                                    value={paymentForm.paidAt}
                                    onChange={(e) =>
                                      setPaymentForm((form) => ({ ...form, paidAt: e.target.value }))
                                    }
                                    disabled={recordingPayment}
                                  />
                                  <input
                                    className="coin-split-input"
                                    placeholder="note (optional)"
                                    maxLength={255}
                                    value={paymentForm.note}
                                    onChange={(e) =>
                                      setPaymentForm((form) => ({ ...form, note: e.target.value }))
                                    }
                                    disabled={recordingPayment}
                                  />
                                  <Button
                                    type="submit"
                                    variant="primary"
                                    size="sm"
                                    disabled={recordingPayment}
                                  >
                                    {recordingPayment ? 'saving…' : 'record payment'}
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setPayingId(null)}
                                    disabled={recordingPayment}
                                  >
                                    cancel
                                  </Button>
                                </form>
                              ) : (
                                <>
                                  <Button
                                    type="button"
                                    variant="primary"
                                    size="sm"
                                    onClick={() => handleMarkPaid(record)}
                                    disabled={markingId === record.id}
                                  >
                                    {markingId === record.id ? 'saving…' : 'mark as paid'}
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => startPayment(record)}
                                  >
                                    part payment
                                  </Button>
                                </>
                              ))}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteSettlement(record)}
                              disabled={deletingSettlementId === record.id}
                            >
                              delete
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {settlementAudit.length > 0 && (
                  <details className="coin-split-audit">
                    <summary className="coin-split-audit__summary">
                      audit trail · {settlementAudit.length} entries
                    </summary>
                    <ul className="coin-split-audit__list">
                      {settlementAudit.map((entry) => (
                        <li className="coin-split-audit__item" key={entry.id}>
                          <span className="coin-split-audit__action">
                            {String(entry.action).toLowerCase().replace(/_/g, ' ')}
                          </span>
                          <span className="coin-split-audit__detail">{entry.detail}</span>
                          <span className="coin-split-audit__time">
                            {new Date(entry.createdAt).toLocaleString()}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </>
            )}
          </section>
        </>
      )}
    </div>
  )
}
