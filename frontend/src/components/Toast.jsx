import React from 'react';

export default function Toast({ message, type='info' }){
  if(!message) return null;
  return (
    <div className="fixed top-6 right-6 z-60 glass p-3 rounded-lg shadow-lg">
      <div className="text-sm">{message}</div>
    </div>
  );
}