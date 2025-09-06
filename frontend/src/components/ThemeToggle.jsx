
import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';

export default function ThemeToggle(){
  const { theme, toggleTheme } = useTheme();
  
  return (
    <button 
      aria-label="Toggle theme" 
      onClick={toggleTheme} 
      className="p-2 rounded-lg bg-dark-800/50 hover:bg-dark-800 border border-dark-700 hover:border-dark-600 transition-all duration-200"
    >
      {theme === 'dark' ? (
        <SunIcon className="w-4 h-4 text-gray-400 hover:text-gray-300" />
      ) : (
        <MoonIcon className="w-4 h-4 text-gray-400 hover:text-gray-300" />
      )}
    </button>
  );
}
