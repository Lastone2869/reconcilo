import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar.js';
import { TopBar } from './TopBar.js';
import { OfflineBanner } from './OfflineBanner.js';
import { StoreConnectivityState, UserRole } from '@reconcilo/shared';
import { useConnectivity } from '../../hooks/useConnectivity.js';
import { useAuthStore } from '../../stores/auth.store.js';

import { useEffect } from 'react';
import { DataSyncService } from '../../services/data-sync.service.js';

export const AppLayout: React.FC = () => {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('reconcilo_theme');
    if (saved) {
      const isDark = saved === 'dark';
      document.documentElement.classList.toggle('dark', isDark);
      return isDark;
    }
    return document.documentElement.classList.contains('dark');
  });
  const navigate = useNavigate();

  const { user, logout } = useAuthStore();
  const { connectivityState, pendingCount, isSyncing, triggerSync } = useConnectivity();

  const [openConflictsCount, setOpenConflictsCount] = useState(() =>
    DataSyncService.getOpenConflictsCount()
  );
  const [suspiciousCount, setSuspiciousCount] = useState(() =>
    DataSyncService.getSuspiciousCount()
  );

  useEffect(() => {
    const update = () => {
      setOpenConflictsCount(DataSyncService.getOpenConflictsCount());
      setSuspiciousCount(DataSyncService.getSuspiciousCount());
    };
    update();
    const unsub = DataSyncService.subscribe(update);
    return () => unsub();
  }, []);

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle('dark', next);
      localStorage.setItem('reconcilo_theme', next ? 'dark' : 'light');
      return next;
    });
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userRole = user?.role || UserRole.STORE_STAFF;
  const userName = user?.name || 'Staff User';
  return (
    <div className="min-h-screen flex bg-surface dark:bg-surface-dark">
      {/* Sidebar navigation */}
      <Sidebar
        role={userRole}
        pendingSyncCount={pendingCount}
        openConflictsCount={openConflictsCount}
        suspiciousCount={suspiciousCount}
      />

      {/* Main content column */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <TopBar
          storeName="Downtown Flagship #001"
          connectivityState={connectivityState}
          userRole={userRole}
          userName={userName}
          darkMode={darkMode}
          onToggleDarkMode={toggleDarkMode}
          onLogout={handleLogout}
        />

        <OfflineBanner
          isOffline={connectivityState === StoreConnectivityState.OFFLINE}
          pendingCount={pendingCount}
          onManualSync={triggerSync}
          isSyncing={isSyncing}
        />

        {/* Scrollable Page Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
