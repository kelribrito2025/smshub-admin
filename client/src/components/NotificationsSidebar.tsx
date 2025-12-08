import { useState } from 'react';
import { X, Bell, AlertCircle, CheckCircle, Info, Clock } from 'lucide-react';

interface Notification {
  id: number;
  type: 'info' | 'warning' | 'success' | 'error';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
}

interface NotificationsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationsSidebar({ isOpen, onClose }: NotificationsSidebarProps) {
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: 1,
      type: 'success',
      title: 'Recarga Confirmada',
      message: 'Sua recarga de R$ 100,00 foi processada com sucesso.',
      timestamp: '2 min atrás',
      isRead: false,
    },
    {
      id: 2,
      type: 'info',
      title: 'Nova API Disponível',
      message: 'A API de consulta de CPF v2.0 está disponível para uso.',
      timestamp: '15 min atrás',
      isRead: false,
    },
    {
      id: 3,
      type: 'warning',
      title: 'Saldo Baixo',
      message: 'Seu saldo está abaixo de R$ 50,00. Considere fazer uma recarga.',
      timestamp: '1 hora atrás',
      isRead: true,
    },
    {
      id: 4,
      type: 'error',
      title: 'Falha na Requisição',
      message: 'A requisição para API falhou. Verifique seus parâmetros.',
      timestamp: '2 horas atrás',
      isRead: true,
    },
    {
      id: 5,
      type: 'info',
      title: 'Manutenção Programada',
      message: 'Sistema passará por manutenção no domingo às 03:00.',
      timestamp: '1 dia atrás',
      isRead: true,
    },
  ]);

  const markAsRead = (id: number) => {
    setNotifications(notifications.map(notif =>
      notif.id === id ? { ...notif, isRead: true } : notif
    ));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(notif => ({ ...notif, isRead: true })));
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-400" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      default:
        return <Info className="w-5 h-5 text-blue-400" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'border-green-500/30 bg-green-500/5';
      case 'warning':
        return 'border-yellow-500/30 bg-yellow-500/5';
      case 'error':
        return 'border-red-500/30 bg-red-500/5';
      default:
        return 'border-blue-500/30 bg-blue-500/5';
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-gradient-to-br from-gray-900 to-black border-l-2 border-green-500 z-[110] transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Cyber Grid Background */}
        <div className="absolute inset-0 opacity-5">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'linear-gradient(#22c55e 1px, transparent 1px), linear-gradient(90deg, #22c55e 1px, transparent 1px)',
              backgroundSize: '30px 30px',
            }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col">
          {/* Header */}
          <div className="p-6 border-b-2 border-green-500/30">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                  <Bell className="w-6 h-6 text-black" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-green-400 font-mono">Notificações</h2>
                  {unreadCount > 0 && (
                    <span className="text-green-300/70 text-sm font-mono">
                      {unreadCount} nova{unreadCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center rounded-lg border-2 border-green-500/30 text-green-400 hover:bg-green-500/10 hover:border-green-500 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-green-300/70 text-sm font-mono">
              Acompanhe as atualizações e alertas do sistema
            </p>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="mt-3 text-green-400 text-sm font-mono hover:text-green-300 transition-colors underline"
              >
                Marcar todas como lidas
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => markAsRead(notification.id)}
                className={`relative border-2 rounded-xl p-4 cursor-pointer transition-all hover:scale-[1.02] ${
                  getTypeColor(notification.type)
                } ${
                  !notification.isRead ? 'border-green-500/50' : 'border-green-500/20'
                }`}
              >
                {/* Unread Badge */}
                {!notification.isRead && (
                  <div className="absolute top-3 right-3 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                )}

                {/* Notification Content */}
                <div className="flex gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-bold font-mono mb-1 ${
                      !notification.isRead ? 'text-green-400' : 'text-green-400/70'
                    }`}>
                      {notification.title}
                    </h3>
                    <p className={`text-sm font-mono mb-2 ${
                      !notification.isRead ? 'text-green-300' : 'text-green-300/60'
                    }`}>
                      {notification.message}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-green-400/50 font-mono">
                      <Clock className="w-3 h-3" />
                      {notification.timestamp}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>


        </div>
      </div>
    </>
  );
}
