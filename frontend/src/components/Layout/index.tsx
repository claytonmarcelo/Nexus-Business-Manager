import { Outlet } from 'react-router-dom';
import { Sidebar } from '../Sidebar';
import { ToastProvider } from '../../contexts/ToastContext';

export function Layout() {
  return (
    <ToastProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 p-8 overflow-auto page-bg">
          <Outlet />
        </main>
      </div>
    </ToastProvider>
  );
}
