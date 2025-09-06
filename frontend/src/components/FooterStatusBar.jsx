import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const Dot = ({ ok }) => (
  <span className={`inline-block w-2 h-2 rounded-full ${ok ? 'bg-green-400' : 'bg-red-400'}`}></span>
);

const FooterStatusBar = () => {
  const [apiOk, setApiOk] = useState(true);
  const [ttsOk] = useState(true);
  const [realtimeOk, setRealtimeOk] = useState(!!supabase);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    try {
      const userStr = localStorage.getItem('aura_user');
      if (userStr) {
        const u = JSON.parse(userStr);
        setUserEmail(u?.email || '');
      }
    } catch(e) {}
  }, []);

  useEffect(() => {
    let timer = setInterval(async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_ORIGIN || 'http://localhost:5000'}/`);
        setApiOk(res.ok);
      } catch (e) {
        setApiOk(false);
      }
      setRealtimeOk(!!supabase);
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30">
      <div className="mx-auto max-w-7xl px-4 py-2 text-xs text-gray-400 flex items-center justify-between bg-black/40 backdrop-blur border-t border-gray-700">
        <div className="space-x-4">
          <span><Dot ok={apiOk} /> API</span>
          <span><Dot ok={ttsOk} /> TTS</span>
          <span><Dot ok={realtimeOk} /> Realtime</span>
        </div>
        <div>
          {userEmail ? <span className="text-gray-300">{userEmail}</span> : <span>Guest</span>}
        </div>
      </div>
    </div>
  );
};

export default FooterStatusBar;