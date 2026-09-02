import { Router } from 'express';
import {
  listarMovimentacoes,
  obterMovimentacao,
  criarMovimentacao,
  atualizarMovimentacao,
  excluirMovimentacao,
  postManutencaoEnvio,
  postManutencaoRetorno,
  postEmprestimo,
  postDevolucao,
  postDoacao,
  postTransferencia,
  postEstornar,
  getRelatorio,
} from '../controllers/movimentacoesController.js';
import auth from '../middlewares/auth.js';
import { csrfProtect } from '../middlewares/csrf.js';
import { permitRoles } from '../middlewares/authorize.js';
import { validarMovimentacao } from '../middlewares/validacao.js';

const router = Router();

// ========== GET /movimentacoes/relatorio (fixas PRIMEIRO — antes de /:id!) ==========
// Ordem é crítica no Express: rotas /:id capturariam strings como "relatorio" se viessem antes.
router.get('/relatorio/completo', auth, getRelatorio);
router.get('/relatorio', auth, getRelatorio);

// ========== Endpoints ESPECIALIZADOS (fixas: /manutencao/*, /emprestimo, etc) ==========
// Todos exigem auth + CSRF; GESTOR/TECNICO permitido para ações de sua escola;
// Escopo de escola já validado no service (usuarioPodeAtuarNoEquipamento).
router.post('/manutencao/envio', auth, csrfProtect, permitRoles('ADMIN', 'GESTOR', 'TECNICO'), postManutencaoEnvio);
router.post('/manutencao/retorno', auth, csrfProtect, permitRoles('ADMIN', 'GESTOR', 'TECNICO'), postManutencaoRetorno);
router.post('/emprestimo', auth, csrfProtect, permitRoles('ADMIN', 'GESTOR'), postEmprestimo);
router.post('/devolucao', auth, csrfProtect, permitRoles('ADMIN', 'GESTOR', 'TECNICO'), postDevolucao);
router.post('/doacao', auth, csrfProtect, permitRoles('ADMIN'), postDoacao); // Doação requer ADMIN
router.post('/transferencia', auth, csrfProtect, permitRoles('ADMIN', 'GESTOR'), postTransferencia);

// ========== Rotas COMPATIBILIDADE (antigas, preservadas 100%) ==========
router.get('/', auth, listarMovimentacoes);
router.post('/', auth, csrfProtect, validarMovimentacao, criarMovimentacao);

// ========== Rotas com PARÂMETRO DINÂMICO /:id — POR ÚLTIMO! ==========
// (Se declaradas antes, capturam strings como "relatorio", "manutencao", "emprestimo", etc.)
router.post('/:id/estornar', auth, csrfProtect, permitRoles('ADMIN', 'GESTOR'), postEstornar);
router.get('/:id', auth, obterMovimentacao);
router.put('/:id', auth, csrfProtect, validarMovimentacao, atualizarMovimentacao);
// OBS: DELETE /:id agora = ESTORNO AUDITÁVEL (mantém método HTTP e rota)
router.delete('/:id', auth, csrfProtect, permitRoles('ADMIN', 'GESTOR'), excluirMovimentacao);

export default router;
