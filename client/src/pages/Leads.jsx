import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api, { getErrorMessage, unwrap } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useDebounce, useUsers } from '../hooks';
import { LEAD_SOURCES, LEAD_STATUSES } from '../utils/constants';
import { formatDate, titleCase, toDateInput } from '../utils/format';
import { validatePerson } from '../utils/validate';
import ActivityPanel from '../components/ActivityPanel';
import {
  Badge,
  ConfirmModal,
  EmptyState,
  Field,
  Modal,
  PageHeader,
  Pagination,
  Spinner,
} from '../components/ui';

const EMPTY_LEAD = {
  name: '',
  company: '',
  email: '',
  phone: '',
  source: 'website',
  status: 'new',
  notes: '',
  assignedTo: '',
};

function LeadForm({ lead, users, isAdmin, onClose, onSaved }) {
  const [form, setForm] = useState(
    lead ? { ...EMPTY_LEAD, ...lead, assignedTo: lead.assignedTo?._id || '' } : EMPTY_LEAD
  );
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const found = validatePerson(form);
    setErrors(found);
    if (Object.keys(found).length) return;

    const payload = { ...form };
    if (!isAdmin || !payload.assignedTo) delete payload.assignedTo;
    setSaving(true);
    try {
      if (lead) await api.put(`/leads/${lead._id}`, payload);
      else await api.post('/leads', payload);
      toast.success(lead ? 'Lead updated' : 'Lead created');
      onSaved();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={lead ? 'Edit lead' : 'New lead'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name *" error={errors.name}>
            <input className="input mt-1" value={form.name} onChange={set('name')} />
          </Field>
          <Field label="Company">
            <input className="input mt-1" value={form.company} onChange={set('company')} />
          </Field>
          <Field label="Email" error={errors.email}>
            <input type="email" className="input mt-1" value={form.email} onChange={set('email')} />
          </Field>
          <Field label="Phone" error={errors.phone}>
            <input className="input mt-1" value={form.phone} onChange={set('phone')} />
          </Field>
          <Field label="Source">
            <select className="input mt-1" value={form.source} onChange={set('source')}>
              {LEAD_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {titleCase(s)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select className="input mt-1" value={form.status} onChange={set('status')}>
              {LEAD_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {titleCase(s)}
                </option>
              ))}
            </select>
          </Field>
          {isAdmin && (
            <Field label="Assigned to">
              <select className="input mt-1" value={form.assignedTo} onChange={set('assignedTo')}>
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
        <Field label="Notes">
          <textarea className="input mt-1" rows={3} value={form.notes} onChange={set('notes')} />
        </Field>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save lead'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ConvertModal({ lead, onClose, onDone }) {
  const [form, setForm] = useState(() => ({
    dealTitle: `${lead.company || lead.name} - New Opportunity`,
    value: '',
    expectedCloseDate: toDateInput(new Date(Date.now() + 30 * 864e5).toISOString()),
  }));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const found = {};
    if (!form.dealTitle.trim()) found.dealTitle = 'Deal title is required';
    if (form.value === '' || Number(form.value) < 0) found.value = 'Enter the deal value in ₹';
    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    try {
      await api.post(`/leads/${lead._id}/convert`, { ...form, value: Number(form.value) });
      toast.success('Lead converted to contact and deal');
      onDone();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`Convert ${lead.name}`} onClose={onClose}>
      <p className="mb-4 text-sm text-slate-500">
        This creates a contact and a deal (in the Qualified stage) and marks the lead as qualified.
      </p>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Deal title" error={errors.dealTitle}>
          <input
            className="input mt-1"
            value={form.dealTitle}
            onChange={(e) => setForm({ ...form, dealTitle: e.target.value })}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Deal value (₹)" error={errors.value}>
            <input
              type="number"
              min="0"
              className="input mt-1"
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
            />
          </Field>
          <Field label="Expected close date">
            <input
              type="date"
              className="input mt-1"
              value={form.expectedCloseDate}
              onChange={(e) => setForm({ ...form, expectedCloseDate: e.target.value })}
            />
          </Field>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" disabled={saving}>
            {saving ? 'Converting…' : 'Convert'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function Leads() {
  const { isAdmin } = useAuth();
  const users = useUsers();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', status: '', source: '', assignedTo: '' });
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null); // null | 'new' | lead
  const [converting, setConverting] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [activityLead, setActivityLead] = useState(null);

  const search = useDebounce(filters.search);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (search) params.search = search;
      ['status', 'source', 'assignedTo'].forEach((k) => filters[k] && (params[k] = filters[k]));
      setData(await unwrap(api.get('/leads', { params })));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, search, filters.status, filters.source, filters.assignedTo]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load();
  }, [load]);

  const changeFilter = (key) => (e) => {
    setFilters({ ...filters, [key]: e.target.value });
    setPage(1);
  };

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await api.delete(`/leads/${deleting._id}`);
      toast.success('Lead deleted');
      setDeleting(null);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const items = data?.items || [];

  return (
    <div>
      <PageHeader
        title="Leads"
        subtitle="Capture, qualify and convert prospects."
        actions={
          <button className="btn-primary" onClick={() => setEditing('new')}>
            + New lead
          </button>
        }
      />

      <div className="card">
        <div className="grid gap-3 border-b border-slate-200 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <input
            className="input"
            placeholder="Search name or company…"
            value={filters.search}
            onChange={changeFilter('search')}
          />
          <select className="input" value={filters.status} onChange={changeFilter('status')}>
            <option value="">All statuses</option>
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {titleCase(s)}
              </option>
            ))}
          </select>
          <select className="input" value={filters.source} onChange={changeFilter('source')}>
            <option value="">All sources</option>
            {LEAD_SOURCES.map((s) => (
              <option key={s} value={s}>
                {titleCase(s)}
              </option>
            ))}
          </select>
          {isAdmin && (
            <select
              className="input"
              value={filters.assignedTo}
              onChange={changeFilter('assignedTo')}
            >
              <option value="">All owners</option>
              {users.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {loading && !data ? (
          <Spinner />
        ) : items.length === 0 ? (
          <EmptyState
            title="No leads found"
            message="Try changing the filters, or add your first lead."
            action={
              <button className="btn-primary" onClick={() => setEditing('new')}>
                + New lead
              </button>
            }
          />
        ) : (
          <div className={`overflow-x-auto ${loading ? 'opacity-60' : ''}`}>
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">Lead</th>
                  <th className="th">Contact</th>
                  <th className="th">Source</th>
                  <th className="th">Status</th>
                  <th className="th">Owner</th>
                  <th className="th">Created</th>
                  <th className="th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((lead) => (
                  <tr key={lead._id} className="hover:bg-slate-50">
                    <td className="td">
                      <div className="font-medium text-slate-900">{lead.name}</div>
                      <div className="text-xs text-slate-500">{lead.company || '—'}</div>
                    </td>
                    <td className="td text-slate-600">
                      <div>{lead.email || '—'}</div>
                      <div className="text-xs">{lead.phone}</div>
                    </td>
                    <td className="td">{titleCase(lead.source)}</td>
                    <td className="td">
                      <Badge value={lead.status} />
                    </td>
                    <td className="td">{lead.assignedTo?.name}</td>
                    <td className="td whitespace-nowrap">{formatDate(lead.createdAt)}</td>
                    <td className="td">
                      <div className="flex justify-end gap-1.5">
                        <button
                          className="btn-secondary btn-sm"
                          onClick={() => setActivityLead(lead)}
                        >
                          Activity
                        </button>
                        <button
                          className="btn-secondary btn-sm"
                          onClick={() => setConverting(lead)}
                        >
                          Convert
                        </button>
                        <button className="btn-secondary btn-sm" onClick={() => setEditing(lead)}>
                          Edit
                        </button>
                        <button
                          className="btn-secondary btn-sm text-red-600"
                          onClick={() => setDeleting(lead)}
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
        <LeadForm
          lead={editing === 'new' ? null : editing}
          users={users}
          isAdmin={isAdmin}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
      {converting && (
        <ConvertModal
          lead={converting}
          onClose={() => setConverting(null)}
          onDone={() => {
            setConverting(null);
            load();
          }}
        />
      )}
      {deleting && (
        <ConfirmModal
          title="Delete lead"
          message={`Delete ${deleting.name}? Their activities will be deleted too.`}
          onConfirm={confirmDelete}
          onClose={() => setDeleting(null)}
          busy={busy}
        />
      )}
      {activityLead && (
        <ActivityPanel
          kind="Lead"
          item={activityLead._id}
          title={`Activities · ${activityLead.name}`}
          onClose={() => setActivityLead(null)}
        />
      )}
    </div>
  );
}
