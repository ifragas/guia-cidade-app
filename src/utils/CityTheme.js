import { LinearGradient } from 'expo-linear-gradient';

/**
 * Converte hex para objeto RGB
 */
const hexToRgb = (hex) => {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean.length === 3 
    ? clean.split('').map(c => c + c).join('') 
    : clean, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
};

/**
 * Escurece uma cor (para gerar o "via" do gradiente)
 */
const darkenColor = (hex, amount = 0.4) => {
  const { r, g, b } = hexToRgb(hex);
  const nr = Math.round(r * (1 - amount));
  const ng = Math.round(g * (1 - amount));
  const nb = Math.round(b * (1 - amount));
  return `rgb(${nr}, ${ng}, ${nb})`;
};

/**
 * Gera o array de cores do gradiente cromático
 * Padrão: corPrimaria (clara) → corPrimaria escura → quase preto
 * Exatamente como o painel: from-emerald-900 via-emerald-950 to-slate-950
 */
export const getCromáticoGradient = (corPrimaria = '#4CAF50', corSecundaria = '#0B2D6B') => {
  return [
    corPrimaria,                          // topo: cor da cidade
    darkenColor(corPrimaria, 0.55),       // meio: escurecida
    darkenColor(corSecundaria, 0.75),     // base: quase preto
  ];
};

/**
 * Cores de texto sobre o gradiente escuro
 */
export const getCromáticoTextColors = () => ({
  primary: '#ffffff',
  secondary: 'rgba(255, 255, 255, 0.75)',
  muted: 'rgba(255, 255, 255, 0.5)',
});

/**
 * Cores dos pins por categoria (padrão Smart)
 */
export const CATEGORY_COLORS = {
  turismo: '#4CAF50',      // Verde Natureza
  gastronomia: '#FF9800',  // Laranja Descobertas
  hospedagem: '#0B2D6B',   // Azul Tecnologia
  servicos: '#E8EEF6',     // Cinza Equilíbrio
  evento: '#9C27B0',       // Roxo (destaque)
};

/**
 * Componente wrapper do fundo cromático
 */
export const CromaticBackground = ({ children, corPrimaria, corSecundaria, style }) => {
  const colors = getCromáticoGradient(corPrimaria, corSecundaria);
  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[{ flex: 1 }, style]}
    >
      {children}
    </LinearGradient>
  );
};