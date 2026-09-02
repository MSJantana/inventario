export const STATUS_FINAIS = Object.freeze(new Set(['DESCARTADO', 'DOADO']));
export const STATUS_QUE_BLOQUEIAM_MOVIMENTO = Object.freeze(new Set(STATUS_FINAIS));

export const TIPO_PARA_STATUS_ALVO = Object.freeze({
  ENTRADA: 'DISPONIVEL',
  SAIDA: null,
  TRANSFERENCIA: null,
  MANUTENCAO: 'EM_MANUTENCAO',
  MANUTENCAO_ENVIO: 'EM_MANUTENCAO',
  MANUTENCAO_RETORNO: 'DISPONIVEL',
  EMPRESTIMO: 'EMPRESTADO',
  DEVOLUCAO: 'DISPONIVEL',
  DOACAO: 'DOADO',
  DESCARTE: 'DESCARTADO',
  AJUSTE: null,
});

export const TIPOS_QUE_PERMITEM_STATUS_QUALQUER_EXCETO_FINAL = Object.freeze(new Set(['AJUSTE']));

export const REGRA_ESPECIAL = Object.freeze({
  MANUTENCAO_RETORNO: (statusAtual) => statusAtual === 'EM_MANUTENCAO',
  DEVOLUCAO: (statusAtual) => statusAtual === 'EMPRESTADO',
  MANUTENCAO_ENVIO: (statusAtual) => statusAtual !== 'EM_MANUTENCAO' && statusAtual !== 'EMPRESTADO',
  EMPRESTIMO: (statusAtual) => statusAtual !== 'EMPRESTADO' && statusAtual !== 'EM_MANUTENCAO',
});

export const TIPOS_MOVIMENTO = Object.freeze(Object.keys(TIPO_PARA_STATUS_ALVO));
export const STATUS_EQUIPAMENTO = Object.freeze([
  'DISPONIVEL','EM_USO','EM_MANUTENCAO','DESCARTADO','RESERVADO','EMPRESTADO','DOADO',
]);

export function validarTransicaoStatus(statusAtual, tipoMovimento, opcoes) {
  const forcar = Boolean(opcoes?.forcar);
  const statusDestinoSolicitado = opcoes?.statusDestino ? String(opcoes.statusDestino).trim().toUpperCase() : null;
  const statusAtualNormalizado = String(statusAtual || 'DISPONIVEL').trim().toUpperCase();
  const tipoNormalizado = String(tipoMovimento || '').trim().toUpperCase();

  if (!TIPO_PARA_STATUS_ALVO.hasOwnProperty(tipoNormalizado)) {
    return {
      valido: false,
      proximoStatus: null,
      mensagem: 'Tipo de movimento inválido: ' + tipoNormalizado + '.',
      codigo: 'TRANSICAO_INVALIDA',
    };
  }

  if (!forcar && STATUS_QUE_BLOQUEIAM_MOVIMENTO.has(statusAtualNormalizado)) {
    if (tipoNormalizado === 'AJUSTE') {
      return {
        valido: true,
        proximoStatus: null,
        mensagem: 'Ajuste permitido em status final ' + statusAtualNormalizado + ' (não altera status).',
      };
    }
    return {
      valido: false,
      proximoStatus: null,
      mensagem: 'Equipamento está ' + statusAtualNormalizado + '. Nenhuma movimentação é permitida (exceto ajuste).',
      codigo: 'STATUS_FINAL',
    };
  }

  if (REGRA_ESPECIAL.hasOwnProperty(tipoNormalizado)) {
    const regra = REGRA_ESPECIAL[tipoNormalizado];
    if (!forcar && typeof regra === 'function' && regra(statusAtualNormalizado) === false) {
      return {
        valido: false,
        proximoStatus: null,
        mensagem: 'Movimento ' + tipoNormalizado + ' não permitido. Status atual: ' + statusAtualNormalizado + '.',
        codigo: 'TRANSICAO_INVALIDA',
      };
    }
  }

  const alvo = TIPO_PARA_STATUS_ALVO[tipoNormalizado];

  if (alvo === null || TIPOS_QUE_PERMITEM_STATUS_QUALQUER_EXCETO_FINAL.has(tipoNormalizado)) {
    return {
      valido: true,
      proximoStatus: null,
      mensagem: 'Movimento ' + tipoNormalizado + ' não altera status do equipamento.',
    };
  }

  let proximoStatus = alvo;
  const TIPOS_COM_STATUS_DESTINO_PERMITIDO = Object.freeze({
    MANUTENCAO_RETORNO: Object.freeze(['DISPONIVEL', 'EM_USO']),
    DEVOLUCAO: Object.freeze(['DISPONIVEL', 'EM_USO']),
  });
  if (statusDestinoSolicitado && TIPOS_COM_STATUS_DESTINO_PERMITIDO.hasOwnProperty(tipoNormalizado)) {
    const permitidos = TIPOS_COM_STATUS_DESTINO_PERMITIDO[tipoNormalizado];
    if (permitidos.includes(statusDestinoSolicitado)) {
      proximoStatus = statusDestinoSolicitado;
    } else {
      return {
        valido: false,
        proximoStatus: null,
        mensagem: 'Status destino inválido para ' + tipoNormalizado + '. Permitidos: ' + permitidos.join(', ') + '. Recebido: ' + statusDestinoSolicitado + '.',
        codigo: 'STATUS_DESTINO_INVALIDO',
      };
    }
  }

  return {
    valido: true,
    proximoStatus: proximoStatus,
    mensagem: 'Status ' + statusAtualNormalizado + ' → ' + proximoStatus + ' via movimento ' + tipoNormalizado + '.',
  };
}

export default {
  validarTransicaoStatus,
  TIPO_PARA_STATUS_ALVO,
  TIPOS_MOVIMENTO,
  STATUS_EQUIPAMENTO,
  STATUS_FINAIS,
  STATUS_QUE_BLOQUEIAM_MOVIMENTO,
  REGRA_ESPECIAL,
};
