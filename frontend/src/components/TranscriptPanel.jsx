import React from 'react';

export default function TranscriptPanel({ transcript }){
  return (
    <div aria-live="polite" className="glass-card p-4 w-full max-w-2xl text-left text-gray-200 h-28 overflow-auto">
      {transcript ? <div className="animate-fade">{transcript}</div> : <span className="text-gray-400">Your transcribed text will appear here...</span>}
    </div>
  );
}