const Contact = require('../models/Contact');
const Lead = require('../models/Lead');
const Deal = require('../models/Deal');
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

const FIELDS = ['name', 'company', 'email', 'phone', 'designation'];
const OWNER = 'owner';

/** A linked lead must be visible to the user making the request. */
const assertLeadAccessible = async (user, leadId) => {
  if (!leadId) return;
  await findAccessible(Lead, leadId, 'assignedTo', user, 'Linked lead');
};

const listContacts = async (req, res) => {
  const filter = scopeFor(req.user, OWNER);
  if (req.query.search) {
    const rx = new RegExp(escapeRegex(req.query.search.trim()), 'i');
    filter.$or = [{ name: rx }, { company: rx }, { email: rx }];
  }

  const pageInfo = getPagination(req.query);
  const [items, total] = await Promise.all([
    Contact.find(filter)
      .sort({ createdAt: -1 })
      .skip(pageInfo.skip)
      .limit(pageInfo.limit)
      .populate('owner', 'name'),
    Contact.countDocuments(filter),
  ]);
  sendSuccess(res, paginated(items, total, pageInfo), 'Contacts fetched');
};

const getContact = async (req, res) => {
  const contact = await findAccessible(Contact, req.params.id, OWNER, req.user, 'Contact');
  await contact.populate('owner', 'name');
  sendSuccess(res, contact, 'Contact fetched');
};

const createContact = async (req, res) => {
  await assertLeadAccessible(req.user, req.body.linkedLead);
  const owner = await resolveOwnerId(req.user, req.body.owner);
  const contact = await Contact.create({
    ...pick(req.body, FIELDS),
    linkedLead: req.body.linkedLead || null,
    owner,
  });
  sendSuccess(res, contact, 'Contact created', 201);
};

const updateContact = async (req, res) => {
  const contact = await findAccessible(Contact, req.params.id, OWNER, req.user, 'Contact');
  contact.set(pick(req.body, FIELDS));
  if (req.body.linkedLead !== undefined) {
    await assertLeadAccessible(req.user, req.body.linkedLead);
    contact.linkedLead = req.body.linkedLead || null;
  }
  if (req.user.role === 'admin' && req.body.owner) {
    contact.owner = await resolveOwnerId(req.user, req.body.owner);
  }
  await contact.save();
  sendSuccess(res, contact, 'Contact updated');
};

const deleteContact = async (req, res) => {
  const contact = await findAccessible(Contact, req.params.id, OWNER, req.user, 'Contact');
  if (await Deal.exists({ contact: contact._id })) {
    throw new ApiError(409, 'This contact has deals. Delete or move those deals first');
  }
  await contact.deleteOne();
  sendSuccess(res, null, 'Contact deleted');
};

module.exports = { listContacts, getContact, createContact, updateContact, deleteContact };
