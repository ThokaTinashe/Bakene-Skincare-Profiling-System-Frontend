import React from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth";
import { Toaster } from "./components/ui/sonner";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/AppLayout";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import ClientForm from "./pages/ClientForm";
import ClientProfile from "./pages/ClientProfile";
import AddConsultation from "./pages/AddConsultation";
import Users from "./pages/Users";
import AuditLogs from "./pages/AuditLogs";

function Protected({ children, roles }) {
  return (
    <ProtectedRoute roles={roles}>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  );
}

function Root() {
  const { user, loading } = useAuth();
  if (loading || user === null) return null;
  return <Navigate to={user ? "/dashboard" : "/login"} replace />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Root />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
          <Route path="/clients" element={<Protected><Clients /></Protected>} />
          <Route
            path="/clients/new"
            element={
              <Protected roles={["admin", "consultant"]}>
                <ClientForm />
              </Protected>
            }
          />
          <Route path="/clients/:id" element={<Protected><ClientProfile /></Protected>} />
          <Route
            path="/clients/:id/edit"
            element={
              <Protected roles={["admin", "consultant"]}>
                <ClientForm />
              </Protected>
            }
          />
          <Route
            path="/clients/:id/consultations/new"
            element={
              <Protected roles={["admin", "consultant"]}>
                <AddConsultation />
              </Protected>
            }
          />
          <Route path="/users" element={<Protected roles={["admin"]}><Users /></Protected>} />
          <Route path="/audit-logs" element={<Protected roles={["admin"]}><AuditLogs /></Protected>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster richColors position="top-right" />
    </AuthProvider>
  );
}

export default App;
