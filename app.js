const tableFile = document.getElementById('tableFile');
const csvPaste = document.getElementById('csvPaste');
const loadPasted = document.getElementById('loadPasted');
const fromTeam = document.getElementById('fromTeam');
const toTeam = document.getElementById('toTeam');
const calculate = document.getElementById('calculate');
const result = document.getElementById('result');
const languageSelect = document.getElementById('languageSelect');
const languageLabel = document.getElementById('languageLabel');
const appTitle = document.getElementById('appTitle');
const appHint = document.getElementById('appHint');
const tableFileLabel = document.getElementById('tableFileLabel');
const csvHint = document.getElementById('csvHint');
const csvPasteLabel = document.getElementById('csvPasteLabel');
const fromTeamLabel = document.getElementById('fromTeamLabel');
const toTeamLabel = document.getElementById('toTeamLabel');

let kmGraph = new Map();
let knownLocations = [];
let lastResultMessage = null;

const translations = {
  de: {
    pageTitle: 'UBOS KM-Rechner',
    languageLabel: 'Sprache',
    appTitle: 'UBOS KM-Rechner',
    appHint: 'Lade eine Kilometertabelle (Excel, CSV oder PDF) hoch und wähle zwei Teams/Orte aus.',
    tableFileLabel: 'Kilometertabelle hochladen',
    csvHint: 'Tipp: CSV aus Excel exportieren funktioniert besonders zuverlässig.',
    csvPasteLabel: 'Oder CSV-Inhalt einfügen',
    csvPlaceholder: 'Team A;Team B;Kilometer',
    loadPasted: 'Eingefügte Tabelle laden',
    fromTeamLabel: 'Team/Ort A',
    toTeamLabel: 'Team/Ort B',
    calculate: 'Gesamtkilometer anzeigen',
    loadTableFirst: 'Bitte Tabelle laden',
    pleaseChoose: 'Bitte wählen',
    noValidData: 'Keine gültigen Kilometerdaten in der Datei gefunden.',
    loadedCount: '{count} Orte/Teams geladen.',
    pdfUnavailable: 'PDF-Verarbeitung ist nicht verfügbar.',
    fileFormatUnsupported: 'Dateiformat nicht unterstützt.',
    tableLoading: 'Tabelle wird geladen...',
    readError: 'Fehler beim Einlesen: {message}',
    pasteCsvPrompt: 'Bitte CSV-Inhalt einfügen.',
    chooseTeams: 'Bitte Team/Ort A und B auswählen.',
    sameTeamResult: 'Gesamtkilometer ({from} → {to}): 0 km',
    noValueFound: 'Für {from} ↔ {to} wurde kein Wert gefunden.',
    totalKm: 'Gesamtkilometer ({from} → {to}): {km} km',
  },
  en: {
    pageTitle: 'UBOS KM Calculator',
    languageLabel: 'Language',
    appTitle: 'UBOS KM Calculator',
    appHint: 'Upload a distance table (Excel, CSV, or PDF) and select two teams/locations.',
    tableFileLabel: 'Upload distance table',
    csvHint: 'Tip: CSV exported from Excel is usually the most reliable format.',
    csvPasteLabel: 'Or paste CSV content',
    csvPlaceholder: 'Team A;Team B;Kilometers',
    loadPasted: 'Load pasted table',
    fromTeamLabel: 'Team/Location A',
    toTeamLabel: 'Team/Location B',
    calculate: 'Show total kilometers',
    loadTableFirst: 'Please load a table',
    pleaseChoose: 'Please choose',
    noValidData: 'No valid kilometer data found in the file.',
    loadedCount: '{count} locations/teams loaded.',
    pdfUnavailable: 'PDF processing is not available.',
    fileFormatUnsupported: 'File format not supported.',
    tableLoading: 'Loading table...',
    readError: 'Error while reading file: {message}',
    pasteCsvPrompt: 'Please paste CSV content.',
    chooseTeams: 'Please select Team/Location A and B.',
    sameTeamResult: 'Total kilometers ({from} → {to}): 0 km',
    noValueFound: 'No value found for {from} ↔ {to}.',
    totalKm: 'Total kilometers ({from} → {to}): {km} km',
  },
};

const resolveInitialLanguage = () => {
  const saved = window.localStorage.getItem('lang');
  if (saved && translations[saved]) {
    return saved;
  }

  return navigator.language?.toLowerCase().startsWith('de') ? 'de' : 'en';
};

let currentLang = resolveInitialLanguage();

const nameHints = {
  from: ['von', 'start', 'heim', 'team a', 'ort a', 'quelle', 'mannschaft', 'from', 'home', 'source', 'origin'],
  to: ['nach', 'ziel', 'gast', 'team b', 'ort b', 'gegner', 'to', 'destination', 'away', 'target', 'opponent'],
  km: ['km', 'kilometer', 'distanz', 'entfernung', 'distance'],
};

const interpolate = (template, vars = {}) =>
  String(template).replace(/\{(\w+)\}/g, (_, key) => (vars[key] === undefined ? `{${key}}` : String(vars[key])));

const t = (key, vars = {}) => {
  const locale = translations[currentLang] ? currentLang : 'en';
  const template = translations[locale][key] || translations.en[key] || key;
  return interpolate(template, vars);
};

const setResultKey = (key, vars = {}) => {
  lastResultMessage = { key, vars };
  result.textContent = t(key, vars);
};

const renderCurrentResult = () => {
  if (!lastResultMessage?.key) {
    return;
  }

  result.textContent = t(lastResultMessage.key, lastResultMessage.vars);
};

const applyStaticText = () => {
  document.documentElement.lang = currentLang;
  document.title = t('pageTitle');
  languageLabel.textContent = t('languageLabel');
  appTitle.textContent = t('appTitle');
  appHint.textContent = t('appHint');
  tableFileLabel.textContent = t('tableFileLabel');
  csvHint.textContent = t('csvHint');
  csvPasteLabel.textContent = t('csvPasteLabel');
  csvPaste.placeholder = t('csvPlaceholder');
  loadPasted.textContent = t('loadPasted');
  fromTeamLabel.textContent = t('fromTeamLabel');
  toTeamLabel.textContent = t('toTeamLabel');
  calculate.textContent = t('calculate');

  if (fromTeam.options[0]?.value === '') {
    fromTeam.options[0].textContent = fromTeam.disabled ? t('loadTableFirst') : t('pleaseChoose');
  }
  if (toTeam.options[0]?.value === '') {
    toTeam.options[0].textContent = toTeam.disabled ? t('loadTableFirst') : t('pleaseChoose');
  }
};

const addDistance = (a, b, value) => {
  if (!a || !b || !Number.isFinite(value)) {
    return;
  }

  const from = String(a).trim();
  const to = String(b).trim();
  if (!from || !to) {
    return;
  }

  const set = (start, end) => {
    if (!kmGraph.has(start)) {
      kmGraph.set(start, new Map());
    }

    const current = kmGraph.get(start).get(end);
    if (current === undefined || value < current) {
      kmGraph.get(start).set(end, value);
    }
  };

  set(from, to);
  set(to, from);
};

const resetData = () => {
  kmGraph = new Map();
  knownLocations = [];
  lastResultMessage = null;
  result.textContent = '';
};

const parseNumber = (raw) => {
  if (raw === null || raw === undefined) {
    return Number.NaN;
  }

  const normalized = String(raw).trim().replace(',', '.');
  const num = Number.parseFloat(normalized);
  return Number.isFinite(num) ? num : Number.NaN;
};

const parseDelimitedLine = (line) => {
  const delimiter = line.includes(';') ? ';' : line.includes('\t') ? '\t' : ',';
  const parts = line.split(delimiter).map((part) => part.trim().replace(/^"|"$/g, ''));
  return parts;
};

const resolveColumnIndex = (headerRow, kind, fallback) => {
  const candidates = nameHints[kind];
  for (let idx = 0; idx < headerRow.length; idx += 1) {
    const label = String(headerRow[idx] || '').toLowerCase().trim();
    if (candidates.some((candidate) => label.includes(candidate))) {
      return idx;
    }
  }

  return fallback;
};

const readPairRows = (rows) => {
  if (!rows.length) {
    return;
  }

  const header = rows[0].map((value) => String(value || '').trim());
  const fromIdx = resolveColumnIndex(header, 'from', 0);
  const toIdx = resolveColumnIndex(header, 'to', 1);
  const kmIdx = resolveColumnIndex(header, 'km', 2);

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    if (!row || row.length < 3) {
      continue;
    }

    const km = parseNumber(row[kmIdx]);
    addDistance(row[fromIdx], row[toIdx], km);
  }
};

const readMatrixRows = (rows) => {
  if (rows.length < 2 || rows[0].length < 2) {
    return;
  }

  const headerLocations = rows[0].slice(1).map((value) => String(value || '').trim());

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    const from = String(row[0] || '').trim();
    if (!from) {
      continue;
    }

    for (let colIndex = 1; colIndex < row.length; colIndex += 1) {
      const to = headerLocations[colIndex - 1];
      const km = parseNumber(row[colIndex]);
      addDistance(from, to, km);
    }
  }
};

const parseRows = (rows) => {
  const normalizedRows = rows
    .filter((row) => Array.isArray(row))
    .map((row) => row.map((value) => (value === null || value === undefined ? '' : value)));

  if (!normalizedRows.length) {
    return;
  }

  const hasHeaderHint = normalizedRows[0]
    .map((value) => String(value).toLowerCase())
    .some((value) => Object.values(nameHints).flat().some((hint) => value.includes(hint)));

  if (hasHeaderHint) {
    readPairRows(normalizedRows);
  } else {
    readMatrixRows(normalizedRows);
  }
};

const parseCSVText = (text) => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const rows = lines.map(parseDelimitedLine);
  parseRows(rows);
};

const parseExcelBuffer = (arrayBuffer) => {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });
    parseRows(rows);
  }
};

const parsePDFBuffer = async (arrayBuffer) => {
  if (!window.pdfjsLib) {
    throw new Error(t('pdfUnavailable'));
  }

  const pdf = await window.pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
  const rows = [];

  for (let p = 1; p <= pdf.numPages; p += 1) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const grouped = new Map();

    for (const item of content.items) {
      const y = Math.round(item.transform[5]);
      const current = grouped.get(y) || [];
      current.push(String(item.str || '').trim());
      grouped.set(y, current);
    }

    const sortedRows = [...grouped.entries()].sort((a, b) => b[0] - a[0]);

    for (const [, parts] of sortedRows) {
      const line = parts.join(' ').replace(/\s+/g, ' ').trim();
      if (!line) {
        continue;
      }

      if (/[;\t,]/.test(line)) {
        rows.push(parseDelimitedLine(line));
        continue;
      }

      const match = line.match(/^(.+?)\s{1,}(.+?)\s{1,}([0-9]+(?:[.,][0-9]+)?)$/);
      if (match) {
        rows.push([match[1], match[2], match[3]]);
      }
    }
  }

  parseRows(rows);
};

const populateSelects = () => {
  knownLocations = [...new Set([...kmGraph.keys()])].sort((a, b) => a.localeCompare(b, currentLang));
  const options = knownLocations.map((name) => `<option value="${name}">${name}</option>`).join('');

  fromTeam.innerHTML = `<option value="">${t('pleaseChoose')}</option>${options}`;
  toTeam.innerHTML = `<option value="">${t('pleaseChoose')}</option>${options}`;

  const hasData = knownLocations.length > 0;
  fromTeam.disabled = !hasData;
  toTeam.disabled = !hasData;
  calculate.disabled = !hasData;

  if (!hasData) {
    setResultKey('noValidData');
  } else {
    setResultKey('loadedCount', { count: knownLocations.length });
  }
};

const processArrayBuffer = async (arrayBuffer, extension) => {
  resetData();

  if (extension === 'csv') {
    parseCSVText(new TextDecoder('utf-8').decode(arrayBuffer));
  } else if (extension === 'xlsx' || extension === 'xls') {
    parseExcelBuffer(arrayBuffer);
  } else if (extension === 'pdf') {
    await parsePDFBuffer(arrayBuffer);
  } else {
    throw new Error(t('fileFormatUnsupported'));
  }

  populateSelects();
};

tableFile.addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  try {
    setResultKey('tableLoading');
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    const arrayBuffer = await file.arrayBuffer();
    await processArrayBuffer(arrayBuffer, extension);
  } catch (error) {
    resetData();
    fromTeam.disabled = true;
    toTeam.disabled = true;
    calculate.disabled = true;
    setResultKey('readError', { message: error.message });
  }
});

loadPasted.addEventListener('click', () => {
  const text = csvPaste.value.trim();
  resetData();

  if (!text) {
    setResultKey('pasteCsvPrompt');
    return;
  }

  parseCSVText(text);
  populateSelects();
});

calculate.addEventListener('click', () => {
  const from = fromTeam.value;
  const to = toTeam.value;

  if (!from || !to) {
    setResultKey('chooseTeams');
    return;
  }

  if (from === to) {
    setResultKey('sameTeamResult', { from, to });
    return;
  }

  const direct = kmGraph.get(from)?.get(to);
  if (direct === undefined) {
    setResultKey('noValueFound', { from, to });
    return;
  }

  setResultKey('totalKm', { from, to, km: direct });
});

languageSelect.value = currentLang;
languageSelect.addEventListener('change', (event) => {
  const nextLang = event.target.value;
  if (!translations[nextLang]) {
    return;
  }

  currentLang = nextLang;
  window.localStorage.setItem('lang', currentLang);
  applyStaticText();
  renderCurrentResult();
});

applyStaticText();
