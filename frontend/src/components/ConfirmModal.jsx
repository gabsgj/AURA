import React from 'react';

export default function ConfirmModal({ open, tx, onClose }){
  if(!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose}></div>
      <div className="glass-card p-6 rounded-2xl z-60 w-full max-w-lg">
        <h3 className="text-xl font-bold mb-4">Transaction Sent</h3>
        <p className="text-sm text-gray-300 mb-4">Transaction ID: <span className="font-mono text-white ml-2">{tx?.transaction_id || '—'}</span></p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-md bg-white/5">Close</button>
        </div>
      </div>
    </div>
  );
}