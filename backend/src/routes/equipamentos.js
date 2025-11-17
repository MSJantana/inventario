import express from 'express';
import * as equipamentosController from '../controllers/equipamentosController.js';
import { validarEquipamento } from '../middlewares/validacao.js';
import auth from '../middlewares/auth.js';
import { permitRoles } from '../middlewares/authorize.js';
import { csrfProtect } from '../middlewares/csrf.js';

const router = express.Router();

// Rotas protegidas
router.get('/', auth, equipamentosController.listarEquipamentos);
router.get('/:id', auth, equipamentosController.obterEquipamento);
router.get('/export/csv', auth, equipamentosController.exportarEquipamentosCsv);
router.post('/', auth, csrfProtect, permitRoles('ADMIN','GESTOR','TECNICO'), validarEquipamento, equipamentosController.criarEquipamento);
router.put('/:id', auth, csrfProtect, permitRoles('ADMIN','GESTOR','TECNICO'), validarEquipamento, equipamentosController.atualizarEquipamento);
router.delete('/:id', auth, csrfProtect, permitRoles('ADMIN','GESTOR'), equipamentosController.excluirEquipamento);

export default router;