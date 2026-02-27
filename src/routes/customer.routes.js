const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/customer.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');

router.use(authenticate);

router.get('/', authorize('customers', 'read'), ctrl.list);
router.post('/', authorize('customers', 'create'), validate(schemas.customer), ctrl.create);
router.get('/:id', authorize('customers', 'read'), ctrl.getById);
router.put('/:id', authorize('customers', 'update'), ctrl.update);
router.delete('/:id', authorize('customers', 'delete'), ctrl.remove);
router.get('/:id/subscriptions', authorize('subscriptions', 'read'), ctrl.getSubscriptions);
router.get('/:id/invoices', authorize('invoices', 'read'), ctrl.getInvoices);

module.exports = router;
