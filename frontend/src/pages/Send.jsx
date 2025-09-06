
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, 
  Mic, 
  MicOff, 
  Globe, 
  DollarSign, 
  User, 
  Clock,
  Shield,
  Star,
  ChevronDown,
  Check
} from 'lucide-react';
import { postNLU, getProviders, postSend } from '../api';
import { useVoice } from '../contexts/VoiceContext';

const Send = ({ setCurrentPage }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    amount: '',
    currencyFrom: 'USD',
    currencyTo: 'EUR',
    recipientName: '',
    recipientCountry: '',
    recipientPhone: '',
    purpose: 'family_support'
  });
  const [errors, setErrors] = useState({});
  const [providers, setProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [recognition, setRecognition] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const { speak } = useVoice();

  const currencies = [
    { code: 'USD', name: 'US Dollar', flag: '🇺🇸' },
    { code: 'EUR', name: 'Euro', flag: '🇪🇺' },
    { code: 'GBP', name: 'British Pound', flag: '🇬🇧' },
    { code: 'INR', name: 'Indian Rupee', flag: '🇮🇳' },
    { code: 'PHP', name: 'Philippine Peso', flag: '🇵🇭' },
    { code: 'MXN', name: 'Mexican Peso', flag: '🇲🇽' }
  ];

  const countries = [
    'Philippines', 'India', 'Mexico', 'Nigeria', 'Bangladesh', 'Vietnam',
    'Pakistan', 'Egypt', 'Morocco', 'Kenya', 'Ghana', 'Nepal'
  ];

  const purposes = [
    { value: 'family_support', label: 'Family Support' },
    { value: 'education', label: 'Education' },
    { value: 'business', label: 'Business' },
    { value: 'medical', label: 'Medical' },
    { value: 'property', label: 'Property' },
    { value: 'other', label: 'Other' }
  ];

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'en-US';

      recognitionInstance.onstart = () => {
        console.log('Speech recognition started');
        setIsListening(true);
      };
      
      recognitionInstance.onend = () => {
        console.log('Speech recognition ended');
        setIsListening(false);
      };

      recognitionInstance.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        
        if (event.error === 'not-allowed') {
          alert('Microphone access denied. Please allow microphone permissions and try again.');
        } else if (event.error === 'no-speech') {
          alert('No speech detected. Please try speaking again.');
        } else {
          alert(`Speech recognition error: ${event.error}`);
        }
      };

      recognitionInstance.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        // Show interim results
        if (interimTranscript) {
          setTranscript(interimTranscript + '...');
        }

        if (finalTranscript) {
          setTranscript(finalTranscript);
          handleVoiceInput(finalTranscript);
        }
      };

      setRecognition(recognitionInstance);
    } else {
      console.warn('Speech recognition not supported in this browser');
    }
  }, []);

  const validateStep1 = () => {
    const newErrors = {};
    const amount = parseFloat(formData.amount);
    if (!formData.amount) newErrors.amount = 'Amount is required';
    else if (isNaN(amount) || amount <= 0) newErrors.amount = 'Enter a valid amount greater than 0';
    if (!formData.currencyFrom) newErrors.currencyFrom = 'Select a source currency';
    if (!formData.currencyTo) newErrors.currencyTo = 'Select a target currency';
    if (formData.currencyFrom && formData.currencyTo && formData.currencyFrom === formData.currencyTo) {
      newErrors.currencyTo = 'Source and target currencies must differ';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = () => {
    const newErrors = {};
    if (!formData.recipientName.trim()) newErrors.recipientName = 'Recipient name is required';
    if (!formData.recipientCountry) newErrors.recipientCountry = 'Select recipient country';
    if (formData.recipientPhone && !/^\+?[0-9\-\s]{7,15}$/.test(formData.recipientPhone)) {
      newErrors.recipientPhone = 'Enter a valid phone number or leave blank';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleVoiceInput = async (text) => {
    try {
      console.log('Processing voice input:', text);
      setTranscript(text); // Show what was processed
      
      const nluResult = await postNLU(text, 'en');
      console.log('NLU result received:', nluResult);
      
      let fieldsUpdated = [];
      
      if (nluResult.amount) {
        setFormData(prev => ({ ...prev, amount: nluResult.amount.toString() }));
        fieldsUpdated.push(`amount: ${nluResult.amount}`);
      }
      if (nluResult.currency_from) {
        setFormData(prev => ({ ...prev, currencyFrom: nluResult.currency_from }));
        fieldsUpdated.push(`from: ${nluResult.currency_from}`);
      }
      if (nluResult.currency_to) {
        setFormData(prev => ({ ...prev, currencyTo: nluResult.currency_to }));
        fieldsUpdated.push(`to: ${nluResult.currency_to}`);
      }
      if (nluResult.recipient_country) {
        setFormData(prev => ({ ...prev, recipientCountry: nluResult.recipient_country }));
        fieldsUpdated.push(`country: ${nluResult.recipient_country}`);
      }
      
      if (fieldsUpdated.length > 0) {
        console.log('Fields updated:', fieldsUpdated);
        await speak(`Got it! I've updated: ${fieldsUpdated.join(', ')}`);
        
        // Clear transcript after a delay
        setTimeout(() => setTranscript(''), 3000);
      } else {
        console.log('No fields updated from voice input');
        await speak('I heard you, but couldn\'t extract transfer details. Please try saying something like "Send 500 dollars from USD to EUR"');
        
        // Clear transcript after a delay
        setTimeout(() => setTranscript(''), 3000);
      }
    } catch (error) {
      console.error('Voice processing error:', error);
      await speak('Sorry, I had trouble processing that. Please try again.');
      
      // Clear transcript after a delay
      setTimeout(() => setTranscript(''), 3000);
    }
  };

  const startListening = async () => {
    if (!recognition) {
      alert('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    if (isListening) {
      recognition.stop();
      return;
    }

    try {
      // Request microphone permission first
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      setTranscript('');
      recognition.start();
    } catch (error) {
      console.error('Microphone permission error:', error);
      if (error.name === 'NotAllowedError') {
        alert('Microphone access denied. Please allow microphone permissions in your browser settings and try again.');
      } else if (error.name === 'NotFoundError') {
        alert('No microphone found. Please connect a microphone and try again.');
      } else {
        alert('Error accessing microphone. Please check your browser settings.');
      }
    }
  };

  const fetchProviders = async () => {
    if (!formData.amount || !formData.currencyFrom || !formData.currencyTo) return;
    
    setIsLoading(true);
    try {
      const result = await getProviders({
        amount: parseFloat(formData.amount),
        currency_from: formData.currencyFrom,
        currency_to: formData.currencyTo
      });
      // Normalize provider objects from backend
      const normalized = (result.providers || []).map(p => ({
        provider: p.provider || p.name || (p.provider_name?.toLowerCase() ?? ''),
        name: p.name || p.provider || p.provider_name || p.provider_id || 'provider',
        fee: p.fee ?? p.estimated_fee ?? 0,
        exchange_rate: p.exchange_rate ?? p.rate ?? 1,
        delivery_time: p.delivery_time || '1-2 business days',
        rating: p.rating ?? p.provider_rating ?? 4.3,
        total_cost: p.total_cost ?? 0,
        recipient_amount: p.recipient_amount ?? 0,
        confidence_score: p.confidence_score ?? 0.8,
        is_recommended: p.is_recommended || false,
        features: p.features || [ 'Secure', 'Fast' ]
      }));
      setProviders(normalized);
    } catch (error) {
      console.error('Error fetching providers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = () => {
    if (step === 1) {
      if (!validateStep1()) return;
      fetchProviders();
      setStep(2);
    } else if (step === 2 && selectedProvider) {
      setStep(3);
    } else if (step === 3) {
      if (!validateStep3()) return;
      setStep(4);
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const transferData = {
        amount: parseFloat(formData.amount),
        currency_from: formData.currencyFrom,
        currency_to: formData.currencyTo,
        provider: selectedProvider.provider,
        recipient_name: formData.recipientName,
        recipient_country: formData.recipientCountry,
        recipient_phone: formData.recipientPhone,
        purpose: formData.purpose
      };

      const result = await postSend(transferData);
      
      if (result.success) {
        setShowSuccess(true);
        await speak(`Transfer initiated successfully! Transaction ID: ${result.transaction_id}`);
        
        setTimeout(() => {
          setCurrentPage('history');
        }, 3000);
      }
    } catch (error) {
      console.error('Transfer error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] pt-16 flex items-center justify-center">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center max-w-md mx-auto px-6"
        >
          <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-8">
            <Check className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-display text-white mb-4">Transfer Successful!</h2>
          <p className="text-body text-gray-400 mb-8">
            Your money is on its way. You'll receive updates via notification.
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setCurrentPage('history')}
            className="btn-primary"
          >
            View Transaction
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] pt-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Bar */}
        <div className="max-w-4xl mx-auto mb-12">
          <div className="flex items-center justify-between mb-4">
            {[1, 2, 3, 4].map((num) => (
              <div key={num} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  step >= num ? 'bg-purple-500' : 'bg-gray-700'
                } ${step === num ? 'ring-4 ring-purple-500/30' : ''}`}>
                  <span className="text-white font-semibold">{num}</span>
                </div>
                {num < 4 && (
                  <div className={`w-24 h-1 mx-4 ${step > num ? 'bg-purple-500' : 'bg-gray-700'}`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-sm text-gray-400">
            <span>Amount</span>
            <span>Provider</span>
            <span>Recipient</span>
            <span>Review</span>
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            {/* Step 1: Amount & Currency */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="glass-card p-8"
              >
                <div className="text-center mb-8">
                  <h2 className="text-display text-white mb-4">How much do you want to send?</h2>
                  <p className="text-body text-gray-400">Speak or type the amount and currencies</p>
                </div>

                {/* Voice Input */}
                <div className="flex flex-col items-center mb-8">
                  <motion.button
                    onClick={startListening}
                    disabled={isListening}
                    className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                      isListening ? 'bg-red-500' : 'glass-button'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                  </motion.button>
                  
                  <div className="text-center mb-4">
                    <p className="text-gray-400 text-sm">or</p>
                  </div>
                  
                  {/* Text Input */}
                  <div className="w-full max-w-md">
                    <input
                      type="text"
                      placeholder="Type your request: 'Send 500 USD to EUR'"
                      className="w-full p-4 rounded-xl bg-gray-800/50 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.target.value.trim()) {
                          handleVoiceInput(e.target.value);
                          e.target.value = '';
                        }
                      }}
                    />
                    <p className="text-xs text-gray-500 mt-2 text-center">Press Enter to process</p>
                  </div>
                </div>

                {transcript && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass p-4 mb-6 text-center"
                  >
                    <p className="text-white">"{transcript}"</p>
                  </motion.div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Amount Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      You send
                    </label>
                    <div className="input-icon-wrapper mb-4">
                      <DollarSign className="input-icon w-5 h-5" />
                      <input
                        type="number"
                        value={formData.amount}
                        onChange={(e) => setFormData({...formData, amount: e.target.value})}
                        className={`input-glass ${errors.amount ? 'border-red-500' : ''} text-2xl font-semibold`}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <p className="text-xs text-gray-400 mb-4">Minimum 1.00. Fees shown later.</p>
                    {errors.amount && <p className="text-xs text-red-400 mb-2">{errors.amount}</p>}
                    
                    <div className="input-icon-wrapper">
                      <Globe className="input-icon w-5 h-5" />
                      <select
                        value={formData.currencyFrom}
                        onChange={(e) => setFormData({...formData, currencyFrom: e.target.value})}
                        className={`input-glass ${errors.currencyFrom ? 'border-red-500' : ''}`}
                      >
                        {currencies.map((currency) => (
                          <option key={currency.code} value={currency.code}>
                            {currency.flag} {currency.code} - {currency.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    {errors.currencyFrom && <p className="text-xs text-red-400 mt-1">{errors.currencyFrom}</p>}
                  </div>

                  {/* Recipient Amount */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Recipient gets
                    </label>
                    <div className="input-icon-wrapper mb-4">
                      <DollarSign className="input-icon w-5 h-5 text-green-400" />
                      <div className="input-glass text-2xl font-semibold text-green-400">
                        {formData.amount ? (parseFloat(formData.amount) * 0.85).toFixed(2) : '0.00'}
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mb-4">Estimated. Final rate shown after provider selection.</p>
                    
                    <div className="input-icon-wrapper">
                      <Globe className="input-icon w-5 h-5" />
                      <select
                        value={formData.currencyTo}
                        onChange={(e) => setFormData({...formData, currencyTo: e.target.value})}
                        className={`input-glass ${errors.currencyTo ? 'border-red-500' : ''}`}
                      >
                        {currencies.map((currency) => (
                          <option key={currency.code} value={currency.code}>
                            {currency.flag} {currency.code} - {currency.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    {errors.currencyTo && <p className="text-xs text-red-400 mt-1">{errors.currencyTo}</p>}
                  </div>
                </div>

                <div className="flex justify-end mt-8">
                  <motion.button
                    onClick={handleNext}
                    disabled={!formData.amount || !formData.currencyFrom || !formData.currencyTo}
                    className="btn-primary flex items-center space-x-2"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <span>Compare Providers</span>
                    <ArrowRight className="w-5 h-5" />
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Provider Selection */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center mb-8">
                  <h2 className="text-display text-white mb-4">Choose your provider</h2>
                  <p className="text-body text-gray-400">Comparing rates from top providers</p>
                </div>

                {isLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="loading-spinner w-12 h-12 border-purple-500"></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {providers.map((provider, index) => (
                      <motion.div
                        key={provider.provider}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        onClick={() => setSelectedProvider(provider)}
                        className={`glass-card p-6 cursor-pointer transition-all duration-300 ${
                          selectedProvider?.provider === provider.provider
                            ? 'border-purple-500 bg-purple-500/10'
                            : 'hover:border-purple-500/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-xl flex items-center justify-center">
                              <span className="text-white font-semibold">
                                {provider.provider.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <h3 className="text-title text-white">{provider.name}</h3>
                              <div className="flex items-center space-x-4 text-small text-gray-400">
                                <span className="flex items-center">
                                  <Clock className="w-4 h-4 mr-1" />
                                  {provider.delivery_time}
                                </span>
                                <span className="flex items-center">
                                  <Star className="w-4 h-4 mr-1 fill-current text-yellow-400" />
                                  {provider.rating}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-title text-white">
                              {formData.currencyTo} {(parseFloat(formData.amount) * provider.exchange_rate).toFixed(2)}
                            </div>
                            <div className="text-small text-gray-400">
                              Fee: {formData.currencyFrom} {provider.fee.toFixed(2)}
                            </div>
                            <div className="text-small text-purple-400">
                              Rate: {provider.exchange_rate.toFixed(4)}
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-4 flex flex-wrap gap-2">
                          {(provider.features || []).map((feature) => (
                            <span key={feature} className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded-full">
                              {feature}
                            </span>
                          ))}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                <div className="flex justify-between">
                  <motion.button
                    onClick={() => setStep(1)}
                    className="btn-secondary"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Back
                  </motion.button>
                  <motion.button
                    onClick={handleNext}
                    disabled={!selectedProvider}
                    className="btn-primary flex items-center space-x-2"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <span>Continue</span>
                    <ArrowRight className="w-5 h-5" />
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Recipient Details */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="glass-card p-8"
              >
                <div className="text-center mb-8">
                  <h2 className="text-display text-white mb-4">Recipient details</h2>
                  <p className="text-body text-gray-400">Who are you sending money to?</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Full name
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={formData.recipientName}
                        onChange={(e) => setFormData({...formData, recipientName: e.target.value})}
                        className={`input-glass pl-12 w-full ${errors.recipientName ? 'border border-red-500' : ''}`}
                        placeholder="John Doe"
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Enter the full legal name of the recipient.</p>
                    {errors.recipientName && <p className="text-xs text-red-400 mt-1">{errors.recipientName}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Country
                    </label>
                    <select
                      value={formData.recipientCountry}
                      onChange={(e) => setFormData({...formData, recipientCountry: e.target.value})}
                      className={`input-glass w-full ${errors.recipientCountry ? 'border border-red-500' : ''}`}
                    >
                      <option value="">Select country</option>
                      {countries.map((country) => (
                        <option key={country} value={country}>{country}</option>
                      ))}
                    </select>
                    {errors.recipientCountry && <p className="text-xs text-red-400 mt-1">{errors.recipientCountry}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Phone number
                    </label>
                    <input
                      type="tel"
                      value={formData.recipientPhone}
                      onChange={(e) => setFormData({...formData, recipientPhone: e.target.value})}
                      className={`input-glass w-full ${errors.recipientPhone ? 'border border-red-500' : ''}`}
                      placeholder="+1234567890"
                    />
                    <p className="text-xs text-gray-400 mt-2">Include country code, e.g. +1</p>
                    {errors.recipientPhone && <p className="text-xs text-red-400 mt-1">{errors.recipientPhone}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Purpose
                    </label>
                    <select
                      value={formData.purpose}
                      onChange={(e) => setFormData({...formData, purpose: e.target.value})}
                      className="input-glass w-full"
                    >
                      {purposes.map((purpose) => (
                        <option key={purpose.value} value={purpose.value}>
                          {purpose.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-between mt-8">
                  <motion.button
                    onClick={() => setStep(2)}
                    className="btn-secondary"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Back
                  </motion.button>
                  <motion.button
                    onClick={handleNext}
                    disabled={!formData.recipientName}
                    className="btn-primary flex items-center space-x-2"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <span>Review Transfer</span>
                    <ArrowRight className="w-5 h-5" />
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* Step 4: Review & Confirm */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="glass-card p-8"
              >
                <div className="text-center mb-8">
                  <h2 className="text-display text-white mb-4">Review your transfer</h2>
                  <p className="text-body text-gray-400">Please confirm all details are correct</p>
                </div>

                <div className="space-y-6">
                  {/* Transfer Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="glass p-6">
                      <h3 className="text-title text-white mb-4">Transfer Details</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-400">You send</span>
                          <span className="text-white font-semibold">
                            {formData.currencyFrom} {formData.amount}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Fee</span>
                          <span className="text-white">
                            {formData.currencyFrom} {selectedProvider?.fee.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Total cost</span>
                          <span className="text-white font-semibold">
                            {formData.currencyFrom} {(parseFloat(formData.amount) + selectedProvider?.fee).toFixed(2)}
                          </span>
                        </div>
                        <div className="border-t border-gray-600 pt-3">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Recipient gets</span>
                            <span className="text-green-400 font-semibold text-lg">
                              {formData.currencyTo} {(parseFloat(formData.amount) * selectedProvider?.exchange_rate).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="glass p-6">
                      <h3 className="text-title text-white mb-4">Recipient</h3>
                      <div className="space-y-3">
                        <div>
                          <span className="text-gray-400 block">Name</span>
                          <span className="text-white font-medium">{formData.recipientName}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block">Country</span>
                          <span className="text-white">{formData.recipientCountry}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block">Phone</span>
                          <span className="text-white">{formData.recipientPhone}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Provider Info */}
                  <div className="glass p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-xl flex items-center justify-center">
                          <span className="text-white font-semibold">
                            {selectedProvider?.provider.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-title text-white">{selectedProvider?.provider}</h3>
                          <div className="flex items-center space-x-4 text-small text-gray-400">
                            <span className="flex items-center">
                              <Clock className="w-4 h-4 mr-1" />
                              {selectedProvider?.delivery_time}
                            </span>
                            <span className="flex items-center">
                              <Shield className="w-4 h-4 mr-1" />
                              Regulated
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-title text-white">
                          Rate: {selectedProvider?.exchange_rate.toFixed(4)}
                        </div>
                        <div className="flex items-center text-yellow-400">
                          <Star className="w-4 h-4 mr-1 fill-current" />
                          <span>{selectedProvider?.rating}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between mt-8">
                  <motion.button
                    onClick={() => setStep(3)}
                    className="btn-secondary"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Back
                  </motion.button>
                  <motion.button
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="btn-primary flex items-center space-x-2"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {isLoading ? (
                      <>
                        <div className="loading-spinner w-5 h-5 mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <Shield className="w-5 h-5" />
                        <span>Confirm & Send</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Send;
