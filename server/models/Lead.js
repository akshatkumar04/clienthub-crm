const mongoose = require('mongoose');

const LEAD_SOURCES = ['website', 'referral', 'cold call', 'event', 'other'];
const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'unqualified'];

const leadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    company: { type: String, trim: true, default: '' },
    email: { type: String, lowercase: true, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    source: { type: String, enum: LEAD_SOURCES, default: 'other' },
    status: { type: String, enum: LEAD_STATUSES, default: 'new' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    notes: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

leadSchema.index({ status: 1, source: 1 });

module.exports = mongoose.model('Lead', leadSchema);
module.exports.LEAD_SOURCES = LEAD_SOURCES;
module.exports.LEAD_STATUSES = LEAD_STATUSES;
