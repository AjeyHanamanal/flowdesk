import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, AlertTriangle, Check } from 'lucide-react';
import { customerApi, productApi, challanApi } from '../services/api';
import { useToast } from '../components/Toast';
import { formatCurrency } from '../utils/date';
import type { Customer, Product } from '../types';

interface LineItem {
  productId: string;
  product?: Product;
  quantity: number;
}

const STEPS = ['Select Customer', 'Add Products', 'Review Quantities', 'Check Stock', 'Review & Save'];

export function ChallanCreatePage() {
  const [step, setStep] = useState(0);
  const [customerId, setCustomerId] = useState('');
  const [items, setItems] = useState<LineItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [notes, setNotes] = useState('');
  const [stockCheck, setStockCheck] = useState<{ productId: string; sufficient: boolean; available: number; requested: number; productName: string; sku: string }[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: customersData } = useQuery({
    queryKey: ['customers-all'],
    queryFn: () => customerApi.list({ page: '1', limit: '100' }),
  });

  const { data: productsData } = useQuery({
    queryKey: ['products-all'],
    queryFn: () => productApi.list({ page: '1', limit: '100' }),
  });

  const createMutation = useMutation({
    mutationFn: (status: 'DRAFT' | 'CONFIRMED') =>
      challanApi.create({ customerId, items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })), notes, status }),
    onSuccess: (result) => {
      toast('Challan created successfully', 'success');
      navigate(`/app/challans/${(result.data as { id: string }).id}`);
    },
    onError: (err: Error) => toast(err.message, 'error'),
  });

  const customers = (customersData?.data || []) as Customer[];
  const products = (productsData?.data || []) as Product[];
  const selectedCustomer = customers.find((c) => c.id === customerId);
  const totalQty = items.reduce((s, i) => s + i.quantity, 0);
  const totalAmount = items.reduce((s, i) => s + (i.product?.unitPrice || 0) * i.quantity, 0);
  const hasStockIssues = stockCheck.some((s) => !s.sufficient);

  const addItem = () => {
    const product = products.find((p) => p.id === selectedProduct);
    if (!product) return;
    const qty = parseInt(quantity) || 1;
    const existing = items.find((i) => i.productId === selectedProduct);
    if (existing) {
      setItems(items.map((i) => i.productId === selectedProduct ? { ...i, quantity: i.quantity + qty } : i));
    } else {
      setItems([...items, { productId: selectedProduct, product, quantity: qty }]);
    }
    setSelectedProduct('');
    setQuantity('1');
  };

  const checkStock = async () => {
    const { data } = await challanApi.checkStock(items.map((i) => ({ productId: i.productId, quantity: i.quantity })));
    setStockCheck(data as typeof stockCheck);
    setStep(3);
  };

  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
      <button onClick={() => navigate('/app/challans')} className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-accent mb-4">
        <ArrowLeft size={16} /> Back to challans
      </button>

      <h1 className="text-xl font-semibold mb-1">Create Sales Challan</h1>
      <p className="text-sm text-text-secondary mb-6">Guided workspace for creating delivery challans</p>

      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap ${
              i === step ? 'bg-accent-subtle text-accent' : i < step ? 'text-success' : 'text-text-muted'
            }`}>
              {i < step ? <Check size={12} /> : <span className="w-4 text-center">{i + 1}</span>}
              {s}
            </div>
            {i < STEPS.length - 1 && <div className="w-4 h-px bg-border mx-0.5" />}
          </div>
        ))}
      </div>

      {/* Live summary */}
      <div className="bg-surface-elevated border border-border rounded-lg p-4 mb-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div><p className="text-xs text-text-muted">Customer</p><p className="font-medium truncate">{selectedCustomer?.businessName || '—'}</p></div>
        <div><p className="text-xs text-text-muted">Items</p><p className="font-medium">{items.length}</p></div>
        <div><p className="text-xs text-text-muted">Total Qty</p><p className="font-medium">{totalQty}</p></div>
        <div><p className="text-xs text-text-muted">Total</p><p className="font-medium">{formatCurrency(totalAmount)}</p></div>
      </div>

      {/* Step content */}
      {step === 0 && (
        <div className="bg-surface-elevated border border-border rounded-lg p-5">
          <h3 className="text-sm font-semibold mb-3">Select Customer</h3>
          <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface">
            <option value="">Choose a customer...</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.businessName} — {c.name}</option>)}
          </select>
        </div>
      )}

      {step === 1 && (
        <div className="bg-surface-elevated border border-border rounded-lg p-5 space-y-4">
          <h3 className="text-sm font-semibold">Add Products</h3>
          <div className="flex gap-2">
            <select value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)} className="flex-1 px-3 py-2 text-sm border border-border rounded-md bg-surface">
              <option value="">Select product...</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku}) — Stock: {p.currentStock}</option>)}
            </select>
            <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-20 px-3 py-2 text-sm border border-border rounded-md bg-surface" />
            <button onClick={addItem} disabled={!selectedProduct} className="px-4 py-2 text-sm bg-accent text-white rounded-md disabled:opacity-50">Add</button>
          </div>
          {items.length > 0 && (
            <div className="border border-border rounded-md divide-y divide-border">
              {items.map((item) => (
                <div key={item.productId} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span>{item.product?.name} ({item.product?.sku})</span>
                  <div className="flex items-center gap-3">
                    <span>Qty: {item.quantity}</span>
                    <button onClick={() => setItems(items.filter((i) => i.productId !== item.productId))} className="text-danger text-xs">Remove</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="bg-surface-elevated border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-surface/50">
              <th className="text-left px-4 py-3 font-medium text-text-muted">Product</th>
              <th className="text-right px-4 py-3 font-medium text-text-muted">Available</th>
              <th className="text-right px-4 py-3 font-medium text-text-muted">Requested</th>
              <th className="text-right px-4 py-3 font-medium text-text-muted">Price</th>
              <th className="text-right px-4 py-3 font-medium text-text-muted">Total</th>
            </tr></thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.productId} className="border-b border-border">
                  <td className="px-4 py-3">{item.product?.name}<br /><span className="text-xs text-text-muted">{item.product?.sku}</span></td>
                  <td className="px-4 py-3 text-right">{item.product?.currentStock}</td>
                  <td className="px-4 py-3 text-right">{item.quantity}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(item.product?.unitPrice || 0)}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency((item.product?.unitPrice || 0) * item.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {step === 3 && (
        <div className="bg-surface-elevated border border-border rounded-lg p-5 space-y-3">
          <h3 className="text-sm font-semibold">Stock Availability</h3>
          {stockCheck.map((s) => (
            <div key={s.productId} className={`flex items-center justify-between p-3 rounded-md text-sm ${!s.sufficient ? 'bg-danger-bg' : 'bg-success-bg'}`}>
              <div>
                <p className="font-medium">{s.productName}</p>
                <p className="text-xs text-text-muted">{s.sku}</p>
              </div>
              <div className="text-right">
                <p>Available: {s.available} · Requested: {s.requested}</p>
                {!s.sufficient && (
                  <p className="text-xs text-danger flex items-center gap-1 justify-end mt-1">
                    <AlertTriangle size={12} /> Insufficient stock
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {step === 4 && (
        <div className="bg-surface-elevated border border-border rounded-lg p-5 space-y-4">
          <h3 className="text-sm font-semibold">Review & Save</h3>
          <p className="text-sm text-text-secondary">Customer: <strong>{selectedCustomer?.businessName}</strong></p>
          <p className="text-sm text-text-secondary">{items.length} items · {totalQty} units · {formatCurrency(totalAmount)}</p>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" rows={2} className="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface resize-none" />
          {hasStockIssues && (
            <p className="text-sm text-warning flex items-center gap-1"><AlertTriangle size={14} /> Stock issues detected. You can save as Draft but cannot Confirm.</p>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="px-4 py-2 text-sm border border-border rounded-md disabled:opacity-50">Back</button>
        <div className="flex gap-2">
          {step === 4 ? (
            <>
              <button onClick={() => createMutation.mutate('DRAFT')} disabled={createMutation.isPending || !customerId || items.length === 0} className="px-4 py-2 text-sm border border-border rounded-md disabled:opacity-50">Save Draft</button>
              <button onClick={() => createMutation.mutate('CONFIRMED')} disabled={createMutation.isPending || hasStockIssues || !customerId || items.length === 0} className="px-4 py-2 text-sm bg-accent text-white rounded-md disabled:opacity-50">
                {createMutation.isPending ? 'Saving...' : 'Confirm Challan'}
              </button>
            </>
          ) : step === 2 ? (
            <button onClick={checkStock} disabled={items.length === 0} className="flex items-center gap-1 px-4 py-2 text-sm bg-accent text-white rounded-md disabled:opacity-50">
              Check Stock <ArrowRight size={14} />
            </button>
          ) : (
            <button
              onClick={() => setStep(step + 1)}
              disabled={(step === 0 && !customerId) || (step === 1 && items.length === 0)}
              className="flex items-center gap-1 px-4 py-2 text-sm bg-accent text-white rounded-md disabled:opacity-50"
            >
              Next <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
