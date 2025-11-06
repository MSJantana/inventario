import { prisma } from '../index.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { enviarEmailRecuperacaoSenha } from '../utils/emailService.js';

// Listar todos os usuários
export const listarUsuarios = async (req, res, next) => {
  try {
    if (req.usuario?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Acesso restrito ao ADMIN' });
    }
    const usuarios = await prisma.usuario.findMany({
      include: {
        escola: {
          select: {
            id: true,
            nome: true
          }
        }
      }
    });
    res.json(usuarios);
  } catch (error) {
    next(error);
  }
};

// Recuperação de senha por email
export const recuperarSenha = async (req, res, next) => {
  try {
    const { email } = req.body;

    // Verificar se o usuário existe
    const usuario = await prisma.usuario.findUnique({
      where: { email },
    });

    if (!usuario) {
      return res.status(404).json({ error: 'Email não cadastrado no sistema' });
    }

    // Gerar token de recuperação (válido por 1 hora)
    const resetToken = crypto.randomBytes(20).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hora

    // Salvar o token no banco de dados
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    // Obter a URL base da requisição
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    
    // Enviar email com o link de recuperação
    const emailEnviado = await enviarEmailRecuperacaoSenha(
      email, 
      resetToken, 
      baseUrl
    );

    if (!emailEnviado) {
      return res.status(500).json({ error: 'Erro ao enviar email de recuperação' });
    }
    
    res.json({ 
      message: 'Instruções de recuperação de senha foram enviadas para seu email',
      // Em ambiente de desenvolvimento, retornamos o token para testes
      ...(process.env.NODE_ENV !== 'production' && { token: resetToken })
    });
  } catch (error) {
    next(error);
  }
};

// Redefinir senha com token
export const redefinirSenha = async (req, res, next) => {
  try {
    const { token, novaSenha } = req.body;

    // Buscar usuário com o token válido
    const usuario = await prisma.usuario.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date(),
        },
      },
    });

    if (!usuario) {
      return res.status(400).json({ error: 'Token inválido ou expirado' });
    }

    // Hash da nova senha
    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash(novaSenha, salt);

    // Atualizar a senha e limpar o token
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        senha: senhaHash,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    res.json({ message: 'Senha redefinida com sucesso' });
  } catch (error) {
    next(error);
  }
};

// Obter um usuário específico
export const obterUsuario = async (req, res, next) => {
  try {
    if (req.usuario?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Acesso restrito ao ADMIN' });
    }
    const { id } = req.params;
    const usuario = await prisma.usuario.findUnique({
      where: { id },
      include: {
        movimentacoes: true,
      },
    });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json(usuario);
  } catch (error) {
    next(error);
  }
};

// Criar um novo usuário
export const criarUsuario = async (req, res, next) => {
  try {
    if (req.usuario?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Acesso restrito ao ADMIN' });
    }
    const { nome, email, senha, role, cargo, escolaId } = req.body;

    // Verificar se o usuário já existe
    const usuarioExistente = await prisma.usuario.findUnique({
      where: { email },
    });

    if (usuarioExistente) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    // Hash da senha
    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash(senha, salt);

    // Criar o usuário
    const usuario = await prisma.usuario.create({
      data: {
        nome,
        email,
        senha: senhaHash,
        role: role || 'USUARIO', // Usa o role fornecido ou o padrão USUARIO
        cargo,
        escolaId,
      },
    });

    res.status(201).json(usuario);
  } catch (error) {
    next(error);
  }
};

// Atualizar um usuário
export const atualizarUsuario = async (req, res, next) => {
  try {
    if (req.usuario?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Acesso restrito ao ADMIN' });
    }
    const { id } = req.params;
    const { nome, email, senha, role, cargo, escolaId } = req.body;

    // Verificar se o usuário existe
    const usuarioExistente = await prisma.usuario.findUnique({
      where: { id },
    });

    if (!usuarioExistente) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Preparar dados para atualização
    const dadosAtualizacao = {
      nome,
      email,
      role,
      cargo,
      escolaId,
    };

    // Se a senha foi fornecida, fazer o hash
    if (senha) {
      const salt = await bcrypt.genSalt(10);
      dadosAtualizacao.senha = await bcrypt.hash(senha, salt);
    }

    // Atualizar o usuário
    const usuario = await prisma.usuario.update({
      where: { id },
      data: dadosAtualizacao,
    });

    res.json(usuario);
  } catch (error) {
    next(error);
  }
};

// Excluir um usuário
export const excluirUsuario = async (req, res, next) => {
  try {
    if (req.usuario?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Acesso restrito ao ADMIN' });
    }
    const { id } = req.params;

    // Verificar se o usuário existe
    const usuario = await prisma.usuario.findUnique({
      where: { id },
      include: {
        movimentacoes: true,
      },
    });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Verificar se o usuário tem movimentações associadas
    if (usuario.movimentacoes.length > 0) {
      return res.status(400).json({
        error: 'Não é possível excluir o usuário pois existem movimentações associadas',
      });
    }

    // Excluir o usuário
    await prisma.usuario.delete({
      where: { id },
    });

    res.json({ message: 'Usuário excluído com sucesso' });
  } catch (error) {
    next(error);
  }
};

// Login de usuário
export const login = async (req, res, next) => {
  try {
    const { email, senha } = req.body;

    // Verificar se o usuário existe
    const usuario = await prisma.usuario.findUnique({
      where: { email },
    });

    if (!usuario) {
      return res.status(400).json({ error: 'Credenciais inválidas' });
    }

    // Verificar senha
    const senhaCorreta = await bcrypt.compare(senha, usuario.senha);
    if (!senhaCorreta) {
      return res.status(400).json({ error: 'Credenciais inválidas' });
    }

    // Gerar token JWT
    const payload = { id: usuario.id, email: usuario.email, role: usuario.role };
    const secret = process.env.JWT_SECRET;
    
    // Aceita string tipo "1h", "15m", "7d" ou número (segundos)
    const expiresIn = process.env.JWT_EXPIRES_IN || '1h';
    
    const token = jwt.sign(payload, secret, { expiresIn });

    res.json({
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        role: usuario.role,
      },
    });
  } catch (error) {
    next(error);
  }
};