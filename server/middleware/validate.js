const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

/** Run after express-validator chains; converts failures into a 422 ApiError. */
const validate = (req, _res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  const errors = result.array().map((e) => ({ field: e.path, message: e.msg }));
  throw new ApiError(422, 'Validation failed', errors);
};

module.exports = validate;
