
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Filter, 
  Star, 
  Clock, 
  Shield, 
  TrendingUp, 
  DollarSign,
  Globe,
  ArrowRight,
  RefreshCw,
  ChevronDown,
  Check
} from 'lucide-react';
import { getProviders } from '../api';

const Providers = ({ setCurrentPage }) => {
  const [providers, setProviders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchForm, setSearchForm] = useState({
    amount: '1000',
    currencyFrom: 'USD',
    currencyTo: 'EUR'
  });
  const [sortBy, setSortBy] = useState('best_rate');
  const [filterBy, setFilterBy] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const currencies = [
    { code: 'USD', name: 'US Dollar', flag: '🇺🇸' },
    { code: 'EUR', name: 'Euro', flag: '🇪🇺' },
    { code: 'GBP', name: 'British Pound', flag: '🇬🇧' },
    { code: 'INR', name: 'Indian Rupee', flag: '🇮🇳' },
    { code: 'PHP', name: 'Philippine Peso', flag: '🇵🇭' },
    { code: 'MXN', name: 'Mexican Peso', flag: '🇲🇽' },
    { code: 'CAD', name: 'Canadian Dollar', flag: '🇨🇦' },
    { code: 'AUD', name: 'Australian Dollar', flag: '🇦🇺' },
    { code: 'JPY', name: 'Japanese Yen', flag: '🇯🇵' },
    { code: 'CNY', name: 'Chinese Yuan', flag: '🇨🇳' }
  ];

  const sortOptions = [
    { value: 'best_rate', label: 'Best Rate' },
    { value: 'lowest_fee', label: 'Lowest Fee' },
    { value: 'fastest', label: 'Fastest Delivery' },
    { value: 'highest_rated', label: 'Highest Rated' }
  ];

  const filterOptions = [
    { value: 'all', label: 'All Providers' },
    { value: 'instant', label: 'Instant Transfer' },
    { value: 'bank_deposit', label: 'Bank Deposit' },
    { value: 'cash_pickup', label: 'Cash Pickup' },
    { value: 'mobile_wallet', label: 'Mobile Wallet' }
  ];

  useEffect(() => {
    if (searchForm.amount && searchForm.currencyFrom && searchForm.currencyTo) {
      fetchProviders();
    }
  }, [searchForm.amount, searchForm.currencyFrom, searchForm.currencyTo]);

  const fetchProviders = async () => {
    setIsLoading(true);
    try {
      const result = await getProviders({
        amount: parseFloat(searchForm.amount),
        currency_from: searchForm.currencyFrom,
        currency_to: searchForm.currencyTo
      });
      setProviders(result.providers || []);
    } catch (error) {
      console.error('Error fetching providers:', error);
      setProviders([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getSortedAndFilteredProviders = () => {
    let filtered = [...providers];

    // Apply filters
    if (filterBy !== 'all') {
      filtered = filtered.filter(provider => 
        provider.features && provider.features.some(feature => 
          feature.toLowerCase().includes(filterBy.replace('_', ' '))
        )
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'best_rate':
          return b.exchange_rate - a.exchange_rate;
        case 'lowest_fee':
          return a.fee - b.fee;
        case 'fastest':
          return a.delivery_time_hours - b.delivery_time_hours;
        case 'highest_rated':
          return b.rating - a.rating;
        default:
          return 0;
      }
    });

    return filtered;
  };

  const handleSearch = () => {
    fetchProviders();
  };

  const handleProviderSelect = (provider) => {
    // Store selected provider in localStorage for the Send page
    localStorage.setItem('selectedProvider', JSON.stringify(provider));
    localStorage.setItem('transferAmount', searchForm.amount);
    localStorage.setItem('transferCurrencyFrom', searchForm.currencyFrom);
    localStorage.setItem('transferCurrencyTo', searchForm.currencyTo);
    setCurrentPage('send');
  };

  const getDeliveryTimeText = (hours) => {
    if (hours < 1) return 'Instant';
    if (hours < 24) return `${Math.round(hours)} hours`;
    const days = Math.round(hours / 24);
    return `${days} day${days > 1 ? 's' : ''}`;
  };

  const getProviderLogo = (provider) => {
    const firstLetter = provider.charAt(0).toUpperCase();
    const colors = [
      'from-purple-500 to-purple-600',
      'from-cyan-500 to-cyan-600',
      'from-green-500 to-green-600',
      'from-amber-500 to-amber-600',
      'from-red-500 to-red-600',
      'from-indigo-500 to-indigo-600'
    ];
    const colorIndex = provider.length % colors.length;
    return { letter: firstLetter, gradient: colors[colorIndex] };
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] pt-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-display text-white mb-4">Compare Providers</h1>
          <p className="text-body text-gray-400 max-w-2xl mx-auto">
            Find the best rates and fastest delivery times from trusted money transfer providers
          </p>
        </motion.div>

        {/* Search Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-8 mb-8"
        >
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div>
              <label className="block text-small font-medium text-gray-300 mb-2">Amount</label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="number"
                  value={searchForm.amount}
                  onChange={(e) => setSearchForm({...searchForm, amount: e.target.value})}
                  className="input-glass pl-12 w-full"
                  placeholder="1000"
                />
              </div>
            </div>

            <div>
              <label className="block text-small font-medium text-gray-300 mb-2">From</label>
              <select
                value={searchForm.currencyFrom}
                onChange={(e) => setSearchForm({...searchForm, currencyFrom: e.target.value})}
                className="input-glass w-full"
              >
                {currencies.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.flag} {currency.code}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-small font-medium text-gray-300 mb-2">To</label>
              <select
                value={searchForm.currencyTo}
                onChange={(e) => setSearchForm({...searchForm, currencyTo: e.target.value})}
                className="input-glass w-full"
              >
                {currencies.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.flag} {currency.code}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <motion.button
                onClick={handleSearch}
                disabled={isLoading}
                className="btn-primary w-full flex items-center justify-center"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {isLoading ? (
                  <div className="loading-spinner w-5 h-5"></div>
                ) : (
                  <>
                    <Search className="w-5 h-5 mr-2" />
                    Compare
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Filters and Sorting */}
        {providers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap items-center justify-between gap-4 mb-8"
          >
            <div className="flex items-center space-x-4">
              <span className="text-small text-gray-400">
                {getSortedAndFilteredProviders().length} providers found
              </span>
              <motion.button
                onClick={() => setShowFilters(!showFilters)}
                className="glass-button px-4 py-2 rounded-xl flex items-center space-x-2"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Filter className="w-4 h-4" />
                <span>Filters</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </motion.button>
            </div>

            <div className="flex items-center space-x-4">
              <span className="text-small text-gray-400">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="glass-button px-4 py-2 rounded-xl bg-transparent border-none text-white"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </motion.div>
        )}

        {/* Filter Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="glass-card p-6 mb-8"
            >
              <h3 className="text-title text-white mb-4">Filter by Service Type</h3>
              <div className="flex flex-wrap gap-3">
                {filterOptions.map((option) => (
                  <motion.button
                    key={option.value}
                    onClick={() => setFilterBy(option.value)}
                    className={`px-4 py-2 rounded-xl transition-all duration-300 ${
                      filterBy === option.value
                        ? 'bg-purple-500 text-white'
                        : 'glass-button'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {option.label}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Provider Results */}
        <div className="space-y-6">
          {isLoading ? (
            <div className="grid gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="glass-card p-6 animate-pulse">
                  <div className="h-6 w-1/3 bg-gray-700 rounded mb-3"></div>
                  <div className="h-4 w-1/2 bg-gray-700 rounded mb-2"></div>
                  <div className="h-4 w-1/4 bg-gray-700 rounded"></div>
                </div>
              ))}
            </div>
          ) : getSortedAndFilteredProviders().length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <Globe className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-title text-white mb-2">No providers found</h3>
              <p className="text-body text-gray-400">Try adjusting your search criteria</p>
            </motion.div>
          ) : (
            getSortedAndFilteredProviders().map((provider, index) => {
              const logo = getProviderLogo(provider.provider);
              const recipientAmount = (parseFloat(searchForm.amount) * provider.exchange_rate).toFixed(2);
              
              return (
                <motion.div
                  key={provider.provider}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="glass-card p-6 cursor-pointer hover:border-purple-500/50 transition-all duration-300"
                  onClick={() => handleProviderSelect(provider)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-6 flex-1">
                      {/* Provider Info */}
                      <div className="flex items-center space-x-4">
                        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${logo.gradient} flex items-center justify-center`}>
                          <span className="text-white font-bold text-xl">{logo.letter}</span>
                        </div>
                        <div>
                          <h3 className="text-title text-white mb-1">{provider.provider}</h3>
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center text-yellow-400">
                              <Star className="w-4 h-4 mr-1 fill-current" />
                              <span className="text-small font-medium">{provider.rating}</span>
                            </div>
                            <div className="flex items-center text-cyan-400">
                              <Clock className="w-4 h-4 mr-1" />
                              <span className="text-small">{getDeliveryTimeText(provider.delivery_time_hours || 24)}</span>
                            </div>
                            <div className="flex items-center text-green-400">
                              <Shield className="w-4 h-4 mr-1" />
                              <span className="text-small">Regulated</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Transfer Details */}
                      <div className="hidden lg:block flex-1">
                        <div className="grid grid-cols-3 gap-6 text-center">
                          <div>
                            <div className="text-small text-gray-400 mb-1">Exchange Rate</div>
                            <div className="text-title text-white">{provider.exchange_rate?.toFixed(4)}</div>
                          </div>
                          <div>
                            <div className="text-small text-gray-400 mb-1">Fee</div>
                            <div className="text-title text-white">{searchForm.currencyFrom} {provider.fee?.toFixed(2)}</div>
                          </div>
                          <div>
                            <div className="text-small text-gray-400 mb-1">Recipient Gets</div>
                            <div className="text-title text-green-400">{searchForm.currencyTo} {recipientAmount}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="flex items-center space-x-4">
                      <div className="text-right hidden md:block">
                        <div className="text-headline text-green-400 font-semibold">
                          {searchForm.currencyTo} {recipientAmount}
                        </div>
                        <div className="text-small text-gray-400">
                          Total: {searchForm.currencyFrom} {(parseFloat(searchForm.amount) + provider.fee).toFixed(2)}
                        </div>
                      </div>
                      <motion.div
                        className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <ArrowRight className="w-6 h-6 text-white" />
                      </motion.div>
                    </div>
                  </div>

                  {/* Features */}
                  {provider.features && provider.features.length > 0 && (
                    <div className="mt-6 flex flex-wrap gap-2">
                      {provider.features.map((feature, featureIndex) => (
                        <span
                          key={featureIndex}
                          className="px-3 py-1 bg-gray-700/50 text-gray-300 text-xs rounded-full"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Mobile Details */}
                  <div className="lg:hidden mt-6 grid grid-cols-2 gap-4 text-center">
                    <div className="glass p-3 rounded-xl">
                      <div className="text-small text-gray-400">Rate</div>
                      <div className="text-white font-semibold">{provider.exchange_rate?.toFixed(4)}</div>
                    </div>
                    <div className="glass p-3 rounded-xl">
                      <div className="text-small text-gray-400">Fee</div>
                      <div className="text-white font-semibold">{searchForm.currencyFrom} {provider.fee?.toFixed(2)}</div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Quick Actions */}
        {providers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-12 text-center"
          >
            <p className="text-body text-gray-400 mb-6">
              Want to set up a recurring transfer with the best rate?
            </p>
            <motion.button
              onClick={() => setCurrentPage('recurring')}
              className="btn-secondary flex items-center space-x-2 mx-auto"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <RefreshCw className="w-5 h-5" />
              <span>Set Up Recurring Transfer</span>
            </motion.button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Providers;
