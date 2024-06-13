# Scrape opengles.gpuinfo.org

Steps

1. Open Devtools
2. Go to the network tab
3. Go to `https://opengles.gpuinfo.org/listreports.php'
4. In the network tab, right click the `reports.php?...` entry and pick "open in a new tab"
5. In the new tab, open the devtools to the networ page.
6. In the URL in the omnibar , change `length=25` to `length=10000` and press enter
7. In the response tab on the request, right click and pick "Save As..."
8. Save as `record-entries.json`.

in a terminal

```
npm ci
node scrape.js
```

This tries to download each report as HTML to `records.html`

When finished

```
node html-to-json.js
```

This parses each HTML file and writes the contents to `records-json`.

If it crashes (v8 runs out of memory), run it again. Continue until all files are done

```
node flatten-json.js`
```

This reads all the json files and writes both `alldata.json` (an array with the data flattened to key/values)
and `alldata.csv` with column headings and the data normalized.

Note: I loaded `alldata.csv` into Google Sheets. It took 20-60mins to import it?

So, `query.js` can be modified as an example of querying yourself.

```
node query.js
```

