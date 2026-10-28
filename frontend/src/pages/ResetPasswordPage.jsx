import { useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import AuthShell from '../components/AuthShell'
import Button from '../components/Button'
import TextField from '../components/TextField'
import { useAuth } from '../context/AuthContext'
import { resetPassword } from '../api/auth'
import { errorMessage } from '../api/client'

export default function ResetPasswordPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [form, setForm] = useState({ password: '', confirmPassword: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (user) {
    return <Navigate to="/" replace />
  }

  const update = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (!token) {
      setError('This link is missing its reset token. Ask for a new one.')
      return
    }

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    try {
      const { message } = await resetPassword({ token, password: form.password })
      navigate('/login', { replace: true, state: { notice: message } })
    } catch (err) {
      setError(errorMessage(err, 'Could not reset your password. Please try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell title="Choose a new password" subtitle="Then sign in with it straight away.">
      <form className="coin-auth__form" onSubmit={handleSubmit} noValidate>
        {error && (
          <div className="coin-alert" role="alert">
            {error}
          </div>
        )}

        <TextField
          label="New password"
          type="password"
          name="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          hint="Use 8 characters or more."
          value={form.password}
          onChange={update('password')}
          required
        />

        <TextField
          label="Confirm password"
          type="password"
          name="confirmPassword"
          autoComplete="new-password"
          placeholder="Re-enter your new password"
          value={form.confirmPassword}
          onChange={update('confirmPassword')}
          required
        />

        <Button type="submit" variant="primary" block disabled={submitting}>
          {submitting ? 'Updating...' : 'Update password'}
        </Button>
      </form>

      <p className="coin-auth__footer">
        Need a fresh link? <Link to="/forgot-password">Start over</Link>
      </p>
    </AuthShell>
  )
}
