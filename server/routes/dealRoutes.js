const router = require('express').Router();
const ctrl = require('../controllers/dealController');
const { requireAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const v = require('../middleware/validators');

router.use(requireAuth);

router.get('/', v.listDealRules, validate, ctrl.listDeals);
router.post('/', v.createDealRules, validate, ctrl.createDeal);
router.get('/:id', v.mongoIdParam(), validate, ctrl.getDeal);
router.put('/:id', v.updateDealRules, validate, ctrl.updateDeal);
router.patch('/:id/stage', v.dealStageRules, validate, ctrl.updateDealStage);
router.delete('/:id', v.mongoIdParam(), validate, ctrl.deleteDeal);

module.exports = router;
