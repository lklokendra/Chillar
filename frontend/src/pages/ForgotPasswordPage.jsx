import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import AuthShell from '../components/AuthShell'
import Button from '../components/Button'
import TextField from '../components/TextField'
import { useAuth } from '../context/AuthContext'
import { forgotPassword } from '../api/auth'
import { errorMessage } from '../api/client'

export default function ForgotPasswordPage() {
  const { user } = useAuth()

  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)

  if (user) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      setResult(await forgotPassword(email.trim()))
    } catch (err) {
      setError(errorMessage(err, 'Could not start a password reset. Please try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell title="Reset your password" subtitle="Tell us the email on your Chillar account.">
      {result ? (
        <div className="coin-auth__stack">
          <div className="coin-alert coin-alert--ok" role="status">
            {result.message}
          </div>

          <p className="coin-field__hint">
            Chillar has no mail server connected yet, so here is your one-time link:
          </p>

          <code className="coin-token">{result.resetToken}</code>

          <Link
            className="coin-btn coin-btn--mint coin-btn--block"
            to={`/reset-password?token=${encodeURIComponent(result.resetToken)}`}
          >
            Choose a new password
          </Link>
        </div>
      ) : (
        <form className="coin-auth__form" onSubmit={handleSubmit} noValidate>
          {error && (
            <div className="coin-alert" role="alert">
              {error}
            </div>
          )}

          <TextField
            label="Email"
            type="email"
            name="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <Button type="submit" variant="primary" block disabled={submitting}>
            {submitting ? 'Preparing link...' : 'Send reset link'}
          </Button>
        </form>
      )}

      <p className="coin-auth__footer">
        Remembered it? <Link to="/login">Sign in</Link>
      </p>
    </AuthShell>
  )
}
