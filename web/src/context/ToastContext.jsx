import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info', duration = 4500) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    setToasts(prev => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      
      {/* Fixed Floating Toast Container */}
      <div className="toast-portal-container" style={{
        position: 'fixed',
        top: '1.5rem',
        right: '1.5rem',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        maxWidth: '420px',
        width: 'calc(100vw - 3rem)',
        pointerEvents: 'none'
      }}>
        {toasts.map(toast => {
          const isSuccess = toast.type === 'success';
          const isError = toast.type === 'error';
          
          return (
            <div
              key={toast.id}
              className="toast-popup"
              style={{
                pointerEvents: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.9rem 1.25rem',
                borderRadius: 'var(--radius-md)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                background: isSuccess 
                  ? 'rgba(16, 185, 129, 0.92)' 
                  : isError 
                    ? 'rgba(239, 68, 68, 0.92)' 
                    : 'rgba(30, 41, 59, 0.92)',
                border: `1px solid ${isSuccess ? '#10b981' : isError ? '#ef4444' : 'rgba(255, 255, 255, 0.2)'}`,
                color: '#ffffff',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
                animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                fontSize: '0.9rem',
                fontWeight: 500
              }}
            >
              <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                {isSuccess && <CheckCircle2 size={20} color="#ffffff" />}
                {isError && <AlertCircle size={20} color="#ffffff" />}
                {!isSuccess && !isError && <Info size={20} color="#ffffff" />}
              </div>

              <div style={{ flex: 1, wordBreak: 'break-word', lineHeight: 1.4 }}>
                {toast.message}
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.8)',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  flexShrink: 0
                }}
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      showToast: (msg) => console.log('[Toast fallback]:', msg),
      removeToast: () => {}
    };
  }
  return context;
}
