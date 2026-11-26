import Constants from 'expo-constants';

const API_BASE_URL = 'https://turismo-api-vv62.onrender.com/api';

const APP_ENV = Constants.expoConfig?.extra?.appEnv || 'rolante';
const DEFAULT_CITY_ID = Constants.expoConfig?.extra?.cityId || 'rolante';
const IS_MULTI_CITY_APP = APP_ENV === 'smart';

// 🚨 Rotas que NÃO devem receber cidadeId automaticamente
const ROTAS_SEM_CIDADE_ID = ['/cidades', '/admin/cidades', '/ia/chat'];

async function request(endpoint, options = {}) {
  const { timeout = 30000, cidadeId, ...fetchOptions } = options;

  const headers = {
    ...fetchOptions.headers,
  };

  if (fetchOptions.body && !(fetchOptions.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  let finalEndpoint = endpoint;

  // 🚨 CORREÇÃO: Só injeta cidadeId se a rota não estiver na lista de exceções
  if (fetchOptions.method === 'GET' && !ROTAS_SEM_CIDADE_ID.some(rota => endpoint.includes(rota))) {
    const separator = endpoint.includes('?') ? '&' : '?';

    if (IS_MULTI_CITY_APP) {
      const cidade = cidadeId || DEFAULT_CITY_ID;
      finalEndpoint = `${endpoint}${separator}cidadeId=${cidade}`;
    } else {
      finalEndpoint = `${endpoint}${separator}cidadeId=${DEFAULT_CITY_ID}`;
    }
  }

  const fullUrl = `${API_BASE_URL}${finalEndpoint}`;
  console.log(`🔗 [API.JS] Chamando URL: ${fullUrl}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(fullUrl, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
    });

    if (response.status === 204) {
      return { success: true };
    }

    const rawText = await response.text();
    let data = null;

    if (rawText && rawText.trim()) {
      try {
        data = JSON.parse(rawText);
      } catch (parseErr) {
        console.warn('⚠️ Resposta não-JSON recebida:', rawText.slice(0, 200));
        data = { rawText };
      }
    }

    if (!response.ok) {
      const errMsg =
        (data && (data.error || data.message)) ||
        `Erro HTTP ${response.status} ao comunicar com o servidor.`;
      const err = new Error(errMsg);
      err.status = response.status;
      err.data = data;
      throw err;
    }

    if (!data || typeof data !== 'object') {
      throw new Error('Servidor retornou corpo vazio ou não-JSON');
    }

    return data;
  } catch (error) {
    if (error?.name === 'AbortError') {
      const timeoutErr = new Error('Tempo limite excedido ao aguardar resposta do servidor.');
      timeoutErr.code = 'ETIMEDOUT';
      console.error(`[Mobile API Error] ${endpoint}:`, timeoutErr.message);
      throw timeoutErr;
    }

    console.error(`[Mobile API Error] ${endpoint}:`, error?.message || error);
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const api = {
  get: (endpoint, cidadeId = null, extraOptions = {}) =>
    request(endpoint, {
      method: 'GET',
      cidadeId,
      ...extraOptions,
    }),
  post: (endpoint, body, extraOptions = {}) =>
    request(endpoint, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
      ...extraOptions,
    }),
  put: (endpoint, body, extraOptions = {}) =>
    request(endpoint, {
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body),
      ...extraOptions,
    }),
  delete: (endpoint, extraOptions = {}) =>
    request(endpoint, {
      method: 'DELETE',
      ...extraOptions,
    }),
};

export default api;