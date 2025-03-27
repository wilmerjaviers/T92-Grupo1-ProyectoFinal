const axios = require('axios');

async function convertCurrency(amount) {
  try {
    
    const response = await axios.get('https://open.er-api.com/v6/latest/USD');
    
    if (!response.data || !response.data.rates) {
      throw new Error('No se pudieron obtener tasas de cambio');
    }
    
    const rates = response.data.rates;
    

    const conversions = {
      EUR: {
        rate: rates.EUR,
        amount: amount * rates.EUR
      },
      HNL: {
        rate: rates.HNL,
        amount: amount * rates.HNL
      },
      JPY: {
        rate: rates.JPY,
        amount: amount * rates.JPY
      }
    };
    
    return {
      success: true,
      base_currency: 'USD',
      amount,
      conversions,
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Error en conversión de moneda:', error.message);
    return {
      success: false,
      error: 'No se pudo realizar la conversión de moneda'
    };
  }
}

module.exports = { convertCurrency };