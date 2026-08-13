import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { api } from '../api/client';
import type { Pattern, Alert } from '../api/client';

export const AppShell: React.FC = () => {
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    const fetchBadges = () => {
      api.getPatterns().then(setPatterns).catch(() => {});
      api.getAlerts().then(setAlerts).catch(() => {});
    };

    fetchBadges();

    window.addEventListener('dashboard-update', fetchBadges);
    return () => window.removeEventListener('dashboard-update', fetchBadges);
  }, []);

  return (
    <div className="app-shell">
      <Sidebar patterns={patterns} alerts={alerts} />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};
