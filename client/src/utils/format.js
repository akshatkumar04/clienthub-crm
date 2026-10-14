const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export const formatINR = (value) => inr.format(value || 0);

/** Compact rupee format for chart axes and stat cards: ₹12.5L, ₹1.2Cr */
export const formatINRCompact = (value) => {
  const v = value || 0;
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(1).replace(/\.0$/, '')}Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(1).replace(/\.0$/, '')}L`;
  if (v >= 1e3) return `₹${(v / 1e3).toFixed(1).replace(/\.0$/, '')}K`;
  return `₹${v}`;
};

export const formatDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

/** yyyy-mm-dd for <input type="date"> */
export const toDateInput = (iso) => (iso ? new Date(iso).toISOString().slice(0, 10) : '');

export const isOverdue = (iso) => {
  if (!iso) return false;
  const d = new Date(iso);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return d < startOfToday;
};

export const titleCase = (text) =>
  text.replace(/(^|_|\s)\w/g, (m) => m.toUpperCase()).replace(/_/g, ' ');
