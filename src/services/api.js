// src/services/api.js

// Altere para o seu IP local caso teste no celular físico (ex: 'http://192.168.1.15:3000/api') 
// ou use o link de produção no Render:
const API_BASE_URL = 'https://turismo-api-vv62.onrender.com/api'; 

async function request(endpoint, options = {}) {
  const headers = {
    ...options.headers,
  };

  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
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