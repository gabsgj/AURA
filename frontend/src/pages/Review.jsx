import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { postSend } from '../api';

function ConfirmModal({ open, tx, onClose }) {
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="glass-card p-6 rounded-2xl max-w-md w-full mx-4">
        <h3 className="text-xl font-semibold mb-4">Transfer Confirmed!</h3>
        <div className="space-y-2 mb-4">
          <div className="text-sm text-gray-400">Transaction ID</div>
          <div className="text-lg font-mono">{tx?.transaction_id || 'TXN_' + Date.now()}</div>
        </div>
        <button 
          onClick={onClose}
          className="w-full py-2 rounded-md bg-[var(--primary-a)] text-black font-semibold"
        >
          View History
        </button>
      </div>
    </div>
  );
}

export default function Review() {
  const [open, setOpen] = useState(false);
  const [tx, setTx] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  const { provider, transferDetails } = location.state || {};
  
  if (!provider || !transferDetails) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <h2 className="text-3xl font-semibold mb-4">Review Transfer</h2>
        <div className="text-center py-8 text-gray-400">
          <div className="text-lg mb-2">No transfer details found</div>
          <button 
            onClick={() => navigate('/providers')}
            className="px-6 py-3 rounded-md bg-[var(--primary-a)] text-black font-semibold"
          >
            Back to Providers
          </button>
        </div>
      </div>
    );
  }

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const result = await postSend({
        provider: provider.name,
        amount: transferDetails.amount,
        currency_from: transferDetails.currency_from,
        currency_to: transferDetails.currency_to,
        recipient: 'Demo Recipient',
        fee: provider.fee,
        exchange_rate: provider.exchange_rate,
        total_cost: provider.total_cost,
        delivery_time: provider.delivery_time
      });
      
      if (result.success) {
        setTx(result);
        setOpen(true);
      } else {
        alert('Transfer failed: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      alert('Transfer failed: ' + error.message);
    }
    setLoading(false);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h2 className="text-3xl font-semibold mb-6">Review Transfer</h2>
      
      <div className="glass-card p-6 rounded-2xl max-w-2xl">
        <div className="mb-4">
          <div className="text-sm text-gray-400">From</div>
          <div className="text-xl font-bold">{transferDetails.amount} {transferDetails.currency_from}</div>
        </div>
        <div className="mb-4">
          <div className="text-sm text-gray-400">To</div>
          <div className="text-xl font-bold">{transferDetails.currency_to}</div>
        </div>
        <div className="mb-4">
          <div className="text-sm text-gray-400">Provider</div>
          <div className="text-xl font-bold">{provider.name}</div>
        </div>
        <div className="mb-4">
          <div className="text-sm text-gray-400">Exchange Rate</div>
          <div className="text-lg">{provider.exchange_rate}</div>
        </div>
        <div className="mb-4">
          <div className="text-sm text-gray-400">Fee</div>
          <div className="text-lg">{provider.fee} {transferDetails.currency_from}</div>
        </div>
        <div className="mb-4">
          <div className="text-sm text-gray-400">Total Cost</div>
          <div className="text-xl font-bold">{provider.total_cost} {transferDetails.currency_from}</div>
        </div>
        <div className="mb-6">
          <div className="text-sm text-gray-400">Delivery Time</div>
          <div className="text-lg">{provider.delivery_time}</div>
        </div>
        
        <div className="flex gap-3 mt-6">
          <button 
            onClick={handleConfirm}
            disabled={loading}
            className="px-6 py-3 rounded-md bg-[var(--primary-a)] text-black font-semibold disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Confirm and Send'}
          </button>
          <button 
            onClick={() => navigate(-1)} 
            className="px-6 py-3 rounded-md bg-white/5"
          >
            Back
          </button>
        </div>
      </div>

      <ConfirmModal 
        open={open} 
        tx={tx} 
        onClose={() => { setOpen(false); navigate('/history'); }} 
      />
    </div>
  );
}