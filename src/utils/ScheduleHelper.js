// src/utils/ScheduleHelper.js

const DIAS_SEMANA_MAP = {
  0: 'domingo',
  1: 'segunda',
  2: 'terca',
  3: 'quarta',
  4: 'quinta',
  5: 'sexta',
  6: 'sabado'
};

/**
 * Verifica se um determinado local está aberto.
 * Suporta a flag de sempre aberto, o formato estruturado (objeto por dias da semana) e o formato legado em string.
 */
export const isAbertoAgora = (itemData) => {
  if (!itemData) {
    return false;
  }

  // 0. Se o item tiver a flag sempreAberto ativada, retorna sempre true
  if (typeof itemData === 'object' && itemData.sempreAberto === true) {
    return true;
  }

  // Extrai o objeto de horários caso o parâmetro passado seja o objeto completo do local ou apenas o campo de horários
  const horariosData = itemData.horarios || itemData;

  // 1. Se for o novo formato estruturado (objeto com os dias da semana)
  if (typeof horariosData === 'object' && !Array.isArray(horariosData)) {
    const hojeChave = DIAS_SEMANA_MAP[new Date().getDay()];
    const hojeInfo = horariosData[hojeChave];

    // Se não estiver cadastrado para hoje
    if (!hojeInfo) {
      return false;
    }

    // Se houver uma flag explícita de desativado/fechado
    if (hojeInfo.ativo === false) {
      return false;
    }

    const { abertura, fecho } = hojeInfo;
    if (!abertura || !fecho) return false;

    const now = new Date();
    const minutosAtuais = now.getHours() * 60 + now.getMinutes();

    const [horaAb, minAb] = abertura.split(':').map(Number);
    const [horaFech, minFech] = fecho.split(':').map(Number);

    const minutosAbertura = horaAb * 60 + (minAb || 0);
    let minutosFechamento = horaFech * 60 + (minFech || 0);

    // Se o fecho for após a meia-noite
    if (minutosFechamento < minutosAbertura) {
      minutosFechamento += 24 * 60;
      if (minutosAtuais < minutosAbertura) {
        return minutosAtuais + 24 * 60 <= minutosFechamento;
      }
    }

    return minutosAtuais >= minutosAbertura && minutosAtuais <= minutosFechamento;
  }

  // 2. Fallback para o formato antigo em string (caso venha de dados legados)
  if (typeof horariosData === 'string') {
    const texto = horariosData.trim().toLowerCase();

    if (texto.includes('24h') || texto.includes('24 horas') || texto.includes('24 hs')) {
      return true;
    }

    const regexHoras = /(\d{1,2})[:h](\d{2})?/g;
    const matches = [...texto.matchAll(regexHoras)];

    if (matches.length >= 2) {
      const horaAbertura = parseInt(matches[0][1], 10);
      const minutoAbertura = matches[0][2] ? parseInt(matches[0][2], 10) : 0;

      const horaFechamento = parseInt(matches[1][1], 10);
      const minutoFechamento = matches[1][2] ? parseInt(matches[1][2], 10) : 0;

      const agora = new Date();
      const minutosAtuais = agora.getHours() * 60 + agora.getMinutes();

      const minutosAbertura = horaAbertura * 60 + minutoAbertura;
      let minutosFechamento = horaFechamento * 60 + minutoFechamento;

      if (minutosFechamento < minutosAbertura) {
        minutosFechamento += 24 * 60;
        if (minutosAtuais < minutosAbertura) {
          return minutosAtuais + 24 * 60 <= minutosFechamento;
        }
      }

      return minutosAtuais >= minutosAbertura && minutosAtuais <= minutosFechamento;
    }
  }

  return false;
};