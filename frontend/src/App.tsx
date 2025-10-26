// App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import PrivateRoute from './components/PrivateRoute';
import AdminRoutes from './routes/AdminRoutes';
import ClientRoutes from './routes/ClientRoutes';
import Login from './layouts/account/Login';
import Register from './layouts/account/Register';
import Unauthorized from './pages/Unauthorized';
import authService from './services/authService';
import Profile from "./pages/client/Users/Profile";
import Wishlist from "./pages/client/Wishlist/Wishlist";
import Cart from "./pages/client/Cart/Cart";
// Component wrapper để redirect nếu đã login
const PublicRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const isAuthenticated = authService.isAuthenticated();
  const user = authService.getCurrentUser();

  if (isAuthenticated && user) {
    // Redirect về dashboard theo role
    if (user.role === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return children;
};

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        {/* Public Routes - Không cho phép truy cập khi đã đăng nhập */}
        <Route 
          path="/login" 
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } 
        />
        <Route 
          path="/register" 
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          } 
        />
        
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Admin Routes - BẮT BUỘC đăng nhập và role admin */}
        <Route element={<PrivateRoute requiredRole="admin" />}>
          <Route path="/admin/*" element={<AdminRoutes />} />
        </Route>

        {/* Client Routes - PUBLIC, không cần đăng nhập */}
        <Route path="/*" element={<ClientRoutes />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/wishlist" element={<Wishlist />} />
        <Route path="/cart" element={<Cart />} />
      </Routes>
    </Router>
  );
};

export default App;