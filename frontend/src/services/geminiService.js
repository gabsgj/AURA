export const extractTransactionDetailsFromText = async (text) => {
  // Simple regex-based extraction for demo purposes
  // In production, this would use the Gemini API
  
  const amountMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:dollars?|usd|\$|pounds?|gbp|£|euros?|eur|€)/i);
  const amount = amountMatch ? parseFloat(amountMatch[1]) : 100;
  
  const currencyPairs = [
    { pattern: /usd\s+to\s+eur|dollars?\s+to\s+euros?/i, from: 'USD', to: 'EUR' },
    { pattern: /usd\s+to\s+gbp|dollars?\s+to\s+pounds?/i, from: 'USD', to: 'GBP' },
    { pattern: /usd\s+to\s+inr|dollars?\s+to\s+(?:india|rupees?)/i, from: 'USD', to: 'INR' },
    { pattern: /gbp\s+to\s+eur|pounds?\s+to\s+euros?/i, from: 'GBP', to: 'EUR' },
    { pattern: /eur\s+to\s+usd|euros?\s+to\s+dollars?/i, from: 'EUR', to: 'USD' },
  ];
  
  let sourceCurrency = 'USD';
  let targetCurrency = 'EUR';
  
  for (const pair of currencyPairs) {
    if (pair.pattern.test(text)) {
      sourceCurrency = pair.from;
      targetCurrency = pair.to;
      break;
    }
  }
  
  return {
    amount,
    sourceCurrency,
    targetCurrency,
    recipient: 'John Doe', // Mock recipient
    purpose: 'Personal transfer'
  };
};
