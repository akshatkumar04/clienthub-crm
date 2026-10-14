const mongoose = require('mongoose');

const ACTIVITY_TYPES = ['call', 'email', 'meeting', 'note'];
const RELATED_KINDS = ['Lead', 'Deal'];

const activitySchema = new mongoose.Schema(
  {
    type: { type: String, enum: ACTIVITY_TYPES, required: true },
    description: { type: String, required: true, trim: true },
    // Polymorphic reference: `kind` names the model that `item` points to
    relatedTo: {
      kind: { type: String, enum: RELATED_KINDS, required: true },
      item: { type: mongoose.Schema.Types.ObjectId, refPath: 'relatedTo.kind', required: true },
    },
    followUpDate: { type: Date, default: null },
    completed: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

activitySchema.index({ 'relatedTo.kind': 1, 'relatedTo.item': 1 });
activitySchema.index({ completed: 1, followUpDate: 1 });

module.exports = mongoose.model('Activity', activitySchema);
module.exports.ACTIVITY_TYPES = ACTIVITY_TYPES;
module.exports.RELATED_KINDS = RELATED_KINDS;
