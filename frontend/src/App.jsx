
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from './components/Navbar';
import LoadingScreen from './components/LoadingScreen';
import RealtimeBanners from './components/RealtimeBanners';
import FooterStatusBar from './components/FooterStatusBar';
import Login from './pages/Login';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Send from './pages/Send';
import History from './pages/History';
import Providers from './pages/Providers';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('send');
  const [theme, setTheme] = useState('dark');
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check if user was previously authenticated
    const savedToken = localStorage.getItem('aura_token');
    const savedUser = localStorage.getItem('aura_user');
    const savedTheme = localStorage.getItem('aura_theme') || 'dark';
    
    if (savedToken && savedUser) {
      setIsAuthenticated(true);
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error('Error parsing saved user:', e);
        // Clear invalid data
        localStorage.removeItem('aura_token');
        localStorage.removeItem('aura_user');
      }
    }
    
    setTheme(savedTheme);
    
    // Apply theme to document
    document.documentElement.className = savedTheme;

    // Faster init for better UX
    const t = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(t);
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
    // Token and user are set by the Login component
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem('aura_token');
    localStorage.removeItem('aura_user');
  setCurrentPage('send');
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('aura_theme', newTheme);
  };

  const renderPage = () => {
    const pageProps = { setCurrentPage };
    
    switch (currentPage) {
      case 'home':
        return <Home {...pageProps} />;
      case 'dashboard':
        return <Dashboard {...pageProps} />;
      case 'send':
        return <Send {...pageProps} />;
      case 'history':
        return <History {...pageProps} />;
      case 'providers':
        return <Providers {...pageProps} />;
      default:
        return <Send {...pageProps} />;
    }
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-[#0A0A0B]' : 'bg-gray-50'} transition-colors duration-300`}>
      <RealtimeBanners />
      <Navbar 
        currentPage={currentPage} 
        setCurrentPage={setCurrentPage}
        theme={theme}
        toggleTheme={toggleTheme}
        user={user}
        onLogout={handleLogout}
      />
      
      <AnimatePresence mode="wait">
        <motion.main
          key={currentPage}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="transition-all duration-300"
        >
          {renderPage()}
        </motion.main>
      </AnimatePresence>
      <FooterStatusBar />
    </div>
  );
}

export default App;
