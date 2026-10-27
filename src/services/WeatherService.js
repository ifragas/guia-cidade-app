// src/services/WeatherService.js

// Coordenadas centrais de Riozinho / RS
const RIOZINHO_LAT = -29.6419;
const RIOZINHO_LNG = -50.4503;

/**
 * Converte o código WMO retornado pela Open-Meteo para um ícone do Ionicons e descrição
 */
const interpretarWMOCodigo = (code) => {
  if (code === 0) return { icon: 'sunny-outline', desc: 'Ensolarado' };
  if (code >= 1 && code <= 3) return { icon: 'partly-sunny-outline', desc: 'Parcialmente Nublado' };
  if (code >= 45 && code <= 48) return { icon: 'cloud-outline', desc: 'Nevoeiro' };
  if (code >= 51 && code <= 67) return { icon: 'rainy-outline', desc: 'Chuva Leve' };
  if (code >= 80 && code <= 82) return { icon: 'thunderstorm-outline', desc: 'Pancadas de Chuva' };
  if (code >= 95) return { icon: 'thunderstorm-outline', desc: 'Temporais' };
  return { icon: 'cloud-sun-outline', desc: 'Nublado' };
};

export const obterClimaRiozinho = async () => {
  try {
    // Incluído daily=temperature_2m_max,temperature_2m_min e timezone automático
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${RIOZINHO_LAT}&longitude=${RIOZINHO_LNG}&current_weather=true&daily=temperature_2m_max,temperature_2m_min&timezone=auto`;
    const response = await fetch(url);
    
    if (!response.ok) throw new Error('Erro ao buscar clima');
    
    const data = await response.json();
    const weather = data.current_weather;
    const infoClima = interpretarWMOCodigo(weather.weathercode);

    // Extrai a mínima e máxima do primeiro dia (índice 0 correspondente ao dia de hoje)
    const tempMax = data.daily?.temperature_2m_max?.[0] ?? null;
    const tempMin = data.daily?.temperature_2m_min?.[0] ?? null;

    return {
      temperatura: Math.round(weather.temperature),
      maxima: tempMax !== null ? Math.round(tempMax) : null,
      minima: tempMin !== null ? Math.round(tempMin) : null,
      vento: Math.round(weather.windspeed),
      icone: infoClima.icon,
      descricao: infoClima.desc,
    };
  } catch (error) {
    console.error('Erro ao obter clima:', error);
    return null;
  }
};