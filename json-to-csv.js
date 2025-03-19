import fs from 'fs';
import fsP from 'fs/promises';

const data = JSON.parse(fs.readFileSync('alldata.json', {encoding: 'utf-8'}));

const gles31Plus = data.filter(d => {
  const version = parseFloat(d.GL_VERSION.substring(10));
  return version >= 3.1;
});

const columnNames = new Set();
for (let entry of gles31Plus) {
  for (const key of Object.keys(entry)) {
    columnNames.add(key);
  }
}

function escape(s) {
  return `"${s.replaceAll('"', '""')}"`;
}

const rows = [];
const digitRE = /&\d/
const keys = [...columnNames].filter(k => !k.includes('.') && !digitRE.test(k));
rows.push(keys.map(escape).join(','));
for (let entry of gles31Plus) {
  const row = [];
  for (const key of keys) {
    row.push(entry[key] ?? '');
  }
  rows.push(row.join(','))
}
//rows.splice(100, 10000);

const f = await fsP.open('alldata-v2.csv', 'w');
f.write(new Uint8Array([0xEF, 0xBB, 0xBF])); // write BOM
f.write(rows.join('\r\n'))
f.close();
