import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validateQuery } from '../middleware/validate';
import { searchSchema } from '../validators/schemas';
import * as dashboardController from '../controllers/dashboard.controller';

const router = Router();

router.use(requireAuth);

router.get('/operations-pulse', dashboardController.getOperationsPulse);
router.get('/stock-risk', dashboardController.getStockRisk);
router.get('/followups', dashboardController.getFollowups);
router.get('/challan-pipeline', dashboardController.getChallanPipeline);
router.get('/overview', dashboardController.getOverview);
router.get('/search', validateQuery(searchSchema), dashboardController.globalSearch);

export default router;
