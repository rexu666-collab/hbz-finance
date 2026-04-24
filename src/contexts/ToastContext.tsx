import { createContext, useContext, useState, type ReactNode } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastContextType {
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[60] space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border transition-all slide-in min-w-[280px] ${
              toast.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                : toast.type === 'error'
                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
                : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle size={18} /> : toast.type === 'error' ? <AlertCircle size={18} /> : <Info size={18} />}
            <span className="text-sm font-medium flex-1">{toast.message}</span>
            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="opacity-60 hover:opacity-100"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}
