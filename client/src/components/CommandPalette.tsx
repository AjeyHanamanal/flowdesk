import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, Package, FileText, LayoutDashboard, Plus, Command } from 'lucide-react';
import { dashboardApi } from '../services/api';
import type { SearchResult } from '../types';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ customers: SearchResult[]; products: SearchResult[]; challans: SearchResult[] } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) { setQuery(''); setResults(null); }
  }, [open]);

  useEffect(() => {
    if (!query.trim()) { setResults(null); return; }
    const timer = setTimeout(async () => {
      try {
        const { data } = await dashboardApi.search(query);
        setResults(data);
      } catch { setResults(null); }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = useCallback((path: string) => {
    navigate(path);
    onClose();
  }, [navigate, onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const commands = [
    { label: 'Open Command Center', icon: LayoutDashboard, path: '/app/dashboard' },
    { label: 'Create Customer', icon: Plus, path: '/app/customers?new=true' },
    { label: 'Create Product', icon: Plus, path: '/app/inventory?new=true' },
    { label: 'Create Challan', icon: Plus, path: '/app/challans/new' },
  ];

  const allResults = results
    ? [...results.customers, ...results.products, ...results.challans]
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/40" onClick={onClose}>
      <div className="w-full max-w-lg bg-surface-elevated rounded-lg shadow-md border border-border overflow-hidden animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search size={18} className="text-text-muted" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search customers, products, challans..."
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-text-muted"
          />
          <kbd className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 text-xs text-text-muted bg-surface border border-border rounded">
            <Command size={10} />K
          </kbd>
        </div>
        <div className="max-h-80 overflow-y-auto py-2">
          {!query && commands.map((cmd) => (
            <button
              key={cmd.path}
              onClick={() => handleSelect(cmd.path)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-surface text-left"
            >
              <cmd.icon size={16} className="text-text-muted" />
              {cmd.label}
            </button>
          ))}
          {query && allResults.length === 0 && (
            <p className="px-4 py-6 text-sm text-text-muted text-center">No results found</p>
          )}
          {allResults.map((r) => {
            const icons = { customer: Users, product: Package, challan: FileText };
            const Icon = icons[r.type];
            return (
              <button
                key={`${r.type}-${r.id}`}
                onClick={() => handleSelect(r.path)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-surface text-left"
              >
                <Icon size={16} className="text-text-muted" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{r.title}</p>
                  <p className="text-xs text-text-muted truncate">{r.subtitle}</p>
                </div>
                <span className="text-xs text-text-muted capitalize">{r.type}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === '/' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return { open, setOpen };
}
