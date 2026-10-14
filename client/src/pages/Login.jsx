import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../api/client';
import { isEmail } from '../utils/validate';
import { Field, Spinner } from '../components/ui';

export default function Login() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <Spinner />;
  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!isEmail(form.email)) next.email = 'Enter a valid email address';
    if (!form.password) next.password = 'Password is required';
    setErrors(next);
    if (Object.keys(next).length) return;

    setSubmitting(true);
    try {
      const loggedIn = await login(form.email, form.password);
      toast.success(`Welcome back, ${loggedIn.name.split(' ')[0]}!`);
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 to-indigo-900 p-4">
      <div className="card w-full max-w-md p-8">
        <h1 className="text-3xl font-bold text-slate-900">
          Client<span className="text-brand-500">Hub</span>
        </h1>
        <p className="mb-6 mt-1 text-sm text-slate-500">
          Sign in to manage your leads and pipeline.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Field label="Email" error={errors.email}>
            <input
              type="email"
              className="input mt-1"
              value={form.email}
              onChange={set('email')}
              autoComplete="username"
              placeholder="you@company.in"
            />
          </Field>
          <Field label="Password" error={errors.password}>
            <input
              type="password"
              className="input mt-1"
              value={form.password}
              onChange={set('password')}
              autoComplete="current-password"
            />
          </Field>
          <button className="btn-primary w-full" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-slate-400">
          Accounts are created by an administrator.
        </p>
      </div>
    </div>
  );
}
