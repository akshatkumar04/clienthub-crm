import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api, { getErrorMessage, unwrap } from '../api/client';
import ActivityForm from '../components/ActivityForm';
import { EmptyState, Modal, PageHeader, Pagination, Spinner } from '../components/ui';
import { formatDate, isOverdue, titleCase } from '../utils/format';

const TYPE_ICONS = { call: '📞', email: '✉️', meeting: '🤝', note: '📝' };

const relatedName = (a) => a.relatedTo?.item?.name || a.relatedTo?.item?.title || 'Deleted record';

export default function Activities() {
  const [followUps, setFollowUps] = useState(null);
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const [logging, setLogging] = useState(false);

  const load = useCallback(async () => {
    try {
      const params = { page, limit: 10 };
      if (filter) params.completed = filter;
      const [pending, all] = await Promise.all([
        unwrap(api.get('/activities/follow-ups')),
        unwrap(api.get('/activities', { params })),
      ]);
      setFollowUps(pending);
      setData(all);
    } catch (err) {
      toast.error(getErrorMessage(err));
      setFollowUps((v) => v || []);
      setData((v) => v || { items: [], pagination: null });
    }
  }, [page, filter]);

  useEffect(() => {
    load();
  }, [load]);

  const complete = async (a) => {
    try {
      await api.put(`/activities/${a._id}`, { completed: true });
      toast.success('Follow-up completed');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div>
      <PageHeader
        title="Activities"
        subtitle="Calls, emails, meetings and the follow-ups that need you today."
        actions={
          <button className="btn-primary" onClick={() => setLogging(true)}>
            + Log activity
          </button>
        }
      />

      <section className="card mb-6">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="font-semibold text-slate-900">Pending follow-ups</h2>
          {followUps && (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
              {followUps.length} due
            </span>
          )}
        </div>
        {followUps === null ? (
          <Spinner />
        ) : followUps.length === 0 ? (
          <EmptyState title="You're all caught up" message="Nothing is due today or overdue." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {followUps.map((a) => (
              <li key={a._id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="text-xl" aria-hidden>
                  {TYPE_ICONS[a.type]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-800">
                    <span className="font-medium">{relatedName(a)}</span>
                    <span className="text-slate-400"> · {a.relatedTo.kind}</span>
                  </p>
                  <p className="truncate text-xs text-slate-500">{a.description}</p>
                </div>
                <span
                  className={`text-xs font-medium ${
                    isOverdue(a.followUpDate) ? 'text-red-600' : 'text-amber-600'
                  }`}
                >
                  {isOverdue(a.followUpDate) ? 'Overdue · ' : 'Due today · '}
                  {formatDate(a.followUpDate)}
                </span>
                <button className="btn-secondary btn-sm" onClick={() => complete(a)}>
                  Mark done
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <h2 className="font-semibold text-slate-900">All activity</h2>
          <select
            className="input w-auto"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All</option>
            <option value="false">Open</option>
            <option value="true">Completed</option>
          </select>
        </div>
        {data === null ? (
          <Spinner />
        ) : data.items.length === 0 ? (
          <EmptyState title="No activities yet" message="Log your first call, email or meeting." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">Type</th>
                  <th className="th">Description</th>
                  <th className="th">Related to</th>
                  <th className="th">Follow-up</th>
                  <th className="th">Logged</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((a) => (
                  <tr key={a._id} className="hover:bg-slate-50">
                    <td className="td whitespace-nowrap">
                      {TYPE_ICONS[a.type]} {titleCase(a.type)}
                    </td>
                    <td className={`td ${a.completed ? 'text-slate-400 line-through' : ''}`}>
                      {a.description}
                    </td>
                    <td className="td">
                      {relatedName(a)}{' '}
                      <span className="text-xs text-slate-400">({a.relatedTo.kind})</span>
                    </td>
                    <td className="td whitespace-nowrap">
                      {a.followUpDate ? formatDate(a.followUpDate) : '—'}
                      {a.completed && <span className="ml-1 text-xs text-green-600">✓ done</span>}
                    </td>
                    <td className="td whitespace-nowrap">{formatDate(a.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination pagination={data?.pagination} onPage={setPage} />
      </section>

      {logging && (
        <Modal title="Log activity" onClose={() => setLogging(false)}>
          <ActivityForm
            onCancel={() => setLogging(false)}
            onSaved={() => {
              setLogging(false);
              load();
            }}
          />
        </Modal>
      )}
    </div>
  );
}
