// src/components/PrivateRoute.tsx
import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import authService from "../services/authService";

interface PrivateRouteProps {
  requiredRole?: string;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ requiredRole }) => {
  const isAuthenticated = authService.isAuthenticated();
  const user = authService.getCurrentUser();

  // 🔒 Chưa đăng nhập → về login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // 🚫 Không có quyền → về unauthorized
  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  // ✅ Có quyền truy cập
  return <Outlet />;
};

export default PrivateRoute;
