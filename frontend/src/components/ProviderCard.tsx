import React from 'react';
import type { Provider } from '../types';

interface ProviderCardProps {
  provider: Provider;
  onSelect: () => void;
  isBestValue?: boolean;
}

const ProviderCard: React.FC<ProviderCardProps> = ({ provider, onSelect, isBestValue = false }) => {
  return (
    <div 
      className={`group relative p-4 rounded-xl border border-gray-800 bg-gray-900/40 hover:bg-gray-800/60 hover:border-gray-700 transition-all duration-200 cursor-pointer ${isBestValue ? '!border-cyan-500/50' : ''}`} 
      onClick={onSelect}
    >
      {isBestValue && (
        <div className="absolute top-3 right-3 bg-cyan-500/20 text-cyan-300 text-xs font-semibold px-2 py-0.5 rounded-full">
          Best Value
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 flex items-center justify-center">{provider.logo}</div>
          <div>
            <p className="font-semibold text-white">{provider.name}</p>
            <p className="text-sm text-slate-400">Delivery: {provider.deliveryTime}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-white">${provider.recipientGets.toFixed(2)}</p>
          <p className="text-sm text-slate-400">Recipient gets</p>
        </div>
      </div>
      <div className="text-sm text-slate-400 mt-3 pt-3 border-t border-white/10 flex justify-between">
        <span>Fee: ${provider.fee.toFixed(2)}</span>
        <span>Rate: {provider.exchangeRate.toFixed(4)}</span>
      </div>
    </div>
  );
};

export default ProviderCard;
