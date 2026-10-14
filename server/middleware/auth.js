const User = require('../models/User');
const ApiError = require('../utils/ApiError');

/**
 * Authentication: the session cookie only stores the user id. Loading the user
 * on every request means role changes or deleted accounts take effect immediately.
 */
const requireAuth = async (req, _res, next) => {
  const userId = req.session && req.session.userId;
  if (!userId) throw new ApiError(401, 'Authentication required');

  const user = await User.findById(userId);
  if (!user) {
    req.session.destroy(() => {});
    throw new ApiError(401, 'Session is no longer valid');
  }
  req.user = user;
  next();
};

/** Authorization: allow only the listed roles. Must run after requireAuth. */
const requireRole =
  (...roles) =>
  (req, _res, next) => {
    if (!roles.includes(req.user.role)) {
      throw new ApiError(403, 'You do not have permission to perform this action');
    }
    next();
  };

module.exports = { requireAuth, requireRole };
