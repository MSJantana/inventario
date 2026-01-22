import { getValidityYears } from '../services/settings';

export const isExpired = (isoStr: string | undefined): boolean => {
  if (!isoStr) return false;
  const dt = new Date(isoStr);
  if (Number.isNaN(dt.getTime())) return false;
  
  const validityYears = getValidityYears();
  const limitDate = new Date(dt);
  limitDate.setFullYear(limitDate.getFullYear() + validityYears);
  
  return new Date() > limitDate;
};

export const formatDate = (isoStr: string | undefined): string => {
  if (!isoStr) return '-';
  const date = new Date(isoStr);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('pt-BR');
};
