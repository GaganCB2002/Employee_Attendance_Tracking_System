import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useThemeStore } from './stores/themeStore';
import LoginPage from './pages/LoginPage';
import EmployeeCheckInPage from './pages/EmployeeCheckInPage';
import AdminLiveMonitor from './pages/AdminLiveMonitor';
import GeofencingPage from './pages/GeofencingPage';
import ShiftEnginePage from './pages/ShiftEnginePage';
import AuditTrailPage from './pages/AuditTrailPage';
import LiveTvPage from './pages/LiveTvPage';
import EmployeesPage from './pages/EmployeesPage';
import DepartmentsPage from './pages/DepartmentsPage';
import FloorsPage from './pages/FloorsPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';

// Protected Route Component
function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, user, isLocked } = useAuth();
  const location = useLocation();

  if (isLocked) {
    return <Navigate to="/login" replace state={{ locked: true }} />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    if (user?.role === 'EMPLOYEE') {
      return <Navigate to="/checkin" replace />;
    }
    return <Navigate to="/ops" replace />;
  }

  return children;
}

export default function App() {
  const { checkAuth, isAuthenticated, user, logout } = useAuth();
  const { initTheme } = useThemeStore();
  const navigate = useNavigate();

  useEffect(() => {
    // Initialize project-wide theme tokens on launch
    initTheme();
    checkAuth();

    // Security: Browser Back-Button Interception
    const handlePopState = (e) => {
      if (isAuthenticated) {
        console.warn('[SECURITY] Browser back-button intercepted.');
        window.history.pushState(null, '', window.location.href);
      }
    };

    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isAuthenticated, checkAuth, initTheme]);

  return (
    <Routes>
      {/* Public Login Route */}
      <Route path="/login" element={<LoginPage />} />

      {/* Employee Facing Check-In Flow */}
      <Route
        path="/checkin"
        element={
          <ProtectedRoute allowedRoles={['EMPLOYEE']}>
            <EmployeeCheckInPage />
          </ProtectedRoute>
        }
      />

      {/* Admin Ops Monitoring Dashboard */}
      <Route
        path="/ops"
        element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'SECTION_ADMIN']}>
            <AdminLiveMonitor />
          </ProtectedRoute>
        }
      />

      {/* LIVE TV Dedicated Monitoring Dashboard */}
      <Route
        path="/live-tv"
        element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'SECTION_ADMIN']}>
            <LiveTvPage />
          </ProtectedRoute>
        }
      />

      {/* Workforce Employees Directory & Profiles */}
      <Route
        path="/employees"
        element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'SECTION_ADMIN']}>
            <EmployeesPage />
          </ProtectedRoute>
        }
      />

      {/* Departments Management */}
      <Route
        path="/departments"
        element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'SECTION_ADMIN']}>
            <DepartmentsPage />
          </ProtectedRoute>
        }
      />

      {/* Floors Management */}
      <Route
        path="/floors"
        element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'SECTION_ADMIN']}>
            <FloorsPage />
          </ProtectedRoute>
        }
      />

      {/* Attendance Records & Folder Views */}
      <Route
        path="/attendance"
        element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'SECTION_ADMIN']}>
            <AuditTrailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ops/folders"
        element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'SECTION_ADMIN']}>
            <AuditTrailPage />
          </ProtectedRoute>
        }
      />

      {/* Enterprise Reports & Exports */}
      <Route
        path="/reports"
        element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'SECTION_ADMIN']}>
            <ReportsPage />
          </ProtectedRoute>
        }
      />

      {/* Admin Settings & Project Theme Customization */}
      <Route
        path="/settings"
        element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'SECTION_ADMIN']}>
            <SettingsPage />
          </ProtectedRoute>
        }
      />

      {/* Admin Geofencing Vector Page */}
      <Route
        path="/ops/geofencing"
        element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'SECTION_ADMIN']}>
            <GeofencingPage />
          </ProtectedRoute>
        }
      />

      {/* Admin Shifts Engine Page */}
      <Route
        path="/ops/shifts"
        element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'SECTION_ADMIN']}>
            <ShiftEnginePage />
          </ProtectedRoute>
        }
      />

      {/* Admin Security Audit Trail */}
      <Route
        path="/ops/audit"
        element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'SECTION_ADMIN']}>
            <AuditTrailPage />
          </ProtectedRoute>
        }
      />

      {/* Catch-all redirect */}
      <Route
        path="*"
        element={
          !isAuthenticated ? (
            <Navigate to="/login" replace />
          ) : user?.role === 'EMPLOYEE' ? (
            <Navigate to="/checkin" replace />
          ) : (
            <Navigate to="/ops" replace />
          )
        }
      />
    </Routes>
  );
}
