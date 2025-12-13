import { AlertTriangle, X } from "lucide-react";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  icon?: React.ReactNode;
  accentColor?: "orange" | "red" | "green" | "blue";
  customerId?: string;
  customerName?: string;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Continuar",
  cancelText = "Cancelar",
  icon,
  accentColor = "orange",
  customerId,
  customerName,
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const accentColors = {
    orange: {
      iconBg: "bg-orange-500/20",
      iconText: "text-orange-400",
      button: "bg-[#ff8804] hover:bg-[#e67a03]",
    },
    red: {
      iconBg: "bg-red-500/20",
      iconText: "text-red-400",
      button: "bg-red-600 hover:bg-red-700",
    },
    green: {
      iconBg: "bg-green-500/20",
      iconText: "text-green-400",
      button: "bg-green-600 hover:bg-green-700",
    },
    blue: {
      iconBg: "bg-blue-500/20",
      iconText: "text-blue-400",
      button: "bg-blue-600 hover:bg-blue-700",
    },
  };

  const colors = accentColors[accentColor];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colors.iconBg}`}>
              {icon || <AlertTriangle size={20} className={colors.iconText} />}
            </div>
            <div>
              <h3 className="text-lg font-medium text-white">{title}</h3>
              {customerId && (
                <p className="text-xs text-neutral-500">ID do Cliente: {customerId}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 mb-6">
          {/* Alert Box (opcional) */}
          {customerId && customerName && (
            <div className="bg-neutral-950/50 border border-neutral-800 rounded-lg p-4">
              <code className="text-sm text-neutral-300 font-mono">
                Alerta: app.numero-virtual.com diz
              </code>
            </div>
          )}
          
          {/* Message */}
          <p className="text-sm text-neutral-400">
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors text-sm font-medium"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 px-4 py-2.5 ${colors.button} text-white rounded-lg transition-colors text-sm font-medium`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
