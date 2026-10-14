import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api, { getErrorMessage, unwrap } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../utils/format';
import { isEmail } from '../utils/validate';
import { ConfirmModal, EmptyState, Field, Modal, PageHeader, Spinner } from '../components/ui';

function UserForm({ user, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    role: user?.role || 'sales_exec',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const found = {};
    if (!form.name.trim()) found.name = 'Name is required';
    if (!isEmail(form.email)) found.email = 'Enter a valid email address';
    if (!user && form.password.length < 8)
      found.password = 'Password must be at least 8 characters';
    if (user && form.password && form.password.length < 8) {
      found.password = 'Password must be at least 8 characters';
    }
    setErrors(found);
    if (Object.keys(found).length) return;

    const payload = { ...form };
    if (!payload.password) delete payload.password;
    setSaving(true);
    try {
      if (user) await api.put(`/users/${user._id}`, payload);
      else await api.post('/users', payload);
      toast.success(user ? 'User updated' : 'User created');
      onSaved();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={user ? 'Edit user' : 'New user'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Name" error={errors.name}>
          <input className="input mt-1" value={form.name} onChange={set('name')} />
        </Field>
        <Field label="Email" error={errors.email}>
          <input type="email" className="input mt-1" value={form.email} onChange={set('email')} />
        </Field>
        <Field
          label={user ? 'New password (leave blank to keep)' : 'Password'}
          error={errors.password}
        >
          <input
            type="password"
            className="input mt-1"
            value={form.password}
            onChange={set('password')}
            autoComplete="new-password"
          />
        </Field>
        <Field label="Role">
          <select className="input mt-1" value={form.role} onChange={set('role')}>
            <option value="sales_exec">Sales Executive</option>
            <option value="admin">Admin</option>
          </select>
        </Field>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save user'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function Users() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState(null);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setUsers(await unwrap(api.get('/users')));
    } catch (err) {
      toast.error(getErrorMessage(err));
      setUsers([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await api.delete(`/users/${deleting._id}`);
      toast.success('User deleted');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeleting(null);
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle="Create accounts for your sales team and manage roles."
        actions={
          <button className="btn-primary" onClick={() => setEditing('new')}>
            + New user
          </button>
        }
      />
      <div className="card">
        {users === null ? (
          <Spinner />
        ) : users.length === 0 ? (
          <EmptyState title="No users" />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">Name</th>
                  <th className="th">Email</th>
                  <th className="th">Role</th>
                  <th className="th">Created</th>
                  <th className="th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-50">
                    <td className="td font-medium text-slate-900">
                      {u.name}{' '}
                      {u._id === me._id && <span className="text-xs text-slate-400">(you)</span>}
                    </td>
                    <td className="td">{u.email}</td>
                    <td className="td">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          u.role === 'admin'
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {u.role === 'admin' ? 'Admin' : 'Sales Executive'}
                      </span>
                    </td>
                    <td className="td">{formatDate(u.createdAt)}</td>
                    <td className="td">
                      <div className="flex justify-end gap-1.5">
                        <button className="btn-secondary btn-sm" onClick={() => setEditing(u)}>
                          Edit
                        </button>
                        {u._id !== me._id && (
                          <button
                            className="btn-secondary btn-sm text-red-600"
                            onClick={() => setDeleting(u)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <UserForm
          user={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
      {deleting && (
        <ConfirmModal
          title="Delete user"
          message={`Delete ${deleting.name}? Users who still own leads, contacts or deals cannot be deleted.`}
          onConfirm={confirmDelete}
          onClose={() => setDeleting(null)}
          busy={busy}
        />
      )}
    </div>
  );
}
