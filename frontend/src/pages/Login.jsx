
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, Mic, Globe, Shield, Zap } from 'lucide-react';
import { supabase } from '../lib/supabase';

const Login = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    country: '',
    rememberMe: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      if (!supabase) throw new Error('Supabase not configured');

      if (isRegistering) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password
        });
        if (signUpError) throw signUpError;
        localStorage.setItem('aura_user', JSON.stringify({ email: formData.email }));
        onLogin();
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password
        });
        if (signInError) throw signInError;
        const access_token = data.session?.access_token;
        if (access_token) localStorage.setItem('aura_token', access_token);
        localStorage.setItem('aura_user', JSON.stringify({ email: formData.email }));
        onLogin();
      }
    } catch (error) {
      setError(error.message || 'Network error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      // Set demo token and user for demo mode
      const demoToken = 'demo-token-' + Date.now();
      const demoUser = {
        email: 'demo@aura.app',
        firstName: 'Demo',
        lastName: 'User',
        id: 'demo-user-123'
      };
      localStorage.setItem('aura_token', demoToken);
      localStorage.setItem('aura_user', JSON.stringify(demoUser));
      onLogin();
    }, 1000);
  };

  const features = [
    {
      icon: <Mic className="w-6 h-6" />,
      title: "Voice-First Experience",
      description: "Speak naturally in your language"
    },
    {
      icon: <Globe className="w-6 h-6" />,
      title: "Global Transfers",
      description: "Send money to 180+ countries"
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Bank-Grade Security",
      description: "Your funds are always protected"
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Lightning Fast",
      description: "Transfers in minutes, not days"
    }
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0B] relative overflow-hidden">
      {/* Animated Background */}
      <div className="animated-bg"></div>
      
      {/* Background Patterns */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-20 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-72 h-72 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute bottom-20 left-40 w-72 h-72 bg-amber-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{animationDelay: '4s'}}></div>
      </div>

      <div className="relative z-10 min-h-screen flex">
        {/* Left Side - Branding & Features */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-center p-12 xl:p-20">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="mb-12">
              <div className="flex items-center space-x-4 mb-6">
                <img 
                  src="/logo.png" 
                  alt="AURA Logo" 
                  className="w-16 h-16 rounded-2xl object-contain"
                />
                <h1 className="text-hero gradient-text">
                  AURA
                </h1>
              </div>
              <p className="text-headline text-gray-300 mb-8 leading-relaxed">
                Your fastest path to<br />
                <span className="gradient-text">global payments</span>
              </p>
              <p className="text-body text-gray-400 max-w-md">
                Send money across borders with the power of AI. Speak naturally, 
                get the best rates, and transfer with confidence.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="glass-card p-6"
                >
                  <div className="text-purple-400 mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="text-title text-white mb-2">{feature.title}</h3>
                  <p className="text-small text-gray-400">{feature.description}</p>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="mt-12 flex items-center space-x-8"
            >
              <div className="text-center">
                <div className="text-display gradient-text">$2.4B+</div>
                <div className="text-small text-gray-400">Transferred</div>
              </div>
              <div className="text-center">
                <div className="text-display gradient-text">180+</div>
                <div className="text-small text-gray-400">Countries</div>
              </div>
              <div className="text-center">
                <div className="text-display gradient-text">4.9★</div>
                <div className="text-small text-gray-400">Rating</div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="w-full max-w-md"
          >
            <div className="glass-card p-8">
              <div className="text-center mb-8">
                <h2 className="text-headline text-white mb-2">
                  {isRegistering ? 'Create Account' : 'Welcome back'}
                </h2>
                <p className="text-body text-gray-400">
                  {isRegistering ? 'Join AURA today' : 'Sign in to your account'}
                </p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {isRegistering && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-small font-medium text-gray-300 mb-2">
                          First Name
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.firstName}
                          onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                          className="input-glass w-full"
                          placeholder="John"
                        />
                      </div>
                      <div>
                        <label className="block text-small font-medium text-gray-300 mb-2">
                          Last Name
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.lastName}
                          onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                          className="input-glass w-full"
                          placeholder="Doe"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-small font-medium text-gray-300 mb-2">
                        Phone (Optional)
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        className="input-glass w-full"
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-small font-medium text-gray-300 mb-2">
                        Country (Optional)
                      </label>
                      <input
                        type="text"
                        value={formData.country}
                        onChange={(e) => setFormData({...formData, country: e.target.value})}
                        className="input-glass w-full"
                        placeholder="United States"
                      />
                    </div>
                  </>
                )}
                
                <div>
                  <label className="block text-small font-medium text-gray-300 mb-2">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="input-glass pl-12 w-full"
                      placeholder="Enter your email"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-small font-medium text-gray-300 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      className="input-glass pl-12 pr-12 w-full"
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.rememberMe}
                      onChange={(e) => setFormData({...formData, rememberMe: e.target.checked})}
                      className="rounded border-gray-600 bg-gray-700 text-purple-500 focus:ring-purple-500"
                    />
                    <span className="ml-2 text-small text-gray-400">Remember me</span>
                  </label>
                  <a href="#" className="text-small text-purple-400 hover:text-purple-300">
                    Forgot password?
                  </a>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary w-full flex items-center justify-center"
                >
                  {isLoading ? (
                    <>
                      <div className="loading-spinner w-5 h-5 mr-2"></div>
                      {isRegistering ? 'Creating account...' : 'Signing in...'}
                    </>
                  ) : (
                    isRegistering ? 'Create Account' : 'Sign in'
                  )}
                </button>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-600"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-gray-800 px-4 text-small text-gray-400">Or</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDemoLogin}
                  disabled={isLoading}
                  className="btn-secondary w-full"
                >
                  Try Demo Account
                </button>
              </form>

              <div className="mt-8 text-center">
                <p className="text-small text-gray-400">
                  {isRegistering ? 'Already have an account?' : "Don't have an account?"}{' '}
                  <button 
                    type="button"
                    onClick={() => {
                      setIsRegistering(!isRegistering);
                      setError('');
                      setFormData({
                        email: '',
                        password: '',
                        firstName: '',
                        lastName: '',
                        phone: '',
                        country: '',
                        rememberMe: false
                      });
                    }}
                    className="text-purple-400 hover:text-purple-300 font-medium"
                  >
                    {isRegistering ? 'Sign in' : 'Sign up'}
                  </button>
                </p>
              </div>
            </div>

            <div className="mt-8 text-center">
              <p className="text-xs text-gray-500">
                By signing in, you agree to our{' '}
                <a href="#" className="text-purple-400 hover:underline">Terms of Service</a>
                {' '}and{' '}
                <a href="#" className="text-purple-400 hover:underline">Privacy Policy</a>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Login;
