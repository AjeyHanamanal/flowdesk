import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'FlowDesk@2026';

async function main() {
  console.log('🌱 Seeding FlowDesk database...');

  await prisma.activityEvent.deleteMany();
  await prisma.challanItem.deleteMany();
  await prisma.challan.deleteMany();
  await prisma.challanSequence.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.customerNote.deleteMany();
  await prisma.customerFollowup.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const users = await Promise.all([
    prisma.user.create({ data: { email: 'admin@flowdesk.demo', password: passwordHash, name: 'Admin User', role: Role.ADMIN } }),
    prisma.user.create({ data: { email: 'sales@flowdesk.demo', password: passwordHash, name: 'Sales Manager', role: Role.SALES } }),
    prisma.user.create({ data: { email: 'warehouse@flowdesk.demo', password: passwordHash, name: 'Warehouse Lead', role: Role.WAREHOUSE } }),
    prisma.user.create({ data: { email: 'accounts@flowdesk.demo', password: passwordHash, name: 'Accounts Officer', role: Role.ACCOUNTS } }),
  ]);

  const [admin, sales, warehouse, accounts] = users;

  const categories = await Promise.all([
    prisma.category.create({ data: { name: 'Electronics' } }),
    prisma.category.create({ data: { name: 'Office Supplies' } }),
    prisma.category.create({ data: { name: 'Packaging' } }),
    prisma.category.create({ data: { name: 'Industrial' } }),
    prisma.category.create({ data: { name: 'Consumables' } }),
  ]);

  const warehouses = await Promise.all([
    prisma.warehouse.create({ data: { name: 'Main Warehouse', location: 'Mumbai - Andheri East' } }),
    prisma.warehouse.create({ data: { name: 'North Depot', location: 'Delhi - Okhla' } }),
    prisma.warehouse.create({ data: { name: 'South Hub', location: 'Bangalore - Whitefield' } }),
  ]);

  const productData = [
    { name: 'Printer Cartridge HP-104', sku: 'SKU-PR-104', category: 1, price: 1250, stock: 12, min: 25, wh: 0 },
    { name: 'A4 Copy Paper (500 sheets)', sku: 'SKU-PP-A4', category: 1, price: 280, stock: 450, min: 100, wh: 0 },
    { name: 'Thermal Label Roll 4x6', sku: 'SKU-LB-46', category: 2, price: 890, stock: 8, min: 20, wh: 0 },
    { name: 'Corrugated Box 12x12', sku: 'SKU-BX-1212', category: 2, price: 45, stock: 1200, min: 200, wh: 0 },
    { name: 'Stretch Wrap Film', sku: 'SKU-PK-SW', category: 2, price: 320, stock: 35, min: 30, wh: 1 },
    { name: 'Industrial Gloves (Pack of 100)', sku: 'SKU-IN-GL', category: 3, price: 650, stock: 5, min: 15, wh: 1 },
    { name: 'Safety Helmet Yellow', sku: 'SKU-SF-HM', category: 3, price: 420, stock: 78, min: 25, wh: 1 },
    { name: 'LED Tube Light 18W', sku: 'SKU-EL-T18', category: 0, price: 185, stock: 200, min: 50, wh: 0 },
    { name: 'USB Cable Type-C 1m', sku: 'SKU-EL-UC', category: 0, price: 95, stock: 3, min: 40, wh: 0 },
    { name: 'Barcode Scanner Wireless', sku: 'SKU-EL-BS', category: 0, price: 4500, stock: 15, min: 5, wh: 0 },
    { name: 'Desk Organizer Set', sku: 'SKU-OF-DO', category: 1, price: 550, stock: 42, min: 20, wh: 2 },
    { name: 'Whiteboard Marker Set', sku: 'SKU-OF-WM', category: 1, price: 120, stock: 180, min: 50, wh: 2 },
    { name: 'Bubble Wrap Roll', sku: 'SKU-PK-BW', category: 2, price: 275, stock: 22, min: 25, wh: 0 },
    { name: 'Packing Tape 2 inch', sku: 'SKU-PK-PT', category: 2, price: 65, stock: 500, min: 100, wh: 0 },
    { name: 'Pallet Jack Wheel', sku: 'SKU-IN-PJ', category: 3, price: 2800, stock: 6, min: 4, wh: 1 },
    { name: 'Hand Sanitizer 500ml', sku: 'SKU-CN-HS', category: 4, price: 85, stock: 320, min: 80, wh: 2 },
    { name: 'Floor Cleaner 5L', sku: 'SKU-CN-FC', category: 4, price: 340, stock: 45, min: 30, wh: 2 },
    { name: 'Microfiber Cloth Pack', sku: 'SKU-CN-MF', category: 4, price: 195, stock: 9, min: 20, wh: 0 },
    { name: 'Network Switch 8-Port', sku: 'SKU-EL-NS', category: 0, price: 2200, stock: 18, min: 8, wh: 0 },
    { name: 'Extension Board 4-Socket', sku: 'SKU-EL-EB', category: 0, price: 350, stock: 65, min: 20, wh: 0 },
    { name: 'Document Shredder', sku: 'SKU-OF-SH', category: 1, price: 8500, stock: 4, min: 3, wh: 2 },
    { name: 'Filing Cabinet 4-Drawer', sku: 'SKU-OF-FC', category: 1, price: 12000, stock: 7, min: 3, wh: 2 },
    { name: 'Warehouse Rack Unit', sku: 'SKU-IN-RK', category: 3, price: 15000, stock: 2, min: 2, wh: 1 },
    { name: 'Forklift Battery Charger', sku: 'SKU-IN-BC', category: 3, price: 45000, stock: 1, min: 1, wh: 1 },
    { name: 'Shipping Label Printer', sku: 'SKU-EL-SL', category: 0, price: 9800, stock: 6, min: 3, wh: 0 },
    { name: 'POS Receipt Paper Roll', sku: 'SKU-PP-RP', category: 1, price: 45, stock: 800, min: 200, wh: 0 },
    { name: 'Cable Tie Pack 200pc', sku: 'SKU-PK-CT', category: 2, price: 110, stock: 150, min: 40, wh: 0 },
    { name: 'Dust Mask N95 (Box 20)', sku: 'SKU-SF-DM', category: 3, price: 380, stock: 11, min: 25, wh: 1 },
    { name: 'First Aid Kit Industrial', sku: 'SKU-SF-FA', category: 3, price: 1250, stock: 14, min: 10, wh: 1 },
    { name: 'Water Cooler Bottle 20L', sku: 'SKU-CN-WC', category: 4, price: 55, stock: 60, min: 20, wh: 2 },
  ];

  const products = [];
  for (const p of productData) {
    const product = await prisma.product.create({
      data: {
        name: p.name,
        sku: p.sku,
        categoryId: categories[p.category].id,
        unitPrice: p.price,
        currentStock: p.stock,
        minimumStock: p.min,
        warehouseId: warehouses[p.wh].id,
      },
    });
    products.push(product);

    if (p.stock > 0) {
      await prisma.stockMovement.create({
        data: {
          productId: product.id,
          quantity: p.stock,
          movementType: 'IN',
          reason: 'PURCHASE',
          referenceType: 'PRODUCT',
          referenceId: product.id,
          notes: 'Initial inventory load',
          createdById: warehouse.id,
        },
      });
    }
  }

  const now = new Date();
  const yesterday = new Date(now.getTime() - 86400000);
  const twoDaysAgo = new Date(now.getTime() - 172800000);
  const lastWeek = new Date(now.getTime() - 604800000);
  const tomorrow = new Date(now.getTime() + 86400000);
  const overdue = new Date(now.getTime() - 259200000);

  const customerData = [
    { name: 'Rajesh Kumar', business: 'ABC Distributors', mobile: '9876543210', type: 'DISTRIBUTOR', status: 'ACTIVE', followUp: overdue, gst: '27AABCU9603R1ZM' },
    { name: 'Priya Sharma', business: 'Metro Wholesale', mobile: '9876543211', type: 'WHOLESALE', status: 'ACTIVE', followUp: now, gst: '29AABCP1234A1Z5' },
    { name: 'Amit Patel', business: 'Sunrise Retail Mart', mobile: '9876543212', type: 'RETAIL', status: 'LEAD', followUp: tomorrow },
    { name: 'Deepak Singh', business: 'North Star Trading', mobile: '9876543213', type: 'DISTRIBUTOR', status: 'ACTIVE', followUp: lastWeek, gst: '07AABCD5678B1Z2' },
    { name: 'Sneha Reddy', business: 'Green Valley Stores', mobile: '9876543214', type: 'RETAIL', status: 'ACTIVE', followUp: yesterday },
    { name: 'Vikram Joshi', business: 'Prime Electronics Hub', mobile: '9876543215', type: 'WHOLESALE', status: 'ACTIVE', gst: '24AABCV7890C1Z8' },
    { name: 'Anita Desai', business: 'Coastal Supplies Co', mobile: '9876543216', type: 'DISTRIBUTOR', status: 'LEAD', followUp: tomorrow },
    { name: 'Rahul Mehta', business: 'City Mart Chain', mobile: '9876543217', type: 'RETAIL', status: 'ACTIVE' },
    { name: 'Kavita Nair', business: 'Southern Distributors', mobile: '9876543218', type: 'DISTRIBUTOR', status: 'ACTIVE', followUp: now, gst: '32AABCK3456D1Z1' },
    { name: 'Mohammed Ali', business: 'Express Trading LLC', mobile: '9876543219', type: 'WHOLESALE', status: 'INACTIVE' },
    { name: 'Lakshmi Iyer', business: 'Tech Solutions India', mobile: '9876543220', type: 'WHOLESALE', status: 'ACTIVE', gst: '33AABCL9012E1Z3' },
    { name: 'Harish Gupta', business: 'Bulk Buy Enterprises', mobile: '9876543221', type: 'DISTRIBUTOR', status: 'ACTIVE', followUp: overdue },
    { name: 'Pooja Verma', business: 'Quick Mart Retail', mobile: '9876543222', type: 'RETAIL', status: 'LEAD', followUp: tomorrow },
    { name: 'Sanjay Rao', business: 'Industrial Supply Co', mobile: '9876543223', type: 'WHOLESALE', status: 'ACTIVE', gst: '36AABCS4567F1Z4' },
    { name: 'Meera Krishnan', business: 'Office World', mobile: '9876543224', type: 'RETAIL', status: 'ACTIVE' },
    { name: 'Arjun Malhotra', business: 'Global Traders', mobile: '9876543225', type: 'DISTRIBUTOR', status: 'ACTIVE', followUp: yesterday, gst: '19AABCG6789G1Z6' },
    { name: 'Divya Pillai', business: 'Smart Retail Solutions', mobile: '9876543226', type: 'RETAIL', status: 'LEAD' },
    { name: 'Nitin Shah', business: 'PackPro Distributors', mobile: '9876543227', type: 'DISTRIBUTOR', status: 'ACTIVE', gst: '22AABCP0123H1Z7' },
    { name: 'Ritu Bansal', business: 'Value Wholesale', mobile: '9876543228', type: 'WHOLESALE', status: 'ACTIVE', followUp: now },
    { name: 'Karan Bhatt', business: 'Fresh Start Retail', mobile: '9876543229', type: 'RETAIL', status: 'LEAD', followUp: overdue },
    { name: 'Neha Chopra', business: 'Elite Distribution Network', mobile: '9876543230', type: 'DISTRIBUTOR', status: 'ACTIVE', gst: '06AABCE2345I1Z9' },
    { name: 'Suresh Menon', business: 'Peninsula Trading', mobile: '9876543231', type: 'WHOLESALE', status: 'ACTIVE' },
  ];

  const customers = [];
  for (const c of customerData) {
    const customer = await prisma.customer.create({
      data: {
        name: c.name,
        mobile: c.mobile,
        email: `${c.name.toLowerCase().replace(/\s/g, '.')}@example.com`,
        businessName: c.business,
        gstNumber: c.gst,
        customerType: c.type as 'RETAIL' | 'WHOLESALE' | 'DISTRIBUTOR',
        status: c.status as 'LEAD' | 'ACTIVE' | 'INACTIVE',
        followUpDate: c.followUp,
        address: `${c.business}, Business District, India`,
        createdById: sales.id,
      },
    });
    customers.push(customer);

    await prisma.activityEvent.create({
      data: {
        eventType: 'CUSTOMER_CREATED',
        entityType: 'CUSTOMER',
        entityId: customer.id,
        message: `${c.business} was added to the customer pipeline`,
        createdById: sales.id,
      },
    });
  }

  // Notes
  await prisma.customerNote.create({
    data: { customerId: customers[0].id, content: 'Discussed bulk order pricing for Q2. Interested in 500 units of printer cartridges.', createdById: sales.id },
  });
  await prisma.customerNote.create({
    data: { customerId: customers[1].id, content: 'Follow-up call scheduled. They want updated catalog.', createdById: sales.id },
  });
  await prisma.customerNote.create({
    data: { customerId: customers[4].id, content: 'Payment terms discussed — Net 30 approved.', createdById: sales.id },
  });

  await prisma.activityEvent.create({
    data: { eventType: 'NOTE_ADDED', entityType: 'CUSTOMER', entityId: customers[0].id, message: 'Note added for ABC Distributors', createdById: sales.id },
  });

  // Follow-ups
  await prisma.customerFollowup.create({
    data: { customerId: customers[0].id, scheduledAt: overdue, notes: 'Overdue — call about bulk order', createdById: sales.id },
  });
  await prisma.customerFollowup.create({
    data: { customerId: customers[1].id, scheduledAt: now, notes: 'Today follow-up for catalog update', createdById: sales.id },
  });

  // Challan sequence
  await prisma.challanSequence.create({ data: { year: 2026, lastNo: 0 } });

  async function createChallan(
    customerIdx: number,
    items: { productIdx: number; qty: number }[],
    status: 'DRAFT' | 'CONFIRMED' | 'CANCELLED',
    createdById: string
  ) {
    const year = 2026;
    const seq = await prisma.challanSequence.update({
      where: { year },
      data: { lastNo: { increment: 1 } },
    });
    const challanNumber = `SC-${year}-${seq.lastNo.toString().padStart(4, '0')}`;

    let totalQty = 0;
    let totalAmt = 0;
    const builtItems = items.map((i) => {
      const p = products[i.productIdx];
      const lineTotal = Number(p.unitPrice) * i.qty;
      totalQty += i.qty;
      totalAmt += lineTotal;
      return {
        productId: p.id,
        productNameSnapshot: p.name,
        skuSnapshot: p.sku,
        unitPriceSnapshot: p.unitPrice,
        quantity: i.qty,
        lineTotal,
      };
    });

    const challan = await prisma.challan.create({
      data: {
        challanNumber,
        customerId: customers[customerIdx].id,
        status,
        totalQuantity: totalQty,
        totalAmount: totalAmt,
        createdById,
        confirmedAt: status === 'CONFIRMED' ? new Date() : null,
        cancelledAt: status === 'CANCELLED' ? new Date() : null,
        items: { create: builtItems },
      },
    });

    if (status === 'CONFIRMED') {
      for (const item of builtItems) {
        const product = await prisma.product.findUnique({ where: { id: item.productId } });
        if (!product) continue;
        const newStock = product.currentStock - item.quantity;
        await prisma.product.update({ where: { id: item.productId }, data: { currentStock: Math.max(0, newStock) } });
        await prisma.stockMovement.create({
          data: {
            productId: item.productId,
            quantity: item.quantity,
            movementType: 'OUT',
            reason: 'SALES_CHALLAN',
            referenceType: 'CHALLAN',
            referenceId: challan.id,
            createdById,
          },
        });
      }
      await prisma.activityEvent.create({
        data: { eventType: 'CHALLAN_CONFIRMED', entityType: 'CHALLAN', entityId: challan.id, message: `Challan ${challanNumber} confirmed`, createdById },
      });
    } else if (status === 'DRAFT') {
      await prisma.activityEvent.create({
        data: { eventType: 'CHALLAN_CREATED', entityType: 'CHALLAN', entityId: challan.id, message: `Draft challan ${challanNumber} created`, createdById },
      });
    } else {
      await prisma.activityEvent.create({
        data: { eventType: 'CHALLAN_CANCELLED', entityType: 'CHALLAN', entityId: challan.id, message: `Challan ${challanNumber} cancelled`, createdById },
      });
    }

    return challan;
  }

  await createChallan(0, [{ productIdx: 0, qty: 5 }, { productIdx: 7, qty: 10 }], 'CONFIRMED', sales.id);
  await createChallan(1, [{ productIdx: 1, qty: 50 }], 'CONFIRMED', sales.id);
  await createChallan(3, [{ productIdx: 9, qty: 2 }], 'CONFIRMED', sales.id);
  await createChallan(5, [{ productIdx: 2, qty: 3 }, { productIdx: 12, qty: 5 }], 'DRAFT', sales.id);
  await createChallan(8, [{ productIdx: 4, qty: 10 }], 'DRAFT', sales.id);
  await createChallan(2, [{ productIdx: 8, qty: 2 }], 'DRAFT', sales.id);
  await createChallan(10, [{ productIdx: 15, qty: 20 }], 'CONFIRMED', sales.id);
  await createChallan(13, [{ productIdx: 6, qty: 5 }], 'CONFIRMED', sales.id);
  await createChallan(15, [{ productIdx: 19, qty: 8 }], 'CONFIRMED', sales.id);
  await createChallan(4, [{ productIdx: 3, qty: 100 }], 'CANCELLED', sales.id);
  await createChallan(7, [{ productIdx: 13, qty: 30 }], 'CONFIRMED', sales.id);
  await createChallan(11, [{ productIdx: 17, qty: 4 }], 'DRAFT', sales.id);

  // Additional stock movements
  await prisma.stockMovement.create({
    data: { productId: products[1].id, quantity: 100, movementType: 'IN', reason: 'PURCHASE', referenceType: 'MANUAL', notes: 'Restock from supplier', createdById: warehouse.id },
  });
  await prisma.product.update({ where: { id: products[1].id }, data: { currentStock: { increment: 100 } } });

  await prisma.activityEvent.create({
    data: { eventType: 'STOCK_MOVEMENT', entityType: 'STOCK_MOVEMENT', entityId: products[1].id, message: '100 units IN for A4 Copy Paper', createdById: warehouse.id },
  });

  // Low stock events
  for (const p of products.filter((_, i) => [0, 2, 5, 8, 12, 17, 27].includes(i))) {
    await prisma.activityEvent.create({
      data: {
        eventType: 'LOW_STOCK',
        entityType: 'PRODUCT',
        entityId: p.id,
        message: `${p.name} (${p.sku}) is below minimum stock threshold`,
        metadata: { currentStock: p.currentStock, minimumStock: p.minimumStock },
      },
    });
  }

  await prisma.activityEvent.create({
    data: { eventType: 'FOLLOWUP_OVERDUE', entityType: 'CUSTOMER', entityId: customers[0].id, message: 'Follow-up overdue for ABC Distributors', createdById: sales.id },
  });

  console.log('✅ Seed completed successfully!');
  console.log(`   Users: ${users.length}`);
  console.log(`   Customers: ${customers.length}`);
  console.log(`   Products: ${products.length}`);
  console.log(`   Demo password: ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
