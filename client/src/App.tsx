import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './features/auth/AuthContext';
import { ToastProvider } from './components/Toast';
import { ProtectedRoute } from './features/auth/ProtectedRoute';
import { AppLayout } from './layouts/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { CustomersPage } from './pages/CustomersPage';
import { CustomerDetailPage } from './pages/CustomerDetailPage';
import { InventoryPage } from './pages/InventoryPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { ChallansPage } from './pages/ChallansPage';
import { ChallanCreatePage } from './pages/ChallanCreatePage';
import { ChallanDetailPage } from './pages/ChallanDetailPage';
import { ActivityPage } from './pages/ActivityPage';
import { ReportsPage, SettingsPage } from './pages/ReportsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30000, refetchOnWindowFocus: false },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/app" element={<ProtectedRoute><AppLayout><Navigate to="/app/dashboard" replace /></AppLayout></ProtectedRoute>} />
              <Route path="/app/dashboard" element={<ProtectedRoute><AppLayout><DashboardPage /></AppLayout></ProtectedRoute>} />
              <Route path="/app/customers" element={<ProtectedRoute><AppLayout><CustomersPage /></AppLayout></ProtectedRoute>} />
              <Route path="/app/customers/:id" element={<ProtectedRoute><AppLayout><CustomerDetailPage /></AppLayout></ProtectedRoute>} />
              <Route path="/app/inventory" element={<ProtectedRoute><AppLayout><InventoryPage /></AppLayout></ProtectedRoute>} />
              <Route path="/app/inventory/:id" element={<ProtectedRoute><AppLayout><ProductDetailPage /></AppLayout></ProtectedRoute>} />
              <Route path="/app/challans" element={<ProtectedRoute><AppLayout><ChallansPage /></AppLayout></ProtectedRoute>} />
              <Route path="/app/challans/new" element={<ProtectedRoute><AppLayout><ChallanCreatePage /></AppLayout></ProtectedRoute>} />
              <Route path="/app/challans/:id" element={<ProtectedRoute><AppLayout><ChallanDetailPage /></AppLayout></ProtectedRoute>} />
              <Route path="/app/activity" element={<ProtectedRoute><AppLayout><ActivityPage /></AppLayout></ProtectedRoute>} />
              <Route path="/app/reports" element={<ProtectedRoute><AppLayout><ReportsPage /></AppLayout></ProtectedRoute>} />
              <Route path="/app/settings" element={<ProtectedRoute><AppLayout><SettingsPage /></AppLayout></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
