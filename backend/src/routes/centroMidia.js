import express from 'express';
import * as centroMidiaController from '../controllers/centroMidiaController.js';
import auth from '../middlewares/auth.js';
import { permitRoles } from '../middlewares/authorize.js';
import { csrfProtect } from '../middlewares/csrf.js';
import { validarCentroMidia } from '../middlewares/validacao.js';

const router = express.Router();

router.get('/', auth, permitRoles('ADMIN'), centroMidiaController.listarCentroMidia);
router.get('/:id', auth, permitRoles('ADMIN'), centroMidiaController.obterCentroMidia);
router.get('/export/csv', auth, permitRoles('ADMIN','GESTOR','TECNICO'), centroMidiaController.exportarCentroMidiaCsv);
router.post('/', auth, csrfProtect, permitRoles('ADMIN'), validarCentroMidia, centroMidiaController.criarCentroMidia);
router.put('/:id', auth, csrfProtect, permitRoles('ADMIN'), validarCentroMidia, centroMidiaController.atualizarCentroMidia);
router.delete('/:id', auth, csrfProtect, permitRoles('ADMIN'), centroMidiaController.excluirCentroMidia);

export default router;
