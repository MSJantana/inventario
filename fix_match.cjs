const fs = require('node:fs');
const p = 'c:/Sistemas/Inventario/backend/src/services/WinAuditImportService.js';
let s = fs.readFileSync(p, 'utf8');
let ok = 0;

// L156:   const m = texto.match(re);      -> const m = re.exec(texto);
const pat1 = /const m = texto\.match\(re\);/g;
if (pat1.test(s)) { s = s.replaceAll(pat1, 'const m = re.exec(texto);'); ok += 1; console.log('fix L156'); }
else console.log('L156 not found');

// L175: const mdY = texto.match(/^([a-z...])$/i); -> const mdY = /^...$/i.exec(texto);
// Need to handle exact match: capture the regex literal part
const pat2 = /const mdY = texto\.match\((\/\^.*?\$\/i)\);/s;
const m2 = pat2.exec(s);
if (m2) { const re = m2[1]; s = s.replace(pat2, 'const mdY = ' + re + '.exec(texto);'); ok += 1; console.log('fix L175'); }
else console.log('L175 not found, tail nearby:');

// L210: const match = texto.match(re);  -> const match = re.exec(texto);
const pat3 = /const match = texto\.match\(re\);/g;
if (pat3.test(s)) { s = s.replaceAll(pat3, 'const match = re.exec(texto);'); ok += 1; console.log('fix L210'); }
else console.log('L210 not found');

console.log('total fixes:', ok);
if (ok) fs.writeFileSync(p, s, 'utf8');
