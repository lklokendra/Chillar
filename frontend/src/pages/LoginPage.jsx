import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import AuthShell from '../components/AuthShell'
import Button from '../components/Button'
import Checkbox from '../components/Checkbox'
import PasswordField from '../components/PasswordField'
import TextField from '../components/TextField'
import { useAuth } from '../context/AuthContext'
import { errorMessage, fieldErrors } from '../api/client'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function LoginPage() {
  const { user, signIn, continueAsGuest } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [form, setForm] = useState({ email: '', password: '' })
  const [rememberMe, setRememberMe] = useState(false)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const redirectTo = location.state?.from ?? '/'
  const notice = location.state?.notice

  if (user) {
    return <Navigate to={redirectTo} replace />
  }

  const update = (key) => (event) => {
    const value = event.target.value
    setForm((prev) => ({ ...prev, [key]: value }))
    // Correcting a field clears just that field's message.
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined, form: undefined } : prev))
  }

  const validate = () => {
    const next = {}
    const email = form.email.trim()

    if (!email) next.email = 'Please enter your email.'
    else if (!EMAIL_PATTERN.test(email)) next.email = 'Please enter a valid email address.'

    if (!form.password) next.password = 'Please enter your password.'

    return next
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (submitting) return

    const found = validate()
    if (Object.keys(found).length > 0) {
      setErrors(found)
      return
    }

    setErrors({})
    setSubmitting(true)

    try {
      await signIn({ email: form.email.trim(), password: form.password }, { rememberMe })
      navigate(redirectTo, { replace: true })
    } catch (err) {
      const apiFieldErrors = fieldErrors(err)
      setErrors(
        Object.keys(apiFieldErrors).length > 0
          ? apiFieldErrors
          : { form: errorMessage(err, 'Could not sign in. Please try again.') },
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleGuestMode = async () => {
    if (submitting) return
    setErrors({})
    setSubmitting(true)
    try {
      await continueAsGuest()
      navigate('/', { replace: true })
    } catch (err) {
      setErrors({ form: errorMessage(err, 'Could not start guest mode. Please try again.') })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your Paise account.">
      <form className="coin-auth__form" onSubmit={handleSubmit} noValidate>
        {notice && (
          <div className="coin-alert coin-alert--ok" role="status">
            {notice}
          </div>
        )}

        {errors.form && (
          <div className="coin-alert" role="alert">
            {errors.form}
          </div>
        )}

        <TextField
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={update('email')}
          error={errors.email}
          required
        />

        <PasswordField
          label="Password"
          name="password"
          autoComplete="current-password"
          placeholder="Your password"
          maxLength={72}
          value={form.password}
          onChange={update('password')}
          error={errors.password}
          required
        />

        <div className="coin-auth__meta">
          <Checkbox
            label="Remember me"
            name="rememberMe"
            checked={rememberMe}
            onChange={(event) => setRememberMe(event.target.checked)}
          />
          <Link to="/forgot-password">Forgot password?</Link>
        </div>

        <Button type="submit" variant="primary" block disabled={submitting} aria-busy={submitting}>
          {submitting ? (
            <>
              <span className="coin-spinner" aria-hidden="true" />
              Signing in...
            </>
          ) : (
            'Sign in'
          )}
        </Button>

        <div className="coin-auth__divider">
          <span>OR</span>
        </div>

        <Button variant="ghost" block onClick={handleGuestMode} disabled={submitting}>
          Continue as Guest
        </Button>
      </form>

      <p className="coin-auth__footer">
        New to Paise? <Link to="/register">Create an account</Link>
      </p>
    </AuthShell>
  )
}
