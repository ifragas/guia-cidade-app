import Constants from 'expo-constants';

// URL da sua API
const API_BASE_URL = 'https://turismo-api-vv62.onrender.com/api'; 

// 🚨 PEGA O CITY_ID DINAMICAMENTE DO app.config.js (que lê o .env.rolante ou .env.smart)
const CITY_ID = Constants.expoConfig?.extra?.cityId || 'rolante';

async function request(endpoint, options = {}) {
  const headers = {
    ...options.headers,
  };

  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  // 🚨 INJEÇÃO AUTOMÁTICA: Adiciona ?cidadeId=rolante em TODAS as requisições GET
  let finalEndpoint = endpoint;
  if (options.method === 'GET') {
    const separator = endpoint.includes('?') ? '&' : '?';
    finalEndpoint = `${endpoint}${separator}cidadeId=${CITY_ID}`;
  }

  const config = {
    ...options,
    headers,
  };

  try {
    // Usa o finalEndpoint modificado
    const response = await fetch(`${API_BASE_URL}${finalEndpoint}`, config);
    
    if (response.status === 204) {
      return { success: true };
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Erro ao comunicar com o servidor.');
    }

    return data;
  } catch (error) {
    console.error(`[Mobile API Error] ${endpoint}:`, error.message);
    throw error;
  }
}

export const api = {
  get: (endpoint) => request(endpoint, { method: 'GET' }),
  post: (endpoint, body) => request(endpoint, {
    method: 'POST',
    body: body instanceof FormData ? body : JSON.stringify(body),
  }),
  put: (endpoint, body) => request(endpoint, {
    method: 'PUT',
    body: body instanceof FormData ? body : JSON.stringify(body),
  }),
  delete: (endpoint) => request(endpoint, { method: 'DELETE' }),
};

export default api;