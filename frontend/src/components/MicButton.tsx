import React from 'react';
import { MicIcon, StopCircleIcon } from './icons';

interface MicButtonProps {
  isListening: boolean;
  onClick: () => void;
  disabled?: boolean;
}

const MicButton: React.FC<MicButtonProps> = ({ isListening, onClick, disabled = false }) => {
  const baseClasses = 'relative flex items-center justify-center w-20 h-20 rounded-full transition-all duration-300 focus:outline-none focus:ring-4';
  const listeningClasses = 'bg-red-500/80 focus:ring-red-500/50';
  const notListeningClasses = 'bg-gray-700/50 hover:bg-gray-700/80 focus:ring-cyan-500/50';
  const disabledClasses = 'bg-gray-800/50 cursor-not-allowed';

  const getButtonClasses = () => {
    if (disabled) {
      return `${baseClasses} ${disabledClasses}`;
    }
    return `${baseClasses} ${isListening ? listeningClasses : notListeningClasses}`;
  };

  return (
    <button
      onClick={onClick}
      className={getButtonClasses()}
      disabled={disabled}
      aria-label={isListening ? 'Stop recording' : 'Start recording'}
    >
      {isListening ? (
        <StopCircleIcon className="w-10 h-10 text-white" />
      ) : (
        <MicIcon className="w-10 h-10 text-white" />
      )}
      {isListening && (
        <span className="absolute w-full h-full bg-red-500 rounded-full animate-ping opacity-75"></span>
      )}
    </button>
  );
};

export default MicButton;
