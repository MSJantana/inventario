export const DEFAULT_VALIDITY_YEARS = 5;
export const DEFAULT_BLOQUEAR_EDITAR_EXCLUIR_DOADO = true;

export function getValidityYears(): number {
  const val = localStorage.getItem('equipmentValidityYears');
  if (!val) return DEFAULT_VALIDITY_YEARS;
  const parsed = Number.parseInt(val, 10);
  return Number.isNaN(parsed) ? DEFAULT_VALIDITY_YEARS : parsed;
}

export function setValidityYears(years: number) {
  localStorage.setItem('equipmentValidityYears', years.toString());
}

export function getBloquearEditarExcluirDoado(): boolean {
  const val = localStorage.getItem('bloquearEditarExcluirDoado');
  if (val === null) return DEFAULT_BLOQUEAR_EDITAR_EXCLUIR_DOADO;
  return val === 'true';
}

export function setBloquearEditarExcluirDoado(enabled: boolean) {
  localStorage.setItem('bloquearEditarExcluirDoado', String(enabled));
}
