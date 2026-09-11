import { parseChromeOsCsv } from './backend/src/utils/chromeos/parseCsv.js';
import fs from 'node:fs';
const c = process.argv[2] && fs.existsSync(process.argv[2])
  ? fs.readFileSync(process.argv[2])
  : Buffer.from(
      'deviceId,serial number,model,last sync,first sync,os version,org unit path,provision status,asset id,annotated user,annotated location,annotated notes,ethernet mac address,wifi mac address,auto update expiration,boot mode,last known network,platform version,firmware version,last enrollment reason,last policy request,active time ranges,recent users,wifi signal strength,storage total (bytes),storage free (bytes),ram total (bytes),ram free (bytes),cpu temp (celsius),public ip address,ip address,last policy sync time,boot mode.1,activity report device state,boot mode.2,notes\r\n'
      + '92fdbc73-2176-4407-8000-b41df15c6c06,075L9QBH602073,Samsung Chromebook 3,2026-08-28 09:08 AM,2025-12-16 11:11 AM,103.0.5060.132,/ACP/CAAR,PROVISIONED,,rodrigo.mota@educadventista.org.br,,,,78929cd57785,,2022-06,,14816.131.5 (Official Build) stable-channel celes,Google_Celes.7287.92.212,,REASON_UNKNOWN,"date:2026-08-28 durationSeconds:60",caar.aluno@educadventista.org.br,-64 dBm,0,94,977203200 / 2031517696,894763008 / 11014791168," ",172.16.121.44,189.45.147.66,2026-08-28 09:09 AM,VERIFIED,420,,,\r\n',
      'utf8'
    );
const r = parseChromeOsCsv(c, 'sample.csv');
console.log('TOTAL_COLS cabecalho:', r.valido ? r.linhas[0] && Object.keys(r.linhas[0]).length : 'INVALIDO');
console.log('CABECALHO (', r.cabecalho.length, 'colunas):');
for (const k of r.cabecalho) console.log('   -', JSON.stringify(k));
console.log('\nPRIMEIRA LINHA RAW (apenas valores não-vazios):');
for (const [k, v] of Object.entries(r.linhas[0] || {})) if (v !== null && v !== undefined && String(v).trim() !== '') console.log(`   ${JSON.stringify(k)} = ${JSON.stringify(v)}`);
console.log('\nparse: valido=', r.valido, ' totalLinhas=', r.linhas.length);
