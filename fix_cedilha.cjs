const fs = require('node:fs');
const p = 'c:/Sistemas/Inventario/backend/src/services/WinAuditImportService.js';
const lines = fs.readFileSync(p, 'utf8').split('\n');
const L130 = lines[129];
console.log('L130 full length:', L130.length);
console.log('L130 slice 140-end codes:');
for (let i = 140; i < L130.length; i += 1) {
  const ch = L130[i];
  const code = ch.codePointAt(0);
  const visible = (code >= 32 && code <= 126) ? ch : '?';
  console.log(`  i=${i} char="${visible}" code=U+${code.toString(16).toUpperCase().padStart(4,'0')}`);
}
console.log('\nL130 last 60 chars raw:', JSON.stringify(L130.slice(-60)));
