const Deal = require('../models/Deal');
const Contact = require('../models/Contact');
const Activity = require('../models/Activity');
const { sendSuccess } = require('../utils/response');
const {
  scopeFor,
  findAccessible,
  pick,
  escapeRegex,
  getPagination,
  paginated,
  resolveOwnerId,
} = require('../utils/access');

const FIELDS = ['title', 'value', 'stage', 'expectedCloseDate'];
const OWNER = 'owner';

const populateDeal = (query) => query.populate('contact', 'name company').populate('owner', 'name');

/** A deal can only point at a contact the requester is allowed to see. */
const assertContactAccessible = (user, contactId) =>
  findAccessible(Contact, contactId, 'owner', user, 'Contact');

const listDeals = async (req, res) => {
  const filter = scopeFor(req.user, OWNER);
  if (req.query.stage) filter.stage = req.query.stage;
  if (req.query.search) filter.title = new RegExp(escapeRegex(req.query.search.trim()), 'i');

  // The Kanban board loads everything in one go, so allow a larger page size here
  const pageInfo = getPagination(req.query, 100);
  const [items, total] = await Promise.all([
    populateDeal(
      Deal.find(filter).sort({ updatedAt: -1 }).skip(pageInfo.skip).limit(pageInfo.limit)
    ),
    Deal.countDocuments(filter),
  ]);
  sendSuccess(res, paginated(items, total, pageInfo), 'Deals fetched');
};

const getDeal = async (req, res) => {
  const deal = await findAccessible(Deal, req.params.id, OWNER, req.user, 'Deal');
  await deal.populate([
    { path: 'contact', select: 'name company' },
    { path: 'owner', select: 'name' },
  ]);
  sendSuccess(res, deal, 'Deal fetched');
};

const createDeal = async (req, res) => {
  await assertContactAccessible(req.user, req.body.contact);
  const owner = await resolveOwnerId(req.user, req.body.owner);
  const deal = await Deal.create({
    ...pick(req.body, FIELDS),
    expectedCloseDate: req.body.expectedCloseDate || null,
    contact: req.body.contact,
    owner,
  });
  sendSuccess(res, deal, 'Deal created', 201);
};

const updateDeal = async (req, res) => {
  const deal = await findAccessible(Deal, req.params.id, OWNER, req.user, 'Deal');
  deal.set(pick(req.body, FIELDS));
  if (req.body.expectedCloseDate === '') deal.expectedCloseDate = null;
  if (req.body.contact) {
    await assertContactAccessible(req.user, req.body.contact);
    deal.contact = req.body.contact;
  }
  if (req.user.role === 'admin' && req.body.owner) {
    deal.owner = await resolveOwnerId(req.user, req.body.owner);
  }
  await deal.save();
  sendSuccess(res, deal, 'Deal updated');
};

const updateDealStage = async (req, res) => {
  const deal = await findAccessible(Deal, req.params.id, OWNER, req.user, 'Deal');
  deal.stage = req.body.stage;
  await deal.save();
  sendSuccess(res, deal, `Deal moved to ${deal.stage}`);
};

const deleteDeal = async (req, res) => {
  const deal = await findAccessible(Deal, req.params.id, OWNER, req.user, 'Deal');
  await Activity.deleteMany({ 'relatedTo.kind': 'Deal', 'relatedTo.item': deal._id });
  await deal.deleteOne();
  sendSuccess(res, null, 'Deal deleted');
};

module.exports = { listDeals, getDeal, createDeal, updateDeal, updateDealStage, deleteDeal };
