export const getFxForecast = async (sourceCurrency, targetCurrency) => {
  // Mock FX forecast data for demo purposes
  // In production, this would call the backend AI FX prediction service
  
  const mockRates = {
    'USD-EUR': 0.9250,
    'USD-GBP': 0.8150,
    'USD-INR': 83.25,
    'EUR-USD': 1.0811,
    'GBP-USD': 1.2270,
    'INR-USD': 0.0120
  };
  
  const pair = `${sourceCurrency}-${targetCurrency}`;
  const currentRate = mockRates[pair] || 1.0;
  const predictedRate = currentRate * (0.98 + Math.random() * 0.04); // ±2% variation
  
  const trend = predictedRate > currentRate ? 'up' : predictedRate < currentRate ? 'down' : 'stable';
  const confidence = 0.75 + Math.random() * 0.2; // 75-95% confidence
  
  let recommendation = '';
  if (trend === 'up') {
    recommendation = 'Rates expected to improve. Consider waiting.';
  } else if (trend === 'down') {
    recommendation = 'Send now for better rates.';
  } else {
    recommendation = 'Rates stable. Good time to send.';
  }
  
  return {
    currentRate,
    predictedRate,
    trend,
    confidence,
    recommendation
  };
};
