// src/utils/ScheduleHelper.js

/**
 * Verifica se um determinado local está aberto com base na string de horário retornada da API.
 * Suporta formatos comuns como:
 * - "24 Horas" / "24h"
 * - "08:00 - 18:00" / "08:00 às 18:00" / "08:00 as 18:00"
 * - "Diariamente das 11:00 às 22:00"
 */
export const isAbertoAgora = (horarioString) => {
  if (!horarioString || typeof horarioString !== 'string') {
    return false;
  }

  const texto = horarioString.trim().toLowerCase();

  // Caso 1: Locais que funcionam 24 horas
  if (texto.includes('24h') || texto.includes('24 horas') || texto.includes('24 hs')) {
    return true;
  }

  // Tenta extrair pares de horários no formato HH:MM (ex: 08:00 e 18:00)
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

    // Trata estabelecimentos que fecham após a meia-noite (ex: 18:00 às 02:00)
    if (minutosFechamento < minutosAbertura) {
      minutosFechamento += 24 * 60;
      if (minutosAtuais < minutosAbertura) {
        // Se estamos na madrugada anterior ao fechamento
        return minutosAtuais + 24 * 60 <= minutosFechamento;
      }
    }

    return minutosAtuais >= minutosAbertura && minutosAtuais <= minutosFechamento;
  }

  return false;
};