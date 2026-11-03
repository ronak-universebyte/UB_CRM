import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '../components/common/ProtectedRoute';
import { RoleGuard } from '../components/common/RoleGuard';
import { AppLayout } from '../components/layout/AppLayout';
import { LoginPage } from '../features/auth/LoginPage';
import { UnauthorizedPage } from '../features/auth/UnauthorizedPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { StaffManagementPage } from '../features/users/StaffManagementPage';
import { UserProfilePage } from '../features/users/UserProfilePage';
import { LeadsPage } from '../features/leads/LeadsPage';
import { FollowupsPage } from '../features/followups/FollowupsPage';
import { ReportsPage } from '../features/reports/ReportsPage';
import { WhatsAppSettingsPage } from '../features/whatsapp/WhatsAppSettingsPage';
import { AiAssistantPage } from '../features/ai/AiAssistantPage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* Protected Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="leads" element={<LeadsPage />} />
        <Route path="followups" element={<FollowupsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="whatsapp" element={<WhatsAppSettingsPage />} />
        <Route path="whatsapp/settings" element={<WhatsAppSettingsPage />} />
        <Route path="ai" element={<AiAssistantPage />} />
        <Route path="profile" element={<UserProfilePage />} />
        
        {/* Role-guarded route: Only SuperAdmin and Admin can manage staff */}
        <Route
          path="staff"
          element={
            <RoleGuard allowedRoles={['SuperAdmin', 'Admin']}>
              <StaffManagementPage />
            </RoleGuard>
          }
        />
      </Route>

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

