import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validate';
import {
  customerCreateSchema,
  customerUpdateSchema,
  customerFilterSchema,
  noteCreateSchema,
  followupCreateSchema,
} from '../validators/schemas';
import * as customerController from '../controllers/customer.controller';

const router = Router();

router.use(requireAuth);

router.get('/', validateQuery(customerFilterSchema), customerController.listCustomers);
router.get('/export/csv', requireRole('ADMIN', 'SALES', 'ACCOUNTS'), customerController.exportCustomers);
router.get('/:id', customerController.getCustomer);
router.get('/:id/timeline', customerController.getTimeline);
router.post('/', requireRole('ADMIN', 'SALES'), validateBody(customerCreateSchema), customerController.createCustomer);
router.put('/:id', requireRole('ADMIN', 'SALES'), validateBody(customerUpdateSchema), customerController.updateCustomer);
router.post('/:id/notes', requireRole('ADMIN', 'SALES'), validateBody(noteCreateSchema), customerController.addNote);
router.post('/:id/followups', requireRole('ADMIN', 'SALES'), validateBody(followupCreateSchema), customerController.addFollowup);

export default router;
