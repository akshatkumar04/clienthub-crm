const Lead = require('../models/Lead');
const Contact = require('../models/Contact');
const Deal = require('../models/Deal');
const Activity = require('../models/Activity');
const ApiError = require('../utils/ApiError');
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

const FIELDS = ['name', 'company', 'email', 'phone', 'source', 'status', 'notes'];
const OWNER = 'assignedTo';

const listLeads = async (req, res) => {
  const { search, status, source, assignedTo } = req.query;
  const filter = scopeFor(req.user, OWNER);

  if (status) filter.status = status;
  if (source) filter.source = source;
  // Execs are already pinned to themselves by scopeFor; only admins can filter by owner
  if (assignedTo && req.user.role === 'admin') filter.assignedTo = assignedTo;
  if (search) {
    const rx = new RegExp(escapeRegex(search.trim()), 'i');
    filter.$or = [{ name: rx }, { company: rx }];
  }

  const pageInfo = getPagination(req.query);
  const [items, total] = await Promise.all([
    Lead.find(filter)
      .sort({ createdAt: -1 })
      .skip(pageInfo.skip)
      .limit(pageInfo.limit)
      .populate('assignedTo', 'name email'),
    Lead.countDocuments(filter),
  ]);
  sendSuccess(res, paginated(items, total, pageInfo), 'Leads fetched');
};

const getLead = async (req, res) => {
  const lead = await findAccessible(Lead, req.params.id, OWNER, req.user, 'Lead');
  await lead.populate('assignedTo', 'name email');
  sendSuccess(res, lead, 'Lead fetched');
};

const createLead = async (req, res) => {
  const assignedTo = await resolveOwnerId(req.user, req.body.assignedTo);
  const lead = await Lead.create({ ...pick(req.body, FIELDS), assignedTo });
  sendSuccess(res, lead, 'Lead created', 201);
};

const updateLead = async (req, res) => {
  const lead = await findAccessible(Lead, req.params.id, OWNER, req.user, 'Lead');
  lead.set(pick(req.body, FIELDS));
  // Reassignment is an admin-only capability
  if (req.user.role === 'admin' && req.body.assignedTo) {
    lead.assignedTo = await resolveOwnerId(req.user, req.body.assignedTo);
  }
  await lead.save();
  sendSuccess(res, lead, 'Lead updated');
};

const deleteLead = async (req, res) => {
  const lead = await findAccessible(Lead, req.params.id, OWNER, req.user, 'Lead');
  await Activity.deleteMany({ 'relatedTo.kind': 'Lead', 'relatedTo.item': lead._id });
  await lead.deleteOne();
  sendSuccess(res, null, 'Lead deleted');
};

/**
 * Sales workflow step: lead -> contact + deal. The lead becomes "qualified", a Contact
 * is created from its details and a Deal opens in the "qualified" stage.
 */
const convertLead = async (req, res) => {
  const lead = await findAccessible(Lead, req.params.id, OWNER, req.user, 'Lead');

  if (await Contact.exists({ linkedLead: lead._id })) {
    throw new ApiError(409, 'This lead has already been converted');
  }

  const contact = await Contact.create({
    name: lead.name,
    company: lead.company,
    email: lead.email,
    phone: lead.phone,
    linkedLead: lead._id,
    owner: lead.assignedTo,
  });

  const deal = await Deal.create({
    title: req.body.dealTitle || `${lead.company || lead.name} - New Opportunity`,
    value: req.body.value,
    stage: 'qualified',
    contact: contact._id,
    owner: lead.assignedTo,
    expectedCloseDate: req.body.expectedCloseDate || null,
  });

  lead.status = 'qualified';
  await lead.save();

  sendSuccess(res, { lead, contact, deal }, 'Lead converted to contact and deal', 201);
};

module.exports = { listLeads, getLead, createLead, updateLead, deleteLead, convertLead };
