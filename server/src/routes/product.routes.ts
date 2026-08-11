import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validate';
import {
  productCreateSchema,
  productUpdateSchema,
  productFilterSchema,
  stockMovementSchema,
} from '../validators/schemas';
import * as productController from '../controllers/product.controller';

const router = Router();

router.use(requireAuth);

router.get('/', validateQuery(productFilterSchema), productController.listProducts);
router.get('/export/csv', requireRole('ADMIN', 'WAREHOUSE'), productController.exportProducts);
router.get('/meta/categories', productController.getCategories);
router.get('/meta/warehouses', productController.getWarehouses);
router.get('/:id', productController.getProduct);
router.get('/:id/movements', productController.getMovements);
router.post('/', requireRole('ADMIN', 'WAREHOUSE'), validateBody(productCreateSchema), productController.createProduct);
router.put('/:id', requireRole('ADMIN', 'WAREHOUSE'), validateBody(productUpdateSchema), productController.updateProduct);

export default router;
