import { CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastData {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastProps {
  toast: ToastData;
  onClose: (id: string) => void;
}

const toastConfig = {
  success: {
    icon: CheckCircle2,
    iconColor: 'text-emerald-400',
    borderColor: 'border-emerald-500/30',
  },
  error: {
    icon: XCircle,
    iconColor: 'text-red-400',
    borderColor: 'border-red-500/30',
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-yellow-400',
    borderColor: 'border-yellow-500/30',
  },
  info: {
    icon: Info,
    iconColor: 'text-blue-400',
    borderColor: 'border-blue-500/30',
  },
};

export function Toast({ toast, onClose }: ToastProps) {
  const config = toastConfig[toast.type];
  const Icon = config.icon;

  return (
    <div
      className={`fixed top-6 right-6 z-50 animate-in slide-in-from-top-2 duration-300`}
      onClick={() => onClose(toast.id)}
    >
      <div
        className={`bg-neutral-900/95 backdrop-blur-sm border ${config.borderColor} rounded-lg px-4 py-3 shadow-xl flex items-center gap-3 cursor-pointer hover:bg-neutral-900 transition-colors`}
      >
        <Icon size={20} className={config.iconColor} />
        <span className="text-white text-sm font-medium">{toast.message}</span>
      </div>
    </div>
  );
}
