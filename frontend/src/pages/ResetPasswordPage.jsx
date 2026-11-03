import { useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import AuthShell from '../components/AuthShell'
import Button from '../components/Button'
import PasswordField from '../components/PasswordField'
import PasswordStrength from '../components/PasswordStrength'
import { useAuth } from '../context/AuthContext'
import { resetPassword } from '../api/auth'
import { errorMessage, fieldErrors } from '../api/client'
import { evaluatePassword } from '../utils/passwordPolicy'

export default function ResetPasswordPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [form, setForm] = useState({ password: '', confirmPassword: '' })
  const [touched, setTouched] = useState({})
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  if (user) {
    return <Navigate to="/" replace />
  }

  const passwordOk = evaluatePassword(form.password).valid
  const confirmOk = form.confirmPassword.length > 0 && form.confirmPassword === form.password
  const ready = Boolean(token) && passwordOk && confirmOk

  const update = (key) => (event) => {
    const value = event.target.value
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined, form: undefined } : prev))
  }

  const blur = (key) => () => setTouched((prev) => ({ ...prev, [key]: true }))

  const errorFor = (key) => {
    if (errors[key]) return errors[key]
    if (!touched[key]) return undefined
    if (key === 'password' && form.password && !passwordOk) {
      return 'Password does not meet the requirements below.'
    }
    if (key === 'confirmPassword' && form.confirmPassword && !confirmOk) {
      return 'Passwords do not match.'
    }
    return undefined
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (submitting || !ready) return

    setErrors({})
    setSubmitting(true)
    try {
      const { message } = await resetPassword({ token, password: form.password })
      navigate('/login', { replace: true, state: { notice: message } })
    } catch (err) {
      const fromApi = fieldErrors(err)
      // A rejected token is not tied to an input, so it belongs in the banner.
      setErrors(
        fromApi.token
          ? { form: fromApi.token }
          : Object.keys(fromApi).length > 0
            ? fromApi
            : { form: errorMessage(err, 'Could not reset your password. Please try again.') },
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell title="Choose a new password" subtitle="Then sign in with it straight away.">
      <form className="coin-auth__form" onSubmit={handleSubmit} noValidate>
        {!token && (
          <div className="coin-alert" role="alert">
            This link is missing its reset token. Ask for a new one.
          </div>
        )}

        {errors.form && (
          <div className="coin-alert" role="alert">
            {errors.form}
          </div>
        )}

        <div className="coin-field-group">
          <PasswordField
            label="New password"
            name="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            maxLength={72}
            value={form.password}
            onChange={update('password')}
            onBlur={blur('password')}
            error={errorFor('password')}
            required
          />
          <PasswordStrength value={form.password} />
        </div>

        <PasswordField
          label="Confirm password"
          name="confirmPassword"
          autoComplete="new-password"
          placeholder="Re-enter your new password"
          maxLength={72}
          value={form.confirmPassword}
          onChange={update('confirmPassword')}
          onBlur={blur('confirmPassword')}
          error={errorFor('confirmPassword')}
          hint={confirmOk ? 'Passwords match.' : undefined}
          required
        />

        <Button type="submit" variant="primary" block disabled={submitting || !ready}>
          {submitting ? (
            <>
              <span className="coin-spinner" aria-hidden="true" />
              Updating...
            </>
          ) : (
            'Update password'
          )}
        </Button>
      </form>

      <p className="coin-auth__footer">
        Need a fresh link? <Link to="/forgot-password">Start over</Link>
      </p>
    </AuthShell>
  )
}
