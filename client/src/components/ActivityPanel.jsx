import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api, { getErrorMessage, unwrap } from '../api/client';
import { formatDate, isOverdue, titleCase } from '../utils/format';
import ActivityForm from './ActivityForm';
import { EmptyState, Modal, Spinner } from './ui';

const TYPE_ICONS = { call: '📞', email: '✉️', meeting: '🤝', note: '📝' };

/** Modal showing the activity history of one lead/deal plus a form to log a new one. */
export default function ActivityPanel({ kind, item, title, onClose }) {
  const [items, setItems] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await unwrap(api.get('/activities', { params: { kind, item, limit: 100 } }));
      setItems(data.items);
    } catch (err) {
      toast.error(getErrorMessage(err));
      setItems([]);
    }
  }, [kind, item]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (a) => {
    try {
      await api.put(`/activities/${a._id}`, { completed: !a.completed });
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const remove = async (a) => {
    try {
      await api.delete(`/activities/${a._id}`);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <Modal title={title} onClose={onClose} wide>
      <ActivityForm related={{ kind, item }} onSaved={load} />
      <hr className="my-5 border-slate-200" />
      {items === null ? (
        <Spinner />
      ) : items.length === 0 ? (
        <EmptyState title="No activities yet" message="Log a call, email, meeting or note above." />
      ) : (
        <ul className="space-y-3">
          {items.map((a) => (
            <li
              key={a._id}
              className="flex items-start gap-3 rounded-lg border border-slate-200 p-3"
            >
              <span className="text-xl" aria-hidden>
                {TYPE_ICONS[a.type]}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm ${a.completed ? 'text-slate-400 line-through' : 'text-slate-800'}`}
                >
                  <span className="font-medium">{titleCase(a.type)}:</span> {a.description}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Logged {formatDate(a.createdAt)}
                  {a.followUpDate && (
                    <span
                      className={
                        !a.completed && isOverdue(a.followUpDate) ? 'font-medium text-red-600' : ''
                      }
                    >
                      {' '}
                      · Follow-up {formatDate(a.followUpDate)}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex gap-1.5">
                {a.followUpDate && (
                  <button className="btn-secondary btn-sm" onClick={() => toggle(a)}>
                    {a.completed ? 'Reopen' : 'Done'}
                  </button>
                )}
                <button className="btn-secondary btn-sm text-red-600" onClick={() => remove(a)}>
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
