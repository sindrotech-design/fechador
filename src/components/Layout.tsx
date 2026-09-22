import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = (import.meta as any).env?.VITE_SOCKET_URL || (import.meta.env.PROD ? '' : 'http://localhost:43128');

const navItems = [
  { path: '/inbox', label: 'Inbox', icon: '💬' },
  { path: '/entregas', label: 'Entregas', icon: '📦' },
  { path: '/estoque', label: 'Estoque', icon: '📋' },
  { path: '/eventos', label: 'Eventos', icon: '🎉' },
  { path: '/comunidade', label: 'Comunidade', icon: '🤝' },
  { path: '/ajustes', label: 'Ajustes', icon: '⚙️' },
  { path: '/whatsapp', label: 'WhatsApp', icon: '📱' },
];

export function Layout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [connected, setConnected] = useState(false);
  const [whatsappConnected, setWhatsappConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
    });
    
    newSocket.on('connect', () => setConnected(true));
    newSocket.on('disconnect', () => setConnected(false));
    newSocket.on('whatsapp:connected', () => setWhatsappConnected(true));
    newSocket.on('whatsapp:disconnected', () => setWhatsappConnected(false));
    newSocket.on('whatsapp:status', (data: { connected: boolean }) => {
      setWhatsappConnected(data.connected);
    });
    
    setSocket(newSocket);
    
    return () => {
      newSocket.close();
    };
  }, []);

  return (
    <div className="flex h-full">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:relative inset-y-0 left-0 z-50 w-64 bg-surface border-r border-gray-200 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🤖</span>
              <span className="font-semibold text-lg">Lia</span>
            </div>
            <button 
              className="lg:hidden p-2 rounded"
              onClick={() => setSidebarOpen(false)}
            >
              ✕
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => 
                  `flex items-center gap-3 px-3 py-2 rounded transition ${
                    isActive 
                      ? 'bg-green-50 text-green-700 font-medium' 
                      : 'text-gray-600 hover:bg-gray-50'
                  }`
                }
                onClick={() => setSidebarOpen(false)}
              >
                <span className="text-xl">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Connection status */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className={`w-2 h-2 rounded-full ${whatsappConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
              <span>{whatsappConnected ? 'WhatsApp Conectado' : 'WhatsApp Desconectado'}</span>
            </div>
            <div className="mt-2 text-xs text-gray-400">
              v1.0.0 - SindroTech
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 lg:ml-0 min-w-0 flex flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-40 bg-surface border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              className="lg:hidden p-2 rounded hover:bg-gray-100"
              onClick={() => setSidebarOpen(true)}
            >
              ☰
            </button>
            <h1 className="font-semibold text-lg lg:text-xl">
              {navItems.find(i => i.path === location.pathname)?.label || 'Lia'}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500 hidden sm:block">
              {whatsappConnected ? '🟢 WhatsApp Online' : '🔴 WhatsApp Offline'}
            </span>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}