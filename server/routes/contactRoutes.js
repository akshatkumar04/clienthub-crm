const router = require('express').Router();
const ctrl = require('../controllers/contactController');
const { requireAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const v = require('../middleware/validators');

router.use(requireAuth);

router.get('/', v.listContactRules, validate, ctrl.listContacts);
router.post('/', v.createContactRules, validate, ctrl.createContact);
router.get('/:id', v.mongoIdParam(), validate, ctrl.getContact);
router.put('/:id', v.updateContactRules, validate, ctrl.updateContact);
router.delete('/:id', v.mongoIdParam(), validate, ctrl.deleteContact);

module.exports = router;
