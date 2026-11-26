import api from './api';

export async function perguntarIA(pergunta, cidadeId) {
  try {
    // api.post já retorna o objeto JSON direto (ex: { resposta, locaisMencionados })
    const data = await api.post(
      '/ia/chat',
      { pergunta, cidadeId },
      { timeout: 60000 } // 60s para cobrir cold start do Render + resposta da IA
    );

    console.log('📦 Resposta de /ia/chat:', JSON.stringify(data));

    if (!data || typeof data !== 'object') {
      throw new Error('Resposta inválida ou vazia recebida do servidor');
    }

    const textoResposta =
      typeof data.resposta === 'string' && data.resposta.trim()
        ? data.resposta.trim()
        : typeof data.mensagem === 'string' && data.mensagem.trim()
          ? data.mensagem.trim()
          : '';

    if (!textoResposta) {
      throw new Error('Campo "resposta" ausente ou vazio no retorno do servidor');
    }

    return {
      resposta: textoResposta,
      locaisMencionados: Array.isArray(data.locaisMencionados)
        ? data.locaisMencionados
        : [],
    };
  } catch (error) {
    console.log('❌ Erro em perguntarIA (/ia/chat):', {
      message: error?.message,
      code: error?.code,
      status: error?.status,
      data: error?.data,
    });
    throw error;
  }
}