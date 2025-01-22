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

function queryFeature(records, feature) {
  const buckets = new Map();
  for (const entry of records) {
    const v = entry[feature] ? true : false;
    const bucket = buckets.get(v) || {sum: 0, entries: []};
    bucket.sum++;
    bucket.entries.push(entry);
    buckets.set(v, bucket);
  }

  console.log(feature);
  const results = [...buckets.entries()];
  const rows = [
    ['',          '', '',    '', ' %of '],
    ['has feature ', '', 'cnt', '', 'total'],
    ['---------', '', '---', '', '-----'],
    ...results.map(([k, {sum}]) => [
       k,
       ': ',
       sum,
       '  ',
       `${(sum / records.length * 100).toFixed(1)}%`,
    ]),
  ];
  console.log(padColumns(rows, '<<>>>>>>'));
  console.log('\n');
  console.log('devices that don not have', feature);
  const {entries} = buckets.get(false) ?? {entries:[]};
  const devicesByGPU = new Map();
  for (const e of entries) {
    const devices = devicesByGPU.get(e.GL_RENDERER) ?? new Set();
    devices.add(e.Device);
    devicesByGPU.set(e.GL_RENDERER, devices);
  }
  for (const [gpu, devices] of devicesByGPU.entries()) {
    console.log('   ', gpu, ':', [...devices.values()].join(','));
  }
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
queryLimit(gles31Plus, 'GL_MAX_TEXTURE_LOD_BIAS');
queryFeature(gles31Plus, 'GL_EXT_bgra');
queryFeature(gles31Plus, 'GL_EXT_texture_format_BGRA8888');
queryFeature(gles31Plus, 'GL_EXT_color_buffer_half_float');
queryFeature(gles31Plus, 'GL_EXT_color_buffer_float');

function isNumeric(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}

function queryCombineLimit(records, combineLimit, limits) {
  console.log(''.padEnd(60, '='));
  console.log(combineLimit, 'vs')
  console.log(`  ${limits.map(v => `  ${v}`).join('\n')}`);
  const bad = [];
  const good = [];
  const badBuckets = new Map();
  const goodBuckets = new Map();
  for (const entry of records) {
    const maxCombined = entry[combineLimit];
    // skip any entry where one of the limits is missing (undefined)
    if (maxCombined === undefined || !limits.reduce((all, limit) => all && isNumeric(entry[limit]), true)) {
      continue;
    }
    // some the limits
    const sumLimits = limits.reduce((sum, limit) => sum + entry[limit], 0);
    // make an id in the form of "limit1,limit2,limitN,sum,combineLimit"
    const id = `${limits.map(limit => entry[limit]).join(',')},${sumLimits},${entry[combineLimit]}`;
    if (sumLimits > maxCombined) {
      bad.push(entry);
      const bucket = badBuckets.get(id) ?? {sum: 0, entries: []};
      bucket.sum++;
      bucket.entries.push(entry);
      badBuckets.set(id, bucket);
    } else {
      good.push(entry);
      const bucket = goodBuckets.get(id)  ?? {sum: 0, entries: []};
      bucket.sum++;
      bucket.entries.push(entry);
      goodBuckets.set(id, bucket);
    }
  }
  console.log('total valid entries:', good.length + bad.length);
  console.log('num entries where', limits.join('+\n                  '), '> COMBINED:', bad.length);
  console.log('\n')
  
  // split the names by _ so headingSplit is an array of arrays of words
  const headingsSplit = [...limits, 'prefix_total_of_limits_<---', combineLimit, 'prefix_count_of_opengles.gpuinfo.org_entries'].map(v => v.split('_').slice(1));
  // get the number of words in the largest heading
  const numWordsInLargestHeading = headingsSplit.reduce((max, arr) => Math.max(max, arr.length), 0);
  // Make heading rows, each row is the corresponding word from that heading
  const headingRows = [];
  for (let p = 0; p < numWordsInLargestHeading; ++p) {
    headingRows.push(headingsSplit.map(pieces => `${pieces[p] ?? ''} `));
  }

  const showCombos = (title, buckets) => {
    const rows = [
      ...headingRows,
      // make a ---- for each column. need to go through each heading's words and find the longest word
      headingsSplit.map(words => ' '.padStart(words.reduce((max, s) => Math.max(max, (s ?? '').length), 0), '-')),
      // from the buckets, split its id (id "limit0,limit1,limitN,sum,combineLimit") to turn into columns
      ...[...buckets.entries()].map(([id, {sum}]) => {
        const columns = [...id.split(',').map(v => `${v} `), sum];
        return columns;
      })
      // sort by last column
      .sort((a, b) => b[b.length - 1] - a[a.length - 1]),
    ];
    console.log(title);
    console.log(padColumns(rows, ''));
    console.log('\n')
  };

  const showComboEntries = (buckets) => {
    const labels = [...limits, 'sum-of-limits', combineLimit];
    for (const [k, {entries}] of buckets.entries()) {
      console.log('---');
      console.log(k.split(',').map((v, i) => `${labels[i]}=${v}`).join(','));
      const devicesByGPU = new Map();
      for (const e of entries) {
        const devices = devicesByGPU.get(e.GL_RENDERER) ?? new Set();
        devices.add(e.Device);
        devicesByGPU.set(e.GL_RENDERER, devices);
      }
      for (const [gpu, devices] of devicesByGPU.entries()) {
        console.log('   ', gpu, ':', [...devices.values()].join(','));
      }
    }
  };

  showCombos(`Combos where COMBINED < ${limits.join(' +\n                        ')}`, badBuckets);
  showComboEntries(badBuckets);
  showCombos(`Combos where COMBINED >= ${limits.join(' +\n                         ')}`, goodBuckets);
  showComboEntries(goodBuckets);
}

queryCombineLimit(gles31Plus, 'GL_MAX_COMBINED_SHADER_STORAGE_BLOCKS', [
  'GL_MAX_FRAGMENT_SHADER_STORAGE_BLOCKS',
  'GL_MAX_VERTEX_SHADER_STORAGE_BLOCKS',
]);

queryCombineLimit(gles31Plus, 'GL_MAX_COMBINED_IMAGE_UNIFORMS', [
  'GL_MAX_FRAGMENT_IMAGE_UNIFORMS',
  'GL_MAX_VERTEX_IMAGE_UNIFORMS',
]);

queryCombineLimit(gles31Plus, 'GL_MAX_COMBINED_TEXTURE_IMAGE_UNITS', [
  'GL_MAX_TEXTURE_IMAGE_UNITS',
  'GL_MAX_VERTEX_TEXTURE_IMAGE_UNITS',
]);

queryCombineLimit(gles31Plus, 'GL_MAX_COMBINED_UNIFORM_BLOCKS', [
  'GL_MAX_VERTEX_UNIFORM_BLOCKS',
  'GL_MAX_FRAGMENT_UNIFORM_BLOCKS',
]);

queryCombineLimit(gles31Plus, 'GL_MAX_COMBINED_SHADER_OUTPUT_RESOURCES', [
  'GL_MAX_VERTEX_SHADER_STORAGE_BLOCKS',
  'GL_MAX_VERTEX_IMAGE_UNIFORMS',
  'GL_MAX_FRAGMENT_SHADER_STORAGE_BLOCKS',
  'GL_MAX_FRAGMENT_IMAGE_UNIFORMS',
  'GL_MAX_DRAW_BUFFERS',
]);


queryCombineLimit(gles31Plus, 'GL_MAX_COMBINED_SHADER_OUTPUT_RESOURCES', [
  'GL_MAX_COMPUTE_SHADER_STORAGE_BLOCKS',
  'GL_MAX_COMPUTE_IMAGE_UNIFORMS',
]);

// queryCombineLimit(gles31Plus, 'GL_MAX_COMBINED_UNIFORM_BLOCKS', 'GL_MAX_COMPUTE_UNIFORM_BLOCKS', [
//   'GL_MAX_FRAGMENT_UNIFORM_BLOCKS	',
//   'GL_MAX_VERTEX_UNIFORM_BLOCKS',
// ]);

queryCombineLimit(gles31Plus, 'GL_MAX_COMBINED_SHADER_OUTPUT_RESOURCES', [
  'GL_MAX_COMBINED_SHADER_STORAGE_BLOCKS',
  'GL_MAX_COMBINED_IMAGE_UNIFORMS',
  'GL_MAX_COLOR_ATTACHMENTS',
]);

/*
Combos where COMBINED < total
COMPUTE FRAGMENT FRAGMENT DRAW COMBINED count
        SHADER   IMAGE    BUFFERS
        STORAGE  UNIFORMS
        BLOCKS
------- -------- -------- ---- -------- ----
8       8        8        8    8        362
16      16       8        8    16       44
60      60       60       8    60       4
0       0        0        8    0        3
64      64       32       8    72       3
8       8        8        8    20       2
16      16       32       8    40       1
8192    8192     8192     8    8192     1
0       0        0        4    0        1
*/