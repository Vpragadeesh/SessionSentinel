import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { api } from '../api/client';
import type { Pattern } from '../api/client';

export const AppShell: React.FC = () => {
  const [patterns, setPatterns] = useState<Pattern[]>([]);

  useEffect(() => {
    // Fetch patterns for sidebar badge / threat beacon
    api.getPatterns().then(setPatterns).catch(() => {});
  }, []);

  return (
    <div className="app-shell">
      <Sidebar patterns={patterns} />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};
