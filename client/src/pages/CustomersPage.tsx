import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Download, Search } from 'lucide-react';
import { customerApi } from '../services/api';
import { formatApiError } from '../lib/api';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';
import { TableSkeleton } from '../components/LoadingState';
import { useToast } from '../components/Toast';
import { formatDateTime } from '../utils/date';
import type { Customer } from '../types';

export function CustomersPage() {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(searchParams.get('new') === 'true');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['customers', page, search, status],
    queryFn: () => customerApi.list({
      page: String(page), limit: '20',
      ...(search && { search }),
      ...(status && { status }),
    }),
  });

  const createMutation = useMutation({
    mutationFn: (formData: Record<string, string>) => customerApi.create(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setShowForm(false);
      toast('Customer created successfully', 'success');
    },
    onError: (err: Error) => toast(formatApiError(err), 'error'),
  });

  const customers = (data?.data || []) as Customer[];
  const meta = data?.meta;

  const handleExport = async () => {
    const res = await customerApi.exportCsv();
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'customers.csv';
    a.click();
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Customers"
        subtitle="Manage your sales pipeline and customer relationships"
        actions={
          <>
            <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-border rounded-md hover:bg-surface">
              <Download size={16} /> Export
            </button>
            <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-accent text-white rounded-md hover:bg-accent-hover">
              <Plus size={16} /> Add Customer
            </button>
          </>
        }
      />

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search customers..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-md bg-surface-elevated focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="px-3 py-2 text-sm border border-border rounded-md bg-surface-elevated">
          <option value="">All statuses</option>
          <option value="LEAD">Lead</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      {showForm && (
        <CustomerForm
          onSubmit={(data) => createMutation.mutate(data)}
          onCancel={() => setShowForm(false)}
          loading={createMutation.isPending}
        />
      )}

      {isLoading ? <TableSkeleton /> : customers.length === 0 ? (
        <EmptyState
          title="No customers yet"
          description="Add your first customer to start building your sales pipeline."
          action={
            <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-4 py-2 text-sm bg-accent text-white rounded-md hover:bg-accent-hover">
              <Plus size={16} /> Add Customer
            </button>
          }
        />
      ) : (
        <>
          <div className="bg-surface-elevated border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface/50">
                    <th className="text-left px-4 py-3 font-medium text-text-muted">Business</th>
                    <th className="text-left px-4 py-3 font-medium text-text-muted hidden md:table-cell">Contact</th>
                    <th className="text-left px-4 py-3 font-medium text-text-muted">Type</th>
                    <th className="text-left px-4 py-3 font-medium text-text-muted">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-text-muted hidden lg:table-cell">Follow-up</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c.id} className="border-b border-border last:border-0 hover:bg-surface/50">
                      <td className="px-4 py-3">
                        <Link to={`/app/customers/${c.id}`} className="font-medium hover:text-accent">{c.businessName}</Link>
                        <p className="text-xs text-text-muted">{c.name}</p>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-text-secondary">{c.mobile}</td>
                      <td className="px-4 py-3"><StatusBadge status={c.customerType} /></td>
                      <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                      <td className="px-4 py-3 hidden lg:table-cell text-text-secondary text-xs">
                        {c.followUpDate ? formatDateTime(c.followUpDate) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-text-muted">Page {meta.page} of {meta.totalPages} ({meta.total} total)</p>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1.5 text-xs border border-border rounded-md disabled:opacity-50">Previous</button>
                <button disabled={page >= meta.totalPages} onClick={() => setPage(page + 1)} className="px-3 py-1.5 text-xs border border-border rounded-md disabled:opacity-50">Next</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CustomerForm({ onSubmit, onCancel, loading }: { onSubmit: (data: Record<string, string>) => void; onCancel: () => void; loading: boolean }) {
  const [form, setForm] = useState({
    name: '', mobile: '', email: '', businessName: '', gstNumber: '',
    customerType: 'RETAIL', address: '', status: 'LEAD',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.businessName.trim()) next.businessName = 'Business name is required';
    if (!form.name.trim()) next.name = 'Contact name is required';
    const mobile = form.mobile.replace(/\D/g, '');
    if (!mobile) next.mobile = 'Mobile number is required';
    else if (!/^[6-9]\d{9}$/.test(mobile)) next.mobile = 'Enter a valid 10-digit mobile number starting with 6–9';
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      next.email = 'Enter a valid email address';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const mobile = form.mobile.replace(/\D/g, '');
    onSubmit({
      ...form,
      mobile,
      email: form.email.trim(),
      gstNumber: form.gstNumber.trim(),
      address: form.address.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-surface-elevated border border-border rounded-lg p-5 mb-4 space-y-4">
      <h3 className="text-sm font-semibold">New Customer</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { key: 'businessName', label: 'Business Name', required: true },
          { key: 'name', label: 'Contact Name', required: true },
          { key: 'mobile', label: 'Mobile', required: true, hint: '10-digit number, e.g. 9876543210' },
          { key: 'email', label: 'Email', hint: 'Optional' },
          { key: 'gstNumber', label: 'GST Number', hint: 'Optional' },
          { key: 'address', label: 'Address', hint: 'Optional' },
        ].map((field) => (
          <div key={field.key}>
            <label className="block text-xs font-medium mb-1">{field.label}{field.required ? ' *' : ''}</label>
            <input
              value={form[field.key as keyof typeof form]}
              onChange={(e) => {
                setForm({ ...form, [field.key]: e.target.value });
                if (errors[field.key]) setErrors({ ...errors, [field.key]: '' });
              }}
              className={`w-full px-3 py-2 text-sm border rounded-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30 ${errors[field.key] ? 'border-danger' : 'border-border'}`}
              inputMode={field.key === 'mobile' ? 'numeric' : undefined}
              maxLength={field.key === 'mobile' ? 10 : undefined}
            />
            {errors[field.key] && <p className="text-xs text-danger mt-1">{errors[field.key]}</p>}
            {field.hint && !errors[field.key] && <p className="text-xs text-text-muted mt-1">{field.hint}</p>}
          </div>
        ))}
        <div>
          <label className="block text-xs font-medium mb-1">Customer Type</label>
          <select value={form.customerType} onChange={(e) => setForm({ ...form, customerType: e.target.value })} className="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface">
            <option value="RETAIL">Retail</option>
            <option value="WHOLESALE">Wholesale</option>
            <option value="DISTRIBUTOR">Distributor</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Status</label>
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface">
            <option value="LEAD">Lead</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm border border-border rounded-md">Cancel</button>
        <button type="submit" disabled={loading} className="px-4 py-2 text-sm bg-accent text-white rounded-md disabled:opacity-50">{loading ? 'Saving...' : 'Create Customer'}</button>
      </div>
    </form>
  );
}
