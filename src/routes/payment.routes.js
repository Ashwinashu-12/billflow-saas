const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/payment.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');

router.use(authenticate);

router.get('/', authorize('payments', 'read'), ctrl.list);
router.get('/summary', authorize('payments', 'read'), ctrl.summary);
router.post('/', authorize('payments', 'create'), validate(schemas.payment), ctrl.create);
router.get('/:id', authorize('payments', 'read'), ctrl.getById);
router.post('/:id/refund', authorize('payments', 'update'), ctrl.refund);

module.exports = router;
