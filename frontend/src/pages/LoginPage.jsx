import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import AuthShell from '../components/AuthShell'
import Button from '../components/Button'
import TextField from '../components/TextField'
import { useAuth } from '../context/AuthContext'
import { errorMessage } from '../api/client'

export default function LoginPage() {
  const { user, signIn, continueAsGuest } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const redirectTo = location.state?.from ?? '/'
  const notice = location.state?.notice

  if (user) {
    return <Navigate to={redirectTo} replace />
  }

  const update = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      await signIn({ email: form.email.trim(), password: form.password })
      navigate(redirectTo, { replace: true })
    } catch (err) {
      setError(errorMessage(err, 'Could not sign in. Please try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleGuestMode = () => {
    continueAsGuest()
    navigate('/')
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your Chillar account.">
      <form className="coin-auth__form" onSubmit={handleSubmit} noValidate>
        {notice && (
          <div className="coin-alert coin-alert--ok" role="status">
            {notice}
          </div>
        )}

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
          value={form.email}
          onChange={update('email')}
          required
        />

        <TextField
          label="Password"
          type="password"
          name="password"
          autoComplete="current-password"
          placeholder="Your password"
          value={form.password}
          onChange={update('password')}
          required
        />

        <div className="coin-auth__meta">
          <Link to="/forgot-password">Forgot password?</Link>
        </div>

        <Button type="submit" variant="primary" block disabled={submitting}>
          {submitting ? 'Signing in...' : 'Sign in'}
        </Button>

        <div style={{ margin: '12px 0', opacity: 0.4, fontSize: '12px' }}>OR</div>

        <Button variant="ghost" block onClick={handleGuestMode}>
          Continue as Guest
        </Button>
      </form>

      <p className="coin-auth__footer">
        New to Chillar? <Link to="/register">Create an account</Link>
      </p>
    </AuthShell>
  )
}
