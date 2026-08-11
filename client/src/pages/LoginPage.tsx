import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { useToast } from '../components/Toast';
import { ApiError } from '../lib/api';

const demoUsers = [
  { email: 'admin@flowdesk.demo', role: 'Admin' },
  { email: 'sales@flowdesk.demo', role: 'Sales' },
  { email: 'warehouse@flowdesk.demo', role: 'Warehouse' },
  { email: 'accounts@flowdesk.demo', role: 'Accounts' },
];

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate('/app/dashboard');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('FlowDesk@2026');
    setLoading(true);
    try {
      await login(demoEmail, 'FlowDesk@2026');
      navigate('/app/dashboard');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full flex">
      <div className="hidden lg:flex lg:w-1/2 bg-text-primary text-white p-12 flex-col justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">FlowDesk</h1>
          <p className="text-white/60 mt-1">Operations Command Center</p>
        </div>
        <div>
          <p className="text-2xl font-light leading-relaxed text-white/90">
            Turn daily operations into clear next actions.
          </p>
          <p className="text-white/50 mt-4 text-sm">
            Customer → Sales Challan → Stock Movement → Accounts
          </p>
        </div>
        <p className="text-white/40 text-xs">Wholesale & Distribution Operations Portal</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8">
            <h1 className="text-2xl font-semibold">FlowDesk</h1>
            <p className="text-text-muted text-sm">Operations Command Center</p>
          </div>

          <h2 className="text-xl font-semibold mb-1">Sign in</h2>
          <p className="text-sm text-text-secondary mb-6">Access your operations dashboard</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-surface-elevated text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                placeholder="you@company.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-surface-elevated text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-accent text-white text-sm font-medium rounded-md hover:bg-accent-hover disabled:opacity-50 transition-colors"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-border">
            <p className="text-xs text-text-muted mb-3">Quick demo access (password: FlowDesk@2026)</p>
            <div className="grid grid-cols-2 gap-2">
              {demoUsers.map((u) => (
                <button
                  key={u.email}
                  onClick={() => quickLogin(u.email)}
                  disabled={loading}
                  className="px-3 py-2 text-xs border border-border rounded-md hover:bg-surface text-left transition-colors"
                >
                  <span className="font-medium">{u.role}</span>
                  <span className="block text-text-muted truncate">{u.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
