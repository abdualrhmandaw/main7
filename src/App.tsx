import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import Contracts from "./pages/Contracts";
import ContractCreate from "./pages/ContractCreate";
import ContractEdit from "./pages/ContractEdit";
import Billboards from "./pages/Billboards";
import BillboardCleanup from "./pages/BillboardCleanup";
import Users from "./pages/Users";
import PricingList from "./pages/PricingList";
import Settings from "./pages/Settings";
import Reports from "./pages/Reports";
import InstallationPricing from "./pages/InstallationPricing";
import Expenses from "./pages/Expenses";
import Customers from "./pages/Customers";
import CustomerMerge from "./pages/CustomerMerge";
import BookingRequests from "./pages/BookingRequests";
import SharedBillboards from "./pages/SharedBillboards";
import SharedCompanies from "./pages/SharedCompanies";
import Payments from "./pages/Payments";
import CustomerBilling from "./pages/CustomerBilling";
import PrintInstallationInvoice from "./pages/PrintInstallationInvoice";
import RevenueManagement from "./pages/RevenueManagement";
import ExpenseManagement from "./pages/ExpenseManagement";
import { MainLayout } from "@/components/Layout/MainLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute requireAdmin>
                  <MainLayout>
                    <Dashboard />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute requireAdmin>
                  <MainLayout>
                    <Dashboard />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/billboards"
              element={
                <ProtectedRoute requireAdmin>
                  <MainLayout>
                    <Billboards />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/billboard-cleanup"
              element={
                <ProtectedRoute requireAdmin>
                  <MainLayout>
                    <BillboardCleanup />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute requireAdmin>
                  <MainLayout>
                    <Users />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/shared-billboards"
              element={
                <ProtectedRoute requireAdmin>
                  <MainLayout>
                    <SharedBillboards />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/shared-companies"
              element={
                <ProtectedRoute requireAdmin>
                  <MainLayout>
                    <SharedCompanies />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/pricing"
              element={
                <ProtectedRoute requireAdmin>
                  <MainLayout>
                    <PricingList />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <ProtectedRoute requireAdmin>
                  <MainLayout>
                    <Settings />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/reports"
              element={
                <ProtectedRoute requireAdmin>
                  <MainLayout>
                    <Reports />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/expenses"
              element={
                <ProtectedRoute requireAdmin>
                  <MainLayout>
                    <Expenses />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/revenue-management"
              element={
                <ProtectedRoute requireAdmin>
                  <MainLayout>
                    <RevenueManagement />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/expense-management"
              element={
                <ProtectedRoute requireAdmin>
                  <MainLayout>
                    <ExpenseManagement />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/installation-pricing"
              element={
                <ProtectedRoute requireAdmin>
                  <MainLayout>
                    <InstallationPricing />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/booking-requests"
              element={
                <ProtectedRoute requireAdmin>
                  <MainLayout>
                    <BookingRequests />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/customers"
              element={
                <ProtectedRoute requireAdmin>
                  <MainLayout>
                    <Customers />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/customer-billing"
              element={
                <ProtectedRoute requireAdmin>
                  <MainLayout>
                    <CustomerBilling />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/print-installation-invoice"
              element={
                <ProtectedRoute requireAdmin>
                  <MainLayout>
                    <PrintInstallationInvoice />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/customer-merge"
              element={
                <ProtectedRoute requireAdmin>
                  <MainLayout>
                    <CustomerMerge />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/contracts"
              element={
                <ProtectedRoute requireAdmin>
                  <MainLayout>
                    <Contracts />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/payments"
              element={
                <ProtectedRoute requireAdmin>
                  <MainLayout>
                    <Payments />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/contracts/new"
              element={
                <ProtectedRoute requireAdmin>
                  <MainLayout>
                    <ContractCreate />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/contracts/edit"
              element={
                <ProtectedRoute requireAdmin>
                  <MainLayout>
                    <ContractEdit />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;