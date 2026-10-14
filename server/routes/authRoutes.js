const router = require('express').Router();
const { login, logout, me } = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { loginRules } = require('../middleware/validators');

router.post('/login', loginRules, validate, login);
router.post('/logout', logout);
router.get('/me', requireAuth, me);

module.exports = router;
