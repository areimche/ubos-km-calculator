# Copilot Instructions — ubos-km-calculator

## What this is
A static web app (`index.html`, `app.js`, `styles.css`) with no frontend framework and no client-side build step. It displays total kilometers (and an estimated travel cost) between two teams/locations, reading precomputed distance data from `data/kilometertabelle.json` via `fetch()` at page load.

A separate Node-based build script (`scripts/generate-data.mjs`) converts the authoritative source file `data/kilometertabelle.pdf` into that JSON file. Node/npm is only needed to regenerate data, never to run or deploy the app itself.

## Commands
- **Run the app locally**: `python3 -m http.server 8080` (from repo root), then open `http://localhost:8080`. No automated tests exist; validate changes by exercising the UI manually (select locations, calculate, switch language).
- **Regenerate distance data** after `data/kilometertabelle.pdf` changes:
  ```bash
  npm install
  npm run generate-data
  ```
  This overwrites `data/kilometertabelle.json`. Commit both the updated PDF and the regenerated JSON — the app never parses PDFs at runtime.

## Architecture
- **Distance model** (`app.js`): `kmGraph` is a `Map<team, Map<venue, km>>`, built from the JSON `distances` object at startup (`buildGraphFromData`). Only **direct** lookups between the selected team and destination venue are supported — there is no shortest-path/graph traversal or team-to-team/venue-to-venue lookup.
- **Data source PDF layout** (relevant when touching `scripts/generate-data.mjs`): the PDF is a matrix export, not a simple table. Row labels (venues) run down the left edge as normal horizontal text; column labels (teams) and every cell value are rendered as **vertically rotated text** (identifiable via `pdf.js` text item transforms where `transform[0]` and `transform[3]` are ~0). Rows and columns are not the same set — a team can have multiple home venues as separate rows — so the script matches labels/values by coordinates (column x-position, row y-order) rather than assuming a square matrix. See the comments at the top of `scripts/generate-data.mjs` for details before changing the extraction logic.
- **i18n**: All user-facing strings live in the `translations` object (`de`/`en`) in `app.js`, keyed by string ID and interpolated via `t(key, vars)`/`interpolate` (`{var}` placeholders). No separate locale files — add new strings to both language blocks. Language choice is persisted in `localStorage` (`lang`) and defaults to browser language.
- **State/UI wiring**: No framework — plain DOM manipulation with cached element references at the top of `app.js`. Result messages are tracked via `lastResultMessage` (key + vars) so `renderCurrentResult()` can re-render the last result when the language is switched without recalculating. The result output splits into three parts (`resultValue`, `resultCost`, `resultCaption`) — `renderResult()` decides via `KM_RESULT_KEYS` whether a message is a km result (large km value + estimated cost + route caption) or a plain status message (caption only). Estimated cost is `km * COST_PER_KM` (currently 0.30 €/km), formatted per-locale with `Intl.NumberFormat`. The selected "from" team is persisted in `localStorage` (`fromTeam`) and restored on load if still a valid option.

## Conventions
- Keep all new UI strings translated in both `de` and `en` entries of `translations`.
- `data/kilometertabelle.json` is generated output — don't hand-edit it; change the PDF and re-run `npm run generate-data` instead.
- Deployment target is GitHub Pages serving the repo root directly (static files, incl. `data/*.json`) — avoid introducing a build step for the app itself that would change the deployable output structure. `node_modules/` is gitignored and only needed for the data-generation script.
