import { PASSWORD_RULES, evaluatePassword } from '../utils/passwordPolicy'

/**
 * Live feedback for a password field: a four-notch strength bar plus the list of
 * rules, each ticking over as it is satisfied.
 *
 * Pure presentation — the same rules are enforced by the API, this only moves
 * the answer earlier so the form does not have to fail to teach.
 */
export default function PasswordStrength({ value = '' }) {
  const { met, metCount, strength, label } = evaluatePassword(value)

  return (
    <div className="coin-strength" data-strength={strength ?? 'none'}>
      {strength && (
        <div className="coin-strength__head">
          <span className="coin-strength__bars" aria-hidden="true">
            {PASSWORD_RULES.map((rule, index) => (
              <span key={rule.key} className={index < metCount ? 'is-on' : ''} />
            ))}
          </span>
          <span className="coin-strength__label" role="status" aria-live="polite">
            {label}
          </span>
        </div>
      )}

      <ul className="coin-strength__rules">
        {PASSWORD_RULES.map((rule) => (
          <li key={rule.key} className={met[rule.key] ? 'is-met' : ''}>
            <span className="coin-strength__tick" aria-hidden="true">
              {met[rule.key] ? '✓' : '○'}
            </span>
            <span className="coin-strength__rule-text">{rule.label}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
