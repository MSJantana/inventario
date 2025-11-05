import express from 'express';
import * as escolasController from '../controllers/escolasController.js';
import { validarEscola } from '../middlewares/validacao.js';
import auth from '../middlewares/auth.js';
import { permitRoles } from '../middlewares/authorize.js';
import { csrfProtect } from '../middlewares/csrf.js';

const router = express.Router();

// Rotas protegidas
router.get('/', auth, escolasController.listarEscolas);
router.get('/:id', auth, escolasController.obterEscola);
router.post('/', auth, csrfProtect, permitRoles('ADMIN'), validarEscola, escolasController.criarEscola);
router.put('/:id', auth, csrfProtect, permitRoles('ADMIN'), validarEscola, escolasController.atualizarEscola);
router.delete('/:id', auth, csrfProtect, permitRoles('ADMIN'), escolasController.excluirEscola);

export default router;