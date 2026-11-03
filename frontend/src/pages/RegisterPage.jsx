import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import AuthShell from '../components/AuthShell'
import Button from '../components/Button'
import PasswordField from '../components/PasswordField'
import PasswordStrength from '../components/PasswordStrength'
import TextField from '../components/TextField'
import { useAuth } from '../context/AuthContext'
import { errorMessage, fieldErrors } from '../api/client'
import { evaluatePassword } from '../utils/passwordPolicy'

const EMPTY_FORM = { name: '', email: '', password: '', confirmPassword: '' }
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function RegisterPage() {
  const { user, signUp } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState(EMPTY_FORM)
  const [touched, setTouched] = useState({})
  const [apiErrors, setApiErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  if (user) {
    return <Navigate to="/" replace />
  }

  const passwordOk = evaluatePassword(form.password).valid
  const confirmOk = form.confirmPassword.length > 0 && form.confirmPassword === form.password
  const ready =
    form.name.trim().length >= 2 && EMAIL_PATTERN.test(form.email.trim()) && passwordOk && confirmOk

  const update = (key) => (event) => {
    const value = event.target.value
    setForm((prev) => ({ ...prev, [key]: value }))
    setApiErrors((prev) => (prev[key] ? { ...prev, [key]: undefined, form: undefined } : prev))
  }

  const blur = (key) => () => setTouched((prev) => ({ ...prev, [key]: true }))

  /** What the field should say right now: server verdict first, then local. */
  const errorFor = (key) => {
    if (apiErrors[key]) return apiErrors[key]
    if (!touched[key]) return undefined

    if (key === 'name') {
      const name = form.name.trim()
      if (!name) return 'Name is required.'
      if (name.length < 2) return 'Name must be at least 2 characters.'
    }
    if (key === 'email') {
      const email = form.email.trim()
      if (!email) return 'Please enter your email.'
      if (!EMAIL_PATTERN.test(email)) return 'Please enter a valid email address.'
    }
    if (key === 'password' && form.password && !passwordOk) {
      return 'Password does not meet the requirements below.'
    }
    if (key === 'confirmPassword' && form.confirmPassword && form.confirmPassword !== form.password) {
      return 'Passwords do not match.'
    }
    return undefined
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (submitting || !ready) return

    setApiErrors({})
    setSubmitting(true)
    try {
      await signUp({ name: form.name.trim(), email: form.email.trim(), password: form.password })
      navigate('/', { replace: true })
    } catch (err) {
      const fromApi = fieldErrors(err)
      // Property names in the body match the RegisterRequest fields, so they map straight across.
      setApiErrors(
        Object.keys(fromApi).length > 0
          ? fromApi
          : { form: errorMessage(err, 'Account creation failed. Please try again.') },
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell title="Create your account" subtitle="One account, every category and spend.">
      <form className="coin-auth__form" onSubmit={handleSubmit} noValidate>
        {apiErrors.form && (
          <div className="coin-alert" role="alert">
            {apiErrors.form}
          </div>
        )}

        <TextField
          label="Name"
          type="text"
          name="name"
          autoComplete="name"
          placeholder="Ada Lovelace"
          maxLength={80}
          value={form.name}
          onChange={update('name')}
          onBlur={blur('name')}
          error={errorFor('name')}
          required
        />

        <TextField
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={update('email')}
          onBlur={blur('email')}
          error={errorFor('email')}
          required
        />

        <div className="coin-field-group">
          <PasswordField
            label="Password"
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
          placeholder="Re-enter your password"
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
              Creating account...
            </>
          ) : (
            'Create account'
          )}
        </Button>
      </form>

      <p className="coin-auth__footer">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </AuthShell>
  )
}
