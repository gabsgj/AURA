import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import Banner from './ui/Banner';

const RealtimeBanners = () => {
  const [banners, setBanners] = useState([]);

  useEffect(() => {
    if (!supabase) return;

    const pushBanner = (variant, title, message) => {
      setBanners((prev) => [{ id: Date.now() + Math.random(), variant, title, message }, ...prev].slice(0, 3));
    };

    const txChannel = supabase
      .channel('transactions-ch')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions' }, (payload) => {
        const tx = payload.new || {};
        pushBanner('success', 'Transfer initiated', `Transaction ${tx.id || ''} created for ${tx.amount || ''} ${tx.from_currency || ''}`);
      })
      .subscribe();

    const fraudChannel = supabase
      .channel('fraud-logs-ch')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'fraud_logs' }, (payload) => {
        const log = payload.new || {};
        const level = (log.is_fraud || (log.risk_score || 0) > 0.7) ? 'error' : 'warning';
        pushBanner(level, 'Fraud check result', `Risk score ${Number(log.risk_score || 0).toFixed(2)}`);
      })
      .subscribe();

    return () => {
      try { txChannel.unsubscribe(); } catch(e) {}
      try { fraudChannel.unsubscribe(); } catch(e) {}
    };
  }, []);

  return (
    <div className="fixed top-16 left-0 right-0 z-40 flex flex-col items-center space-y-2 pointer-events-none">
      <div className="w-full max-w-3xl px-4 pointer-events-auto">
        {banners.map((b) => (
          <div key={b.id} className="mb-2">
            <Banner variant={b.variant} title={b.title} message={b.message} onClose={() => setBanners((prev) => prev.filter(x => x.id !== b.id))} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default RealtimeBanners;