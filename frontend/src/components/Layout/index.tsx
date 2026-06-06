import { Outlet } from 'react-router-dom';
import { Sidebar } from '../Sidebar';
import { Header } from '../Header';
import { ToastProvider } from '../../contexts/ToastContext';
import { NexusAIButton } from '../ai/NexusAIButton';

export function Layout() {
  return (
    <ToastProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 p-8 overflow-auto page-bg">
            <Outlet />
          </main>
        </div>
      </div>
      <NexusAIButton />
    </ToastProvider>
  );
}
