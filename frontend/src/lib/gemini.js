export async function extractEntitiesFromText(text){
  return {
    intent: 'send',
    amount: 10000,
    currency_from: 'INR',
    currency_to: 'PHP',
    recipient_country: 'Philippines',
    urgency: 'normal',
    language: 'en'
  };
}

export async function recommendProviders(entities){
  return null;
}