import { ReactNode, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Package, FileText, Activity,
  BarChart3, Settings, LogOut, Menu, X, Search, Command
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../features/auth/AuthContext';
import { CommandPalette, useCommandPalette } from '../components/CommandPalette';

const navItems = [
  { path: '/app/dashboard', label: 'Command Center', icon: LayoutDashboard, module: 'dashboard' },
  { path: '/app/customers', label: 'Customers', icon: Users, module: 'customers' },
  { path: '/app/inventory', label: 'Inventory', icon: Package, module: 'inventory' },
  { path: '/app/challans', label: 'Sales Challans', icon: FileText, module: 'challans' },
  { path: '/app/activity', label: 'Activity', icon: Activity, module: 'activity' },
];

const secondaryNav = [
  { path: '/app/reports', label: 'Reports', icon: BarChart3, module: 'reports' },
  { path: '/app/settings', label: 'Settings', icon: Settings, module: 'settings' },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout, canAccess } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { open, setOpen } = useCommandPalette();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filteredNav = navItems.filter((item) => canAccess(item.module));
  const filteredSecondary = secondaryNav.filter((item) => canAccess(item.module));

  return (
    <div className="flex h-full">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={clsx(
        'fixed lg:static inset-y-0 left-0 z-50 w-60 bg-surface-elevated border-r border-border flex flex-col transition-transform lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="px-5 py-5 border-b border-border">
          <h1 className="text-lg font-semibold text-text-primary tracking-tight">FlowDesk</h1>
          <p className="text-xs text-text-muted mt-0.5">Operations Command Center</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {filteredNav.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => clsx(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive ? 'bg-accent-subtle text-accent' : 'text-text-secondary hover:bg-surface hover:text-text-primary'
              )}
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}

          <div className="pt-4 mt-4 border-t border-border">
            {filteredSecondary.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) => clsx(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  isActive ? 'bg-accent-subtle text-accent' : 'text-text-secondary hover:bg-surface hover:text-text-primary'
                )}
              >
                <item.icon size={18} />
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>

        <div className="px-4 py-4 border-t border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-accent-subtle text-accent flex items-center justify-center text-sm font-medium">
              {user?.name?.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-text-muted capitalize">{user?.role?.toLowerCase()}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-text-secondary hover:text-danger rounded-md hover:bg-danger-bg transition-colors">
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border bg-surface-elevated flex items-center px-4 lg:px-6 gap-4 shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 rounded-md hover:bg-surface">
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-text-muted bg-surface border border-border rounded-md hover:border-border-strong flex-1 max-w-md"
          >
            <Search size={16} />
            <span>Search...</span>
            <kbd className="ml-auto hidden sm:flex items-center gap-0.5 text-xs">
              <Command size={10} />K
            </kbd>
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>

      <CommandPalette open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
