import { useId } from 'react'

export default function TextField({ label, error, hint, ...inputProps }) {
  const id = useId()

  return (
    <div className="coin-field">
      <label className="coin-field__label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="coin-field__input"
        data-invalid={error ? 'true' : 'false'}
        aria-invalid={error ? 'true' : 'false'}
        {...inputProps}
      />
      {error && <span className="coin-field__error">{error}</span>}
      {!error && hint && <span className="coin-field__hint">{hint}</span>}
    </div>
  )
}
