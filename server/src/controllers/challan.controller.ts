import { Response, NextFunction } from 'express';
import PDFDocument from 'pdfkit';
import { AuthRequest } from '../middleware/auth';
import { challanService } from '../services/challan.service';
import { sendSuccess } from '../utils/response';

export async function listChallans(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await challanService.list(req.query as never);
    sendSuccess(res, result.items, 200, result.meta);
  } catch (error) {
    next(error);
  }
}

export async function getChallan(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const challan = await challanService.getById(String(req.params.id));
    sendSuccess(res, challan);
  } catch (error) {
    next(error);
  }
}

export async function createChallan(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const challan = await challanService.create(req.body, req.user!.id);
    sendSuccess(res, challan, 201);
  } catch (error) {
    next(error);
  }
}

export async function updateChallan(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const challan = await challanService.update(String(req.params.id), req.body, req.user!.id);
    sendSuccess(res, challan);
  } catch (error) {
    next(error);
  }
}

export async function confirmChallan(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const challan = await challanService.confirm(String(req.params.id), req.user!.id);
    sendSuccess(res, challan);
  } catch (error) {
    next(error);
  }
}

export async function cancelChallan(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const challan = await challanService.cancel(String(req.params.id), req.user!.id);
    sendSuccess(res, challan);
  } catch (error) {
    next(error);
  }
}

export async function checkStock(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await challanService.checkStockAvailability(req.body.items);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function exportChallans(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const csv = await challanService.exportCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=challans.csv');
    res.send(csv);
  } catch (error) {
    next(error);
  }
}

export async function downloadPdf(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const challan = await challanService.getById(String(req.params.id));
    if (challan.status !== 'CONFIRMED') {
      return res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: 'PDF only available for confirmed challans' } });
    }

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${challan.challanNumber}.pdf`);
    doc.pipe(res);

    doc.fontSize(20).text('FlowDesk', { align: 'center' });
    doc.fontSize(14).text('Sales Challan', { align: 'center' });
    doc.moveDown();
    doc.fontSize(16).text(challan.challanNumber, { align: 'center' });
    doc.fontSize(10).text(`Status: ${challan.status}`, { align: 'center' });
    doc.moveDown();

    doc.fontSize(12).text('Customer Information');
    doc.fontSize(10)
      .text(`Business: ${challan.customer.businessName}`)
      .text(`Contact: ${challan.customer.name}`)
      .text(`Mobile: ${challan.customer.mobile}`);
    if (challan.customer.gstNumber) doc.text(`GST: ${challan.customer.gstNumber}`);
    doc.moveDown();

    doc.fontSize(12).text('Items');
    doc.moveDown(0.5);
    let y = doc.y;
    doc.fontSize(9).text('Product', 50, y).text('SKU', 200, y).text('Qty', 300, y).text('Price', 350, y).text('Total', 420, y);
    doc.moveTo(50, y + 12).lineTo(550, y + 12).stroke();
    doc.moveDown();

    challan.items.forEach((item) => {
      doc.text(item.productNameSnapshot, 50)
        .text(item.skuSnapshot, 200, doc.y - 12)
        .text(String(item.quantity), 300, doc.y - 12)
        .text(`₹${item.unitPriceSnapshot}`, 350, doc.y - 12)
        .text(`₹${item.lineTotal}`, 420, doc.y - 12);
      doc.moveDown(0.3);
    });

    doc.moveDown();
    doc.fontSize(11).text(`Total Quantity: ${challan.totalQuantity}`, { align: 'right' });
    doc.text(`Total Amount: ₹${challan.totalAmount}`, { align: 'right' });
    doc.moveDown();
    doc.fontSize(9).text(`Created by: ${challan.createdBy.name}`, 50);
    doc.text(`Date: ${new Date(challan.createdAt).toLocaleDateString()}`, 50);

    doc.end();
  } catch (error) {
    next(error);
  }
}
