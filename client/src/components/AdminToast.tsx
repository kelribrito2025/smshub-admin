import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { useEffect } from "react";

export type ToastType = "success" | "error" | "info";

export interface ToastProps {
  message: string;
  type?: ToastType;
  onClose: () => void;
  duration?: number;
}

export function AdminToast({ message, type = "success", onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle2 size={20} className="text-emerald-400" />;
      case "error":
        return <AlertCircle size={20} className="text-red-400" />;
      case "info":
        return <Info size={20} className="text-blue-400" />;
      default:
        return <CheckCircle2 size={20} className="text-emerald-400" />;
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case "success":
        return "border-emerald-500/30";
      case "error":
        return "border-red-500/30";
      case "info":
        return "border-blue-500/30";
      default:
        return "border-emerald-500/30";
    }
  };

  return (
    <div className="fixed top-6 right-6 z-50 animate-in slide-in-from-top-2 duration-300">
      <div
        className={`bg-neutral-900/95 backdrop-blur-sm border ${getBorderColor()} rounded-lg px-4 py-3 shadow-xl flex items-center gap-3 min-w-[300px] max-w-[500px]`}
      >
        {getIcon()}
        <span className="text-white text-sm font-medium flex-1">{message}</span>
        <button
          onClick={onClose}
          className="text-neutral-400 hover:text-white transition-colors"
          aria-label="Fechar"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
