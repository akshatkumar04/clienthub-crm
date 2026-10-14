import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api, { getErrorMessage, unwrap } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useUsers } from '../hooks';
import { DEAL_STAGES, STAGE_COLORS } from '../utils/constants';
import { formatDate, formatINR, formatINRCompact, titleCase, toDateInput } from '../utils/format';
import ActivityPanel from '../components/ActivityPanel';
import {
  Badge,
  ConfirmModal,
  EmptyState,
  Field,
  Modal,
  PageHeader,
  Spinner,
} from '../components/ui';

function DealForm({ deal, contacts, users, isAdmin, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: deal?.title || '',
    value: deal?.value ?? '',
    stage: deal?.stage || 'new',
    contact: deal?.contact?._id || '',
    owner: deal?.owner?._id || '',
    expectedCloseDate: toDateInput(deal?.expectedCloseDate),
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const found = {};
    if (!form.title.trim()) found.title = 'Title is required';
    if (form.value === '' || Number(form.value) < 0) found.value = 'Enter a value of ₹0 or more';
    if (!form.contact) found.contact = 'Choose a contact';
    setErrors(found);
    if (Object.keys(found).length) return;

    const payload = {
      title: form.title,
      value: Number(form.value),
      stage: form.stage,
      contact: form.contact,
      expectedCloseDate: form.expectedCloseDate || '',
    };
    if (isAdmin && form.owner) payload.owner = form.owner;
    setSaving(true);
    try {
      if (deal) await api.put(`/deals/${deal._id}`, payload);
      else await api.post('/deals', payload);
      toast.success(deal ? 'Deal updated' : 'Deal created');
      onSaved();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={deal ? 'Edit deal' : 'New deal'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Title *" error={errors.title}>
          <input className="input mt-1" value={form.title} onChange={set('title')} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Value (₹) *" error={errors.value}>
            <input
              type="number"
              min="0"
              className="input mt-1"
              value={form.value}
              onChange={set('value')}
            />
          </Field>
          <Field label="Stage">
            <select className="input mt-1" value={form.stage} onChange={set('stage')}>
              {DEAL_STAGES.map((s) => (
                <option key={s} value={s}>
                  {titleCase(s)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Contact *" error={errors.contact}>
            <select className="input mt-1" value={form.contact} onChange={set('contact')}>
              <option value="">Select a contact…</option>
              {contacts.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                  {c.company ? ` · ${c.company}` : ''}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Expected close date">
            <input
              type="date"
              className="input mt-1"
              value={form.expectedCloseDate}
              onChange={set('expectedCloseDate')}
            />
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
            {saving ? 'Saving…' : 'Save deal'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function DealCard({ deal, isAdmin, onStage, onEdit, onDelete, onActivity }) {
  return (
    <div
      draggable
      onDragStart={(e) => e.dataTransfer.setData('text/plain', deal._id)}
      className="cursor-grab rounded-lg border border-slate-200 bg-white p-3 shadow-sm active:cursor-grabbing"
    >
      <p className="text-sm font-semibold text-slate-900">{deal.title}</p>
      <p className="mt-0.5 text-xs text-slate-500">
        {deal.contact?.name}
        {deal.contact?.company ? ` · ${deal.contact.company}` : ''}
      </p>
      <p className="mt-2 text-base font-bold text-slate-900">{formatINR(deal.value)}</p>
      <p className="text-xs text-slate-500">
        Close: {formatDate(deal.expectedCloseDate)}
        {isAdmin && deal.owner ? ` · ${deal.owner.name}` : ''}
      </p>
      <select
        aria-label={`Change stage of ${deal.title}`}
        className="input mt-2 py-1 text-xs"
        value={deal.stage}
        onChange={(e) => onStage(deal, e.target.value)}
      >
        {DEAL_STAGES.map((s) => (
          <option key={s} value={s}>
            {titleCase(s)}
          </option>
        ))}
      </select>
      <div className="mt-2 flex gap-1.5">
        <button className="btn-secondary btn-sm" onClick={() => onActivity(deal)}>
          Activity
        </button>
        <button className="btn-secondary btn-sm" onClick={() => onEdit(deal)}>
          Edit
        </button>
        <button className="btn-secondary btn-sm text-red-600" onClick={() => onDelete(deal)}>
          Delete
        </button>
      </div>
    </div>
  );
}

export default function Pipeline() {
  const { isAdmin } = useAuth();
  const users = useUsers();
  const [deals, setDeals] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [view, setView] = useState('board');
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [activityDeal, setActivityDeal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await unwrap(api.get('/deals', { params: { limit: 200 } }));
      setDeals(data.items);
    } catch (err) {
      toast.error(getErrorMessage(err));
      setDeals([]);
    }
  }, []);

  useEffect(() => {
    load();
    unwrap(api.get('/contacts', { params: { limit: 200 } }))
      .then((d) => setContacts(d.items))
      .catch(() => setContacts([]));
  }, [load]);

  const byStage = useMemo(() => {
    const groups = Object.fromEntries(DEAL_STAGES.map((s) => [s, []]));
    (deals || []).forEach((d) => groups[d.stage].push(d));
    return groups;
  }, [deals]);

  const changeStage = async (deal, stage) => {
    if (deal.stage === stage) return;
    const previous = deals;
    // Optimistic update so the card jumps immediately; rolled back on failure
    setDeals(deals.map((d) => (d._id === deal._id ? { ...d, stage } : d)));
    try {
      await api.patch(`/deals/${deal._id}/stage`, { stage });
      toast.success(`Moved to ${titleCase(stage)}`);
    } catch (err) {
      setDeals(previous);
      toast.error(getErrorMessage(err));
    }
  };

  const onDrop = (stage) => (e) => {
    e.preventDefault();
    setDragOver(null);
    const deal = deals.find((d) => d._id === e.dataTransfer.getData('text/plain'));
    if (deal) changeStage(deal, stage);
  };

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await api.delete(`/deals/${deleting._id}`);
      toast.success('Deal deleted');
      setDeleting(null);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const actions = (
    <>
      <div className="inline-flex overflow-hidden rounded-lg border border-slate-300 bg-white text-sm">
        {['board', 'table'].map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-3 py-1.5 font-medium ${
              view === v ? 'bg-brand-500 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {titleCase(v)}
          </button>
        ))}
      </div>
      <button className="btn-primary" onClick={() => setEditing('new')}>
        + New deal
      </button>
    </>
  );

  return (
    <div>
      <PageHeader
        title="Pipeline"
        subtitle="Drag a card, or use its dropdown, to change stage."
        actions={actions}
      />

      {deals === null ? (
        <Spinner />
      ) : deals.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No deals yet"
            message="Create a deal, or convert a qualified lead from the Leads page."
          />
        </div>
      ) : view === 'board' ? (
        <div className="grid gap-4 overflow-x-auto pb-4 md:grid-cols-5">
          {DEAL_STAGES.map((stage) => {
            const list = byStage[stage];
            const total = list.reduce((sum, d) => sum + d.value, 0);
            return (
              <section
                key={stage}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(stage);
                }}
                onDragLeave={() => setDragOver(null)}
                onDrop={onDrop(stage)}
                className={`min-w-[220px] rounded-xl bg-slate-100 p-3 transition ${
                  dragOver === stage ? 'ring-2 ring-brand-500' : ''
                }`}
              >
                <header className="mb-3 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: STAGE_COLORS[stage] }}
                    />
                    {titleCase(stage)}
                    <span className="rounded-full bg-white px-2 text-xs text-slate-500">
                      {list.length}
                    </span>
                  </h2>
                  <span className="text-xs font-medium text-slate-500">
                    {formatINRCompact(total)}
                  </span>
                </header>
                <div className="space-y-3">
                  {list.length === 0 && (
                    <p className="rounded-lg border border-dashed border-slate-300 py-6 text-center text-xs text-slate-400">
                      No deals
                    </p>
                  )}
                  {list.map((deal) => (
                    <DealCard
                      key={deal._id}
                      deal={deal}
                      isAdmin={isAdmin}
                      onStage={changeStage}
                      onEdit={setEditing}
                      onDelete={setDeleting}
                      onActivity={setActivityDeal}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">Deal</th>
                <th className="th">Contact</th>
                <th className="th">Value</th>
                <th className="th">Stage</th>
                <th className="th">Close date</th>
                <th className="th">Owner</th>
                <th className="th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {deals.map((d) => (
                <tr key={d._id} className="hover:bg-slate-50">
                  <td className="td font-medium text-slate-900">{d.title}</td>
                  <td className="td">{d.contact?.name}</td>
                  <td className="td whitespace-nowrap">{formatINR(d.value)}</td>
                  <td className="td">
                    <select
                      aria-label={`Stage of ${d.title}`}
                      className="input w-auto py-1 text-xs"
                      value={d.stage}
                      onChange={(e) => changeStage(d, e.target.value)}
                    >
                      {DEAL_STAGES.map((s) => (
                        <option key={s} value={s}>
                          {titleCase(s)}
                        </option>
                      ))}
                    </select>
                    <span className="ml-2 hidden sm:inline">
                      <Badge value={d.stage} />
                    </span>
                  </td>
                  <td className="td whitespace-nowrap">{formatDate(d.expectedCloseDate)}</td>
                  <td className="td">{d.owner?.name}</td>
                  <td className="td">
                    <div className="flex justify-end gap-1.5">
                      <button className="btn-secondary btn-sm" onClick={() => setActivityDeal(d)}>
                        Activity
                      </button>
                      <button className="btn-secondary btn-sm" onClick={() => setEditing(d)}>
                        Edit
                      </button>
                      <button
                        className="btn-secondary btn-sm text-red-600"
                        onClick={() => setDeleting(d)}
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

      {editing && (
        <DealForm
          deal={editing === 'new' ? null : editing}
          contacts={contacts}
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
          title="Delete deal"
          message={`Delete "${deleting.title}"? Its activities will be deleted too.`}
          onConfirm={confirmDelete}
          onClose={() => setDeleting(null)}
          busy={busy}
        />
      )}
      {activityDeal && (
        <ActivityPanel
          kind="Deal"
          item={activityDeal._id}
          title={`Activities · ${activityDeal.title}`}
          onClose={() => setActivityDeal(null)}
        />
      )}
    </div>
  );
}
