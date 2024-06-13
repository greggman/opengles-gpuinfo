import fs from 'fs';

const data = JSON.parse(fs.readFileSync('alldata.json', {encoding: 'utf-8'}));

const gles31Plus = data.filter(d => {
  const version = parseFloat(d.GL_VERSION.substring(10));
  return version === 3.1; //>= 3.1;
});

function safeStr(v) {
  return v === undefined ? 'undefined' : v.toString();
}

function safeLen(v) {
  return safeStr(v).length;
}

function safePad(v, len) {
  return safeStr(v).padEnd(len);
}

``
function queryLimit(records, limit) {
  let badCount = 0;
  const buckets = new Map();
  for (const entry of records) {
    const v = entry[limit];

    if (v === undefined) {
      //if (badCount < 3) {
        badCount++;
      //  console.log(entry.reportId, entry.GL_RENDERER);
      //}
    }

    buckets.set(v, (buckets.get(v) || 0) + 1);
  }

  console.log(limit);
  const lengths = [0, 0];
  const results = [...buckets.entries()];
  results.sort((a, b) => Math.sign(a[0] - b[0]));
  results.forEach(([k, v]) => {
    lengths[0] = Math.max(safeLen(k), lengths[0]);
    lengths[1] = Math.max(safeLen(v), lengths[1]);
  });
  const numUndefined = buckets.get(undefined) || 0;
  const numNotUndefined = records.length - numUndefined;
  console.log(results.map(([k, v]) => `${safePad(k,lengths[0])}: ${safePad(v ,lengths[1])}  ${(v / records.length * 100).toFixed(0).padStart(2)}%  ${k === undefined ? '' : `(${(v / numNotUndefined * 100).toFixed(0).padStart(2)}%)`}`).join('\n'));
  console.log('\n')
}

console.log('total records:                                  ', data.length);
console.log('num records that claim OpenGL ES 3.1 or better: ', gles31Plus.length);
console.log('\n');

queryLimit(gles31Plus, 'GL_MAX_COMPUTE_SHADER_STORAGE_BLOCKS');
queryLimit(gles31Plus, 'GL_MAX_FRAGMENT_SHADER_STORAGE_BLOCKS');
queryLimit(gles31Plus, 'GL_MAX_VERTEX_SHADER_STORAGE_BLOCKS');
