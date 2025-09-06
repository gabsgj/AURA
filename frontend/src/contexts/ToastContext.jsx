import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Toast from '../components/ui/Toast';

const ToastContext = createContext();

const ADD = 'ADD';
const REMOVE = 'REMOVE';

// Reducer to manage toast state
const toastReducer = (state, action) => {
  switch (action.type) {
    case ADD:
      return [...state, { ...action.payload, id: uuidv4() }];
    case REMOVE:
      return state.filter((toast) => toast.id !== action.id);
    default:
      return state;
  }
};

// Custom hook to use toast context
export const useToasts = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToasts must be used within a ToastProvider');
  }
  return context;
};

// Toast provider component
export const ToastProvider = ({ children }) => {
  const [toasts, dispatch] = useReducer(toastReducer, []);

  // Add a new toast
  const addToast = useCallback(({ type = 'info', message, duration = 5000 }) => {
    dispatch({
      type: ADD,
      payload: {
        type,
        message,
        duration,
      },
    });
  }, []);

  // Remove a toast by ID
  const removeToast = useCallback((id) => {
    dispatch({ type: REMOVE, id });
  }, []);

  // Context value
  const contextValue = {
    addToast,
    removeToast,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 w-80 space-y-2">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            type={toast.type}
            message={toast.message}
            duration={toast.duration}
            onDismiss={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export default ToastContext;
