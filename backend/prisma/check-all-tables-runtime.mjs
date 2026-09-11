import { bootstrapRuntimeEnv } from './_runtime-env-helper.mjs';
import { PrismaClient } from '@prisma/client';

const envInfo = bootstrapRuntimeEnv();

console.log('[contexto] NODE_ENV =', process.env.NODE_ENV);
console.log('[contexto] DATABASE_URL interpolada =', envInfo.urlRedacted,
  '(host-esperado=', envInfo.host, ' tinhaPlaceholders=', envInfo.tinhaPlaceholders, ')');

const prisma = new PrismaClient();

const TABELAS = {
  Equipamento: [
    'id','nome','patrimonio','tipo','modelo','serial','status','localizacao',
    'fabricante','dataAquisicao','processador','memoria','macaddress',
    'observacoes','usuarioNome','setor','responsavel','escolaId',
    'sourceExternalId','importMetadata','createdAt','updatedAt'
  ],
  ImportacaoWinAudit: [
    'id','usuarioId','dataHora','arquivoOriginal','tamanhoBytes','tipoArquivo',
    'status','equipamentoId','camposEncontrados','camposNaoEncontrados',
    'duplicidadesDetectadas','erros','dadosBrutos','erroMotivo','escolaId',
    'ipOrigem','versaoImportador'
  ],
  Movimentacao: [
    'id','equipamentoId','responsavel','tipoMovimento','origem','destino',
    'escolaId','dataMovimento','observacoes','usuarioId','movimentacaoEstornoId',
    'departamento','dataEntrega','dataRetorno','cautelaNumero','manutencaoTipo',
    'manutencaoFornecedor','emprestimoNomeContato','emprestimoContatoTel',
    'emprestimoDataPrevista','transferenciaDestino','createdAt','updatedAt'
  ],
  Usuario: [
    'id','nome','email','senha','role','cargo','resetToken','resetTokenExpiry',
    'escolaId','createdAt','updatedAt'
  ],
  UsuarioEscola: ['id','usuarioId','escolaId','createdAt'],
  Escola: ['id','nome','endereco','telefone','createdAt','updatedAt']
};

try {
  let totalFalta = 0;
  for (const [tabela, cols] of Object.entries(TABELAS)) {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${tabela}'`
    );
    const existentes = new Set(Array.isArray(rows) ? rows.map(r => r.COLUMN_NAME) : []);
    let falta = 0;
    for (const c of cols) {
      const ok = existentes.has(c);
      if (!ok) { falta++; totalFalta++; }
    }
    const icon = falta === 0 ? '✅' : '❌';
    console.log(`${icon} ${tabela}: ${falta === 0 ? 'TODOS OK' : falta + ' coluna(s) faltando'}`);
    for (const c of cols) if (!existentes.has(c)) console.log(`      🚫 COLUNA FALTANTE: ${c}`);
  }
  console.log(`\nGERAL: ${totalFalta === 0 ? 'TUDO OK' : totalFalta + ' PROBLEMAS'}`);
  process.exit(totalFalta === 0 ? 0 : 2);
} finally {
  await prisma.$disconnect();
}
