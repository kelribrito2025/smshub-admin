import { X, Bell, AlertCircle, CheckCircle, Info, Clock } from 'lucide-react';

interface Notification {
  id: number;
  type: 'info' | 'warning' | 'success' | 'error';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  data?: any;
}

interface NotificationsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

export default function NotificationsSidebar({ 
  isOpen, 
  onClose, 
  notifications, 
  unreadCount,
  markAsRead,
  markAllAsRead 
}: NotificationsSidebarProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-400" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-blue-400" />;
    }
  };

  const getBgColor = (type: string, isRead: boolean) => {
    const opacity = isRead ? '10' : '20';
    switch (type) {
      case 'success':
        return `bg-green-500/${opacity}`;
      case 'warning':
        return `bg-yellow-500/${opacity}`;
      case 'error':
        return `bg-red-500/${opacity}`;
      case 'info':
      default:
        return `bg-blue-500/${opacity}`;
    }
  };

  const getBorderColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'border-green-500/30';
      case 'warning':
        return 'border-yellow-500/30';
      case 'error':
        return 'border-red-500/30';
      case 'info':
      default:
        return 'border-blue-500/30';
    }
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-96 bg-[#0a0f1a] border-l border-green-500/20 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-green-500/20">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-green-400" />
            <h2 className="text-lg font-semibold text-green-400">Notificações</h2>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-bold bg-green-500 text-black rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-green-500/10 rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Actions */}
        {unreadCount > 0 && (
          <div className="p-4 border-b border-green-500/20">
            <button
              onClick={markAllAsRead}
              className="text-sm text-green-400 hover:text-green-300 transition-colors"
            >
              Marcar todas como lidas
            </button>
          </div>
        )}

        {/* Notifications List */}
        <div className="overflow-y-auto h-[calc(100vh-140px)]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <Bell className="w-12 h-12 mb-2 opacity-50" />
              <p>Nenhuma notificação</p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => !notif.isRead && markAsRead(notif.id)}
                  className={`p-4 rounded-lg border ${getBgColor(notif.type, notif.isRead)} ${getBorderColor(
                    notif.type
                  )} ${!notif.isRead ? 'cursor-pointer hover:bg-opacity-30' : ''} transition-all`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">{getIcon(notif.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3
                          className={`text-sm font-semibold ${
                            notif.isRead ? 'text-gray-400' : 'text-green-400'
                          }`}
                        >
                          {notif.title}
                        </h3>
                        {!notif.isRead && (
                          <div className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0 mt-1" />
                        )}
                      </div>
                      <p
                        className={`text-sm mt-1 ${
                          notif.isRead ? 'text-gray-500' : 'text-gray-300'
                        }`}
                      >
                        {notif.message}
                      </p>
                      <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        <span>{notif.timestamp}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
