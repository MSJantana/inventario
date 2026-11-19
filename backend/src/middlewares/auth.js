import jwt from 'jsonwebtoken';
import { prisma } from '../index.js';
import { getAccessibleSchoolIds } from '../utils/schoolAccess.js';

const auth = async (req, res, next) => {
  try {
    // Verificar se o token está presente no header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticação não fornecido' });
    }

    // Extrair o token
    const token = authHeader.split(' ')[1];

    // Verificar e decodificar o token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verificar se o token foi revogado (logout)
    // Se a tabela RevokedToken ainda não existir (migração não aplicada),
    // não bloqueamos o acesso: apenas registramos o erro e seguimos.
    if (decoded?.jti) {
      try {
        const revoked = await prisma.revokedToken.findUnique({
          where: { jti: decoded.jti },
        });
        if (revoked) {
          return res.status(401).json({ error: 'Token revogado. Faça login novamente.' });
        }
      } catch (dbError) {
        // Tabela pode não existir ainda ou banco indisponível: não bloquear token por isso
        console.error('[auth] Erro ao consultar RevokedToken:', dbError?.message || dbError);
      }
    }

    // Verificar se o usuário existe
    const usuario = await prisma.usuario.findUnique({
      where: { id: decoded.id },
      include: {
        escola: true,
        escolasAcesso: {
          include: {
            escola: true,
          },
        },
      },
    });

    if (!usuario) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    // Adicionar o usuário ao objeto de requisição
    req.usuario = {
      ...usuario,
      escolasPermitidas: getAccessibleSchoolIds(usuario),
    };
    req.token = token;

    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido ou expirado' });
  }
};

export default auth;
