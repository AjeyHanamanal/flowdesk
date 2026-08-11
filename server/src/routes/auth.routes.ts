import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { loginSchema } from '../validators/schemas';
import * as authController from '../controllers/auth.controller';

const router = Router();

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login with email and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', validateBody(loginSchema), authController.login);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current user profile
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: User profile
 */
router.get('/me', requireAuth, authController.getProfile);
router.get('/permissions', requireAuth, authController.getPermissions);

export default router;
