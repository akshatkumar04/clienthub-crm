const Activity = require('../models/Activity');
const Lead = require('../models/Lead');
const Deal = require('../models/Deal');
const { sendSuccess } = require('../utils/response');
const { scopeFor, findAccessible, pick, getPagination, paginated } = require('../utils/access');

const FIELDS = ['type', 'description', 'followUpDate', 'completed'];
const OWNER = 'createdBy';

// Which model + ownership field guards each kind of related record
const RELATED = {
  Lead: { Model: Lead, ownerField: 'assignedTo' },
  Deal: { Model: Deal, ownerField: 'owner' },
};

const populateActivity = (query) =>
  query.populate('relatedTo.item', 'name title company').populate('createdBy', 'name');

const endOfToday = () => {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
};

const listActivities = async (req, res) => {
  const { kind, item, completed } = req.query;
  const filter = scopeFor(req.user, OWNER);
  if (kind) filter['relatedTo.kind'] = kind;
  if (item) filter['relatedTo.item'] = item;
  if (completed !== undefined) filter.completed = completed === 'true';

  const pageInfo = getPagination(req.query, 20);
  const [items, total] = await Promise.all([
    populateActivity(
      Activity.find(filter).sort({ createdAt: -1 }).skip(pageInfo.skip).limit(pageInfo.limit)
    ),
    Activity.countDocuments(filter),
  ]);
  sendSuccess(res, paginated(items, total, pageInfo), 'Activities fetched');
};

/** Open follow-ups that are due today or already overdue, most overdue first. */
const pendingFollowUps = async (req, res) => {
  const filter = {
    ...scopeFor(req.user, OWNER),
    completed: false,
    followUpDate: { $ne: null, $lte: endOfToday() },
  };
  const items = await populateActivity(Activity.find(filter).sort({ followUpDate: 1 }));
  sendSuccess(res, items, 'Pending follow-ups fetched');
};

const createActivity = async (req, res) => {
  const { kind, item } = req.body.relatedTo;
  // The user must be able to access the lead/deal they are logging against
  const { Model, ownerField } = RELATED[kind];
  await findAccessible(Model, item, ownerField, req.user, kind);

  const activity = await Activity.create({
    ...pick(req.body, FIELDS),
    followUpDate: req.body.followUpDate || null,
    relatedTo: { kind, item },
    createdBy: req.user._id,
  });
  sendSuccess(res, activity, 'Activity logged', 201);
};

const updateActivity = async (req, res) => {
  const activity = await findAccessible(Activity, req.params.id, OWNER, req.user, 'Activity');
  activity.set(pick(req.body, FIELDS));
  if (req.body.followUpDate === '') activity.followUpDate = null;
  await activity.save();
  sendSuccess(res, activity, 'Activity updated');
};

const deleteActivity = async (req, res) => {
  const activity = await findAccessible(Activity, req.params.id, OWNER, req.user, 'Activity');
  await activity.deleteOne();
  sendSuccess(res, null, 'Activity deleted');
};

module.exports = {
  listActivities,
  pendingFollowUps,
  createActivity,
  updateActivity,
  deleteActivity,
  endOfToday,
};
