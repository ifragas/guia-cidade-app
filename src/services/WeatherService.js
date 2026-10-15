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
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${RIOZINHO_LAT}&longitude=${RIOZINHO_LNG}&current_weather=true`;
    const response = await fetch(url);
    
    if (!response.ok) throw new Error('Erro ao buscar clima');
    
    const data = await response.json();
    const weather = data.current_weather;
    const infoClima = interpretarWMOCodigo(weather.weathercode);

    return {
      temperatura: Math.round(weather.temperature),
      vento: Math.round(weather.windspeed),
      icone: infoClima.icon,
      descricao: infoClima.desc,
    };
  } catch (error) {
    console.error('Erro ao obter clima:', error);
    return null;
  }
};