import { useState, useCallback } from "react";
import { AdminToast, ToastType } from "@/components/AdminToast";

interface ToastState {
  id: number;
  message: string;
  type: ToastType;
}

let toastId = 0;

export function useAdminToast() {
  const [toasts, setToasts] = useState<ToastState[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "success") => {
    const id = toastId++;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const ToastContainer = useCallback(() => {
    return (
      <>
        {toasts.map((toast) => (
          <AdminToast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </>
    );
  }, [toasts, removeToast]);

  return {
    showToast,
    ToastContainer,
  };
}
