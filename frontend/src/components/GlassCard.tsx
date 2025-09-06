import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', onClick }) => {
  return (
    <div 
      className={`bg-gray-950/40 backdrop-blur-xl rounded-2xl border border-white/5 shadow-2xl shadow-black/40 ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export default GlassCard;
