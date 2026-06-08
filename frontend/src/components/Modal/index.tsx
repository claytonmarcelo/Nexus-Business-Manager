import { ReactNode, useEffect } from 'react';
import { CheckCircleIcon, ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/solid';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'success' | 'error' | 'warning';
  title: string;
  message: string | ReactNode;
  showCloseButton?: boolean;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

export function Modal({
  isOpen,
  onClose,
  type,
  title,
  message,
  showCloseButton = true,
  autoClose = false,
  autoCloseDelay = 3000
}: ModalProps) {
  useEffect(() => {
    if (!autoClose || !isOpen) return;
    const timer = setTimeout(onClose, autoCloseDelay);
    return () => clearTimeout(timer);
  }, [autoClose, autoCloseDelay, isOpen, onClose]);

  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircleIcon className="w-12 h-12 text-green-500" />;
      case 'error':
        return <ExclamationTriangleIcon className="w-12 h-12 text-red-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="w-12 h-12 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getColors = () => {
    switch (type) {
      case 'success':
        return {
          titleColor: 'text-green-700 dark:text-green-300',
          messageColor: 'text-green-600 dark:text-green-200',
          borderColor: 'border-green-200 dark:border-green-700',
          bgColor: 'bg-green-50 dark:bg-green-900/20'
        };
      case 'error':
        return {
          titleColor: 'text-red-700 dark:text-red-300',
          messageColor: 'text-red-600 dark:text-red-200',
          borderColor: 'border-red-200 dark:border-red-700',
          bgColor: 'bg-red-50 dark:bg-red-900/20'
        };
      case 'warning':
        return {
          titleColor: 'text-yellow-700 dark:text-yellow-300',
          messageColor: 'text-yellow-600 dark:text-yellow-200',
          borderColor: 'border-yellow-200 dark:border-yellow-700',
          bgColor: 'bg-yellow-50 dark:bg-yellow-900/20'
        };
      default:
        return {
          titleColor: 'text-brand-blackCherry dark:text-brand-ivorySmoke',
          messageColor: 'text-brand-graphiteWine dark:text-brand-ivorySmoke/80',
          borderColor: 'border-brand-primary/30',
          bgColor: ''
        };
    }
  };

  const colors = getColors();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-md mx-auto relative">
        {showCloseButton && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-brand-graphiteWine/60 dark:text-brand-ivorySmoke/60 hover:text-brand-graphiteWine dark:hover:text-brand-ivorySmoke transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        )}

        <div className="text-center">
          <div className="flex justify-center mb-4">
            {getIcon()}
          </div>

          <h3 className={`text-xl font-semibold mb-3 ${colors.titleColor}`}>
            {title}
          </h3>

          <div className={`text-sm ${colors.messageColor}`}>
            {typeof message === 'string' ? (
              <p>{message}</p>
            ) : (
              message
            )}
          </div>

          {!autoClose && (
            <div className="mt-6">
              <button
                onClick={onClose}
                className="btn-primary"
              >
                Ok
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
