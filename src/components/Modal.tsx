import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export default function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      {/* Modal box */}
      <div className={`relative w-full ${sizeClasses[size]} max-h-[85dvh] flex flex-col bg-gray-100 dark:bg-slate-800 rounded-2xl shadow-2xl`}>
        <div className="flex items-center justify-between px-3 py-2.5 sm:p-4 border-b border-gray-300 dark:border-slate-700 shrink-0">
          <h2 className="text-sm sm:text-base font-semibold truncate pr-4">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-3 sm:p-4 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
