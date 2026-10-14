const router = require('express').Router();
const ctrl = require('../controllers/userController');
const { requireAuth, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { mongoIdParam, createUserRules, updateUserRules } = require('../middleware/validators');

// Every user-management route is admin only
router.use(requireAuth, requireRole('admin'));

router.get('/', ctrl.listUsers);
router.post('/', createUserRules, validate, ctrl.createUser);
router.get('/:id', mongoIdParam(), validate, ctrl.getUser);
router.put('/:id', updateUserRules, validate, ctrl.updateUser);
router.delete('/:id', mongoIdParam(), validate, ctrl.deleteUser);

module.exports = router;
