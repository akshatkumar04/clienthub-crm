const router = require('express').Router();
const { sendSuccess } = require('../utils/response');

router.get('/health', (_req, res) =>
  sendSuccess(res, { uptime: process.uptime() }, 'ClientHub API is running')
);
router.use('/auth', require('./authRoutes'));
router.use('/users', require('./userRoutes'));
router.use('/leads', require('./leadRoutes'));
router.use('/contacts', require('./contactRoutes'));
router.use('/deals', require('./dealRoutes'));
router.use('/activities', require('./activityRoutes'));
router.use('/dashboard', require('./dashboardRoutes'));

module.exports = router;
