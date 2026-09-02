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

export const hasSchoolAccess = (usuario, escolaIdOrObj) => {
  if (usuario?.role === 'ADMIN') {
    return true;
  }
  const idsPermitidos = getAccessibleSchoolIds(usuario);
  if (idsPermitidos.length === 0) {
    return false;
  }
  let escolaIdDireto = null;
  if (typeof escolaIdOrObj === 'string' || typeof escolaIdOrObj === 'number') {
    escolaIdDireto = String(escolaIdOrObj);
  } else if (
    escolaIdOrObj
    && typeof escolaIdOrObj === 'object'
    && 'escolaId' in escolaIdOrObj
    && escolaIdOrObj.escolaId != null
  ) {
    escolaIdDireto = String(escolaIdOrObj.escolaId);
  }
  let equipamentoEscolaId = null;
  if (
    escolaIdOrObj
    && typeof escolaIdOrObj === 'object'
    && 'equipamentoEscolaId' in escolaIdOrObj
    && escolaIdOrObj.equipamentoEscolaId != null
  ) {
    equipamentoEscolaId = String(escolaIdOrObj.equipamentoEscolaId);
  }
  if (escolaIdDireto && idsPermitidos.includes(escolaIdDireto)) {
    return true;
  }
  if (equipamentoEscolaId && idsPermitidos.includes(equipamentoEscolaId)) {
    return true;
  }
  if (!escolaIdDireto && !equipamentoEscolaId) {
    return false;
  }
  return false;
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
