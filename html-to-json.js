/* Converts each .html file in records-html to a .json file in records-json
   Skips files that already exist
*/
import fs from 'fs';
import jsdom from 'jsdom';
const { JSDOM } = jsdom;

function exists(name) {
  try {
    const stat = fs.statSync(name);
    return true;
  } catch (e) {
    return false;
  }
}

const numberRE = /^[0-9,]+$/
function convertNumbers(s) {
  return numberRE.test(s)
    ? parseFloat(s.replaceAll(',', ''))
    : s;
}

function convertHTMLToJson(htmlFilename, jsonFilename) {
  const dom = new JSDOM(fs.readFileSync(htmlFilename, {encoding: 'utf-8'}));
  const data = {};
  let group;
  let groupName;

  const finishGroup = () => {
    if (group) {
      data[groupName] = group;
      group = undefined;
      groupName = undefined;
    }
  };

  const addGroup = name => {
    finishGroup();
    groupName = name;
    group = {};
  }

  {
    const impl = dom.window.document.querySelector('#implementation tbody');
    for (const trElem of impl.querySelectorAll('tr')) {
      /** @type HTMLTableRowElement */
      const tr = trElem;
      if (tr.className === 'group') {
        addGroup(tr.cells[0].textContent);
      } else if (tr.cells[0]?.className === 'subkey') {
        group[tr.cells[0].textContent] = convertNumbers(tr.cells[1].textContent);
      }
    }
    finishGroup();
  }

  const addList = id => {
    const list = [];
    const ext = dom.window.document.querySelector(`#${id} tbody`);
    for (const td of ext.querySelectorAll('td')) {
      list.push(td.textContent);
    }
    data[id] = list;
  }
  addList('extensions');
  addList('eglextensions');
  addList('compressedformats');
  addList('shaderformats');
  addList('programformats');
  addList('features');

  {
    const sensors = dom.window.document.querySelector('#sensors tbody');
    if (sensors) {
      const s = {};
      for (const tr of sensors.querySelectorAll('tr')) {
        s[tr.cells[0].textContent] = {
          maxRange: convertNumbers(tr.cells[1].textContent),
          resolution: convertNumbers(tr.cells[2].textContent),
        };
      }
      data.sensors = s;
    }
  }

  fs.writeFileSync(jsonFilename, JSON.stringify(data, null, 2));
  dom.window.document.documentElement.textContent = '';
}

const names = fs.readdirSync('records-html').filter(f => f.endsWith('.html'));
for (const name of names) {
  const htmlFilename = `records-html/${name}`;
  const jsonFilename = `records-json/${name.substring(0, name.length - 5)}.json`;
  if (!exists(jsonFilename)) {
    console.log(htmlFilename, '->', jsonFilename);
    convertHTMLToJson(htmlFilename, jsonFilename);
  }
}