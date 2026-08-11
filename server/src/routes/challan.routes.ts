import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validate';
import {
  challanCreateSchema,
  challanUpdateSchema,
  challanFilterSchema,
} from '../validators/schemas';
import * as challanController from '../controllers/challan.controller';

const router = Router();

router.use(requireAuth);

router.get('/', validateQuery(challanFilterSchema), challanController.listChallans);
router.get('/export/csv', requireRole('ADMIN', 'ACCOUNTS'), challanController.exportChallans);
router.post('/check-stock', validateBody(challanCreateSchema.pick({ items: true })), challanController.checkStock);
router.get('/:id', challanController.getChallan);
router.get('/:id/pdf', requireRole('ADMIN', 'ACCOUNTS', 'SALES'), challanController.downloadPdf);
router.post('/', requireRole('ADMIN', 'SALES'), validateBody(challanCreateSchema), challanController.createChallan);
router.put('/:id', requireRole('ADMIN', 'SALES'), validateBody(challanUpdateSchema), challanController.updateChallan);
router.post('/:id/confirm', requireRole('ADMIN', 'SALES'), challanController.confirmChallan);
router.post('/:id/cancel', requireRole('ADMIN', 'SALES'), challanController.cancelChallan);

export default router;
