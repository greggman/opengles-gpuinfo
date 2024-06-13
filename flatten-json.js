/* 
Reads all the JSON files in records.json
flattens each one to key-value pairs
writes them as an array to alldata.json
generates a CVS file to alldata.csv

example
  // records-json/jim.json
  { 
    info: {
      name: "Jim", age: 27, hobby: "tennis"
    }
  }

  // records-json/jane.json
  {
    info: {
      name: "Jane", age: 28, location: "Tokyo"
    }
  }

  // alldata.json
  [
    { name: "Jim", age: 27, hobby: "tennis" },
    { name: "Jane", age: 28, location: "Tokyo" }
  ]

  // alldata.csv
  "name","age","hobby","location"
  "Jim",27,"tennis",
  "Jane",28,,"Tokyo"
*/
import fs from 'fs';
import fsP from 'fs/promises';

const filenames = fs.readdirSync('records-json').filter(f => f.endsWith('.json'));
const datas = [];

for (const name of filenames) {
  const jsonFilename = `records-json/${name}`;
  const data = JSON.parse(fs.readFileSync(jsonFilename, {encoding: 'utf-8'}));
  data.report = { reportId: jsonFilename };
  datas.push(data);
}

const flatDatas = [];
const names = new Set();
for (const data of datas) {
  const flat = {};
  flatDatas.push(flat);
  for (const [group, entries] of Object.entries(data)) {
    if (Array.isArray(entries)) {
      entries.forEach(e => {
        names.add(e);
        flat[e] = true;
      });
    } else {
      for (const [key, value] of Object.entries(entries)) {
        if (typeof value === 'object') {
          //
        } else {
          names.add(key);
          flat[key] = value;
        }
      }
    }
  }
}

fs.writeFileSync('alldata.json', JSON.stringify(flatDatas));

function writeRow(f, row) {
  const cells = [];
  for (const v of row) {
    if (v === undefined) {
      cells.push('');
    } else if (typeof v === 'string') {
      cells.push(`"${v.replaceAll('"', '""')}"`);
    } else {
      cells.push(v.toString());
    }
  }
  f.write(`${cells.join(',')}\r\n`);
}

const f = await fsP.open('alldata.csv', 'w');
f.write(new Uint8Array([0xEF, 0xBB, 0xBF])); // write BOM
writeRow(f, names.values());
for (const data of flatDatas) {
  const row = [];
  for (const name of names.values()) {
    row.push(data[name]);
  }
  writeRow(f, row);
}
f.close();
