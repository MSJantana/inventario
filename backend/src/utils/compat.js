const nativeReplaceAll = typeof String.prototype.replaceAll === 'function';
const nativeArrayAt = typeof Array.prototype.at === 'function';

export const replaceAll = (str, search, replacement) => {
  if (search === null || search === undefined) return str == null ? '' : String(str);
  const input = str == null ? '' : String(str);
  if (nativeReplaceAll) {
    return input.replaceAll(search, replacement);
  }
  if (search instanceof RegExp) {
    if (!search.global) {
      throw new TypeError('replaceAll must be called with a global RegExp');
    }
    return input.replace(search, replacement);
  }
  const searchStr = String(search);
  if (searchStr.length === 0) {
    const repl = typeof replacement === 'function' ? String(replacement(0, input)) : String(replacement);
    return repl + input.split('').join(repl) + repl;
  }
  return input.split(searchStr).join(typeof replacement === 'function' ? replacement : String(replacement));
};

export const arrayAt = (arr, index) => {
  if (!Array.isArray(arr) && typeof arr !== 'string') return undefined;
  const idx = Number.isFinite(index) ? Math.trunc(Number(index)) : 0;
  if (nativeArrayAt) {
    return arr.at(idx);
  }
  const len = arr.length;
  const k = idx < 0 ? len + idx : idx;
  if (k < 0 || k >= len) return undefined;
  return arr[k];
};

export const removeChildSafe = (node) => {
  if (!node) return;
  if (typeof node.remove === 'function') {
    try {
      node.remove();
    } catch {
      /* ignore DOM errors (already removed, etc) */
    }
    return;
  }
  const parent = node.parentNode;
  if (parent && typeof parent.removeChild === 'function') {
    try {
      node.remove();
    } catch {
      /* ignore DOM errors (already removed, etc) */
    }
  }
};

export const escapeCsvQuotes = (value) => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (!str.includes('"')) return str;
  return replaceAll(str, '"', '""');
};

export const normalizeNbsp = (input) => {
  if (input === null || input === undefined) return '';
  const str = typeof input === 'string' ? input : String(input);
  if (!str.includes('\u00a0')) return str;
  return replaceAll(str, '\u00a0', ' ');
};
