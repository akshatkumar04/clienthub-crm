const router = require('express').Router();
const { sendSuccess } = require('../utils/response');

router.get('/health', (_req, res) =>
  sendSuccess(res, { uptime: process.uptime() }, 'ClientHub API is running')
);
router.use('/auth', require('./authRoutes'));
router.use('/users', require('./userRoutes'));

module.exports = router;
