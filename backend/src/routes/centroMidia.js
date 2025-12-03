import express from 'express';
import * as centroMidiaController from '../controllers/centroMidiaController.js';
import auth from '../middlewares/auth.js';
import { permitRoles } from '../middlewares/authorize.js';
import { csrfProtect } from '../middlewares/csrf.js';
import { validarCentroMidia } from '../middlewares/validacao.js';

const router = express.Router();

router.get('/', auth, centroMidiaController.listarCentroMidia);
router.get('/:id', auth, centroMidiaController.obterCentroMidia);
router.get('/export/csv', auth, centroMidiaController.exportarCentroMidiaCsv);
router.post('/', auth, csrfProtect, validarCentroMidia, centroMidiaController.criarCentroMidia);
router.put('/:id', auth, csrfProtect, validarCentroMidia, centroMidiaController.atualizarCentroMidia);
router.delete('/:id', auth, csrfProtect, centroMidiaController.excluirCentroMidia);

export default router;
