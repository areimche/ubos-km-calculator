# ubos-km-calculator

Web interface to calculate total kilometers between two teams/locations based on a PDF distance table.

## Features

- Mobile-first web interface (works well on smartphones)
- Interface available in German and English
- Upload a distance table as **PDF**
- Select Team/Location A and B, then display the total kilometers from the table

## Expected PDF format

Each row in the PDF should contain:
- start/team/location
- destination/team/location
- kilometer value

## Run locally

Since this is a static app, a simple web server is enough, for example:

```bash
python -m http.server 8080
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
