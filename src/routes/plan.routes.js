const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/plan.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');

router.use(authenticate);

router.get('/', authorize('plans', 'read'), ctrl.list);
router.post('/', authorize('plans', 'create'), validate(schemas.plan), ctrl.create);
router.get('/:id', authorize('plans', 'read'), ctrl.getById);
router.put('/:id', authorize('plans', 'update'), ctrl.update);
router.delete('/:id', authorize('plans', 'delete'), ctrl.remove);

module.exports = router;
