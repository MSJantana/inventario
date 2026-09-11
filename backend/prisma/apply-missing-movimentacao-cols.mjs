import { bootstrapRuntimeEnv } from './_runtime-env-helper.mjs';
import { PrismaClient } from '@prisma/client';

const envInfo = bootstrapRuntimeEnv();

console.log('[contexto] NODE_ENV =', process.env.NODE_ENV);
console.log('[contexto] DATABASE_URL interpolada =', envInfo.urlRedacted,
  '(host-esperado=', envInfo.host, ' db=', envInfo.name,
  ' tinhaPlaceholders=', envInfo.tinhaPlaceholders, ')');

const prisma = new PrismaClient();

try {
  const info = await prisma.$queryRawUnsafe(`SELECT DATABASE() AS dbname, @@hostname AS host, @@port AS port`);
  const r = Array.isArray(info) ? info[0] : info;
  console.log('[conectado] db=', r.dbname, 'host=', r.host, 'port=', r.port);

  const cols = await prisma.$queryRawUnsafe(`SHOW COLUMNS FROM Movimentacao`);
  const arr = Array.isArray(cols) ? cols : [];
  console.log('\n=== Colunas ATUAIS de Movimentacao ===');
  for (const c of arr) console.log('  ', c.Field, c.Type, c.Null);

  console.log('\n=== Aplicar ALTER TABLE FORCADOS para 12 colunas faltantes ===');

  const adds = [
    "ADD COLUMN `departamento` VARCHAR(191) NULL",
    "ADD COLUMN `dataEntrega` DATETIME(3) NULL",
    "ADD COLUMN `dataRetorno` DATETIME(3) NULL",
    "ADD COLUMN `cautelaNumero` VARCHAR(191) NULL",
    "ADD COLUMN `manutencaoTipo` VARCHAR(191) NULL",
    "ADD COLUMN `manutencaoFornecedor` VARCHAR(191) NULL",
    "ADD COLUMN `emprestimoNomeContato` VARCHAR(191) NULL",
    "ADD COLUMN `emprestimoContatoTel` VARCHAR(191) NULL",
    "ADD COLUMN `emprestimoDataPrevista` DATETIME(3) NULL",
    "ADD COLUMN `transferenciaDestino` VARCHAR(191) NULL",
    "ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)",
    "ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)"
  ];

  for (const add of adds) {
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE \`Movimentacao\` ${add}`);
      console.log('  ✅ OK:', add.slice(0, 80));
    } catch (e) {
      const cod = e.meta && (typeof e.meta.code === 'number' ? e.meta.code : Number(e.meta.code));
      const codStr = /Code:\s*`?(\d{4})`?/.exec(String(e.meta?.message || e.message || ''));
      const c = cod || (codStr ? Number(codStr[1]) : null);
      if (c === 1060) { console.log('  ⏭️  já existente:', add.slice(0, 80)); }
      else { console.log('  ⚠️  erro cod=', c, 'msg=', String(e.message || '').slice(0, 180)); }
    }
  }

  console.log('\n=== Aplicar ALTER TABLE UsuarioEscola: drop PK composta + add id + UUIDs ===');
  try {
    await prisma.$executeRawUnsafe("ALTER TABLE `UsuarioEscola` DROP PRIMARY KEY");
    console.log('  ✅ UsuarioEscola: PK anterior (composta usuarioId+escolaId) removida');
  } catch (e) {
    const cod = e.meta?.code ?? null;
    console.log('  ℹ️  UsuarioEscola DROP PK: cod=', cod, String(e.message || '').slice(0, 120));
  }

  try {
    await prisma.$executeRawUnsafe(
      "ALTER TABLE `UsuarioEscola` ADD COLUMN `id` VARCHAR(191) FIRST"
    );
    console.log('  ✅ UsuarioEscola: coluna id adicionada (inicialmente NULLABLE)');
  } catch (e) {
    const cod = e.meta?.code ?? null;
    if (cod === 1060) console.log('  ⏭️  UsuarioEscola: coluna id já existe');
    else console.log('  ⚠️  UsuarioEscola ADD id cod=', cod, String(e.message || '').slice(0, 200));
  }

  try {
    const atualizados = await prisma.$executeRawUnsafe(
      "UPDATE `UsuarioEscola` SET `id` = (SELECT REPLACE(UUID(),'-','')) WHERE `id` IS NULL OR `id` = ''"
    );
    console.log('  ✅ UsuarioEscola: gerados UUID para id, linhas=', typeof atualizados === 'number' ? atualizados : 'N/A');
  } catch (e) {
    console.log('  ⚠️  UsuarioEscola UPDATE UUIDs: ', String(e.message || '').slice(0, 220));
  }

  try {
    await prisma.$executeRawUnsafe(
      "ALTER TABLE `UsuarioEscola` MODIFY COLUMN `id` VARCHAR(191) NOT NULL, ADD PRIMARY KEY (`id`)"
    );
    console.log('  ✅ UsuarioEscola: id transformado em PK not null');
  } catch (e) {
    const cod = e.meta?.code ?? null;
    const msg = String(e.message || '');
    if (cod === 1068 || msg.includes('Multiple primary key')) console.log('  ⏭️  UsuarioEscola já tem PK id');
    else if (cod === 1060) console.log('  ⏭️  UsuarioEscola id já é not null');
    else console.log('  ⚠️  UsuarioEscola PK id cod=', cod, msg.slice(0, 200));
  }

  const cols2 = await prisma.$queryRawUnsafe(`SHOW COLUMNS FROM Movimentacao`);
  const arr2 = Array.isArray(cols2) ? cols2 : [];
  console.log('\n=== Colunas DEPOIS de Movimentacao ===');
  for (const c of arr2) console.log('  ', c.Field);

  const colsUE = await prisma.$queryRawUnsafe(`SHOW COLUMNS FROM UsuarioEscola`);
  const arrUE = Array.isArray(colsUE) ? colsUE : [];
  console.log('\n=== Colunas DEPOIS de UsuarioEscola ===');
  for (const c of arrUE) console.log('  ', c.Field);

} finally {
  await prisma.$disconnect();
}
