import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import * as dashboardController from '../controllers/dashboard.controller';

const router = Router();

router.use(requireAuth);
router.get('/', dashboardController.listActivity);

export default router;
