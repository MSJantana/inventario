import express from 'express';
import * as usuariosController from '../controllers/usuariosController.js';
import { validarUsuario } from '../middlewares/validacao.js';
import auth from '../middlewares/auth.js';
import { permitRoles } from '../middlewares/authorize.js';
import { csrfProtect } from '../middlewares/csrf.js';

const router = express.Router();

// Rotas públicas
router.post('/login', usuariosController.login);
router.post('/recuperar-senha', usuariosController.recuperarSenha);
router.post('/redefinir-senha', usuariosController.redefinirSenha);
// Criar usuário passa a ser responsabilidade do ADMIN
router.post('/', auth, csrfProtect, permitRoles('ADMIN'), validarUsuario, usuariosController.criarUsuario);

// Rotas protegidas
router.get('/', auth, permitRoles('ADMIN'), usuariosController.listarUsuarios);
router.get('/:id', auth, permitRoles('ADMIN'), usuariosController.obterUsuario);
router.put('/:id', auth, csrfProtect, permitRoles('ADMIN'), validarUsuario, usuariosController.atualizarUsuario);
router.delete('/:id', auth, csrfProtect, permitRoles('ADMIN'), usuariosController.excluirUsuario);

export default router;