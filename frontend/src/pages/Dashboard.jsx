import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  Activity,
  ArrowUpRight,
  ArrowDownLeft,
  Globe,
  Shield,
  Zap
} from 'lucide-react';
import { getFXQuotes, getFXForecast, getTransactions } from '../api';

const Dashboard = ({ setCurrentPage }) => {
  const [stats, setStats] = useState({
    totalTransferred: 0,
    activeTransactions: 0,
    savedOnFees: 0,
    successRate: 98.5
  });
  const [fxRates, setFxRates] = useState([]);
  const [forecast, setForecast] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // Load FX rates for major pairs
      const majorPairs = [
        { from: 'USD', to: 'EUR' },
        { from: 'USD', to: 'GBP' },
        { from: 'USD', to: 'INR' },
        { from: 'EUR', to: 'USD' }
      ];

      const ratePromises = majorPairs.map(async (pair) => {
        try {
          const result = await getFXQuotes(pair.from, pair.to, 1000);
          return {
            pair: `${pair.from}/${pair.to}`,
            rate: result.quote.rate,
            change: Math.random() * 2 - 1 // Mock change percentage
          };
        } catch (error) {
          console.error(`Error loading ${pair.from}/${pair.to}:`, error);
          return null;
        }
      });

      const rates = (await Promise.all(ratePromises)).filter(Boolean);
      setFxRates(rates);

      // Load forecast for USD/EUR
      try {
        const forecastResult = await getFXForecast('USD', 'EUR', 7);
        setForecast(forecastResult.forecast);
      } catch (error) {
        console.error('Error loading forecast:', error);
      }

      // Load recent transactions
      try {
        const transactions = await getTransactions();
        setRecentTransactions(transactions.slice(0, 5));
        
        // Calculate stats from transactions
        const totalAmount = transactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);
        const activeCount = transactions.filter(tx => tx.status === 'pending' || tx.status === 'initiated').length;
        
        setStats(prev => ({
          ...prev,
          totalTransferred: totalAmount,
          activeTransactions: activeCount
        }));
      } catch (error) {
        console.error('Error loading transactions:', error);
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'text-green-400';
      case 'pending':
      case 'initiated':
        return 'text-yellow-400';
      case 'failed':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] pt-16 flex items-center justify-center">
        <div className="loading-spinner w-12 h-12 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] pt-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-display text-white mb-2">Dashboard</h1>
          <p className="text-body text-gray-400">Monitor your transfers and market insights</p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <span className="text-green-400 text-sm font-medium">+12.5%</span>
            </div>
            <h3 className="text-title text-white mb-1">Total Transferred</h3>
            <p className="text-display gradient-text">{formatCurrency(stats.totalTransferred)}</p>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <span className="text-blue-400 text-sm font-medium">{stats.activeTransactions}</span>
            </div>
            <h3 className="text-title text-white mb-1">Active Transfers</h3>
            <p className="text-display text-blue-400">{stats.activeTransactions}</p>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <span className="text-purple-400 text-sm font-medium">Saved</span>
            </div>
            <h3 className="text-title text-white mb-1">Fees Saved</h3>
            <p className="text-display text-purple-400">{formatCurrency(stats.savedOnFees)}</p>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <span className="text-amber-400 text-sm font-medium">Success</span>
            </div>
            <h3 className="text-title text-white mb-1">Success Rate</h3>
            <p className="text-display text-amber-400">{stats.successRate}%</p>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* FX Rates */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-title text-white">Live Exchange Rates</h2>
              <button 
                onClick={() => setCurrentPage('providers')}
                className="text-purple-400 hover:text-purple-300 text-sm font-medium"
              >
                View All →
              </button>
            </div>

            <div className="space-y-4">
              {fxRates.map((rate, index) => (
                <motion.div
                  key={rate.pair}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="flex items-center justify-between p-4 glass rounded-xl"
                >
                  <div className="flex items-center space-x-3">
                    <Globe className="w-5 h-5 text-gray-400" />
                    <span className="text-white font-medium">{rate.pair}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-semibold">{rate.rate.toFixed(4)}</div>
                    <div className={`text-sm ${rate.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {rate.change >= 0 ? '+' : ''}{rate.change.toFixed(2)}%
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Recent Transactions */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-title text-white">Recent Transactions</h2>
              <button 
                onClick={() => setCurrentPage('history')}
                className="text-purple-400 hover:text-purple-300 text-sm font-medium"
              >
                View All →
              </button>
            </div>

            <div className="space-y-4">
              {recentTransactions.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No recent transactions</p>
                </div>
              ) : (
                recentTransactions.map((tx, index) => (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    className="flex items-center justify-between p-4 glass rounded-xl"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
                        <ArrowUpRight className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <div className="text-white font-medium">
                          {formatCurrency(tx.amount, tx.from_currency)}
                        </div>
                        <div className="text-small text-gray-400">
                          {tx.from_currency} → {tx.to_currency}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-medium ${getStatusColor(tx.status)}`}>
                        {tx.status}
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(tx.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </div>

        {/* Forecast Chart */}
        {forecast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card p-6 mb-8"
          >
            <h2 className="text-title text-white mb-6">USD/EUR 7-Day Forecast</h2>
            
            <div className="grid grid-cols-7 gap-2">
              {forecast.forecast?.map((day, index) => (
                <div key={day.date} className="text-center">
                  <div className="text-xs text-gray-400 mb-2">
                    {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                  <div className="glass p-3 rounded-lg">
                    <div className="text-white font-semibold text-sm">
                      {day.predicted_rate.toFixed(4)}
                    </div>
                    <div className={`text-xs ${day.change_percent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {day.change_percent >= 0 ? '+' : ''}{day.change_percent}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <motion.button
            onClick={() => setCurrentPage('send')}
            className="glass-card p-6 text-left group cursor-pointer"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <ArrowUpRight className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-title text-white mb-2">Send Money</h3>
            <p className="text-small text-gray-400">Transfer funds worldwide with the best rates</p>
          </motion.button>

          <motion.button
            onClick={() => setCurrentPage('providers')}
            className="glass-card p-6 text-left group cursor-pointer"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-title text-white mb-2">Compare Rates</h3>
            <p className="text-small text-gray-400">Get the best exchange rates from top providers</p>
          </motion.button>

          <motion.button
            onClick={() => setCurrentPage('wallet')}
            className="glass-card p-6 text-left group cursor-pointer"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-title text-white mb-2">Manage Wallet</h3>
            <p className="text-small text-gray-400">View balances and manage your funds</p>
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;