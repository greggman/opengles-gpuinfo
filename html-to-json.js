import fs from 'fs';
import jsdom from 'jsdom';
const { JSDOM } = jsdom;

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
    groupName = namel
    group = {};
  }

  const impl = dom.window.document.querySelector('#implementation tbody');
  for (const trElem of impl.querySelectorAll('tr')) {
    /** @type HTMLTableRowElement */
    const tr = trElem;
    if (tr.className === 'group') {
      addGroup(tr.cells[0].textContent);
    } else if (tr.cells[0]?.clasName === 'subkey') {
      group[tr.cells[0].textContent] = tr.cells[1].textContent;
    }
  }

  const addList = id => {
    const list = [];
    const ext = dom.window.document.querySelector(`#${id} tbody`);
    for (const a of ext.querySelectorAll('a')) {
      list.push(a.textContent);
    }
    data[id] = list;
  }
  addList('extensions');
  addList('eglextensions');
  addList('compressedformats');
  addList('features');

  fs.writeFileSync(jsonFilename, JSON.stringify(data, null, 2));
}

const names = fs.readdirSync('records-html').filter(f => f.endsWith('.html'));
for (const name of names) {
  const htmlFilename = `records-html/${name}`;
  const jsonFilename = `records.json/${name.substring(0, name.length - 5)}.json`;
  console.log(htmlFilename, '->', jsonFilename);
}