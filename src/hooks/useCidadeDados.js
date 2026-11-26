// src/hooks/useCidadeDados.js
import { useState, useEffect } from 'react';
import { useCity } from '../context/CityContext';
import { obterCache } from '../services/cacheService';

/**
 * Hook que fornece os dados da cidade atual (pontos turísticos, restaurantes, etc.)
 * Prioriza o cache para evitar requisições duplicadas.
 */
export default function useCidadeDados() {
  const { cidadeAtual, isOffline } = useCity();
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const carregarDados = async () => {
      if (!cidadeAtual?.slug) {
        setDados(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const cacheKey = `cidade_${cidadeAtual.slug}`;
        const dadosCache = await obterCache(cacheKey);

        if (dadosCache) {
          console.log(`✅ Dados carregados do cache para: ${cidadeAtual.slug}`);
          setDados(dadosCache);
        } else {
          console.warn(`⚠️ Nenhum cache encontrado para: ${cidadeAtual.slug}`);
          setDados(null);
        }
      } catch (error) {
        console.error(`❌ Erro ao carregar dados do cache:`, error);
        setDados(null);
      } finally {
        setLoading(false);
      }
    };

    carregarDados();
  }, [cidadeAtual?.slug]);

  return { dados, loading, isOffline };
}