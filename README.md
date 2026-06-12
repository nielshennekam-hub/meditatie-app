# Stilte 🧘 — Meditatie & Timer (PWA)

Een rustige, uitgebreide meditatie-app geïnspireerd op Insight Timer.
Volledig offline, geen accounts, geen tracking — alleen jij en de stilte.

## Functies

- **Meditatietimer** — 1 t/m 120 minuten, met voorbereidingstijd en intervalbellen
- **Belletjes-reeksen** — stel per moment (start, tussendoor, einde) in hoeveel slagen er klinken, bijv. drie belletjes kort na elkaar bij de start
- **Vier gesynthetiseerde klanken** — Tibetaanse klankschaal, diepe gong, kristallen schaal en koshi-belletjes, allemaal live opgebouwd met Web Audio (geen audiobestanden, dus razendsnel en offline)
- **Ademhalingsoefeningen** — box-ademhaling, 4-7-8, gelijkmatig en kalmerend, met een geleide animatie
- **Sfeergeluiden** — regen, oceaan, wind en diepe ruis, met volumeregeling en slaaptimer
- **Voortgang** — dagen op rij (streak), weekgrafiek, maand-heatmap, mijlpalen en recente sessies (lokaal opgeslagen)
- **Dagelijkse inspiratie** — elke dag een nieuwe quote, en één na elke sessie
- **PWA** — installeerbaar op telefoon en desktop, werkt volledig offline via een service worker
- **Kalme visuals** — nachtelijke aurora-gradients, fonkelende sterrenhemel, ademende lichtkring tijdens sessies

## Lokaal draaien

Een service worker vereist een (lokale) webserver:

```bash
python3 -m http.server 8000
# open vervolgens http://localhost:8000
```

Of publiceer de map als statische site (bijv. GitHub Pages) — er is geen build-stap.

## Projectstructuur

```
index.html           app-schil met alle views
css/style.css        thema en animaties
js/app.js            navigatie, instellingen, achtergrond
js/timer.js          sessie-engine (meditatie + adem)
js/audio.js          klanksynthese en sfeergeluiden
js/stats.js          voortgang en opslag (localStorage)
js/quotes.js         inspiratiequotes
sw.js                offline-cache (service worker)
manifest.webmanifest PWA-manifest
tools/make_icons.py  generator voor de app-iconen
```

## Iconen opnieuw genereren

```bash
python3 tools/make_icons.py
```
