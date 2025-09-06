
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const LoadingScreen = () => {
  const [loadingText, setLoadingText] = useState('Initializing AURA');
  const [progress, setProgress] = useState(0);

  const loadingSteps = [
    'Initializing AURA',
    'Connecting to secure servers',
    'Loading voice recognition',
    'Preparing your dashboard',
    'Almost ready...'
  ];

  useEffect(() => {
    let stepIndex = 0;
    let progressValue = 0;

    const interval = setInterval(() => {
      if (stepIndex < loadingSteps.length) {
        setLoadingText(loadingSteps[stepIndex]);
        stepIndex++;
      }

      progressValue += Math.random() * 30;
      if (progressValue > 100) progressValue = 100;
      setProgress(progressValue);
    }, 400);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 bg-[#0A0A0B] flex items-center justify-center overflow-hidden">
      {/* Background Animation */}
      <div className="animated-bg"></div>
      
      {/* Background Particles */}
      <div className="absolute inset-0 opacity-20">
        {[...Array(50)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-purple-400 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [-10, -30, -10],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 text-center max-w-md mx-auto px-6">
        {/* Logo Animation */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="mb-12"
        >
          <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center mb-6 p-2">
            <motion.img
              src="/logo.png"
              alt="AURA Logo"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="w-full h-full object-contain"
            />
          </div>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="text-4xl font-bold gradient-text"
          >
            AURA
          </motion.h1>
        </motion.div>

        {/* Loading Text */}
        <AnimatePresence mode="wait">
          <motion.p
            key={loadingText}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="text-lg text-gray-300 mb-8"
          >
            {loadingText}
          </motion.p>
        </AnimatePresence>

        {/* Progress Bar */}
        <div className="relative">
          <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-sm text-gray-400 mt-4"
          >
            {Math.round(progress)}%
          </motion.p>
        </div>

        {/* Floating Elements */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-gradient-to-r from-purple-400 to-cyan-400 rounded-full opacity-60"
              style={{
                left: `${20 + i * 15}%`,
                top: `${30 + (i % 2) * 40}%`,
              }}
              animate={{
                y: [0, -20, 0],
                rotate: [0, 180, 360],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
