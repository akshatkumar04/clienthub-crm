const router = require('express').Router();
const ctrl = require('../controllers/leadController');
const { requireAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const v = require('../middleware/validators');

router.use(requireAuth); // ownership scoping happens inside the controller

router.get('/', v.listLeadRules, validate, ctrl.listLeads);
router.post('/', v.createLeadRules, validate, ctrl.createLead);
router.get('/:id', v.mongoIdParam(), validate, ctrl.getLead);
router.put('/:id', v.updateLeadRules, validate, ctrl.updateLead);
router.delete('/:id', v.mongoIdParam(), validate, ctrl.deleteLead);
router.post('/:id/convert', v.convertLeadRules, validate, ctrl.convertLead);

module.exports = router;
