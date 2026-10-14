import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api, { getErrorMessage, unwrap } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useDebounce, useUsers } from '../hooks';
import { formatDate } from '../utils/format';
import { validatePerson } from '../utils/validate';
import {
  ConfirmModal,
  EmptyState,
  Field,
  Modal,
  PageHeader,
  Pagination,
  Spinner,
} from '../components/ui';

const EMPTY = { name: '', company: '', email: '', phone: '', designation: '', owner: '' };

function ContactForm({ contact, users, isAdmin, onClose, onSaved }) {
  const [form, setForm] = useState(
    contact ? { ...EMPTY, ...contact, owner: contact.owner?._id || '' } : EMPTY
  );
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const found = validatePerson(form);
    setErrors(found);
    if (Object.keys(found).length) return;

    const payload = {
      name: form.name,
      company: form.company,
      email: form.email,
      phone: form.phone,
      designation: form.designation,
    };
    if (isAdmin && form.owner) payload.owner = form.owner;
    setSaving(true);
    try {
      if (contact) await api.put(`/contacts/${contact._id}`, payload);
      else await api.post('/contacts', payload);
      toast.success(contact ? 'Contact updated' : 'Contact created');
      onSaved();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={contact ? 'Edit contact' : 'New contact'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name *" error={errors.name}>
            <input className="input mt-1" value={form.name} onChange={set('name')} />
          </Field>
          <Field label="Company">
            <input className="input mt-1" value={form.company} onChange={set('company')} />
          </Field>
          <Field label="Designation">
            <input className="input mt-1" value={form.designation} onChange={set('designation')} />
          </Field>
          <Field label="Phone" error={errors.phone}>
            <input className="input mt-1" value={form.phone} onChange={set('phone')} />
          </Field>
          <Field label="Email" error={errors.email}>
            <input type="email" className="input mt-1" value={form.email} onChange={set('email')} />
          </Field>
          {isAdmin && (
            <Field label="Owner">
              <select className="input mt-1" value={form.owner} onChange={set('owner')}>
                <option value="">Me</option>
                {users.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save contact'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function Contacts() {
  const { isAdmin } = useAuth();
  const users = useUsers();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const search = useDebounce(searchText);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (search) params.search = search;
      setData(await unwrap(api.get('/contacts', { params })));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    load();
  }, [load]);

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await api.delete(`/contacts/${deleting._id}`);
      toast.success('Contact deleted');
      setDeleting(null);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  };

  const items = data?.items || [];

  return (
    <div>
      <PageHeader
        title="Contacts"
        subtitle="People and companies you do business with."
        actions={
          <button className="btn-primary" onClick={() => setEditing('new')}>
            + New contact
          </button>
        }
      />
      <div className="card">
        <div className="border-b border-slate-200 p-4">
          <input
            className="input sm:max-w-sm"
            placeholder="Search name, company or email…"
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value);
              setPage(1);
            }}
          />
        </div>

        {loading && !data ? (
          <Spinner />
        ) : items.length === 0 ? (
          <EmptyState
            title="No contacts found"
            message="Add a contact or convert a lead to create one."
          />
        ) : (
          <div className={`overflow-x-auto ${loading ? 'opacity-60' : ''}`}>
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">Name</th>
                  <th className="th">Company</th>
                  <th className="th">Email / Phone</th>
                  <th className="th">Owner</th>
                  <th className="th">Added</th>
                  <th className="th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-50">
                    <td className="td">
                      <div className="font-medium text-slate-900">{c.name}</div>
                      <div className="text-xs text-slate-500">{c.designation || '—'}</div>
                    </td>
                    <td className="td">{c.company || '—'}</td>
                    <td className="td text-slate-600">
                      <div>{c.email || '—'}</div>
                      <div className="text-xs">{c.phone}</div>
                    </td>
                    <td className="td">{c.owner?.name}</td>
                    <td className="td whitespace-nowrap">{formatDate(c.createdAt)}</td>
                    <td className="td">
                      <div className="flex justify-end gap-1.5">
                        <button className="btn-secondary btn-sm" onClick={() => setEditing(c)}>
                          Edit
                        </button>
                        <button
                          className="btn-secondary btn-sm text-red-600"
                          onClick={() => setDeleting(c)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination pagination={data?.pagination} onPage={setPage} />
      </div>

      {editing && (
        <ContactForm
          contact={editing === 'new' ? null : editing}
          users={users}
          isAdmin={isAdmin}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
      {deleting && (
        <ConfirmModal
          title="Delete contact"
          message={`Delete ${deleting.name}? Contacts that still have deals cannot be deleted.`}
          onConfirm={confirmDelete}
          onClose={() => setDeleting(null)}
          busy={busy}
        />
      )}
    </div>
  );
}
