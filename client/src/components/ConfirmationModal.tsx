import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

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
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const accentColors = {
    orange: {
      bg: "bg-orange-500/10",
      border: "border-orange-500/20",
      text: "text-orange-500",
      button: "bg-blue-600 hover:bg-blue-700",
    },
    red: {
      bg: "bg-red-500/10",
      border: "border-red-500/20",
      text: "text-red-500",
      button: "bg-red-600 hover:bg-red-700",
    },
    green: {
      bg: "bg-green-500/10",
      border: "border-green-500/20",
      text: "text-green-500",
      button: "bg-green-600 hover:bg-green-700",
    },
    blue: {
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
      text: "text-blue-500",
      button: "bg-blue-600 hover:bg-blue-700",
    },
  };

  const colors = accentColors[accentColor];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[#1a1a1a] border border-white/10 rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-full ${colors.bg} ${colors.border} border`}>
              {icon || <AlertTriangle className={`w-6 h-6 ${colors.text}`} />}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{title}</h2>
              {customerId && (
                <p className="text-sm text-gray-400 mt-1">ID do Cliente: {customerId}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 pb-6">
          <div className={`p-4 rounded-lg ${colors.bg} ${colors.border} border`}>
            <p className="text-sm text-gray-300 leading-relaxed">{message}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 px-6 pb-6">
          <Button
            onClick={onClose}
            variant="outline"
            className="bg-transparent hover:bg-white/5"
          >
            {cancelText}
          </Button>
          <Button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={colors.button}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
