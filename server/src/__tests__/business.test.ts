import request from 'supertest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

// We test against the running app's logic via direct service calls and prisma
// since importing the full app requires DB setup

describe('FlowDesk Business Logic', () => {
  let adminToken: string;
  let salesUserId: string;
  let testProductId: string;
  let testCustomerId: string;

  beforeAll(async () => {
    const admin = await prisma.user.findUnique({ where: { email: 'admin@flowdesk.demo' } });
    const sales = await prisma.user.findUnique({ where: { email: 'sales@flowdesk.demo' } });
    if (!admin || !sales) {
      console.warn('Seed data not found. Run npm run db:seed first.');
      return;
    }
    salesUserId = sales.id;
    adminToken = jwt.sign(
      { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
      process.env.JWT_SECRET || 'dev-secret-change-me',
      { expiresIn: '1h' }
    );

    const product = await prisma.product.findFirst();
    const customer = await prisma.customer.findFirst();
    if (product) testProductId = product.id;
    if (customer) testCustomerId = customer.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('login validates credentials', async () => {
    const user = await prisma.user.findUnique({ where: { email: 'admin@flowdesk.demo' } });
    expect(user).toBeTruthy();
    const valid = await bcrypt.compare('FlowDesk@2026', user!.password);
    expect(valid).toBe(true);
  });

  test('unauthorized request without token returns 401', async () => {
    const { createApp } = await import('../app');
    const app = createApp();
    const res = await request(app).get('/api/customers');
    expect(res.status).toBe(401);
  });

  test('customer can be created', async () => {
    if (!salesUserId) return;
    const customer = await prisma.customer.create({
      data: {
        name: 'Test User',
        mobile: '9123456789',
        businessName: 'Test Business',
        customerType: 'RETAIL',
        createdById: salesUserId,
      },
    });
    expect(customer.id).toBeTruthy();
    await prisma.customer.delete({ where: { id: customer.id } });
  });

  test('product can be created with unique SKU', async () => {
    const product = await prisma.product.create({
      data: {
        name: 'Test Product',
        sku: `TEST-SKU-${Date.now()}`,
        unitPrice: 100,
        currentStock: 10,
        minimumStock: 5,
      },
    });
    expect(product.sku).toBeTruthy();
    await prisma.product.delete({ where: { id: product.id } });
  });

  test('draft challan does NOT reduce stock', async () => {
    if (!testProductId || !testCustomerId || !salesUserId) return;

    const product = await prisma.product.findUnique({ where: { id: testProductId } });
    const stockBefore = product!.currentStock;

    const { challanService } = await import('../services/challan.service');
    const challan = await challanService.create(
      { customerId: testCustomerId, items: [{ productId: testProductId, quantity: 1 }], status: 'DRAFT' },
      salesUserId
    );

    const productAfter = await prisma.product.findUnique({ where: { id: testProductId } });
    expect(productAfter!.currentStock).toBe(stockBefore);

    await prisma.challanItem.deleteMany({ where: { challanId: challan.id } });
    await prisma.challan.delete({ where: { id: challan.id } });
  });

  test('confirmed challan reduces stock', async () => {
    if (!testCustomerId || !salesUserId) return;

    const product = await prisma.product.create({
      data: { name: 'Confirm Test', sku: `CONF-${Date.now()}`, unitPrice: 50, currentStock: 20, minimumStock: 5 },
    });

    const { challanService } = await import('../services/challan.service');
    const challan = await challanService.create(
      { customerId: testCustomerId, items: [{ productId: product.id, quantity: 5 }], status: 'CONFIRMED' },
      salesUserId
    );

    const productAfter = await prisma.product.findUnique({ where: { id: product.id } });
    expect(productAfter!.currentStock).toBe(15);

    await prisma.stockMovement.deleteMany({ where: { referenceId: challan.id } });
    await prisma.challanItem.deleteMany({ where: { challanId: challan.id } });
    await prisma.challan.delete({ where: { id: challan.id } });
    await prisma.product.delete({ where: { id: product.id } });
  });

  test('insufficient stock returns conflict', async () => {
    if (!testCustomerId || !salesUserId) return;

    const product = await prisma.product.create({
      data: { name: 'Low Stock Test', sku: `LOW-${Date.now()}`, unitPrice: 50, currentStock: 2, minimumStock: 5 },
    });

    const { challanService } = await import('../services/challan.service');
    await expect(
      challanService.create(
        { customerId: testCustomerId, items: [{ productId: product.id, quantity: 10 }], status: 'CONFIRMED' },
        salesUserId
      )
    ).rejects.toMatchObject({ statusCode: 409, code: 'INSUFFICIENT_STOCK' });

    await prisma.product.delete({ where: { id: product.id } });
  });

  test('stock never becomes negative', async () => {
    const products = await prisma.product.findMany();
    products.forEach((p) => {
      expect(p.currentStock).toBeGreaterThanOrEqual(0);
    });
  });

  test('challan cannot be confirmed twice', async () => {
    if (!testCustomerId || !salesUserId) return;

    const product = await prisma.product.create({
      data: { name: 'Double Confirm', sku: `DBL-${Date.now()}`, unitPrice: 50, currentStock: 50, minimumStock: 5 },
    });

    const { challanService } = await import('../services/challan.service');
    const challan = await challanService.create(
      { customerId: testCustomerId, items: [{ productId: product.id, quantity: 2 }], status: 'DRAFT' },
      salesUserId
    );

    await challanService.confirm(challan.id, salesUserId);
    await expect(challanService.confirm(challan.id, salesUserId)).rejects.toMatchObject({ code: 'ALREADY_CONFIRMED' });

    await prisma.stockMovement.deleteMany({ where: { referenceId: challan.id } });
    await prisma.challanItem.deleteMany({ where: { challanId: challan.id } });
    await prisma.challan.delete({ where: { id: challan.id } });
    await prisma.product.delete({ where: { id: product.id } });
  });

  test('cancelled challan cannot be confirmed', async () => {
    if (!testCustomerId || !salesUserId) return;

    const product = await prisma.product.create({
      data: { name: 'Cancel Test', sku: `CNC-${Date.now()}`, unitPrice: 50, currentStock: 50, minimumStock: 5 },
    });

    const { challanService } = await import('../services/challan.service');
    const challan = await challanService.create(
      { customerId: testCustomerId, items: [{ productId: product.id, quantity: 2 }], status: 'DRAFT' },
      salesUserId
    );

    await challanService.cancel(challan.id, salesUserId);
    await expect(challanService.confirm(challan.id, salesUserId)).rejects.toMatchObject({ code: 'INVALID_STATUS' });

    await prisma.challanItem.deleteMany({ where: { challanId: challan.id } });
    await prisma.challan.delete({ where: { id: challan.id } });
    await prisma.product.delete({ where: { id: product.id } });
  });
});
