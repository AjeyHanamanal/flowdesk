import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { stockMovementSchema } from '../validators/schemas';
import * as productController from '../controllers/product.controller';

const router = Router();

router.use(requireAuth);

router.get('/movements', productController.listAllMovements);
router.post('/movements', requireRole('ADMIN', 'WAREHOUSE'), validateBody(stockMovementSchema), productController.createMovement);

export default router;
