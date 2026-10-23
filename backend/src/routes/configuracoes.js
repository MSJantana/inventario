import express from 'express';
import auth from '../middlewares/auth.js';
import { permitRoles } from '../middlewares/authorize.js';
import { prisma } from '../index.js';

const router = express.Router();
const CHROMEBOOK_IMPORT_ENABLED = 'CHROMEBOOK_IMPORT_ENABLED';
const DEFAULT_CHROMEBOOK_IMPORT_ENABLED = true;

const lerImportacaoChromebook = async () => {
  const configuracao = await prisma.configuracaoGeral.findUnique({
    where: { chave: CHROMEBOOK_IMPORT_ENABLED },
  });
  if (!configuracao) return DEFAULT_CHROMEBOOK_IMPORT_ENABLED;
  return configuracao.valor === true || configuracao.valor === 'true';
};

router.get('/chromebook-import', auth, async (_req, res) => {
  try {
    res.json({ enabled: await lerImportacaoChromebook() });
  } catch (error) {
    res.status(500).json({ error: 'Não foi possível carregar as configurações.' });
  }
});

router.put('/chromebook-import', auth, permitRoles('ADMIN'), async (req, res) => {
  if (typeof req.body?.enabled !== 'boolean') {
    return res.status(400).json({ error: 'O campo enabled deve ser booleano.' });
  }
  try {
    const configuracao = await prisma.configuracaoGeral.upsert({
      where: { chave: CHROMEBOOK_IMPORT_ENABLED },
      create: {
        chave: CHROMEBOOK_IMPORT_ENABLED,
        valor: req.body.enabled,
        descricao: 'Ativa/desativa globalmente a importação Chromebook CSV.',
      },
      update: { valor: req.body.enabled },
    });
    res.json({ enabled: configuracao.valor === true || configuracao.valor === 'true' });
  } catch (error) {
    res.status(500).json({ error: 'Não foi possível salvar as configurações.' });
  }
});

export { lerImportacaoChromebook };
export default router;
