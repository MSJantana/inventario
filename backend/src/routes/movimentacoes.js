import express from 'express';
import * as movimentacoesController from '../controllers/movimentacoesController.js';
import { validarMovimentacao } from '../middlewares/validacao.js';
import auth from '../middlewares/auth.js';
import { csrfProtect } from '../middlewares/csrf.js';

const router = express.Router();

// Rotas protegidas – leitura aberta a qualquer usuário autenticado
router.get('/', auth, movimentacoesController.listarMovimentacoes);
router.get('/:id', auth, movimentacoesController.obterMovimentacao);

// Escrita liberada para qualquer usuário autenticado
router.post('/', auth, csrfProtect, validarMovimentacao, movimentacoesController.criarMovimentacao);
router.put('/:id', auth, csrfProtect, validarMovimentacao, movimentacoesController.atualizarMovimentacao);
router.delete('/:id', auth, csrfProtect, movimentacoesController.excluirMovimentacao);

export default router;