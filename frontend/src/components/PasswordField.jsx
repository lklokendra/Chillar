import { useId, useState } from 'react'

/** The two states of the visibility control. */
const EYE = (
  <>
    <path d="M2.4 12S6 5.6 12 5.6 21.6 12 21.6 12 18 18.4 12 18.4 2.4 12 2.4 12Z" />
    <circle cx="12" cy="12" r="3.2" />
  </>
)

const EYE_OFF = (
  <>
    <path d="M4 4.5 20 19.5" />
    <path d="M9.6 9.7a3.2 3.2 0 0 0 4.5 4.5" />
    <path d="M6.5 6.9C3.9 8.6 2.4 12 2.4 12s3.6 6.4 9.6 6.4c1.6 0 3-.4 4.2-1" />
    <path d="M13.7 5.9c2.8.6 5.4 3 7.9 6.1 0 0-1.2 2.2-3.3 4" />
  </>
)

/**
 * Password input with a built-in show/hide control.
 *
 * The toggle is a real button, so it is reachable with Tab and announced by
 * screen readers, and it never sits in the tab order of the surrounding form
 * submission — pressing Enter still submits.
 */
export default function PasswordField({ label, error, hint, ...inputProps }) {
  const id = useId()
  const [visible, setVisible] = useState(false)

  return (
    <div className="coin-field">
      <label className="coin-field__label" htmlFor={id}>
        {label}
      </label>

      <div className="coin-field__wrap">
        <input
          id={id}
          className="coin-field__input coin-field__input--with-affix"
          type={visible ? 'text' : 'password'}
          data-invalid={error ? 'true' : 'false'}
          aria-invalid={error ? 'true' : 'false'}
          {...inputProps}
        />

        <button
          type="button"
          className="coin-field__toggle"
          onClick={() => setVisible((prev) => !prev)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          title={visible ? 'Hide password' : 'Show password'}
        >
          <svg className="coin-field__toggle-icon" viewBox="0 0 24 24" aria-hidden="true">
            {visible ? EYE_OFF : EYE}
          </svg>
        </button>
      </div>

      {error && (
        <span className="coin-field__error" role="alert">
          {error}
        </span>
      )}
      {!error && hint && <span className="coin-field__hint">{hint}</span>}
    </div>
  )
}
