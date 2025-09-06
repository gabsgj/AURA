import React, { useState, useEffect } from 'react';
import { getTransactions } from '../api';

export default function History(){
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const data = await getTransactions();
      setTransactions(data);
      setError('');
    } catch (err) {
      console.error('Failed to load transactions:', err);
      setError('Failed to load transaction history');
    }
    setLoading(false);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'success':
        return 'bg-green-500/10 text-green-400';
      case 'pending':
      case 'initiated':
        return 'bg-yellow-500/10 text-yellow-400';
      case 'failed':
      case 'cancelled':
        return 'bg-red-500/10 text-red-400';
      default:
        return 'bg-gray-500/10 text-gray-400';
    }
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return 'Invalid date';
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <h2 className="text-3xl font-semibold mb-6">Transaction History</h2>
        <div className="text-center py-8">Loading transactions...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-semibold">Transaction History</h2>
        <button 
          onClick={loadTransactions}
          className="px-4 py-2 rounded-md bg-[var(--primary-a)] text-black font-semibold"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
          {error}
          <button onClick={() => setError('')} className="ml-2 text-red-300 hover:text-red-200">×</button>
        </div>
      )}

      <div className="space-y-4">
        {transactions.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <div className="text-lg mb-2">No transactions found</div>
            <div className="text-sm">Your transaction history will appear here</div>
          </div>
        ) : (
          transactions.map(tx => (
            <div key={tx.id} className="glass-card p-4 rounded-xl flex items-center justify-between">
              <div className="flex-1">
                <div className="text-sm text-gray-400">{formatDate(tx.created_at)}</div>
                <div className="text-lg font-bold">
                  {tx.provider} • {tx.amount} {tx.from_currency || tx.currency_from}
                </div>
                <div className="text-sm text-gray-300">
                  To: {tx.recipient} • {tx.to_currency || tx.currency_to}
                </div>
                {tx.fee && (
                  <div className="text-xs text-gray-500">Fee: {tx.fee}</div>
                )}
              </div>
              <div className="text-right">
                <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(tx.status)}`}>
                  {tx.status}
                </span>
                {tx.total_cost && (
                  <div className="text-sm text-gray-400 mt-1">
                    Total: {tx.total_cost}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {transactions.length > 0 && (
        <div className="mt-6 text-center text-sm text-gray-500">
          Showing {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}