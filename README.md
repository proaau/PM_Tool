# Prognos-inspiriertes Projektmanagement-Tool

Ein leichtgewichtiges, kollaboratives PM-Tool mit Fokus auf:
- **übersichtliche Zeitpläne (Roadmap/Gantt-ähnlich)**
- **Aufgabenverwaltung mit Zuständigkeiten**
- **gleichzeitige Bearbeitung über einen gemeinsamen Serverstand**

## Funktionen
- Projektname und Beschreibung pflegen
- Aufgaben mit Titel, Verantwortlich, Start/Ende, Status, Priorität und Notizen anlegen/löschen
- Roadmap-Ansicht als visuelle Zeitachsen-Balken
- Kollaboration über zentralen Zustand (`/api/state`) mit Revisionskontrolle (Konflikterkennung)
- Präsenzindikator für aktive Bearbeiter:innen

<<<<<<< HEAD
## Start
=======
## Start (mit lokal installiertem Node.js)
>>>>>>> origin/codex/entwickeln-eines-projektmanagement-tools-fauqpx
```bash
npm start
```
Danach im Browser öffnen: `http://localhost:3000`

<<<<<<< HEAD
=======
## Start **ohne** lokale Node.js-Installation (Docker)
Falls Node.js auf dem Rechner nicht installiert werden kann, kannst du das Tool per Container starten:

### Mit Docker Compose
```bash
docker compose up --build
```

### Oder mit Docker direkt
```bash
docker build -t pm-tool .
docker run --rm -p 3000:3000 pm-tool
```

Danach im Browser öffnen: `http://localhost:3000`

>>>>>>> origin/codex/entwickeln-eines-projektmanagement-tools-fauqpx
## Hinweise zur Kollaboration
- Das Tool nutzt einen gemeinsamen In-Memory-Stand auf dem Node.js-Server.
- Mehrere Nutzer im gleichen Netzwerk/auf demselben Server sehen gemeinsame Daten.
- Bei Konflikten (parallel speichern) wird der Konflikt gemeldet und der aktuelle Stand neu geladen.
