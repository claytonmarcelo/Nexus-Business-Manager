import { useState, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../Sidebar';
import { Header } from '../Header';
import { ToastProvider } from '../../contexts/ToastContext';
import { NexusAIButton } from '../ai/NexusAIButton';

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  return (
    <ToastProvider>
      <div className="flex min-h-screen">
        <Sidebar open={sidebarOpen} onClose={closeSidebar} />
        <div className="flex-1 flex flex-col min-w-0">
          <Header toggleSidebar={toggleSidebar} />
          <main className="flex-1 p-8 overflow-auto page-bg">
            <Outlet />
          </main>
        </div>
      </div>
      <NexusAIButton />
    </ToastProvider>
  );
}
