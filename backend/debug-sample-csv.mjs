import { parseChromeOsCsv } from './src/utils/chromeos/parseCsv.js';
import { normalizarLinhaChromeOS, montarEquipamentoNormalizado } from './src/utils/chromeos/normalizers.js';

const CSV =
`deviceId,serial number,model,last sync,first sync,os version,org unit path,provision status,asset id,annotated user,annotated location,annotated notes,ethernet mac address,wifi mac address,auto update expiration,boot mode,last known network,platform version,firmware version,last enrollment reason,last policy request,active time ranges,recent users,wifi signal strength,storage total (bytes),storage free (bytes),ram total (bytes),ram free (bytes),cpu temp (celsius),public ip address,ip address,last policy sync time,boot mode 2,activity report device state,boot mode 3,notes
92fdbc73-2176-4407-8000-b41df15c6c06,075L9QBH602073,Samsung Chromebook 3,2026-08-28 09:08 AM,2025-12-16 11:11 AM,103.0.5060.132,/ACP/CAAR,PROVISIONED,,rodrigo.mota@educadventista.org.br,,,,78929cd57785,,2022-06,,14816.131.5 (Official Build) stable-channel celes,Google_Celes.7287.92.212,,REASON_UNKNOWN,"date:2026-08-28 durationSeconds:60",caar.aluno@educadventista.org.br,-64 dBm,0,94,977203200 / 2031517696,894763008 / 11014791168," ",172.16.121.44,189.45.147.66,2026-08-28 09:09 AM,VERIFIED,420,,,`;

const r = parseChromeOsCsv(Buffer.from(CSV, 'utf8'), 'sample.csv');
console.log('COLUNAS:', r.colunas.length);
r.colunas.forEach((k, i) => console.log(String(i + 1).padStart(2), JSON.stringify(k)));
console.log('\nLINHA 0 (raw não-vazios):');
const L0 = r.linhas[0] || {};
Object.entries(L0).forEach(([k, v]) => {
  if (v != null && String(v).trim() !== '') console.log('   ', JSON.stringify(k), '=', JSON.stringify(String(v).slice(0, 120)));
});
const norm = normalizarLinhaChromeOS(L0, 0);
console.log('\nNORMALIZADA:');
console.log('  deviceId=', norm.deviceId, ' serial=', norm.serialNumber, ' model=', norm.model, ' user=', norm.annotatedUser);
const mont = montarEquipamentoNormalizado(norm, {});
console.log('\nMONTADO.equipamento:');
for (const [k, v] of Object.entries(mont.equipamento)) console.log(`  ${k}=`, JSON.stringify(v));
