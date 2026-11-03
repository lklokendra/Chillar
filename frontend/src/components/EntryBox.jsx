import { formatAmount } from '../utils/entry'

/**
 * The one-line entry card shared by the kharch dashboard and the gullak: rupee
 * sign + input + live amount preview on one line, an optional action row
 * underneath, and the date picker in the footer.
 *
 * Everything that decides *what the entry means* (parsing, sending, warnings)
 * stays with the page — this only renders the box and forwards events.
 */
export default function EntryBox({
  value,
  onChange,
  onKeyDown,
  inputRef,
  placeholder,
  hint,
  date,
  onDateChange,
  preview,
  warning,
  disabled = false,
  ariaLabel,
  inlineActions,
  actions,
}) {
  return (
    <div className="coin-entry-card">
      <div className="coin-entry-row">
        <span className="coin-entry-row__sign" aria-hidden="true">
          ₹
        </span>

        <input
          ref={inputRef}
          className="coin-entry-input"
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          disabled={disabled}
          aria-label={ariaLabel}
        />

        {preview?.hasAmount && (
          <span className="coin-entry-preview" aria-live="polite">
            ₹{formatAmount(preview.amount)}
          </span>
        )}

        {inlineActions}
      </div>

      {warning && (
        <p className="coin-entry-warning" role="alert">
          {warning}
        </p>
      )}

      {actions && <div className="coin-entry-actions">{actions}</div>}

      <div className="coin-entry-meta">
        <label className="coin-entry-date">
          <span>date</span>
          <input type="date" value={date} onChange={onDateChange} disabled={disabled} />
        </label>
        {hint && <p className="coin-entry-hint">{hint}</p>}
      </div>
    </div>
  )
}
