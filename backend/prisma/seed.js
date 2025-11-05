import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Limpar dados existentes (opcional)
  await prisma.escola.deleteMany({});

  console.log('Iniciando carga de escolas...');

  // Array com dados de escolas para carga inicial
  const escolas = [
    {
      nome: 'Colégio Adventista Porto Alegre',
      sigla: 'CAPA',
      endereco: 'Rua Camaquã, 534',
      cidade: 'Porto Alegre',
      estado: 'RS',
      cep: '91910-630',
      telefone: '(51) 3086-5050',
      email: 'secretaria.capa@educadventista.org.br',
      diretor: 'Itamar Fonseca',
      observacoes: 'Escola de ensino fundamental e médio'
    },
    {
      nome: 'Colégio Adventistas de Viamão',
      sigla: 'CAV',
      endereco: 'Av. General Câmara, 226 - Centro',
      cidade: 'Viamão',
      estado: 'RS',
      cep: '94410-130',
      telefone: '(51) 3485-2668',
      email: 'secretaria2.cav@educadventista.org.br',
      diretor: 'Tanise Signorini',
      observacoes: 'Escola de ensino fundamental e médio'
    },
    {
      nome: 'Colégio Adventista do Partenon',
      sigla: 'CAP',
      endereco: 'Rua Valado, 363 - Partenon',
      cidade: 'Porto Alegre',
      estado: 'RS',
      cep: '91510-740',
      telefone: '(51) 3339-2020',
      email: 'secretaria.cap@educadventista.org.br',
      diretor: 'Douglas Canto',
      observacoes: 'Escola de ensino fundamental e médio'
    },
    {
      nome: 'Colégio Adventista de Osório',
      sigla: 'CAO',
      endereco: 'Av. Constituição, 257 - Centro',
      cidade: 'Osório',
      estado: 'RS',
      cep: '95520-000',
      telefone: '(51) 3663-3517',
      email: 'secretaria.eaos@educadventista.org.br',
      diretor: 'Gladmir Santos',
      observacoes: 'Escola de ensino fundamental e médio'
    },
    {
      nome: 'Colégio Adventista de Pelotas',
      sigla: 'EAPEL',
      endereco: 'Rua Almirante. Barroso, 3008 - Centro',
      cidade: 'Pelotas',
      estado: 'RS',
      cep: '96010-280',
      telefone: '(53) 3225-4188',
      email: 'secretaria.eapel@educadventista.org.br',
      diretor: 'Laureci Canto',
      observacoes: 'Escola de ensino fundamental e médio'
    },
    {
      nome: 'Escola Adventista de Rio Grande',
      sigla: 'EARG',
      endereco: 'Rua dGeneral Vitorino, 744 - Centro',
      cidade: 'Rio Grande',
      estado: 'RS',
      cep: '96200-310',
      telefone: '(53) 3232-5456',
      email: 'secretaria.earg@educadventista.org.br',
      diretor: 'Vandir Ronaldo',
      observacoes: 'Escola de ensino fundamental e médio'
    },
    {
      nome: 'Escola Adventista de Santa Cecília',
      sigla: 'EASC',
      endereco: 'Rua Plácido Mottin, 1588 - Santa Cecília',
      cidade: 'Viamão',
      estado: 'RS',
      cep: '94475-1967',
      telefone: '(51) 3493-1967',
      email: 'secretaria.easc@educadventista.org.br',
      diretor: 'Eliseu',
      observacoes: 'Escola de ensino fundamental e médio'
    },
    {
      nome: 'Escola Adventista de Santo Antônio da Patrulha',
      sigla: 'EASAP',
      endereco: 'Sezefredo Costa Torres, 64 - Centro',
      cidade: 'Santo Antônio da Patrulha',
      estado: 'RS',
      cep: '95500-000',
      telefone: '(51) 3662-1660',
      email: 'secretaria.easap@educadventista.org.br',
      diretor: 'Ieda Marila Mota',
      observacoes: 'Escola de ensino fundamental'
    },
    {
      nome: 'Escola Adventista Pastor Ivo Souza',
      sigla: 'EAPIS',
      endereco: 'Estrada da Fazenda Passos- Fazenda Passos',
      cidade: 'Rolante',
      estado: 'RS',
      cep: '95960-000',
      telefone: '(51) 3245-7085',
      email: 'secretaria.eapis@educadventista.org.br',
      diretor: 'Telma Regina',
      observacoes: 'Escola de ensino fundamental'
    },
    {
      nome: 'Associação Sul do Rio Grande do Sul',
      sigla: 'ASRS',
      endereco: 'Rua Cai, 82',
      cidade: 'Porto Alegre',
      estado: 'RS',
      cep: '90810-120',
      telefone: '(51) 3245-7000',
      email: 'contato@asrs.org.br',
      diretor: 'Associação Sul do Rio Grande do Sul',
      observacoes: 'Sede Administrativa da Igreja Adventista no RS'
    }
  ];

  // Inserir escolas no banco de dados
  for (const escola of escolas) {
    const result = await prisma.escola.create({
      data: escola
    });
    console.log(`Escola criada: ${result.nome} (ID: ${result.id})`);
  }

  console.log('Carga de escolas concluída com sucesso!');
}

main()
  .catch((e) => {
    console.error('Erro durante a carga de dados:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });