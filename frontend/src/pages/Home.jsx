import React from 'react';
import { motion } from 'framer-motion';
import { 
  Send, 
  Wallet, 
  History, 
  Globe, 
  Shield, 
  Zap,
  ArrowRight,
  TrendingUp,
  Users,
  Mic
} from 'lucide-react';

const Home = ({ setCurrentPage }) => {
  const quickActions = [
    {
      id: 'send',
      title: 'Send Money',
      description: 'Transfer funds globally with AI-powered routing',
      icon: <Send className="w-8 h-8" />,
      color: 'from-blue-500 to-indigo-600',
      action: () => setCurrentPage('send')
    },
    {
      id: 'providers',
      title: 'Payment Providers',
      description: 'Compare rates and fees from multiple providers',
      icon: <Globe className="w-8 h-8" />,
      color: 'from-green-500 to-emerald-600',
      action: () => setCurrentPage('providers')
    },
    {
      id: 'history',
      title: 'Transaction History',
      description: 'View and track your transfers',
      icon: <History className="w-8 h-8" />,
      color: 'from-purple-500 to-violet-600',
      action: () => setCurrentPage('history')
    }
  ];

  const features = [
    {
      icon: <Mic className="w-6 h-6" />,
      title: 'Voice-First Interface',
      description: 'Send money using natural language commands'
    },
    {
      icon: <Globe className="w-6 h-6" />,
      title: 'Global Coverage',
      description: '180+ countries supported with optimal routing'
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: 'AI Fraud Protection',
      description: '99.7% accuracy fraud detection system'
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: 'Lightning Fast',
      description: 'Average 3-minute transfer completion'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <h1 className="text-5xl lg:text-6xl font-bold mb-6">
              Welcome to{' '}
              <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                AURA
              </span>
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
              The AI-powered cross-border payments platform that makes sending money 
              as simple as having a conversation. Fast, secure, and intelligent.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setCurrentPage('send')}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 px-8 py-4 rounded-xl font-semibold text-lg flex items-center justify-center gap-2 hover:shadow-lg transition-all"
              >
                Start Sending <ArrowRight className="w-5 h-5" />
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setCurrentPage('dashboard')}
                className="border border-gray-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-800 transition-all"
              >
                View Dashboard
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <h2 className="text-3xl font-bold text-center mb-12">Quick Actions</h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            {quickActions.map((action, index) => (
              <motion.div
                key={action.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 * index }}
                whileHover={{ scale: 1.02, y: -5 }}
                onClick={action.action}
                className="cursor-pointer"
              >
                <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 hover:border-gray-600 transition-all">
                  <div className={`w-16 h-16 rounded-xl bg-gradient-to-r ${action.color} flex items-center justify-center mb-4 text-white`}>
                    {action.icon}
                  </div>
                  
                  <h3 className="text-xl font-semibold mb-2">{action.title}</h3>
                  <p className="text-gray-400 mb-4">{action.description}</p>
                  
                  <div className="flex items-center text-sm text-blue-400 font-medium">
                    Get Started <ArrowRight className="w-4 h-4 ml-1" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <h2 className="text-3xl font-bold text-center mb-12">Why Choose AURA?</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 * index }}
                className="text-center"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-4 text-blue-400">
                  {feature.icon}
                </div>
                
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-400 text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Stats Section */}
      <div className="bg-gray-800/30 border-y border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="grid md:grid-cols-4 gap-8 text-center"
          >
            <div>
              <div className="text-3xl font-bold text-blue-400 mb-2">180+</div>
              <div className="text-gray-400">Countries Supported</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-400 mb-2">80%</div>
              <div className="text-gray-400">Cost Savings</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-400 mb-2">3min</div>
              <div className="text-gray-400">Average Transfer</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-orange-400 mb-2">99.7%</div>
              <div className="text-gray-400">Security Rate</div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Home;