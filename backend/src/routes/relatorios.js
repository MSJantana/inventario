import express from 'express';
import auth from '../middlewares/auth.js';
import { equipamentosPdf } from '../controllers/relatoriosController.js';

const router = express.Router();

// Relatório de equipamentos (PDF)
router.get('/equipamentos', auth, equipamentosPdf);

export default router;