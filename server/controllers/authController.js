const { promisify } = require('util');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { sendSuccess } = require('../utils/response');

const login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  // Same message for unknown email and wrong password: no account enumeration
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid email or password');
  }

  // New session id on login prevents session fixation
  await promisify(req.session.regenerate).call(req.session);
  req.session.userId = user._id.toString();
  sendSuccess(res, user, 'Logged in successfully');
};

const logout = async (req, res) => {
  await promisify(req.session.destroy).call(req.session);
  res.clearCookie('clienthub.sid');
  sendSuccess(res, null, 'Logged out successfully');
};

const me = (req, res) => sendSuccess(res, req.user, 'Current session');

module.exports = { login, logout, me };
