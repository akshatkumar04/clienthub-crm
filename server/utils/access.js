const User = require('../models/User');
const ApiError = require('./ApiError');

/**
 * Row-level scoping. Admins see everything; sales executives only see documents
 * whose ownership field (assignedTo / owner / createdBy) points at them.
 * Merge the result into any Mongoose filter or aggregation $match.
 */
const scopeFor = (user, ownerField) => (user.role === 'admin' ? {} : { [ownerField]: user._id });

/**
 * Fetch one document the user is allowed to touch. Documents outside the user's
 * scope respond with 404 (not 403) so record existence is not leaked.
 */
const findAccessible = async (Model, id, ownerField, user, label) => {
  const doc = await Model.findOne({ _id: id, ...scopeFor(user, ownerField) });
  if (!doc) throw new ApiError(404, `${label} not found`);
  return doc;
};

/** Copy only whitelisted keys that are present in the body (blocks mass assignment). */
const pick = (body, keys) =>
  keys.reduce((acc, key) => {
    if (body[key] !== undefined) acc[key] = body[key];
    return acc;
  }, {});

/** Escape user input before using it inside a RegExp. */
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Parse ?page & ?limit into safe numbers. */
const getPagination = (query, defaultLimit = 10, maxLimit = 200) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || defaultLimit, 1), maxLimit);
  return { page, limit, skip: (page - 1) * limit };
};

const paginated = (items, total, { page, limit }) => ({
  items,
  pagination: { page, limit, total, pages: Math.max(Math.ceil(total / limit), 1) },
});

/**
 * Decide who owns a record. Sales execs always own what they create; only admins may
 * assign to someone else (and the target user must exist).
 */
const resolveOwnerId = async (user, requestedId) => {
  if (user.role !== 'admin' || !requestedId) return user._id;
  if (!(await User.exists({ _id: requestedId }))) {
    throw new ApiError(400, 'The selected user does not exist');
  }
  return requestedId;
};

module.exports = {
  resolveOwnerId,
  scopeFor,
  findAccessible,
  pick,
  escapeRegex,
  getPagination,
  paginated,
};
