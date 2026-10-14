export const LEAD_SOURCES = ['website', 'referral', 'cold call', 'event', 'other'];
export const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'unqualified'];
export const DEAL_STAGES = ['new', 'qualified', 'proposal', 'won', 'lost'];
export const ACTIVITY_TYPES = ['call', 'email', 'meeting', 'note'];

export const STATUS_STYLES = {
  new: 'bg-blue-100 text-blue-700',
  contacted: 'bg-amber-100 text-amber-700',
  qualified: 'bg-emerald-100 text-emerald-700',
  unqualified: 'bg-slate-200 text-slate-600',
  proposal: 'bg-violet-100 text-violet-700',
  won: 'bg-green-100 text-green-700',
  lost: 'bg-red-100 text-red-700',
};

// One fixed colour per entity so filters never repaint a series
export const STAGE_COLORS = {
  new: '#2563eb',
  qualified: '#0d9488',
  proposal: '#7c3aed',
  won: '#16a34a',
  lost: '#dc2626',
};

export const SOURCE_COLORS = {
  website: '#2563eb',
  referral: '#0d9488',
  'cold call': '#d97706',
  event: '#7c3aed',
  other: '#64748b',
};
