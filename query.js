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
  const validRecords = records.filter(r => r[limit] !== undefined)
  const buckets = new Map();
  for (const entry of validRecords) {
    const v = entry[limit];
    buckets.set(v, (buckets.get(v) || 0) + 1);
  }

  console.log(limit);
  const lengths = [0, 0];
  const results = [...buckets.entries()];
  results.sort((a, b) => Math.sign(b[b.length - 1] - a[a.length - 1]));
  results.forEach(([k, v]) => {
    lengths[0] = Math.max(safeLen(k), lengths[0]);
    lengths[1] = Math.max(safeLen(v), lengths[1]);
  });
  const num = validRecords.length;

  const rows = [
    ['',          '', '',    '', ' %of '],
    ['limit    ', '', 'cnt', '', 'total'],
    ['---------', '', '---', '', '-----'],
    ...results.map(([k, v]) => [
       k,
       ': ',
       v,
       '  ',
       `${(v / validRecords.length * 100).toFixed(1)}%`,
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

function isNumeric(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}

function queryCombineLimit(records, combineLimit, computeLimit, limits) {
  console.log(''.padEnd(60, '='));
  console.log(combineLimit, 'vs')
  console.log(`  ${computeLimit}\n${limits.map(v => `  ${v}`).join('\n')}`);
  const allLimits = [computeLimit, ...limits];
  let numOk = 0;
  let numBad = 0;
  const bad = [];
  const good = [];
  const badBuckets = new Map();
  const goodBuckets = new Map();
  for (const entry of records) {
    const maxCombined = entry[combineLimit];
    if (maxCombined === undefined || !allLimits.reduce((all, limit) => all && isNumeric(entry[limit]), true)) {
      continue;
    }
    const sumLimits = limits.reduce((sum, limit) => sum + entry[limit], 0);
    const id = `${allLimits.map(limit => entry[limit]).join(',')},${entry[combineLimit]}`;
    if (sumLimits > maxCombined) {
      bad.push(entry);
      badBuckets.set(id, (badBuckets.get(id) || 0) + 1);
    } else {
      good.push(entry);
      goodBuckets.set(id, (goodBuckets.get(id) || 0) + 1);
    }
  }
  console.log('total valid entries:', good.length + bad.length);
  console.log('num entries where FRAGMENT + VERTEX > COMBINED:', bad.length);
  console.log('\n')
  
  const headings = [...allLimits.map(v => `${v.split('_')[2]} `), `${combineLimit.split('_')[2]} `, 'count'];
  const showCombos = (title, buckets) => {
    const rows = [
      headings,
      headings.map(v => ' '.padStart(v.length, '-')),
      ...[...buckets.entries()].map(([k, v]) => [...k.split(','), v]).sort((a, b) => b[b.length - 1] - a[a.length - 1]),
    ];
    console.log(title);
    console.log(padColumns(rows, ''));
    console.log('\n')
  };

  showCombos('Combos where COMBINED < FRAGMENT + VERTEX', badBuckets);
  showCombos('Combos where COMBINED >= FRAGMENT + VERTEX', goodBuckets);
}

queryCombineLimit(gles31Plus, 'GL_MAX_COMBINED_SHADER_STORAGE_BLOCKS', 'GL_MAX_COMPUTE_SHADER_STORAGE_BLOCKS', [
  'GL_MAX_FRAGMENT_SHADER_STORAGE_BLOCKS',
  'GL_MAX_VERTEX_SHADER_STORAGE_BLOCKS',
]);

queryCombineLimit(gles31Plus, 'GL_MAX_COMBINED_IMAGE_UNIFORMS', 'GL_MAX_COMPUTE_IMAGE_UNIFORMS', [
  'GL_MAX_FRAGMENT_IMAGE_UNIFORMS',
  'GL_MAX_VERTEX_IMAGE_UNIFORMS',
]);

queryCombineLimit(gles31Plus, 'GL_MAX_COMBINED_TEXTURE_IMAGE_UNITS', 'GL_MAX_COMPUTE_TEXTURE_IMAGE_UNITS', [
  'GL_MAX_TEXTURE_IMAGE_UNITS',
  'GL_MAX_VERTEX_TEXTURE_IMAGE_UNITS',
]);

// queryCombineLimit(gles31Plus, 'GL_MAX_COMBINED_UNIFORM_BLOCKS', 'GL_MAX_COMPUTE_UNIFORM_BLOCKS', [
//   'GL_MAX_FRAGMENT_UNIFORM_BLOCKS	',
//   'GL_MAX_VERTEX_UNIFORM_BLOCKS',
// ]);

//queryCombineLimit(gles31Plus, 'GL_MAX_COMBINED_SHADER_OUTPUT_RESOURCES', [
//  'GL_MAX_COMBINED_SHADER_STORAGE_BLOCKS',
//  'GL_MAX_COMBINED_IMAGE_UNIFORMS	',
//  'GL_MAX_COLOR_ATTACHMENTS',
//]);
