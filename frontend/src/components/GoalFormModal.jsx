import { useEffect, useState } from 'react'
import Button from './Button'
import * as gullakApi from '../api/gullak'
import { errorMessage } from '../api/client'
import { GOAL_ICONS, GOAL_TONES } from '../utils/goals'

/**
 * One dialog for both creating and editing a goal, so a new goal and an
 * existing one are configured through exactly the same screen.
 *
 * The form is grouped into goal details, the optional financial target and the
 * appearance (icon + accent), and it only ever writes the goal's own settings —
 * the entries that make up its balance are never touched.
 */
export default function GoalFormModal({ goal = null, onClose, onSaved, onError }) {
  const editing = Boolean(goal)
  const [form, setForm] = useState(() => ({
    name: goal?.name || '',
    description: goal?.description || '',
    targetAmount:
      goal?.targetAmount === null || goal?.targetAmount === undefined ? '' : String(goal.targetAmount),
    targetDate: goal?.targetDate || '',
    icon: goal?.icon || '',
    color: goal?.color || '',
  }))
  // Open the free-text field straight away when the goal already carries an
  // emoji that is not one of the suggestions, so it stays visible and editable.
  const [customIcon, setCustomIcon] = useState(() => Boolean(goal?.icon) && !GOAL_ICONS.includes(goal.icon))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Escape closes the dialog, and the page behind it stops scrolling.
  useEffect(() => {
    function onKey(event) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [onClose])

  function update(patch) {
    setForm((current) => ({ ...current, ...patch }))
    if (error) setError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const name = form.name.trim()
    if (!name) {
      setError('Give your goal a name.')
      return
    }

    const target = form.targetAmount === '' ? null : Number(form.targetAmount)
    if (target !== null && (!Number.isFinite(target) || target <= 0)) {
      setError('Target must be greater than zero, or leave it empty.')
      return
    }

    setSaving(true)
    setError('')
    onError?.('')
    try {
      const payload = {
        name,
        description: form.description.trim() || null,
        targetAmount: target,
        targetDate: form.targetDate || null,
        icon: form.icon || null,
        color: form.color || null,
        status: editing && goal.status === 'ARCHIVED' ? 'ARCHIVED' : 'ACTIVE',
      }
      const saved = editing
        ? await gullakApi.updateGoal(goal.id, payload)
        : await gullakApi.createGoal(payload)
      onSaved?.(saved, editing ? 'Goal updated.' : `Goal #${saved.name} created.`)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="coin-modal" role="dialog" aria-modal="true" aria-label={editing ? 'Edit goal' : 'New goal'}>
      <div className="coin-modal__backdrop" onClick={onClose} aria-hidden="true" />

      <div className="coin-modal__panel">
        <header className="coin-modal__head">
          <div>
            <h2 className="coin-modal__title">{editing ? 'edit goal' : 'new goal'}</h2>
            <p className="coin-modal__sub">
              {editing
                ? 'update this goal — its entries and balance stay exactly as they are.'
                : 'only the name is required — everything else can wait.'}
            </p>
          </div>
          <button
            type="button"
            className="coin-modal__close"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <form className="coin-goal-form" onSubmit={handleSubmit}>
          <section className="coin-goal-form__group">
            <h3 className="coin-goal-form__group-title">goal details</h3>

            <div className="coin-goal-form__grid">
              <div>
                <label className="coin-gullak-form__label" htmlFor="coin-goal-name">
                  goal name
                </label>
                <input
                  id="coin-goal-name"
                  className="coin-gullak-input"
                  type="text"
                  maxLength={120}
                  placeholder="e.g. laptop, goa trip"
                  value={form.name}
                  onChange={(event) => update({ name: event.target.value })}
                  disabled={saving}
                  autoFocus
                />
              </div>

              <div>
                <label className="coin-gullak-form__label" htmlFor="coin-goal-desc">
                  description<span className="coin-goal-form__optional">optional</span>
                </label>
                <input
                  id="coin-goal-desc"
                  className="coin-gullak-input"
                  type="text"
                  maxLength={500}
                  placeholder="what is this goal for?"
                  value={form.description}
                  onChange={(event) => update({ description: event.target.value })}
                  disabled={saving}
                />
              </div>
            </div>
          </section>

          <section className="coin-goal-form__group">
            <h3 className="coin-goal-form__group-title">financial target</h3>

            <div className="coin-goal-form__grid">
              <div>
                <label className="coin-gullak-form__label" htmlFor="coin-goal-target">
                  target amount<span className="coin-goal-form__optional">optional</span>
                </label>
                <input
                  id="coin-goal-target"
                  className="coin-gullak-input"
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  placeholder="leave empty for no target"
                  value={form.targetAmount}
                  onChange={(event) => update({ targetAmount: event.target.value })}
                  disabled={saving}
                />
              </div>

              <div>
                <label className="coin-gullak-form__label" htmlFor="coin-goal-date">
                  target date<span className="coin-goal-form__optional">optional</span>
                </label>
                <input
                  id="coin-goal-date"
                  className="coin-gullak-input"
                  type="date"
                  value={form.targetDate}
                  onChange={(event) => update({ targetDate: event.target.value })}
                  disabled={saving}
                />
              </div>
            </div>
          </section>

          <section className="coin-goal-form__group">
            <h3 className="coin-goal-form__group-title">appearance</h3>

            <div>
              <span className="coin-gullak-form__label">icon</span>
              <div className="coin-goal-icons">
                {GOAL_ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    className={`coin-goal-icon ${form.icon === icon ? 'is-active' : ''}`}
                    onClick={() => update({ icon: form.icon === icon ? '' : icon })}
                    disabled={saving}
                    aria-label={`Use ${icon} as this goal's icon`}
                  >
                    {icon}
                  </button>
                ))}

                {/* Opens a free-text field so any emoji can be typed or pasted. */}
                <button
                  type="button"
                  className={`coin-goal-icon coin-goal-icon--custom ${customIcon ? 'is-active' : ''}`}
                  onClick={() => setCustomIcon((open) => !open)}
                  disabled={saving}
                  aria-expanded={customIcon}
                  aria-label="Type your own emoji"
                  title="Type your own emoji"
                >
                  +
                </button>
              </div>

              {customIcon && (
                <input
                  className="coin-gullak-input coin-goal-icon__input"
                  type="text"
                  maxLength={16}
                  placeholder="type or paste an emoji, e.g. 🌱"
                  value={form.icon}
                  onChange={(event) => update({ icon: event.target.value })}
                  disabled={saving}
                  aria-label="Custom goal icon"
                />
              )}
            </div>

            <div>
              <span className="coin-gullak-form__label">colour</span>
              <div className="coin-goal-icons">
                {GOAL_TONES.map((tone) => (
                  <button
                    key={tone}
                    type="button"
                    className={`coin-goal-swatch coin-goal-swatch--${tone} ${
                      form.color === tone ? 'is-active' : ''
                    }`}
                    onClick={() => update({ color: form.color === tone ? '' : tone })}
                    disabled={saving}
                    aria-label={`Use the ${tone} accent`}
                  />
                ))}
              </div>
            </div>
          </section>

          {error && (
            <div className="coin-alert" role="alert">
              {error}
            </div>
          )}

          <div className="coin-goal-form__actions">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
              cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? 'saving…' : editing ? 'save goal' : 'create goal'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
