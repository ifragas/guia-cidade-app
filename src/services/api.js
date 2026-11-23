import Constants from 'expo-constants';

const API_BASE_URL = 'https://turismo-api-vv62.onrender.com/api'; 

// 🚨 Detecta se é o app Smart ou Rolante
const APP_ENV = Constants.expoConfig?.extra?.appEnv || 'rolante';
const DEFAULT_CITY_ID = Constants.expoConfig?.extra?.cityId || 'rolante';
const IS_MULTI_CITY_APP = APP_ENV === 'smart';

async function request(endpoint, options = {}) {
  const headers = {
    ...options.headers,
  };

  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  let finalEndpoint = endpoint;

  // 🚨 LÓGICA DE INJEÇÃO INTELIGENTE
  if (options.method === 'GET') {
    const separator = endpoint.includes('?') ? '&' : '?';
    
    if (IS_MULTI_CITY_APP) {
      // App Smart: Usa a cidade passada dinamicamente, ou cai para o padrão se não for passada
      const cidadeId = options.cidadeId || DEFAULT_CITY_ID;
      finalEndpoint = `${endpoint}${separator}cidadeId=${cidadeId}`;
    } else {
      // App Rolante: Usa sempre a cidade fixa do .env
      finalEndpoint = `${endpoint}${separator}cidadeId=${DEFAULT_CITY_ID}`;
    }
  }

  // 🚨 LOG DE DEPURAÇÃO (Para vermos exatamente qual URL está sendo chamada)
  console.log(`🔗 [API.JS] Chamando URL: ${API_BASE_URL}${finalEndpoint}`);

  const config = {
    ...options,
    headers,
  };

  try {
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
  // 🚨 Agora aceita o segundo parâmetro 'cidadeId' para o App Smart
  get: (endpoint, cidadeId = null) => request(endpoint, { 
    method: 'GET',
    cidadeId 
  }),
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