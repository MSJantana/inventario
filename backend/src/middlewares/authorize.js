// Middleware de autorização por perfis
export const permitRoles = (...roles) => {
  return (req, res, next) => {
    const usuario = req.usuario;
    if (!usuario || !usuario.role) {
      return res.status(401).json({ error: 'Autenticação necessária' });
    }

    if (!roles.includes(usuario.role)) {
      return res.status(403).json({ error: 'Acesso negado para o seu perfil' });
    }

    next();
  };
};

// Helper para verificar perfil
export const isAdmin = (req) => req.usuario?.role === 'ADMIN';
export const isGestor = (req) => req.usuario?.role === 'GESTOR';
export const isTecnico = (req) => req.usuario?.role === 'TECNICO';