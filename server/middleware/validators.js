const { body, param } = require('express-validator');
const { query } = require('express-validator');
const { ROLES } = require('../models/User');
const { LEAD_SOURCES, LEAD_STATUSES } = require('../models/Lead');
const { DEAL_STAGES } = require('../models/Deal');
const { ACTIVITY_TYPES, RELATED_KINDS } = require('../models/Activity');

const mongoIdParam = (name = 'id') =>
  param(name).isMongoId().withMessage(`${name} must be a valid id`);

const optionalMongoId = (field) =>
  body(field)
    .optional({ nullable: true, values: 'falsy' })
    .isMongoId()
    .withMessage(`${field} must be a valid id`);

const loginRules = [
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

const createUserRules = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('role')
    .optional()
    .isIn(ROLES)
    .withMessage(`Role must be one of: ${ROLES.join(', ')}`),
];

const updateUserRules = [
  mongoIdParam(),
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('email').optional().isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password')
    .optional()
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  body('role')
    .optional()
    .isIn(ROLES)
    .withMessage(`Role must be one of: ${ROLES.join(', ')}`),
];

const oneOf = (list) => `must be one of: ${list.join(', ')}`;

const paginationQuery = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 200 })
    .withMessage('limit must be between 1 and 200'),
];

// ---- Leads ----
const leadFields = (required) => [
  required
    ? body('name').trim().notEmpty().withMessage('Name is required')
    : body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('company').optional().trim(),
  body('email').optional({ values: 'falsy' }).isEmail().withMessage('A valid email is required'),
  body('phone')
    .optional({ values: 'falsy' })
    .matches(/^[0-9+()\-\s]{7,20}$/)
    .withMessage('Phone number looks invalid'),
  body('source')
    .optional()
    .isIn(LEAD_SOURCES)
    .withMessage(`source ${oneOf(LEAD_SOURCES)}`),
  body('status')
    .optional()
    .isIn(LEAD_STATUSES)
    .withMessage(`status ${oneOf(LEAD_STATUSES)}`),
  body('notes').optional().isString(),
  optionalMongoId('assignedTo'),
];
const createLeadRules = leadFields(true);
const updateLeadRules = [mongoIdParam(), ...leadFields(false)];
const listLeadRules = [
  ...paginationQuery,
  query('status')
    .optional()
    .isIn(LEAD_STATUSES)
    .withMessage(`status ${oneOf(LEAD_STATUSES)}`),
  query('source')
    .optional()
    .isIn(LEAD_SOURCES)
    .withMessage(`source ${oneOf(LEAD_SOURCES)}`),
  query('assignedTo').optional().isMongoId().withMessage('assignedTo must be a valid id'),
];
const convertLeadRules = [
  mongoIdParam(),
  body('dealTitle').optional().trim().notEmpty().withMessage('dealTitle cannot be empty'),
  body('value').isFloat({ min: 0 }).withMessage('value must be a number >= 0'),
  body('expectedCloseDate')
    .optional({ values: 'falsy' })
    .isISO8601()
    .withMessage('expectedCloseDate must be a valid date'),
];

// ---- Contacts ----
const contactFields = (required) => [
  required
    ? body('name').trim().notEmpty().withMessage('Name is required')
    : body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('company').optional().trim(),
  body('email').optional({ values: 'falsy' }).isEmail().withMessage('A valid email is required'),
  body('phone')
    .optional({ values: 'falsy' })
    .matches(/^[0-9+()\-\s]{7,20}$/)
    .withMessage('Phone number looks invalid'),
  body('designation').optional().trim(),
  optionalMongoId('linkedLead'),
  optionalMongoId('owner'),
];
const createContactRules = contactFields(true);
const updateContactRules = [mongoIdParam(), ...contactFields(false)];
const listContactRules = [...paginationQuery];

// ---- Deals ----
const createDealRules = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('value').isFloat({ min: 0 }).withMessage('value must be a number >= 0'),
  body('stage')
    .optional()
    .isIn(DEAL_STAGES)
    .withMessage(`stage ${oneOf(DEAL_STAGES)}`),
  body('contact').isMongoId().withMessage('contact must be a valid id'),
  optionalMongoId('owner'),
  body('expectedCloseDate')
    .optional({ values: 'falsy' })
    .isISO8601()
    .withMessage('expectedCloseDate must be a valid date'),
];
const updateDealRules = [
  mongoIdParam(),
  body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
  body('value').optional().isFloat({ min: 0 }).withMessage('value must be a number >= 0'),
  body('stage')
    .optional()
    .isIn(DEAL_STAGES)
    .withMessage(`stage ${oneOf(DEAL_STAGES)}`),
  body('contact').optional().isMongoId().withMessage('contact must be a valid id'),
  optionalMongoId('owner'),
  body('expectedCloseDate')
    .optional({ values: 'falsy' })
    .isISO8601()
    .withMessage('expectedCloseDate must be a valid date'),
];
const dealStageRules = [
  mongoIdParam(),
  body('stage')
    .isIn(DEAL_STAGES)
    .withMessage(`stage ${oneOf(DEAL_STAGES)}`),
];
const listDealRules = [
  ...paginationQuery,
  query('stage')
    .optional()
    .isIn(DEAL_STAGES)
    .withMessage(`stage ${oneOf(DEAL_STAGES)}`),
];

// ---- Activities ----
const createActivityRules = [
  body('type')
    .isIn(ACTIVITY_TYPES)
    .withMessage(`type ${oneOf(ACTIVITY_TYPES)}`),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('relatedTo.kind')
    .isIn(RELATED_KINDS)
    .withMessage(`relatedTo.kind ${oneOf(RELATED_KINDS)}`),
  body('relatedTo.item').isMongoId().withMessage('relatedTo.item must be a valid id'),
  body('followUpDate')
    .optional({ values: 'falsy' })
    .isISO8601()
    .withMessage('followUpDate must be a valid date'),
];
const updateActivityRules = [
  mongoIdParam(),
  body('type')
    .optional()
    .isIn(ACTIVITY_TYPES)
    .withMessage(`type ${oneOf(ACTIVITY_TYPES)}`),
  body('description').optional().trim().notEmpty().withMessage('Description cannot be empty'),
  body('followUpDate')
    .optional({ values: 'falsy' })
    .isISO8601()
    .withMessage('followUpDate must be a valid date'),
  body('completed').optional().isBoolean().withMessage('completed must be true or false'),
];
const listActivityRules = [
  ...paginationQuery,
  query('kind')
    .optional()
    .isIn(RELATED_KINDS)
    .withMessage(`kind ${oneOf(RELATED_KINDS)}`),
  query('item').optional().isMongoId().withMessage('item must be a valid id'),
  query('completed').optional().isBoolean().withMessage('completed must be true or false'),
];

module.exports = {
  mongoIdParam,
  loginRules,
  createUserRules,
  updateUserRules,
  createLeadRules,
  updateLeadRules,
  listLeadRules,
  convertLeadRules,
  createContactRules,
  updateContactRules,
  listContactRules,
  createDealRules,
  updateDealRules,
  dealStageRules,
  listDealRules,
  createActivityRules,
  updateActivityRules,
  listActivityRules,
};
