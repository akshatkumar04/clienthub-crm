const mongoose = require('mongoose');

const DEAL_STAGES = ['new', 'qualified', 'proposal', 'won', 'lost'];
// Stages that still count towards the open pipeline value
const OPEN_STAGES = ['new', 'qualified', 'proposal'];

const dealSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    value: { type: Number, required: true, min: 0 }, // INR
    stage: { type: String, enum: DEAL_STAGES, default: 'new' },
    contact: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact', required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    expectedCloseDate: { type: Date, default: null },
  },
  { timestamps: true }
);

dealSchema.index({ owner: 1, stage: 1 });

module.exports = mongoose.model('Deal', dealSchema);
module.exports.DEAL_STAGES = DEAL_STAGES;
module.exports.OPEN_STAGES = OPEN_STAGES;
