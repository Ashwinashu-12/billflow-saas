const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/invoice.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');

router.use(authenticate);

router.get('/', authorize('invoices', 'read'), ctrl.list);
router.post('/', authorize('invoices', 'create'), validate(schemas.invoice), ctrl.create);
router.post('/generate-from-subscription/:subscriptionId', authorize('invoices', 'create'), ctrl.generateFromSubscription);
router.get('/:id', authorize('invoices', 'read'), ctrl.getById);
router.put('/:id/send', authorize('invoices', 'update'), ctrl.sendInvoice);
router.put('/:id/void', authorize('invoices', 'update'), ctrl.voidInvoice);
router.get('/:id/pdf', authorize('invoices', 'read'), ctrl.generatePDF);

module.exports = router;
