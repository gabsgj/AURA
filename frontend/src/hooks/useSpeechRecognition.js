import { useEffect, useRef, useState } from 'react';

export default function useSpeechRecognition(locale='en-US'){
  const [listening,setListening] = useState(false);
  const [transcript,setTranscript] = useState('');
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const rec = new SpeechRecognition();
    rec.lang = locale;
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e) => {
      const text = Array.from(e.results).map(r => r[0].transcript).join('');
      setTranscript(text);
    };
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    return () => { try { recognitionRef.current && recognitionRef.current.stop(); } catch{} };
  }, [locale]);

  function start() {
    if(!recognitionRef.current) return;
    try { recognitionRef.current.start(); setListening(true); } catch(e){}
  }
  function stop() {
    if(!recognitionRef.current) return;
    try { recognitionRef.current.stop(); setListening(false); } catch(e){}
  }

  return { listening, transcript, start, stop, setTranscript };
}