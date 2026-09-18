const fromTeam = document.getElementById('fromTeam');
const toTeam = document.getElementById('toTeam');
const calculate = document.getElementById('calculate');
const resultValue = document.getElementById('resultValue');
const resultCost = document.getElementById('resultCost');
const resultCaption = document.getElementById('resultCaption');
const languageSelect = document.getElementById('languageSelect');
const languageLabel = document.getElementById('languageLabel');
const appTitle = document.getElementById('appTitle');
const appHint = document.getElementById('appHint');
const fromTeamLabel = document.getElementById('fromTeamLabel');
const toTeamLabel = document.getElementById('toTeamLabel');

const DATA_URL = './data/kilometertabelle.json';
const COST_PER_KM = 0.3;

let kmGraph = new Map();
let knownTeams = [];
let knownLocations = [];
let lastResultMessage = null;

const translations = {
  de: {
    pageTitle: 'UBOS KM-Rechner',
    languageLabel: 'Sprache',
    appTitle: 'UBOS KM-Rechner',
    appHint: 'Wähle ein Team und die Zielhalle aus, um die Gesamtkilometer anzuzeigen.',
    fromTeamLabel: 'Team',
    toTeamLabel: 'Zielhalle',
    calculate: 'Gesamtkilometer anzeigen',
    loadTableFirst: 'Tabelle wird geladen...',
    pleaseChoose: 'Bitte wählen',
    noValidData: 'Keine gültigen Kilometerdaten gefunden.',
    loadedCount: '{teams} Teams, {locations} Hallen geladen.',
    tableLoading: 'Tabelle wird geladen...',
    readError: 'Fehler beim Laden der Tabelle: {message}',
    chooseTeams: 'Bitte Team und Zielhalle auswählen.',
    sameTeamKm: '0 km',
    routeCaption: '{from} → {to}',
    noValueFound: 'Für {from} ↔ {to} wurde kein Wert gefunden.',
    totalKm: '{km} km',
  },
  en: {
    pageTitle: 'UBOS KM Calculator',
    languageLabel: 'Language',
    appTitle: 'UBOS KM Calculator',
    appHint: 'Select a team and the destination venue to display the total kilometers.',
    fromTeamLabel: 'Team',
    toTeamLabel: 'Destination venue',
    calculate: 'Show total kilometers',
    loadTableFirst: 'Loading table...',
    pleaseChoose: 'Please choose',
    noValidData: 'No valid kilometer data found.',
    loadedCount: '{teams} teams, {locations} venues loaded.',
    tableLoading: 'Loading table...',
    readError: 'Error loading table: {message}',
    chooseTeams: 'Please select a team and a destination venue.',
    sameTeamKm: '0 km',
    routeCaption: '{from} → {to}',
    noValueFound: 'No value found for {from} ↔ {to}.',
    totalKm: '{km} km',
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

const interpolate = (template, vars = {}) =>
  String(template).replace(/\{(\w+)\}/g, (_, key) => (vars[key] === undefined ? `{${key}}` : String(vars[key])));

const t = (key, vars = {}) => {
  const locale = translations[currentLang] ? currentLang : 'en';
  const template = translations[locale][key] || translations.en[key] || key;
  return interpolate(template, vars);
};

const setResultKey = (key, vars = {}) => {
  lastResultMessage = { key, vars };
  renderResult(key, vars);
};

const KM_RESULT_KEYS = new Set(['totalKm', 'sameTeamKm']);

const formatCost = (km) => {
  const locale = currentLang === 'de' ? 'de-DE' : 'en-US';
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(km * COST_PER_KM);
};

const renderResult = (key, vars = {}) => {
  if (KM_RESULT_KEYS.has(key)) {
    resultValue.textContent = t(key, vars);
    resultCost.textContent = formatCost(vars.km ?? 0);
    resultCaption.textContent = t('routeCaption', vars);
  } else {
    resultValue.textContent = '';
    resultCost.textContent = '';
    resultCaption.textContent = t(key, vars);
  }
};

const renderCurrentResult = () => {
  if (!lastResultMessage?.key) {
    return;
  }

  renderResult(lastResultMessage.key, lastResultMessage.vars);
};

const applyStaticText = () => {
  document.documentElement.lang = currentLang;
  document.title = t('pageTitle');
  languageLabel.textContent = t('languageLabel');
  appTitle.textContent = t('appTitle');
  appHint.textContent = t('appHint');
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

const buildGraphFromData = (data) => {
  kmGraph = new Map();
  for (const [team, locations] of Object.entries(data.distances || {})) {
    kmGraph.set(team, new Map(Object.entries(locations)));
  }
};

const populateSelects = (data) => {
  knownTeams = [...(data.teams || [])].sort((a, b) => a.localeCompare(b, currentLang));
  knownLocations = [...(data.locations || [])].sort((a, b) => a.localeCompare(b, currentLang));

  const teamOptions = knownTeams.map((name) => `<option value="${name}">${name}</option>`).join('');
  const locationOptions = knownLocations.map((name) => `<option value="${name}">${name}</option>`).join('');

  fromTeam.innerHTML = `<option value="">${t('pleaseChoose')}</option>${teamOptions}`;
  toTeam.innerHTML = `<option value="">${t('pleaseChoose')}</option>${locationOptions}`;

  const savedTeam = window.localStorage.getItem('fromTeam');
  if (savedTeam && knownTeams.includes(savedTeam)) {
    fromTeam.value = savedTeam;
  }

  const hasData = knownTeams.length > 0 && knownLocations.length > 0;
  fromTeam.disabled = !hasData;
  toTeam.disabled = !hasData;
  calculate.disabled = !hasData;

  if (!hasData) {
    setResultKey('noValidData');
  } else {
    setResultKey('loadedCount', { teams: knownTeams.length, locations: knownLocations.length });
  }
};

const loadDistanceTable = async () => {
  try {
    setResultKey('tableLoading');
    const response = await fetch(DATA_URL);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    buildGraphFromData(data);
    populateSelects(data);
  } catch (error) {
    kmGraph = new Map();
    knownTeams = [];
    knownLocations = [];
    fromTeam.disabled = true;
    toTeam.disabled = true;
    calculate.disabled = true;
    setResultKey('readError', { message: error.message });
  }
};

fromTeam.addEventListener('change', () => {
  if (fromTeam.value) {
    window.localStorage.setItem('fromTeam', fromTeam.value);
  } else {
    window.localStorage.removeItem('fromTeam');
  }
});

calculate.addEventListener('click', () => {
  const from = fromTeam.value;
  const to = toTeam.value;

  if (!from || !to) {
    setResultKey('chooseTeams');
    return;
  }

  if (from === to) {
    setResultKey('sameTeamKm', { from, to });
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
loadDistanceTable();
