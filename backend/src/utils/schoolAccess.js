export const getAccessibleSchoolIds = (usuario) => {
  const extraIds = Array.isArray(usuario?.escolasAcesso)
    ? usuario.escolasAcesso.map((item) => item.escolaId)
    : [];

  return Array.from(new Set([usuario?.escolaId, ...extraIds].filter(Boolean)));
};

export const getSchoolScopeWhere = (usuario, fieldName = 'escolaId') => {
  if (usuario?.role === 'ADMIN') {
    return {};
  }

  return {
    [fieldName]: {
      in: getAccessibleSchoolIds(usuario),
    },
  };
};

export const hasSchoolAccess = (usuario, escolaId) => {
  if (usuario?.role === 'ADMIN') {
    return true;
  }

  if (!escolaId) {
    return false;
  }

  return getAccessibleSchoolIds(usuario).includes(escolaId);
};

export const resolveManagedSchoolId = (usuario, requestedSchoolId) => {
  if (usuario?.role === 'ADMIN') {
    return requestedSchoolId ?? null;
  }

  if (requestedSchoolId) {
    return hasSchoolAccess(usuario, requestedSchoolId) ? requestedSchoolId : null;
  }

  return usuario?.escolaId || getAccessibleSchoolIds(usuario)[0] || null;
};

export const normalizeAdditionalSchoolIds = (primarySchoolId, escolaIds) => {
  if (!Array.isArray(escolaIds)) {
    return [];
  }

  return Array.from(
    new Set(
      escolaIds.filter((id) => typeof id === 'string' && id && id !== primarySchoolId)
    )
  );
};
