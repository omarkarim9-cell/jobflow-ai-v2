
import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle } from 'lucide-react';

export type NotificationType = 'success' | 'error';

interface NotificationToastProps {
  message: string;
  type: NotificationType;
  onClose: () => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed top-20 right-6 z-50 max-w-sm w-full bg-white rounded-xl shadow-2xl border-l-4 flex items-start p-4 animate-in slide-in-from-right-10 fade-in duration-300 ${
        type === 'success' ? 'border-green-500' : 'border-red-500'
    }`}>
      <div className={`p-1 rounded-full mr-3 shrink-0 ${type === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
        {type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
      </div>
      <div className="flex-1 mr-2">
        <h4 className={`text-sm font-bold ${type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
            {type === 'success' ? 'Success' : 'Error'}
        </h4>
        <p className="text-sm text-slate-600 mt-0.5 leading-snug">{message}</p>
      </div>
      <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
