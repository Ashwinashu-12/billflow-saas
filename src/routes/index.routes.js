const express = require('express');
const router = express.Router();
const usageCtrl = require('../controllers/usage.controller');
const reportCtrl = require('../controllers/report.controller');
const auditCtrl = require('../controllers/audit.controller');
const webhookCtrl = require('../controllers/webhook.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');

// ─── Usage Routes ────────────────────────────────────────────────────────────
const usageRouter = express.Router();
usageRouter.use(authenticate);
usageRouter.get('/', authorize('usage', 'read'), usageCtrl.list);
usageRouter.post('/log', authorize('usage', 'create'), validate(schemas.usageLog), usageCtrl.logUsage);
usageRouter.post('/log/batch', authorize('usage', 'create'), usageCtrl.logUsageBatch);
usageRouter.get('/summary/:subscriptionId', authorize('usage', 'read'), usageCtrl.getSubscriptionUsageSummary);
usageRouter.post('/calculate/:subscriptionId', authorize('usage', 'create'), usageCtrl.calculateUsage);

// ─── Report Routes ────────────────────────────────────────────────────────────
const reportRouter = express.Router();
reportRouter.use(authenticate);
reportRouter.get('/dashboard', authorize('reports', 'read'), reportCtrl.dashboard);
reportRouter.get('/mrr', authorize('reports', 'read'), reportCtrl.mrrReport);
reportRouter.get('/revenue-by-plan', authorize('reports', 'read'), reportCtrl.revenueByPlan);
reportRouter.get('/outstanding-invoices', authorize('reports', 'read'), reportCtrl.outstandingInvoices);
reportRouter.get('/revenue-collection', authorize('reports', 'read'), reportCtrl.revenueCollection);
reportRouter.get('/customer-retention', authorize('reports', 'read'), reportCtrl.customerRetention);
reportRouter.get('/tax-summary', authorize('reports', 'read'), reportCtrl.taxSummary);

// ─── Audit Routes ────────────────────────────────────────────────────────────
const auditRouter = express.Router();
auditRouter.use(authenticate);
auditRouter.get('/', authorize('audit_logs', 'read'), auditCtrl.list);
auditRouter.get('/summary', authorize('audit_logs', 'read'), auditCtrl.summary);
auditRouter.get('/:id', authorize('audit_logs', 'read'), auditCtrl.getById);

// ─── Webhook Routes ───────────────────────────────────────────────────────────
const webhookRouter = express.Router();
webhookRouter.use(authenticate);
webhookRouter.get('/events', webhookCtrl.availableEvents);
webhookRouter.get('/', authorize('webhooks', 'read'), webhookCtrl.list);
webhookRouter.post('/', authorize('webhooks', 'create'), validate(schemas.webhook), webhookCtrl.create);
webhookRouter.get('/:id', authorize('webhooks', 'read'), webhookCtrl.getById);
webhookRouter.put('/:id', authorize('webhooks', 'update'), webhookCtrl.update);
webhookRouter.delete('/:id', authorize('webhooks', 'delete'), webhookCtrl.remove);
webhookRouter.post('/:id/test', authorize('webhooks', 'create'), webhookCtrl.test);
webhookRouter.get('/:id/logs', authorize('webhooks', 'read'), webhookCtrl.getLogs);

module.exports = { usageRouter, reportRouter, auditRouter, webhookRouter };
