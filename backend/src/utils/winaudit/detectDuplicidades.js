import { normalizarMacEntrada, normalizarSerial, normalizarNome } from './normalizers.js';

const PRIORIDADE_TIPO = {
  serial: 1,
  sourceExternalId: 2,
  mac: 3,
  nome: 4,
};

const montarCampoDuplicidade = (tipo, equipamento, campoValor) => {
  const bloqueio = (tipo === 'serial' && equipamento.status !== 'DESCARTADO')
    || tipo === 'sourceExternalId';
  return {
    tipo,
    campoValor,
    equipamentoId: equipamento.id,
    nomeEquipamento: equipamento.nome,
    status: equipamento.status,
    patrimonio: equipamento.patrimonio ?? null,
    bloqueio,
  };
};

export const detectarDuplicidades = async (prisma, entrada) => {
  const { serial, macs, nome, sourceExternalId } = entrada || {};

  const duplicidades = [];
  const or = [];

  const serialLimpo = normalizarSerial(serial);
  if (serialLimpo) {
    or.push({ serial: serialLimpo });
  }

  const sourceExtLimpo = typeof sourceExternalId === 'string' ? sourceExternalId.trim() : '';
  if (sourceExtLimpo) {
    or.push({ sourceExternalId: sourceExtLimpo });
  }

  const macsValidos = (macs || [])
    .map((m) => (typeof m === 'string' ? normalizarMacEntrada(m) : normalizarMacEntrada(m.valor || '')))
    .filter((r) => r.valido && r.valor);

  for (const m of macsValidos) {
    or.push({ macaddress: m.valor });
  }

  const nomeLimpo = normalizarNome(nome);
  if (nomeLimpo) {
    or.push({ nome: nomeLimpo });
  }

  if (or.length === 0) {
    return {
      duplicidades: [],
      possivelDuplicidade: false,
      bloqueioSerial: false,
      bloqueioSourceExternalId: false,
    };
  }

  const candidatos = await prisma.equipamento.findMany({
    where: { OR: or },
    select: {
      id: true,
      nome: true,
      status: true,
      serial: true,
      sourceExternalId: true,
      macaddress: true,
      patrimonio: true,
    },
  });

  candidatos.forEach((eq) => {
    if (serialLimpo && eq.serial === serialLimpo) {
      duplicidades.push(montarCampoDuplicidade('serial', eq, serialLimpo));
    }
    if (sourceExtLimpo && eq.sourceExternalId === sourceExtLimpo) {
      duplicidades.push(montarCampoDuplicidade('sourceExternalId', eq, sourceExtLimpo));
    }
    for (const m of macsValidos) {
      if (m.valor && eq.macaddress === m.valor) {
        duplicidades.push(montarCampoDuplicidade('mac', eq, m.valor));
      }
    }
    if (nomeLimpo && eq.nome === nomeLimpo) {
      duplicidades.push(montarCampoDuplicidade('nome', eq, nomeLimpo));
    }
  });

  duplicidades.sort((a, b) => {
    const pA = PRIORIDADE_TIPO[a.tipo] ?? 99;
    const pB = PRIORIDADE_TIPO[b.tipo] ?? 99;
    if (pA !== pB) return pA - pB;
    return a.nomeEquipamento.localeCompare(b.nomeEquipamento, 'pt-BR');
  });

  const bloqueioSerial = duplicidades.some((d) => d.tipo === 'serial' && d.bloqueio);
  const bloqueioSourceExternalId = duplicidades.some((d) => d.tipo === 'sourceExternalId' && d.bloqueio);

  return {
    duplicidades,
    possivelDuplicidade: duplicidades.length > 0,
    bloqueioSerial,
    bloqueioSourceExternalId,
    macsValidos: macsValidos.map((m) => ({ valor: m.valor })),
    serialLimpo,
    nomeLimpo,
    sourceExtLimpo,
  };
};
