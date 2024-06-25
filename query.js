import fs from 'fs';

const data = JSON.parse(fs.readFileSync('alldata.json', {encoding: 'utf-8'}));

const gles31Plus = data.filter(d => {
  const version = parseFloat(d.GL_VERSION.substring(10));
  return version >= 3.1;
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

function pad(format, len, v) {
  switch (format) {
    case '>':  // move to right
    case 'r':  // pad right
    case 's':  // pad start
      return safeStr(v).padStart(len);
    default:
      return safeStr(v).padEnd(len);
  }
}

function padColumns(rows, formats = '') {
  const columnLengths = [];

  // get size of each column
  for (const row of rows) {
    row.forEach((v, i) => {
      columnLengths[i] = Math.max(columnLengths[i] || 0, safeStr(v).length);
    });
  }

  return rows.map(row => row.map((v, i) => pad(formats[i], columnLengths[i], v)).join('')).join('\n');
}

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
  const numNotZero = numNotUndefined - (buckets.get(0) || 0);


  const rows = [
    ['',          '', '',    '', ' %of ', '  ', '     not      ', '  not   '],
    ['limit    ', '', 'cnt', '', 'total', '  ', '  undefined   ', '  zero  '],
    ['---------', '', '---', '', '-----', '--', ' ------------ ', '--------'],
    ...results.map(([k, v]) => [
       k,
       ': ',
       v,
       '  ',
       (v / records.length * 100).toFixed(1),
       '% ',
       k === undefined ? '' : `${(v / numNotUndefined * 100).toFixed(1)}% `,
       k === undefined || k === 0 ? '' : `${(v / numNotZero * 100).toFixed(1)}% `,
    ]),
  ];
  console.log(padColumns(rows, '<<>>>>>>'));
  console.log('\n')
}

console.log('total records:                                  ', data.length);
console.log('num records that claim OpenGL ES 3.1 or better: ', gles31Plus.length);
console.log('\n');

queryLimit(gles31Plus, 'GL_MAX_COMPUTE_SHADER_STORAGE_BLOCKS');
queryLimit(gles31Plus, 'GL_MAX_FRAGMENT_SHADER_STORAGE_BLOCKS');
queryLimit(gles31Plus, 'GL_MAX_VERTEX_SHADER_STORAGE_BLOCKS');
queryLimit(gles31Plus, 'GL_MAX_FRAGMENT_IMAGE_UNIFORMS');
queryLimit(gles31Plus, 'GL_MAX_VERTEX_IMAGE_UNIFORMS');
queryLimit(gles31Plus, 'GL_MAX_TEXTURE_SIZE');
queryLimit(gles31Plus, 'GL_MAX_3D_TEXTURE_SIZE');


function queryCombineLimit(records, combineLimit, limits) {
  console.log(combineLimit, 'vs')
  console.log(limits.map(v => `  ${v}`).join('\n'));
  let numOk = 0;
  let numBad = 0;
  const bad = [];
  const buckets = new Map();
  for (const entry of records) {
    const maxCombined = entry[combineLimit];
    const sumLimits = limits.reduce((sum, limit) => sum + entry[limit],0);
    if (sumLimits > maxCombined) {
      bad.push(entry);
      const id = `${limits.map(limit => entry[limit]).join(',')},${entry[combineLimit]}`;
      buckets.set(id, (buckets.get(id) || 0) + 1);
    }
  }
  console.log('total entries:', records.length);
  console.log('num entries where sum of', limits.length, '> combined:', bad.length);
  const rows = [
    [...limits.map(v => `${v.split('_')[2]} `), `${combineLimit.split('_')[2]} `, 'count'],
    ...[...buckets.entries()].map(([k, v]) => [...k.split(','), v]),
  ];
  console.log(padColumns(rows, ''));
  console.log('\n')
}

queryCombineLimit(gles31Plus, 'GL_MAX_COMBINED_SHADER_STORAGE_BLOCKS', [
  'GL_MAX_COMPUTE_SHADER_STORAGE_BLOCKS',
  'GL_MAX_FRAGMENT_SHADER_STORAGE_BLOCKS',
  'GL_MAX_VERTEX_SHADER_STORAGE_BLOCKS',
]);

queryCombineLimit(gles31Plus, 'GL_MAX_COMBINED_IMAGE_UNIFORMS', [
  'GL_MAX_COMPUTE_IMAGE_UNIFORMS',
  'GL_MAX_FRAGMENT_IMAGE_UNIFORMS',
  'GL_MAX_VERTEX_IMAGE_UNIFORMS',
]);