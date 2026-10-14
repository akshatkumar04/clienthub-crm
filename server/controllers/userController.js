const User = require('../models/User');
const Lead = require('../models/Lead');
const Contact = require('../models/Contact');
const Deal = require('../models/Deal');
const ApiError = require('../utils/ApiError');
const { sendSuccess } = require('../utils/response');
const { pick } = require('../utils/access');

const findUser = async (id) => {
  const user = await User.findById(id);
  if (!user) throw new ApiError(404, 'User not found');
  return user;
};

const listUsers = async (_req, res) => {
  const users = await User.find().sort({ name: 1 });
  sendSuccess(res, users, 'Users fetched');
};

const getUser = async (req, res) => sendSuccess(res, await findUser(req.params.id), 'User fetched');

const createUser = async (req, res) => {
  const user = await User.create(pick(req.body, ['name', 'email', 'password', 'role']));
  sendSuccess(res, user, 'User created', 201);
};

const updateUser = async (req, res) => {
  const user = await findUser(req.params.id);
  const updates = pick(req.body, ['name', 'email', 'password', 'role']);

  // Stops the last admin from locking everyone out of user management
  if (updates.role && updates.role !== 'admin' && user.role === 'admin') {
    const admins = await User.countDocuments({ role: 'admin' });
    if (admins <= 1) throw new ApiError(400, 'Cannot demote the only admin');
  }

  user.set(updates);
  await user.save(); // pre-save hook re-hashes the password when it changed
  sendSuccess(res, user, 'User updated');
};

const deleteUser = async (req, res) => {
  const user = await findUser(req.params.id);
  if (user._id.equals(req.user._id)) throw new ApiError(400, 'You cannot delete your own account');

  const owns = await Promise.all([
    Lead.exists({ assignedTo: user._id }),
    Contact.exists({ owner: user._id }),
    Deal.exists({ owner: user._id }),
  ]);
  if (owns.some(Boolean)) {
    throw new ApiError(409, 'User still owns leads, contacts or deals. Reassign them first');
  }

  await user.deleteOne();
  sendSuccess(res, null, 'User deleted');
};

module.exports = { listUsers, getUser, createUser, updateUser, deleteUser };
