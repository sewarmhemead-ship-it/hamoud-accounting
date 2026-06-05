import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Layout from './components/Layout'
import { ProtectedRoute, GuestRoute } from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import CentersPage from './pages/CentersPage'
import CenterDetailPage from './pages/CenterDetailPage'
import ShipmentsPage from './pages/ShipmentsPage'
import NewShipmentPage from './pages/NewShipmentPage'
import ShipmentDetailPage from './pages/ShipmentDetailPage'
import WipPage from './pages/WipPage'
import ReadyToPostPage from './pages/ReadyToPostPage'
import BrokerStatementPage from './pages/BrokerStatementPage'
import DualStatementPage from './pages/DualStatementPage'
import TraderReportsPage from './pages/TraderReportsPage'
import CashOperationsPage from './pages/CashOperationsPage'
import PaymentsPage from './pages/PaymentsPage'
import OffsetPage from './pages/OffsetPage'
import TransactionsPage from './pages/TransactionsPage'
import ProfitPage from './pages/ProfitPage'
import InventoryPage from './pages/InventoryPage'
import ReportsPage from './pages/ReportsPage'
import AdminPage from './pages/AdminPage'
import ProfilePage from './pages/ProfilePage'
import MessagesPage from './pages/MessagesPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={
              <GuestRoute>
                <LoginPage />
              </GuestRoute>
            }
          />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="centers" element={<CentersPage />} />
            <Route path="centers/:id" element={<CenterDetailPage />} />
            <Route path="shipments" element={<ShipmentsPage />} />
            <Route path="shipments/wip" element={<WipPage />} />
            <Route path="shipments/ready" element={<ReadyToPostPage />} />
            <Route path="shipments/broker-statement" element={<BrokerStatementPage />} />
            <Route path="shipments/dual-statement" element={<DualStatementPage />} />
            <Route path="trader-reports" element={<TraderReportsPage />} />
            <Route path="shipments/new" element={<NewShipmentPage />} />
            <Route path="shipments/:id" element={<ShipmentDetailPage />} />
            <Route path="transactions" element={<TransactionsPage />} />
            <Route path="cash" element={<CashOperationsPage />} />
            <Route path="payments" element={<PaymentsPage />} />
            <Route path="offset" element={<OffsetPage />} />
            <Route path="profit" element={<ProfitPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="profile/:id" element={<ProfilePage />} />
            <Route path="messages" element={<MessagesPage />} />
            <Route
              path="admin"
              element={
                <AdminRoute>
                  <AdminPage />
                </AdminRoute>
              }
            />
          </Route>
          <Route path="juice" element={<Navigate to="/inventory" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
