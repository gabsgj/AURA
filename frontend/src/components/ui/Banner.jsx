import React from 'react';

const variantStyles = {
  success: 'bg-green-500/10 border-green-500/30 text-green-300',
  warning: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
  error: 'bg-red-500/10 border-red-500/30 text-red-300',
  info: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300',
};

const Banner = ({ variant = 'info', title, message, onClose }) => {
  return (
    <div className={`glass-card border ${variantStyles[variant]} p-3 flex items-start justify-between`}> 
      <div>
        {title && <div className="text-sm font-semibold mb-1">{title}</div>}
        {message && <div className="text-xs opacity-90">{message}</div>}
      </div>
      {onClose && (
        <button onClick={onClose} className="text-xs opacity-70 hover:opacity-100">✕</button>
      )}
    </div>
  );
};

export default Banner;