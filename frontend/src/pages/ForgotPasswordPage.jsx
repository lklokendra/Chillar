import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import AuthShell from '../components/AuthShell'
import Button from '../components/Button'
import TextField from '../components/TextField'
import { useAuth } from '../context/AuthContext'
import { forgotPassword } from '../api/auth'
import { errorMessage, fieldErrors } from '../api/client'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function ForgotPasswordPage() {
  const { user } = useAuth()

  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)

  if (user) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (submitting) return

    const trimmed = email.trim()
    if (!trimmed) {
      setErrors({ email: 'Please enter your email.' })
      return
    }
    if (!EMAIL_PATTERN.test(trimmed)) {
      setErrors({ email: 'Please enter a valid email address.' })
      return
    }

    setErrors({})
    setSubmitting(true)
    try {
      setResult(await forgotPassword(trimmed))
    } catch (err) {
      const fromApi = fieldErrors(err)
      setErrors(
        Object.keys(fromApi).length > 0
          ? fromApi
          : { form: errorMessage(err, 'Unable to send reset instructions. Please try again.') },
      )
    } finally {
      setSubmitting(false)
    }
  }

  const startOver = () => {
    setResult(null)
    setErrors({})
  }

  return (
    <AuthShell title="Reset your password" subtitle="Tell us the email on your Paise account.">
      {result ? (
        <div className="coin-auth__stack">
          <div className="coin-alert coin-alert--ok" role="status">
            {result.message}
          </div>

          {/* Only present when an account matched — the server never says which. */}
          {result.resetToken && (
            <>
              <p className="coin-field__hint">
                Paise has no mail server connected yet, so here is your one-time link. It works for{' '}
                {result.expiresInMinutes} minutes:
              </p>

              <code className="coin-token">{result.resetToken}</code>

              <Link
                className="coin-btn coin-btn--mint coin-btn--block"
                to={`/reset-password?token=${encodeURIComponent(result.resetToken)}`}
              >
                Choose a new password
              </Link>
            </>
          )}

          <Button variant="ghost" block onClick={startOver}>
            Use a different email
          </Button>
        </div>
      ) : (
        <form className="coin-auth__form" onSubmit={handleSubmit} noValidate>
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
            value={email}
            onChange={(event) => {
              setEmail(event.target.value)
              setErrors((prev) => (prev.email || prev.form ? {} : prev))
            }}
            error={errors.email}
            required
          />

          <Button type="submit" variant="primary" block disabled={submitting}>
            {submitting ? (
              <>
                <span className="coin-spinner" aria-hidden="true" />
                Sending...
              </>
            ) : (
              'Send reset link'
            )}
          </Button>
        </form>
      )}

      <p className="coin-auth__footer">
        Remembered it? <Link to="/login">Sign in</Link>
      </p>
    </AuthShell>
  )
}
