# ubos-km-calculator

Web interface to calculate total kilometers between two teams/locations based on a distance table.

## Features

- Mobile-first web interface (works well on smartphones)
- Interface available in German and English
- Distance data is loaded automatically from `data/kilometertabelle.json`
- Select Team/Location A and B, then display the total kilometers from the table

## Distance data

The app reads `data/kilometertabelle.json` at runtime — a plain adjacency map
(`{ "Location A": { "Location B": km, ... }, ... }`). This file is generated
from the source PDF (`data/kilometertabelle.pdf`) using a build script; the
browser itself never parses PDFs.

To regenerate the JSON after updating the PDF:

```bash
npm install
npm run generate-data
```

This writes an updated `data/kilometertabelle.json`. Commit both the PDF and
the regenerated JSON.

## Run locally

Since this is a static app, a simple web server is enough, for example:

```bash
python3 -m http.server 8080
```

Then open in the browser: `http://localhost:8080`

## GitHub Pages

The app is GitHub Pages compatible (pure static files).

1. Open the repository on GitHub
2. **Settings → Pages**
3. Source: **Deploy from a branch**
4. Branch: desired branch (for example `main`), Folder: `/ (root)`
5. Save

After that, the site is available at the displayed GitHub Pages URL.
