import express from 'express';
import * as equipamentosController from '../controllers/equipamentosController.js';
import * as winauditImportController from '../controllers/winauditImportController.js';
import * as chromeosImportController from '../controllers/chromeosImportController.js';
import { validarEquipamento } from '../middlewares/validacao.js';
import auth from '../middlewares/auth.js';
import { permitRoles } from '../middlewares/authorize.js';
import { csrfProtect } from '../middlewares/csrf.js';

const router = express.Router();

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
  csrfProtect,
  permitRoles('ADMIN', 'GESTOR', 'TECNICO'),
  chromeosImportController.importarChromeosPreview,
);
router.post(
  '/importar/chromeos/confirmar',
  auth,
  csrfProtect,
  permitRoles('ADMIN', 'GESTOR', 'TECNICO'),
  chromeosImportController.importarChromeosConfirmar,
);

router.get('/:id', auth, equipamentosController.obterEquipamento);
router.post('/', auth, csrfProtect, permitRoles('ADMIN','GESTOR','TECNICO'), validarEquipamento, equipamentosController.criarEquipamento);
router.put('/:id', auth, csrfProtect, permitRoles('ADMIN','GESTOR','TECNICO'), validarEquipamento, equipamentosController.atualizarEquipamento);
router.delete('/:id', auth, csrfProtect, permitRoles('ADMIN','GESTOR'), equipamentosController.excluirEquipamento);

export default router;