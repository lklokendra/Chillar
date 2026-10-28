import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import AuthShell from '../components/AuthShell'
import Button from '../components/Button'
import TextField from '../components/TextField'
import { useAuth } from '../context/AuthContext'
import { errorMessage } from '../api/client'

const EMPTY_FORM = { name: '', email: '', password: '' }

export default function RegisterPage() {
  const { user, signUp } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (user) {
    return <Navigate to="/" replace />
  }

  const update = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

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
      await signUp({ name: form.name.trim(), email: form.email.trim(), password: form.password })
      navigate('/', { replace: true })
    } catch (err) {
      setError(errorMessage(err, 'Could not create your account. Please try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell title="Create your account" subtitle="One account, every category and spend.">
      <form className="coin-auth__form" onSubmit={handleSubmit} noValidate>
        {error && (
          <div className="coin-alert" role="alert">
            {error}
          </div>
        )}

        <TextField
          label="Name"
          type="text"
          name="name"
          autoComplete="name"
          placeholder="Ada Lovelace"
          value={form.name}
          onChange={update('name')}
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
          required
        />

        <TextField
          label="Password"
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
          placeholder="Re-enter your password"
          value={form.confirmPassword}
          onChange={update('confirmPassword')}
          required
        />

        <Button type="submit" variant="primary" block disabled={submitting}>
          {submitting ? 'Creating account...' : 'Create account'}
        </Button>
      </form>

      <p className="coin-auth__footer">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </AuthShell>
  )
}
