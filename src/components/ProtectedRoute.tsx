import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { member, loading } = useAuth();

  if (loading) {
    return <div className="main-content">Lade …</div>;
  }
  if (!member) {
    return <Navigate to="/intern/login" replace />;
  }
  return <>{children}</>;
}
