const Lead = require('../models/Lead');
const Deal = require('../models/Deal');
const Activity = require('../models/Activity');
const { DEAL_STAGES, OPEN_STAGES } = require('../models/Deal');
const { LEAD_SOURCES } = require('../models/Lead');
const { sendSuccess } = require('../utils/response');
const { scopeFor } = require('../utils/access');
const { endOfToday } = require('./activityController');

/** Turn [{_id, count}] from $group into a fixed-order list so empty buckets still render. */
const fillBuckets = (rows, keys, extra = () => ({})) =>
  keys.map((key) => {
    const row = rows.find((r) => r._id === key);
    return { key, count: row ? row.count : 0, ...extra(row) };
  });

/**
 * One request powers the whole dashboard. Every pipeline starts with the same ownership
 * $match, so admins aggregate team-wide data and sales execs only their own.
 */
const getDashboard = async (req, res) => {
  const dealScope = scopeFor(req.user, 'owner');
  const leadScope = scopeFor(req.user, 'assignedTo');
  const activityScope = scopeFor(req.user, 'createdBy');

  const [stageRows, sourceRows, pendingFollowUps, totalLeads] = await Promise.all([
    Deal.aggregate([
      { $match: dealScope },
      { $group: { _id: '$stage', count: { $sum: 1 }, value: { $sum: '$value' } } },
    ]),
    Lead.aggregate([{ $match: leadScope }, { $group: { _id: '$source', count: { $sum: 1 } } }]),
    Activity.countDocuments({
      ...activityScope,
      completed: false,
      followUpDate: { $ne: null, $lte: endOfToday() },
    }),
    Lead.countDocuments(leadScope),
  ]);

  const dealsByStage = fillBuckets(stageRows, DEAL_STAGES, (row) => ({
    value: row ? row.value : 0,
  })).map(({ key, count, value }) => ({ stage: key, count, value }));

  const leadsBySource = fillBuckets(sourceRows, LEAD_SOURCES).map(({ key, count }) => ({
    source: key,
    count,
  }));

  const open = dealsByStage.filter((s) => OPEN_STAGES.includes(s.stage));
  const won = dealsByStage.find((s) => s.stage === 'won');
  const lost = dealsByStage.find((s) => s.stage === 'lost');
  const closed = won.count + lost.count;

  sendSuccess(
    res,
    {
      pipelineValue: open.reduce((sum, s) => sum + s.value, 0),
      openDeals: open.reduce((sum, s) => sum + s.count, 0),
      conversionRate: closed ? Math.round((won.count / closed) * 1000) / 10 : 0, // percent
      wonValue: won.value,
      totalLeads,
      pendingFollowUps,
      dealsByStage,
      leadsBySource,
    },
    'Dashboard data fetched'
  );
};

module.exports = { getDashboard };
