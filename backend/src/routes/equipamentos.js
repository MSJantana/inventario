import express from 'express';
import * as equipamentosController from '../controllers/equipamentosController.js';
import * as winauditImportController from '../controllers/winauditImportController.js';
import * as chromeosImportController from '../controllers/chromeosImportController.js';
import { validarEquipamento } from '../middlewares/validacao.js';
import auth from '../middlewares/auth.js';
import { permitRoles } from '../middlewares/authorize.js';
import { csrfProtect } from '../middlewares/csrf.js';
import { lerImportacaoChromebook } from './configuracoes.js';

const router = express.Router();
const exigirImportacaoChromebookHabilitada = async (_req, res, next) => {
  try {
    if (!(await lerImportacaoChromebook())) {
      return res.status(403).json({ error: 'A importação Chromebook CSV está desativada nas configurações do sistema.' });
    }
    next();
  } catch {
    res.status(500).json({ error: 'Não foi possível validar a configuração da importação Chromebook.' });
  }
};

// Rotas protegidas
router.get('/', auth, equipamentosController.listarEquipamentos);
router.get('/export/csv', auth, equipamentosController.exportarEquipamentosCsv);

// Importação WinAudit (antes do /:id para nao colidir)
router.post(
  '/importar/winaudit/preview',
  auth,
  csrfProtect,
  permitRoles('ADMIN', 'GESTOR', 'TECNICO'),
  winauditImportController.importarWinAuditPreview,
);
router.post(
  '/importar/winaudit/confirmar',
  auth,
  csrfProtect,
  permitRoles('ADMIN', 'GESTOR', 'TECNICO'),
  winauditImportController.importarWinAuditConfirmar,
);
router.post(
  '/importar/winaudit/atualizar',
  auth,
  csrfProtect,
  permitRoles('ADMIN', 'GESTOR', 'TECNICO'),
  winauditImportController.atualizarEquipamentoWinAudit,
);
router.get(
  '/importar/winaudit/logs',
  auth,
  winauditImportController.listarLogsImportacoes,
);
router.get(
  '/importar/winaudit/logs/:id',
  auth,
  winauditImportController.obterLogImportacaoPorId,
);

// Importação Chromebook CSV Google Admin
router.post(
  '/importar/chromeos/preview',
  auth,
  exigirImportacaoChromebookHabilitada,
  csrfProtect,
  permitRoles('ADMIN', 'GESTOR', 'TECNICO'),
  chromeosImportController.importarChromeosPreview,
);
router.post(
  '/importar/chromeos/confirmar',
  auth,
  exigirImportacaoChromebookHabilitada,
  csrfProtect,
  permitRoles('ADMIN', 'GESTOR', 'TECNICO'),
  chromeosImportController.importarChromeosConfirmar,
);

router.get('/:id', auth, equipamentosController.obterEquipamento);
router.post('/', auth, csrfProtect, permitRoles('ADMIN','GESTOR','TECNICO'), validarEquipamento, equipamentosController.criarEquipamento);
router.put('/:id', auth, csrfProtect, permitRoles('ADMIN','GESTOR','TECNICO'), validarEquipamento, equipamentosController.atualizarEquipamento);
router.delete('/:id', auth, csrfProtect, permitRoles('ADMIN','GESTOR'), equipamentosController.excluirEquipamento);

export default router;
