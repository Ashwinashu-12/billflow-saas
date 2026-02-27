const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: Tenant registration, login, and token management
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new tenant + owner account
 *     tags: [Authentication]
 */
router.post('/register', validate(schemas.registerTenant), authController.register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Authentication]
 */
router.post('/login', validate(schemas.login), authController.login);

router.post('/refresh', authController.refresh);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.me);
router.put('/change-password', authenticate, authController.changePassword);

module.exports = router;
