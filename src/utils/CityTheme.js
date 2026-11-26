import { LinearGradient } from 'expo-linear-gradient';

/**
 * Converte HEX (#RRGGBB) para RGBA para usar em gradientes com transparência
 */
export const hexToRgba = (hex, alpha = 1) => {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/**
 * Gera o array de cores para o gradiente cromático
 */
export const getCromaticGradient = (primary, secondary) => {
  return [
    primary,
    hexToRgba(primary, 0.85),
    secondary,
  ];
};

/**
 * Cores dos pins por categoria
 */
export const CATEGORY_COLORS = {
  turismo: '#4CAF50',
  gastronomia: '#FF9800',
  hospedagem: '#0B2D6B',
  servicos: '#607D8B',
  evento: '#9C27B0',
};

/**
 * Componente de Fundo Cromático (para telas de Loading, por exemplo)
 */
export const CromaticBackground = ({ primary, secondary, children }) => {
  return (
    <LinearGradient
      colors={getCromaticGradient(primary, secondary)}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
    >
      {children}
    </LinearGradient>
  );
};