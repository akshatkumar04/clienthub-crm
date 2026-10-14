const router = require('express').Router();
const ctrl = require('../controllers/activityController');
const { requireAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const v = require('../middleware/validators');

router.use(requireAuth);

router.get('/', v.listActivityRules, validate, ctrl.listActivities);
router.get('/follow-ups', ctrl.pendingFollowUps); // declared before /:id routes
router.post('/', v.createActivityRules, validate, ctrl.createActivity);
router.put('/:id', v.updateActivityRules, validate, ctrl.updateActivity);
router.delete('/:id', v.mongoIdParam(), validate, ctrl.deleteActivity);

module.exports = router;
