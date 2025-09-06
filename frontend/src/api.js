const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || 'http://localhost:5000';
const DEMO_MODE = (import.meta.env.VITE_DEMO_MODE === 'true');

// Auth header helper
function getAuthHeaders() {
  const token = localStorage.getItem('aura_token');
  if (token) return { 'Authorization': `Bearer ${token}` };
  if (DEMO_MODE && import.meta.env.MODE !== 'production') {
    // Allow a dev-only demo token if explicitly enabled
    return { 'Authorization': 'Bearer demo-token-dev' };
  }
  return {};
}

/**
 * Authentication API functions
 */
export async function postLogin(credentials) {
  try {
    const res = await fetch(`${API_ORIGIN}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `API error: ${res.statusText}`);
    return data;
  } catch (e) {
    console.error('Login API error:', e);
    throw e;
  }
}

export async function postRegister(userData) {
  try {
    const res = await fetch(`${API_ORIGIN}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `API error: ${res.statusText}`);
    return data;
  } catch (e) {
    console.error('Register API error:', e);
    throw e;
  }
}

/**
 * Enhanced API wrapper functions with proper error handling and fallbacks
 */

export async function postNLU(text, language='en'){
  try {
    console.log('Sending NLU request:', { text, language });
    const res = await fetch(`${API_ORIGIN}/api/nlu`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({text, language})
    });
    const data = await res.json();
    console.log('NLU response:', data);
    if (!res.ok) throw new Error(data.error || `API error: ${res.statusText}`);
    return data; 
  } catch (e){
    console.error('NLU API error:', e);
    // Return fallback parsing for common patterns
    return parseVoiceInputFallback(text);
  }
}

// Fallback parser for when NLU API fails
function parseVoiceInputFallback(text) {
  console.log('Using fallback NLU parsing for:', text);
  const result = {};
  
  // Extract amount
  const amountMatch = text.match(/(\d+(?:\.\d+)?)/);
  if (amountMatch) {
    result.amount = parseFloat(amountMatch[1]);
  }
  
  // Extract currencies with more patterns
  const currencyPatterns = {
    'USD': ['usd', 'dollar', 'dollars', '$'],
    'EUR': ['eur', 'euro', 'euros', '€'],
    'GBP': ['gbp', 'pound', 'pounds', '£'],
    'INR': ['inr', 'rupee', 'rupees', '₹'],
    'PHP': ['php', 'peso', 'pesos'],
    'MXN': ['mxn', 'mexican peso']
  };
  
  const foundCurrencies = [];
  const lowerText = text.toLowerCase();
  
  Object.entries(currencyPatterns).forEach(([currency, patterns]) => {
    for (const pattern of patterns) {
      if (lowerText.includes(pattern)) {
        foundCurrencies.push(currency);
        break;
      }
    }
  });
  
  if (foundCurrencies.length >= 2) {
    result.currency_from = foundCurrencies[0];
    result.currency_to = foundCurrencies[1];
  } else if (foundCurrencies.length === 1) {
    // Common patterns
    if (lowerText.includes('to eur') || lowerText.includes('to euro')) {
      result.currency_to = 'EUR';
      result.currency_from = foundCurrencies[0];
    } else if (lowerText.includes('from usd') || lowerText.includes('dollar')) {
      result.currency_from = 'USD';
      result.currency_to = foundCurrencies[0];
    } else {
      // Default assignment
      result.currency_from = foundCurrencies[0];
      result.currency_to = foundCurrencies[0] === 'USD' ? 'EUR' : 'USD';
    }
  } else {
    // No currencies found, use defaults
    result.currency_from = 'USD';
    result.currency_to = 'EUR';
  }
  
  // Ensure we have an amount
  if (!result.amount) {
    result.amount = 100; // Default amount
  }
  
  console.log('Fallback parsing result:', result);
  return result;
}

export async function getProviders({ amount, currency_from, currency_to }){
  try {
    const res = await fetch(`${API_ORIGIN}/api/payments/providers`, {
      method:'POST', 
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body:JSON.stringify({amount, from_currency: currency_from, to_currency: currency_to})
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `API error: ${res.statusText}`);
    return data;
  } catch(e){
    console.error('Providers API error:', e);
    // Fallback to legacy endpoint
    try {
      const res = await fetch(`${API_ORIGIN}/providers`, {
        method:'POST', 
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body:JSON.stringify({amount, currency_from, currency_to})
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `API error: ${res.statusText}`);
      return data;
    } catch (fallbackError) {
      console.error('Fallback providers API error:', fallbackError);
      throw e; // Throw original error
    }
  }
}

// Backward compatibility
export const postMockFees = getProviders;

export async function postSend(payload){
  try {
    const res = await fetch(`${API_ORIGIN}/api/payments/execute`, {
      method:'POST', 
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `API error: ${res.statusText}`);
    return data;
  } catch(e) {
    console.error('Send API error:', e);
    throw e;
  }
}

export async function getTransactions(userId){
  try {
    const res = await fetch(`${API_ORIGIN}/api/metrics/count`, {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `API error: ${res.statusText}`);
    return data.metrics?.recent_transactions || [];
  } catch(e){
    console.error('Transactions API error:', e);
    // Return mock data as fallback
    return [
      {
        id: 'TXN_001',
        amount: 100.00,
        from_currency: 'USD',
        to_currency: 'INR',
        provider: 'Wise',
        status: 'completed',
        created_at: '2024-01-15T10:30:00Z',
        recipient: 'John Doe'
      }
    ];
  }
}

export async function getWallet(userId){
  try {
    const res = await fetch(`${API_ORIGIN}/api/wallet/`, {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `API error: ${res.statusText}`);
    return data.wallets;
  } catch(e){
    console.error('Wallet API error:', e);
    // Return mock wallet data
    return [
      {
        currency: 'USD',
        balance: 1250.00,
        status: 'active'
      },
      {
        currency: 'EUR',
        balance: 850.00,
        status: 'active'
      }
    ];
  }
}

/**
 * New API functions for comprehensive features
 */
export async function getFXQuotes(fromCurrency, toCurrency, amount = 1) {
  try {
    const res = await fetch(`${API_ORIGIN}/api/fx/quotes?from=${fromCurrency}&to=${toCurrency}&amount=${amount}`, {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `API error: ${res.statusText}`);
    return data;
  } catch (e) {
    console.error('FX quotes API error:', e);
    throw e;
  }
}

export async function getFXForecast(fromCurrency, toCurrency, days = 7) {
  try {
    const res = await fetch(`${API_ORIGIN}/api/fx/forecast?from=${fromCurrency}&to=${toCurrency}&days=${days}`, {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `API error: ${res.statusText}`);
    return data;
  } catch (e) {
    console.error('FX forecast API error:', e);
    throw e;
  }
}

export async function checkFraud(transactionData) {
  try {
    const res = await fetch(`${API_ORIGIN}/api/fraud/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(transactionData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `API error: ${res.statusText}`);
    return data;
  } catch (e) {
    console.error('Fraud check API error:', e);
    throw e;
  }
}

export async function translateText(text, targetLanguage, sourceLanguage = 'auto') {
  try {
    const res = await fetch(`${API_ORIGIN}/api/nlp/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({
        text,
        target_language: targetLanguage,
        source_language: sourceLanguage
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `API error: ${res.statusText}`);
    return data;
  } catch (e) {
    console.error('Translation API error:', e);
    throw e;
  }
}

export async function getSupportedLanguages() {
  try {
    const res = await fetch(`${API_ORIGIN}/api/nlp/languages`, {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `API error: ${res.statusText}`);
    return data;
  } catch (e) {
    console.error('Supported languages API error:', e);
    throw e;
  }
}

export async function depositToWallet(amount, currency, userId){
  try {
    const res = await fetch(`${API_ORIGIN}/api/wallet/deposit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ amount, currency })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `API error: ${res.statusText}`);
    return data;
  } catch(e) {
    console.error('Deposit API error:', e);
    throw e;
  }
}

export async function withdrawFromWallet(amount, currency, userId){
  try {
    const res = await fetch(`${API_ORIGIN}/api/wallet/withdraw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ amount, currency })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `API error: ${res.statusText}`);
    return data;
  } catch(e) {
    console.error('Withdraw API error:', e);
    throw e;
  }
}

export async function getRecurring(userId){
  try {
    const res = await fetch(`${API_ORIGIN}/api/recurring/`, {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `API error: ${res.statusText}`);
    return data.recurring_payments;
  } catch(e){
    console.error('Recurring payments API error:', e);
    return []; // Return empty array as fallback
  }
}

export async function createRecurring(payload, userId){
  try {
    const res = await fetch(`${API_ORIGIN}/api/recurring/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `API error: ${res.statusText}`);
    return data;
  } catch(e) {
    console.error('Create recurring payment API error:', e);
    throw e;
  }
}

export async function cancelRecurring(paymentId, userId) {
  try {
    const res = await fetch(`${API_ORIGIN}/api/recurring/${paymentId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `API error: ${res.statusText}`);
    return data;
  } catch(e) {
    console.error('Cancel recurring payment API error:', e);
    throw e;
  }
}

export async function postTTS(text){
  try {
    const res = await fetch(`${API_ORIGIN}/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({text})
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `API error: ${res.statusText}`);
    return data;
  } catch(e) {
    console.error('TTS API error:', e);
    throw e;
  }
}