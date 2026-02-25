"use client";

import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import '../../styles/components/common/Toaster.css';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ type = 'info', message, duration = 5000 }) => {
    const id = Date.now() + Math.random().toString(36);
    setToasts((prevToasts) => [...prevToasts, { id, type, message, duration }]);

    if (duration !== Infinity) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const success = useCallback((message, duration) => {
    return addToast({ type: 'success', message, duration });
  }, [addToast]);

  const error = useCallback((message, duration) => {
    return addToast({ type: 'error', message, duration });
  }, [addToast]);

  const warning = useCallback((message, duration) => {
    return addToast({ type: 'warning', message, duration });
  }, [addToast]);

  const info = useCallback((message, duration) => {
    return addToast({ type: 'info', message, duration });
  }, [addToast]);

  const value = {
    toasts,
    addToast,
    removeToast,
    clearAllToasts,
    success,
    error,
    warning,
    info
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
};

const ToastContainer = () => {
  const { toasts, removeToast } = useToast();

  if (!toasts.length) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          toast={toast}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
};

const Toast = ({ toast, onClose }) => {
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(100);
  const { type, message, duration } = toast;

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  useEffect(() => {
    if (duration !== Infinity && duration > 0) {
      const interval = 10;
      const decrement = (100 * interval) / duration;

      const timer = setInterval(() => {
        setProgress((prev) => {
          const newProgress = prev - decrement;
          return newProgress <= 0 ? 0 : newProgress;
        });
      }, interval);

      return () => clearInterval(timer);
    }
  }, [duration]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✗';
      case 'warning':
        return '⚠';
      case 'info':
      default:
        return 'ℹ';
    }
  };

  return (
    <div
      className={`toast toast-${type} ${isExiting ? 'toast-exit' : 'toast-enter'}`}
      role="alert"
    >
      <div className="toast-content">
        <span className="toast-icon">{getIcon()}</span>
        <p className="toast-message">{message}</p>
        <button
          className="toast-close"
          onClick={handleClose}
          aria-label="Close toast"
        >
          ×
        </button>
      </div>
      {duration !== Infinity && (
        <div
          className="toast-progress-bar"
          style={{ width: `${progress}%` }}
        />
      )}
    </div>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const Toaster = () => {
  return null;
};

export default Toaster;