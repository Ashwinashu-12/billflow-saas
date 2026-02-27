const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/subscription.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');

router.use(authenticate);

router.get('/', authorize('subscriptions', 'read'), ctrl.list);
router.post('/', authorize('subscriptions', 'create'), validate(schemas.subscription), ctrl.create);
router.get('/:id', authorize('subscriptions', 'read'), ctrl.getById);
router.put('/:id/upgrade', authorize('subscriptions', 'update'), ctrl.changePlan);
router.put('/:id/cancel', authorize('subscriptions', 'update'), ctrl.cancel);
router.put('/:id/pause', authorize('subscriptions', 'update'), ctrl.pause);
router.put('/:id/resume', authorize('subscriptions', 'update'), ctrl.resume);

module.exports = router;
