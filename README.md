# ubos-km-calculator

Weboberfläche zur Ermittlung von Gesamtkilometern zwischen zwei Teams/Orten auf Basis einer Kilometertabelle.

## Features

- Mobile-first Weboberfläche (gut auf Smartphones nutzbar)
- Upload einer Kilometertabelle als **Excel** (`.xlsx`, `.xls`), **CSV** oder **PDF**
- Alternative: CSV-Inhalt direkt einfügen
- Auswahl von Team/Ort A und B, anschließend Anzeige der Gesamtkilometer aus der Tabelle

## Erwartete Tabellenformate

### 1) Paarliste (empfohlen)

Beispiel:

```csv
Von;Nach;Kilometer
Osnabrück;Bramsche;22
Bramsche;Lingen;55
```

### 2) Matrix

Erste Zeile enthält Zielorte, erste Spalte enthält Startorte.

Eine Beispiel-Datei liegt unter:

- `/home/runner/work/ubos-km-calculator/ubos-km-calculator/data/kilometertabelle-beispiel.csv`

## Lokal starten

Da dies eine statische App ist, genügt ein einfacher Webserver, z. B.:

```bash
python -m http.server 8080
```

Dann im Browser öffnen: `http://localhost:8080`

## GitHub Pages

Die App ist GitHub-Pages-kompatibel (reine statische Dateien).

1. Repository auf GitHub öffnen
2. **Settings → Pages**
3. Source: **Deploy from a branch**
4. Branch: gewünschter Branch (z. B. `main`), Folder: `/ (root)`
5. Speichern

Danach ist die Seite über die angezeigte GitHub-Pages-URL erreichbar.
