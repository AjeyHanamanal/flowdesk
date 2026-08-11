import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Phone, Mail, MapPin } from 'lucide-react';
import { customerApi } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { Timeline } from '../components/Timeline';
import { PageSkeleton } from '../components/LoadingState';
import { useToast } from '../components/Toast';
import type { Customer } from '../types';

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [note, setNote] = useState('');
  const [followupDate, setFollowupDate] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => customerApi.get(id!).then((r) => r.data),
    enabled: !!id,
  });

  const { data: timeline } = useQuery({
    queryKey: ['customer-timeline', id],
    queryFn: () => customerApi.getTimeline(id!).then((r) => r.data),
    enabled: !!id,
  });

  const noteMutation = useMutation({
    mutationFn: (content: string) => customerApi.addNote(id!, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', id] });
      queryClient.invalidateQueries({ queryKey: ['customer-timeline', id] });
      setNote('');
      toast('Note added', 'success');
    },
    onError: (err: Error) => toast(err.message, 'error'),
  });

  const followupMutation = useMutation({
    mutationFn: (scheduledAt: string) => customerApi.addFollowup(id!, scheduledAt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', id] });
      queryClient.invalidateQueries({ queryKey: ['customer-timeline', id] });
      setFollowupDate('');
      toast('Follow-up scheduled', 'success');
    },
    onError: (err: Error) => toast(err.message, 'error'),
  });

  if (isLoading) return <PageSkeleton />;
  const c = customer as Customer & { notes?: { id: string; content: string; createdAt: string; createdBy: { name: string } }[]; challans?: { id: string; challanNumber: string; status: string }[] };

  return (
    <div className="animate-fade-in">
      <Link to="/app/customers" className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-accent mb-4">
        <ArrowLeft size={16} /> Back to customers
      </Link>

      <div className="bg-surface-elevated border border-border rounded-lg p-6 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">{c.businessName}</h1>
            <p className="text-sm text-text-secondary mt-1">{c.name}</p>
            <div className="flex items-center gap-2 mt-3">
              <StatusBadge status={c.customerType} />
              <StatusBadge status={c.status} />
            </div>
          </div>
          {c.gstNumber && (
            <div className="text-right">
              <p className="text-xs text-text-muted">GST</p>
              <p className="text-sm font-mono">{c.gstNumber}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-border">
          <div className="flex items-center gap-2 text-sm">
            <Phone size={16} className="text-text-muted" />
            <span>{c.mobile}</span>
          </div>
          {c.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail size={16} className="text-text-muted" />
              <span>{c.email}</span>
            </div>
          )}
          {c.address && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin size={16} className="text-text-muted" />
              <span className="truncate">{c.address}</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-surface-elevated border border-border rounded-lg p-5">
            <h3 className="text-sm font-semibold mb-4">CRM Timeline</h3>
            <Timeline events={timeline || []} />
          </section>

          {c.challans && c.challans.length > 0 && (
            <section className="bg-surface-elevated border border-border rounded-lg p-5">
              <h3 className="text-sm font-semibold mb-3">Related Challans</h3>
              <div className="space-y-2">
                {c.challans.map((ch) => (
                  <Link key={ch.id} to={`/app/challans/${ch.id}`} className="flex items-center justify-between p-3 rounded-md hover:bg-surface text-sm">
                    <span className="font-medium">{ch.challanNumber}</span>
                    <StatusBadge status={ch.status} />
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="space-y-6">
          <section className="bg-surface-elevated border border-border rounded-lg p-5">
            <h3 className="text-sm font-semibold mb-3">Add Note</h3>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Write a note..."
              className="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
            />
            <button
              onClick={() => note && noteMutation.mutate(note)}
              disabled={!note || noteMutation.isPending}
              className="mt-2 w-full py-2 text-sm bg-accent text-white rounded-md disabled:opacity-50"
            >
              {noteMutation.isPending ? 'Saving...' : 'Add Note'}
            </button>
          </section>

          <section className="bg-surface-elevated border border-border rounded-lg p-5">
            <h3 className="text-sm font-semibold mb-3">Schedule Follow-up</h3>
            <input
              type="datetime-local"
              value={followupDate}
              onChange={(e) => setFollowupDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
            <button
              onClick={() => followupDate && followupMutation.mutate(new Date(followupDate).toISOString())}
              disabled={!followupDate || followupMutation.isPending}
              className="mt-2 w-full py-2 text-sm border border-border rounded-md hover:bg-surface disabled:opacity-50"
            >
              Schedule Follow-up
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
