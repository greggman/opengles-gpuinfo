import fs from 'fs';

const records = JSON.parse(fs.readFileSync('records.json', {encoding: 'utf-8'}));
console.log(records.data.length);
console.log(JSON.stringify(records.data[0], null, 2));

/*
{
  "id": 7430,
  "name": "<a href=\"displayreport.php?id=7430\">N159V</a>",
  "glesversion": "3.2",
  "slversion": "3.20",
  "renderer": "Adreno (TM) 610",
  "os": "14",
  "date": "2024-06-12",
  "compare": "<center><Button onClick=\"addToCompare(7430,'N159V')\">Add</Button>"
}
*/

for (const data of records.data) {
  const url = `https://opengles.gpuinfo.org/displayreport.php?id=${data.id}`;
  const filename = `records/report-${data.id}.html`;
  console.log('fetch:', url);
  const res = await fetch(url);
  const text = await res.text();
  console.log('write:', filename);
  fs.writeFileSync(filename, text);
}