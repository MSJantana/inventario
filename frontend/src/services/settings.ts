export const DEFAULT_VALIDITY_YEARS = 5;

export function getValidityYears(): number {
  const val = localStorage.getItem('equipmentValidityYears');
  if (!val) return DEFAULT_VALIDITY_YEARS;
  const parsed = Number.parseInt(val, 10);
  return Number.isNaN(parsed) ? DEFAULT_VALIDITY_YEARS : parsed;
}

export function setValidityYears(years: number) {
  localStorage.setItem('equipmentValidityYears', years.toString());
}
