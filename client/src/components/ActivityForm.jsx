import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api, { getErrorMessage, unwrap } from '../api/client';
import { ACTIVITY_TYPES } from '../utils/constants';
import { titleCase } from '../utils/format';
import { Field } from './ui';

/**
 * Logs an activity. When `related` ({ kind, item }) is supplied the activity is attached to
 * it directly; otherwise the user picks a lead or deal from a dropdown.
 */
export default function ActivityForm({ related, onSaved, onCancel }) {
  const [form, setForm] = useState({
    type: 'call',
    description: '',
    followUpDate: '',
    kind: related?.kind || 'Lead',
    item: related?.item || '',
  });
  const [options, setOptions] = useState([]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  // Load pick-list when the form is not tied to a specific record
  useEffect(() => {
    if (related) return;
    const path = form.kind === 'Lead' ? '/leads' : '/deals';
    unwrap(api.get(path, { params: { limit: 200 } }))
      .then((d) => setOptions(d.items))
      .catch(() => setOptions([]));
  }, [related, form.kind]);

  const submit = async (e) => {
    e.preventDefault();
    const found = {};
    if (!form.description.trim()) found.description = 'Description is required';
    if (!form.item) found.item = 'Choose a lead or deal';
    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    try {
      await api.post('/activities', {
        type: form.type,
        description: form.description,
        followUpDate: form.followUpDate || undefined,
        relatedTo: { kind: form.kind, item: form.item },
      });
      toast.success('Activity logged');
      setForm({ ...form, description: '', followUpDate: '' });
      onSaved();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {!related && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Related to">
            <select
              className="input mt-1"
              value={form.kind}
              onChange={(e) => setForm({ ...form, kind: e.target.value, item: '' })}
            >
              <option value="Lead">Lead</option>
              <option value="Deal">Deal</option>
            </select>
          </Field>
          <Field label={form.kind} error={errors.item}>
            <select className="input mt-1" value={form.item} onChange={set('item')}>
              <option value="">Select…</option>
              {options.map((o) => (
                <option key={o._id} value={o._id}>
                  {o.name || o.title}
                </option>
              ))}
            </select>
          </Field>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Type">
          <select className="input mt-1" value={form.type} onChange={set('type')}>
            {ACTIVITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {titleCase(t)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Follow-up date (optional)">
          <input
            type="date"
            className="input mt-1"
            value={form.followUpDate}
            onChange={set('followUpDate')}
          />
        </Field>
      </div>
      <Field label="Description" error={errors.description}>
        <textarea
          className="input mt-1"
          rows={2}
          value={form.description}
          onChange={set('description')}
        />
      </Field>
      <div className="flex justify-end gap-2">
        {onCancel && (
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button className="btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Log activity'}
        </button>
      </div>
    </form>
  );
}
