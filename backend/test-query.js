import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '.env');
dotenv.config({ path: envPath });

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function main() {
  console.log('Testing listarEquipamentos query...');
  
  try {
    // Simulating ADMIN (no where clause)
    console.log('--- Scenario 1: ADMIN (All items) ---');
    const equipamentosAdmin = await prisma.equipamento.findMany({
      where: {},
      include: {
        escola: true
      },
      orderBy: [
        { escola: { nome: 'asc' } },
        { nome: 'asc' }
      ],
      take: 5 // Limit to 5 to avoid huge output
    });
    console.log(`Success! Found ${equipamentosAdmin.length} items.`);    

    // Simulating USER with escolaId
    console.log('\n--- Scenario 2: USER (Filtered by escolaId) ---');
    // Find an escolaId to test
    const escola = await prisma.escola.findFirst();
    if (escola) {
        console.log(`Testing with escolaId: ${escola.id}`);
        const equipamentosUser = await prisma.equipamento.findMany({
          where: { escolaId: escola.id },
          include: {
            escola: true
          },
          orderBy: [
            { escola: { nome: 'asc' } },
            { nome: 'asc' }
          ]
        });
        console.log(`Success! Found ${equipamentosUser.length} items.`);
    } else {
        console.log('No escola found to test Scenario 2.');
    }

  } catch (err) {
    console.error('ERROR OCCURRED:');
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
