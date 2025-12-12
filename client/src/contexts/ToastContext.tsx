import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Toast, ToastData, ToastType } from '@/components/Toast';

interface ToastContextType {
  showToast: (type: ToastType, message: string, options?: ToastOptions) => void;
}

interface ToastOptions {
  duration?: number;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [currentToast, setCurrentToast] = useState<ToastData | null>(null);

  const showToast = useCallback((type: ToastType, message: string, options?: ToastOptions) => {
    const duration = options?.duration ?? 3000;
    const id = Math.random().toString(36).substring(7);

    setCurrentToast({ id, type, message });

    // Auto-close após duration
    setTimeout(() => {
      setCurrentToast(null);
    }, duration);
  }, []);

  const handleClose = useCallback((id: string) => {
    setCurrentToast((current) => (current?.id === id ? null : current));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {currentToast && <Toast toast={currentToast} onClose={handleClose} />}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

// Funções utilitárias para facilitar o uso
export const toast = {
  success: (message: string, options?: ToastOptions) => {
    // Usar evento customizado para permitir chamadas fora de componentes React
    window.dispatchEvent(
      new CustomEvent('show-toast', {
        detail: { type: 'success', message, options },
      })
    );
  },
  error: (message: string, options?: ToastOptions) => {
    window.dispatchEvent(
      new CustomEvent('show-toast', {
        detail: { type: 'error', message, options },
      })
    );
  },
  warning: (message: string, options?: ToastOptions) => {
    window.dispatchEvent(
      new CustomEvent('show-toast', {
        detail: { type: 'warning', message, options },
      })
    );
  },
  info: (message: string, options?: ToastOptions) => {
    window.dispatchEvent(
      new CustomEvent('show-toast', {
        detail: { type: 'info', message, options },
      })
    );
  },
};

// Hook interno do Provider para escutar eventos
export function useToastListener() {
  const { showToast } = useToast();

  useEffect(() => {
    const handleShowToast = (event: Event) => {
      const customEvent = event as CustomEvent<{
        type: ToastType;
        message: string;
        options?: ToastOptions;
      }>;
      const { type, message, options } = customEvent.detail;
      showToast(type, message, options);
    };

    window.addEventListener('show-toast', handleShowToast);
    return () => window.removeEventListener('show-toast', handleShowToast);
  }, [showToast]);
}

// Provider wrapper que inclui o listener
export function ToastProviderWithListener({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <ToastListenerComponent />
      {children}
    </ToastProvider>
  );
}

function ToastListenerComponent() {
  useToastListener();
  return null;
}
