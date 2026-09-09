import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout.js';
import { LoginPage } from './pages/Login.js';
import { POSPage } from './pages/POS.js';
import { StoreDashboardPage } from './pages/StoreDashboard.js';
import { TransactionHistoryPage } from './pages/TransactionHistory.js';
import { ConflictResolutionPage } from './pages/ConflictResolution.js';
import { SuspiciousActivityPage } from './pages/SuspiciousActivity.js';
import { PendingTransactionsPage } from './pages/PendingTransactions.js';
import { HQDashboardPage } from './pages/HQDashboard.js';
import { GlobalInventoryPage } from './pages/GlobalInventory.js';
import { DLQInvestigationPage } from './pages/DLQInvestigation.js';
import { SystemSettingsPage } from './pages/SystemSettings.js';
import { SupplierPortalPage } from './pages/SupplierPortal.js';
import { StoreReportsPage } from './pages/StoreReports.js';
import { StockTransferPage } from './pages/StockTransfer.js';
import { TeamAccessPage } from './pages/TeamAccess.js';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'pos',
        element: <POSPage />,
      },
      {
        path: 'pending-transactions',
        element: <PendingTransactionsPage />,
      },
      {
        path: 'dashboard',
        element: <StoreDashboardPage />,
      },
      {
        path: 'transactions',
        element: <TransactionHistoryPage />,
      },
      {
        path: 'conflicts',
        element: <ConflictResolutionPage />,
      },
      {
        path: 'suspicious-activity',
        element: <SuspiciousActivityPage />,
      },
      {
        path: 'store-reports',
        element: <StoreReportsPage />,
      },
      {
        path: 'hq',
        element: <HQDashboardPage />,
      },
      {
        path: 'global-inventory',
        element: <GlobalInventoryPage />,
      },
      {
        path: 'stock-transfer',
        element: <StockTransferPage />,
      },
      {
        path: 'team-access',
        element: <TeamAccessPage />,
      },
      {
        path: 'dlq',
        element: <DLQInvestigationPage />,
      },
      {
        path: 'settings',
        element: <SystemSettingsPage />,
      },
      {
        path: 'supplier',
        element: <SupplierPortalPage />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
]);
