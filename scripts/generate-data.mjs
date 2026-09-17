#!/usr/bin/env node
// Converts the source distance table PDF (data/kilometertabelle.pdf) into
// data/kilometertabelle.json, which the static app fetches at runtime
// without needing a PDF parser in the browser.
//
// Run with: npm run generate-data
// Re-run this script whenever data/kilometertabelle.pdf changes.
//
// The source PDF is a matrix export: row labels (locations/venues) run down
// the left edge as normal text, column labels (teams) are printed as
// vertically rotated text above the grid, and every cell value is also
// rendered as vertically rotated text. Rows and columns don't need to be the
// same set (a team can have multiple home venues), so the grid is read by
// matching each text item's coordinates rather than assuming a square table.
//
// Output shape: { teams: [...], locations: [...], distances: { team: { location: km } } }.
// Teams and locations are kept as separate axes because the UI asks the user
// to pick a team first (whose km rate is what matters) and then a
// destination venue — there is no team<->team or venue<->venue distance data.

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PDF_PATH = path.join(__dirname, '..', 'data', 'kilometertabelle.pdf');
const JSON_PATH = path.join(__dirname, '..', 'data', 'kilometertabelle.json');

// Row labels sit in the left-most text column; everything to the right of it
// (column headers and cell values) is rendered as vertical text, recognizable
// by a transform matrix with a near-zero horizontal scale (transform[0]).
const isVerticalText = (transform) => Math.abs(transform[0]) < 0.01 && Math.abs(transform[3]) < 0.01;

const parseNumber = (raw) => {
  const normalized = String(raw).trim().replace(',', '.');
  const num = Number.parseFloat(normalized);
  return Number.isFinite(num) ? num : Number.NaN;
};

// The app asks the user to pick a team first, then a destination venue, so
// keep the two axes separate rather than merging them into one location list.
const teamNames = new Set();
const locationNames = new Set();

// distances: Map<team, Map<location, km>>. Directional by construction
// (column = team, row = location) — no need to store it both ways since a
// team is never looked up as a destination venue and vice versa.
const distances = new Map();

const addDistance = (locationName, teamName, value) => {
  if (!locationName || !teamName || !Number.isFinite(value)) {
    return;
  }

  const location = String(locationName).trim();
  const team = String(teamName).trim();
  if (!location || !team) {
    return;
  }

  teamNames.add(team);
  locationNames.add(location);

  if (!distances.has(team)) {
    distances.set(team, new Map());
  }

  const current = distances.get(team).get(location);
  if (current === undefined || value < current) {
    distances.get(team).set(location, value);
  }
};

const extractMatrixFromPage = (items) => {
  // Row labels: leftmost text column. Its x-position is the smallest x among
  // items that are NOT vertical text and carry an actual label.
  const rowCandidates = items.filter((item) => !isVerticalText(item.transform) && item.str.trim() !== '');
  if (!rowCandidates.length) {
    return;
  }

  const rowX = Math.min(...rowCandidates.map((item) => item.transform[4]));
  const rowHeaders = rowCandidates
    .filter((item) => Math.abs(item.transform[4] - rowX) < 0.5)
    .map((item) => ({ name: item.str.trim(), y: item.transform[5] }))
    .sort((a, b) => a.y - b.y);

  if (!rowHeaders.length) {
    return;
  }

  // Column headers + cell values are vertical text. Column headers sit above
  // the grid (smaller y than the first row's y), cell values sit within/below
  // the grid (y >= first row's y, roughly).
  const gridTopY = Math.min(...rowHeaders.map((r) => r.y)) - 10;
  const verticalItems = items.filter((item) => isVerticalText(item.transform) && item.str.trim() !== '');
  const columnXs = [...new Set(verticalItems.map((item) => Math.round(item.transform[4] * 10) / 10))].sort(
    (a, b) => a - b,
  );

  for (const colX of columnXs) {
    const colItems = verticalItems.filter((item) => Math.abs(item.transform[4] - colX) < 0.5);
    const header = colItems
      .filter((item) => item.transform[5] < gridTopY)
      .sort((a, b) => a.transform[5] - b.transform[5])[0];
    if (!header) {
      continue;
    }

    const columnName = header.str.trim();
    const values = colItems
      .filter((item) => item.transform[5] >= gridTopY)
      .sort((a, b) => a.transform[5] - b.transform[5]);

    // Values are expected to align 1:1 with the row headers, top to bottom.
    values.forEach((valueItem, index) => {
      const row = rowHeaders[index];
      if (!row) {
        return;
      }

      const km = parseNumber(valueItem.str);
      addDistance(row.name, columnName, km);
    });
  }
};

const mapToObject = () => {
  const distanceObj = {};
  for (const [team, locations] of distances.entries()) {
    distanceObj[team] = Object.fromEntries(locations.entries());
  }

  return {
    teams: [...teamNames].sort((a, b) => a.localeCompare(b, 'de')),
    locations: [...locationNames].sort((a, b) => a.localeCompare(b, 'de')),
    distances: distanceObj,
  };
};

const main = async () => {
  const pdfBuffer = await readFile(PDF_PATH);
  const data = new Uint8Array(pdfBuffer.buffer.slice(pdfBuffer.byteOffset, pdfBuffer.byteOffset + pdfBuffer.byteLength));
  const pdf = await getDocument({ data }).promise;

  for (let p = 1; p <= pdf.numPages; p += 1) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    extractMatrixFromPage(content.items);
  }

  if (distances.size === 0) {
    throw new Error('No valid distance data found in PDF. Check the source file format.');
  }

  const result = mapToObject();
  await writeFile(JSON_PATH, `${JSON.stringify(result, null, 2)}\n`, 'utf8');

  console.log(`Wrote ${JSON_PATH} with ${teamNames.size} teams and ${locationNames.size} locations.`);
};

main().catch((error) => {
  console.error('Failed to generate distance data:', error);
  process.exitCode = 1;
});
