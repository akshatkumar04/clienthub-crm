import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import toast from 'react-hot-toast';
import api, { getErrorMessage, unwrap } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { EmptyState, PageHeader, Spinner } from '../components/ui';
import { SOURCE_COLORS, STAGE_COLORS } from '../utils/constants';
import { formatINR, formatINRCompact, titleCase } from '../utils/format';

function StatCard({ label, value, hint, to }) {
  const body = (
    <div className="card h-full p-5 transition hover:shadow-md">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

function StageTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-lg">
      <p className="font-semibold text-slate-900">{titleCase(row.stage)}</p>
      <p className="text-slate-600">
        {row.count} {row.count === 1 ? 'deal' : 'deals'}
      </p>
      <p className="text-slate-600">{formatINR(row.value)}</p>
    </div>
  );
}

export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    unwrap(api.get('/dashboard'))
      .then(setData)
      .catch((err) => {
        toast.error(getErrorMessage(err));
        setData(false);
      });
  }, []);

  if (data === null) return <Spinner />;
  if (data === false)
    return <EmptyState title="Could not load the dashboard" message="Please try again." />;

  const stageData = data.dealsByStage;
  const sourceData = data.leadsBySource.filter((s) => s.count > 0);
  const hasDeals = stageData.some((s) => s.count > 0);

  return (
    <div>
      <PageHeader
        title={`Hello, ${user.name.split(' ')[0]}`}
        subtitle={
          isAdmin
            ? 'Team-wide performance across all sales executives.'
            : 'Your personal pipeline and follow-ups.'
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Open pipeline value"
          value={formatINRCompact(data.pipelineValue)}
          hint={`${formatINR(data.pipelineValue)} across ${data.openDeals} open deals`}
          to="/pipeline"
        />
        <StatCard
          label="Conversion rate"
          value={`${data.conversionRate}%`}
          hint="Won ÷ (Won + Lost)"
        />
        <StatCard
          label="Pending follow-ups"
          value={data.pendingFollowUps}
          hint="Due today or overdue"
          to="/activities"
        />
        <StatCard
          label="Total leads"
          value={data.totalLeads}
          hint={`Won revenue ${formatINRCompact(data.wonValue)}`}
          to="/leads"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="font-semibold text-slate-900">Deals by stage</h2>
          <p className="mb-4 text-xs text-slate-500">Number of deals in each pipeline stage</p>
          {hasDeals ? (
            <div className="h-72" role="img" aria-label="Bar chart of deal counts by stage">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stageData} margin={{ top: 16, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="stage"
                    tickFormatter={titleCase}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12, fill: '#64748b' }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12, fill: '#64748b' }}
                  />
                  <Tooltip content={<StageTooltip />} cursor={{ fill: '#f1f5f9' }} />
                  <Bar
                    dataKey="count"
                    maxBarSize={44}
                    radius={[4, 4, 0, 0]}
                    label={{ position: 'top', fontSize: 12, fill: '#334155' }}
                  >
                    {stageData.map((s) => (
                      <Cell key={s.stage} fill={STAGE_COLORS[s.stage]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState
              title="No deals yet"
              message="Deals will appear here once you create them."
            />
          )}
        </section>

        <section className="card p-5">
          <h2 className="font-semibold text-slate-900">Leads by source</h2>
          <p className="mb-4 text-xs text-slate-500">Where your leads are coming from</p>
          {sourceData.length ? (
            <div className="h-72" role="img" aria-label="Pie chart of leads by source">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sourceData}
                    dataKey="count"
                    nameKey="source"
                    innerRadius={55}
                    outerRadius={95}
                    stroke="#ffffff"
                    strokeWidth={2}
                    label={({ value }) => value}
                  >
                    {sourceData.map((s) => (
                      <Cell key={s.source} fill={SOURCE_COLORS[s.source]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [value, titleCase(name)]} />
                  <Legend
                    formatter={(value) => (
                      <span className="text-sm text-slate-600">{titleCase(value)}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="No leads yet" message="Add leads to see where they come from." />
          )}
        </section>
      </div>
    </div>
  );
}
